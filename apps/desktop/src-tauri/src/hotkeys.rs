//! The three global shortcuts: beam (always set — DEFAULT_HOTKEY until the
//! webview applies the saved one), show/hide, and automatic beaming. The last
//! two are off until the user records them in Preferences → Hotkey, because a
//! menu-bar utility claiming three global combos by default on a machine that
//! also runs CleanShot and Raycast would be greedy.
//!
//! The global-shortcut plugin has one handler for every registered shortcut,
//! so lib.rs asks [`which`] which one fired. And since re-registering means
//! unregistering everything first, all three are kept here and re-applied
//! together: changing one can never drop another.

use std::sync::Mutex;

use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

use crate::error::{CommandError, Error, Result};
use crate::log;

pub const DEFAULT_HOTKEY: &str = "CmdOrCtrl+Shift+7";

/// Which shortcut a press belongs to. Beam is the fallback: it is the only one
/// always registered, so anything that is not one of the optional two is it.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Which {
    Beam,
    Toggle,
    Auto,
}

impl Which {
    /// How the slot is named back to the UI when a combo is already taken.
    fn label(self) -> &'static str {
        match self {
            Self::Beam => "beam",
            Self::Toggle => "toggle",
            Self::Auto => "auto",
        }
    }
}

#[derive(Default)]
pub struct Hotkeys {
    /// The beam shortcut the webview applied from config; `None` means the
    /// default registered at plugin init is still in force.
    beam: Option<Shortcut>,
    /// The same combo as the recorder spelled it, kept for display: the tray
    /// menu prints it beside Beam screenshot, and a parsed `Shortcut` does not
    /// spell itself back the way a menu should print it. Always set and
    /// cleared together with `beam` — see [`Hotkeys::clear_beam`].
    beam_accel: Option<String>,
    /// The show/hide shortcut, if recorded.
    toggle: Option<Shortcut>,
    /// The automatic-beaming shortcut, if recorded.
    auto: Option<Shortcut>,
}

impl Hotkeys {
    /// Which slot already holds `s`, if any. The beam slot compares against its
    /// *effective* value, because an unset beam shortcut is still registered as
    /// DEFAULT_HOTKEY and would collide just the same.
    fn slot_of(&self, s: Shortcut) -> Option<Which> {
        if self.beam.unwrap_or_else(default_shortcut) == s {
            Some(Which::Beam)
        } else if self.toggle == Some(s) {
            Some(Which::Toggle)
        } else if self.auto == Some(s) {
            Some(Which::Auto)
        } else {
            None
        }
    }

    /// What a menu should print for the beam shortcut: the combo the webview
    /// applied, or the default that is registered until it does.
    fn beam_accelerator(&self) -> String {
        self.beam_accel
            .clone()
            .unwrap_or_else(|| DEFAULT_HOTKEY.to_string())
    }

    /// Forget the applied beam shortcut in both its forms. `apply` calls this
    /// when registration fails and the default takes over; clearing only the
    /// parsed half would leave the menu advertising a combo that does nothing.
    fn clear_beam(&mut self) {
        self.beam = None;
        self.beam_accel = None;
    }

    /// The error for assigning `s` to `slot`, if another slot already has it.
    /// Rust refuses a duplicate registration silently, so the UI is told which
    /// two combos collide rather than just that something did.
    fn taken(&self, s: Shortcut, slot: Which) -> Result<()> {
        match self.slot_of(s) {
            Some(other) if other != slot => Err(Error::ShortcutTaken(other.label())),
            _ => Ok(()),
        }
    }
}

/// Managed by Tauri (`app.manage(State::default())`), read through [`with`].
pub type State = Mutex<Hotkeys>;

fn with<T>(app: &AppHandle, f: impl FnOnce(&mut Hotkeys) -> T) -> T {
    let state = app.state::<State>();
    let mut guard = state.lock().unwrap_or_else(|poisoned| {
        log::warn("hotkey state was poisoned by a panic; continuing with it");
        poisoned.into_inner()
    });
    f(&mut guard)
}

fn default_shortcut() -> Shortcut {
    DEFAULT_HOTKEY.parse().expect("valid default shortcut")
}

fn parse(accelerator: &str) -> Result<Shortcut> {
    accelerator
        .parse::<Shortcut>()
        .map_err(|e| Error::Shortcut(format!("'{accelerator}' is not a valid shortcut: {e}")))
}

/// Which shortcut fired.
pub fn which(app: &AppHandle, pressed: &Shortcut) -> Which {
    with(app, |h| match (h.toggle, h.auto) {
        (Some(t), _) if t == *pressed => Which::Toggle,
        (_, Some(a)) if a == *pressed => Which::Auto,
        _ => Which::Beam,
    })
}

/// The beam combo as a menu should print it. The tray shows it beside Beam
/// screenshot, which is where most people will ever find out there is one.
#[must_use]
pub fn beam_accelerator(app: &AppHandle) -> String {
    with(app, |h| h.beam_accelerator())
}

/// Re-register both shortcuts from the state. The beam shortcut never ends up
/// missing: if the requested one fails, DEFAULT_HOTKEY takes its place. A
/// show/hide shortcut that fails to register is dropped from the state, so
/// the UI's next read reflects what is actually in force.
fn apply(app: &AppHandle) -> Result<()> {
    let (beam, toggle, auto) = with(app, |h| (h.beam, h.toggle, h.auto));
    let shortcuts = app.global_shortcut();
    log::warn_if_err("unregister global shortcuts", shortcuts.unregister_all());

    let mut result = Ok(());
    let wanted = beam.unwrap_or_else(default_shortcut);
    if let Err(e) = shortcuts.register(wanted) {
        // Never leave the app with no beam shortcut. If even the default
        // fails the app has no hotkey, which is worth shouting about.
        match shortcuts.register(default_shortcut()) {
            Ok(()) => log::error(format!(
                "beam shortcut {wanted:?} failed: {e} — fell back to {DEFAULT_HOTKEY}"
            )),
            Err(fallback) => log::error(format!(
                "beam shortcut {wanted:?} failed: {e}; default {DEFAULT_HOTKEY} also failed: {fallback}"
            )),
        }
        with(app, Hotkeys::clear_beam);
        result = Err(Error::Shortcut(e.to_string()));
    }
    // The optional two: a failure drops the shortcut from the state so the UI's
    // next read reflects what is actually in force, rather than showing a combo
    // that does nothing.
    for (opt, name, clear) in [
        (
            toggle,
            "show/hide",
            &(|h: &mut Hotkeys| h.toggle = None) as &dyn Fn(&mut Hotkeys),
        ),
        (auto, "automatic-beaming", &|h: &mut Hotkeys| h.auto = None),
    ] {
        if let Some(s) = opt {
            if let Err(e) = shortcuts.register(s) {
                log::error(format!(
                    "{name} shortcut {s:?} could not be registered: {e}"
                ));
                with(app, clear);
                result = Err(Error::Shortcut(e.to_string()));
            }
        }
    }
    result
}

/// Set the beam shortcut from a Tauri accelerator string (e.g. "Cmd+Shift+7").
#[tauri::command]
pub fn set_hotkey(app: AppHandle, accelerator: String) -> std::result::Result<(), CommandError> {
    let s = parse(&accelerator)?;
    with(&app, |h| h.taken(s, Which::Beam))?;
    let before = with(&app, |h| h.beam_accelerator());
    with(&app, |h| {
        h.beam = Some(s);
        h.beam_accel = Some(accelerator.clone());
    });
    let applied = apply(&app);
    // The tray menu prints this combo, so a change has to reach it — including
    // the change `apply` makes by refusing the new shortcut and putting the
    // default back. The webview writes the current value back on every render,
    // so the comparison is what keeps the menu from being rebuilt for nothing.
    if with(&app, |h| h.beam_accelerator()) != before {
        crate::tray_menu::refresh_tray_menu(app.clone(), None);
    }
    applied?;
    log::info(format!("beam shortcut set to '{accelerator}'"));
    Ok(())
}

/// Set, or with `None` clear, the show/hide shortcut.
#[tauri::command]
pub fn set_toggle_hotkey(
    app: AppHandle,
    accelerator: Option<String>,
) -> std::result::Result<(), CommandError> {
    let s = match accelerator
        .as_deref()
        .map(str::trim)
        .filter(|a| !a.is_empty())
    {
        Some(a) => Some(parse(a)?),
        None => None,
    };
    if let Some(s) = s {
        with(&app, |h| h.taken(s, Which::Toggle))?;
    }
    with(&app, |h| h.toggle = s);
    apply(&app)?;
    match accelerator {
        Some(a) if s.is_some() => log::info(format!("show/hide shortcut set to '{a}'")),
        _ => log::info("show/hide shortcut cleared"),
    }
    Ok(())
}

/// Set, or with `None` clear, the automatic-beaming shortcut.
#[tauri::command]
pub fn set_auto_hotkey(
    app: AppHandle,
    accelerator: Option<String>,
) -> std::result::Result<(), CommandError> {
    let s = match accelerator
        .as_deref()
        .map(str::trim)
        .filter(|a| !a.is_empty())
    {
        Some(a) => Some(parse(a)?),
        None => None,
    };
    if let Some(s) = s {
        with(&app, |h| h.taken(s, Which::Auto))?;
    }
    with(&app, |h| h.auto = s);
    apply(&app)?;
    match accelerator {
        Some(a) if s.is_some() => log::info(format!("automatic-beaming shortcut set to '{a}'")),
        _ => log::info("automatic-beaming shortcut cleared"),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // The "same shortcut" guards compare parsed values, so they must not be
    // fooled by spelling: modifier order, and CmdOrCtrl versus Cmd on macOS.
    #[test]
    fn equal_shortcuts_parse_equal_regardless_of_spelling() {
        let a = parse("Cmd+Shift+7").unwrap();
        assert_eq!(a, parse("Shift+Cmd+7").unwrap());
        assert_eq!(a, parse("cmd+shift+7").unwrap());
        assert_eq!(a, default_shortcut());
        assert_ne!(a, parse("Cmd+Shift+8").unwrap());
        assert_ne!(a, parse("Ctrl+Shift+7").unwrap());
    }

    #[test]
    fn nonsense_is_an_error_naming_the_input() {
        let err = parse("Cmd+Shift+NotAKey").unwrap_err();
        assert!(err.to_string().contains("Cmd+Shift+NotAKey"), "{err}");
        assert!(parse("").is_err());
    }

    #[test]
    fn the_default_is_valid() {
        let _ = default_shortcut();
    }

    fn hk(beam: Option<&str>, toggle: Option<&str>, auto: Option<&str>) -> Hotkeys {
        Hotkeys {
            beam: beam.map(|a| parse(a).unwrap()),
            beam_accel: beam.map(str::to_string),
            toggle: toggle.map(|a| parse(a).unwrap()),
            auto: auto.map(|a| parse(a).unwrap()),
        }
    }

    #[test]
    fn the_menu_prints_the_default_combo_until_the_webview_applies_one() {
        assert_eq!(hk(None, None, None).beam_accelerator(), DEFAULT_HOTKEY);
    }

    #[test]
    fn the_menu_prints_the_combo_as_it_was_recorded() {
        // The spelling, not the parsed form: the menu shows what the user
        // chose.
        assert_eq!(
            hk(Some("Cmd+Shift+8"), None, None).beam_accelerator(),
            "Cmd+Shift+8"
        );
    }

    #[test]
    fn clearing_the_beam_slot_clears_what_the_menu_prints_with_it() {
        // Both halves, or a refused shortcut goes on being advertised by a
        // menu item that now fires the default instead.
        let mut h = hk(Some("Cmd+Shift+8"), None, None);
        h.clear_beam();
        assert_eq!(h.beam, None);
        assert_eq!(h.beam_accelerator(), DEFAULT_HOTKEY);
    }

    #[test]
    fn an_unset_beam_slot_still_owns_the_default_combo() {
        // The default is registered even when the user never chose one, so
        // assigning it to another slot would silently kill the beam shortcut.
        let h = hk(None, None, None);
        assert!(matches!(
            h.taken(default_shortcut(), Which::Toggle),
            Err(Error::ShortcutTaken("beam"))
        ));
        assert!(matches!(
            h.taken(default_shortcut(), Which::Auto),
            Err(Error::ShortcutTaken("beam"))
        ));
    }

    #[test]
    fn a_slot_may_keep_its_own_combo() {
        // Re-applying the same shortcut to the slot that already has it is not
        // a conflict — the UI writes the current value back on every render.
        let h = hk(
            Some("Cmd+Shift+7"),
            Some("Cmd+Shift+8"),
            Some("Cmd+Shift+9"),
        );
        assert!(h.taken(parse("Cmd+Shift+7").unwrap(), Which::Beam).is_ok());
        assert!(h
            .taken(parse("Cmd+Shift+8").unwrap(), Which::Toggle)
            .is_ok());
        assert!(h.taken(parse("Cmd+Shift+9").unwrap(), Which::Auto).is_ok());
    }

    #[test]
    fn conflicts_name_the_slot_that_already_has_it() {
        let h = hk(
            Some("Cmd+Shift+7"),
            Some("Cmd+Shift+8"),
            Some("Cmd+Shift+9"),
        );
        assert!(matches!(
            h.taken(parse("Cmd+Shift+9").unwrap(), Which::Toggle),
            Err(Error::ShortcutTaken("auto"))
        ));
        assert!(matches!(
            h.taken(parse("Cmd+Shift+8").unwrap(), Which::Auto),
            Err(Error::ShortcutTaken("toggle"))
        ));
        assert!(matches!(
            h.taken(parse("Cmd+Shift+7").unwrap(), Which::Auto),
            Err(Error::ShortcutTaken("beam"))
        ));
    }

    #[test]
    fn a_free_combo_is_free_for_every_slot() {
        let h = hk(Some("Cmd+Shift+7"), Some("Cmd+Shift+8"), None);
        let free = parse("Ctrl+Alt+K").unwrap();
        assert!(h.taken(free, Which::Auto).is_ok());
        assert!(h.taken(free, Which::Toggle).is_ok());
    }

    #[test]
    fn spelling_does_not_hide_a_conflict() {
        // The guard compares parsed shortcuts, so a differently-spelled but
        // identical combo must still be refused.
        let h = hk(Some("Cmd+Shift+7"), None, None);
        assert!(matches!(
            h.taken(parse("shift+cmd+7").unwrap(), Which::Auto),
            Err(Error::ShortcutTaken("beam"))
        ));
    }
}
