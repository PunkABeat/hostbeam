# Implementation Plan

Date: 2026-06-17.

## Goal

Apply the Hostbeam design handoff to the existing Flutter app without widening Milestone 005 beyond UI/UX maturation of the screenshot bridge.

## Constraints

- Preserve the existing OpenSSH-first upload architecture.
- Preserve screenshot-only shipped behavior.
- Do not add arbitrary file transfer, manual file picker, drag-and-drop, SSH config editing, remote cleanup, packaging, signing, notarization, or updater work.
- Add or update tests with each implementation pass.
- Keep docs in sync before handoff.

## Phase 1: Design Foundation

Purpose: make the UI spec implementable in small, testable slices.

- Add `HostbeamTokens` and theme helpers from `02_design_tokens.md`.
- Introduce core UI primitives: surface, button, badge, keycap, status dot, list row, shot thumbnail.
- Keep primitives local to the current app structure unless the split clearly reduces complexity.
- Add widget coverage for primitive rendering where behavior matters.
- Do not add new runtime dependencies unless a documented reason and verification plan exists.

Exit criteria:

- Current tests pass.
- Existing app behavior is unchanged.
- The new primitives are ready for the popover surface.

## Phase 2: Main Utility Surface

Purpose: replace the broad scaffold-style main window with the compact Beam-first surface.

- Constrain the main content to the handoff's compact utility width.
- Replace "Upload Clipboard" visible copy with "Beam screenshot".
- Add clipboard/no-clipboard, ready, beaming, done, error, recent, and beam-to host sections.
- Show copied sentence in the result block after success.
- Keep host selection and history secondary.
- Keep diagnostics accessible without making the main surface feel like a dashboard.

Exit criteria:

- Widget tests cover no-host, ready host, beaming, success, failure, and history states.
- The existing screenshot upload path still works.
- Visual review confirms the surface reads as a compact macOS utility.

## Phase 3: First-Run And Just-In-Time Host Selection

Purpose: make setup feel like part of the product instead of a configuration panel.

- Rework first-run setup toward the 3-step popover-native flow if it can be done without adding new feature scope.
- Keep setup skippable.
- Preserve pending screenshot upload while the user selects a host.
- Add searchable host selection only if the host list size makes it necessary and testable.

Exit criteria:

- Widget tests cover skip, choose host, finish, and pending-upload continuation.
- Empty/no-host copy matches the design handoff.

## Phase 4: Motion And Feedback

Purpose: make the core beam interaction feel polished without adding decorative motion.

- Implement BeamMark idle, uploading, and landing states.
- Respect reduced-motion settings.
- Keep all non-Beam motion restrained.
- Align success notification copy with the handoff.

Exit criteria:

- Widget tests cover reduced-motion behavior where practical.
- Manual review confirms BeamMark is the only expressive animation.

## Phase 5: Preferences Decision Point

Purpose: decide whether to build Preferences now or defer it.

Before implementation, decide:

- Should Preferences be part of Milestone 005?
- Should the hotkey change to `cmd+shift+7`?
- Should the paste-ready sentence be editable now?
- Should launch-at-login, sound, and notification toggles ship now?
- Should manual hosts remain deferred?

If Preferences is approved, build only the approved subset and update progress docs first.

## Verification For Every Phase

- `dart format --set-exit-if-changed lib test`
- `flutter analyze`
- `flutter test`
- `flutter build macos`
- Manual visual review of compact utility sizes.

## Recommended First Task

Start with Phase 1 and Phase 2 together as a narrow UI pass:

1. Add tokens and local UI primitives.
2. Rework the main surface copy and layout around Beam.
3. Keep all existing service interfaces and settings fields.
4. Add widget tests for the new visible states.
