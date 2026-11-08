# ADR 0008: Direct macOS Distribution Without App Sandbox

Status: Accepted.

Date: 2026-06-14.

## Context

Hostbeam's first product contract is to use the developer's existing OpenSSH environment. The app needs to read `~/.ssh/config` and included config files, shell out to system `ssh` and `scp`, rely on `ssh-agent`, and store local app history under user-controlled local storage.

The macOS App Sandbox blocks or complicates this model. A sandboxed app cannot freely read the user's SSH config files or interact with the existing OpenSSH environment without redesigning the product around user-selected files, security-scoped bookmarks, extra permission prompts, and likely worse setup friction.

Hostbeam is meant to feel fast, natural, and nearly invisible. The App Store sandbox model is not aligned with the current OpenSSH-first product shape.

## Decision

Target direct macOS distribution first, not Mac App Store distribution.

Hostbeam should be distributed as a Developer ID signed and notarized macOS app outside the Mac App Store when packaging begins. The app should not enable App Sandbox by default while the product depends on direct access to user-managed OpenSSH config and system SSH tooling.

Do not re-enable `com.apple.security.app-sandbox` unless a later ADR explicitly changes the distribution model and redesigns SSH config access, process execution, and local file access.

## Consequences

- Hostbeam can read existing SSH config files and included config files without a heavyweight file-permission setup.
- Hostbeam can shell out to system `ssh` and `scp` in the way developers expect.
- Mac App Store distribution is out of scope unless the product is redesigned.
- Packaging work should focus on Developer ID signing, Hardened Runtime, notarization, and a direct update/distribution channel.
- The app must stay conservative with diagnostics, logging, clipboard data, hostnames, usernames, paths, and local history because sandbox isolation is not the primary safety boundary.
