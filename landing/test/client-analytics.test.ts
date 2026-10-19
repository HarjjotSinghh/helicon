import { beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.fn();
const deviceClass = vi.fn<() => "mobile" | "desktop">();

vi.mock("../src/lib/device", () => ({ deviceClass }));

const { trackHref } = await import("../src/lib/client-analytics");
const { posthogReady } = await import("../src/lib/posthog-client");
posthogReady({ capture } as unknown as Parameters<typeof posthogReady>[0]);

describe("trackHref", () => {
  beforeEach(() => {
    capture.mockClear();
    deviceClass.mockReset();
  });

  it("tags a download click with the device, so funnels can drop phone taps", () => {
    deviceClass.mockReturnValue("mobile");
    trackHref("/download/windows?src=hero", { placement: "hero" });
    expect(capture).toHaveBeenCalledWith(
      "download_click",
      expect.objectContaining({ target_os: "windows", placement: "hero", device: "mobile" }),
      { transport: "sendBeacon" },
    );

    deviceClass.mockReturnValue("desktop");
    trackHref("#install", { placement: "header" });
    expect(capture).toHaveBeenLastCalledWith(
      "download_click",
      expect.objectContaining({ target_os: "undecided", device: "desktop" }),
      { transport: "sendBeacon" },
    );
  });

  it("leaves other events without a device property", () => {
    deviceClass.mockReturnValue("mobile");
    trackHref("/try", { placement: "hero" });
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls[0][1]).not.toHaveProperty("device");
  });
});
