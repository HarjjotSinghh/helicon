/** Domain types shared by the UI, the client contract and the pure fold logic. */

export type ApprovalMode = "allowAll" | "denyUnmatched" | "onRequest" | "promptUnmatched";
export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "ultra";
export type IfBusy = "queue" | "steer";

export interface EnvironmentStatus {
  platform: string;
  wslAvailable: boolean;
  defaultDistro: string | null;
  museFound: boolean;
  musePath: string | null;
  version: string;
  persistent: boolean;
}

export interface ProjectView {
  cwd: string;
  displayName: string;
  pinned: boolean;
  activityAt: string;
}

/** Server-tracked live state for a session; null until the server has seen it run. */
export interface LiveView {
  activeTurnId: string | null;
  turnStartedAt: string | null;
  pendingApprovals: number;
  pendingInputs: number;
  lastTerminal: string | null;
  lastError: string | null;
  /** The session's goal as the server last saw it, for threads the UI has not opened. */
  goal?: Goal | null;
}

export interface SessionSummary {
  sessionId: string;
  cwd: string;
  title: string;
  titleSource: "placeholder" | "auto" | "user";
  turnCount: number;
  modelId: string | null;
  origin: string;
  archived: boolean;
  createdAt: string;
  activityAt: string;
  /** Shelved out of the active list, by hand or after days without activity. */
  settled: boolean;
  settledAt: string | null;
  /** When it was last brought back from the shelf; keeps its place in the active list. */
  unsettledAt: string | null;
  live: LiveView | null;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface WorkflowChild {
  childId: string;
  attempt: number;
  label?: string;
  phase?: string;
  status: string;
  terminal?: string;
}

/** One MSP transcript item at some revision. Unknown fields are kept and ignored. */
export interface MspItem {
  itemId: string;
  kind: string;
  status: string;
  revision: number;
  turnId?: string | null;
  recordedAt?: string;
  fallbackText?: string;
  text?: string;
  displayText?: string;
  steered?: boolean;
  retracted?: boolean;
  commandId?: string;
  tool?: string;
  args?: string;
  callId?: string;
  approvalId?: string;
  visibleOutput?: string;
  truncated?: boolean;
  failureKind?: string;
  failureReason?: string;
  background?: boolean;
  summary?: string[];
  commandText?: string;
  exitCode?: number;
  exitSignal?: number;
  durationMs?: number;
  objective?: string;
  role?: string;
  controlStatus?: string;
  result?: { summary?: string; text?: string; errorKind?: string };
  usage?: TokenUsage;
  children?: WorkflowChild[];
  message?: string;
  outcome?: string;
  reason?: string;
  trigger?: string;
  tokensBefore?: number;
  tokensAfter?: number;
  [key: string]: unknown;
}

export interface ApprovalChoice {
  choiceId: string;
  label: string;
  decision: string;
  scope: string;
  acceptsFeedback?: boolean;
  rulePreview?: string;
}

export interface ApprovalStage {
  argv: string[];
  position: number;
  totalStages: number;
}

export interface ApprovalSubject {
  kind: string;
  command?: string;
  path?: string;
  access?: string;
  host?: string;
  port?: number;
  protocol?: string;
  toolName?: string;
  target?: string;
  workspaceRoot?: string;
  stages?: ApprovalStage[];
}

export interface ApprovalRequest {
  approvalId: string;
  sessionId: string;
  availableChoices: ApprovalChoice[];
  currentRequirementId: unknown;
  subject: ApprovalSubject;
  itemId?: string;
  toolName?: string;
  toolCallId?: string;
  turnId?: string;
  rawArgs?: string;
  protectedWrite?: boolean;
  judgeEscalated?: boolean;
}

export interface UserInputOption {
  label: string;
  description?: string;
  preview?: { content: string; format: string };
}

export interface UserInputQuestion {
  id: string;
  header: string;
  question: string;
  options: UserInputOption[];
  selection: { mode: "single" | "multiple" | string; minSelections?: number; maxSelections?: number };
}

export interface UserInputRequest {
  userInputId: string;
  sessionId: string;
  questions: UserInputQuestion[];
  itemId?: string;
  toolName?: string;
  turnId?: string;
  autoResolutionMs?: number;
}

export interface UserInputAnswer {
  questionId: string;
  selectedLabel?: string;
  selectedLabels?: string[];
  freeText?: string;
  note?: string;
}

export interface TodoItem {
  text: string;
  status: string;
  activeForm?: string;
}

export interface ContextUsage {
  usedTokens: number;
  windowTokens?: number;
  pressure: string;
}

export interface TokenTotals {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface Goal {
  objective: string;
  status: string;
  percentComplete: number;
  currentWork?: string;
  nextWork?: string;
}

export interface ModelOption {
  modelId: string;
  displayLabel: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  contextLimit: number | null;
  outputLimit: number | null;
  /** Catalog price per million tokens; null when the catalog lists none. */
  cost: { input: number; output: number; cached: number; currency: string | null } | null;
  /** Contributor-tier models may use prompts and outputs for product improvement. */
  contributor: boolean;
}

/** A skill Muse can load in a workspace, from `muse skills list`. Skills switched off are left out. */
export interface SkillEntry {
  id: string;
  name: string;
  displayName: string;
  /** Written for the model, so often long; menus show `shortDescription` or its first sentence. */
  description: string;
  shortDescription: string | null;
  scope: string;
  /** `on`, or `user-invocable-only` for skills the model never loads by itself. */
  activation: string;
}

/** The skills for one workspace; `error` says why the list is empty when loading failed. */
export interface SkillCatalog {
  skills: SkillEntry[];
  error: string | null;
}

/** The subfolders of one folder, for the add-project picker. */
export interface DirectoryListing {
  /** The folder listed, as an absolute path in the user's style (`~` expanded). */
  directory: string;
  parent: string | null;
  separator: "/" | "\\";
  exists: boolean;
  entries: { name: string }[];
}

/** A view notification, live or paged from history. `at` is the emission time when known. */
export interface ViewEvent {
  method: string;
  params: Record<string, unknown>;
  at?: number;
}

export interface TranscriptLoad {
  session: SessionSummary | null;
  msp: {
    status: string | null;
    activeTurnId: string | null;
    modelId: string | null;
    approvalMode: string | null;
    workspaceRoot: string | null;
    turnCount: number;
    contextUsage?: ContextUsage | null;
    tokenUsage?: TokenTotals | null;
  } | null;
  events: ViewEvent[];
  truncated: boolean;
  pending: { approvals: ApprovalRequest[]; userInputs: UserInputRequest[] };
  readOnly: boolean;
  readOnlyReason: string | null;
}

export type HeliconEvent =
  | { type: "hello"; version: string }
  | { type: "msp"; sessionId: string; method: string; params: Record<string, unknown>; at: number }
  | { type: "session-status"; sessionId: string; live: LiveView | null }
  | { type: "sessions-changed" }
  | { type: "host"; key: string; state: string; message: string }
  | { type: "connection"; state: "open" | "lost" };
