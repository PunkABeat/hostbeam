//! About → "Share Hostbeam". The pane shows its own menu of networks; this is
//! the part that needs Rust: Copy Link, and More…, the system share menu
//! (Messages, Mail, AirDrop, Notes…) with a sentence and the website, opened
//! under the button. Nothing in the web platform or Tauri reaches
//! NSSharingServicePicker, so that is the one piece of AppKit the pane needs.

use serde::Deserialize;
use tauri::{AppHandle, Manager};

use crate::error::CommandError;
use crate::log;

/// The link that is shared. Fixed here rather than taken from the webview, so
/// the pane chooses the words but never the destination.
const WEBSITE: &str = "https://hostbeam.app";

/// The longest sentence accepted from the pane. Its own copy is far shorter; the
/// cap only keeps the command from being a way to share arbitrary text.
const MAX_TEXT_CHARS: usize = 280;

/// A button's rectangle as `getBoundingClientRect` reports it: CSS pixels from
/// the top left of the page, which fills the Preferences window's content view.
#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct Anchor {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

/// The anchor in the coordinates of a view `view_height` points tall. An
/// unflipped AppKit view counts y up from the bottom; a flipped one, like the
/// page, down from the top. `None` for a rectangle that is not on the view.
fn to_view_rect(a: Anchor, view_height: f64, flipped: bool) -> Option<(f64, f64, f64, f64)> {
    let values = [a.x, a.y, a.width, a.height, view_height];
    if values.iter().any(|v| !v.is_finite())
        || a.x < 0.0
        || a.y < 0.0
        || a.width <= 0.0
        || a.height <= 0.0
        || a.y + a.height > view_height
    {
        return None;
    }
    let y = if flipped {
        a.y
    } else {
        view_height - a.y - a.height
    };
    Some((a.x, y, a.width, a.height))
}

/// The edge of the button the menu opens against: its bottom, whichever way the
/// view counts. NSRectEdge values: NSMinYEdge = 1, NSMaxYEdge = 3.
fn bottom_edge(flipped: bool) -> usize {
    if flipped {
        3
    } else {
        1
    }
}

/// Copy Link, in the share menu: the site's address on the clipboard. The same
/// fixed link the system menu shares, so this cannot be used to put anything
/// else there. Async like every clipboard command: a synchronous one runs on
/// the main thread, which must never be the one waiting for a beam's read.
#[tauri::command]
pub async fn copy_share_link() -> Result<(), CommandError> {
    crate::clipboard::copy_text(WEBSITE.to_string()).await
}

#[tauri::command]
pub fn share_hostbeam(app: AppHandle, text: String, anchor: Anchor) {
    let text: String = text.chars().take(MAX_TEXT_CHARS).collect();
    let Some(window) = app.get_webview_window("preferences") else {
        log::warn("share: no Preferences window to open the menu in");
        return;
    };
    #[cfg(target_os = "macos")]
    crate::main_thread::on_main(move || imp::show(&window, &text, anchor));
    #[cfg(not(target_os = "macos"))]
    let _ = (window, text, anchor);
}

#[cfg(target_os = "macos")]
#[allow(deprecated)] // `cocoa`'s geometry types; tauri-nspanel still pins the crate (see lib.rs)
mod imp {
    use std::ffi::CString;

    use objc::runtime::{Object, BOOL, YES};
    use objc::{class, msg_send, sel, sel_impl};
    use tauri_nspanel::cocoa::foundation::{NSPoint, NSRect, NSSize};

    use super::{bottom_edge, to_view_rect, Anchor, WEBSITE};
    use crate::log;

    unsafe fn ns_string(s: &str) -> *mut Object {
        let Ok(c) = CString::new(s) else {
            return std::ptr::null_mut();
        };
        msg_send![class!(NSString), stringWithUTF8String: c.as_ptr()]
    }

    /// Runs on the main thread (see `share_hostbeam`), as AppKit requires.
    pub fn show(window: &tauri::WebviewWindow, text: &str, anchor: Anchor) {
        let view = match window.ns_view() {
            Ok(v) if !v.is_null() => v.cast::<Object>(),
            _ => {
                log::warn("share: the Preferences window has no content view");
                return;
            }
        };
        unsafe {
            let bounds: NSRect = msg_send![view, bounds];
            let flipped: BOOL = msg_send![view, isFlipped];
            let flipped = flipped == YES;
            let Some((x, y, width, height)) = to_view_rect(anchor, bounds.size.height, flipped)
            else {
                log::warn(format!("share: {anchor:?} is not inside the window"));
                return;
            };
            let text = ns_string(text);
            let link: *mut Object = msg_send![class!(NSURL), URLWithString: ns_string(WEBSITE)];
            if text.is_null() || link.is_null() {
                log::warn("share: could not build the items to share");
                return;
            }
            let objects = [text, link];
            let items: *mut Object = msg_send![class!(NSArray),
                arrayWithObjects: objects.as_ptr()
                count: objects.len()];
            // Not released: nothing here would keep the picker alive while its
            // menu is open, and one small object per click is a better trade
            // than a menu that could vanish under the pointer.
            let picker: *mut Object = msg_send![class!(NSSharingServicePicker), alloc];
            let picker: *mut Object = msg_send![picker, initWithItems: items];
            let rect = NSRect::new(NSPoint::new(x, y), NSSize::new(width, height));
            let _: () = msg_send![picker,
                showRelativeToRect: rect
                ofView: view
                preferredEdge: bottom_edge(flipped)];
        }
        log::info("share menu opened");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn button() -> Anchor {
        Anchor {
            x: 100.0,
            y: 40.0,
            width: 120.0,
            height: 28.0,
        }
    }

    #[test]
    fn an_unflipped_view_counts_up_from_the_bottom() {
        assert_eq!(
            to_view_rect(button(), 600.0, false),
            Some((100.0, 532.0, 120.0, 28.0))
        );
    }

    #[test]
    fn a_flipped_view_counts_down_like_the_page() {
        assert_eq!(
            to_view_rect(button(), 600.0, true),
            Some((100.0, 40.0, 120.0, 28.0))
        );
    }

    #[test]
    fn a_rectangle_that_is_not_on_the_view_is_refused() {
        let off = |a: Anchor| to_view_rect(a, 600.0, false);
        assert_eq!(
            off(Anchor {
                y: 590.0,
                ..button()
            }),
            None
        ); // runs past the bottom
        assert_eq!(
            off(Anchor {
                x: -1.0,
                ..button()
            }),
            None
        );
        assert_eq!(
            off(Anchor {
                width: 0.0,
                ..button()
            }),
            None
        );
        assert_eq!(
            off(Anchor {
                height: f64::NAN,
                ..button()
            }),
            None
        );
    }

    #[test]
    fn the_menu_opens_below_the_button_either_way() {
        assert_eq!(bottom_edge(false), 1);
        assert_eq!(bottom_edge(true), 3);
    }
}
