//! What to show as "what's new" when an update is offered.
//!
//! latest.json carries two views of CHANGELOG.md, both written by
//! scripts/release-macos.sh: `notes` (the newest entry, what the updater
//! hands us as the body) and `history` (the newest ten entries, each with
//! version, date and plain-text notes). Someone updating from 0.1.9 to 0.1.12
//! wants to read 0.1.10 and 0.1.11 too, so this picks every history entry
//! newer than the running version and stacks them, newest first. Installs
//! running older code ignore `history` and keep showing the body.

use serde::Deserialize;

#[derive(Deserialize)]
struct Entry {
    version: String,
    #[serde(default)]
    date: Option<String>,
    #[serde(default)]
    notes: String,
}

fn parse_version(v: &str) -> Option<(u64, u64, u64)> {
    let mut it = v.trim().split('.');
    let a = it.next()?.parse().ok()?;
    let b = it.next()?.parse().ok()?;
    let c = it.next()?.parse().ok()?;
    if it.next().is_some() {
        return None;
    }
    Some((a, b, c))
}

/// Notes for every release newer than `current`, newest first. A single
/// newer release comes back as its notes alone (the pane already names the
/// version); several are each headed by their version and date. `None` when
/// the manifest has no usable `history` or nothing in it is newer, so the
/// caller falls back to the body — the pre-history behaviour.
pub fn notes_since(current: &str, manifest: &serde_json::Value) -> Option<String> {
    let cur = parse_version(current)?;
    let entries: Vec<Entry> = serde_json::from_value(manifest.get("history")?.clone()).ok()?;
    let mut newer: Vec<((u64, u64, u64), Entry)> = entries
        .into_iter()
        .filter_map(|e| {
            let v = parse_version(&e.version)?;
            (v > cur && !e.notes.trim().is_empty()).then_some((v, e))
        })
        .collect();
    newer.sort_by_key(|a| std::cmp::Reverse(a.0));
    newer.dedup_by(|a, b| a.0 == b.0);
    match newer.len() {
        0 => None,
        1 => Some(newer[0].1.notes.trim().to_string()),
        _ => Some(
            newer
                .iter()
                .map(|(_, e)| {
                    let head = match e.date.as_deref() {
                        Some(d) if !d.trim().is_empty() => format!("{} — {}", e.version, d.trim()),
                        _ => e.version.clone(),
                    };
                    format!("{head}\n\n{}", e.notes.trim())
                })
                .collect::<Vec<_>>()
                .join("\n\n\n"),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn manifest() -> serde_json::Value {
        json!({
            "version": "0.1.12",
            "notes": "Fixed\n\n- twelve",
            "history": [
                { "version": "0.1.10", "date": "2026-08-31", "notes": "Added\n\n- ten" },
                { "version": "0.1.12", "date": "2026-09-01", "notes": "Fixed\n\n- twelve" },
                { "version": "0.1.11", "date": "2026-09-01", "notes": "Changed\n\n- eleven" },
                { "version": "0.1.9", "date": "2026-08-30", "notes": "- nine" }
            ]
        })
    }

    #[test]
    fn stacks_every_newer_release_newest_first_with_headings() {
        let got = notes_since("0.1.9", &manifest()).unwrap();
        assert_eq!(
            got,
            "0.1.12 — 2026-09-01\n\nFixed\n\n- twelve\n\n\n\
             0.1.11 — 2026-09-01\n\nChanged\n\n- eleven\n\n\n\
             0.1.10 — 2026-08-31\n\nAdded\n\n- ten"
        );
    }

    #[test]
    fn a_single_newer_release_is_its_notes_alone() {
        assert_eq!(
            notes_since("0.1.11", &manifest()).as_deref(),
            Some("Fixed\n\n- twelve")
        );
    }

    #[test]
    fn nothing_newer_falls_back() {
        assert_eq!(notes_since("0.1.12", &manifest()), None);
        assert_eq!(notes_since("0.2.0", &manifest()), None);
    }

    #[test]
    fn manifests_without_history_fall_back() {
        assert_eq!(
            notes_since("0.1.9", &json!({ "version": "0.1.12", "notes": "x" })),
            None
        );
        assert_eq!(
            notes_since("0.1.9", &json!({ "history": "not a list" })),
            None
        );
    }

    #[test]
    fn unparsable_versions_are_skipped_or_fall_back() {
        assert_eq!(notes_since("dev", &manifest()), None);
        let m = json!({ "history": [
            { "version": "1.0.0-beta", "notes": "- beta" },
            { "version": "0.1.10", "date": "2026-08-31", "notes": "- ten" }
        ]});
        assert_eq!(notes_since("0.1.9", &m).as_deref(), Some("- ten"));
    }

    #[test]
    fn an_entry_without_date_is_headed_by_version_only() {
        let m = json!({ "history": [
            { "version": "0.1.11", "notes": "- eleven" },
            { "version": "0.1.10", "date": "", "notes": "- ten" }
        ]});
        assert_eq!(
            notes_since("0.1.9", &m).as_deref(),
            Some("0.1.11\n\n- eleven\n\n\n0.1.10\n\n- ten")
        );
    }
}
