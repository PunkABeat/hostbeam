# ADR 0022: Updates Install Themselves Only When Asked

Status: Accepted.

Date: 2026-09-14.

Relates to: ADR 0014 (the paid update window), milestone 007 (the updater).

## Context

Up to 0.1.19 the Mac app checked download.hostbeam.app 15 seconds after launch
and every 24 hours after that, with no way to turn it off. The only way to
install was About → Update & relaunch. A popover line announced a new version
and could be dismissed per version, but the dots on the gear and in the
Preferences sidebar stayed, so a dismissed update still looked pending.

The owner asked for three things: skipping an update, choosing whether to
check, and installing without a click. The Homebrew cask is `auto_updates`, so
the app is also the only update path for people who installed with brew.

## Decision

**Skipping lasts until a newer version.** "Skip for now" (the popover line's ✕,
and a button next to Update & relaunch in About) records the version in
`updateDismissed`. That version is then announced nowhere — not the line, not
either dot — and never installed without asking. About still offers it. A
reminder the next day was turned down: a menu-bar utility must not nag.

**Checking is a setting, on by default.** Preferences → General → Updates →
"Check for updates automatically". Off means no request at all; About's check
still works. The watcher wakes hourly and checks once a day has passed on the
wall clock, so the gap does not depend on what a sleeping Mac does to a long
timer. A failed check is retried at the next wake rather than a day later.

**Installing without asking is a setting, off by default.** "Install updates
automatically", greyed out while checking is off, and Rust requires both. When
a check finds a version inside the update window that was not skipped, it is
downloaded, its signature verified, and the new bundle put in place. Off by
default because an app that replaces itself unasked is a surprise, however
quietly it does it. That can be revisited once it has run on real Macs.

**The relaunch waits for a quiet moment.** Hostbeam starts at login and rarely
quits, so waiting for the next launch could leave an installed update unused
for weeks. It relaunches when two checks a minute apart both find none of
these:

- the popover, Preferences or the HUD on screen;
- auto-beam armed — its armed state is deliberately not persisted, so a
  relaunch would silently switch it off mid-session;
- a beam or a pull running;
- a partial beam's free retry less than an hour old, since the retry token does
  not survive the process.

**Never an administrator prompt out of nowhere.** When the app's folder is not
writable by the user, the updater plugin falls back to an administrator-password
dialog. That is acceptable after a click on Update & relaunch and unacceptable
from a background thread, so an unasked install first checks `access(2)` on the
bundle and its folder, and leaves the update to the notice and the About button
when either is not writable.

**"Updated to …" is said once.** The popover records the version it last ran as
(`lastVersion`) and, after a change, shows "Updated to 0.1.x" with a link to the
changelog until dismissed. A first run records the version and says nothing.

## Consequences

- The About pane's privacy line ("Nothing leaves your Mac except the screenshot
  you beam") has never covered the update check. Switching checking off now
  makes it literally true; whether the line should change is an open question
  in `docs/research/questions.md`.
- The decisions are pure functions in `apps/desktop/src-tauri/src/updates.rs`
  (`check_due`, `should_install`, `Activity::quiet`) and
  `apps/desktop/src/lib/updates.ts`, each with tests. Window visibility is read
  on the main thread, where AppKit expects to be asked.
- A background install cannot be exercised by a single build. The endpoint,
  public key and https requirement are all `tauri.conf.json` values, so a test
  build overrides them with `tauri build --config` rather than the app carrying
  a test-only switch (`scripts/test-update-install.sh`, described in `release-smoke-test.md` § 3). Run that way on
  2026-09-14: with checking off, no request; with the app's folder read-only,
  `latest.json` fetched and nothing downloaded; with it writable, installed,
  relaunched two minutes later, and the relaunched app found nothing newer.
- The first of those runs installed and then never relaunched: after installing,
  the watcher went back to its hourly sleep. It now looks for a quiet moment
  within the minute (`pause_after_check`). The window reads and the relaunch
  itself go through GCD on the main queue, because Tauri's event-loop proxy does
  not wake an idle accessory app (the HUD's auto-hide found the same).

## Amendment (2026-09-24): the launch check opens the popover

The owner asked for a found update to be visible when the app starts. The
popover line and the dots are easy to miss for an app that lives in the menu
bar, and nothing was in front of the user at launch.

**The launch check opens the popover, and no other check does.** When the first
check after launch finds a version the popover line would announce, the watcher
opens the popover, which shows that line with its skip ✕. The daily checks
still say nothing beyond the line and the dots. This does not reverse the
no-nagging rule above: it happens once per launch, and a skipped version never
triggers it.

- **Same rule as the line** (`announce_at_launch`, mirroring `updateToAnnounce`):
  inside the update window, not skipped, and not installed in the background.
  An update that installed itself arrives on its own, and an open popover would
  only hold its relaunch back.
- **A failed launch check does not open it later.** The retry at the next wake
  is an hour on, and a popover appearing then would come out of nowhere.
- **Hostbeam starts at login, so this opens there too.** The popover closes on
  click-away, like any other time. A notification (needs a new plugin and a
  permission prompt, and Focus can hide it) and opening About (a real window,
  and a Dock icon) were both offered and turned down.
- `scripts/test-update-install.sh` now checks both halves. Run on 2026-09-24:
  with the folder read-only, the launch check opened the popover; with it
  writable, the update installed and relaunched, and neither app opened it.
- **The script checks the log, not the screen, and that was not enough.** On the
  test Mac (a 2× laptop with a 1× display beside it) the first hand test
  logged the announcement, and the popover appeared nowhere: it had opened at
  x = 2676 on a 1536-point screen. `position_panel` worked in the primary
  screen's pixels, but `set_position` converts pixels at the scale of the
  screen the window is on, and a popover never shown yet is still on the
  screen that was active at launch. It and `position_hud` now work in points.
  The global hotkey always had the same bug; the launch announcement was
  simply the first thing to open the popover before any tray click had moved it.
