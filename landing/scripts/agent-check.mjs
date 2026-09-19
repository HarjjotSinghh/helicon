// Checks the surfaces agents use, against a running server. Everything here is a live HTTP request
// rather than a unit test, because the things that break are headers, redirects and content
// negotiation, and none of those exist until the server is running.
//
//   npm run build && npx next start -p 3111
//   node scripts/agent-check.mjs                        # defaults to http://127.0.0.1:3111
//   BASE=https://helicon.sh node scripts/agent-check.mjs
//
// Exits non-zero when anything is wrong, so it can gate a deploy.

const base = (process.env.BASE ?? "http://127.0.0.1:3111").replace(/\/$/, "");
const problems = [];
const note = (what, message) => problems.push(`${what}: ${message}`);
let checks = 0;

const MARKDOWN = "text/markdown";
const BROWSER = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

async function get(path, { accept, method = "GET", redirect = "follow" } = {}) {
  const res = await fetch(base + path, {
    method,
    redirect,
    headers: accept ? { Accept: accept } : undefined,
  });
  const body = await res.text();
  return { res, body, type: res.headers.get("content-type") ?? "" };
}

function check(what, condition, message) {
  checks++;
  if (!condition) note(what, message);
}

// 1. Markdown content negotiation on the scanned home page, both directions.
{
  const md = await get("/", { accept: MARKDOWN });
  check("GET / (Accept: text/markdown)", md.res.status === 200, `status ${md.res.status}`);
  check("GET / (Accept: text/markdown)", md.type.includes("text/markdown"), `content-type ${md.type}`);
  check(
    "GET / (Accept: text/markdown)",
    (md.res.headers.get("vary") ?? "").toLowerCase().includes("accept"),
    `vary ${md.res.headers.get("vary")}`,
  );
  check("GET / (Accept: text/markdown)", md.body.trim().length > 500, `body ${md.body.length} bytes`);
  check("GET / (Accept: text/markdown)", md.body.includes("# Helicon"), "body has no h1");

  const html = await get("/", { accept: BROWSER });
  check("GET / (Accept: text/html)", html.res.status === 200, `status ${html.res.status}`);
  check("GET / (Accept: text/html)", html.type.includes("text/html"), `content-type ${html.type}`);
  check("GET / (Accept: text/html)", html.body.includes("<html"), "body is not HTML");

  const suffix = await get("/index.md");
  check("GET /index.md", suffix.res.status === 200 && suffix.type.includes("text/markdown"), `status ${suffix.res.status}, type ${suffix.type}`);
}

// 2. Agent-friendly 404: the right status, and a Markdown body when Markdown was asked for.
{
  const probe = "/__ora-404-probe-955hms9d";
  const md = await get(probe, { accept: MARKDOWN });
  check(`GET ${probe} (Accept: text/markdown)`, md.res.status === 404, `status ${md.res.status}`);
  check(`GET ${probe} (Accept: text/markdown)`, md.type.includes("text/markdown"), `content-type ${md.type}`);
  check(`GET ${probe} (Accept: text/markdown)`, md.body.trim().length > 20, `body ${md.body.length} bytes`);
  check(
    `GET ${probe} (Accept: text/markdown)`,
    /https?:\/\/[^\s)]*\/(llms\.txt|sitemap\.xml|developers)/.test(md.body),
    "body links neither docs, sitemap nor llms.txt",
  );

  const html = await get(probe, { accept: BROWSER });
  check(`GET ${probe} (Accept: text/html)`, html.res.status === 404, `status ${html.res.status}`);
  check(`GET ${probe} (Accept: text/html)`, html.type.includes("text/html"), `content-type ${html.type}`);
}

// 3. The OpenAPI document, in both formats.
{
  const json = await get("/openapi.json");
  check("GET /openapi.json", json.res.status === 200, `status ${json.res.status}`);
  check("GET /openapi.json", json.type.includes("application/json"), `content-type ${json.type}`);
  check("GET /openapi.json", json.res.headers.get("access-control-allow-origin") === "*", "no CORS header");
  let doc = null;
  try {
    doc = JSON.parse(json.body);
  } catch (error) {
    note("GET /openapi.json", `unparseable: ${error.message}`);
  }
  if (doc) {
    check("/openapi.json", doc.openapi?.startsWith("3.1"), `openapi ${doc.openapi}`);
    const ops = Object.values(doc.paths ?? {}).flatMap((item) => Object.values(item));
    check("/openapi.json", ops.length >= 12, `${ops.length} operations`);
    const ids = ops.map((op) => op.operationId);
    check("/openapi.json", new Set(ids).size === ids.length, "duplicate operationId");
    check("/openapi.json", ops.every((op) => op.summary && op.description), "an operation has no summary or description");
    check("/openapi.json", doc.servers?.[0]?.url === base || Boolean(doc.servers?.[0]?.url), "no server URL");
  }

  const yaml = await get("/api/openapi.yaml");
  check("GET /api/openapi.yaml", yaml.res.status === 200, `status ${yaml.res.status}`);
  check("GET /api/openapi.yaml", yaml.type.includes("yaml"), `content-type ${yaml.type}`);
  check("GET /api/openapi.yaml", yaml.body.includes('"openapi": "3.1.0"'), "not the OpenAPI document");
}

// 4. Every endpoint the API index claims to have.
{
  const index = await get("/api/v1");
  check("GET /api/v1", index.res.status === 200, `status ${index.res.status}`);
  check("GET /api/v1", index.res.headers.get("access-control-allow-origin") === "*", "no CORS header");

  const paths = [
    "/api/v1",
    "/api/v1/status",
    "/api/v1/facts",
    "/api/v1/release",
    "/api/v1/releases?limit=3",
    "/api/v1/downloads",
    "/api/v1/downloads/macos",
    "/api/v1/sections",
    "/api/v1/pages?limit=3",
    "/api/v1/pages/about",
    "/api/v1/pages/install/windows",
    "/api/v1/search?q=windows",
    "/api/v1/faq",
  ];
  for (const path of paths) {
    const { res, body, type } = await get(path);
    // /api/v1/release answers 503 when GitHub is unreachable, which is correct, not a failure.
    const acceptable = res.status === 200 || (path.startsWith("/api/v1/release") && res.status === 503);
    check(`GET ${path}`, acceptable, `status ${res.status}`);
    check(`GET ${path}`, type.includes("application/json"), `content-type ${type}`);
    try {
      JSON.parse(body);
    } catch (error) {
      note(`GET ${path}`, `unparseable JSON: ${error.message}`);
    }
  }
}

// 5. Structured JSON errors, for a bad path, a bad parameter and a write.
{
  const cases = [
    { path: "/api/v1/nope", init: {}, status: 404, code: "not_found" },
    { path: "/api/v1/pages/nope", init: {}, status: 404, code: "not_found" },
    { path: "/api/v1/search", init: {}, status: 400, code: "invalid_parameter" },
    { path: "/api/v1/status", init: { method: "POST" }, status: 405, code: "method_not_allowed" },
  ];
  for (const { path, init, status, code } of cases) {
    const { res, body, type } = await get(path, init);
    const label = `${init.method ?? "GET"} ${path}`;
    check(label, res.status === status, `status ${res.status}, wanted ${status}`);
    check(label, type.includes("application/json"), `content-type ${type}`);
    let parsed = null;
    try {
      parsed = JSON.parse(body);
    } catch (error) {
      note(label, `unparseable JSON: ${error.message}`);
      continue;
    }
    check(label, parsed.error?.code === code, `code ${parsed.error?.code}, wanted ${code}`);
    check(label, typeof parsed.error?.message === "string" && parsed.error.message.length > 10, "no message");
    check(label, typeof parsed.error?.hint === "string" && parsed.error.hint.length > 10, "no hint");
    check(label, typeof parsed.error?.documentation_url === "string", "no documentation_url");
  }
}

// 6. The rest of the machine-readable surfaces, and the trust anchor pages.
{
  const documents = [
    ["/llms.txt", "text/plain"],
    ["/llms-full.txt", "text/plain"],
    ["/agents.md", "text/markdown"],
    ["/facts.json", "application/json"],
    ["/sitemap.xml", "xml"],
    ["/robots.txt", "text/plain"],
  ];
  for (const [path, expected] of documents) {
    const { res, type, body } = await get(path);
    check(`GET ${path}`, res.status === 200, `status ${res.status}`);
    check(`GET ${path}`, type.includes(expected), `content-type ${type}`);
    check(`GET ${path}`, body.trim().length > 0, "empty body");
  }

  for (const path of ["/about", "/contact", "/developers"]) {
    const page = await get(path, { accept: BROWSER });
    check(`GET ${path}`, page.res.status === 200, `status ${page.res.status}`);
    check(`GET ${path}`, page.body.length > 2000, `body ${page.body.length} bytes`);
    check(`GET ${path}`, /"@type":"ContactPoint"/.test(page.body), "Organization schema has no contactPoint");
    check(`GET ${path}`, /"@type":"PostalAddress"/.test(page.body), "Organization schema has no address");

    const mirror = await get(`${path}.md`);
    check(`GET ${path}.md`, mirror.res.status === 200, `status ${mirror.res.status}`);
    check(`GET ${path}.md`, mirror.type.includes("text/markdown"), `content-type ${mirror.type}`);
  }

  // The home page has to link the developer documentation, or an agent never finds the API.
  const home = await get("/", { accept: BROWSER });
  check("GET /", home.body.includes('href="/developers"'), "home page does not link /developers");
}

// 7. The paths people guess, and where they land.
{
  const redirects = [
    ["/docs", "/guides"],
    ["/api-docs", "/developers"],
    ["/developer", "/developers"],
    ["/openapi", "/openapi.json"],
    ["/swagger.json", "/openapi.json"],
  ];
  for (const [from, to] of redirects) {
    const res = await fetch(base + from, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    check(`GET ${from}`, res.status === 308 || res.status === 301, `status ${res.status}`);
    check(`GET ${from}`, location.endsWith(to), `location ${location}`);
  }
}

console.log(`ran ${checks} checks against ${base}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("no problems");
