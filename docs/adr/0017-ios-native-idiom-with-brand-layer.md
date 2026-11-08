# ADR 0017: iOS Visual Direction — Native Idiom + Brand Layer, QR Host Pairing

Status: Accepted (2026-07-05, owner decision).

## Context

The desktop app has a complete, high-fidelity design system (docs/design/
hostbeam-handoff/: beam-blue `#2D6CF6`, Geist, the "Beam" voice, BeamMark as
the only expressive motion, dense 340px popover surfaces). The iOS walking
skeleton (Milestone 008 slices 1–2) is functional but visually generic, has no
onboarding, and no way to carry host config over from the Mac. The desktop
system is a *menu-bar utility* language — pixel-porting it to a phone would
fight iOS conventions and touch ergonomics.

## Decision

1. **Native iOS structure wearing the Hostbeam brand.** SwiftUI-native
   navigation, lists, forms, sheets, SF Symbols, and touch metrics — with the
   brand layer on top: beam-blue accent, Geist for display/title text, mono
   for paths/hosts, the BeamMark, the "Beam" voice, and the desktop's motion
   discipline (the beam is the only expressive animation). Specified in
   [docs/design/ios-companion.md](../design/ios-companion.md).
2. **QR pairing is the desktop→phone host bridge, built now** (promoted from
   ADR 0016's fast-follow): the Mac app renders a QR of one host's connection
   info (alias, hostname, port, user, remote folder — **never key material**);
   the iPhone scans it during onboarding or from Hosts. Payload format is
   defined in the design doc (`hostbeam-host/v1` JSON).
3. **Full guided onboarding on iOS**, mirroring the desktop's 3-step popover
   flow but adding the step iOS uniquely needs: **authorize this device**
   (install the device public key into `authorized_keys`, with an optional
   connection test).

## Consequences

- `packages/ui` stays web-only; iOS gets a small native token file
  (`BrandTokens.swift`) transcribed from `02_design_tokens.md` — one more
  place color/type values live (acceptable; tokens are final and change
  rarely).
- Geist ships in the iOS bundle (already OFL-licensed in the repo).
- The desktop app gains a small "Share host to iPhone" (QR) surface —
  desktop work tracked in Milestone 008, executed against `apps/desktop`.
- Milestone 008 gains slices 3–5 (brand layer, onboarding + QR, host
  management parity); licensing moves to slice 6 (still gated on Apple
  enrollment for its IAP half).
