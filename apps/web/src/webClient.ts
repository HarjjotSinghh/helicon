import type {
  ApprovalMode,
  EnvironmentStatus,
  EventHandler,
  HeliconClient,
  HeliconEvent,
  ProjectView,
  SessionViewData,
  TranscriptItem,
  UserInputAnswerItem,
} from "@helicon/ui";

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`GET ${path} failed with ${res.status}.`);
  }
  return res.json() as Promise<unknown>;
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed with ${res.status}: ${text}`);
  }
  return res.json() as Promise<unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}

export class WebHeliconClient implements HeliconClient {
  private handlers = new Set<EventHandler>();
  private source: EventSource | null = null;

  async probeEnvironment(): Promise<EnvironmentStatus> {
    const env = asRecord(await getJson("/api/env"));
    return {
      platform: String(env["platform"] ?? ""),
      wslAvailable: env["wslAvailable"] === true,
      defaultDistro: typeof env["defaultDistro"] === "string" ? (env["defaultDistro"] as string) : null,
      museFound: env["museFound"] === true,
      musePath: typeof env["musePath"] === "string" ? (env["musePath"] as string) : null,
    };
  }

  async listProjects(): Promise<ProjectView[]> {
    const body = asRecord(await getJson("/api/projects"));
    const projects = Array.isArray(body["projects"]) ? body["projects"] : [];
    return projects.map((p) => {
      const r = asRecord(p);
      return {
        cwd: String(r["cwd"] ?? ""),
        displayName: String(r["displayName"] ?? r["cwd"] ?? ""),
        pinned: r["pinned"] === true,
      };
    });
  }

  async setPinned(cwd: string, pinned: boolean): Promise<void> {
    const res = await fetch("/api/projects/pin", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cwd, pinned }),
    });
    if (!res.ok) {
      throw new Error(`Pin failed with ${res.status}.`);
    }
  }

  async listSessions(cwd?: string): Promise<SessionViewData[]> {
    const path = cwd ? `/api/sessions?cwd=${encodeURIComponent(cwd)}` : "/api/sessions";
    const body = asRecord(await getJson(path));
    const sessions = Array.isArray(body["sessions"]) ? body["sessions"] : [];
    return sessions.map((s) => {
      const r = asRecord(s);
      return {
        sessionId: String(r["sessionId"] ?? r["id"] ?? ""),
        cwd: String(r["cwd"] ?? cwd ?? ""),
        title: String(r["title"] ?? "Session"),
        status: String(r["status"] ?? "active"),
        turnCount: typeof r["turnCount"] === "number" ? r["turnCount"] : 0,
        modelId: typeof r["modelId"] === "string" ? r["modelId"] : null,
        origin: r["origin"] === "tui" ? "tui" : "helicon",
      };
    });
  }

  async discover(cwd?: string): Promise<SessionViewData[]> {
    const body = asRecord(await postJson("/api/discover", cwd ? { cwd } : {}));
    const sessions = Array.isArray(body["sessions"]) ? body["sessions"] : [];
    return sessions.map((s) => {
      const r = asRecord(s);
      return {
        sessionId: String(r["sessionId"] ?? ""),
        cwd: String(r["cwd"] ?? cwd ?? ""),
        title: String(r["title"] ?? "Session"),
        status: String(r["status"] ?? "active"),
        turnCount: typeof r["turnCount"] === "number" ? r["turnCount"] : 0,
        modelId: typeof r["modelId"] === "string" ? r["modelId"] : null,
        origin: r["origin"] === "tui" ? "tui" : "helicon",
      };
    });
  }

  async startSession(cwd: string, approvalMode?: ApprovalMode, modelId?: string): Promise<SessionViewData> {
    const body = asRecord(await postJson("/api/sessions", { cwd, approvalMode, modelId }));
    const r = asRecord(body["session"]);
    return {
      sessionId: String(r["sessionId"] ?? ""),
      cwd,
      title: String(r["title"] ?? "Session"),
      status: String(r["status"] ?? "active"),
      turnCount: 0,
      modelId: typeof r["modelId"] === "string" ? r["modelId"] : null,
      origin: "helicon",
    };
  }

  async resumeSession(sessionId: string): Promise<{ session: SessionViewData; items: TranscriptItem[] }> {
    const body = asRecord(await postJson(`/api/sessions/${encodeURIComponent(sessionId)}/resume`, {}));
    void body;
    return {
      session: {
        sessionId,
        cwd: "",
        title: "Session",
        status: "active",
        turnCount: 0,
        modelId: null,
        origin: "helicon",
      },
      items: [],
    };
  }

  async sendTurn(sessionId: string, text: string): Promise<{ turnId: string | null }> {
    const body = asRecord(await postJson("/api/turns", { sessionId, text }));
    return { turnId: typeof body["turnId"] === "string" ? body["turnId"] : null };
  }

  async steerTurn(sessionId: string, turnId: string, text: string): Promise<void> {
    await postJson("/api/turns/steer", { sessionId, turnId, text });
  }

  async interruptTurn(sessionId: string, turnId?: string): Promise<void> {
    await postJson("/api/turns/interrupt", { sessionId, turnId });
  }

  async cancelTurn(sessionId: string, turnId: string): Promise<void> {
    await postJson("/api/turns/cancel", { sessionId, turnId });
  }

  async decideApproval(
    sessionId: string,
    approvalId: string,
    requirementId: unknown,
    choiceId: string,
    feedback?: string | null,
  ): Promise<void> {
    await postJson("/api/approvals/decide", { sessionId, approvalId, requirementId, choiceId, feedback });
  }

  async listModels(sessionId?: string): Promise<unknown> {
    const path = sessionId ? `/api/models?sessionId=${encodeURIComponent(sessionId)}` : "/api/models";
    const body = asRecord(await getJson(path));
    return body["models"];
  }

  async setSessionModel(sessionId: string, model: unknown): Promise<void> {
    await postJson(`/api/sessions/${encodeURIComponent(sessionId)}/model`, { model });
  }

  async setSessionApprovalMode(sessionId: string, mode: ApprovalMode): Promise<void> {
    await postJson(`/api/sessions/${encodeURIComponent(sessionId)}/approval-mode`, { mode });
  }

  async answerUserInput(sessionId: string, userInputId: string, answers: UserInputAnswerItem[]): Promise<void> {
    await postJson("/api/user-input/answer", { sessionId, userInputId, answers });
  }

  onEvent(handler: EventHandler): void {
    this.handlers.add(handler);
    if (!this.source) {
      const source = new EventSource("/api/events");
      source.addEventListener("helicon", (message) => {
        try {
          const event = JSON.parse((message as MessageEvent).data) as HeliconEvent;
          for (const handler of this.handlers) {
            handler(event);
          }
        } catch {
          /* ignore malformed frames */
        }
      });
      this.source = source;
    }
  }
}
