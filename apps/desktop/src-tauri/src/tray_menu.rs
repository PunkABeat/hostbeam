//! The tray's right-click menu: what it offers (Beam, Switch host ▸, Recent ▸
//! with thumbnails, the doors to Preferences and About) and what each item does.

use tauri::menu::{
    CheckMenuItem, IconMenuItem, IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu,
};
use tauri::{AppHandle, Manager};

use crate::actions::{beam_from_tray, copy_recent, restart_onboarding, switch_host};
use crate::commands::send_feedback;
use crate::popover::toggle;
use crate::preferences_window::{check_updates_from_tray, open_preferences};
use crate::{beam, config, hotkeys, i18n, log, services, tray};

/// Menu ids of the host items, so one arm can route every one of them.
pub(crate) const HOST_ITEM: &str = "host:";

/// The same, for the Recent items.
pub(crate) const RECENT_ITEM: &str = "recent:";
/// Prefix for an open dev-server forward's Stop item: `devstop:<target>:<port>`.
/// A target never holds a colon (`ssh::valid_alias`), so the last one splits.
const FORWARD_ITEM: &str = "devstop:";

/// The target and port a Stop item names.
fn forward_of(rest: &str) -> Option<(&str, u16)> {
    let (target, port) = rest.rsplit_once(':')?;
    Some((target, port.parse().ok()?))
}

/// The box every Recent menu icon is fitted into, in pixels: 16:10, the shape
/// most screenshots already are, so the common case fills it.
///
/// macOS draws a menu icon 18pt tall whatever it is handed, keeping the
/// aspect ratio — so 40px tall is about twice that, and the spare pixels are
/// what keep it sharp on a Retina display. One box for every row also means
/// one icon width, and names that line up instead of stepping in and out.
/// 64x40 of RGBA is 10KB; eight of them nobody notices.
pub(crate) const RECENT_ICON_BOX: (u32, u32) = (64, 40);

/// How many gestures the Recent submenu offers. The popover shows three and
/// Preferences shows all; a menu can carry more than a card without becoming
/// a list to read, and Show all… is underneath for the rest.
pub(crate) const RECENT_IN_MENU: usize = 8;

/// One host row of the tray's Switch host ▸ submenu.
#[derive(Debug, PartialEq, Eq)]
pub(crate) struct HostEntry {
    id: String,
    /// What the menu prints: a typed host's name, or the alias, which is both
    /// id and name for everything that comes from `~/.ssh/config`.
    name: String,
    /// Where a beam goes today. Ticked, so the menu says where ⌘⇧7 lands.
    current: bool,
}

/// The hosts the tray offers to switch between, in the order they were added,
/// minus ids that no longer resolve — a host gone from `~/.ssh/config` stays
/// in `added_ids`, marked missing in the popover and Preferences, and a menu
/// must not offer switching to somewhere that is gone.
///
/// One host still earns the submenu: it says where beams go, and carries the
/// way into host management. None means there is nothing to manage yet, and
/// the popover's onboarding is the path to a first host.
pub(crate) fn host_entries(
    added: &[String],

    default_id: Option<&str>,
    manual: &[config::ManualHost],
    ssh_aliases: &[String],
) -> Vec<HostEntry> {
    let mut out: Vec<HostEntry> = added
        .iter()
        .filter_map(|id| {
            let name = match manual.iter().find(|m| &m.id == id) {
                Some(m) if !m.name.is_empty() => m.name.clone(),
                Some(_) => id.clone(),
                None if ssh_aliases.contains(id) => id.clone(),
                None => return None,
            };
            Some(HostEntry {
                id: id.clone(),
                name,
                current: false,
            })
        })
        .collect();
    if out.is_empty() {
        return out;
    }
    // The popover beams to the default host, and to the first added one only
    // when none is set or the default was removed. A default still added but
    // gone from ~/.ssh/config refuses beams (host-order.ts `currentHost`), so
    // nothing is ticked: the tick follows the beam, or it would point at a
    // host the beam does not use.
    let current = match default_id {
        Some(d) if out.iter().any(|t| t.id == d) => Some(d.to_string()),
        Some(d) if added.iter().any(|a| a == d) => None,
        _ => Some(out[0].id.clone()),
    };
    for t in &mut out {
        t.current = current.as_deref() == Some(t.id.as_str());
    }
    out
}

/// One row of the tray's Recent ▸ submenu: one *gesture*, which is usually one
/// file but is every file of a drop.
#[derive(Debug, PartialEq, Eq)]
pub(crate) struct RecentEntry {
    /// The first row's id — what the webview looks the gesture up by, exactly
    /// as the popover's grouping keys it.
    key: String,
    /// The file name, with a count when the gesture carried more than one.
    label: String,
    /// The first row's thumbnail, as the popover stored it — the same picture
    /// the popover shows, shrunk to a menu icon. `None` leaves the row a
    /// plain text item rather than a blank space where a picture should be.
    thumb: Option<String>,
}

/// The newest gestures, in the order they were beamed.
///
/// Rows are grouped the way `lib/recent.ts` groups them — *adjacent* rows
/// sharing a `group`, never rows scattered through the list, because one
/// gesture writes its rows together and adjacency cannot merge two separate
/// drops that happen to collide on an id.
pub(crate) fn recent_entries(rows: &[config::RecentBeam], max: usize) -> Vec<RecentEntry> {
    let mut out: Vec<RecentEntry> = Vec::new();
    let mut counts: Vec<usize> = Vec::new();
    let mut last_group: Option<&str> = None;
    for row in rows {
        let group = row.group.as_deref().filter(|g| !g.is_empty());
        if let (Some(g), Some(prev), Some(n)) = (group, last_group, counts.last_mut()) {
            if g == prev {
                *n += 1;
                continue;
            }
        }
        if out.len() == max {
            break;
        }
        out.push(RecentEntry {
            key: row.id.clone(),
            label: file_name(&row.path),
            thumb: row.thumb.clone(),
        });
        counts.push(1);
        last_group = group;
    }
    for (entry, n) in out.iter_mut().zip(counts) {
        if n > 1 {
            // A count, not a sentence: "×3" needs no translating, and the
            // whole drop is what a click copies.
            entry.label = format!("{} ×{n}", entry.label);
        }
    }
    out
}

/// A stored thumbnail as a menu icon, or `None` when there is nothing to
/// draw — a trimmed row, a preview file that is gone, or a format this build
/// cannot decode. `thumb` is a cache path, or a data URL on an older row.
pub(crate) fn recent_icon(thumb: &str) -> Option<tauri::image::Image<'static>> {
    let (bw, bh) = RECENT_ICON_BOX;
    // Decode no smaller than the box's long edge, then letterbox: the decode
    // cap is what keeps the resize cheap, the box is what makes every row the
    // same width.
    let (w, h, rgba) = services::image::rgba_from_thumb(thumb, bw.max(bh))?;
    let (w, h, rgba) = services::image::fit_into_box(w, h, &rgba, bw, bh)?;
    Some(tauri::image::Image::new_owned(rgba, w, h))
}

/// Menu icons already decoded, kept between rebuilds and keyed by row id.
/// Managed by Tauri.
///
/// The menu is rebuilt after every beam, and decoding eight thumbnails costs
/// about 20ms on the main thread — a stall at the exact moment the HUD is
/// animating. After a beam only one row is new, so the other seven are
/// remembered. A row that cannot be decoded remembers *that*, so a broken
/// thumbnail is not re-decoded every time either.
#[derive(Default)]
pub struct RecentIcons(
    std::sync::Mutex<std::collections::HashMap<String, Option<tauri::image::Image<'static>>>>,
);

impl RecentIcons {
    /// The icon for one Recent row, decoding it only the first time it is seen.
    fn icon_for(&self, key: &str, thumb: &str) -> Option<tauri::image::Image<'static>> {
        let mut cache = self.0.lock().unwrap_or_else(|p| p.into_inner());
        if let Some(hit) = cache.get(key) {
            return hit.clone();
        }
        let icon = recent_icon(thumb);
        cache.insert(key.to_string(), icon.clone());
        icon
    }

    /// Forget icons for rows the menu no longer shows, so the cache can never
    /// outgrow the handful of entries it exists for.
    fn retain(&self, shown: &[RecentEntry]) {
        self.0
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .retain(|key, _| shown.iter().any(|e| &e.key == key));
    }
}

/// The last segment of a remote path. Remote paths are posix, whatever this
/// Mac thinks a separator is.
pub(crate) fn file_name(path: &str) -> String {
    path.rsplit('/').next().unwrap_or(path).to_string()
}

/// Build the tray's right-click menu in the given locale.
pub(crate) fn tray_menu(app: &AppHandle, loc: &str) -> tauri::Result<Menu<tauri::Wry>> {
    // First, and in a group of its own: the thing the app is for. Until this
    // item existed a mouse could only beam by opening the popover first. The
    // combo is printed beside it — the menu people already open is where most
    // will ever learn there is a shortcut — and it follows the recorded one,
    // so it can never advertise a key that has been reassigned.
    let accel = hotkeys::beam_accelerator(app);
    let beam_i = MenuItem::with_id(app, "beam", i18n::t(loc, "tray.beam"), true, Some(&accel))
        .or_else(|e| {
            // A combo the recorder allows but a menu cannot print is a missing
            // shortcut, not a missing item — but say so, because silence here
            // is indistinguishable from the menu never having had one.
            log::warn(format!(
                "tray menu: '{accel}' is not a menu accelerator ({e}); Beam shows no shortcut"
            ));
            MenuItem::with_id(app, "beam", i18n::t(loc, "tray.beam"), true, None::<&str>)
        })?;
    // Where the next beam goes, without opening anything, and the way to the
    // screen that owns hosts. Reading `~/.ssh/config` here is the same parse
    // the popover asks for at boot; the menu is built once at startup and
    // again whenever the hosts or the current one change.
    let cfg = config::read(app);
    let aliases: Vec<String> = beam::list_hosts_blocking()
        .into_iter()
        .map(|h| h.id)
        .collect();
    let entries = host_entries(
        &cfg.added_ids,
        cfg.default_id.as_deref(),
        &cfg.manual_hosts,
        &aliases,
    );
    let host_items = entries
        .iter()
        .map(|t| {
            CheckMenuItem::with_id(
                app,
                format!("{HOST_ITEM}{}", t.id),
                &t.name,
                true,
                t.current,
                None::<&str>,
            )
        })
        .collect::<tauri::Result<Vec<_>>>()?;
    // Adding, removing and renaming hosts all live in Preferences → Hosts, so
    // the list ends with the door to it rather than growing edit affordances
    // a menu cannot carry.
    let sep_hosts = PredefinedMenuItem::separator(app)?;
    let manage_i = MenuItem::with_id(
        app,
        "manage_hosts",
        i18n::t(loc, "tray.manageHosts"),
        true,
        None::<&str>,
    )?;
    let switch_i = if host_items.is_empty() {
        None
    } else {
        let mut refs: Vec<&dyn IsMenuItem<tauri::Wry>> = host_items
            .iter()
            .map(|i| i as &dyn IsMenuItem<tauri::Wry>)
            .collect();
        refs.push(&sep_hosts);
        refs.push(&manage_i);
        Some(Submenu::with_id_and_items(
            app,
            "switch_host",
            i18n::t(loc, "tray.switchHost"),
            true,
            &refs,
        )?)
    };
    // What you beamed, ready to paste again. The rows hold remote paths, so a
    // click copies — the one thing history can do, and the thing an agent
    // conversation keeps needing a second time.
    let recent = recent_entries(&cfg.recent, RECENT_IN_MENU);
    let icons = app.state::<RecentIcons>();
    let recent_items = recent
        .iter()
        .map(|e| -> tauri::Result<Box<dyn IsMenuItem<tauri::Wry>>> {
            let id = format!("{RECENT_ITEM}{}", e.key);
            // Two item types for one list: a row whose thumbnail was trimmed
            // away still belongs in the menu, as text.
            match e.thumb.as_deref().and_then(|t| icons.icon_for(&e.key, t)) {
                Some(icon) => Ok(Box::new(IconMenuItem::with_id(
                    app,
                    id,
                    &e.label,
                    true,
                    Some(icon),
                    None::<&str>,
                )?)),
                None => Ok(Box::new(MenuItem::with_id(
                    app,
                    id,
                    &e.label,
                    true,
                    None::<&str>,
                )?)),
            }
        })
        .collect::<tauri::Result<Vec<_>>>()?;
    icons.retain(&recent);
    let sep_recent = PredefinedMenuItem::separator(app)?;
    let show_all_i = MenuItem::with_id(
        app,
        "show_recent",
        i18n::t(loc, "tray.showAll"),
        true,
        None::<&str>,
    )?;
    let recent_i = if recent_items.is_empty() {
        None
    } else {
        let mut refs: Vec<&dyn IsMenuItem<tauri::Wry>> = recent_items
            .iter()
            .map(std::convert::AsRef::as_ref)
            .collect();
        refs.push(&sep_recent);
        refs.push(&show_all_i);
        Some(Submenu::with_id_and_items(
            app,
            "recent",
            i18n::t(loc, "tray.recent"),
            true,
            &refs,
        )?)
    };
    // Open dev-server forwards (ADR 0029): the menu bar says one is held, and
    // a click ends it. Only while one is open.
    let forward_items = crate::dev_forward::list(app)
        .iter()
        .map(|f| {
            MenuItem::with_id(
                app,
                format!("{FORWARD_ITEM}{}:{}", f.target, f.port),
                format!(
                    "{} {}:{}",
                    i18n::t(loc, "tray.stopForward"),
                    f.target,
                    f.port
                ),
                true,
                None::<&str>,
            )
        })
        .collect::<tauri::Result<Vec<_>>>()?;
    let sep_forwards = PredefinedMenuItem::separator(app)?;
    let sep_beam = PredefinedMenuItem::separator(app)?;
    let open_i = MenuItem::with_id(app, "open", i18n::t(loc, "tray.open"), true, None::<&str>)?;
    // Show ⌘, next to Preferences (the macOS-standard shortcut); the popover's
    // webview handles the keypress. Fall back to no accelerator if it won't parse.
    let prefs_i = MenuItem::with_id(
        app,
        "prefs",
        i18n::t(loc, "tray.prefs"),
        true,
        Some("CmdOrCtrl+Comma"),
    )
    .or_else(|_| MenuItem::with_id(app, "prefs", i18n::t(loc, "tray.prefs"), true, None::<&str>))?;
    let onboard_i = MenuItem::with_id(
        app,
        "restart_onboarding",
        i18n::t(loc, "tray.restart"),
        true,
        None::<&str>,
    )?;
    let sep = PredefinedMenuItem::separator(app)?;
    // Right above Quit, in the same group: the menu people open when they are
    // done with the app is the one place to ask what went wrong (ADR 0023).
    let feedback_i = MenuItem::with_id(
        app,
        "feedback",
        i18n::t(loc, "tray.feedback"),
        true,
        None::<&str>,
    )?;
    // Apple's order in an app menu: About first, then the update check. Both
    // open the pane that already answers them, rather than a second copy of
    // it living in a menu.
    let about_i = MenuItem::with_id(app, "about", i18n::t(loc, "tray.about"), true, None::<&str>)?;
    let updates_i = MenuItem::with_id(
        app,
        "check_updates",
        i18n::t(loc, "tray.checkUpdates"),
        true,
        None::<&str>,
    )?;
    let quit_i = PredefinedMenuItem::quit(app, Some(i18n::t(loc, "tray.quit")))?;
    let mut items: Vec<&dyn IsMenuItem<tauri::Wry>> = vec![&beam_i];
    if let Some(sub) = &switch_i {
        items.push(sub);
    }
    if let Some(sub) = &recent_i {
        items.push(sub);
    }
    if !forward_items.is_empty() {
        items.push(&sep_forwards);
        for f in &forward_items {
            items.push(f);
        }
    }
    for item in [
        &sep_beam as &dyn IsMenuItem<tauri::Wry>,
        &open_i,
        &prefs_i,
        &onboard_i,
        &sep,
        &about_i,
        &updates_i,
        &feedback_i,
        &quit_i,
    ] {
        items.push(item);
    }
    Menu::with_items(app, &items)
}

/// Rebuild the tray menu when the language changes, so its labels update without
/// a restart. The webview passes the locale it just resolved (avoiding a race
/// with the config mirror); falls back to the persisted config otherwise.
#[tauri::command]
pub fn refresh_tray_menu(app: AppHandle, locale: Option<String>) {
    let loc = locale.unwrap_or_else(|| i18n::locale(&app).to_string());
    if let (Ok(menu), Some(tray)) = (tray_menu(&app, &loc), app.tray_by_id(tray::TRAY_ID)) {
        log::warn_if_err("refresh tray menu", tray.set_menu(Some(menu)));
    }
}

/// What a click on one of the menu's items does.
pub(crate) fn on_menu_event(app: &AppHandle, id: &str) {
    match id {
        "beam" => beam_from_tray(app),
        id if id.starts_with(HOST_ITEM) => switch_host(app, &id[HOST_ITEM.len()..]),
        id if id.starts_with(RECENT_ITEM) => {
            copy_recent(app, &id[RECENT_ITEM.len()..]);
        }
        id if id.starts_with(FORWARD_ITEM) => {
            if let Some((target, port)) = forward_of(&id[FORWARD_ITEM.len()..]) {
                log::info(format!("tray menu → stop forward {target}:{port}"));
                let (app, target) = (app.clone(), target.to_string());
                // Off the menu's thread: stopping waits on ssh.
                std::thread::spawn(move || crate::dev_forward::stop_one(&app, &target, port));
            }
        }
        "manage_hosts" => {
            log::warn_if_err(
                "open preferences → hosts (tray)",
                open_preferences(app.clone(), Some("hosts".into())),
            );
        }
        "about" => {
            log::warn_if_err(
                "open preferences → about (tray)",
                open_preferences(app.clone(), Some("about".into())),
            );
        }
        "check_updates" => check_updates_from_tray(app),
        "show_recent" => {
            log::warn_if_err(
                "open preferences → recent (tray)",
                open_preferences(app.clone(), Some("recent".into())),
            );
        }
        "open" => toggle(app, false),
        "prefs" => {
            log::warn_if_err(
                "open preferences (tray)",
                open_preferences(app.clone(), None),
            );
        }
        "restart_onboarding" => restart_onboarding(app),
        "feedback" => send_feedback(None),
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn manual(id: &str, name: &str) -> config::ManualHost {
        config::ManualHost {
            id: id.into(),
            name: name.into(),
        }
    }

    fn ids(v: &[&str]) -> Vec<String> {
        v.iter().map(|s| (*s).to_string()).collect()
    }

    #[test]
    fn a_stop_item_names_its_host_and_port() {
        assert_eq!(forward_of("devbox:5173"), Some(("devbox", 5173)));
        assert_eq!(
            forward_of("dev@10.0.0.2:3000"),
            Some(("dev@10.0.0.2", 3000))
        );
        assert_eq!(forward_of("devbox"), None);
        assert_eq!(forward_of("devbox:http"), None);
    }

    #[test]
    fn the_host_submenu_keeps_the_order_hosts_were_added_in() {
        let t = host_entries(&ids(&["b", "a"]), Some("a"), &[], &ids(&["a", "b"]));
        assert_eq!(
            t.iter().map(|t| t.name.as_str()).collect::<Vec<_>>(),
            ["b", "a"]
        );
        // The tick marks where a beam goes, not where the list starts.
        assert_eq!(t.iter().filter(|t| t.current).count(), 1);
        assert!(t[1].current);
    }

    #[test]
    fn a_typed_host_shows_its_name_and_an_ssh_host_its_alias() {
        let t = host_entries(
            &ids(&["prod", "typed", "unnamed"]),
            Some("prod"),
            &[manual("typed", "Laptop"), manual("unnamed", "")],
            &ids(&["prod"]),
        );
        assert_eq!(
            t.iter().map(|t| t.name.as_str()).collect::<Vec<_>>(),
            ["prod", "Laptop", "unnamed"]
        );
    }

    #[test]
    fn a_missing_default_ticks_nothing() {
        // The 2026-10-06 case: the default left ~/.ssh/config. Beams refuse
        // rather than go to the first host, so the menu must not tick it.
        let t = host_entries(
            &ids(&["client", "gone"]),
            Some("gone"),
            &[],
            &ids(&["client"]),
        );
        assert_eq!(t.len(), 1);
        assert!(!t[0].current);
    }

    #[test]
    fn a_host_that_no_longer_exists_is_not_offered() {
        // Gone from ~/.ssh/config, still in added_ids (marked missing in the
        // popover): beaming there could only fail.
        let t = host_entries(&ids(&["a", "gone", "b"]), Some("a"), &[], &ids(&["a", "b"]));
        assert_eq!(
            t.iter().map(|t| t.id.as_str()).collect::<Vec<_>>(),
            ["a", "b"]
        );
    }

    #[test]
    fn the_tick_falls_back_the_way_the_popover_does() {
        // No default, or one naming a host that was removed from Hostbeam:
        // the popover beams to the first added host, so that is what the menu
        // ticks. (A default still added but missing ticks nothing, above.)
        for d in [None, Some("gone")] {
            let t = host_entries(&ids(&["a", "b"]), d, &[], &ids(&["a", "b"]));
            assert!(t[0].current, "{d:?}");
            assert!(!t[1].current, "{d:?}");
        }
    }

    #[test]
    fn one_host_still_gets_a_submenu_and_no_hosts_gets_none() {
        // One: the tick says where beams go, and Manage hosts… is under it.
        let one = host_entries(&ids(&["a", "gone"]), Some("a"), &[], &ids(&["a"]));
        assert_eq!(one.len(), 1);
        assert!(one[0].current);
        // None: nothing to switch between and nothing added to manage.
        assert!(host_entries(&[], None, &[], &ids(&["a"])).is_empty());
        assert!(host_entries(&ids(&["gone"]), None, &[], &ids(&["a"])).is_empty());
    }

    fn beamed(id: &str, path: &str, group: Option<&str>) -> config::RecentBeam {
        config::RecentBeam {
            id: id.into(),
            path: path.into(),
            group: group.map(str::to_string),
            thumb: None,
            local: None,
        }
    }

    #[test]
    fn recent_shows_the_file_name_newest_first() {
        let rows = [
            beamed("r2", "/tmp/hostbeam/b.png", None),
            beamed("r1", "/srv/shots/a.png", None),
        ];
        let e = recent_entries(&rows, 8);
        assert_eq!(
            e.iter().map(|e| e.label.as_str()).collect::<Vec<_>>(),
            ["b.png", "a.png"]
        );
        // Keyed by the row, which is how the webview finds it again.
        assert_eq!(e[0].key, "r2");
    }

    #[test]
    fn one_drop_is_one_entry_counting_its_files() {
        let rows = [
            beamed("r3", "/tmp/a.png", Some("g1")),
            beamed("r4", "/tmp/b.png", Some("g1")),
            beamed("r5", "/tmp/c.png", Some("g1")),
            beamed("r6", "/tmp/old.png", None),
        ];
        let e = recent_entries(&rows, 8);
        assert_eq!(
            e.iter().map(|e| e.label.as_str()).collect::<Vec<_>>(),
            ["a.png ×3", "old.png"]
        );
        // The gesture is keyed on its first row, the one a click copies from.
        assert_eq!(e[0].key, "r3");
    }

    #[test]
    fn two_drops_that_share_nothing_but_a_neighbour_stay_apart() {
        // Adjacency, not lookup: separate gestures never merge, and a row
        // written before groups existed stands on its own.
        let rows = [
            beamed("r1", "/tmp/a.png", Some("g1")),
            beamed("r2", "/tmp/b.png", Some("g2")),
            beamed("r3", "/tmp/c.png", None),
            beamed("r4", "/tmp/d.png", None),
        ];
        assert_eq!(recent_entries(&rows, 8).len(), 4);
    }

    #[test]
    fn the_menu_stops_at_its_limit_without_splitting_a_drop() {
        let rows = [
            beamed("r1", "/tmp/a.png", Some("g1")),
            beamed("r2", "/tmp/b.png", Some("g1")),
            beamed("r3", "/tmp/c.png", None),
        ];
        let e = recent_entries(&rows, 1);
        // One entry, still counting every file of the drop it stands for.
        assert_eq!(e.len(), 1);
        assert_eq!(e[0].label, "a.png ×2");
        assert!(recent_entries(&[], 8).is_empty());
    }

    #[test]
    fn a_drop_wears_the_thumbnail_of_the_file_it_is_named_after() {
        let mut rows = [
            beamed("r1", "/tmp/a.png", Some("g1")),
            beamed("r2", "/tmp/b.png", Some("g1")),
        ];
        rows[0].thumb = Some("data:image/jpeg;base64,AAAA".into());
        rows[1].thumb = Some("data:image/jpeg;base64,BBBB".into());
        let e = recent_entries(&rows, 8);
        assert_eq!(e.len(), 1);
        assert_eq!(e[0].thumb.as_deref(), Some("data:image/jpeg;base64,AAAA"));
    }

    #[test]
    fn a_row_with_no_thumbnail_is_still_a_row() {
        // Trimmed to keep the cache in budget, or a format with no decoder:
        // either way the beam is still the one you want to copy.
        let e = recent_entries(&[beamed("r1", "/tmp/a.png", None)], 8);
        assert_eq!(e.len(), 1);
        assert!(e[0].thumb.is_none());
        assert!(recent_icon("data:image/jpeg;base64,not-an-image").is_none());
        assert!(recent_icon("/tmp/a.png").is_none());
    }

    #[test]
    fn the_icon_cache_holds_only_what_the_menu_shows() {
        let thumb = {
            let (w, h) = (48u32, 30u32);
            services::image::preview_data_url(w, h, &vec![7u8; (w * h * 4) as usize], 480)
                .expect("a thumbnail to decode")
        };
        // Two rows seen, then a menu that shows only the second.
        let icons = RecentIcons::default();
        assert!(icons.icon_for("keep", &thumb).is_some());
        assert!(icons.icon_for("drop", &thumb).is_some());
        icons.retain(&[RecentEntry {
            key: "keep".into(),
            label: "a.png".into(),
            thumb: Some(thumb),
        }]);
        let cache = icons.0.lock().unwrap();
        assert!(cache.contains_key("keep"));
        assert!(!cache.contains_key("drop"));
    }

    #[test]
    fn a_remote_path_is_named_by_its_last_segment() {
        assert_eq!(file_name("/tmp/hostbeam/a.png"), "a.png");
        // Remote paths are posix, and a name with no slash is its own name.
        assert_eq!(file_name("a.png"), "a.png");
        assert_eq!(file_name("/tmp/odd name.png"), "odd name.png");
    }
}
