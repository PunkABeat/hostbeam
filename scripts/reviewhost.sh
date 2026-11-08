#!/usr/bin/env bash
# The App Review demo host: an SSH server that accepts any ed25519 key.
# See docs/process/ios-submission-checklist.md § The demo-host problem.
#
# It accepts any key because it has to: Hostbeam's iOS device key is minted on
# first use in that install's Keychain, so the reviewer's key cannot be known
# in advance and there is no password fallback. Everything else about this host
# exists to make that safe — sftp only, chrooted, no forwarding, one writable
# directory, nothing of value, and torn down at approval.
#
#   scripts/reviewhost.sh up        # run it locally, to verify before exposing it
#   scripts/reviewhost.sh check     # prove an unseen key can beam, and only that
#   scripts/reviewhost.sh down      # stop it
#   scripts/reviewhost.sh remote    # what to run on the VPS, and when to kill it
set -euo pipefail

NAME="hostbeam-reviewhost"
PORT="${HOSTBEAM_REVIEWHOST_PORT:-2224}"
# `check` against the deployed box, as submission day needs:
#   HOSTBEAM_REVIEWHOST_ADDR=<public ip> HOSTBEAM_REVIEWHOST_PORT=2222 scripts/reviewhost.sh check
ADDR="${HOSTBEAM_REVIEWHOST_ADDR:-127.0.0.1}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/reviewhost"

die() { printf '  ✗ %s\n' "$*" >&2; exit 1; }
say() { printf '  %s\n' "$*"; }
command -v docker >/dev/null || die "docker not found"

build() { docker build -q -t "$NAME" "$DIR" >/dev/null; }

case "${1:-}" in
up)
  build
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker run -d --name "$NAME" -p "$PORT:2222" \
    -v "$NAME-keys:/etc/ssh/keys" "$NAME" >/dev/null
  sleep 2
  say "running on port $PORT — user 'review', folder /tmp/hostbeam"
  say "host key : $(docker exec "$NAME" ssh-keygen -lf /etc/ssh/keys/ssh_host_ed25519_key.pub | awk '{print $2}')"
  say ""
  say "This accepts ANY ed25519 key. Never run it anywhere that matters,"
  say "and tear it down the day the app is approved."
  ;;

check)
  # Proves the two things that matter: an unseen key CAN beam, and can do
  # nothing else. `ControlPath=none` is load-bearing — a shared connection from
  # ~/.ssh/config silently reuses an earlier successful auth and every negative
  # test then passes for the wrong reason.
  O=(-o ControlPath=none -o ControlMaster=no -o StrictHostKeyChecking=no
     -o UserKnownHostsFile=/dev/null -o IdentitiesOnly=yes -o BatchMode=yes
     -o ConnectTimeout=6)
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  ssh-keygen -q -t ed25519 -N '' -C unseen -f "$tmp/ed"
  ssh-keygen -q -t rsa -b 3072 -N '' -C unseen -f "$tmp/rsa"
  ok() { printf '  %-40s %s\n' "$1" "$2"; }

  echo hostbeam-probe > "$tmp/probe.txt"
  if sftp -P "$PORT" "${O[@]}" -i "$tmp/ed" review@$ADDR \
       <<< "put $tmp/probe.txt /tmp/hostbeam/probe.txt" >/dev/null 2>&1
  then ok "unseen key uploads to /tmp/hostbeam" "PASS"
  else ok "unseen key uploads to /tmp/hostbeam" "FAIL"; fi

  # Everything else the app asks of a session, in one go, because a reviewer
  # will. The original check proved a single upload, which was the whole app in
  # September; since then a beam can carry up to 25 files, it probes each name
  # before writing so it never overwrites, and the host detail screen lists and
  # deletes. Any one of those failing inside a chroot is a rejection, and the
  # cheapest place to find out is here.
  for i in 1 2 3; do echo "batch-$i" > "$tmp/b$i.png"; done
  {
    echo "-mkdir /tmp/hostbeam"                                   # ensureDirectory, idempotent
    for i in 1 2 3; do echo "put $tmp/b$i.png /tmp/hostbeam/hostbeam-check-$i.png"; done
    echo "ls -l /tmp/hostbeam/hostbeam-check-1.png"               # exists(), the collision probe
    echo "ls /tmp/hostbeam"                                       # the Storage view
    for i in 1 2 3; do echo "rm /tmp/hostbeam/hostbeam-check-$i.png"; done   # Clean up
    echo "rm /tmp/hostbeam/probe.txt"          # the reviewer's Storage view starts empty
  } > "$tmp/batch"
  if sftp -P "$PORT" "${O[@]}" -i "$tmp/ed" -b "$tmp/batch" review@$ADDR >/dev/null 2>&1
  then ok "batch upload, probe, list and delete" "PASS"
  else ok "batch upload, probe, list and delete" "FAIL"; fi

  # The app's own preflight, which the checks above do not make: SFTP has no
  # "who am I", so the folder a session starts in stands for the login, and a
  # beam folder owned by anyone else is refused. On 2026-09-28 every check here
  # passed while every beam from the phone failed this — the session started
  # at the chroot's top, which must be root's. sshd.conf's `-d` is the fix.
  owner() { # the uid of the "." entry in `ls -lna <dir>`
    sftp -P "$PORT" "${O[@]}" -i "$tmp/ed" review@$ADDR <<< "ls -lna $1" 2>/dev/null \
      | awk '$NF ~ /\/\.$/ { print $3; exit }'
  }
  start="$(owner .)"; folder="$(owner /tmp/hostbeam)"
  if [ -n "$start" ] && [ "$start" = "$folder" ]
  then ok "app sees /tmp/hostbeam as the login's" "PASS"
  else ok "app sees /tmp/hostbeam as the login's" "FAIL: starts in uid '$start', folder is uid '$folder'"; fi

  r=$(ssh -p "$PORT" "${O[@]}" -i "$tmp/ed" review@$ADDR "cat /etc/shadow" 2>&1 || true)
  case "$r" in *"sftp connections only"*) ok "shell refused" "PASS";; *) ok "shell refused" "FAIL: $r";; esac

  r=$(ssh -p "$PORT" "${O[@]}" -i "$tmp/rsa" review@$ADDR true 2>&1 || true)
  case "$r" in *"denied"*) ok "non-ed25519 key refused" "PASS";; *) ok "non-ed25519 key refused" "FAIL: $r";; esac

  for u in root dev admin; do
    r=$(ssh -p "$PORT" "${O[@]}" -i "$tmp/ed" "$u@$ADDR" true 2>&1 || true)
    case "$r" in *"denied"*|*"closed"*) ok "user '$u' refused" "PASS";; *) ok "user '$u' refused" "FAIL: $r";; esac
  done

  r=$(sftp -P "$PORT" "${O[@]}" -i "$tmp/ed" review@$ADDR <<< "get /etc/shadow $tmp/stolen" 2>&1 || true)
  [ -f "$tmp/stolen" ] && ok "chroot contains it" "FAIL — read /etc/shadow" || ok "chroot contains it" "PASS"
  ;;

down) docker rm -f "$NAME" >/dev/null 2>&1 && say "stopped" || say "not running" ;;

remote)
  cat <<'REMOTE'
  On a throwaway VPS that holds nothing else:

    git clone <repo> && cd hostbeam/scripts/reviewhost
    docker build -t hostbeam-reviewhost .
    docker run -d --restart unless-stopped --name hostbeam-reviewhost \
      -p 2222:2222 -v hostbeam-reviewhost-keys:/etc/ssh/keys hostbeam-reviewhost

  Put in the App Review notes: the hostname, port 2222, user "review", and
  that the remote folder is the app's default (/tmp/hostbeam) so they change
  nothing. Verify from an ERASED simulator (xcrun simctl erase) — one that has
  run Hostbeam before reuses its Keychain key and passes for the wrong reason.

  Then, the day the app is approved:

    docker rm -f hostbeam-reviewhost && docker volume rm hostbeam-reviewhost-keys

  and destroy the VPS. This host accepts any key; it should not outlive the
  review that needed it.
REMOTE
  ;;

*) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
