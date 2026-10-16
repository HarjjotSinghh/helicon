import posthog from "posthog-js";
import {
  FIRST_TOUCH_KEY,
  firstTouchFrom,
  isDownloadHref,
  withAttribution,
  type FirstTouch,
} from "./lib/download-attribution";
import { ANON_COOKIE, INTERNAL_COOKIE, parseVisitorOs } from "./lib/os";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

function readCookie(name: string) {
  const row = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return row ? decodeURIComponent(row.slice(name.length + 1)) : undefined;
}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

/**
 * The maintainer's own browsers. Opening any page with ?internal=1 marks this browser for good (and
 * ?internal=0 undoes it), so our own visits stop inflating the numbers. The cookie also reaches the
 * server, which skips the download events it sends for us.
 */
function isInternalBrowser() {
  const flag = new URLSearchParams(window.location.search).get("internal");
  if (flag === "1") {
    document.cookie = `${INTERNAL_COOKIE}=1; Max-Age=${60 * 60 * 24 * 365 * 5}; Path=/; SameSite=Lax; Secure`;
  } else if (flag === "0") {
    document.cookie = `${INTERNAL_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
  }
  return readCookie(INTERNAL_COOKIE) === "1";
}

const internal = isInternalBrowser();

if (key && !isLocalHost(window.location.hostname) && !internal) {
  const persisted = readCookie(`ph_${key}_posthog`);
  const anon = readCookie(ANON_COOKIE);

  posthog.init(key, {
    // Same-origin relay (next.config.ts rewrites it to PostHog), so content blockers keep the events.
    // Fixed rather than read from NEXT_PUBLIC_POSTHOG_HOST: that variable is PostHog's own host,
    // which the server-side tracking in lib/analytics.ts still posts to directly.
    api_host: "/relay-hx",
    ui_host: "https://us.posthog.com",
    defaults: "2026-05-30",
    autocapture: true,
    capture_pageview: "history_change",
    capture_pageleave: true,
    capture_dead_clicks: true,
    capture_heatmaps: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
    },
    persistence: "localStorage+cookie",
    bootstrap: !persisted && anon ? { distinctID: anon } : undefined,
    loaded: (client) => {
      const uaData = (navigator as Navigator & { userAgentData?: { platform: string; mobile: boolean } })
        .userAgentData;
      client.register({
        site: "helicon_landing",
        visitor_os: parseVisitorOs(
          navigator.userAgent,
          uaData ? { platform: uaData.platform, mobile: uaData.mobile } : undefined,
        ),
      });
      client.startSessionRecording();
    },
  });
}

/** Where this browser first came from, kept for the life of its localStorage. */
function firstTouch(): FirstTouch | null {
  try {
    const stored = localStorage.getItem(FIRST_TOUCH_KEY);
    if (stored) return JSON.parse(stored) as FirstTouch;
    const touch = firstTouchFrom(window.location.href, document.referrer, window.location.hostname);
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch));
    return touch;
  } catch {
    // Storage blocked: work it out from this page load alone.
    return firstTouchFrom(window.location.href, document.referrer, window.location.hostname);
  }
}

const touch = firstTouch();

/**
 * Write the visitor's identity and first touch into an installer link the moment it is clicked, so
 * the server-side download event joins this visit even when no cookie reaches the route (see
 * lib/download-attribution.ts). Capture phase, so it runs before any other handler reads the href.
 * The original href comes back on the next tick: a link copied later never carries this visitor's id.
 */
function attributeDownload(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  const href = link?.getAttribute("href");
  if (!link || !href || !isDownloadHref(href, window.location.origin)) return;
  const loaded = Boolean((posthog as unknown as { __loaded?: boolean }).__loaded);
  const attributed = withAttribution(href, window.location.origin, {
    distinctId: loaded ? posthog.get_distinct_id() : readCookie(ANON_COOKIE),
    sessionId: loaded ? posthog.get_session_id() : null,
    firstTouch: touch,
  });
  link.setAttribute("href", attributed);
  setTimeout(() => {
    // Leave it alone if React has given the link a new href in the meantime.
    if (link.getAttribute("href") === attributed) link.setAttribute("href", href);
  }, 0);
}

document.addEventListener("click", attributeDownload, true);
document.addEventListener("auxclick", attributeDownload, true);
