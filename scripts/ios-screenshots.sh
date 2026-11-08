#!/bin/sh
# Capture the App Store screenshot set for iOS from a simulator.
#
#   scripts/ios-screenshots.sh <sim-udid> <out-dir> [locale]
#
# Needs a Debug simulator build in apps/mobile/dd-sim (the DEBUG screenshot
# rig, App/ScreenshotStage.swift, is not compiled into Release):
#
#   cd apps/mobile && xcodegen generate && xcodebuild -project Hostbeam.xcodeproj \
#     -scheme Hostbeam -destination 'platform=iOS Simulator,id=<sim-udid>' \
#     -derivedDataPath dd-sim -quiet build
#
# The 6.9-inch set (1320x2868) comes from an iPhone 17 Pro Max simulator.
# Produces, in upload order:
#
#   02-share-beaming  03-share-done  04-home  05-host  06-widget
#   07-home-done      08-onboarding  09-settings-held-back
#
# 01-share-sheet is real Photos UI and is not produced here: open a photo in
# the simulator's Photos app, tap Share, and screenshot by hand. It only
# needs retaking if the share extension's icon or name changes.
#
# [locale] sets only the app's language. The Home Screen (06) and the system
# share sheet (01) follow the simulator's own language, so for a localized set
# switch that first, with the simulator shut down, and put it back afterwards:
#
#   P=~/Library/Developer/CoreSimulator/Devices/<sim-udid>/data/Library/Preferences/.GlobalPreferences.plist
#   cp "$P" /somewhere/safe.plist
#   plutil -replace AppleLanguages -json '["de-DE"]' "$P"
#   plutil -replace AppleLocale -string de_DE "$P"
#
# Without it the set looks localized everywhere except the two system screens.
#
# The widget shot is the Home Screen with the widget placed. The gallery
# cannot be used for that on this machine: the iOS 26.3 simulator's
# SpringBoard segfaults in its own ripple animation (SBHRippleSimulation) on
# an Intel Mac whenever jiggle mode ends, and Reduce Motion does not reach
# it. So the widget is written straight into SpringBoard's saved layout
# (IconState.plist) while the simulator is shut down, and SpringBoard reads
# it on boot without ever animating. Page one is rebuilt as: our widget,
# our app, then that page's stock apps; the stock widgets are dropped and
# the Hostbeam icon moves off page two. A backup of the original layout is
# left beside the output.
#
# Set the wallpaper by hand once per simulator before running this: the
# iOS 26 default wallpaper renders as a striped moire on the Intel
# simulator, and there is no command for wallpapers. Settings > Wallpaper >
# Add New Wallpaper > a plain colour; the committed set uses black. (The
# wallpaper editor is a different Apple component from jiggle mode and did
# not crash.) It survives reboots, so it is a one-time step.
set -eu

SIM=${1:?simulator udid}
OUT=${2:?output directory}
LOCALE=${3:-en}
APP=app.hostbeam.ios.Hostbeam
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BUILD="$ROOT/apps/mobile/dd-sim/Build/Products/Debug-iphonesimulator/Hostbeam.app"
SB="$HOME/Library/Developer/CoreSimulator/Devices/$SIM/data/Library/SpringBoard"

[ -d "$BUILD" ] || { echo "no simulator build at $BUILD — see the header" >&2; exit 1; }
mkdir -p "$OUT"

status_bar() {
  xcrun simctl status_bar "$SIM" override --time "9:41" --batteryState charged \
    --batteryLevel 100 --wifiBars 3 --cellularBars 4 --operatorName ""
}

shot() {  # shot <name> [moving]
  # A fixed 3.5 s sleep raced the first frame. On 2026-09-13 it left five blank
  # captures and two host shots taken before the detail had pushed, across
  # three locales, and none of it showed in the size readout below. So capture
  # until the screen has settled — two captures in a row byte-identical — and
  # holds more than a blank frame would (a blank one compresses to about 90 KB).
  # A `moving` stage animates by design — the beaming mark — so its frames never
  # repeat; for it, not being blank is the whole test.
  prev=""; tries=0
  sleep 2
  while :; do
    xcrun simctl io "$SIM" screenshot --type png "$OUT/$1.png" >/dev/null 2>&1
    size=$(stat -f %z "$OUT/$1.png")
    sum=$(shasum "$OUT/$1.png" | cut -c1-40)
    if [ "$size" -gt 120000 ] && { [ "${2:-}" = moving ] || [ "$sum" = "$prev" ]; }; then break; fi
    tries=$((tries + 1))
    if [ "$tries" -ge 12 ]; then echo "  WARNING: $1 never settled (last capture $size bytes)" >&2; break; fi
    prev=$sum; sleep 1.5
  done
  printf '%-24s' "$1"; sips -g pixelWidth -g pixelHeight "$OUT/$1.png" | awk '/pixel/{printf "%s ", $2}'
  printf '%8s bytes\n' "$size"
}

# --- 1. The widget goes into the saved layout while SpringBoard is not running.
xcrun simctl shutdown "$SIM" >/dev/null 2>&1 || true
sleep 2
cp "$SB/IconState.plist" "$OUT/IconState.backup.plist"
plutil -convert json -o "$OUT/iconstate.json" "$SB/IconState.plist"
python3 - "$OUT/iconstate.json" <<'PY'
import json, sys, uuid
p = sys.argv[1]; d = json.load(open(p))
HB = "app.hostbeam.ios.Hostbeam"
pages = d["iconLists"]
already = any(isinstance(e, dict) and e.get("widgetIdentifier") == "app.hostbeam.ios.widget.beam"
              for pg in pages for e in pg)
if not already:
    widget = {
        "widgetIdentifier": "app.hostbeam.ios.widget.beam",
        "elementType": "widget",
        "containerBundleIdentifier": HB,
        "bundleIdentifier": HB + ".HostbeamWidgets",
        "displayIdentifier": str(uuid.uuid4()).upper(),
        "allowsExternalSuggestions": False,
        "uniqueIdentifier": str(uuid.uuid4()).upper(),
        "allowsSuggestions": True,
        "gridSize": "small",
        "iconType": "custom",
    }
    stock = [e for e in pages[0] if isinstance(e, str) and e != HB]
    pages[0] = [widget, HB] + stock
    for i in range(1, len(pages)):
        pages[i] = [e for e in pages[i] if not (isinstance(e, str) and e == HB)]
    json.dump(d, open(p, "w"))
print("widget already placed" if already else "widget written into page one")
PY
plutil -convert binary1 -o "$SB/IconState.plist" "$OUT/iconstate.json"
plutil -lint "$SB/IconState.plist" >/dev/null

# --- 2. Boot, install, stage the status bar, set the locale.
xcrun simctl boot "$SIM"
xcrun simctl bootstatus "$SIM" -b >/dev/null 2>&1
status_bar
xcrun simctl install "$SIM" "$BUILD"

# --- 3. The staged screens.
for pair in share-beaming:02-share-beaming share-done:03-share-done home:04-home \
            host:05-host home-done:07-home-done onboarding:08-onboarding \
            settings:09-settings-held-back; do
  stage=${pair%%:*}; name=${pair#*:}
  xcrun simctl terminate "$SIM" "$APP" 2>/dev/null || true
  sleep 0.6
  xcrun simctl launch "$SIM" "$APP" -hb-stage "$stage" \
    -AppleLanguages "($LOCALE)" -AppleLocale "$LOCALE" >/dev/null
  case $stage in
    share-beaming) shot "$name" moving ;;
    *) shot "$name" ;;
  esac
done
xcrun simctl terminate "$SIM" "$APP" 2>/dev/null || true

# --- 4. The Home Screen, last: a freshly installed app carries a blue
# "new" dot under its icon until it has been opened, and the stages above
# have just opened it. Terminating the app lands on the Home Screen page it
# was launched from, which is page one after a boot.
sleep 4
shot 06-widget
rm -f "$OUT/iconstate.json"
echo "done — 01-share-sheet is captured by hand (see the header)"
