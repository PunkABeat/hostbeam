# ADR 0009: UI Framework Fidelity — Flutter vs a WebView Shell (Tauri)

Status: Superseded by [ADR 0010](0010-migrate-to-tauri-webview-shell.md) (which acts on this comparison and migrates to Tauri). Originally Accepted.

Date: 2026-06-23.

## Context

The Hostbeam design system is delivered as HTML/CSS/React (the `claude.ai/design`
project: token CSS, `components/*.jsx`, and the `prototypes/popover` reference).
The app is built in Flutter (see ADR 0002), so reaching the design means
hand-translating CSS into Flutter widgets.

During the Milestone 005 fidelity work this translation proved lossy and slow.
Several design properties are first-class in CSS but have no direct Flutter
equivalent or required bespoke work:

- inset box-shadows (used for control/keycap/field rings) — Flutter `BoxShadow`
  has no inset, approximated with 0.5px borders / gradients;
- `backdrop-filter` blur (popover material, host menu) — needs `BackdropFilter`;
- `border-radius: 999` pills, exact paddings/letter-spacing, `margin-left:auto`
  right-alignment, and `:hover`/`:active` state transitions.

Each gap surfaced as a visible mismatch (e.g. badge shape, host-select dropdown,
right-alignment) and was fixed reactively, component by component. The root cause
is structural: we are re-deriving a CSS design in a different rendering model.

A WebView-based shell (Tauri = Rust core + the OS WebView; or Electron) would run
the design's actual CSS/React, making fidelity essentially free.

## Options considered

1. **Stay on Flutter.** Keep the working, tested app (SSH orchestration, history,
   settings, error taxonomy, 26 widget tests, real-host smoke test) and the
   hand-written AppKit NSPanel popover. Accept "very close, not CSS-exact" and
   close gaps with a systematic per-region layout reconciliation against the
   prototype source.
2. **Rewrite on Tauri (v2).** Reuse the design's React/CSS verbatim. Every
   capability maps: tray + `tauri-nspanel` for the menu-bar popover,
   `window-vibrancy` for blur, `tauri-plugin-global-shortcut` for the hotkey,
   `arboard`/clipboard plugin for clipboard image/text, `std::process::Command`
   shelling to `ssh`/`scp` (same approach as today), `tauri-plugin-notification`.
   The one non-trivial piece — a proper non-activating NSPanel — already exists
   as native glue today and as the `tauri-nspanel` crate.
3. **Electron.** Same fidelity benefit and the most turnkey menu-bar ecosystem,
   but heavier (bundled Chromium) than Tauri's system WebView.

## Decision

Continue with Flutter for now. Do not rewrite during Milestone 005.

Record that, if pixel-fidelity to the HTML/CSS design becomes a top-tier
requirement, **Tauri is the preferred alternative** because it runs the design's
own CSS/React and is lighter than Electron. The current app is small enough that
this rewrite stays feasible (days, not weeks) if revisited.

## Consequences

- Flutter fidelity is pursued via a systematic reconciliation pass against
  `prototypes/popover/popover.jsx` and the `components/*.jsx` sources, not ad hoc.
- "Close but not CSS-exact" is an accepted outcome on Flutter; known structural
  limits (inset shadows, some hover transitions) are documented in
  [`docs/design/design-qa.md`](../design/design-qa.md).
- A future Tauri spike, if commissioned, should prove the menu-bar NSPanel popover
  (`tauri-nspanel` + vibrancy) and one end-to-end path (clipboard → ssh upload)
  before any wider migration; the Rust/Swift SSH approach ports directly.
- This ADR supplements ADR 0002 (Flutter) rather than reversing it.
