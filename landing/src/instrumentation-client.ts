import {
  FIRST_TOUCH_KEY,
  firstTouchFrom,
  isDownloadHref,
  withAttribution,
  type FirstTouch,
} from "./lib/download-attribution";
import { ANON_COOKIE, INTERNAL_COOKIE, parseVisitorOs } from "./lib/os";
import { posthogNow, posthogOff, posthogReady, posthogStarting } from "./lib/posthog-client";

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

/** posthog-js is large, so it loads after the page does and first paint never waits on analytics. */
async function startPosthog(key: string) {
  const { default: posthog } = await import("posthog-js");
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
      client.register(siteProperties());
      client.startSessionRecording();
    },
  });
  posthogReady(posthog);
}

/** After the load event, once the main thread is free, so it never competes with the first paint. */
function afterLoad(run: () => void) {
  const idle = () => (window.requestIdleCallback ? window.requestIdleCallback(run, { timeout: 2000 }) : setTimeout(run, 1));
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}

/** The properties loaded() registers below, for events sent before posthog-js is up. */
function siteProperties() {
  const uaData = (navigator as Navigator & { userAgentData?: { platform: string; mobile: boolean } }).userAgentData;
  return {
    site: "helicon_landing",
    visitor_os: parseVisitorOs(navigator.userAgent, uaData ? { platform: uaData.platform, mobile: uaData.mobile } : undefined),
  };
}

/** The id posthog-js would use: the one it saved on an earlier visit, or the anon cookie it bootstraps from. */
function knownDistinctId(key: string) {
  try {
    const persisted = readCookie(`ph_${key}_posthog`);
    const id = persisted ? (JSON.parse(persisted) as { distinct_id?: unknown }).distinct_id : undefined;
    if (typeof id === "string" && id) return id;
  } catch {
    // A cookie we cannot read is the same as no cookie.
  }
  return readCookie(ANON_COOKIE);
}

if (key && !isLocalHost(window.location.hostname) && !internal) {
  posthogStarting({
    key,
    host: "/relay-hx",
    distinctId: () => knownDistinctId(key),
    properties: () => ({
      ...siteProperties(),
      $current_url: window.location.href,
      $host: window.location.host,
      $pathname: window.location.pathname,
      $lib: "web-beacon",
    }),
  });
  afterLoad(() => void startPosthog(key).catch(posthogOff));
} else {
  posthogOff();
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
  const posthog = posthogNow();
  const attributed = withAttribution(href, window.location.origin, {
    distinctId: posthog ? posthog.get_distinct_id() : readCookie(ANON_COOKIE),
    sessionId: posthog ? posthog.get_session_id() : null,
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
