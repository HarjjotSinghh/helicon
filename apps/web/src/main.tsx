import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { HeliconApp, type HeliconClient } from "@helicon/ui";
import { Connect } from "./Connect.js";
import { desktopFrame, titlebarOverlay, bindDesktopZoom } from "./frame.js";
import { bindDesktopLinks } from "./links.js";
import { appNotifier } from "./notifier.js";
import { desktopUpdater } from "./updater.js";
import { WebHeliconClient } from "./webClient.js";
import "./theme.css";

bindDesktopZoom();
bindDesktopLinks();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Helicon: missing #root element.");
}

/**
 * `?view=panel&cwd=<folder>&theme=<light|dark>` asks for the compact layout an editor extension shows
 * in its side panel: one folder, threads as tabs. Read once, at load.
 */
function hostOptions(): { panel?: { cwd: string | null }; hostTheme?: "light" | "dark" } {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get("theme");
  return {
    ...(params.get("view") === "panel" ? { panel: { cwd: params.get("cwd") || null } } : {}),
    ...(theme === "light" || theme === "dark" ? { hostTheme: theme } : {}),
  };
}

const host = hostOptions();

/**
 * `#/connect` picks the daemon this page talks to. It is read before the app mounts, because the
 * client reads its address once at module load and every open stream belongs to that address.
 */
function Root({ makeClient }: { makeClient: () => HeliconClient }) {
  const [connecting, setConnecting] = useState(window.location.hash === "#/connect");
  if (connecting) {
    return (
      <Connect
        onDone={() => {
          setConnecting(false);
          // A reload, not a re-render: the client keeps its address and its stream from load time.
          window.location.replace(window.location.pathname);
        }}
      />
    );
  }
  return (
    <HeliconApp
      client={makeClient()}
      frame={desktopFrame()}
      titlebarOverlay={titlebarOverlay()}
      updater={desktopUpdater()}
      notifier={appNotifier()}
      {...host}
    />
  );
}

/**
 * `npm run dev:demo` swaps the server for an in-memory client with sample projects and threads, so
 * the UI can be worked on without muse. The flag is fixed at build time, so release builds drop it.
 */
async function clientFactory(): Promise<() => HeliconClient> {
  if (import.meta.env.MODE === "demo") {
    const { DemoClient } = await import("./demo/client.js");
    return () => new DemoClient();
  }
  return () => new WebHeliconClient();
}

void clientFactory().then((makeClient) =>
  createRoot(root).render(
    <StrictMode>
      <Root makeClient={makeClient} />
    </StrictMode>,
  ),
);
