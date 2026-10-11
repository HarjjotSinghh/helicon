/**
 * Phones and tablets cannot run the desktop installers, so an installer click there is offered
 * a way to send the link to a computer instead.
 *
 * The rule leans towards "desktop": a false positive hides the installer from someone who could
 * use it, a false negative only costs a wasted download. So only clear signals count: a phone or
 * tablet user agent, the Client Hints mobile flag, or iPadOS in desktop mode (a "Macintosh" user
 * agent with a touch screen, which no Mac has). A Windows or Linux laptop with a touch screen is
 * still a desktop.
 */
export type DeviceSignals = {
  userAgent: string;
  /** navigator.maxTouchPoints */
  maxTouchPoints?: number;
  /** navigator.userAgentData.mobile, where the browser supports Client Hints */
  uaMobile?: boolean;
};

export function isHandheld({ userAgent, maxTouchPoints = 0, uaMobile }: DeviceSignals): boolean {
  if (/Windows NT|CrOS/i.test(userAgent)) return false;
  if (uaMobile === true) return true;
  if (/iPhone|iPod|iPad|Android|Mobi/i.test(userAgent)) return true;
  // iPadOS 13+ asks for the desktop site by default and sends a Mac user agent.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return true;
  return false;
}

/** The current browser, client only. */
export function isHandheldBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData;
  return isHandheld({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    uaMobile: uaData?.mobile,
  });
}

/** What a phone visitor sends to their computer. The UTM tags let the dashboard count the returns. */
export const SEND_TO_DESKTOP_URL = "https://helicon.sh/download?utm_source=mobile&utm_medium=send-to-desktop";

export function sendToDesktopMailto(url: string = SEND_TO_DESKTOP_URL): string {
  const subject = "Helicon download";
  const body = `Download Helicon for Windows, macOS or Linux on your computer:\n\n${url}`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
