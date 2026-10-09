/**
 * Page analytics for the hosted demo at helicon.sh/try, so it can be compared with the landing pages.
 * It is part of the website, not the app: only the try build (VITE_TRY) loads it, and release builds
 * never do, so decision 005 (no in-app telemetry) still holds for everything people install.
 *
 * It sends to the same PostHog project as the landing site through the plain capture endpoint, so the
 * demo needs no PostHog library. The visitor id is the landing site's own: the PostHog cookie when the
 * visitor has one, else the `helicon-anon` cookie that the landing site bootstraps PostHog from. A
 * visitor who goes on to the homepage and downloads is then one person, not two.
 *
 * It records the page view, the two banner links and that a prompt was sent. Never the prompt itself.
 */

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";
const ANON_COOKIE = "helicon-anon";
const INTERNAL_COOKIE = "helicon-internal";

function readCookie(name: string): string | undefined {
  const row = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return row ? decodeURIComponent(row.slice(name.length + 1)) : undefined;
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname.endsWith(".localhost");
}

/** Same switch as the landing site: `?internal=1` marks the maintainer's browser, `?internal=0` undoes it. */
function isInternal(): boolean {
  const flag = new URLSearchParams(window.location.search).get("internal");
  if (flag === "1") {
    document.cookie = `${INTERNAL_COOKIE}=1; Max-Age=${60 * 60 * 24 * 365 * 5}; Path=/; SameSite=Lax; Secure`;
  } else if (flag === "0") {
    document.cookie = `${INTERNAL_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
  }
  return readCookie(INTERNAL_COOKIE) === "1";
}

function visitorId(key: string): string {
  try {
    const persisted = readCookie(`ph_${key}_posthog`);
    const id = persisted ? (JSON.parse(persisted) as { distinct_id?: unknown }).distinct_id : undefined;
    if (typeof id === "string" && id) return id;
  } catch {
    // An unreadable PostHog cookie falls through to the landing site's own id.
  }
  const anon = readCookie(ANON_COOKIE);
  if (anon) return anon;
  const fresh = crypto.randomUUID();
  document.cookie = `${ANON_COOKIE}=${fresh}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax; Secure`;
  return fresh;
}

const enabled = Boolean(KEY) && !isLocalHost(window.location.hostname) && !isInternal();
const distinctId = enabled && KEY ? visitorId(KEY) : "";

function utm(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of new URLSearchParams(window.location.search)) {
    if (name.startsWith("utm_") && value) out[name] = value;
  }
  return out;
}

/** Fire and forget. `sendBeacon` survives the page unloading right after a link click. */
export function captureTry(event: string, properties: Record<string, unknown> = {}): void {
  if (!enabled || !KEY) return;
  const body = JSON.stringify({
    api_key: KEY,
    event,
    distinct_id: distinctId,
    timestamp: new Date().toISOString(),
    properties: {
      $current_url: window.location.href,
      $host: window.location.host,
      $pathname: window.location.pathname,
      $referrer: document.referrer || "$direct",
      $screen_width: window.screen.width,
      $lib: "helicon-try",
      site: "helicon_try",
      ...utm(),
      ...properties,
    },
  });
  const url = `${HOST}/i/v0/e/`;
  if (!navigator.sendBeacon?.(url, body)) {
    void fetch(url, { method: "POST", body, keepalive: true }).catch(() => undefined);
  }
}
