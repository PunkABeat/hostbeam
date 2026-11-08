#!/bin/bash
# Exercise a background update end to end, without publishing anything.
#
#   scripts/test-update-install.sh [--keep]      (or: npm run test:update-install)
#
# Builds the Mac app twice as a throwaway test app — its own name and bundle
# identifier, signed with a throwaway updater key — serves the newer build from
# a local feed, and runs the older one through the three paths ADR 0022 cares
# about:
#
#   1. checking switched off       → no request reaches the feed at all;
#   2. the app's folder read-only  → latest.json is fetched, the archive is not,
#                                    and the log says why (the updater would
#                                    otherwise ask for an administrator password);
#                                    the launch check opens the popover instead;
#   3. both switches on            → the update installs, the app relaunches once
#                                    idle, and the relaunched app finds nothing
#                                    newer. Neither opens the popover.
#
# Nothing here touches /Applications, com.hostbeam.app or download.hostbeam.app.
# Everything it creates — the test app's data, log and WebKit folders, the test
# bundles in target/, the feed — is removed on exit, however it exits. --keep
# leaves the work folder (builds, feed, a copy of the logs) to look at.
#
# About ten minutes: two debug builds, then roughly 40s + 45s + 3 minutes of
# running. A second menu-bar icon appears meanwhile, and in step 2 its popover
# opens by itself. Leave both alone: an open popover is exactly what holds a
# relaunch back. Keep the lid open, too. The
# script holds off idle sleep itself, but a closed lid still sleeps the Mac,
# which freezes the test app's timers and not the deadlines here; a step the Mac
# slept through is reported as SKIP (exit 2), not as a failure.
set -euo pipefail

die() { echo "test-update-install: $*" >&2; exit 1; }
say() { echo "test-update-install: $*"; }

KEEP=0
case "${1:-}" in
  --keep) KEEP=1 ;;
  "") ;;
  *) die "usage: $0 [--keep]" ;;
esac

[ "$(uname -s)" = Darwin ] || die "macOS only"
for tool in node npm npx python3 cargo perl ditto plutil lsof pgrep caffeinate; do
  command -v "$tool" >/dev/null || die "$tool is not installed"
done

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DESKTOP="$ROOT/apps/desktop"
BUNDLES="$DESKTOP/src-tauri/target/debug/bundle/macos"
ID=com.hostbeam.updatetest
NAME=HostbeamUpdateTest
PORT="${HOSTBEAM_UPDATE_TEST_PORT:-8765}"
DATA="$HOME/Library/Application Support/$ID"
LOGS="$HOME/Library/Logs/$ID"
LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

case "$(uname -m)" in
  arm64) PLATFORM=darwin-aarch64 ;;
  x86_64) PLATFORM=darwin-x86_64 ;;
  *) die "unsupported architecture $(uname -m)" ;;
esac

OLD=$(node -p 'require(process.argv[1]).version' "$DESKTOP/src-tauri/tauri.conf.json")
# Any higher version will do; a big step keeps it clear of real releases.
NEW="${OLD%.*}.$(( ${OLD##*.} + 80 ))"

if pgrep -f "$NAME.app/Contents/MacOS/" >/dev/null; then
  die "a $NAME app is already running (an earlier run?) — quit it first"
fi
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  die "port $PORT is in use — set HOSTBEAM_UPDATE_TEST_PORT to another"
fi

# The real path, not /var/folders/…: /var is a symlink, and Tauri will not run its
# updater from an executable whose path contains one ("StartingBinary found
# current_exe() that contains a symlink"), so every check would fail before it
# started.
WORK=$(cd "$(mktemp -d -t hostbeam-update-test)" && pwd -P)
APP="$WORK/app/$NAME.app"
SERVER_PID=""

remove_test_app_state() {
  rm -rf "$DATA" "$LOGS" "$HOME/Library/WebKit/$ID" "$HOME/Library/Caches/$ID" \
    "$HOME/Library/HTTPStorages/$ID" "$HOME/Library/Preferences/$ID.plist" \
    "$HOME/Library/Saved Application State/$ID.savedState"
}

cleanup() {
  local status=$?
  pkill -f "$WORK/app/$NAME.app/Contents/MacOS/" 2>/dev/null || true
  if [ -n "$SERVER_PID" ]; then kill "$SERVER_PID" 2>/dev/null || true; fi
  chmod u+w "$WORK/app" 2>/dev/null || true
  "$LSREGISTER" -u "$APP" 2>/dev/null || true
  if [ "$KEEP" = 1 ]; then
    cp -R "$LOGS" "$WORK/app-logs" 2>/dev/null || true
    cp -R "$DATA" "$WORK/app-data" 2>/dev/null || true
  fi
  remove_test_app_state
  rm -rf "$BUNDLES/$NAME.app" "$BUNDLES/$NAME.app.tar.gz" "$BUNDLES/$NAME.app.tar.gz.sig"
  if [ "$KEEP" = 1 ]; then echo "test-update-install: work folder kept: $WORK"; else rm -rf "$WORK"; fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT TERM
# Hold off idle and system sleep for exactly as long as this script runs.
caffeinate -i -s -w $$ &

# Leftovers from an interrupted run would change what the app does on launch.
remove_test_app_state
mkdir -p "$WORK/app" "$WORK/feed"

say "generating a throwaway updater key"
(cd "$DESKTOP" && CI=true npx tauri signer generate --ci -w "$WORK/test.key" >"$WORK/signer.log" 2>&1) \
  || { cat "$WORK/signer.log"; die "could not generate a key"; }
PUBKEY=$(cat "$WORK/test.key.pub")

# The endpoint, public key and https rule are tauri.conf.json values, so the test
# build overrides them with --config instead of the app carrying a test switch.
# The Apple variables are unset so a test build never signs or notarizes with the
# real identity; the updater key goes in TAURI_SIGNING_PRIVATE_KEY (a path works
# there; this CLI ignores TAURI_SIGNING_PRIVATE_KEY_PATH).
build() { # <version> <log>
  local config
  config=$(printf '{"productName":"%s","identifier":"%s","version":"%s","plugins":{"updater":{"pubkey":"%s","endpoints":["http://127.0.0.1:%s/latest.json"],"dangerousInsecureTransportProtocol":true}}}' \
    "$NAME" "$ID" "$1" "$PUBKEY" "$PORT")
  say "building the test app at $1 (a few minutes; log: $2)"
  (cd "$DESKTOP" && env -u APPLE_SIGNING_IDENTITY -u APPLE_CERTIFICATE -u APPLE_ID \
    -u APPLE_PASSWORD -u APPLE_TEAM_ID -u APPLE_API_KEY -u APPLE_API_ISSUER \
    TAURI_SIGNING_PRIVATE_KEY="$WORK/test.key" TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" \
    npm run tauri build -- --debug --bundles app --config "$config" >"$2" 2>&1) \
    || { tail -30 "$2"; die "the $1 build failed"; }
}

build "$OLD" "$WORK/build-old.log"
ditto "$BUNDLES/$NAME.app" "$APP"
BIN=$(plutil -extract CFBundleExecutable raw "$APP/Contents/Info.plist")
build "$NEW" "$WORK/build-new.log"
cp "$BUNDLES/$NAME.app.tar.gz" "$WORK/feed/"
SIG=$(cat "$BUNDLES/$NAME.app.tar.gz.sig")
cat >"$WORK/feed/latest.json" <<EOF
{
  "version": "$NEW",
  "notes": "Update test build.",
  "pub_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platforms": {
    "$PLATFORM": { "signature": "$SIG", "url": "http://127.0.0.1:$PORT/$NAME.app.tar.gz" }
  }
}
EOF

say "serving the $NEW feed on 127.0.0.1:$PORT"
# Stops itself after 30 minutes even if this script is killed outright.
(cd "$WORK/feed" && exec perl -e 'alarm 1800; exec @ARGV' python3 -m http.server "$PORT" --bind 127.0.0.1) \
  >/dev/null 2>"$WORK/feed.log" &
SERVER_PID=$!
for _ in $(seq 1 50); do
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && break
  sleep 0.2
done
lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || die "the feed did not start (see $WORK/feed.log)"

# A config the app accepts without onboarding. No shortcut, so the test app
# never takes the real app's; launch at login off (debug builds skip it anyway).
seed() { # <checkUpdates> <installUpdates>
  mkdir -p "$DATA"
  python3 - "$DATA/config.json" "$1" "$2" <<'PY'
import json, os, sys
path, check, install = sys.argv[1], sys.argv[2] == "true", sys.argv[3] == "true"
cfg = json.load(open(path)) if os.path.exists(path) else {}
cfg.update({"addedIds": ["hostbeam-update-test"], "defaultId": "hostbeam-update-test",
            "setupComplete": True, "hotkey": [], "toggleHotkey": None, "autoHotkey": None})
cfg.setdefault("settings", {}).update({"launch": False, "menubar": True, "dock": False,
                                       "checkUpdates": check, "installUpdates": install})
json.dump(cfg, open(path, "w"), indent=2)
PY
}

app_log() { { cat "$LOGS"/hostbeam-*.log 2>/dev/null || true; }; }
log_lines() { app_log | wc -l | tr -d ' '; }
log_since() { app_log | tail -n +"$(( $1 + 1 ))"; }
feed_lines() { wc -l <"$WORK/feed.log" | tr -d ' '; }
feed_since() { tail -n +"$(( $1 + 1 ))" "$WORK/feed.log"; }
version_on_disk() { plutil -extract CFBundleShortVersionString raw "$APP/Contents/Info.plist"; }
run_for() { perl -e 'alarm shift; exec @ARGV' "$1" "$APP/Contents/MacOS/$BIN" >/dev/null 2>&1 || true; }

FAILED=0
pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=1; }
check() { # <description> <command...>
  local what=$1; shift
  if "$@"; then pass "$what"; else fail "$what"; fi
}
SLEPT=0
# A step that took far longer on the wall clock than it could have awake means
# the Mac slept through it (a closed lid does that). Its checks then prove
# nothing either way: the app's timers stop while asleep, these deadlines do not.
slept_through() { # <SECONDS when the step started> <its budget in seconds>
  if [ $(( SECONDS - $1 )) -gt $(( $2 + 30 )) ]; then
    echo "  SKIP  the Mac slept during this step (lid closed?), so it proves nothing"
    SLEPT=1
    return 0
  fi
  return 1
}
LOG_START=$(log_lines)

say "1/3 checking off — running the $OLD app for 40s"
seed false false
F=$(feed_lines); L=$(log_lines); T=$SECONDS
run_for 40
if ! slept_through "$T" 40; then
  # Without this line, "no request" would also pass for an app whose watcher
  # never ran, or whose checks could not start at all.
  check "the app's update watcher ran and saw checking off" grep -q "updates: checking off" <<<"$(log_since "$L")"
  check "no request reached the feed" test -z "$(feed_since "$F")"
fi

say "2/3 checking and installing on, app folder read-only — running for 45s"
seed true true
F=$(feed_lines); L=$(log_lines); T=$SECONDS
chmod a-w "$WORK/app"
run_for 45
chmod u+w "$WORK/app"
if ! slept_through "$T" 45; then
  REQUESTS=$(feed_since "$F")
  check "latest.json was fetched" grep -q "GET /latest.json" <<<"$REQUESTS"
  check "the archive was not downloaded" test -z "$(grep "GET /$NAME.app.tar.gz" <<<"$REQUESTS" || true)"
  check "the log says it will not install without asking" grep -q "not installing without asking" <<<"$(log_since "$L")"
  check "the launch check opened the popover to announce $NEW" grep -q "update $NEW: opening the popover" <<<"$(log_since "$L")"
  check "the app on disk is still $OLD" test "$(version_on_disk)" = "$OLD"
fi

say "3/3 folder writable — install, then relaunch once idle (up to 6 minutes)"
seed true true
F=$(feed_lines); L=$(log_lines); T=$SECONDS
perl -e 'alarm 360; exec @ARGV' "$APP/Contents/MacOS/$BIN" >/dev/null 2>&1 &
OLD_PID=$!
RELAUNCHED=0
for _ in $(seq 1 180); do
  if grep -q "relaunching into $NEW" <<<"$(log_since "$L")"; then RELAUNCHED=1; break; fi
  kill -0 "$OLD_PID" 2>/dev/null || break
  sleep 2
done
AT_RELAUNCH=$(feed_lines)
if [ "$RELAUNCHED" = 0 ] && slept_through "$T" 360; then
  :
else
  check "update $NEW was downloaded and installed" grep -q "update $NEW installed" <<<"$(log_since "$L")"
  check "the app decided to relaunch into $NEW" test "$RELAUNCHED" = 1
fi
if [ "$RELAUNCHED" = 1 ]; then
  T=$SECONDS
  for _ in $(seq 1 20); do kill -0 "$OLD_PID" 2>/dev/null || break; sleep 1; done
  NEW_PID=""
  for _ in $(seq 1 20); do
    NEW_PID=$(pgrep -f "$APP/Contents/MacOS/" | grep -vx "$OLD_PID" | head -1 || true)
    [ -n "$NEW_PID" ] && break
    sleep 1
  done
  # The relaunched app checks 15s after it starts.
  for _ in $(seq 1 45); do
    grep -q "GET /latest.json" <<<"$(feed_since "$AT_RELAUNCH")" && break
    sleep 1
  done
  if ! slept_through "$T" 85; then
    check "the old process exited" bash -c "! kill -0 $OLD_PID 2>/dev/null"
    check "a new process is running from the bundle" test -n "$NEW_PID"
    check "the app on disk is now $NEW" test "$(version_on_disk)" = "$NEW"
    check "the relaunched app checked the feed" grep -q "GET /latest.json" <<<"$(feed_since "$AT_RELAUNCH")"
    check "the relaunched app found nothing newer" test -z "$(log_since "$L" | sed -n "/relaunching into $NEW/,\$p" | grep "update check: $NEW available" || true)"
    # Installed in the background, so it arrives on its own; an open popover
    # would only have held the relaunch back.
    check "neither app opened the popover to announce it" test -z "$(log_since "$L" | grep "opening the popover" || true)"
    check "the archive was downloaded exactly once" test "$(grep -c "GET /$NAME.app.tar.gz" <<<"$(feed_since "$F")" || true)" = 1
  fi
fi

echo
if [ "$FAILED" = 0 ] && [ "$SLEPT" = 0 ]; then
  say "all checks passed"
elif [ "$FAILED" = 0 ]; then
  say "nothing failed, but the Mac slept through a step — rerun with the lid open"
  exit 2
else
  say "some checks FAILED. The test app's update log lines:"
  log_since "$LOG_START" | grep -i "update\|relaunch\|started" || true
  python3 -c 'import json, sys; s = json.load(open(sys.argv[1])).get("settings", {}); print("  config.json as the app left it: checkUpdates=%s installUpdates=%s" % (s.get("checkUpdates"), s.get("installUpdates")))' \
    "$DATA/config.json" 2>/dev/null || true
  [ "$KEEP" = 1 ] || say "rerun with --keep to look at the builds, feed and logs afterwards"
  exit 1
fi
