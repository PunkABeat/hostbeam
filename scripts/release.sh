#!/usr/bin/env bash
# One-command macOS release: resolves signing + notarization secrets from
# 1Password at runtime (op:// refs in release.env), then runs the proven
# release-macos.sh pipeline. Requires the 1Password CLI (`op`) unlocked via
# the desktop app. Usage, from anywhere:
#
#   scripts/release.sh
#
# Bump the version (tauri.conf.json + Cargo.toml + package.json) first; the
# pipeline refuses to republish an already-published version.
set -euo pipefail
cd "$(dirname "$0")"
command -v op >/dev/null 2>&1 || {
  echo "1Password CLI (op) not found — install it and enable desktop-app integration." >&2
  exit 1
}
exec op run --env-file release.env -- ./release-macos.sh "$@"
