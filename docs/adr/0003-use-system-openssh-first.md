# ADR 0003: Use System OpenSSH First

Status: Accepted.

Date: 2026-06-14.

## Context

The product is for developers who already use SSH hosts and local SSH configuration. Hostbeam should avoid becoming a credential manager or remote access service.

## Decision

Use the system OpenSSH toolchain first. The app should rely on existing SSH configuration, system `ssh`, and `ssh-agent`.

The app must not store private keys, passphrases, or SSH credentials.

## Consequences

- Host discovery should start from OpenSSH configuration.
- Upload behavior should later shell out through controlled command construction.
- Security review is required before upload behavior is implemented.
- Users keep ownership of SSH keys and credentials outside the app.
- No cloud relay or hosted infrastructure is required by default.

## Amendment (2026-10-06): a host that leaves `~/.ssh/config` refuses beams

Status: decided by the owner, 2026-10-06; built on the Mac the same day.

**Change.** An added host whose alias is no longer in `~/.ssh/config` stays
added, marked missing. If it is the host beams go to, every beam — the button,
the shortcut, the tray, a `hostbeam://` link, auto-beam, a file handed over —
refuses and opens the popover onto a card saying why. Beams never move to
another host because the chosen one is gone. The popover and Preferences list
it as "Not in ~/.ssh/config", where it can be removed; the tray offers it
nowhere and ticks nothing. Hostbeam re-reads `~/.ssh/config` when the popover
opens and when Preferences is focused, so a host that comes back works again
without a restart.

**Why.** Before this, launch dropped a missing host from the list and the
popover fell back to the first one left. On 2026-10-06 the test host was down,
its `Include`d alias was gone, and the current host became an unrelated real server
without a word; the popover then asked that server for its dev servers. A
host that is briefly missing is common — an `Include` on a mounted disk, a
container that is stopped, an edited file — and the cost of guessing is a
screenshot on the wrong server. The rule Preferences already followed ("where
a beam lands is not a decision to take on someone's behalf") now holds here
too. The first added host is still used when no default was ever set, or the
default was removed from Hostbeam: those are choices, not disappearances.
