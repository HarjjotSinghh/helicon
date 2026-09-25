import { afterEach, describe, expect, it, vi } from "vitest";
import { isInternalRequest, track } from "../src/lib/analytics";

const request = (headers: Record<string, string>) => new Request("https://helicon.sh/download/windows", { headers });

describe("internal browsers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("recognises the cookie that ?internal=1 sets", () => {
    expect(isInternalRequest(request({ cookie: "a=1; helicon-internal=1; b=2" }))).toBe(true);
    expect(isInternalRequest(request({ cookie: "helicon-internal=0" }))).toBe(false);
    expect(isInternalRequest(request({}))).toBe(false);
  });

  it("sends nothing for the maintainer's own downloads", async () => {
    vi.stubEnv("POSTHOG_KEY", "phc_test");
    const fetchSpy = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchSpy);

    await track("installer_download", {}, "someone", request({ host: "helicon.sh", cookie: "helicon-internal=1" }));
    expect(fetchSpy).not.toHaveBeenCalled();

    await track("installer_download", {}, "someone", request({ host: "helicon.sh" }));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
