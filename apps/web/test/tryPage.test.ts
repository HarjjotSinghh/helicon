import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TRY_GUIDE, TRY_HEAD, TRY_UPDATED, tryHtml } from "../src/demo/tryPage.js";

// Compiled to dist-test/test, so the repo root is four levels up.
const committed = readFileSync(
  fileURLToPath(new URL("../../../../landing/public/try/index.html", import.meta.url)),
  "utf8",
).replace(/\r\n/g, "\n");

describe("the /try page", () => {
  it("transforms Vite's index.html into the head and guide", () => {
    const out = tryHtml('<title>Helicon</title>\n<div id="root"></div>');
    assert.ok(out.includes(TRY_HEAD));
    assert.ok(out.includes(`<div id="root">${TRY_GUIDE}</div>`));
  });

  it("matches the committed build, so a copy edit cannot ship without a rebuild", () => {
    assert.ok(committed.includes(TRY_HEAD), "landing/public/try/index.html head is stale; run npm run build:try");
    assert.ok(committed.includes(`<div id="root">${TRY_GUIDE}</div>`), "landing/public/try/index.html guide is stale");
  });

  it("carries one date in the guide, the meta tag and the JSON-LD", () => {
    assert.match(TRY_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(TRY_GUIDE.includes(`<time datetime="${TRY_UPDATED}">`));
    assert.ok(TRY_HEAD.includes(`<meta property="article:modified_time" content="${TRY_UPDATED}" />`));
    const ld = JSON.parse(TRY_HEAD.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1]);
    const page = ld["@graph"].find((node: { "@type": string }) => node["@type"] === "WebPage");
    assert.equal(page.dateModified, TRY_UPDATED);
  });

  it("opens with the answer and covers steps, a worked example and limits", () => {
    assert.match(TRY_GUIDE, /<p data-answer>The Helicon demo /);
    assert.match(TRY_GUIDE, /<ol>/);
    assert.match(TRY_GUIDE, /Worked example/);
    assert.match(TRY_GUIDE, /Limits of the demo/);
  });
});
