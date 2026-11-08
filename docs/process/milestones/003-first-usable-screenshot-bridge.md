# Milestone 003: First Usable Screenshot Bridge

Status: Complete.

## Goal

Build the first usable Hostbeam product: a macOS menu-bar screenshot bridge for remote coding agents.

The user experience should feel nearly magical: fast, natural, smooth, polished, and careful in every visible detail.

## Product Shape

- macOS first.
- Menu-bar utility first, with no normal main window unless needed.
- Global hotkey plus menu-bar access.
- Clipboard-screenshot upload only.
- Normal SSH server or dev box target.
- Existing OpenSSH configuration and `ssh-agent`.
- Non-interactive SSH readiness required.

## Core Flow

1. User has a screenshot image in the local clipboard.
2. User triggers the global hotkey or menu-bar upload action.
3. If a default host is selected, upload immediately.
4. If no host is selected, show a tiny host picker, keep the image pending, and continue after selection when possible.
5. Upload to `/tmp/hostbeam` or the configured per-host folder.
6. Create `/tmp/hostbeam` automatically if needed.
7. Use filename format `hostbeam-YYYY-MM-DD-HHMMSS.png`.
8. Never overwrite existing remote files; add a suffix if needed.
9. Copy `Use this screenshot: {remote_path}` to the local clipboard.
10. Show completion or failure feedback.

## Included Scope

- Menu-bar app surface.
- Global hotkey configured during setup.
- Skippable first-run setup.
- SSH config host selection into Hostbeam's own host list.
- Default host selection.
- Clipboard screenshot upload.
- Remote directory creation.
- Collision-safe remote naming.
- Coding-agent friendly copied text.
- Recent upload history with thumbnail plus copied text/path.
- Local full image history retained for 7 days by default.
- Easy history disable and clear controls.
- User-friendly errors plus diagnostics/details view.
- A focused polish pass across setup, menu-bar flow, notifications, history, and failure states.

## Explicit Non-Scope

- Arbitrary file transfer.
- Manual file picker.
- Drag-and-drop upload.
- Automatic clipboard screenshot detection.
- Interactive SSH password or passphrase prompts.
- Editing SSH config.
- Remote cleanup automation.
- Cloud accounts.
- Relay service.
- Hosted infrastructure.

## Open Design Questions

- Exact first-run setup pattern.
- Exact menu-bar dropdown and history structure.
- Default local history folder.
- Reachability status indicator design.
- Diagnostics copy/export support.
- Whether success notifications can include thumbnails.
- Pending image storage strategy during just-in-time host selection.

## Acceptance Criteria

- A user can complete the core flow on macOS.
- Setup can be skipped.
- Missing host selection is handled just in time.
- Clipboard remains unchanged on upload failure.
- No SSH credentials, private keys, or image contents appear in diagnostics.
- Recent history can be disabled and cleared.
- Core flow passes a UX quality review for smoothness, clarity, native feel, and small-detail polish.
- Scope remains screenshot-first.

## Verification

- `dart format --set-exit-if-changed lib test`
- `flutter analyze`
- `flutter test`
- `flutter build macos`
- `flutter run -d macos`

## Notes

- The OpenSSH command path is covered by unit tests with structured command assertions.
- A live end-to-end upload against a real SSH host was not performed during implementation because that requires a chosen host and clipboard image from the user's environment.
- Menu-bar integration, global hotkey registration, native clipboard image extraction, clipboard text writes, and notifications are implemented through the macOS platform bridge.
