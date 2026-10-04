#!/usr/bin/env node
// Watches for new Muse Code releases so Helicon can support a new feature the day it ships.
//
//   node scripts/muse-watch.mjs --state <file> [--report <file>]
//
// Sources, all public and anonymous:
//   - Meta's update channels (what `muse` itself updates to): api.meta.ai/muse-code/channels/muse-{stable,canary}
//   - @muse-code/sdk on npm, whose versions track the CLI's
//   - the MSP schema the SDK repo publishes, diffed for new methods, notifications and item kinds
//   - the release notes in the SDK repo's CHANGELOG.md
//
// The state file remembers what was seen last. On the first run it is only filled in. When anything changed,
// the script writes a Markdown report (the body of a GitHub issue) and prints `changed=true` and `title=...`
// to $GITHUB_OUTPUT when it runs in Actions. Exit code 0 either way; a source that fails is noted and skipped.

import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";

const CHANNELS = {
  stable: "https://api.meta.ai/muse-code/channels/muse-stable",
  canary: "https://api.meta.ai/muse-code/channels/muse-canary",
};
const SDK_REGISTRY = "https://registry.npmjs.org/@muse-code/sdk";
const RAW = "https://raw.githubusercontent.com/meta-models/muse-code-sdk/main";
const SCHEMA_MANIFEST = `${RAW}/schema/msp/stable/manifest.json`;
const SCHEMA = `${RAW}/schema/msp/stable/msp.schema.json`;
const CHANGELOG = `${RAW}/CHANGELOG.md`;
const CHANGELOG_PAGE = "https://dev.meta.ai/docs/muse-code/changelog";

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

const statePath = arg("state") ?? "muse-watch-state.json";
const reportPath = arg("report") ?? "muse-watch-report.md";
const problems = [];

async function get(url, kind = "json") {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "helicon-muse-watch (+https://github.com/HarjjotSinghh/helicon)" } });
    if (!res.ok) {
      problems.push(`${url}: HTTP ${res.status}`);
      return null;
    }
    return kind === "json" ? await res.json() : await res.text();
  } catch (error) {
    problems.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/** The parts of the MSP schema whose growth means something new to support. */
function schemaSurface(schema) {
  if (!schema || typeof schema !== "object") {
    return null;
  }
  const keys = (value) => (value && typeof value === "object" ? Object.keys(value).sort() : []);
  const defs = schema.$defs ?? schema.definitions ?? {};
  return {
    methods: keys(schema.methods),
    notifications: keys(schema.notifications),
    itemKinds: [...(defs.ItemKind?.enum ?? [])].sort(),
    capabilities: [...(schema.capabilities?.grantable ?? [])].sort(),
    types: keys(defs),
  };
}

function added(before = [], after = []) {
  const seen = new Set(before);
  return after.filter((name) => !seen.has(name));
}

function removed(before = [], after = []) {
  const kept = new Set(after);
  return before.filter((name) => !kept.has(name));
}

/** The release notes for one version: its `## <version>` section of the SDK changelog. */
function notesFor(changelog, version) {
  if (!changelog || !version) {
    return null;
  }
  const short = version.split("-")[0];
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => /^##\s/.test(line) && line.includes(short));
  if (start < 0) {
    return null;
  }
  const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim() || null;
}

const previous = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : null;

const [stable, canary, sdk, schemaManifest, schema, changelog] = await Promise.all([
  get(CHANNELS.stable),
  get(CHANNELS.canary),
  get(SDK_REGISTRY),
  get(SCHEMA_MANIFEST),
  get(SCHEMA),
  get(CHANGELOG, "text"),
]);

const next = {
  checkedAt: new Date().toISOString(),
  stable: stable?.version ?? previous?.stable ?? null,
  stableNote: stable?.notification_text ?? null,
  canary: canary?.version ?? previous?.canary ?? null,
  sdk: sdk?.["dist-tags"]?.latest ?? previous?.sdk ?? null,
  fingerprint: schemaManifest?.fingerprint ?? schemaManifest?.schema_fingerprint ?? previous?.fingerprint ?? null,
  surface: schemaSurface(schema) ?? previous?.surface ?? null,
};

writeFileSync(statePath, JSON.stringify(next, null, 2));

if (!previous) {
  console.log(`First run: recorded stable ${next.stable}, canary ${next.canary}, sdk ${next.sdk}.`);
  process.exit(0);
}

const changes = [];
if (next.stable !== previous.stable) changes.push(`Stable CLI: ${previous.stable} -> **${next.stable}**`);
if (next.canary !== previous.canary) changes.push(`Canary CLI: ${previous.canary} -> **${next.canary}**`);
if (next.sdk !== previous.sdk) changes.push(`@muse-code/sdk: ${previous.sdk} -> **${next.sdk}**`);
if (next.fingerprint !== previous.fingerprint) changes.push(`MSP schema fingerprint changed`);

const surfaceLines = [];
if (previous.surface && next.surface) {
  for (const [label, key] of [
    ["New methods", "methods"],
    ["New notifications", "notifications"],
    ["New item kinds", "itemKinds"],
    ["New grantable capabilities", "capabilities"],
    ["New schema types", "types"],
  ]) {
    const grown = added(previous.surface[key], next.surface[key]);
    if (grown.length) surfaceLines.push(`- ${label}: ${grown.map((n) => `\`${n}\``).join(", ")}`);
  }
  for (const [label, key] of [
    ["Removed methods", "methods"],
    ["Removed notifications", "notifications"],
    ["Removed item kinds", "itemKinds"],
  ]) {
    const gone = removed(previous.surface[key], next.surface[key]);
    if (gone.length) surfaceLines.push(`- ${label}: ${gone.map((n) => `\`${n}\``).join(", ")}`);
  }
}

if (changes.length === 0 && surfaceLines.length === 0) {
  console.log(`No change (stable ${next.stable}, canary ${next.canary}, sdk ${next.sdk}).${problems.length ? ` Skipped: ${problems.join("; ")}` : ""}`);
  process.exit(0);
}

const headline = next.stable !== previous.stable ? next.stable : next.sdk !== previous.sdk ? `SDK ${next.sdk}` : next.canary !== previous.canary ? `canary ${next.canary}` : "protocol change";
// One line, so a version string from outside can't add lines to $GITHUB_OUTPUT.
const title = `Muse Code ${headline}`.replace(/[\r\n]+/g, " ").slice(0, 120);
const notes = notesFor(changelog, next.stable !== previous.stable ? next.stable : next.sdk);

const report = [
  `Muse Code changed. Check what's new and whether Helicon should support it today.`,
  ``,
  `## What changed`,
  ...changes.map((line) => `- ${line}`),
  next.stableNote ? `\nUpdate notice: ${next.stableNote}` : ``,
  ``,
  `## Protocol (MSP schema)`,
  surfaceLines.length ? surfaceLines.join("\n") : `No new methods, notifications or item kinds.`,
  ``,
  `## Release notes`,
  notes ?? `Not in the SDK changelog yet. See ${CHANGELOG_PAGE}.`,
  ``,
  `## To do`,
  `- [ ] Read the notes and try the feature in the terminal (\`muse --version\`)`,
  `- [ ] Bump \`@muse-code/sdk\` in packages/daemon if the SDK moved`,
  `- [ ] Build support in Helicon, or note why it doesn't apply`,
  `- [ ] Release, then post the same day (quote @MetaforDevs if they announced it)`,
  ``,
  `Sources: [stable channel](${CHANNELS.stable}), [npm](https://www.npmjs.com/package/@muse-code/sdk), [SDK changelog](https://github.com/meta-models/muse-code-sdk/blob/main/CHANGELOG.md), [docs changelog](${CHANGELOG_PAGE})`,
  problems.length ? `\nSkipped sources this run: ${problems.join("; ")}` : ``,
].join("\n");

writeFileSync(reportPath, report);
console.log(`${title}\n\n${report}`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=true\ntitle=${title}\n`);
}
