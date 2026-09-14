import { useEffect, useState, type ReactElement } from "react";
import type { HeliconClient } from "../client.js";
import { AddProjectDialog } from "../components/sidebar/AddProjectDialog.js";
import { BootError, BootScreen, NewThread, Onboarding, Welcome } from "../components/home/Home.js";
import { CommandPalette } from "../components/palette/CommandPalette.js";
import { SettingsPage } from "../components/settings/SettingsPage.js";
import { Sidebar } from "../components/sidebar/Sidebar.js";
import { ThreadView } from "../components/thread/ThreadView.js";
import { UsagePage } from "../components/usage/UsagePage.js";
import { TooltipProvider } from "../components/ui/overlays.js";
import { cn, isMac } from "../components/ui/primitives.js";
import { Toasts } from "../components/ui/Toasts.js";
import { HeliconController, type Platform } from "../model/controller.js";
import type { Notifier } from "../model/notify.js";
import type { AppUpdater } from "../model/updates.js";
import { ControllerProvider, useApp, useController } from "./context.js";
import { FrameProvider, FrameStrip, WindowControls, type WindowFrame } from "./frame.js";

export interface HeliconAppProps {
  client: HeliconClient;
  platform?: Platform;
  /** Present when a desktop shell wants the UI to draw the window's title bar. */
  frame?: WindowFrame;
  /** Present when the shell can update itself. */
  updater?: AppUpdater;
  /** How this shell raises a system notification; absent where it cannot. */
  notifier?: Notifier;
}

/** The whole Helicon interface. Web and desktop shells mount this with their transport. */
export function HeliconApp(props: HeliconAppProps) {
  const [controller] = useState(() => {
    const created = new HeliconController(props.client, props.platform);
    if (props.updater) {
      created.attachUpdater(props.updater);
    }
    if (props.notifier) {
      created.attachNotifier(props.notifier);
    }
    return created;
  });
  useEffect(() => controller.start(), [controller]);
  return (
    <ControllerProvider controller={controller}>
      <FrameProvider frame={props.frame}>
        <TooltipProvider>
          <ThemeSync />
          <GlobalShortcuts />
          <Shell />
          <CommandPalette />
          <AddProjectDialog />
          <Toasts />
          <WindowControls />
        </TooltipProvider>
      </FrameProvider>
    </ControllerProvider>
  );
}

function ThemeSync() {
  const theme = useApp((s) => s.prefs.theme);
  const codeTheme = useApp((s) => s.prefs.codeTheme);
  useEffect(() => {
    document.documentElement.dataset["codeTheme"] = codeTheme;
  }, [codeTheme]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset["theme"] = theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    if (theme !== "system") {
      return;
    }
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return null;
}

function GlobalShortcuts() {
  const controller = useController();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = isMac ? event.metaKey : event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && !event.shiftKey && !event.altKey && key === "k") {
        event.preventDefault();
        controller.setPaletteOpen(!controller.store.get().paletteOpen);
      } else if (mod && event.shiftKey && key === "o") {
        event.preventDefault();
        controller.newThread();
      } else if (mod && !event.shiftKey && key === "b") {
        event.preventDefault();
        controller.toggleSidebar();
      } else if (event.altKey && !mod && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        const state = controller.store.get();
        const ordered = Object.values(state.sessions).sort((a, b) => (a.activityAt < b.activityAt ? 1 : -1));
        if (ordered.length === 0) {
          return;
        }
        event.preventDefault();
        const current = state.route.kind === "thread" ? ordered.findIndex((s) => s.sessionId === (state.route as { sessionId: string }).sessionId) : -1;
        const next = event.key === "ArrowDown" ? Math.min(ordered.length - 1, current + 1) : Math.max(0, current - 1);
        const target = ordered[next];
        if (target) {
          controller.openThread(target.sessionId);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controller]);
  return null;
}

function Shell() {
  const boot = useApp((s) => s.boot);
  const env = useApp((s) => s.env);
  const collapsed = useApp((s) => s.prefs.sidebarCollapsed);
  // Boot, setup and error screens fill the window with no header, so they get a bare drag strip.
  let screen: ReactElement | null = null;
  if (!env) {
    screen = boot === "error" ? <BootError /> : <BootScreen />;
  } else if (!env.museFound) {
    screen = <Onboarding />;
  } else if (boot === "error") {
    screen = <BootError />;
  }
  if (screen) {
    return (
      <>
        {screen}
        <FrameStrip />
      </>
    );
  }
  return (
    <div className="flex h-full w-full bg-bg text-fg">
      {/* The sidebar stays mounted and wipes open/closed via the 0fr/1fr
          disclosure trick; visibility flips at the end of the close so the
          clipped panel leaves the tab order only once it is gone. */}
      <div
        className={cn(
          "grid h-full transition-[grid-template-columns,visibility] duration-200 ease-drawer motion-reduce:transition-none",
          collapsed ? "grid-cols-[0fr] invisible" : "grid-cols-[1fr] visible",
        )}
      >
        <div className="min-w-0 overflow-hidden">
          <Sidebar />
        </div>
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        <Main />
      </main>
    </div>
  );
}

function Main() {
  const route = useApp((s) => s.route);
  const loaded = useApp((s) => s.sessionsLoaded);
  const hasProjects = useApp((s) => s.projects.length > 0);
  const lastProject = useApp((s) => s.prefs.lastProject);
  if (!loaded) {
    return null;
  }
  if (route.kind === "usage") {
    return <UsagePage />;
  }
  if (route.kind === "settings") {
    return <SettingsPage />;
  }
  if (route.kind === "thread") {
    return <ThreadView key={route.sessionId} sessionId={route.sessionId} />;
  }
  if (!hasProjects) {
    return <Welcome />;
  }
  return <NewThread cwd={route.kind === "new" ? route.cwd : lastProject} />;
}
