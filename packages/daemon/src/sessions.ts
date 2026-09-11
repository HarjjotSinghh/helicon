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
}

export type NotificationHandler = (notification: MspNotification) => void;

export interface CommandConnection {
  command(method: string, params?: Record<string, unknown>): Promise<unknown>;
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

export interface SendTurnOptions {
  displayText?: string;
  ifBusy?: string;
  reasoningEffort?: string;
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

export class SessionManager {
  constructor(private readonly connection: CommandConnection) {}

  onNotification(handler: NotificationHandler): void {
    this.connection.onNotification(handler);
  }

  async listSessions(workspaceRoot?: string, limit = 50): Promise<unknown[]> {
    const params: Record<string, unknown> = { limit };
    if (workspaceRoot !== undefined) {
      params["workspaceRoot"] = workspaceRoot;
    }
    const result = await this.connection.command("session/list", params);
    const record = asRecord(result);
    if (record && Array.isArray(record["sessions"])) {
      return record["sessions"];
    }
    if (Array.isArray(result)) {
      return result;
    }
    return [];
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

  async readSession(sessionId: string): Promise<unknown> {
    return this.connection.command("session/read", { sessionId, excludeItems: true });
  }

  async sendTurn(
    sessionId: string,
    text: string,
    options: SendTurnOptions = {},
  ): Promise<TurnAck> {
    const params: Record<string, unknown> = {
      sessionId,
      input: textInput(text),
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
    return this.connection.command("model/list", params);
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
}
