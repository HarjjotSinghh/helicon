import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import {
  HeliconServer,
  deriveTitle,
  normalizeIso,
  parseSkillList,
  stripFrontmatter,
  toWireEvent,
  type HostExit,
  type HostHandle,
  type OpenTarget,
} from "../src/server.js";
import type { ExecFn, ServeTarget } from "@helicon/daemon";

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

  it("surfaces resume failures that are not about another host", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    connection.replies.set("session/resume", new MspTestError("stream mismatch", "sessionStreamMismatch"));
    connection.replies.set("session/read", { session: { sessionId: "s1", status: "notLoaded", activeTurnId: null } });
    connection.replies.set("view/page", { events: [], nextCursor: null });
    const { base } = await start(connection);
    await send(base, "/api/sessions", { cwd: "/work/proj" });
    const failed = await send(base, "/api/sessions/s1/resume", {});
    assert.equal(failed.status, 409);
    assert.equal(failed.json.kind, "sessionStreamMismatch");
    assert.equal(failed.json.readOnly, undefined);
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

  it("settles and un-settles threads, and wakes a settled thread when work starts", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    connection.replies.set("turn/start", { status: "accepted", turnId: "t1", disposition: "started" });
    const { base } = await start(connection);
    await send(base, "/api/sessions", { cwd: "/work/proj" });

    const settled = await send(base, "/api/sessions/s1", { settled: true }, "PATCH");
    assert.equal(settled.json.session.settled, true);
    assert.ok(settled.json.session.settledAt);
    const active = await send(base, "/api/sessions/s1", { settled: false }, "PATCH");
    assert.equal(active.json.session.settled, false);
    assert.equal(active.json.session.settledAt, null);
    assert.ok(active.json.session.unsettledAt);

    await send(base, "/api/sessions/s1", { settled: true }, "PATCH");
    await send(base, "/api/turns", { sessionId: "s1", text: "pick this back up" });
    const woken = (await get(base, "/api/sessions")).sessions.find((s: { sessionId: string }) => s.sessionId === "s1");
    assert.equal(woken.settled, false);
    assert.ok(woken.unsettledAt);
  });

  it("wakes a settled thread when discovery shows it moved on in another client", async () => {
    const connection = new FakeConnection();
    const list = (updatedAt: string) => ({ sessions: [{ sessionId: "tui-1", workspaceRoot: "/work/proj", updatedAt }], nextCursor: null });
    connection.replies.set("session/list", list("2026-09-01T00:00:00.000Z"));
    const { base } = await start(connection);
    await send(base, "/api/discover", {});
    assert.equal((await send(base, "/api/sessions/tui-1", { settled: true }, "PATCH")).json.session.settled, true);
    const find = async () => (await get(base, "/api/sessions")).sessions.find((s: { sessionId: string }) => s.sessionId === "tui-1");

    await send(base, "/api/discover", {});
    assert.equal((await find()).settled, true, "nothing new happened, so it stays settled");

    connection.replies.set("session/list", list(new Date(Date.now() + 60_000).toISOString()));
    await send(base, "/api/discover", {});
    assert.equal((await find()).settled, false);
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

describe("slash commands, skills and shell", () => {
  const LIST = JSON.stringify({
    diagnostics: [],
    skills: [
      { id: "bundled:plan", name: "plan", display_name: "plan", description: "Plan it. Use ONLY when asked.", short_description: null, scope: "bundled", activation: "on", path: "bundled://muse-core/skills/plan/SKILL.md" },
      { id: "user:secret", name: "secret", display_name: "secret", description: "Only by hand.", short_description: "Hand only", scope: "user", activation: "user-invocable-only", path: "/home/me/.config/muse/skills/secret/SKILL.md" },
      { id: "bundled:off", name: "off", display_name: "off", description: "Switched off.", activation: "off", path: "bundled://muse-core/skills/off/SKILL.md" },
    ],
  });

  it("lists a workspace's skills through the muse CLI, keeps them a minute, and reads only listed skills", async () => {
    const calls: string[][] = [];
    const exec: ExecFn = async (command, args) => {
      calls.push([command, ...args]);
      if (args.includes("list")) {
        return { stdout: LIST, exitCode: 0 };
      }
      return { stdout: "---\nname: secret\ndescription: x\n---\n\n# Secret\nDo the thing.\n", exitCode: 0 };
    };
    const { base } = await start(new FakeConnection(), { exec });
    const listed = await get(base, "/api/slash?cwd=%2Fwork%2Fproj");
    assert.deepEqual(
      listed.skills.map((s: { id: string }) => s.id),
      ["bundled:plan", "user:secret"],
      "skills switched off are left out",
    );
    assert.equal(listed.skills[1].activation, "user-invocable-only");
    assert.equal(listed.error, null);
    assert.deepEqual(calls[0], ["muse", "skills", "list", "--json", "--workspace", "/work/proj"]);
    await get(base, "/api/slash?cwd=%2Fwork%2Fproj");
    assert.equal(calls.length, 1, "a fresh list is reused");

    const body = await get(base, "/api/slash/skill?cwd=%2Fwork%2Fproj&id=user%3Asecret");
    assert.equal(body.body, "# Secret\nDo the thing.");
    assert.deepEqual(calls[1], ["sh", "-c", 'exec cat -- "$1"', "sh", "/home/me/.config/muse/skills/secret/SKILL.md"]);
    await get(base, "/api/slash/skill?cwd=%2Fwork%2Fproj&id=bundled%3Aplan");
    assert.equal(calls[2]?.[4], "muse-core/skills/plan/SKILL.md", "bundled skills resolve inside Muse's data folder");
    const unlisted = await fetch(`${base}/api/slash/skill?cwd=%2Fwork%2Fproj&id=%2Fetc%2Fpasswd`);
    assert.equal(unlisted.status, 404);
  });

  it("answers a failed skill list with an error instead of failing the request", async () => {
    const { base } = await start(new FakeConnection(), { exec: async () => ({ stdout: "", exitCode: 127 }) });
    const listed = await get(base, "/api/slash?cwd=%2Fwork%2Fproj");
    assert.deepEqual(listed.skills, []);
    assert.match(listed.error, /Could not list Muse skills/);
  });

  it("runs shell commands in a session and forks it into a new thread", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    const { base } = await start(connection);
    await send(base, "/api/sessions", { cwd: "/work/proj" });
    const shell = await send(base, "/api/sessions/s1/shell", { command: " git status " });
    assert.equal(shell.status, 200);
    assert.deepEqual(connection.calls.at(-1), { method: "session/userShell", params: { sessionId: "s1", commandText: "git status" } });
    assert.equal((await send(base, "/api/sessions/s1/shell", { command: "  " })).status, 400);

    connection.replies.set("session/fork", { session: { sessionId: "s2", modelId: "muse-spark-1.3" } });
    const fork = await send(base, "/api/sessions/s1/fork", {});
    assert.equal(fork.status, 200);
    assert.equal(fork.json.session.sessionId, "s2");
    assert.equal(fork.json.session.title, "New thread (fork)");
    assert.deepEqual(connection.calls.at(-1), { method: "session/fork", params: { sessionId: "s1", excludeItems: true } });
    const ids = (await get(base, "/api/sessions")).sessions.map((s: { sessionId: string }) => s.sessionId).sort();
    assert.deepEqual(ids, ["s1", "s2"]);
  });

  it("keeps a Helicon thread titled from what the user saw when Muse's own title differs", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    const { base } = await start(connection);
    await send(base, "/api/sessions", { cwd: "/work/proj" });
    connection.notify("item/completed", {
      sessionId: "s1",
      item: {
        itemId: "u1",
        kind: "userMessage",
        status: "completed",
        revision: 1,
        turnId: "t1",
        text: 'Use skill bundled:plan: call read_skill with name "bundled:plan" first, then apply it to: tidy the API',
        displayText: "/plan tidy the API",
      },
    });
    await new Promise((r) => setTimeout(r, 20));
    const titleOf = async () => (await get(base, "/api/sessions")).sessions.find((s: { sessionId: string }) => s.sessionId === "s1")?.title;
    assert.equal(await titleOf(), "/plan tidy the API");
    // Muse titles the session from the text the model got; discovery must not put that over ours.
    connection.replies.set("session/list", {
      sessions: [{ sessionId: "s1", workspaceRoot: "/work/proj", title: "Use skill bundled:plan: call read_skill" }],
      nextCursor: null,
    });
    assert.equal((await send(base, "/api/discover", {})).status, 200);
    assert.equal(await titleOf(), "/plan tidy the API");
  });

  it("keeps each session's goal in its live view for the sidebar", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    const { base } = await start(connection);
    await send(base, "/api/sessions", { cwd: "/work/proj" });
    const liveGoal = async () =>
      (await get(base, "/api/sessions")).sessions.find((s: { sessionId: string }) => s.sessionId === "s1")?.live?.goal;
    const settle = () => new Promise((r) => setTimeout(r, 20));
    assert.equal(await liveGoal(), null);
    connection.notify("session/goalChanged", { sessionId: "s1", goal: { objective: "Ship it", status: "active", percentComplete: 40, currentWork: "Notes" } });
    await settle();
    assert.deepEqual(await liveGoal(), { objective: "Ship it", status: "active", percentComplete: 40, currentWork: "Notes" });
    connection.notify("session/goalChanged", { sessionId: "s1", goal: { status: "paused" } });
    await settle();
    assert.equal((await liveGoal())?.objective, "Ship it", "a block with no objective is not a goal");
    connection.notify("session/goalChanged", { sessionId: "s1", goal: null });
    await settle();
    assert.equal(await liveGoal(), null);
  });

  it("parses skill lists and strips frontmatter", () => {
    assert.equal(parseSkillList("not json"), null);
    assert.equal(parseSkillList(JSON.stringify({ skills: [{ name: "no id" }] }))?.skills.length, 0);
    assert.equal(stripFrontmatter("\uFEFF---\nname: x\n---\nBody"), "Body");
    assert.equal(stripFrontmatter("No frontmatter"), "No frontmatter");
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
