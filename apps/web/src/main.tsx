import { StrictMode, useState, type ReactNode } from "react";
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
 * in its side panel: one folder, threads as tabs. `host=editor` hands file links to the editor.
 * Read once, at load.
 */
function hostOptions(): { panel?: { cwd: string | null }; hostTheme?: "light" | "dark"; editorHost?: boolean } {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get("theme");
  return {
    ...(params.get("view") === "panel" ? { panel: { cwd: params.get("cwd") || null } } : {}),
    ...(theme === "light" || theme === "dark" ? { hostTheme: theme } : {}),
    ...(params.get("host") === "editor" ? { editorHost: true } : {}),
  };
}

/**
 * The hosted demo on a phone uses the compact layout built for an editor's side panel: one project, threads
 * as tabs. The full sidebar layout needs a desktop-width window.
 */
function tryOnPhone(): { panel: { cwd: string } } | Record<string, never> {
  return import.meta.env.VITE_TRY && window.innerWidth < 720 ? { panel: { cwd: "/Users/you/code/api-server" } } : {};
}

const host = { ...hostOptions(), ...tryOnPhone() };

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
async function clientFactory(): Promise<{ makeClient: () => HeliconClient; banner: ReactNode }> {
  if (import.meta.env.MODE === "demo") {
    const [{ DemoClient }, { TryBanner }] = await Promise.all([import("./demo/client.js"), import("./demo/TryBanner.js")]);
    // The hosted demo at helicon.sh/try says what it is and how to get the real app; local demo runs stay bare.
    if (!import.meta.env.VITE_TRY) return { makeClient: () => new DemoClient(), banner: null };
    // helicon.sh/try only: count the visit and each prompt sent (never its text), like the landing pages.
    const { captureTry } = await import("./demo/tryAnalytics.js");
    captureTry("$pageview");
    const makeClient = () => {
      const client = new DemoClient();
      const sendTurn = client.sendTurn.bind(client);
      client.sendTurn = (...args) => {
        captureTry("try_prompt_sent");
        return sendTurn(...args);
      };
      return client;
    };
    return { makeClient, banner: <TryBanner /> };
  }
  return { makeClient: () => new WebHeliconClient(), banner: null };
}

void clientFactory().then(({ makeClient, banner }) =>
  createRoot(root).render(
    <StrictMode>
      {banner ? (
        <div className="flex h-full flex-col">
          {banner}
          <div className="min-h-0 flex-1">
            <Root makeClient={makeClient} />
          </div>
        </div>
      ) : (
        <Root makeClient={makeClient} />
      )}
    </StrictMode>,
  ),
);
