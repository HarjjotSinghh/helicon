# HEL-CTO backlog (14 Oct 2026)

Role: Helicon CTO lane. Deadline Fri 16 Oct 2026, 11:59 PM IST. Charter: /Users/harjjotsinghh/.agents/cos/playbooks/cto/CHARTER.md

## Shipped
- v0.22.0 (tag on c9719ab, PR #142, 14 Oct 2026): everything below.
- #138 (5229e0f): Muse Code SDK 1.4.7, Resume run for paused workflows. Closes #129, #130, #135, #136, #137.
- #139 (914baf6): sign-in guidance for `:auto-review` threads. Closes #95.
- #140 (b217cf0): keep, undo, review a thread's file changes. Closes #94.
- #141 (f34c08d): LaTeX math with KaTeX, lazy chunk. Closes #93.

## Open
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
