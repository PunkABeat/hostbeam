# ADR 0016: iOS Companion App Direction

Status: **Accepted** (2026-07-05, owner decision, after the Phase 0/1 spikes
validated the core technical bets — see the results sections in
[mobile-companion-brainstorm.md](../research/mobile-companion-brainstorm.md),
which also carries the research sources). Opens Milestone 008. **§4–5 amended by ADR 0028 (2026-09-27):** the iPhone app
is free, with no counter, no in-app purchase and no license entry.

Date: 2026-07-05 (proposed and accepted the same day).

## Context

Developers increasingly drive remote coding agents from the phone (an SSH
client such as Termius on iPhone, talking to a dev box). A phone screenshot
has no good path to that remote agent: terminals cannot accept pasted images
over SSH at all, the demand is publicly documented (levelsio's "#1 problem"
request to Termius), and every existing tool that solves it is desktop-only.
The nearest iOS competitor (Secure ShellFish) has the raw capabilities but not
the opinionated agent workflow; Termius documents only a manual multi-step
version. The window may close from two directions (Termius shipping the
feature; Anthropic's mobile Remote Control maturing image support), which
argues for a small, fast v1.

iOS constraints mean ADR 0003 (system OpenSSH) and ADR 0008 (direct
distribution, no sandbox) cannot extend to iOS: no `ssh` binary, no
ssh-agent, no `~/.ssh/config`, App Store-only distribution. ADR 0012 already
reserved monorepo space for a mobile app; ADR 0014 words the license as
"3 Macs". The decisive product observation: the target user can already reach
the host from the phone (that is what Termius proves), so no relay is needed.

## Decision (proposed)

Build **Hostbeam for iPhone** as a companion app in `apps/mobile/` (per
ADR 0012), shaped as follows:

1. **Direct SSH from the phone, no relay**, via an embedded SSH/SFTP library:
   **Citadel** (Swift/SwiftNIO SSH), subject to an interop spike; Blink's
   maintained libssh-apple fork is the designated fallback (russh/UniFFI
   rejected for v1 — no iOS shipping precedent). **ed25519 publickey auth
   only** (Citadel's RSA userauth is legacy-SHA-1 and fails against
   OpenSSH ≥ 8.8), direct TCP only, same upload contract as the Mac app
   (`/tmp/hostbeam`, timestamped name, never overwrite, clipboard sentence,
   clipboard untouched on failure).
2. **A dedicated device-generated key, amending the credential principle for
   iOS only.** The app generates an ed25519 keypair on device, keeps the
   private key in the iOS Keychain (shared access group with the extension),
   never exports it, and never imports the user's existing keys. The user
   authorizes the phone by adding one `authorized_keys` line (app-assisted).
   On macOS the principle "no private key or SSH credential storage" stands
   unchanged (ADR 0003).
3. **One beam engine, two v1 surfaces**: a share-sheet extension (streamed
   upload — never decode the image — progress UI, pasteboard written before
   `completeRequest`) and a **`Beam last screenshot` App Intent**
   (background-executing; Action Button / Back Tap / widget — the mobile
   equivalent of the Mac hotkey). Hosts are configured by manual entry with a
   test-connection onboarding step (which also pre-arms the local-network
   permission that extensions cannot reliably request themselves, TN3179).
   QR pairing from the Mac app is a fast follow; no iCloud sync.
4. **Same license, reworded to devices.** Free download with the same
   fully-local 5-beams/day free tier (zero network calls). A license lifts
   the cap as one seat; ADR 0014's "3 Macs" becomes "up to **3 devices**".
   The iOS machine fingerprint is an app-generated UUID in the Keychain
   (`AfterFirstUnlockThisDeviceOnly`, never synchronizable): it survives
   reinstall but by design cannot migrate to new hardware, so a phone upgrade
   consumes a new seat — the in-app **Deactivate** flow is therefore required
   v1 scope, and `errSecInteractionNotAllowed` must be treated as retry,
   never regenerate.
5. **App Store distribution with a day-one IAP.** Guideline 3.1.1 prohibits
   license-key unlock verbatim, and 3.1.3(b) only sanctions honoring web
   purchases when the same item is available as IAP. So the app ships with a
   **$29 non-consumable IAP from day one**: App Store Server Notifications
   hit the existing webhook worker, which mints a normal Keygen license
   (valid on Mac too); refunds revoke it, mirroring the Paddle path; Restore
   Purchases implemented. License-key entry remains, framed as "already have
   a Hostbeam license?", formally sanctioned by the IAP's presence. No links
   to the web checkout from inside the app (the US external-link allowance is
   under Supreme Court review; do not architect around it).

## Consequences

- ADR 0003 and ADR 0008 remain in force for macOS and are explicitly **not
  extended** to iOS; this ADR is the platform fork point.
- `docs/product.md`'s "No private key or SSH credential storage" gains an iOS
  qualification (device-generated, device-bound, Hostbeam-dedicated key) when
  this ADR is accepted.
- ADR 0014 wording changes from "3 Macs" to "3 devices"; the webhook worker
  gains a second entitlement source (App Store Server Notifications) beside
  Paddle; Apple takes 15% (Small Business Program) on in-app purchases while
  the website/Paddle remains the primary channel.
- Compliance duties new to iOS: encryption self-classification (mass-market
  5D992.c) plus the annual BIS report, and the French ANSSI declaration (or
  exclude France until filed).
- Prerequisites before any implementation milestone: Apple Developer
  enrollment approved (submitted 2026-07-04); the interop/extension spike and
  the Secure ShellFish differentiation test (both specified in the brainstorm
  doc §6).
- Open questions live in `docs/research/questions.md` § Mobile; acceptance of
  this ADR should open a dedicated milestone rather than widen an existing
  one.
