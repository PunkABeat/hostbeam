//! The Preferences window: a real window opened on demand, born hidden until
//! the frontend has painted, and the parked "check for updates" ask that the
//! tray sends to the About pane.

use dispatch2::{DispatchQueue, DispatchTime};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::error::{CommandError, Error};
use crate::main_thread::on_main;
use crate::ui_bridge::{Target, UiMessage};
use crate::{log, ui_bridge};

/// Set by the tray's Check for updates…, taken by the About pane. A cold
/// start has no webview to ask, and Preferences may open from nothing, so the
/// ask is parked the way an opened file is — whoever gets there first drains
/// it, and the pane's own guard makes a double ask harmless anyway. Managed
/// by Tauri.
#[derive(Default)]
pub struct PendingUpdateCheck(std::sync::atomic::AtomicBool);

/// Take the parked update check, if there is one. Called by the About pane on
/// mount, and by the nudge below when Preferences was already open.
#[tauri::command]
pub fn take_update_check(pending: tauri::State<'_, PendingUpdateCheck>) -> bool {
    pending.0.swap(false, std::sync::atomic::Ordering::Relaxed)
}

/// The tray's Check for updates…: open About and start the check there.
///
/// Not a silent check — "you are up to date" is an answer, and a menu item
/// that answers nothing at all has not done what it says. About owns the
/// whole flow (checking → up to date / a version to install), so the menu
/// sends the question to the screen that can show it.
pub(crate) fn check_updates_from_tray(app: &AppHandle) {
    app.state::<PendingUpdateCheck>()
        .0
        .store(true, std::sync::atomic::Ordering::Relaxed);
    log::warn_if_err(
        "open preferences → about (tray)",
        open_preferences(app.clone(), Some("about".into())),
    );
    // An already-open Preferences does not mount again, so it is nudged.
    ui_bridge::send(app, Target::Preferences, &UiMessage::CheckUpdates);
}

/// Set the Dock icon at runtime, for when the app is promoted to Regular (the
/// Preferences window, or the "Show in the Dock" setting). The bundled .app
/// gets its icon from icon.icns, but `tauri dev` runs the unbundled binary,
/// which otherwise shows the generic "exec" icon. This fixes the Dock tile
/// only: the ⌘⇥ switcher takes its image from the bundle, so the bare dev
/// binary stays generic there (observed 2026-09-06); the bundled app is right
/// in both. Harmless when bundled — it re-applies the same artwork.
#[cfg(target_os = "macos")]
#[allow(deprecated)] // `cocoa` is deprecated wholesale; tauri-nspanel still pins it (see below)
pub(crate) fn set_dock_icon() {
    use tauri_nspanel::cocoa::appkit::{NSApp, NSApplication, NSImage};
    use tauri_nspanel::cocoa::base::nil;
    use tauri_nspanel::cocoa::foundation::NSData;

    // The padded variant: content at ~80% on a transparent canvas, matching
    // the macOS icon grid (a full-bleed icon reads oversized in the Dock/⌘⇥).
    static ICON_PNG: &[u8] = include_bytes!("../icons/icon-dock.png");
    on_main(|| unsafe {
        let data = NSData::dataWithBytes_length_(
            nil,
            ICON_PNG.as_ptr() as *const std::os::raw::c_void,
            ICON_PNG.len() as u64,
        );
        let image = NSImage::initWithData_(NSImage::alloc(nil), data);
        if image != nil {
            NSApp().setApplicationIconImage_(image);
        }
    });
}

/// Opens (or focuses) the standalone preferences window.
#[tauri::command]
pub fn open_preferences(app: AppHandle, tab: Option<String>) -> Result<(), CommandError> {
    // Restrict the tab to a known, safe slug before interpolating into JS / a URL.
    let tab = tab.filter(|t| t.chars().all(|c| c.is_ascii_lowercase()));
    log::info(format!("preferences opened (tab={tab:?})"));
    // Menu-bar managers (Bartender/Ice/…) interfere with an accessory app's real
    // windows (Preferences could show then vanish). Become a regular (Dock-icon) app
    // while a real window is open; the window-close handler drops back to Accessory.
    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
        set_dock_icon();
    }
    if let Some(window) = app.get_webview_window("preferences") {
        log::warn_if_err("show preferences", window.show());
        log::warn_if_err("focus preferences", window.set_focus());
        if let Some(t) = &tab {
            // The Preferences app listens for hashchange and switches tabs. The
            // slug is already a plain word; it is encoded anyway, like every
            // other value that sits inside a script.
            let arg = serde_json::to_string(t).unwrap_or_default();
            log::warn_if_err(
                "preferences tab eval",
                window.eval(format!("window.location.hash = {arg}")),
            );
        }
        return Ok(());
    }
    let url = match &tab {
        Some(t) => format!("preferences.html#{t}"),
        None => "preferences.html".to_string(),
    };
    WebviewWindowBuilder::new(&app, "preferences", WebviewUrl::App(url.into()))
        .title("Hostbeam Preferences")
        .inner_size(720.0, 552.0)
        // 520, not 480: the pairing sheet is the tallest thing this window
        // shows, and at 480 it overflowed by ~30px — a window you can drag to a
        // size that breaks its own content is a size that should not exist.
        .min_inner_size(560.0, 520.0)
        .resizable(true)
        // Overlay style: the real macOS traffic lights float over the content (over
        // the sidebar, where the design drew faux ones) instead of a separate title
        // bar — so the design's window card *is* the window, no nesting.
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true)
        // Born hidden: the webview paints white before the app (and the dark
        // token scope) renders, so the frontend reveals the window once it has
        // painted (`preferences_ready`); a fallback below covers a wedged load.
        .visible(false)
        .build()
        .map_err(|e| Error::Window(e.to_string()))?;
    // Fallback: never leave the window permanently invisible if the frontend
    // fails to signal readiness (broken bundle, wedged dev server).
    let app2 = app.clone();
    let when =
        DispatchTime::try_from(std::time::Duration::from_millis(1500)).unwrap_or(DispatchTime::NOW);
    let _ = DispatchQueue::main().after(when, move || {
        show_preferences_window(&app2, "show preferences (fallback)");
    });
    Ok(())
}

/// Reveal + focus the (possibly hidden) preferences window.
pub(crate) fn show_preferences_window(app: &AppHandle, ctx: &'static str) {
    if let Some(window) = app.get_webview_window("preferences") {
        if !window.is_visible().unwrap_or(true) {
            log::warn_if_err(ctx, window.show());
            log::warn_if_err(ctx, window.set_focus());
        }
    }
}

/// Called by the preferences frontend after its first painted frame, so the
/// born-hidden window appears already themed (no white flash).
#[tauri::command]
pub fn preferences_ready(app: AppHandle) {
    show_preferences_window(&app, "show preferences (ready)");
}
