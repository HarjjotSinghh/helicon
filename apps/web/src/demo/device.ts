/**
 * Phone detection for the hosted demo's "Download Helicon" button. The rule below is a copy of
 * landing/src/lib/device.ts (the demo is a separate static build and cannot import from the
 * landing app); test/device.test.ts fails if the two drift apart.
 *
 * Phones and tablets cannot run the desktop installers, so on one the button links to the landing
 * page's send-to-desktop panel instead of the install section.
 */
export type DeviceSignals = {
  userAgent: string;
  /** navigator.maxTouchPoints */
  maxTouchPoints?: number;
  /** navigator.userAgentData.mobile, where the browser supports Client Hints */
  uaMobile?: boolean;
  /** matchMedia("(pointer: coarse)"): the primary pointer is a finger */
  coarsePointer?: boolean;
  /** matchMedia("(any-pointer: fine)"): some attached pointer is a mouse, trackpad or pen */
  finePointer?: boolean;
  /** The shorter side of the screen in CSS pixels, so a phone held sideways still counts as small */
  screenWidth?: number;
};

/** Below this the screen is a phone or a small tablet, which has no desktop installer. */
const SMALL_SCREEN = 900;

export function isHandheld({
  userAgent,
  maxTouchPoints = 0,
  uaMobile,
  coarsePointer = false,
  finePointer = false,
  screenWidth,
}: DeviceSignals): boolean {
  if (/Windows NT|CrOS/i.test(userAgent)) return false;
  if (uaMobile === true) return true;
  if (/iPhone|iPod|iPad|Android|Mobi/i.test(userAgent)) return true;
  // iPadOS 13+ asks for the desktop site by default and sends a Mac user agent.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return true;
  // "Desktop site" on an Android phone sends a desktop user agent and mobile=false, but the
  // hardware still gives it away. All four signals must agree, so a touch-screen laptop (which
  // has a trackpad, or a large screen) stays a desktop.
  if (
    maxTouchPoints > 0 &&
    coarsePointer &&
    !finePointer &&
    screenWidth !== undefined &&
    screenWidth > 0 &&
    screenWidth < SMALL_SCREEN
  ) {
    return true;
  }
  return false;
}

function matches(query: string): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

/** The current browser, client only. */
export function isHandheldBrowser(): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData;
  return isHandheld({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    uaMobile: uaData?.mobile,
    coarsePointer: matches("(pointer: coarse)"),
    finePointer: matches("(any-pointer: fine)"),
    screenWidth: Math.min(screen.width, screen.height),
  });
}

const DOWNLOAD_DESKTOP = "https://helicon.sh/?utm_source=try&utm_medium=demo&utm_campaign=try#install";
/** /download redirects to the home page's install section, which offers phones a send-to-desktop link. */
const DOWNLOAD_HANDHELD = "https://helicon.sh/download?utm_source=try&utm_medium=mobile";

export function downloadHref(handheld: boolean): string {
  return handheld ? DOWNLOAD_HANDHELD : DOWNLOAD_DESKTOP;
}
