//! The app: modules, the two window labels, and [`run`], which builds the
//! Tauri app — plugins, managed state, the command list, the tray — and hands
//! it the event loop. Everything it wires up lives in the module named for it.

mod actions;
mod activation;
mod auto_beam;
pub mod beam;
mod clipboard;
mod commands;
mod config;
mod dev_forward;
pub mod dev_servers;
mod dock_menu;
pub mod error;
mod hotkeys;
mod hud;
pub mod i18n;
mod licensing;
pub mod log;
mod main_thread;
mod popover;
mod preferences_window;
pub mod pull;
mod reveal;
pub mod services;
mod share;
pub mod ssh_config;
mod startup;
mod thumbs;
mod tray;
mod tray_drop;
mod tray_menu;
mod ui_bridge;
mod update_notes;
mod updates;
mod url_scheme;

use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;
use tauri_plugin_global_shortcut::ShortcutState;

/// The popover window's label, as `tauri.conf.json` declares it.
pub(crate) const POPOVER: &str = "popover";
/// The HUD window's label.
pub(crate) const HUD: &str = "hud";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // App-wide mutable state, one struct per concern; the module that owns
        // each reads it back with `app.state::<T>()` or a `State<'_, T>` arg.
        .manage(hotkeys::State::default())
        .manage(auto_beam::State::default())
        .manage(config::Cache::default())
        .manage(url_scheme::ParkedAsks::default())
        .manage(actions::PendingOpen::default())
        .manage(preferences_window::PendingUpdateCheck::default())
        .manage(hud::HudGeneration::default())
        .manage(tray_menu::RecentIcons::default())
        .manage(beam::Retries::default())
        .manage(updates::UpdateState::default())
        .manage(startup::Applied::default())
        .manage(licensing::Revalidation::default())
        .manage(dev_forward::State::default())
        .invoke_handler(tauri::generate_handler![
            preferences_window::take_update_check,
            url_scheme::take_url_beam,
            url_scheme::take_url_host,
            beam::list_hosts,
            beam::beam,
            beam::diagnose,
            beam::test_host,
            beam::install_pubkey,
            beam::resolve_ports,
            beam::host_storage,
            beam::beam_files,
            beam::host_cleanup,
            beam::clipboard_image,
            beam::clipboard_preview,
            clipboard::copy_text,
            reveal::reveal_recent,
            auto_beam::auto_beam_set,
            auto_beam::auto_beam_state,
            pull::pull_incoming,
            dev_forward::dev_servers,
            dev_forward::dev_forward_open,
            dev_forward::dev_forward_stop,
            dev_forward::dev_forwards,
            pull::open_pulled,
            config::get_config,
            config::set_config,
            licensing::license_status,
            licensing::license_activate,
            licensing::license_deactivate,
            licensing::license_seats,
            commands::open_url,
            commands::send_feedback,
            share::share_hostbeam,
            share::copy_share_link,
            commands::open_terminal,
            preferences_window::open_preferences,
            preferences_window::preferences_ready,
            commands::quit_app,
            updates::update_check,
            updates::update_available,
            updates::update_install,
            hotkeys::set_hotkey,
            hotkeys::set_toggle_hotkey,
            hotkeys::set_auto_hotkey,
            popover::resize_popover,
            popover::show_popover,
            popover::hide_popover,
            actions::take_pending_open,
            hud::hud_open,
            tray_menu::refresh_tray_menu,
            commands::app_version,
            log::read_logs,
            log::clear_logs,
            log::open_log_dir,
            log::log_dir
        ])
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_nspanel::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state != ShortcutState::Pressed {
                        return;
                    }
                    // One handler for every registered shortcut; hotkeys.rs
                    // says which fired, with beam as the fallback because it is
                    // the only one always registered.
                    match hotkeys::which(app, shortcut) {
                        hotkeys::Which::Toggle => {
                            log::info("show/hide shortcut pressed → toggle popover");
                            popover::toggle(app, false);
                        }
                        hotkeys::Which::Auto => {
                            log::info("automatic-beaming shortcut pressed");
                            auto_beam::toggle(app);
                        }
                        hotkeys::Which::Beam => actions::trigger_shortcut(app),
                    }
                })
                .with_shortcut(hotkeys::DEFAULT_HOTKEY)
                .expect("valid global shortcut")
                .build(),
        )
        // When the Preferences window closes, drop back to a menu-bar-only
        // (Accessory) app so no Dock icon lingers (it was promoted to Regular in
        // open_preferences for menu-bar-manager compatibility) — unless the user
        // asked for a Dock icon in Preferences → General → Startup.
        .on_window_event(|window, event| {
            #[cfg(target_os = "macos")]
            if window.label() == "preferences" && matches!(event, tauri::WindowEvent::Destroyed) {
                let app = window.app_handle();
                if !config::read(app).settings.dock {
                    let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                }
            }
        })
        .setup(|app| {
            // Diagnostic logging — set up first so everything after is recorded.
            log::init(app.handle());
            log::info(format!(
                "Hostbeam {} started ({} {})",
                env!("CARGO_PKG_VERSION"),
                std::env::consts::OS,
                std::env::consts::ARCH,
            ));
            let prev_hook = std::panic::take_hook();
            std::panic::set_hook(Box::new(move |info| {
                log::error(format!("PANIC: {info}"));
                prev_hook(info);
            }));

            // Menu-bar app: no Dock icon, lives only in the status bar.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Convert the popover window into a non-activating menu-bar panel and
            // wire its click-away dismissal.
            popover::configure_popover_panel(app.handle());
            // The floating beam HUD is a second non-activating panel (top-center).
            hud::configure_hud_panel(app.handle());

            // The clipboard watcher. Started here and left running: it does
            // nothing but compare an integer until someone arms it, and it
            // starts disarmed on every launch by design (auto_beam.rs).
            auto_beam::start(app.handle());

            // The menu-bar glyph (a template image), not the full app icon.
            let icon = tray::static_icon();

            // Right-click menu with quick actions, in the active locale.
            // Left-click still toggles the popover (menu is right-click only).
            let menu = tray_menu::tray_menu(app.handle(), i18n::locale(app.handle()))?;

            TrayIconBuilder::with_id(tray::TRAY_ID)
                .icon(icon)
                .icon_as_template(true)
                .tooltip("Hostbeam")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| tray_menu::on_menu_event(app, event.id().as_ref()))
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        // ⌥-click beams without opening anything — the idiom
                        // every other menu-bar utility uses for "the same
                        // thing, but skip the window". A plain click still
                        // toggles the popover.
                        if actions::is_option_click(actions::modifier_flags()) {
                            actions::beam_from_tray(tray.app_handle());
                        } else {
                            popover::toggle(tray.app_handle(), true);
                        }
                    }
                })
                .build(app)?;

            // The icon can take a drop now that there is an icon to drop on.
            tray_drop::enable(app.handle());

            // The Startup switches: tray icon, Dock icon, login item — now that
            // the tray exists to show or hide.
            startup::apply(app.handle());
            // ⌘⇥ to Hostbeam has no window to raise; show the popover instead.
            activation::watch(app.handle());
            // Right-click on the Dock icon → Hide from Dock.
            dock_menu::install(app.handle());

            // Background update check, and the install-without-asking that
            // follows it when switched on (updates.rs).
            updates::start(app.handle());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // A click on the Dock icon (shown when "Show in the Dock" is on)
            // opens the popover. A Dock click also activates the app, so the
            // observer in activation.rs fires too — both only ever show, never
            // toggle, or one would undo the other.
            #[cfg(target_os = "macos")]
            match &event {
                tauri::RunEvent::Reopen {
                    has_visible_windows: false,
                    ..
                } => {
                    log::info("dock icon clicked");
                    activation::on_activated(app);
                }
                // An image dropped on the Dock icon, opened with Hostbeam from
                // Finder, or passed to `open -a`. Park it and nudge the
                // popover; if the webview is not up yet — a cold start, which
                // is exactly what Open With does — it collects it on mount.
                tauri::RunEvent::Opened { urls } => {
                    // The same event carries both: files (a Dock drop, Open
                    // With, `open -a Hostbeam a.png`) and our own scheme.
                    for ask in urls.iter().filter_map(url_scheme::url_ask) {
                        match ask {
                            url_scheme::UrlAsk::Beam => url_scheme::beam_from_url(app),
                            url_scheme::UrlAsk::SwitchHost(id) => {
                                url_scheme::switch_host_from_url(app, &id);
                            }
                            url_scheme::UrlAsk::Preferences(tab) => {
                                // Not behind the switch: this is the door to
                                // the switch. A link that says "here is where
                                // to allow me" cannot need the permission it
                                // is asking for, and opening a window of the
                                // user's own app sends nothing anywhere.
                                log::warn_if_err(
                                    "open preferences (url)",
                                    preferences_window::open_preferences(app.clone(), tab),
                                );
                            }
                        }
                    }
                    // Every file, not the first: selecting five images in
                    // Finder and choosing Open With hands over five.
                    let files: Vec<String> = urls
                        .iter()
                        .filter_map(|u| u.to_file_path().ok())
                        .map(|f| f.to_string_lossy().into_owned())
                        .collect();
                    actions::opened_files(app, files);
                }
                // Quit, from anywhere (the menu, Cmd-Q, a relaunch into an
                // update): no forward outlives the app (ADR 0029).
                tauri::RunEvent::Exit => dev_forward::stop_all(app),
                _ => {}
            }
        });
}
