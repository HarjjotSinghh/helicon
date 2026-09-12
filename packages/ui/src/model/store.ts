import type {
  ApprovalMode,
  AttachmentView,
  EnvironmentStatus,
  ModelOption,
  OutgoingAttachment,
  ProjectView,
  ReasoningEffort,
  SessionSummary,
  ShellRun,
  SkillEntry,
} from "../types.js";
import type { EchoAttachment, ThreadFold } from "./fold.js";
import type { UpdateState } from "./updates.js";

/** A tiny external store: immutable snapshots plus change listeners, read through useSyncExternalStore-style hooks. */
export class Store<T> {
  private state: T;
  private readonly listeners = new Set<() => void>();

  constructor(initial: T) {
    this.state = initial;
  }

  get = (): T => this.state;

  set = (update: (state: T) => T): void => {
    const next = update(this.state);
    if (next === this.state) {
      return;
    }
    this.state = next;
    for (const listener of [...this.listeners]) {
      listener();
    }
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

export type GroupBy = "project" | "status";
export type ThemePref = "system" | "light" | "dark";
/** Syntax colours for code blocks, independent of the app's own light or dark theme. */
export const CODE_THEMES = ["helicon", "ayu", "github", "vercel", "cursor", "catppuccin"] as const;
export type CodeTheme = (typeof CODE_THEMES)[number];

export interface Prefs {
  groupBy: GroupBy;
  theme: ThemePref;
  codeTheme: CodeTheme;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  collapsedProjects: string[];
  /** Settled shelves the user opened: `project:<cwd>`, or `status` for the by-status view. */
  openShelves: string[];
  /** When the user last viewed each thread (ISO). */
  lastSeen: Record<string, string>;
  /** Activity before the first launch is treated as already seen. */
  baseline: string;
  defaultMode: ApprovalMode;
  defaultModelId: string | null;
  effort: ReasoningEffort | null;
  /** The last project a new thread was started in. */
  lastProject: string | null;
  /** Contributor-tier data use was acknowledged. */
  contributorAck: boolean;
  /** Desktop app: download new versions as they appear and install them on close. */
  autoUpdate: boolean;
  /** Desktop app: no checking, downloading or installing updates until resumed. */
  updatesPaused: boolean;
}

export const DEFAULT_SIDEBAR_WIDTH = 284;

export function defaultPrefs(now = new Date().toISOString()): Prefs {
  return {
    groupBy: "project",
    theme: "system",
    codeTheme: "helicon",
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    sidebarCollapsed: false,
    collapsedProjects: [],
    openShelves: [],
    lastSeen: {},
    baseline: now,
    defaultMode: "onRequest",
    defaultModelId: null,
    effort: null,
    lastProject: null,
    contributorAck: false,
    autoUpdate: true,
    updatesPaused: false,
  };
}

export type Route =
  | { kind: "home" }
  | { kind: "new"; cwd: string | null }
  | { kind: "thread"; sessionId: string }
  | { kind: "usage" };

export interface ThreadState {
  load: "idle" | "loading" | "ready" | "error";
  error: string | null;
  readOnly: boolean;
  readOnlyReason: string | null;
  truncated: boolean;
  fold: ThreadFold;
  /** Files sent with this thread's prompts; Muse's own view keeps metadata only. */
  attachments: AttachmentView[];
  /** `!` commands Helicon ran itself, which Muse's transcript never sees. */
  shellRuns: ShellRun[];
}

export interface Toast {
  id: number;
  tone: "error" | "info" | "success";
  title: string;
  detail?: string;
  action?: { label: string; run: () => void };
}

export interface AppState {
  boot: "loading" | "ready" | "error";
  bootError: string | null;
  env: EnvironmentStatus | null;
  connection: "connecting" | "open" | "lost";
  projects: ProjectView[];
  sessions: Record<string, SessionSummary>;
  sessionsLoaded: boolean;
  discovering: boolean;
  route: Route;
  threads: Record<string, ThreadState>;
  models: ModelOption[];
  prefs: Prefs;
  toasts: Toast[];
  paletteOpen: boolean;
  addProjectOpen: boolean;
  /** Keys of in-flight user actions, for disabling buttons: `send:<id>`, `approval:<id>`... */
  busy: Record<string, true>;
  hostError: string | null;
  /** A prompt that could not be sent, waiting for the composer showing `key` to take it back, files and all. */
  draftHandoff: { key: string; text: string; attachments?: OutgoingAttachment[]; previews?: EchoAttachment[] } | null;
  /** App updates; null when the shell cannot update itself, as in a browser. */
  updates: UpdateState | null;
  /** Each workspace's skills for the composer's slash menu, loaded when first needed. */
  skills: Record<string, SkillsState>;
  /** A composer picker a slash command opened, like `/model`. */
  picker: ComposerPicker | null;
}

/** `confirmFullAccess` is the full-access confirmation, which `/permissions full` must still pass through. */
export type ComposerPicker = "model" | "effort" | "permissions" | "confirmFullAccess";

export interface SkillsState {
  status: "loading" | "ready" | "error";
  skills: SkillEntry[];
  error: string | null;
  /** When the last load finished, in platform time. */
  loadedAt: number;
}

export function initialState(prefs: Prefs): AppState {
  return {
    boot: "loading",
    bootError: null,
    env: null,
    connection: "connecting",
    projects: [],
    sessions: {},
    sessionsLoaded: false,
    discovering: false,
    route: { kind: "home" },
    threads: {},
    models: [],
    prefs,
    toasts: [],
    paletteOpen: false,
    addProjectOpen: false,
    busy: {},
    hostError: null,
    draftHandoff: null,
    updates: null,
    skills: {},
    picker: null,
  };
}

/** Merge persisted prefs over defaults, dropping anything malformed. */
export function revivePrefs(raw: unknown, fallback: Prefs): Prefs {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const r = raw as Record<string, unknown>;
  const pick = <K extends keyof Prefs>(key: K, valid: (v: unknown) => boolean): Prefs[K] =>
    valid(r[key]) ? (r[key] as Prefs[K]) : fallback[key];
  return {
    groupBy: pick("groupBy", (v) => v === "project" || v === "status"),
    theme: pick("theme", (v) => v === "system" || v === "light" || v === "dark"),
    sidebarWidth: pick("sidebarWidth", (v) => typeof v === "number" && v >= 220 && v <= 480),
    sidebarCollapsed: pick("sidebarCollapsed", (v) => typeof v === "boolean"),
    collapsedProjects: pick("collapsedProjects", (v) => Array.isArray(v) && v.every((x) => typeof x === "string")),
    openShelves: pick("openShelves", (v) => Array.isArray(v) && v.every((x) => typeof x === "string")),
    lastSeen: pick("lastSeen", (v) => typeof v === "object" && v !== null && !Array.isArray(v)),
    baseline: pick("baseline", (v) => typeof v === "string" && !Number.isNaN(Date.parse(v))),
    codeTheme: pick("codeTheme", (v) => CODE_THEMES.includes(v as CodeTheme)),
    defaultMode: pick("defaultMode", (v) => v === "onRequest" || v === "promptUnmatched" || v === "denyUnmatched" || v === "allowAll"),
    defaultModelId: pick("defaultModelId", (v) => v === null || typeof v === "string"),
    effort: pick("effort", (v) => v === null || ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"].includes(v as string)),
    lastProject: pick("lastProject", (v) => v === null || typeof v === "string"),
    contributorAck: pick("contributorAck", (v) => typeof v === "boolean"),
    autoUpdate: pick("autoUpdate", (v) => typeof v === "boolean"),
    updatesPaused: pick("updatesPaused", (v) => typeof v === "boolean"),
  };
}
