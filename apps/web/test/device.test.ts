import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { downloadHref, isHandheld } from "../src/demo/device.js";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  androidDesktopSite:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  linuxFirefox: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
};

describe("demo isHandheld", () => {
  it("flags phones by user agent", () => {
    assert.equal(isHandheld({ userAgent: UA.iphone, maxTouchPoints: 5 }), true);
  });

  it("flags Android's desktop-site mode by its touch-only small screen", () => {
    const phone = { maxTouchPoints: 5, coarsePointer: true, finePointer: false, screenWidth: 412 };
    assert.equal(isHandheld({ userAgent: UA.androidDesktopSite, uaMobile: false, ...phone }), true);
  });

  it("keeps desktops, including touch-screen laptops, on the desktop path", () => {
    assert.equal(isHandheld({ userAgent: UA.macChrome, maxTouchPoints: 0, uaMobile: false }), false);
    assert.equal(
      isHandheld({ userAgent: UA.windowsChrome, maxTouchPoints: 10, coarsePointer: true, finePointer: false, screenWidth: 600 }),
      false,
    );
    assert.equal(
      isHandheld({ userAgent: UA.linuxFirefox, maxTouchPoints: 10, coarsePointer: true, finePointer: true, screenWidth: 1366 }),
      false,
    );
    assert.equal(
      isHandheld({ userAgent: UA.linuxFirefox, maxTouchPoints: 10, coarsePointer: false, finePointer: true, screenWidth: 800 }),
      false,
    );
  });
});

describe("downloadHref", () => {
  it("sends computers to the install section and phones to the send-to-desktop path", () => {
    assert.equal(downloadHref(false), "https://helicon.sh/?utm_source=try&utm_medium=demo&utm_campaign=try#install");
    assert.equal(downloadHref(true), "https://helicon.sh/download?utm_source=try&utm_medium=mobile");
  });
});

describe("copy of the landing rule", () => {
  // The demo is its own static build and cannot import the landing app, so the rule is copied.
  const rule = /export type DeviceSignals[\s\S]*?\nexport function isHandheld[\s\S]*?\n}\n/;
  // Normalise line endings: Windows CI checks files out with CRLF.
  const read = (url: string) =>
    readFileSync(fileURLToPath(new URL(url, import.meta.url)), "utf8").replace(/\r\n/g, "\n");

  it("matches landing/src/lib/device.ts", () => {
    // Compiled to apps/web/dist-test/test/, so the repo root is four levels up.
    const landing = read("../../../../landing/src/lib/device.ts").match(rule)?.[0];
    const demo = read("../../../../apps/web/src/demo/device.ts").match(rule)?.[0];
    assert.ok(landing && demo, "rule block not found");
    assert.equal(demo, landing);
  });
});
