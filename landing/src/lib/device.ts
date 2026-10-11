/**
 * Phones and tablets cannot run the desktop installers, so an installer click there is offered
 * a way to send the link to a computer instead.
 *
 * The rule leans towards "desktop": a false positive hides the installer from someone who could
 * use it, a false negative only costs a wasted download. So only clear signals count: a phone or
 * tablet user agent, the Client Hints mobile flag, iPadOS in desktop mode (a "Macintosh" user
 * agent with a touch screen, which no Mac has), or a touch-only small screen that says it is a
 * desktop (Android's "Desktop site" switch sends a Linux user agent). A Windows or Linux laptop
 * with a touch screen is still a desktop: it has a fine pointer or a large screen, or both.
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
  if (typeof navigator === "undefined") return false;
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

/** What the analytics `device` property says about a click: "mobile" for a phone or tablet. */
export type DeviceClass = "mobile" | "desktop";

export function deviceClass(): DeviceClass {
  return isHandheldBrowser() ? "mobile" : "desktop";
}

/** What a phone visitor sends to their computer. The UTM tags let the dashboard count the returns. */
export const SEND_TO_DESKTOP_URL = "https://helicon.sh/download?utm_source=mobile&utm_medium=send-to-desktop";

export function sendToDesktopMailto(url: string = SEND_TO_DESKTOP_URL): string {
  const subject = "Helicon download";
  const body = `Download Helicon for Windows, macOS or Linux on your computer:\n\n${url}`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
