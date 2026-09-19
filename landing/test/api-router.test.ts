import { describe, expect, it } from "vitest";
import { handleApi, type RouterDeps, type RouterRelease } from "@/lib/api/router";
import { ERROR_CODES } from "@/lib/api/contract";
import { openApiDocument } from "@/lib/api/openapi";

/**
 * The public API, exercised without a server. The router is a function of its input, so every
 * case here is the same code the route handler runs, including the error envelope that an agent
 * has to be able to rely on.
 */

const RELEASE: RouterRelease = {
  version: "0.14.2",
  tag: "v0.14.2",
  notesUrl: "https://github.com/HarjjotSinghh/helicon/releases/tag/v0.14.2",
  assets: [
    { name: "Helicon_0.14.2_x64-setup.exe", size: 11, browser_download_url: "https://example.test/setup.exe" },
    { name: "Helicon_0.14.2_x64-setup.exe.sig", size: 1, browser_download_url: "https://example.test/setup.exe.sig" },
    { name: "Helicon_0.14.2_universal.dmg", size: 22, browser_download_url: "https://example.test/app.dmg" },
    { name: "Helicon_0.14.2_amd64.AppImage", size: 33, browser_download_url: "https://example.test/app.AppImage" },
  ],
};

const deps: RouterDeps = {
  latestRelease: async () => RELEASE,
  recentReleases: async (limit = 20) =>
    Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
      version: `0.14.${i}`,
      tag: `v0.14.${i}`,
      name: `v0.14.${i}`,
      publishedAt: "2026-09-01T00:00:00Z",
      notesUrl: "https://example.test/notes",
      prerelease: false,
    })),
};

const offline: RouterDeps = { latestRelease: async () => null, recentReleases: async () => [] };

function call(path: string, init: { method?: string; query?: string } = {}) {
  const segments = path.split("/").filter(Boolean);
  return handleApi(
    {
      method: init.method ?? "GET",
      segments,
      searchParams: new URLSearchParams(init.query ?? ""),
    },
    deps,
  );
}

type Json = Record<string, any>;

describe("the API index", () => {
  it("lists every endpoint the OpenAPI document describes", async () => {
    const result = await call("");
    expect(result.status).toBe(200);
    const body = result.body as Json;
    const declared = new Set(body.endpoints.map((e: Json) => e.operation_id));
    const documented = Object.values(openApiDocument().paths as Json).map((item: any) => item.get.operationId);
    expect([...declared].sort()).toEqual(documented.sort());
  });

  it("says out loud that there is nothing to authenticate with", async () => {
    const body = (await call("")).body as Json;
    expect(body.authentication).toMatch(/none/i);
    expect(body.openapi_url).toBe("https://helicon.sh/openapi.json");
  });
});

describe("status, facts and releases", () => {
  it("reports the version currently shipping", async () => {
    const result = await call("status");
    expect(result.status).toBe(200);
    expect((result.body as Json).latest_version).toBe("0.14.2");
  });

  it("serves the same facts document as /facts.json", async () => {
    const body = (await call("facts")).body as Json;
    expect(body.license).toBe("MIT");
    expect(body.official).toBe(false);
    expect(body.contact.email).toBe("me@harjotrana.com");
    expect(body.machine_readable.openapi).toBe("https://helicon.sh/openapi.json");
  });

  it("matches one installer per platform and never a signature file", async () => {
    const body = (await call("release")).body as Json;
    const byPlatform = Object.fromEntries(body.downloads.map((d: Json) => [d.platform, d]));
    expect(byPlatform.windows.asset.url).toBe("https://example.test/setup.exe");
    expect(byPlatform.macos.asset.url).toBe("https://example.test/app.dmg");
    expect(byPlatform.linux.asset.url).toBe("https://example.test/app.AppImage");
  });

  it("returns a 503 with a hint rather than a stale guess when GitHub is down", async () => {
    const result = await handleApi({ method: "GET", segments: ["release"], searchParams: new URLSearchParams() }, offline);
    expect(result.status).toBe(503);
    const body = result.body as Json;
    expect(body.error.code).toBe("upstream_unavailable");
    expect(body.error.hint.length).toBeGreaterThan(20);
  });

  it("rejects a limit outside the documented range", async () => {
    const result = await call("releases", { query: "limit=500" });
    expect(result.status).toBe(400);
    expect((result.body as Json).error.code).toBe("invalid_parameter");
  });
});

describe("downloads", () => {
  it("answers for one platform", async () => {
    const result = await call("downloads/macos");
    expect(result.status).toBe(200);
    expect((result.body as Json).platform).toBe("macos");
  });

  it("names the valid platforms when given a bad one", async () => {
    const result = await call("downloads/haiku");
    expect(result.status).toBe(400);
    const body = result.body as Json;
    expect(body.error.code).toBe("invalid_parameter");
    expect(body.error.hint).toContain("windows");
  });
});

describe("documentation", () => {
  it("pages through the catalog", async () => {
    const first = (await call("pages", { query: "limit=5" })).body as Json;
    expect(first.pages).toHaveLength(5);
    expect(first.total).toBeGreaterThan(5);
    const second = (await call("pages", { query: "limit=5&offset=5" })).body as Json;
    expect(second.pages[0].slug).not.toBe(first.pages[0].slug);
  });

  it("filters by section and rejects an unknown one", async () => {
    const ok = (await call("pages", { query: "section=glossary" })).body as Json;
    expect(ok.total).toBeGreaterThan(0);
    expect(ok.pages.every((p: Json) => p.section === "glossary")).toBe(true);

    const bad = await call("pages", { query: "section=nope" });
    expect(bad.status).toBe(400);
  });

  it("returns one page, and its Markdown only when asked", async () => {
    const plain = (await call("pages/about")).body as Json;
    expect(plain.slug).toBe("about");
    expect(plain.markdown).toBeUndefined();

    const withBody = (await call("pages/about", { query: "include=markdown" })).body as Json;
    expect(withBody.markdown).toContain("# About Helicon");
  });

  it("resolves a nested slug", async () => {
    const result = await call("pages/install/windows");
    expect(result.status).toBe(200);
    expect((result.body as Json).slug).toBe("install/windows");
  });

  it("returns a section and its pages when the slug is a hub", async () => {
    const body = (await call("pages/guides")).body as Json;
    expect(body.id).toBe("guides");
    expect(body.pages.length).toBeGreaterThan(0);
  });

  it("points at search when a slug does not exist", async () => {
    const result = await call("pages/not-a-real-page");
    expect(result.status).toBe(404);
    const body = result.body as Json;
    expect(body.error.code).toBe("not_found");
    expect(body.error.hint).toContain("/search?q=");
  });

  it("searches, and requires a usable query", async () => {
    const hits = (await call("search", { query: "q=windows&limit=3" })).body as Json;
    expect(hits.results.length).toBeGreaterThan(0);
    expect(hits.results.length).toBeLessThanOrEqual(3);

    const short = await call("search", { query: "q=a" });
    expect(short.status).toBe(400);
  });

  it("lists sections and the FAQ", async () => {
    const sections = (await call("sections")).body as Json;
    expect(sections.total).toBeGreaterThan(0);

    const faq = (await call("faq")).body as Json;
    expect(faq.total).toBeGreaterThan(0);
    expect(faq.groups[0].faqs[0].question).toBeTruthy();
  });
});

describe("failures", () => {
  it("uses one envelope for every error, with a code the spec enumerates", async () => {
    const cases = [
      await call("nope"),
      await call("pages/nope"),
      await call("search"),
      await call("", { method: "POST" }),
    ];
    for (const result of cases) {
      const body = result.body as Json;
      expect(Object.keys(body)).toEqual(["error"]);
      expect(ERROR_CODES).toContain(body.error.code);
      expect(body.error.status).toBe(result.status);
      expect(body.error.message.length).toBeGreaterThan(10);
      expect(body.error.hint.length).toBeGreaterThan(10);
      expect(body.error.documentation_url).toBe("https://helicon.sh/developers");
    }
  });

  it("refuses to write", async () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const result = await call("status", { method });
      expect(result.status).toBe(405);
      expect((result.body as Json).error.code).toBe("method_not_allowed");
    }
  });

  it("names the offending path in a 404", async () => {
    const body = (await call("does/not/exist")).body as Json;
    expect(body.error.message).toContain("/api/v1/does/not/exist");
  });
});
