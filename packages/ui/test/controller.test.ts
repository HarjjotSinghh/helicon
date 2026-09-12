import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HeliconError, type EventHandler, type HeliconClient } from "../src/client.js";
import { HeliconController, type Platform } from "../src/model/controller.js";
import { buildTurns } from "../src/model/fold.js";
import type { SessionSummary, SkillEntry, TranscriptLoad } from "../src/types.js";
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
  sent: {
    sessionId: string;
    text: string;
    ifBusy?: string;
    displayText?: string;
    attachments?: { name: string; mediaType: string; base64: string }[];
  }[] = [];
  actions: string[] = [];
  orders: string[][] = [];
  skills: SkillEntry[] = [];
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
  assetUrl(path: string) {
    return path;
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
  async sendTurn(
    sessionId: string,
    text: string,
    options?: { ifBusy?: string; displayText?: string; attachments?: { name: string; mediaType: string; base64: string }[] },
  ) {
    this.sent.push({
      sessionId,
      text,
      ifBusy: options?.ifBusy,
      displayText: options?.displayText,
      attachments: options?.attachments,
    });
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
  async setProjectOrder(cwds: string[]) {
    this.orders.push(cwds);
  }
  async usage() {
    return { since: "2026-09-01T00:00:00.000Z", days: 30, buckets: [], threads: [] };
  }
  async runShellProxy(sessionId: string, command: string) {
    this.actions.push(`shell-proxy:${command}`);
    return {
      id: `run-${this.actions.length}`,
      sessionId,
      command,
      exitCode: 0,
      output: `ran ${command}`,
      truncated: false,
      durationMs: 12,
      at: "2026-09-11T22:00:00.000Z",
    };
  }
  compactNoop = false;
  async compact() {
    this.actions.push("compact");
    return { noop: this.compactNoop, reason: this.compactNoop ? "no_compactable_history" : null };
  }
  async runShell(sessionId: string, command: string) {
    this.actions.push(`shell:${sessionId}:${command}`);
  }
  async forkSession() {
    this.actions.push("fork");
    return { ...SESSION, sessionId: "s2", title: "Probe (fork)" };
  }
  async listSkills() {
    return { skills: this.skills, error: null };
  }
  async skillBody(_cwd: string, skillId: string) {
    return `Instructions for ${skillId}.`;
  }
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
    assert.deepEqual(controller.takeDraftHandoff("s1"), { text: "Write the tests" });
    assert.equal(controller.store.get().draftHandoff, null);
    stop();
  });

  it("hands the files back with the prompt when a first send fails", async () => {
    const client = new FakeClient();
    client.sendResult = async () => {
      throw new HeliconError("turn rejected", 409, "turnRejected");
    };
    const { controller, stop } = await started(client, "");
    const attachments = [{ name: "shot.png", mediaType: "image/png", base64: "AAAA" }];
    const previews = [{ name: "shot.png", mediaType: "image/png", kind: "image" as const, url: "blob:shot" }];
    assert.equal(await controller.send("Look at this", { attachments, previews }), true);
    // Text alone would hand back a draft asking about an image that is no longer attached to it.
    assert.deepEqual(controller.takeDraftHandoff("s1"), { text: "Look at this", attachments, previews });
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

  it("runs slash commands, skills and shell lines instead of sending their text", async () => {
    const client = new FakeClient();
    client.skills = [
      { id: "bundled:plan", name: "plan", displayName: "plan", description: "Plan it.", shortDescription: null, scope: "bundled", activation: "on" },
      { id: "user:secret", name: "secret", displayName: "secret", description: "By hand.", shortDescription: null, scope: "user", activation: "user-invocable-only" },
    ];
    const { controller, stop } = await started(client);
    await controller.loadSkills("/work/app");
    assert.equal(controller.store.get().skills["/work/app"]?.status, "ready");

    assert.equal(await controller.send("/plan tidy the API"), true);
    assert.equal(client.sent.at(-1)?.displayText, "/plan tidy the API", "the transcript shows what was typed");
    assert.match(client.sent.at(-1)?.text ?? "", /read_skill with name "bundled:plan" first, then apply it to: tidy the API$/);
    assert.equal(await controller.send("/secret go"), true);
    assert.match(client.sent.at(-1)?.text ?? "", /<skill-body id="user:secret">\nInstructions for user:secret\.\n<\/skill-body>\n\ngo$/);

    assert.equal(await controller.send("/compact"), true);
    assert.equal(await controller.send("! git status"), true);
    assert.deepEqual(client.actions, ["compact", "shell-proxy:git status"], "Helicon runs `!` itself now");
    client.compactNoop = true;
    assert.equal(await controller.send("/compact"), true);
    assert.equal(controller.store.get().toasts.at(-1)?.title, "Nothing to compact yet");
    assert.equal(controller.store.get().toasts.at(-1)?.detail, "There is no earlier history to summarize.");

    assert.equal(await controller.send("/effort high"), true);
    assert.equal(controller.store.get().prefs.effort, "high");
    assert.equal(await controller.send("/model"), true);
    assert.equal(controller.store.get().picker, "model");
    assert.equal(await controller.send("/permissions full"), true);
    assert.equal(controller.store.get().picker, "confirmFullAccess", "full access still asks first");
    controller.closePicker("permissions");
    assert.equal(controller.store.get().picker, "confirmFullAccess", "a menu closing after the hand-off leaves the dialog open");

    const before = client.sent.length;
    assert.equal(await controller.send("/deploy now"), false);
    assert.equal(controller.store.get().toasts.at(-1)?.title, "No command named /deploy");
    assert.equal(client.sent.length, before);
    assert.equal(await controller.send("/deploy now", { raw: true }), true);
    assert.equal(client.sent.at(-1)?.text, "/deploy now");
    assert.equal(await controller.send("/usr/bin/node crashes on start"), true, "a path is a prompt, not a command");
    assert.equal(client.sent.at(-1)?.text, "/usr/bin/node crashes on start");
    stop();
  });

  it("waits for a workspace's skills when a skill is sent before they load", async () => {
    const client = new FakeClient();
    client.skills = [
      { id: "bundled:git", name: "git", displayName: "git", description: "Git safety.", shortDescription: null, scope: "bundled", activation: "on" },
    ];
    const { controller, stop } = await started(client);
    assert.equal(controller.store.get().skills["/work/app"], undefined);
    assert.equal(await controller.send("/git reply ok"), true);
    assert.equal(client.sent.at(-1)?.displayText, "/git reply ok");
    assert.equal(controller.store.get().skills["/work/app"]?.status, "ready");
    stop();
  });

  it("sets a goal through the model, and asks for the objective when it is missing", async () => {
    const client = new FakeClient();
    const { controller, stop } = await started(client);
    assert.equal(await controller.send("/goal Ship the release"), true);
    assert.equal(client.sent.at(-1)?.displayText, "/goal Ship the release");
    assert.match(client.sent.at(-1)?.text ?? "", /create_goal tool\. Objective: Ship the release/);
    const count = client.sent.length;
    assert.equal(await controller.send("/goal"), false);
    assert.equal(client.sent.length, count);
    assert.equal(controller.store.get().toasts.at(-1)?.title, "Add the goal after /goal");
    assert.equal(await controller.continueGoal("s1", "Ship the release"), true);
    assert.equal(client.sent.at(-1)?.displayText, "Keep working on the goal");
    stop();
  });

  it("runs a `!` command itself and hands its output to Muse on request", async () => {
    const client = new FakeClient();
    const { controller, stop } = await started(client);
    assert.equal(await controller.send("!ls -la"), true);
    const run = controller.store.get().threads["s1"]?.shellRuns[0];
    assert.equal(run?.command, "ls -la");
    assert.ok(client.actions.includes("shell-proxy:ls -la"));

    assert.equal(await controller.sendShellOutput("s1", run!), true);
    const sent = client.sent.at(-1);
    assert.match(sent?.text ?? "", /I ran this in the workspace/);
    assert.match(sent?.text ?? "", /ran ls -la/);
    assert.equal(sent?.displayText, "Shared the output of `ls -la`");
    stop();
  });

  it("starts a thread beside one whose reasoning cannot be replayed", async () => {
    const client = new FakeClient();
    const { controller, stop } = await started(client);
    assert.equal(await controller.freshThread("s1", "pick this up again"), true);
    assert.equal(client.sent.at(-1)?.text, "pick this up again");
    assert.equal(controller.store.get().route.kind, "thread");

    // A prompt the transcript showed as `/goal …` is expanded again, not sent as the literal command.
    assert.equal(await controller.freshThread("s1", "/goal ship the release"), true);
    assert.equal(client.sent.at(-1)?.displayText, "/goal ship the release");
    assert.match(client.sent.at(-1)?.text ?? "", /create_goal tool\. Objective: ship the release/);
    stop();
  });

  it("compacts a thread the provider will not take, then sends the prompt again", async () => {
    const client = new FakeClient();
    const { controller, stop } = await started(client);
    await controller.compactAndRetry("s1", "try that again");
    assert.ok(client.actions.includes("compact"), "the history is summarized first");
    assert.equal(client.sent.at(-1)?.text, "try that again");
    assert.equal(client.sent.at(-1)?.ifBusy, "queue", "the retry waits behind the compaction turn");

    let before = client.sent.length;
    await controller.compactAndRetry("s1", null);
    assert.equal(client.sent.length, before, "with no prompt to resend, it only compacts");

    // A compaction Muse refused leaves the history exactly as it was, so resending would fail the same way.
    before = client.sent.length;
    client.compactNoop = true;
    await controller.compactAndRetry("s1", "try that again");
    assert.equal(client.sent.length, before, "nothing is resent after a noop compaction");
    client.compactNoop = false;
    client.compact = async () => {
      throw new Error("no");
    };
    await controller.compactAndRetry("s1", "try that again");
    assert.equal(client.sent.length, before, "nor after one that failed");
    stop();
  });

  it("clears a failed turn's notice when the user retries it", async () => {
    const client = new FakeClient();
    const { controller, stop } = await started(client);
    client.handler?.({
      type: "msp",
      sessionId: "s1",
      method: "turn/completed",
      params: { sessionId: "s1", turnId: "t7", terminal: "failed", error: { kind: "rateLimit", message: "quota", retryable: true } },
      at: 5,
    });
    await settle();
    assert.equal(controller.store.get().threads["s1"]?.fold.turns["t7"]?.error?.message, "quota");

    controller.dismissTurnError("s1", "t7");
    const info = controller.store.get().threads["s1"]?.fold.turns["t7"];
    assert.equal(info?.error, undefined);
    assert.equal(info?.dismissed, true);
    stop();
  });

  it("reorders projects by drag, and puts them back when the server refuses", async () => {
    const client = new FakeClient();
    const project = (cwd: string) => ({ cwd, displayName: cwd.slice(6), pinned: false, activityAt: SESSION.activityAt });
    client.listProjects = async () => [project("/work/a"), project("/work/b"), project("/work/c")];
    const { controller, stop } = await started(client);
    const order = () => controller.store.get().projects.map((p) => p.cwd);

    await controller.reorderProjects("/work/c", "/work/a");
    assert.deepEqual(order(), ["/work/c", "/work/a", "/work/b"]);
    assert.deepEqual(client.orders.at(-1), ["/work/c", "/work/a", "/work/b"]);

    await controller.reorderProjects("/work/c", null);
    assert.deepEqual(order(), ["/work/a", "/work/b", "/work/c"], "dropping past the last row sends it to the end");

    client.setProjectOrder = async () => {
      throw new Error("nope");
    };
    await controller.reorderProjects("/work/c", "/work/a");
    assert.deepEqual(order(), ["/work/a", "/work/b", "/work/c"], "a refused move snaps back");
    stop();
  });

  it("sends attached files with a prompt, and shows them while it is in flight", async () => {
    const client = new FakeClient();
    const { controller, stop } = await started(client);
    const sent = await controller.send("look at this", {
      attachments: [{ name: "shot.png", mediaType: "image/png", base64: "AAAB" }],
      previews: [{ name: "shot.png", mediaType: "image/png", kind: "image", url: "blob:preview" }],
    });
    assert.equal(sent, true);
    assert.deepEqual(client.sent.at(-1)?.attachments, [{ name: "shot.png", mediaType: "image/png", base64: "AAAB" }]);
    assert.equal(controller.store.get().threads["s1"]?.fold.echoes.at(-1)?.attachments?.[0]?.url, "blob:preview");

    assert.equal(
      await controller.send("", { attachments: [{ name: "notes.pdf", mediaType: "application/pdf", base64: "AAAC" }] }),
      true,
      "a file with no text still sends",
    );
    assert.equal(await controller.send(""), false, "nothing to send is still nothing");
    stop();
  });

  it("hands a `!` command the host could not run to the agent", async () => {
    const client = new FakeClient();
    const { controller, stop } = await started(client);
    assert.equal(await controller.askToRun("s1", "ls -la"), true);
    assert.match(client.sent.at(-1)?.text ?? "", /```sh\nls -la\n```/);
    assert.match(client.sent.at(-1)?.text ?? "", /your own shell works/, "the agent is told its own shell is fine");
    assert.equal(await controller.askToRun("s1", "echo '```'"), true);
    assert.match(client.sent.at(-1)?.text ?? "", /````sh\necho '```'\n````/, "a fence in the command gets a longer fence around it");
    assert.equal(await controller.askToRun("s1", "printf '~~~\\n'"), true);
    assert.match(client.sent.at(-1)?.text ?? "", /```sh\nprintf '~~~\\n'\n```/, "a tilde run in the command changes nothing");
    stop();
  });

  it("forks a thread and opens the fork", async () => {
    const client = new FakeClient();
    const { controller, stop } = await started(client);
    // Opening the fork loads its transcript, which carries the fork's own summary.
    client.transcript = async () => load({ session: { ...SESSION, sessionId: "s2", title: "Probe (fork)" } });
    assert.equal(await controller.send("/fork"), true);
    const state = controller.store.get();
    assert.deepEqual(state.route, { kind: "thread", sessionId: "s2" });
    assert.equal(state.sessions["s2"]?.title, "Probe (fork)");
    assert.equal(state.toasts.at(-1)?.title, "Forked into a new thread");
    stop();
  });
});
