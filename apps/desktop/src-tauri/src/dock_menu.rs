//! The Dock icon's right-click menu: one item of ours, "Hide from Dock".
//!
//! macOS asks the app delegate for `applicationDockMenu:` each time the icon
//! is right-clicked, and puts whatever comes back above its own items. Tao's
//! delegate does not implement it and Tauri exposes no hook, so the method is
//! added to the delegate's class at runtime — the trick activation.rs uses to
//! observe activations — and the item's action lands on the delegate too.
//!
//! The action flips Preferences → General → Startup → "Show in the Dock" by the
//! path the tray's Switch host uses: an eval into the popover, which owns the
//! config. The webview saves, `startup::apply` runs on the write, and the app
//! drops to Accessory. The menu-bar icon comes back if it was off, so nobody
//! can hide the last way in (`startup::effective`, mirrored in `hbSetDock`).

use std::sync::OnceLock;

use tauri::AppHandle;

use crate::log;
use crate::ui_bridge::{self, Target, UiMessage};

static APP: OnceLock<AppHandle> = OnceLock::new();

/// Add the menu. Main thread, once, at the end of setup — the delegate exists
/// by then, and the Dock only asks once the app is Regular.
pub fn install(app: &AppHandle) {
    let _ = APP.set(app.clone());
    #[cfg(target_os = "macos")]
    imp::install();
}

/// Turn the Dock icon off, by the same path as the Preferences switch.
fn hide_from_dock(app: &AppHandle) {
    log::info("dock menu → hide from Dock");
    ui_bridge::send(app, Target::Popover, &UiMessage::SetDock { on: false });
}

#[cfg(target_os = "macos")]
mod imp {
    use std::ffi::CString;

    use objc::runtime::{class_addMethod, object_getClass, Class, Object, Sel, YES};
    use objc::{class, msg_send, sel, sel_impl};

    use crate::{config, i18n, log};

    unsafe fn nsstring(s: &str) -> *mut Object {
        let c = CString::new(s).unwrap_or_default();
        msg_send![class!(NSString), stringWithUTF8String: c.as_ptr()]
    }

    /// `- (NSMenu *)applicationDockMenu:(NSApplication *)sender`. Built fresh
    /// on every right-click, so the title follows the locale; autoreleased,
    /// because the Dock only borrows it.
    extern "C" fn dock_menu(this: &Object, _cmd: Sel, _sender: *mut Object) -> *mut Object {
        let Some(app) = super::APP.get() else {
            return std::ptr::null_mut();
        };
        // Preferences being open keeps the app Regular — and the Dock icon up —
        // while the setting is off. Nothing to hide then: macOS's own menu.
        if !config::read(app).settings.dock {
            return std::ptr::null_mut();
        }
        let title = i18n::t(i18n::locale(app), "dock.hide");
        unsafe {
            let menu: *mut Object = msg_send![class!(NSMenu), alloc];
            let menu: *mut Object = msg_send![menu, initWithTitle: nsstring("")];
            let item: *mut Object = msg_send![class!(NSMenuItem), alloc];
            let item: *mut Object = msg_send![item,
                initWithTitle: nsstring(title)
                action: sel!(hbHideFromDock:)
                keyEquivalent: nsstring("")];
            let _: () = msg_send![item, setTarget: this as *const Object];
            let _: () = msg_send![menu, addItem: item];
            let _: () = msg_send![item, release];
            msg_send![menu, autorelease]
        }
    }

    extern "C" fn hide_from_dock(_this: &Object, _cmd: Sel, _sender: *mut Object) {
        if let Some(app) = super::APP.get() {
            super::hide_from_dock(app);
        }
    }

    pub fn install() {
        unsafe {
            let ns_app: *mut Object = msg_send![class!(NSApplication), sharedApplication];
            let delegate: *mut Object = msg_send![ns_app, delegate];
            if delegate.is_null() {
                log::warn("no app delegate to hang the Dock menu on");
                return;
            }
            let cls = object_getClass(delegate) as *mut Class;
            // `@@:@` — returns an object, takes self, _cmd and one object;
            // `v@:@` — the same, returning nothing.
            let menu_added = class_addMethod(
                cls,
                sel!(applicationDockMenu:),
                std::mem::transmute::<
                    extern "C" fn(&Object, Sel, *mut Object) -> *mut Object,
                    unsafe extern "C" fn(),
                >(dock_menu),
                c"@@:@".as_ptr(),
            );
            let action_added = class_addMethod(
                cls,
                sel!(hbHideFromDock:),
                std::mem::transmute::<
                    extern "C" fn(&Object, Sel, *mut Object),
                    unsafe extern "C" fn(),
                >(hide_from_dock),
                c"v@:@".as_ptr(),
            );
            // A delegate that already answers `applicationDockMenu:` (a later
            // tao, say) keeps its own; ours must not be wired half-way.
            if menu_added != YES || action_added != YES {
                log::warn("the app delegate already has a Dock menu; ours is not added");
                return;
            }
        }
        log::info("Dock menu installed (Hide from Dock)");
    }
}
