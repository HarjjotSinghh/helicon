import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { HeliconServer, type HostHandle } from "../src/server.js";
import type { ServeTarget } from "@helicon/daemon";

interface Call {
  method: string;
  params?: Record<string, unknown>;
}

class FakeConnection {
  calls: Call[] = [];
  replies = new Map<string, unknown>();
  handler: ((n: { method: string; params?: unknown }) => void) | null = null;

  async command(method: string, params?: Record<string, unknown>): Promise<unknown> {
    this.calls.push({ method, params });
    if (this.replies.has(method)) {
      return this.replies.get(method);
    }
    return { ok: true };
  }

  onNotification(handler: (n: { method: string; params?: unknown }) => void): void {
    this.handler = handler;
  }
}

function fakeFactory(connection: FakeConnection): (target: ServeTarget) => HostHandle {
  return () => ({
    start: async () => ({ ok: true }),
    connection: connection as never,
    close: async () => ({ code: 0, signal: null }),
  });
}

async function post(base: string, path: string, body: unknown): Promise<{ status: number; json: never }> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as never };
}

describe("HeliconServer", () => {
  it("serves health, env, projects, sessions and turns", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    connection.replies.set("turn/start", { status: "accepted", turnId: "t1", disposition: "started" });
    const server = new HeliconServer({
      port: 0,
      dataDir: ":memory:",
      platform: "linux",
      musePath: "muse",
      hostFactory: fakeFactory(connection),
    });
    after(() => server.close());
    const bound = await server.listen();
    const base = `http://127.0.0.1:${bound.port}`;

    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal((health as { ok: boolean }).ok, true);

    const created = await post(base, "/api/sessions", { cwd: "/work/proj" });
    assert.equal(created.status, 200);
    assert.equal((created.json as { session: { sessionId: string } }).session.sessionId, "s1");

    const turn = await post(base, "/api/turns", { sessionId: "s1", text: "hello" });
    assert.equal(turn.status, 200);
    assert.equal((turn.json as { turnId: string }).turnId, "t1");

    const projects = (await (await fetch(`${base}/api/projects`)).json()) as {
      projects: { cwd: string }[];
    };
    assert.equal(projects.projects.length, 1);

    const denied = await post(base, "/api/turns", { sessionId: "s1" });
    assert.equal(denied.status, 400);
  });

  it("rejects bad approval modes and missing sessions fields", async () => {
    const connection = new FakeConnection();
    const server = new HeliconServer({
      port: 0,
      dataDir: ":memory:",
      platform: "linux",
      musePath: "muse",
      hostFactory: fakeFactory(connection),
    });
    after(() => server.close());
    const bound = await server.listen();
    const base = `http://127.0.0.1:${bound.port}`;

    const badMode = await post(base, "/api/sessions", { cwd: "/w", approvalMode: "yolo" });
    assert.equal(badMode.status, 400);
    const missing = await post(base, "/api/sessions", {});
    assert.equal(missing.status, 400);
    const decide = await post(base, "/api/approvals/decide", { sessionId: "s" });
    assert.equal(decide.status, 400);
  });

  it("requires a token when one is configured", async () => {
    const connection = new FakeConnection();
    const server = new HeliconServer({
      port: 0,
      dataDir: ":memory:",
      platform: "linux",
      musePath: "muse",
      token: "secret",
      hostFactory: fakeFactory(connection),
    });
    after(() => server.close());
    const bound = await server.listen();
    const base = `http://127.0.0.1:${bound.port}`;
    const denied = await fetch(`${base}/api/health`);
    assert.equal(denied.status, 401);
    const allowed = await fetch(`${base}/api/health?token=secret`);
    assert.equal(allowed.status, 200);
  });

  it("translates Windows paths at the WSL boundary", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s9" } });
    connection.replies.set("session/list", {
      sessions: [{ session: { sessionId: "tui-1", workspaceRoot: "/mnt/d/work/proj" } }],
    });
    const targets: ServeTarget[] = [];
    const server = new HeliconServer({
      port: 0,
      dataDir: ":memory:",
      platform: "win32",
      musePath: "/home/harjot/.local/bin/muse",
      hostFactory: (target) => {
        targets.push(target);
        return {
          start: async () => ({ ok: true }),
          connection: connection as never,
          close: async () => ({ code: 0, signal: null }),
        };
      },
    });
    after(() => server.close());
    const bound = await server.listen();
    const base = `http://127.0.0.1:${bound.port}`;

    const created = await post(base, "/api/sessions", { cwd: "D:\\work\\proj" });
    assert.equal(created.status, 200);
    const startCall = connection.calls.find((c) => c.method === "session/start");
    assert.deepEqual(startCall?.params?.["workspaceRoot"], "/mnt/d/work/proj");
    assert.equal(targets[0]?.command, "wsl");
    assert.deepEqual(targets[0]?.args.slice(0, 2), ["-d", "Ubuntu"]);
    assert.equal(targets[0]?.cwd, "D:\\work\\proj");

    const found = await post(base, "/api/discover", {});
    assert.equal(found.status, 200);
    const projects = (await (await fetch(`${base}/api/projects`)).json()) as {
      projects: { cwd: string }[];
    };
    const cwds = projects.projects.map((p) => p.cwd);
    assert.ok(cwds.includes("D:\\work\\proj"));
  });
});
