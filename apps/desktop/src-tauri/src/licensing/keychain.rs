//! macOS Keychain storage for the license key (ADR 0014). Shells out to
//! `security` like the rest of the app shells out to `ssh`/`open` — no new
//! dependency. Commands are fed over stdin (`security -i`) so the key never
//! appears in the process argument list.

use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::Mutex;

const SERVICE: &str = "com.hostbeam.license";
const ACCOUNT: &str = "license";

/// The key once it has been read, set or deleted. Every `load()` of the licence
/// store joins the key in from here, and `load()` runs twice per beam and on
/// every status poll — each of which was a `security` process. Only outcomes
/// the Keychain confirmed are remembered: a read that failed (a locked
/// keychain, say) is asked again next time rather than treated as "no key".
static CACHE: Mutex<Option<Option<String>>> = Mutex::new(None);

fn remember(key: Option<String>) {
    *CACHE.lock().unwrap_or_else(|p| p.into_inner()) = Some(key);
}

/// Only keys in this shape go to the Keychain (Keygen keys are url-safe). This
/// is what makes the stdin command safe to assemble without escaping.
#[must_use]
pub fn storable(key: &str) -> bool {
    !key.is_empty()
        && key
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
}

fn run(stdin_command: Option<String>, args: &[&str]) -> Option<String> {
    let mut cmd = Command::new("security");
    if let Some(line) = &stdin_command {
        cmd.arg("-i").stdin(Stdio::piped());
        let mut child = cmd
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .ok()?;
        child.stdin.take()?.write_all(line.as_bytes()).ok()?;
        let out = child.wait_with_output().ok()?;
        return out
            .status
            .success()
            .then(|| String::from_utf8_lossy(&out.stdout).trim().to_string());
    }
    let out = cmd.args(args).output().ok()?;
    out.status
        .success()
        .then(|| String::from_utf8_lossy(&out.stdout).trim().to_string())
}

/// Store (or replace) the license key. Returns false when the key can't be
/// stored — the caller decides how to surface that.
pub fn set(key: &str) -> bool {
    if !storable(key) {
        return false;
    }
    let stored = run(
        Some(format!(
            "add-generic-password -U -s {SERVICE} -a {ACCOUNT} -w {key}\n"
        )),
        &[],
    )
    .is_some();
    if stored {
        remember(Some(key.to_string()));
    }
    stored
}

/// The stored license key, if any.
#[must_use]
pub fn get() -> Option<String> {
    if let Some(known) = CACHE.lock().unwrap_or_else(|p| p.into_inner()).clone() {
        return known;
    }
    let key = run(
        None,
        &["find-generic-password", "-s", SERVICE, "-a", ACCOUNT, "-w"],
    )
    .filter(|k| !k.is_empty());
    // A successful lookup is an answer either way: `security` exits non-zero
    // for a missing item, which `run` turns into None *without* an answer, so
    // only a found key is remembered here. Absence is remembered by `delete`.
    if key.is_some() {
        remember(key.clone());
    }
    key
}

/// Remove the stored key. Missing item counts as success.
pub fn delete() {
    let _ = Command::new("security")
        .args(["delete-generic-password", "-s", SERVICE, "-a", ACCOUNT])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
    remember(None);
}

#[cfg(test)]
mod tests {
    use super::storable;

    #[test]
    fn keygen_shaped_keys_are_storable() {
        assert!(storable("ABC123-DEF456-GHI789"));
        assert!(storable("key_with.dots-and_underscores"));
    }

    #[test]
    fn empty_or_unsafe_keys_are_not() {
        assert!(!storable(""));
        assert!(!storable("has space"));
        assert!(!storable("quote\"inject"));
        assert!(!storable("newline\ninject"));
        assert!(!storable("semi;colon"));
    }
}
