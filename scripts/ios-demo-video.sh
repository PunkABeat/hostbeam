#!/bin/sh
# NOT FOR APP REVIEW ANY MORE: App Review asked for a recording made on a
# physical iPhone, starting at launch (2.1 Information Needed, 2026-09-29), and
# this one is the simulator's. Record on the phone instead — docs/agents/pitfalls.md.
# It still makes a side-by-side phone-and-terminal clip for anything else.
#
# The App Review demo video, in four steps. Rehearsed end to end 2026-09-03;
# the numbers below are what that rehearsal settled on.
#
#   scripts/ios-demo-video.sh stage <sim-udid> <alias> <hostname> <port> <user>
#   scripts/ios-demo-video.sh start <take-dir>
#   scripts/ios-demo-video.sh stop  <take-dir>
#   scripts/ios-demo-video.sh cut   <take-dir> <start-seconds> <duration>
#
# stage  seeds the host into the app (no typing on the simulator), clears the
#        beam history and the free-tier counter, drops the prop screenshot into
#        Photos, opens a Terminal window watching the host's upload folder, and
#        places both windows where `cut` expects them.
# start  records the second display with ffmpeg. One recording, both halves:
#        `simctl io recordVideo` drops repeated frames on static screens, so its
#        timeline is not wall-clock and cannot be lined up with anything else
#        (40 s of device video covered 47 s of real time in the rehearsal).
#        `screencapture -v` writes nothing at all if stopped before its limit.
# stop   ends the recording and lists what landed on the host.
# cut    crops the phone screen and the terminal out of the one recording and
#        puts them side by side at 1080p, so they are in sync by construction.
#
# The take (~35 s): Hostbeam home → Home button → Photos → open the prop →
# Share → Hostbeam → let the Copied card dismiss itself → Home button → tap
# the widget → the app opens and beams → stop. Fumbles are free: `stage`
# again and retake.
#
# Assumptions, all from this Mac's layout — check them if anything moved:
#   - the second display is avfoundation device 4 (`ffmpeg -f avfoundation
#     -list_devices true -i ""`), 3840x2160
#   - the Simulator window sits at {957,-984} and the Terminal window at
#     {1395,-1055,1905,-151} in screen points; `stage` puts them there
#   - the watch and clean commands run against the LOCAL review container by
#     default; for the Hetzner box set HOSTBEAM_DEMO_WATCH (list the upload
#     folder) and HOSTBEAM_DEMO_CLEAN (empty it) to commands that reach it
#     (ssh to the admin port + docker exec)
set -eu

SIM_APP=app.hostbeam.ios.Hostbeam
GROUP_SUITE=group.app.hostbeam
DISPLAY_DEV="${HOSTBEAM_DEMO_DISPLAY:-4}"
WATCH="${HOSTBEAM_DEMO_WATCH:-docker exec hostbeam-reviewhost ls -lh /srv/review/tmp/hostbeam}"
CLEAN="${HOSTBEAM_DEMO_CLEAN:-docker exec hostbeam-reviewhost sh -c 'rm -f /srv/review/tmp/hostbeam/*'}"
# Crops in pixels of the 3840x2160 recording, for the window positions above.
SCREEN_CROP="756:1646:594:360"     # the phone's screen, inside the bezel
TERM_CROP="1040:700:1400:116"      # header + listing; starts below the title bar,
                                   # which shows the user and machine name
SCRATCH="${TMPDIR:-/tmp}"

cmd="${1:-}"; shift || true
case "$cmd" in
stage)
  SIM="${1:?sim udid}"; ALIAS="${2:?alias}"; HOST="${3:?hostname}"; PORT="${4:?port}"; USER_="${5:?user}"
  GROUP=$(xcrun simctl get_app_container "$SIM" "$SIM_APP" groups | awk -v g="$GROUP_SUITE" '$1==g{print $2}')
  [ -n "$GROUP" ] || { echo "app group container not found — is the app installed on $SIM?" >&2; exit 1; }
  DOM="$GROUP/Library/Preferences/$GROUP_SUITE"
  ID="7E1C2A34-5B6D-4E7F-8A9B-0C1D2E3F4A5B"
  HEX=$(python3 -c "import json;print(json.dumps([{'id':'$ID','alias':'$ALIAS','hostname':'$HOST','port':$PORT,'username':'$USER_','remoteDir':'/tmp/hostbeam'}],separators=(',',':')).encode().hex())")
  xcrun simctl terminate "$SIM" "$SIM_APP" 2>/dev/null || true
  sleep 1
  # Through the simulator's own defaults daemon, so nothing cached overrides it.
  xcrun simctl spawn "$SIM" defaults write "$DOM" hosts.v1 -data "$HEX"
  xcrun simctl spawn "$SIM" defaults write "$DOM" defaultHostID -string "$ID"
  xcrun simctl spawn "$SIM" defaults write "$DOM" onboarded -bool true
  # recent + counter, and the pinned host key for this id: the id is fixed, so
  # pointing it at a different machine (local container → Hetzner box) leaves
  # a pin that no longer matches, and the probe fails as a host-key mismatch —
  # which is what TOFU is for, and what cost a red dot on 2026-09-03.
  for k in recent.v1 beamCounter.day beamCounter.count "hostKey.$ID"; do
    xcrun simctl spawn "$SIM" defaults delete "$DOM" "$k" 2>/dev/null || true
  done
  # The prop: a dark app screen with one red row, standing in for the bug. It
  # is the newest image in Photos, which is what the widget's "last
  # screenshot" falls back to when no real screenshot exists.
  PROP="$SCRATCH/hostbeam-prop-bug.png"
  magick -size 1320x2868 xc:'#0F1115' -fill '#1A1D24' -draw 'roundrectangle 0,0 1320,260 0,0' \
    -fill '#2A2E37' -draw 'roundrectangle 80,110 520,170 14,14' \
    -draw 'roundrectangle 80,340 1240,420 18,18' -draw 'roundrectangle 80,470 1100,550 18,18' \
    -draw 'roundrectangle 80,600 1180,680 18,18' -fill '#3A3F4A' -draw 'roundrectangle 80,780 1240,1060 24,24' \
    -fill '#2A2E37' -draw 'roundrectangle 130,830 900,890 14,14' -draw 'roundrectangle 130,930 1100,990 14,14' \
    -fill '#B3261E' -draw 'roundrectangle 80,1140 1240,1230 18,18' -fill '#F2B8B5' -draw 'roundrectangle 130,1168 700,1202 10,10' \
    -fill '#2A2E37' -draw 'roundrectangle 80,1310 1240,1390 18,18' -draw 'roundrectangle 80,1440 1000,1520 18,18' \
    -draw 'roundrectangle 80,1570 1240,1650 18,18' -draw 'roundrectangle 80,1700 1150,1780 18,18' \
    -fill '#3B6CF6' -draw 'roundrectangle 80,2560 1240,2700 40,40' "$PROP"
  # Once per simulator: every `stage` re-run otherwise adds another copy, and
  # the library grid in the take fills with identical dark tiles.
  MARK="$SCRATCH/hostbeam-prop-added-$SIM"
  if [ ! -f "$MARK" ]; then xcrun simctl addmedia "$SIM" "$PROP" && touch "$MARK"; fi
  xcrun simctl status_bar "$SIM" override --time "9:41" --batteryState charged --batteryLevel 100 \
    --wifiBars 3 --cellularBars 4 --operatorName ""
  xcrun simctl launch "$SIM" "$SIM_APP" >/dev/null
  # The Simulator app must be open for its window to be placed — a device
  # booted by simctl runs headless until it is.
  open -a Simulator
  i=0; until osascript -e 'tell application "System Events" to exists window 1 of process "Simulator"' 2>/dev/null | grep -q true; do
    i=$((i+1)); [ $i -gt 30 ] && { echo "the Simulator window never appeared" >&2; break; }; sleep 1
  done
  sh -c "$CLEAN" || true
  # Any watch window from an earlier run dies first, found by its tty. It is
  # titled so it can be found: a Terminal window's name otherwise follows
  # whatever command is in the foreground, and a match on that missed one on
  # 2026-09-03, which then ran all night.
  # (ps + kill by pid: `pkill -t` silently killed nothing on this Mac.)
  for t in $(osascript -e 'tell application "Terminal" to get tty of every window whose name contains "hostbeam-watch"' 2>/dev/null | tr ',' ' '); do
    for pid in $(ps -t "$(basename "$t")" -o pid=); do kill -9 "$pid" 2>/dev/null || true; done
  done
  # …and the windows those loops leave behind, which otherwise sit open
  # showing "[Process completed]". Only windows with no process are closed.
  osascript >/dev/null 2>&1 <<'AS' || true
tell application "Terminal"
  repeat with w in (every window)
    try
      if (count of processes of selected tab of w) is 0 then close w
    end try
  end repeat
end tell
AS
  # The watch window: header with the local clock, then one file name per
  # line. Names only: at a demo-sized font anything longer wraps. Bounded
  # three ways, because an unbounded one leaked memory overnight: it ends
  # itself after 45 minutes, each remote call is cut off after 8 s, and the
  # clear wipes scrollback (ESC[3J) instead of pushing every frame into it.
  osascript >/dev/null <<AS
tell application "Terminal"
  activate
  do script "printf '\\\\033]0;hostbeam-watch\\\\a'; deadline=\$((SECONDS+2700)); while [ \$SECONDS -lt \$deadline ]; do printf '\\\\033[H\\\\033[2J\\\\033[3J'; echo \\"$ALIAS /tmp/hostbeam \$(date +%H:%M:%S)\\"; echo; perl -e 'alarm 8; exec @ARGV' sh -c '$WATCH' 2>/dev/null | awk 'NR>1{print \$9}'; sleep 2; done; echo '[watch ended after 45 min]'"
  delay 1
  try
    set font size of front window to 22
  end try
  set bounds of front window to {1395, -1055, 1905, -151}
end tell
try
  tell application "System Events" to tell process "Simulator" to set position of window 1 to {957, -984}
on error
  display notification "Simulator window not placed — check its position before recording" with title "hostbeam demo"
end try
tell application "Simulator" to activate
AS
  echo "staged: $ALIAS = $USER_@$HOST:$PORT, history and counter cleared, prop in Photos"
  ;;
start)
  T="${1:?take dir}"; mkdir -p "$T"
  # One recorder at a time, and never one that outlives its take: -t 300
  # below is the hard stop even if `stop` is never called.
  if [ -f "$T/rec.pid" ] && kill -0 "$(cat "$T/rec.pid")" 2>/dev/null; then
    echo "a recorder is already running for $T (pid $(cat "$T/rec.pid")) — run stop first" >&2; exit 1
  fi
  ffmpeg -nostdin -v error -y -f avfoundation -framerate 30 -capture_cursor 0 -i "$DISPLAY_DEV:none" \
    -t 300 -c:v libx264 -preset ultrafast -crf 18 -pix_fmt yuv420p "$T/display.mp4" > "$T/rec.log" 2>&1 &
  echo $! > "$T/rec.pid"
  sleep 2
  kill -0 "$(cat "$T/rec.pid")" 2>/dev/null && echo "recording ($(date +%T))" || { echo "recorder failed:"; cat "$T/rec.log"; exit 1; }
  ;;
stop)
  T="${1:?take dir}"
  kill -INT "$(cat "$T/rec.pid")" 2>/dev/null || true
  sleep 5
  # Sweep: any screen-capture ffmpeg still alive after that is a leak.
  for pid in $(pgrep -f 'ffmpeg .*avfoundation'); do kill -9 "$pid" 2>/dev/null && echo "swept a leftover recorder ($pid)"; done
  printf 'display.mp4  '; ffprobe -v error -select_streams v:0 -show_entries stream=width,height:format=duration -of csv=p=0 "$T/display.mp4" | tr '\n' ' '; echo
  echo "--- on host ---"; sh -c "$WATCH" | tail -n +2
  ;;
cut)
  T="${1:?take dir}"; START="${2:?start seconds}"; DUR="${3:?duration}"
  # Named by its window, never overwritten: a player left open on an earlier
  # cut kept showing that cut's first frame after the file changed under it.
  OUTV="$T/demo-${START}s-${DUR}s.mp4"
  ffmpeg -v error -y -ss "$START" -t "$DUR" -i "$T/display.mp4" -filter_complex \
    "[0:v]fps=30,split=2[s][t];[s]crop=$SCREEN_CROP,scale=-2:1080[a];[t]crop=$TERM_CROP,scale=1000:-2,pad=1000:1080:0:0:color=#111318[b];[a][b]hstack=inputs=2,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#111318" \
    -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart "$OUTV"
  # A frame sheet to check the cut without watching it — and one of the last
  # ten seconds, because the widget beam's card is what a short cut misses.
  ffmpeg -v error -y -i "$OUTV" -vf "fps=1/4,scale=600:-1,tile=2x4" -frames:v 1 "${OUTV%.mp4}-sheet.png"
  ffmpeg -v error -y -sseof -10 -i "$OUTV" -vf "fps=1/2.5,scale=600:-1,tile=2x2" -frames:v 1 "${OUTV%.mp4}-tail.png"
  echo "wrote $OUTV (+ -sheet.png, -tail.png)"
  ;;
*)
  sed -n '2,40p' "$0"; exit 1 ;;
esac
