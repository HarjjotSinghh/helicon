import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OpenCodeGoMark } from "../src/components/ui/primitives.js";
import { isOpenCodeGoEndpoint } from "../src/model/providers.js";

describe("isOpenCodeGoEndpoint", () => {
  it("matches the OpenCode host, its subdomains, case and ports alike", () => {
    assert.equal(isOpenCodeGoEndpoint("https://opencode.ai/zen/v1"), true);
    assert.equal(isOpenCodeGoEndpoint("https://opencode.ai"), true);
    assert.equal(isOpenCodeGoEndpoint("http://OPENCODE.AI:443/zen"), true);
    assert.equal(isOpenCodeGoEndpoint("https://zen.opencode.ai/v1"), true);
  });

  it("fails closed on lookalike hosts, unparseable URLs and missing values", () => {
    assert.equal(isOpenCodeGoEndpoint("https://opencode.ai.evil.example/v1"), false);
    assert.equal(isOpenCodeGoEndpoint("https://notopencode.ai/v1"), false);
    assert.equal(isOpenCodeGoEndpoint("https://example.com/opencode.ai"), false);
    assert.equal(isOpenCodeGoEndpoint("opencode.ai/zen/v1"), false);
    assert.equal(isOpenCodeGoEndpoint(""), false);
    assert.equal(isOpenCodeGoEndpoint(null), false);
    assert.equal(isOpenCodeGoEndpoint(undefined), false);
  });
});

describe("OpenCodeGoMark", () => {
  it("draws the OpenCode Go path and stays decorative", () => {
    const markup = renderToStaticMarkup(createElement(OpenCodeGoMark));
    assert.match(markup, /M19\.4004 21H5V3H19\.4004/, "OpenCode Go path missing");
    assert.match(markup, /aria-hidden="true"/);
  });

  it("names the provider for hover when given a title", () => {
    const markup = renderToStaticMarkup(createElement(OpenCodeGoMark, { title: "OpenCode Go" }));
    assert.match(markup, /<title>OpenCode Go<\/title>/);
  });
});
