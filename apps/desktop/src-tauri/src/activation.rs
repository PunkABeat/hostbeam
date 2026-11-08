//! What happens when macOS makes Hostbeam the active app.
//!
//! With "Show in the Dock and ⌘⇥" on, the app is a regular one, so it can be
//! switched to. Activating an app normally brings its windows forward —
//! Hostbeam has none, so ⌘⇥ to it did nothing at all. The popover is a
//! non-activating panel and is not a window macOS will raise, so the app has
//! to show it itself, which is what the observer here does.
//!
//! Tauri surfaces the Dock click (`RunEvent::Reopen`) but not activation, so
//! this registers an `NSApplicationDidBecomeActiveNotification` observer. Both
//! paths only ever *show* the popover, never toggle it: a Dock click fires
//! both, and a toggle in one of them would undo the other.

use std::sync::OnceLock;
use std::time::{Duration, Instant};

use tauri::AppHandle;

use crate::log;

/// Launching the app activates it too, and a popover in the face at login is
/// not what "show in the Dock" asked for. Activations this soon after start
/// are the launch itself, not someone switching to us.
const LAUNCH_GRACE: Duration = Duration::from_secs(3);

static APP: OnceLock<AppHandle> = OnceLock::new();
static LAUNCHED: OnceLock<Instant> = OnceLock::new();

/// Whether an activation should open the popover. Pure, so the rule is
/// testable: not while a real window is up (macOS raises Preferences itself),
/// and not for the activation that comes with launching.
fn should_show(preferences_visible: bool, since_launch: Duration) -> bool {
    !preferences_visible && since_launch >= LAUNCH_GRACE
}

/// Show the popover if this activation was a user switching to Hostbeam.
/// Called on the main thread by the notification, and by the Dock-click event.
pub fn on_activated(app: &AppHandle) {
    let since = LAUNCHED.get().map_or(Duration::MAX, Instant::elapsed);
    if !should_show(crate::startup::preferences_visible(app), since) {
        return;
    }
    log::info("app activated with no window → show popover");
    crate::popover::show_panel(app);
}

/// Start listening for activations. Main thread, once, at the end of setup.
pub fn watch(app: &AppHandle) {
    let _ = APP.set(app.clone());
    let _ = LAUNCHED.set(Instant::now());
    #[cfg(target_os = "macos")]
    imp::observe();
}

#[cfg(target_os = "macos")]
mod imp {
    use std::sync::Once;

    use objc::declare::ClassDecl;
    use objc::runtime::{Class, Object, Sel};
    use objc::{class, msg_send, sel, sel_impl};

    use crate::log;

    extern "C" fn did_become_active(_this: &Object, _cmd: Sel, _note: *mut Object) {
        if let Some(app) = super::APP.get() {
            super::on_activated(app);
        }
    }

    /// A one-method Objective-C class to receive the notification. Registered
    /// once; registering a class name twice would fail.
    fn observer_class() -> Option<&'static Class> {
        static REGISTER: Once = Once::new();
        static mut CLASS: Option<&'static Class> = None;
        REGISTER.call_once(|| {
            let Some(mut decl) = ClassDecl::new("HBActivationObserver", class!(NSObject)) else {
                log::warn("could not declare the activation observer class");
                return;
            };
            unsafe {
                decl.add_method(
                    sel!(hbAppDidBecomeActive:),
                    did_become_active as extern "C" fn(&Object, Sel, *mut Object),
                );
                CLASS = Some(decl.register());
            }
        });
        // Written once inside `call_once`, read only after it — no race.
        unsafe { std::ptr::addr_of!(CLASS).read() }
    }

    pub fn observe() {
        let Some(cls) = observer_class() else { return };
        unsafe {
            // NSNotificationCenter does not retain observers, and this one
            // lives as long as the app, so it is never released.
            let observer: *mut Object = msg_send![cls, new];
            let center: *mut Object = msg_send![class!(NSNotificationCenter), defaultCenter];
            // The constant's own value, built as a string so the framework
            // symbol need not be linked.
            let name: *mut Object = msg_send![
                class!(NSString),
                stringWithUTF8String: c"NSApplicationDidBecomeActiveNotification".as_ptr()
            ];
            let nil: *mut Object = std::ptr::null_mut();
            let _: () = msg_send![center,
                addObserver: observer
                selector: sel!(hbAppDidBecomeActive:)
                name: name
                object: nil];
        }
        log::info("watching for app activation (⌘⇥ / Dock)");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_real_switch_to_us_shows_the_popover() {
        assert!(should_show(false, Duration::from_secs(30)));
    }

    #[test]
    fn preferences_being_up_is_macos_business_not_ours() {
        assert!(!should_show(true, Duration::from_secs(30)));
    }

    #[test]
    fn the_activation_that_comes_with_launching_is_ignored() {
        assert!(!should_show(false, Duration::from_millis(0)));
        assert!(!should_show(false, LAUNCH_GRACE - Duration::from_millis(1)));
        assert!(should_show(false, LAUNCH_GRACE));
    }
}
