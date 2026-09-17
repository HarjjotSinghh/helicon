import type {
  ApprovalMode,
  EnvironmentStatus,
  FileContent,
  FileEntry,
  FileListing,
  GoalAction,
  HeliconEvent,
  IfBusy,
  ModelOption,
  OutgoingAttachment,
  OutputRange,
  PlanUsage,
  ProjectView,
  ReasoningEffort,
  SessionSummary,
  SkillCatalog,
  SubagentAction,
  TaskAction,
  TitleSettings,
  TranscriptLoad,
  UserInputAnswer,
  WorkflowAction,
} from "./types.js";
import { listedPrice } from "./model/pricing.js";

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
  /** What the transcript shows in place of the text the model gets, like `/plan tidy the API`. */
  displayText?: string;
  /** Files the user attached: images reach the model, anything else lands in the workspace as a mention. */
  attachments?: OutgoingAttachment[];
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
  /** `create` makes the folder first when it does not exist. */
  addProject(cwd: string, options?: { create?: boolean }): Promise<{ cwd: string; warning: string | null }>;
  cloneProject(url: string, path: string): Promise<{ cwd: string; warning: string | null }>;
  listDirectory(path: string): Promise<import("./types.js").DirectoryListing>;
  /** Opens a folder in the OS file manager. */
  revealPath(path: string): Promise<void>;
  hideProject(cwd: string): Promise<void>;
  setPinned(cwd: string, pinned: boolean): Promise<void>;
  /** The order the user dragged the sidebar's projects into. */
  setProjectOrder(cwds: string[]): Promise<void>;
  /** Token usage across every thread the server has seen, for the usage page. */
  usage(days?: number): Promise<import("./types.js").UsageReport>;
  listSessions(options?: { archived?: boolean }): Promise<SessionSummary[]>;
  discover(cwd?: string): Promise<void>;
  startSession(cwd: string, options?: { approvalMode?: ApprovalMode; modelId?: string }): Promise<SessionSummary>;
  loadTranscript(sessionId: string): Promise<TranscriptLoad>;
  /**
   * A server path the browser loads by itself, like an attachment's bytes, returned with whatever the
   * client's own calls carry: a token-protected server refuses a bare one.
   */
  assetUrl(path: string): string;
  updateSession(sessionId: string, patch: { title?: string; archived?: boolean; settled?: boolean }): Promise<SessionSummary | null>;
  /** `attachments` come back saved, so the open thread can show them without waiting for a reload. */
  sendTurn(
    sessionId: string,
    text: string,
    options?: TurnOptions,
  ): Promise<{ turnId: string | null; disposition: string | null; attachments?: import("./types.js").AttachmentView[] }>;
  interruptTurn(sessionId: string, turnId?: string): Promise<void>;
  unqueueTurn(sessionId: string, turnId: string): Promise<void>;
  decideApproval(input: ApprovalDecisionInput): Promise<void>;
  answerUserInput(sessionId: string, userInputId: string, answers: UserInputAnswer[]): Promise<void>;
  cancelUserInput(sessionId: string, userInputId: string): Promise<void>;
  clarifyUserInput(sessionId: string, userInputId: string, content: string): Promise<void>;
  listModels(sessionId?: string): Promise<ModelOption[]>;
  getTitleSettings(): Promise<TitleSettings>;
  setTitleSettings(patch: { enabled?: boolean; modelId?: string | null }): Promise<TitleSettings>;
  setSessionModel(sessionId: string, modelId: string): Promise<void>;
  setApprovalMode(sessionId: string, mode: ApprovalMode): Promise<void>;
  /** `noop` when Muse had nothing to summarize; `reason` is its snake_case explanation. */
  compact(sessionId: string): Promise<{ noop: boolean; reason: string | null }>;
  /** Runs a shell command in the session's workspace; its output arrives as a `userShell` item. */
  runShell(sessionId: string, command: string): Promise<void>;
  /** Runs a `!` command in the workspace from Helicon itself, for hosts that cannot run one. */
  runShellProxy(sessionId: string, command: string): Promise<import("./types.js").ShellRun>;
  /** Branches a thread into a new one carrying every completed turn. */
  forkSession(sessionId: string): Promise<SessionSummary>;
  /** With a loaded session, Muse's own list for it; otherwise the workspace's list from the CLI. */
  listSkills(cwd: string, sessionId?: string): Promise<SkillCatalog>;
  /** The full instructions of a skill, without its frontmatter. */
  skillBody(cwd: string, skillId: string): Promise<string>;
  openFolder(cwd: string, target: "files" | "editor"): Promise<void>;
  /** The session's standing reasoning effort, which is what Muse applies to its turns. */
  setReasoningEffort(sessionId: string, effort: ReasoningEffort): Promise<void>;
  /** `set` and `edit` need the objective. A verb that wakes a turn returns its id. */
  goal(sessionId: string, action: GoalAction, objective?: string): Promise<{ turnId: string | null }>;
  /** A control on a `subagent` item. `body` is the message or follow-up task text. */
  subagent(sessionId: string, action: SubagentAction, subagentId: string, options?: { reason?: string; body?: string }): Promise<void>;
  /** `background` and `stop` take the tool call's item id; `stopAll` stops every background task in the session. */
  task(sessionId: string, action: TaskAction, taskId?: string): Promise<void>;
  /** `cancel` stops the run; `skip` and `retry` act on one child at its current attempt. */
  workflow(sessionId: string, action: WorkflowAction, workflowRunId: string, child?: { childId: string; attempt: number }): Promise<void>;
  /** One page of a tool's full stored output, from `offset` bytes in. */
  readOutput(sessionId: string, itemId: string, outputRef: string, offset?: number): Promise<OutputRange>;
  /** The subscription window Muse last saw; null until a host has seen one. */
  planUsage(): Promise<PlanUsage | null>;
  /** One folder of a project, folders first. `path` is relative to the project; "" is its root. */
  listFiles(cwd: string, path: string): Promise<FileListing>;
  /** A project file: text inline, media described. `path` may also be absolute inside the project. */
  readFile(cwd: string, path: string): Promise<FileContent>;
  /** Saves text back. Refused with kind `fileChanged` when the file moved on since `baseMtimeMs`. */
  writeFile(cwd: string, path: string, content: string, baseMtimeMs: number | null): Promise<{ path: string; size: number; mtimeMs: number }>;
  /** Files whose path contains every word of `query`. */
  searchFiles(cwd: string, query: string): Promise<FileEntry[]>;
  /** Opens a project file in the OS's default app. */
  openFileExternally(cwd: string, path: string): Promise<void>;
  /** Where the browser loads a project file's bytes from, for images, video, audio and PDFs. */
  fileUrl(cwd: string, path: string): string;
  /** Subscribe to server events; returns an unsubscribe function. */
  subscribe(handler: EventHandler): () => void;
}

/** Parse the title-settings endpoint; malformed answers fall back to on with no model. */
export function parseTitleSettings(value: unknown): TitleSettings {
  const r = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    enabled: typeof r["enabled"] === "boolean" ? r["enabled"] : true,
    modelId: typeof r["modelId"] === "string" && r["modelId"].trim() ? r["modelId"] : null,
  };
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
      outputLimit: typeof r["outputLimit"] === "number" ? r["outputLimit"] : null,
      // Muse's catalog carries no prices today, so the published table stands in when it lists none.
      cost: parseCost(r["cost"]) ?? listedPrice(modelId),
      contributor: /contributor/i.test(modelId) || /product improvement/i.test(description ?? ""),
    });
  }
  return options;
}

/** Catalog prices arrive as decimal strings per million tokens. */
function parseCost(value: unknown): ModelOption["cost"] {
  if (!value || typeof value !== "object") {
    return null;
  }
  const r = value as Record<string, unknown>;
  const amount = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : Number.NaN;
    return Number.isFinite(n) ? n : null;
  };
  const input = amount(r["input"]);
  const output = amount(r["output"]);
  if (input === null || output === null) {
    return null;
  }
  return { input, output, cached: amount(r["cached"]) ?? input, currency: typeof r["currency"] === "string" ? r["currency"] : null };
}
