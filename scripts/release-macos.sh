#!/usr/bin/env bash
# Build, sign, notarize, and publish a Hostbeam macOS release (milestone 007).
#
# Staged ahead of the Developer ID certificate: everything is env-driven, no
# secrets in the repo. Run from the repo root. Requires: the signing identity
# in the login Keychain, notarytool credentials, the updater private key, and
# R2 enabled (bucket hostbeam-releases → download.hostbeam.app).
#
# Required environment:
#   APPLE_SIGNING_IDENTITY   "Developer ID Application: <name> (<TEAMID>)"
#   APPLE_ID                 Apple ID email (notarization)
#   APPLE_PASSWORD           app-specific password for notarytool
#   APPLE_TEAM_ID            the 10-char team id
#   TAURI_SIGNING_PRIVATE_KEY          path to (or content of) the updater key
#   TAURI_SIGNING_PRIVATE_KEY_PASSWORD its password
#
# Normally run via scripts/release.sh, which injects this environment from
# 1Password at runtime (op:// refs in scripts/release.env).
set -euo pipefail
cd "$(dirname "$0")/.."

for v in APPLE_SIGNING_IDENTITY APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID \
         TAURI_SIGNING_PRIVATE_KEY TAURI_SIGNING_PRIVATE_KEY_PASSWORD; do
  [ -n "${!v:-}" ] || { echo "missing env: $v" >&2; exit 1; }
done

node scripts/check-version-sync.mjs
node scripts/check-progress-current.mjs
node scripts/check-handoff-short.mjs
node scripts/check-docs-drift.mjs
# The in-app open-source notices must match Cargo.lock and package-lock.json.
node scripts/third-party-notices.mjs --check
# The macOS gates on a clean Mac, which pushes no longer trigger.
scripts/check-ci-passed.sh desktop.yml
VERSION=$(node -p "JSON.parse(require('fs').readFileSync('apps/desktop/src-tauri/tauri.conf.json','utf8')).version")
echo "── releasing Hostbeam $VERSION"

# Refuse to republish: overwriting a version users can already receive breaks
# the updater (same version → installed copies are never offered the new
# build) and silently replaces artifacts a tag already points at. Bump first.
#
# The test is what `latest.json` serves, not whether an artifact exists. Those
# differ exactly when a run died between the upload and the manifest — a
# network blip took 0.1.23 down that way on 2026-09-20 — and the artifact test
# then refuses the retry the release needs, for a version nobody was ever
# offered. Overwriting an orphaned artifact is the correct thing to do.
PUBLISHED=$(curl -sf "https://download.hostbeam.app/latest.json" | node -p "try{JSON.parse(require('fs').readFileSync(0,'utf8')).version}catch(e){''}" 2>/dev/null || true)
if [ "$PUBLISHED" = "$VERSION" ]; then
  echo "ERROR: v$VERSION is what download.hostbeam.app already serves — bump the version first." >&2
  exit 1
fi

# Universal binary (the site promises Apple silicon & Intel). One-time setup:
#   rustup target add aarch64-apple-darwin x86_64-apple-darwin
TARGET=universal-apple-darwin
# `app` and `updater`, never `dmg`: Tauri's dmg bundler arranges the installer
# window by sending Apple events to Finder, which macOS refused on 2026-09-19
# — from a terminal holding the Automation permission, and from the agent's
# shell, which cannot be prompted for it. The build died after the app was
# signed, notarized and stapled, with no way to finish a release. The image is
# built below instead, from a window layout kept in the repo.
npm run tauri build -- --target "$TARGET" --bundles app

# Absolute: the upload helper cd's into apps/license-webhook (wrangler config),
# so relative artifact paths would not resolve there.
BUNDLE="$PWD/apps/desktop/src-tauri/target/$TARGET/release/bundle"
APP_TAR=$(ls "$BUNDLE"/macos/Hostbeam.app.tar.gz)
APP_SIG=$(ls "$BUNDLE"/macos/Hostbeam.app.tar.gz.sig)
DMG="$BUNDLE/dmg/Hostbeam_${VERSION}_universal.dmg"
echo "── building dmg"
scripts/make-dmg.sh "$BUNDLE/macos/Hostbeam.app" "$DMG"
# Tauri signed the dmg it used to bundle; ours has to be signed here. Gatekeeper
# checks the image itself, not only the app inside it.
codesign --sign "$APPLE_SIGNING_IDENTITY" --timestamp "$DMG"

# Tauri notarizes + staples the .app during build when the APPLE_* env is set.
# The image around it is signed just above and still has to be notarized and
# stapled, or Gatekeeper rejects the DMG itself ("Unnotarized Developer ID").
echo "── notarizing dmg"
xcrun notarytool submit "$DMG" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" --wait
xcrun stapler staple "$DMG"

echo "── gatekeeper verification"
spctl -a -vvv -t install "$DMG"

# `spctl -t install` attaches the image to look inside it and does not always
# let go, so a volume was left mounted by every release until someone ejected
# it by hand (found after 0.1.22, with one still attached). The name is the
# `VOLUME` make-dmg.sh gives it; detaching an image that is already gone is
# not an error worth stopping a release for.
hdiutil detach "/Volumes/Hostbeam" -quiet 2>/dev/null || true

# Updater manifest — one universal artifact serves both architectures.
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SIG=$(cat "$APP_SIG")
# Release notes come from CHANGELOG.md so the updater dialog, the site's
# /changelog and the App Store notes cannot disagree. Fail loudly rather than
# shipping an update with no description of what it changes.
if ! NOTES_JSON=$(node scripts/changelog.mjs --json 2>&1); then
  echo "!! could not read CHANGELOG.md: $NOTES_JSON" >&2; exit 1
fi
NOTES_VERSION=$(printf '%s' "$NOTES_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).version))')
if [ "$NOTES_VERSION" != "$VERSION" ]; then
  echo "!! CHANGELOG.md's newest entry is $NOTES_VERSION but this release is $VERSION." >&2
  echo "   Run: node scripts/cut-release.mjs $VERSION" >&2
  echo "   Users see these notes before installing; shipping the wrong ones is worse" >&2
  echo "   than shipping none." >&2
  exit 1
fi
# Notes still sitting in `## Unreleased` at this point would ship unmentioned:
# the version matches, so the guard above is satisfied, and the work described
# there simply never reaches a release note. Cutting is what moves them.
UNCUT=$(node -e 'import("./scripts/changelog-parse.mjs").then(m=>{const md=require("fs").readFileSync("CHANGELOG.md","utf8");process.stdout.write(m.parseUnreleased(md)?"yes":"")})')
if [ -n "$UNCUT" ]; then
  echo "!! CHANGELOG.md still has uncut \`## Unreleased\` notes." >&2
  echo "   They describe work this release contains but would not mention." >&2
  echo "   Run: node scripts/cut-release.mjs" >&2
  exit 1
fi
NOTES=$(printf '%s' "$NOTES_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify(JSON.parse(s).notes)))')
# The newest ten entries: the app stacks every one newer than the version it
# runs, so skipping releases still shows everything that changed.
HISTORY=$(node scripts/changelog.mjs --history)
cat > /tmp/hostbeam-latest.json <<EOF
{
  "version": "$VERSION",
  "notes": $NOTES,
  "history": $HISTORY,
  "pub_date": "$PUB_DATE",
  "platforms": {
    "darwin-aarch64": { "signature": "$SIG", "url": "https://download.hostbeam.app/v$VERSION/Hostbeam.app.tar.gz" },
    "darwin-x86_64":  { "signature": "$SIG", "url": "https://download.hostbeam.app/v$VERSION/Hostbeam.app.tar.gz" }
  }
}
EOF

echo "── uploading to R2 (bucket hostbeam-releases → download.hostbeam.app)"
# --remote is required: wrangler 4 targets its *local dev* storage by default.
W() { (cd apps/license-webhook && npm exec --yes --package=wrangler -- wrangler "$@" --remote); }
# The download counter (ADR 0030) recognises these three names
# (apps/download-counter/src/classify.ts); rename one and it stops counting it.
W r2 object put "hostbeam-releases/v$VERSION/Hostbeam.app.tar.gz" --file "$APP_TAR"
W r2 object put "hostbeam-releases/v$VERSION/Hostbeam_$VERSION.dmg" --file "$DMG"
# The two objects a release *overwrites* get a short cache lifetime. The zone
# caches for four hours by default, which is right for `v$VERSION/…` (those
# never change) and wrong for these: after 0.1.23 the download page served the
# previous version's dmg from the edge while R2 held the new one.
W r2 object put "hostbeam-releases/Hostbeam.dmg" --file "$DMG" \
  --cache-control "public, max-age=300"                                  # stable "latest" download URL
W r2 object put "hostbeam-releases/latest.json" --file /tmp/hostbeam-latest.json \
  --content-type application/json --cache-control "public, max-age=60"

echo "── pointing the Homebrew tap at v$VERSION"
if scripts/homebrew-bump.sh "$VERSION" "$DMG"; then
  echo "   brew install --cask punkabeat/tap/hostbeam now serves v$VERSION"
else
  echo "!! Homebrew tap bump FAILED — the app is released but brew still serves the" >&2
  echo "   previous version. Re-run: scripts/homebrew-bump.sh $VERSION $DMG" >&2
fi

# The public changelog is rendered at BUILD time, so publishing the app does not
# refresh it — and the app's own "What's new" link points there. Without this,
# someone who just installed vX clicks through and does not find vX. Runs last,
# so a site hiccup cannot fail a release that has already published.
echo "── publishing the site so /changelog shows v$VERSION"
if npm run deploy:web; then
  echo "   site deployed"
else
  echo "!! site deploy FAILED — the app is released but hostbeam.app/changelog still" >&2
  echo "   shows the previous version. Re-run: npm run deploy:web" >&2
fi

echo "── done: https://download.hostbeam.app/Hostbeam.dmg (v$VERSION)"
echo "   remember: git tag v$VERSION && git push origin main v$VERSION"
