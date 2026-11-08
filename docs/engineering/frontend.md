# Frontend Guide

Standards for the WebView UI in `apps/desktop/src/`: TypeScript, React 18,
Vite, the `@hostbeam/ui` design system. Read [architecture.md](architecture.md)
first for the IPC contract and state ownership, and [css.md](css.md) for styling.

---

## Structure

```
src/
  main.tsx, preferences.tsx, hud.tsx   entry points, one per window
  config-bridge.ts                     hydrates the config from Rust, mirrors saves back
  i18n.ts                              t(), English, the locale runtime
  locales/                             the other seven, one chunk each, loaded on demand
  lib/                                 rules and adapters, no React except hooks
    ipc.ts          every Rust command, typed; browser-dev mocks, private
    rust-bridge.ts  every message Rust sends; useRustMessage
    config.ts       the config store (HB) and useHBConfig
    thumbs.ts       a Recent preview as an <img> src
    sentence.ts, host-order.ts, beam-failure.ts, recent.ts, updates.ts, …  pure rules, each tested
  hooks/                               hooks shared across screens (useCopied)
  test/screen.tsx                      mounts a screen in jsdom for its tests
  components/                          components shared across screens
  types/                               the config shape, the few window globals
  views/
    popover/     PopoverApp.tsx (composition) + hooks/ + components/
    preferences/ PreferencesApp.tsx (composition) + hooks/ + panes/ + sheets/ + components/
    onboarding/  FlowA.tsx + steps/ + components/
    hud/         BeamHud.tsx
```

The shape of a screen: **a composition file** that calls hooks and renders
components, **hooks** that own one concern's state and effects (`useBeam`,
`useHostManager`, `useReachability`, …), **components** that are prop-driven
and visual, and **`lib/`** for any rule that can be stated without React.
`PopoverApp.tsx` and `PreferencesApp.tsx` are the examples to copy.

Rules:

- One responsibility per file; a component over ~250 lines is a cue to split.
- A rule used by two views has one home in `lib/` with a test. Do not
  re-derive it inline.
- Views never import `config-bridge`; `lib/` never imports `views/`.
- No `window.*` publication for app code. The only globals are the ones
  `types/window.d.ts` declares: the resolved locale, the entry-point
  callbacks, and `__hbReceive` (the bridge's receiver). `t` is imported,
  everywhere, from `i18n.ts`; a design-system component that needs a string
  takes a `t` prop (`HostSelect`).

---

## Talking to Rust

- **Commands:** import the function from `lib/ipc.ts`. If the command does
  not exist there yet, add it there — typed against the Rust signature —
  with a browser-dev fallback if a view needs one. Never `invoke()` from a
  view.
- **Messages from Rust:** `useRustMessage("kind", handler)` in the component
  that handles it. The subscription is made once per mount; the latest
  handler runs. A message with no subscriber is dropped by design.
- **Errors** arrive as the stable code string Rust's `Error::to_code`
  produces; `lib/beam-errors.ts` is the taxonomy and `lib/beam-failure.ts`
  the classification.
- **The beam's state** is `lib/beam-state.ts`: a reducer over `BeamEvent`s
  (`started`, `progress`, `landed`, `settled`, `failed`, `refused`, …) with
  the phase rules beside it (`beamInFlight`, `cardShowing`,
  `confirmationFades`). `useBeam` dispatches into it and owns the timers,
  commands and refs. A new outcome is a new event with a test, not a
  `useState`.
- `isTauri()` (from `lib/ipc`) is the one way to ask whether Rust is there.
  The whole UI renders in a plain browser against the mocks in `lib/ipc.ts`
  and `lib/hosts.ts`, which is how a screen is worked on without a host.

---

## State, config, i18n

- Config is read and written **only** through `useHBConfig()` (or `HB.load()`
  outside React). `update()` patches the persisted copy and broadcasts; both
  windows stay live through `config-bridge`. Keep view state (a phase, a
  lightbox, a copied tick) in the hook or component that owns it.
- Every user-facing string goes through `t("key")` from `i18n.ts`, one key
  per string, added to English in `i18n.ts` and to each of `locales/*.ts`
  (English is the fallback). Use interpolation (`t("pop.beamingTo", { host })`),
  never concatenation. Only the active language is loaded:
  `setLocaleFromSetting` returns a promise the entry points await before the
  first render, and a dictionary that lands after a live switch fires
  `hb:locale`, which `useHBConfig` re-renders on. Tests that switch language
  `await` it.
- Recent previews are cache paths; render them with `thumbUrl()` from
  `lib/thumbs.ts`, which also accepts the data URLs older rows still hold.

---

## Inline styles vs. CSS

Inline `style={{…}}` is acceptable for dynamic, per-instance values and is
still how most of the views are styled today. Static, repeated styling belongs
in CSS classes (see [css.md](css.md)); when you touch a repeated block, lift it
into a class rather than copying it. Colours and sizes are design tokens
(`var(--label)`, `var(--radius-md)`), never literals.

---

## Tooling and gates

From `apps/desktop/` (the root `package.json` proxies these):

```
npm run typecheck     # tsc --noEmit, strict
npm run lint          # eslint src, react-hooks rules on
npm run test          # vitest; jsdom per file with // @vitest-environment jsdom
npm run format:check  # prettier
npm run build         # vite, the three entries
```

CI (`.github/workflows/desktop.yml`) runs all of them on a clean Mac, by hand
and before each release ([ci.md](../process/ci.md)). A test that
needs Rust mocks the transport: `vi.mock("@tauri-apps/api/core", …)` as in
`lib/ipc.test.ts`.

What is tested: every `lib/` rule, the beam state machine, the config store
and bridge, i18n, the bridge dispatch, and the two screens. A screen test
(`views/popover/PopoverApp.test.tsx`, `views/preferences/PreferencesApp.test.tsx`)
mounts the composition through `test/screen.tsx` with the transport mocked
out, so `lib/ipc` answers with its browser-dev mocks; it drives the page
through clicks and the fake clock and asserts on the text, the config in
localStorage and what a Rust message (`receive`) changes. Add one there for
a new flow through a screen; a rule inside it still gets its own `lib/`
test.
