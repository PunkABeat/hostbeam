//! Where Recent previews live: files in the app's cache directory, one per
//! beamed file, named after the remote file.
//!
//! They used to be data URLs inside `config.json`. The config is mirrored into
//! the webview's localStorage and read by Rust on every hotkey press, and a
//! list of a few dozen previews made it hundreds of kilobytes — once 9MB, past
//! the localStorage quota, which blanked Preferences. A path is eighty bytes.
//! Rows written before this keep their data URL and still render; they age
//! out of the list on their own.
//!
//! The list is what keeps a file alive: after every config write, previews the
//! list no longer points at are removed. Nothing else is ever touched — this
//! directory only, files only.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::config::Config;

const DIR: &str = "thumbs";

/// The preview directory, or `None` when the platform offers no cache dir.
#[must_use]
pub fn dir(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_cache_dir().ok().map(|d| d.join(DIR))
}

/// The preview files the Recent list still points at.
#[must_use]
pub fn referenced(cfg: &Config) -> HashSet<PathBuf> {
    cfg.recent
        .iter()
        .filter_map(|r| r.thumb.as_deref())
        .filter(|t| !t.starts_with("data:"))
        .map(PathBuf::from)
        .collect()
}

/// Remove every file in `dir` that `keep` does not name; how many went.
pub fn prune_dir(dir: &Path, keep: &HashSet<PathBuf>) -> usize {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return 0;
    };
    let mut removed = 0;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() || keep.contains(&path) {
            continue;
        }
        match std::fs::remove_file(&path) {
            Ok(()) => removed += 1,
            Err(e) => crate::log::warn(format!("prune preview {}: {e}", path.display())),
        }
    }
    removed
}

/// After a config write. Prunes only when the set of referenced previews
/// changed — a write is one per keystroke in Preferences, and nearly all of
/// them leave Recent alone. `before` is `None` on the first write after
/// launch, which prunes once to catch anything a crash left behind.
pub fn prune_after(app: &AppHandle, before: Option<&Config>, after: &Config) {
    let keep = referenced(after);
    if before.is_some_and(|b| referenced(b) == keep) {
        return;
    }
    let Some(dir) = dir(app) else { return };
    let removed = prune_dir(&dir, &keep);
    if removed > 0 {
        crate::log::info(format!(
            "pruned {removed} preview(s) no Recent row points at"
        ));
    }
}

/// Every preview, when the config itself is cleared (Restart onboarding).
pub fn clear(app: &AppHandle) {
    if let Some(dir) = dir(app) {
        prune_dir(&dir, &HashSet::new());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn temp(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("hostbeam-thumbs-test-{tag}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn only_paths_count_as_referenced_files() {
        let cfg: Config = serde_json::from_value(json!({ "recent": [
            { "id": "a", "path": "/tmp/a.png", "thumb": "/cache/thumbs/hostbeam-1.png" },
            { "id": "b", "path": "/tmp/b.png", "thumb": "data:image/png;base64,AAAA" },
            { "id": "c", "path": "/tmp/c.png", "thumb": null },
            { "id": "d", "path": "/tmp/d.png" }
        ]}))
        .unwrap();
        assert_eq!(
            referenced(&cfg),
            HashSet::from([PathBuf::from("/cache/thumbs/hostbeam-1.png")])
        );
    }

    #[test]
    fn pruning_keeps_what_the_list_names_and_nothing_else() {
        let dir = temp("prune");
        let keep_me = dir.join("hostbeam-1.png");
        let drop_me = dir.join("hostbeam-2.jpg");
        let sub = dir.join("not-a-file");
        std::fs::write(&keep_me, b"x").unwrap();
        std::fs::write(&drop_me, b"x").unwrap();
        std::fs::create_dir_all(&sub).unwrap();
        let removed = prune_dir(&dir, &HashSet::from([keep_me.clone()]));
        assert_eq!(removed, 1);
        assert!(keep_me.exists());
        assert!(!drop_me.exists());
        // Directories are never touched, however they got there.
        assert!(sub.exists());
        // A directory that is not there is nothing to prune.
        assert_eq!(prune_dir(&dir.join("missing"), &HashSet::new()), 0);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
