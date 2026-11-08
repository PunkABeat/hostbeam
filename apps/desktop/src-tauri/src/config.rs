//! Durable config store. The design frontend keeps settings *and* recent
//! history in a single `HB` config object (default host, hotkey, remote folder,
//! toggles, recent beams). This persists that object as JSON in the app data
//! dir, replacing the prototype's localStorage. (Consolidates the Flutter app's
//! separate settings + history JSON stores, since the UI of record is now one
//! config blob.)

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Deserialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};

use crate::error::{CommandError, Error, Result};

const FILE: &str = "config.json";

/// The subset of the persisted config the backend reads, mirroring the
/// `window.HB` shape (`src/design/shared.jsx` DEFAULTS). `#[serde(default)]` makes
/// every missing field an explicit default rather than a silent `.and_then`
/// dead-end; unknown fields are ignored, and the UI remains the owner/writer of
/// the full config (see [`set_config`], which round-trips the raw JSON verbatim).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Config {
    /// Hosts the user has added — a non-empty list means there's a beam target.
    pub added_ids: Vec<String>,
    /// The host beams go to. The popover falls back to the first added host
    /// when it is unset or gone, and the tray's Beam to ▸ ticks the same one.
    pub default_id: Option<String>,
    /// Hosts the user typed in. Everything else in `added_ids` is a
    /// `~/.ssh/config` alias, whose name is the alias.
    pub manual_hosts: Vec<ManualHost>,
    /// Files beamed, newest first — the tray lists the top few.
    pub recent: Vec<RecentBeam>,
    pub settings: Settings,
    /// The update version the user skipped. Per version: a newer release does
    /// not match it, so skipping one never hides the next (updates.rs).
    pub update_dismissed: Option<String>,
}

/// One beamed file, as the webview records it. Only the parts a menu needs;
/// the thumbnail, host and timestamp stay the webview's business.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct RecentBeam {
    /// Row id. The first row of a gesture is also that gesture's menu id.
    pub id: String,
    /// The remote path — what a copy hands you, and where the name comes from.
    pub path: String,
    /// The gesture this file arrived with. Rows sharing one are a single drop;
    /// absent on rows written before 0.1.19, which stand alone.
    pub group: Option<String>,
    /// The preview the popover shows, ~480px on its long edge: a path into the
    /// thumbnail cache (`thumbs.rs`), or, on rows written before previews moved
    /// there, a data URL. `None` for a format with no pure-Rust decoder (HEIC),
    /// and for rows whose thumbnail was trimmed to keep the cache in budget.
    pub thumb: Option<String>,
    /// The file on this Mac it was beamed from, for Show in Finder. Absent for
    /// a clipboard picture, and on rows written before it existed.
    pub local: Option<String>,
}

/// A host the user typed in rather than one discovered in `~/.ssh/config`.
/// Only the two fields a menu needs; the webview owns the rest of the record.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ManualHost {
    pub id: String,
    /// Empty when the host was never named — the menu then prints the id.
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    /// Whether the hotkey beams immediately vs. just opening the popover.
    pub immediate: bool,
    /// Preferences → General → Startup (applied by startup.rs): register as a
    /// login item.
    pub launch: bool,
    /// Show the menu-bar icon. Never off together with `dock` — see
    /// `startup::effective`.
    pub menubar: bool,
    /// Be a regular app: Dock icon and ⌘⇥ entry; the Dock click opens the popover.
    pub dock: bool,
    /// Locale code ("system" / unset / unsupported → follow the OS language).
    pub locale: String,
    /// Paste-ready sentence template; `{path}` is replaced with the remote path.
    pub sentence: String,
    /// Put the sentence around the path after a beam, rather than just the
    /// path. Off by default since 2026-09-28 — see [`Settings::settle_copy_sentence`].
    pub copy_sentence: bool,
    /// Written by the UI with every save since 2026-09-28: this config has been
    /// saved since "just the path" became the default, so a sentence switched
    /// on in it was switched on by someone.
    pub path_default: bool,
    /// Longest side, in pixels, a beamed clipboard screenshot is scaled down to.
    /// `0` means "send it at full size". Only the clipboard path honours this —
    /// a dropped file is still sent as it is (see `beam.rs`).
    #[serde(deserialize_with = "image_max_edge")]
    pub image_max_edge: u32,
    /// How long "beam screenshots automatically" stays on once switched on, in
    /// minutes. `0` means until it is switched off. Only the duration is
    /// persisted — see `auto_beam.rs` for why the armed state deliberately is not.
    pub auto_beam_minutes: u64,
    /// Offer to fetch images the agent left in the host's beam folder. Off by
    /// default: it is the first thing Hostbeam does in the other direction, and
    /// whether the product goes further than screenshots is undecided
    /// (docs/product.md). Mirrored in the frontend as `pullIncoming`.
    pub pull_incoming: bool,
    /// Ask download.hostbeam.app for a newer version about once a day. On by
    /// default; About → Check for updates works either way (ADR 0022).
    pub check_updates: bool,
    /// Let anything that can open a URL start a beam or switch the host
    /// (`hostbeam://beam`, ADR 0025). On by default since 0.1.26: the people
    /// Hostbeam is for drive it from scripts and launchers, and a web page
    /// cannot open the scheme without the browser asking first. Off is one
    /// switch away, and a saved `false` is kept.
    pub allow_url_beam: bool,
    /// Install a found update without asking, relaunching when Hostbeam is not
    /// in use. Off by default: an app that replaces itself unasked is a
    /// surprise, however quietly it does it (ADR 0022).
    pub install_updates: bool,
}

impl Default for Settings {
    fn default() -> Self {
        // These match the frontend's defaults (`lib/config.ts`): beam
        // immediately, follow the OS locale, copy just the path.
        Self {
            immediate: true,
            launch: true,
            menubar: true,
            dock: false,
            locale: "system".to_string(),
            sentence: DEFAULT_SENTENCE.to_string(),
            copy_sentence: false,
            // False, not true: a *missing* field takes this value, and missing
            // is what a config saved before 2026-09-28 has.
            path_default: false,
            image_max_edge: DEFAULT_IMAGE_MAX_EDGE,
            auto_beam_minutes: DEFAULT_AUTO_BEAM_MINUTES,
            pull_incoming: false,
            check_updates: true,
            install_updates: false,
            allow_url_beam: true,
        }
    }
}

impl Settings {
    /// Until 2026-09-28 a beam copied "Use this screenshot: {path}" unless that was
    /// switched off. Since then it copies just the path: the one form every
    /// agent tested — Claude Code, Codex, Gemini CLI, OpenCode — attaches as
    /// the picture itself, where the sentence is left as text by all but
    /// Claude Code (next.md § 10a).
    ///
    /// A config saved before then with the switch on and the sentence untouched
    /// is someone who never chose it — the UI saves every setting, so it cannot
    /// be told from a choice — and it reads as off. `pathDefault` marks a config
    /// saved since, so a sentence switched back on afterwards stays on. A
    /// sentence someone wrote is theirs and is kept on. `lib/config.ts` does
    /// the same for the frontend.
    fn settle_copy_sentence(&mut self) {
        if !self.path_default && self.copy_sentence && self.sentence == DEFAULT_SENTENCE {
            self.copy_sentence = false;
        }
    }
}

/// The sentence nobody has changed, used once "Add a sentence" is switched on.
/// A beam of a file that is not a picture says "file" instead
/// (`beam::FILE_SENTENCE`) — but only while the template is still this one; a
/// template someone wrote is theirs, and is never rewritten. Mirrored in
/// `src/lib/sentence.ts`.
pub const DEFAULT_SENTENCE: &str = "Use this screenshot: {path}";

/// The default cap on a beamed screenshot's longest side.
///
/// 2000 rather than the ~1568px a vision model actually keeps: it is comfortably
/// above that limit, so nothing the model would have seen is thrown away, while
/// still cutting a 5K capture (5120×2880) to about a sixth of its pixels. Going
/// straight to 1568 would save a little more and risk the one case that matters
/// — a full-screen capture of an editor, where the text is the payload. Someone
/// who hits that can raise it or turn it off entirely.
///
/// It was 2048 until 2026-09-14. Once a conversation holds more than 20 images,
/// Claude's API refuses any image over 2000 px, and the whole request with it,
/// and a long debugging session with an agent gets there.
pub const DEFAULT_IMAGE_MAX_EDGE: u32 = 2000;

/// Reads a saved `imageMaxEdge`, turning the retired 2048 into today's default.
/// 2048 was both the default and a preset, and the UI saves every setting, so a
/// saved 2048 cannot be told from a choice; the preset is gone, so it would
/// otherwise select nothing. `lib/config.ts` does the same for the frontend.
fn image_max_edge<'de, D: serde::Deserializer<'de>>(d: D) -> std::result::Result<u32, D::Error> {
    let edge = u32::deserialize(d)?;
    Ok(if edge == 2048 {
        DEFAULT_IMAGE_MAX_EDGE
    } else {
        edge
    })
}

/// How long auto-beam stays armed by default.
///
/// An hour covers the shape this is for — a debugging session with an agent,
/// where screenshots come in bursts and then stop. The default expires rather
/// than running forever because the failure mode of leaving it on (screenshots
/// you meant for something else going to a server) is worse than the failure
/// mode of it lapsing (one keystroke, the way it worked before).
pub const DEFAULT_AUTO_BEAM_MINUTES: u64 = 60;

/// The parsed config, kept between reads. Managed by Tauri
/// (`app.manage(config::Cache::default())`) and filled by [`read`].
///
/// `config.json` carries the Recent thumbnails, so on a Mac that has beamed a
/// while it is hundreds of kilobytes — and it was read and parsed on every
/// hotkey press, three times per beam, on every tray rebuild and on every
/// write. The webview is the only writer and every write comes through
/// [`set_config`], which is where the cache is refilled; [`clear`] empties it.
#[derive(Default)]
pub struct Cache(Mutex<Option<Config>>);

impl Cache {
    fn get_or_load(&self, load: impl FnOnce() -> Config) -> Config {
        let mut slot = self.0.lock().unwrap_or_else(|p| p.into_inner());
        slot.get_or_insert_with(load).clone()
    }

    fn set(&self, cfg: Option<Config>) {
        self.swap(cfg);
    }

    /// Replace the cached config, handing back what was there.
    fn swap(&self, cfg: Option<Config>) -> Option<Config> {
        std::mem::replace(&mut *self.0.lock().unwrap_or_else(|p| p.into_inner()), cfg)
    }
}

fn parse(v: Value) -> Config {
    let mut cfg: Config = serde_json::from_value(v).unwrap_or_default();
    cfg.settings.settle_copy_sentence();
    cfg
}

/// The single typed accessor for backend config reads: the cached config, or
/// `config.json` loaded and parsed once. A missing or unreadable config yields
/// defaults. Replaces the duplicated `v.get("settings").and_then(…)` chains
/// that were copied across `lib.rs`, `beam.rs`, and `i18n.rs`.
#[must_use]
pub fn read(app: &AppHandle) -> Config {
    let from_disk = || load(app).map(parse).unwrap_or_default();
    match app.try_state::<Cache>() {
        Some(cache) => cache.get_or_load(from_disk),
        // Tests and anything else that runs without the managed state.
        None => from_disk(),
    }
}

fn store_dir(app: &AppHandle) -> Result<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| Error::Io(std::io::Error::other(e)))?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

/// Reads the config JSON, or `None` if absent or malformed.
#[must_use]
pub fn load_from(path: &Path) -> Option<Value> {
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn save_to(path: &Path, value: &Value) -> Result<()> {
    let text = serde_json::to_string_pretty(value).map_err(std::io::Error::other)?;
    Ok(std::fs::write(path, text)?)
}

/// Reads the persisted config for the backend (e.g. to honour the notify toggle).
#[must_use]
pub fn load(app: &AppHandle) -> Option<Value> {
    let path = store_dir(app).ok()?.join(FILE);
    load_from(&path)
}

/// Deletes the persisted config (used by the "Restart onboarding" dev action).
pub fn clear(app: &AppHandle) {
    if let Ok(dir) = store_dir(app) {
        let path = dir.join(FILE);
        // Missing file is fine (nothing to clear); any other failure is logged.
        if let Err(e) = std::fs::remove_file(&path) {
            if e.kind() != std::io::ErrorKind::NotFound {
                crate::log::warn(format!("clear config {}: {e}", path.display()));
            }
        }
    }
    if let Some(cache) = app.try_state::<Cache>() {
        cache.set(None);
    }
    crate::thumbs::clear(app);
}

#[tauri::command]
pub fn get_config(app: AppHandle) -> std::result::Result<Option<Value>, CommandError> {
    let path = store_dir(&app)?.join(FILE);
    Ok(load_from(&path))
}

#[tauri::command]
pub fn set_config(app: AppHandle, value: Value) -> std::result::Result<(), CommandError> {
    let path = store_dir(&app)?.join(FILE);
    save_to(&path, &value)?;
    // What was just written is what every read from now on answers with; no
    // need to read the file back to find out.
    let parsed = parse(value);
    let before = app
        .try_state::<Cache>()
        .and_then(|cache| cache.swap(Some(parsed.clone())));
    // Previews the Recent list no longer points at are files nobody will open.
    crate::thumbs::prune_after(&app, before.as_ref(), &parsed);
    // The Startup switches take effect the moment they are flipped.
    crate::startup::apply(&app);
    // Tell every window. The one that wrote it finds nothing new; the other —
    // the popover, a panel that never receives `focus` — re-reads it, so its
    // next save cannot put back the copy it hydrated at launch.
    crate::log::warn_if_err("config change event", app.emit("config:changed", ()));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn temp_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("hostbeam-cfg-test-{tag}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn round_trips_config() {
        let path = temp_dir("roundtrip").join(FILE);
        let value = json!({
            "defaultId": "prod",
            "addedIds": ["prod", "stg"],
            "settings": { "folder": "/tmp/hostbeam", "hotkey": "⌘⇧7", "immediate": true },
            "recent": [{ "id": "r1", "hostId": "prod", "path": "/tmp/hostbeam/a.png" }]
        });
        save_to(&path, &value).unwrap();
        assert_eq!(load_from(&path), Some(value));
    }

    #[test]
    fn missing_config_is_none() {
        let path = temp_dir("missing").join(FILE);
        assert_eq!(load_from(&path), None);
    }

    #[test]
    fn malformed_config_is_none() {
        let path = temp_dir("malformed").join(FILE);
        std::fs::write(&path, "{ not json").unwrap();
        assert_eq!(load_from(&path), None);
    }

    #[test]
    fn the_cache_loads_once_and_answers_with_the_last_write() {
        let cache = Cache::default();
        let loads = std::cell::Cell::new(0);
        let load = || {
            loads.set(loads.get() + 1);
            parse(json!({ "defaultId": "prod" }))
        };
        assert_eq!(cache.get_or_load(load).default_id.as_deref(), Some("prod"));
        assert_eq!(cache.get_or_load(load).default_id.as_deref(), Some("prod"));
        assert_eq!(loads.get(), 1, "the file is parsed once, not per read");
        // A write replaces the answer without a read.
        cache.set(Some(parse(json!({ "defaultId": "stg" }))));
        assert_eq!(cache.get_or_load(load).default_id.as_deref(), Some("stg"));
        // Clearing forgets it, so the next read goes back to disk.
        cache.set(None);
        let _ = cache.get_or_load(load);
        assert_eq!(loads.get(), 2);
    }

    #[test]
    fn typed_config_uses_prototype_defaults_when_empty() {
        let cfg: Config = serde_json::from_value(json!({})).unwrap();
        assert!(cfg.added_ids.is_empty());
        assert!(cfg.settings.immediate);
        assert_eq!(cfg.settings.locale, "system");
        assert_eq!(cfg.settings.sentence, "Use this screenshot: {path}");
        // Just the path, since 2026-09-28: the sentence is there for whoever
        // switches it on.
        assert!(!cfg.settings.copy_sentence);
        assert_eq!(cfg.settings.image_max_edge, DEFAULT_IMAGE_MAX_EDGE);
        // Off unless asked for: fetching from a host is the one direction the
        // product has not decided it goes in.
        assert!(!cfg.settings.pull_incoming);
        // Checking on, installing off (ADR 0022), and nothing skipped.
        assert!(cfg.settings.check_updates);
        assert!(!cfg.settings.install_updates);
        assert_eq!(cfg.update_dismissed, None);
        // `hostbeam://` links work out of the box (ADR 0025, amended
        // 2026-09-22); a saved `false` is an explicit off and must survive.
        assert!(cfg.settings.allow_url_beam);
        let off: Config =
            serde_json::from_value(json!({ "settings": { "allowUrlBeam": false } })).unwrap();
        assert!(!off.settings.allow_url_beam);
    }

    #[test]
    fn update_switches_and_the_skipped_version_read_back() {
        let cfg: Config = serde_json::from_value(json!({
            "settings": { "checkUpdates": false, "installUpdates": true },
            "updateDismissed": "0.1.20"
        }))
        .unwrap();
        assert!(!cfg.settings.check_updates);
        assert!(cfg.settings.install_updates);
        assert_eq!(cfg.update_dismissed.as_deref(), Some("0.1.20"));
    }

    #[test]
    fn image_cap_reads_back_including_off() {
        let on: Config = serde_json::from_value(json!({
            "settings": { "imageMaxEdge": 1568 }
        }))
        .unwrap();
        assert_eq!(on.settings.image_max_edge, 1568);

        // 0 is "send it at full size", and must survive as 0 rather than falling
        // through to the default — `#[serde(default)]` only fills a *missing*
        // field, but this is the one value that looks like an absent one.
        let off: Config = serde_json::from_value(json!({
            "settings": { "imageMaxEdge": 0 }
        }))
        .unwrap();
        assert_eq!(off.settings.image_max_edge, 0);
    }

    #[test]
    fn a_saved_2048_reads_as_todays_default() {
        // 2048 was the default and a preset until 2026-09-14, and the UI saves
        // every setting, so nearly every install has it written down. Past 20
        // images in a conversation Claude refuses anything over 2000 px, and the
        // 2048 preset is gone, so a saved 2048 is read as the new default.
        let cfg: Config = serde_json::from_value(json!({
            "settings": { "imageMaxEdge": 2048 }
        }))
        .unwrap();
        assert_eq!(cfg.settings.image_max_edge, DEFAULT_IMAGE_MAX_EDGE);
        assert_eq!(DEFAULT_IMAGE_MAX_EDGE, 2000);

        // Every other choice, full size and 3200 included, is left alone.
        for edge in [0, 1568, 3200] {
            let cfg: Config = serde_json::from_value(json!({
                "settings": { "imageMaxEdge": edge }
            }))
            .unwrap();
            assert_eq!(cfg.settings.image_max_edge, edge);
        }
    }

    #[test]
    fn a_config_written_before_the_cap_existed_gets_the_default() {
        // Every install that upgrades into this version has no imageMaxEdge.
        // They must land on the default, not on 0 (which would be "off").
        let cfg: Config = serde_json::from_value(json!({
            "settings": { "immediate": true, "copySentence": true }
        }))
        .unwrap();
        assert_eq!(cfg.settings.image_max_edge, DEFAULT_IMAGE_MAX_EDGE);
    }

    #[test]
    fn typed_config_reads_sentence_settings() {
        let cfg: Config = serde_json::from_value(json!({
            "settings": { "sentence": "img: {path}", "copySentence": false }
        }))
        .unwrap();
        assert_eq!(cfg.settings.sentence, "img: {path}");
        assert!(!cfg.settings.copy_sentence);
    }

    #[test]
    fn an_untouched_sentence_saved_before_the_change_reads_as_just_the_path() {
        // What nearly every install has written down: the switch on, the
        // sentence as it came, and no `pathDefault`. Nobody chose it.
        let before = parse(json!({
            "settings": { "sentence": DEFAULT_SENTENCE, "copySentence": true }
        }));
        assert!(!before.settings.copy_sentence);

        // A sentence someone wrote is theirs, and stays on.
        let theirs = parse(json!({
            "settings": { "sentence": "look at {path}", "copySentence": true }
        }));
        assert!(theirs.settings.copy_sentence);

        // Saved since the change: switched on means switched on, default text
        // or not.
        let chosen = parse(json!({
            "settings": { "sentence": DEFAULT_SENTENCE, "copySentence": true, "pathDefault": true }
        }));
        assert!(chosen.settings.copy_sentence);

        // Off stays off, whenever it was saved.
        let off = parse(json!({
            "settings": { "sentence": DEFAULT_SENTENCE, "copySentence": false }
        }));
        assert!(!off.settings.copy_sentence);
    }

    #[test]
    fn typed_config_reads_known_fields_and_ignores_unknown() {
        let cfg: Config = serde_json::from_value(json!({
            "addedIds": ["prod", "stg"],
            "defaultId": "prod", // unknown to the typed view — ignored
            "settings": { "notify": false, "locale": "fr", "folder": "/tmp/x" } // notify/folder unknown → ignored
        }))
        .unwrap();
        assert_eq!(cfg.added_ids, ["prod", "stg"]);
        assert!(cfg.settings.immediate); // missing → default true
        assert_eq!(cfg.settings.locale, "fr");
    }
}
