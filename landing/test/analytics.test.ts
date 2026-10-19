import { afterEach, describe, expect, it, vi } from "vitest";
import { isInternalRequest, track } from "../src/lib/analytics";
import {
  attributionFromSearchParams,
  firstTouchFrom,
  firstTouchProperties,
  isDownloadHref,
  withAttribution,
} from "../src/lib/download-attribution";

vi.mock("../src/lib/github-release", () => ({
  latestInstaller: async () => ({ name: "Helicon.dmg", version: "0.22.2", url: "https://github.com/x/Helicon.dmg" }),
}));

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

describe("download attribution", () => {
  const origin = "https://helicon.sh";
  const browserUa =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("records an external referrer and the launch tags as the first touch", () => {
    expect(
      firstTouchFrom("https://helicon.sh/?ref=producthunt&utm_source=ph", "https://www.producthunt.com/posts/helicon", "helicon.sh"),
    ).toEqual({ referring_domain: "www.producthunt.com", ref: "producthunt", utm_source: "ph" });
    expect(firstTouchFrom("https://helicon.sh/features", "https://helicon.sh/", "helicon.sh")).toEqual({
      referring_domain: "$direct",
    });
  });

  it("only touches our own installer links", () => {
    expect(isDownloadHref("/download/macos?src=hero", origin)).toBe(true);
    expect(isDownloadHref("https://helicon.sh/download/windows", origin)).toBe(true);
    expect(isDownloadHref("/features", origin)).toBe(false);
    expect(isDownloadHref("https://evil.example/download/macos", origin)).toBe(false);
  });

  it("round-trips identity and first touch through the link", () => {
    const href = withAttribution("/download/macos?src=hero", origin, {
      distinctId: "01a145d9-871e-7e1a-a845-7b8a3d6b0573",
      sessionId: "01a145d9-0000-7000-8000-000000000001",
      firstTouch: { referring_domain: "www.producthunt.com", ref: "producthunt", utm_campaign: "launch" },
    });
    expect(href.startsWith("/download/macos?src=hero&")).toBe(true);
    const back = attributionFromSearchParams(new URL(href, origin).searchParams, null, "helicon.sh");
    expect(back).toEqual({
      distinctId: "01a145d9-871e-7e1a-a845-7b8a3d6b0573",
      sessionId: "01a145d9-0000-7000-8000-000000000001",
      firstTouch: { referring_domain: "www.producthunt.com", ref: "producthunt", utm_campaign: "launch" },
    });
    expect(firstTouchProperties(back.firstTouch)).toEqual({
      $referring_domain: "www.producthunt.com",
      ref: "producthunt",
      utm_campaign: "launch",
    });
  });

  it("rejects ids that are not ids", () => {
    const search = new URLSearchParams({ hx_did: "a b<script>", hx_sid: "anonymous" });
    const back = attributionFromSearchParams(search, null, "helicon.sh");
    expect(back.distinctId).toBeUndefined();
    expect(back.sessionId).toBeUndefined();
  });

  it("falls back to the Referer when the link has no first touch", () => {
    const ours = attributionFromSearchParams(
      new URLSearchParams(),
      "https://helicon.sh/?utm_source=youtube&ref=producthunt",
      "helicon.sh",
    );
    expect(ours.firstTouch).toEqual({ utm_source: "youtube", ref: "producthunt" });
    const theirs = attributionFromSearchParams(new URLSearchParams(), "https://www.google.com/", "helicon.sh");
    expect(theirs.firstTouch).toEqual({ referring_domain: "www.google.com" });
  });

  it("counts the download as the person in the link when PostHog's cookie is missing", async () => {
    vi.stubEnv("POSTHOG_KEY", "phc_test");
    const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) => new Response("{}"));
    vi.stubGlobal("fetch", fetchSpy);
    const { GET } = await import("../src/app/(site)/download/[os]/route");

    const href = withAttribution("/download/macos?src=hero", origin, {
      distinctId: "visitor-from-posthog",
      sessionId: "session-1",
      firstTouch: { referring_domain: "www.producthunt.com", ref: "producthunt" },
    });
    const response = await GET(
      new Request(new URL(href, origin), {
        headers: { host: "helicon.sh", "user-agent": browserUa, cookie: "helicon-anon=stale-anon-id" },
      }),
      { params: Promise.resolve({ os: "macos" }) },
    );

    expect(response.status).toBe(302);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchSpy.mock.calls[0][1].body));
    expect(body.event).toBe("installer_download");
    expect(body.distinct_id).toBe("visitor-from-posthog");
    expect(body.properties).toMatchObject({
      $session_id: "session-1",
      $referring_domain: "www.producthunt.com",
      ref: "producthunt",
      identity_source: "link",
      $set_once: { $initial_referring_domain: "www.producthunt.com", $initial_ref: "producthunt" },
    });
  });

  it("keeps PostHog's own cookie ahead of an id in the link", async () => {
    vi.stubEnv("POSTHOG_KEY", "phc_test");
    const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) => new Response("{}"));
    vi.stubGlobal("fetch", fetchSpy);
    const { GET } = await import("../src/app/(site)/download/[os]/route");

    const persisted = encodeURIComponent(JSON.stringify({ distinct_id: "cookie-person", $sesid: [0, "cookie-session", 0] }));
    const href = withAttribution("/download/macos?src=hero", origin, { distinctId: "someone-else" });
    await GET(
      new Request(new URL(href, origin), {
        headers: { host: "helicon.sh", "user-agent": browserUa, cookie: `ph_phc_test_posthog=${persisted}` },
      }),
      { params: Promise.resolve({ os: "macos" }) },
    );

    const body = JSON.parse(String(fetchSpy.mock.calls[0][1].body));
    expect(body.distinct_id).toBe("cookie-person");
    expect(body.properties).toMatchObject({ $session_id: "cookie-session", identity_source: "cookie" });
  });
});
