import {
  HeliconError,
  parseModelList,
  type ApprovalDecisionInput,
  type ApprovalMode,
  type EnvironmentStatus,
  type EventHandler,
  type HeliconClient,
  type HeliconEvent,
  type ModelOption,
  type ProjectView,
  type SessionSummary,
  type TranscriptLoad,
  type TurnOptions,
  type UserInputAnswer,
} from "@helicon/ui";

const token = new URLSearchParams(window.location.search).get("token");

function withToken(path: string): string {
  if (!token) {
    return path;
  }
  return `${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(withToken(path), {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new HeliconError("The local Helicon server is not reachable. Is it still running?", 0);
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const failure = (data ?? {}) as { error?: unknown; kind?: unknown };
    throw new HeliconError(
      typeof failure.error === "string" ? failure.error : `${method} ${path} failed with ${response.status}.`,
      response.status,
      typeof failure.kind === "string" ? failure.kind : null,
    );
  }
  return data as T;
}

const enc = encodeURIComponent;

/** The Helicon client over the local server's REST API and server-sent events. */
export class WebHeliconClient implements HeliconClient {
  private readonly handlers = new Set<EventHandler>();
  private source: EventSource | null = null;

  probeEnvironment(refresh = false): Promise<EnvironmentStatus> {
    return call<EnvironmentStatus>("GET", `/api/env${refresh ? "?refresh=1" : ""}`);
  }

  async listProjects(): Promise<ProjectView[]> {
    return (await call<{ projects: ProjectView[] }>("GET", "/api/projects")).projects;
  }

  async addProject(cwd: string): Promise<{ cwd: string; warning: string | null }> {
    const result = await call<{ project: { cwd: string }; warning: string | null }>("POST", "/api/projects", { cwd });
    return { cwd: result.project.cwd, warning: result.warning };
  }

  async hideProject(cwd: string): Promise<void> {
    await call("DELETE", `/api/projects?cwd=${enc(cwd)}`);
  }

  async setPinned(cwd: string, pinned: boolean): Promise<void> {
    await call("PATCH", "/api/projects/pin", { cwd, pinned });
  }

  async listSessions(options?: { archived?: boolean }): Promise<SessionSummary[]> {
    return (await call<{ sessions: SessionSummary[] }>("GET", `/api/sessions${options?.archived ? "?archived=1" : ""}`)).sessions;
  }

  async discover(cwd?: string): Promise<void> {
    await call("POST", "/api/discover", cwd ? { cwd } : {});
  }

  async startSession(cwd: string, options?: { approvalMode?: ApprovalMode; modelId?: string }): Promise<SessionSummary> {
    const result = await call<{ session: SessionSummary }>("POST", "/api/sessions", {
      cwd,
      approvalMode: options?.approvalMode,
      modelId: options?.modelId,
    });
    return result.session;
  }

  loadTranscript(sessionId: string): Promise<TranscriptLoad> {
    return call<TranscriptLoad>("POST", `/api/sessions/${enc(sessionId)}/resume`, {});
  }

  async updateSession(sessionId: string, patch: { title?: string; archived?: boolean }): Promise<SessionSummary | null> {
    return (await call<{ session: SessionSummary | null }>("PATCH", `/api/sessions/${enc(sessionId)}`, patch)).session;
  }

  async sendTurn(sessionId: string, text: string, options?: TurnOptions): Promise<{ turnId: string | null; disposition: string | null }> {
    const result = await call<{ turnId: string | null; disposition: unknown }>("POST", "/api/turns", {
      sessionId,
      text,
      ifBusy: options?.ifBusy,
      reasoningEffort: options?.reasoningEffort,
    });
    return { turnId: result.turnId ?? null, disposition: typeof result.disposition === "string" ? result.disposition : null };
  }

  async interruptTurn(sessionId: string, turnId?: string): Promise<void> {
    await call("POST", "/api/turns/interrupt", { sessionId, turnId });
  }

  async unqueueTurn(sessionId: string, turnId: string): Promise<void> {
    await call("POST", "/api/turns/unqueue", { sessionId, turnId });
  }

  async decideApproval(input: ApprovalDecisionInput): Promise<void> {
    await call("POST", "/api/approvals/decide", input);
  }

  async answerUserInput(sessionId: string, userInputId: string, answers: UserInputAnswer[]): Promise<void> {
    await call("POST", "/api/user-input/answer", { sessionId, userInputId, answers });
  }

  async cancelUserInput(sessionId: string, userInputId: string): Promise<void> {
    await call("POST", "/api/user-input/cancel", { sessionId, userInputId });
  }

  async clarifyUserInput(sessionId: string, userInputId: string, content: string): Promise<void> {
    await call("POST", "/api/user-input/clarify", { sessionId, userInputId, content });
  }

  async listModels(sessionId?: string): Promise<ModelOption[]> {
    const result = await call<{ models: unknown }>("GET", `/api/models${sessionId ? `?sessionId=${enc(sessionId)}` : ""}`);
    return parseModelList(result.models);
  }

  async setSessionModel(sessionId: string, modelId: string): Promise<void> {
    await call("POST", `/api/sessions/${enc(sessionId)}/model`, { model: { modelId } });
  }

  async setApprovalMode(sessionId: string, mode: ApprovalMode): Promise<void> {
    await call("POST", `/api/sessions/${enc(sessionId)}/approval-mode`, { mode });
  }

  async compact(sessionId: string): Promise<void> {
    await call("POST", `/api/sessions/${enc(sessionId)}/compact`, {});
  }

  async openFolder(cwd: string, target: "files" | "editor"): Promise<void> {
    await call("POST", "/api/open", { cwd, target });
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    this.connect();
    return () => {
      this.handlers.delete(handler);
      if (this.handlers.size === 0) {
        this.source?.close();
        this.source = null;
      }
    };
  }

  private connect(): void {
    if (this.source) {
      return;
    }
    const source = new EventSource(withToken("/api/events"));
    source.addEventListener("helicon", (message) => {
      try {
        this.dispatch(JSON.parse((message as MessageEvent<string>).data) as HeliconEvent);
      } catch {
        /* ignore malformed frames */
      }
    });
    source.addEventListener("error", () => this.dispatch({ type: "connection", state: "lost" }));
    this.source = source;
  }

  private dispatch(event: HeliconEvent): void {
    for (const handler of [...this.handlers]) {
      handler(event);
    }
  }
}
