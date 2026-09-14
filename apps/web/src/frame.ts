import { getCurrentWindow } from "@tauri-apps/api/window";
import type { WindowFrame } from "@helicon/ui";

declare global {
  interface Window {
    /** Set by the desktop shell before the page loads when the window has no native title bar. */
    __HELICON_FRAME__?: string;
    /** Set by the desktop shell before the page loads when macOS traffic lights float over the UI. */
    __HELICON_TITLEBAR__?: string;
  }
}

/** True on macOS, where the desktop shell overlays the traffic lights on the sidebar. */
export function titlebarOverlay(): boolean {
  return window.__HELICON_TITLEBAR__ === "overlay";
}

/** Window controls for the desktop shell's frameless window; undefined in a browser. */
export function desktopFrame(): WindowFrame | undefined {
  if (window.__HELICON_FRAME__ !== "custom") {
    return undefined;
  }
  const win = getCurrentWindow();
  const run = (action: Promise<unknown>) => {
    action.catch((error: unknown) => console.error("Helicon: window control failed", error));
  };
  return {
    minimize: () => run(win.minimize()),
    toggleMaximize: () => run(win.toggleMaximize()),
    close: () => run(win.close()),
    startDragging: () => run(win.startDragging()),
    isMaximized: () => win.isMaximized(),
    onResized: (callback) => {
      const pending = win.onResized(() => callback());
      return () => {
        pending.then(
          (unlisten) => unlisten(),
          () => undefined,
        );
      };
    },
  };
}
