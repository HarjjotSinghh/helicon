import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseModelList } from "../src/client.js";
import {
  describeApproval,
  describeTool,
  diffStats,
  extractDiff,
  formatDuration,
  formatTokens,
  modelDisplayName,
  relativeTime,
  shortenPath,
} from "../src/model/format.js";
import type { MspItem } from "../src/types.js";
import { modelList } from "./fixtures/probe.js";

function tool(name: string, args: unknown, status = "completed"): MspItem {
  return { itemId: "i", kind: "toolCall", status, revision: 1, tool: name, args: JSON.stringify(args) };
}

describe("formatting", () => {
  it("formats relative times compactly", () => {
    const now = Date.parse("2026-09-11T12:00:00Z");
    assert.equal(relativeTime("2026-09-11T11:59:40Z", now), "now");
    assert.equal(relativeTime("2026-09-11T11:56:00Z", now), "4m");
    assert.equal(relativeTime("2026-09-11T09:00:00Z", now), "3h");
    assert.equal(relativeTime("2026-09-09T12:00:00Z", now), "2d");
    assert.equal(relativeTime("2026-08-21T12:00:00Z", now), "3w");
    assert.equal(relativeTime("garbage", now), "");
  });

  it("formats durations and token counts", () => {
    assert.equal(formatDuration(42316), "42s");
    assert.equal(formatDuration(73471), "1m 13s");
    assert.equal(formatDuration(120000), "2m");
    assert.equal(formatDuration(3_900_000), "1h 5m");
    assert.equal(formatTokens(842), "842");
    assert.equal(formatTokens(21177), "21k");
    assert.equal(formatTokens(1500), "1.5k");
    assert.equal(formatTokens(1_007_997), "1M");
  });

  it("shortens long paths from the middle", () => {
    assert.equal(shortenPath("D:\\Projects\\helicon", 48), "D:\\Projects\\helicon");
    const short = shortenPath("D:\\Projects\\clients\\acme\\platform\\packages\\ui\\src", 32);
    assert.ok(short.startsWith("D:\\...\\"));
    assert.ok(short.endsWith("src"));
    assert.ok(short.length <= 34);
  });
});

describe("tool descriptions", () => {
  it("describes a real bash call", () => {
    const description = describeTool(tool("bash", { command: "ls -la", description: "List workspace directory contents" }));
    assert.deepEqual(description, {
      kind: "shell",
      verb: "Ran",
      subject: "ls -la",
      mono: true,
      note: "List workspace directory contents",
    });
    assert.equal(describeTool(tool("bash", { command: "npm test" }, "inProgress")).verb, "Running");
  });

  it("describes questions, file tools, searches and unknown tools", () => {
    const question = describeTool(
      tool("request_user_input", { questions: [{ id: "q", header: "Color", question: "Which color?", options: [], selection: { mode: "single" } }] }),
    );
    assert.equal(question.kind, "question");
    assert.equal(question.subject, "Which color?");
    assert.equal(describeTool(tool("read_file", { path: "src/app.ts" })).subject, "src/app.ts");
    assert.equal(describeTool(tool("str_replace_editor", { file_path: "a.ts", old_string: "a", new_string: "b" })).verb, "Edited");
    const search = describeTool(tool("grep", { pattern: "TODO", path: "src" }));
    assert.equal(search.verb, "Searched for");
    assert.equal(search.note, "src");
    const unknown = describeTool(tool("frobnicate_widgets", { target: "x" }));
    assert.equal(unknown.kind, "generic");
    assert.equal(unknown.subject, "Frobnicate widgets");
    assert.equal(describeTool({ itemId: "i", kind: "toolCall", status: "completed", revision: 1, tool: "bash", args: "{not json" }).subject, "{not json");
  });

  it("extracts reviewable diffs from edit arguments", () => {
    const diff = extractDiff(tool("edit", { path: "a.ts", old_string: "const a = 1;\nconst b = 2;", new_string: "const a = 3;" }));
    assert.ok(diff && "hunks" in diff);
    assert.deepEqual(diffStats(diff), { added: 1, removed: 2 });
    const patch = extractDiff(tool("apply_patch", { input: "*** Begin Patch\n--- a.ts\n+++ a.ts\n@@\n-old\n+new\n+more" }));
    assert.ok(patch && "patch" in patch);
    assert.deepEqual(diffStats(patch), { added: 2, removed: 1 });
    assert.equal(extractDiff(tool("bash", { command: "ls" })), null);
  });
});

describe("approvals and models", () => {
  it("describes approval subjects in plain language", () => {
    const base = { approvalId: "a", sessionId: "s", availableChoices: [], currentRequirementId: null };
    assert.deepEqual(describeApproval({ ...base, subject: { kind: "shell", command: "rm -rf dist" } }), {
      title: "Run a shell command",
      detail: "rm -rf dist",
      mono: true,
    });
    assert.equal(describeApproval({ ...base, subject: { kind: "fileAccess", access: "write", path: "/etc/hosts" } }).title, "Write to a file");
    assert.equal(describeApproval({ ...base, subject: { kind: "network", host: "api.github.com", port: 443, protocol: "https" } }).detail, "https://api.github.com:443");
    assert.equal(describeApproval({ ...base, subject: { kind: "somethingNew", target: "x" } }).title, "Allow something new");
  });

  it("parses the real model catalog and flags contributor tiers", () => {
    const models = parseModelList(modelList);
    assert.equal(models.length, 4);
    const contributor = models.find((m) => m.modelId === "muse-spark-1.3-contributor");
    assert.equal(contributor?.contributor, true);
    assert.equal(contributor?.isDefault, true);
    assert.equal(models.find((m) => m.modelId === "muse-spark-1.3")?.contributor, false);
    assert.equal(modelDisplayName("muse-spark-1.3-contributor"), "muse-spark-1.3");
  });
});
