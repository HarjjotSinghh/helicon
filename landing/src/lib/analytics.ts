/**
 * Website-only events. No-ops until NEXT_PUBLIC_POSTHOG_KEY (or POSTHOG_KEY) is set.
 * Do not call this from the desktop/web app; Helicon itself stays telemetry-free.
 */
export async function track(
  event: string,
  properties: Record<string, unknown>,
  distinctId: string,
) {
  const key = process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
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
        },
      }),
      cache: "no-store",
    });
  } catch {
    // Downloads must not fail because analytics is down.
  }
}
