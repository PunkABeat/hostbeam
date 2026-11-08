//! Thin Keygen.sh API client (ADR 0014): key validation, machine (seat)
//! activation, and deactivation. Follows the services split — response parsing
//! is pure and unit-tested; the network edges are thin `ureq` calls. The app
//! only ever talks to this API; checkout/webhooks live outside the app.

use serde_json::{json, Value};

use crate::error::{Error, Result};

/// The Hostbeam Keygen Cloud account (public identifier, not a secret; the
/// same id is in apps/license-webhook/wrangler.toml).
const ACCOUNT_ID: &str = "4889da55-f7f4-45dd-9d74-a2c0fec98cd3";
const BASE: &str = "https://api.keygen.sh/v1/accounts";

/// Result of validating a key for this machine's fingerprint.
#[derive(Debug, PartialEq, Eq)]
pub enum Outcome {
    /// The key is good for this machine. With the maintain-access expiration
    /// strategy an expired license still validates, and `expiry` is recorded
    /// but gates nothing: a license covers every Hostbeam 1 update (ADR 0028).
    Valid { expiry: Option<String> },
    /// The key exists but this machine isn't (or is no longer) activated.
    NotActivated,
    /// The key was disabled — refunded, suspended, or banned.
    Revoked,
    /// No such key.
    InvalidKey,
    /// An unrecognized validation code: don't change any local state.
    Indeterminate,
}

pub struct Activation {
    pub machine_id: String,
    pub expiry: Option<String>,
}

fn account() -> Result<&'static str> {
    if ACCOUNT_ID.is_empty() {
        return Err(Error::LicenseUnconfigured);
    }
    Ok(ACCOUNT_ID)
}

/// POST /licenses/actions/validate-key scoped to this machine's fingerprint.
pub fn validate(key: &str, fingerprint: &str) -> Result<Outcome> {
    let url = format!("{BASE}/{}/licenses/actions/validate-key", account()?);
    let body = json!({ "meta": { "key": key, "scope": { "fingerprint": fingerprint } } });
    let response = post(&url, None, &body)?;
    Ok(parse_validation(&response))
}

/// Activate this machine as a seat: validate to resolve the license id, then
/// create the machine (authenticated by the license key itself).
pub fn activate(key: &str, fingerprint: &str) -> Result<Activation> {
    let url = format!("{BASE}/{}/licenses/actions/validate-key", account()?);
    let body = json!({ "meta": { "key": key, "scope": { "fingerprint": fingerprint } } });
    let validation = post(&url, None, &body)?;

    match parse_validation(&validation) {
        Outcome::InvalidKey => return Err(Error::LicenseInvalid),
        Outcome::Revoked => return Err(Error::LicenseInvalid),
        // Valid-for-this-fingerprint (re-activation on the same Mac),
        // NotActivated (the normal first run), and Indeterminate all proceed —
        // the machine create below is the authoritative step.
        Outcome::Valid { .. } | Outcome::NotActivated | Outcome::Indeterminate => {}
    }
    let license_id = validation["data"]["id"]
        .as_str()
        .ok_or(Error::LicenseInvalid)?
        .to_string();
    let expiry = parse_expiry(&validation);

    let machines_url = format!("{BASE}/{}/machines", account()?);
    let machine = json!({
        "data": {
            "type": "machines",
            "attributes": {
                "fingerprint": fingerprint,
                "platform": "macOS",
                "name": hostname(),
            },
            "relationships": {
                "license": { "data": { "type": "licenses", "id": license_id } }
            }
        }
    });
    match post(&machines_url, Some(key), &machine) {
        Ok(created) => Ok(Activation {
            machine_id: parse_machine_id(&created).ok_or(Error::LicenseInvalid)?,
            expiry,
        }),
        Err(Error::LicenseSeats) => Err(Error::LicenseSeats),
        // "fingerprint has already been taken" — this Mac is already a seat;
        // fetch it by fingerprint (Keygen resolves machines by id or fingerprint).
        Err(Error::LicenseInvalid) => {
            let lookup = format!("{BASE}/{}/machines/{fingerprint}", account()?);
            let existing = get(&lookup, key)?;
            Ok(Activation {
                machine_id: parse_machine_id(&existing).ok_or(Error::LicenseInvalid)?,
                expiry,
            })
        }
        Err(e) => Err(e),
    }
}

/// DELETE the machine to free the seat. A 404 counts as success (already gone).
pub fn deactivate(key: &str, machine_id: &str) -> Result<()> {
    let url = format!("{BASE}/{}/machines/{machine_id}", account()?);
    let request = ureq::delete(&url)
        .set("Accept", "application/vnd.api+json")
        .set("Authorization", &format!("License {key}"));
    match request.call() {
        Ok(_) => Ok(()),
        // Any definitive 4xx means this key cannot free a seat here and cannot
        // be used again — 404 (machine already gone), 403 (LICENSE_SUSPENDED
        // after a refund), 401 (key no longer valid). Treat it as done so the
        // caller clears local state: refusing leaves the user holding a licence
        // they are unable to remove. Only 5xx and transport errors are worth
        // keeping the key for, since the seat may still be ours.
        Err(ureq::Error::Status(status, _)) if (400..500).contains(&status) => Ok(()),
        Err(e) => Err(map_transport(e)),
    }
}

/// GET /machines with the license key: how many seats the license occupies.
/// The 3-seat limit is policy (ADR 0014), constant on our side.
pub fn seats_in_use(key: &str) -> Result<u64> {
    let url = format!("{BASE}/{}/machines", account()?);
    let listing = get(&url, key)?;
    parse_machine_count(&listing).ok_or(Error::LicenseInvalid)
}

/// Number of machines in a GET /machines listing.
#[must_use]
pub fn parse_machine_count(v: &Value) -> Option<u64> {
    v["data"].as_array().map(|a| a.len() as u64)
}

/// Interpret a validate-key response. Pure; unit-tested against fixture JSON.
#[must_use]
pub fn parse_validation(v: &Value) -> Outcome {
    let valid = v["meta"]["valid"].as_bool().unwrap_or(false);
    if valid {
        return Outcome::Valid {
            expiry: parse_expiry(v),
        };
    }
    match v["meta"]["code"].as_str().unwrap_or("") {
        // Maintain-access model: an expired license keeps validating, and
        // since ADR 0028 its date means nothing to the app.
        "EXPIRED" => Outcome::Valid {
            expiry: parse_expiry(v),
        },
        "NO_MACHINE" | "NO_MACHINES" | "FINGERPRINT_SCOPE_MISMATCH" => Outcome::NotActivated,
        "NOT_FOUND" => Outcome::InvalidKey,
        "SUSPENDED" | "BANNED" => Outcome::Revoked,
        _ => Outcome::Indeterminate,
    }
}

fn parse_expiry(v: &Value) -> Option<String> {
    v["data"]["attributes"]["expiry"]
        .as_str()
        .map(str::to_string)
}

#[must_use]
pub fn parse_machine_id(v: &Value) -> Option<String> {
    v["data"]["id"].as_str().map(str::to_string)
}

/// Map a Keygen error document to the typed error: seat exhaustion is its own
/// case; every other 4xx means the request (key/fingerprint) was no good.
#[must_use]
pub fn parse_api_error(v: &Value) -> Error {
    let code = v["errors"][0]["code"].as_str().unwrap_or("");
    match code {
        "MACHINE_LIMIT_EXCEEDED" => Error::LicenseSeats,
        _ => Error::LicenseInvalid,
    }
}

fn hostname() -> String {
    std::process::Command::new("hostname")
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .filter(|h| !h.is_empty())
        .unwrap_or_else(|| "Mac".into())
}

fn post(url: &str, license_key: Option<&str>, body: &Value) -> Result<Value> {
    let mut request = ureq::post(url)
        .set("Accept", "application/vnd.api+json")
        .set("Content-Type", "application/vnd.api+json");
    if let Some(key) = license_key {
        request = request.set("Authorization", &format!("License {key}"));
    }
    match request.send_json(body.clone()) {
        Ok(response) => response
            .into_json()
            .map_err(|e| Error::LicenseNetwork(e.to_string())),
        Err(ureq::Error::Status(_, response)) => {
            let doc: Value = response.into_json().unwrap_or_default();
            Err(parse_api_error(&doc))
        }
        Err(e) => Err(map_transport(e)),
    }
}

fn get(url: &str, license_key: &str) -> Result<Value> {
    let request = ureq::get(url)
        .set("Accept", "application/vnd.api+json")
        .set("Authorization", &format!("License {license_key}"));
    match request.call() {
        Ok(response) => response
            .into_json()
            .map_err(|e| Error::LicenseNetwork(e.to_string())),
        Err(ureq::Error::Status(_, response)) => {
            let doc: Value = response.into_json().unwrap_or_default();
            Err(parse_api_error(&doc))
        }
        Err(e) => Err(map_transport(e)),
    }
}

fn map_transport(e: ureq::Error) -> Error {
    Error::LicenseNetwork(e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn valid_key_with_expiry() {
        let v = json!({
            "meta": { "valid": true, "code": "VALID" },
            "data": { "id": "lic1", "attributes": { "expiry": "2027-07-04T00:00:00.000Z" } }
        });
        assert_eq!(
            parse_validation(&v),
            Outcome::Valid {
                expiry: Some("2027-07-04T00:00:00.000Z".into())
            }
        );
    }

    #[test]
    fn expired_still_validates_for_app_use() {
        let v = json!({
            "meta": { "valid": false, "code": "EXPIRED" },
            "data": { "id": "lic1", "attributes": { "expiry": "2026-01-01T00:00:00.000Z" } }
        });
        assert_eq!(
            parse_validation(&v),
            Outcome::Valid {
                expiry: Some("2026-01-01T00:00:00.000Z".into())
            }
        );
    }

    #[test]
    fn unactivated_machine_codes() {
        for code in ["NO_MACHINE", "NO_MACHINES", "FINGERPRINT_SCOPE_MISMATCH"] {
            let v = json!({ "meta": { "valid": false, "code": code } });
            assert_eq!(parse_validation(&v), Outcome::NotActivated, "{code}");
        }
    }

    #[test]
    fn bad_and_disabled_keys() {
        let not_found = json!({ "meta": { "valid": false, "code": "NOT_FOUND" } });
        assert_eq!(parse_validation(&not_found), Outcome::InvalidKey);
        for code in ["SUSPENDED", "BANNED"] {
            let v = json!({ "meta": { "valid": false, "code": code } });
            assert_eq!(parse_validation(&v), Outcome::Revoked, "{code}");
        }
    }

    #[test]
    fn unknown_code_is_indeterminate_not_revoked() {
        let v = json!({ "meta": { "valid": false, "code": "SOME_FUTURE_CODE" } });
        assert_eq!(parse_validation(&v), Outcome::Indeterminate);
        // Malformed/empty documents must not revoke a paying user either.
        assert_eq!(parse_validation(&json!({})), Outcome::Indeterminate);
    }

    #[test]
    fn machine_count_from_listing() {
        let listing = json!({ "data": [{ "id": "m1" }, { "id": "m2" }] });
        assert_eq!(parse_machine_count(&listing), Some(2));
        assert_eq!(parse_machine_count(&json!({ "data": [] })), Some(0));
        assert_eq!(parse_machine_count(&json!({})), None);
    }

    #[test]
    fn machine_id_from_create_response() {
        let v = json!({ "data": { "type": "machines", "id": "mach-1" } });
        assert_eq!(parse_machine_id(&v).as_deref(), Some("mach-1"));
        assert_eq!(parse_machine_id(&json!({})), None);
    }

    #[test]
    fn seat_limit_error_is_distinguished() {
        let v = json!({ "errors": [{ "code": "MACHINE_LIMIT_EXCEEDED", "title": "..." }] });
        assert!(matches!(parse_api_error(&v), Error::LicenseSeats));
        let taken = json!({ "errors": [{ "code": "FINGERPRINT_TAKEN" }] });
        assert!(matches!(parse_api_error(&taken), Error::LicenseInvalid));
    }

    #[test]
    fn account_is_configured() {
        // The empty-account guard (Error::LicenseUnconfigured) only protects
        // builds made before the account existed; the id itself is public.
        assert!(account().is_ok());
    }
}
