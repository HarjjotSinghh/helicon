import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { HeliconStore, UsageCall } from "@helicon/daemon";

/**
 * OMP (oh-my-pi) usage import. OMP writes one JSONL session file per agent session, and assistant
 * entries carry their own token usage — including entries made through OMP's `muse-code` provider,
 * which bill the same Muse plan Helicon tracks but never pass through Helicon's hosts.
 */

/** The OMP provider id for Muse Code, as `packages/ai/src/usage/muse-code.ts` in oh-my-pi defines it. */
export const OMP_PROVIDER_ID = "muse-code";

export interface OmpImportCounts {
  /** Session files successfully scanned. */
  files: number;
  /** Files that contributed at least one `muse-code` call. */
  sessions: number;
  /** Calls newly recorded; re-imports record nothing thanks to the usage key. */
  calls: number;
  /** Zero-token calls and malformed lines passed over. Other providers are ignored, not counted. */
  skipped: number;
}

export interface ParsedOmpSession {
  sessionId: string;
  cwd: string | null;
  title: string | null;
  /** The latest model seen, for the session row; each call keeps its own model. */
  modelId: string | null;
  calls: UsageCall[];
  skipped: number;
}

/** OMP's session tree, honouring `OMP_AGENT_DIR` when it replaces `~/.omp/agent`. */
export function resolveOmpSessionsDir(home: string): string {
  const agentDir = process.env["OMP_AGENT_DIR"]?.trim() || join(home, ".omp", "agent");
  return join(agentDir, "sessions");
}

/** The session id from `<timestamp>_<id>.jsonl`, for files whose `session` line is missing. */
export function sessionIdFromFilename(file: string): string {
  const stem = file.split(/[\\/]/).pop() ?? file;
  const withoutExt = stem.toLowerCase().endsWith(".jsonl") ? stem.slice(0, -".jsonl".length) : stem;
  const id = withoutExt.includes("_") ? (withoutExt.split("_").pop() ?? withoutExt) : withoutExt;
  return id || withoutExt;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** An entry timestamp: the ISO line timestamp, the epoch-millis message stamp, or now so tokens are never lost. */
function entryAt(line: Record<string, unknown>, message: Record<string, unknown> | null): string {
  const iso = str(line["timestamp"]);
  if (iso && !Number.isNaN(Date.parse(iso))) {
    return iso;
  }
  const epoch = message ? num(message["timestamp"]) : null;
  if (epoch !== null) {
    return new Date(epoch).toISOString();
  }
  return new Date().toISOString();
}

/**
 * One OMP session file's `muse-code` calls. Malformed lines are skipped, never fatal: a session file
 * is an append-only log OMP may still be writing, and one bad line must not lose the rest.
 */
export function parseOmpSessionFile(text: string, fallback: { sessionId: string }): ParsedOmpSession {
  let sessionId = fallback.sessionId;
  let cwd: string | null = null;
  let title: string | null = null;
  let modelId: string | null = null;
  const calls: UsageCall[] = [];
  let skipped = 0;

  const lines = text.split("\n");
  lines.forEach((raw, index) => {
    if (!raw.trim()) {
      return;
    }
    let line: unknown;
    try {
      line = JSON.parse(raw);
    } catch {
      skipped += 1;
      return;
    }
    const record = asRecord(line);
    if (!record) {
      skipped += 1;
      return;
    }
    const type = str(record["type"]);
    if (type === "session") {
      sessionId = str(record["id"]) ?? sessionId;
      cwd = str(record["cwd"]) ?? cwd;
      return;
    }
    if (type === "title") {
      title = str(record["title"]) ?? title;
      return;
    }
    if (type === "model_change") {
      modelId = str(record["model"]) ?? modelId;
      return;
    }
    if (type !== "message") {
      return;
    }
    const message = asRecord(record["message"]);
    if (!message || message["role"] !== "assistant" || message["provider"] !== OMP_PROVIDER_ID) {
      return;
    }
    const usage = asRecord(message["usage"]);
    const totalTokens = usage ? (num(usage["totalTokens"]) ?? 0) : 0;
    if (!usage || totalTokens <= 0) {
      // Failed, aborted and no-op turns carry a zeroed usage block with no token signal.
      skipped += 1;
      return;
    }
    const callModel = str(message["model"]) ?? modelId;
    if (callModel) {
      modelId = callModel;
    }
    const entryId = str(record["id"]) ?? `line-${index + 1}`;
    const at = entryAt(record, message);
    const promptTokens = num(usage["input"]) ?? 0;
    const outputTokens = num(usage["output"]) ?? 0;
    const cacheRead = num(usage["cacheRead"]) ?? 0;
    const duration = num(message["duration"]);
    calls.push({
      key: `omp:${sessionId}:${entryId}`,
      sessionId: `omp:${sessionId}`,
      turnId: null,
      modelId: callModel,
      promptTokens,
      outputTokens,
      inputTokens: promptTokens,
      cachedTokens: cacheRead,
      cacheReadTokens: cacheRead,
      cacheWriteTokens: num(usage["cacheWrite"]) ?? 0,
      reasoningTokens: num(usage["reasoningTokens"]) ?? 0,
      durationMs: duration === null ? null : Math.round(duration),
      at,
    });
  });

  return { sessionId, cwd, title, modelId, calls, skipped };
}

/**
 * Records every `muse-code` call in OMP's session tree. A missing sessions directory is a clean empty
 * result, not an error — most machines simply never ran OMP. Imported sessions are archived on arrival:
 * they exist so the usage page can attribute their threads, not as threads to open.
 */
export async function importOmpUsage(sessionsDir: string, store: HeliconStore): Promise<OmpImportCounts> {
  const counts: OmpImportCounts = { files: 0, sessions: 0, calls: 0, skipped: 0 };
  let entries: string[];
  try {
    entries = await readdir(sessionsDir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return counts;
    }
    throw error;
  }
  const files = entries.filter((entry) => entry.toLowerCase().endsWith(".jsonl")).sort();
  for (const entry of files) {
    let text: string;
    try {
      text = await readFile(join(sessionsDir, entry), "utf8");
    } catch {
      continue;
    }
    const parsed = parseOmpSessionFile(text, { sessionId: sessionIdFromFilename(entry) });
    counts.files += 1;
    counts.skipped += parsed.skipped;
    if (parsed.calls.length === 0) {
      continue;
    }
    counts.sessions += 1;
    if (parsed.cwd) {
      const project = store.upsertProject(parsed.cwd);
      const stamps = parsed.calls.map((call) => call.at).sort();
      const session = store.recordSession({
        id: `omp:${parsed.sessionId}`,
        projectId: project.id,
        ...(parsed.title ? { title: parsed.title } : {}),
        ...(parsed.modelId ? { modelId: parsed.modelId } : {}),
        origin: "omp",
        createdAt: stamps[0],
        activityAt: stamps[stamps.length - 1],
      });
      if (!session.archived) {
        store.updateSession(session.id, { archived: true });
      }
    }
    for (const call of parsed.calls) {
      if (store.hasUsage(call.key)) {
        continue;
      }
      store.recordUsage(call);
      counts.calls += 1;
    }
  }
  return counts;
}
