"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement, type RefObject } from "react";
import { ControllerProvider, useApp, useController } from "@/product/app/context";
import { NewThread, Welcome } from "@/product/components/home/Home";
import { CommandPalette } from "@/product/components/palette/CommandPalette";
import { SettingsPage } from "@/product/components/settings/SettingsPage";
import { Sidebar } from "@/product/components/sidebar/Sidebar";
import { ThreadView } from "@/product/components/thread/ThreadView";
import { TooltipProvider } from "@/product/components/ui/overlays";
import { cn, isMac } from "@/product/components/ui/primitives";
import { ThemedImage } from "@/components/ui";
import { Toasts } from "@/product/components/ui/Toasts";
import { UsagePage } from "@/product/components/usage/UsagePage";
import { HeliconController, type Platform } from "@/product/model/controller";
import { DemoClient, PROJECTS } from "./client";
import { readThemePref, setThemePref, subscribeThemePref } from "@/lib/theme";
import { PortalContainer } from "./portal";

/*
 * Focus rules for demos, applied to every focus call inside one:
 * - It never scrolls the landing page. Product code focuses pickers, sliders and menus as they
 *   open, sometimes before they are positioned, and the browser would scroll to that spot.
 * - It only moves focus into a demo the visitor is already using (focus is inside it, or they just
 *   clicked or pressed a key in it). A demo that opens something by itself, like the tour's command
 *   palette, cannot pull focus away from wherever the visitor is on the page.
 */
if (typeof window !== "undefined" && !(window as { __heliconFocusPatch?: boolean }).__heliconFocusPatch) {
  (window as { __heliconFocusPatch?: boolean }).__heliconFocusPatch = true;
  let gesture: { at: number; target: EventTarget | null } = { at: 0, target: null };
  const record = (event: Event) => {
    gesture = { at: Date.now(), target: event.target };
  };
  document.addEventListener("pointerdown", record, true);
  document.addEventListener("keydown", record, true);
  const using = (demo: Element) =>
    demo.contains(document.activeElement) ||
    (Date.now() - gesture.at < 1500 && gesture.target instanceof Node && demo.contains(gesture.target));
  const focus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (this: HTMLElement, options?: FocusOptions) {
    const demo = this.closest(".helicon-app");
    if (!demo) return focus.call(this, options);
    if (using(demo)) focus.call(this, { ...options, preventScroll: true });
  };
  // Some paths focus without calling focus() on the element; send those back where they came from.
  document.addEventListener(
    "focusin",
    (event) => {
      const target = event.target as HTMLElement;
      const demo = target.closest?.(".helicon-app");
      if (!demo || demo.contains(event.relatedTarget as Node | null)) return;
      if (Date.now() - gesture.at < 1500 && gesture.target instanceof Node && demo.contains(gesture.target)) return;
      const back = event.relatedTarget as HTMLElement | null;
      if (back && back.isConnected) focus.call(back, { preventScroll: true });
      else target.blur();
    },
    true,
  );
}

/** Interface zoom last chosen in any landing demo, so tour screens keep it. */
let sharedDemoZoom = 1;

function DemoZoom({ host }: { host: RefObject<HTMLDivElement | null> }) {
  const zoom = useApp((s) => s.prefs.zoom);
  useLayoutEffect(() => {
    sharedDemoZoom = zoom;
    const node = host.current;
    if (!node) return;
    const style = node.style as CSSStyleDeclaration & { zoom?: string };
    if ("zoom" in style) {
      style.zoom = zoom === 1 ? "" : String(zoom);
      node.style.fontSize = "";
    } else {
      node.style.fontSize = zoom === 1 ? "" : `${Math.round(16 * zoom * 100) / 100}px`;
    }
  }, [host, zoom]);
  return null;
}

/** Routing, prefs and timers live in memory, so a demo never touches the page URL or storage. */
function memoryPlatform(hash: string, prefs: Record<string, unknown> = {}): Platform {
  let current = hash;
  return {
    loadPrefs: () => ({ lastProject: PROJECTS.readme, contributorAck: true, theme: readThemePref(), ...prefs }),
    savePrefs: () => {},
    readHash: () => current,
    writeHash: (next) => {
      current = next;
    },
    onHashChange: () => () => {},
    now: () => Date.now(),
    schedule: (fn, ms) => setTimeout(fn, ms),
    cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    focused: () => true,
  };
}

/** The product's own shell (HeliconApp's Shell and Main), without the desktop window chrome. */
function Shell() {
  const env = useApp((s) => s.env);
  const collapsed = useApp((s) => s.prefs.sidebarCollapsed);
  if (!env) return <div className="h-full w-full bg-bg" />;
  return (
    <div className="flex h-full w-full bg-bg text-fg">
      <div
        className={cn(
          "grid h-full transition-[grid-template-columns,visibility] duration-200 ease-drawer motion-reduce:transition-none",
          collapsed ? "invisible grid-cols-[0fr]" : "visible grid-cols-[1fr]",
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

/** Just the product sidebar, stretched to the card, for compact feature previews. */
function SidebarOnly() {
  const env = useApp((s) => s.env);
  if (!env) return <div className="h-full w-full bg-sidebar" />;
  return (
    <div className="h-full w-full bg-sidebar [&>aside]:!w-full [&>aside]:border-r-0">
      <Sidebar />
    </div>
  );
}

function Main(): ReactElement | null {
  const route = useApp((s) => s.route);
  const loaded = useApp((s) => s.sessionsLoaded);
  const hasProjects = useApp((s) => s.projects.length > 0);
  const lastProject = useApp((s) => s.prefs.lastProject);
  if (!loaded) return null;
  if (route.kind === "usage") return <UsagePage />;
  if (route.kind === "settings") return <SettingsPage />;
  if (route.kind === "thread") return <ThreadView key={route.sessionId} sessionId={route.sessionId} />;
  if (!hasProjects) return <Welcome />;
  return <NewThread cwd={route.kind === "new" ? route.cwd : lastProject} />;
}

/**
 * Keeps the demo's Appearance setting and the page theme in step, both ways. Only a real change
 * is written, so mounting (or React's development double-mount) never overwrites the saved choice.
 */
function ThemeBridge() {
  const controller = useController();
  const theme = useApp((s) => s.prefs.theme);
  const last = useRef(theme);
  useEffect(() => {
    if (theme === last.current) return;
    last.current = theme;
    if (readThemePref() !== theme) setThemePref(theme);
  }, [theme]);
  useEffect(
    () =>
      subscribeThemePref(() => {
        const pref = readThemePref();
        if (controller.store.get().prefs.theme !== pref) {
          last.current = pref;
          controller.setPrefs({ theme: pref });
        }
      }),
    [controller],
  );
  return null;
}

/** Dialogs are non-modal in demos, so the dimmed backdrop the app draws is supplied here. */
function Scrim() {
  const controller = useController();
  const open = useApp((s) => s.paletteOpen || s.addProjectOpen);
  if (!open) return null;
  return (
    <div
      aria-hidden="true"
      onClick={() => {
        controller.setPaletteOpen(false);
        controller.setAddProjectOpen(false);
      }}
      className="overlay-fade absolute inset-0 z-[var(--z-overlay)] bg-[oklch(0.1_0.01_255/0.45)]"
    />
  );
}

function OpenPalette({ open }: { open: boolean }) {
  const controller = useController();
  const loaded = useApp((s) => s.sessionsLoaded);
  useEffect(() => {
    if (open && loaded) controller.setPaletteOpen(true);
  }, [controller, loaded, open]);
  return null;
}

export type DemoAppProps = {
  /** Starting screen, as the app's own hash route: "#/t/<id>", "#/usage", "#/settings", or "" for home. */
  route?: string;
  /** Opens the command palette once the app has loaded. */
  palette?: boolean;
  /** The layout size the app is drawn at before it scales down to fit. */
  width?: number;
  height?: number;
  className?: string;
  label: string;
  /** "app" draws the whole window; "sidebar" draws only the project sidebar. */
  view?: "app" | "sidebar";
  /** Draw at the container's own width instead of scaling a fixed layout. */
  fluid?: boolean;
  /** Shown below the md breakpoint instead of a scaled-down live app. */
  poster?: { light: string; dark: string; alt: string };
};

export function DemoApp({ route = "", palette = false, width = 1100, height = 700, className, label, view = "app", fluid = false, poster }: DemoAppProps) {
  const [controller] = useState(() => new HeliconController(
      new DemoClient(),
      // Sidebar card: only api-server expanded. Phone tour: main pane only, keep the last zoom.
      memoryPlatform(route, {
        zoom: sharedDemoZoom,
        ...(view === "sidebar"
          ? { collapsedProjects: [PROJECTS.readme, PROJECTS.helicon] }
          : { sidebarCollapsed: true }),
      }),
    ));
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const outer = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const userSidebar = useRef(false);
  const [scale, setScale] = useState(1);
  const [fluidWidth, setFluidWidth] = useState<number | null>(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setWide(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const compact = view === "app" && !wide;
  const showPoster = Boolean(poster) && view === "app" && !compact && !wide;
  const showLive = !showPoster;
  const layoutHeight = compact ? 560 : height;

  useLayoutEffect(() => {
    if (view !== "app" || userSidebar.current) return;
    const collapsed = controller.store.get().prefs.sidebarCollapsed;
    if (wide && collapsed) controller.setPrefs({ sidebarCollapsed: false });
    if (!wide && !collapsed) controller.setPrefs({ sidebarCollapsed: true });
  }, [controller, view, wide]);

  useEffect(() => {
    if (!showLive) return;
    const stop = controller.start();
    return () => {
      stop();
    };
  }, [controller, showLive]);

  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const measure = () => {
      if (fluid || compact) {
        setFluidWidth(el.clientWidth);
        setScale(1);
      } else {
        setScale(Math.min(1, el.clientWidth / width));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact, fluid, width]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const mod = isMac ? event.metaKey : event.ctrlKey;
    if (mod && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      controller.setPaletteOpen(!controller.store.get().paletteOpen);
    } else if (mod && !event.shiftKey && event.key.toLowerCase() === "b") {
      event.preventDefault();
      userSidebar.current = true;
      controller.toggleSidebar();
    }
  }

  return (
    <>
    {showPoster && poster ? <ThemedImage light={poster.light} dark={poster.dark} alt={poster.alt} /> : null}
    {showLive ? (
    <div ref={outer} className={cn("relative w-full overflow-hidden", className)} style={{ height: layoutHeight * scale }}>
      <div
        ref={host}
        role="region"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="helicon-app absolute top-0 left-0 origin-top-left overflow-hidden"
        style={{ width: fluid || compact ? (fluidWidth ?? "100%") : width, height: layoutHeight, transform: `scale(${scale})` }}
      >
        <ControllerProvider controller={controller}>
          <PortalContainer value={portal}>
            <TooltipProvider>
              <ThemeBridge />
              <DemoZoom host={host} />
              {/* Overlays wait for their mount point, so nothing ever opens on the page body. */}
              {portal ? <OpenPalette open={palette} /> : null}
              {view === "sidebar" ? <SidebarOnly /> : <Shell />}
              <Scrim />
              {portal ? <CommandPalette /> : null}
              <Toasts />
            </TooltipProvider>
          </PortalContainer>
        </ControllerProvider>
        <div ref={setPortal} className="contents" />
      </div>
    </div>
    ) : null}
    {scale < 0.6 && showLive && !compact && !poster ? (
      <p className="border-t border-line px-4 py-2.5 text-center text-[12.5px] text-subtle">
        Shrunk to fit your screen. Open this page on a laptop to try the app at full size.
      </p>
    ) : null}
    </>
  );
}
