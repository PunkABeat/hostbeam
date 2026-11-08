#!/bin/bash
# Archive the iOS app and upload it to App Store Connect, from the terminal.
#
#   scripts/release-ios.sh signing        # once per Mac: distribution cert + App Store profiles
#   scripts/release-ios.sh archive        # Release archive into apps/mobile/build/
#   scripts/release-ios.sh upload         # export + upload the archive with the API key
#   scripts/release-ios.sh validate       # export + validate only (no upload)
#
# `signing` exists because this account's API keys cannot use Apple's
# cloud-managed distribution certificate (the option is not offered when
# generating a key here, and automatic export fails with "Cloud signing
# permission error"). So signing is local and explicit. The certificate is the
# team's iOS Distribution certificate already in the login keychain, else its
# backup in 1Password (item "iOS Distribution certificate (U3C6XC6LHJ)": the
# .p12 attached, its password in a password field), imported; only when
# neither holds a valid one does `asc` have Apple issue a new one, for a key
# generated on this Mac. A second certificate is the last resort: the team has
# a cap on them, any other app on the team signs with this one, and each is one more to
# renew. Then it creates one App Store provisioning profile per bundle id
# (app + 3 extensions) that includes it, installed where Xcode looks.
# Run it again after the PunkABeat conversion, when everything here changes.
#
# Uploading is repeatable; submitting for review is not, and this script never
# does it. Submission is a deliberate step in App Store Connect (or `asc`).
#
# Needs an App Store Connect API key with the App Manager role AND the
# "Access to Cloud Managed Distribution Certificate" option enabled when it is
# generated — the export signs with Apple's cloud-managed distribution
# certificate, and a key without that option fails with "Cloud signing
# permission error / No signing certificate iOS Distribution found" (found
# 2026-09-04 with the first key). Keys cannot be edited afterwards: generate a
# new one and revoke the old. NOT the APPSTORE_* key the licensing worker uses
# (that is an App Store Server API key; two keys, two jobs). Create it in
# App Store Connect → Users and Access → Integrations → App Store Connect API →
# Team Keys, download the .p8 once, and
# keep it in 1Password as item "App Store Connect API (Apple Store)" (renamed 2026-10-29) with fields
# `Key ID` and `Issuer ID` and the .p8 attached to the item (any file name
# ending in .p8) — or export ASC_KEY_ID, ASC_ISSUER_ID and ASC_KEY_PATH.
# `npm run stats` cannot use this key: Apple refuses an App Manager key the
# sales reports, so scripts/appstore.mjs has its own Sales-role key.
#
# The export uses `destination: upload`, so xcodebuild itself performs the
# upload with the key: no altool, no Transporter. On success the build is
# appended to apps/mobile/uploads.json, which is what lets
# scripts/check-version-sync.mjs refuse a reused build number next time.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE="$ROOT/apps/mobile"
BUILD="$MOBILE/build"
ARCHIVE="$BUILD/Hostbeam.xcarchive"
OP_ITEM="${HOSTBEAM_ASC_OP_ITEM:-App Store Connect API (Apple Store)}"

die() { printf '  ✗ %s\n' "$*" >&2; exit 1; }
say() { printf '  %s\n' "$*"; }

version() { grep -E '^\s*MARKETING_VERSION:' "$MOBILE/project.yml" | sed -E 's/.*"([^"]+)".*/\1/'; }
build_no() { grep -E '^\s*CURRENT_PROJECT_VERSION:' "$MOBILE/project.yml" | sed -E 's/.*"([^"]+)".*/\1/'; }

op_item_id() { # op_item_id <title> → the item's id, empty if there is none; fails if op cannot list
  # Matched on the TRIMMED title: a leading space in a 1Password title is
  # invisible in its UI and fails an exact lookup (it bit the Hetzner token's
  # field label on 2026-09-01, and the API key item's title on 2026-09-04).
  local list
  list="$(op item list --format json 2>/dev/null)" || return 1
  printf '%s' "$list" | python3 -c "
import json,sys
want = sys.argv[1].strip()
for i in json.load(sys.stdin):
    if (i.get('title') or '').strip() == want:
        print(i['id']); break
" "$1"
}

asc_key() {
  # Resolve the key to ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH.
  if [ -n "${ASC_KEY_ID:-}" ] && [ -n "${ASC_ISSUER_ID:-}" ] && [ -f "${ASC_KEY_PATH:-}" ]; then return; fi
  command -v op >/dev/null || die "no ASC_KEY_ID/ASC_ISSUER_ID/ASC_KEY_PATH and no 1Password CLI"
  local id json
  id="$(op_item_id "$OP_ITEM")" || die "could not list 1Password items — is 1Password unlocked?"
  [ -n "$id" ] || die "1Password item '$OP_ITEM' not found — see the header"
  json="$(op item get "$id" --format json 2>/dev/null)" || die "could not read 1Password item '$OP_ITEM'"
  ASC_KEY_ID="$(printf '%s' "$json" | python3 -c "import json,sys;print(next((f['value'] for f in json.load(sys.stdin).get('fields',[]) if (f.get('label') or '').strip()=='Key ID'),''))")"
  ASC_ISSUER_ID="$(printf '%s' "$json" | python3 -c "import json,sys;print(next((f['value'] for f in json.load(sys.stdin).get('fields',[]) if (f.get('label') or '').strip()=='Issuer ID'),''))")"
  [ -n "$ASC_KEY_ID" ] && [ -n "$ASC_ISSUER_ID" ] || die "the 1Password item needs 'Key ID' and 'Issuer ID' fields"
  ASC_KEY_PATH="$BUILD/AuthKey_$ASC_KEY_ID.p8"
  mkdir -p "$BUILD"
  # The .p8 is whatever file is attached to the item; 1Password serves item
  # files by name through op://<vault>/<item>/<file name>.
  local vault file
  vault="$(printf '%s' "$json" | python3 -c "import json,sys;print(json.load(sys.stdin)['vault']['name'])")"
  file="$(printf '%s' "$json" | python3 -c "import json,sys;print(next((f['name'] for f in json.load(sys.stdin).get('files',[]) if f.get('name','').endswith('.p8')),''))")"
  [ -n "$file" ] || die "no .p8 file is attached to the 1Password item '$OP_ITEM'"
  op read "op://$vault/$id/$file" > "$ASC_KEY_PATH" 2>/dev/null \
    || die "could not fetch '$file' from 1Password"
  chmod 600 "$ASC_KEY_PATH"
  export ASC_KEY_ID ASC_ISSUER_ID ASC_KEY_PATH
}

TEAM_ID="U3C6XC6LHJ"
CERT_OP_ITEM="${HOSTBEAM_CERT_OP_ITEM:-iOS Distribution certificate ($TEAM_ID)}"
BUNDLES="app.hostbeam.ios.Hostbeam app.hostbeam.ios.Hostbeam.HostbeamShare app.hostbeam.ios.Hostbeam.HostbeamAction app.hostbeam.ios.Hostbeam.HostbeamWidgets"
profile_name() { echo "Hostbeam App Store ${1##*.}"; }   # e.g. "Hostbeam App Store HostbeamShare"

export_options() { # export_options <destination: upload|export>
  local profiles=""
  for b in $BUNDLES; do profiles="$profiles    <key>$b</key><string>$(profile_name "$b")</string>\n"; done
  printf '%b' "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>$1</string>
  <key>teamID</key><string>$TEAM_ID</string>
  <key>signingStyle</key><string>manual</string>
  <key>signingCertificate</key><string>iPhone Distribution</string>
  <key>provisioningProfiles</key><dict>
$profiles  </dict>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
" > "$BUILD/ExportOptions.plist"
}

asc_login() { # register the key with asc (idempotent), credentials outside the repo
  asc_key
  asc auth login --bypass-keychain --name hostbeam --key-id "$ASC_KEY_ID" --issuer-id "$ASC_ISSUER_ID" \
    --private-key "$ASC_KEY_PATH" >/dev/null 2>&1 || die "asc auth login failed"
}

dist_identity() { # dist_identity [keychain]: is a valid distribution identity for the team there?
  security find-identity -v -p codesigning ${1:+"$1"} 2>/dev/null | grep -q "iPhone Distribution: .*($TEAM_ID)"
}

import_cert() { # import_cert <keychain>: the team's certificate from its 1Password backup
  # Returns 1 only when there is no backup. A backup that is there and does
  # not import stops the script, so a locked 1Password or a wrong password
  # never ends in Apple issuing a second certificate.
  command -v op >/dev/null || die "no 1Password CLI to fetch '$CERT_OP_ITEM' — install it, or import the .p12 by hand"
  local id json vault file pw_field pw p12
  id="$(op_item_id "$CERT_OP_ITEM")" || die "could not list 1Password items — is 1Password unlocked?"
  [ -n "$id" ] || return 1
  json="$(op item get "$id" --format json 2>/dev/null)" || die "could not read 1Password item '$CERT_OP_ITEM'"
  # References use ids, not names: op:// accepts only letters, digits, spaces,
  # - _ and . in a name, and the item's title has parentheses.
  vault="$(printf '%s' "$json" | python3 -c "import json,sys;print(json.load(sys.stdin)['vault']['id'])")"
  file="$(printf '%s' "$json" | python3 -c "import json,sys;print(next((f['id'] for f in json.load(sys.stdin).get('files',[]) if f.get('name','').lower().endswith('.p12')),''))")"
  # The password field, or failing one the first concealed field.
  pw_field="$(printf '%s' "$json" | python3 -c "
import json,sys
f = json.load(sys.stdin).get('fields', [])
p = next((x for x in f if x.get('purpose') == 'PASSWORD'), None) or next((x for x in f if x.get('type') == 'CONCEALED'), None)
print(p['id'] if p else '')")"
  [ -n "$file" ] || die "no .p12 file is attached to the 1Password item '$CERT_OP_ITEM'"
  [ -n "$pw_field" ] || die "the 1Password item '$CERT_OP_ITEM' has no password field"
  pw="$(op read "op://$vault/$id/$pw_field" 2>/dev/null)" || die "could not read the .p12's password from 1Password"
  p12="$(mktemp "${TMPDIR:-/tmp}/hostbeam-dist.XXXXXX")"
  op read "op://$vault/$id/$file" --out-file "$p12" --force >/dev/null 2>&1 \
    || { rm -f "$p12"; die "could not fetch the .p12 from 1Password"; }
  # -T: codesign may use the key without asking, or a headless build stalls
  # on a "codesign wants to access key" dialog.
  security import "$p12" -k "$1" -f pkcs12 -P "$pw" -T /usr/bin/codesign -T /usr/bin/security >/dev/null 2>&1 \
    || { rm -f "$p12"; die "could not import the .p12 from '$CERT_OP_ITEM' — is its password the right one?"; }
  rm -f "$p12"
}

case "${1:-}" in
signing)
  command -v asc >/dev/null || die "asc not installed (brew install asc)"
  asc_login
  mkdir -p "$BUILD"
  KC="$HOME/Library/Keychains/login.keychain-db"
  # Certificate: the one in the keychain, else the backup in 1Password, else
  # have Apple issue one (the header says why that is the last resort).
  if dist_identity; then
    say "distribution certificate already in the keychain"
  elif import_cert "$KC" && dist_identity; then
    say "distribution certificate imported from 1Password ('$CERT_OP_ITEM')"
  else
    say "no valid distribution certificate in the keychain or in 1Password ('$CERT_OP_ITEM') — having Apple issue one"
    asc certificates create --certificate-type IOS_DISTRIBUTION --generate-csr \
      --common-name "Hostbeam Distribution" --key-out "$BUILD/dist.key" --csr-out "$BUILD/dist.csr" --force \
      --output json > "$BUILD/cert-create.json" 2>&1 || die "certificate creation failed: $(cat "$BUILD/cert-create.json")"
    python3 -c "import json,base64,sys;d=json.load(open(sys.argv[1]));d=d.get('data',d);open(sys.argv[2],'wb').write(base64.b64decode(d['attributes']['certificateContent']))" "$BUILD/cert-create.json" "$BUILD/dist.cer"
    security import "$BUILD/dist.key" -k "$KC" -T /usr/bin/codesign -T /usr/bin/security -T /usr/bin/productbuild >/dev/null
    security import "$BUILD/dist.cer" -k "$KC" -T /usr/bin/codesign >/dev/null
    say "distribution certificate issued and imported (private key: $BUILD/dist.key — not in git)"
    say "back it up: export it from Keychain Access as .p12 into 1Password item 'iOS Distribution certificate ($TEAM_ID)', replacing the old one"
  fi
  CERT_IDS="$(asc certificates list --certificate-type IOS_DISTRIBUTION --output json | python3 -c "import json,sys;d=json.load(sys.stdin);print(','.join(c['id'] for c in d.get('data',d)))")"
  [ -n "$CERT_IDS" ] || die "no distribution certificates on the account"
  # Profiles: one App Store profile per bundle id, with every distribution cert.
  for b in $BUNDLES; do
    name="$(profile_name "$b")"
    bid="$(asc bundle-ids list --output json | python3 -c "import json,sys;d=json.load(sys.stdin);print(next((x['id'] for x in d.get('data',d) if x['attributes']['identifier']==sys.argv[1]),''))" "$b")"
    [ -n "$bid" ] || die "bundle id $b is not registered on the account"
    old="$(asc profiles list --output json | python3 -c "import json,sys;d=json.load(sys.stdin);print(next((x['id'] for x in d.get('data',d) if x['attributes']['name']==sys.argv[1]),''))" "$name")"
    [ -n "$old" ] && asc profiles delete --id "$old" --confirm >/dev/null 2>&1
    pid="$(asc profiles create --name "$name" --profile-type IOS_APP_STORE --bundle "$bid" --certificate "$CERT_IDS" --output json | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('data',d)['id'])")"
    [ -n "$pid" ] || die "could not create profile $name"
    # asc refuses to overwrite, so a second run (a new capability, 2026-09-19)
    # stopped here with the portal's profile already replaced and the rest not.
    rm -f "$BUILD/$name.mobileprovision"
    asc profiles download --id "$pid" --output "$BUILD/$name.mobileprovision" >/dev/null
    uuid="$(security cms -D -i "$BUILD/$name.mobileprovision" | plutil -extract UUID raw -)"
    for dir in "$HOME/Library/MobileDevice/Provisioning Profiles" "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"; do
      mkdir -p "$dir"; cp -f "$BUILD/$name.mobileprovision" "$dir/$uuid.mobileprovision"
    done
    say "profile: $name ($uuid)"
  done
  ;;
archive)
  node "$ROOT/scripts/check-version-sync.mjs" || die "fix the version check first"
  # Settings → About → Open source licenses must match Package.resolved.
  node "$ROOT/scripts/third-party-notices.mjs" --check || die "run: node scripts/third-party-notices.mjs"
  # The iPhone gates on a clean Mac, which pushes no longer trigger.
  "$ROOT/scripts/check-ci-passed.sh" iphone.yml || die "iphone.yml has to pass on this commit first"
  say "archiving Hostbeam $(version) ($(build_no)) — Release, automatic signing …"
  ( cd "$MOBILE" && xcodegen generate >/dev/null && rm -rf "$ARCHIVE" && xcodebuild -project Hostbeam.xcodeproj -scheme Hostbeam \
      -configuration Release -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
      -allowProvisioningUpdates -quiet archive ) || die "archive failed"
  # iPhone only, in every bundle. XcodeGen's target preset quietly made builds
  # 1–11 iPad apps too; App Store Connect then wants iPad screenshots, reviewers
  # test an iPad layout nobody designed, and once shipped the family can never
  # be dropped (project.yml, TARGETED_DEVICE_FAMILY).
  for plist in "$ARCHIVE"/Products/Applications/Hostbeam.app/Info.plist \
               "$ARCHIVE"/Products/Applications/Hostbeam.app/PlugIns/*.appex/Info.plist; do
    fam="$(/usr/libexec/PlistBuddy -c 'Print :UIDeviceFamily' "$plist" | tr -dc '0-9')"
    [ "$fam" = 1 ] || die "$(basename "$(dirname "$plist")") declares device family '$fam', not iPhone only (1)"
  done
  say "archive: $ARCHIVE (iPhone only)"
  ;;
upload|validate)
  [ -d "$ARCHIVE" ] || die "no archive — run 'archive' first"
  asc_key
  dest=upload; [ "$1" = validate ] && dest=export
  export_options "$dest"
  say "$1: $(version) ($(build_no)) with key $ASC_KEY_ID …"
  # /usr/bin first: Xcode's IPA step shells out to rsync with flags its own
  # rsync 2.6.9 accepts and a Homebrew rsync 3.x rejects ("syntax or usage
  # error" → "Copy failed"). Found 2026-09-04.
  rm -rf "$BUILD/export"
  ( cd "$MOBILE" && PATH="/usr/bin:$PATH" xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath "$BUILD/export" \
      -exportOptionsPlist "$BUILD/ExportOptions.plist" \
      -authenticationKeyPath "$ASC_KEY_PATH" -authenticationKeyID "$ASC_KEY_ID" \
      -authenticationKeyIssuerID "$ASC_ISSUER_ID" -quiet ) || die "$1 failed"
  if [ "$1" = upload ]; then
    python3 - "$MOBILE/uploads.json" "$(version)" "$(build_no)" <<'PY'
import json, sys, datetime
p, v, b = sys.argv[1], sys.argv[2], int(sys.argv[3])
d = json.load(open(p)); d["uploads"].append({"version": v, "build": b, "date": datetime.date.today().isoformat(), "to": "App Store Connect", "how": "scripts/release-ios.sh"})
json.dump(d, open(p, "w"), indent=2); open(p, "a").write("\n")
PY
    say "uploaded — recorded in apps/mobile/uploads.json; bump CURRENT_PROJECT_VERSION before the next archive"
    say "processing takes a few minutes; then: asc builds list --app 6804413107 --processing-state all --limit 3 (or App Store Connect → TestFlight)"
  else
    # The export only proves signing. This is Apple's own check of the IPA,
    # the same one the upload runs, without the upload. altool reads the key
    # from ~/.appstoreconnect/private_keys/AuthKey_<id>.p8.
    mkdir -p "$HOME/.appstoreconnect/private_keys"
    cp -f "$ASC_KEY_PATH" "$HOME/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8"
    chmod 600 "$HOME/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8"
    xcrun altool --validate-app -f "$BUILD/export/Hostbeam.ipa" -t ios \
      --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" 2>&1 | grep -E 'VERIFY|error|warning|Error' || true
    say "validated by Apple — exported to $BUILD/export, nothing uploaded"
  fi
  ;;
*)
  sed -n '2,22p' "$0"; exit 1 ;;
esac
