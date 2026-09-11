import type {
  ApprovalMode,
  EnvironmentStatus,
  HeliconEvent,
  IfBusy,
  ModelOption,
  ProjectView,
  ReasoningEffort,
  SessionSummary,
  TranscriptLoad,
  UserInputAnswer,
} from "./types.js";

/** An error from the Helicon server, carrying the MSP error kind when there is one. */
export class HeliconError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: string | null = null,
  ) {
    super(message);
    this.name = "HeliconError";
  }
}

export function errorKind(error: unknown): string | null {
  return error instanceof HeliconError ? error.kind : null;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export type EventHandler = (event: HeliconEvent) => void;

export interface TurnOptions {
  ifBusy?: IfBusy;
  reasoningEffort?: ReasoningEffort;
}

export interface ApprovalDecisionInput {
  sessionId: string;
  approvalId: string;
  requirementId: unknown;
  choiceId: string;
  feedback?: string | null;
}

/** Everything the UI needs from a transport. The web and desktop shells both implement it over REST and SSE. */
export interface HeliconClient {
  probeEnvironment(refresh?: boolean): Promise<EnvironmentStatus>;
  listProjects(): Promise<ProjectView[]>;
  addProject(cwd: string): Promise<{ cwd: string; warning: string | null }>;
  hideProject(cwd: string): Promise<void>;
  setPinned(cwd: string, pinned: boolean): Promise<void>;
  listSessions(options?: { archived?: boolean }): Promise<SessionSummary[]>;
  discover(cwd?: string): Promise<void>;
  startSession(cwd: string, options?: { approvalMode?: ApprovalMode; modelId?: string }): Promise<SessionSummary>;
  loadTranscript(sessionId: string): Promise<TranscriptLoad>;
  updateSession(sessionId: string, patch: { title?: string; archived?: boolean }): Promise<SessionSummary | null>;
  sendTurn(sessionId: string, text: string, options?: TurnOptions): Promise<{ turnId: string | null; disposition: string | null }>;
  interruptTurn(sessionId: string, turnId?: string): Promise<void>;
  unqueueTurn(sessionId: string, turnId: string): Promise<void>;
  decideApproval(input: ApprovalDecisionInput): Promise<void>;
  answerUserInput(sessionId: string, userInputId: string, answers: UserInputAnswer[]): Promise<void>;
  cancelUserInput(sessionId: string, userInputId: string): Promise<void>;
  clarifyUserInput(sessionId: string, userInputId: string, content: string): Promise<void>;
  listModels(sessionId?: string): Promise<ModelOption[]>;
  setSessionModel(sessionId: string, modelId: string): Promise<void>;
  setApprovalMode(sessionId: string, mode: ApprovalMode): Promise<void>;
  compact(sessionId: string): Promise<void>;
  openFolder(cwd: string, target: "files" | "editor"): Promise<void>;
  /** Subscribe to server events; returns an unsubscribe function. */
  subscribe(handler: EventHandler): () => void;
}

/** Parse a raw `model/list` result into picker options. */
export function parseModelList(value: unknown): ModelOption[] {
  const root = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const list = Array.isArray(root["models"]) ? root["models"] : Array.isArray(value) ? value : [];
  const options: ModelOption[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const r = entry as Record<string, unknown>;
    const modelId = typeof r["modelId"] === "string" ? r["modelId"] : null;
    if (!modelId) {
      continue;
    }
    const description = typeof r["description"] === "string" ? r["description"] : null;
    options.push({
      modelId,
      displayLabel: typeof r["displayLabel"] === "string" && r["displayLabel"] ? r["displayLabel"] : modelId,
      description,
      isDefault: r["isDefault"] === true,
      isActive: r["isActive"] === true,
      contextLimit: typeof r["contextLimit"] === "number" ? r["contextLimit"] : null,
      contributor: /contributor/i.test(modelId) || /product improvement/i.test(description ?? ""),
    });
  }
  return options;
}
