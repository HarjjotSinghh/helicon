import { beforeEach, describe, expect, it, vi } from "vitest";

type Client = typeof import("../src/lib/posthog-client");
type PostHog = Parameters<Client["posthogReady"]>[0];

let client: Client;
const fake = (capture = vi.fn()) => ({ capture }) as unknown as PostHog & { capture: typeof capture };

beforeEach(async () => {
  vi.resetModules();
  client = await import("../src/lib/posthog-client");
});

describe("posthog-client", () => {
  it("holds events until PostHog is up, then sends them in order", () => {
    client.withPosthog((posthog) => posthog.capture("first"));
    client.withPosthog((posthog) => posthog.capture("second"));
    expect(client.posthogNow()).toBeNull();

    const posthog = fake();
    client.posthogReady(posthog);
    expect(posthog.capture.mock.calls.map((call) => call[0])).toEqual(["first", "second"]);

    client.withPosthog((ph) => ph.capture("third"));
    expect(posthog.capture).toHaveBeenLastCalledWith("third");
    expect(client.posthogNow()).toBe(posthog);
  });

  it("drops events once analytics is off for the visit", () => {
    const use = vi.fn();
    client.withPosthog(use);
    client.posthogOff();
    client.withPosthog(use);
    expect(use).not.toHaveBeenCalled();
    expect(client.posthogNow()).toBeNull();
  });
});
