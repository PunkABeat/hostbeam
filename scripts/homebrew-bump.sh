#!/bin/bash
# Point the Homebrew tap at a released version of the macOS app.
#
#   scripts/homebrew-bump.sh <version> <path/to/Hostbeam_<version>.dmg>
#
# Called by scripts/release-macos.sh after the R2 upload; safe to rerun by
# hand if that step failed. It clones the tap, rewrites the two lines of
# Casks/hostbeam.rb that change per release (version and sha256), commits and
# pushes. The cask itself — URL shape, livecheck, zap paths — lives in the tap
# repo (github.com/PunkABeat/homebrew-tap); this script never touches it.
#
# Two guards, because a wrong cask is worse than a missing one:
#   - the DMG at the public URL must hash the same as the local file, so the
#     cask can never point at a version that is not (yet, or still) served;
#   - the version must not go backwards.
#
# Pushing needs write access to the tap for the SSH key this Mac uses with
# GitHub.
set -euo pipefail

die() { echo "homebrew-bump: $*" >&2; exit 1; }

VERSION="${1:-}"; DMG="${2:-}"
[ -n "$VERSION" ] && [ -n "$DMG" ] || die "usage: $0 <version> <dmg>"
[ -f "$DMG" ] || die "no such file: $DMG"

TAP_REPO="${HOSTBEAM_TAP_REPO:-git@github.com:PunkABeat/homebrew-tap.git}"
URL="https://download.hostbeam.app/v$VERSION/Hostbeam_$VERSION.dmg"

SHA=$(shasum -a 256 "$DMG" | cut -d' ' -f1)
# Cache-busted: Cloudflare keys its cache on the whole URL, so a unique query
# string fetches what R2 actually holds. Without it this compares against
# whatever the edge cached — which after a retried release is the artifact of
# the run that failed, and the bump refuses for a release that is perfectly
# fine (2026-09-20, 0.1.23).
REMOTE_SHA=$(curl -sfL "$URL?verify=$(date +%s)" | shasum -a 256 | cut -d' ' -f1)
[ -n "$REMOTE_SHA" ] || die "$URL is not served yet"
[ "$REMOTE_SHA" = "$SHA" ] || die "the DMG at $URL differs from $DMG — not bumping"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
git clone --quiet --depth 1 "$TAP_REPO" "$TMP/tap" || die "could not clone $TAP_REPO"
CASK="$TMP/tap/Casks/hostbeam.rb"
[ -f "$CASK" ] || die "no Casks/hostbeam.rb in the tap"

CURRENT=$(sed -n 's/^  version "\(.*\)"$/\1/p' "$CASK")
if [ "$CURRENT" = "$VERSION" ]; then
  if grep -q "^  sha256 \"$SHA\"$" "$CASK"; then
    echo "homebrew-bump: tap already at $VERSION"; exit 0
  fi
  die "tap is at $VERSION with a different sha256 — a published version must never change"
fi
if [ "$(printf '%s\n%s\n' "$CURRENT" "$VERSION" | sort -V | tail -1)" != "$VERSION" ]; then
  die "tap is at $CURRENT; refusing to go back to $VERSION"
fi

sed -i '' \
  -e "s/^  version \".*\"$/  version \"$VERSION\"/" \
  -e "s/^  sha256 \".*\"$/  sha256 \"$SHA\"/" "$CASK"
grep -q "^  version \"$VERSION\"$" "$CASK" && grep -q "^  sha256 \"$SHA\"$" "$CASK" \
  || die "could not rewrite version/sha256 in Casks/hostbeam.rb"

git -C "$TMP/tap" commit --quiet -am "hostbeam $VERSION"
git -C "$TMP/tap" push --quiet origin HEAD || die "push failed — rerun: scripts/homebrew-bump.sh $VERSION $DMG"
echo "homebrew-bump: tap now serves $VERSION ($SHA)"
