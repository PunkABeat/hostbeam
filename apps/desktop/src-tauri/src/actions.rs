//! What a gesture asks the app to do — the shortcut, the tray, an ⌥-click, a
//! dropped or opened file — and the one rule they share for when a beam goes
//! silently rather than through the popover.

use tauri::{AppHandle, Manager};

use crate::popover::{show_panel, toggle};
use crate::ui_bridge::{Target, UiMessage};
use crate::{config, log, ui_bridge, POPOVER};

/// Whether a beam gesture should send without opening anything. Both halves
/// are needed: "Beam immediately" is the user's answer, and an added host is
/// what makes a silent beam possible at all. Pure, so the rule is testable
/// without an app, a clipboard or a host — and shared, so the tray menu and
/// the shortcut can never drift apart on it.
pub(crate) fn beams_immediately(immediate: bool, has_host: bool) -> bool {
    // The popover beams to the default host, falling back to the first added
    // host, so any added host is a valid silent-beam target.
    immediate && has_host
}

/// Ask the popover's webview to beam. Its handler reads the clipboard, beams,
/// and only surfaces the popover on failure / nothing-to-beam — so a silent
/// beam never flashes a window.
pub(crate) fn beam_in_popover(app: &AppHandle) {
    ui_bridge::send(app, Target::Popover, &UiMessage::Beam);
}

/// Global-shortcut action. Beam silently when the settings ask for it; else
/// toggle the popover so the user can act — toggle, because the key that
/// showed it is the one that should put it away.
pub(crate) fn trigger_shortcut(app: &AppHandle) {
    let cfg = config::read(app);
    let immediate = cfg.settings.immediate;
    let has_host = !cfg.added_ids.is_empty();
    if beams_immediately(immediate, has_host) {
        log::info("shortcut pressed → immediate beam");
        beam_in_popover(app);
    } else {
        log::info(format!(
            "shortcut pressed → toggle popover (immediate={immediate}, has_host={has_host})"
        ));
        toggle(app, false);
    }
}

/// `NSEventModifierFlagOption`.
pub(crate) const OPTION_KEY: u64 = 1 << 19;

/// Whether these modifier flags mean "option held", ignoring the others: a
/// ⌥⇧-click is still an ⌥-click, the way every other modifier chord on a menu
/// bar icon behaves.
pub(crate) fn is_option_click(flags: u64) -> bool {
    flags & OPTION_KEY != 0
}

/// The modifiers held as a click is handled. The tray event does not carry
/// them, so they are read from `NSEvent` — which answers for right now, and
/// right now is a fraction of a millisecond after the mouse went up.
#[cfg(target_os = "macos")]
pub(crate) fn modifier_flags() -> u64 {
    use objc::{class, msg_send, sel, sel_impl};
    unsafe { msg_send![class!(NSEvent), modifierFlags] }
}

#[cfg(not(target_os = "macos"))]
pub(crate) fn modifier_flags() -> u64 {
    0
}

/// The tray menu's Beam item: the mouse's way to the gesture the shortcut
/// owns, since the popover's own button was otherwise the only one.
///
/// It makes the same decision the shortcut makes, with one difference — it
/// shows the popover where the shortcut toggles it. The tray menu can be
/// opened while the popover is up, and an item that says Beam and closes the
/// window instead is a small lie.
pub(crate) fn beam_from_tray(app: &AppHandle) {
    let cfg = config::read(app);
    let immediate = cfg.settings.immediate;
    let has_host = !cfg.added_ids.is_empty();
    if beams_immediately(immediate, has_host) {
        log::info("tray menu → immediate beam");
        beam_in_popover(app);
    } else {
        log::info(format!(
            "tray menu → show popover (immediate={immediate}, has_host={has_host})"
        ));
        show_panel(app);
    }
}

/// The tray's Switch host ▸ <host>. The same act as picking one in the
/// popover's switcher — choosing a host there *is* setting the default — so
/// nothing new is persisted, and the next beam, wherever it is started from,
/// goes to the host just chosen.
pub(crate) fn switch_host(app: &AppHandle, host_id: &str) {
    log::info(format!("tray menu → switch to {host_id}"));
    ui_bridge::send(
        app,
        Target::Popover,
        &UiMessage::SetHost {
            id: host_id.to_string(),
        },
    );
}

/// The tray's Recent ▸ <file>: put that beam's paste-ready text back on the
/// clipboard — what the beam put there (`beam::render_sentence`), which is
/// exactly what the row's own copy button gives you. A whole drop copies as the
/// drop it was.
pub(crate) fn copy_recent(app: &AppHandle, key: &str) {
    log::info(format!("tray menu → copy recent {key}"));
    ui_bridge::send(
        app,
        Target::Popover,
        &UiMessage::CopyRecent {
            key: key.to_string(),
        },
    );
}

/// Take files the app has been handed — a Dock drop, Finder's Open With,
/// `open -a Hostbeam a.png`, or a drop on the menu-bar icon (`tray_drop`).
/// Park them and nudge the popover; if the webview is not up yet — a cold
/// start, which is exactly what Open With does — it collects them on mount.
pub(crate) fn opened_files(app: &AppHandle, files: Vec<String>) {
    if files.is_empty() {
        return;
    }
    log::info(format!("asked to open {}", files.join(", ")));
    app.state::<PendingOpen>()
        .0
        .lock()
        .unwrap_or_else(|p| p.into_inner())
        .extend(files);
    ui_bridge::send(app, Target::Popover, &UiMessage::OpenedFile);
}

/// Files macOS asked us to open — dropped on the Dock icon, chosen through
/// Finder's Open With, or `open -a Hostbeam a.png b.png`. Parked here rather
/// than acted on directly because the popover's webview owns which host and
/// folder a beam goes to, and on a cold start that webview does not exist yet.
/// Whoever gets there first drains it; the other finds nothing, so a file is
/// never beamed twice.
///
/// A `Vec`, and appended to rather than replaced: macOS may deliver a
/// multi-file open as several events, and taking only the newest was how
/// selecting five images in Finder used to beam one. Managed by Tauri.
#[derive(Default)]
pub struct PendingOpen(std::sync::Mutex<Vec<String>>);

/// Take the file macOS asked us to open, if there is one. Called by the popover
/// when it mounts and whenever Rust nudges it.
#[tauri::command]
pub fn take_pending_open(pending: tauri::State<'_, PendingOpen>) -> Vec<String> {
    let files = std::mem::take(&mut *pending.0.lock().unwrap_or_else(|p| p.into_inner()));
    if !files.is_empty() {
        // The only line guaranteed to reach the log: on a cold start the open
        // event arrives before `log::init`, so the one below is written to a
        // logger that is not listening yet and vanishes.
        log::info(format!("opened file(s) collected: {}", files.join(", ")));
    }
    files
}

/// Dev/debug affordance: wipe the persisted config + localStorage and reload the
/// popover so first-run onboarding runs again. Temporary — exposed via the tray
/// menu while the app is in development.
pub(crate) fn restart_onboarding(app: &AppHandle) {
    log::info("onboarding restarted (config + localStorage cleared)");
    config::clear(app);
    if let Some(window) = app.get_webview_window(POPOVER) {
        log::warn_if_err(
            "onboarding reset eval",
            window.eval("window.localStorage.clear(); window.location.reload();"),
        );
    }
    show_panel(app);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_silent_beam_needs_both_the_setting_and_somewhere_to_send() {
        assert!(beams_immediately(true, true));
        // No host: the popover instead, which is where one gets added.
        assert!(!beams_immediately(true, false));
        // The user asked to see the popover before anything is sent.
        assert!(!beams_immediately(false, true));
        assert!(!beams_immediately(false, false));
    }

    #[test]
    fn option_is_what_makes_a_click_a_beam() {
        assert!(is_option_click(OPTION_KEY));
        // With other modifiers along for the ride.
        assert!(is_option_click(OPTION_KEY | 1 << 17 | 1 << 20));
        assert!(!is_option_click(0));
        // Shift, control, command on their own are a plain click.
        assert!(!is_option_click(1 << 17));
        assert!(!is_option_click(1 << 18));
        assert!(!is_option_click(1 << 20));
    }
}
