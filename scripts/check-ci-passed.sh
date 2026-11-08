#!/usr/bin/env bash
# Refuse to ship a commit the macOS CI has not passed on.
#
#   scripts/check-ci-passed.sh desktop.yml   # release-macos.sh, before building
#   scripts/check-ci-passed.sh iphone.yml    # release-ios.sh archive
#
# Since 2026-09-26 desktop.yml and iphone.yml run only by hand: macOS minutes
# count ten times against the free allowance (docs/process/ci.md). "Run it
# before a release" was written in ci.md and releasing-macos.md, and still the
# runs on the 0.1.32 and 0.1.33 release commits had failed in eight seconds
# with no step run — the month's minutes were spent — and both shipped, and
# iphone.yml had never been run at all. An instruction nobody can fail is not a
# control, so the release scripts ask GitHub instead of memory.
#
# What CI tested is a commit, so uncommitted changes to what gets built were
# never tested either, and are refused too.
#
# SKIP_MAC_CI="<why>" overrides it — for when the allowance is spent and the
# gates were run locally instead (progress.md § Quality gates). The reason is
# printed, so it lands in the release's output.
set -euo pipefail
cd "$(dirname "$0")/.."

WORKFLOW="${1:?usage: scripts/check-ci-passed.sh desktop.yml|iphone.yml}"
case "$WORKFLOW" in
  desktop.yml) BUILT=(apps/desktop packages/ui package.json package-lock.json) ;;
  iphone.yml) BUILT=(apps/mobile) ;;
  *) echo "unknown workflow: $WORKFLOW" >&2; exit 2 ;;
esac

if [ -n "${SKIP_MAC_CI:-}" ]; then
  echo "!! not checking $WORKFLOW on GitHub: $SKIP_MAC_CI" >&2
  exit 0
fi

refuse() {
  echo "ERROR: $1" >&2
  echo "" >&2
  echo "  git push origin main && gh workflow run $WORKFLOW --ref main" >&2
  echo "  gh run watch \$(gh run list --workflow $WORKFLOW --limit 1 --json databaseId -q '.[0].databaseId') --exit-status" >&2
  echo "" >&2
  echo "If it fails in seconds with no step run, the month's Actions minutes are" >&2
  echo "spent: run the gates locally (progress.md § Quality gates), then again with" >&2
  echo "  SKIP_MAC_CI=\"gates run locally: <what you ran>\"" >&2
  exit 1
}

DIRTY=$(git status --porcelain -- "${BUILT[@]}")
if [ -n "$DIRTY" ]; then
  echo "$DIRTY" >&2
  refuse "uncommitted changes in what $WORKFLOW builds — CI cannot have tested them. Commit, then run it."
fi

SHA=$(git rev-parse HEAD)
PASSED=$(gh run list --workflow "$WORKFLOW" --commit "$SHA" --status success --limit 1 \
  --json databaseId -q 'length' 2>/dev/null) || refuse "could not ask GitHub whether $WORKFLOW passed (is gh signed in?)."
[ "$PASSED" -ge 1 ] 2>/dev/null || refuse "$WORKFLOW has not passed on ${SHA:0:7}, the commit being released."
echo "── $WORKFLOW passed on ${SHA:0:7}"
