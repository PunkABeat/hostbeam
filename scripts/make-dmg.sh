#!/usr/bin/env bash
# Build the release disk image, without asking Finder for anything.
#
#   scripts/make-dmg.sh <path/to/Hostbeam.app> <path/to/out.dmg>
#
# Replaces Tauri's dmg bundler, which shells out to create-dmg's
# `bundle_dmg.sh`. That script arranges the installer window by sending Apple
# events to Finder, and on 2026-09-19 macOS refused them — "Not authorized to
# send Apple events to Finder (-1743)" — from a terminal that *had* the
# Automation permission, and from the agent's shell, which cannot even be
# prompted for it. The build stopped after the app was signed, notarized and
# stapled, so a release could not be finished.
#
# The window's appearance is not something Finder has to be asked for at build
# time: it is a `.DS_Store` file inside the image. Ours is kept in the repo
# (`apps/desktop/src-tauri/dmg/window-layout.dsstore`), lifted from the 0.1.20
# DMG that shipped, so the image looks exactly as it always has — icon
# positions, window size, icon size — and building one needs no GUI, no
# permission, and no Finder at all.
#
# If the window ever needs to look different, change it once in Finder on a
# mounted read-write image, copy that volume's .DS_Store back over the file in
# the repo, and every later release inherits it.
set -euo pipefail

APP=${1:?usage: make-dmg.sh <Hostbeam.app> <out.dmg>}
OUT=${2:?usage: make-dmg.sh <Hostbeam.app> <out.dmg>}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
LAYOUT="$ROOT/apps/desktop/src-tauri/dmg/window-layout.dsstore"
ICON="$ROOT/apps/desktop/src-tauri/icons/icon.icns"
VOLUME="Hostbeam"

[ -d "$APP" ] || { echo "no app at $APP" >&2; exit 1; }
[ -f "$LAYOUT" ] || { echo "no window layout at $LAYOUT" >&2; exit 1; }

STAGE=$(mktemp -d)
MOUNT=$(mktemp -d)
RW="$STAGE.rw.dmg"
cleanup() {
  hdiutil detach "$MOUNT" -quiet 2>/dev/null || true
  rm -rf "$STAGE" "$MOUNT" "$RW"
}
trap cleanup EXIT

# What the user sees when the image opens: the app, and somewhere to drag it.
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
cp "$ICON" "$STAGE/.VolumeIcon.icns"
cp "$LAYOUT" "$STAGE/.DS_Store"

# Read-write first: the volume's own "I have a custom icon" flag can only be
# set on a real mounted filesystem, and a compressed image is read-only.
SIZE=$(($(du -sm "$STAGE" | cut -f1) + 32))   # MB, with room for the filesystem
rm -f "$RW"
hdiutil create -srcfolder "$STAGE" -volname "$VOLUME" -fs HFS+ \
  -format UDRW -size "${SIZE}m" -quiet "$RW"
hdiutil attach "$RW" -mountpoint "$MOUNT" -nobrowse -quiet
SetFile -a C "$MOUNT"
[ -f "$MOUNT/.DS_Store" ] || { echo "the layout did not reach the image" >&2; exit 1; }
hdiutil detach "$MOUNT" -quiet

rm -f "$OUT"
mkdir -p "$(dirname "$OUT")"
hdiutil convert "$RW" -format UDZO -imagekey zlib-level=9 -o "$OUT" -quiet
echo "   dmg: $OUT ($(du -h "$OUT" | cut -f1))"
