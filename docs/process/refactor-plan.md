# Refactor Plan: Align the Codebase with the Engineering Standards

Status: Not started.

A tracked, behavior-preserving plan to bring the existing Tauri codebase in line with the engineering standards in [docs/engineering.md](../engineering.md) and its guides ([architecture](../engineering/architecture.md), [rust](../engineering/rust.md), [frontend](../engineering/frontend.md), [css](../engineering/css.md)). The targets here come from a full audit of the Rust core and the WebView frontend.

## Prime directive

**This is a refactor, not a rewrite.** Every step must preserve current behavior. The app already works and ships 8-language localization; the goal is structure, safety, and consistency — not new features and not visual change. Where a step *does* change observable behavior (e.g. fixing a mislabeled error code), it is called out explicitly.

## How this plan is tracked

- Each task is a checkbox. Check it when the work lands **and** the relevant gates pass.
- Update the `Status:` line of each phase: `Not started` → `In progress` → `Complete`.
- Keep the gates green after every phase (ideally every commit):
  - Frontend: `npm run typecheck` && `npm run build`
  - Rust (in `src-tauri/`): `cargo fmt --check` && `cargo clippy` && `cargo test`
- Prefer **one phase (or one task group) per commit/PR** so changes stay reviewable and reversible.
- When a phase completes, add a line to `docs/process/progress.md`. Do not accrete narrative in `docs/agents/current-handoff.md` — it is capped at 90 lines by `npm run check:docs`; history belongs at the end of `docs/agents/handoff-log.md`.

## Sequencing

```
Phase 0  Baseline & safety net        ── do first
Phase A  Tooling & gates              ── do first (every later change is then checked)
   ├─ Phase B  Rust core (errors, structure, state)   ┐ independent of each other;
   └─ Phase C  Frontend DRY & dead code               ┘ can run in parallel
Phase D  Frontend typing boundary     ── after C (and benefits from A's checkJs)
Phase E  View decomposition & styling ── last (largest; safest once A–D are in)
```

## Out of scope (for this plan)

- New product features, new commands, or new windows.
- Visual redesign or copy changes (beyond moving styles between homes).
- Packaging, signing, notarization, updater.
- ~~Changing the globals-shim architecture itself.~~ **Reversed:** the UI architecture *is* being
  changed — the app detaches from the design prototypes ([ADR 0011](../adr/0011-detach-app-ui-from-design-prototypes.md));
  that work is tracked separately in [ui-detach-plan.md](ui-detach-plan.md) (Phases 0–D here are
  unaffected — they were behaviour-preserving and stand).

---

## Phase 0 — Baseline & safety net

Status: Complete.

**Goal:** Make "did I change behavior?" answerable before touching code.

- [x] Confirm all current gates pass and record the commands/output as the baseline.
  - Frontend: `npm run typecheck` ✅, `npm run build` ✅ (52 modules).
  - Rust (`src-tauri/`): `cargo test` ✅; `cargo fmt --check` ❌ **already failing** on
    pre-existing drift (`tray.rs`, `log.rs`, …) — addressed by an isolated `cargo fmt`
    commit in Phase A; `cargo clippy` ⚠️ **12 warnings** (mostly `tauri_nspanel` cocoa
    deprecations + `unexpected cfg cargo-clippy` at `lib.rs`, plus 2 real nits in
    `i18n.rs`: manual char comparison L30, needless deref L21).
- [~] Capture reference renders of the key surfaces. **Deferred to Phase C** (decision):
  Phases A and B do not need the visual oracle, and the beam in-flight states
  (beaming/done/failed) require driving the state machine without a real host, so the
  capture is best done immediately before Phase C where it is first used.
- [x] Note the current test counts. **Rust: 13** (10 lib-unit — i18n×3, ssh_config×4,
  config×3 — plus 3 integration in `ssh_config_include.rs`). **Frontend: 0** (no runner yet).

**Acceptance:** Baseline gates recorded (frontend green; Rust `fmt --check` red pre-existing,
to be fixed in Phase A); reference renders deferred to Phase C by decision.

---

## Phase A — Tooling & quality gates

Status: Complete.

**Goal:** Land the linters/formatters/test runner first, so every subsequent refactor step is automatically checked. See [frontend.md §Build and tooling](../engineering/frontend.md#build-and-tooling) and [rust.md §Tooling](../engineering/rust.md#tooling).

Frontend:
- [x] Add **Prettier** with a checked-in config (`.prettierrc.json`/`.prettierignore`; docs excluded); format the `src/` tree once in an isolated commit (whitespace-only — the production bundle was byte-identical before/after). Scripts: `format`, `format:check`.
- [x] Add **ESLint** (`typescript-eslint`, `eslint-plugin-react-hooks`); add `npm run lint`. Strict for `.ts/.tsx` glue (clean); non-blocking warning baseline for `design/*.jsx` (must not fork) with `rules-of-hooks` kept as an error. Current: 0 errors, 122 warnings (all in design prototypes; ratchet in C–E).
- [x] Add **Vitest** + a trivial smoke test so the runner exists for later phases. Add `npm run test` (`vitest run`); separate `vitest.config.ts`.
- [x] (Prep for Phase D) `checkJs` left off, with a `tsconfig.json` TODO referencing Phase D.

Rust:
- [x] **`cargo fmt --check`** and **`cargo clippy`** are in the documented gate ([engineering.md §Quality Gates](../engineering.md#quality-gates)). Clippy warning list captured in Phase 0 (12 warnings: mostly `tauri_nspanel` cocoa deprecations + `unexpected cfg cargo-clippy` at `lib.rs`; 2 real nits in `i18n.rs`). No new `clippy.toml`/`rustfmt.toml` (defaults are fine; add only with a documented reason).
- [x] Clippy policy decided: **fix-as-you-go during Phase B, flip the gate to `cargo clippy -- -D warnings` at the end of Phase B (B5).** Documented in engineering.md.

Repo:
- [ ] (Optional) husky + lint-staged pre-commit — **deliberately skipped** for now (the npm/cargo gates cover it; revisit if drift reappears).
- [x] Update [docs/engineering.md §Quality Gates](../engineering.md#quality-gates) with the new frontend commands (`lint`, `test`, `format:check`).

**Acceptance:** `npm run lint`, `npm run test`, `cargo fmt --check`, `cargo clippy` all exist and run; the Prettier/format commit is isolated; gates documented. ✅

---

## Phase B — Rust core: errors, structure, state

Status: Mostly complete (B1–B5 done; CSP + `commands/` reorg deferred — see below).

**Goal:** Fix the highest-impact weakness (stringly-typed, context-losing, sometimes *mislabeled* errors) and untangle `beam.rs`. See [rust.md §Error handling](../engineering/rust.md#error-handling), [§Module layout](../engineering/rust.md#module-layout), [§Configuration and state](../engineering/rust.md#configuration-and-state).

B1 — Error type (do before the split; it shapes the signatures):
- [x] Add `src-tauri/src/error.rs` with a `thiserror` enum + `type Result<T>`; preserve causes with `#[from]`/`#[source]`.
- [x] Make the core return structured errors (carry `BeamErrorKind` as data, not a re-stringified label).
- [x] Add a single command-edge mapping (`CommandError` / `to_code()`) producing the stable codes the UI branches on. Stringification happens *only* here. (Note: the live UI taxonomy is `timeout`/`auth`/`perm` + a fallback; there is no `unknown` key, so unknown collapses to the timeout card.)
- [x] **Behavior fix (intentional):** validation codes corrected — `valid_alias`/`valid_folder` failures now map to a generic `"invalid"` (decision: honest, not a remote condition), so a bad alias is no longer `"timeout"` and a bad folder no longer `"perm"`. Net visual change limited to the bad-folder case (folder card → generic card); alias visual unchanged.
- [x] Replace `.map_err(|_| "…")` everywhere with cause-preserving conversions.

B2 — Stop swallowing errors:
- [x] Audited every `let _ = …`; added `log::warn_if_err` and applied it across UI `eval`/geometry, tray icon/menu, notification, and log-dir commands. No silent `let _ =` left in non-test code; the logger's own bootstrap fs ops fall back to stderr (documented — can't self-log).
- [x] `Mutex` poisoning: the only `Mutex` (`LOG_DIR`) became a `OnceLock` in B4, removing the poisoning surface entirely.

B3 — Module split (incremental, behavior-preserving):
- [x] `services/ssh.rs`: ssh arg-building + validation + `ssh`/`scp` execution + classification, with unit tests (arg composition, adversarial alias/folder, classification).
- [x] `services/image.rs`: scale/encode, unit-tested (1px, large/clamped, non-RGBA, file encode/reject).
- [x] `beam_blocking()` reduced to orchestration calling the services.
- [ ] Move `#[tauri::command]` handlers into a `commands/` folder — **deferred**. After slimming `beam_blocking` the handlers are already thin; a folder reorg is high-churn/low-value and (since command names are unchanged) behavior-risky to land without an app-launch smoke test. Revisit if/when worthwhile.

B4 — State & config:
- [x] Typed `Config`/`Settings` (serde, `#[serde(default)]`, camelCase) mirroring `window.HB`.
- [x] One typed accessor `config::read()` replaces the duplicated `.and_then()` chains in `lib.rs`, `beam.rs`, `i18n.rs`. (No `AppState` managed state: there is no shared *mutable* state — config is disk-owned; remaining statics are `OnceLock`.)
- [x] `log.rs` `Mutex<Option<PathBuf>>` → `OnceLock<PathBuf>`; `guard()` removed.

B5 — Idioms & lints:
- [x] Cleared the clippy nits (i18n deref + char comparison); added `#[must_use]` to pure queries; isolated the external `tauri-nspanel` deprecated-cocoa API behind one scoped `#[allow(deprecated)]` + a Cargo.toml `[lints]` check-cfg. (Did not rework `config.rs` command error mapping to `?`: those `map_err(|e| e.to_string())` preserve the message and aren't the cause-discarding antipattern; converting would change the command wire error with no real gain.)
- [x] Gate flipped to `cargo clippy --all-targets -- -D warnings`, clean.

- [ ] Add the **CSP** in `tauri.conf.json` — **deferred**. The CSP only takes effect inside the real Tauri WebView (not the dev-server render available here), a wrong policy white-screens the app, and there's a dev-HMR `connect-src` caveat — so it needs an app-launch smoke test that can't be performed in this environment. Proposed value ready (see handoff).

**Acceptance:** `cargo clippy --all-targets -- -D warnings` clean ✅; new unit tests for `services/ssh` + `services/image` ✅; no `Result<_, String>` or silent `let _ =` left in the core except documented/logged cases ✅; error codes reaching the UI correct, real-failure states unchanged ✅; `cargo test` green (28) ✅. **Outstanding:** manual beam smoke test on a real host (can't run here); CSP; optional `commands/` reorg.

---

## Phase C — Frontend DRY & dead code

Status: Complete.

**Goal:** One home for shared helpers; delete duplicates. See [frontend.md §DRY](../engineering/frontend.md#dry-shared-utilities). Independent of Phase B.

- [x] Shared-utils home in `shared.jsx`: `relTime()`/`baseName()`/`diagIcon()` defined once and published on `window`; `popover.jsx` + `prefs.jsx` consume them. `relTime` uses `window.t` (with the key fallback). (`flowA.jsx` doesn't use these helpers — the audit's "flowA via recorder" note was about `popover.src.jsx`; verified by grep.)
- [x] Removed the duplicate `HotkeyRecorder` from `prefs.jsx`; it now consumes `window.HotkeyRecorder`. The local copy's `marginLeft:auto` right-alignment is preserved at the call site so the shared component stays layout-neutral for `flowA` (which is therefore unchanged). Accepted micro-convergence: prefs' recorder box no longer animates its bg/shadow during the record-mode toggle (interaction-only; identical in static renders).
- [x] **Deleted `src/design/popover.src.jsx`** (confirmed no imports).
- [x] Swept for other copy-pasted helpers/maps — none remain (no duplicate top-level defs across the design files; `toAccelerator` is single-home).
- [x] Added Vitest unit tests (jsdom): `toAccelerator` (exported from `config-bridge.ts`) and the shared `baseName`/`relTime` (incl. the `window.t` fallback), loading `shared.jsx` under jsdom. 8 frontend tests pass.

**Acceptance:** each helper defined once ✅; `popover.src.jsx` gone ✅; `npm run typecheck && lint && test && build` green ✅; ready popover + Preferences Hotkey pane render pixel-identical to the captured baseline ✅ (verified via Chrome DevTools at localhost:1420).

---

## Phase D — Frontend typing boundary

Status: Mostly complete (ambient types + checkJs done; .tsx conversion + DS-aliasing deferred).

**Goal:** Make the `window.*` globals typed and turn type-checking on for `.jsx`. See [frontend.md §The typing boundary](../engineering/frontend.md#the-typing-boundary). Do after C so there's less duplication to type.

- [x] Added `src/types/window.d.ts` — one ambient `interface Window` declaring every published global (React, ReactDOM, the DS namespace, `HB`, `OB`, `useHBConfig`, `t`, the shared helpers + prototype surfaces, `openPreferences`/`applyHotkey`, `__TAURI__`).
- [x] Exported shared types (`Config`, `Host`, `Settings`, `Locale`, `RecentBeam`) from one module (`src/types/config.ts`); removed the local `Config`/window shapes from `config-bridge.ts`, `main.tsx`, and `preferences.tsx` (they now use `const w = window` against the ambient types).
- [x] Enabled `checkJs: true`; typecheck green. The 632 surfaced errors were resolved by `// @ts-nocheck` on the 4 verbatim prototypes (`shared`/`popover`/`prefs`/`flowA`, checked once decomposed to `.tsx` in Phase E) and the 13 design-system components (`.jsx`+`.d.ts`, convert to `.tsx` opportunistically). The glue is fully checked — renaming an `HB` method/global now fails typecheck at the glue call sites.
- [ ] Convert `.jsx` → `.tsx` opportunistically — **deferred** (explicitly "no rush"; each nocheck'd file carries a TODO; the ambient types already deliver most of the benefit).
- [ ] Standardize the DS aliasing (`PV`/`P`/`A`) — **deferred to Phase E**, where the prototypes are decomposed into `.tsx` (changing the alias now would edit the verbatim prototypes for little gain).

**Acceptance:** `checkJs: true` ✅; `npm run typecheck` green with the globals typed ✅; renaming an `HB` method or a global fails the build at the **glue** call sites ✅ (prototype call sites once they leave `@ts-nocheck` in Phase E).

---

## Phase E — UI architecture (redefined → UI detach)

Status: Superseded — see [docs/process/ui-detach-plan.md](ui-detach-plan.md).

The original Phase E ("decompose the prototype views in place + styling") was redefined after a
review of the UI architecture. Decomposing browser-global prototype scripts inside the
globals-shim is a half-measure; the standard, maintainable target is to **detach** the app's
screens from the design prototypes — first-party typed `.tsx` components on the design-system
library — and retire the shim. See [ADR 0011](../adr/0011-detach-app-ui-from-design-prototypes.md)
for the decision and [docs/process/ui-detach-plan.md](ui-detach-plan.md) for the phased,
fidelity-preserving migration (which folds in the original Phase E's decomposition **and**
styling/token/`@layer`/theming work).

---

## Tracking summary

| Phase | Focus | Status |
|---|---|---|
| 0 | Baseline & safety net | Complete (renders deferred to C) |
| A | Tooling & gates | Complete |
| B | Rust: errors, structure, state | Mostly complete (CSP + commands/ deferred) |
| C | Frontend DRY & dead code | Complete |
| D | Frontend typing boundary | Mostly complete (.tsx conversion deferred) |
| E | UI architecture | Superseded → [ui-detach-plan.md](ui-detach-plan.md) |

Update this table and the per-phase `Status:` lines as work lands.
