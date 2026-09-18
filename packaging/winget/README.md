# Publishing Helicon to the Windows Package Manager

`winget install HarjjotSinghh.Helicon` once this lands.

The community repository ([microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs)) takes manifests by pull
request. The first version has to be submitted by hand; after that the Release workflow keeps it up to date.

## One-time setup

1. Fork <https://github.com/microsoft/winget-pkgs> to the `HarjjotSinghh` account. Do not enable Actions on the fork.
2. Create a **classic** personal access token with the `public_repo` scope. Fine-grained tokens do not work with the
   publishing action.
3. Add it to this repository as the `WINGET_TOKEN` secret:
   `gh secret set WINGET_TOKEN --repo HarjjotSinghh/helicon`.

## The first submission

The three manifests in `manifests/` describe one version. They live in a folder of their own because
`winget validate` parses every file in the folder it is given, and would choke on this README. Fill in the version and the installer's SHA-256, then open the
pull request:

```bash
# The hash of the installer that release published
gh release download vX.Y.Z -p "Helicon_X.Y.Z_x64-setup.exe" -O /tmp/helicon.exe
shasum -a 256 /tmp/helicon.exe
```

Copy `manifests/` to `manifests/h/HarjjotSinghh/Helicon/X.Y.Z/` in a branch of the winget-pkgs fork, with the version and
hash filled in, and open a pull request against `microsoft/winget-pkgs`. A bot validates the manifests and installs the
package in a sandbox; a maintainer merges once it passes, usually within a day.

Windows users can do the same thing with one command instead, which fills the manifests in for you:

```powershell
winget install wingetcreate
wingetcreate new https://github.com/HarjjotSinghh/helicon/releases/download/vX.Y.Z/Helicon_X.Y.Z_x64-setup.exe
```

## After that

`.github/workflows/winget.yml` submits every later release on its own, using the version already in the repository as
its template. It does nothing until `WINGET_TOKEN` exists.

## Notes

- The publishing action is pinned to a commit, not a tag, because it is handed a token that can push to our forks.
  Bump it deliberately.

- Our installer is Tauri's NSIS bundle. It installs per user, so no elevation and `Scope: user`.
- `InstallerType: nsis` is what tells winget the silent switch is `/S`; do not hand-write `InstallerSwitches`.
- The identifier is `HarjjotSinghh.Helicon`, which must match the folder path under `manifests/h/`.
