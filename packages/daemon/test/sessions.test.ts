import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SessionManager,
  isApprovalMode,
  textInput,
  type CommandConnection,
} from "../src/sessions.js";

class FakeConnection implements CommandConnection {
  calls: { method: string; params?: Record<string, unknown> }[] = [];
  private replies = new Map<string, unknown>();

  reply(method: string, value: unknown): void {
    this.replies.set(method, value);
  }

  async command(method: string, params?: Record<string, unknown>): Promise<unknown> {
    this.calls.push({ method, params });
    if (this.replies.has(method)) {
      return this.replies.get(method);
    }
    return { ok: true };
  }

  onNotification(): void {}
}

function lastCall(conn: FakeConnection) {
  const call = conn.calls[conn.calls.length - 1];
  assert.ok(call);
  return call as { method: string; params?: Record<string, unknown> };
}

describe("SessionManager", () => {
  it("lists sessions scoped to a workspace", async () => {
    const conn = new FakeConnection();
    conn.reply("session/list", { sessions: [{ session: { sessionId: "s1" } }] });
    const manager = new SessionManager(conn);
    const sessions = await manager.listSessions("/work/proj", 25);
    assert.deepEqual(lastCall(conn), {
      method: "session/list",
      params: { limit: 25, workspaceRoot: "/work/proj" },
    });
    assert.equal(sessions.length, 1);
  });

  it("falls back to an empty list on unexpected shapes", async () => {
    const conn = new FakeConnection();
    conn.reply("session/list", { unexpected: true });
    const manager = new SessionManager(conn);
    assert.deepEqual(await manager.listSessions(), []);
  });

  it("starts a session with mode and model, and rejects missing ids", async () => {
    const conn = new FakeConnection();
    conn.reply("session/start", { session: { sessionId: "abc" } });
    const manager = new SessionManager(conn);
    const started = await manager.startSession({
      workspaceRoot: "/work/proj",
      approvalMode: "onRequest",
      modelId: "muse-spark-1.3",
    });
    assert.equal(started.sessionId, "abc");
    assert.deepEqual(lastCall(conn).params, {
      workspaceRoot: "/work/proj",
      approvalMode: "onRequest",
      modelId: "muse-spark-1.3",
    });
    conn.reply("session/start", { session: {} });
    await assert.rejects(() => manager.startSession({}), /sessionId/);
  });

  it("drives turns: send, steer, interrupt, cancel, unqueue", async () => {
    const conn = new FakeConnection();
    conn.reply("turn/start", { status: "accepted", turnId: "t1", disposition: "started" });
    const manager = new SessionManager(conn);
    const ack = await manager.sendTurn("s1", "hello", { ifBusy: "queue" });
    assert.equal(ack.turnId, "t1");
    assert.equal(ack.status, "accepted");
    assert.deepEqual(lastCall(conn).params, {
      sessionId: "s1",
      input: textInput("hello"),
      ifBusy: "queue",
    });
    await manager.steerTurn("s1", "t1", "actually do X");
    assert.deepEqual(lastCall(conn), {
      method: "turn/steer",
      params: { sessionId: "s1", expectedTurnId: "t1", input: textInput("actually do X") },
    });
    await manager.interruptTurn("s1", "t1", true);
    assert.deepEqual(lastCall(conn).params, { sessionId: "s1", turnId: "t1", retract: true });
    await manager.cancelTurn("s1", "t1");
    assert.deepEqual(lastCall(conn).params, { sessionId: "s1", turnId: "t1" });
    await manager.unqueueTurn("s1", "t2");
    assert.deepEqual(lastCall(conn), {
      method: "turn/unqueue",
      params: { sessionId: "s1", turnId: "t2" },
    });
  });

  it("decides approvals with the race guard intact", async () => {
    const conn = new FakeConnection();
    const manager = new SessionManager(conn);
    await manager.decideApproval({
      sessionId: "s1",
      approvalId: "a1",
      requirementId: { approvalId: "a1", sourceIndex: 0 },
      choiceId: "allow_once",
      feedback: null,
    });
    assert.deepEqual(lastCall(conn), {
      method: "approval/decide",
      params: {
        sessionId: "s1",
        approvalId: "a1",
        requirementId: { approvalId: "a1", sourceIndex: 0 },
        choiceId: "allow_once",
        feedback: null,
      },
    });
  });

  it("resumes, reads, lists models, switches model and mode, answers input", async () => {
    const conn = new FakeConnection();
    const manager = new SessionManager(conn);
    await manager.resumeSession("s1");
    assert.deepEqual(lastCall(conn).params, { sessionId: "s1", excludeItems: false });
    await manager.readSession("s1");
    assert.deepEqual(lastCall(conn).params, { sessionId: "s1", excludeItems: true });
    await manager.listModels("s1");
    assert.deepEqual(lastCall(conn).params, { sessionId: "s1" });
    await manager.setSessionModel("s1", { modelId: "muse-spark-1.3" });
    assert.deepEqual(lastCall(conn).params, {
      sessionId: "s1",
      model: { modelId: "muse-spark-1.3" },
    });
    await manager.setSessionApprovalMode("s1", "denyUnmatched");
    assert.deepEqual(lastCall(conn).params, { sessionId: "s1", mode: "denyUnmatched" });
    await manager.answerUserInput("s1", "u1", [{ questionId: "q1", freeText: "yes" }]);
    assert.deepEqual(lastCall(conn).params, {
      sessionId: "s1",
      userInputId: "u1",
      answers: [{ questionId: "q1", freeText: "yes" }],
    });
  });

  it("sends read-only queries without a minted commandId when the connection supports it", async () => {
    const conn = new FakeConnection();
    const requests: { method: string; params?: Record<string, unknown> }[] = [];
    const queryable: CommandConnection = {
      command: (method, params) => conn.command(method, params),
      request: async (method, params) => {
        requests.push({ method, params });
        if (method === "view/page") {
          return { events: [{ method: "turn/started", params: {} }], nextCursor: "c2" };
        }
        if (method === "approval/listPending") {
          return { approvals: [{ approvalId: "a1" }], userInputs: [] };
        }
        return { sessions: [], nextCursor: null };
      },
      onNotification: () => {},
    };
    const manager = new SessionManager(queryable);
    await manager.listSessions();
    const page = await manager.pageView("s1", { direction: "backward", limit: 10 });
    assert.equal(page.nextCursor, "c2");
    assert.equal(page.events.length, 1);
    const pending = await manager.listPending("s1");
    assert.equal(pending.approvals.length, 1);
    assert.deepEqual(
      requests.map((r) => r.method),
      ["session/list", "view/page", "approval/listPending"],
    );
    assert.deepEqual(requests[1]?.params, { sessionId: "s1", limit: 10, direction: "backward" });
    assert.equal(conn.calls.length, 0);
  });

  it("cancels and clarifies user input prompts", async () => {
    const conn = new FakeConnection();
    const manager = new SessionManager(conn);
    await manager.cancelUserInput("s1", "u1", "not now");
    assert.deepEqual(lastCall(conn), {
      method: "userInput/cancel",
      params: { sessionId: "s1", userInputId: "u1", reason: "not now" },
    });
    await manager.clarifyUserInput("s1", "u1", "Use blue for links only");
    assert.deepEqual(lastCall(conn).params, {
      sessionId: "s1",
      userInputId: "u1",
      clarification: { format: "text", content: "Use blue for links only" },
    });
  });

  it("validates the closed approval mode set", () => {
    assert.equal(isApprovalMode("onRequest"), true);
    assert.equal(isApprovalMode("allowAll"), true);
    assert.equal(isApprovalMode("denyUnmatched"), true);
    assert.equal(isApprovalMode("promptUnmatched"), true);
    assert.equal(isApprovalMode("yolo"), false);
  });
});
