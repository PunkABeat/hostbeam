# UI Detach Plan: App-Owned Screens on the Design System

Status: **Migration complete.** The UI is fully detached — first-party, strictly-typed `.tsx`
screens on the design-system library, **no globals-shim / window registry, no `@ts-nocheck`, no
`.jsx` prototypes**. The styling pass is done (repeated inline styles → a semantic utility
vocabulary in `src/utilities.css`; frozen-literal audit; `@layer` evaluated and declined for this
app), and **light/dark now follows the OS appearance** — the already-designed `.theme-dark` token
scope, wired via `src/lib/theme.ts` (see §E6). **E6 — and the whole UI detach — is complete**, and
the follow-up cleanup is done too: the design system is renamed `src/design/` → `src/ui/`, the three
monolith views are decomposed into one-component-per-file modules, and lint is **0 errors / 0
warnings** (the intentional `exhaustive-deps` omissions are annotated). Nothing outstanding in this
plan; remaining app work (real-host beam smoke test, CSP) is tracked in the handoff, not here.

A tracked, fidelity-preserving migration to the standard layered React/TypeScript UI
architecture decided in [ADR 0011](../adr/0011-detach-app-ui-from-design-prototypes.md). It
**replaces the refactor plan's original Phase E** ("decompose the prototypes in place"): instead
of restructuring browser-global prototype scripts, we re-home the UI as first-party, typed,
testable components that consume the design-system library, and retire the globals-shim.

Read [ADR 0011](../adr/0011-detach-app-ui-from-design-prototypes.md) first for the *why*, then
[frontend.md](../engineering/frontend.md) and [architecture.md](../engineering/architecture.md)
for the *standards*.

## Prime directive

**Behaviour- and pixel-preserving.** Every screen must render and behave identically to the
current build at every step. The only sanctioned change is *structure* (and moving static inline
styles into themeable CSS). Fidelity is protected by a **render-diff against a captured baseline**
before any prototype is deleted — never delete the old screen until the new one matches.

## Strangler-fig approach

The old prototypes keep rendering until each screen is ported. So shared logic moves into typed
modules **that also publish to `window`** during the transition (a thin compat layer), keeping
the not-yet-ported prototypes working. Each `window.*` publication is removed only when the last
consumer prototype is gone. No big-bang.

## Target architecture

```
src/
  main.tsx               # popover window entry → mounts the app-owned <PopoverApp/>
  preferences.tsx        # preferences window entry → mounts <PreferencesApp/>

  views/                 # app-owned screens (presentation), .tsx, one component per file
    popover/             PopoverApp, ClipboardCard, BeamButton, BeamError, RecentList, HostFooter
    onboarding/          FlowA (router) + steps/ Welcome, ChooseHost, ManualAdd, Hotkey, Done
    preferences/         PreferencesApp (router) + panes/ General, Hosts, Hotkey, Recent, About
    components/          shared layout primitives: Group, Row, Label, Frame, InnerHead,
                         HotkeyRecorder, ImageLightbox, BeamMark, HostPickerList, DiagIcon

  ui/                    # the design system (today's src/design/components/**), converted to .tsx
                         actions/, forms/, feedback/, surfaces/, Icon, index.ts

  lib/                   # app logic + infra, no view
    config.ts            # config store + useHBConfig hook (was window.HB in shared.jsx)
    config-bridge.ts     # Rust mirror (already TS)
    i18n.ts              # already TS
    hotkey.ts            # toAccelerator (already extracted)
    beam-errors.ts       # BEAM_ERRORS taxonomy
    sound.ts             # HBSound
    format.ts            # relTime, baseName
    hosts.ts             # seed/mock host data (was window.OB) — dev fixture

  styles/                # tokens + page CSS (today's design/tokens, app.css, *-page.css)
  types/                 # config.ts; window.d.ts shrinks to genuinely-global surface
```

Naming/paths are a starting point; finalize in Phase E0 and keep it consistent.

## Definition of done — per ported screen

- Decomposed per frontend.md (container/presentational; one responsibility per file).
- Consumes the `ui/` design system; no `window.*` reads for things now imported.
- Static/repeated inline styles moved to CSS classes + **semantic tokens**; inline reserved for
  dynamic values.
- `useEffect` deps + cleanup preserved (watch the hotkey keydown listener and clipboard polling).
- Render-diff vs the captured baseline matches (all states/locales for that screen).
- The old prototype usage is removed, the file deleted, its `@ts-nocheck` gone.
- Gates green: `npm run typecheck && lint && test && build`; new hooks/components have tests.

---

## Phase E0 — Baseline & layout

Status: Satisfied per-screen (instead of one upfront capture). The render-diff oracle was applied
**incrementally** — each screen/state was render-verified at `localhost:1420` / `/preferences.html`
(beam states via the dev sim) immediately before its prototype was deleted, which is the fidelity
guarantee E0 exists to provide. The layout below was finalized and followed (with the noted
deviations: components landed under `src/components/**` + `src/design/components/**` rather than a
top-level `ui/`; the `OB` mock is `lib/hosts.ts`).

- [x] Render-verified every surface/state before deleting its prototype (popover
      ready/uploading/landing/done/failed; onboarding Welcome/Choose/Almost-done; all five
      Preferences panes).
- [x] Directory layout finalized and followed; deviations recorded above.

## Phase E1 — Extract shared logic into typed modules (`lib/`)

Status: Complete (extractable logic done; the `OB` dev-mock moves with the screens).

Move the non-view exports out of `shared.jsx` into typed ES modules that **also publish to
`window`** for the still-rendered prototypes (transitional, via `lib/legacy-window.ts`).
Unit-test the pure ones.

**Refinement:** only the genuinely *cross-screen* logic is extracted up front. Logic consumed by
a single screen (`BEAM_ERRORS`, `HBSound`, `fitPopover`, the `OB` diagnostics/mock) moves into
`lib/` **when that screen is ported** — extracting it earlier would need transitional
`window.OB` re-ordering for no benefit (the new component isn't there to import it yet).

- [x] `lib/config.ts`: the config store (`HB`) + `useHBConfig` hook, typed with `Config`. Tested.
- [x] `lib/format.ts`: `relTime`, `baseName`. Tested directly (no jsdom for the import).
- [x] `lib/legacy-window.ts`: the transitional `window.*` republish layer; imported per entry.
- [x] `lib/beam-errors.ts`: `BEAM_ERRORS` taxonomy (cross-screen — popover + preferences).
      `legacy-window` sets `window.OB.BEAM_ERRORS` before `shared.jsx`, which now *merges* its
      `OB` data instead of overwriting.
- [x] `lib/sound.ts` (`HBSound`), `lib/fit-popover.ts` (`fitPopover`), typed.
- [x] `lib/hosts.ts`: the `OB` mock host data + `testConnection`/`runDiagnostics`/`testHost`
      simulators + `SYSTEM_SHORTCUTS`/`hotkeyConflict` — extracted in E6 when `shared.jsx` was
      retired; typed (`Host[]`), imported directly by the views + config-bridge + `config.allHosts`.

## Phase E2 — Convert the design system to `.tsx`

Status: Complete.

- [x] Converted all 13 `design/components/**/*.jsx` → typed `.tsx`, folding in each sibling
      `.d.ts` and removing `// @ts-nocheck`. Props extend the element's `ComponentPropsWithoutRef`
      (or carry an index signature) for `...rest` pass-through; dynamic-tag components
      (`Surface`, `ListRow`) use `React.ElementType`. Hooks/refs/events are typed.
- [x] Kept the `ensureStyle` CSS-injection pattern as-is.
- Components now live under `src/ui/components/**` (the design system was renamed `src/design/` →
  `src/ui/` in the cleanup pass); screens import them directly (`import { Button } from
  "../../ui/components"`). (During E2 they lived at `src/design/components/**`, published via
  `globals.ts` — both the globals shim and the `design/` name are now gone.)
- Gates green (0 lint errors); popover + Preferences General pane render-verified identical.
  Note: restart `vite dev` after bulk file renames — a stale HMR graph renders blank (the
  production build stays green).

## Phase E3 — Port the popover (`views/popover/`)

Status: Complete. The steady popover is now `src/views/popover/PopoverApp.tsx` (first-party,
typed); `src/design/popover.jsx` and `window.Popover` are deleted. Every state was render-verified
identical via the dev sim (ready / uploading-with-BeamMark / landing-done / failed error card).
Ported as a single faithful typed component (with local `Beak`/`Frame`); finer decomposition into
`ClipboardCard`/`BeamButton`/`BeamError`/`RecentList`/`HostFooter` is an optional follow-up.

Prep done (every dependency the popover view needs is now a typed import):
- [x] Extracted `Ic` → `src/components/Icon.tsx` (used by every screen).
- [x] Extracted `ShotThumb`, `BeamMark`, `ImageLightbox` → `src/components/*.tsx`.
- [x] Beam logic deps already in `lib/` (config, format, beam-errors, sound, fit-popover).
      All still republished on `window` via `legacy-window` for the un-ported prototypes.

Remaining (the view port — a single atomic step):
- [ ] Create `views/popover/PopoverApp.tsx` (+ optionally a `useBeam` hook and
      `ClipboardCard`/`BeamButton`/`BeamError`/`RecentList`/`HostFooter` sub-components) as a
      faithful, typed port of `src/design/popover.jsx` (~490 lines: clipboard polling, beam
      state machine, lightbox, diagnostics, recent list, host switcher). Import the typed
      `lib/`, `src/components/**`, and `design/components/**`; use `t` from `i18n` and keep
      `window.__TAURI__` / `window.openPreferences` / `window.hbBeam` for the IPC + shortcut
      wiring. **Tip:** a "lift to one typed `PopoverApp.tsx` (with local `Beak`/`Frame`) + verify
      + delete the prototype" first, then split into sub-components, is lower-risk than
      decomposing and porting in one go.
- [ ] Switch `main.tsx` to render `<PopoverApp/>`; render-diff all states (ready/empty/uploading/
      landing/done/failed — drive in-flight via the dev sim by clicking `[data-primary]` and via
      an offline host for the failed card); delete `popover.jsx` and `window.Popover`.
- [ ] Move the popover-only `OB` diagnostics sim (`runDiagnostics`) usage into the view (real
      `invoke("diagnose")` already runs under Tauri; the sim is the no-Tauri fallback).

## Phase E4 — Port onboarding (`views/onboarding/`)

Status: Complete. First extracted `StepDots`/`HotkeyRecorder`/`HostPickerList` from `shared.jsx`
to typed `src/components/*.tsx`, then ported `flowA.jsx` → `src/views/onboarding/FlowA.tsx`
(faithful typed lift with local `Beak`/`PopoverFrame`/`InnerHead`/`WelcomeBeam`/`ManualAdd`).
`main.tsx` renders `<FlowA/>`; `flowA.jsx` + `window.FlowA` deleted. Render-verified all three
steps (Welcome / Choose-a-host / Almost-done) via a temporary forced-onboarding boot (reverted).

## Phase E5 — Port preferences (`views/preferences/`)

Status: Complete. Ported `prefs.jsx` (~2460 lines: General/Hosts/Hotkey/Recent/About + modal
sheets) → `src/views/preferences/PreferencesApp.tsx`, re-homed off the globals-shim (imports the
design system + `src/components/**` + typed `lib/` + `t` from i18n). `preferences.tsx` renders
`<PrefsApp/>`; `prefs.jsx` + `window.PrefsApp` deleted. Render-verified every pane pixel-identical
at `/preferences.html#<tab>`. Given its size this port carries a **temporary `// @ts-nocheck`**
(the detach is the win; full typing of the panes is the follow-up in "Remaining polish" below).

## Phase E6 — Retire the shim + styling + theming

Status: Shim fully eliminated ✅ — there is **no window registry left** (the ADR 0011 goal,
taken to zero globals). Styling pass done ✅ (utility extraction + light/dark). **E6 complete.**

- [x] Deleted `shared.jsx` — the last prototype script. Moved the `OB` dev/onboarding mock to
      typed `src/lib/hosts.ts`; dropped the dead `diagIcon`; moved the `.hb-step` step-in
      animation from the runtime `<style>` injection into `src/app.css`.
- [x] **Eliminated the window registry entirely.** `config-bridge`/`main`/`config.allHosts` +
      all three views now import `HB`/`OB_MOCK` directly; entries mount React via imported
      `createRoot`/`createElement`. Deleted both `legacy-window.ts` **and** `globals.ts`;
      `types/window.d.ts` shrank to i18n + the app-wiring callbacks + `__TAURI__` +
      `webkitAudioContext`. Verified live: `window.HB/OB/React/ReactDOM/HostbeamDesignSystem`
      are all `undefined`; all three windows render. `src/design/` is now purely the design system.
- The prototypes live on in git history (the migration deleted them screen-by-screen behind
  render-diffs); no separate reference copy was kept.

### Remaining polish (follow-up — not blocking the detach)

- [x] **Typed `PreferencesApp.tsx`** — removed its temporary `// @ts-nocheck` + the file-level
      eslint-disable; the screen is now strictly checked like the rest of `src/`. Type-only
      (no JSX/logic/copy/style change): ~9 named types + inline prop types for ~16 components +
      typed handlers/state, the `T` helper typed, narrow casts only where the prototype's runtime
      shape is wider than a clean type. Fixed a latent bug the suppression had masked
      (`HotkeyRecorder` used but never imported). **No `@ts-nocheck` remains anywhere in `src/`.**
- [x] **Styling — utility extraction (done).** Lifted the repeated *standalone* inline style
      objects across all three screens into a small semantic vocabulary in `src/utilities.css`
      (`.hb-push`, `.hb-mono`, `.hb-fg-{secondary,tertiary,quaternary,success,danger,warning,
      accent,white}`, `.hb-accent-strong` — 56 sites → 11 classes), imported last in each window
      entry. **Pixel-preserving by construction:** only exact whole-object matches were lifted
      (the ` }}` terminator can't hit multi-prop objects), every candidate site was verified free
      of a competing `className`, and each class declaration is byte-identical to the inline style
      it replaced. Composite one-offs and dynamic/state-derived styles stay inline (the plan's
      "inline reserved for dynamic values"). Verified by render-diff (popover ready; preferences
      Hosts/About; onboarding Welcome/Choose-a-host — all identical) + a computed-style probe (all
      11 utilities resolve to their intended token values through the real cascade). Commit
      `570f188`.
      - **Frozen-literal audit (done):** the remaining non-token literals are all intentional and
        left as-is — the Ventura nav-tile brand swatches (`#8E8E93`/`#5E5CE6`/`#34C759`/`#30B0C7`),
        the white glyphs on those colored tiles, and the `rgba(0,0,0,…)` hairline/overlay shadows.
        Tokenizing them would be a redesign (the prime directive forbids it).
      - **`@layer` — evaluated, deliberately not introduced.** The app has ~zero cascade conflicts
        (page CSS uses `!important` in just 2 spots) and the 13 design-system components inject
        their CSS at runtime **unlayered**; a clean layer architecture would mean wrapping every
        injected style string (a cascade-wide change) to remove 2 `!important`s — high risk, no
        real benefit on a single desktop app. Utilities load last instead, which wins source-order
        ties defensively.
- [x] **Light/dark (done).** It turned out the dark values were **already designed** — a full
      `.theme-dark` token scope exists in `tokens/colors.css` (labels/surfaces/fills/accent/semantic)
      and `tokens/elevation.css` (shadows) — but was **dormant**: nothing applied the class, so the
      Tauri build was stuck in light. Wired it in `src/lib/theme.ts` (`setupTheme`): toggle
      `.theme-dark` on `<html>` to match the system `prefers-color-scheme`, updating live on OS
      changes; called at module scope in both window entries so it applies before first paint (no
      flash of light); guarded for environments without `matchMedia`. (Later extended with a
      **Preferences → General appearance switcher** — `settings.appearance` System/Light/Dark;
      `theme.ts` now resolves the effective theme from that setting, still defaulting to follow the
      OS.) Light mode is byte-identical to before (the class is simply not added); dark mode renders
      correctly (verified by forcing dark on the popover + preferences — surfaces/labels/accent flip
      to the designed values; the Ventura nav-tile brand swatches stay branded). 4 new tests →
      16/16. Commit `f68c0f1`. (No value invention was needed after all — the earlier "needs design
      input" caveat was moot once the designed `.theme-dark` set was found.)
- [x] **Finer-decomposed the lifted screens + renamed the design system to `ui/` (done).**
      `src/design/` → `src/ui/` (wholesale, history-preserving; commit `4b06c50`). Split the three
      monolith views into one-component-per-file modules (verbatim relocation, verified by
      line-multiset diff + render): `PreferencesApp` 2634→289 lines across 15 files
      (`shared`/`components`/`panes`/`sheets`; commit `77b0ef3`); `FlowA` 907→598 and `PopoverApp`
      1184→1093 with their frame/step/helper seams extracted (commit `2fdc7fc`). `PopoverApp` stays
      one cohesive stateful component — its body would need behaviour-changing hook extraction to
      split further, out of scope for a fidelity pass. Also annotated the 7 intentional
      `exhaustive-deps` omissions → **lint is now 0 errors / 0 warnings** (commit `e98f82a`).

---

## Tracking summary

| Phase | Focus | Status |
|---|---|---|
| E0 | Baseline & layout | Satisfied per-screen (render-diffed each screen/state before deleting its prototype) |
| E1 | Extract shared logic → `lib/` | Complete (OB mock moves with screens) |
| E2 | Design system → `.tsx` | Complete |
| E3 | Port popover | Complete |
| E4 | Port onboarding | Complete |
| E5 | Port preferences | Complete |
| E6 | Retire shim + styling + theming | **Complete** — shim + registry eliminated; PreferencesApp typed; styling pass done (utility extraction + frozen-literal audit); light/dark wired to the OS appearance |

Update this table and the per-phase `Status:` lines as work lands. Keep one screen / coherent
group per commit, gates green after each.
