# Experience

Hostbeam should feel like a compact macOS menu-bar utility. It should not feel like an admin dashboard, project workspace, or cloud control panel.

The first usable product should optimize for speed and low interruption while still giving remote coding agents a clean, useful pasted instruction.

The target feeling is nearly magical: the user should trigger the action, see just enough confirmation, and immediately have the right sentence ready to paste into the remote agent. The product should feel natural, smooth, polished, and careful in small details.

## Target Flow

1. The user has a screenshot image in the local clipboard.
2. The user triggers the global hotkey or chooses upload from the menu-bar item.
3. If a default host is selected, Hostbeam uploads immediately.
4. If no host is selected, Hostbeam shows a tiny host picker, keeps the image pending, then continues upload after selection when possible.
5. Hostbeam uploads the image to `/tmp/hostbeam` or the configured per-host folder.
6. Hostbeam copies a coding-agent friendly sentence to the local clipboard.
7. The user pastes that sentence into the remote coding-agent session.

## Interaction Bias

- Fast and quiet by default.
- Clear only when action or failure needs attention.
- Small surfaces over full-window management.
- Native platform affordances where practical.
- Global hotkey for the fastest path.
- Menu-bar access for visibility, history, and controls.
- Just-in-time prompts instead of blocking setup.
- Notifications only for useful completion or failure states.

## UX Quality Bar

World-class UX is part of the product scope.

- The core upload flow should avoid unnecessary choices, windows, and interruptions.
- Every visible label should earn its place.
- Every prompt should explain only the decision needed now.
- Successful upload should feel satisfying but not loud.
- Failure should feel recoverable, not alarming.
- Empty states should guide action without sounding like documentation.
- Recent history and settings should feel close at hand but secondary.
- Keyboard access should be first-class for repeated use.
- Visual hierarchy should remain clear in small menu-bar surfaces.
- Motion and feedback should be subtle, purposeful, and never decorative for its own sake.
- The UI should look and behave like a careful macOS utility, not a web dashboard compressed into a popover.

## First-Run Experience

First-run setup should help the user reach a workable product quickly.

Setup should be skippable and should focus on:

- Picking hosts from discovered SSH config.
- Choosing a default host.
- Choosing or confirming the global hotkey.

Setup should show, but not require editing:

- Default remote folder: `/tmp/hostbeam`.
- Default copied text: the remote path alone, which the agent attaches as the
  picture; a sentence around it is optional (ADR 0006, 2026-09-28).

If the user skips setup, Hostbeam should prompt only when missing information blocks the current action.

## Menu-Bar Surface

The menu-bar surface should be the primary home for the product.

Expected content:

- Current/default host.
- Upload clipboard screenshot action.
- Recent uploads, likely the last five.
- Recent upload thumbnails plus copied text/path.
- Entry points for host management, history, settings, and diagnostics.

Fuller history may live in a popover or separate settings/history window once design work determines the best pattern.

## Early UX Boundaries

Milestone 002 should not design or implement the final upload flow. It should only provide enough interface to prove that the app can discover SSH hosts from existing configuration.

Avoid committing to final interaction models for:

- Clipboard image capture.
- Upload confirmation.
- Destination folder choice.
- Host switching command palette.
- Menu-bar behavior.
- Native notifications.
- Recent upload history.

## First Usable Product UX Boundaries

The first usable product should include:

- macOS menu-bar presence.
- Global hotkey configured during setup.
- Clipboard-only screenshot upload.
- Host picker only when no host is selected.
- Completion and failure notifications.
- Recent history with previews.
- A polished interaction pass before the milestone is accepted.

The first usable product should not include:

- Manual file picker.
- Drag-and-drop.
- Arbitrary file transfer.
- Automatic clipboard screenshot detection.
- Interactive SSH password or passphrase flows.
- Remote cleanup automation.

## Known Failure Behavior

- No image in clipboard: quiet notification.
- Host unreachable: quiet error, clipboard unchanged, retry/change-host prompt.
- Upload success: notification includes copied sentence/path and may include thumbnail if practical.
- Diagnostics: available to developers, redacted by default.

## Failure States To Design Later

- No SSH config found.
- SSH config exists but has no usable hosts.
- Host uses unsupported config directives.
- `ssh` binary is missing.
- `ssh-agent` has no suitable identity.
- Host is unreachable.
- Remote destination is not writable.
- Clipboard does not contain an image.
- Upload succeeds but clipboard update fails.
