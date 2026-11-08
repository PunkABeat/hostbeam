# Handoff Log

Where handoff narrative goes to live once it stops being *current*.
**Chronological, oldest first — append at the end.** Do not prune: the value of
this file is that a decision's reasoning survives the session that made it.

Sections carried over from `current-handoff.md` on 2026-08-31 keep their
original present tense, because rewriting them would destroy the thing they are
for. **Read every undated section as a snapshot of its moment, not as current
state** — several describe work (packaging, signing, notarization, CSP, the
Tauri refactor) that has long since shipped. What is true *now* is only ever in
`docs/process/progress.md`.

`current-handoff.md` is deliberately short and is checked for it
(`npm run check:docs`). When a section there stops describing what the next
person needs before touching the code, it belongs here.

---

## 2026-06-14

- Created documentation-first repository foundation.
- Completed Milestone 001.
- Defined Milestone 002 as the first implementation milestone.
- Limited Milestone 002 to Flutter scaffold plus SSH config host discovery.
- Recorded durable decisions in initial ADRs.
- Added agent-first contribution protocol and strengthened engineering governance before implementation.
- Captured product interview outcomes and defined first usable product as a macOS menu-bar screenshot bridge for remote coding agents.
- Added world-class UX quality bar: nearly magical feel, smooth native interactions, and polish as part of correctness.
- Added test-by-default and quality-tooling requirements for implementation milestones.
- Completed Milestone 002 with macOS Flutter scaffold, SSH config host discovery proof, fixture tests, analyzer, test, and macOS build verification.
- Completed Milestone 003 with menu-bar app behavior, global hotkey, clipboard screenshot extraction, OpenSSH upload orchestration, coding-agent clipboard text, local history, diagnostics, notifications, tests, analyzer, macOS build, and runtime launch verification.
- Accepted direct macOS distribution outside the Mac App Store with App Sandbox disabled by default for OpenSSH-first behavior.
- Completed Milestone 004 with a first utility-shell polish pass, clearer host/default selection behavior, calmer setup/status/history states, additional widget tests, analyzer, tests, and macOS build verification.
- Reprioritized Milestone 005 toward UI/UX maturation; packaging, signing, notarization, and updater work are later because the prototype experience is still too rough.
- Started Milestone 005 with a primary-command window redesign, compact setup/status/history treatment, tighter host rows, and widget coverage for the redesigned command ready state.

---

## Current state

The core screenshot-bridge workflow is implemented and working:

- Menu-bar presence — a non-activating NSPanel popover toggled from the status item, with the beam-glyph tray icon that animates while a beam is in flight.
- Global hotkey that beams the clipboard screenshot (silent by default; optional "show the popover while beaming").
- Floating **beam HUD** — a small top-center overlay for silent shortcut beams (screenshot preview + "Beaming to {host}…" with the blue beam animation → "Beamed" → auto-hides). It's a second non-activating NSPanel (`hud` window, `src/views/hud/` + `src/hud.tsx`), driven **entirely from the Rust `beam` command** (via `hud_uploading`/`hud_done`/`hud_dismiss`), *not* the popover webview — a hidden panel's webview is suspended, so a popover-relayed "done" wouldn't arrive until the app was next clicked. All HUD ops (show/eval/auto-hide) dispatch onto the GCD main queue (`dispatch2`), which runs AppKit on the main thread and wakes the idle run loop; the HUD fetches its own preview via `clipboard_preview`.
- Clipboard screenshot reading with a real thumbnail/preview and a tap-to-enlarge lightbox.
- SSH config host discovery; add from the picker or manually; per-host remote folder; reorder/remove; reachability probing and diagnostics.
- OpenSSH upload via system `ssh`/`scp` (no stored credentials) plus a paste-ready clipboard sentence.
- Recent history, success notification, and diagnostic logging (last 7 days, viewable/copyable from About).
- Preferences window (General / Hosts / Hotkey / Recent / About); ⌘, opens it, Esc dismisses the popover.
- Localization in 8 languages (en, fr, ja, es, de, zh-Hans, pt-BR, ko) across the UI and the Rust strings, with live language switching.

The UI, shared config model, and beam state machine live under `src/design/` (the design's React/CSS); they are bridged to the Rust core in `src-tauri/src/` through a JSON config mirror.

## Quality gates

- `npm run typecheck` (`tsc --noEmit`)
- `npm run build` (Vite)
- `cargo fmt` / `cargo clippy` / `cargo test` (run in `src-tauri/`)

## Distribution

- Direct macOS distribution first, not the Mac App Store (ADR 0008).
- App Sandbox stays disabled by default — Hostbeam depends on user-managed OpenSSH config and system SSH tooling.
- Packaging, signing, and notarization (Developer ID, Hardened Runtime) remain intentionally later.
- **All packaging/hardening steps are tracked in [docs/process/packaging-checklist.md](../process/packaging-checklist.md)**
  so nothing is forgotten at release time — CSP (with ready-to-paste `csp`/`devCsp` values +
  verification), signing, notarization, entitlements, bundle metadata, auto-update decision, version
  sync, and the tray-template check. **CSP is now set and verified** (2026-07-01) in both `tauri dev`
  and `tauri build` — strict prod `csp` + a dev `devCsp` with the Vite-HMR allowances; see the
  checklist for the values + rationale.

## Refactor in progress

A behavior-preserving refactor to align the code with the engineering standards is underway,
tracked in [docs/process/refactor-plan.md](../process/refactor-plan.md). Phases 0 (baseline),
A (tooling & gates), and the bulk of B (Rust core) are complete: the frontend has Prettier,
ESLint, and Vitest (`npm run lint` / `test` / `format:check`); the Rust core now has a typed
error with a single command-edge code mapping, no silent error drops, pure `services::ssh`
+ `services::image` (unit-tested), a typed `config::read()` accessor, and a clean
`cargo clippy --all-targets -- -D warnings` gate. Rust tests: 28.

**Outstanding / needs a real environment:**

- **Real-host beam smoke test** — the beam path was refactored (typed errors, services
  extraction) behavior-preservingly, but a live `ssh`/`scp` beam to a real host hasn't been
  re-run. Worth one before relying on it.
- **CSP (deferred Phase B item).** `tauri.conf.json` still has `security.csp: null`. Proposed
  value once it can be verified with an app launch (both windows must still load, dev + prod):
  `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'`
  — `data:` for the preview thumbnails, `'unsafe-inline'` for the prototypes' inline styles +
  injected `<style>` tags (until Phase E moves them), fonts from self. Watch the `tauri dev`
  HMR `connect-src` (may need a separate `devCsp`/ws allowance).
- **`commands/` folder reorg (deferred Phase B item)** — low value now that handlers are thin.

Phase C (frontend DRY & dead code) is also complete: shared helpers
(`relTime`/`baseName`/`diagIcon`) consolidated into `shared.jsx`, the duplicate
`HotkeyRecorder` removed from prefs, `popover.src.jsx` deleted, and jsdom + Vitest unit tests
added (`toAccelerator`, shared helpers — 8 frontend tests). Renders verified pixel-identical
to a captured baseline.

Phase D (typing boundary) is mostly complete: `src/types/window.d.ts` (ambient globals) +
`src/types/config.ts` (shared `Config`/`Settings`/`Host`/`Locale`) are in place, the glue is
rewired onto them, and `checkJs: true` is on (typecheck green). The verbatim prototypes and
the `.jsx` design components carry `// @ts-nocheck` with TODOs; converting them to `.tsx`
(which removes the nocheck and fully type-checks them) is deferred and opportunistic. The
DS-aliasing standardization is folded into Phase E.

**Phase E is redefined as a UI detach** ([ADR 0011](../adr/0011-detach-app-ui-from-design-prototypes.md)):
rather than decomposing the browser-global prototype screens in place, the app moves to the
standard layered architecture — first-party typed `.tsx` screens (`views/**`) built on the
design-system library (`ui/`, today `design/components/**`), with logic in `lib/`, retiring the
globals-shim. It's a phased, fidelity-preserving (render-diff) migration scoped in
[docs/process/ui-detach-plan.md](../process/ui-detach-plan.md): E0 baselines → E1 extract shared
logic to `lib/` → E2 design system to `.tsx` → E3 popover → E4 onboarding → E5 preferences → E6
retire shim + styling/theming. The engineering docs (architecture/frontend/engineering) now
describe the detached target; the globals-shim is documented as transitional.

**Migration progress:** E1 (in progress) — the cross-screen logic is extracted into typed `lib/`
(`lib/config.ts` = `HB` store + `useHBConfig`; `lib/format.ts` = `relTime`/`baseName`), with
`lib/legacy-window.ts` republishing on `window` for the un-ported prototypes; single-consumer
logic (`BEAM_ERRORS`, `HBSound`, `fitPopover`, `OB`) moves with its screen. E2 (complete) — all
13 design-system components are now typed `.tsx`. **E3 (popover) is complete** — the steady
popover is the app-owned `src/views/popover/PopoverApp.tsx`; `popover.jsx` + `window.Popover` are
deleted; every state was render-verified via the dev sim. The shared components it needed
(`Ic`/`ShotThumb`/`BeamMark`/`ImageLightbox`) are now typed `src/components/*.tsx` (still
republished on `window` via `legacy-window` for the remaining prototypes).

**The UI detach is complete (ADR 0011).** All three screens are first-party, **strictly-typed**
React under `src/views/**` (`popover/PopoverApp`, `onboarding/FlowA`, `preferences/PreferencesApp`);
every prototype `.jsx` (`popover`/`flowA`/`prefs`/`shared`) is deleted. Shared components are typed
`src/components/**`; app logic is typed `src/lib/**` (`config`, `format`, `beam-errors`, `sound`,
`fit-popover`, `hosts`). **The window registry is entirely gone** — `legacy-window.ts` and
`globals.ts` are deleted; `config-bridge`/`main`/`config.allHosts` + the views import `HB`/`OB_MOCK`
directly; entries mount React via imported `createRoot`/`createElement`. `window.d.ts` is down to
i18n + the app-wiring callbacks + `__TAURI__`. **No `@ts-nocheck` remains anywhere in `src/`**;
`src/design/` is purely the design-system library. All gates green (typecheck 0, lint 0 errors,
test 12/12, build); every screen/state render-verified pixel-identical via the dev sim.

**The styling pass is done (tracked in `ui-detach-plan.md` §E6, commit `570f188`):** the repeated
*standalone* inline style objects across the three screens were lifted into a small semantic utility
vocabulary in `src/utilities.css` (`.hb-push`, `.hb-mono`, `.hb-fg-*`, `.hb-accent-strong` — 56 sites
→ 11 classes, imported last in each entry). Pixel-preserving by construction (only exact whole-object
matches; every site free of a competing `className`; byte-identical declarations) and verified by
render-diff + a computed-style probe. Composite one-offs and dynamic styles stay inline. The
frozen-literal audit is done — the Ventura nav-tile brand swatches, on-tile white glyphs, and
`rgba(0,0,0,…)` hairline/overlay shadows are intentional literals, left as-is. `@layer` was evaluated
and **deliberately not introduced**: the app has ~zero cascade conflicts (2 `!important` spots) and the
design system injects its CSS unlayered at runtime, so a full layer architecture would be a
cascade-wide change for no real single-app benefit.

**Light/dark theming is done (commit `f68c0f1`).** The dark token scope (`.theme-dark` in
`tokens/colors.css` + `elevation.css`) was already *designed* but dormant — nothing applied the class,
so the Tauri build was stuck in light. `src/lib/theme.ts` (`setupTheme`) now toggles `.theme-dark` on
`<html>` to match the system `prefers-color-scheme`, live-updating on OS changes; it's called at module
scope in both entries (applies before first paint) and guarded for environments without `matchMedia`.
Light stays byte-identical (class not added); dark verified on the popover + preferences (surfaces /
labels / accent flip to the designed values; the Ventura nav-tile brand swatches stay branded).

**Appearance switcher (Preferences → General).** `settings.appearance` (`"system" | "light" | "dark"`,
default `"system"`) added to the config; `theme.ts` resolves the effective theme from it (system →
`prefers-color-scheme`, else forced) and re-applies on OS flips, same-window saves (`hb:config`), and
cross-window changes (`storage`); `applyTheme()` runs after config hydration in both entries. UI is a
`SegmentedControl` in the General pane; i18n keys `prefs.appearance{,System,Light,Dark}` across 8
locales. No Rust change (raw config JSON round-trips verbatim). Verified live (force dark under light OS
and vice-versa; System follows OS; persists across reload; popover reads it). Tests → 18/18.

**Cross-window sync on popover show.** The popover is a non-activating NSPanel that hides on blur, so
it is never visible while you edit Preferences, and WKWebView doesn't reliably deliver cross-window
`storage` events between separate Tauri webviews. Rather than a config-changed broadcast bus (over-kill
here — the two windows are never both visible), the popover re-hydrates on show: its existing `focus`
handler now calls `config-bridge.refreshConfig()`, which re-pulls the durable config from the Rust store
(`get_config`) and — only when it differs — writes localStorage + dispatches `hb:config` (which
`useHBConfig` + the theme listener already consume). No-op without Tauri. So appearance / default host /
hotkey changes made in Preferences are reflected the moment the popover reappears. Unit-tested with a
mocked Tauri bridge (21/21); **the real NSPanel show/hide path needs the real-host smoke test** (can't
be exercised in the dev browser).

**The UI detach (ADR 0011 / E0–E6) is complete, including the optional cleanup pass:**
- The design system was renamed `src/design/` → **`src/ui/`** (wholesale, history-preserving).
- The three monolith views were decomposed into one-component-per-file modules (verbatim
  relocation, verified by line-multiset diff + render): `views/preferences/` (`shared` + `components/`
  + `panes/` + `sheets/`; `PreferencesApp.tsx` is now a 289-line router), `views/onboarding/`
  (`shared` + `components/` + `steps/ManualAdd`; `FlowA.tsx` 598 lines), `views/popover/` (`shared` +
  `components/{Beak,Frame,diagIcon}`; `PopoverApp.tsx` 1093 lines — kept as one cohesive stateful
  component, since splitting its body further needs behaviour-changing hook extraction).
- **Lint is now 0 errors / 0 warnings** — the 7 intentional `exhaustive-deps` omissions are
  documented inline and annotated (no dependency/behaviour change).

The engineering docs were updated for the new structure (design-system paths → `src/ui/`;
`architecture.md`'s config-source fact + its obsolete "transitional globals-shim" section rewritten
to the completed state). **Known doc-debt (not blocking):** `engineering/frontend.md`'s "DRY — one
source of truth" section still illustrates with prototype-era examples (`popover.jsx`, `shared.jsx`,
`prefs.jsx`, `window.OB.BEAM_ERRORS`, `window.HotkeyRecorder`) that predate the detach; it wants a
deliberate rewrite in terms of the current typed `lib/` + `src/components/**` (left as a focused
follow-up rather than piecemeal-patched). ADR 0011 and `refactor-plan.md` are intentionally left as
historical records.

Nothing UI-structural remains. Outstanding app work (needs a real environment): the **real-host beam
smoke test** and the **CSP** (`tauri.conf.json` `csp: null`).

Still outstanding from before (needs a real environment): a **real-host beam smoke test**, the
**CSP** (`tauri.conf.json` `csp: null`), and the optional Rust `commands/` reorg. **Dev tip:**
restart `vite dev` after bulk renames (stale HMR → blank page; prod build stays green).

**Dev tip:** restart `vite dev` after bulk file renames — a stale HMR graph renders a blank page
(the production build stays green); verify renders against the captured baselines after a restart.

## Licensing & the free tier (ADR 0014, Milestone 006 — slice 1 done)

Monetization is decided (ADR 0014): free tier of 5 beams/day (metered 100% locally,
no network for free users), one-time license with 12 months of updates, 3 Macs,
Paddle (merchant of record) + Keygen (license API) + one glue webhook. Slice 1 is
implemented: `src-tauri/src/licensing/` (store `license.json`, tier state machine
free/licensed/grace-30d, beam gate in `beam_blocking`, Keygen client with pure
parsers), commands `license_status`/`license_activate`/`license_deactivate`/`open_url`,
Preferences → License pane, the calm `limit` beam-error card (popover + HUD), and
i18n ×8.

Since then: **the price is decided ($29 one-time, renewal at half price — ADR 0014)**
and the site has the Pricing section (`apps/web/src/components/Pricing.tsx`; Buy
now goes to /buy); **the key moved to the macOS Keychain**
(`licensing/keychain.rs`, `security -i` so it never hits argv/disk; legacy files
migrate on load); and **the glue webhook code is written and tested**
(`apps/license-webhook/` — Cloudflare Worker; its README carries the whole
Paddle/Keygen/Resend account-setup + deploy checklist). **The Keygen Cloud account exists (2026-07-04)**: the account id
(4889da55-f7f4-45dd-9d74-a2c0fec98cd3) is compiled into `licensing/keygen.rs` and set
in `wrangler.toml`; the "Hostbeam License" policy (1y, MAINTAIN_ACCESS, 3 machines,
LICENSE auth, NO_OVERAGE) is 28f0ecd7-d6ab-458f-badf-1e2c7f0640ef. **Live activation is verified end-to-end from the app (2026-07-04)**: activate /
deactivate / same-Mac reactivate against the real Keygen API, key in the Keychain,
free tier resuming with the day's spent counter. **The Paddle sandbox purchase loop is verified end-to-end (2026-07-04)**: the site
has /buy (Paddle.js) and /thanks (polls the worker's /key), and a real test
purchase → key → activation → refund → suspension → revert-to-free ran clean on a
real Mac. The worker's custom domain (license.hostbeam.app) is done, as is the
Resend key email.

**Migrated to the live Paddle account (2026-08-29) without giving up the sandbox
loop.** Losing the ability to test a purchase the day real money starts moving
would be the worst possible time to lose it, so there are now two paths from one
source — see `apps/license-webhook/README.md` ("Two environments") and
`apps/web/README.md` ("Two environments"):

- **worker** — `npx wrangler deploy` → `license.hostbeam.app` with live vars;
  `npx wrangler deploy --env sandbox` → `hostbeam-license-webhook-sandbox` on
  workers.dev with sandbox vars, its own secrets, and its own Keygen policy
  (`bbbfe7a2-…`) so test licenses never consume the production allowance.
- **site** — `apps/web/src/lib/checkout.ts` reads `import.meta.env.PUBLIC_PADDLE_*`
  (template: `apps/web/.env.example`) instead of hard-coded ids, so staging and
  live differ by configuration, not by a commit. It defaults to sandbox with an
  empty token, so a misconfigured build shows the pre-launch notice rather than
  silently opening a live checkout.

Neither app needs a twin: the desktop app talks only to Keygen, and the iOS app
uses Apple IAP with `appstore.ts` trying Apple's production API then sandbox.

Remaining monetization work is **not** the Paddle account — the live catalog,
client-side token and notification destination all exist (ids in the milestone
doc). **Hostbeam went live on 2026-08-29.** The site is deployed
(`hostbeam.app` + `www` from the `hostbeam-web` assets-only Worker,
`npm run deploy:web`), the checkout domain is **approved** (42 minutes, not the
5–7 days quoted), Apple Pay is verified, payouts are configured, and the sandbox loop is back up on its own
worker and Keygen policy.

**The purchase path is verified end to end on live, twice (2026-08-29 and
-08-30).** Checkout → VAT → webhook → Keygen mint → `/thanks` → key email →
activation on Mac *and* iPhone → refund → suspension → reactivation correctly
refused. The second run was priced in **a local currency and paid with a local
payment method**, so the non-USD path is proven too.

Three real bugs surfaced and were fixed in the process, all of the same family —
**a step succeeding loudly while failing quietly**:

- `PADDLE_API_KEY` was never set on the production worker, so the buyer lookup
  403'd and **no licence-key email was sent**. Nothing errored; only an empty
  `metadata.email` recorded it. The swallow now warns and alerts.
- An IPv6 webhook delivery would have been refused as unauthorized and the
  purchase lost after Paddle's retries. Now skipped rather than refused — the
  signature is the real boundary.
- A refunded licence could not be removed from either app; deactivation reported
  "couldn't reach the license server" about a server that had answered 403
  instantly, and left the dead key in place. Fixed on both platforms, shipped in
  0.1.7, verified on a real iPhone.

**Guardrails added** so the next silent failure is not found by a customer:
an immediate alert when a buyer gets no licence email, and a **daily 09:00 UTC
reconciliation** that checks every completed Paddle transaction has a Keygen
licence. The second exists because the first cannot see a webhook that never
arrived. Both mail `support@hostbeam.app`; the channel was verified with a live
send.

**Also shipped 2026-08-30:** a single `CHANGELOG.md` feeding four surfaces (the
site's `/changelog`, the Mac updater's release notes, the About panes' "What's
new" links, and App Store notes via `node scripts/changelog.mjs`); an update
notice in the popover, because a dot on the gear was too quiet to be noticed;
`scripts/find-license.mjs` for "I lost my key" support, with **no customer
database** by design; and the Keygen credential narrowed from an account admin
token to one scoped to the Hostbeam product — the account also hosts an
unrelated product. Desktop is at **0.1.8**, iOS at **1.0.0** on its own
independent version lane.

**Regional pricing is live (2026-08-30)**, silent and code-free: three tiers on
the live price via `unit_price_overrides` — $29 base, ~$19 upper-middle income
and Central/Eastern Europe, ~$14 lower-middle income. Local currency where
Paddle supports it (which unlocks local rails: INR→UPI, BRL→Pix), USD elsewhere — Paddle has no IDR, PHP, NGN, EGP, PKR or BDT, so most of
tier 3 including Indonesia is USD. Tiers are deliberately shallower than
standard PPP because the buyer is a developer, not a median earner. **Override
amounts are in each currency's minor unit and the decimal count is not
guessable — CLP is zero-decimal, COP is not** — so verify any change with
`pricingPreview` per country, in sandbox first. Details and the reasoning:
milestone 006, "Regional pricing".

**Discount policy, decided 2026-08-30:** regional pricing yes (above);
**student discounts no** — at $29 the saving is ~$15 while every verification
path costs more, and Paddle's `usage_limit` is an overall cap rather than
per-customer so a leaked code cannot be contained; **open source yes, as manual
grants** — `node scripts/grant-license.mjs "github.com/x/y"` mints a one-time
checkout link with no code to leak, and the recipient goes through the ordinary
purchase pipeline (verified on live). It uses its own `PADDLE_API_KEY (live
ops)`, deliberately separate from the worker's read-only key.

**Nothing is blocked on code.** What remains needs Apple or real iOS traffic:

- **⚠ Reissue `APPSTORE_*` when the Apple account moves to PunkABeat**
  (D-U-N-S pending). Those secrets are tied to the issuing App Store Connect
  account; after the swap iOS licences stop minting **silently**, the buyer pays
  Apple and receives nothing, and the daily reconciliation cannot see it because
  an App Store purchase has no Paddle transaction. Steps in the worker README
  and milestone 008 — verify with a real sandbox StoreKit purchase, since
  deploying proves nothing when the failure is silent.
- **Extend `reconcile()` to cover App Store purchases** before that traffic
  starts; iOS is currently the one revenue path with no automated guard.
- **App Store submission** — listing content, and the App Store link in the key
  email once `links.ts` has a real Apple ID.
See `docs/process/milestones/006-licensing-and-free-tier.md`.

## Naming, polish, and packaging (2026-07-04, later the same day)

- **Hostbeam is the final name (ADR 0015, supersedes 0004)**: clearance pass done,
  `hostbeam.app` registered (Cloudflare Registrar; `.dev` was also free), the
  About-pane "provisional name" disclaimer removed ×8 locales.
- **Polish fixes**: the popover recovers from a stale limit card when a license is
  activated (or the day rolls over); the Dock/⌘⇥ icon is the real mark in dev
  (runtime `set_dock_icon`) and the icns/dock artwork now has the Apple-grid ~80%
  margins (rebuilt from the 512 master; `icons/icon-dock.png`); Preferences no
  longer flashes white (born hidden → `preferences_ready` after first painted
  frame, 1.5s failsafe); the popover header has a quit (power) button next to the
  gear (`quit_app`; tooltips localized); licensing activation failures + masked
  keys are logged for support (never the full key).
- **Milestone 007 (packaging) is open** — `docs/process/milestones/007-packaging-and-distribution.md`
  is the live tracker. Done: private GitHub repo (the repo
  finally has a remote; push after committing), bundle metadata (macOS 13 floor,
  DeveloperTool category), `scripts/check-version-sync.mjs`,
  `scripts/release-macos.sh` (env-driven sign/notarize/R2 pipeline), R2 bucket
  `hostbeam-releases` behind `download.hostbeam.app`, the updater keypair (owner's
  password manager; public key in tauri.conf.json), **in-app auto-updates**
  (`tauri-plugin-updater`, Rust-side `update_check`/`update_install`, ADR 0014
  update-window gate via `licensing::release_within_window`, real About-pane
  states, i18n ×8), and the site deployed to Cloudflare Pages
  (`hostbeam-web.pages.dev`; direct upload) with a pre-launch guard on `/buy`
  (sandbox checkout only opens on localhost).
- **Deliberately NOT done / waiting**: the `hostbeam.app` custom domain is *not*
  attached to the Pages project (owner chose not to make the site live yet);
  Apple Developer **individual enrollment is pending** (submitted 2026-07-04;
  company conversion later via D-U-N-S, requested in parallel); the first signed
  release + checklist §8 smoke test wait on the certificate; download CTAs still
  anchor `#download` until a real DMG exists; Pages is direct-upload (GitHub CI
  connection deferred deliberately).

## Testing without a remote host (2026-08-30)

`npm run testhost:up` runs a disposable OpenSSH server in Docker and adds
`hostbeam-testhost` to `~/.ssh/config`; `npm run testhost` for status,
`testhost:down` to stop. Publickey-only on port 2222 — not 22 on purpose, since
a non-default port is the case most likely to be got wrong. Reachable from an
iPhone on the same network, so pairing is testable too.

It exists because the beam path needs a real SSH server and the only one to
hand can go away. Details, and why the ssh Include must sit at the top of the
file: [test-host.md](../process/test-host.md). Agents are told to use it rather
than mock `ssh` or ask for a server (AGENTS.md).

## Desktop 0.1.9 + the iOS device session (2026-08-30)

**Shipped 0.1.9**: the pairing QR carried a hardcoded port 22, because the
desktop models no port at all — it beams `ssh <alias>` and lets OpenSSH resolve
one. A host on a non-standard port paired the phone with a port that could not
connect, and failed as *unreachable*, pointing the user at their network. Now
resolved per host by `ssh -G`, the only source that honours `Match`, `Host *`,
`Include`, the system config, and first-obtained-wins precedence. The port is
shown in Hosts and on the pairing sheet.

**The find of the session** was on iOS: the share extension beamed with a key
no host had authorized. Different Keychain access group → `loadOrCreate` minted
a second identity → every share-sheet beam failed on real hardware, on every
device, invisibly to the simulator. Fixed, plus the deeper flaw that a beam path
would create an identity when it could not read one. Full write-up and the
polish batch that followed: milestone 008.

None of the iOS work has shipped — 1.0.0 was never submitted, so all of it
lands in the first App Store submission. Desktop is at **0.1.9**, iOS at
**1.0.0** build 1.

## Paired devices, and the pairing polish (2026-08-30, late)

**ADR 0018**: the Mac remembers the public keys of devices it has authorized,
so host 2..n takes one click instead of fetching the phone. Offered per host,
never automatic — silently granting a phone access to a newly added server is a
decision, not a side effect. The list is visible and removable in Preferences →
Hosts, which is the load-bearing part: which devices can reach your servers must
be answerable in the app, not by reading `authorized_keys` on each host.
Verified end to end on hardware across two test hosts.

The iOS authorize step now **asks the host** rather than assuming: since the Mac
may already have installed the key, it connects first and says "Already
authorized — nothing to do here" instead of demanding a copy-paste that is not
needed. Every failure falls to "needs key" — an unreachable host is not
evidence a key is installed.

Also fixed in the same sitting: adding a host now probes it, so the dot goes
green on its own instead of staying grey until someone presses Test (the mirror
of the stale-red-dot bug earlier the same day — both were the dot reflecting
only explicit gestures rather than what the app knew).

## Authorizing from the host's own row (2026-08-31)

**ADR 0018 amendment.** The one-click Authorize moved out of the pairing sheet
and into the host's own button row, next to Diagnostics and Open Terminal — the
sheet's other content is a QR code, which is not what you came for. Still a
click; adding a host installs nothing.

That raised a question the original decision never had to answer: *which hosts
is the phone already on?* **The Mac asks the host, and asks it for free.** The
reachability probe ran `ssh <target> true` — a no-op down a connection it makes
anyway. It now also greps the same `authorized_keys` line `install_pubkey`
appends to, so one connection answers reachability and authorization together.
Nothing cached, nothing to go stale. The tempting alternative — recording
"installed X on Y" in `config.json` — describes what was true when it was
written, and a rebuilt server would leave a confident green tick over a host
that will reject the next beam.

One trap, caught in `probe_script` and covered by a test: without a trailing
`exit 0` the script inherits the last `grep`'s status, so a **reachable** host
that simply lacks the key reports as unreachable. Verified against two real
`testhost` containers, both states and the install round trip.

A host that does not answer renders as **unknown** — neither the offer nor the
confirmation. Offered inline only when exactly one device is remembered; with
two or more, a single button cannot say whose key it installs, so those still go
through the sheet.

**On iOS** the authorize step now appears only when the host says it does not
already accept the phone, instead of always appearing to announce "nothing to do
here". It reuses the reachability probe (both call the same `verify`, and for
the phone a successful `verify` *is* the authorization answer), bounded at ~4s
because the transport has no connect timeout of its own. Skipping it makes
success silent — the confirmation is the host's dot going green.

**Verified on device 2026-08-31** (iPhone 13 + two `testhost` containers): the
Mac's inline Authorize on a host without the key; the sheet and the row agreeing
afterwards; the phone skipping the authorize step on a host the Mac had already
authorized; the step appearing, via `authRejected`, once the key was stripped;
and the unreachable path against `192.0.2.1`.

Two bugs surfaced by that testing, both now fixed (`ec5eea7`):

- The step **named a cause it had not established**. Any failed probe produced
  "it can't accept a beam until this iPhone's key is on it" — a diagnosis, not
  an observation, which sends someone to `authorized_keys` when the problem is
  the address or the network. `BeamError.authRejected` already drew the
  distinction and the beam path already used it; reachability was discarding it.
  `Reach.fail` now carries `refusedKey`.
- **`.checking` could last forever.** The transport sets no connect timeout, so
  a host that swallows packets left the dot promising an answer it would never
  produce. A 15s watchdog settles it, firing only if that same probe is still in
  flight.

Residual, not chased: the watchdog settles the *dot*, but a hung transport
connection is still hung — the task stays parked until NIO gives up on its own.
It leaks nothing user-visible and nothing has been seen to hang since, so it is
recorded rather than fixed. A connect timeout inside `CitadelTransport` is the
real answer if it ever matters.

Also unfixed by design: `withTaskGroup` cannot bound work that ignores
cancellation, which is why the 4s wait is a poll. Worth remembering before
someone "tidies" it back into a task group.

## Shipped as 0.1.10 (2026-08-31)

Paired devices and authorize-from-the-host-row went out as **Mac 0.1.10** —
released, notarized, tagged, `latest.json` serving it, and `/changelog`
rendering the entry. The FAQ on the site gained one sentence answering the
objection the feature exists for ("is this a chore per host?").

The CHANGELOG edit was checked as purely additive before writing, and 0.1.9's
rendered notes diffed against the published `latest.json` — a shipped entry must
never be edited, because it *is* the release notes users already received.

The iOS halves — the skipped authorize step, the honest unreachable message —
are in the repo but reach users only with the first App Store submission.

---

## Submission material: screenshots complete, video rehearsed (2026-09-02 → 03)

The iOS store set was re-captured against current code and came back
pixel-identical on every store screen, which settled "have the fixes made the
screenshots stale" with a diff rather than a guess. Two images were missing
from the story and were added: a **host detail** stage in the rig (green dot,
passed test, pinned key, all-green diagnostics — seeded, because the demo host
does not exist), and the **Home Screen widget**. The widget could not be placed
the normal way: leaving jiggle mode segfaults the iOS 26.3 simulator's
SpringBoard inside its own ripple animation on this Intel Mac, twice, with the
layout unsaved, and Reduce Motion does not reach it. It is written into
SpringBoard's saved layout (`IconState.plist`) while the simulator is shut
down instead. The default wallpaper renders as striped moire on Intel, so the
shot is on a plain black one, set by hand once — there is no command for
wallpapers. `scripts/ios-screenshots.sh` does the whole set, and its first full
run caught two more ambient-state leaks: the simulator mirrors the Mac
clipboard (the home stage grew a "Beam clipboard image" row), and a
just-installed app carries a blue "new" dot until opened.

The review video was **rehearsed twice** from the simulator against the local
review container, both beams landing, and is now `scripts/ios-demo-video.sh`.
What the rehearsal found: `simctl io recordVideo` drops repeated frames so its
timeline is not wall-clock (40 s of video for 47 s of real time) and cannot be
synced to anything, so both halves come from one ffmpeg display capture;
`screencapture -v` writes nothing if stopped early; the Terminal title bar
exposes the user and machine name; listings wrap at a readable font. The take
is ~35 s and the file shows in the terminal within a second of the Copied card.

Also added to the checklist: Apple lists iPhone apps on Apple Silicon Macs by
default, and Hostbeam already has a real Mac app sold outside the store — the
opt-out is a submission-day step nobody had written down.

Left running deliberately: nothing. The local review host was taken down at
the end of the session; `scripts/reviewhost.sh up` brings it back in seconds.

## The review video, recorded for real (2026-09-03)

Take 3, against a fresh Hetzner box: 48 s, both beams landing, committed as
`docs/marketing/video/app-review-demo.mp4`. The box was destroyed afterwards;
submission day deploys a new one and the notes say so.

The morning started with a mess of my own making: the demo stage's watch
window had survived the session pause (its title tracked the foreground
command, so the close-by-name missed it) and spent the night clearing and
re-listing a container that no longer existed, its scrollback growing every
second. The user came back to a stuck machine. The watch is now titled,
self-ending, scrollback-wiping and killed by pid on the next run; recorders
refuse to double-start and are swept on stop. `pkill -t` silently kills
nothing on this Mac, which is why the first fix also failed.

Two more things the real take found. The stage seeds a fixed host id, so
pointing it at a new machine left a pinned host key that no longer matched —
a red dot that was TOFU doing its job, now cleared on every stage. And
Hetzner listed an ARM type as available and then refused to build it; the
deploy walks the candidates cheapest first. The widget beam takes ~8 s
against 2 for the share sheet (it opens the app and exports the photo first),
so a cut that ends too early shows "Beaming…" forever; the cut step now
writes a tail sheet, and each cut under its own name, because a player left
open on an overwritten file kept showing the old first frame.

## The submission pipeline, and a Control that was never a signing problem (2026-09-04 → 05)

Uploading a build from the terminal now works end to end:
`scripts/release-ios.sh signing | archive | validate | upload`, driven by an
App Store Connect API key resolved from 1Password. Build 2 went up on the
4th, build 3 on the 5th. Every trap it hit is written down in the
[submission checklist](../process/ios-submission-checklist.md) — the
cloud-managed certificate option this account is simply not offered, so the
distribution certificate and profiles are created locally; Homebrew's `rsync`
on `PATH` makes `xcodebuild -exportArchive` fail with a bare "Copy failed";
and a 1Password item whose title has a leading space is only found by
trimming.

The Control ("Beam last screenshot" in Control Centre) had been recorded in
milestone 008 as inert under dev signing, matching forum reports. That was
wrong, and TestFlight build 2 proved it by being just as inert. The cause was
ordinary: `openAppWhenRun = true` makes the system run the intent **in the app
process**, and the intent type existed only in the widget extension, so the
app had nothing to run. Moving it to `Widgets/BeamControlIntent.swift`,
compiled into both targets, fixed it — verified on a dev build and again on
TestFlight build 3. The lesson generalises: an intent a widget or control
opens the app with must be a member of the app target.

## Homebrew, and four Mac releases (2026-09-05 → 07)

`brew install --cask punkabeat/tap/hostbeam` is live. The cask is in a public
tap at `github.com/PunkABeat/homebrew-tap`, bumped by
`scripts/homebrew-bump.sh` from `release-macos.sh` after the R2 upload; the
release doc has the details and the recovery step. It refuses to point the
cask at a DMG that is not being served, or to move the version backwards.
Official homebrew/cask wants notability the project does not have yet, which
is why it is a personal tap.

0.1.13 through 0.1.16 shipped in two days, and the interesting part is what
testing each one found rather than what it carried.

- **The Startup switches had never done anything.** "Launch at login" and
  "Show icon in the menu bar" wrote to config with nothing reading them. They
  work now, along with a new "Show in the Dock and ⌘⇥", and one of the two
  icons always stays on so the app cannot become unreachable.
- **0.1.13 registered the login item as a LaunchAgent**, which System Settings
  files under "Allow in the Background" rather than "Open at Login" where the
  switch says it goes. 0.1.14 moved it to `SMAppService` and removes the old
  plist on first start. Debug builds never touch login items, on purpose.
- **⌘⇥ to Hostbeam did nothing**, because activating an app raises its
  windows and Hostbeam has none — the popover is a non-activating panel.
  `activation.rs` watches for activation and shows it. The launch activation
  is ignored, or a login would throw the popover in your face.
- **The popover's grey box was its own shadow, clipped.** Not an OS shadow:
  the card's blur reached ~22px each side inside a window with 13px of margin,
  so macOS cut it off square. Measured before and after, pixel by pixel. The
  card now uses `--shadow-popover-panel`, tight enough to fade out inside the
  window.

The QR code carries the app icon now. It is level Q rather than the H that
logo codes usually reach for: H is for logos covering a fifth of the area,
this one covers about 6%, and H pays for the unused headroom in smaller
modules. Every configuration was decoded from a real browser render with the
system detector before shipping.

`CHANGELOG.md` also learned that the two apps ship separately. A bare heading
is a Mac release; the iPhone names itself (`## iPhone 1.0 — date`) with its
own version numbers. Nothing that drives a Mac release reads the iPhone lane.
It is dormant — the site looks exactly as it did — and a test fails the day
the first iPhone entry lands, which is the day the checklist says to write it.

## Beaming a file, not just the clipboard (2026-09-07 → 08)

Four ways in now: drop an image on the popover, drop it on the Dock icon,
Finder's Open With, or `open -a`. Images only, up to 50 MB, sent as they are
rather than decoded and re-encoded.

Two things worth knowing before touching it. macOS can hand the app a file
**before the popover's webview exists** — which is exactly what Open With does
on a cold start — so the path is parked in a Rust static and whoever arrives
first drains it, the nudge into a running popover or the popover collecting it
on mount. And the open event arrives before `log::init`, so anything logged in
that arm vanishes; the handoff is logged from `take_pending_open`, which always
runs late enough.

A refused file returns its own error code rather than the generic failure.
That is not tidiness: the generic card blames the connection and would have
marked a perfectly healthy host unreachable for the crime of dropping a text
file on it.

Left running deliberately: nothing. The test host was taken down at the end;
`npm run testhost:up` brings it back.

## 2026-09-08 — the marketing site stopped matching the landing prototype

Moved here from `current-handoff.md` when that file hit its cap; the warning
still lives in four places that are closer to the code
([ADR 0019](../adr/0019-marketing-site-dressed-like-the-app.md),
`docs/design/README.md`, the prototype's own README, and `apps/web/README.md`).

The site was restyled and deliberately no longer matches
`docs/design/hostbeam-handoff/reference/landing/`: no page grid, no mono section
eyebrows, no timing annotations, no iPhone in the hero, one pricing plate, no
gradient CTA. Anyone who finds themselves "restoring fidelity" to the prototype
should read ADR 0019 first — the differences are decisions, not drift.

## Retired from current-handoff.md — 2026-09-09

Moved here to keep that file under its cap, not because it stopped being true.

- **An intent a widget or Control opens the app with must be in the app
  target**, not only the extension: `openAppWhenRun` runs it in the app process.
  Living only in the widget made the Control do nothing, under every signing.
  Cost two TestFlight builds to find. Background in
  [milestone 008](../process/milestones/008-ios-companion.md).

- **macOS hands the app a file before the popover exists**, so an opened path is
  parked in a Rust static and drained by whoever gets there first. Anything
  logged in that run event arm also vanishes, because it fires before
  `log::init`. (Retired from current-handoff.md 2026-09-09 for space.)

## Retired from current-handoff.md — 2026-09-14

Moved here to make room for the update settings (ADR 0022), not because it
stopped being true; it is also in `progress.md` § What is actually blocking.

- **Machine-quality translations** in `src/i18n.ts` and `src-tauri/src/i18n.rs`
  (8 locales) still want a native review — tracked in
  [questions.md](../research/questions.md). The update settings added more of
  them on 2026-09-14.

## The MCP server's release state (moved from current-handoff, 2026-09-19)

Verbatim, because it had become history rather than handoff state:

**The MCP server in `apps/agent/` is published** (2026-09-14, ADR 0021): npm
`@hostbeam/mcp`, mirror `PunkABeat/hostbeam-mcp`, registry `app.hostbeam/mcp`,
all via `scripts/mcp-release.sh`. The prompt hook stays unshipped
([next.md § 5](../process/next.md)); listings wait for [launch-day.md](../process/launch-day.md).

## The Apple account migration, as handed over (moved from current-handoff, 2026-09-20)

Verbatim. The live half — the D&B case and what it blocks — stayed behind;
this is the history it accumulated.

**The Apple account is the PunkABeat organization** (2026-09-15); Team ID `U3C6XC6LHJ` and certificates carried over, the local-law
paperwork is done. **iOS is blocked on a D&B address change**, filed 2026-09-18, quoted at 7–14 business days. Apple will
not change the legal entity address until it lands, so **the Paid Apps
Agreement stays unsigned** (checklist § 1). The EU stays off until a trader
address exists. `asc validate` is at **one** blocking finding, the build a
submission attaches; the review contact went in on 2026-09-19, and TestFlight
now has builds 4 and 5 (everything since 2026-09-05, including the editable
host address and the pairing link).
Everything outstanding is listed once, in
[progress.md § What is actually blocking](../process/progress.md) and the
[submission checklist](../process/ios-submission-checklist.md); reasoning in
milestones [006](../process/milestones/006-licensing-and-free-tier.md) and
[008](../process/milestones/008-ios-companion.md). Two files, one edit.

## The Mac at 0.1.27, as handed over (moved from current-handoff, 2026-09-24)

0.1.27 shipped 2026-09-23: the tray menu carries the work (Beam, Switch host ▸,
Recent ▸ with thumbnails, About, Check for updates…), the icon takes a drop,
⌥-click beams, `hostbeam://` links work behind one Preferences switch
([ADR 0025](../adr/0025-a-url-can-start-a-beam.md)), and About lists every
open-source package inside ([ADR 0026](../adr/0026-open-source-notices-ship-in-every-app.md):
`npm run notices` after any dependency change). The dmg moved to
`scripts/make-dmg.sh` because this Mac refuses Apple events to Finder, from any
shell.

0.1.28 (2026-09-24) fixed a crash 0.1.27 had mid-beam: the beam and the HUD's
thumbnail read `NSPasteboard` from two threads at once (three when a
`hostbeam://` link also opened the popover). Reproduced on a private pasteboard
and in the real one — segfaults and malloc aborts inside AppKit's type cache —
and gone behind one lock. The same day the Raycast extension got its real
author (`PunkABeat`), store screenshots taken against demo data, a Switch and
Beam that waits for the app's config to confirm the switch, and was submitted.


## iOS before review (moved from current-handoff, 2026-10-02)

Until the 2026-09-28 submission the handoff read "iOS is blocked on a D&B address change", filed 2026-09-18, quoted at 7–14
business days. Apple would not move the legal entity address until it landed,
so the Paid Apps Agreement stayed unsigned and the EU stayed off; `asc validate`
was down to one blocking finding, the build a submission attaches. Going free
with no in-app purchase (ADR 0028, 2026-09-27) took D&B off the launch path,
and the app went to review without it. The same pass dropped "CI is out of
Actions minutes until 2026-10-01" (the allowance has reset) and the Mac at
0.1.30 (it is at 0.1.33).

## Launch plan and being found (2026-10-03)

The owner brought a list of 21 launch boards circulating on X and asked for a
launch strategy. It joined the existing plan rather than replacing it: the
Go-To-Market page (rev. 2, 12 Sep, a claude.ai artifact) and
[launch-day.md](../process/launch-day.md). Three things had changed since rev.
2: the upload became a commodity, Hostbeam became free (ADR 0028), and it now
opens the agent's dev server (ADR 0029). An HN search found every 2026 Show HN
about pasting screenshots into a remote agent at 1–3 points.

Decided with the owner: the tagline "Agent on a server? Show it anything. See
what it built." ("server", not "remote", which now also means vendor-cloud
agents); four launch boards (Show HN, Product Hunt, DevHunt, Peerlist) on
separate days, a few permanent listings, the rest skipped with reasons; badges
only when earned by placing; still waiting for Apple, rechecked 2026-10-10, the
launch week one to two weeks after approval; SEO, ASO, LLM search and paid ads
to explore ([questions.md § Being found](../research/questions.md)).

Built and shipped the same day: `/guides` with two guides (every command run
against the test host first), IndexNow, Google Search Console and Bing
Webmaster Tools owned by admin@punkabeat.com with the sitemap in both, and a
record of what Claude Code, Codex, ChatGPT and Perplexity answer before launch
— none names Hostbeam; asked for a Mac app, they name Paste2SSH
([ai-answers](../research/ai-answers/README.md)). The site's Cloudflare account
is still the owner's personal one, which they accepted for now; the iPhone
changelog page is public before approval, also accepted.

What went wrong on the way, all caught before it shipped: the guides' layout
coloured the Download button's text the same blue as the button; the first
AI-answers run leaked twice (`scripts/ai-answers.sh`'s header says how);
Google's HTML-file verification would have hit the asset server's `.html`
redirect, so both engines use meta tags.

## The Raycast review's second pass, and Mac 0.1.34 (2026-10-06)

Raycast's reviewer withdrew the duplicate question (Hostbeam is its own
Store listing) and asked for one fix and two suggestions; all three were
published to [#31483](https://github.com/raycast/extensions/pull/31483), and
the owner replied and marked it ready for review. Greptile's two findings
that day are in [raycast-extension.md § Store review](../process/raycast-extension.md#store-review).
Checking the fixes by hand in `ray develop` turned up two desktop bugs, which
the owner chose to fix first.

**The popover opened on the main display** whatever screen you were on. It
now opens on the screen holding the pointer, read from Quartz in points
(`popover::target_screen`); the beam HUD follows.

**A host that left `~/.ssh/config` moved beams to another host.** The test
host was down that morning, launch dropped its alias from `addedIds`, and
the popover fell back to the first host left — a real server. The owner
decided a missing host is kept and refuses beams
([ADR 0003's amendment](../adr/0003-use-system-openssh-first.md)). Testing it
found a third: a click on the menu-bar icon never sent the popover its
`shown` message, so it re-read nothing, the agent's dev servers included
(ADR 0029 says they are listed when the popover opens).

All three were tried on the owner's Mac with a throwaway build
([pitfalls.md](pitfalls.md) has how), with the test host stopped and
started, and shipped in **0.1.34** the same day (Mac CI green on the release
commit, notarized, Homebrew and the site updated).

What went wrong on the way: staging part of `popover.rs` with
`git apply --cached --unidiff-zero` misplaced a hunk, and testing that commit
with `git stash --keep-index` conflicted on pop. Nothing was lost — the
stash held the whole tree — and the commit was rebuilt from exact file
contents and tested in a worktree instead.

## Search Console's first report, and the zone's Security Insights (2026-10-07)

Search Console wrote that pages were not indexed for two reasons; all fifteen
sitemap pages were indexed. The 404 was `/licenses/lydell/js-tokens`: the
package gives its repository as npm's `owner/repo` shorthand, the notices
generator passed it through, and the page (and the Mac app's list) linked to
it relative. The generator now expands it and refuses a link that is not
absolute (`09d1eb3`; the Mac picks it up in its next release). The five
"Page with redirect" were the site's own links to `/pricing`, `/terms` and so
on, each a 307 to the trailing-slash URL; they link there directly now
(`9528bca`). Plain http also served every page, `/buy` included: the site's
Worker now 301s it to https, since wrangler's token cannot turn on the zone's
"Always Use HTTPS". Deployed, checked live, IndexNow sent. "Validate fix" was
not pressed: it rechecks the same URLs, which still 404 and redirect, as they
should with nothing linking to them.

Cloudflare's Security Insights then listed six findings for hostbeam.app.
security.txt is live (`380848c`); the rest are the owner's clicks or are
declined, each with its reason, in `apps/web/README.md` § Cloudflare. Bot Fight
Mode is the one to never accept ([pitfalls.md](pitfalls.md)). Licence keys go
out by email as `license@hostbeam.app` through Resend, so DMARC stays at
`p=none` until reports show that mail passing.
