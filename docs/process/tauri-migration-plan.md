# Tauri Migration Plan

Migrating Hostbeam from Flutter to a Tauri v2 WebView shell (see ADR 0010, which
advances ADR 0009). This is the working plan; live status stays in
`progress.md`.

## Branch & archive strategy

- `archive/flutter-app` + tag `flutter-final` — the final Flutter implementation
  (snapshot of `milestone-005-popover-fidelity`). Preserved, not deleted.
- `main` — stays on Flutter (the working app) until the Tauri app reaches parity.
- `migrate/tauri` — the migration line (seeded from `spike/tauri-popover`). When
  M-T1..M-T3 land and parity is verified, it becomes `main`; the Flutter tree is
  removed from the main line then (still recoverable from the archive branch/tag).

## Spike → production starting point

The spike (`tauri-spike/`) proves feasibility but is prototype-grade: it vendors
the design's `_ds_bundle.js`, loads React from a CDN, patches a load-order bug,
seeds mock data via `localStorage`, and has no persistence, onboarding,
preferences, tests, or packaging. M-T1 replaces that scaffold with a real build.

## Phases

### M-T1 — Cut-over + clean scaffold
- Promote the Tauri app to repo root (replacing the Flutter tree on `migrate/tauri`).
- Rebuild the frontend as **Vite + React + TypeScript** consuming the design's
  `components/*.jsx` + tokens; drop `_ds_bundle.js`, CDN React, and runtime Babel.
- Keep the proven Rust pieces (nspanel popover, tray, hotkey, beam) from the spike.
- Establish verification gates: `cargo fmt --check`, `cargo clippy -D warnings`,
  `cargo test`, `tsc --noEmit`, `vite build`, `tauri build`.

### M-T2 — Backend parity (Rust)
- Host discovery: port `ssh_config_parser` **including `Include` file resolution**
  (`file_ssh_config_host_source`); reuse the Dart test fixtures.
- Settings store: JSON persistence of `addedHosts`, `defaultHost`, `setupCompleted`,
  `hotkeyConfirmed`, `historyEnabled`, `remoteFolder`.
- History store: JSON persistence of upload history entries.
- Error taxonomy: port `beam_error` classification + diagnostics text.
- Notifications via `tauri-plugin-notification`.
- Unit/integration tests for each (mirroring the 27 Dart tests).

### M-T3 — Frontend parity
- Wire the popover fully to the backend (settings, history/recent, diagnostics).
- First-run / onboarding from the design's `prototypes/onboarding/*`.
- Preferences from the design's `prototypes/preferences/prefs.jsx`.
- Reconcile the default hotkey (Flutter used `⌃⌥⌘U`; design/spike use `⌘⇧7`).

### M-T4 — Native polish
- Anchor the panel under the tray-icon rect (spike uses top-right).
- `window-vibrancy` blur for the popover material.
- Suppress the keyboard-focus ring on the header gear when opened.

### M-T5 — Packaging (ADR 0008)
- Tauri bundler: Developer ID signing, Hardened Runtime, notarization.
- No App Sandbox; confirm OpenSSH shelling + global shortcut work under Hardened
  Runtime.
- Update/distribution channel.

## Status

- M-T1 done (commit `8a2f74e`): Vite+React+TS app at root, design from source, Rust promoted, Flutter removed.
- M-T2 done (commits `205a92b`, `4ee9297`): Include-aware SSH config, error taxonomy, durable config store, notifications, backend tests (10 green).
- M-T3a done (`afba705`): frontend config persists via the Rust store (durable settings + recent history).
- M-T3b done (`116634f`): preferences window (design `prefs.jsx`) opens from the popover gear; Vite multi-page.
- M-T3c done (`aad4855`): first-run onboarding (design Flow A, popover-native) drives host selection, then hands off to the popover.
- M-T4 done (`131b409`, `625f14b`): tray-anchored popover + on-open focus-ring fix; real `diagnose` command replaces the mock. (Vibrancy deferred — the design popover surface is opaque, so native blur adds little.)
- M-T3/M-T4 complete. Next: M-T5 packaging (needs the user's Developer ID for signing + notarization).

## Dev affordances

- **Tray right-click menu** (`src-tauri/src/lib.rs`): Open Hostbeam · Preferences… ·
  Restart onboarding · Quit. Left-click still toggles the popover
  (`show_menu_on_left_click(false)`).
- **Restart onboarding** is a temporary debug action: it wipes the persisted
  config (`config::clear`) + the popover's `localStorage` and reloads the webview
  so first-run onboarding runs again. Remove (or replace with a Preferences
  "Re-run setup" action) once onboarding can be re-triggered another way.

## Notes / decisions

- **Host status dots are neutral ("not checked") until probed.** `list_hosts`
  does not probe reachability up front (that would open an SSH connection per host
  on every open), so unprobed hosts show a neutral `unknown` dot rather than a
  misleading green — in the onboarding list, the BEAM TO dropdown, and Preferences.
  The dot becomes meaningful where the user tests: the onboarding **Test the
  connection** (step 2) and manual-add now call a real `test_host` Rust command
  (SSH reachability), and the host dot reflects it (unknown → pending →
  online/offline). The diagnostics command gives the deeper check.

- **Preferences › Hosts probes reachability on open + on demand.** The added-host
  row dot now reflects the last `test_host` result (`tests[id]`): grey `unknown`
  → `pending` (amber pulse) → `online` (green) / `offline` (calm grey). On
  Preferences open, every added host is probed in parallel but **bounded to 6
  concurrent** ssh checks (so a long host list doesn't spawn dozens at once) and
  **non-blocking** — each ssh runs in `spawn_blocking`, dots update as results
  land. Each row shows a **"Checked … ago"** stamp (`testedAt[id]`, via
  `relTime`, refreshed by a 30s ticker) so you can see how fresh a dot is; it
  also appears under the drawer's Connection row. A **Check all** action in the
  "In Hostbeam" header re-probes on demand (shows a "Checking…" spinner). `runTest` invokes the real `test_host` in the
  app (ssh alias for config hosts, `user@address` for manual), falling back to
  the mock in browser-dev. Probing stays proportional to use — we still don't
  probe in `list_hosts` or mass-probe on every popover open.

- **Popover dots: probe the target + last-known.** Reachability is persisted in
  the shared config (`cfg.reach[id] = { ok, at }`), written by beams (success →
  online, timeout → offline; auth/perm mean the host answered) and by every
  Preferences probe (`runTest`). The popover reads it for all host dots (grey
  `unknown` only if never checked) and, on open/focus, probes **just the
  beam-target (default) host** (one `test_host`, de-duped within 6s) so the host
  you're about to beam to is fresh — without mass-probing the whole list every
  time the menu-bar popover opens. Cross-window propagation rides the existing
  `useHBConfig` `storage`/`hb:config` events; Preferences dots also fall back to
  `reach` before this session's probe lands.

- **Keyboard operability.** All interactive elements are real `<button>`/`<a>`
  (the onboarding host rows were `<div onClick>` → now buttons), so they're
  Tab-reachable and Enter/Space-activatable; the `HostSelect` dropdown handles
  Arrow/Enter/Escape; both windows have `:focus-visible` rings. On every show (and
  every onboarding step), `focusPrimary()` lands focus on the surface's primary
  action — `[data-autofocus]` (filter/first field, and the "Almost done" step's
  Test button) → `[data-primary]` (beam / Get started / Start using Hostbeam) →
  first host row → first field — skipping disabled/non-focusable. So the whole flow runs from the keyboard (e.g.
  `⌘⇧7 → Enter → Enter → Enter` completes onboarding), and `:focus-visible` keeps
  rings to keyboard nav. The onboarding host list is a `role="listbox"` with
  roving tabindex: Tab enters/exits it as a single stop, ↑/↓ (and Home/End)
  navigate hosts, Shift+Tab returns to the filter, Enter selects.

- **SSH commands run off the main thread.** Synchronous Tauri commands execute
  on the main (UI) thread, so a blocking `ssh`/`scp` (up to the 5s connect
  timeout) froze the webview — the spinner/beachball appeared late. `list_hosts`,
  `beam`, `diagnose`, and `test_host` are now `async` and do their blocking work
  in `tauri::async_runtime::spawn_blocking`, so the UI stays responsive and the
  "testing"/"beaming" state shows immediately.

- **Failed connection test is non-blocking.** A failed test on the onboarding
  "Almost done" step shows the failure + Retry but does not disable finishing —
  the primary button relabels to "Start anyway" (mirrors the design's "Add
  anyway"). Tests are optional (Skip is allowed) and failures are often transient
  or false negatives (VPN down, host asleep, passphrase key not in agent).

- **The global shortcut beams (it doesn't just toggle).** Pressing the hotkey
  used to only show/hide the popover. Now Rust's `trigger_shortcut` reads the
  config: when **"Beam immediately"** (`settings.immediate`, default on) is set
  **and** a default host exists, it fires a **silent** beam — it `eval`s the
  webview's `window.hbBeam`, which re-reads the clipboard and beams in the
  background (no popover flash; success shows only the existing notification +
  paste-ready clipboard text). The popover surfaces only on failure or when
  there's nothing to beam (`show_popover`). With `immediate` off (or no default),
  the shortcut falls back to toggling the popover so the user can pick/confirm.
  The old in-popover keydown listener was removed (the global shortcut owns
  beaming; Enter on the focused primary button still works); a silent beam resets
  the popover to idle afterward so the next open is fresh. Pressing the shortcut
  again **while a beam is in flight** doesn't start a second concurrent beam
  (which would duplicate the upload/notification/Recent entry) — instead it
  reveals the in-progress popover (`show_popover`) and lets that beam rest on its
  result; `upload` also guards on `phase` as a backstop. A General preference,
  **"Show the popover while beaming"** (`settings.showOnBeam`, default off), flips
  the immediate path from silent to a visible beam — `hbBeam` reads it fresh,
  calls `show_popover`, and rests on the "done" card (progress + result) instead
  of resetting.

- **Global shortcut is configurable.** Rust registers a default
  (`CmdOrCtrl+Shift+7`) at startup and exposes `set_hotkey(accelerator)` which
  re-registers (unregister-all → register, with a default fallback so a hotkey is
  never lost). `config-bridge` converts the design's token array
  (`["cmd","shift","7"]`) to a Tauri accelerator, exposes `window.applyHotkey`,
  and applies the configured hotkey on boot. Both the Preferences recorder and a
  new recorder on the onboarding "Almost done" step (shared `window.HotkeyRecorder`)
  persist `config.hotkey` and call `applyHotkey` to re-register live.

- **Preferences window uses the Overlay title bar (no nested chrome).** The
  design's `prefs.jsx` renders a full macOS settings *window* mockup — rounded
  card, drop shadow, and faux traffic lights drawn over the sidebar. Inside the
  real Tauri window's native title bar that produced a window-in-window. Fix:
  the preferences window now uses `TitleBarStyle::Overlay` + `hidden_title` so
  the *real* traffic lights float over the sidebar (where the design drew the
  fake ones), and the design card was stripped of its own frame (fixed
  720×552 → `100% × 100vh`, no border-radius/shadow, faux lights removed) so it
  fills the window. The reserved 38px header strips (sidebar + content) are
  `data-tauri-drag-region` so the window stays draggable.

- **One shared host-picker (onboarding + Preferences).** `window.HostPickerList`
  (in `shared.jsx`) is the browse-and-pick host list: a filter field (shown once
  the pool exceeds 6) over a scrollable, keyboard-navigable listbox (roving
  tabindex, ↑/↓/Home/End, Tab/Shift+Tab in and out). Onboarding's "Choose a host"
  step and Preferences' "Add a host" section both render it, so they stay
  consistent. Props tune the per-context differences: `actionIcon`
  (`chevron-right` to navigate in onboarding, `plus` to add in Preferences),
  `autoFocus` (onboarding lands focus here; Preferences does not steal it),
  `showUser`, and `emptyText`. This replaced Preferences' old type-ahead combobox
  (`HostSearch`, removed). The component supports two row behaviours: `onPick`
  (click acts immediately — onboarding picks a host and advances) or
  `renderExpanded` (click toggles an inline drawer — the same disclosure gesture
  as the added-host list). Preferences uses `renderExpanded` so a picker row
  expands to a small **PickerAddPanel** (remote folder + Test + "Add to
  Hostbeam") — adding is deliberate and consistent with how added hosts expand,
  rather than a single click silently moving the host into the list.

- **Host details expand inline (Preferences › Hosts).** The per-host details
  (name, address, last beamed, remote folder, connection test, set-default /
  diagnostics / terminal) previously rendered in a single block at the bottom of
  the pane — far from the row you clicked once a few hosts were added. Now each
  added-host row is a disclosure: clicking it expands a details drawer directly
  beneath that row (accordion — one open at a time; chevron rotates; row
  highlights). The reorder ▲▼ and remove − controls stay on the row header. The
  bottom details block is gone.

- **The popover reflects the real clipboard.** The prototype hard-coded a
  "Screenshot on clipboard · PNG · 2560 × 1440 · Ready" card. A new
  `clipboard_image` Rust command (arboard) reports whether an image is on the
  clipboard, its dimensions, **and a small PNG preview** (downscaled to a ≤160px
  `data:` URL via the `image` crate + base64) which the card shows as a real
  thumbnail; the popover drives the card from it: real
  `W × H`, a **disabled** Beam button + "No screenshot on clipboard" empty state
  when there's nothing to send, and a brief "Checking clipboard…" while probing.
  It re-checks on open, on window focus, and on return to idle (after a beam the
  clipboard holds the paste-ready text, not an image). The global-hotkey beam is
  also gated on a present image. Browser-dev (no Tauri) keeps the "ready" mock so
  the design demo is unchanged.
  - **Tap to enlarge.** Clicking the card thumbnail opens an in-popover lightbox
    (overlay, not a separate window — the panel dismisses on focus loss) with a
    larger preview lazily fetched via `clipboard_preview` (≤640px data URL, so
    the on-open probe stays light). Esc or a click on the backdrop / close button
    dismisses it; the close button is focused on open and the hotkey-beam is
    suppressed while it's up. The thumbnail shows a hover/focus zoom scrim. The
    overlay is a shared `window.ImageLightbox` (in `shared.jsx`).
  - **Recent thumbnails.** The `beam` command also returns a ≤480px PNG preview
    of what was sent, persisted on the Recent entry (`recent[].thumb`). The
    Recent rows — in the popover *and* Preferences — render that real thumbnail
    (placeholder when absent) and reuse `ImageLightbox` to enlarge it. This is
    **forward-only**: beams from before this change (and seeded mock entries)
    have no preview and keep the placeholder. Preview size is the storage/clarity
    balance (≤480px ≈ 30KB/entry) since `recent` (≤24 entries) lives in the
    persisted config blob.

- **The popover window sizes to its content.** It was a fixed 366×540; the
  steady-state card (beamed + a few Recent rows) is ~577px, so the footer host
  switcher was clipped against the bottom. The webview now measures the rendered
  `.hb-wrap` after every render and calls a `resize_popover(height)` Rust command
  (`set_size`, clamped to the monitor height) — only when the height actually
  changes, so re-renders don't spam IPC. Result: no clipped footer, real
  breathing room at the bottom (the wrapper's 20px bottom padding), and no dead
  transparent area below short states (so click-away to dismiss stays tight).
  Both the popover and the onboarding flow drive it.

- **The "Beaming…" state animates under Reduce Motion too.** The `BeamMark` app
  icon (slices pulsing up the beam) and the progress bar had *all* their motion
  gated behind `prefers-reduced-motion: no-preference`, so with Reduce Motion on
  (the WebView reports it) the whole state froze. Now the vestibular-safe,
  opacity-only motion (the slice pulse + a bar "breathe", `bmPulse`/`bmFade`)
  runs always, and only the translating/scaling motion (sliding indeterminate
  bar, ring bloom, node pop) stays gated behind `no-preference`. So it reads as
  "working" in both modes — lively normally, a gentle pulse under Reduce Motion.

- **A successful beam auto-returns to ready (no "Beam again").** The done state
  used to rest on a "Beam again" button — misleading, since the clipboard now
  holds the paste-ready text (not the screenshot), and the button only reset to
  idle anyway. Now the popover shows the "Copied to clipboard · <path>"
  confirmation for ~2.5s, then returns to the ready state on its own (which
  reflects the now-empty clipboard, prompting the next screenshot). `upload`
  gained a `force` arg (shortcut/retry beams skip the stale `canBeam` guard and
  let Rust validate the clipboard); the idle/Try-again buttons pass it
  explicitly.

- **Beam transfer: cheap control over the mux, bulk over a direct connection.**
  The folder `mkdir` runs over the normal connection (reuses the user's
  `ControlMaster` if present — instant), but the file goes via `scp -o
  ControlPath=none`, forcing a **direct** connection. This matters because SSH
  connection multiplexing (which configs like OrbStack enable) is *dramatically*
  slower for bulk data — measured ~74s/MB through a master vs ~37s/MB direct on a
  high-latency link. (History: tried full `ControlMaster` multiplexing — broke
  beaming, `ControlPersist` holds the command's stdout/stderr and hangs
  `Command::output()`; tried a single `ssh "mkdir && cat"` — the `cat` stdin path
  is slower than scp for bulk.) The PNG uses a single `Up` row filter (fast
  encode) + Default deflate (small file, since transfer dominates).
  - **Network-bound reality:** beaming to a *remote* host is limited by that
    link, not the app. One real case: `linux-box` resolved to a Tailscale peer
    ~344ms away at ~30 KB/s, so a 200KB shot is several seconds no matter what —
    the speedups here (avoid the mux, smaller files) roughly halve it, but the fix
    for that case is network-side. LAN hosts are fast.

- **Diagnostic logging (`log.rs`).** A lightweight file logger writes timestamped
  lines to `~/Library/Logs/com.hostbeam.app/hostbeam-YYYY-MM-DD.log`, one file per
  day, pruned to the last **7 days** on startup. It records app start (version +
  platform), global-shortcut set/registration, shortcut presses (immediate vs
  toggle), preferences/onboarding events, panics (via a panic hook), and — the
  point — every beam: the request, the **exact ssh/scp command + exit code +
  duration** (the shared `run()` helper logs all of them, with stderr on
  failure), clipboard state, and a one-line per-beam summary
  (dims/size/clipboard/encode/transfer timings). `test_host` probes and
  `diagnose` runs are logged too. Commands `read_logs` / `clear_logs` /
  `open_log_dir` / `log_dir` back a **Preferences → About → "Diagnostic logs"**
  sheet (view, Copy all, Open folder, Clear) so a user can hand logs to support.
  Lines echo to stderr only in debug builds.

- **Proper menu-bar icon + beam animation (`tray.rs`).** The tray used the full
  app icon as a template, which macOS renders as a filled blob. It now uses the
  design's beam glyph (`hostbeam-menubar.svg`) rasterized to template PNGs
  (`icons/tray/menubar*.png`, via `rsvg-convert`, embedded with `include_bytes!`).
  While a beam is in flight, `tray::animate_during` cycles 3 frames (the bright
  band travels node→beams→device, ~150ms each) on a background thread, restoring
  the resting icon when done — every `set_icon` dispatched via
  `run_on_main_thread` (macOS requires status-item updates on the main thread).
  The tray has id `"main"` so the animator can fetch it.

- **Add a host from the popover → Preferences › Hosts.** The popover's "Beam to"
  dropdown (`HostSelect`, new optional `onAddHost`) has an "+ Add a host…" footer
  item that opens Preferences on the Hosts tab (full picker + manual add live
  there — no duplicated UI in the small popover). `open_preferences(tab)` opens a
  new window at `preferences.html#<tab>` or, if it's already open, shows it and
  evals `location.hash`; `PrefsApp` listens for `hashchange` and switches tabs.
  The tab slug is restricted to `[a-z]` before interpolation. The empty-state
  "Add a host" button targets the Hosts tab too.

- **⌘, opens Preferences.** The tray "Preferences…" item shows the
  `CmdOrCtrl+Comma` accelerator (with a no-accelerator fallback if the string
  fails to parse). Because Hostbeam is an accessory app (no app menu), the actual
  keypress is handled by the popover's webview: a `main.tsx` keydown handler
  catches ⌘, while the popover/onboarding is focused and calls
  `openPreferences()`. The tray-menu key equivalent fires when that menu is open.

- **Esc dismisses the popover.** A window-level keydown handler (`main.tsx`)
  invokes a new `hide_popover` Rust command (`panel.order_out`) on Escape, for
  both the steady popover and the onboarding it hosts — same effect as
  click-away. It bails when a modal is open (`[role="dialog"]` /
  `[aria-modal]` — the tap-to-enlarge lightbox), so Esc closes that first.

- **Localization (i18n) — phased.** `src/i18n.ts` publishes `window.t(key, vars)`
  (interpolation + English fallback) and resolves the active locale from
  `config.settings.locale` ("system" | code) → the system/browser language →
  `en`, re-resolving live on the `hb:config`/`storage` events. Supported: en, fr,
  ja, es, de, zh (Simplified), pt (Brazilian), ko — 8 locales, each a full
  204-key dictionary (parity enforced). Imported right after `globals` in both
  entry points so `t` exists before the design scripts render; the user override
  is applied once the config loads. The Rust mirror (`i18n.rs`) covers the same
  8 locales for its handful of strings.
  - **Phase 1 (done):** the popover fully localized (`popover.jsx`), the
    `BEAM_ERRORS` taxonomy (`title`/`detail`/`hint` are now functions), relative
    times, the `HostSelect` strings, and a **Language** dropdown in
    Preferences › General (`config.settings.locale`, default "system").
  - **Phase 2a (done):** onboarding (`flowA.jsx`) — welcome, choose-a-host,
    manual-add, almost-done, plus the shared `HostPickerList` filter/empty text
    and the `field.*` labels. The `{config}`-interpolated line keeps its mono
    `~/.ssh/config` span via a split-render.
  - **Phase 2b (done):** all of Preferences (`prefs.jsx`) — General, Hotkey,
    Recent, About, and Hosts panes, the sidebar nav + search, both
    `HotkeyRecorder`s, the Logs/Add-host/Diagnostics sheets, and the inline host
    detail/picker. The paste-ready sentence template value stays English by
    design (it's a command sent to the remote coding agent); mono spans
    (`{path}`, `~/.ssh/config`, `user@addr`) and bold conflict names are kept via
    split/replace. Plurals use one/many keys.
  - **Phase 3 (done):** the Rust strings via `src-tauri/src/i18n.rs` — a `t(loc,
    key)` table (English fallback) and `locale(app)` that resolves
    `config.settings.locale` → the macOS system language (`defaults read -g
    AppleLocale`, cached) → `en`. Covers the tray menu, the "Screenshot beamed"
    notification (read live at beam time), and the `diagnose` check-row labels
    (locale threaded into `diagnose_blocking`). The tray menu is built per-locale
    and rebuilt live via a `refresh_tray_menu` command the webview calls on a
    language change (passing the resolved locale, to avoid a config-mirror race).
    Localization is now complete across the app.

## Parity checklist (Flutter → Tauri)

- [x] SSH config discovery incl. `Include`
- [x] Clipboard image read + paste-ready text write
- [x] OpenSSH `mkdir`/`scp` upload (non-interactive)
- [x] Error taxonomy (auth/perm/timeout) + real diagnostics command
- [x] Settings persistence — backend store done; frontend wiring in M-T3
- [x] Upload history persistence — kept in the config blob; wiring in M-T3
- [x] Notifications
- [x] First-run / setup flow (Flow A, popover-native)
- [x] Preferences surface
- [x] Menu-bar popover (nspanel), tray, global hotkey
- [~] Tests — backend unit/integration done (10); frontend tests pending
- [ ] Developer ID signed + notarized build

## Risks / open items

- Frontend refactor from prototype bundle to component-source build is the largest
  unknown; the design components assume some page-level CSS (see the spike's
  `popover-page.css`) that must be folded into the real build.
- Hardened Runtime + unsandboxed SSH shelling: verify no entitlement blocks
  `ssh`/`scp` or the global shortcut after notarization.
- Decide how design updates are consumed long-term (re-pull via DesignSync vs.
  vendored component sources).
