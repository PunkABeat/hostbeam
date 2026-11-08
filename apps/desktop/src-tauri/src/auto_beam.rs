//! Beam a screenshot as it is taken, whoever took it.
//!
//! Every capture tool — the stock `⌃⌘⇧4`, CleanShot, Shottr, a snip pasted out
//! of Preview — ends the same way: an image on the clipboard. So Hostbeam does
//! not need its own capture (and the Screen Recording permission that would
//! come with it) to remove the second keystroke. It only needs to notice.
//!
//! **This does not read your clipboard.** It polls `NSPasteboard`'s
//! `changeCount`, which is an integer that increments when *anything* is copied
//! — no contents, no types, no data. Only when that number moves does it ask
//! the pasteboard whether an image is among the available *types*, which is
//! still metadata. The pixels are read exactly once, by the existing beam path,
//! after the decision to send has already been made. That ordering is the whole
//! privacy argument for the feature, and it is why the poll needs no permission
//! and raises no prompt.
//!
//! One exception, narrower than it sounds: when a copy carries both a real
//! picture and a file link — what CleanShot X leaves — it reads the linked
//! files' *names* (never their contents) to check they are pictures too, since
//! only then does the beam send the picture. A copy in Finder is decided from
//! its types alone: it names a file and carries no picture, so it is never
//! beamed. Copying a file is not taking a screenshot.
//!
//! The type questions go through `clipboard.rs` like every other use of the
//! pasteboard — one at a time, AppKit exceptions caught (0.1.27).
//!
//! **It is off until you turn it on, every launch.** The armed state is
//! deliberately not persisted: an app that resumed sending screenshots to a
//! server because of a switch flipped last Tuesday would be a different and
//! much worse product. The *expiry* is a setting; the arming is not.

use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};

use crate::log;
use crate::ui_bridge::{self, Target, UiMessage};

/// How often the counter is checked. A `changeCount` read is a message send
/// returning an integer, so this is free in any sense that matters; the interval
/// is set by how soon after a capture a beam should start, not by cost.
const POLL: Duration = Duration::from_millis(400);

/// What one look at the counter concluded. Returned rather than acted on so the
/// decision is a pure function of the state and can be tested without an app,
/// a clipboard, or a host.
#[derive(Debug, PartialEq, Eq)]
pub enum Step {
    /// Nothing to do.
    Idle,
    /// The arming window ran out. Disarm and say so.
    Expired,
    /// Something new was copied while armed. Worth looking at.
    Copied,
}

#[derive(Default)]
pub struct AutoBeam {
    armed: bool,
    /// When arming stops. `None` while armed means "until turned off".
    until: Option<Instant>,
    /// The counter as of the last look. Set when arming so that whatever was
    /// already on the clipboard is not treated as new and beamed immediately.
    last_count: i64,
}

impl AutoBeam {
    /// Arm or disarm, taking the counter's current value so that the image
    /// already on the clipboard is not mistaken for one copied afterwards.
    fn set(&mut self, armed: bool, until: Option<Instant>, count: i64) {
        self.armed = armed;
        self.until = if armed { until } else { None };
        self.last_count = count;
    }

    /// Advance the state by one poll.
    fn step(&mut self, now: Instant, count: i64) -> Step {
        if self.armed && self.until.is_some_and(|deadline| now >= deadline) {
            self.armed = false;
            self.until = None;
            self.last_count = count;
            return Step::Expired;
        }
        // The counter is followed while disarmed too, so arming never inherits a
        // change that happened while the switch was off.
        let moved = count != self.last_count;
        self.last_count = count;
        if self.armed && moved {
            Step::Copied
        } else {
            Step::Idle
        }
    }
}

pub type State = Mutex<AutoBeam>;

fn with<T>(app: &AppHandle, f: impl FnOnce(&mut AutoBeam) -> T) -> T {
    let state = app.state::<State>();
    let mut guard = state.lock().unwrap_or_else(|poisoned| {
        log::warn("auto-beam state was poisoned by a panic; continuing with it");
        poisoned.into_inner()
    });
    f(&mut guard)
}

/// The pasteboard's change counter — a counter, not content. `None` when the
/// read failed, which the callers treat as "no change", never as a new copy.
fn change_count() -> Option<i64> {
    crate::clipboard::change_count().ok()
}

/// Whether this copy is a picture a beam would send as one — never a copied
/// file, never a text copy. Types first; see the module note for the one case
/// that also reads file names.
fn is_picture() -> bool {
    use crate::clipboard::{self, Source};
    let kinds = match clipboard::kinds() {
        Ok(kinds) => kinds,
        Err(e) => {
            log::warn(format!(
                "auto-beam: could not read the clipboard's types: {e}"
            ));
            return false;
        }
    };
    // Decided from types alone: no file link means today's rule, and a file
    // link with no real picture is a Finder copy.
    if !kinds.files {
        return kinds.image;
    }
    if !kinds.picture {
        return false;
    }
    // A picture *and* a file link: send only if the beam would send the
    // picture. On any error, do not beam — a missed screenshot is recoverable,
    // an unwanted upload is not.
    matches!(clipboard::current(), Ok(Source::Image))
}

/// Arm or disarm. Arming records the current counter, so the image already on
/// the clipboard when the switch is flipped is not mistaken for a new one.
pub fn set(app: &AppHandle, enabled: bool) {
    let minutes = crate::config::read(app).settings.auto_beam_minutes;
    let until =
        (enabled && minutes > 0).then(|| Instant::now() + Duration::from_secs(minutes * 60));
    // Read before taking the state lock, so the two locks never nest.
    let count = change_count();
    with(app, |s| {
        let count = count.unwrap_or(s.last_count);
        s.set(enabled, until, count);
    });
    log::info(format!(
        "auto-beam {} ({})",
        if enabled { "armed" } else { "disarmed" },
        if minutes > 0 {
            format!("{minutes}m")
        } else {
            "no expiry".to_string()
        },
    ));
    announce(app, enabled);
}

/// Flip the switch — what the optional global shortcut does. Toggling rather
/// than arming keeps one key doing one thing; "press again to extend the
/// window" would be ambiguous about what the window then is.
///
/// An accidental press is not silent: the menu-bar badge appears or clears
/// immediately, and the first screenshot after an accidental arm shows the same
/// HUD a manual beam does, because it *is* a manual beam's code path.
pub fn toggle(app: &AppHandle) {
    let now = is_armed(app);
    set(app, !now);
}

#[must_use]
pub fn is_armed(app: &AppHandle) -> bool {
    with(app, |s| s.armed)
}

/// Tell the popover and the menu bar what the state is now.
fn announce(app: &AppHandle, armed: bool) {
    ui_bridge::send(app, Target::Popover, &UiMessage::AutoBeam { armed });
    crate::tray::refresh(app);
}

/// One look at the counter, and what to do about it. The decision lives in
/// [`AutoBeam::step`]; this is the part that needs an app.
fn tick(app: &AppHandle) {
    let now = Instant::now();
    let Some(count) = change_count() else {
        return;
    };
    match with(app, |s| s.step(now, count)) {
        Step::Idle => return,
        Step::Expired => {
            log::info("auto-beam expired");
            announce(app, false);
            return;
        }
        Step::Copied => {}
    }

    // Something was copied. Only now is the pasteboard asked anything about it,
    // and only about its types.
    if !is_picture() {
        return;
    }
    // A beam needs somewhere to go. Without a host this would fail once per
    // copy, so it is checked here rather than surfaced as a stream of errors.
    if crate::config::read(app).added_ids.is_empty() {
        log::info("auto-beam: image copied, but no host is configured");
        return;
    }

    log::info("auto-beam: new image on the clipboard → beam");
    // The same call the beam shortcut makes. Reusing it means auto-beam gets the
    // reminder's count, the HUD, the Recent entry, the pasted sentence, and the
    // error taxonomy for nothing, and can never drift from a manual beam.
    ui_bridge::send(app, Target::Popover, &UiMessage::Beam);
}

/// Start the watcher. Runs for the life of the app and does nothing measurable
/// while disarmed, which is the common case.
pub fn start(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(POLL);
        tick(&app);
    });
}

#[tauri::command]
pub fn auto_beam_set(app: AppHandle, enabled: bool) {
    set(&app, enabled);
}

#[tauri::command]
#[must_use]
pub fn auto_beam_state(app: AppHandle) -> bool {
    is_armed(&app)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn armed_forever() -> AutoBeam {
        let mut s = AutoBeam::default();
        s.set(true, None, 100);
        s
    }

    #[test]
    fn arming_does_not_beam_what_was_already_on_the_clipboard() {
        // You copy a screenshot, *then* flip the switch. That image was not
        // copied "while armed" and must not be sent.
        let mut s = armed_forever();
        assert_eq!(s.step(Instant::now(), 100), Step::Idle);
    }

    #[test]
    fn a_copy_while_armed_fires_once() {
        let mut s = armed_forever();
        assert_eq!(s.step(Instant::now(), 101), Step::Copied);
        // The same counter value is not a second copy — a repeated poll of an
        // unchanged clipboard must never beam again.
        assert_eq!(s.step(Instant::now(), 101), Step::Idle);
    }

    #[test]
    fn copies_while_disarmed_are_followed_but_never_fire() {
        let mut s = AutoBeam::default();
        s.set(false, None, 100);
        assert_eq!(s.step(Instant::now(), 101), Step::Idle);
        assert_eq!(s.step(Instant::now(), 102), Step::Idle);
        // Arming now must not treat 102 as new; only a *later* copy counts.
        s.set(true, None, 102);
        assert_eq!(s.step(Instant::now(), 102), Step::Idle);
        assert_eq!(s.step(Instant::now(), 103), Step::Copied);
    }

    #[test]
    fn expiry_disarms_exactly_once() {
        let mut s = AutoBeam::default();
        let now = Instant::now();
        s.set(true, Some(now + Duration::from_secs(60)), 1);
        assert_eq!(s.step(now, 1), Step::Idle);
        assert_eq!(s.step(now + Duration::from_secs(61), 1), Step::Expired);
        // Once expired it is disarmed, so later copies are ignored rather than
        // reporting Expired forever.
        assert_eq!(s.step(now + Duration::from_secs(62), 2), Step::Idle);
    }

    #[test]
    fn a_copy_at_the_moment_of_expiry_does_not_slip_through() {
        // Expiry is checked before the counter, so a screenshot taken as the
        // window closes is not sent. Erring towards not sending is the whole
        // reason the window exists.
        let mut s = AutoBeam::default();
        let now = Instant::now();
        s.set(true, Some(now + Duration::from_secs(60)), 1);
        assert_eq!(s.step(now + Duration::from_secs(60), 2), Step::Expired);
    }

    #[test]
    fn no_expiry_means_it_stays_armed() {
        let mut s = armed_forever();
        let far = Instant::now() + Duration::from_secs(60 * 60 * 24);
        assert_eq!(s.step(far, 100), Step::Idle);
        assert_eq!(s.step(far, 101), Step::Copied);
    }

    #[test]
    fn disarming_clears_the_deadline() {
        let mut s = AutoBeam::default();
        let now = Instant::now();
        s.set(true, Some(now + Duration::from_secs(60)), 1);
        s.set(false, None, 1);
        // Well past the old deadline: disarmed is disarmed, not "expiring".
        assert_eq!(s.step(now + Duration::from_secs(600), 1), Step::Idle);
    }
}
