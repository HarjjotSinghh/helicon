export type ApprovalMode = "allowAll" | "denyUnmatched" | "onRequest" | "promptUnmatched";

export const APPROVAL_MODES: readonly ApprovalMode[] = [
  "allowAll",
  "denyUnmatched",
  "onRequest",
  "promptUnmatched",
];

export function isApprovalMode(value: unknown): value is ApprovalMode {
  return (
    typeof value === "string" &&
    (APPROVAL_MODES as readonly string[]).includes(value)
  );
}

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "ultra";

export const REASONING_EFFORTS: readonly ReasoningEffort[] = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "ultra",
];

export function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return typeof value === "string" && (REASONING_EFFORTS as readonly string[]).includes(value);
}

export type IfBusy = "queue" | "steer" | "replace";

export function isIfBusy(value: unknown): value is IfBusy {
  return value === "queue" || value === "steer" || value === "replace";
}

export interface TextPart {
  type: "text";
  text: string;
}

export function textInput(text: string): TextPart[] {
  return [{ type: "text", text }];
}

export interface MspNotification {
  method: string;
  params?: unknown;
  emittedAtMs?: number;
}

export type NotificationHandler = (notification: MspNotification) => void;

/**
 * The slice of the SDK connection Helicon uses. `command` mints a `commandId` for
 * state-changing verbs; `request` sends read-only queries (lists, reads, pages) as-is.
 */
export interface CommandConnection {
  command(method: string, params?: Record<string, unknown>): Promise<unknown>;
  request?(method: string, params?: Record<string, unknown>): Promise<unknown>;
  onNotification(handler: NotificationHandler): void;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
}

function nestedString(value: unknown, path: string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) {
      return null;
    }
    current = record[key];
  }
  return typeof current === "string" ? current : null;
}

function sessionIdOf(result: unknown): string {
  const id = nestedString(result, ["session", "sessionId"]);
  if (!id) {
    throw new Error("MSP reply carried no session.sessionId.");
  }
  return id;
}

export interface StartSessionOptions {
  workspaceRoot?: string;
  approvalMode?: ApprovalMode;
  modelId?: string;
}

export interface StartedSession {
  sessionId: string;
  raw: unknown;
}

export interface TurnAck {
  turnId: string | null;
  status: unknown;
  disposition: unknown;
  raw: unknown;
}

function toTurnAck(raw: unknown): TurnAck {
  const record = asRecord(raw);
  return {
    turnId: record ? nestedString(record, ["turnId"]) : null,
    status: record ? record["status"] : undefined,
    disposition: record ? record["disposition"] : undefined,
    raw,
  };
}

/** An image the user attached to a prompt: the only non-text part MSP v1 takes (tdd SS3.2). */
export interface TurnImage {
  base64Data: string;
  mediaType: string;
  width?: number;
  height?: number;
}

export interface SendTurnOptions {
  displayText?: string;
  ifBusy?: string;
  reasoningEffort?: string;
  images?: TurnImage[];
}

/** Prompt parts in order: the text the user typed, then each image they attached. */
export function turnInput(text: string, images: TurnImage[] = []): unknown[] {
  const parts: unknown[] = text.length > 0 ? textInput(text) : [];
  for (const image of images) {
    parts.push({
      type: "image",
      base64Data: image.base64Data,
      mediaType: image.mediaType,
      // Muse takes the pair or neither.
      ...(image.width !== undefined && image.height !== undefined ? { width: image.width, height: image.height } : {}),
    });
  }
  return parts;
}

export interface ApprovalDecision {
  sessionId: string;
  approvalId: string;
  requirementId: unknown;
  choiceId: string;
  feedback?: string | null;
}

export interface UserInputAnswerItem {
  questionId: string;
  selectedLabel?: string;
  selectedLabels?: string[];
  freeText?: string;
  note?: string;
}

export interface SessionPage {
  sessions: unknown[];
  nextCursor: string | null;
}

export interface ViewPage {
  events: unknown[];
  nextCursor: string | null;
}

export interface PendingRequests {
  approvals: unknown[];
  userInputs: unknown[];
}

export class SessionManager {
  constructor(private readonly connection: CommandConnection) {}

  onNotification(handler: NotificationHandler): void {
    this.connection.onNotification(handler);
  }

  /** Read-only queries go out without a minted `commandId` when the connection allows it. */
  private query(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (this.connection.request) {
      return this.connection.request(method, params);
    }
    return this.connection.command(method, params);
  }

  async listSessions(workspaceRoot?: string, limit = 50): Promise<unknown[]> {
    const page = await this.listSessionsPage({ workspaceRoot, limit });
    return page.sessions;
  }

  async listSessionsPage(options: {
    workspaceRoot?: string;
    limit?: number;
    cursor?: string | null;
  } = {}): Promise<SessionPage> {
    const params: Record<string, unknown> = { limit: options.limit ?? 50 };
    if (options.workspaceRoot !== undefined) {
      params["workspaceRoot"] = options.workspaceRoot;
    }
    if (options.cursor) {
      params["cursor"] = options.cursor;
    }
    const result = await this.query("session/list", params);
    const record = asRecord(result);
    if (record && Array.isArray(record["sessions"])) {
      return {
        sessions: record["sessions"],
        nextCursor: typeof record["nextCursor"] === "string" ? record["nextCursor"] : null,
      };
    }
    if (Array.isArray(result)) {
      return { sessions: result, nextCursor: null };
    }
    return { sessions: [], nextCursor: null };
  }

  async startSession(options: StartSessionOptions = {}): Promise<StartedSession> {
    const params: Record<string, unknown> = {};
    if (options.workspaceRoot !== undefined) {
      params["workspaceRoot"] = options.workspaceRoot;
    }
    if (options.approvalMode !== undefined) {
      params["approvalMode"] = options.approvalMode;
    }
    if (options.modelId !== undefined) {
      params["modelId"] = options.modelId;
    }
    const result = await this.connection.command("session/start", params);
    return { sessionId: sessionIdOf(result), raw: result };
  }

  async resumeSession(sessionId: string, excludeItems = false): Promise<unknown> {
    return this.connection.command("session/resume", { sessionId, excludeItems });
  }

  async readSession(sessionId: string, excludeItems = true): Promise<unknown> {
    return this.query("session/read", { sessionId, excludeItems });
  }

  /** One page of the durable view log. Backward pages walk from the head toward the start. */
  async pageView(
    sessionId: string,
    options: { cursor?: string; direction?: "forward" | "backward"; limit?: number } = {},
  ): Promise<ViewPage> {
    const params: Record<string, unknown> = { sessionId, limit: options.limit ?? 200 };
    if (options.cursor) {
      params["cursor"] = options.cursor;
    }
    if (options.direction) {
      params["direction"] = options.direction;
    }
    const record = asRecord(await this.query("view/page", params)) ?? {};
    return {
      events: Array.isArray(record["events"]) ? record["events"] : [],
      nextCursor: typeof record["nextCursor"] === "string" ? record["nextCursor"] : null,
    };
  }

  async listPending(sessionId: string): Promise<PendingRequests> {
    const record = asRecord(await this.query("approval/listPending", { sessionId })) ?? {};
    return {
      approvals: Array.isArray(record["approvals"]) ? record["approvals"] : [],
      userInputs: Array.isArray(record["userInputs"]) ? record["userInputs"] : [],
    };
  }

  async sendTurn(
    sessionId: string,
    text: string,
    options: SendTurnOptions = {},
  ): Promise<TurnAck> {
    const params: Record<string, unknown> = {
      sessionId,
      input: turnInput(text, options.images ?? []),
    };
    if (options.displayText !== undefined) {
      params["displayText"] = options.displayText;
    }
    if (options.ifBusy !== undefined) {
      params["ifBusy"] = options.ifBusy;
    }
    if (options.reasoningEffort !== undefined) {
      params["reasoningEffort"] = options.reasoningEffort;
    }
    return toTurnAck(await this.connection.command("turn/start", params));
  }

  async steerTurn(
    sessionId: string,
    expectedTurnId: string,
    text: string,
  ): Promise<unknown> {
    return this.connection.command("turn/steer", {
      sessionId,
      expectedTurnId,
      input: textInput(text),
    });
  }

  async interruptTurn(
    sessionId: string,
    turnId?: string,
    retract = false,
  ): Promise<unknown> {
    const params: Record<string, unknown> = { sessionId, retract };
    if (turnId !== undefined) {
      params["turnId"] = turnId;
    }
    return this.connection.command("turn/interrupt", params);
  }

  async cancelTurn(sessionId: string, turnId: string): Promise<unknown> {
    return this.connection.command("turn/cancel", { sessionId, turnId });
  }

  async unqueueTurn(sessionId: string, turnId: string): Promise<unknown> {
    return this.connection.command("turn/unqueue", { sessionId, turnId });
  }

  async compactSession(sessionId: string): Promise<unknown> {
    return this.connection.command("session/compact", { sessionId });
  }

  /** Runs a shell command the user typed (the terminal UI's `!`) in the session's workspace. Needs the `userShell` capability. */
  async userShell(sessionId: string, commandText: string): Promise<unknown> {
    return this.connection.command("session/userShell", { sessionId, commandText });
  }

  /** Branches a session into a new one that carries every completed turn. */
  async forkSession(sessionId: string): Promise<StartedSession> {
    const result = await this.connection.command("session/fork", { sessionId, excludeItems: true });
    return { sessionId: sessionIdOf(result), raw: result };
  }

  async decideApproval(decision: ApprovalDecision): Promise<unknown> {
    return this.connection.command("approval/decide", {
      sessionId: decision.sessionId,
      approvalId: decision.approvalId,
      requirementId: decision.requirementId,
      choiceId: decision.choiceId,
      feedback: decision.feedback ?? null,
    });
  }

  async listModels(sessionId?: string): Promise<unknown> {
    const params: Record<string, unknown> = {};
    if (sessionId !== undefined) {
      params["sessionId"] = sessionId;
    }
    return this.query("model/list", params);
  }

  async setSessionModel(sessionId: string, model: unknown): Promise<unknown> {
    return this.connection.command("session/setModel", { sessionId, model });
  }

  async setSessionApprovalMode(
    sessionId: string,
    mode: ApprovalMode,
  ): Promise<unknown> {
    return this.connection.command("session/setApprovalMode", { sessionId, mode });
  }

  async answerUserInput(
    sessionId: string,
    userInputId: string,
    answers: UserInputAnswerItem[],
  ): Promise<unknown> {
    return this.connection.command("userInput/answer", {
      sessionId,
      userInputId,
      answers,
    });
  }

  async cancelUserInput(sessionId: string, userInputId: string, reason?: string): Promise<unknown> {
    const params: Record<string, unknown> = { sessionId, userInputId };
    if (reason) {
      params["reason"] = reason;
    }
    return this.connection.command("userInput/cancel", params);
  }

  async clarifyUserInput(sessionId: string, userInputId: string, content: string): Promise<unknown> {
    return this.connection.command("userInput/clarify", {
      sessionId,
      userInputId,
      clarification: { format: "text", content },
    });
  }
}
