//! Preferences → General → Startup, made real on the Rust side: launch at
//! login, the menu-bar icon, and the Dock icon (with its ⌘⇥ entry).
//!
//! The three switches wrote to config for a long time without anything
//! reading them. Now [`apply`] runs at startup and after every config write,
//! idempotently, so what the switches show is what is in force. Each surface
//! is applied on its own and logged, so one failing (a login item the OS
//! refuses, say) never blocks the others.

use std::sync::Mutex;

use tauri::{AppHandle, Manager};

use crate::{config, log, tray};

/// Which of the two ways to reach Hostbeam are on.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Surfaces {
    pub menubar: bool,
    pub dock: bool,
}

/// At least one surface stays on: with both off the app would be reachable
/// only by shortcut. The menu-bar icon is the one that comes back — it is the
/// default and the one every user has already seen. The pane mirrors this
/// rule by disabling the last remaining switch.
pub fn effective(menubar: bool, dock: bool) -> Surfaces {
    Surfaces {
        menubar: menubar || !dock,
        dock,
    }
}

/// What was last applied, so a config write that changed nothing here (a
/// recent beam, a folder edit) costs no tray, Dock or login-item call.
/// Managed by Tauri.
#[derive(Default)]
pub struct Applied(Mutex<Option<(Surfaces, bool)>>);

/// Read the settings and bring the tray icon, the activation policy and the
/// login item in line with them.
pub fn apply(app: &AppHandle) {
    let s = config::read(app).settings;
    let surfaces = effective(s.menubar, s.dock);
    let wanted = (surfaces, s.launch);
    {
        let applied = app.state::<Applied>();
        let mut last = applied.0.lock().unwrap_or_else(|p| p.into_inner());
        if *last == Some(wanted) {
            return;
        }
        *last = Some(wanted);
    }
    log::info(format!(
        "startup settings: menubar={} dock={} launch={}",
        surfaces.menubar, surfaces.dock, s.launch
    ));

    if let Some(tray) = app.tray_by_id(tray::TRAY_ID) {
        log::warn_if_err("tray visibility", tray.set_visible(surfaces.menubar));
    }
    #[cfg(target_os = "macos")]
    {
        apply_dock(app, surfaces.dock);
        remove_legacy_launch_agent(app);
        apply_login_item(s.launch);
    }
}

/// A shown Dock icon means a Regular app (Dock + ⌘⇥); a hidden one means
/// Accessory — unless Preferences is open, which keeps the app Regular on its
/// own (see `open_preferences`) and drops back when it closes.
#[cfg(target_os = "macos")]
fn apply_dock(app: &AppHandle, dock: bool) {
    use tauri::ActivationPolicy;
    if dock {
        let _ = app.set_activation_policy(ActivationPolicy::Regular);
        crate::preferences_window::set_dock_icon();
    } else if !preferences_visible(app) {
        let _ = app.set_activation_policy(ActivationPolicy::Accessory);
    }
}

/// Whether the Preferences window is currently showing.
pub fn preferences_visible(app: &AppHandle) -> bool {
    app.get_webview_window("preferences")
        .map(|w| w.is_visible().unwrap_or(false))
        .unwrap_or(false)
}

/// 0.1.13 registered the login item as a LaunchAgent, which System Settings
/// files under "Allow in the Background" as a legacy agent — not under
/// "Open at Login" where a user looks for it. Remove that plist (and unload
/// it, in case a login since then loaded it) so only the SMAppService entry
/// remains.
#[cfg(target_os = "macos")]
fn remove_legacy_launch_agent(app: &AppHandle) {
    let Ok(home) = app.path().home_dir() else {
        return;
    };
    let plist = home.join("Library/LaunchAgents/Hostbeam.plist");
    if !plist.exists() {
        return;
    }
    let _ = std::process::Command::new("launchctl")
        .args(["bootout", &format!("gui/{}/Hostbeam", uid())])
        .output();
    match std::fs::remove_file(&plist) {
        Ok(()) => log::info("removed the 0.1.13 LaunchAgent login item"),
        Err(e) => log::warn(format!("could not remove {}: {e}", plist.display())),
    }
}

#[cfg(target_os = "macos")]
fn uid() -> u32 {
    extern "C" {
        fn getuid() -> u32;
    }
    unsafe { getuid() }
}

/// What to do about the login item, given the switch and what macOS reports.
/// Pure, so the rule is testable without a bundle:
/// - the switch is on and the item is missing → register;
/// - the switch is off and the item exists (enabled or awaiting approval) → unregister;
/// - the switch is on but the user turned the item off in System Settings
///   (`requires approval`) → leave it: their choice there wins over ours;
/// - anything else is already right.
#[derive(Debug, PartialEq, Eq)]
enum LoginAction {
    Register,
    Unregister,
    LeaveApproval,
    Nothing,
}

fn login_action(wanted: bool, status: sm::Status) -> LoginAction {
    use sm::Status::*;
    match (wanted, status) {
        (true, Enabled) => LoginAction::Nothing,
        (true, RequiresApproval) => LoginAction::LeaveApproval,
        (true, NotRegistered | NotFound) => LoginAction::Register,
        (false, Enabled | RequiresApproval) => LoginAction::Unregister,
        (false, NotRegistered | NotFound) => LoginAction::Nothing,
    }
}

/// Register or remove the login item through SMAppService (macOS 13+, the
/// app's minimum): System Settings lists it under Login Items → "Open at
/// Login", with the app's icon, and keeps it valid if the app moves. Skipped
/// in debug builds: a `tauri dev` binary is not a bundle and must never
/// become someone's login item.
#[cfg(target_os = "macos")]
fn apply_login_item(wanted: bool) {
    if cfg!(debug_assertions) {
        log::info("launch at login: not touched in a debug build");
        return;
    }
    let status = sm::status();
    match login_action(wanted, status) {
        LoginAction::Nothing => {}
        LoginAction::LeaveApproval => log::info(
            "launch at login: turned off in System Settings → Login Items; leaving that as is",
        ),
        LoginAction::Register => match sm::register(true) {
            Ok(()) => log::info("launch at login registered (Open at Login)"),
            Err(e) => log::warn(format!("launch at login could not be registered: {e}")),
        },
        LoginAction::Unregister => match sm::register(false) {
            Ok(()) => log::info("launch at login removed"),
            Err(e) => log::warn(format!("launch at login could not be removed: {e}")),
        },
    }
}

/// The thin Objective-C bridge to `SMAppService.mainApp`.
mod sm {
    /// `SMAppServiceStatus`, as macOS reports it.
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Status {
        NotRegistered,
        Enabled,
        RequiresApproval,
        NotFound,
    }

    #[cfg(target_os = "macos")]
    mod imp {
        use super::Status;
        use objc::runtime::{Object, BOOL, NO};
        use objc::{class, msg_send, sel, sel_impl};
        use std::ffi::CStr;
        use std::os::raw::c_char;

        #[link(name = "ServiceManagement", kind = "framework")]
        extern "C" {}

        unsafe fn main_app() -> *mut Object {
            msg_send![class!(SMAppService), mainAppService]
        }

        pub fn status() -> Status {
            let raw: isize = unsafe {
                let svc = main_app();
                msg_send![svc, status]
            };
            match raw {
                1 => Status::Enabled,
                2 => Status::RequiresApproval,
                3 => Status::NotFound,
                _ => Status::NotRegistered,
            }
        }

        pub fn register(enable: bool) -> Result<(), String> {
            unsafe {
                let svc = main_app();
                let mut err: *mut Object = std::ptr::null_mut();
                let ok: BOOL = if enable {
                    msg_send![svc, registerAndReturnError: &mut err]
                } else {
                    msg_send![svc, unregisterAndReturnError: &mut err]
                };
                if ok != NO {
                    return Ok(());
                }
                Err(describe(err))
            }
        }

        unsafe fn describe(err: *mut Object) -> String {
            if err.is_null() {
                return "unknown error".to_string();
            }
            let desc: *mut Object = msg_send![err, localizedDescription];
            if desc.is_null() {
                return "unknown error".to_string();
            }
            let p: *const c_char = msg_send![desc, UTF8String];
            if p.is_null() {
                return "unknown error".to_string();
            }
            CStr::from_ptr(p).to_string_lossy().into_owned()
        }
    }

    #[cfg(target_os = "macos")]
    pub use imp::{register, status};
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn at_least_one_surface_stays_on() {
        assert_eq!(
            effective(true, false),
            Surfaces {
                menubar: true,
                dock: false
            }
        );
        assert_eq!(
            effective(true, true),
            Surfaces {
                menubar: true,
                dock: true
            }
        );
        assert_eq!(
            effective(false, true),
            Surfaces {
                menubar: false,
                dock: true
            }
        );
        // Both off is not a state: the menu-bar icon comes back.
        assert_eq!(
            effective(false, false),
            Surfaces {
                menubar: true,
                dock: false
            }
        );
    }

    #[test]
    fn login_item_follows_the_switch_but_not_past_the_user() {
        use sm::Status::*;
        assert_eq!(login_action(true, NotRegistered), LoginAction::Register);
        assert_eq!(login_action(true, NotFound), LoginAction::Register);
        assert_eq!(login_action(true, Enabled), LoginAction::Nothing);
        // Switched off in System Settings: we do not re-register behind their back.
        assert_eq!(
            login_action(true, RequiresApproval),
            LoginAction::LeaveApproval
        );
        assert_eq!(login_action(false, Enabled), LoginAction::Unregister);
        assert_eq!(
            login_action(false, RequiresApproval),
            LoginAction::Unregister
        );
        assert_eq!(login_action(false, NotRegistered), LoginAction::Nothing);
        assert_eq!(login_action(false, NotFound), LoginAction::Nothing);
    }
}
