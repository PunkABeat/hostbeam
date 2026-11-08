# Implementation Readiness Review

Date: 2026-06-17.

## Verdict

The design handoff is good enough to drive a substantial Milestone 005 UI/UX improvement pass.

It is strongest as a source of truth for the visible product experience: compact popover structure, exact product voice, Beam-first hierarchy, design tokens, reusable components, motion discipline, state copy, and the intended Flutter translation approach.

It should not be treated as permission to implement every behavior described in the prototype bundle. The active repo scope still controls what ships.

## Safe To Implement Now

- Move visible copy from "Upload" language to "Beam" language.
- Build design tokens and a Hostbeam theme from the supplied color, spacing, radius, typography, elevation, and motion values.
- Reshape the current surface toward the 340px compact utility layout.
- Build reusable UI primitives for button, badge, status dot, keycap, list row, surface, shot thumbnail, and BeamMark.
- Add the popover-style ready, no-host, beaming, done, error, recent, and beam-to host states.
- Keep recent history visible but secondary.
- Improve host selection and default-host presentation without editing SSH config.
- Add widget tests for changed UI states and interactions.
- Use the reference prototypes for visual and interaction comparison, while rebuilding the UI natively in Flutter.

## Needs Product Decision Before Implementation

- Default hotkey change from the current `Control+Option+Command+U` implementation to the design handoff's `cmd+shift+7`.
- Whether the exact hotkey glyph should be shown as `⌘⇧7` before the native bridge actually registers that shortcut.
- Whether Preferences should ship in Milestone 005 or remain a later surface.
- Whether the paste-ready sentence should become user-editable in this milestone.
- Whether sound, launch-at-login, and notification preference toggles belong in this milestone.
- Whether manual host creation belongs in this milestone.

## Conflicts Or Defers

The handoff says the input layer should be "file-architected" and capable of file-url clipboard payloads. Current Milestone 005 non-scope forbids arbitrary file transfer, manual file picker, and drag-and-drop. For now:

- Keep the product and shipped behavior screenshot-only.
- Do not upload clipboard file URLs in Milestone 005.
- It is acceptable to avoid naming future abstractions too narrowly when editing nearby code, but do not add working file transfer paths yet.

The handoff suggests `dartssh2` as an SSH/SFTP option. Current ADRs accept system OpenSSH first. For now:

- Keep the existing OpenSSH-backed upload architecture.
- Do not replace SSH execution with `dartssh2` without a new ADR and security review.

The handoff includes per-host folders and manual hosts. Current progress docs list per-host settings outside Milestone 005. For now:

- Keep the existing global remote folder.
- Do not add per-host folder persistence until scope changes.

## Current Implementation Gap

The current Flutter app already has working screenshot upload services, menu-bar presence, hotkey trigger, notifications, host selection, and recent history. The visible surface is still a broad Material window rather than the compact Hostbeam utility specified by the design handoff.

The next implementation should preserve the working service layer and focus on presentation, state clarity, copy, and layout.

## Quality Bar

Implementation should not be accepted only because tests pass. Milestone 005 requires:

- Formatter, analyzer, widget/unit tests, and macOS build.
- Visual review at realistic compact utility sizes.
- Confirmation that the real screenshot-to-remote-host path still works.
- No new feature scope without progress-doc and ADR updates.
