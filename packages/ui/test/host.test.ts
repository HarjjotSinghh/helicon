import { test } from "node:test";
import assert from "node:assert/strict";
import { hostStylesheet, isTranslucent } from "../src/app/host.js";

test("hostStylesheet maps editor colors onto Helicon's tokens", () => {
  const css = hostStylesheet({
    surface: "#181818",
    foreground: "#cccccc",
    "descriptionForeground": "#9d9d9d",
    "list-hoverBackground": "#2a2d2e",
    "button-background": "#0078d4",
    "font-family": "-apple-system, sans-serif",
    "font-size": "13px",
  });
  assert.match(css, /--bg: #181818 !important;/);
  assert.match(css, /--fg: #cccccc !important;/);
  assert.match(css, /--fg-muted: #9d9d9d !important;/);
  assert.match(css, /--bg-hover: #2a2d2e !important;/);
  assert.match(css, /--accent: #0078d4 !important;/);
  assert.match(css, /--font-sans: -apple-system, sans-serif !important;/);
  // text-sm is 0.875rem, so a 13px editor font puts the root at 13 / 0.875.
  assert.match(css, /font-size: 14\.86px !important;/);
});

test("hostStylesheet falls back through sources and ignores blanks", () => {
  assert.match(hostStylesheet({ "sideBar-foreground": " ", foreground: "#eee" }), /--fg: #eee/);
  assert.equal(hostStylesheet({}), "");
  assert.doesNotMatch(hostStylesheet({ "font-size": "abc", surface: "#000" }), /font-size/);
});

test("hostStylesheet never takes a see-through color for surfaces things float over", () => {
  const css = hostStylesheet({ "editorHoverWidget-background": "#ffffff0d", "editorWidget-background": "#202020" });
  assert.match(css, /--bg-raised: #202020 !important;/);
  assert.equal(isTranslucent("#ffffff0d"), true);
  assert.equal(isTranslucent("#fff8"), true);
  assert.equal(isTranslucent("#202020"), false);
  assert.equal(isTranslucent("#202020ff"), false);
  assert.equal(isTranslucent("rgba(0, 0, 0, 0.4)"), true);
  assert.equal(isTranslucent("rgb(0 0 0 / 50%)"), true);
  assert.equal(isTranslucent("rgb(10, 10, 10)"), false);
});
