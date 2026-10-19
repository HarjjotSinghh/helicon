import type { PostHog } from "posthog-js";

/*
 * posthog-js is close to 100 KB of script, and every page used to load it before anything else ran.
 * Now instrumentation-client.ts imports it once the page has finished loading. Events tracked
 * before then wait here and go out as soon as PostHog is up. If the page goes away first (a click
 * on a same-tab link while it is still loading), they go out with one sendBeacon to the capture
 * API instead, so early clicks still reach the funnels.
 */

type Waiting = { event: string; properties?: Record<string, unknown>; beacon: boolean; timestamp: string };

/** What the unload path needs to send events without posthog-js. */
export type BeaconTarget = {
  key: string;
  /** The relay PostHog is reached through, without a trailing slash. */
  host: string;
  distinctId: () => string | undefined;
  /** The properties posthog-js would register for every event. */
  properties: () => Record<string, unknown>;
};

let client: PostHog | null = null;
let waiting: Waiting[] | null = [];
let target: BeaconTarget | null = null;

/** Sends an event now if PostHog is up, or once it is. Dropped when analytics is off. */
export function capture(event: string, properties?: Record<string, unknown>, options?: { beacon?: boolean }) {
  if (client) client.capture(event, properties, options?.beacon ? { transport: "sendBeacon" } : undefined);
  else waiting?.push({ event, properties, beacon: Boolean(options?.beacon), timestamp: new Date().toISOString() });
}

/** PostHog when it is up, otherwise null. */
export function posthogNow(): PostHog | null {
  return client;
}

/** Analytics is off for this visit (local, internal or no key): stop holding events. */
export function posthogOff() {
  waiting = null;
  target = null;
}

/** PostHog will start once the page has loaded; until then, send anything waiting if the page goes away. */
export function posthogStarting(beaconTarget: BeaconTarget) {
  target = beaconTarget;
  window.addEventListener("pagehide", sendWaitingByBeacon);
}

/** Called once posthog.init has run: send everything that was waiting. */
export function posthogReady(posthog: PostHog) {
  client = posthog;
  target = null;
  const queued = waiting ?? [];
  waiting = null;
  for (const { event, properties, beacon } of queued) {
    posthog.capture(event, properties, beacon ? { transport: "sendBeacon" } : undefined);
  }
}

function sendWaitingByBeacon() {
  if (client || !target || !waiting?.length) return;
  const distinctId = target.distinctId();
  if (!distinctId) return;
  const shared = { ...target.properties(), distinct_id: distinctId };
  const batch = waiting.map(({ event, properties, timestamp }) => ({
    event,
    timestamp,
    properties: { ...shared, ...properties },
  }));
  const body = new Blob([JSON.stringify({ api_key: target.key, batch })], { type: "application/json" });
  if (navigator.sendBeacon?.(`${target.host}/batch/`, body)) waiting = [];
}
