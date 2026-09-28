import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";

/**
 * Helicon inside the editor. The extension runs the same helicon-server the desktop app bundles,
 * on the editor's own Node runtime, and shows the web UI: a compact one-folder panel in the side
 * bar, or the full app in an editor tab. Nothing is reimplemented: the server drives `muse serve`
 * over MSP, and the UI talks to the server.
 */

const LISTENING = /helicon-server listening on (http:\/\/\S+)/;
const START_TIMEOUT_MS = 20_000;
const VIEW_ID = "helicon.panel";

let output: vscode.OutputChannel;
let server: ServerHost | null = null;
let editorPanel: vscode.WebviewPanel | null = null;
let sideView: PanelView | null = null;

/** What the extension exposes to other code: only the tests use it. */
export interface HeliconApi {
  serverUrl(): Promise<string>;
  panelLoaded(): string | null;
}

export function activate(context: vscode.ExtensionContext): HeliconApi {
  output = vscode.window.createOutputChannel("Helicon");
  server = new ServerHost(context);
  sideView = new PanelView();
  context.subscriptions.push(
    output,
    { dispose: () => server?.stop() },
    vscode.window.registerWebviewViewProvider(VIEW_ID, sideView, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.window.onDidChangeActiveColorTheme(() => {
      const message = { type: "helicon-theme", theme: editorTheme() };
      void sideView?.post(message);
      void editorPanel?.webview.postMessage(message);
    }),
    vscode.commands.registerCommand("helicon.open", () => focusPanel()),
    vscode.commands.registerCommand("helicon.newThread", () => newThreadInPanel()),
    vscode.commands.registerCommand("helicon.openInEditor", () => openEditor(context)),
    vscode.commands.registerCommand("helicon.openForFolder", (uri?: vscode.Uri) => openForFolder(context, uri)),
    vscode.commands.registerCommand("helicon.openInBrowser", () => openInBrowser()),
    vscode.commands.registerCommand("helicon.restart", () => restart()),
    vscode.commands.registerCommand("helicon.showLog", () => output.show()),
  );
  return { serverUrl: () => (server as ServerHost).url(), panelLoaded: () => sideView?.loadedSrc ?? null };
}

export function deactivate(): void {
  server?.stop();
}

/** The helicon-server child process, started on first use and reused until the window closes. */
class ServerHost {
  private child: ChildProcess | null = null;
  private starting: Promise<string> | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {}

  /** The server's local address, starting it if it isn't running. */
  url(): Promise<string> {
    if (!this.starting) {
      this.starting = this.start().catch((error: unknown) => {
        this.starting = null;
        throw error;
      });
    }
    return this.starting;
  }

  stop(): void {
    this.starting = null;
    const child = this.child;
    this.child = null;
    if (child && child.exitCode === null) {
      child.kill();
    }
  }

  private start(): Promise<string> {
    const major = Number(process.versions.node.split(".")[0]);
    if (major < 22) {
      return Promise.reject(
        new Error(`Helicon needs an editor built on Node 22 or newer (this one runs Node ${process.versions.node}). Update VS Code to 1.101 or newer.`),
      );
    }
    const dist = join(this.context.extensionPath, "dist");
    // Its own data folder: the desktop app may be running against ~/.helicon at the same time.
    const dataDir = this.context.globalStorageUri.fsPath;
    mkdirSync(dataDir, { recursive: true });
    const args = [join(dist, "server.cjs"), "--port", "0", "--static", join(dist, "frontend"), "--data-dir", dataDir];
    output.appendLine(`Starting helicon-server with ${process.execPath}`);
    // ELECTRON_RUN_AS_NODE makes the editor's own binary behave as plain Node, so nothing extra ships.
    const child = spawn(process.execPath, args, {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    this.child = child;
    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let buffered = "";
      const timer = setTimeout(() => fail(new Error("helicon-server did not start within 20 seconds.")), START_TIMEOUT_MS);
      const fail = (error: Error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          child.kill();
          reject(error);
        }
      };
      child.stdout?.setEncoding("utf8").on("data", (chunk: string) => {
        output.append(chunk);
        buffered += chunk;
        const match = LISTENING.exec(buffered);
        if (match && !settled) {
          settled = true;
          clearTimeout(timer);
          resolve(match[1] as string);
        }
      });
      child.stderr?.setEncoding("utf8").on("data", (chunk: string) => output.append(chunk));
      child.on("error", (error) => fail(error));
      child.on("exit", (code, signal) => {
        output.appendLine(`helicon-server exited (${signal ?? `code ${code}`})`);
        if (this.child === child) {
          this.child = null;
          this.starting = null;
        }
        fail(new Error(`helicon-server exited before it was ready (${signal ?? `code ${code}`}).`));
      });
    });
  }
}

/** The side bar view: the compact one-folder layout for the workspace's first folder. */
class PanelView implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | null = null;
  /** The page the frame was last pointed at; the tests read it. */
  loadedSrc: string | null = null;

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = null;
        this.loadedSrc = null;
      }
    });
    await this.load();
  }

  /** (Re)loads the panel, after first making sure the server runs and knows the folder. */
  async load(): Promise<void> {
    const view = this.view;
    if (!view) {
      return;
    }
    view.webview.html = messageHtml("Starting Helicon…");
    try {
      const base = await externalUrl();
      const cwd = workspaceFolder();
      if (cwd) {
        await addProject(cwd);
      }
      const query = new URLSearchParams({ view: "panel", theme: editorTheme(), ...(cwd ? { cwd } : {}) });
      this.loadedSrc = `${base}/?${query.toString()}`;
      view.webview.html = frameHtml(base, this.loadedSrc);
    } catch (error) {
      view.webview.html = messageHtml(
        `Helicon could not start: ${error instanceof Error ? error.message : String(error)}. Run “Helicon: Show Log” for details, or “Helicon: Restart Server”.`,
      );
    }
  }

  post(message: unknown): Thenable<boolean> | undefined {
    return this.view?.webview.postMessage(message);
  }
}

function editorTheme(): "light" | "dark" {
  const kind = vscode.window.activeColorTheme.kind;
  return kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight ? "light" : "dark";
}

/** The first workspace folder, with a Windows drive letter uppercased the way the server stores it. */
function workspaceFolder(): string | null {
  const path = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  return path ? normalizeFolder(path) : null;
}

function normalizeFolder(path: string): string {
  return path.replace(/^([a-z]):/, (_m, drive: string) => `${drive.toUpperCase()}:`);
}

/** The server URL as the webview can reach it: forwarded when the extension runs remotely. */
async function externalUrl(): Promise<string> {
  const local = await (server as ServerHost).url();
  const external = await vscode.env.asExternalUri(vscode.Uri.parse(local));
  return external.toString(true).replace(/\/$/, "");
}

async function addProject(cwd: string): Promise<void> {
  try {
    const local = await (server as ServerHost).url();
    const res = await fetch(`${local}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cwd }),
    });
    if (!res.ok) {
      output.appendLine(`Adding ${cwd} as a project failed: ${res.status} ${await res.text()}`);
    }
  } catch (error) {
    output.appendLine(`Adding ${cwd} as a project failed: ${String(error)}`);
  }
}

async function focusPanel(): Promise<void> {
  await vscode.commands.executeCommand(`${VIEW_ID}.focus`);
}

async function newThreadInPanel(): Promise<void> {
  await focusPanel();
  const cwd = workspaceFolder();
  await sideView?.post({ type: "navigate-hash", hash: cwd ? `#/new/${encodeURIComponent(cwd)}` : "#/new" });
}

/** The full app, sidebar and all, in an editor tab. */
async function openEditor(context: vscode.ExtensionContext, hash = ""): Promise<void> {
  let base: string;
  try {
    base = await externalUrl();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const choice = await vscode.window.showErrorMessage(`Helicon could not start: ${message}`, "Show Log");
    if (choice === "Show Log") {
      output.show();
    }
    return;
  }
  if (editorPanel) {
    editorPanel.reveal(vscode.ViewColumn.Active);
    if (hash) {
      void editorPanel.webview.postMessage({ type: "navigate-hash", hash });
    }
    return;
  }
  editorPanel = vscode.window.createWebviewPanel("helicon", "Helicon", vscode.ViewColumn.Active, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });
  editorPanel.iconPath = vscode.Uri.joinPath(context.extensionUri, "media", "icon.png");
  editorPanel.webview.html = frameHtml(base, `${base}/?${new URLSearchParams({ theme: editorTheme() }).toString()}${hash}`);
  editorPanel.onDidDispose(() => {
    editorPanel = null;
  });
}

/** A new thread in the chosen folder: in the side panel for the workspace folder, else in the full app. */
async function openForFolder(context: vscode.ExtensionContext, uri?: vscode.Uri): Promise<void> {
  const chosen = uri ? normalizeFolder(uri.fsPath) : workspaceFolder();
  if (!chosen || chosen === workspaceFolder()) {
    await newThreadInPanel();
    return;
  }
  await addProject(chosen);
  await openEditor(context, `#/new/${encodeURIComponent(chosen)}`);
}

async function openInBrowser(): Promise<void> {
  try {
    await vscode.env.openExternal(vscode.Uri.parse(await externalUrl()));
  } catch (error) {
    void vscode.window.showErrorMessage(`Helicon could not start: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function restart(): Promise<void> {
  editorPanel?.dispose();
  server?.stop();
  await sideView?.load();
}

/**
 * A full-bleed frame around the server's own page, which keeps its origin, storage and cookies.
 * The small script forwards theme changes and navigation from the extension into the frame.
 */
function frameHtml(origin: string, src: string): string {
  const nonce = randomBytes(16).toString("base64");
  const frameOrigin = new URL(origin).origin;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${frameOrigin}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: var(--vscode-sideBar-background, var(--vscode-editor-background)); }
  iframe { display: block; width: 100%; height: 100%; border: 0; }
</style>
</head>
<body>
<iframe id="app" src="${src}" title="Helicon" allow="clipboard-read; clipboard-write"></iframe>
<script nonce="${nonce}">
  const frame = document.getElementById("app");
  const origin = ${JSON.stringify(frameOrigin)};
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "helicon-theme") frame.contentWindow.postMessage(data, origin);
    if (data.type === "navigate-hash") {
      const url = new URL(frame.src);
      url.hash = data.hash;
      frame.src = url.toString();
    }
  });
</script>
</body>
</html>`;
}

/** A plain message in the editor's own font and colors, for starting up and for errors. */
function messageHtml(text: string): string {
  const safe = text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  return `<!DOCTYPE html><html><body style="margin:0;padding:16px;font:12px/1.5 var(--vscode-font-family);color:var(--vscode-descriptionForeground)">${safe}</body></html>`;
}
