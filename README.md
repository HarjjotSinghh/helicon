# Helicon

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](#roadmap)
[![Tauri](https://img.shields.io/badge/desktop-Tauri%202-FFC131.svg)](https://tauri.app)
[![Web](https://img.shields.io/badge/web-shared%20React%20UI-61DAFB.svg)](#architecture)
[![Muse Code](https://img.shields.io/badge/powered_by-Muse%20Code%20CLI%20(MSP)-0668E1.svg)](https://developer.meta.com/ai/products/muse-code)
[![Contributors](https://img.shields.io/github/contributors/HarjjotSinghh/helicon.svg)](https://github.com/HarjjotSinghh/helicon/graphs/contributors)
[![Stars](https://img.shields.io/github/stars/HarjjotSinghh/helicon.svg?style=social)](https://github.com/HarjjotSinghh/helicon/stargazers)

> **Helicon** - home of the Muses. An open-source desktop + web ADE for Meta's **Muse Code CLI** (`muse`), in the spirit of the Claude Code desktop app and the Codex / ChatGPT desktop app.

**Sidebar-first:** all projects grouped by working directory, each with its tasks and sessions - resume anything, including sessions started from the `muse` terminal TUI.

> ⚠️ **Unofficial community project.** Not made, endorsed, or supported by Meta. "Muse" and "Muse Code" are trademarks of Meta, used here only to describe what this client connects to. This is **not legal advice** - see [Legal](#legal).

---

## Idea

Muse Code today is terminal-only (`muse`, macOS/Linux, WSL2 on Windows). Helicon wraps it in a Codex/Claude-style experience:

- **Projects** grouped by directory the agent worked in (incl. isolated worktrees)
- **Sessions/tasks** per project with full history, resume, and diffs
- **Approvals** surfaced honestly (`onRequest / promptUnmatched / denyUnmatched`), never bypassed
- **One codebase** for desktop (Tauri) and web (same React UI against a remote daemon)
- **Windows that actually works** - Tauri sidecar routes through WSL2 (`wsl -d Ubuntu -- muse serve`) with path translation

## Architecture

```
packages/ui      shared React UI (desktop + web, single source of truth)
packages/daemon  Node service: spawns `muse serve` per workspace, speaks MSP (JSON-RPC/stdio)
apps/desktop     Tauri 2 shell (Win/Mac/Linux) wrapping packages/ui
apps/web         same UI against a remote daemon
```

- Protocol: **Muse Session Protocol (MSP)** via the official [`@muse-code/sdk`](https://github.com/meta-models/muse-code-sdk) (MIT) + `muse schema generate-ts` types. No TUI scraping.
- Auth: user's own `muse login` (`~/.config/muse/auth.json`). Helicon never stores credentials.
- State: local SQLite - `projects (cwd/worktree) → sessions → turns`.

## Roadmap

- [x] Name locked: **Helicon** · stack locked: **Tauri + shared React UI**
- [x] PRD + UX spec (sidebar, session view, diffs, approvals) - [docs/PRD.md](docs/PRD.md), [docs/PRODUCT.md](docs/PRODUCT.md)
- [x] `packages/daemon` - MSP connect, list/resume sessions, send/steer, approvals
- [x] `packages/ui` - projects sidebar, session chat, inline diffs, slash commands and skills, goals
- [x] `apps/desktop` - Tauri shell + WSL2 routing + path translation, signed auto-update
- [x] `apps/web` - the same UI in a browser against the local server
- [ ] `apps/web` - remote daemon mode
- [x] Windows end to end (WSL2 Ubuntu)
- [x] GitHub Releases with a signed Windows installer
- [ ] macOS + Linux builds and releases
- [ ] Post-v1: mobile relay to steer running sessions from a phone

## Quickstart

Prereqs: Node 22+, the `muse` CLI with `muse login` done once (WSL2 Ubuntu on Windows), and the repo checked out.

```bash
npm install
npm run build --workspace @helicon/daemon --workspace @helicon/ui --workspace @helicon/server
npm run build --workspace @helicon/web

# Web app (serves the built UI plus the API on :3127)
npm run serve --workspace @helicon/web
# open http://127.0.0.1:3127, add a folder, start a thread
```

Projects, pins, thread titles and archive state persist in `~/.helicon/helicon.db` (pass `--data-dir` to the server to move it, or `:memory:` for a throwaway run). Threads you started from the `muse` terminal are discovered automatically and appear under their project.

UI development with hot reload:

```bash
# terminal 1: the API against your real muse
node packages/server/dist/src/cli.js --port 3127
# terminal 2: Vite compiles packages/ui straight from source
npm run dev --workspace @helicon/web
# open http://127.0.0.1:5173
```

The interface itself lives in `packages/ui` (state model in `src/model`, components in `src/components`); design tokens and the visual system are documented in [docs/DESIGN.md](docs/DESIGN.md).

```bash
# Desktop app (dev shell; needs the Tauri prereqs on your OS)
npm run dev --workspace helicon-desktop
```

Releases ride on tags: push `v0.1.0` and the Release workflow builds the Windows installer and attaches it to a GitHub Release. Every release gets a tag; notable merged PRs bump at least the patch version.

The desktop app updates itself from the newest release's `latest.json`, so releases must not be marked prerelease. The installer is signed with the updater key: the workflow reads `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` from repo secrets, and a local `tauri build` needs the same two variables set.

## Legal

- Wrapper clients are the intended path (Meta ships an MIT SDK for building MSP clients). This repo builds on that, and on the open-source CLI client.
- **Name:** `Helicon` was chosen to avoid the `Muse` mark. Do not reintroduce `Muse` into the binary name, bundle ID, domain, or title without a trademark review.
- **Never** claim to be official, never bundle credentials, never bypass billing/approvals.
- Contributor-tier reminder: prompts/completions sent on Contributor models may be used to improve Meta's products - surface this in-app before users run it.
- Get a licensed attorney to review before first release. See also: [Meta Brand Resources](https://www.meta.com/brand/resources/meta/our-trademarks), [Muse Code product page](https://developer.meta.com/ai/products/muse-code), [Model API docs](https://dev.meta.ai/docs/coding-agents).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome. See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[MIT](LICENSE) © 2026 Harjot Singh Rana and contributors.
