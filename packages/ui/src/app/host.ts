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

let editorHosted = false;

/** Marks the page as framed by an editor, which then handles copying and opening files. */
export function setEditorHosted(hosted: boolean): void {
  editorHosted = hosted;
}

/**
 * Copies text. Inside an editor's webview the browser clipboard is blocked for framed pages, so
 * the editor copies it instead; elsewhere this is the ordinary clipboard API.
 */
export function copyText(text: string): Promise<void> {
  if (editorHosted && framed()) {
    postToHost({ type: "helicon-command", command: "copy", args: { text } });
    return Promise.resolve();
  }
  return navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error("No clipboard"));
}

type Editable = HTMLInputElement | HTMLTextAreaElement;

function editableTarget(): Editable | null {
  const el = document.activeElement;
  if (el instanceof HTMLTextAreaElement) {
    return el;
  }
  if (el instanceof HTMLInputElement && /^(text|search|url|email|password|tel|number)$/.test(el.type)) {
    return el;
  }
  return null;
}

let pasteSeq = 0;
const pastes = new Map<number, (text: string) => void>();

/** Asks the editor for its clipboard text; resolves with "" if it doesn't answer. */
function readHostClipboard(): Promise<string> {
  const id = ++pasteSeq;
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      pastes.delete(id);
      resolve("");
    }, 2000);
    pastes.set(id, (text) => {
      window.clearTimeout(timer);
      resolve(text);
    });
    postToHost({ type: "helicon-command", command: "paste", args: { id } });
  });
}

/** Types text at the caret the way a paste would, so React sees an ordinary input event. */
function insertText(el: Editable, text: string): void {
  el.focus();
  if (!document.execCommand("insertText", false, text)) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    el.setRangeText(text, start, end, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/**
 * Inside an editor's webview the editor handles Cmd+C/X/V/A itself and never reaches a framed
 * page, so neither copying a selection nor pasting into the composer works. With an editor host,
 * Helicon takes those four keys and goes through the editor's clipboard instead.
 */
export function installEditorClipboard(isMac: boolean): () => void {
  const onKey = (event: KeyboardEvent) => {
    const mod = isMac ? event.metaKey : event.ctrlKey;
    if (!mod || event.altKey || event.shiftKey) {
      return;
    }
    const key = event.key.toLowerCase();
    const field = editableTarget();
    if (key === "c" || key === "x") {
      const text = field
        ? field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0)
        : (window.getSelection()?.toString() ?? "");
      if (!text) {
        return;
      }
      event.preventDefault();
      void copyText(text);
      if (key === "x" && field) {
        insertText(field, "");
      }
    } else if (key === "v" && field) {
      event.preventDefault();
      void readHostClipboard().then((text) => {
        if (text) {
          insertText(field, text);
        }
      });
    } else if (key === "a" && field) {
      event.preventDefault();
      field.select();
    }
  };
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: unknown; id?: unknown; text?: unknown } | null;
    if (event.source === window.parent && data?.type === "helicon-paste" && typeof data.id === "number") {
      pastes.get(data.id)?.(typeof data.text === "string" ? data.text : "");
      pastes.delete(data.id);
    }
  };
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("message", onMessage);
  return () => {
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("message", onMessage);
  };
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
