import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import {
  HeliconServer,
  deriveTitle,
  normalizeIso,
  toWireEvent,
  type HostExit,
  type HostHandle,
  type OpenTarget,
} from "../src/server.js";
import type { ServeTarget } from "@helicon/daemon";

interface Call {
  method: string;
  params?: Record<string, unknown>;
}

type Reply = unknown | ((params: Record<string, unknown>) => unknown);

class MspTestError extends Error {
  constructor(
    message: string,
    readonly kind: string,
  ) {
    super(message);
  }
}

class FakeConnection {
  calls: Call[] = [];
  requests: Call[] = [];
  replies = new Map<string, Reply>();
  handler: ((n: { method: string; params?: unknown }) => void) | null = null;

  private answer(method: string, params: Record<string, unknown>): unknown {
    const reply = this.replies.get(method);
    if (reply instanceof Error) {
      throw reply;
    }
    if (typeof reply === "function") {
      return (reply as (p: Record<string, unknown>) => unknown)(params);
    }
    return reply ?? { ok: true };
  }

  async command(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    this.calls.push({ method, params });
    return this.answer(method, params);
  }

  async request(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    this.requests.push({ method, params });
    return this.answer(method, params);
  }

  onNotification(handler: (n: { method: string; params?: unknown }) => void): void {
    this.handler = handler;
  }

  notify(method: string, params: Record<string, unknown>): void {
    this.handler?.({ method, params });
  }
}

interface FactoryProbe {
  targets: ServeTarget[];
  exits: ((exit: HostExit) => void)[];
}

function fakeFactory(connection: FakeConnection, probe?: FactoryProbe): (target: ServeTarget) => HostHandle {
  return (target) => {
    probe?.targets.push(target);
    return {
      start: async () => {
        await new Promise((r) => setTimeout(r, 5));
        return { initializeResult: { serverInfo: { name: "muse", version: "1.1.1" } } };
      },
      connection: connection as never,
      close: async () => ({ code: 0, signal: null }),
      onExit: (handler) => probe?.exits.push(handler),
    };
  };
}

async function start(connection: FakeConnection, extra: Partial<ConstructorParameters<typeof HeliconServer>[0]> = {}) {
  const server = new HeliconServer({
    port: 0,
    dataDir: ":memory:",
    platform: "linux",
    musePath: "muse",
    hostFactory: fakeFactory(connection),
    ...extra,
  });
  after(() => server.close());
  const bound = await server.listen();
  return { server, base: `http://127.0.0.1:${bound.port}` };
}

async function send(
  base: string,
  path: string,
  body?: unknown,
  method = "POST",
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function get(base: string, path: string): Promise<any> {
  return (await fetch(`${base}${path}`)).json();
}

const RANGE = { first: { id: "r", sequence: 1 }, last: { id: "r", sequence: 1 }, stream: { id: "s", kind: "session" } };

describe("HeliconServer", () => {
  it("serves health, projects, sessions and turns", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1", modelId: "muse-spark-1.3" } });
    connection.replies.set("turn/start", { status: "accepted", turnId: "t1", disposition: "started" });
    const { base } = await start(connection);

    const health = await get(base, "/api/health");
    assert.equal(health.ok, true);

    const created = await send(base, "/api/sessions", { cwd: "/work/proj/" });
    assert.equal(created.status, 200);
    assert.equal(created.json.session.sessionId, "s1");
    assert.equal(created.json.session.cwd, "/work/proj");
    assert.equal(created.json.session.modelId, "muse-spark-1.3");

    const turn = await send(base, "/api/turns", { sessionId: "s1", text: "hello", ifBusy: "steer", reasoningEffort: "high" });
    assert.equal(turn.status, 200);
    assert.equal(turn.json.turnId, "t1");
    assert.deepEqual(connection.calls.at(-1)?.params, {
      sessionId: "s1",
      input: [{ type: "text", text: "hello" }],
      ifBusy: "steer",
      reasoningEffort: "high",
    });

    const projects = await get(base, "/api/projects");
    assert.deepEqual(projects.projects.map((p: { cwd: string }) => p.cwd), ["/work/proj"]);

    const denied = await send(base, "/api/turns", { sessionId: "s1" });
    assert.equal(denied.status, 400);
  });

  it("rejects bad modes, dispositions, efforts and missing fields", async () => {
    const connection = new FakeConnection();
    const { base } = await start(connection);
    assert.equal((await send(base, "/api/sessions", { cwd: "/w", approvalMode: "yolo" })).status, 400);
    assert.equal((await send(base, "/api/sessions", {})).status, 400);
    assert.equal((await send(base, "/api/turns", { sessionId: "s", text: "x", ifBusy: "later" })).status, 400);
    assert.equal((await send(base, "/api/turns", { sessionId: "s", text: "x", reasoningEffort: "max" })).status, 400);
    assert.equal((await send(base, "/api/approvals/decide", { sessionId: "s" })).status, 400);
    assert.equal((await send(base, "/api/user-input/clarify", { sessionId: "s", userInputId: "u" })).status, 400);
    const bad = await fetch(`${base}/api/turns`, { method: "POST", body: "{nope" });
    assert.equal(bad.status, 400);
  });

  it("requires a token when one is configured", async () => {
    const connection = new FakeConnection();
    const { base } = await start(connection, { token: "secret" });
    assert.equal((await fetch(`${base}/api/health`)).status, 401);
    assert.equal((await fetch(`${base}/api/health?token=secret`)).status, 200);
  });

  it("translates Windows paths at the WSL boundary", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s9" } });
    connection.replies.set("session/list", {
      sessions: [
        { session: { sessionId: "tui-1", workspaceRoot: "/mnt/d/work/proj" } },
        { sessionId: "tui-2", workspaceRoot: "/mnt/d/work/other", turnCount: 4, updatedAt: "2026-09-11T12:35:42.947855Z" },
      ],
      nextCursor: null,
    });
    const probe: FactoryProbe = { targets: [], exits: [] };
    const { base } = await start(connection, {
      platform: "win32",
      musePath: "/home/dev/.local/bin/muse",
      hostFactory: fakeFactory(connection, probe),
    });

    const created = await send(base, "/api/sessions", { cwd: "D:\\work\\proj" });
    assert.equal(created.status, 200);
    const startCall = connection.calls.find((c) => c.method === "session/start");
    assert.equal(startCall?.params?.["workspaceRoot"], "/mnt/d/work/proj");
    assert.equal(probe.targets[0]?.command, "wsl");
    assert.deepEqual(probe.targets[0]?.args.slice(0, 2), ["-d", "Ubuntu"]);
    assert.equal(probe.targets[0]?.cwd, "D:\\work\\proj");

    const found = await send(base, "/api/discover", {});
    assert.equal(found.status, 200);
    assert.equal(found.json.sessions.length, 2);
    const listCall = connection.requests.find((c) => c.method === "session/list");
    assert.equal(listCall?.params?.["commandId"], undefined, "queries must not carry a commandId");
    const projects = await get(base, "/api/projects");
    const cwds = projects.projects.map((p: { cwd: string }) => p.cwd);
    assert.ok(cwds.includes("D:\\work\\proj"));
    assert.ok(cwds.includes("D:\\work\\other"));
    const sessions = await get(base, `/api/sessions?cwd=${encodeURIComponent("D:\\work\\other")}`);
    assert.equal(sessions.sessions[0].origin, "tui");
    assert.equal(sessions.sessions[0].turnCount, 4);
    assert.equal(sessions.sessions[0].activityAt, "2026-09-11T12:35:42.947Z");
  });

  it("tracks live status and derives titles from the view stream", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    const { base } = await start(connection);
    await send(base, "/api/sessions", { cwd: "/work/proj" });
    const read = async () => (await get(base, "/api/sessions")).sessions[0];

    assert.equal((await read()).title, "New thread");
    connection.notify("turn/started", { sessionId: "s1", turnId: "t1", sourceRange: RANGE });
    connection.notify("item/completed", {
      sessionId: "s1",
      item: { itemId: "i1", kind: "userMessage", revision: 1, status: "completed", text: "\n  Fix the flaky login test in CI\nmore detail" },
    });
    connection.notify("approval/requested", { sessionId: "s1", approvalId: "a1" });
    let session = await read();
    assert.equal(session.title, "Fix the flaky login test in CI");
    assert.equal(session.live.activeTurnId, "t1");
    assert.equal(session.live.pendingApprovals, 1);

    connection.notify("approval/resolved", { sessionId: "s1", approvalId: "a1" });
    connection.notify("turn/completed", {
      sessionId: "s1",
      turnId: "t1",
      terminal: "failed",
      error: { kind: "modelError", message: "Provider timed out", retryable: true },
    });
    session = await read();
    assert.equal(session.live.activeTurnId, null);
    assert.equal(session.live.pendingApprovals, 0);
    assert.equal(session.live.lastTerminal, "failed");
    assert.equal(session.live.lastError, "Provider timed out");
    assert.equal(session.turnCount, 1);

    connection.notify("item/completed", {
      sessionId: "s1",
      item: { itemId: "i2", kind: "userMessage", revision: 1, status: "completed", text: "Something else entirely" },
    });
    assert.equal((await read()).title, "Fix the flaky login test in CI", "only the first prompt names a thread");
  });

  it("loads a transcript from resume, paged history and pending requests", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    connection.replies.set("session/resume", {
      session: { sessionId: "s1", status: "running", activeTurnId: "t2", turnCount: 1, modelId: "muse-spark-1.3", updatedAt: "2026-09-11T14:00:00Z" },
    });
    const event = (n: number, method: string, extra: Record<string, unknown> = {}) => ({
      method,
      params: { sessionId: "s1", viewCursor: `v:${n}`, sourceRange: RANGE, ...extra },
    });
    connection.replies.set("view/page", (params: Record<string, unknown>) =>
      params["cursor"]
        ? {
            events: [
              event(1, "turn/started", { turnId: "t1" }),
              event(2, "item/completed", { item: { itemId: "u1", kind: "userMessage", revision: 1, status: "completed", text: "Add dark mode" } }),
            ],
            nextCursor: null,
          }
        : { events: [event(3, "turn/completed", { turnId: "t1", terminal: "completed" }), event(4, "turn/started", { turnId: "t2" })], nextCursor: "v:3" },
    );
    connection.replies.set("approval/listPending", {
      approvals: [{ approvalId: "a1", sessionId: "s1", sourceRange: RANGE, subject: { kind: "shell", command: "rm -rf dist" } }],
      userInputs: [],
    });
    const { base } = await start(connection);
    await send(base, "/api/sessions", { cwd: "/work/proj" });

    const loaded = await send(base, "/api/sessions/s1/resume", {});
    assert.equal(loaded.status, 200);
    assert.equal(loaded.json.readOnly, false);
    assert.deepEqual(
      loaded.json.events.map((e: { params: { viewCursor: string } }) => e.params.viewCursor),
      ["v:1", "v:2", "v:3", "v:4"],
    );
    assert.equal(loaded.json.events[0].params.sourceRange, undefined);
    assert.equal(loaded.json.pending.approvals[0].subject.command, "rm -rf dist");
    assert.equal(loaded.json.pending.approvals[0].sourceRange, undefined);
    assert.equal(loaded.json.msp.activeTurnId, "t2");
    assert.equal(loaded.json.session.title, "Add dark mode");
    assert.equal(loaded.json.session.live.pendingApprovals, 1);
    assert.equal(loaded.json.session.live.activeTurnId, "t2");
    const resume = connection.calls.find((c) => c.method === "session/resume");
    assert.equal(resume?.params?.["excludeItems"], true);
    const pages = connection.requests.filter((c) => c.method === "view/page");
    assert.deepEqual(pages.map((p) => p.params?.["direction"]), ["backward", "backward"]);
  });

  it("falls back to a read-only transcript when another host holds the session", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    connection.replies.set("session/resume", new MspTestError("session is loaded by another host", "sessionInUse"));
    connection.replies.set("session/read", { session: { sessionId: "s1", status: "notLoaded", activeTurnId: null } });
    connection.replies.set("view/page", { events: [], nextCursor: null });
    const { base } = await start(connection);
    await send(base, "/api/sessions", { cwd: "/work/proj" });
    const loaded = await send(base, "/api/sessions/s1/resume", {});
    assert.equal(loaded.status, 200);
    assert.equal(loaded.json.readOnly, true);
    assert.match(loaded.json.readOnlyReason, /another host/);
  });

  it("reports MSP error kinds with a useful status", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    connection.replies.set("turn/start", new MspTestError("input too large", "inputTooLarge"));
    const { base } = await start(connection);
    await send(base, "/api/sessions", { cwd: "/work/proj" });
    const failed = await send(base, "/api/turns", { sessionId: "s1", text: "x" });
    assert.equal(failed.status, 409);
    assert.equal(failed.json.kind, "inputTooLarge");
    assert.equal(failed.json.error, "input too large");
  });

  it("renames and archives threads, and hides projects", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    const { base } = await start(connection);
    await send(base, "/api/sessions", { cwd: "/work/proj" });

    const renamed = await send(base, "/api/sessions/s1", { title: "  Ship the sidebar  " }, "PATCH");
    assert.equal(renamed.json.session.title, "Ship the sidebar");
    assert.equal(renamed.json.session.titleSource, "user");
    await send(base, "/api/sessions/s1", { archived: true }, "PATCH");
    assert.equal((await get(base, "/api/sessions")).sessions.length, 0);
    assert.equal((await get(base, "/api/sessions?archived=1")).sessions.length, 1);
    assert.equal((await send(base, "/api/sessions/missing", { title: "x" }, "PATCH")).status, 404);

    await send(base, `/api/projects?cwd=${encodeURIComponent("/work/proj")}`, undefined, "DELETE");
    assert.equal((await get(base, "/api/projects")).projects.length, 0);
    const readded = await send(base, "/api/projects", { cwd: "/work/proj" });
    assert.equal(readded.status, 200);
    assert.equal((await get(base, "/api/projects")).projects.length, 1);
  });

  it("opens known project folders only", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/list", { sessions: [], nextCursor: null });
    const opened: { path: string; target: OpenTarget }[] = [];
    const { base } = await start(connection, {
      platform: "win32",
      musePath: "/home/dev/.local/bin/muse",
      opener: async (path, target) => {
        opened.push({ path, target });
      },
    });
    assert.equal((await send(base, "/api/open", { cwd: "C:\\nowhere" })).status, 404);
    await send(base, "/api/projects", { cwd: "/mnt/d/work/app" });
    assert.equal((await send(base, "/api/open", { cwd: "/mnt/d/work/app", target: "editor" })).status, 200);
    assert.deepEqual(opened, [{ path: "D:\\work\\app", target: "editor" }]);
  });

  it("spawns one host per workspace under concurrency and respawns after a crash", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    const probe: FactoryProbe = { targets: [], exits: [] };
    const { base } = await start(connection, { hostFactory: fakeFactory(connection, probe) });
    await Promise.all([
      send(base, "/api/sessions", { cwd: "/work/proj" }),
      send(base, "/api/sessions", { cwd: "/work/proj" }),
    ]);
    assert.equal(probe.targets.length, 1);
    connection.notify("turn/started", { sessionId: "s1", turnId: "t1" });
    probe.exits[0]?.({ code: 1, signal: null });
    const session = (await get(base, "/api/sessions")).sessions[0];
    assert.equal(session.live.activeTurnId, null);
    assert.equal(session.live.lastTerminal, "failed");
    assert.match((await get(base, "/api/health")).lastHostError, /exited/);
    await send(base, "/api/sessions", { cwd: "/work/proj" });
    assert.equal(probe.targets.length, 2);
  });
});

describe("wire helpers", () => {
  it("reshapes notifications for the browser", () => {
    const delta = toWireEvent("item/delta", { sessionId: "s1", itemId: "i1", delta: "po", field: "text" }, 5);
    assert.deepEqual(delta, {
      type: "msp",
      sessionId: "s1",
      method: "item/delta",
      params: { sessionId: "s1", itemId: "i1", delta: "po", field: "text" },
      at: 5,
    });
    const started = toWireEvent("session/started", { session: { sessionId: "s2" } });
    assert.equal(started?.sessionId, "s2");
    const completed = toWireEvent("turn/completed", { sessionId: "s1", turnId: "t1", sourceRange: RANGE });
    assert.equal(completed?.params["sourceRange"], undefined);
    assert.equal(toWireEvent("initialized", {}), null);
  });

  it("derives thread titles from the first prompt line", () => {
    assert.equal(deriveTitle("# Fix login\nand more"), "Fix login");
    assert.equal(deriveTitle("   \n  "), null);
    const long = deriveTitle("Refactor the session manager so that queries never mint command ids and paging works for long threads");
    assert.ok(long && long.length <= 75 && long.endsWith("..."));
  });

  it("normalizes MSP timestamps", () => {
    assert.equal(normalizeIso("2026-09-11T12:35:42.947855Z"), "2026-09-11T12:35:42.947Z");
    assert.equal(normalizeIso("nope"), undefined);
    assert.equal(normalizeIso(42), undefined);
  });
});
