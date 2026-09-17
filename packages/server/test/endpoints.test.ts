import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HeliconServer } from "../src/server.js";
import { bundledModelRows, fetchEndpointModels, writeEndpointHome, type CatalogRow, type EndpointRecord } from "../src/endpoints.js";
import type { ServeTarget } from "@helicon/daemon";

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
      endpoint_transport: { base_url: "https://zen.example/muse" },
    });

    const cache = readCache(home.dataHome);
    assert.equal(cache.rows.length, 2);
    assert.equal(cache.rows.filter((row) => row.is_default).length, 1, "exactly one default");
    assert.equal(cache.rows[0]?.is_default, true, "without a chosen model the first row is the default");
    // Muse treats a freshly written cache as current instead of refetching from the gateway.
    assert.ok(Date.now() - statSync(settingsPath).mtimeMs < 60_000);
    assert.ok(Date.now() - statSync(cachePath(home.dataHome)).mtimeMs < 60_000);
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
  handler: ((n: { method: string; params?: unknown }) => void) | null = null;

  async command(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
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

function fakeFactory(connection: FakeConnection, targets: ServeTarget[]) {
  return (target: ServeTarget) => {
    targets.push(target);
    return {
      start: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { initializeResult: { serverInfo: { name: "muse", version: "1.1.1" } } };
      },
      connection: connection as never,
      close: async () => ({ code: 0, signal: null }),
    };
  };
}

async function start(
  connection: FakeConnection,
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
  return { base: `http://127.0.0.1:${bound.port}`, endpointsDir };
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
  it("round-trips an endpoint, and spawns hosts inside its isolated Muse home", async () => {
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

    await send(base, "/api/sessions", { cwd: "/work/proj" });
    assert.equal(targets[0]?.env, undefined, "no endpoint active means no custom env");

    const activated = await send(base, "/api/endpoints/activate", { id });
    assert.equal(activated.status, 200);
    listed = await get(base, "/api/endpoints");
    assert.equal(listed.activeEndpointId, id);

    await send(base, "/api/sessions", { cwd: "/work/other" });
    const env = targets[1]?.env;
    assert.ok(env, "the respawn carries the endpoint's env");
    assert.equal(env["XDG_CONFIG_HOME"], join(endpointsDir, id, "config"));
    assert.equal(env["XDG_DATA_HOME"], join(endpointsDir, id, "data"));
    assert.equal(env["META_API_KEY"], "secret-key");
    assert.deepEqual(JSON.parse(readFileSync(join(endpointsDir, id, "config", "muse", "settings.json"), "utf8")), {
      schema_version: 1,
      endpoint_transport: { base_url: "https://zen.example/muse" },
    });

    // An absent apiKey keeps the stored one; an empty string is how the UI clears it.
    const kept = await send(base, "/api/endpoints", { id, name: "Zen", baseUrl: "https://zen.example/muse" }, "PUT");
    assert.equal(kept.json.endpoint.hasApiKey, true);
    const cleared = await send(base, "/api/endpoints", { id, name: "Zen", baseUrl: "https://zen.example/muse", apiKey: "" }, "PUT");
    assert.equal(cleared.json.endpoint.hasApiKey, false);

    await send(base, "/api/endpoints/activate", { id: null });
    await send(base, "/api/sessions", { cwd: "/work/third" });
    assert.equal(targets[2]?.env, undefined, "deactivating goes back to spawning exactly as before");
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
    await send(base, "/api/endpoints/activate", { id: created.json.endpoint.id });
    const refused = await send(base, "/api/sessions", { cwd: "D:\\work\\proj" });
    assert.equal(refused.status, 503);
    assert.match(refused.json.error, /WSL runtime/);
    assert.equal(targets.length, 0, "nothing is spawned in WSL with an endpoint active");
  });
});
