# ADR 0011: Detach the App UI from the Design Prototypes

Status: Accepted.

Date: 2026-06-29.

Advances: ADR 0010 (Migrate to a Tauri WebView Shell) — realizes its intent that the
production frontend be "a real Vite + React + TypeScript app that consumes the design's
component/token sources," and supersedes the interim **globals-shim** implementation that
shipped the design's prototype *screens* verbatim.

## Context

After the Tauri migration (ADR 0010), the WebView UI was wired with a **globals-shim**: the
design team's prototype screen scripts (`src/design/shared.jsx`, `popover.jsx`, `prefs.jsx`,
`flowA.jsx`) are *browser-global scripts* — they read `window.React`, `window.HB`, `window.t`,
etc. and publish `window.Popover` / `window.PrefsApp` / `window.FlowA`. The TS entry points
(`main.tsx`, `preferences.tsx`) import those scripts and render the published globals directly.
`src/design/globals.ts` publishes React/ReactDOM and the design-system namespace first so the
scripts can run.

This was a deliberate shortcut for **pixel-exact fidelity** during the migration: ship the
designer's literal code so nothing drifts. It worked, and it got the app shipping. But it has
become the single biggest source of friction against the engineering standards:

- **No type safety across the boundary.** The prototypes access `window.*` as implicit `any`;
  the refactor's Phase D had to mark all of them `// @ts-nocheck`. Renaming a config method or
  IPC command can't fail the build at the screen call sites.
- **No module system.** Browser globals + a publish-to-`window` registry instead of imports/
  exports; load order is load-bearing and fragile.
- **Monoliths.** A single 904-line `PrefsApp` (and ~500-line `Popover`, ~350-line `FlowA`)
  can't honour "one responsibility per component," and is effectively untestable — only the
  *pure* helpers could be unit-tested, and only by loading the script under jsdom.
- **Mixed concerns.** View, config/IPC wiring, and i18n bleed together in the screen scripts.

The globals-shim only pays for itself when a **separate** design team owns the prototypes and
the app re-syncs them often. Hostbeam is a solo/small project where the same owner maintains
both, so the "keep the prototypes byte-for-byte" benefit is largely historical while the costs
(no types, no tests, monoliths) are paid continuously. Notably, the **design system** under
`src/design/components/**` (Button, Field, Keycap, …) is already a proper component library
(one component per file, sibling `.d.ts`, scoped CSS) — a solid foundation to build on.

## Decision

Adopt the standard, layered architecture for a React/TypeScript desktop app and **detach the
app's screens from the design prototypes**:

- **App-owned screen components** (first-party `.tsx`) are the production UI. They are
  type-checked, testable, decomposed per [frontend.md](../engineering/frontend.md#component-structure),
  and consume the design-system component library.
- **The design-system library** (`src/design/components/**`, converted to `.tsx`) is the
  reusable UI kit the screens are built from.
- **App logic/infra** (the config store + `useHBConfig`, the config bridge, i18n, the hotkey
  translation, the error taxonomy, sound) live in plain typed modules, not browser globals.
- **The design prototypes** (`src/design/*.jsx`) become **reference artifacts**, not shipped
  code. They are preserved in git history (and the design project) and removed from the build
  once each screen is ported.
- **The globals-shim is retired.** `window.*` publication and `globals.ts` are removed once
  nothing depends on them; `src/types/window.d.ts` shrinks to only genuinely-global surface
  (e.g. `__TAURI__`).

The two-process model (privileged Rust core ↔ WebView), the IPC contract, config-as-single-
source-of-truth, and the security posture (ADRs 0003/0008) are unchanged. This ADR changes
**only how the WebView UI is structured.**

The migration is **incremental and fidelity-safe**: one screen at a time, each ported behind a
captured render baseline and diffed before the old prototype is deleted. See the scoped plan in
[docs/process/ui-detach-plan.md](../process/ui-detach-plan.md).

## Consequences

- **Supersedes the "globals-shim / don't fork the design prototypes" constraint** that earlier
  engineering docs and the refactor plan treated as fixed. `engineering.md`, `architecture.md`,
  and `frontend.md` are updated to describe the detached target; the refactor plan's Phase E is
  redefined to *be* this migration.
- Fidelity is now protected by **render-diff verification against a captured baseline** rather
  than by shipping the literal prototype. A small, deliberate divergence risk is accepted and
  contained by the per-screen diff.
- Pixel-exactness against future design-tool output is no longer automatic. If the design
  evolves, changes are re-implemented in the app components (the normal flow), not vendored.
- `// @ts-nocheck` disappears as each screen/component becomes typed `.tsx`; `checkJs` then
  protects the whole frontend.
- The frontend gains real component/unit tests (Vitest + jsdom, already wired) for the
  extracted presentational components and hooks.
- More upfront work than decomposing in place, but it yields a conventional, maintainable
  codebase that is easy to build on — the explicit goal.

## Alternatives considered

- **Decompose the prototypes in place (within the globals-shim).** The refactor plan's original
  Phase E. Rejected: it still leaves untyped browser-global scripts and a fragile load-order
  registry, and "splitting a monolith you can't import or type" is awkward — a half-measure
  toward this same end state.
- **Keep the shim; do styling only.** Lowest effort, but locks in the type/test/structure debt
  indefinitely. Rejected as the target (though the styling work is folded into the migration).
