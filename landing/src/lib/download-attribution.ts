/**
 * Joins an installer download to the visit that led to it.
 *
 * The /download/<os> route counts the download on the server, where the only identity it has is
 * whatever cookies arrive with the request. Those are missing more often than expected: a privacy
 * browser that drops them, a click before PostHog finished loading, a blocker that kept PostHog's
 * cookie from ever being written. So the page writes the identity into the link itself at click
 * time (the visitor's PostHog distinct id and session, plus where they first came from) and the
 * route prefers those over the cookies. Pure functions here; the click listener lives in
 * instrumentation-client.ts and the route reads them back with attributionFromSearchParams.
 */

export const FIRST_TOUCH_KEY = "helicon-first-touch";

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
type UtmKey = (typeof UTM_KEYS)[number];

/** Where a visitor first arrived from, recorded once per browser. */
export type FirstTouch = Partial<Record<UtmKey, string>> & {
  /** Host of the external page that sent them, or "$direct". */
  referring_domain?: string;
  /** The ?ref= tag directories and launch sites add (ref=producthunt and the like). */
  ref?: string;
};

/** Query parameter names on the download link. Short and prefixed so they never clash with src. */
const PARAM = {
  distinctId: "hx_did",
  sessionId: "hx_sid",
  referringDomain: "hx_rd",
  ref: "hx_ref",
} as const;

const ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const MAX_VALUE = 200;

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_VALUE) : undefined;
}

function cleanId(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && ID_PATTERN.test(trimmed) && trimmed !== "anonymous" ? trimmed : undefined;
}

function hostOf(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.toLowerCase() || undefined;
  } catch {
    return undefined;
  }
}

/** UTM tags and ?ref= from a query string. Empty when there are none. */
function campaignFrom(search: URLSearchParams): FirstTouch {
  const touch: FirstTouch = {};
  for (const key of UTM_KEYS) {
    const value = clean(search.get(key));
    if (value) touch[key] = value;
  }
  const ref = clean(search.get("ref"));
  if (ref) touch.ref = ref;
  return touch;
}

/**
 * The first touch for a page load: the external referrer's host (or "$direct") and any UTM or ref
 * tags on the landing URL. A referrer on our own site does not count as a source.
 */
export function firstTouchFrom(pageUrl: string, referrer: string, siteHost: string): FirstTouch {
  const url = new URL(pageUrl);
  const referrerHost = hostOf(referrer);
  const own = siteHost.toLowerCase().replace(/^www\./, "");
  const external = referrerHost && referrerHost.replace(/^www\./, "") !== own ? referrerHost : undefined;
  return { referring_domain: external ?? "$direct", ...campaignFrom(url.searchParams) };
}

/** Is this href one of our installer links? Accepts relative and same-origin absolute URLs. */
export function isDownloadHref(href: string, origin: string): boolean {
  try {
    const url = new URL(href, origin);
    return url.origin === origin && url.pathname.startsWith("/download/");
  } catch {
    return false;
  }
}

/** The download href with identity and first touch added. Existing params (src) are kept. */
export function withAttribution(
  href: string,
  origin: string,
  identity: { distinctId?: string | null; sessionId?: string | null; firstTouch?: FirstTouch | null },
): string {
  const url = new URL(href, origin);
  const set = (name: string, value: string | null | undefined) => {
    if (value) url.searchParams.set(name, value);
  };
  set(PARAM.distinctId, cleanId(identity.distinctId));
  set(PARAM.sessionId, cleanId(identity.sessionId));
  const touch = identity.firstTouch ?? {};
  set(PARAM.referringDomain, clean(touch.referring_domain));
  set(PARAM.ref, clean(touch.ref));
  for (const key of UTM_KEYS) set(key, clean(touch[key]));
  // Keep relative links relative so nothing about the navigation changes but the query.
  return href.startsWith("/") ? `${url.pathname}${url.search}${url.hash}` : url.toString();
}

export type DownloadAttribution = {
  distinctId?: string;
  sessionId?: string;
  firstTouch: FirstTouch;
};

/**
 * Read what withAttribution wrote. When the link carries no first touch (an old cached page, a link
 * from outside the site), fall back to the Referer header: its UTM and ref tags if it is one of our
 * pages, its host if it is someone else's.
 */
export function attributionFromSearchParams(
  search: URLSearchParams,
  referer: string | null,
  siteHost: string,
): DownloadAttribution {
  const firstTouch: FirstTouch = {};
  const rd = clean(search.get(PARAM.referringDomain));
  if (rd) firstTouch.referring_domain = rd;
  const ref = clean(search.get(PARAM.ref));
  if (ref) firstTouch.ref = ref;
  for (const key of UTM_KEYS) {
    const value = clean(search.get(key));
    if (value) firstTouch[key] = value;
  }

  const hasLinkTouch = Object.keys(firstTouch).length > 0;
  const refererHost = hostOf(referer);
  if (!hasLinkTouch && referer && refererHost) {
    if (refererHost.replace(/^www\./, "") === siteHost.toLowerCase().replace(/^www\./, "")) {
      // One of our pages: its tags are the best guess at the campaign. Its host says nothing.
      Object.assign(firstTouch, campaignFrom(new URL(referer).searchParams));
    } else {
      firstTouch.referring_domain = refererHost;
    }
  }

  return {
    distinctId: cleanId(search.get(PARAM.distinctId)),
    sessionId: cleanId(search.get(PARAM.sessionId)),
    firstTouch,
  };
}

/** installer_download properties for a first touch, named the way PostHog's own events name them. */
export function firstTouchProperties(touch: FirstTouch): Record<string, string> {
  const props: Record<string, string> = {};
  if (touch.referring_domain) props.$referring_domain = touch.referring_domain;
  if (touch.ref) props.ref = touch.ref;
  for (const key of UTM_KEYS) {
    const value = touch[key];
    if (value) props[key] = value;
  }
  return props;
}
