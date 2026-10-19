import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { stubGlobal, tick } from "./stubs.js";

type Capture = (event: string, properties?: Record<string, unknown>) => void;

// Compiled to dist-test/test, so the compiled module sits next to the other demo modules.
const compiled = fileURLToPath(new URL("../src/demo/tryAnalytics.js", import.meta.url));

let loads = 0;
/**
 * Loads a fresh copy of the module with the given Vite env. Vite replaces `import.meta.env` at build
 * time; Node has no such replacement, so the test writes the same literal into the compiled source.
 * Each load gets a unique data: URL so no module instance is shared between tests.
 */
async function load(env: Record<string, string>): Promise<{ captureTry: Capture }> {
  const source = readFileSync(compiled, "utf8").replaceAll("import.meta.env", `(${JSON.stringify(env)})`);
  const code = `${source}\n// load ${(loads += 1)}\n`;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

/**
 * A stand-in for `document`. Its cookie property reads and writes `jar` the way the browser does for
 * this module's needs: `name=value` pairs, with Max-Age=0 deleting one.
 */
function fakeDocument(referrer: string, initial: Record<string, string> = {}) {
  const jar = new Map(Object.entries(initial));
  const document = {
    referrer,
    get cookie() {
      return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set cookie(value: string) {
      const [pair, ...attributes] = value.split(";").map((part) => part.trim());
      const eq = pair!.indexOf("=");
      const name = pair!.slice(0, eq);
      if (attributes.includes("Max-Age=0")) jar.delete(name);
      else jar.set(name, pair!.slice(eq + 1));
    },
  };
  return { document, jar };
}

interface Beacon {
  url: string;
  body: string;
}

function page(url: string, options: { referrer?: string; cookies?: Record<string, string>; sendBeacon?: boolean } = {}) {
  const parsed = new URL(url);
  const { document, jar } = fakeDocument(options.referrer ?? "", options.cookies);
  const beacons: Beacon[] = [];
  const fetches: { url: string; init: RequestInit }[] = [];
  const navigatorStub: Record<string, unknown> = {};
  if (options.sendBeacon !== false) {
    navigatorStub.sendBeacon = (beaconUrl: string, body: string) => {
      beacons.push({ url: beaconUrl, body });
      return true;
    };
  }
  return {
    document,
    jar,
    beacons,
    fetches,
    navigatorStub,
    window: {
      location: { href: parsed.href, host: parsed.host, hostname: parsed.hostname, pathname: parsed.pathname, search: parsed.search },
      screen: { width: 1440 },
    },
  };
}

describe("try page analytics", () => {
  const restores: (() => void)[] = [];
  const stub = (name: string, value: unknown) => restores.push(stubGlobal(name, value));
  afterEach(() => {
    while (restores.length) restores.pop()?.();
  });

  function install(env: Record<string, string>, options: Parameters<typeof page>[1] & { url: string }) {
    const scene = page(options.url, options);
    stub("window", scene.window);
    stub("document", scene.document);
    stub("navigator", scene.navigatorStub);
    stub("fetch", (url: string, init: RequestInit) => {
      scene.fetches.push({ url, init });
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    return { scene, loaded: load(env) };
  }

  it("sends nothing without a PostHog key", async () => {
    const { scene, loaded } = install({}, { url: "https://helicon.sh/try" });
    (await loaded).captureTry("try_prompt_sent");
    assert.equal(scene.beacons.length, 0);
    assert.equal(scene.fetches.length, 0);
  });

  it("stays silent on local hosts", async () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]", "app.localhost"]) {
      const { scene, loaded } = install({ VITE_POSTHOG_KEY: "phc_test" }, { url: `http://${host}/try` });
      (await loaded).captureTry("try_prompt_sent");
      assert.equal(scene.beacons.length, 0, host);
      restores.splice(0).forEach((restore) => restore());
    }
  });

  it("marks the maintainer's browser with ?internal=1 and silences it", async () => {
    const { scene, loaded } = install({ VITE_POSTHOG_KEY: "phc_test" }, { url: "https://helicon.sh/try?internal=1" });
    (await loaded).captureTry("try_prompt_sent");
    assert.equal(scene.jar.get("helicon-internal"), "1");
    assert.equal(scene.beacons.length, 0);
  });

  it("silences a browser that already carries the internal flag", async () => {
    const { scene, loaded } = install(
      { VITE_POSTHOG_KEY: "phc_test" },
      { url: "https://helicon.sh/try", cookies: { "helicon-internal": "1" } },
    );
    (await loaded).captureTry("try_prompt_sent");
    assert.equal(scene.beacons.length, 0);
  });

  it("clears the internal flag with ?internal=0 so events flow again", async () => {
    const { scene, loaded } = install(
      { VITE_POSTHOG_KEY: "phc_test" },
      { url: "https://helicon.sh/try?internal=0", cookies: { "helicon-internal": "1" } },
    );
    (await loaded).captureTry("try_prompt_sent");
    assert.equal(scene.jar.has("helicon-internal"), false);
    assert.equal(scene.beacons.length, 1);
  });

  it("posts PostHog's capture body with the page, the UTM values and the event's own properties", async () => {
    const { scene, loaded } = install(
      { VITE_POSTHOG_KEY: "phc_test" },
      {
        url: "https://helicon.sh/try?utm_source=hn&utm_medium=&utm_campaign=launch&ref=x",
        referrer: "https://news.ycombinator.com/",
        cookies: { ph_phc_test_posthog: encodeURIComponent(JSON.stringify({ distinct_id: "user-1" })) },
      },
    );
    (await loaded).captureTry("try_prompt_sent", { prompt_length: 12 });
    assert.equal(scene.beacons.length, 1);
    const beacon = scene.beacons[0]!;
    assert.equal(beacon.url, "/relay-hx/i/v0/e/");
    const body = JSON.parse(beacon.body);
    assert.equal(body.api_key, "phc_test");
    assert.equal(body.event, "try_prompt_sent");
    assert.equal(body.distinct_id, "user-1");
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.deepEqual(body.properties, {
      $current_url: "https://helicon.sh/try?utm_source=hn&utm_medium=&utm_campaign=launch&ref=x",
      $host: "helicon.sh",
      $pathname: "/try",
      $referrer: "https://news.ycombinator.com/",
      $screen_width: 1440,
      $lib: "helicon-try",
      site: "helicon_try",
      utm_source: "hn",
      utm_campaign: "launch",
      prompt_length: 12,
    });
  });

  it("marks a visit with no referrer as direct", async () => {
    const { scene, loaded } = install({ VITE_POSTHOG_KEY: "phc_test" }, { url: "https://helicon.sh/try" });
    (await loaded).captureTry("try_prompt_sent");
    assert.equal(JSON.parse(scene.beacons[0]!.body).properties.$referrer, "$direct");
  });

  it("posts to the host given at build time instead of the default relay", async () => {
    const { scene, loaded } = install(
      { VITE_POSTHOG_KEY: "phc_test", VITE_POSTHOG_HOST: "https://eu.example.test" },
      { url: "https://helicon.sh/try" },
    );
    (await loaded).captureTry("try_prompt_sent");
    assert.equal(scene.beacons[0]?.url, "https://eu.example.test/i/v0/e/");
  });

  it("keeps the landing site's visitor id, from its anonymous cookie when there is no PostHog cookie", async () => {
    const { scene, loaded } = install(
      { VITE_POSTHOG_KEY: "phc_test" },
      { url: "https://helicon.sh/try", cookies: { "helicon-anon": "anon-42" } },
    );
    (await loaded).captureTry("try_prompt_sent");
    assert.equal(JSON.parse(scene.beacons[0]!.body).distinct_id, "anon-42");
    assert.equal(scene.jar.get("helicon-anon"), "anon-42");
  });

  it("falls back past an unreadable or empty PostHog cookie", async () => {
    const cases = [
      { ph_phc_test_posthog: "not-json" },
      { ph_phc_test_posthog: encodeURIComponent(JSON.stringify({ distinct_id: "" })) },
      { ph_phc_test_posthog: encodeURIComponent(JSON.stringify({ distinct_id: 42 })) },
    ];
    for (const cookies of cases) {
      const { scene, loaded } = install(
        { VITE_POSTHOG_KEY: "phc_test" },
        { url: "https://helicon.sh/try", cookies: { ...cookies, "helicon-anon": "anon-7" } },
      );
      (await loaded).captureTry("try_prompt_sent");
      assert.equal(JSON.parse(scene.beacons[0]!.body).distinct_id, "anon-7");
      restores.splice(0).forEach((restore) => restore());
    }
  });

  it("mints an anonymous id when the visitor has neither cookie, and keeps it for a year", async () => {
    const { scene, loaded } = install({ VITE_POSTHOG_KEY: "phc_test" }, { url: "https://helicon.sh/try" });
    (await loaded).captureTry("try_prompt_sent");
    const minted = JSON.parse(scene.beacons[0]!.body).distinct_id as string;
    assert.match(minted, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(scene.jar.get("helicon-anon"), minted);
  });

  it("uses fetch with keepalive when sendBeacon refuses the payload", async () => {
    const { scene, loaded } = install({ VITE_POSTHOG_KEY: "phc_test" }, { url: "https://helicon.sh/try" });
    stub("navigator", {
      sendBeacon: () => false,
    });
    (await loaded).captureTry("try_prompt_sent");
    assert.equal(scene.beacons.length, 0);
    assert.equal(scene.fetches.length, 1);
    assert.equal(scene.fetches[0]?.url, "/relay-hx/i/v0/e/");
    assert.equal(scene.fetches[0]?.init.method, "POST");
    assert.equal(scene.fetches[0]?.init.keepalive, true);
    assert.equal(JSON.parse(String(scene.fetches[0]?.init.body)).event, "try_prompt_sent");
  });

  it("uses fetch when the browser has no sendBeacon", async () => {
    const { scene, loaded } = install({ VITE_POSTHOG_KEY: "phc_test" }, { url: "https://helicon.sh/try", sendBeacon: false });
    (await loaded).captureTry("try_prompt_sent");
    assert.equal(scene.fetches.length, 1);
  });

  it("swallows a failed send, so a blocked relay never reaches the page", async () => {
    const { loaded } = install({ VITE_POSTHOG_KEY: "phc_test" }, { url: "https://helicon.sh/try", sendBeacon: false });
    let attempts = 0;
    stub("fetch", () => {
      attempts += 1;
      return Promise.reject(new Error("blocked"));
    });
    (await loaded).captureTry("try_prompt_sent");
    await tick();
    assert.equal(attempts, 1);
  });
});
