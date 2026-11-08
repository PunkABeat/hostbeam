//! Dropping an image on the menu-bar icon.
//!
//! The Dock icon has always taken a drop — macOS hands those over as
//! `RunEvent::Opened` — but the Dock icon is off by default, and the menu-bar
//! icon is the one a menu-bar app is aimed at. It is where people try first.
//!
//! Two things stand in the way. AppKit delivers a drop only to a view that is
//! a *dragging destination*, and Tauri keeps the `NSStatusItem` to itself
//! (`tray_icon` exposes `ns_status_item`, but Tauri's wrapper does not pass it
//! on). So the status item's view is found through the app's own windows, and
//! taught to accept files.
//!
//! The teaching is done by *adding* methods to the view's class, never by
//! swizzling: `class_addMethod` refuses if the method already exists, so a
//! macOS release that one day implements dragging on a status button keeps
//! whatever AppKit gave it, and nothing here overrides it. Clicks are
//! untouched for the same reason — no existing method is replaced.
//!
//! What lands is handed to the same place a Dock drop goes
//! ([`crate::opened_files`]), so a file dropped on the icon, opened with
//! Hostbeam from Finder, or passed to `open -a` all travel one path.

use tauri::AppHandle;

/// Set once, read by the C functions below — they are plain functions with no
/// place to carry a handle.
static APP: std::sync::OnceLock<AppHandle> = std::sync::OnceLock::new();

/// Make the menu-bar icon a drop target. Main thread, after the tray exists.
pub fn enable(app: &AppHandle) {
    let _ = APP.set(app.clone());
    #[cfg(target_os = "macos")]
    imp::attach();
}

#[cfg(target_os = "macos")]
mod imp {
    use std::ffi::CStr;
    use std::os::raw::c_char;

    use objc::runtime::{class_addMethod, Class, Object, Sel, BOOL, NO, YES};
    use objc::{class, msg_send, sel, sel_impl};

    use crate::log;

    /// `NSDragOperationCopy`. A beam copies: the file stays where it is.
    const COPY: u64 = 1;
    const NONE: u64 = 0;

    /// The old pasteboard type is what a Finder drag still puts on the
    /// pasteboard, and the only one that reads back as plain paths in one
    /// call. `public.file-url` is the modern spelling, read per item below.
    const FILENAMES: &CStr = c"NSFilenamesPboardType";
    const FILE_URL: &CStr = c"public.file-url";

    fn nsstring(s: &CStr) -> *mut Object {
        unsafe { msg_send![class!(NSString), stringWithUTF8String: s.as_ptr()] }
    }

    fn rust_string(ns: *mut Object) -> Option<String> {
        if ns.is_null() {
            return None;
        }
        unsafe {
            let utf8: *const c_char = msg_send![ns, UTF8String];
            (!utf8.is_null()).then(|| CStr::from_ptr(utf8).to_string_lossy().into_owned())
        }
    }

    /// The view the status item draws into: the content view of the window
    /// AppKit keeps its status items in. Found by class name because there is
    /// no API that hands it over.
    unsafe fn status_view() -> Option<*mut Object> {
        let app: *mut Object = msg_send![class!(NSApplication), sharedApplication];
        let windows: *mut Object = msg_send![app, windows];
        let count: usize = msg_send![windows, count];
        for i in 0..count {
            let window: *mut Object = msg_send![windows, objectAtIndex: i];
            let class: *const Class = msg_send![window, class];
            if class.is_null() || !(*class).name().contains("StatusBar") {
                continue;
            }
            let view: *mut Object = msg_send![window, contentView];
            if !view.is_null() {
                return Some(view);
            }
        }
        None
    }

    /// Every path on the drag's pasteboard, in the order they were dragged.
    unsafe fn dragged_files(sender: *mut Object) -> Vec<String> {
        let pasteboard: *mut Object = msg_send![sender, draggingPasteboard];
        if pasteboard.is_null() {
            return Vec::new();
        }
        // The one-call route first.
        let list: *mut Object = msg_send![pasteboard, propertyListForType: nsstring(FILENAMES)];
        if !list.is_null() {
            let count: usize = msg_send![list, count];
            let paths: Vec<String> = (0..count)
                .filter_map(|i| {
                    let item: *mut Object = msg_send![list, objectAtIndex: i];
                    rust_string(item)
                })
                .collect();
            if !paths.is_empty() {
                return paths;
            }
        }
        // Otherwise one `public.file-url` per item, which is a URL and has to
        // be read as one — a path with a space arrives percent-encoded.
        let items: *mut Object = msg_send![pasteboard, pasteboardItems];
        if items.is_null() {
            return Vec::new();
        }
        let count: usize = msg_send![items, count];
        (0..count)
            .filter_map(|i| {
                let item: *mut Object = msg_send![items, objectAtIndex: i];
                let url: *mut Object = msg_send![item, stringForType: nsstring(FILE_URL)];
                let url = rust_string(url)?;
                let parsed = tauri::Url::parse(&url).ok()?;
                Some(parsed.to_file_path().ok()?.to_string_lossy().into_owned())
            })
            .collect()
    }

    extern "C" fn dragging_entered(_: &Object, _: Sel, sender: *mut Object) -> u64 {
        if unsafe { dragged_files(sender) }.is_empty() {
            NONE
        } else {
            COPY
        }
    }

    extern "C" fn prepare_for_drag(_: &Object, _: Sel, _: *mut Object) -> BOOL {
        YES
    }

    extern "C" fn perform_drag(_: &Object, _: Sel, sender: *mut Object) -> BOOL {
        let files = unsafe { dragged_files(sender) };
        if files.is_empty() {
            return NO;
        }
        let Some(app) = super::APP.get() else {
            return NO;
        };
        log::info(format!(
            "{} file(s) dropped on the menu-bar icon",
            files.len()
        ));
        crate::actions::opened_files(app, files);
        YES
    }

    /// Add the three dragging methods to the status view's class, and say what
    /// it will accept. Adding, never replacing: `class_addMethod` answers NO
    /// for a method that is already there, and that answer is the right
    /// outcome — AppKit's own implementation wins.
    pub fn attach() {
        unsafe {
            let Some(view) = status_view() else {
                log::warn("no status-item view found — the menu-bar icon will not take drops");
                return;
            };
            let class: *mut Class = msg_send![view, class];
            let added = [
                class_addMethod(
                    class,
                    sel!(draggingEntered:),
                    std::mem::transmute::<
                        extern "C" fn(&Object, Sel, *mut Object) -> u64,
                        extern "C" fn(),
                    >(dragging_entered),
                    c"Q@:@".as_ptr(),
                ),
                class_addMethod(
                    class,
                    sel!(prepareForDragOperation:),
                    std::mem::transmute::<
                        extern "C" fn(&Object, Sel, *mut Object) -> BOOL,
                        extern "C" fn(),
                    >(prepare_for_drag),
                    c"c@:@".as_ptr(),
                ),
                class_addMethod(
                    class,
                    sel!(performDragOperation:),
                    std::mem::transmute::<
                        extern "C" fn(&Object, Sel, *mut Object) -> BOOL,
                        extern "C" fn(),
                    >(perform_drag),
                    c"c@:@".as_ptr(),
                ),
            ];
            // Registering the types is what actually offers the icon as a
            // destination, so it comes after the methods that answer for it.
            let types: *mut Object = msg_send![class!(NSMutableArray), array];
            let _: () = msg_send![types, addObject: nsstring(FILENAMES)];
            let _: () = msg_send![types, addObject: nsstring(FILE_URL)];
            let _: () = msg_send![view, registerForDraggedTypes: types];
            log::info(format!(
                "menu-bar icon takes drops (methods added: {})",
                added.iter().filter(|a| **a == YES).count()
            ));
        }
    }
}
