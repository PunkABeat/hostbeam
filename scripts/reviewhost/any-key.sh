#!/bin/sh
# Accept whatever public key was offered, by echoing it back to sshd as though
# it had been found in authorized_keys.
#
# This exists for one reason: App Review cannot be given a key in advance.
# Hostbeam's iOS device key is minted on first use in that install's Keychain
# (ADR 0016 §4), so the reviewer's key does not exist until they open the app,
# and the transport offers publickey auth only. A host with a pre-written
# authorized_keys therefore rejects every beam a reviewer makes.
#
# It is a deliberately open door, and the rest of the configuration exists to
# make sure there is nothing behind it: sftp only, chrooted, no forwarding, one
# writable directory, and the whole box torn down when the app is approved.
#
# Called as: any-key.sh <keytype> <base64-key>
set -eu

# The app only ever offers ed25519 (CitadelTransport `.ed25519`). Anything else
# is not Hostbeam, so there is no reason to accept it.
[ "${1:-}" = "ssh-ed25519" ] || exit 0
[ -n "${2:-}" ] || exit 0

printf '%s %s\n' "$1" "$2"
