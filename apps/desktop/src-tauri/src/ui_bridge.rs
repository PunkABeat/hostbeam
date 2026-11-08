//! Messages Rust sends to a webview — the other half of the IPC contract, whose
//! commands the webview calls. Typed at both ends: [`UiMessage`] here mirrors
//! `RustMessage` in `src/lib/rust-bridge.ts`, field for field, and a test below
//! pins the serialized shape so the two cannot drift apart unnoticed.
//!
//! This replaced eleven `window.hbX && window.hbX(...)` evals, each spelled once
//! here and once in a view. The transport is still an eval, on purpose: the
//! popover is a non-activating panel whose webview is suspended while hidden,
//! an eval reaches it the moment it is shown, and whether a queued Tauri event
//! would is undocumented. It is one line in [`send`], so it can change without
//! touching a call site.
//!
//! A message the webview has no subscriber for is dropped, and so is one sent
//! before the webview exists. Both are deliberate: a `Beam` delivered later to
//! a popover that has since mounted would be the surprise upload this app
//! refuses to do. What a cold start needs is parked in `lib.rs` instead, and
//! collected on mount.

use serde::Serialize;
use tauri::{AppHandle, Manager};

/// What the floating HUD shows for the beam in flight.
#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum HudPhase {
    Uploading,
    Done,
    Partial,
    Failed,
}

/// One message to a webview. Serialized with a `kind` tag in camelCase, which
/// is what the TypeScript union switches on.
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum UiMessage {
    /// Beam the clipboard now: the shortcut, the tray, ⌥-click, a URL, auto-beam.
    Beam,
    /// Make this host the current one (the tray's Switch host ▸).
    SetHost { id: String },
    /// Copy a Recent gesture's paste-ready text, by the gesture's key.
    CopyRecent { key: String },
    /// The Dock menu's Hide from Dock: the same as the Preferences switch.
    SetDock { on: bool },
    /// One file of a batch landed. Never sent for a single file.
    Progress { sent: usize, total: usize },
    /// The auto-beam watcher's armed state.
    AutoBeam { armed: bool },
    /// macOS handed the app a file; it is parked, the popover collects it.
    OpenedFile,
    /// The popover panel was just shown — its only cue to refresh.
    Shown,
    /// The tray's Check for updates…: About runs its check.
    CheckUpdates,
    /// The HUD's reminder was clicked: the popover opens on its license card.
    ShowLicense,
    /// A dev-server forward opened or ended (ADR 0029): the popover asks
    /// `dev_forwards` again.
    DevForwards,
    /// The HUD's state for the beam in flight.
    Hud {
        phase: HudPhase,
        host: String,
        error: Option<String>,
        /// Files landed and files carried; both 0 for a single file.
        sent: usize,
        total: usize,
        /// The name of the one file a single-file beam carries. Null for a
        /// clipboard picture and for a batch. The HUD keeps it for the beam's
        /// later states, which do not repeat it.
        file: Option<String>,
        /// A landed beam that asks for a license under it (ADR 0028).
        remind: bool,
    },
}

impl UiMessage {
    /// The tag, for the log line.
    fn kind(&self) -> &'static str {
        match self {
            Self::Beam => "beam",
            Self::SetHost { .. } => "setHost",
            Self::CopyRecent { .. } => "copyRecent",
            Self::SetDock { .. } => "setDock",
            Self::Progress { .. } => "progress",
            Self::AutoBeam { .. } => "autoBeam",
            Self::OpenedFile => "openedFile",
            Self::Shown => "shown",
            Self::CheckUpdates => "checkUpdates",
            Self::ShowLicense => "showLicense",
            Self::DevForwards => "devForwards",
            Self::Hud { .. } => "hud",
        }
    }
}

/// The webview a message goes to.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Target {
    Popover,
    Preferences,
    Hud,
}

impl Target {
    fn label(self) -> &'static str {
        match self {
            Self::Popover => crate::POPOVER,
            Self::Preferences => "preferences",
            Self::Hud => crate::HUD,
        }
    }
}

/// The script that delivers `msg`: the receiver `src/lib/rust-bridge.ts`
/// installs, guarded so a bundle that has not loaded yet drops it silently.
fn script(msg: &UiMessage) -> Option<String> {
    let payload = serde_json::to_string(msg).ok()?;
    Some(format!(
        "window.__hbReceive && window.__hbReceive({payload})"
    ))
}

/// Deliver `msg` to `target`. Returns whether the window existed and took the
/// script — not whether anything was listening. Failures are logged.
pub fn send(app: &AppHandle, target: Target, msg: &UiMessage) -> bool {
    let Some(window) = app.get_webview_window(target.label()) else {
        return false;
    };
    let Some(script) = script(msg) else {
        crate::log::warn(format!("ui message {} could not be serialized", msg.kind()));
        return false;
    };
    crate::log::warn_if_err(
        &format!("ui message {} → {}", msg.kind(), target.label()),
        window.eval(script),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn json(msg: &UiMessage) -> String {
        serde_json::to_string(msg).unwrap()
    }

    #[test]
    fn every_message_serializes_the_way_the_typescript_union_reads_it() {
        // Kept in step with `RustMessage` in src/lib/rust-bridge.ts by hand;
        // this is the test that notices when one side changes.
        assert_eq!(json(&UiMessage::Beam), r#"{"kind":"beam"}"#);
        assert_eq!(
            json(&UiMessage::SetHost { id: "prod".into() }),
            r#"{"kind":"setHost","id":"prod"}"#
        );
        assert_eq!(
            json(&UiMessage::CopyRecent { key: "r1".into() }),
            r#"{"kind":"copyRecent","key":"r1"}"#
        );
        assert_eq!(
            json(&UiMessage::SetDock { on: false }),
            r#"{"kind":"setDock","on":false}"#
        );
        assert_eq!(
            json(&UiMessage::Progress { sent: 2, total: 5 }),
            r#"{"kind":"progress","sent":2,"total":5}"#
        );
        assert_eq!(
            json(&UiMessage::AutoBeam { armed: true }),
            r#"{"kind":"autoBeam","armed":true}"#
        );
        assert_eq!(json(&UiMessage::OpenedFile), r#"{"kind":"openedFile"}"#);
        assert_eq!(json(&UiMessage::Shown), r#"{"kind":"shown"}"#);
        assert_eq!(json(&UiMessage::CheckUpdates), r#"{"kind":"checkUpdates"}"#);
        assert_eq!(json(&UiMessage::ShowLicense), r#"{"kind":"showLicense"}"#);
        assert_eq!(json(&UiMessage::DevForwards), r#"{"kind":"devForwards"}"#);
        assert_eq!(
            json(&UiMessage::Hud {
                phase: HudPhase::Failed,
                host: "prod".into(),
                error: Some("auth".into()),
                sent: 0,
                total: 0,
                file: None,
                remind: false,
            }),
            r#"{"kind":"hud","phase":"failed","host":"prod","error":"auth","sent":0,"total":0,"file":null,"remind":false}"#
        );
        assert_eq!(
            json(&UiMessage::Hud {
                phase: HudPhase::Uploading,
                host: "prod".into(),
                error: None,
                sent: 0,
                total: 0,
                file: Some("report.pdf".into()),
                remind: false,
            }),
            r#"{"kind":"hud","phase":"uploading","host":"prod","error":null,"sent":0,"total":0,"file":"report.pdf","remind":false}"#
        );
        assert_eq!(
            json(&UiMessage::Hud {
                phase: HudPhase::Done,
                host: "prod".into(),
                error: None,
                sent: 0,
                total: 0,
                file: None,
                remind: true,
            }),
            r#"{"kind":"hud","phase":"done","host":"prod","error":null,"sent":0,"total":0,"file":null,"remind":true}"#
        );
    }

    #[test]
    fn the_script_is_guarded_and_encodes_its_argument() {
        // A host id is someone's string about to sit inside JavaScript: encoded,
        // never quoted by hand, so a quote in it cannot end the call.
        let s = script(&UiMessage::SetHost {
            id: "it's</script>".into(),
        })
        .unwrap();
        assert!(s.starts_with("window.__hbReceive && window.__hbReceive("));
        assert!(s.contains(r#""id":"it's</script>""#));
        assert!(s.ends_with(')'));
    }
}
