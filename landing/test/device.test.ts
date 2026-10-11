import { describe, expect, it } from "vitest";
import { SEND_TO_DESKTOP_URL, isHandheld, sendToDesktopMailto } from "../src/lib/device";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipadLegacy:
    "Mozilla/5.0 (iPad; CPU OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1",
  // iPadOS 13+ in its default "desktop website" mode is indistinguishable from a Mac by UA alone.
  ipadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  androidPhone:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  androidTablet:
    "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  firefoxAndroid: "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  linuxFirefox: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
  // Android Chrome with "Desktop site" ticked: a Linux desktop user agent, no Mobile token.
  androidDesktopSite:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  chromebook:
    "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

describe("isHandheld", () => {
  it("flags phones and tablets", () => {
    expect(isHandheld({ userAgent: UA.iphone, maxTouchPoints: 5 })).toBe(true);
    expect(isHandheld({ userAgent: UA.ipadLegacy, maxTouchPoints: 5 })).toBe(true);
    expect(isHandheld({ userAgent: UA.androidPhone, maxTouchPoints: 5, uaMobile: true })).toBe(true);
    expect(isHandheld({ userAgent: UA.firefoxAndroid, maxTouchPoints: 5 })).toBe(true);
  });

  it("flags Android tablets, which send no Mobile token and report uaMobile false", () => {
    expect(isHandheld({ userAgent: UA.androidTablet, maxTouchPoints: 10, uaMobile: false })).toBe(true);
  });

  it("flags iPadOS in desktop mode by its touch screen", () => {
    expect(isHandheld({ userAgent: UA.ipadDesktopMode, maxTouchPoints: 5 })).toBe(true);
  });

  it("trusts the Client Hints mobile flag", () => {
    expect(isHandheld({ userAgent: UA.linuxFirefox, uaMobile: true })).toBe(true);
  });

  it("never flags a desktop browser", () => {
    expect(isHandheld({ userAgent: UA.macChrome, maxTouchPoints: 0, uaMobile: false })).toBe(false);
    expect(isHandheld({ userAgent: UA.macSafari, maxTouchPoints: 0 })).toBe(false);
    expect(isHandheld({ userAgent: UA.windowsChrome, maxTouchPoints: 0, uaMobile: false })).toBe(false);
    expect(isHandheld({ userAgent: UA.linuxFirefox })).toBe(false);
  });

  it("keeps touch-screen laptops on the desktop path", () => {
    expect(isHandheld({ userAgent: UA.windowsChrome, maxTouchPoints: 10, uaMobile: false })).toBe(false);
    expect(isHandheld({ userAgent: UA.linuxFirefox, maxTouchPoints: 10 })).toBe(false);
    expect(isHandheld({ userAgent: UA.chromebook, maxTouchPoints: 10, uaMobile: false })).toBe(false);
  });

  it("flags a touch-only small screen even when the user agent says desktop", () => {
    const phone = { maxTouchPoints: 5, coarsePointer: true, finePointer: false, screenWidth: 412 };
    expect(isHandheld({ userAgent: UA.androidDesktopSite, uaMobile: false, ...phone })).toBe(true);
    expect(isHandheld({ userAgent: UA.linuxFirefox, ...phone })).toBe(true);
    expect(isHandheld({ userAgent: UA.macChrome, ...phone })).toBe(true);
  });

  it("needs every touch-only signal before it overrides the user agent", () => {
    const base = { userAgent: UA.androidDesktopSite, maxTouchPoints: 5, coarsePointer: true, finePointer: false, screenWidth: 412 };
    expect(isHandheld(base)).toBe(true);
    expect(isHandheld({ ...base, maxTouchPoints: 0 })).toBe(false);
    expect(isHandheld({ ...base, coarsePointer: false })).toBe(false);
    expect(isHandheld({ ...base, finePointer: true })).toBe(false);
    expect(isHandheld({ ...base, screenWidth: 900 })).toBe(false);
    expect(isHandheld({ ...base, screenWidth: 1280 })).toBe(false);
    expect(isHandheld({ ...base, screenWidth: undefined })).toBe(false);
  });

  it("keeps desktops with a touch screen on the desktop path, whatever their pointer reports", () => {
    // A touch-screen laptop has a trackpad (fine pointer) and a large screen.
    const laptop = { maxTouchPoints: 10, coarsePointer: false, finePointer: true, screenWidth: 1440 };
    expect(isHandheld({ userAgent: UA.windowsChrome, uaMobile: false, ...laptop })).toBe(false);
    expect(isHandheld({ userAgent: UA.linuxFirefox, ...laptop })).toBe(false);
    expect(isHandheld({ userAgent: UA.macChrome, ...laptop, maxTouchPoints: 0 })).toBe(false);
    // A touch-first Linux laptop whose trackpad reports a coarse primary pointer still has a fine one.
    expect(isHandheld({ userAgent: UA.linuxFirefox, maxTouchPoints: 10, coarsePointer: true, finePointer: true, screenWidth: 1366 })).toBe(false);
    // A small laptop window is not a small screen: screen.width is the display, not the window.
    expect(isHandheld({ userAgent: UA.linuxFirefox, maxTouchPoints: 10, coarsePointer: true, finePointer: true, screenWidth: 800 })).toBe(false);
    // Windows and ChromeOS stay desktops even for a touch-only reading.
    expect(isHandheld({ userAgent: UA.windowsChrome, maxTouchPoints: 10, coarsePointer: true, finePointer: false, screenWidth: 600 })).toBe(false);
  });

  it("treats an empty user agent as a desktop", () => {
    expect(isHandheld({ userAgent: "" })).toBe(false);
  });
});

describe("sendToDesktopMailto", () => {
  it("prefills the subject and the tagged download link, with no address", () => {
    const href = sendToDesktopMailto();
    expect(href.startsWith("mailto:?")).toBe(true);
    const params = new URLSearchParams(href.slice("mailto:?".length));
    expect(params.get("subject")).toBe("Helicon download");
    expect(params.get("body")).toContain(SEND_TO_DESKTOP_URL);
    expect(SEND_TO_DESKTOP_URL).toBe("https://helicon.sh/download?utm_source=mobile&utm_medium=send-to-desktop");
  });
});
