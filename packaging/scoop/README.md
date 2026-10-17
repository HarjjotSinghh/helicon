# Installing Helicon with Scoop

```powershell
scoop bucket add helicon https://github.com/HarjjotSinghh/scoop-bucket
scoop install helicon/helicon
```

The bucket repository does not exist yet. `helicon.json` here is the manifest it will serve.

## Why our own bucket

[Extras](https://github.com/ScoopInstaller/Extras) asks for a package request issue first and for "at least 100 stars
and/or 50 forks" on a GitHub project. Helicon is below that today, so it starts in its own bucket. Once it qualifies,
`helicon.json` can be proposed to Extras as is: it follows the same pattern Extras uses for other Tauri apps.

## How the manifest works

- It downloads the release's NSIS installer (`Helicon_X.Y.Z_x64-setup.exe`) and has Scoop extract it with 7-Zip
  (`#/dl.7z`) instead of running it. Nothing is written to the registry and no elevation is needed.
- `post_install` removes the NSIS internals (`$PLUGINSDIR` and friends) so only the app is left: `helicon.exe`,
  `node.exe` and `resources/`.
- `checkver` reads the latest GitHub release, and `autoupdate` builds the new URL and hash from it.
- The installer is not Authenticode signed yet. Scoop does not check signatures, so this does not block installs.
- The in-app updater still points at the NSIS installer, which installs a separate copy under
  `%LOCALAPPDATA%\Helicon`. The manifest's `notes` tell Scoop users to update with `scoop update helicon` instead.

## One-time setup

1. Create `HarjjotSinghh/scoop-bucket` from [ScoopInstaller/BucketTemplate](https://github.com/ScoopInstaller/BucketTemplate)
   ("Use this template").
2. Copy `helicon.json` into its `bucket/` folder and push.
3. The template's Excavator workflow runs `checkver` on a schedule and commits each new version with its hash, so the
   bucket follows releases without any change to this repository.

## Checks

`.github/workflows/package-managers.yml` installs from this manifest on a Windows runner whenever `packaging/` changes,
checks the extracted files, starts the bundled server and uninstalls. It also forces an autoupdate on a copy of the
manifest to prove `checkver` and `autoupdate` produce the latest version and a valid hash.
