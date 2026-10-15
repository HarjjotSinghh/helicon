# HEL-CTO backlog (14 Oct 2026)

Role: Helicon CTO lane. Deadline Fri 16 Oct 2026, 11:59 PM IST. Charter: /Users/harjjotsinghh/.agents/cos/playbooks/cto/CHARTER.md

## Shipped
- 16 Oct 2026 lane (brief /Users/harjjotsinghh/.agents/cos/briefs/cto-next-build-2026-10-16.md):
  - PR #150 (3c617f9): Muse 1.4.9. SDK ^1.4.9, `approval/reviewing` holds kept in `fold.reviewing` (cleared by requested, resolved or turn/completed, counted as waiting by the stale-thread check), dock notice, `toolCall.displayLabel` for generic tools. Closes #149; #147 closed as duplicate.
  - PR #151 (3716bcf): IME Enter guard (`packages/ui/src/app/ime.ts`) on the composer and every Enter-to-act input. Closes #143. Not yet checked with a real WKWebView IME; the reporter was asked to test.
  - ASK HEL-CMO-20261015-1 first-run timing: results under the ASK in /Users/harjjotsinghh/.agents/cos/lane-inbox/HEL-CTO.md. The slowest step is the macOS download plus the Gatekeeper detour.
  - Both PRs are unreleased. v0.22.1 waits on Harjot's OK.
- v0.22.0 (tag on c9719ab, PR #142, 14 Oct 2026): everything below.
- #138 (5229e0f): Muse Code SDK 1.4.7, Resume run for paused workflows. Closes #129, #130, #135, #136, #137.
- #139 (914baf6): sign-in guidance for `:auto-review` threads. Closes #95.
- #140 (b217cf0): keep, undo, review a thread's file changes. Closes #94.
- #141 (f34c08d): LaTeX math with KaTeX, lazy chunk. Closes #93.

## Open
- Ranked next: #55 duplicate prompt (waiting on the reporter), the server CLI issues #60, #61, #62 and #74 (Hacktoberfest, left for contributors), and #53 relay (needs a design).
- Proposed first-run cuts: notarize macOS ($99/yr Apple ID), per-arch DMGs (91 MB down to about 48 MB), and a signed Windows installer.
- Confirm the Release and Extension workflows for v0.22.0 finished: `gh run list --limit 4`, then `gh release view v0.22.0`.
- Hacktoberfest #84 and #85 untouched on purpose.
- HEL-WONDER v0.21.9 is not verified; do not build on it.

## Release recipe
1. Branch release/X.Y.Z. Bump 10 version files (package.json x7, Cargo.toml, tauri.conf.json, HELICON_VERSION in packages/server/src/server.ts).
2. Edit docs/CHANGELOG.md and apps/vscode/CHANGELOG.md. Run `node scripts/sync-changelog.mjs`, copy the generated file to landing/src/product/model/changelog.generated.ts.
3. `cargo update -p helicon --offline` in apps/desktop/src-tauri; `npm install --package-lock-only --ignore-scripts`. Bash is denied on commands that name the lockfiles.
4. Build per workspace (root build fails at tauri without the signing key). `npm run build:try -w apps/web` rebuilds landing/public/try.
5. PR to prod, CI green, squash merge, then `git tag -a vX.Y.Z -s -m "Helicon vX.Y.Z"` and push the tag. Tag push runs release.yml and extension.yml.

## Gotchas
- Never commit marketing/, .mcp.json (modified before this work), or landing/public/demo/b-hero.mp4 (not mine).
- A fresh worktree needs `npm install --offline --ignore-scripts --no-audit --no-fund`.
- Undo limits: patch, replace_all and deletion edits are not undoable; SSH projects get no buttons; undo is not blocked mid-turn (mtime recheck only).
