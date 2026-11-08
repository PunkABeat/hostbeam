# Milestone 005: UI/UX Maturation

Status: In progress.

## Goal

Turn the working prototype into a much stronger product experience before adding distribution, packaging, or broader feature scope.

The current app proves the core workflow, but the visible experience is still too rough for the quality bar Hostbeam is aiming for. This milestone should make the product feel fast, natural, polished, and small in the right way.

## Product Rationale

Packaging is premature while the app is only barely acceptable in UI and UX.

The next risk is not whether the app can be signed or distributed. The next risk is whether the user experience feels compelling enough that the screenshot bridge becomes a trusted daily utility.

## Included Scope

- Rework the primary app surface around the real user flow, not around implementation status.
- Improve first-run and just-in-time host selection.
- Improve menu-bar behavior and decide what belongs in the menu versus the window.
- Improve visual hierarchy, spacing, density, copy, empty states, and failure states.
- Make the default host, hotkey, upload action, pending upload, and recent uploads feel obvious without becoming dashboard-like.
- Keep all existing functionality working.
- Add or update widget tests for any changed behavior.
- Use visual/manual QA as part of acceptance, not only automated tests.

## Explicit Non-Scope

- macOS packaging, signing, notarization, or updater work.
- Arbitrary file transfer.
- Manual file picker.
- Drag-and-drop upload.
- Automatic clipboard screenshot detection.
- Remote cleanup automation.
- Interactive SSH password or passphrase prompts.
- Cloud accounts, relay service, or hosted infrastructure.

## Acceptance Criteria

- The main surface feels like a compact macOS utility rather than a scaffolded test screen.
- Host selection and default-host management feel immediate and clear.
- The empty state when no hosts are selected guides the next action without feeling like documentation.
- Upload, pending-upload, success, and failure states are visually distinct and calm.
- Recent uploads are useful but secondary.
- The app can still complete the real screenshot-to-remote-host flow.
- Formatter, analyzer, tests, and macOS build pass.

## Verification

- `dart format --set-exit-if-changed lib test`
- `flutter analyze`
- `flutter test`
- `flutter build macos`
- Manual visual review of the main utility surface at realistic desktop sizes.

## Notes

- This milestone should not start by adding features. It should start by evaluating and reshaping the current interaction model.
- Packaging can return after the UI/UX feels meaningfully closer to the intended product quality.
- Pass 1 reshapes the main app surface around a primary upload command, tighter host-selection rows, compact first-run setup, quieter status, and secondary recent-history treatment.
- Pass 1 is still subject to human visual review before Milestone 005 should be called complete.
- The design handoff now lives at `docs/design/hostbeam-handoff/`. Use its readiness review and implementation plan before starting the next UI pass.
