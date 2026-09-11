# Contributing to Helicon

Thanks for contributing! Helicon is an unofficial open-source desktop + web ADE for Meta's Muse Code CLI.

## Ground rules

1. Keep the **Unofficial** disclaimer on any user-facing surface ("Not made, endorsed, or supported by Meta").
2. Don't use the `Muse` mark in new binary names, bundle IDs, domains, or titles.
3. Never commit credentials (`auth.json`, `.env`, API keys). Use your own `muse login`.
4. Never bypass approvals or billing. Surface approval modes honestly.
5. One shared UI: put reusable components in `packages/ui`, not in `apps/*`.

## Workflow

- Open an issue first for anything beyond a typo.
- Branch from `prod`, keep PRs small and tested.
- `git commit` messages: short imperative subject (50 chars max), body only when "why" is not obvious.

## Versioning

- Semver. Every release gets a git tag and a GitHub Release with binaries.
- Merged PRs with considerable work bump at least the patch version, never major for routine work.

## Dev (once app code lands)

- `packages/daemon` - MSP client via `@muse-code/sdk`, JSON-RPC over `muse serve` stdio.
- `packages/ui` - shared React UI.
- `apps/desktop` - Tauri shell (Windows routes through WSL2).
- `apps/web` - same UI vs remote daemon.
