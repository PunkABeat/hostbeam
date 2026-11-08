# Milestone 004: Utility Shell Polish

Status: Complete.

## Goal

Tighten the first usable app shell after the real-host smoke test, without expanding product scope.

This milestone is a focused polish and reliability pass for the existing macOS utility surface. It should make host selection, setup, status, and history feel calmer and clearer while preserving the screenshot-first product contract.

## Included Scope

- Refine the main utility layout so it feels less like a temporary proof screen.
- Clarify the ready/no-host states.
- Improve host selection rows, selected state, and default-host controls.
- Keep setup copy short and focused on reaching a usable default quickly.
- Make status, history, and empty/disabled states quieter and more intentional.
- Add focused widget coverage for host selection and default-host changes.
- Keep quality gates green after the polish pass.

## Explicit Non-Scope

- Arbitrary file transfer.
- Manual file picker.
- Drag-and-drop upload.
- Automatic clipboard screenshot detection.
- Per-host settings.
- Packaging, signing, notarization, or updater work.
- New SSH behavior.
- Remote cleanup automation.
- A full visual identity or design-system exploration.

## Acceptance Criteria

- A user can select a discovered SSH host from the app surface.
- Selecting the first host makes it the default host.
- A selected non-default host can be promoted to default.
- The app communicates the default host, upload action, setup defaults, recent-history state, and diagnostic status clearly.
- The pass keeps all existing screenshot bridge behavior intact.
- Formatter, analyzer, tests, and macOS build pass.

## Verification

- `dart format --set-exit-if-changed lib test`
- `flutter analyze`
- `flutter test`
- `flutter build macos`

## Notes

- This is not the final product design. It is the first polish pass on top of the functional bridge.
- A deeper visual/interaction design milestone can follow once packaging or next-product-scope decisions are clearer.
