//! The menu-bar popover: a non-activating NSPanel toggled from the tray,
//! positioned so its beak sits under the icon, sized to its content by the
//! webview, and dismissed on click-away.

use tauri::{AppHandle, LogicalPosition, Manager, WebviewWindow};
use tauri_nspanel::{panel_delegate, ManagerExt, WebviewWindowExt};

use crate::ui_bridge::{Target, UiMessage};
use crate::{log, ui_bridge, POPOVER};

// NSStatusWindowLevel — floats the popover above ordinary windows.
pub(crate) const PANEL_LEVEL: i32 = 25;

// NSWindowStyleMaskNonactivatingPanel (1 << 7) | NSWindowStyleMaskBorderless (0).
pub(crate) const NON_ACTIVATING_PANEL: i32 = 1 << 7;

/// The transparent margin left and right of the 340px card. It exists for the
/// card's drop shadow (`--shadow-popover`, a 44px blur) — too small and macOS
/// clips the shadow at the window edge, which reads as a grey box around the
/// popover over any light background. Matches `.hb-wrap`'s side padding.
pub(crate) const WRAP_PAD_X: f64 = 24.0;

/// Card width, and the window's, less the margins on both sides.
pub(crate) const CARD_WIDTH: f64 = 340.0;

pub(crate) const POPOVER_WIDTH: f64 = CARD_WIDTH + 2.0 * WRAP_PAD_X;

// The popover beak sits this far (logical px) from the window's left edge:
// wrap padding-left + content width − beak offset from content right (31).
// The window is positioned so the beak lands under the tray icon.
pub(crate) const BEAK_FROM_LEFT: f64 = WRAP_PAD_X + CARD_WIDTH - 31.0;

/// Toggle the menu-bar popover panel. As a non-activating NSPanel it shows
/// without activating the app, and dismisses on resign-key (click-away).
/// `from_tray` puts the beak under the pointer, which a tray click leaves on
/// the icon; without it the popover takes the top-right corner (e.g. the
/// global hotkey).
pub(crate) fn toggle(app: &AppHandle, from_tray: bool) {
    let Ok(panel) = app.get_webview_panel(POPOVER) else {
        return;
    };
    if panel.is_visible() {
        panel.order_out(None);
        return;
    }
    if let Some(window) = app.get_webview_window(POPOVER) {
        position_panel(&window, from_tray);
    }
    panel.show();
    // Until 2026-10-06 only `show_panel` said this, so the most common way in
    // — a click on the icon — re-read nothing: not `~/.ssh/config`, not the
    // agent's dev servers (ADR 0029: listed when the popover opens).
    ui_bridge::send(app, Target::Popover, &UiMessage::Shown);
}

/// Show the popover panel (used by the webview to surface a failed/empty silent
/// beam). No-op if already visible.
#[tauri::command]
pub fn show_popover(app: AppHandle) {
    show_panel(&app);
}

/// Hide the popover panel (Esc-to-dismiss from the webview). No-op if hidden.
#[tauri::command]
pub fn hide_popover(app: AppHandle) {
    if let Ok(panel) = app.get_webview_panel(POPOVER) {
        if panel.is_visible() {
            panel.order_out(None);
        }
    }
}

/// Ensures the popover panel is visible (without toggling it off if already up).
pub(crate) fn show_panel(app: &AppHandle) {
    if let Ok(panel) = app.get_webview_panel(POPOVER) {
        if !panel.is_visible() {
            if let Some(window) = app.get_webview_window(POPOVER) {
                position_panel(&window, false);
            }
            panel.show();
            // Tell the popover. A non-activating panel never makes its webview
            // key, so `focus` never fires there; this is its cue to re-read the
            // config and the update cache — which is empty at launch, since the
            // first background check runs 15s after start.
            ui_bridge::send(app, Target::Popover, &UiMessage::Shown);
        }
    }
}

/// Resize the popover window to fit its content height (the webview measures the
/// rendered card and calls this), so the popover is exactly as tall as it needs
/// to be — no clipped footer, no dead transparent space below short states.
#[tauri::command]
pub fn resize_popover(app: AppHandle, height: f64) {
    if let Some(window) = app.get_webview_window(POPOVER) {
        let max = window
            .current_monitor()
            .ok()
            .flatten()
            .map(|m| (m.size().height as f64 / m.scale_factor()) - 48.0)
            .unwrap_or(900.0);
        let h = height.clamp(200.0, max);
        log::warn_if_err(
            "resize popover",
            window.set_size(tauri::LogicalSize::new(POPOVER_WIDTH, h)),
        );
    }
}

/// Places the popover under the menu bar of the screen holding the pointer —
/// with its beak under the pointer when `from_tray`, since a tray click
/// leaves the pointer on the icon, whichever screen's menu bar that is.
///
/// Until 2026-10-06 it always went to the main display, so on a Mac with
/// screens side by side a click on another screen's menu bar, the Dock there,
/// or the shortcut opened it out of sight.
pub(crate) fn position_panel(window: &WebviewWindow, from_tray: bool) {
    let Some((screen, pointer_x)) = target_screen(window) else {
        return;
    };
    let (x, y) = popover_origin(screen, pointer_x.filter(|_| from_tray));
    log::warn_if_err(
        "position popover",
        window.set_position(LogicalPosition::new(x, y)),
    );
}

/// A screen in the space `LogicalPosition` uses on macOS: points, origin at
/// the main display's top-left, y growing down — Quartz's global display
/// coordinates.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Screen {
    pub x: f64,
    pub y: f64,
    pub width: f64,
}

/// The screen holding the pointer and the pointer's x, or the main display
/// with no x if Quartz cannot say.
///
/// The pointer is the best evidence of where someone is looking: on the menu
/// bar they clicked, at the Dock they clicked, or over the window they were
/// typing in when they pressed the shortcut.
pub(crate) fn target_screen(window: &WebviewWindow) -> Option<(Screen, Option<f64>)> {
    pointer_screen()
        .map(|(x, screen)| (screen, Some(x)))
        .or_else(|| main_screen(window).map(|screen| (screen, None)))
}

/// The main display, from Tauri, in points.
///
/// Not in pixels: the monitor's pixels are at its own scale, but `set_position`
/// turns pixels into points at the scale of whichever screen the window is on
/// at that moment. A popover that has never been shown sits where it was made,
/// on the screen that was active at launch, and when that was a 1× screen next
/// to a 2× one, the launch announcement opened it off every screen.
fn main_screen(window: &WebviewWindow) -> Option<Screen> {
    let monitor = window.primary_monitor().ok().flatten()?;
    let scale = monitor.scale_factor();
    let origin = monitor.position().to_logical::<f64>(scale);
    let size = monitor.size().to_logical::<f64>(scale);
    Some(Screen {
        x: origin.x,
        y: origin.y,
        width: size.width,
    })
}

/// The pointer's x and the screen it is on, read from Quartz.
///
/// Quartz rather than Tauri's monitors: those are placed in pixels at each
/// screen's own scale, the mix that opened the popover off every screen on
/// 2026-09-24. Quartz answers in points, in the space `LogicalPosition` uses.
#[cfg(target_os = "macos")]
fn pointer_screen() -> Option<(f64, Screen)> {
    use std::ffi::c_void;

    #[repr(C)]
    #[derive(Clone, Copy)]
    struct CGPoint {
        x: f64,
        y: f64,
    }
    #[repr(C)]
    #[derive(Clone, Copy)]
    struct CGSize {
        width: f64,
        height: f64,
    }
    #[repr(C)]
    #[derive(Clone, Copy)]
    struct CGRect {
        origin: CGPoint,
        size: CGSize,
    }
    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGEventCreate(source: *const c_void) -> *const c_void;
        fn CGEventGetLocation(event: *const c_void) -> CGPoint;
        fn CGGetDisplaysWithPoint(
            point: CGPoint,
            max_displays: u32,
            displays: *mut u32,
            matching: *mut u32,
        ) -> i32;
        fn CGDisplayBounds(display: u32) -> CGRect;
    }
    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFRelease(cf: *const c_void);
    }

    // SAFETY: `CGEventCreate(NULL)` returns a new event carrying the current
    // pointer location, or null; it is checked, read once, and released once.
    // `CGGetDisplaysWithPoint` writes at most `max_displays` (1) ids and the
    // count into the two locals. `CGDisplayBounds` takes any id and returns a
    // value. None of them needs a permission.
    unsafe {
        let event = CGEventCreate(std::ptr::null());
        if event.is_null() {
            return None;
        }
        let at = CGEventGetLocation(event);
        CFRelease(event);
        let (mut display, mut matching) = (0u32, 0u32);
        if CGGetDisplaysWithPoint(at, 1, &mut display, &mut matching) != 0 || matching == 0 {
            return None;
        }
        let bounds = CGDisplayBounds(display);
        Some((
            at.x,
            Screen {
                x: bounds.origin.x,
                y: bounds.origin.y,
                width: bounds.size.width,
            },
        ))
    }
}

#[cfg(not(target_os = "macos"))]
fn pointer_screen() -> Option<(f64, Screen)> {
    None
}

/// The popover's top-left on `screen`, in points: just under its menu bar.
fn popover_origin(screen: Screen, anchor_x: Option<f64>) -> (f64, f64) {
    (popover_x(screen.x, screen.width, anchor_x), screen.y + 26.0)
}

/// The popover's left edge, in points: the beak under the clicked tray icon,
/// or the screen's right edge without a click (the global hotkey, the launch
/// announcement), and never past either edge.
fn popover_x(screen_x: f64, screen_width: f64, anchor_x: Option<f64>) -> f64 {
    let min_x = screen_x + 8.0;
    let max_x = screen_x + screen_width - POPOVER_WIDTH - 8.0;
    anchor_x
        .map_or(max_x, |ax| ax - BEAK_FROM_LEFT)
        .clamp(min_x, max_x)
}

/// Convert the popover window into a non-activating menu-bar NSPanel (borderless,
/// floating, all-spaces) and wire its click-away dismissal (order out on resign-key).
///
/// The `#[allow(deprecated)]` is scoped to this one function on purpose:
/// `tauri-nspanel` is pinned to a git revision that still uses the old `cocoa`
/// crate (`NSWindowCollectionBehavior`, `nil`/`id`). Migrating it to
/// `objc2-app-kit` is out of scope; keeping the allow here means the rest of the
/// crate still surfaces real deprecations. (The macro's `cfg(cargo-clippy)` is
/// handled by `[lints]` in Cargo.toml.)
#[allow(deprecated)]
pub(crate) fn configure_popover_panel(app: &AppHandle) {
    use tauri_nspanel::cocoa::appkit::NSWindowCollectionBehavior;

    let window = app
        .get_webview_window(POPOVER)
        .expect("popover window exists");
    let panel = window.to_panel().expect("convert window to panel");
    panel.set_level(PANEL_LEVEL);
    // Borderless (0) + non-activating panel (1 << 7 = 128): shows without
    // stealing app focus. (The named cocoa constant isn't re-exported.)
    panel.set_style_mask(NON_ACTIVATING_PANEL);
    panel.set_collection_behaviour(
        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
    );
    panel.set_floating_panel(true);
    panel.set_becomes_key_only_if_needed(true);
    panel.order_out(None);

    let app_handle = app.clone();
    let delegate = panel_delegate!(HbPanelDelegate {
        window_did_resign_key
    });
    delegate.set_listener(Box::new(move |name: String| {
        if name == "window_did_resign_key" {
            if let Ok(panel) = app_handle.get_webview_panel(POPOVER) {
                panel.order_out(None);
            }
        }
    }));
    panel.set_delegate(delegate);
}

#[cfg(test)]
mod tests {
    use super::*;

    // The laptop screen here: 1536 points wide, at the origin.
    const W: f64 = 1536.0;

    #[test]
    fn without_a_click_it_sits_at_the_right_edge_of_the_screen() {
        let x = popover_x(0.0, W, None);
        assert_eq!(x + POPOVER_WIDTH, W - 8.0);
    }

    #[test]
    fn a_click_puts_the_beak_under_the_icon() {
        assert_eq!(popover_x(0.0, W, Some(1000.0)) + BEAK_FROM_LEFT, 1000.0);
    }

    #[test]
    fn it_never_goes_past_either_edge() {
        assert_eq!(popover_x(0.0, W, Some(W + 500.0)), popover_x(0.0, W, None));
        assert_eq!(popover_x(0.0, W, Some(0.0)), 8.0);
    }

    #[test]
    fn it_stays_on_a_primary_screen_that_is_not_at_the_origin() {
        let x = popover_x(-1236.0, 1920.0, None);
        assert!(x >= -1236.0 && x + POPOVER_WIDTH <= -1236.0 + 1920.0);
    }

    // A second layout: two 1920×1080 externals, side by side
    // above the laptop, so their y is negative.
    const ABOVE_RIGHT: Screen = Screen {
        x: 684.0,
        y: -1080.0,
        width: 1920.0,
    };
    const ABOVE_LEFT: Screen = Screen {
        x: -1236.0,
        y: -1080.0,
        width: 1920.0,
    };

    #[test]
    fn it_opens_under_the_menu_bar_of_a_screen_above_the_main_one() {
        let (x, y) = popover_origin(ABOVE_RIGHT, None);
        assert_eq!(y, -1080.0 + 26.0);
        assert_eq!(x + POPOVER_WIDTH, 684.0 + 1920.0 - 8.0);
    }

    #[test]
    fn a_click_on_another_screens_menu_bar_puts_the_beak_under_it() {
        let (x, y) = popover_origin(ABOVE_LEFT, Some(-300.0));
        assert_eq!(x + BEAK_FROM_LEFT, -300.0);
        assert_eq!(y, -1054.0);
    }

    #[test]
    fn the_pointer_is_on_the_screen_quartz_names() {
        // Checks the declarations against the real calls. A machine with no
        // display has no answer, which is allowed.
        if let Some((x, screen)) = pointer_screen() {
            assert!(screen.width > 0.0);
            assert!(x >= screen.x && x <= screen.x + screen.width);
        }
    }
}
