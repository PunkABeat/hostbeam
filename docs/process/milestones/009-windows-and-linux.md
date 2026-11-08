# Milestone 009: Windows and Linux

Status: **Not opened.** Written down 2026-09-26 so the work can be picked up
later. Nothing here is in scope until the owner decides on the questions
below and an ADR opens the milestone (AGENTS.md: no scope without a
milestone and an ADR).

It covers Phase 3 of the desktop code review
([desktop-code-review-2026-09.md](../desktop-code-review-2026-09.md) §D and
§G), the only part of that review still open, plus the port that follows it.
The review's findings are summarised here; this file's inventory was
re-checked against the code on 2026-09-26.

## To open it, decide

1. **Windows, Linux, or both, and in which order.** Recommendation: Windows
   first. Its built-in capture (Win+Shift+S) puts the screenshot on the
   clipboard, which is exactly what Hostbeam beams. Its tray icon takes clicks,
   and global shortcuts work. On Linux, the tray icon does not report clicks
   and global shortcuts do not work under Wayland. Those are the two main ways
   into the app, and Wayland is now the default on most distributions.
2. **One licence for every platform?** Licences are Paddle → Keygen
   (ADR 0014), and seats are counted per machine fingerprint. A Mac buyer who
   also uses Windows would use two seats. Decide whether that is the intent.
3. **Signing and distribution.** A Windows build needs Authenticode signing:
   unsigned apps get SmartScreen warnings. That means a certificate or a
   signing service, which has a yearly cost and an identity check. Linux needs
   a package format that the updater can update. Check both before costing
   the work.
4. **Test machines.** This Mac is Intel, so an x64 Windows 11 virtual machine
   runs on it. `linux-box` on the tailnet is a Linux box, offline since
   mid-September 2026. The repo's test host (`npm run testhost:up`) serves any
   client on the network, so a VM can beam to it.
5. **Which Mac-only features are dropped, not rebuilt.** The table below
   proposes an answer for each.

## Where the code stands (checked 2026-09-26)

**The Rust crate does not compile off macOS.**

- `Cargo.toml` pulls macOS-only crates unconditionally: `tauri-nspanel`
  (pinned git rev), `objc 0.2`, `objc2 0.6` (exception catching), and
  `dispatch2 0.3`. `libc` is used for macOS-only calls such as `access(2)` in
  `updates.rs` and the QoS class in `beam.rs`. Tauri is built with
  `macos-private-api`.
- 32 `#[cfg(target_os = "macos")]` sites in 11 files. 14 files use
  objc/nspanel/dispatch2/objc2. 33 lines with `unsafe` in 13 files.
- Unix-only std: `std::os::unix::fs::symlink` in `services/ssh.rs:364`, the
  upload's staging (symlinks on Windows need privileges, so copy or pass
  paths there), and `std::os::unix::ffi::OsStrExt` in `updates.rs`.
- External commands besides `ssh`/`sftp`: `open` (5 call sites in
  `commands.rs`, `pull.rs`, `log.rs`), `security` (licence key in the
  Keychain), `ioreg` (seat fingerprint), `launchctl` (`startup.rs`),
  `defaults` (system language, `i18n.rs`), and `hostname`.
- Hard-coded macOS paths: `/Applications/Hostbeam.app` in `updates.rs` and
  `~/Library/LaunchAgents` in `startup.rs`. The log directory already comes
  from Tauri's `app_log_dir`.
- `tauri.conf.json` bundles only `app`, `macOSPrivateApi` is on, and the
  updater's `latest.json` carries only macOS entries.
- Tests: `tests/fake_ssh.rs` writes shell-script stubs of `ssh`/`sftp` onto
  `PATH`. They need a Windows equivalent or `#[cfg(unix)]`.

**The frontend assumes macOS keys and sizes.**

- `toAccelerator` (`src/config-bridge.ts:41`) emits `Cmd`, not `CmdOrCtrl`.
- `Keycap` (`packages/ui/src/components/surfaces/Keycap.tsx`) draws ⌘⇧⌥⌃,
  and it is shared with the website.
- The shortcut-conflict table in `src/lib/hosts.ts`, `HotkeyRecorder.tsx`,
  and `IdleActions.tsx` assume macOS system shortcuts. `main.tsx:78` binds
  `Cmd+,` for Preferences.
- `Frame.tsx` and the onboarding `PopoverFrame.tsx` hard-code the 340 px card
  that must match `WRAP_PAD_X` in Rust.

**Not tried: a cross-target `cargo check` from this Mac.** It is expected to
stop in dependencies before reaching Hostbeam's code: `ring` compiles C for
the target, and `webkit2gtk-sys` needs Linux system libraries. Run the check
on GitHub's `windows-latest` and `ubuntu-latest` runners instead.

**Unaffected:** the remote side (every remote script runs on the host's `sh`,
whatever the client), the agent tools in `apps/agent/` (they run on the
host), the iPhone app, the licensing worker, and the website apart from its
download page.

## Feature by feature

"Check" marks an external fact to confirm when the milestone opens. Each is a
recommendation, not a decision.

| Feature | macOS today | Windows | Linux |
|---|---|---|---|
| Popover under the tray icon | Non-activating NSPanel, `popover.rs` + `tauri-nspanel` | Undecorated always-on-top window + `tauri-plugin-positioner` (TrayBottomCenter), hidden when it loses focus (review §D) | The tray icon reports no clicks, so a tray *menu* item opens it (review §D) |
| Beam HUD | Second NSPanel, `dispatch_after` hide (`hud.rs`) | Always-on-top window, timer on Tauri's loop | Same; check window placement under Wayland |
| Global shortcuts | `tauri-plugin-global-shortcut` | Works | X11 only; not under Wayland (review §D) |
| Auto-beam (watch the clipboard) | Pasteboard change count (`auto_beam.rs`) | Clipboard sequence number (check the API) | X11 selection events; Wayland to research |
| Read the image | `arboard` + objc2 exception guard (`clipboard.rs`) | `arboard` | `arboard` (X11 and Wayland; check) |
| Drop on the tray icon | objc method injection (`tray_drop.rs`) | Dropped; files can still be dropped on the popover | Dropped |
| Dock icon, Dock menu, ⌘⇥ | `activation.rs`, `dock_menu.rs`, `startup.rs` | Taskbar presence toggle (`skipTaskbar`) | Same |
| Launch at login | SMAppService, legacy `launchctl` plist (`startup.rs`) | `tauri-plugin-autostart` (check) | Same |
| Share Hostbeam | NSSharingServicePicker (`share.rs`) | Drop the system menu; keep the pane's own links | Same |
| Licence key storage | Keychain via `security` (`licensing/keychain.rs`) | Credential Manager (e.g. `keyring` crate; evaluate) | Secret Service (same crate) |
| Seat fingerprint | IOPlatformUUID via `ioreg` (`licensing/mod.rs`) | Machine GUID (check the source) | `/etc/machine-id` |
| UI language | `defaults` AppleLanguages (`i18n.rs`) | OS locale (e.g. `sys-locale`) | Same |
| Open a link, folder or log | `open` | Default handler | `xdg-open` |
| `hostbeam://` links (ADR 0025) | Apple events (`url_scheme.rs`) | Deep-link plugin; links arrive as CLI args, so single-instance must be registered first (review §D) | Same |
| Updates (ADR 0022) | Updater + `/Applications` and admin checks (`updates.rs`) | Updater; pick the installer format | Updater; check which package formats it can update |
| SSH | System OpenSSH `ssh`/`sftp` (ADR 0003) | Windows' own OpenSSH client (check: installed by default, `sftp -b` behaviour, no ControlMaster) | System OpenSSH |
| Taking the screenshot (user side) | ⌃⌘⇧4 and any capture tool | Win+Shift+S copies to the clipboard | Depends on the desktop |

## The plan

**Stage 1: portability groundwork.** No user-visible change; the Mac keeps
shipping throughout. This is the review's Phase 3, estimated there at about
two weeks.

1. `platform/` module with small traits: `Popover`, `ClipboardWatch`,
   `LoginItem`, `DockPresence`, `DropTarget`, `ShareSheet`, `MainThread`.
   `platform/macos.rs` holds **all** objc and `unsafe` code. macOS crates move
   to `[target.'cfg(target_os = "macos")'.dependencies]`, and the other
   platforms get stubs.
2. A `cargo check` job in CI on `windows-latest` and `ubuntu-latest`, so the
   boundary cannot rot. The review expects about a day of fixes on its first
   run.
3. Frontend `lib/platform.ts`: the primary modifier, the glyph map, the
   system-shortcut table, the popover metrics, and wording keys. It feeds
   `Keycap` (as a prop, since the website shares it), the recorder,
   `toAccelerator`, and the frames.
4. Move to the `objc2` framework crates and `tauri-nspanel 2.1.0` from
   crates.io, replacing the pinned git rev and the deprecated `objc` crate.

Exit: CI proves the crate compiles for Windows and Linux, and a macOS release
passes `docs/process/release-smoke-test.md` unchanged.

**Stage 2: the first port.** Implement the traits per the table. Then:
packaging (bundle targets), signing, `latest.json` platforms, a release
script (today's is macOS and notarization only), the website's download page,
the licensing fingerprint and key storage, the engineering guides, and
`npm run notices` for the new dependencies (ADR 0026). Test against the repo's
test host from a VM.

**Stage 3: the second platform**, the same way.

## Resume here

1. Read this file, review §D, and ADRs 0003 (system OpenSSH), 0008 (direct
   distribution), 0010 (Tauri), 0014 (licensing), 0022 (updates) and 0025
   (URL scheme).
2. Get the owner's answers to "To open it, decide", and record them in a new
   ADR that opens this milestone.
3. Re-run the inventory greps above. The numbers go stale as the Mac app
   changes.
4. Start Stage 1, step 1.
