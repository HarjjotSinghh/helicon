import posthog from "posthog-js";
import { ANON_COOKIE, parseVisitorOs } from "./lib/os";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

function readCookie(name: string) {
  const row = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return row ? decodeURIComponent(row.slice(name.length + 1)) : undefined;
}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

if (key && !isLocalHost(window.location.hostname)) {
  const persisted = readCookie(`ph_${key}_posthog`);
  const anon = readCookie(ANON_COOKIE);

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    ui_host: "https://us.posthog.com",
    defaults: "2026-05-30",
    autocapture: true,
    capture_pageview: "history_change",
    capture_pageleave: true,
    capture_dead_clicks: true,
    capture_heatmaps: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
    },
    persistence: "localStorage+cookie",
    bootstrap: !persisted && anon ? { distinctID: anon } : undefined,
    loaded: (client) => {
      const uaData = (navigator as Navigator & { userAgentData?: { platform: string; mobile: boolean } })
        .userAgentData;
      client.register({
        site: "helicon_landing",
        visitor_os: parseVisitorOs(
          navigator.userAgent,
          uaData ? { platform: uaData.platform, mobile: uaData.mobile } : undefined,
        ),
      });
      client.startSessionRecording();
    },
  });
}
