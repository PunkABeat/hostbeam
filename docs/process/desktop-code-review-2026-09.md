# Desktop app code review — 2026-09-23 (at 0.1.26)

Scope: `apps/desktop/` only (Rust core in `src-tauri/`, React/TS in `src/`). Every
Rust source file was read in full; every frontend file was read in full by a
review agent and the decision-driving findings were re-verified by hand. Tauri v2
guidance was researched against the official docs (v2.tauri.app) as of this date.

Gates as found: `cargo clippy --all-targets -- -D warnings` clean; `cargo test`
188 pass; `cargo fmt --check` **fails** (`beam.rs:419`, `config.rs:293`);
`npm run typecheck` clean; `npm run lint` 0 errors / 1 warning
(`HotkeyRecorder.tsx:47` missing dep); `npm run test` 82 pass. No CI workflow, no
pre-commit hook, no `cargo audit`/`cargo deny`.

## Verdict

The core is in good shape where it matters most: the SSH/scp path is
argument-array only, every remote script single-quotes its inputs, inputs are
allow-listed and adversarially tested, errors are typed and mapped to UI codes in
one place, the licence key lives in the Keychain, the CSP is set, and the
services/config/i18n modules are pure and well tested. The comments explain *why*
unusually well.

The weaknesses are structural, and they compound: a 1.9k-line `lib.rs` and a
1.9k-line `PopoverApp.tsx` that each own five concerns; an untyped
Rust→JS channel made of `window.eval("window.hbX && window.hbX(...)")` strings
with "parked" mailbox commands to paper over its lossiness; config state that is
copied per window and written whole on every keystroke; thumbnails stored inside
that config (710 KB on this Mac, 99% base64) so it is re-parsed by Rust on every
hotkey press; platform code that is `#[cfg]`-gated in name only (the crate cannot
build off macOS); and engineering guides that describe a codebase that no longer
exists. Three shipped bugs were found along the way (below).

## A. Bugs found (fix first)

| # | Where | What |
|---|---|---|
| A1 | `src/views/preferences/sheets/DiagnosticsSheet.tsx:74`, `sheets/AddHostSheet.tsx:46`, `views/preferences/shared.ts:7` | Preferences → Diagnostics and Add host → Test connection call `OB_MOCK.runDiagnostics`/`testHost` (`lib/hosts.ts:150-203`) with **no Tauri branch**. In the shipped app they show invented results ("ssh-agent · ed25519", random 28–98 ms latency, regex reachability). The popover's diagnostics use the real `diagnose` command. |
| A2 | `src/lib/config.ts:13-33`, `views/preferences/PreferencesApp.tsx:386` | `HB.DEFAULTS` contains prototype seed data (`addedIds: ["prod","stg","dev"]`, two `r-seed-*` Recent rows). "Reset to defaults" writes them into `config.json`; the seeded rows render as "prod-box · 6m ago". |
| A3 | `src/components/HotkeyRecorder.tsx:41` | Uses `e.key`; with Shift held the 7 key reports `"&"` (layout-dependent), so a recorded `⌘⇧7` becomes `Cmd+Shift+&`. The default works only because it is never recorded. Use `e.code` (`Digit7`→`7`, `KeyA`→`A`) and add a mapping test. Verify on the device. |
| A4 | `src-tauri/src/beam.rs:419`, `config.rs:293` | `cargo fmt --check` fails; the documented gate is red on main. |
| A5 | `src/lib/config.ts:125-144`, `src/config-bridge.ts:117-131,189-190`, `main.tsx:71-77` | Cross-window lost update: each window keeps its own `useState` copy, saves whole-config, relies on `storage` events WKWebView does not deliver, and the popover panel never gets `focus` so the fallback refresh never runs. A Preferences edit followed by any popover write (probe result, beam, `lastVersion`) is overwritten with stale state. |

## B. Architecture and structure

### B1. `lib.rs` is a god module (1,933 lines)
Bootstrap, NSPanel setup, popover/HUD positioning, the whole HUD relay, tray menu
construction with a thumbnail cache, `hostbeam://` parsing, three parked
mailboxes, feedback mailto, and ~20 commands. `docs/engineering/rust.md` names the
target (`commands/`, `window.rs`, `state.rs`) and the refactor plan explicitly
deferred it. Suggested split, behaviour-preserving:

```
src/
  lib.rs            builder + setup only (~150 lines)
  commands/         thin handlers: beam.rs, window.rs, settings.rs, license.rs, updates.rs, logs.rs
  window/           popover.rs (panel, position), hud.rs (relay, generation), preferences.rs
  tray/             menu.rs (host_entries, recent_entries, icons), icon.rs (animation)
  url_scheme.rs     UrlAsk + parked asks
  state.rs          AppState (see B3)
  platform/         see D
```

### B2. The Rust→webview channel is a string protocol
13 `window.eval` sites drive 11 `window.hb*` / `hudUpdate` globals (`lib.rs`,
`auto_beam.rs:578,618`, `dock_menu.rs:1521`). The frontend installs the handlers
in component effects with no dependency array (`PopoverApp.tsx:330-406`,
`AboutPane.tsx:76-89`), so they are torn down and recreated per render and exist
only while that view is mounted; the `&&` guard drops the call silently. Four
mailbox commands (`take_url_beam`, `take_url_host`, `take_pending_open`,
`take_update_check`) exist to recover from that. The declared type is already
stale (`types/window.d.ts:58-64` lacks the `partial` phase and `sent/total`).
Arguments are JSON-encoded, so this is not an injection problem; it is a
maintainability and correctness one.

The code's justification (a hidden panel's webview is suspended, so events and
callbacks do not run) is real on macOS. Official guidance: `Emitter::emit_to` /
`listen` is the mechanism for Rust→frontend messages; `eval` is for JS strings.
Tauri ≥2.3 exposes `backgroundThrottling: "disabled"` per window (macOS 14+ only).
Whether events emitted to a suspended webview are queued is **not documented**;
it needs a 30-minute spike with the panel hidden.

Recommendation, regardless of transport:
- one module each side: `src-tauri/src/ui_bridge.rs` with `enum UiMessage { Beam, SetHost(String), Progress{sent,total}, Hud(HudState), … }` and one `send(app, target, UiMessage)`; `src/lib/rust-bridge.ts` with the matching discriminated union, registered **once at module scope**, dispatching into hooks/reducers. Keep `eval` as the transport only if the spike shows events are dropped; otherwise use `emit_to` + `listen` and set `backgroundThrottling: "disabled"` on the popover.
- consider `tauri-specta` (2.0.0-rc.25, pin exactly) to generate the TS types for commands and events; otherwise a hand-written pair with a round-trip test.

### B3. Module-level statics instead of managed state
20 statics (`PARKED_*`, `PENDING_OPEN`, `PENDING_UPDATE_CHECK`, `HUD_GEN`,
`RECENT_ICONS`, `PENDING_RETRY`, `RETRY_SEQ`, `UPDATE_CACHE`, `STAGED`,
`TRANSFERS`, `LAST`, three `APP`, `LAUNCHED`, `NEXT_REVALIDATE`, `LOG_DIR`, …).
Tests already race on them (`beam.rs:1479-1481` says so). Fold them into one
`AppState` registered with `app.manage` (the official pattern), with the pure
decision functions kept as they are.

### B4. Frontend monoliths
- `PopoverApp.tsx` (1,864 lines): 25 state hooks, the beam state machine spread over `landed` (:436-492), `upload` (:497-586), three effects, six Rust callbacks, file-open, drag-drop, 84 inline style objects. Extract `lib/beam-machine.ts` (pure reducer: `START/LANDED/FAILED/REFUSED/SETTLE/HOST_CHANGED`), `useBeam(host)`, `useClipboard`, `useLicenseStatus`, `usePopoverShown`; components `ClipboardCard`, `BeamProgress`, `DoneCard`, `FailedCard`, `RecentList`, `IncomingList`, `HostFooter`, `DropOverlay`. The reducer is the first testable form of the most important logic in the app.
- `PreferencesApp.tsx` (434) owns host CRUD, probe concurrency, device authorisation and threads 29 props into `HostsPane.tsx` (968), whose `detailFor` is a 320-line render function. Extract `useHostManager`, `useReachability`, `useHostStorage`; `HostDetail`, `HostRow`, `ConnectionStatus`.
- `FlowA.tsx:441-597` (onboarding step 3) is unreachable in production (`onDone` is always passed) and ships hardcoded demo data.

### B5. No IPC client module
46 distinct `invoke("…")` strings across 18 files; result shapes declared inline and `as`-cast at call sites; two identical `tauriCore()` helpers; beam error codes re-listed apart from `BEAM_ERRORS`. `lib/license.ts` is the right shape but covers four commands. Add `lib/ipc.ts`: `isTauri()`, one `invoke<T>`, one typed function per command, dev mocks behind the same functions so views never branch on `core ?` (this is also what makes A1 impossible to reintroduce).

### B6. Duplicated logic (one home each, in `lib/`)
Manual-host slug (`FlowA.tsx:94-105` ≡ `PreferencesApp.tsx:148-158`); alias-vs-`user@address` target (5 sites); sentence substitution (`PopoverApp.tsx:684` ≡ `RecentPane.tsx:26`, and Rust `render_sentence`); folder normalisation ×5; test-result badge ×4; thumbnail-with-zoom ×3; `DiagRow` declared three times; copied-feedback timer ×4 → `useCopied()`; arm-then-confirm ×2 → `useArmedConfirm()`; `stamp()` defined in both `beam.rs` and `pull.rs`.

### B7. Remaining `Result<T, String>` commands
12 sites (`config.rs`, `hotkeys.rs`, `open_preferences`, `copy_share_link`) bypass `CommandError`. Low effort to unify once `commands/` exists.

## C. Performance

### C1. Thumbnails live in the config, so the config is the hot path
`~/Library/Application Support/com.hostbeam.app/config.json` is **710 KB, 24 Recent rows, 701 KB of base64 thumbnails**. Consequences:
- Rust `config::read` (`config.rs:608`) reads and fully deserialises it on every call: `trigger_shortcut` on the hotkey, `gate`/`send` inside the beam (so **three parses per beam**), `tray_menu` rebuilds, `i18n::locale` (called per translation site), the auto-beam tick, every Dock right-click, and `startup::apply` after every `set_config`.
- The webview serialises the whole object to Rust **per keystroke** in the sentence and folder editors (`SentenceEditor.tsx:91`, `GeneralPane.tsx:190`, acknowledged at `config-bridge.ts:93-95`), and Rust rewrites it pretty-printed each time.
- `HB.allHosts()` → `HB.load()` → `JSON.parse` of the same blob on **every render** of `PopoverApp` (`PopoverApp.tsx:33`).
- The 5 MB localStorage quota crash in the handoff notes was this same design.

Fix: move thumbnails to a Rust-owned cache directory keyed by recent id, serve them through the `asset:` protocol (already allowed by the CSP `img-src`) via `convertFileSrc`, keep only the path in config. Config drops to a few KB. Then cache the parsed `Config` in managed state and invalidate it in `set_config`; debounce text-field writes (or write on blur); derive host pools from `cfg` with `useMemo`.

### C2. Keychain read per licence check
`licensing::load` (`licensing/mod.rs:166-185`) spawns `security find-generic-password` whenever a licence exists. It runs on `check_beam_allowed` and `record_beam` (two process spawns per beam) and on every `license_status` poll. Cache the key in memory after the first read; re-read only on activate/deactivate.

### C3. Smaller items
`hud.tsx:47-62` fetches `clipboard_preview` twice per beam; `AboutPane.tsx:118-140` defines a component inside render (remounts five links per state change); `t()` builds a `RegExp` per variable per call (`i18n.ts:150-156`); all eight locale dictionaries (3,138 lines) ship in every bundle including the HUD.

## D. Cross-platform readiness (Windows / Linux later)

Today the crate **does not compile off macOS**: `tauri-nspanel`, `objc`,
`dispatch2` and the `libc::access` call are unconditional dependencies and
`lib.rs` imports them at the top level; the 24 `#[cfg(target_os = "macos")]`
sites in 8 files have stub fallbacks that are never reachable. The frontend bakes
macOS in at the token level: `toAccelerator` emits `Cmd` not `CmdOrCtrl`
(`config-bridge.ts:15-16`), `Keycap.tsx:46-67` hardcodes ⌘⇧⌥⌃, `lib/hosts.ts:106-115`
is a macOS-only shortcut-conflict table, `Frame.tsx:59,66` hardcodes the 340 px
card that must match `WRAP_PAD_X` in Rust.

What the port will need (from the official docs):
- Linux tray does **not** emit click events, so a click-to-open popover is macOS/Windows only; Linux needs a menu item. Global shortcuts do not work on Wayland. Deep links arrive as CLI args on Windows/Linux and need `tauri-plugin-single-instance` registered first. `skipTaskbar`, `shadow`, `visibleOnAllWorkspaces` differ per OS.
- The portable popover pattern is an undecorated always-on-top window + `tauri-plugin-positioner` (`TrayBottomCenter`) + hide on `WindowEvent::Focused(false)` with a short debounce after a tray click. `tauri-nspanel` has no cross-platform equivalent.

Recommendation, in order:
1. `platform/` module with small traits (`Popover` show/hide/position, `ClipboardWatch` change-count/has-image, `LoginItem`, `DockPresence`, `DropTarget`, `ShareSheet`, `MainThread::run`) and `platform/macos.rs` holding **all** `unsafe` and objc code; `[target.'cfg(target_os = "macos")'.dependencies]` for nspanel/objc/dispatch2.
2. Add `cargo check --target x86_64-unknown-linux-gnu` (or `x86_64-pc-windows-msvc`) to the gate so the boundary cannot rot. Expect the first run to take a day of fixes.
3. Frontend `lib/platform.ts`: primary-modifier token, glyph map, system-shortcut table, popover metrics, wording keys; consumed by `Keycap` (via prop), the recorder, `toAccelerator`, the frames.
4. Move to `objc2` framework crates; `tauri-nspanel 2.1.0` is on crates.io (2026-09-19) on `objc2 0.6`. Today `Cargo.toml` tracks `branch = "v2"` of a git repo (the lock pins a rev, but any `cargo update` moves it), and the deprecated `objc`/`cocoa` crates are used directly in six files with 31 `unsafe` blocks and inconsistent `// SAFETY:` comments.

## E. Security

Solid overall. Findings, all hardening rather than exploitable today:
- **`opener:default` is granted (`capabilities/default.json`) and `tauri-plugin-opener` is registered, but the frontend never calls it** (Rust shells out to `open` with its own https/mailto/Terminal guards). Remove both; the permission lets any script in the webview open URLs/paths.
- `withGlobalTauri: true` while the code also imports `@tauri-apps/api` in places. Set it false and import the API everywhere (one XSS then has no ready-made handle to every command).
- `valid_folder` (`services/ssh.rs:58`) permits `;`, `$(`, backticks and relies on every remote script quoting correctly (tested, but a single unquoted interpolation would be RCE on the user's own host). Tighten to an allow-list such as `[A-Za-z0-9._/@+-]`.
- `open_preferences` (`lib.rs:764`) interpolates `tab` into `window.location.hash = '{t}'` after an ASCII-lowercase filter; safe, but route it through `serde_json::to_string` like `switch_host` does so the rule is uniform.
- One capability file for all three windows. Give the HUD its own with nothing but `core:default`.
- Supply chain: no `cargo audit`/`cargo deny`; git dependency by branch (above). Tauri's lifecycle guidance is hash-pinned git or crates.io only.
- No CI at all: signing, notarisation and the gates run from one machine's shell.

## F. Maintainability for agents

- **The required reading is wrong.** `docs/engineering/*.md` contains 38 references to code that was deleted (`shared.jsx`, `design/*.jsx`, the globals shim, `checkJs` migration, "no linter or test runner", `csp: null`, "beam.rs 491 lines"). `eslint.config.js:38-45`, `tsconfig.json:19-21` and `vitest.config.ts` carry comments about the same vanished files. An agent that obeys AGENTS.md will read these first and look for files that do not exist. Rewrite `architecture.md`, `frontend.md`, `rust.md` against the current tree (they can be shorter), and delete the dead lint block.
- Add `no-restricted-imports` rules so the layering is enforced, not described: `views/**` may not import `config-bridge`; `lib/**` may not import `views/**`.
- Tests are the executable spec for pure logic (188 + 82) and that is the strongest asset here. The gaps are the orchestration: no fake `ssh`/`scp` runner for `beam_blocking`/`send` (a `ProcessRunner` trait or a stub binary on `PATH`), no frontend test for the beam state machine, `setupConfigBridge` hydration, the localStorage quota fallback, host ordering, or the recorder mapping.
- The bespoke logger (`log.rs`) works, but adopting the `log` facade (or `tauri-plugin-log`) would capture the updater and plugin logs that support cases need, for free.
- `docs/agents/current-handoff.md` and the 90-line cap are good practice; keep it.

## G. Recommended order of work

Status 2026-09-23: Phase 0 landed in `f132180`; Phase 1 in `5d9ca67`, `c00c859`
and `798b430`; 0.1.27 shipped with them. Phase 2's structural work landed the
same day (`lib.rs` split, the popover and Preferences decomposed, helpers
consolidated) along with Phase 4's guide rewrite, then the quick tail: B7,
the `valid_folder` deny-list, the encoded Preferences tab, the HUD's own
capability, the layering rule as an ESLint error, the About links hoisted,
the unreachable onboarding step removed, then B3 (the statics are managed
state) and `tests/fake_ssh.rs` (a stub `ssh`/`scp` on `PATH` for the
orchestration that needs no `AppHandle`) and `lib/beam-state.ts` (the beam
as a tested reducer under `useBeam`), and the i18n tidy-up (one `t`, no
`window.t`, no `RegExp` per variable, the last literals keyed in all eight
locales), and screen tests for the popover and Preferences (`test/screen.tsx`).
Then the dictionaries became one chunk per language (§C3; the shared chunk
went from 341 KB to 202 KB), and `log.rs` became the `log` facade's logger,
so the updater's own lines reach the support log (§F). Every item outside
Phase 3 is closed; Phase 3 waits for a Windows or Linux decision, written up
as [milestone 009](milestones/009-windows-and-linux.md) (2026-09-26).

**Phase 0 — bugs and gates (days).** A1–A5; remove the opener plugin/permission; `withGlobalTauri: false`; pin `tauri-nspanel` to `=2.1.0` from crates.io (or `rev =`); add `.github/workflows/ci.yml` running fmt, clippy `-D warnings`, `cargo test`, `cargo audit`, `cargo deny` (`unknown-git = "deny"`), `npm run typecheck && lint && test && format:check && build`.

**Phase 1 — the boundaries (1–2 weeks).** `lib/ipc.ts` + `commands/` split (B5, B1 part 1); the typed UI bridge on both sides after the events spike (B2); `set_config` emits a change event to the other window and `update()` patches on fresh state (A5); thumbnails out of config + cached `Config` in managed state (C1); keychain cache (C2).

**Phase 2 — the monoliths (2–3 weeks, one PR each).** `lib.rs` split and `AppState` (B1, B3); beam reducer + `PopoverApp` decomposition (B4); Preferences/Hosts hooks (B4); dedupe into `lib/` (B6); `Result<_, String>` cleanup (B7); tests for each extracted piece (F).

**Phase 3 — portability (when Windows/Linux is scheduled, ~2 weeks before any UI work).** `platform/` traits + target-specific deps + cross-target `cargo check` in CI (D1–D2); `lib/platform.ts` (D3); objc2 migration (D4); positioner + focus-hide popover, single-instance + deep-link plugins.

**Phase 4 — docs for the next agent (1–2 days, can run anytime).** Rewrite the engineering guides to the current tree, add an `ARCHITECTURE.md` with the data flow diagram (the one in `architecture.md` is still right), layering lint rules, and a short "how to add a command / an event / a platform behaviour" recipe.

## H. Keep these

Argument-array process execution and allow-listed inputs with adversarial tests
(`services/ssh.rs`, `beam.rs::slug`, `pull.rs::safe_name`); every remote script
single-quoted and built from one `artifact_match()`; typed `Error` with a single
`to_code()`; the folder-ownership test and `700` mode; the retry token design;
the licence store with the key in the Keychain and grace semantics that fail
open; `auto_beam.rs`'s pure `step()` and its privacy argument; `updates.rs`'s
quiet-moment logic with a logged blocker; `BEAM_ERRORS` as one taxonomy; the
accessibility work in the popover and sheets; the localStorage quota fallback;
and the habit of explaining *why* in comments and test names.
