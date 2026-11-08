# ADR 0010: Migrate Hostbeam from Flutter to a Tauri WebView Shell

Status: Accepted.

Date: 2026-06-23.

Advances: ADR 0009 (UI Framework Fidelity — Flutter vs a WebView Shell).
Supplements: ADR 0002 (Flutter Desktop App) — see Consequences.

## Context

ADR 0009 recorded that hand-translating the HTML/CSS/React design into Flutter
widgets was lossy and slow, that a WebView shell (Tauri) would run the design's
actual CSS/React and make fidelity essentially free, and that — *if pixel
fidelity became a top-tier requirement* — Tauri was the preferred alternative. It
asked that, before any wider migration, a spike prove two things: the
non-activating menu-bar NSPanel popover, and one end-to-end clipboard → ssh path.

That spike was built on `spike/tauri-popover` and both bars were met:

- The design's popover (and its host dropdown, including the `> 5 hosts` filter
  field and upward menu) renders **1-1** with the design, because it runs the
  design's own CSS/components — no re-derivation.
- `tauri-nspanel` gives a real non-activating menu-bar popover: hidden on launch,
  toggled by the tray icon and `⌘⇧7`, shown without activating the app, floating
  at status level across spaces, and dismissed on resign-key (click-away).
- A Rust backend lists real hosts from `~/.ssh/config` and beams the clipboard
  screenshot over the system OpenSSH (`arboard` + `mkdir -p`/`scp`), writing a
  paste-ready sentence — the same approach as the Flutter app.

Continuing on Flutter means paying the CSS→widget translation tax indefinitely
for every surface still to build (preferences, onboarding). The fidelity gap kept
recurring as visible mismatches (badge shape, dropdown, alignment, missing search
field), each fixed reactively. The spike shows the WebView path removes that whole
class of work.

## Decision

Migrate Hostbeam from Flutter to a Tauri v2 WebView shell.

The migration runs on a dedicated branch; `main` stays on the working Flutter app
until the Tauri app reaches feature parity, at which point the migration branch
becomes the main line. The Flutter implementation is preserved (not deleted) on
`archive/flutter-app` and the `flutter-final` tag.

The production frontend is rebuilt as a real Vite + React + TypeScript app that
consumes the design's component/token sources, replacing the prototype's vendored
`_ds_bundle.js` and runtime CDN/Babel used in the spike.

ADR 0008 (direct, unsandboxed Developer ID distribution) and ADR 0003 (system
OpenSSH first) continue to hold and map directly onto Tauri.

## Consequences

- ADR 0002 (Flutter Desktop App) is **superseded** for the application shell.
  Its rationale (native macOS desktop, OpenSSH-first) is retained; the
  implementation framework changes from Flutter to Tauri.
- The Dart domain/services (SSH config parsing incl. `Include`, settings store,
  history store, error taxonomy, upload orchestration) and their tests/fixtures
  are re-implemented in Rust; fixtures port directly.
- The Swift NSPanel/clipboard/notification glue is replaced by `tauri-nspanel`,
  `arboard`, and `tauri-plugin-notification`.
- Distribution work (ADR 0008) targets the Tauri bundler: Developer ID signing,
  Hardened Runtime, notarization, no App Sandbox.
- The design is consumed as source via a real bundler, so design updates flow in
  without a hand-port step.
- Verification gates change from the Flutter set to: `cargo fmt`/`clippy`/`test`,
  `tsc`/`vite build`, and `tauri build`.

See `docs/process/tauri-migration-plan.md` for the phased plan and parity
checklist.
