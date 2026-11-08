//! Updates: the background check, installing without a click when asked to,
//! and the About pane's own check and install (ADR 0022).
//!
//! One watcher thread carries all of it, driven by two settings:
//!
//! - `checkUpdates` (on by default) — ask `latest.json` about once a day.
//! - `installUpdates` (off by default) — when a check finds a version the
//!   user has not skipped, download it, verify it, put the new bundle in
//!   place, and relaunch into it at a quiet moment. Quiet means nothing a
//!   relaunch would interrupt: no popover, Preferences or HUD on screen,
//!   auto-beam not armed, no transfer running. Every install gets every
//!   update: a license covers all of Hostbeam 1 (ADR 0028).
//!
//! Skipping (`updateDismissed`) is per version, so a newer release clears it by
//! not matching it.
//!
//! The first check after launch opens the popover when it finds a version to
//! announce, so the line is in front of the user rather than behind a gear dot.
//! Only that one: the daily checks leave it to the line and the dots.

use std::ffi::CString;
use std::os::unix::ffi::OsStrExt;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{mpsc, Mutex};
use std::time::Duration;

use tauri::{AppHandle, Manager};
use tauri_nspanel::ManagerExt;
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::config::{self, Config};
use crate::{error, log, update_notes};

/// What the About pane renders after an update check.
#[derive(serde::Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatus {
    available: bool,
    version: Option<String>,
    /// What changed since the running version: every latest.json `history`
    /// entry newer than it (see update_notes.rs), or the manifest's `notes`
    /// when there is no history. Both come from CHANGELOG.md via
    /// scripts/release-macos.sh. Shown before the user agrees to install:
    /// deciding is easier with the list than without it.
    notes: Option<String>,
    /// Already installed in the background and waiting for a quiet moment to
    /// relaunch into. Nothing announces a version in this state, since it is
    /// about to arrive on its own; About's install button only has the
    /// relaunch left to do.
    ready: bool,
}

/// What the watcher knows, managed by Tauri: the latest update state, refreshed
/// by the background check and by manual About-pane checks and read (without
/// any network) by `update_available` to drive the popover-gear and
/// Preferences-sidebar dot; and the version a background install put in place,
/// which the running process is not until it relaunches.
#[derive(Default)]
pub struct UpdateState {
    cache: Mutex<Option<UpdateStatus>>,
    staged: Mutex<Option<String>>,
}

impl UpdateState {
    fn staged(&self) -> Option<String> {
        self.staged
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .clone()
    }

    /// Marks the status as ready when its version is the one already installed.
    fn with_ready(&self, mut status: UpdateStatus) -> UpdateStatus {
        status.ready = status.version.is_some() && status.version == self.staged();
        status
    }

    fn remember(&self, status: &UpdateStatus) {
        *self.cache.lock().unwrap_or_else(|p| p.into_inner()) = Some(status.clone());
    }

    fn cached(&self) -> UpdateStatus {
        self.cache
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .clone()
            .map(|s| self.with_ready(s))
            .unwrap_or_default()
    }

    fn stage(&self, version: &str) {
        *self.staged.lock().unwrap_or_else(|p| p.into_inner()) = Some(version.to_string());
        if let Some(cached) = self
            .cache
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .as_mut()
        {
            cached.ready = cached.version.as_deref() == Some(version);
        }
    }
}

/// Beams and pulls running right now. A relaunch waits for this to reach zero.
static TRANSFERS: AtomicUsize = AtomicUsize::new(0);

/// First check after launch: late enough not to compete with startup.
const FIRST_CHECK_DELAY: Duration = Duration::from_secs(15);
/// How often the watcher wakes. A check is due only once a day, but waking
/// hourly and comparing wall-clock time means the gap never depends on what a
/// sleeping Mac does to one long timer, and a switch turned back on takes
/// effect within the hour rather than a day later.
const WAKE: Duration = Duration::from_secs(60 * 60);
const CHECK_EVERY_SECS: i64 = 24 * 60 * 60;
/// Once an update is waiting to be relaunched into, look for a quiet moment
/// this often.
const QUIET_POLL: Duration = Duration::from_secs(60);
/// Quiet has to hold for this many polls in a row. One quiet sample can land in
/// the gap between a shortcut press and the beam it starts; two a minute apart
/// cannot.
const QUIET_POLLS_BEFORE_RELAUNCH: u32 = 2;

/// Held for the length of a beam or a pull, so relaunching into an update never
/// cuts one off.
pub struct Transfer(());

impl Drop for Transfer {
    fn drop(&mut self) {
        TRANSFERS.fetch_sub(1, Ordering::SeqCst);
    }
}

#[must_use = "the transfer counts as running only while this is held"]
pub fn transfer() -> Transfer {
    TRANSFERS.fetch_add(1, Ordering::SeqCst);
    Transfer(())
}

/// Whether the daily check is due. A clock that went backwards counts as due, so
/// a wrong clock cannot silence checks for good.
fn check_due(enabled: bool, last: Option<i64>, now: i64) -> bool {
    enabled && last.is_none_or(|t| now < t || now - t >= CHECK_EVERY_SECS)
}

/// Whether a found update installs itself without asking. Both switches are
/// required even though the pane greys out the second without the first: Rust
/// does not take the pane's word for it.
fn should_install(cfg: &Config, status: &UpdateStatus, staged: Option<&str>) -> bool {
    let Some(version) = status.version.as_deref() else {
        return false;
    };
    let s = &cfg.settings;
    s.check_updates
        && s.install_updates
        && status.available
        && cfg.update_dismissed.as_deref() != Some(version)
        && staged != Some(version)
}

/// Whether the launch check opens the popover on what it found. The same rule
/// as the popover's line (`updateToAnnounce` in lib/updates.ts), which is what
/// the opened popover shows: nothing for a skipped version, or for one just
/// installed in the background — that one arrives on
/// its own, and an open popover would only hold its relaunch back.
fn announce_at_launch(cfg: &Config, status: &UpdateStatus, installed: bool) -> bool {
    let Some(version) = status.version.as_deref() else {
        return false;
    };
    status.available
        && !status.ready
        && !installed
        && cfg.update_dismissed.as_deref() != Some(version)
}

/// Everything a relaunch would interrupt.
#[derive(Debug, Default, Clone, Copy)]
struct Activity {
    popover: bool,
    preferences: bool,
    hud: bool,
    auto_beam: bool,
    transfers: usize,
    /// A partial beam's free retry, which does not survive the process.
    retry: bool,
    /// The main thread did not say what is on screen in time.
    unanswered: bool,
}

impl Activity {
    /// What is holding a relaunch back, if anything. Logged when it changes, so
    /// an installed update that never arrives says why in the diagnostic log.
    fn blocker(self) -> Option<&'static str> {
        [
            (self.unanswered, "the main thread did not answer"),
            (self.popover, "the popover is open"),
            (self.preferences, "Preferences is open"),
            (self.hud, "the HUD is showing"),
            (self.auto_beam, "automatic beaming is on"),
            (self.transfers > 0, "a transfer is running"),
            (self.retry, "a partial beam can still be retried"),
        ]
        .into_iter()
        .find_map(|(busy, why)| busy.then_some(why))
    }
}

/// Reads the windows on the main thread, where AppKit expects to be asked.
///
/// Through GCD (`crate::on_main`), not Tauri's `run_on_main_thread`: that goes
/// through the event-loop proxy, which the HUD's auto-hide found does not wake an
/// idle accessory app's run loop, and this only ever asks while nobody is using
/// Hostbeam. A main thread that does not answer within a few seconds is not a
/// quiet moment either.
fn activity(app: &AppHandle) -> Activity {
    let (tx, rx) = mpsc::channel();
    let handle = app.clone();
    crate::main_thread::on_main(move || {
        let popover = handle
            .get_webview_panel(crate::POPOVER)
            .is_ok_and(|p| p.is_visible());
        let hud = handle
            .get_webview_panel(crate::HUD)
            .is_ok_and(|p| p.is_visible());
        let preferences = handle
            .get_webview_window("preferences")
            .is_some_and(|w| w.is_visible().unwrap_or(true));
        let _ = tx.send((popover, hud, preferences));
    });
    let Ok((popover, hud, preferences)) = rx.recv_timeout(Duration::from_secs(5)) else {
        return Activity {
            unanswered: true,
            ..Activity::default()
        };
    };
    Activity {
        popover,
        preferences,
        hud,
        auto_beam: crate::auto_beam::is_armed(app),
        transfers: TRANSFERS.load(Ordering::SeqCst),
        retry: crate::beam::retry_outstanding(app),
        unanswered: false,
    }
}

/// Whether the installer can put the new bundle in place as this user. When it
/// cannot, the updater falls back to an administrator-password prompt. That is
/// fine after a click on "Update & relaunch", but a password dialog appearing
/// out of nowhere is the one thing installing without asking must never do.
fn can_replace_bundle() -> bool {
    let Some(bundle) = std::env::current_exe()
        .ok()
        .and_then(|exe| app_bundle(&exe))
    else {
        return false;
    };
    let Some(parent) = bundle.parent() else {
        return false;
    };
    writable(&bundle) && writable(parent)
}

/// `…/Hostbeam.app/Contents/MacOS/hostbeam` → `…/Hostbeam.app`.
fn app_bundle(exe: &Path) -> Option<PathBuf> {
    exe.ancestors()
        .find(|p| p.extension().is_some_and(|e| e == "app"))
        .map(Path::to_path_buf)
}

fn writable(path: &Path) -> bool {
    let Ok(c) = CString::new(path.as_os_str().as_bytes()) else {
        return false;
    };
    // SAFETY: `c` is a valid NUL-terminated path that outlives the call, and
    // access(2) only reads it.
    unsafe { libc::access(c.as_ptr(), libc::W_OK) == 0 }
}

/// Checks download.hostbeam.app for a newer version.
/// Hands back the plugin's `Update` too, which is what an install needs.
async fn check(app: &AppHandle) -> Result<(UpdateStatus, Option<Update>), error::Error> {
    // Logged, unlike a bare `?`: the background check has no one to report to,
    // and an updater that cannot even be built would otherwise leave nothing in
    // the diagnostic log to say why no update ever arrives.
    let updater = app.updater().map_err(|e| {
        log::warn(format!("update check could not start: {e}"));
        error::Error::Update(e.to_string())
    })?;
    let (status, update) = match updater.check().await {
        Ok(Some(update)) => {
            log::info(format!("update check: {} available", update.version));
            let status = UpdateStatus {
                available: true,
                version: Some(update.version.clone()),
                notes: update_notes::notes_since(&update.current_version, &update.raw_json)
                    .or_else(|| update.body.clone().filter(|b| !b.trim().is_empty())),
                ready: false,
            };
            (app.state::<UpdateState>().with_ready(status), Some(update))
        }
        Ok(None) => {
            log::info("update check: up to date");
            (UpdateStatus::default(), None)
        }
        Err(e) => {
            log::warn(format!("update check failed: {e}"));
            return Err(error::Error::Update(e.to_string()));
        }
    };
    app.state::<UpdateState>().remember(&status);
    Ok((status, update))
}

/// Downloads, verifies and puts the new bundle in place, returning whether it
/// did. The relaunch waits for a quiet moment; see [`tick`].
async fn install_quietly(app: &AppHandle, update: &Update) -> bool {
    if !can_replace_bundle() {
        log::info(format!(
            "update {}: not installing without asking — the app's folder is not \
             writable, so the installer would ask for an administrator password",
            update.version
        ));
        return false;
    }
    log::info(format!("downloading update {} to install", update.version));
    let bytes = match update.download(|_, _| {}, || {}).await {
        Ok(bytes) => bytes,
        Err(e) => {
            log::warn(format!("update {} download failed: {e}", update.version));
            return false;
        }
    };
    if let Err(e) = update.install(bytes) {
        log::warn(format!("update {} install failed: {e}", update.version));
        return false;
    }
    log::info(format!(
        "update {} installed — relaunching once Hostbeam is not in use",
        update.version
    ));
    app.state::<UpdateState>().stage(&update.version);
    true
}

#[derive(Default)]
struct Watch {
    last_check: Option<i64>,
    quiet_polls: u32,
    /// The last reason logged for not relaunching yet.
    blocker: Option<&'static str>,
    /// Whether this launch's first wake has run. That wake logs what the update
    /// switches are set to, and its check is the only one that opens the
    /// popover. A launch check that fails (no network yet at login) is retried
    /// an hour later like any other, but opening the popover then would be
    /// out of nowhere, so the retry does not.
    launched: bool,
}

/// One wake of the watcher; returns how long to sleep before the next.
async fn tick(app: &AppHandle, watch: &mut Watch) -> Duration {
    if let Some(version) = app.state::<UpdateState>().staged() {
        let blocker = activity(app).blocker();
        if blocker != watch.blocker {
            if let Some(why) = blocker {
                log::info(format!("update {version} waiting to relaunch: {why}"));
            }
            watch.blocker = blocker;
        }
        watch.quiet_polls = if blocker.is_none() {
            watch.quiet_polls + 1
        } else {
            0
        };
        if watch.quiet_polls >= QUIET_POLLS_BEFORE_RELAUNCH {
            log::info(format!(
                "relaunching into {version}, installed in the background"
            ));
            // On the main thread, where `restart` exits directly. From this
            // thread it would go through the event-loop proxy (see `activity`).
            let handle = app.clone();
            crate::main_thread::on_main(move || {
                handle.restart();
            });
        }
        return QUIET_POLL;
    }

    let cfg = config::read(app);
    let at_launch = !watch.launched;
    if at_launch {
        // Once per launch, so a diagnostic log always says whether this Mac was
        // going to check at all — the usual first question when no update came.
        let s = &cfg.settings;
        log::info(format!(
            "updates: checking {}, installing without asking {}",
            if s.check_updates { "on" } else { "off" },
            if s.check_updates && s.install_updates {
                "on"
            } else {
                "off"
            },
        ));
        watch.launched = true;
    }
    let now = chrono::Utc::now().timestamp();
    if !check_due(cfg.settings.check_updates, watch.last_check, now) {
        return WAKE;
    }
    // Failures are logged inside and retried at the next wake; the cache keeps
    // its last good value.
    let Ok((status, update)) = check(app).await else {
        return WAKE;
    };
    watch.last_check = Some(now);
    let installed = match update.filter(|_| should_install(&cfg, &status, None)) {
        Some(update) => install_quietly(app, &update).await,
        None => false,
    };
    if at_launch && announce_at_launch(&cfg, &status, installed) {
        log::info(format!(
            "update {}: opening the popover to announce it",
            status.version.as_deref().unwrap_or_default()
        ));
        // AppKit, so on the main thread, through GCD (see `activity`).
        let handle = app.clone();
        crate::main_thread::on_main(move || crate::popover::show_panel(&handle));
    }
    pause_after_check(installed)
}

/// How long to sleep after a check. Straight after an install the next wake is
/// the first look for a quiet moment, so it comes within the minute; sleeping the
/// usual hour is how an update installed in testing sat on disk, never
/// relaunched into.
fn pause_after_check(installed: bool) -> Duration {
    if installed {
        QUIET_POLL
    } else {
        WAKE
    }
}

/// Starts the watcher. A plain sleeper thread (not a tokio timer): it must
/// outlive any webview, and it is asleep nearly all the time.
pub fn start(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(FIRST_CHECK_DELAY);
        let mut watch = Watch::default();
        loop {
            let pause = tauri::async_runtime::block_on(tick(&app, &mut watch));
            std::thread::sleep(pause);
        }
    });
}

/// Manual check from the About pane.
#[tauri::command]
pub async fn update_check(app: AppHandle) -> Result<UpdateStatus, error::CommandError> {
    Ok(check(&app).await?.0)
}

/// The cached update state — no network. The popover polls this on show.
#[tauri::command]
#[must_use]
pub fn update_available(state: tauri::State<'_, UpdateState>) -> UpdateStatus {
    state.cached()
}

/// Download + install the available update, then relaunch. Re-checks rather
/// than trusting the webview's state.
#[tauri::command]
pub async fn update_install(app: AppHandle) -> Result<(), error::CommandError> {
    if let Some(version) = app.state::<UpdateState>().staged() {
        // Already on disk from a background install: the relaunch is all that
        // is left, and someone just asked for it.
        log::info(format!("relaunching into {version} on request"));
        app.restart();
    }
    let updater = app
        .updater()
        .map_err(|e| error::Error::Update(e.to_string()))?;
    let update = updater
        .check()
        .await
        .map_err(|e| error::Error::Update(e.to_string()))?
        .ok_or_else(|| error::Error::Update("no update available".into()))?;
    log::info(format!("installing update {}", update.version));
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| error::Error::Update(e.to_string()))?;
    log::info("update installed — relaunching");
    app.restart();
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const DAY: i64 = CHECK_EVERY_SECS;

    fn found(version: &str) -> UpdateStatus {
        UpdateStatus {
            available: true,
            version: Some(version.into()),
            ..UpdateStatus::default()
        }
    }

    fn cfg(check: bool, install: bool, skipped: Option<&str>) -> Config {
        serde_json::from_value(json!({
            "settings": { "checkUpdates": check, "installUpdates": install },
            "updateDismissed": skipped,
        }))
        .unwrap()
    }

    #[test]
    fn a_first_check_is_due_straight_away() {
        assert!(check_due(true, None, 1_000));
    }

    #[test]
    fn checks_are_a_day_apart() {
        assert!(!check_due(true, Some(1_000), 1_000 + DAY - 1));
        assert!(check_due(true, Some(1_000), 1_000 + DAY));
    }

    #[test]
    fn checking_switched_off_never_checks() {
        assert!(!check_due(false, None, 1_000));
        assert!(!check_due(false, Some(0), 10 * DAY));
    }

    #[test]
    fn a_clock_set_backwards_does_not_silence_checks() {
        assert!(check_due(true, Some(10 * DAY), DAY));
    }

    #[test]
    fn installs_only_with_both_switches_on() {
        let status = found("0.1.20");
        assert!(should_install(&cfg(true, true, None), &status, None));
        assert!(!should_install(&cfg(true, false, None), &status, None));
        // The pane greys this combination out; Rust refuses it regardless.
        assert!(!should_install(&cfg(false, true, None), &status, None));
    }

    #[test]
    fn a_config_from_before_the_switches_never_installs() {
        // Every Mac upgrading into this version: checking on, installing off.
        let old: Config = serde_json::from_value(json!({ "settings": {} })).unwrap();
        assert!(!should_install(&old, &found("0.1.20"), None));
    }

    #[test]
    fn a_skipped_version_is_not_installed_but_a_newer_one_is() {
        let skipped = cfg(true, true, Some("0.1.20"));
        assert!(!should_install(&skipped, &found("0.1.20"), None));
        assert!(should_install(&skipped, &found("0.1.21"), None));
    }

    #[test]
    fn a_version_already_installed_is_not_installed_again() {
        let on = cfg(true, true, None);
        assert!(!should_install(&on, &found("0.1.20"), Some("0.1.20")));
        assert!(should_install(&on, &found("0.1.21"), Some("0.1.20")));
    }

    #[test]
    fn no_version_means_nothing_to_install() {
        let status = UpdateStatus {
            available: true,
            ..UpdateStatus::default()
        };
        assert!(!should_install(&cfg(true, true, None), &status, None));
    }

    #[test]
    fn a_found_update_is_announced_at_launch() {
        assert!(announce_at_launch(
            &cfg(true, false, None),
            &found("0.1.28"),
            false
        ));
    }

    #[test]
    fn nothing_to_announce_when_up_to_date() {
        let on = cfg(true, false, None);
        assert!(!announce_at_launch(&on, &UpdateStatus::default(), false));
    }

    #[test]
    fn a_skipped_version_is_not_announced_but_a_newer_one_is() {
        let skipped = cfg(true, false, Some("0.1.28"));
        assert!(!announce_at_launch(&skipped, &found("0.1.28"), false));
        assert!(announce_at_launch(&skipped, &found("0.1.29"), false));
    }

    #[test]
    fn an_update_installed_in_the_background_is_not_announced() {
        let on = cfg(true, true, None);
        assert!(!announce_at_launch(&on, &found("0.1.28"), true));
        let ready = UpdateStatus {
            ready: true,
            ..found("0.1.28")
        };
        assert!(!announce_at_launch(&on, &ready, false));
    }

    #[test]
    fn quiet_means_nothing_at_all_is_going_on() {
        assert_eq!(Activity::default().blocker(), None);
        // A main thread that never answered is not evidence of quiet: treating
        // it as quiet would relaunch over whatever it was busy with.
        let unanswered = Activity {
            unanswered: true,
            ..Activity::default()
        };
        assert_eq!(unanswered.blocker(), Some("the main thread did not answer"));
        let busy = [
            Activity {
                popover: true,
                ..Activity::default()
            },
            Activity {
                preferences: true,
                ..Activity::default()
            },
            Activity {
                hud: true,
                ..Activity::default()
            },
            // Its armed state is not persisted, so a relaunch would silently
            // switch it off in the middle of a session.
            Activity {
                auto_beam: true,
                ..Activity::default()
            },
            Activity {
                transfers: 1,
                ..Activity::default()
            },
            Activity {
                retry: true,
                ..Activity::default()
            },
        ];
        for activity in busy {
            assert!(
                activity.blocker().is_some(),
                "{activity:?} should not be quiet"
            );
        }
    }

    #[test]
    fn an_install_looks_for_a_quiet_moment_within_the_minute() {
        assert_eq!(pause_after_check(true), QUIET_POLL);
        assert_eq!(pause_after_check(false), WAKE);
    }

    #[test]
    fn transfers_count_while_held() {
        let before = TRANSFERS.load(Ordering::SeqCst);
        let a = transfer();
        let b = transfer();
        assert_eq!(TRANSFERS.load(Ordering::SeqCst), before + 2);
        drop(a);
        drop(b);
        assert_eq!(TRANSFERS.load(Ordering::SeqCst), before);
    }

    #[test]
    fn finds_the_bundle_from_the_executable() {
        let exe = Path::new("/Applications/Hostbeam.app/Contents/MacOS/hostbeam");
        assert_eq!(
            app_bundle(exe),
            Some(PathBuf::from("/Applications/Hostbeam.app"))
        );
        // `cargo run` has no bundle, so there is nothing to replace.
        assert_eq!(app_bundle(Path::new("/tmp/target/debug/hostbeam")), None);
    }
}
