import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { HeliconClient } from "../src/client.js";
import { HeliconController, type Platform } from "../src/model/controller.js";
import type { EndpointSummary } from "../src/types.js";

const ENDPOINT: EndpointSummary = {
  id: "e1",
  name: "Zen gateway",
  baseUrl: "https://opencode.ai/zen/v1",
  defaultModel: "muse-spark-1.3",
  hasApiKey: true,
  models: ["muse-spark-1.3", "muse-spark-1.2"],
};

type SaveInput = { id?: string; name: string; baseUrl: string; apiKey?: string; defaultModel?: string | null };

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

  it("activating null after a delete reports the calls in order and lands back on Muse's own login", async () => {
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
    // The apply also reloads what the torn-down hosts fed: the lists and the model picker.
    assert.equal(fake.projectLists, 1);
    assert.equal(fake.modelLists, 1);
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
