#!/usr/bin/env bash
# Put the App Review demo host on a Hetzner Cloud box, and take it away again.
# See docs/process/ios-submission-checklist.md § The demo-host problem.
#
#   scripts/reviewhost-deploy.sh up      # create it (costs money, hourly)
#   scripts/reviewhost-deploy.sh status  # what exists, and what it costs
#   scripts/reviewhost-deploy.sh notes   # the text for App Review Information
#   scripts/reviewhost-deploy.sh down    # destroy EVERYTHING it created
#
# This host accepts any ed25519 key by design. `down` is not tidying up, it is
# part of the design: the box must not outlive the review that needed it.
#
# No dependency beyond curl — deliberately. The whole thing is auditable in one
# file, and nothing new gets installed to run one server for two weeks.
set -euo pipefail

# The server type is DISCOVERED, not hardcoded. Rehearsing this on 2026-09-01
# got it wrong twice in a row: cx22 was deprecated ("server type 104 is
# deprecated"), and cpx11 is listed with a price for fsn1 but is not actually
# available there ("unsupported location for server type") — /server_types
# publishes prices for types you cannot create. Only /datacenters knows what can
# be built, and Hetzner retires types often enough that any constant here is a
# future failed submission-day deploy.
#
# EU by default: US locations are ~3x the price for the same machine, and
# latency is irrelevant when App Review uploads one small file over SFTP with no
# interactive session to feel it. Override with HOSTBEAM_SERVER_TYPE /
# HOSTBEAM_LOCATION.
API="https://api.hetzner.cloud/v1"
NAME="hostbeam-reviewhost"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/reviewhost"
STATE="${XDG_CONFIG_HOME:-$HOME/.config}/hostbeam-reviewhost"
ADMIN_KEY="$STATE/admin_ed25519"
# 1Password item holding the Hetzner Cloud token, matching how release secrets
# already work. HCLOUD_TOKEN in the environment wins, for CI or a one-off.
OP_ITEM="${HOSTBEAM_HCLOUD_OP_ITEM:-Hetzner}"
OP_FIELD="${HOSTBEAM_HCLOUD_OP_FIELD:-HCLOUD_TOKEN (hostbeam review host)}"

die() { printf '  ✗ %s\n' "$*" >&2; exit 1; }
say() { printf '  %s\n' "$*"; }
command -v curl >/dev/null || die "curl not found"

# Usage needs no credential. Resolving the token first meant `--help` demanded
# one, which is a small thing that makes a tool feel hostile.
case "${1:-}" in
  up|status|notes|down) ;;
  *) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac

token() {
  if [ -n "${HCLOUD_TOKEN:-}" ]; then printf '%s' "$HCLOUD_TOKEN"; return; fi
  command -v op >/dev/null || die "no HCLOUD_TOKEN and no 1Password CLI"
  # Matched on the TRIMMED label. A field named " HCLOUD_TOKEN (…)" with a
  # leading space looks identical in 1Password's UI and fails an exact lookup,
  # which is a long detour for an invisible character.
  op item get "$OP_ITEM" --format json 2>/dev/null | python3 -c "
import json,sys
want = ${OP_FIELD@Q}.strip()
for f in (json.load(sys.stdin).get('fields') or []):
    if (f.get('label') or '').strip() == want and f.get('value'):
        print(f['value'].strip()); break
" 
}
TOKEN="$(token)"
[ -n "$TOKEN" ] || die "the Hetzner token resolved to an empty string"

api() { # api METHOD PATH [json]
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -sS -X "$method" "$API$path" -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" -d "$body"
  else
    curl -sS -X "$method" "$API$path" -H "Authorization: Bearer $TOKEN"
  fi
}
jq_() { python3 -c "import json,sys;d=json.load(sys.stdin);print($1)" 2>/dev/null || true; }

server_id() { api GET "/servers?name=$NAME" | jq_ "(d['servers'] or [{}])[0].get('id','')"; }
server_ip() { api GET "/servers?name=$NAME" | jq_ "(d['servers'] or [{}])[0].get('public_net',{}).get('ipv4',{}).get('ip','')"; }

case "${1:-}" in
up)
  [ -n "$(server_id)" ] && die "$NAME already exists — 'status' to see it, 'down' to remove it"

  mkdir -p "$STATE"; chmod 700 "$STATE"
  [ -f "$ADMIN_KEY" ] || {
    ssh-keygen -q -t ed25519 -N '' -C "$NAME-admin" -f "$ADMIN_KEY"
    say "generated a dedicated admin key (never your own, never in the repo)"
  }
  # Upload the admin key, or reuse it if a previous run left it there.
  KEY_ID="$(api GET "/ssh_keys?name=$NAME-admin" | jq_ "(d['ssh_keys'] or [{}])[0].get('id','')")"
  if [ -z "$KEY_ID" ]; then
    KEY_ID="$(api POST /ssh_keys "$(python3 -c "
import json,sys
print(json.dumps({'name':'$NAME-admin','public_key':open('$ADMIN_KEY.pub').read().strip()}))")" \
      | jq_ "d['ssh_key']['id']")"
  fi
  [ -n "$KEY_ID" ] || die "could not register the admin SSH key"

  # Only two ports, and 22 only so this can be debugged and torn down.
  FW_ID="$(api GET "/firewalls?name=$NAME" | jq_ "(d['firewalls'] or [{}])[0].get('id','')")"
  if [ -z "$FW_ID" ]; then
    FW_ID="$(api POST /firewalls '{
      "name":"'"$NAME"'",
      "rules":[
        {"direction":"in","protocol":"tcp","port":"22","source_ips":["0.0.0.0/0","::/0"],"description":"admin"},
        {"direction":"in","protocol":"tcp","port":"2222","source_ips":["0.0.0.0/0","::/0"],"description":"review host"}
      ]}' | jq_ "d['firewall']['id']")"
  fi
  [ -n "$FW_ID" ] || die "could not create the firewall"

  # cloud-init carries the container's files inline, from scripts/reviewhost/,
  # so the box never needs credentials for a private repo — and there is one
  # source of truth for the configuration that was verified locally.
  USER_DATA="$(python3 - "$DIR" <<'PY'
import base64, json, sys, pathlib
d = pathlib.Path(sys.argv[1])
files = {n: (d / n).read_text() for n in
         ("Dockerfile", "sshd.conf", "any-key.sh", "entrypoint.sh")}
write = "\n".join(
    f"  - path: /opt/reviewhost/{n}\n    permissions: '0644'\n    encoding: b64\n"
    f"    content: {base64.b64encode(c.encode()).decode()}"
    for n, c in files.items())
# `apparmor` is not optional here. Debian 12 enables AppArmor in the kernel
# but docker.io does not pull in the userspace parser, so `docker build` dies
# with "apparmor_parser: executable file not found" — and the next runcmd then
# tried to *pull* an image that had never been built, failing with a confusing
# "repository does not exist". Found by rehearsing this on 2026-09-01.
#
# The build and run are one command chained with &&, so a failed build can
# never be followed by a run that reaches for Docker Hub.
print(f"""#cloud-config
package_update: true
packages: [docker.io, apparmor, apparmor-utils]
write_files:
{write}
runcmd:
  - systemctl enable --now docker
  - sh -c 'docker build -t hostbeam-reviewhost /opt/reviewhost && docker run -d --restart unless-stopped --name hostbeam-reviewhost -p 2222:2222 -v hostbeam-reviewhost-keys:/etc/ssh/keys hostbeam-reviewhost'
""")
PY
)"

  # Ask what can actually be built, cheapest first.
  PICK="$(python3 - "$TOKEN" "${HOSTBEAM_LOCATION:-}" "${HOSTBEAM_SERVER_TYPE:-}" <<'PY'
import json, sys, urllib.request
tok, want_loc, want_type = sys.argv[1], sys.argv[2], sys.argv[3]
def get(path):
    req = urllib.request.Request("https://api.hetzner.cloud/v1" + path,
                                 headers={"Authorization": "Bearer " + tok})
    return json.load(urllib.request.urlopen(req))
types = {t["id"]: t for t in get("/server_types?per_page=60")["server_types"]}
cands = []
for dc in get("/datacenters?per_page=50")["datacenters"]:
    loc = dc["location"]["name"]
    if want_loc and loc != want_loc:
        continue
    for tid in dc["server_types"]["available"]:
        t = types.get(tid)
        if not t or t.get("deprecated") or t.get("deprecation"):
            continue
        if want_type and t["name"] != want_type:
            continue
        # EU unless asked otherwise: same machine, roughly a third of the price.
        if not want_loc and not loc.startswith(("fsn", "nbg", "hel")):
            continue
        price = next((float(p["price_hourly"]["net"]) for p in t["prices"]
                      if p["location"] == loc), None)
        if price is None:
            continue
        cands.append((price, t["name"], loc))
for price, name, loc in sorted(cands):
    print(f"{name} {loc} {price:.4f}")
PY
)"
  [ -n "$PICK" ] || die "no non-deprecated server type is available — check the Hetzner console"
  # Cheapest first, and on to the next when Hetzner refuses one. "Available"
  # in /datacenters is not the same as "will build": on 2026-09-03 cax11 was
  # listed for nbg1 and the create came back "unsupported location for server
  # type", while cpx12 in the same location built fine.
  IP=""
  while read -r SRV_TYPE SRV_LOC SRV_PRICE; do
    say "creating $NAME ($SRV_TYPE in $SRV_LOC, Debian 12) — EUR $SRV_PRICE/hr …"
    RESP="$(api POST /servers "$(python3 -c "
import json,sys
print(json.dumps({
  'name':'$NAME','server_type':'$SRV_TYPE',
  'image':'debian-12','location':'$SRV_LOC',
  'ssh_keys':[$KEY_ID],'firewalls':[{'firewall':$FW_ID}],
  'user_data':sys.stdin.read(),
  'labels':{'purpose':'ios-app-review','delete-after':'app-approved'},
}))" <<< "$USER_DATA")")"
    ERR="$(printf '%s' "$RESP" | jq_ "d.get('error',{}).get('message','')")"
    if [ -n "$ERR" ]; then say "  refused: $ERR — trying the next type"; continue; fi
    IP="$(printf '%s' "$RESP" | jq_ "d['server']['public_net']['ipv4']['ip']")"
    break
  done <<< "$PICK"
  [ -n "$IP" ] || die "Hetzner refused every candidate — check the console"
  say "created — $IP"
  say ""
  say "cloud-init is installing Docker and building the image; give it ~2 min,"
  say "then: scripts/reviewhost-deploy.sh status"
  ;;

status)
  ID="$(server_id)"; [ -n "$ID" ] || { say "no $NAME server exists"; exit 0; }
  IP="$(server_ip)"
  say "server : $NAME ($ID) at $IP"
  say "name   : review.hostbeam.app → $(dig +short +time=3 +tries=1 A review.hostbeam.app 2>/dev/null | head -1) (must be $IP; set by hand in Cloudflare, DNS only)"
  if nc -z -w 4 "$IP" 2222 2>/dev/null; then
    say "port   : 2222 open"
    say "hostkey: $(ssh-keyscan -p 2222 -t ed25519 "$IP" 2>/dev/null | ssh-keygen -lf - 2>/dev/null | awk '{print $2}')"
  else
    say "port   : 2222 NOT open yet (cloud-init may still be building)"
  fi
  say "admin  : ssh -i $ADMIN_KEY root@$IP"
  say ""
  say "This accepts ANY ed25519 key. Destroy it the day the app is approved."
  ;;

notes)
  IP="$(server_ip)"; [ -n "$IP" ] || die "no server yet — run 'up' first"
  # The text lives in docs/marketing/app-review-notes.md (the whole of App
  # Review Information, not just the host block); this fills in the box.
  DOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/docs/marketing/app-review-notes.md"
  say "── For App Store Connect → App Review Information → Notes ──"
  echo
  sed -n '/^---$/,$p' "$DOC" | tail -n +2 | sed "s/{{HOST}}/$IP/g"
  ;;

down)
  ID="$(server_id)"
  if [ -n "$ID" ]; then api DELETE "/servers/$ID" >/dev/null; say "server destroyed"; else say "no server"; fi
  FW_ID="$(api GET "/firewalls?name=$NAME" | jq_ "(d['firewalls'] or [{}])[0].get('id','')")"
  [ -n "$FW_ID" ] && { sleep 3; api DELETE "/firewalls/$FW_ID" >/dev/null 2>&1 && say "firewall destroyed"; }
  KEY_ID="$(api GET "/ssh_keys?name=$NAME-admin" | jq_ "(d['ssh_keys'] or [{}])[0].get('id','')")"
  [ -n "$KEY_ID" ] && { api DELETE "/ssh_keys/$KEY_ID" >/dev/null 2>&1 && say "admin key removed"; }
  say ""
  say "Delete review.hostbeam.app's A and AAAA records in Cloudflare too: they"
  say "point at an address Hetzner will hand to someone else."
  say ""
  say "Nothing of this host remains. Check the Hetzner console once, though —"
  say "an unbilled surprise is exactly what a forgotten demo box becomes."
  ;;

*) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
