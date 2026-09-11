import type {
  ApprovalMode,
  ApprovalRequest,
  ContextUsage,
  Goal,
  MspItem,
  TodoItem,
  TokenTotals,
  TranscriptLoad,
  UserInputAnswer,
  UserInputRequest,
  ViewEvent,
} from "../types.js";

/**
 * The per-thread fold of the MSP view stream. Pure and immutable: every apply returns a new
 * object (or the same one when nothing changed), so React can compare by reference.
 */

export interface TurnInfo {
  turnId: string;
  startedAt?: number;
  completedAt?: number;
  terminal?: string;
  durationMs?: number;
  error?: { kind: string; message: string; retryable: boolean };
  retry?: { attempt: number; maxAttempts: number; nextAttempt: number; reason: string; retryDelayMs: number };
  retracted?: boolean;
}

/** A prompt the user sent that the stream has not echoed back yet. */
export interface LocalEcho {
  localId: string;
  text: string;
  turnId: string | null;
  disposition: "sending" | "started" | "queued" | "steered";
  createdAt: number;
}

export interface ThreadMeta {
  todoList: TodoItem[] | null;
  branch: string | null;
  contextUsage: ContextUsage | null;
  tokenTotals: TokenTotals | null;
  modelId: string | null;
  approvalMode: ApprovalMode | null;
  goal: Goal | null;
}

export interface ThreadFold {
  items: Record<string, MspItem>;
  /** Item ids in first-opened order. */
  order: string[];
  turns: Record<string, TurnInfo>;
  activeTurnId: string | null;
  /** Pending approvals and questions for this thread, keyed by id. */
  approvals: Record<string, ApprovalRequest>;
  userInputs: Record<string, UserInputRequest>;
  resolved: Record<string, { decision: string; resolvedBy: string }>;
  settled: Record<string, { outcome: string; answers: UserInputAnswer[] }>;
  echoes: LocalEcho[];
  meta: ThreadMeta;
  /** The host unloaded the session; the next command must resume it first. */
  closed: boolean;
}

export const HIDDEN_KINDS: ReadonlySet<string> = new Set(["reminderChild"]);

export function emptyFold(): ThreadFold {
  return {
    items: {},
    order: [],
    turns: {},
    activeTurnId: null,
    approvals: {},
    userInputs: {},
    resolved: {},
    settled: {},
    echoes: [],
    meta: {
      todoList: null,
      branch: null,
      contextUsage: null,
      tokenTotals: null,
      modelId: null,
      approvalMode: null,
      goal: null,
    },
    closed: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberOr(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asItem(value: unknown): MspItem | null {
  const record = asRecord(value);
  if (!record || typeof record["itemId"] !== "string" || typeof record["kind"] !== "string") {
    return null;
  }
  return {
    ...record,
    status: typeof record["status"] === "string" ? record["status"] : "completed",
    revision: typeof record["revision"] === "number" ? record["revision"] : 1,
  } as MspItem;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isApprovalMode(value: unknown): value is ApprovalMode {
  return value === "allowAll" || value === "denyUnmatched" || value === "onRequest" || value === "promptUnmatched";
}

/** Mutable working copy used inside one batch; collections are copied once, on first write. */
class Draft {
  fold: ThreadFold;
  private orderCopied = false;
  private echoesCopied = false;

  constructor(base: ThreadFold) {
    this.fold = {
      ...base,
      items: { ...base.items },
      turns: { ...base.turns },
      approvals: { ...base.approvals },
      userInputs: { ...base.userInputs },
      resolved: { ...base.resolved },
      settled: { ...base.settled },
      meta: { ...base.meta },
    };
  }

  pushOrder(id: string): void {
    if (!this.orderCopied) {
      this.fold.order = [...this.fold.order];
      this.orderCopied = true;
    }
    this.fold.order.push(id);
  }

  removeEcho(index: number): void {
    if (!this.echoesCopied) {
      this.fold.echoes = [...this.fold.echoes];
      this.echoesCopied = true;
    }
    this.fold.echoes.splice(index, 1);
  }

  patchEcho(index: number, patch: Partial<LocalEcho>): void {
    if (!this.echoesCopied) {
      this.fold.echoes = [...this.fold.echoes];
      this.echoesCopied = true;
    }
    this.fold.echoes[index] = { ...(this.fold.echoes[index] as LocalEcho), ...patch };
  }
}

function upsertItem(draft: Draft, incoming: MspItem): void {
  const d = draft.fold;
  const current = d.items[incoming.itemId];
  if (!current) {
    d.items[incoming.itemId] = incoming;
    draft.pushOrder(incoming.itemId);
    if (incoming.kind === "userMessage") {
      matchEcho(draft, incoming);
    }
    return;
  }
  const currentDone = current.status !== "inProgress";
  const incomingDone = incoming.status !== "inProgress";
  const newer =
    incoming.revision > current.revision ||
    current.revision === 0 ||
    (incoming.revision === current.revision && incomingDone && !currentDone);
  if (!newer) {
    return;
  }
  const next: MspItem = { ...incoming };
  // A final that arrives empty keeps what already streamed in.
  if (!next.text && current.text) {
    next.text = current.text;
  }
  if (!next.visibleOutput && current.visibleOutput) {
    next.visibleOutput = current.visibleOutput;
  }
  if ((!next.summary || next.summary.length === 0) && current.summary && current.summary.length > 0) {
    next.summary = current.summary;
  }
  if (next.turnId === undefined && current.turnId !== undefined) {
    next.turnId = current.turnId;
  }
  d.items[incoming.itemId] = next;
}

function matchEcho(draft: Draft, item: MspItem): void {
  const echoes = draft.fold.echoes;
  if (echoes.length === 0) {
    return;
  }
  const text = normalizeText(item.displayText ?? item.text ?? "");
  let index = echoes.findIndex(
    (e) => e.turnId !== null && (e.turnId === item.turnId || e.turnId === item.commandId) && normalizeText(e.text) === text,
  );
  if (index < 0) {
    index = echoes.findIndex((e) => normalizeText(e.text) === text);
  }
  if (index >= 0) {
    draft.removeEcho(index);
  }
}

function appendDelta(draft: Draft, params: Record<string, unknown>): void {
  const d = draft.fold;
  const id = str(params["itemId"]);
  const delta = typeof params["delta"] === "string" ? params["delta"] : "";
  if (!id || !delta) {
    return;
  }
  const field = str(params["field"]) ?? "text";
  let item = d.items[id];
  if (!item) {
    item = {
      itemId: id,
      kind: field === "output" ? "toolCall" : field.startsWith("summary") ? "reasoning" : "agentMessage",
      status: "inProgress",
      revision: 0,
    };
    draft.pushOrder(id);
  } else if (item.status !== "inProgress") {
    // The authoritative final already landed; a late delta would duplicate text.
    return;
  }
  const next: MspItem = { ...item };
  if (field === "text") {
    next.text = (next.text ?? "") + delta;
  } else if (field === "output") {
    next.visibleOutput = (next.visibleOutput ?? "") + delta;
  } else if (field.startsWith("summary.")) {
    const index = Number(field.slice("summary.".length));
    if (Number.isInteger(index) && index >= 0) {
      const summary = [...(next.summary ?? [])];
      while (summary.length < index) {
        summary.push("");
      }
      summary[index] = (summary[index] ?? "") + delta;
      next.summary = summary;
    }
  } else {
    const previous = next[field];
    next[field] = (typeof previous === "string" ? previous : "") + delta;
  }
  d.items[id] = next;
}

function applyOne(draft: Draft, event: ViewEvent): void {
  const d = draft.fold;
  const params = event.params;
  switch (event.method) {
    case "item/started":
    case "item/updated":
    case "item/completed": {
      const item = asItem(params["item"]);
      if (item) {
        upsertItem(draft, item);
      }
      break;
    }
    case "item/delta":
      appendDelta(draft, params);
      break;
    case "turn/started": {
      const turnId = str(params["turnId"]);
      if (!turnId) {
        break;
      }
      const previous = d.turns[turnId];
      d.turns[turnId] = { ...previous, turnId, startedAt: previous?.startedAt ?? event.at };
      if (!previous?.terminal) {
        d.activeTurnId = turnId;
      }
      d.closed = false;
      const echo = d.echoes.findIndex((e) => e.turnId === turnId && e.disposition === "queued");
      if (echo >= 0) {
        draft.patchEcho(echo, { disposition: "started" });
      }
      break;
    }
    case "turn/completed": {
      const turnId = str(params["turnId"]);
      if (!turnId) {
        break;
      }
      const error = asRecord(params["error"]);
      d.turns[turnId] = {
        ...d.turns[turnId],
        turnId,
        terminal: str(params["terminal"]) ?? "completed",
        durationMs: numberOr(params["durationMs"]) ?? d.turns[turnId]?.durationMs,
        completedAt: event.at ?? d.turns[turnId]?.completedAt,
        error: error
          ? {
              kind: str(error["kind"]) ?? "error",
              message: str(error["message"]) ?? "The turn failed.",
              retryable: error["retryable"] === true,
            }
          : undefined,
        retry: undefined,
      };
      if (d.activeTurnId === turnId) {
        d.activeTurnId = null;
      }
      const echo = d.echoes.findIndex((e) => e.turnId === turnId);
      if (echo >= 0 && d.turns[turnId]?.terminal !== "completed") {
        draft.removeEcho(echo);
      }
      break;
    }
    case "turn/retryScheduled": {
      const turnId = str(params["turnId"]);
      if (turnId) {
        d.turns[turnId] = {
          ...d.turns[turnId],
          turnId,
          retry: {
            attempt: numberOr(params["attempt"]) ?? 1,
            maxAttempts: numberOr(params["maxAttempts"]) ?? 1,
            nextAttempt: numberOr(params["nextAttempt"]) ?? 2,
            reason: str(params["reason"]) ?? "",
            retryDelayMs: numberOr(params["retryDelayMs"]) ?? 0,
          },
        };
      }
      break;
    }
    case "turn/retracted": {
      const turnId = str(params["turnId"]);
      if (turnId) {
        d.turns[turnId] = { ...d.turns[turnId], turnId, retracted: true };
      }
      break;
    }
    case "turn/unqueued": {
      const turnId = str(params["turnId"]);
      if (turnId) {
        d.turns[turnId] = { ...d.turns[turnId], turnId, terminal: "unqueued" };
        const echo = d.echoes.findIndex((e) => e.turnId === turnId);
        if (echo >= 0) {
          draft.removeEcho(echo);
        }
      }
      break;
    }
    case "approval/requested":
    case "approval/updated": {
      const id = str(params["approvalId"]);
      if (id && !d.resolved[id]) {
        d.approvals[id] = { ...d.approvals[id], ...(params as unknown as ApprovalRequest) };
      }
      break;
    }
    case "approval/resolved": {
      const id = str(params["approvalId"]);
      if (id) {
        delete d.approvals[id];
        d.resolved[id] = {
          decision: str(params["decision"]) ?? "resolved",
          resolvedBy: str(params["resolvedBy"]) ?? "user",
        };
      }
      break;
    }
    case "userInput/requested": {
      const id = str(params["userInputId"]);
      if (id && !d.settled[id]) {
        d.userInputs[id] = params as unknown as UserInputRequest;
      }
      break;
    }
    case "userInput/settled": {
      const id = str(params["userInputId"]);
      if (id) {
        delete d.userInputs[id];
        d.settled[id] = {
          outcome: str(params["outcome"]) ?? "answered",
          answers: Array.isArray(params["answers"]) ? (params["answers"] as UserInputAnswer[]) : [],
        };
      }
      break;
    }
    case "session/todoListChanged":
      d.meta.todoList = Array.isArray(params["items"]) ? (params["items"] as TodoItem[]) : [];
      break;
    case "session/branchChanged":
      d.meta.branch = str(params["branch"]);
      break;
    case "session/contextUsage":
      d.meta.contextUsage = {
        usedTokens: numberOr(params["usedTokens"]) ?? 0,
        windowTokens: numberOr(params["windowTokens"]),
        pressure: str(params["pressure"]) ?? "normal",
      };
      break;
    case "session/tokenUsage": {
      const cumulative = asRecord(params["cumulative"]);
      if (cumulative) {
        d.meta.tokenTotals = {
          promptTokens: numberOr(cumulative["promptTokens"]) ?? 0,
          outputTokens: numberOr(cumulative["outputTokens"]) ?? 0,
          totalTokens: numberOr(cumulative["totalTokens"]) ?? 0,
        };
      }
      break;
    }
    case "session/modelChanged":
      d.meta.modelId = str(params["modelId"]) ?? d.meta.modelId;
      break;
    case "session/approvalModeChanged":
      if (isApprovalMode(params["mode"])) {
        d.meta.approvalMode = params["mode"];
      }
      break;
    case "session/goalChanged": {
      const goal = asRecord(params["goal"]);
      d.meta.goal = goal ? (goal as unknown as Goal) : null;
      break;
    }
    case "session/started": {
      const session = asRecord(params["session"]);
      if (session) {
        d.meta.modelId = str(session["modelId"]) ?? d.meta.modelId;
        const mode = asRecord(session["approvalMode"])?.["mode"];
        if (isApprovalMode(mode)) {
          d.meta.approvalMode = mode;
        }
      }
      d.closed = false;
      break;
    }
    case "session/closed":
      d.closed = true;
      d.activeTurnId = null;
      break;
    default:
      break;
  }
}

/** Apply a batch of view events. Returns the input fold untouched when the batch is empty. */
export function applyEvents(fold: ThreadFold, events: readonly ViewEvent[]): ThreadFold {
  if (events.length === 0) {
    return fold;
  }
  const draft = new Draft(fold);
  for (const event of events) {
    applyOne(draft, event);
  }
  return draft.fold;
}

export function applyEvent(fold: ThreadFold, event: ViewEvent): ThreadFold {
  return applyEvents(fold, [event]);
}

/** Build a fold from a resume response; the server's pending set is authoritative. */
export function foldFromLoad(load: TranscriptLoad, previous?: ThreadFold | null): ThreadFold {
  let fold = applyEvents(emptyFold(), load.events);
  const approvals: Record<string, ApprovalRequest> = {};
  for (const approval of load.pending.approvals) {
    approvals[approval.approvalId] = approval;
  }
  const userInputs: Record<string, UserInputRequest> = {};
  for (const input of load.pending.userInputs) {
    userInputs[input.userInputId] = input;
  }
  fold = {
    ...fold,
    approvals,
    userInputs,
    activeTurnId: load.msp ? load.msp.activeTurnId : fold.activeTurnId,
    echoes: previous?.echoes ?? [],
    meta: {
      ...fold.meta,
      modelId: fold.meta.modelId ?? load.msp?.modelId ?? load.session?.modelId ?? null,
      approvalMode: fold.meta.approvalMode ?? (isApprovalMode(load.msp?.approvalMode) ? load.msp.approvalMode : null),
    },
    closed: false,
  };
  return fold;
}

export function addEcho(fold: ThreadFold, echo: LocalEcho): ThreadFold {
  return { ...fold, echoes: [...fold.echoes, echo] };
}

export function updateEcho(fold: ThreadFold, localId: string, patch: Partial<LocalEcho>): ThreadFold {
  const index = fold.echoes.findIndex((e) => e.localId === localId);
  if (index < 0) {
    return fold;
  }
  // If the stream already echoed this prompt back, the local copy is done.
  if (patch.turnId && patch.disposition !== "queued") {
    const echo = fold.echoes[index] as LocalEcho;
    const landed = fold.order.some((id) => {
      const item = fold.items[id];
      return (
        item?.kind === "userMessage" &&
        (item.turnId === patch.turnId || item.commandId === patch.turnId) &&
        normalizeText(item.displayText ?? item.text ?? "") === normalizeText(echo.text)
      );
    });
    if (landed) {
      return removeEcho(fold, localId);
    }
  }
  const echoes = [...fold.echoes];
  echoes[index] = { ...(echoes[index] as LocalEcho), ...patch };
  return { ...fold, echoes };
}

export function removeEcho(fold: ThreadFold, localId: string): ThreadFold {
  const echoes = fold.echoes.filter((e) => e.localId !== localId);
  return echoes.length === fold.echoes.length ? fold : { ...fold, echoes };
}

/** One turn as the transcript renders it. */
export interface TurnView {
  key: string;
  turnId: string | null;
  prompt: MspItem | null;
  /** Everything between the prompt and the final reply, in stream order. */
  entries: MspItem[];
  /** The closing agent message of a finished turn, shown outside the work log. */
  final: MspItem | null;
  info: TurnInfo | null;
  running: boolean;
}

export function buildTurns(fold: ThreadFold): TurnView[] {
  const byKey = new Map<string, TurnView>();
  const views: TurnView[] = [];
  for (const id of fold.order) {
    const item = fold.items[id];
    if (!item || HIDDEN_KINDS.has(item.kind) || (item.kind === "userMessage" && item.retracted)) {
      continue;
    }
    const key = item.turnId ? `turn:${item.turnId}` : `item:${id}`;
    let view = byKey.get(key);
    if (!view) {
      view = {
        key,
        turnId: item.turnId ?? null,
        prompt: null,
        entries: [],
        final: null,
        info: item.turnId ? (fold.turns[item.turnId] ?? null) : null,
        running: item.turnId ? fold.activeTurnId === item.turnId : false,
      };
      byKey.set(key, view);
      views.push(view);
    }
    if (item.kind === "userMessage" && !item.steered && !view.prompt) {
      view.prompt = item;
    } else {
      view.entries.push(item);
    }
  }
  for (const view of views) {
    if (view.running) {
      continue;
    }
    const last = view.entries[view.entries.length - 1];
    if (last && last.kind === "agentMessage" && (last.text ?? "").trim().length > 0) {
      view.final = last;
      view.entries = view.entries.slice(0, -1);
    }
  }
  return views;
}

/** The pending approval or question that gates a given tool item, if any. */
export function gateFor(
  fold: ThreadFold,
  itemId: string,
): { kind: "approval"; request: ApprovalRequest } | { kind: "input"; request: UserInputRequest } | null {
  for (const request of Object.values(fold.approvals)) {
    if (request.itemId === itemId) {
      return { kind: "approval", request };
    }
  }
  for (const request of Object.values(fold.userInputs)) {
    if (request.itemId === itemId) {
      return { kind: "input", request };
    }
  }
  return null;
}
