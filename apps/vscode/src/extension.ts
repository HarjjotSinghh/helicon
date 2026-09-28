import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";

/**
 * Helicon inside the editor. The extension runs the same helicon-server the desktop app bundles,
 * on the editor's own Node runtime, and shows the same web UI in an editor tab. Nothing is
 * reimplemented: the server drives `muse serve` over MSP, and the UI talks to the server.
 */

const LISTENING = /helicon-server listening on (http:\/\/\S+)/;
const START_TIMEOUT_MS = 20_000;

let output: vscode.OutputChannel;
let server: ServerHost | null = null;
let panel: vscode.WebviewPanel | null = null;

/** What the extension exposes to other code: only the tests use it. */
export interface HeliconApi {
  serverUrl(): Promise<string>;
}

export function activate(context: vscode.ExtensionContext): HeliconApi {
  output = vscode.window.createOutputChannel("Helicon");
  server = new ServerHost(context);
  context.subscriptions.push(
    output,
    { dispose: () => server?.stop() },
    vscode.commands.registerCommand("helicon.open", () => openPanel(context)),
    vscode.commands.registerCommand("helicon.openForFolder", (uri?: vscode.Uri) => openForFolder(context, uri)),
    vscode.commands.registerCommand("helicon.openInBrowser", () => openInBrowser()),
    vscode.commands.registerCommand("helicon.restart", () => restart(context)),
    vscode.commands.registerCommand("helicon.showLog", () => output.show()),
  );
  return { serverUrl: () => (server as ServerHost).url() };
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

/** The server URL as the webview can reach it: forwarded when the extension runs remotely. */
async function externalUrl(): Promise<string> {
  const local = await (server as ServerHost).url();
  const external = await vscode.env.asExternalUri(vscode.Uri.parse(local));
  return external.toString(true).replace(/\/$/, "");
}

async function openPanel(context: vscode.ExtensionContext, hash = ""): Promise<void> {
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
  if (panel) {
    panel.reveal(vscode.ViewColumn.Active);
    if (hash) {
      void panel.webview.postMessage({ type: "navigate", url: `${base}/${hash}` });
    }
    return;
  }
  panel = vscode.window.createWebviewPanel("helicon", "Helicon", vscode.ViewColumn.Active, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });
  panel.iconPath = vscode.Uri.joinPath(context.extensionUri, "media", "icon.png");
  panel.webview.html = html(base, `${base}/${hash}`);
  panel.onDidDispose(() => {
    panel = null;
  });
}

/** Adds the folder as a project, then opens a new thread in it. */
async function openForFolder(context: vscode.ExtensionContext, uri?: vscode.Uri): Promise<void> {
  const cwd = uri?.fsPath ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!cwd) {
    await openPanel(context);
    return;
  }
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
  await openPanel(context, `#/new/${encodeURIComponent(cwd)}`);
}

async function openInBrowser(): Promise<void> {
  try {
    await vscode.env.openExternal(vscode.Uri.parse(await externalUrl()));
  } catch (error) {
    void vscode.window.showErrorMessage(`Helicon could not start: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function restart(context: vscode.ExtensionContext): Promise<void> {
  panel?.dispose();
  server?.stop();
  await openPanel(context);
}

/** A full-bleed frame around the server's own page, which keeps its origin, storage and cookies. */
function html(origin: string, src: string): string {
  const nonce = randomBytes(16).toString("base64");
  const frameOrigin = new URL(origin).origin;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${frameOrigin}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: var(--vscode-editor-background); }
  iframe { display: block; width: 100%; height: 100%; border: 0; }
</style>
</head>
<body>
<iframe id="app" src="${src}" title="Helicon" allow="clipboard-read; clipboard-write"></iframe>
<script nonce="${nonce}">
  const frame = document.getElementById("app");
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "navigate") frame.src = event.data.url;
  });
</script>
</body>
</html>`;
}
