//! License state and the reminder (ADR 0014, amended by ADR 0028).
//!
//! Every feature is free and nothing is capped. What a license buys is quiet:
//! an unlicensed Mac is reminded now and then, after a beam has landed — once
//! its first beam is [`REMINDER_AFTER_DAYS`] old, every [`REMINDER_EVERY`]th
//! beam. The count is kept locally in `license.json`, next to the config; no
//! network calls happen for unlicensed users. A paid license (Keygen, see
//! [`keygen`]) turns the reminder off, for every Hostbeam 1 update; validation
//! is silent, at most daily, and failures never downgrade immediately — a
//! licensed install stays licensed for [`GRACE_DAYS`] without a successful
//! revalidation (honest-user model: no DRM, no clock-tamper checks).

pub mod keychain;
pub mod keygen;

use std::sync::atomic::{AtomicI64, Ordering};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::error::{CommandError, Error, Result};

/// The reminder waits this long after the first beam on this Mac: the first
/// week is for finding out whether Hostbeam is worth keeping (ADR 0028).
pub const REMINDER_AFTER_DAYS: i64 = 7;
/// After that, every this-many-th beam carries the reminder. Tunable, not a
/// promise: ADR 0028 names it as the first thing to adjust.
pub const REMINDER_EVERY: u64 = 10;
/// Licensing is retired (ADR 0031, 2026-11-08): Hostbeam is free, with no
/// reminder and nothing to buy. The store, the Keygen client, the commands and
/// the License pane stay in the tree, for the record and for a key that was
/// activated before; this constant is the one switch. While it is `true`, no
/// beam carries the reminder, the frontend hides "Unlicensed" and the buy UI
/// (`LicenseStatus::retired`), and no revalidation call is made — the service
/// it would call is being shut down.
pub const LICENSING_RETIRED: bool = true;
/// A stored license is revalidated (silently) once it is older than this.
const REVALIDATE_HOURS: i64 = 24;
/// Validation this fresh shows plain "licensed"; older (but within grace) shows
/// the quiet "will revalidate" note. Being offline for a trip is not an event.
const FRESH_DAYS: i64 = 7;
/// A licensed install keeps working this long without a successful revalidation;
/// only past this does it count as unlicensed again (free, with the reminder —
/// ADR 0028).
const GRACE_DAYS: i64 = 30;

const FILE: &str = "license.json";

/// Earliest unix-seconds for the next background revalidation attempt — spaces
/// out retries when the popover polls `license_status` on every focus.
/// Managed by Tauri.
#[derive(Default)]
pub struct Revalidation(AtomicI64);

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Store {
    /// Successful beams on this Mac, ever — one per gesture. Only the
    /// reminder's cadence reads it.
    pub beams: u64,
    /// Unix seconds of the first successful beam on this Mac. The reminder
    /// waits [`REMINDER_AFTER_DAYS`] from here.
    pub first_beam: Option<i64>,
    pub license: Option<License>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct License {
    /// The license key lives in the macOS Keychain ([`keychain`]), never on
    /// disk: skipped on serialize, and read back only to migrate a legacy
    /// pre-Keychain `license.json` that still carries it.
    #[serde(default, skip_serializing)]
    pub key: String,
    /// Keygen machine id for this Mac (needed to free the seat on deactivate).
    pub machine_id: String,
    /// The Keygen policy's expiry date (RFC3339), recorded as Keygen reports
    /// it and used for nothing: a license covers every Hostbeam 1 update,
    /// whatever the date (ADR 0028). Keygen's `MAINTAIN_ACCESS` strategy keeps
    /// an expired license valid and able to activate machines.
    pub expiry: Option<String>,
    /// Unix seconds of the last successful validation.
    pub last_validated: i64,
    /// The provider said the key is gone (refunded, banned, or this machine was
    /// deactivated remotely). Reverts the install to unlicensed.
    pub revoked: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tier {
    Free,
    Licensed,
    /// Licensed, but revalidation is overdue — still licensed.
    Grace,
}

impl Tier {
    fn as_str(self) -> &'static str {
        match self {
            Tier::Free => "free",
            Tier::Licensed => "licensed",
            Tier::Grace => "grace",
        }
    }
}

/// Resolve the effective tier at `now` (unix seconds).
#[must_use]
pub fn tier(store: &Store, now: i64) -> Tier {
    match &store.license {
        Some(l) if !l.revoked => {
            let age = now - l.last_validated;
            if age <= FRESH_DAYS * 86_400 {
                Tier::Licensed
            } else if age <= GRACE_DAYS * 86_400 {
                Tier::Grace
            } else {
                Tier::Free
            }
        }
        _ => Tier::Free,
    }
}

/// Whether the beam just counted into `store` should carry the reminder:
/// unlicensed, the first beam at least [`REMINDER_AFTER_DAYS`] old, and this a
/// [`REMINDER_EVERY`]th beam.
#[must_use]
pub fn reminder_due(store: &Store, now: i64) -> bool {
    if tier(store, now) != Tier::Free {
        return false;
    }
    let settled = store
        .first_beam
        .is_some_and(|first| now - first >= REMINDER_AFTER_DAYS * 86_400);
    settled && store.beams > 0 && store.beams.is_multiple_of(REMINDER_EVERY)
}

/// The key as shown in the UI — enough to recognize, useless to copy.
#[must_use]
pub fn mask_key(key: &str) -> String {
    let chars: Vec<char> = key.chars().collect();
    if chars.len() <= 8 {
        return "••••".into();
    }
    let head: String = chars[..4].iter().collect();
    let tail: String = chars[chars.len() - 4..].iter().collect();
    format!("{head}…{tail}")
}

fn now() -> i64 {
    chrono::Utc::now().timestamp()
}

fn store_path(app: &AppHandle) -> Result<std::path::PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| Error::Io(std::io::Error::other(e)))?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join(FILE))
}

/// Loads the license store; missing or malformed yields the default
/// (unlicensed, nothing counted) — never an error. The license key is joined
/// in from the Keychain; a legacy file still carrying the key is migrated out
/// on sight. A file from before ADR 0028 carries a daily `day`/`count`, which
/// is ignored: the reminder's count starts afresh.
#[must_use]
pub fn load(app: &AppHandle) -> Store {
    let mut store: Store = store_path(app)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default();
    if let Some(l) = store.license.as_mut() {
        if l.key.is_empty() {
            if let Some(k) = keychain::get() {
                l.key = k;
            }
        } else if keychain::set(&l.key) {
            // Legacy pre-Keychain file: rewriting drops the key from disk
            // (it is skipped on serialize).
            save(app, &store);
            crate::log::info("license key migrated from license.json to the Keychain");
        }
    }
    store
}

fn save(app: &AppHandle, store: &Store) {
    let result = store_path(app).and_then(|p| {
        let text = serde_json::to_string_pretty(store).map_err(std::io::Error::other)?;
        std::fs::write(p, text).map_err(Error::from)
    });
    if let Err(e) = result {
        crate::log::warn(format!("license store save failed: {e}"));
    }
}

/// Count one successful beam, and say whether it should carry the reminder.
/// Counts whatever the license, so the cadence carries on unbroken if one
/// lapses.
pub fn record_beam(app: &AppHandle) -> bool {
    let mut store = load(app);
    let now = now();
    store.beams += 1;
    store.first_beam.get_or_insert(now);
    save(app, &store);
    !LICENSING_RETIRED && reminder_due(&store, now)
}

/// What the frontend renders (License pane, the popover's "Unlicensed").
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub tier: &'static str,
    pub key_masked: Option<String>,
    /// [`LICENSING_RETIRED`]: nothing to buy, no reminder, no "Unlicensed".
    pub retired: bool,
}

fn status_from(store: &Store, now: i64) -> LicenseStatus {
    let tier = tier(store, now);
    let live = store.license.as_ref().filter(|_| tier != Tier::Free);
    LicenseStatus {
        tier: tier.as_str(),
        key_masked: live.map(|l| mask_key(&l.key)),
        retired: LICENSING_RETIRED,
    }
}

/// This Mac's stable identifier for seat activation: the IOPlatformUUID
/// (hostname as a fallback so activation still works on odd setups).
fn fingerprint() -> String {
    let uuid = std::process::Command::new("ioreg")
        .args(["-rd1", "-c", "IOPlatformExpertDevice"])
        .output()
        .ok()
        .and_then(|o| parse_platform_uuid(&String::from_utf8_lossy(&o.stdout)));
    uuid.unwrap_or_else(|| {
        std::process::Command::new("hostname")
            .output()
            .ok()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .filter(|h| !h.is_empty())
            .unwrap_or_else(|| "unknown-mac".into())
    })
}

/// Pull the quoted UUID out of `ioreg -rd1 -c IOPlatformExpertDevice` output
/// (a line like `"IOPlatformUUID" = "5A1B…"`).
fn parse_platform_uuid(ioreg: &str) -> Option<String> {
    let line = ioreg.lines().find(|l| l.contains("IOPlatformUUID"))?;
    let value = line.split('=').nth(1)?.trim().trim_matches('"');
    (!value.is_empty()).then(|| value.to_string())
}

/// Silent background revalidation when the stored license is due — spawned from
/// `license_status` so the popover/preferences polling drives the cadence
/// without ever blocking the UI.
fn maybe_revalidate(app: &AppHandle) {
    if LICENSING_RETIRED {
        return;
    }
    let store = load(app);
    let Some(l) = &store.license else { return };
    if l.revoked {
        return;
    }
    let now = now();
    if now - l.last_validated < REVALIDATE_HOURS * 3600 {
        return;
    }
    // Space out attempts (focus events arrive in bursts; failures shouldn't spam).
    let next = app.state::<Revalidation>();
    if now < next.0.load(Ordering::SeqCst) {
        return;
    }
    next.0.store(now + 3600, Ordering::SeqCst);
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || revalidate_blocking(&app));
}

fn revalidate_blocking(app: &AppHandle) {
    let mut store = load(app);
    let Some(l) = store.license.as_mut() else {
        return;
    };
    if l.key.is_empty() {
        // A Keychain read hiccup must never look like a bad key — validating
        // an empty key would report NOT_FOUND and revoke a paying user.
        crate::log::warn("license key unavailable (Keychain?); skipping revalidation");
        return;
    }
    match keygen::validate(&l.key, &fingerprint()) {
        Ok(keygen::Outcome::Valid { expiry }) => {
            l.last_validated = now();
            l.expiry = expiry;
            l.revoked = false;
            save(app, &store);
            crate::log::info("license revalidated");
        }
        // The machine was deactivated remotely, or the key was disabled/refunded.
        Ok(
            keygen::Outcome::NotActivated | keygen::Outcome::Revoked | keygen::Outcome::InvalidKey,
        ) => {
            l.revoked = true;
            save(app, &store);
            crate::log::warn("license revoked by the provider — reverting to unlicensed");
        }
        // Indeterminate (unknown code) or network trouble: leave the store
        // untouched — the grace window absorbs it.
        Ok(keygen::Outcome::Indeterminate) => {
            crate::log::warn("license revalidation indeterminate; keeping current state");
        }
        Err(e) => {
            crate::log::warn(format!("license revalidation failed: {e}"));
        }
    }
}

#[tauri::command]
pub fn license_status(app: AppHandle) -> LicenseStatus {
    maybe_revalidate(&app);
    let store = load(&app);
    status_from(&store, now())
}

#[tauri::command]
pub async fn license_activate(
    app: AppHandle,
    key: String,
) -> std::result::Result<LicenseStatus, CommandError> {
    tauri::async_runtime::spawn_blocking(move || activate_blocking(&app, key.trim()))
        .await
        .map_err(|_| Error::Join)?
        .map_err(CommandError::from)
}

fn activate_blocking(app: &AppHandle, key: &str) -> Result<LicenseStatus> {
    if key.is_empty() {
        return Err(Error::LicenseInvalid);
    }
    // Log the outcome either way (never the key itself — mask_key only): a
    // failed activation is the #1 licensing support case and the diagnostics
    // log is what a user can actually send.
    let activation = keygen::activate(key, &fingerprint()).inspect_err(|e| {
        crate::log::warn(format!(
            "license activation failed for {}: {e}",
            mask_key(key)
        ));
    })?;
    if !keychain::set(key) {
        // Don't half-activate: without the stored key the license would decay
        // through grace to free. Surface it and let the user retry.
        crate::log::error("license key could not be stored in the Keychain");
        return Err(Error::LicenseStorage);
    }
    let mut store = load(app);
    store.license = Some(License {
        key: key.to_string(),
        machine_id: activation.machine_id,
        expiry: activation.expiry,
        last_validated: now(),
        revoked: false,
    });
    save(app, &store);
    crate::log::info(format!("license activated on this Mac ({})", mask_key(key)));
    Ok(status_from(&store, now()))
}

/// Seats the license currently occupies ("Devices: n of 3" in the pane).
/// On-demand; requires the stored key.
#[tauri::command]
pub async fn license_seats(app: AppHandle) -> std::result::Result<u64, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let store = load(&app);
        let key = store
            .license
            .as_ref()
            .map(|l| l.key.clone())
            .filter(|k| !k.is_empty())
            .ok_or(Error::LicenseInvalid)?;
        keygen::seats_in_use(&key)
    })
    .await
    .map_err(|_| Error::Join)?
    .map_err(CommandError::from)
}

#[tauri::command]
pub async fn license_deactivate(
    app: AppHandle,
) -> std::result::Result<LicenseStatus, CommandError> {
    tauri::async_runtime::spawn_blocking(move || deactivate_blocking(&app))
        .await
        .map_err(|_| Error::Join)?
        .map_err(CommandError::from)
}

fn deactivate_blocking(app: &AppHandle) -> Result<LicenseStatus> {
    let mut store = load(app);
    let masked = store.license.as_ref().map(|l| mask_key(&l.key));
    if let Some(l) = &store.license {
        // Best-effort: free the seat remotely, but always clear locally — an
        // offline Mac must still be able to let go of its license.
        if let Err(e) = keygen::deactivate(&l.key, &l.machine_id) {
            crate::log::warn(format!(
                "remote seat release failed (cleared locally; free the seat from the dashboard): {e}"
            ));
        }
    }
    store.license = None;
    save(app, &store);
    keychain::delete();
    crate::log::info(format!(
        "license deactivated on this Mac ({})",
        masked.as_deref().unwrap_or("no license was stored")
    ));
    Ok(status_from(&store, now()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn licensed(last_validated: i64) -> Store {
        Store {
            beams: 5,
            first_beam: Some(last_validated - 30 * 86_400),
            license: Some(License {
                key: "HB-TEST-KEY-1234".into(),
                machine_id: "m1".into(),
                expiry: Some("2027-07-04T00:00:00Z".into()),
                last_validated,
                revoked: false,
            }),
        }
    }

    const NOW: i64 = 1_800_000_000;
    const DAY: i64 = 86_400;

    /// Unlicensed, `beams` counted, the first of them `age_days` ago.
    fn counted(beams: u64, age_days: i64) -> Store {
        Store {
            beams,
            first_beam: Some(NOW - age_days * DAY),
            license: None,
        }
    }

    #[test]
    fn no_license_is_free() {
        assert_eq!(tier(&Store::default(), NOW), Tier::Free);
    }

    #[test]
    fn fresh_validation_is_licensed() {
        assert_eq!(tier(&licensed(NOW - 3600), NOW), Tier::Licensed);
    }

    #[test]
    fn overdue_validation_enters_grace_then_free() {
        assert_eq!(tier(&licensed(NOW - 10 * DAY), NOW), Tier::Grace);
        assert_eq!(tier(&licensed(NOW - 31 * DAY), NOW), Tier::Free);
    }

    #[test]
    fn revoked_license_is_free_immediately() {
        let mut s = licensed(NOW);
        s.license.as_mut().unwrap().revoked = true;
        assert_eq!(tier(&s, NOW), Tier::Free);
    }

    #[test]
    fn the_first_week_is_never_reminded() {
        // The 10th, 20th and 30th beam, all inside the first week.
        for beams in [10, 20, 30] {
            assert!(!reminder_due(&counted(beams, 6), NOW), "beam {beams}");
        }
    }

    #[test]
    fn after_the_first_week_every_tenth_beam_is_reminded() {
        assert!(reminder_due(&counted(10, 7), NOW));
        assert!(reminder_due(&counted(140, 40), NOW));
        for beams in [1, 9, 11, 15, 19, 21] {
            assert!(!reminder_due(&counted(beams, 40), NOW), "beam {beams}");
        }
    }

    #[test]
    fn nothing_counted_is_never_reminded() {
        assert!(!reminder_due(&Store::default(), NOW));
        let mut s = counted(10, 40);
        s.first_beam = None;
        assert!(!reminder_due(&s, NOW));
    }

    #[test]
    fn a_license_is_never_reminded_whatever_its_date() {
        let mut s = licensed(NOW);
        s.beams = 10;
        assert!(!reminder_due(&s, NOW));
        // Past Keygen's expiry date: still covered, for every Hostbeam 1
        // update (ADR 0028) — the date is recorded, never read.
        s.license.as_mut().unwrap().expiry = Some("2020-01-01T00:00:00Z".into());
        assert!(!reminder_due(&s, NOW));
        // In grace, still licensed.
        let mut grace = licensed(NOW - 10 * DAY);
        grace.beams = 10;
        assert!(!reminder_due(&grace, NOW));
    }

    #[test]
    fn a_revoked_or_lapsed_license_is_reminded_like_none() {
        let mut revoked = licensed(NOW);
        revoked.beams = 10;
        revoked.license.as_mut().unwrap().revoked = true;
        assert!(reminder_due(&revoked, NOW));
        let mut lapsed = licensed(NOW - 31 * DAY);
        lapsed.beams = 10;
        lapsed.first_beam = Some(NOW - 60 * DAY);
        assert!(reminder_due(&lapsed, NOW));
    }

    #[test]
    fn status_says_whether_licensing_is_retired() {
        let status = status_from(&Store::default(), NOW);
        assert_eq!(status.retired, LICENSING_RETIRED);
        let status = status_from(&licensed(NOW - 3600), NOW);
        assert_eq!(status.retired, LICENSING_RETIRED);
    }

    #[test]
    fn status_reports_unlicensed_without_key_details() {
        let status = status_from(&Store::default(), NOW);
        assert_eq!(status.tier, "free");
        assert!(status.key_masked.is_none());
    }

    #[test]
    fn status_reports_licensed_with_masked_key() {
        let status = status_from(&licensed(NOW), NOW);
        assert_eq!(status.tier, "licensed");
        assert_eq!(status.key_masked.as_deref(), Some("HB-T…1234"));
    }

    #[test]
    fn expired_grace_reports_free_and_hides_key() {
        let status = status_from(&licensed(NOW - 40 * DAY), NOW);
        assert_eq!(status.tier, "free");
        assert!(status.key_masked.is_none());
    }

    #[test]
    fn mask_key_keeps_only_the_edges() {
        assert_eq!(mask_key("ABCDEF-123456-XYZ-9876"), "ABCD…9876");
        assert_eq!(mask_key("short"), "••••");
    }

    #[test]
    fn parses_platform_uuid_from_ioreg_output() {
        let out = r#"
  "IOPlatformSerialNumber" = "C02XXXXX"
  "IOPlatformUUID" = "5A1B2C3D-4E5F-6789-ABCD-EF0123456789"
"#;
        assert_eq!(
            parse_platform_uuid(out).as_deref(),
            Some("5A1B2C3D-4E5F-6789-ABCD-EF0123456789")
        );
        assert_eq!(parse_platform_uuid("no uuid here"), None);
    }

    #[test]
    fn store_round_trips_json_but_never_writes_the_key() {
        let s = licensed(NOW);
        let json = serde_json::to_string(&s).unwrap();
        // The key lives in the Keychain — it must not land in license.json.
        assert!(!json.contains("HB-TEST-KEY-1234"));
        assert!(!json.contains("\"key\""));
        let back: Store = serde_json::from_str(&json).unwrap();
        assert_eq!(back.beams, 5);
        assert_eq!(back.first_beam, Some(NOW - 30 * DAY));
        let lic = back.license.unwrap();
        assert_eq!(lic.machine_id, "m1");
        assert!(lic.key.is_empty()); // joined back in from the Keychain by load()
    }

    #[test]
    fn a_file_from_the_daily_cap_still_loads() {
        // Before ADR 0028: a daily counter, and a key still inline.
        let json = r#"{ "day": "2026-07-04", "count": 2, "license": {
            "key": "LEGACY-KEY-1234-ABCD", "machineId": "m1",
            "expiry": null, "lastValidated": 1800000000, "revoked": false } }"#;
        let s: Store = serde_json::from_str(json).unwrap();
        assert_eq!(s.beams, 0);
        assert_eq!(s.first_beam, None);
        assert_eq!(s.license.unwrap().key, "LEGACY-KEY-1234-ABCD");
    }

    #[test]
    fn missing_fields_default_to_unlicensed() {
        let s: Store = serde_json::from_str("{}").unwrap();
        assert_eq!(tier(&s, NOW), Tier::Free);
        assert_eq!(s.beams, 0);
    }
}
