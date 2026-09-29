#!/bin/sh
# Re-bundle an extracted classic Tauri AppImage with quick-sharun.
#
# Usage: sharun-repack.sh <classic-root> <out-dir>
#   <classic-root>  the extracted classic bundle (dir containing usr/bin/helicon)
#   <out-dir>       receives exactly one packed sharun AppImage
#
# Prints the packed image path on stdout (progress goes to stderr). Exits
# nonzero on any failure. Called by .github/workflows/linux-appimage.yml and
# the desktop-linux job in release.yml, so both package exactly the same way.
#
# Pins live here once: a quick-sharun commit AND its sha256 (an unpinned
# download has hung CI before, readest#4909). Bump both together.
set -eu

CLASSIC_ROOT="${1:?usage: sharun-repack.sh <classic-root> <out-dir>}"
OUT_DIR="${2:?usage: sharun-repack.sh <classic-root> <out-dir>}"
QUICK_SHARUN_REF="${QUICK_SHARUN_REF:-2db1440b1ebfe4b760d8a8f87aa7f02819e185cc}"
QUICK_SHARUN_SHA256="${QUICK_SHARUN_SHA256:-9147547560b7be7284cbc2be67f6bbbc1f23158650139c613163a1a73e32d383}"
# The classic bundle carries no webkit tree of its own, so quick-sharun cannot
# derive this from the binary path; point it at the host tree instead.
WEBKIT2GTK_DIR="${WEBKIT2GTK_DIR:-/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1}"
# No zsync channel: Helicon updates via Tauri latest.json. The pinned
# quick-sharun computes UPINFO but never passes it to appimagetool (verified),
# so this only silences its misleading guess.
UPINFO="${UPINFO:-none}"

log() {
  echo "$@" >&2
}

for tool in xvfb-run curl sha256sum strace patchelf; do
  command -v "$tool" >/dev/null 2>&1 || {
    log "missing required tool: $tool"
    exit 1
  }
done
[ -d "$WEBKIT2GTK_DIR" ] || {
  log "WEBKIT2GTK_DIR=$WEBKIT2GTK_DIR does not exist"
  exit 1
}
[ -x "$CLASSIC_ROOT/usr/bin/helicon" ] || {
  log "no helicon binary under $CLASSIC_ROOT"
  exit 1
}
desktop="$(find "$CLASSIC_ROOT" -maxdepth 3 -name '*.desktop' -print -quit)"
[ -n "$desktop" ] || {
  log "no .desktop file under $CLASSIC_ROOT"
  exit 1
}
icon="$(find "$CLASSIC_ROOT" -name 'helicon.png' -print -quit)"
[ -n "$icon" ] || icon="$(find "$CLASSIC_ROOT" -name '*.png' -print -quit)"
[ -n "$icon" ] || {
  log "no icon under $CLASSIC_ROOT"
  exit 1
}

res_rel="$(cd "$CLASSIC_ROOT" && find . -name server.cjs -print -quit)"
case "$res_rel" in
  ./*/resources/server.cjs) tree="${res_rel%/resources/server.cjs}" ;;
  ./*/server.cjs) tree="${res_rel%/server.cjs}" ;;
  *)
    log "unexpected server.cjs layout: ${res_rel:-missing}"
    exit 1
    ;;
esac

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
log "fetching pinned quick-sharun $QUICK_SHARUN_REF"
curl -sSL --fail -o "$work/quick-sharun.sh" \
  "https://raw.githubusercontent.com/pkgforge-dev/Anylinux-AppImages/${QUICK_SHARUN_REF}/useful-tools/quick-sharun.sh"
echo "${QUICK_SHARUN_SHA256}  $work/quick-sharun.sh" | sha256sum --check
chmod +x "$work/quick-sharun.sh"

# Phase 1: deploy into an AppDir without packaging, so the Tauri resources
# (plain data files quick-sharun would not pick up) can be copied in first.
# Strace mode executes the GUI app, so both runs happen under xvfb.
export APPDIR="$work/AppDir" MAIN_BIN=helicon DESKTOP="$desktop" ICON="$icon"
export WEBKIT2GTK_DIR UPINFO
xvfb-run -a "$work/quick-sharun.sh" "$CLASSIC_ROOT/usr/bin/helicon" "$CLASSIC_ROOT/usr/bin/node"

# Mirror the whole resource tree the binary resolves its files from (the app
# looks up <resource_dir>/resources/<name>, then <resource_dir>/<name>), not a
# name allowlist that silently drops new files.
(cd "$CLASSIC_ROOT" && cp --parents -r "$tree" "$APPDIR")
find "$APPDIR" -name server.cjs -print -quit | grep . >/dev/null || {
  log "server.cjs missing from the sharun AppDir"
  exit 1
}

# Phase 2: re-running with OUTPUT_APPIMAGE=1 redeploys (idempotent; downloads
# are cached) and then packs the AppImage.
mkdir -p "$OUT_DIR" "$work/out"
export OUTPUT_APPIMAGE=1 OUTPATH="$work/out"
xvfb-run -a "$work/quick-sharun.sh" "$CLASSIC_ROOT/usr/bin/helicon" "$CLASSIC_ROOT/usr/bin/node"
count=0
packed=""
for f in "$work"/out/*.AppImage; do
  [ -e "$f" ] || break
  count=$((count + 1))
  packed="$f"
done
[ "$count" -eq 1 ] || {
  log "expected one sharun AppImage, found $count"
  exit 1
}

# Verify the final packed image, not just the phase-1 AppDir: extract it and
# check the files the app needs to boot.
verify="$(mktemp -d)"
(cd "$verify" && "$packed" --appimage-extract >/dev/null)
vroot="$verify/squashfs-root"
node_bin="$(find "$vroot" -name node -type f -executable -print -quit)"
[ -n "$node_bin" ] || {
  log "the Node.js sidecar is missing from the packed image"
  exit 1
}
find "$vroot" -name server.cjs -print -quit | grep . >/dev/null || {
  log "server.cjs is missing from the packed image"
  exit 1
}
find "$vroot" -name frontend -print -quit | grep . >/dev/null || {
  log "frontend is missing from the packed image"
  exit 1
}

mv "$packed" "$OUT_DIR"
log "packed $OUT_DIR/$(basename "$packed")"
echo "$OUT_DIR/$(basename "$packed")"
