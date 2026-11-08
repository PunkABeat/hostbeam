# Architecture

How the desktop app is put together: the two processes, how they talk, where
state lives, and the layering rules. Read this before the per-stack guides
([rust.md](rust.md), [frontend.md](frontend.md), [css.md](css.md)). It
describes the tree as it is; when the two disagree, fix the one that is wrong
in the same change.

---

## The two-process model

```
┌──────────────────────────────┐            ┌──────────────────────────────────┐
│  Rust core  (src-tauri/)     │  commands  │  WebView UI  (src/)              │
│  — the privileged process    │ ─────────► │  — React + TypeScript            │
│                              │  messages  │                                  │
│  • ssh / scp (system ssh)    │ ◄───────── │  • popover window (index.html)   │
│  • clipboard, files, cache   │            │  • preferences window            │
│  • global shortcuts          │            │  • HUD window (hud.html)         │
│  • tray icon + menu          │            │  • onboarding (in the popover)   │
│  • NSPanel, Dock, login item │            │                                  │
│  • licence, updates, logs    │            │  state: the config store (HB)    │
└──────────────────────────────┘            └──────────────────────────────────┘
        config.json  ◄──── set_config / get_config + "config:changed" ────►  localStorage cache
```

**Which side does a thing go on?**

- **Anything privileged or native → Rust.** Talking to `ssh`, the clipboard,
  the filesystem, global shortcuts, the tray, AppKit. The WebView never does
  these directly.
- **Anything visual or interaction → WebView.** Layout, view state, the beam
  state machine's *presentation*.
- **The config → owned by the WebView, mirrored to Rust** (below).

The split is also the security boundary: the WebView is the less-trusted
surface. Privileged capabilities stay in Rust behind narrow commands with
validated inputs (`services/ssh.rs`), a strict CSP, and one capability file
(`src-tauri/capabilities/default.json`) granting only what is used.

---

## The windows

Three WebView windows, one bundle, different entry HTML:

| Label | Entry | What |
|---|---|---|
| `popover` | `index.html` → `src/main.tsx` | The menu-bar popover: a non-activating `NSPanel` (`popover.rs`). Hosts onboarding (`views/onboarding`) on first run, then `views/popover`. |
| `preferences` | `preferences.html` → `src/preferences.tsx` | A normal window opened on demand (`preferences_window.rs`); the active pane follows the URL hash (`#hosts`, …). |
| `hud` | `hud.html` → `src/hud.tsx` | The floating beam HUD, a second panel driven entirely from Rust (`hud.rs`). |

Window configuration is `src-tauri/tauri.conf.json`.

---

## The IPC contract

Two channels, one module each, typed at both ends.

### WebView → Rust: commands

`src/lib/ipc.ts` is the only place the WebView calls Rust. Every
`#[tauri::command]` has one typed function there, with its argument and result
types mirroring the Rust signature; views import those functions and never
spell a command name or cast a result. The browser-dev fallbacks (no Tauri)
live in the same module, privately, so a view cannot ship a mock by accident.

Rust side: commands live with their feature (`beam.rs`, `config.rs`,
`licensing/`, `updates.rs`, `hotkeys.rs`, `popover.rs`, `preferences_window.rs`,
`url_scheme.rs`, `actions.rs`, `commands.rs`, `log.rs`) and are registered in
`lib.rs`'s `generate_handler!`. A command is thin: validate, call one service,
map the error. Errors cross as a stable code string via `error.rs`
(`Error::to_code` → `CommandError`), which the UI's `BEAM_ERRORS` taxonomy
branches on.

### Rust → WebView: messages

`src-tauri/src/ui_bridge.rs` (`UiMessage`, `send`) and `src/lib/rust-bridge.ts`
(`RustMessage`, `useRustMessage`) are the other half. Rust serialises one enum
and evals `window.__hbReceive(msg)`; the WebView dispatches by `kind` to
whatever subscribed. A test in `ui_bridge.rs` pins every message's serialized
shape, so a change on either side fails a test on the other.

The transport is deliberately an eval, not Tauri's event system: the popover's
webview is suspended while the panel is hidden, an eval reaches it the moment
it is shown, and whether a queued event would is undocumented. A message with
no subscriber is dropped on purpose — a late `beam` would be a surprise
upload — and what a cold start needs is parked in Rust (`url_scheme.rs`,
`actions.rs`) and collected by the popover on mount.

### Adding one

- **A command:** the `#[tauri::command]` in its feature module → the line in
  `lib.rs`'s `generate_handler!` → a typed function in `lib/ipc.ts` (and its
  browser fallback, if a view needs one) → callers. Nothing else.
- **A message:** a variant on `UiMessage` → the `kind()` arm → the matching
  member of `RustMessage` → the shape test in `ui_bridge.rs` → a
  `useRustMessage("kind", …)` where it is handled.

---

## State ownership

There is **one** logical app state — the user's config — with one accessor on
each side. Everything else is view state local to a hook or component.

### The shape

`src/types/config.ts` is the TypeScript shape; `src-tauri/src/config.rs`
mirrors the subset Rust reads (`Config`, `Settings`, `#[serde(default)]`).
`lib/config.ts` owns `DEFAULTS` — a Mac nobody has touched: no hosts, nothing
beamed. The browser render seeds mock hosts and Recent rows on top
(`config-bridge.ts`); those are never defaults.

### The flow

```
 view → useHBConfig() update(patch)
            │  patches on top of HB.load() — the persisted copy, not this
            │  component's — then HB.save(next)
            ▼
        HB.save(cfg)
            │  writes localStorage (a cache with a ~5MB quota, see below)
            │  dispatches "hb:config" → every useHBConfig re-renders
            │  config-bridge: invoke set_config → Rust writes config.json,
            │  refills its parsed-config cache, prunes unreferenced previews,
            │  emits "config:changed"
            ▼
        the other window's config-bridge hears "config:changed" → refreshConfig()
        → get_config → cache + "hb:config"; the popover also refreshes on "shown"
```

Rules:

- **Read and write config only through `useHBConfig()`** (or `HB.load()` in
  non-React code). Never `localStorage` directly, never a parallel copy.
- **`update()` patches what is persisted**, not the component's copy, so a
  window that missed the other's write cannot put it back.
- **Rust reads through `config::read`**, which serves the cached parse; Rust
  never writes the config except in `set_config`.
- **Recent previews are files** in the app cache (`thumbs.rs`), referenced by
  path; a row keeps the path, the WebView renders it through the asset
  protocol (`lib/thumbs.ts`). This is what keeps the config a few KB.
- **localStorage is a cache, not the store.** A config that outgrows its
  quota is cached without thumbnails (`config-bridge.ts` `cache()`) rather
  than blanking the window.

---

## Layering

Both halves follow the same discipline. Dependencies point one way:
**presentation → application → infrastructure**, with domain types shared.

| Layer | Rust (`src-tauri/src/`) | WebView (`src/`) |
|---|---|---|
| Presentation | `tray_menu.rs`, `popover.rs`, `hud.rs`, `preferences_window.rs`, `dock_menu.rs` | `views/**` (compositions + `components/`), `components/` (shared) |
| IPC boundary | `#[tauri::command]` fns, `ui_bridge.rs`, `error.rs` | `lib/ipc.ts`, `lib/rust-bridge.ts`, `config-bridge.ts` |
| Application / domain | `services/ssh.rs`, `services/image.rs`, `ssh_config.rs`, `licensing/`, `updates.rs`, `auto_beam.rs`, `url_scheme.rs`, `actions.rs` | `views/*/hooks/` (a screen's behaviour), `lib/*` (pure rules: `sentence`, `host-order`, `beam-failure`, `recent`, `updates`, …) |
| Infrastructure | `config.rs`, `thumbs.rs`, `log.rs`, `licensing/keychain.rs`, `startup.rs`, `tray_drop.rs`, `activation.rs`, `main_thread.rs` | localStorage, `@tauri-apps/api` |

The rules that matter:

1. **Compositions and command handlers are thin.** `PopoverApp.tsx` and
   `PrefsApp.tsx` wire hooks to components; `lib.rs` wires modules into the
   Tauri builder. Neither contains a rule.
2. **Rules are pure and tested in isolation** — no `AppHandle`, no real
   `ssh`, no widgets. `ssh_config.rs`, `services/`, `lib/*.ts` are the bar.
3. **Infrastructure sits behind a narrow interface** so it can be faked.
4. **Views never import `config-bridge`, and `lib/` never imports `views/`.**

---

## Platform code

Everything that touches AppKit is `#[cfg(target_os = "macos")]` in eight
modules (`popover.rs`, `hud.rs`, `auto_beam.rs`, `startup.rs`, `tray_drop.rs`,
`activation.rs`, `dock_menu.rs`, `share.rs`), and the crates behind it
(`tauri-nspanel`, `objc`, `dispatch2`) are unconditional dependencies — so
the crate does not build for another OS yet. The plan for a Windows or Linux
port is a `platform/` module with small traits and per-OS implementations;
until then, keep new AppKit code inside one of those eight files, behind a
plain function with no AppKit types in its signature.
