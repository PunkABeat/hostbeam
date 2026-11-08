//! The floating beam HUD: a second non-activating panel, top-center, driven
//! entirely from Rust. A silent shortcut beam runs while the popover is hidden,
//! and a hidden panel's webview is suspended — so a completion callback there
//! would not run until a click woke it. Rust is never suspended, so `beam`
//! calls these directly. Every HUD op is dispatched onto the GCD main queue: it
//! runs AppKit and the eval on the main thread and wakes an idle run loop.

use std::sync::atomic::{AtomicU64, Ordering};

use dispatch2::{DispatchQueue, DispatchTime};
use tauri::{AppHandle, LogicalPosition, Manager, WebviewWindow};
use tauri_nspanel::{ManagerExt, WebviewWindowExt};

use crate::main_thread::on_main;
use crate::popover::{show_panel, target_screen, NON_ACTIVATING_PANEL, PANEL_LEVEL};
use crate::ui_bridge::{HudPhase, Target, UiMessage};
use crate::{log, ui_bridge, HUD};

/// Generation counter so a newer beam cancels a pending HUD auto-hide. Bumped
/// when a beam starts; a scheduled hide only fires if the generation still
/// matches. Managed by Tauri.
#[derive(Default)]
pub struct HudGeneration(AtomicU64);

fn bump_generation(app: &AppHandle) {
    app.state::<HudGeneration>()
        .0
        .fetch_add(1, Ordering::SeqCst);
}

/// Relay a HUD state (`phase` + host name, and the error code on failure) to the
/// HUD webview.
pub(crate) fn hud_eval(app: &AppHandle, phase: HudPhase, host: &str, error: Option<&str>) {
    hud_eval_with(app, phase, host, error, None, None);
}

/// How long a landed beam stays up: a glance. One carrying the reminder stays
/// as long as a failure does, so the line can be read, and clicked.
const DONE_MS: u64 = 1600;
const REMIND_MS: u64 = 4500;

/// As [`hud_eval`], plus how far a multi-file beam has got. `progress` is
/// `(sent, total)`; `None` — or a total of one — leaves the HUD saying what it
/// always said, since "1 of 1" is noise.
pub(crate) fn hud_eval_with(
    app: &AppHandle,
    phase: HudPhase,
    host: &str,
    error: Option<&str>,
    progress: Option<(usize, usize)>,
    file: Option<&str>,
) {
    let (sent, total) = progress.unwrap_or((0, 0));
    ui_bridge::send(
        app,
        Target::Hud,
        &UiMessage::Hud {
            phase,
            host: host.to_string(),
            error: error.map(str::to_string),
            sent,
            total,
            file: file.map(str::to_string),
            remind: false,
        },
    );
}

/// One file of a batch has landed. Relayed to whichever surface is showing this
/// beam — the HUD for a silent shortcut beam, the popover otherwise — by the
/// same eval relay everything else here uses, rather than Tauri's event system:
/// one mechanism in this app, and it already works with a suspended webview.
///
/// Silent for a single file. "Beaming 1 of 1" tells nobody anything, and every
/// clipboard beam is one file.
pub(crate) fn beam_progress(app: &AppHandle, host: &str, sent: usize, total: usize) {
    if total < 2 {
        return;
    }
    let (app, host) = (app.clone(), host.to_string());
    on_main(move || {
        hud_eval_with(
            &app,
            HudPhase::Uploading,
            &host,
            None,
            Some((sent, total)),
            None,
        );
        ui_bridge::send(&app, Target::Popover, &UiMessage::Progress { sent, total });
    });
}

/// Beam started: show the HUD (top-center) in its in-flight state. `file` is
/// the one file a single-file beam carries, by name, so the HUD shows that
/// rather than whatever picture happens to be on the clipboard; None for a
/// clipboard picture and for a batch. Sent again, with the name, once a
/// clipboard beam finds it is carrying a file copied in Finder.
pub(crate) fn hud_uploading(app: &AppHandle, host: String, file: Option<String>) {
    // A new beam supersedes any pending auto-hide.
    bump_generation(app);
    let app = app.clone();
    on_main(move || {
        // Content first — no stale-frame flash.
        hud_eval_with(
            &app,
            HudPhase::Uploading,
            &host,
            None,
            None,
            file.as_deref(),
        );
        if let Ok(panel) = app.get_webview_panel(HUD) {
            if let Some(window) = app.get_webview_window(HUD) {
                position_hud(&window);
            }
            panel.show();
        }
    });
}

/// Beam landed: flip the HUD to "done" and schedule its auto-dismiss. With
/// `remind`, the HUD asks for a license under it (ADR 0028).
pub(crate) fn hud_done(app: &AppHandle, host: String, remind: bool) {
    let a = app.clone();
    on_main(move || {
        ui_bridge::send(
            &a,
            Target::Hud,
            &UiMessage::Hud {
                phase: HudPhase::Done,
                host,
                error: None,
                sent: 0,
                total: 0,
                file: None,
                remind,
            },
        );
    });
    schedule_hud_hide(app, if remind { REMIND_MS } else { DONE_MS });
}

/// Some of the batch landed and some did not. Its own state, held as long as a
/// failure: "3 of 5" is the one thing worth reading before it goes, and calling
/// it done would be a lie the user only discovers on the host.
pub(crate) fn hud_partial(app: &AppHandle, host: String, sent: usize, total: usize) {
    let a = app.clone();
    on_main(move || {
        hud_eval_with(
            &a,
            HudPhase::Partial,
            &host,
            None,
            Some((sent, total)),
            None,
        )
    });
    schedule_hud_hide(app, 4500);
}

/// Beam failed: show the HUD's failure state (keyed by the error code) and hold it
/// a little longer so it's noticed before it auto-dismisses.
pub(crate) fn hud_failed(app: &AppHandle, host: String, code: String) {
    let a = app.clone();
    on_main(move || hud_eval(&a, HudPhase::Failed, &host, Some(&code)));
    schedule_hud_hide(app, 4500);
}

/// Hide the HUD panel now (on the main thread).
pub(crate) fn hud_dismiss(app: &AppHandle) {
    let app = app.clone();
    on_main(move || {
        if let Ok(panel) = app.get_webview_panel(HUD) {
            if panel.is_visible() {
                panel.order_out(None);
            }
        }
    });
}

/// The user clicked the HUD: dismiss it and open the popover — the full UI, i.e.
/// beam progress / recent, or the failure card with recovery actions. Showing the
/// popover wakes its (suspended) webview, which then renders the current beam state.
/// With `license`, the click was on the reminder, and the popover opens on its
/// license card.
#[tauri::command]
pub fn hud_open(app: AppHandle, license: Option<bool>) {
    bump_generation(&app); // cancel the pending auto-hide
    hud_dismiss(&app);
    if license.unwrap_or(false) {
        // Sent before the panel shows: the eval reaches the webview the moment
        // it wakes (ui_bridge.rs), and the card is then its first frame.
        ui_bridge::send(&app, Target::Popover, &UiMessage::ShowLicense);
    }
    show_panel(&app);
}

/// Hide the HUD after `delay_ms`, unless a newer beam has started (tracked by
/// `HudGeneration`). `dispatch_after` on the main queue runs `order_out` on the main
/// thread and wakes an idle run loop.
pub(crate) fn schedule_hud_hide(app: &AppHandle, delay_ms: u64) {
    let generation = app.state::<HudGeneration>().0.load(Ordering::SeqCst);
    let app = app.clone();
    let when = DispatchTime::try_from(std::time::Duration::from_millis(delay_ms))
        .unwrap_or(DispatchTime::NOW);
    let _ = DispatchQueue::main().after(when, move || {
        if app.state::<HudGeneration>().0.load(Ordering::SeqCst) != generation {
            return; // superseded by a newer beam
        }
        if let Ok(panel) = app.get_webview_panel(HUD) {
            if panel.is_visible() {
                panel.order_out(None);
            }
        }
    });
}

/// Position the beam HUD centered horizontally on the screen holding the
/// pointer, just below the menu bar — the screen the popover would open on
/// (`popover::target_screen`). (Single source of truth for "top-center of the
/// screen.")
///
/// In points, for the reason `popover::position_panel` gives: in pixels, a HUD
/// made on a 1× screen landed half off a 2× primary one.
pub(crate) fn position_hud(window: &WebviewWindow) {
    let Some((screen, _)) = target_screen(window) else {
        return;
    };
    let (Ok(wsize), Ok(scale)) = (window.outer_size(), window.scale_factor()) else {
        return;
    };
    let width = wsize.to_logical::<f64>(scale).width;
    let x = screen.x + (screen.width - width) / 2.0;
    // Just below the menu bar / notch.
    let y = screen.y + 36.0;
    log::warn_if_err(
        "position hud",
        window.set_position(LogicalPosition::new(x, y)),
    );
}

/// Convert the HUD window into a non-activating, floating NSPanel like the popover,
/// but simpler: it never takes focus and has no click-away delegate (it dismisses
/// itself on a timer). Non-critical, so failures are logged, not fatal.
#[allow(deprecated)]
pub(crate) fn configure_hud_panel(app: &AppHandle) {
    use tauri_nspanel::cocoa::appkit::NSWindowCollectionBehavior;

    let Some(window) = app.get_webview_window(HUD) else {
        log::warn("hud window missing — skipping panel setup");
        return;
    };
    let panel = match window.to_panel() {
        Ok(panel) => panel,
        Err(_) => {
            log::warn("could not convert hud window to panel");
            return;
        }
    };
    panel.set_level(PANEL_LEVEL);
    panel.set_style_mask(NON_ACTIVATING_PANEL);
    panel.set_collection_behaviour(
        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
    );
    panel.set_floating_panel(true);
    panel.set_becomes_key_only_if_needed(true);
    panel.order_out(None);
}
