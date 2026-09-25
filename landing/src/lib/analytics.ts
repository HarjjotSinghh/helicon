/**
 * Website-only events. No-ops until a Helicon PostHog key is set.
 * Do not call this from the desktop/web app; Helicon itself stays telemetry-free.
 */
import { ANON_COOKIE, INTERNAL_COOKIE, parseVisitorOs, type VisitorOs } from "./os";

function projectKey() {
  return (
    process.env.POSTHOG_KEY ??
    process.env.NEXT_PUBLIC_POSTHOG_KEY ??
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  );
}

function cookieValue(header: string, name: string) {
  const row = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!row) return undefined;
  try {
    return decodeURIComponent(row.slice(name.length + 1));
  } catch {
    return row.slice(name.length + 1);
  }
}

export function identityFromCookies(cookieHeader: string | null): {
  distinctId: string;
  sessionId: string | null;
} {
  const header = cookieHeader ?? "";
  const key = projectKey();
  const persistence = key ? cookieValue(header, `ph_${key}_posthog`) : undefined;
  if (persistence) {
    try {
      const parsed = JSON.parse(persistence) as {
        distinct_id?: unknown;
        $sesid?: unknown;
      };
      const distinctId = typeof parsed.distinct_id === "string" ? parsed.distinct_id : undefined;
      const session = Array.isArray(parsed.$sesid) ? parsed.$sesid[1] : undefined;
      if (distinctId) {
        return {
          distinctId,
          sessionId: typeof session === "string" ? session : null,
        };
      }
    } catch {
      // Fall through to the anonymous landing cookie.
    }
  }
  return {
    distinctId: cookieValue(header, ANON_COOKIE) ?? "anonymous",
    sessionId: null,
  };
}

export function visitorOsFromRequest(request: Request): VisitorOs {
  const platform = request.headers.get("sec-ch-ua-platform")?.replaceAll('"', "");
  const mobileHeader = request.headers.get("sec-ch-ua-mobile");
  return parseVisitorOs(request.headers.get("user-agent") ?? "", {
    platform: platform ?? undefined,
    mobile: mobileHeader === "?1" ? true : mobileHeader === "?0" ? false : undefined,
  });
}

/**
 * A request served from a developer's own machine. The client-side guard added in #33 keeps
 * localhost out of PostHog, but these events are sent from the server, where that guard never ran:
 * four downloads from a dev server on 127.0.0.1 reached production before this existed.
 */
export function isLocalRequest(request: Request): boolean {
  const host = (request.headers.get("host") ?? "").toLowerCase().replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host.endsWith(".localhost");
}

/**
 * Crawlers, link previewers and monitors. They follow a download link and never install anything,
 * and each one arrives without a cookie, so an unfiltered count inflates both downloads and people.
 * Only use this where a browser is the only legitimate caller: the updater is not a browser and
 * must never be filtered by it.
 */
const BOT_AGENTS =
  /bot\b|bots\b|crawl|spider|slurp|preview|facebookexternalhit|embedly|pinterest|headlesschrome|phantomjs|python-requests|curl\/|wget\/|node-fetch|axios\/|go-http-client|java\/|okhttp|postman|lighthouse|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|perplexity|amazonbot|bytespider|semrush|ahrefs|mj12|dotbot|dataforseo|scrapy|httpx|monitoring/i;

export function isBotRequest(request: Request): boolean {
  const agent = request.headers.get("user-agent")?.trim() ?? "";
  // No user agent at all is not a browser; every real one is far longer than this.
  if (agent.length < 16) {
    return true;
  }
  return BOT_AGENTS.test(agent);
}

/** The maintainer's own browser, marked by visiting the site with ?internal=1. */
export function isInternalRequest(request: Request): boolean {
  return cookieValue(request.headers.get("cookie") ?? "", INTERNAL_COOKIE) === "1";
}

export async function track(
  event: string,
  properties: Record<string, unknown>,
  distinctId: string,
  /** The request being counted. Required so that a caller cannot forget the localhost check. */
  request: Request,
) {
  const key = projectKey();
  if (!key || isLocalRequest(request) || isInternalRequest(request)) return;

  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: "helicon-landing",
          site: "helicon_landing",
        },
      }),
      cache: "no-store",
    });
  } catch {
    // Downloads must not fail because analytics is down.
  }
}
