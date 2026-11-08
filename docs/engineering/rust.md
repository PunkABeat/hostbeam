# Rust Guide

Standards for the Rust core in `src-tauri/`. Read [architecture.md](architecture.md)
first. Edition 2021, Tauri v2, the toolchain `rust-toolchain.toml` pins.

---

## Module map

`lib.rs` holds the module list, the two window labels and `run()`, which builds
the Tauri app. Everything it wires up lives in the module named for it:

| Module | Owns |
|---|---|
| `beam.rs` | The beam commands (`beam`, `beam_files`, probes, diagnostics, storage, pairing), the retry token, and what a file beam checks first (`prepare_files`: type, size, the held secret check, the remote name). Orchestration only; the work is in `services/`. |
| `services/ssh.rs` | ssh/scp argument building, input validation (`valid_alias`, `valid_folder`, `valid_pubkey`), execution and failure classification. Pure except `run`. |
| `services/image.rs` | Scale, encode, previews (file and data URL), decode. Pure. |
| `ssh_config.rs` | `~/.ssh/config` parsing with `Include`, and error classification. |
| `config.rs` | The typed config mirror, `read()` (cached), `get_config`/`set_config`. |
| `thumbs.rs` | Where Recent previews live and when they are pruned. |
| `error.rs` | `Error` (thiserror) and the one place it becomes a UI code. |
| `ui_bridge.rs` | Every message Rust sends a webview, and `send`. |
| `actions.rs` | What a gesture asks for: shortcut, tray, ⌥-click, a dropped or opened file. |
| `url_scheme.rs` | `hostbeam://` links and the parked asks a cold start needs. |
| `popover.rs`, `hud.rs`, `preferences_window.rs` | The three windows. |
| `tray.rs`, `tray_menu.rs`, `tray_drop.rs`, `dock_menu.rs` | The tray icon and animation, its menu, drops on it, the Dock menu. |
| `hotkeys.rs`, `auto_beam.rs`, `startup.rs`, `activation.rs` | Shortcuts, the clipboard watcher, the Startup switches, ⌘⇥ activation. |
| `licensing/` | The reminder's count (ADR 0028), Keygen client, Keychain storage. |
| `updates.rs`, `update_notes.rs` | The background check, installing when asked, release notes. |
| `commands.rs`, `share.rs`, `log.rs`, `i18n.rs`, `main_thread.rs`, `pull.rs` | Small commands, the share sheet, the diagnostic log, the few Rust-side strings, GCD, pulling images back. |

Principles:

- **A `#[tauri::command]` is a translator.** Validate, call one function,
  map the error. Blocking work goes through `spawn_blocking`.
- **Services know nothing about Tauri.** Plain inputs, `Result<T, Error>`,
  unit tests without an `AppHandle`.
- **One concern per module**, and a module's tests live in it.
- Default to `pub(crate)`; `pub` only for commands (the handler macro needs
  it) and what `tests/` imports.

---

## Error handling

`error.rs` is the project error type: variants preserve their cause
(`#[from]`/`#[source]`), and `Error::to_code` is the only place an error
becomes the stable string the UI branches on (`lib/beam-errors.ts`). Commands
return `Result<T, CommandError>`.

- Preserve the cause; never `.map_err(|_| "…")`.
- Classify once, near the boundary (`services/ssh.rs::ssh_error`).
- Never swallow: `log::warn_if_err` for fire-and-forget UI/system calls,
  `?` otherwise. `.unwrap()`/`.expect()` only in tests and for bundled assets.
- A handful of commands still return `Result<T, String>` (`config.rs`,
  `hotkeys.rs`, `open_preferences`, `copy_share_link`). New code does not.

---

## Concurrency

- Blocking work (`ssh`, the clipboard, image encoding, `security`, the
  network) runs in `tauri::async_runtime::spawn_blocking`; the beam thread
  raises its QoS first (`beam.rs::claim_user_initiated`).
- AppKit and the tray are touched on the main thread: `main_thread::on_main`
  (GCD, which wakes an idle accessory app's run loop) for the HUD, the Dock
  icon and the quiet-moment check; `run_on_main_thread` for the tray icon.
- Short-lived threads are fine for self-contained jobs (the tray animation,
  the update watcher, the clipboard watcher); keep them bounded.
- Prefer the lightest primitive: `AtomicBool`, `OnceLock`, `Mutex` only for
  state mutated after init. Handle poisoning explicitly (`unwrap_or_else(|p|
  p.into_inner())` with the reason logged where it matters).

---

## Configuration and state

- `config::read(&app)` is the one accessor. It serves the parsed config from
  managed state (`config::Cache`), refilled by `set_config` from the value
  just written, emptied by `clear`. Do not re-read `config.json` yourself.
- Managed state (`app.manage`, `State<'_, T>`) is the pattern for shared
  mutable state: one `#[derive(Default)]` struct per concern, owned by the
  module that uses it and registered in `lib.rs` (`hotkeys::State`,
  `beam::Retries`, `updates::UpdateState`, `url_scheme::ParkedAsks`, …).
  Commands take `State<'_, T>`; everything else reaches it through
  `app.state::<T>()`. Tests build the struct directly. The only statics left
  are `OnceLock`s for C callbacks (`APP`, `LOG_DIR`) and the i18n locale
  cache; new state should not add to them.
- Log through `crate::log::{info, warn, error}`; the lines land in the daily
  support log. `log.rs` is also the `log` crate's logger, so what Tauri and
  its plugins log reaches the same file: the updater from info, everything
  else from warn. Raise a dependency's level in `log::threshold`, not by
  calling `log::set_max_level` elsewhere.
- The Keychain key is remembered after a confirmed read, set or delete
  (`licensing/keychain.rs`); a failed read is asked again.

---

## Platform code and `unsafe`

Every `unsafe` block is AppKit or libc glue in one of the eight macOS modules
(see [architecture.md](architecture.md#platform-code)). Rules:

- A `// SAFETY:` comment on every `unsafe` block saying why the invariants hold.
- No AppKit types in a function's signature; expose plain Rust.
- `tauri-nspanel` is pinned to a commit and still uses the deprecated `cocoa`
  crate; the `#[allow(deprecated)]` for it is scoped to the functions that
  need it. Moving to `objc2` (the crate's 2.1.0 on crates.io is on that
  stack) is the platform-layer work, not a version bump.

---

## Tooling

- `rust-toolchain.toml` pins the compiler (and `rust-version` in `Cargo.toml`
  says the same); CI installs exactly that. Bump both together — a newer
  clippy brings new lints, and the gate is `-D warnings`.
- `cargo deny check advisories sources` runs in CI (`deny.toml`): the only
  git dependency is allow-listed, unmaintained transitive crates are ignored
  with a reason each. Add nothing from git without a pinned `rev`.
- After any change to `Cargo.lock`: `npm run notices`, and commit the
  regenerated JSON (`npm run check:notices` is a release gate).
- The gate (also CI): `cargo fmt --check`, `cargo clippy --all-targets -- -D
  warnings`, `cargo test`.

---

## Testing

- Pure logic is unit-tested in its module; `ssh_config.rs`, `services/`,
  `beam.rs`'s name and script helpers, `url_scheme.rs`, `tray_menu.rs`,
  `updates.rs`, `licensing/` are the bar. Tests may `.unwrap()` freely.
- Integration tests live in `tests/` with fixtures. `tests/fake_ssh.rs` puts
  a stub `ssh`, `scp` and `sftp` on `PATH` and runs the `AppHandle`-free
  orchestration against them (`test_host_blocking`, `diagnose_blocking`,
  `install_pubkey_blocking`, `pull_blocking`, `ssh::upload`, `ssh::run`,
  `resolve_port`):
  each stub host is a directory of `stdout`/`stderr`/`status`, and every
  invocation lands in its `calls` file, so a test asserts which commands ran.
  A new host conversation gets a test there.
- `tests/testhost_upload.rs` runs `ssh::upload` against the real test host
  with the real `sftp`; it is ignored by default (CI has no host), so run it
  after touching the upload:
  `cargo test --test testhost_upload -- --ignored --nocapture`.
- `beam_blocking` and `send` need an `AppHandle` (tray animation, config) and
  stay untested by the stub; a real host is one command away:
  `npm run testhost:up` (see `docs/process/test-host.md`). Use it for
  anything that touches beaming, discovery, pinning or pairing.

---

## Security specifics

- Process execution is always an argument array, never a shell string. ssh
  options are non-interactive (`BatchMode=yes`, `ConnectTimeout`,
  `GSSAPIAuthentication=no`); changes there get a security note.
- Every remote script single-quotes the folder, and `valid_folder` refuses
  quotes and whitespace; the tests in `beam.rs` assert both. Names that reach
  a host inside a shell command are allow-listed (`beam.rs::slug`,
  `beam.rs::remote_extension`, `pull.rs::safe_name`).
- Clean up's `-delete` matches only Hostbeam's stamped names
  (`beam.rs::artifact_match`: `hostbeam-` + 13 digits + end, `.` or `-`), never
  a list of types; its tests run the real script on a fixture, and an
  `#[ignore]`d twin runs it on the test host's BusyBox `find`.
- Any file can be beamed (ADR 0006's 2026-09-26 amendment), so a file that
  looks like a secret is **held** (`beam.rs::looks_secret`): a result, not an
  error, answered in the popover. `allowSecrets` skips only that check.
- What the clipboard holds is decided in one place, `clipboard::source` —
  files before Finder's icon, a capture tool's real picture before its own
  file — and every reader goes through it.
- The CSP is set in `tauri.conf.json`; the asset protocol is scoped to the
  preview cache only; the capability file grants `core:default` plus what is
  used. Re-check both whenever you add a command, a plugin or a window.
- The Keychain holds the licence key; `license.json` never does.
- Logging records ssh/scp commands and timings for support, never clipboard
  bytes, secrets, or more host detail than a diagnosis needs.
