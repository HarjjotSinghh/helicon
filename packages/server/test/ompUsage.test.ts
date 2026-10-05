import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HeliconStore } from "@helicon/daemon";
import { HeliconServer } from "../src/server.js";
import {
  importOmpUsage,
  parseOmpSessionFile,
  resolveOmpSessionsDir,
  sessionIdFromFilename,
} from "../src/ompUsage.js";

/** Fixture timestamps ride on the real clock so the rolling usage window always contains them. */
const NOW = new Date().toISOString();

function message(id: string, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: "message",
    id,
    timestamp: NOW,
    message: {
      role: "assistant",
      provider: "muse-code",
      model: "muse-spark-1.3-contributor",
      content: [{ type: "text", text: "done" }],
      usage: { input: 100, output: 20, cacheRead: 30, cacheWrite: 0, totalTokens: 150, reasoningTokens: 5 },
      stopReason: "stop",
      timestamp: Date.parse(NOW),
      duration: 7108.32,
      ...overrides,
    },
  });
}

function sessionFile(lines: string[]): string {
  return [
    JSON.stringify({ type: "title", v: 1, title: "Fix the tests", updatedAt: NOW }),
    JSON.stringify({ type: "session", version: 3, id: "019abc-session", timestamp: NOW, cwd: "E:\\work\\app" }),
    JSON.stringify({ type: "model_change", id: "m1", timestamp: NOW, model: "muse-code/muse-spark-1.3-contributor" }),
    ...lines,
  ].join("\n");
}

async function sessionsDir(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "helicon-omp-"));
  for (const [name, text] of Object.entries(files)) {
    const abs = join(root, name);
    await mkdir(join(abs, ".."), { recursive: true });
    await writeFile(abs, text);
  }
  return root;
}

describe("parseOmpSessionFile", () => {
  it("maps a muse-code call onto a usage row", () => {
    const parsed = parseOmpSessionFile(sessionFile([message("e1")]), { sessionId: "fallback" });
    assert.equal(parsed.sessionId, "019abc-session");
    assert.equal(parsed.cwd, "E:\\work\\app");
    assert.equal(parsed.title, "Fix the tests");
    assert.equal(parsed.calls.length, 1);
    const call = parsed.calls[0]!;
    assert.equal(call.key, "omp:019abc-session:e1");
    assert.equal(call.sessionId, "omp:019abc-session");
    assert.equal(call.modelId, "muse-spark-1.3-contributor");
    assert.equal(call.promptTokens, 100);
    assert.equal(call.outputTokens, 20);
    assert.equal(call.cacheReadTokens, 30);
    assert.equal(call.reasoningTokens, 5);
    assert.equal(call.durationMs, 7108);
    assert.equal(call.at, NOW);
    assert.equal(parsed.skipped, 0);
  });

  it("ignores other providers without counting them as skipped", () => {
    const other = message("e2", { provider: "anthropic", model: "claude-opus-4-6" });
    const parsed = parseOmpSessionFile(sessionFile([other]), { sessionId: "fallback" });
    assert.equal(parsed.calls.length, 0);
    assert.equal(parsed.skipped, 0);
  });

  it("skips zero-token calls from failed turns", () => {
    const failed = message("e3", { usage: { input: 0, output: 0, totalTokens: 0 }, stopReason: "error" });
    const parsed = parseOmpSessionFile(sessionFile([failed, message("e4")]), { sessionId: "fallback" });
    assert.equal(parsed.calls.length, 1);
    assert.equal(parsed.calls[0]!.key, "omp:019abc-session:e4");
    assert.equal(parsed.skipped, 1);
  });

  it("tolerates malformed lines and falls back to the model change and filename id", () => {
    const bare = message("e5", { model: undefined });
    const parsed = parseOmpSessionFile(`not json\n${bare}`, { sessionId: "file-id" });
    assert.equal(parsed.sessionId, "file-id");
    assert.equal(parsed.cwd, null);
    assert.equal(parsed.calls.length, 1);
    // No session header ran, so no model_change either: the call keeps a null model rather than failing.
    assert.equal(parsed.calls[0]!.modelId, null);
    assert.equal(parsed.skipped, 1);
  });

  it("prefers the message model but remembers the latest model change", () => {
    const text = [
      JSON.stringify({ type: "model_change", id: "m1", timestamp: NOW, model: "muse-code/muse-spark-1.3" }),
      message("e6"),
    ].join("\n");
    const parsed = parseOmpSessionFile(text, { sessionId: "s" });
    assert.equal(parsed.calls[0]!.modelId, "muse-spark-1.3-contributor");
    assert.equal(parsed.modelId, "muse-spark-1.3-contributor");
  });
});

describe("sessionIdFromFilename", () => {
  it("takes the id after the timestamp", () => {
    assert.equal(sessionIdFromFilename("2026-09-15T12-41-20-481Z_019abc.jsonl"), "019abc");
    assert.equal(sessionIdFromFilename("plain.jsonl"), "plain");
  });
});

describe("resolveOmpSessionsDir", () => {
  it("honours OMP_AGENT_DIR and otherwise uses ~/.omp/agent/sessions", () => {
    const saved = process.env["OMP_AGENT_DIR"];
    try {
      process.env["OMP_AGENT_DIR"] = "";
      assert.equal(resolveOmpSessionsDir("/home/u"), join("/home/u", ".omp", "agent", "sessions"));
      process.env["OMP_AGENT_DIR"] = "/data/omp";
      assert.equal(resolveOmpSessionsDir("/home/u"), join("/data", "omp", "sessions"));
    } finally {
      if (saved === undefined) {
        delete process.env["OMP_AGENT_DIR"];
      } else {
        process.env["OMP_AGENT_DIR"] = saved;
      }
    }
  });
});

describe("importOmpUsage", () => {
  it("records calls once and attributes the session without listing it", async () => {
    const dir = await sessionsDir({
      "--E--work--app--/2026-10-05T12-00-00-000Z_019abc-session.jsonl": sessionFile([message("e1"), message("e2")]),
      "--E--work--app--/notes.txt": "not a session",
      "--E--work--other--/2026-10-05T12-00-00-000Z_other.jsonl": sessionFile([
        message("x1", { provider: "anthropic", model: "other" }),
      ]),
    });
    const store = new HeliconStore(":memory:");

    const first = await importOmpUsage(dir, store);
    assert.deepEqual(first, { files: 2, sessions: 1, calls: 2, skipped: 0 });

    const rows = store.listUsage();
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.sessionTitle, "Fix the tests");
    assert.equal(rows[0]!.projectCwd, "E:\\work\\app");

    const session = store.getSession("omp:019abc-session");
    assert.equal(session?.origin, "omp");
    assert.equal(session?.archived, true);

    const second = await importOmpUsage(dir, store);
    assert.deepEqual(second, { files: 2, sessions: 1, calls: 0, skipped: 0 });
    assert.equal(store.listUsage().length, 2);
  });

  it("returns zeros when OMP never ran here", async () => {
    const store = new HeliconStore(":memory:");
    const counts = await importOmpUsage(join(await mkdtemp(join(tmpdir(), "helicon-noomp-")), "sessions"), store);
    assert.deepEqual(counts, { files: 0, sessions: 0, calls: 0, skipped: 0 });
  });
});

describe("POST /api/usage/import-omp", () => {
  it("imports through HTTP and the calls land in the usage report", async () => {
    const home = await mkdtemp(join(tmpdir(), "helicon-omphome-"));
    const dir = join(home, ".omp", "agent", "sessions", "--E--work--app--");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "2026-10-05T12-00-00-000Z_019abc-session.jsonl"), sessionFile([message("e1")]));

    const saved = process.env["OMP_AGENT_DIR"];
    delete process.env["OMP_AGENT_DIR"];
    try {
      const server = new HeliconServer({ port: 0, dataDir: ":memory:", home });
      after(() => server.close());
      const bound = await server.listen();
      const base = `http://127.0.0.1:${bound.port}`;

      const imported = await (await fetch(`${base}/api/usage/import-omp`, { method: "POST" })).json();
      assert.deepEqual(imported, { files: 1, sessions: 1, calls: 1, skipped: 0 });

      const report = (await (await fetch(`${base}/api/usage?days=30`)).json()) as any;
      assert.equal(report.buckets.length, 1);
      assert.equal(report.buckets[0].modelId, "muse-spark-1.3-contributor");
      assert.equal(report.buckets[0].promptTokens, 100);
      assert.equal(report.threads.length, 1);
      assert.equal(report.threads[0].sessionId, "omp:019abc-session");
    } finally {
      if (saved === undefined) {
        delete process.env["OMP_AGENT_DIR"];
      } else {
        process.env["OMP_AGENT_DIR"] = saved;
      }
    }
  });
});
