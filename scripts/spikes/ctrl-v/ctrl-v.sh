#!/usr/bin/env bash
# The Ctrl+V spike (next.md § 10a): Ctrl+V in Claude Code on an SSH host pastes
# the Mac's clipboard image. Findings: README.md, next to this file.
#
#   ctrl-v.sh install <alias>        put the stand-in on the host as xclip + wl-paste
#   ctrl-v.sh uninstall <alias>      take it off again
#   ctrl-v.sh connect <alias> [min]  hold the connection (default 30 min, then it stops);
#                                    add --pasteboard NAME to serve a named pasteboard
#   ctrl-v.sh test <alias>           the whole path, end to end, on a named pasteboard
#   ctrl-v.sh paste <alias>          what each agent there makes of a pasted beam path
#                                    (no helper needed: README, finding 8)
#
# `connect` is the only part that reads your real clipboard, and only when the
# host asks. `test` never does. Spike-grade: nothing here ships in the app.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/hostbeam-spike"
BIN="$CACHE/mac-clipboard"
REMOTE_SOCK='.hostbeam/clipboard.sock'   # relative to the host user's home
SPIKE_PASTEBOARD="app.hostbeam.spike"
# A key Claude Code accepts without asking, never valid: pasting an image does
# not call the API, so the test needs no account.
DUMMY_KEY="sk-ant-api03-$(printf 'x%.0s' $(seq 80))"

say() { printf '  %s\n' "$*"; }
die() { printf '  ✗ %s\n' "$*" >&2; exit 1; }
ssh_() { ssh -o BatchMode=yes -o ControlPath=none "$@"; }

build() {
  mkdir -p "$CACHE"
  if [ ! -x "$BIN" ] || [ "$HERE/mac-clipboard.swift" -nt "$BIN" ]; then
    swiftc -O -o "$BIN" "$HERE/mac-clipboard.swift" 2>&1 | grep -v '^$' || true
    [ -x "$BIN" ] || die "could not build mac-clipboard.swift"
  fi
}

cmd_install() {
  local alias="$1"
  ssh_ "$alias" 'mkdir -p ~/.local/bin ~/.hostbeam && chmod 700 ~/.hostbeam &&
    cat > ~/.local/bin/hostbeam-clip && chmod 755 ~/.local/bin/hostbeam-clip &&
    ln -sf hostbeam-clip ~/.local/bin/xclip && ln -sf hostbeam-clip ~/.local/bin/wl-paste &&
    command -v python3 >/dev/null || echo "warning: no python3 on this host; the stand-in needs it" >&2' \
    < "$HERE/hostbeam-clip"
  say "stand-in installed on $alias as ~/.local/bin/xclip and wl-paste"
  say "login PATH there: $(ssh_ "$alias" 'sh -lc "echo \$PATH"')"
}

cmd_uninstall() {
  ssh_ "$1" 'cd ~/.local/bin 2>/dev/null && rm -f xclip wl-paste hostbeam-clip; rm -f ~/.hostbeam/clipboard.sock'
  say "stand-in removed from $1"
}

# Holds one SSH connection that puts ~/.hostbeam/clipboard.sock on the host,
# answering from this Mac's clipboard. Stops by itself after the deadline
# (never leave a connection running).
#
# CTRL_V_VIA=relay (default): the connection's command is `hostbeam-clip
# serve`, which owns the socket and relays over the session's stdin/stdout.
# CTRL_V_VIA=forward: sshd forwards the socket (`ssh -R`) to a socat on this
# Mac — refused wherever AllowTcpForwarding is off, this test host included.
# -a -x on both: never forward the agent or X11 on this connection, whatever
# the user's ssh config says for the host.
SSH_HOLD=(-T -a -x -o BatchMode=yes -o ControlPath=none -o ServerAliveInterval=15 -o ServerAliveCountMax=2)
conn_dir="" conn_pid="" socat_pid="" timer_pid=""
connect_cleanup() {
  kill $timer_pid $conn_pid $socat_pid 2>/dev/null || true
  wait 2>/dev/null || true
  [ -n "$conn_dir" ] && rm -rf "$conn_dir"
  return 0
}

cmd_connect() {
  local alias="$1" minutes="${2:-30}"; shift 2
  build
  trap connect_cleanup EXIT INT TERM
  if [ "${CTRL_V_VIA:-relay}" = relay ]; then
    "$BIN" "$@" --relay -- ssh "${SSH_HOLD[@]}" "$alias" 'exec ~/.local/bin/hostbeam-clip serve' &
    conn_pid=$!
  else
    conn_dir="$(mktemp -d "${TMPDIR:-/tmp}/hb-ctrl-v.XXXXXX")"   # 0700; sun_path is 104 bytes on macOS
    socat "UNIX-LISTEN:$conn_dir/clip.sock,fork,mode=600" "EXEC:$BIN $*" &
    socat_pid=$!
    # sshd does not replace a stale socket (StreamLocalBindUnlink is off by
    # default), so one a dropped connection left behind is removed first.
    local home
    home="$(ssh_ "$alias" 'mkdir -p ~/.hostbeam && chmod 700 ~/.hostbeam && rm -f ~/'"$REMOTE_SOCK"' && printf %s "$HOME"')"
    ssh -N "${SSH_HOLD[@]}" -o ExitOnForwardFailure=yes -R "$home/$REMOTE_SOCK:$conn_dir/clip.sock" "$alias" &
    conn_pid=$!
  fi
  ( sleep $((minutes * 60)); kill "$conn_pid" 2>/dev/null ) &
  timer_pid=$!
  say "connecting ($(printf %s "${CTRL_V_VIA:-relay}")): Ctrl+V on $alias reads this Mac's clipboard for $minutes min (Ctrl+C stops it)"
  wait "$conn_pid" || true
  say "disconnected from $alias"
}

# Claude Code at its prompt in tmux, without an account: onboarding done, the
# dummy key approved, the home folder trusted. Merged into any real config.
seed_claude() {
  ssh_ "$1" "python3 - '${DUMMY_KEY: -20}'" <<'EOF'
import json, os, sys
p = os.path.expanduser("~/.claude.json")
c = json.load(open(p)) if os.path.exists(p) else {}
c.setdefault("hasCompletedOnboarding", True)
c.setdefault("theme", "dark")
r = c.setdefault("customApiKeyResponses", {"approved": [], "rejected": []})
if sys.argv[1] not in r["approved"]: r["approved"].append(sys.argv[1])
h = c.setdefault("projects", {}).setdefault(os.path.expanduser("~"), {})
h["hasTrustDialogAccepted"] = True
h["hasCompletedProjectOnboarding"] = True
json.dump(c, open(p, "w"))
EOF
}

CLAUDE_ENV="ANTHROPIC_API_KEY=$DUMMY_KEY CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 DISABLE_AUTOUPDATER=1"

# Waits for $1 to print something matching $2; prints the match.
wait_for() {
  local cmd="$1" pattern="$2" tries="${3:-40}" out
  for _ in $(seq "$tries"); do
    out="$(eval "$cmd" 2>/dev/null | grep -oE "$pattern" | head -1 || true)"
    [ -n "$out" ] && { printf '%s' "$out"; return 0; }
    sleep 0.5
  done
  return 1
}

# Test state is global: the EXIT trap runs after cmd_test has returned.
test_alias="" test_work="" test_pids=""
test_cleanup() {
  kill $test_pids 2>/dev/null || true; wait 2>/dev/null || true
  [ -n "$test_alias" ] && { ssh_ "$test_alias" 'tmux kill-session -t hb-ctrl-v 2>/dev/null' || true; }
  tmux -L hb-ctrl-v kill-server 2>/dev/null || true
  [ -n "$test_work" ] && rm -rf "$test_work"
  return 0
}

cmd_test() {
  local alias="$1" fails=0 a b started
  test_alias="$alias"
  build
  test_work="$(mktemp -d "${TMPDIR:-/tmp}/hb-ctrl-v-test.XXXXXX")"
  trap test_cleanup EXIT INT TERM
  ok()  { say "✓ $*"; }
  bad() { say "✗ $*"; fails=$((fails + 1)); }
  paste_image() { ssh_ "$alias" 'sh -lc "xclip -selection clipboard -t image/png -o"'; }
  sock_inode() { ssh_ "$alias" "stat -c %i ~/$REMOTE_SOCK 2>/dev/null" || true; }
  start_connection() {   # sets $started; logs to $test_work/connect-<name>.log
    ( cmd_connect "$alias" 5 --pasteboard "$SPIKE_PASTEBOARD" ) > "$test_work/connect-$1.log" 2>&1 &
    started=$!; test_pids="$test_pids $started"
  }
  stop_connection() { kill "$1" 2>/dev/null; wait "$1" 2>/dev/null || true; }

  # A fixture on a private pasteboard: the owner's clipboard is never read.
  python3 - "$test_work/fixture.png" <<'PY'
import struct, sys, zlib
w, h = 64, 48
raw = b"".join(b"\x00" + bytes((255, 80, 0)) * w for _ in range(h))
def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
open(sys.argv[1], "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))
PY
  "$BIN" --pasteboard "$SPIKE_PASTEBOARD" --set "$test_work/fixture.png"

  cmd_install "$alias" >/dev/null
  ssh_ "$alias" "rm -f ~/.hostbeam/stand-in.log ~/$REMOTE_SOCK"
  seed_claude "$alias"
  say "via ${CTRL_V_VIA:-relay}, on $alias"

  # 1. No connection: the stand-in says "nothing", as an empty clipboard would.
  paste_image >/dev/null 2>&1 && bad "with no connection, xclip should find nothing" \
    || ok "no connection: xclip finds nothing (exit 1)"

  start_connection a; a=$started
  if wait_for "ssh_ $alias 'test -S ~/$REMOTE_SOCK && echo up'" up 20 >/dev/null; then
    ok "connection up: ~/$REMOTE_SOCK exists on $alias"
  else bad "the socket never appeared:"; sed 's/^/      /' "$test_work/connect-a.log"; return 1; fi

  # 2. The socket is the owner's alone.
  local mode; mode="$(ssh_ "$alias" "stat -c %a ~/$REMOTE_SOCK")"
  [ "$mode" = 600 ] && ok "socket mode is 600" || bad "socket mode is $mode, not 600"

  # 3. The stand-in returns the Mac's bytes, unchanged.
  paste_image > "$test_work/got.png" || true
  cmp -s "$test_work/got.png" "$test_work/fixture.png" && ok "xclip -o image/png returns the Mac's PNG, byte for byte" \
    || bad "xclip returned $(wc -c < "$test_work/got.png") bytes, not the fixture"
  ssh_ "$alias" 'sh -lc "wl-paste --list-types"' | grep -qx 'image/png' \
    && ok "wl-paste --list-types offers image/png" || bad "wl-paste --list-types does not offer image/png"

  # 4. Ctrl+V in Claude Code, inside tmux on the host.
  ssh_ "$alias" "tmux new-session -d -s hb-ctrl-v -x 160 -y 40 -c ~ \"env $CLAUDE_ENV sh -lc claude\""
  local pane="ssh_ $alias 'tmux capture-pane -p -t hb-ctrl-v'"
  if wait_for "$pane" '❯' 60 >/dev/null; then
    ssh_ "$alias" 'tmux send-keys -t hb-ctrl-v C-v'
    wait_for "$pane" '\[Image #1\]' 20 >/dev/null && ok "Claude Code in tmux: Ctrl+V pasted [Image #1]" \
      || bad "Claude Code in tmux: Ctrl+V did not paste ($(eval "$pane" | grep -E '❯|mage' | head -2 | tr -s ' '))"
  else bad "Claude Code never reached its prompt in tmux"; fi
  ssh_ "$alias" 'tmux kill-session -t hb-ctrl-v' || true

  # 5. Ctrl+V through mosh, from a tmux on this Mac (its own server, -L).
  if [ -n "${MOSH_PORTS:-}" ]; then
    LANG=en_US.UTF-8 tmux -L hb-ctrl-v new-session -d -x 160 -y 40 \
      "LANG=en_US.UTF-8 mosh -p $MOSH_PORTS $alias -- env $CLAUDE_ENV sh -lc claude"
    pane="tmux -L hb-ctrl-v capture-pane -p"
    if wait_for "$pane" '❯' 60 >/dev/null; then
      tmux -L hb-ctrl-v send-keys C-v
      wait_for "$pane" '\[Image #1\]' 20 >/dev/null && ok "Claude Code over mosh: Ctrl+V pasted [Image #1]" \
        || bad "Claude Code over mosh: Ctrl+V did not paste"
    else bad "Claude Code never reached its prompt over mosh ($(eval "$pane" | grep -v '^$' | tail -2 | tr -s ' '))"; fi
    tmux -L hb-ctrl-v kill-server 2>/dev/null || true
  else say "- mosh skipped (set MOSH_PORTS, e.g. 60000:60009 for hostbeam-testhost)"; fi

  # 6. A second connection takes over, and the first leaving does not break it.
  if [ "${CTRL_V_VIA:-relay}" = relay ]; then
    local before; before="$(sock_inode)"
    start_connection b; b=$started
    wait_for "i=\$(sock_inode); [ -n \"\$i\" ] && [ \"\$i\" != $before ] && echo moved" moved 20 >/dev/null \
      && ok "a second connection takes the socket over" || bad "a second connection did not take over"
    stop_connection "$a"; sleep 1
    paste_image | cmp -s - "$test_work/fixture.png" && ok "the first one leaving leaves the second working" \
      || bad "the first connection leaving broke the second"
    a="$b"
  fi

  stop_connection "$a"; sleep 1

  # 7. Connection gone: back to nothing, and nothing left behind.
  paste_image >/dev/null 2>&1 && bad "after disconnecting, xclip still answers" \
    || ok "disconnected: xclip finds nothing again"
  [ -z "$(sock_inode)" ] && ok "the socket is gone from $alias" \
    || say "- the socket is still on $alias (stale; the next connection must remove it)"

  say ""
  say "what the Mac answered:"; cat "$test_work"/connect-*.log | grep '\[mac' | sed 's/^/    /' || true
  say "who asked, on $alias (~/.hostbeam/stand-in.log):"
  ssh_ "$alias" 'cat ~/.hostbeam/stand-in.log' | sed 's/^/    /'
  [ "$fails" -eq 0 ] && say "all passed" || { say "$fails failed"; return 1; }
}

# `paste`: what each agent on the host makes of a pasted beam path — the
# finding that most of 10a needs no helper (README, finding 8). Pastes into
# every installed agent the way a terminal's Cmd+V does (bracketed, through
# tmux), in a fresh session each time, and reports picture or text. Agents
# change this between releases: re-run it before relying on it.
PASTE_A=/tmp/hostbeam/hostbeam-1790500000000.png
PASTE_B=/tmp/hostbeam/hostbeam-1790500000001.png

agent_cmd() {     # the command that starts it, without an account
  case "$1" in
    claude)   printf '%s' "env $CLAUDE_ENV sh -lc claude" ;;
    codex)    printf '%s' 'sh -lc \"codex --no-daemon\"' ;;   # its daemon fails on Alpine
    gemini)   printf '%s' 'env GEMINI_API_KEY=dummy sh -lc gemini' ;;
    opencode) printf '%s' 'sh -lc opencode' ;;
  esac
}
agent_ready() {   # what its prompt shows once it can take a paste
  case "$1" in
    claude) printf '❯' ;; codex) printf 'Ask Codex' ;;
    gemini) printf 'Type your message' ;; opencode) printf 'Ask anything' ;;
  esac
}

seed_agents() {   # past each one's first-run screens; merged into real config
  local alias="$1" have="$2"
  case " $have " in *" claude "*) seed_claude "$alias" ;; esac
  case " $have " in *" codex "*)
    ssh_ "$alias" 'sh -lc "codex login status" >/dev/null 2>&1 || printf sk-dummy | sh -lc "codex login --with-api-key" >/dev/null' ;; esac
  case " $have " in *" gemini "*)
    ssh_ "$alias" python3 - <<'PY' ;;
import json, os
p = os.path.expanduser("~/.gemini/settings.json")
os.makedirs(os.path.dirname(p), exist_ok=True)
c = json.load(open(p)) if os.path.exists(p) else {}
c.setdefault("security", {}).setdefault("auth", {}).setdefault("selectedType", "gemini-api-key")
c["security"].setdefault("folderTrust", {"enabled": False})
c.setdefault("general", {}).setdefault("disableAutoUpdate", True)
json.dump(c, open(p, "w"))
PY
  esac
}

# Pastes $3 into agent $2 on $1; prints "N picture(s)", "+ path as text", or "text".
paste_into() {
  local alias="$1" agent="$2" text="$3" pane seen out n texty
  ssh_ "$alias" "tmux kill-session -t hb-paste 2>/dev/null; tmux new-session -d -s hb-paste -x 150 -y 40 -c ~ \"$(agent_cmd "$agent")\""
  pane="ssh_ $alias 'tmux capture-pane -p -t hb-paste'"
  seen="$(wait_for "$pane" "$(agent_ready "$agent")|Trust this folder" 60 || true)"
  if [ "$seen" = "Trust this folder" ]; then
    ssh_ "$alias" 'tmux send-keys -t hb-paste Enter'
    seen="$(wait_for "$pane" "$(agent_ready "$agent")" 40 || true)"
  fi
  [ -n "$seen" ] || { printf 'no prompt'; ssh_ "$alias" 'tmux kill-session -t hb-paste'; return; }
  sleep 1
  ssh_ "$alias" "tmux set-buffer -b hb-paste -- '$text' && tmux paste-buffer -p -d -b hb-paste -t hb-paste"
  sleep 4
  out="$(eval "$pane")"
  ssh_ "$alias" 'tmux kill-session -t hb-paste'
  n="$(printf '%s' "$out" | grep -o '\[Image' | wc -l | tr -d ' ')"
  texty="$(printf '%s' "$out" | grep -c '/tmp/hostbeam/hostbeam-' || true)"
  if [ "$n" -eq 0 ]; then printf 'text'
  elif [ "$texty" -eq 0 ]; then printf '%s picture%s' "$n" "$([ "$n" -gt 1 ] && echo s)"
  else printf '%s picture%s + path as text' "$n" "$([ "$n" -gt 1 ] && echo s)"; fi
}

cmd_paste() {
  local alias="$1" have agent label text
  have="$(ssh_ "$alias" 'for a in claude codex gemini opencode; do sh -lc "command -v $a" >/dev/null 2>&1 && printf "%s " $a; done')"
  [ -n "$have" ] || die "no agents on $alias (README: how to add them to the test host)"
  local fixture; fixture="$(mktemp "${TMPDIR:-/tmp}/hb-paste.XXXXXX")"
  python3 - "$fixture" <<'PY'
import struct, sys, zlib
w, h = 64, 48
raw = b"".join(b"\x00" + bytes((0, 120, 255)) * w for _ in range(h))
def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
open(sys.argv[1], "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))
PY
  ssh_ "$alias" "mkdir -p /tmp/hostbeam && cat > $PASTE_A && cp $PASTE_A $PASTE_B" < "$fixture"
  rm -f "$fixture"
  trap "ssh_ $alias 'tmux kill-session -t hb-paste 2>/dev/null; rm -f $PASTE_A $PASTE_B' || true" EXIT INT TERM
  seed_agents "$alias" "$have"
  say "pasting beam paths into: $have(on $alias, nothing installed there by Hostbeam)"
  local cases=(
    "one path|$PASTE_A"
    "the sentence (one file)|Use this screenshot: $PASTE_A"
    "two paths, one space apart|$PASTE_A $PASTE_B"
    "two files, sentence per line|Use this screenshot: $PASTE_A
Use this screenshot: $PASTE_B"
    "two files, path per line|$PASTE_A
$PASTE_B"
  )
  printf '  %-30s' "pasted"; for agent in $have; do printf '| %-28s' "$agent"; done; printf '\n'
  for c in "${cases[@]}"; do
    label="${c%%|*}"; text="${c#*|}"
    printf '  %-30s' "$label"
    for agent in $have; do printf '| %-28s' "$(paste_into "$alias" "$agent" "$text")"; done
    printf '\n'
  done
}

case "${1:-}" in
  install)   [ -n "${2:-}" ] || die "usage: $0 install <alias>"; cmd_install "$2" ;;
  uninstall) [ -n "${2:-}" ] || die "usage: $0 uninstall <alias>"; cmd_uninstall "$2" ;;
  connect)   [ -n "${2:-}" ] || die "usage: $0 connect <alias> [minutes] [--pasteboard NAME]"
             cmd_connect "$2" "${3:-30}" "${@:4}" ;;
  test)      [ -n "${2:-}" ] || die "usage: $0 test <alias>"; cmd_test "$2" ;;
  paste)     [ -n "${2:-}" ] || die "usage: $0 paste <alias>"; cmd_paste "$2" ;;
  *) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
