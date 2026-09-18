import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HeliconServer } from "../src/server.js";
import { bundledModelRows, fetchEndpointModels, writeEndpointHome, type CatalogRow, type EndpointRecord } from "../src/endpoints.js";
import { HeliconStore, type ServeTarget } from "@helicon/daemon";

function endpoint(overrides: Partial<EndpointRecord> = {}): EndpointRecord {
  return {
    id: "e1",
    name: "Zen",
    baseUrl: "https://zen.example/muse",
    apiKey: "key-1",
    defaultModel: null,
    modelsJson: JSON.stringify(bundledModelRows().slice(0, 2)),
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

/** The cache file Muse derives from its provider/profile ids, computed the same way here. */
function cachePath(dataHome: string): string {
  const name = `${Buffer.from("meta", "utf8").toString("hex")}__p${Buffer.from("tbh", "utf8").toString("hex")}.json`;
  return join(dataHome, "muse", "model-catalog", name);
}

function readCache(dataHome: string): { rows: CatalogRow[] } {
  return JSON.parse(readFileSync(cachePath(dataHome), "utf8")) as { rows: CatalogRow[] };
}

describe("endpoint homes", () => {
  it("bundles three fallback models, none default", () => {
    const rows = bundledModelRows();
    assert.deepEqual(
      rows.map((row) => row.model_id),
      ["muse-spark-1.3", "muse-spark-1.2", "muse-spark-1.3-contributor-free"],
    );
    assert.ok(rows.every((row) => row.is_default === false));
    assert.equal(rows[2]?.description, "Free tier: prompts and completions may be used to train future Meta models.");
  });

  it("writes settings and a freshly dated catalog cache", async () => {
    const root = await mkdtemp(join(tmpdir(), "helicon-home-"));
    const home = writeEndpointHome(root, endpoint());

    assert.equal(home.configHome, join(root, "config"));
    assert.equal(home.dataHome, join(root, "data"));
    const settingsPath = join(home.configHome, "muse", "settings.json");
    assert.ok(existsSync(settingsPath));
    assert.ok(existsSync(cachePath(home.dataHome)));
    assert.deepEqual(JSON.parse(readFileSync(settingsPath, "utf8")), {
      schema_version: 1,
      endpoint_transport: { base_url: "https://zen.example/muse", auth: "bearer" },
    });

    const cache = readCache(home.dataHome);
    assert.equal(cache.rows.length, 2);
    assert.equal(cache.rows.filter((row) => row.is_default).length, 1, "exactly one default");
    assert.equal(cache.rows[0]?.is_default, true, "without a chosen model the first row is the default");
    // Muse treats a freshly written cache as current instead of refetching from the gateway.
    assert.ok(Date.now() - statSync(settingsPath).mtimeMs < 60_000);
    assert.ok(Date.now() - statSync(cachePath(home.dataHome)).mtimeMs < 60_000);
  });

  it("rejects unsafe endpoint ids before writing a managed home", async () => {
    const root = await mkdtemp(join(tmpdir(), "helicon-home-"));
    assert.throws(() => writeEndpointHome(root, endpoint({ id: "../escape" })), /endpoint id/i);
    assert.throws(() => writeEndpointHome(root, endpoint({ id: "own" })), /endpoint id/i);
  });

  it("prefers the endpoint's default model when it is among the rows", async () => {
    const root = await mkdtemp(join(tmpdir(), "helicon-home-"));
    const home = writeEndpointHome(root, endpoint({ defaultModel: "muse-spark-1.2" }));
    const rows = readCache(home.dataHome).rows;
    assert.equal(rows[1]?.is_default, true);
    assert.equal(rows[0]?.is_default, false);
  });

  it("appends a bundled-style row for a default model the catalog lacks", async () => {
    const root = await mkdtemp(join(tmpdir(), "helicon-home-"));
    const home = writeEndpointHome(root, endpoint({ defaultModel: "muse-pro-9", modelsJson: JSON.stringify(bundledModelRows().slice(0, 1)) }));
    const rows = readCache(home.dataHome).rows;
    assert.deepEqual(
      rows.map((row) => row.model_id),
      ["muse-spark-1.3", "muse-pro-9"],
    );
    assert.equal(rows[1]?.is_default, true);
    assert.equal(rows[1]?.context_limit, 1000000);
    assert.equal(rows[1]?.output_limit, 128000);
  });

  it("falls back to the bundled rows when the stored catalog is empty", async () => {
    const root = await mkdtemp(join(tmpdir(), "helicon-home-"));
    const home = writeEndpointHome(root, endpoint({ modelsJson: "[]" }));
    assert.deepEqual(
      readCache(home.dataHome).rows.map((row) => row.model_id),
      ["muse-spark-1.3", "muse-spark-1.2", "muse-spark-1.3-contributor-free"],
    );
  });
});

describe("fetchEndpointModels", () => {
  const listing = (ids: string[]) => JSON.stringify({ data: ids.map((id) => ({ id, object: "model" })) });

  it("maps an OpenAI listing to catalog rows, muse ids only", async () => {
    const asked: { url: string; authorization: string | null }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      asked.push({ url: String(input), authorization: new Headers(init?.headers).get("authorization") });
      return new Response(listing(["muse-spark-1.3", "MUSE-PRO-2", "gpt-9"]), { status: 200 });
    };
    const rows = await fetchEndpointModels("https://zen.example/muse/", "key-1", fetchImpl);
    assert.deepEqual(
      rows?.map((row) => row.model_id),
      ["muse-spark-1.3", "MUSE-PRO-2"],
    );
    assert.deepEqual(asked, [{ url: "https://zen.example/muse/models", authorization: "Bearer key-1" }]);
    assert.equal(rows?.[0]?.context_limit, 1000000);
    assert.equal(rows?.[0]?.output_limit, 128000);
    assert.equal(rows?.[0]?.is_default, false);
  });

  it("keeps the contributor-free description for ids that carry it", async () => {
    const fetchImpl: typeof fetch = async () => new Response(listing(["muse-spark-1.3-contributor-free"]), { status: 200 });
    const rows = await fetchEndpointModels("https://zen.example", null, fetchImpl);
    assert.equal(rows?.[0]?.description, "Free tier: prompts and completions may be used to train future Meta models.");
  });

  it("returns null for non-2xx, unparsable and unreachable listings", async () => {
    const notFound: typeof fetch = async () => new Response("nope", { status: 404 });
    assert.equal(await fetchEndpointModels("https://zen.example", null, notFound), null);
    const notJson: typeof fetch = async () => new Response("not json", { status: 200 });
    assert.equal(await fetchEndpointModels("https://zen.example", null, notJson), null);
    const notListed: typeof fetch = async () => new Response(JSON.stringify({ object: "list" }), { status: 200 });
    assert.equal(await fetchEndpointModels("https://zen.example", null, notListed), null);
    const unreachable: typeof fetch = async () => {
      throw new Error("network down");
    };
    assert.equal(await fetchEndpointModels("https://zen.example", null, unreachable), null);
  });
});

class FakeConnection {
  replies = new Map<string, unknown>();
  calls: { method: string; params: Record<string, unknown> }[] = [];
  handler: ((n: { method: string; params?: unknown }) => void) | null = null;
  beforeReply: ((method: string) => Promise<void>) | null = null;
  onClose: (() => void) | null = null;

  async command(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    this.calls.push({ method, params });
    await this.beforeReply?.(method);
    const reply = this.replies.get(method);
    if (reply instanceof Error) {
      throw reply;
    }
    return reply ?? { ok: true };
  }

  async request(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return this.command(method, params);
  }

  onNotification(handler: (n: { method: string; params?: unknown }) => void): void {
    this.handler = handler;
  }
}

/** One connection for every host, or one per host chosen from its ServeTarget. */
function fakeFactory(connections: FakeConnection | ((target: ServeTarget) => FakeConnection), targets: ServeTarget[]) {
  return (target: ServeTarget) => {
    targets.push(target);
    const connection = connections instanceof FakeConnection ? connections : connections(target);
    return {
      start: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { initializeResult: { serverInfo: { name: "muse", version: "1.1.1" } } };
      },
      connection: connection as never,
      close: async () => {
        connection.onClose?.();
        return { code: 0, signal: null };
      },
    };
  };
}

async function start(
  connection: FakeConnection | ((target: ServeTarget) => FakeConnection),
  targets: ServeTarget[],
  extra: Partial<ConstructorParameters<typeof HeliconServer>[0]> = {},
) {
  const dataDir = await mkdtemp(join(tmpdir(), "helicon-endpoints-data-"));
  const endpointsDir = await mkdtemp(join(tmpdir(), "helicon-endpoints-homes-"));
  const server = new HeliconServer({
    port: 0,
    dataDir,
    endpointsDir,
    platform: "linux",
    musePath: "muse",
    hostFactory: fakeFactory(connection, targets),
    ...extra,
  });
  after(() => server.close());
  const bound = await server.listen();
  return { base: `http://127.0.0.1:${bound.port}`, endpointsDir, dataDir };
}

async function send(base: string, path: string, body?: unknown, method = "POST"): Promise<{ status: number; json: any }> {
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

describe("custom endpoints API", () => {
  it("round-trips an endpoint, and spawns a host per provider", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    const targets: ServeTarget[] = [];
    const { base, endpointsDir } = await start(connection, targets);

    assert.equal((await send(base, "/api/endpoints", { name: "", baseUrl: "https://zen.example" }, "PUT")).status, 400);
    assert.equal((await send(base, "/api/endpoints", { name: "Zen", baseUrl: "ftp://zen.example" }, "PUT")).status, 400);
    assert.equal((await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://zen.example/a b" }, "PUT")).status, 400);

    const created = await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://zen.example/muse", apiKey: "secret-key" }, "PUT");
    assert.equal(created.status, 200);
    const id = created.json.endpoint.id as string;
    assert.equal(created.json.endpoint.hasApiKey, true);
    assert.equal("apiKey" in created.json.endpoint, false, "the key never comes back");

    let listed = await get(base, "/api/endpoints");
    assert.equal(listed.activeEndpointId, null);
    assert.equal(listed.endpoints.length, 1);
    assert.equal(listed.endpoints[0].baseUrl, "https://zen.example/muse");
    assert.equal(listed.endpoints[0].hasApiKey, true);
    assert.deepEqual(listed.endpoints[0].models, ["muse-spark-1.3", "muse-spark-1.2", "muse-spark-1.3-contributor-free"]);

    // No provider asked for: the thread runs on the user's own login, with no custom env.
    await send(base, "/api/sessions", { cwd: "/work/proj" });
    assert.equal(targets[0]?.env, undefined, "the own login needs no custom env");

    // An explicit provider spawns inside that endpoint's isolated Muse home.
    await send(base, "/api/sessions", { cwd: "/work/other", endpointId: id });
    const env = targets[1]?.env;
    assert.ok(env, "the endpoint's host carries its env");
    assert.equal(env["XDG_CONFIG_HOME"], join(endpointsDir, id, "config"));
    assert.equal(env["XDG_DATA_HOME"], join(endpointsDir, id, "data"));
    assert.equal(env["META_API_KEY"], "secret-key");
    assert.equal(env["MUSE_CUSTOM_HEADERS"], `x-opencode-session: ${id}`);
    assert.deepEqual(JSON.parse(readFileSync(join(endpointsDir, id, "config", "muse", "settings.json"), "utf8")), {
      schema_version: 1,
      endpoint_transport: { base_url: "https://zen.example/muse", auth: "bearer" },
    });

    // Provider and workspace both key a host, so the same folder can run under both at once.
    await send(base, "/api/sessions", { cwd: "/work/proj", endpointId: id });
    assert.equal(targets.length, 3, "the same folder under another provider is its own host");
    assert.equal(targets[2]?.env?.["META_API_KEY"], "secret-key");

    // Activating an endpoint sets the default for threads that do not name a provider.
    const activated = await send(base, "/api/endpoints/activate", { id });
    assert.equal(activated.status, 200);
    listed = await get(base, "/api/endpoints");
    assert.equal(listed.activeEndpointId, id);

    await send(base, "/api/sessions", { cwd: "/work/third" });
    assert.equal(targets[3]?.env?.["XDG_CONFIG_HOME"], join(endpointsDir, id, "config"), "absent means the active endpoint");

    // An explicit null overrides the default for one thread: back to the own login.
    await send(base, "/api/sessions", { cwd: "/work/third", endpointId: null });
    assert.equal(targets.length, 5, "the own-login host for the same folder is its own spawn");
    assert.equal(targets[4]?.env, undefined);

    // With nothing active, an absent provider means the user's own login again.
    await send(base, "/api/endpoints/activate", { id: null });
    await send(base, "/api/sessions", { cwd: "/work/fourth" });
    assert.equal(targets[5]?.env, undefined, "deactivating goes back to spawning exactly as before");

    // An absent apiKey keeps the stored one; an empty string is how the UI clears it.
    const kept = await send(base, "/api/endpoints", { id, name: "Zen", baseUrl: "https://zen.example/muse" }, "PUT");
    assert.equal(kept.json.endpoint.hasApiKey, true);
    const cleared = await send(base, "/api/endpoints", { id, name: "Zen", baseUrl: "https://zen.example/muse", apiKey: "" }, "PUT");
    assert.equal(cleared.json.endpoint.hasApiKey, false);
  });

  it("does not inherit the process credential for a keyless endpoint", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s-keyless" } });
    const targets: ServeTarget[] = [];
    const { base } = await start(connection, targets);
    const previous = process.env["META_API_KEY"];
    process.env["META_API_KEY"] = "ambient-secret";
    try {
      const created = await send(base, "/api/endpoints", { name: "Keyless", baseUrl: "https://zen.example" }, "PUT");
      assert.equal(created.status, 200);
      await send(base, "/api/sessions", { cwd: "/work/keyless", endpointId: created.json.endpoint.id });
      assert.equal(targets.at(-1)?.env?.["META_API_KEY"], undefined);
    } finally {
      if (previous === undefined) delete process.env["META_API_KEY"];
      else process.env["META_API_KEY"] = previous;
    }
  });

  it("uses the updated endpoint home after an idle endpoint edit", async () => {
    const targets: ServeTarget[] = [];
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s-edit" } });
    const { base } = await start(connection, targets);
    const created = await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://old.example", apiKey: "old-key" }, "PUT");
    const id = created.json.endpoint.id as string;
    await send(base, "/api/sessions", { cwd: "/work/edit", endpointId: id });
    const saved = await send(base, "/api/endpoints", { id, name: "Zen", baseUrl: "https://new.example", apiKey: "new-key" }, "PUT");
    assert.equal(saved.status, 200);
    await send(base, "/api/sessions", { cwd: "/work/edit", endpointId: id });
    assert.equal(targets.length, 2, "the old idle host was invalidated");
    assert.equal(targets.at(-1)?.env?.["META_API_KEY"], "new-key");
  });

  it("ignores late notifications from an invalidated endpoint host", async () => {
    const targets: ServeTarget[] = [];
    const connections: FakeConnection[] = [];
    const { base } = await start(
      (target) => {
        const connection = new FakeConnection();
        connection.replies.set("session/start", { session: { sessionId: connections.length === 0 ? "s-old" : "s-new" } });
        connections.push(connection);
        return connection;
      },
      targets,
    );
    const created = await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://old.example" }, "PUT");
    const id = created.json.endpoint.id as string;
    await send(base, "/api/sessions", { cwd: "/work/late", endpointId: id });
    await send(base, "/api/endpoints", { id, name: "Zen", baseUrl: "https://new.example" }, "PUT");
    await send(base, "/api/sessions", { cwd: "/work/late", endpointId: id });
    connections[0]?.handler?.({ method: "turn/started", params: { sessionId: "s-new", turnId: "late" } });
    const edited = await send(base, "/api/endpoints", { id, name: "Zen", baseUrl: "https://newer.example" }, "PUT");
    assert.equal(edited.status, 200, "a retired host cannot make the current session appear busy");
  });

  it("refuses endpoint edits while a turn is running", async () => {
    const targets: ServeTarget[] = [];
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s-busy" } });
    const { base } = await start(connection, targets);
    const created = await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://old.example" }, "PUT");
    const id = created.json.endpoint.id as string;
    await send(base, "/api/sessions", { cwd: "/work/busy", endpointId: id });
    connection.handler?.({ method: "turn/started", params: { sessionId: "s-busy", turnId: "t1" } });
    const edited = await send(base, "/api/endpoints", { id, name: "Zen", baseUrl: "https://new.example" }, "PUT");
    assert.equal(edited.status, 409);
    assert.equal(targets.length, 1, "a running turn keeps its host alive");
  });

  it("refuses endpoint edits while a turn request is still in flight", async () => {
    let requested!: () => void;
    let release!: () => void;
    const requestedPromise = new Promise<void>((resolve) => (requested = resolve));
    const releasePromise = new Promise<void>((resolve) => (release = resolve));
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s-in-flight" } });
    connection.replies.set("turn/start", { turnId: "t-in-flight", status: "running", disposition: "started" });
    connection.beforeReply = async (method) => {
      if (method === "turn/start") {
        requested();
        await releasePromise;
      }
    };
    const targets: ServeTarget[] = [];
    const { base } = await start(connection, targets);
    const created = await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://old.example" }, "PUT");
    const id = created.json.endpoint.id as string;
    await send(base, "/api/sessions", { cwd: "/work/in-flight", endpointId: id });
    const turn = send(base, "/api/turns", { sessionId: "s-in-flight", text: "wait" });
    await requestedPromise;
    assert.equal((await send(base, "/api/endpoints", { id, name: "Zen", baseUrl: "https://new.example" }, "PUT")).status, 409);
    release();
    assert.equal((await turn).status, 200);
  });

  it("does not resurrect an endpoint deleted during model refresh", async () => {
    let requested!: () => void;
    let release!: () => void;
    const requestedPromise = new Promise<void>((resolve) => (requested = resolve));
    const releasePromise = new Promise<void>((resolve) => (release = resolve));
    const gateway = createHttpServer(async (_req, res) => {
      requested();
      await releasePromise;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ data: [{ id: "muse-new" }] }));
    });
    await new Promise<void>((resolve) => gateway.listen(0, "127.0.0.1", resolve));
    const address = gateway.address();
    assert.equal(typeof address, "object");
    const baseUrl = `http://127.0.0.1:${(address as { port: number }).port}`;
    try {
      const { base } = await start(new FakeConnection(), []);
      const created = await send(base, "/api/endpoints", { name: "Local", baseUrl }, "PUT");
      const id = created.json.endpoint.id as string;
      const refreshing = send(base, "/api/endpoints/refresh-models", { id });
      await requestedPromise;
      assert.equal((await send(base, `/api/endpoints?id=${encodeURIComponent(id)}`, undefined, "DELETE")).status, 200);
      release();
      assert.equal((await refreshing).status, 409);
      assert.deepEqual((await get(base, "/api/endpoints")).endpoints, []);
    } finally {
      await new Promise<void>((resolve) => gateway.close(() => resolve()));
    }
  });

  it("requires HTTPS for keyed remote endpoints but permits keyed loopback HTTP", async () => {
    const targets: ServeTarget[] = [];
    const { base } = await start(new FakeConnection(), targets);
    assert.equal((await send(base, "/api/endpoints", { name: "Remote", baseUrl: "http://gateway.example", apiKey: "secret" }, "PUT")).status, 400);
    assert.equal((await send(base, "/api/endpoints", { name: "Local", baseUrl: "http://127.0.0.1:8080", apiKey: "secret" }, "PUT")).status, 200);
    assert.equal((await send(base, "/api/endpoints", { name: "Keyless", baseUrl: "http://gateway.example" }, "PUT")).status, 200);
  });

  it("rejects traversal and the own-login sentinel through the API", async () => {
    const { base } = await start(new FakeConnection(), []);
    assert.equal((await send(base, "/api/endpoints", { id: "../escape", name: "Bad", baseUrl: "https://zen.example" }, "PUT")).status, 400);
    assert.equal((await send(base, "/api/endpoints", { id: "own", name: "Bad", baseUrl: "https://zen.example" }, "PUT")).status, 400);
  });

  it("lists every provider's models and records the provider a thread starts on", async () => {
    const own = new FakeConnection();
    own.replies.set("model/list", { models: [{ modelId: "muse-own" }], profileId: "tbh", providerId: "meta", source: "provider_catalog" });
    const zen = new FakeConnection();
    zen.replies.set("session/start", { session: { sessionId: "s-go" } });
    const targets: ServeTarget[] = [];
    const { base } = await start((target) => (target.env ? zen : own), targets);

    const created = await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://zen.example" }, "PUT");
    const id = created.json.endpoint.id as string;

    const listed = await get(base, "/api/models");
    assert.deepEqual(
      listed.models.map((row: any) => [row.modelId, row.providerId, row.providerName]),
      [
        ["muse-own", null, null],
        ["muse-spark-1.3", id, "Zen"],
        ["muse-spark-1.2", id, "Zen"],
        ["muse-spark-1.3-contributor-free", id, "Zen"],
      ],
    );
    assert.equal(zen.calls.some((c) => c.method === "model/list"), false, "an endpoint's list comes from its stored catalog");
    assert.equal(listed.models[1].isDefault, true, "exactly one default per endpoint");

    const started = await send(base, "/api/sessions", { cwd: "/work/proj", endpointId: id });
    assert.equal(started.json.session.endpointId, id);
    const sessions = await get(base, "/api/sessions");
    assert.equal(sessions.sessions.find((s: any) => s.sessionId === "s-go")?.endpointId, id);
    assert.equal(zen.calls.filter((c) => c.method === "session/start").length, 1, "the start went to the endpoint's host");
    assert.equal(own.calls.some((c) => c.method === "session/start"), false);
    const ownModelListsBeforeScoped = own.calls.filter((call) => call.method === "model/list").length;
    await get(base, `/api/models?sessionId=${encodeURIComponent("s-go")}`);
    const ownList = own.calls.filter((call) => call.method === "model/list").at(ownModelListsBeforeScoped);
    assert.deepEqual(ownList?.params, {}, "a custom session must not be sent to the own-login host");
  });

  it("adopts a thread recorded before providers existed, and remembers the home that has it", async () => {
    const own = new FakeConnection();
    own.replies.set("session/read", new Error("no such session"));
    const zen = new FakeConnection();
    zen.replies.set("session/read", { session: { sessionId: "s-legacy" } });
    const targets: ServeTarget[] = [];
    const { base, dataDir } = await start((target) => (target.env ? zen : own), targets);
    const created = await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://zen.example" }, "PUT");
    const id = created.json.endpoint.id as string;

    // A row from before the provider column existed: no endpoint, and the app has never served it this run.
    const store = new HeliconStore(join(dataDir, "helicon.db"));
    store.recordSession({ id: "s-legacy", projectId: store.upsertProject("/work/proj").id, origin: "tui" });
    store.close();

    await send(base, "/api/sessions/s-legacy/model", { model: { modelId: "muse-go" } });
    assert.equal(own.calls.some((c) => c.method === "session/read"), true, "the own login is asked first");
    assert.equal(zen.calls.some((c) => c.method === "session/setModel"), true, "the thread is served by the home that has it");
    assert.equal(own.calls.some((c) => c.method === "session/setModel"), false);
    const sessions = await get(base, "/api/sessions");
    assert.equal(sessions.sessions.find((s: any) => s.sessionId === "s-legacy")?.endpointId, id, "the adopted provider is recorded");
  });

  it("deleting the active endpoint clears the active setting", async () => {
    const connection = new FakeConnection();
    const targets: ServeTarget[] = [];
    const { base } = await start(connection, targets);
    const created = await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://zen.example" }, "PUT");
    const id = created.json.endpoint.id as string;
    await send(base, "/api/endpoints/activate", { id });
    assert.equal((await get(base, "/api/endpoints")).activeEndpointId, id);

    const removed = await send(base, `/api/endpoints?id=${encodeURIComponent(id)}`, undefined, "DELETE");
    assert.equal(removed.status, 200);
    const listed = await get(base, "/api/endpoints");
    assert.deepEqual(listed.endpoints, []);
    assert.equal(listed.activeEndpointId, null);
  });

  it("refuses deletion while an archived session still references the endpoint", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s-archived" } });
    const targets: ServeTarget[] = [];
    const { base, dataDir } = await start(connection, targets);
    const created = await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://zen.example" }, "PUT");
    const id = created.json.endpoint.id as string;
    await send(base, "/api/sessions", { cwd: "/work/archive", endpointId: id });
    const store = new HeliconStore(join(dataDir, "helicon.db"));
    store.updateSession("s-archived", { archived: true });
    store.close();
    const removed = await send(base, `/api/endpoints?id=${encodeURIComponent(id)}`, undefined, "DELETE");
    assert.equal(removed.status, 409);
    assert.ok((await get(base, "/api/endpoints")).endpoints.some((item: any) => item.id === id));
  });

  it("fails explicitly when a persisted session names a missing endpoint", async () => {
    const targets: ServeTarget[] = [];
    const { base, dataDir } = await start(new FakeConnection(), targets);
    const store = new HeliconStore(join(dataDir, "helicon.db"));
    const project = store.upsertProject("/work/missing-provider");
    store.recordSession({ id: "s-missing-provider", projectId: project.id, endpointId: "gone" });
    store.close();
    const result = await send(base, "/api/sessions/s-missing-provider/model", { model: { modelId: "muse-go" } });
    assert.equal(result.status, 404);
    assert.equal(targets.length, 0, "unknown providers never fall back to own login");
  });

  it("refuses a persisted endpoint id that cannot name a managed home", async () => {
    const targets: ServeTarget[] = [];
    const { base, dataDir } = await start(new FakeConnection(), targets);
    const store = new HeliconStore(join(dataDir, "helicon.db"));
    const endpointId = "../escape";
    store.upsertEndpoint({ id: endpointId, name: "Bad", baseUrl: "https://zen.example", apiKey: null, defaultModel: null, modelsJson: "[]" });
    const project = store.upsertProject("/work/malformed");
    store.recordSession({ id: "s-malformed", projectId: project.id, endpointId });
    store.close();
    const result = await send(base, "/api/sessions/s-malformed/model", { model: { modelId: "muse-go" } });
    assert.equal(result.status, 409);
    assert.equal(targets.length, 0);
  });

  it("refuses unknown endpoints and a bad activate body", async () => {
    const connection = new FakeConnection();
    const targets: ServeTarget[] = [];
    const { base } = await start(connection, targets);
    assert.equal((await send(base, "/api/endpoints/activate", { id: "missing" })).status, 404);
    assert.equal((await send(base, "/api/endpoints/refresh-models", { id: "missing" })).status, 404);
    assert.equal((await send(base, "/api/endpoints/activate", {})).status, 400);
    assert.equal((await send(base, "/api/endpoints?id=", undefined, "DELETE")).status, 400);
  });

  it("refuses a custom endpoint in the WSL runtime", async () => {
    const connection = new FakeConnection();
    const targets: ServeTarget[] = [];
    const { base } = await start(connection, targets, { platform: "win32", musePath: "/home/dev/.local/bin/muse" });
    const created = await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://zen.example" }, "PUT");
    const refused = await send(base, "/api/sessions", { cwd: "D:\\work\\proj", endpointId: created.json.endpoint.id });
    assert.equal(refused.status, 503);
    assert.match(refused.json.error, /WSL runtime/);
    assert.equal(targets.length, 0, "nothing is spawned in WSL for a custom endpoint");
  });

  it("passes keyless endpoint isolation through native Windows spawning", async () => {
    const previous = process.env["META_API_KEY"];
    process.env["META_API_KEY"] = "ambient-secret";
    try {
      const targets: ServeTarget[] = [];
      const { base } = await start(new FakeConnection(), targets, { platform: "win32", musePath: "C:\\Muse\\muse.exe", runtime: "native" });
      const created = await send(base, "/api/endpoints", { name: "Zen", baseUrl: "https://zen.example" }, "PUT");
      await send(base, "/api/sessions", { cwd: "C:\\work\\proj", endpointId: created.json.endpoint.id });
      assert.equal(targets.at(-1)?.env?.["META_API_KEY"], undefined);
      assert.equal(targets.at(-1)?.env?.["XDG_CONFIG_HOME"]?.includes("config"), true);
    } finally {
      if (previous === undefined) delete process.env["META_API_KEY"];
      else process.env["META_API_KEY"] = previous;
    }
  });
});
