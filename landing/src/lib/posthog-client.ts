import type { PostHog } from "posthog-js";

/*
 * posthog-js is close to 100 KB of script, and every page used to load it before anything else ran.
 * Now instrumentation-client.ts imports it once the page has finished loading. Anything tracked
 * before then waits here and goes out as soon as PostHog is up.
 */

let client: PostHog | null = null;
let waiting: ((posthog: PostHog) => void)[] | null = [];

/** Runs `use` with PostHog now if it is up, or once it is. Dropped when analytics is off. */
export function withPosthog(use: (posthog: PostHog) => void) {
  if (client) use(client);
  else waiting?.push(use);
}

/** PostHog when it is up, otherwise null. */
export function posthogNow(): PostHog | null {
  return client;
}

/** Analytics is off for this visit (local, internal or no key): stop holding events. */
export function posthogOff() {
  waiting = null;
}

/** Called once posthog.init has run: send everything that was waiting. */
export function posthogReady(posthog: PostHog) {
  client = posthog;
  const queued = waiting ?? [];
  waiting = null;
  for (const use of queued) use(posthog);
}
