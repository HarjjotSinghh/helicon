/**
 * Website-only events. No-ops until a Helicon PostHog key is set.
 * Do not call this from the desktop/web app; Helicon itself stays telemetry-free.
 */
import { ANON_COOKIE, parseVisitorOs, type VisitorOs } from "./os";

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

export async function track(
  event: string,
  properties: Record<string, unknown>,
  distinctId: string,
) {
  const key = projectKey();
  if (!key) return;

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
