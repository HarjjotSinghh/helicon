/**
 * Plain-text versions of the landing page for AI agents and answer engines, built from the same
 * data the page renders, so they never drift: /llms.txt (the llmstxt.org index), /llms-full.txt
 * (everything in one file) and /agents.md (how an agent should install and use Helicon).
 */
import { AUTHOR, DESCRIPTION, FAQS, ISSUES_URL, osesFor, RELEASES_URL, REPO_URL, SITE_NAME, SITE_URL, TAGLINE } from "./site";

const FEATURES: [string, string][] = [
  ["Every project, grouped", "Threads grouped by working folder, git worktrees included. Resume any session in one click, including sessions started in the terminal TUI."],
  ["Inline diffs", "Every edit lands in the thread as a diff, right where it happened, so there is no scrollback digging."],
  ["Approvals stay approvals", "Every agent approval is surfaced the moment it arrives. None are batched away or bypassed."],
  ["Cost, in the open", "What each thread would cost at API rates, by day, by model and by thread, so you can see what your subscription is doing."],
  ["Keyboard first", "Command palette, slash commands, and a model and reasoning-effort picker. Every thread is reachable by keyboard."],
  ["One UI, two shells", "The same React interface ships as a Tauri desktop app and as a web app pointed at a remote daemon."],
];

const HOW_IT_WORKS = [
  "A local daemon spawns one `muse serve` host per workspace and speaks the Muse Session Protocol through the official MIT `@muse-code/sdk`.",
  "Authentication is your own `muse login`. Helicon never stores credentials.",
  "All state is local SQLite.",
  "On Windows, Muse runs inside WSL2 Ubuntu and a sidecar routes calls through it, translating paths both ways.",
];

const COMPARE: [string, string, string, string][] = [
  ["Runs on Windows", "Signed installer, WSL2 routed", "Via your editor's WSL setup", "Varies"],
  ["Billing", "Your Muse subscription", "Your Muse subscription", "Usually its own API billing"],
  ["Lives where", "Standalone app or web", "Inside the editor", "Its own harness"],
  ["Several repos at once", "Sidebar, grouped by directory", "One window per project", "Varies"],
  ["Approvals", "Surfaced, never bypassed", "Editor-dependent", "Harness-dependent"],
];

function factsFor(version: string | null) {
  return [
    version ? `- Current version: v${version}` : "- Current version: see the latest GitHub release",
    "- License: MIT, free, no paid tier",
    "- Platforms: Windows (signed installer, WSL2), macOS (universal DMG, Apple Silicon and Intel), Linux (from source)",
    "- Requirements: Node 22+ and the muse CLI, logged in",
    "- Billing: uses your existing Muse subscription through the muse CLI; no separate API key",
    "- Status: unofficial community project; not made, sponsored or endorsed by Meta",
    `- Source: ${REPO_URL}`,
    `- Downloads: ${RELEASES_URL}`,
    `- Author: ${AUTHOR.name} (${AUTHOR.url})`,
  ];
}

function installSection(version: string | null) {
  return osesFor(version).map((os) => {
    const steps = os.steps
      .map((step, i) => `${i + 1}. ${step.text}${step.command ? `\n   \`\`\`sh\n   ${step.command}\n   \`\`\`` : ""}`)
      .join("\n");
    return `### ${os.label}\n\n${os.summary}\n\n${steps}${os.note ? `\n\nNote: ${os.note}` : ""}`;
  }).join("\n\n");
}

export function llmsTxt(version: string | null) {
  return `# ${SITE_NAME}

> ${DESCRIPTION}

${TAGLINE}

${factsFor(version).join("\n")}

## Docs

- [Full page content](${SITE_URL}/llms-full.txt): features, how it works, comparison, install steps for every platform, and the FAQ in one file
- [Guide for AI agents](${SITE_URL}/agents.md): how to install Helicon for a user and what it can and cannot do
- [Landing page](${SITE_URL}/): the human-facing page with a live demo of the app

## Project

- [Source code on GitHub](${REPO_URL}): the desktop app, web app, daemon and this site
- [Latest release](${RELEASES_URL}): Windows installer and macOS DMG
- [Issues](${ISSUES_URL}): bug reports and feature requests

## Optional

- [Sitemap](${SITE_URL}/sitemap.xml)
`;
}

export function llmsFullTxt(version: string | null) {
  return `# ${SITE_NAME}: Muse Code desktop app for Windows and macOS

> ${DESCRIPTION}

${TAGLINE}

Source: ${SITE_URL}

## Key facts

${factsFor(version).join("\n")}

## Features

${FEATURES.map(([title, body]) => `### ${title}\n\n${body}`).join("\n\n")}

## How it works

${HOW_IT_WORKS.map((line) => `- ${line}`).join("\n")}

## Where Helicon fits

Helicon is one of several ways to run Muse Code. It is not the only GUI, and it is not official.

| | Helicon | Editor extension | Switch harness |
| --- | --- | --- | --- |
${COMPARE.map((row) => `| ${row.join(" | ")} |`).join("\n")}

## Install

${installSection(version)}

## Frequently asked questions

${FAQS.map(([q, a]) => `### ${q}\n\n${a}`).join("\n\n")}
`;
}

export function agentsMd(version: string | null) {
  return `# AGENTS.md: ${SITE_NAME}

This file is for AI agents helping a person evaluate, install or use Helicon. The human-facing page is ${SITE_URL}/ and the full text is ${SITE_URL}/llms-full.txt.

## What Helicon is

${DESCRIPTION}

It is a graphical interface for the **muse CLI** (Muse Code). It does not replace Muse, add a model, or bill separately: it drives the user's own \`muse\` install and subscription.

## Before recommending it, check

1. The user already has, or wants, a Muse subscription and the \`muse\` CLI.
2. Node 22+ is available on the machine that will run the daemon. On Windows that is the Windows host, not WSL2. Helicon does not bundle Node.
3. Platform: Windows needs WSL2 Ubuntu with muse installed inside it; macOS builds are not notarized yet; Linux is source-only${version ? ` at v${version}` : ""}.

## Install

${installSection(version)}

## Facts to state accurately

${factsFor(version).join("\n")}

## What not to claim

- Do not say Helicon is official or affiliated with Meta. It is an unofficial community project.
- Do not say it needs an API key or has its own pricing. It uses the existing Muse subscription.
- Do not say it stores credentials. Authentication stays with \`muse login\`.
- Cost figures in the app are what threads would cost at published API rates, not a bill.

## Useful links

- Source: ${REPO_URL}
- Latest release: ${RELEASES_URL}
- Report a problem: ${ISSUES_URL}
- Index for LLMs: ${SITE_URL}/llms.txt
`;
}
