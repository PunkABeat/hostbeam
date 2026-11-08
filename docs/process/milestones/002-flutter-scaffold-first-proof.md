# Milestone 002: Flutter Scaffold First Proof

Status: Complete.

## Goal

Scaffold the Flutter desktop app and prove the smallest safe first behavior slice.

## Recommended First Behavior Slice

Discover SSH config hosts from the user's existing OpenSSH configuration.

## Scope

- Scaffold the Flutter desktop app.
- Keep generated files limited to the scaffold expected for the selected Flutter desktop targets.
- Establish baseline formatter, lint/static-analysis, and test tooling.
- Add the smallest app surface needed to prove SSH host discovery.
- Parse or query SSH configuration only far enough to produce a useful host list.
- Add focused tests and verification for host discovery behavior.

## Explicit Non-Scope

- Clipboard image reading.
- Remote upload.
- Global hotkeys.
- Menu-bar behavior.
- Native notifications.
- Saved hosts.
- Recent history.
- Destination folder management.
- Cloud accounts.
- Relay service.
- Hosted infrastructure.

## Acceptance Criteria

- Flutter app scaffold exists.
- App can be launched on the selected desktop platform.
- Host discovery behavior is demonstrated with a local SSH config fixture or safe local setup.
- Formatting, lint/static-analysis, and test commands are documented and runnable.
- Host discovery has fixture-based tests unless a documented exception is accepted.
- No credentials or private keys are read, stored, or committed.
- Scope remains limited to SSH config host discovery unless a later accepted decision expands it.

## Verification

- `dart format --set-exit-if-changed lib test`
- `flutter analyze`
- `flutter test`
- `flutter build macos`
