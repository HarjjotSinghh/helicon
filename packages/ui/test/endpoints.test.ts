import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { HeliconClient } from "../src/client.js";
import { HeliconController, type Platform } from "../src/model/controller.js";
import type { EndpointSummary, SessionSummary } from "../src/types.js";

const ENDPOINT: EndpointSummary = {
  id: "e1",
  name: "Zen gateway",
  baseUrl: "https://opencode.ai/zen/v1",
  defaultModel: "muse-spark-1.3",
  hasApiKey: true,
  models: ["muse-spark-1.3", "muse-spark-1.2"],
};

type SaveInput = { id?: string; name: string; baseUrl: string; apiKey?: string; defaultModel?: string | null };

/** A session summary for the provider tests; the endpoint decides which home serves it. */
function session(id: string, endpointId: string | null): SessionSummary {
  return {
    sessionId: id,
    cwd: "/work/app",
    title: id,
    titleSource: "auto",
    turnCount: 0,
    modelId: null,
    endpointId,
    origin: "helicon",
    archived: false,
    createdAt: "2026-09-17T00:00:00.000Z",
    activityAt: "2026-09-17T00:00:00.000Z",
    settled: false,
    settledAt: null,
    unsettledAt: null,
    live: null,
  };
}

function platform(): Platform {
  return {
    loadPrefs: () => null,
    savePrefs: () => {},
    readHash: () => "",
    writeHash: () => {},
    onHashChange: () => () => {},
    now: () => Date.now(),
    schedule: (fn: () => void) => setTimeout(fn, 0),
    cancel: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    focused: () => false,
  };
}

/** Only what the endpoint actions and the reload they trigger touch; the rest of the surface stays unimplemented. */
class FakeClient {
  list: EndpointSummary[] = [{ ...ENDPOINT, models: [...ENDPOINT.models] }];
  activeEndpointId: string | null = "e1";
  saved: SaveInput[] = [];
  deleted: string[] = [];
  activated: (string | null)[] = [];
  refreshed: string[] = [];
  projectLists = 0;
  modelLists = 0;
  modelSwitches: { sessionId: string; modelId: string }[] = [];
  starts: { cwd: string; approvalMode?: string; modelId?: string; endpointId?: string | null }[] = [];

  async listProjects() {
    this.projectLists += 1;
    return [];
  }
  async listSessions() {
    return [];
  }
  async listModels() {
    this.modelLists += 1;
    return [];
  }
  async endpoints() {
    return { endpoints: this.list.map((endpoint) => ({ ...endpoint, models: [...endpoint.models] })), activeEndpointId: this.activeEndpointId };
  }
  async saveEndpoint(input: SaveInput) {
    this.saved.push({ ...input });
    const saved: EndpointSummary = {
      id: input.id ?? "e-new",
      name: input.name,
      baseUrl: input.baseUrl,
      defaultModel: input.defaultModel ?? null,
      hasApiKey: input.apiKey !== undefined && input.apiKey !== "",
      models: ["muse-spark-1.3"],
    };
    const at = this.list.findIndex((endpoint) => endpoint.id === saved.id);
    if (at >= 0) {
      this.list[at] = saved;
    } else {
      this.list.push(saved);
    }
    return { ...saved, models: [...saved.models] };
  }
  async deleteEndpoint(id: string) {
    this.deleted.push(id);
    this.list = this.list.filter((endpoint) => endpoint.id !== id);
  }
  async activateEndpoint(id: string | null) {
    this.activated.push(id);
    this.activeEndpointId = id;
  }
  async refreshEndpointModels(id: string) {
    this.refreshed.push(id);
    const endpoint = this.list.find((entry) => entry.id === id);
    if (endpoint) {
      endpoint.models = ["muse-fw-9", "muse-spark-1.3"];
    }
    return endpoint ? [...endpoint.models] : [];
  }
  async startSession(cwd: string, options?: { approvalMode?: string; modelId?: string; endpointId?: string | null }) {
    this.starts.push({ cwd, ...options });
    return session("s-new", options?.endpointId ?? null);
  }
  async sendTurn() {
    return { turnId: "t1" };
  }
  async setSessionModel(sessionId: string, modelId: string) {
    this.modelSwitches.push({ sessionId, modelId });
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 15));

function started(fake: FakeClient) {
  return new HeliconController(fake as unknown as HeliconClient, platform());
}

describe("endpoint management", () => {
  it("loadEndpoints populates the endpoint list and the active id", async () => {
    const fake = new FakeClient();
    const controller = started(fake);
    const before = controller.store.get();
    assert.deepEqual(before.endpoints, []);
    assert.equal(before.activeEndpointId, null);
    await controller.loadEndpoints();
    const state = controller.store.get();
    assert.deepEqual(state.endpoints, [ENDPOINT]);
    assert.equal(state.activeEndpointId, "e1");
  });

  it("saveEndpoint passes the input through and omits apiKey when blank on an edit", async () => {
    const fake = new FakeClient();
    const controller = started(fake);
    const saved = await controller.saveEndpoint({
      id: "e1",
      name: "Zen gateway",
      baseUrl: "https://opencode.ai/zen/v1",
      defaultModel: "muse-spark-1.2",
    });
    assert.equal(saved, true);
    assert.equal(fake.saved.length, 1);
    assert.equal("apiKey" in fake.saved[0], false);
    assert.deepEqual(fake.saved[0], { id: "e1", name: "Zen gateway", baseUrl: "https://opencode.ai/zen/v1", defaultModel: "muse-spark-1.2" });
    assert.equal(controller.store.get().endpoints[0]?.defaultModel, "muse-spark-1.2");
    // A key the user did type goes through whole.
    await controller.saveEndpoint({ name: "Other", baseUrl: "https://other/v1", apiKey: "sk-two" });
    assert.equal(fake.saved[1]?.apiKey, "sk-two");
    assert.equal(controller.store.get().endpoints.some((endpoint) => endpoint.id === "e-new" && endpoint.hasApiKey), true);
  });

  it("activating null after a delete lands back on Muse's own login without touching the lists", async () => {
    const fake = new FakeClient();
    const controller = started(fake);
    await controller.loadEndpoints();
    await controller.deleteEndpoint("e1");
    await controller.activateEndpoint(null);
    await settle();
    const state = controller.store.get();
    assert.deepEqual(fake.deleted, ["e1"]);
    assert.deepEqual(fake.activated, [null]);
    assert.deepEqual(state.endpoints, []);
    assert.equal(state.activeEndpointId, null);
    // The default provider is only a default now: running threads keep their homes, so nothing reloads.
    assert.equal(fake.projectLists, 0);
    assert.equal(fake.modelLists, 0);
  });

  it("refreshEndpointModels updates that endpoint's models in state", async () => {
    const fake = new FakeClient();
    const controller = started(fake);
    await controller.loadEndpoints();
    await controller.refreshEndpointModels("e1");
    const state = controller.store.get();
    assert.deepEqual(fake.refreshed, ["e1"]);
    assert.deepEqual(state.endpoints[0]?.models, ["muse-fw-9", "muse-spark-1.3"]);
  });
});

describe("provider-aware model choice", () => {
  it("starts a new thread on the default provider with the model remembered for it", async () => {
    const fake = new FakeClient();
    const controller = started(fake);
    await controller.loadEndpoints();
    await controller.setModel("muse-fw-9", "e1");
    controller.store.set((s) => ({ ...s, prefs: { ...s.prefs, lastProject: "/work/app" } }));

    await controller.send("hello");

    assert.deepEqual(fake.starts, [{ cwd: "/work/app", approvalMode: "onRequest", modelId: "muse-fw-9", endpointId: "e1" }]);
  });

  it("moves the default provider when a new thread's pick comes from another one", async () => {
    const fake = new FakeClient();
    const controller = started(fake);
    await controller.loadEndpoints();

    await controller.setModel("muse-spark-1.3", null);

    assert.deepEqual(fake.activated, [null]);
    assert.equal(controller.store.get().activeEndpointId, null);
    assert.equal(controller.store.get().prefs.modelByProvider["own"], "muse-spark-1.3");
  });

  it("keeps an open thread on its own provider", async () => {
    const fake = new FakeClient();
    const controller = started(fake);
    await controller.loadEndpoints();
    controller.store.set((s) => ({ ...s, route: { kind: "thread", sessionId: "s1" }, sessions: { s1: session("s1", "e1") } }));

    await controller.setModel("muse-fw-9", "e1");
    assert.deepEqual(fake.modelSwitches, [{ sessionId: "s1", modelId: "muse-fw-9" }]);

    await controller.setModel("muse-spark-1.3", null);
    assert.equal(fake.modelSwitches.length, 1, "another provider's model never goes to the thread");
  });
});
