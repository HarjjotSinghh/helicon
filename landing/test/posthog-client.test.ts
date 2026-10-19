import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Client = typeof import("../src/lib/posthog-client");
type PostHog = Parameters<Client["posthogReady"]>[0];

let client: Client;
const fake = (capture = vi.fn()) => ({ capture }) as unknown as PostHog & { capture: typeof capture };

beforeEach(async () => {
  vi.resetModules();
  client = await import("../src/lib/posthog-client");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("posthog-client", () => {
  it("holds events until PostHog is up, then sends them in order", () => {
    client.capture("first");
    client.capture("second", { placement: "hero" }, { beacon: true });
    expect(client.posthogNow()).toBeNull();

    const posthog = fake();
    client.posthogReady(posthog);
    expect(posthog.capture.mock.calls).toEqual([
      ["first", undefined, undefined],
      ["second", { placement: "hero" }, { transport: "sendBeacon" }],
    ]);

    client.capture("third");
    expect(posthog.capture).toHaveBeenLastCalledWith("third", undefined, undefined);
    expect(client.posthogNow()).toBe(posthog);
  });

  it("drops events once analytics is off for the visit", () => {
    client.capture("first");
    client.posthogOff();
    client.capture("second");
    const posthog = fake();
    client.posthogReady(posthog);
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("sends waiting events with one beacon if the page goes away before PostHog is up", async () => {
    const page = new EventTarget();
    const sendBeacon = vi.fn<(url: string, body: Blob) => boolean>(() => true);
    vi.stubGlobal("window", page);
    vi.stubGlobal("navigator", { sendBeacon });

    client.posthogStarting({
      key: "phc_test",
      host: "/relay-hx",
      distinctId: () => "visitor-1",
      properties: () => ({ site: "helicon_landing", $current_url: "https://helicon.sh/" }),
    });
    client.capture("download_click", { placement: "hero", site: "override" }, { beacon: true });
    page.dispatchEvent(new Event("pagehide"));

    expect(sendBeacon).toHaveBeenCalledOnce();
    const [url, body] = sendBeacon.mock.calls[0]!;
    expect(url).toBe("/relay-hx/batch/");
    const sent = JSON.parse(await body.text());
    expect(sent.api_key).toBe("phc_test");
    expect(sent.batch).toHaveLength(1);
    expect(sent.batch[0]).toMatchObject({
      event: "download_click",
      properties: {
        distinct_id: "visitor-1",
        site: "override",
        placement: "hero",
        $current_url: "https://helicon.sh/",
      },
    });
    expect(typeof sent.batch[0].timestamp).toBe("string");

    // Sent once: a later pagehide or PostHog coming up does not send it again.
    page.dispatchEvent(new Event("pagehide"));
    expect(sendBeacon).toHaveBeenCalledOnce();
    const posthog = fake();
    client.posthogReady(posthog);
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("keeps waiting events when there is no id to send them under", () => {
    const page = new EventTarget();
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal("window", page);
    vi.stubGlobal("navigator", { sendBeacon });

    client.posthogStarting({ key: "phc_test", host: "/relay-hx", distinctId: () => undefined, properties: () => ({}) });
    client.capture("download_click");
    page.dispatchEvent(new Event("pagehide"));
    expect(sendBeacon).not.toHaveBeenCalled();

    // A page restored from the back-forward cache still delivers them once PostHog is up.
    const posthog = fake();
    client.posthogReady(posthog);
    expect(posthog.capture).toHaveBeenCalledWith("download_click", undefined, undefined);
  });
});
