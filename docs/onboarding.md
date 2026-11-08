# Onboarding

Hostbeam is a documentation-first repository for a small macOS desktop utility, built as a Tauri (Rust + system WebView) shell that runs the design's own React/CSS for pixel-exact fidelity.

The first product goal is to reduce interruption when a developer needs to move a local clipboard screenshot into a coding-agent session running on a normal SSH server or dev box.

The intended first usable workflow is:

1. Developer captures or copies a screenshot locally.
2. Developer triggers Hostbeam from a global hotkey or macOS menu-bar item.
3. The app transfers the screenshot to the selected SSH host.
4. The app copies a coding-agent friendly sentence containing the remote path back to the local clipboard.
5. Developer pastes that sentence into the remote coding-agent session.

The app is implemented and working: menu-bar presence, global hotkey, clipboard screenshot reading, SSH config host discovery, OpenSSH upload, paste-ready clipboard sentence, saved hosts, recent history, diagnostics, notifications, and localization. It was first built in Flutter and then migrated to the current Tauri shell — see [ADR 0010](adr/0010-migrate-to-tauri-webview-shell.md) and the [migration plan](process/tauri-migration-plan.md). The final Flutter implementation is preserved on the `archive/flutter-app` branch and the `flutter-final` tag.

## Before Working

Read these files in order:

1. `README.md`
2. `docs/product.md`
3. `docs/experience.md`
4. `docs/engineering.md`
5. `docs/process/progress.md`
6. `docs/agents/current-handoff.md` (short by design — its history is in `docs/agents/handoff-log.md`)
7. `docs/agents/contribution-protocol.md`
8. Relevant ADRs in `docs/adr/`

## Current Constraint

The Tauri migration ([ADR 0010](adr/0010-migrate-to-tauri-webview-shell.md)) is complete; [tauri-migration-plan.md](process/tauri-migration-plan.md) is history, not a plan to follow. The product ships and takes money, so new scope should be a deliberate decision, not an incidental addition — and anything that touches checkout, licensing, or the updater has a live blast radius.

## Naming

Hostbeam is the final product name — [ADR 0015](adr/0015-hostbeam-is-the-final-name.md), clearance pass done 2026-07-04, `hostbeam.app` registered. It is not provisional, and it is load-bearing: the bundle id, Keychain service, Keygen product, Paddle product, and every URL in the licence email depend on it.
