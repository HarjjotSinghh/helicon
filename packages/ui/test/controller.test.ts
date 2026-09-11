import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HeliconError, type EventHandler, type HeliconClient } from "../src/client.js";
import { HeliconController, type Platform } from "../src/model/controller.js";
import { buildTurns } from "../src/model/fold.js";
import type { SessionSummary, TranscriptLoad } from "../src/types.js";
import { historyEvents } from "./fixtures/probe.js";

const SESSION: SessionSummary = {
  sessionId: "s1",
  cwd: "/work/app",
  title: "Probe",
  titleSource: "auto",
  turnCount: 3,
  modelId: "muse-spark-1.3",
  origin: "helicon",
  archived: false,
  createdAt: "2026-09-11T00:00:00.000Z",
  activityAt: "2026-09-11T00:00:00.000Z",
  settled: false,
  settledAt: null,
  unsettledAt: null,
  live: null,
};

function load(overrides: Partial<TranscriptLoad> = {}): TranscriptLoad {
  return {
    session: SESSION,
    msp: { status: "idle", activeTurnId: null, modelId: "muse-spark-1.3", approvalMode: "onRequest", workspaceRoot: "/work/app", turnCount: 3 },
    events: historyEvents,
    truncated: false,
    pending: { approvals: [], userInputs: [] },
    readOnly: false,
    readOnlyReason: null,
    ...overrides,
  };
}

class FakeClient implements HeliconClient {
  handler: EventHandler | null = null;
  sent: { sessionId: string; text: string; ifBusy?: string }[] = [];
  transcript: () => Promise<TranscriptLoad> = async () => load();
  sendResult: () => Promise<{ turnId: string | null; disposition: string | null }> = async () => ({ turnId: "t9", disposition: "started" });

  async probeEnvironment() {
    return { platform: "linux", wslAvailable: false, defaultDistro: null, museFound: true, musePath: "/usr/bin/muse", version: "0.2.0", persistent: true };
  }
  async listProjects() {
    return [{ cwd: "/work/app", displayName: "app", pinned: false, activityAt: SESSION.activityAt }];
  }
  async addProject(cwd: string) {
    return { cwd, warning: null };
  }
  async cloneProject(_url: string, path: string) {
    return { cwd: path, warning: null };
  }
  async listDirectory(path: string) {
    return { directory: path, parent: null, separator: "/" as const, exists: true, entries: [] };
  }
  async revealPath() {}
  async hideProject() {}
  async setPinned() {}
  async listSessions() {
    return [SESSION];
  }
  async discover() {}
  async startSession() {
    return SESSION;
  }
  loadTranscript() {
    return this.transcript();
  }
  async updateSession() {
    return SESSION;
  }
  async sendTurn(sessionId: string, text: string, options?: { ifBusy?: string }) {
    this.sent.push({ sessionId, text, ifBusy: options?.ifBusy });
    return this.sendResult();
  }
  async interruptTurn() {}
  async unqueueTurn() {}
  async decideApproval() {}
  async answerUserInput() {}
  async cancelUserInput() {}
  async clarifyUserInput() {}
  async listModels() {
    return [];
  }
  async setSessionModel() {}
  async setApprovalMode() {}
  async compact() {}
  async openFolder() {}
  subscribe(handler: EventHandler) {
    this.handler = handler;
    return () => {
      this.handler = null;
    };
  }
}

function platform(hash = ""): Platform & { hash: string } {
  const state = {
    hash,
    loadPrefs: () => null,
    savePrefs: () => {},
    readHash: () => state.hash,
    writeHash: (next: string) => {
      state.hash = next;
    },
    onHashChange: () => () => {},
    now: () => Date.now(),
    schedule: (fn: () => void) => setTimeout(fn, 0),
    cancel: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
  return state;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 15));

async function started(client: FakeClient, hash = "#/t/s1") {
  const controller = new HeliconController(client, platform(hash));
  const stop = controller.start();
  await settle();
  await settle();
  return { controller, stop };
}

describe("HeliconController", () => {
  it("boots, lists threads and opens the one in the URL", async () => {
    const client = new FakeClient();
    const { controller, stop } = await started(client);
    const state = controller.store.get();
    assert.equal(state.boot, "ready");
    assert.deepEqual(state.route, { kind: "thread", sessionId: "s1" });
    assert.equal(state.threads["s1"]?.load, "ready");
    assert.equal(buildTurns(state.threads["s1"]!.fold).length, 3);
    stop();
  });

  it("keeps stream events that arrive while a thread is still loading", async () => {
    const client = new FakeClient();
    let resolve: (value: TranscriptLoad) => void = () => {};
    client.transcript = () => new Promise((r) => (resolve = r));
    const { controller, stop } = await started(client);
    client.handler?.({ type: "msp", sessionId: "s1", method: "turn/started", params: { sessionId: "s1", turnId: "live-1" }, at: 1 });
    resolve(load());
    await settle();
    assert.equal(controller.store.get().threads["s1"]?.fold.activeTurnId, "live-1");
    stop();
  });

  it("echoes a sent prompt, marks the turn running, then drops the echo", async () => {
    const client = new FakeClient();
    const { controller, stop } = await started(client);
    assert.equal(await controller.send("Add a README section"), true);
    let fold = controller.store.get().threads["s1"]!.fold;
    assert.equal(fold.activeTurnId, "t9");
    assert.equal(fold.echoes[0]?.turnId, "t9");
    client.handler?.({
      type: "msp",
      sessionId: "s1",
      method: "item/completed",
      params: { sessionId: "s1", item: { itemId: "u9", kind: "userMessage", status: "completed", revision: 1, turnId: "t9", text: "Add a README section" } },
      at: 2,
    });
    await settle();
    fold = controller.store.get().threads["s1"]!.fold;
    assert.equal(fold.echoes.length, 0);
    stop();
  });

  it("queues follow-ups while a turn runs and steers on request", async () => {
    const client = new FakeClient();
    client.transcript = async () => load({ msp: { status: "running", activeTurnId: "t1", modelId: null, approvalMode: null, workspaceRoot: null, turnCount: 3 } });
    client.sendResult = async () => ({ turnId: "t2", disposition: "queued" });
    const { controller, stop } = await started(client);
    await controller.send("next thing");
    assert.equal(client.sent.at(-1)?.ifBusy, "queue");
    assert.equal(controller.store.get().threads["s1"]!.fold.echoes[0]?.disposition, "queued");
    client.sendResult = async () => ({ turnId: "t1", disposition: "steered" });
    await controller.send("actually use tabs", { steer: true });
    assert.equal(client.sent.at(-1)?.ifBusy, "steer");
    stop();
  });

  it("reports a failed send and hands the text back", async () => {
    const client = new FakeClient();
    client.sendResult = async () => {
      throw new HeliconError("input too large", 409, "inputTooLarge");
    };
    const { controller, stop } = await started(client);
    assert.equal(await controller.send("x".repeat(10)), false);
    const state = controller.store.get();
    assert.equal(state.threads["s1"]!.fold.echoes.length, 0);
    assert.equal(state.toasts.at(-1)?.title, "Message not sent");
    stop();
  });

  it("gives a failed first prompt to the new thread's composer", async () => {
    const client = new FakeClient();
    client.sendResult = async () => {
      throw new HeliconError("turn rejected", 409, "turnRejected");
    };
    const { controller, stop } = await started(client, "");
    // The new-thread composer unmounts on navigation, so it must not take the text back itself.
    assert.equal(await controller.send("Write the tests"), true);
    const state = controller.store.get();
    assert.deepEqual(state.route, { kind: "thread", sessionId: "s1" });
    assert.equal(state.toasts.at(-1)?.title, "Message not sent");
    assert.equal(controller.takeDraftHandoff("other"), null);
    assert.equal(controller.takeDraftHandoff("s1"), "Write the tests");
    assert.equal(controller.store.get().draftHandoff, null);
    stop();
  });

  it("marks a read-only thread and refuses to send into it", async () => {
    const client = new FakeClient();
    client.transcript = async () => load({ readOnly: true, readOnlyReason: "session is loaded by another host" });
    const { controller, stop } = await started(client);
    assert.equal(controller.store.get().threads["s1"]?.readOnly, true);
    assert.equal(await controller.send("hello"), false);
    assert.equal(client.sent.length, 0);
    stop();
  });
});
