// Runs inside the VS Code extension host. Plain assertions: no test framework to bundle.
const assert = require("node:assert/strict");
const { realpathSync } = require("node:fs");
const vscode = require("vscode");

async function waitFor(check, what) {
  const deadline = Date.now() + 20_000;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

exports.run = async function run() {
  const ext = vscode.extensions.getExtension("harjjotsinghh.helicon");
  assert.ok(ext, "extension is installed");
  const api = await ext.activate();

  // The editor's own runtime has to carry node:sqlite, or the server cannot start.
  console.log(`extension host: node ${process.versions.node}, electron ${process.versions.electron}`);

  await vscode.commands.executeCommand("helicon.open");
  const url = await api.serverUrl();
  assert.match(url, /^http:\/\/127\.0\.0\.1:\d+$/);

  const page = await fetch(`${url}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<div id="root">/);

  const env = await (await fetch(`${url}/api/env`)).json();
  assert.equal(typeof env.museFound, "boolean");
  console.log(`server up at ${url}; museFound=${env.museFound}`);

  const tab = await waitFor(
    () => vscode.window.tabGroups.all.flatMap((g) => g.tabs).find((t) => t.label === "Helicon"),
    "the Helicon tab",
  );
  assert.ok(tab);

  // New Thread in This Folder adds the open folder as a project.
  const folder = vscode.Uri.file(process.env.HELICON_TEST_WORKSPACE);
  await vscode.commands.executeCommand("helicon.openForFolder", folder);
  const projects = await waitFor(async () => {
    const body = await (await fetch(`${url}/api/projects`)).json();
    const want = realpathSync(folder.fsPath);
    return body.projects.some((p) => p.cwd === folder.fsPath || p.cwd === want) ? body.projects : null;
  }, "the folder to be added as a project");
  console.log(`projects: ${projects.map((p) => p.cwd).join(", ")}`);

  // Restart brings up a fresh server.
  await vscode.commands.executeCommand("helicon.restart");
  const again = await api.serverUrl();
  assert.equal((await fetch(`${again}/api/env`)).status, 200);
  console.log("restart ok");
};
