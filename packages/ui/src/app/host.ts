import { useEffect, useState } from "react";

/**
 * Talking to a host page that frames Helicon, such as an editor extension's webview. The host
 * sends its theme (light or dark) and its own colors and font, so Helicon matches the editor
 * around it; Helicon can ask the host to run a command it can't, like opening a folder.
 */

/** Editor theme colors the host forwards, keyed by the name after `--vscode-`. */
export type HostVars = Partial<Record<string, string>>;

/** Which Helicon token each editor color stands in for, first match wins. */
const TOKEN_SOURCES: Record<string, string[]> = {
  "--bg": ["surface"],
  "--bg-sidebar": ["surface"],
  "--bg-raised": ["input-background", "editorWidget-background"],
  "--bg-sunken": ["input-background"],
  "--bg-hover": ["list-hoverBackground", "toolbar-hoverBackground"],
  "--bg-active": ["list-inactiveSelectionBackground", "list-hoverBackground"],
  "--border": ["widget-border", "panel-border", "sideBarSectionHeader-border", "editorGroup-border"],
  "--border-strong": ["input-border", "contrastBorder", "widget-border", "panel-border"],
  "--fg": ["sideBar-foreground", "foreground"],
  "--fg-muted": ["descriptionForeground"],
  "--fg-subtle": ["disabledForeground", "descriptionForeground"],
  "--accent": ["button-background", "focusBorder"],
  "--accent-hover": ["button-hoverBackground", "button-background"],
  "--accent-fg": ["button-foreground"],
  "--accent-text": ["textLink-foreground"],
  "--scrollbar": ["scrollbarSlider-background"],
};

/** The stylesheet that maps editor colors onto Helicon's tokens, or "" to use Helicon's own. */
export function hostStylesheet(vars: HostVars): string {
  const rules: string[] = [];
  for (const [token, sources] of Object.entries(TOKEN_SOURCES)) {
    const value = sources.map((name) => vars[name]).find((v) => typeof v === "string" && v.trim() !== "");
    if (value) {
      rules.push(`${token}: ${value.trim()} !important;`);
    }
  }
  const font = vars["font-family"]?.trim();
  if (font) {
    rules.push(`--font-sans: ${font} !important;`);
  }
  const size = Number.parseFloat(vars["font-size"] ?? "");
  // Helicon's body text is text-sm (0.875rem); scale the root so it lands on the editor's size.
  const root = Number.isFinite(size) && size >= 10 && size <= 20 ? ` font-size: ${Math.round((size / 0.875) * 100) / 100}px !important;` : "";
  if (rules.length === 0 && !root) {
    return "";
  }
  return `html:root { ${rules.join(" ")}${root} }`;
}

function applyHostStyle(vars: HostVars): void {
  let el = document.getElementById("helicon-host-style") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "helicon-host-style";
    document.head.appendChild(el);
  }
  el.textContent = hostStylesheet(vars);
}

function framed(): boolean {
  return typeof window !== "undefined" && window.parent !== window;
}

/** Sends a message to the page framing Helicon, when there is one. */
export function postToHost(message: { type: string; [key: string]: unknown }): void {
  if (framed()) {
    window.parent.postMessage(message, "*");
  }
}

/**
 * The host's color scheme, starting from the one in the URL and following the host's messages.
 * Also applies the host's colors and font as they arrive. Null when nothing hosts Helicon.
 */
export function useHostTheme(initial: "light" | "dark" | undefined): "light" | "dark" | null {
  const [theme, setTheme] = useState<"light" | "dark" | null>(initial ?? null);
  useEffect(() => {
    if (!initial || !framed()) {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) {
        return;
      }
      const data = event.data as { type?: unknown; theme?: unknown; kind?: unknown; vars?: unknown } | null;
      if (data?.type === "helicon-theme" && (data.theme === "light" || data.theme === "dark")) {
        setTheme(data.theme);
      } else if (data?.type === "helicon-host-style") {
        if (data.kind === "light" || data.kind === "dark") {
          setTheme(data.kind);
        }
        if (data.vars && typeof data.vars === "object") {
          applyHostStyle(data.vars as HostVars);
        }
      }
    };
    window.addEventListener("message", onMessage);
    // The frame loads before this listener exists; ask for the host's colors now that it does.
    postToHost({ type: "helicon-host-ready" });
    return () => window.removeEventListener("message", onMessage);
  }, [initial]);
  return theme;
}
