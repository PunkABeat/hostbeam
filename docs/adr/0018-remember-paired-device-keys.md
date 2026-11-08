# ADR 0018: The Mac Remembers Paired Device Public Keys

Status: **Accepted** (2026-08-30, owner decision). Amends the pairing flow in
ADR 0017 §2–3; the iOS side of ADR 0016 §2 is unchanged.

## Context

Authorizing an iPhone on a host means appending one line to that host's
`authorized_keys`. ADR 0017 built the reverse leg for this: the phone shows its
public key, the user copies it, pastes it into the Mac's pairing sheet, and the
Mac installs it over its own SSH access.

That works, but it is **per host**, while the thing it installs is **per
device**. The iOS device key is generated once, lives in the Keychain, survives
reinstall, and never changes for the life of that phone (ADR 0016 §4 —
deliberately not migratable to new hardware). So every additional host repeats
a device-level task: pick up the phone, find the key, copy, switch to the Mac,
paste.

Device time on 2026-08-30 showed the cost is not just keystrokes. Because
authorization is per host while the UI says "Authorize this iPhone", users
reasonably read it as one-time device setup that a second host would inherit.
It is not, and the symptom of the misunderstanding is a host that fails on its
first beam with a rejected key (milestone 008, device-driven polish batch).

## Decision

1. **The Mac stores the public keys of devices it has authorized**, as a list
   in `config.json`: the key line, a display name taken from the key's comment,
   the SHA256 fingerprint for display, and when it was added and last used.

   This does not weaken ADR 0003's credential principle. A public key is
   neither a private key nor a credential — it is published material that
   already sits in plaintext in every `authorized_keys` it has been installed
   to. It also grants the Mac no new capability: `install_pubkey` can already
   append any pasted key to any host the Mac can reach. What changes is the
   number of keystrokes, not the privilege.

2. **Authorizing a remembered device is offered, never automatic.** The pairing
   sheet lists remembered devices with a one-click Authorize per host. It does
   *not* install keys as a side effect of adding a host.

   Silently appending a key to a host the moment it is added is a
   security-relevant act with no decision attached, and the realistic bad case
   is ordinary: a client or work host added, a personal phone silently
   authorized on it, discovered only by reading `authorized_keys` on the
   server. One click is the same gesture; a silent default is not the same
   thing. This also keeps the posture the product already takes elsewhere —
   confirmation-gated cleanup, and "Hostbeam inherits access, never creates
   it".

3. **Remembered devices are visible and removable** in Preferences → Hosts,
   with fingerprint and last-used. This is the load-bearing part of the
   decision, not housekeeping: "which devices can reach my servers" must be
   answerable in the app, not only by reading `authorized_keys` on each host.
   A replaced phone gets a new key by design, so without a visible list the old
   one would keep being installed onto new hosts indefinitely.

4. **The paste field stays**, for a device the Mac has not met — including a
   phone belonging to someone else, and the first pairing of any device.

## Consequences

- `config.json` gains `pairedDevices`; the Rust core does not need to read it
  (the UI owns the list and passes a key to the existing `install_pubkey`).
- Installation stays idempotent (`grep -qxF ||`), so authorizing twice is safe
  and re-authorizing after a server rebuild is a no-op rather than a duplicate.
- Pairing host *n* becomes: add host → authorize the remembered device →
  show QR → scan. The phone is not needed until the scan, and never for
  copying a key.
- The per-host nature of authorization stops being something users must
  understand to succeed, though the iOS copy added in milestone 008 still
  explains it for the phone-only path.
- Nothing about the iOS side changes: the private key never leaves the phone,
  and the phone still generates and owns its identity.

## Amendment (2026-08-31): the host is asked, and the step earns its place

§2 above put the one-click Authorize inside the pairing sheet, which meant
opening a sheet whose other content — a QR code — is not what you came for. It
now also sits in the host's own row, next to Diagnostics and Open Terminal.
This does not weaken §2: it is the same deliberate click, moved closer to where
the decision is made. Adding a host still installs nothing.

Putting it there raised a question the original decision did not have to answer:
**which hosts is the phone already on?** A button offering to do what is already
done is noise, and one that hides when the work is outstanding is worse.

**The Mac asks the host, and asks it for free.** The reachability probe already
runs `ssh <target> true` — a no-op down a connection it makes anyway. It now
runs a `grep -qxF` against the same `authorized_keys` line `install_pubkey`
appends to, so one connection answers "can I reach you" and "whose keys do you
hold" together. Nothing is cached and nothing can go stale.

The rejected alternative is the one that looks cheaper: record "installed device
X on host Y" in `config.json`. It describes what was true when we wrote it, not
what the host will accept now — a rebuilt server or a pruned `authorized_keys`
would leave the app showing a confident green tick over a host that will reject
the next beam. That is the failure shape this project has paid for three times
already, and the iOS side rejected the same shortcut for the same reason
(milestone 008).

Two limits are worth stating plainly:

- The Mac inspects a **file**, so a host using `AuthorizedKeysCommand` or a
  non-default `AuthorizedKeysFile` can hold the key somewhere this does not look.
  It is exactly symmetric with what `install_pubkey` writes, so it correctly
  answers "is what we installed still there" — and the phone's own connection
  remains the authority.
- A host that does not answer is rendered as **unknown**, not as "no devices".
  Neither the offer nor the confirmation appears. An unreachable host is not
  evidence about what it would accept, and this is the one place where saying
  nothing is the honest output.

**Offered inline only when exactly one device is remembered.** With two or more,
a single button in a row cannot say whose key it would install; those keep
falling through to the sheet, where each device has its own labelled row.

**Both surfaces are kept, and both are told the same thing.** The sheet's list
is not a duplicate: it is the only path when two or more devices are remembered,
the only one that works while a host's state is unknown, and the one already in
your hand mid-pairing. But two places that can authorize must not disagree —
they now share one state update, and the sheet marks a device the host already
holds instead of offering to install it again.

### The consequence on iOS

The authorize step now appears only when the host says it does not already
accept the phone. Previously it was always presented and then said "Already
authorized — nothing to do here", which is a step, not an answer.

It reuses the reachability probe instead of opening its own connection: both
call the same `verify`, and for the phone a successful `verify` *is* the
authorization answer, because it connects with the device key. Skipping the step
means success is now silent — the confirmation is the host's dot going green,
which is the same signal every other host gives.

**A refusal and a silence are different answers** (added 2026-08-31, from owner
testing). The step first shipped giving one answer to every failure: "it can't
accept a beam until this iPhone's key is on it". For a host that never replied
that is a diagnosis, not an observation, and it sends someone to edit
`authorized_keys` when the problem is an address, a port, or the network.

`BeamError.authRejected` already drew the line — "the host answered but refused
this device's key … distinct from didn't answer" — and the beam path already
used it. Reachability was discarding it, so `Reach.fail` now carries
`refusedKey`, and the step has three outcomes rather than a Bool that folds "no"
and "cannot tell" together. Only a refusal earns the key instructions; a silence
says so and offers them anyway, since installing the key does no harm.

Two bounds, for one reason — the transport sets no connect timeout of its own:

- The step waits ~4s for an answer. It is a **poll against a deadline, not a
  race**: a probe cannot be cancelled once started (`Task.value` ignores
  cancellation, and a task group awaits every child before returning), so a
  `withTaskGroup` race bounded nothing at all. The honest move is to stop
  waiting for the probe, not to pretend it was stopped.
- A **15s watchdog** settles the dot, which could otherwise sit at `.checking`
  forever — still promising an answer it would never produce. It fires only if
  that same probe is still in flight, so a finished or superseded probe cannot
  be clobbered by an old timer.

The watchdog settles the dot, not the socket: a hung connection stays parked
until NIO gives up. Nothing user-visible leaks; a connect timeout inside
`CitadelTransport` is the real fix if it ever matters.

## Amended by ADR 0027 (2026-09-26): the list can also revoke

§3 made the remembered devices visible and removable from the Mac's list, but
removing one there leaves its key on every host that holds it.
[ADR 0027](0027-remove-a-device-from-every-host.md) lets the same list take a
device's key off every host the Mac lists, only after a read-only check shows
each line and the user approves each host. Forgetting without removing stays
possible.
