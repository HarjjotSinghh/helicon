#!/usr/bin/env node
// Records a real Muse Code run through a headless Helicon server, for the replay demo on the home page.
//
//   node landing/scripts/record-demo-run.mjs <task-id>    (one of the TASKS below)
//
// Needs a signed-in `muse` on PATH and a built server (npm run build in packages/daemon and packages/server).
// It copies a sample repo from demo-fixtures/ to a temp folder, starts the server on a free port with a throwaway
// data dir, opens a thread, sends the task's prompt and records every MSP event the server streams for that
// thread, exactly as the app receives them. Approvals are accepted once, after a short pause, like a person
// would. Paths are rewritten to /Users/you/code/<repo> and the result lands in src/demo/recordings/<task>.json.

import { spawn, execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

export const TASKS = {
  "paginate-users": {
    repo: "api-server",
    // Asks before any command no rule covers, so the run stops on a real approval card.
    approvalMode: "promptUnmatched",
    prompt:
      "GET /users in src/server.js returns every user at once. Add page and limit query params: default limit 20, max 100, and return total and page with the results. Add tests to test/users.test.js, then run npm test.",
  },
  "fix-failing-test": {
    repo: "slugify",
    prompt: "npm test is failing. Find out why and fix it, then run the tests again.",
  },
  "readme-oneliner": {
    repo: "readme-demo",
    prompt: "Add a one-line description of what this package does under the README title.",
  },
};

const taskId = process.argv[2];
const task = TASKS[taskId];
if (!task) {
  console.error(`usage: record-demo-run.mjs <${Object.keys(TASKS).join("|")}>`);
  process.exit(1);
}

const work = realpathSync(mkdtempSync(join(tmpdir(), "helicon-demo-rec-")));
const cwd = join(work, task.repo);
cpSync(join(here, "demo-fixtures", task.repo), cwd, { recursive: true });
const git = (...args) => execFileSync("git", args, { cwd, stdio: "ignore" });
git("init", "-q");
git("add", ".");
git("-c", "user.name=you", "-c", "user.email=you@example.com", "commit", "-qm", "Initial commit");

const server = spawn(
  process.execPath,
  [join(root, "packages/server/dist/src/cli.js"), "--port", "0", "--data-dir", join(work, "data")],
  { stdio: ["ignore", "pipe", "inherit"] },
);
const base = await new Promise((resolve, reject) => {
  server.once("exit", (code) => reject(new Error(`server exited (${code})`)));
  server.stdout.on("data", (chunk) => {
    const match = /listening on (http:\/\/\S+)/.exec(String(chunk));
    if (match) resolve(match[1]);
  });
});

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const events = [];
let sessionId = null;
let turnId = null;
let done;
const finished = new Promise((resolve) => (done = resolve));
const decided = new Set();
const approvals = new Map();

async function decide(params) {
  // A person reads the card before clicking.
  await new Promise((r) => setTimeout(r, 1500));
  const choice =
    params.availableChoices.find((c) => c.decision === "approved" && c.scope === "once") ??
    params.availableChoices.find((c) => c.decision === "approved") ??
    params.availableChoices[0];
  await call("POST", "/api/approvals/decide", {
    sessionId,
    approvalId: params.approvalId,
    requirementId: params.currentRequirementId ?? null,
    choiceId: choice.choiceId,
  });
}

function onEvent(event) {
  if (process.env.DEBUG) console.error(event.type, event.method ?? "", event.sessionId === sessionId ? "" : "(other)", event.method?.startsWith("approval/") ? JSON.stringify(event.params) : "");
  if (event.type !== "msp" || event.sessionId !== sessionId) return;
  // Streaming chunks can split a path in two, past any rewrite. The completed item carries the full text.
  // Later approval stages are not replayed: the visitor approves a request once.
  if (event.method !== "item/delta" && event.method !== "approval/updated") events.push({ method: event.method, params: event.params, at: event.at });
  if (event.method === "approval/requested" || event.method === "approval/updated") {
    // A shell approval asks once per command in a pipeline; each stage gets its own decision.
    const merged = { ...approvals.get(event.params.approvalId), ...event.params };
    approvals.set(event.params.approvalId, merged);
    const key = `${merged.approvalId}:${JSON.stringify(merged.currentRequirementId ?? null)}`;
    if (!decided.has(key)) {
      decided.add(key);
      void decide(merged).catch((error) => console.error("approve failed:", error.message));
    }
  }
  if (event.method === "turn/completed" && (!turnId || event.params.turnId === turnId)) done();
}

const stream = await fetch(base + "/api/events");
void (async () => {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of stream.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let cut;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (data) {
        try {
          onEvent(JSON.parse(data));
        } catch {
          // Not JSON: a comment or keep-alive.
        }
      }
    }
  }
})();

try {
  await call("POST", "/api/projects", { cwd });
  const { session } = await call("POST", "/api/sessions", { cwd, approvalMode: task.approvalMode ?? "onRequest" });
  sessionId = session.sessionId;
  console.log(`thread ${sessionId}, sending the prompt`);
  const sent = await call("POST", "/api/turns", { sessionId, text: task.prompt });
  turnId = sent.turnId;
  const timeout = setTimeout(() => done("timeout"), 10 * 60_000);
  const result = await finished;
  clearTimeout(timeout);
  if (result === "timeout") throw new Error("the turn did not finish within 10 minutes");
  // Let the trailing usage events land.
  await new Promise((r) => setTimeout(r, 2000));
  const transcript = await call("POST", `/api/sessions/${encodeURIComponent(sessionId)}/resume`, {});

  const display = `/Users/you/code/${task.repo}`;
  const clean = (value) =>
    JSON.parse(
      JSON.stringify(value)
        .replaceAll(cwd, display)
        .replaceAll(work, "/Users/you/code")
        .replaceAll(tmpdir().replace(/\/$/, ""), "/tmp")
        .replaceAll(userInfo().username, "you"),
    );
  const out = join(root, "landing/src/demo/recordings", `${taskId}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(
      clean({
        task: taskId,
        repo: task.repo,
        cwd: display,
        prompt: task.prompt,
        recordedAt: new Date().toISOString(),
        modelId: transcript.msp?.modelId ?? null,
        live: events,
      }),
    ) + "\n",
  );
  console.log(`saved ${events.length} events to ${out}`);
} finally {
  server.kill("SIGTERM");
  rmSync(work, { recursive: true, force: true });
}
process.exit(0);
