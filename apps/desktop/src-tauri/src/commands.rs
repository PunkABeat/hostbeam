//! Small commands the webview calls that belong to no feature module: the
//! version, quitting, and the three ways out to another app (a browser, Mail,
//! Terminal), each guarded so the webview cannot launch arbitrary things.

use tauri::AppHandle;

use crate::log;

/// The app version, for the About pane (instead of a hard-coded string).
#[tauri::command]
pub fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Quit from the popover header — same outcome as the tray menu's Quit.
#[tauri::command]
pub fn quit_app(app: AppHandle) {
    log::info("quit requested from the popover");
    app.exit(0);
}

/// Open an https URL in the default browser (the License pane's Buy link).
/// Restricted to https so the webview can't launch arbitrary schemes or apps.
#[tauri::command]
pub fn open_url(url: String) {
    if !url.starts_with("https://") {
        log::warn(format!("open_url rejected non-https url: {url}"));
        return;
    }
    if let Err(e) = std::process::Command::new("open").arg(&url).spawn() {
        log::warn(format!("open_url failed: {e}"));
    }
}

/// Open the user's mail app addressed to support, app version in the subject:
/// the About pane's "Send feedback" and "Request a feature", which differ only
/// in the subject, so both reach the one inbox already sorted. A dedicated
/// command — rather than widening `open_url` past https — so the webview still
/// can't launch arbitrary schemes.
#[tauri::command]
pub fn send_feedback(kind: Option<String>) {
    let url = feedback_mailto(kind.as_deref(), env!("CARGO_PKG_VERSION"));
    if let Err(e) = std::process::Command::new("open").arg(&url).spawn() {
        log::warn(format!("send_feedback failed: {e}"));
    }
}

/// The support address with a subject for the kind of message. Anything but a
/// feature request is plain feedback, so an unknown kind still reaches support.
pub(crate) fn feedback_mailto(kind: Option<&str>, version: &str) -> String {
    let subject = match kind {
        Some("feature") => "Hostbeam%20feature%20request",
        _ => "Hostbeam%20feedback",
    };
    format!("mailto:support@hostbeam.app?subject={subject}%20(v{version})")
}

/// Open Terminal with an SSH session to the host (the Hosts pane's action).
/// `target` is an ssh-config alias or user@host. The URL goes explicitly to
/// Apple's Terminal (`open -a`), not the system ssh:// handler — third-party
/// terminals that claim the scheme handle it unreliably (Hyper drops the
/// destination and runs a bare `ssh`). Terminal runs `ssh <host>`, so config
/// aliases still resolve. The charset guard keeps the webview from smuggling
/// flags or URL syntax in.
#[tauri::command]
pub fn open_terminal(target: String) {
    let ok = !target.is_empty()
        && target
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_' | '@'))
        && !target.starts_with('-');
    if !ok {
        log::warn(format!("open_terminal rejected target: {target}"));
        return;
    }
    if let Err(e) = std::process::Command::new("open")
        .args(["-a", "Terminal", &format!("ssh://{target}")])
        .spawn()
    {
        log::warn(format!("open_terminal failed: {e}"));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn feedback_and_feature_requests_reach_support_sorted_by_subject() {
        assert_eq!(
            feedback_mailto(None, "0.1.20"),
            "mailto:support@hostbeam.app?subject=Hostbeam%20feedback%20(v0.1.20)"
        );
        assert_eq!(
            feedback_mailto(Some("feature"), "0.1.20"),
            "mailto:support@hostbeam.app?subject=Hostbeam%20feature%20request%20(v0.1.20)"
        );
        // An unexpected kind from the webview is still feedback, never nothing.
        assert_eq!(
            feedback_mailto(Some("anything"), "0.1.20"),
            feedback_mailto(None, "0.1.20")
        );
    }
}
