# Publishing Helicon to Flathub

`flatpak install flathub sh.helicon.Helicon` once this lands.

Status: the Flatpak builds and passes the manifest and AppStream lint in CI (`.github/workflows/flatpak.yml`). Nothing
has been submitted to Flathub yet. Nobody has launched the built app on a real desktop with a real `muse` yet, so do
that before submitting (see "Before submitting").

## How it works

The Flatpak builds Helicon from source with no network, which is what Flathub requires.

- The GNOME 51 runtime provides WebKitGTK 4.1. The `rust-stable` and `node22` SDK extensions provide the toolchains.
- `cargo-sources.json` and `node-sources.json` list every crate and npm package with its hash. They are generated from
  the lock files and committed. The `sources` job in the workflow regenerates them and fails if the committed copies
  are out of date.
- The manifest runs the same builds as the desktop release (the shared packages, the web UI, the bundled server), then
  `cargo build --release` for the Tauri shell. It skips the Tauri CLI, because the CLI only adds installers that
  Flatpak does not use.
- The Node sidecar is the SDK extension's `node`, copied to `/app/bin/node`, where the shell looks for it. The
  release build downloads Node instead, which a Flathub build cannot do.
- `TAURI_CONFIG` sets the app identifier to `sh.helicon.Helicon` at build time. The Tauri identifier in the repository
  stays `app.helicon.desktop`, so the other platforms do not change.

## Reaching `muse` from the sandbox

Helicon runs your `muse`, reads the sessions it keeps on disk, and uses your git and ssh setup. None of that can be
copied into a sandbox, so the Flatpak reaches the host:

- `/app/bin/muse`, `git`, `ssh` and `code` are links to `helicon-host-run`, which calls `flatpak-spawn --host` with the
  same name and arguments. The server spawns plain `muse`, so it finds the shim first. The shim adds `~/.local/bin`
  and Homebrew to the host's PATH, and forwards `MUSE_*` and `GIT_*` settings.
- Inside a Flatpak the shell (`apps/desktop/src-tauri/src/main.rs`) skips its PATH additions, so the host's `muse` is
  not found ahead of the shim. It also gives the server the host's `XDG_CONFIG_HOME`, `XDG_DATA_HOME` and
  `XDG_STATE_HOME`, because the sandbox's own point at `~/.var/app/sh.helicon.Helicon`, where muse's sign-in and
  sessions are not.
- The in-app updater is off in a Flatpak. Flathub updates the app.

`test-host-run.sh` checks what the shim hands to `flatpak-spawn`. CI runs it, and `shellcheck`, on every change.

## Permissions

| Permission | Why |
| --- | --- |
| `--share=ipc`, `--socket=wayland`, `--socket=fallback-x11`, `--device=dri` | The window and GPU rendering for WebKitGTK. |
| `--share=network` | The shell talks to its own server over localhost, and sign-in links open the browser. |
| `--talk-name=org.freedesktop.Notifications` | Desktop notifications when a thread needs approval. |
| `--talk-name=org.freedesktop.Flatpak` | Lets the shims run `muse`, `git`, `ssh` and `code` on the host. |
| `--filesystem=home` | Project folders can be anywhere under home, and `muse` keeps its sessions there. |

The last two are the sensitive ones. `flatpak-builder-lint` reports them as `finish-args-flatpak-spawn-access` and
`finish-args-home-filesystem-access`. Flathub grants these only through a reviewed exception in
[flathub-infra/flatpak-builder-lint](https://github.com/flathub-infra/flatpak-builder-lint), and the workflow expects
exactly these two and fails on anything else.

## Before submitting

1. Install the bundle from the workflow run (`flatpak install --user helicon.flatpak`) on a Linux desktop that has
   `muse` installed and signed in, and check that a thread starts and the sessions list is not empty.
2. Check that the window icon and the taskbar entry match the desktop file on both Wayland and X11. The desktop file
   sets `StartupWMClass=helicon`, which has not been tried.
3. Read the Flathub rules on [AI-generated submissions](https://docs.flathub.org/docs/for-app-authors/requirements)
   and on apps that depend on host components. A reviewer can reject an app whose core feature is the host's `muse`,
   and the manifest and the pull request have to be written by a person.

## Submitting

Flathub takes new apps by pull request to [flathub/flathub](https://github.com/flathub/flathub), on the `new-pr` branch.

1. Fork flathub/flathub with "copy the master branch only" unticked, and branch from `new-pr`.
2. Copy `sh.helicon.Helicon.yml`, `cargo-sources.json`, `node-sources.json` and `flathub.json` into the root of the
   branch. The desktop file, the metainfo file, the shim and the icon are installed from the source tree, so they
   do not get copied. `flathub.json` limits the build to x86_64, the only target the Node sidecar is set up for.
3. In the copied manifest, replace the `dir` source with the release tag:

   ```yaml
   - type: git
     url: https://github.com/HarjjotSinghh/helicon.git
     tag: vX.Y.Z
     commit: <the commit the tag points to>
   ```

   The tag has to contain the changes in this folder and in `main.rs`, so cut it after this lands. Regenerate the two
   sources files from that tag's lock files.
4. Open the pull request against `new-pr` and answer the review. Ask in the same pull request for the two lint
   exceptions above.
5. Prove you own `helicon.sh`. Flathub gives a token during review, to be served at
   `https://helicon.sh/.well-known/org.flathub.VerifiedApps.txt`. Put the file in `landing/public/.well-known/`.
   The token is not in this repository yet because Flathub issues it.

## Updating

Each release needs a new tag in the Flathub manifest, a new `<release>` entry in the metainfo file, and regenerated
sources files.

To regenerate the sources files locally, use the generators from
[flatpak-builder-tools](https://github.com/flatpak/flatpak-builder-tools) at the commit pinned in the workflow:
`flatpak-cargo-generator.py` on the Cargo lock file and `flatpak-node-generator npm` on the root npm lock file. Or take
the `flatpak-sources` artifact from the latest workflow run.
