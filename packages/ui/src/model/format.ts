import type { ApprovalRequest, MspItem } from "../types.js";

/** Compact relative time for sidebars: now, 4m, 3h, 2d, 3w, then a short date. */
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) {
    return "";
  }
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return "";
  }
  const seconds = Math.max(0, (now - then) / 1000);
  if (seconds < 45) {
    return "now";
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }
  const weeks = Math.round(days / 7);
  if (weeks < 5) {
    return `${weeks}w`;
  }
  return new Date(then).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return "";
  }
  const total = Math.max(0, Math.round(ms / 1000));
  if (total < 1) {
    return "under 1s";
  }
  if (total < 60) {
    return `${total}s`;
  }
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes < 60) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatTokens(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "0";
  }
  if (value < 1000) {
    return String(Math.round(value));
  }
  if (value < 1_000_000) {
    const k = value / 1000;
    return `${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
  }
  const m = value / 1_000_000;
  return `${m < 10 ? m.toFixed(1).replace(/\.0$/, "") : Math.round(m)}M`;
}

export function basename(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || trimmed;
}

/** Keep the tail of a long path readable: `D:\...\helicon\packages\ui`. */
export function shortenPath(path: string, max = 48): string {
  if (path.length <= max) {
    return path;
  }
  const separator = path.includes("\\") ? "\\" : "/";
  const parts = path.split(/[\\/]/);
  let tail = parts.pop() ?? "";
  while (parts.length > 1) {
    const next = parts[parts.length - 1] as string;
    if ((next + separator + tail).length + 4 > max) {
      break;
    }
    tail = next + separator + tail;
    parts.pop();
  }
  const head = parts[0] ?? "";
  return `${head}${separator}...${separator}${tail}`;
}

export function humanize(identifier: string): string {
  const spaced = identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-./]+/g, " ")
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function parseArgs(args: string | undefined): Record<string, unknown> | null {
  if (!args) {
    return null;
  }
  try {
    const parsed = JSON.parse(args) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function pickString(args: Record<string, unknown> | null, keys: string[]): string | null {
  if (!args) {
    return null;
  }
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

export type ToolKind =
  | "shell"
  | "read"
  | "edit"
  | "write"
  | "search"
  | "list"
  | "web"
  | "question"
  | "plan"
  | "agent"
  | "generic";

const PATH_KEYS = ["path", "file_path", "filePath", "filename", "file", "target_file", "targetFile"];
const PATTERN_KEYS = ["pattern", "query", "regex", "search", "q"];

/** Classify a tool by the words in its name, so `frobnicate` never reads as `cat`. */
export function toolKind(tool: string | undefined, args: Record<string, unknown> | null): ToolKind {
  const words = new Set(
    (tool ?? "")
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
  const has = (...candidates: string[]) => candidates.some((c) => words.has(c));
  if (has("ask", "question", "questions") || (has("user") && has("input"))) {
    return "question";
  }
  if (has("todo", "todos", "plan", "todowrite")) {
    return "plan";
  }
  if (has("web", "websearch", "webfetch", "fetch", "http", "browse", "browser", "url")) {
    return "web";
  }
  if (pickString(args, ["command", "cmd"]) || has("bash", "shell", "exec", "execute", "run", "terminal", "powershell", "sh", "cmd")) {
    return "shell";
  }
  if (has("grep", "search", "find", "glob", "rg", "ripgrep")) {
    return "search";
  }
  if (has("edit", "multiedit", "patch", "replace", "apply", "modify")) {
    return "edit";
  }
  if (has("write", "create", "save")) {
    return "write";
  }
  if (has("read", "view", "cat", "open")) {
    return "read";
  }
  if (has("list", "ls", "dir", "tree")) {
    return "list";
  }
  if (has("agent", "task", "subagent", "delegate", "spawn")) {
    return "agent";
  }
  return "generic";
}

export interface ToolDescription {
  kind: ToolKind;
  /** Sentence-start verb for the current state: "Ran", "Running", "Read"... */
  verb: string;
  /** What the tool acted on: a command, path, pattern or URL. */
  subject: string | null;
  /** Render the subject in the code face. */
  mono: boolean;
  /** Optional model-authored explanation, e.g. bash's `description`. */
  note: string | null;
}

const VERBS: Record<ToolKind, [string, string]> = {
  shell: ["Ran", "Running"],
  read: ["Read", "Reading"],
  edit: ["Edited", "Editing"],
  write: ["Wrote", "Writing"],
  search: ["Searched for", "Searching for"],
  list: ["Listed", "Listing"],
  web: ["Fetched", "Fetching"],
  question: ["Asked you", "Asking you"],
  plan: ["Updated the plan", "Updating the plan"],
  agent: ["Delegated", "Delegating"],
  generic: ["Used", "Using"],
};

export function describeTool(item: MspItem): ToolDescription {
  const args = parseArgs(item.args);
  const kind = toolKind(item.tool, args);
  const running = item.status === "inProgress";
  const verb = VERBS[kind][running ? 1 : 0];
  const note = pickString(args, ["description", "reason", "explanation"]);
  switch (kind) {
    case "shell":
      return { kind, verb, subject: pickString(args, ["command", "cmd"]) ?? item.args ?? null, mono: true, note };
    case "read":
    case "edit":
    case "write":
    case "list":
      return { kind, verb, subject: pickString(args, PATH_KEYS) ?? pickString(args, ["directory", "dir"]), mono: true, note };
    case "search": {
      const pattern = pickString(args, PATTERN_KEYS);
      return { kind, verb, subject: pattern, mono: true, note: pickString(args, PATH_KEYS) ?? note };
    }
    case "web": {
      const url = pickString(args, ["url", "uri"]);
      if (url) {
        return { kind, verb, subject: url, mono: true, note };
      }
      return {
        kind,
        verb: running ? "Searching the web for" : "Searched the web for",
        subject: pickString(args, PATTERN_KEYS),
        mono: false,
        note,
      };
    }
    case "question": {
      const questions = args && Array.isArray(args["questions"]) ? (args["questions"] as Record<string, unknown>[]) : [];
      const first = questions[0];
      return {
        kind,
        verb,
        subject: first && typeof first["question"] === "string" ? first["question"] : null,
        mono: false,
        note: null,
      };
    }
    case "plan":
      return { kind, verb, subject: null, mono: false, note };
    case "agent":
      return { kind, verb, subject: pickString(args, ["description", "prompt", "objective", "task"]), mono: false, note: null };
    default: {
      const firstString = args ? Object.values(args).find((v): v is string => typeof v === "string" && v.length < 160) : null;
      return {
        kind,
        verb: running ? "Using" : "Used",
        subject: item.tool ? humanize(item.tool) : "a tool",
        mono: false,
        note: firstString ?? null,
      };
    }
  }
}

export interface DiffHunk {
  removed: string[];
  added: string[];
}

export type DiffView = { path: string | null; hunks: DiffHunk[] } | { path: string | null; patch: string };

function lines(value: unknown): string[] {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").split("\n") : [];
}

/** Pull a reviewable diff out of an edit-style tool call, when its arguments carry one. */
export function extractDiff(item: MspItem): DiffView | null {
  const args = parseArgs(item.args);
  if (!args) {
    return null;
  }
  const path = pickString(args, PATH_KEYS);
  const oldKey = ["old_string", "oldString", "old_str", "search", "old"].find((k) => typeof args[k] === "string");
  const newKey = ["new_string", "newString", "new_str", "replace", "new"].find((k) => typeof args[k] === "string");
  if (oldKey && newKey) {
    return { path, hunks: [{ removed: lines(args[oldKey]), added: lines(args[newKey]) }] };
  }
  if (Array.isArray(args["edits"])) {
    const hunks: DiffHunk[] = [];
    for (const edit of args["edits"] as unknown[]) {
      const e = edit && typeof edit === "object" ? (edit as Record<string, unknown>) : null;
      if (!e) {
        continue;
      }
      const o = e["old_string"] ?? e["oldString"] ?? e["old_str"];
      const n = e["new_string"] ?? e["newString"] ?? e["new_str"];
      if (typeof o === "string" || typeof n === "string") {
        hunks.push({ removed: lines(o), added: lines(n) });
      }
    }
    if (hunks.length > 0) {
      return { path, hunks };
    }
  }
  const patch = pickString(args, ["patch", "diff", "input"]);
  if (patch && /^(\*\*\* |--- |\+\+\+ |@@|diff --git)/m.test(patch)) {
    return { path, patch };
  }
  const content = pickString(args, ["content", "contents", "text", "file_text"]);
  if (content && toolKind(item.tool, args) === "write") {
    return { path, hunks: [{ removed: [], added: lines(content) }] };
  }
  return null;
}

export function diffStats(diff: DiffView): { added: number; removed: number } {
  if ("patch" in diff) {
    let added = 0;
    let removed = 0;
    for (const line of diff.patch.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        added += 1;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        removed += 1;
      }
    }
    return { added, removed };
  }
  return diff.hunks.reduce(
    (acc, hunk) => ({ added: acc.added + hunk.added.length, removed: acc.removed + hunk.removed.length }),
    { added: 0, removed: 0 },
  );
}

export interface ApprovalDescription {
  title: string;
  detail: string | null;
  mono: boolean;
}

export function describeApproval(request: ApprovalRequest): ApprovalDescription {
  const subject = request.subject ?? { kind: "tool" };
  const stagesCommand = subject.stages?.map((s) => s.argv.join(" ")).join(" | ");
  switch (subject.kind) {
    case "shell":
      return { title: "Run a shell command", detail: subject.command ?? stagesCommand ?? request.rawArgs ?? null, mono: true };
    case "fileAccess": {
      const access = subject.access ? subject.access.toLowerCase() : "access";
      const verb = access.includes("write") ? "Write to" : access.includes("read") ? "Read" : "Access";
      return { title: `${verb} a file`, detail: subject.path ?? subject.target ?? null, mono: true };
    }
    case "network": {
      const target = subject.host
        ? `${subject.protocol ? `${subject.protocol}://` : ""}${subject.host}${subject.port ? `:${subject.port}` : ""}`
        : (subject.target ?? null);
      return { title: "Connect to the network", detail: target, mono: true };
    }
    case "process":
      return { title: "Start a process", detail: subject.command ?? subject.target ?? stagesCommand ?? null, mono: true };
    case "tool":
      return {
        title: `Use the ${humanize(subject.toolName ?? request.toolName ?? "tool").toLowerCase()} tool`,
        detail: request.rawArgs ?? null,
        mono: true,
      };
    default:
      return {
        title: `Allow ${humanize(subject.kind).toLowerCase()}`,
        detail: subject.command ?? subject.path ?? subject.target ?? request.rawArgs ?? null,
        mono: true,
      };
  }
}

/** Strip the provider tier suffix for display; the tier gets its own badge. */
export function modelDisplayName(modelId: string | null | undefined): string {
  if (!modelId) {
    return "Default model";
  }
  return modelId.replace(/-contributor$/i, "");
}
