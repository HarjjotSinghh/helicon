import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { HeliconClient } from "../src/client.js";
import { HeliconController, type Platform } from "../src/model/controller.js";
import type { EndpointSummary, ModelOption, SessionSummary } from "../src/types.js";

const ENDPOINT: EndpointSummary = {
  id: "e1",
  name: "Zen gateway",
  baseUrl: "https://opencode.ai/zen/v1",
  defaultModel: "muse-spark-1.3",
  hasApiKey: true,
  models: ["muse-spark-1.3", "muse-spark-1.2", "muse-fw-9"],
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
  models: ModelOption[] = [
    { modelId: "muse-own", displayLabel: "muse-own", description: null, isDefault: true, isActive: true, contextLimit: null, outputLimit: null, cost: null, contributor: false, providerId: null, providerName: null },
    { modelId: "muse-fw-9", displayLabel: "muse-fw-9", description: null, isDefault: false, isActive: true, contextLimit: null, outputLimit: null, cost: null, contributor: false, providerId: "e1", providerName: "Zen gateway" },
  ];
  endpointGate: Promise<void> | null = null;
  activationGates: Promise<void>[] = [];

  async listProjects() {
    this.projectLists += 1;
    return [];
  }
  async listSessions() {
    return [];
  }
  async listModels() {
    this.modelLists += 1;
    return this.models;
  }
  async endpoints() {
    const endpoints = this.list.map((endpoint) => ({ ...endpoint, models: [...endpoint.models] }));
    const activeEndpointId = this.activeEndpointId;
    if (this.endpointGate) {
      await this.endpointGate;
    }
    return { endpoints, activeEndpointId };
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
    const gate = this.activationGates.shift();
    if (gate) {
      await gate;
    }
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

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

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
    await controller.saveEndpoint({ id: "e-new", name: "Other", baseUrl: "https://other/v1", apiKey: "" });
    assert.equal(fake.saved[2]?.apiKey, "", "an explicit empty API key clears the saved credential");
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
    assert.equal(fake.modelLists, 1, "deleting an endpoint refreshes the aggregate picker catalog");
  });

  it("refreshEndpointModels updates that endpoint's models in state", async () => {
    const fake = new FakeClient();
    const controller = started(fake);
    await controller.loadEndpoints();
    await controller.refreshEndpointModels("e1");
    const state = controller.store.get();
    assert.deepEqual(fake.refreshed, ["e1"]);
    assert.deepEqual(state.endpoints[0]?.models, ["muse-fw-9", "muse-spark-1.3"]);
    assert.equal(fake.modelLists, 1, "refreshing endpoint models refreshes the aggregate picker catalog");
  });

  it("refreshes the aggregate picker catalog after saving an endpoint", async () => {
    const fake = new FakeClient();
    fake.models = [{ ...fake.models[0]!, modelId: "gateway-only", providerId: "e-new", providerName: "Other" }];
    const controller = started(fake);
    await controller.saveEndpoint({ name: "Other", baseUrl: "https://other/v1" });
    assert.equal(fake.modelLists, 1);
    assert.deepEqual(controller.store.get().models.map((entry) => entry.modelId), ["gateway-only"]);
  });

  it("does not let an endpoint load that started earlier undo a newer activation", async () => {
    const fake = new FakeClient();
    let release!: () => void;
    fake.endpointGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const controller = started(fake);
    const loading = controller.loadEndpoints();
    await Promise.resolve();
    await controller.activateEndpoint("new-choice");
    release();
    await loading;
    assert.equal(fake.activeEndpointId, "new-choice");
    assert.equal(controller.store.get().activeEndpointId, "new-choice");
  });

  it("serializes three concurrent activations and leaves the newest provider persisted and visible", async () => {
    const fake = new FakeClient();
    const firstGate = deferred();
    const secondGate = deferred();
    const thirdGate = deferred();
    fake.activationGates = [firstGate.promise, secondGate.promise, thirdGate.promise];
    const controller = started(fake);
    const first = controller.activateEndpoint("first");
    await settle();
    assert.deepEqual(fake.activated, ["first"]);
    const second = controller.activateEndpoint("second");
    await settle();
    assert.deepEqual(fake.activated, ["first"], "the next activation waits for the first to persist");
    firstGate.resolve();
    await settle();
    assert.deepEqual(fake.activated, ["first", "second"]);
    const third = controller.activateEndpoint("third");
    secondGate.resolve();
    await settle();
    thirdGate.resolve();
    await Promise.all([first, second, third]);
    assert.deepEqual(fake.activated, ["first", "second", "third"]);
    assert.equal(fake.activeEndpointId, "third");
    assert.equal(controller.store.get().activeEndpointId, "third");
  });

  it("syncs the requested endpoint target after an authoritative external active-provider change", async () => {
    const fake = new FakeClient();
    const controller = started(fake);
    await controller.activateEndpoint("e1");
    fake.activeEndpointId = null;
    await controller.loadEndpoints();
    await controller.activateEndpoint("e1");
    assert.deepEqual(fake.activated, ["e1", "e1"], "the remembered target is activated after the external change");
    assert.equal(controller.store.get().activeEndpointId, "e1");
  });

  it("waits for provider activation before starting a new thread", async () => {
    const fake = new FakeClient();
    const firstGate = deferred();
    const secondGate = deferred();
    const thirdGate = deferred();
    fake.activationGates = [firstGate.promise, secondGate.promise, thirdGate.promise];
    const controller = started(fake);
    controller.store.set((state) => ({ ...state, prefs: { ...state.prefs, lastProject: "/work/app" } }));
    const activation = controller.activateEndpoint("first");
    await settle();
    const sending = controller.send("hello");
    const secondActivation = controller.activateEndpoint("second");
    firstGate.resolve();
    await settle();
    const thirdActivation = controller.activateEndpoint("third");
    secondGate.resolve();
    await settle();
    assert.equal(fake.starts.length, 0);
    thirdGate.resolve();
    await Promise.all([activation, secondActivation, thirdActivation, sending]);
    assert.equal(fake.starts.at(-1)?.endpointId, "third");
  });
});

describe("provider-aware model choice", () => {
  it("starts a new thread on the default provider with the model remembered for it", async () => {
    const fake = new FakeClient();
    const controller = started(fake);
    await controller.loadEndpoints();
    controller.store.set((state) => ({ ...state, models: fake.models }));
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
    controller.store.set((state) => ({ ...state, models: fake.models }));
    controller.store.set((s) => ({ ...s, route: { kind: "thread", sessionId: "s1" }, sessions: { s1: session("s1", "e1") } }));

    await controller.setModel("muse-fw-9", "e1");
    assert.deepEqual(fake.modelSwitches, [{ sessionId: "s1", modelId: "muse-fw-9" }]);

    await controller.setModel("muse-spark-1.3", null);
    assert.equal(fake.modelSwitches.length, 1, "another provider's model never goes to the thread");
  });

  it("keeps the legacy default and own new threads scoped to the own provider", async () => {
    const fake = new FakeClient();
    const controller = started(fake);
    await controller.loadEndpoints();
    controller.store.set((state) => ({ ...state, models: fake.models }));
    await controller.setModel("muse-fw-9", "e1");
    assert.equal(controller.store.get().prefs.defaultModelId, null);
    await controller.activateEndpoint(null);
    controller.store.set((state) => ({ ...state, prefs: { ...state.prefs, modelByProvider: { own: "muse-fw-9" }, lastProject: "/work/app" } }));
    await controller.send("hello");
    assert.deepEqual(fake.starts.at(-1), { cwd: "/work/app", approvalMode: "onRequest", modelId: "muse-own", endpointId: null });
  });
});
