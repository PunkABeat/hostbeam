//! The project error type for the Rust core.
//!
//! Core/service code returns the typed [`Error`] (cause-preserving via
//! `#[from]`/`#[source]`); a `#[tauri::command]` maps it to a [`CommandError`] at
//! the IPC edge. Stringification of an error into a UI-facing code happens in
//! exactly one place — [`Error::to_code`] — and nowhere else. See
//! `docs/engineering/rust.md` §Error handling.

use serde::{Serialize, Serializer};

use crate::ssh_config::BeamErrorKind;

/// A typed error from the core. Variants preserve their cause so a failure can be
/// logged and diagnosed; the UI only ever sees the stable code from
/// [`Error::to_code`].
#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),

    #[error("clipboard: {0}")]
    Clipboard(#[from] arboard::Error),

    #[error("no image on the clipboard")]
    ClipboardEmpty,

    #[error("the clipboard image had an invalid pixel buffer")]
    InvalidImageBuffer,

    #[error("image: {0}")]
    Image(#[from] image::ImageError),

    #[error("that is not a file Hostbeam can beam (a folder, or unreadable)")]
    UnsupportedFile,

    #[error("that file is too large to beam")]
    FileTooLarge,

    #[error("too many files at once")]
    TooManyFiles,

    #[error("invalid host alias")]
    InvalidAlias,

    #[error("invalid remote folder")]
    InvalidFolder,

    #[error("invalid public key")]
    InvalidPubkey,

    #[error("the remote folder belongs to another user")]
    FolderNotOwned,

    #[error("ssh {kind:?}: {detail}")]
    Ssh { kind: BeamErrorKind, detail: String },

    #[error("license key invalid")]
    LicenseInvalid,

    #[error("license seat limit reached")]
    LicenseSeats,

    #[error("license service unreachable: {0}")]
    LicenseNetwork(String),

    #[error("license key could not be stored in the Keychain")]
    LicenseStorage,

    #[error("licensing not configured in this build")]
    LicenseUnconfigured,

    #[error("update check/install failed: {0}")]
    Update(String),

    #[error("shortcut: {0}")]
    Shortcut(String),

    #[error("shortcut already used by the {0} slot")]
    ShortcutTaken(&'static str),

    #[error("window: {0}")]
    Window(String),

    #[error("that is not a port Hostbeam forwards")]
    InvalidPort,

    #[error("the dev server is no longer listening on the host")]
    DevServerGone,

    #[error("the host refuses forwarding and has no nc, bash or perl to relay with")]
    DevNoRelay,

    #[error("background task failed")]
    Join,
}

pub type Result<T> = std::result::Result<T, Error>;

impl Error {
    /// The stable, serializable code the popover branches on. The UI taxonomy
    /// (`window.OB.BEAM_ERRORS`) handles `timeout` / `auth` / `perm`; any other
    /// value collapses to the generic (timeout) failure card.
    ///
    /// This is the *only* place an [`Error`] becomes a UI string.
    #[must_use]
    pub fn to_code(&self) -> &'static str {
        match self {
            // Classified ssh/scp failures map to the matching UI visual.
            Error::Ssh { kind, .. } => match kind {
                BeamErrorKind::Auth => "auth",
                BeamErrorKind::Folder => "perm",
                BeamErrorKind::Unreachable | BeamErrorKind::Unknown => "timeout",
            },
            // Pre-connection input validation is honestly generic — it is neither a
            // remote permission problem nor an unreachable host, so it must not
            // claim to be one. The popover renders its generic failure card.
            Error::InvalidAlias
            | Error::InvalidFolder
            | Error::InvalidPubkey
            | Error::InvalidPort => "invalid",
            // Opening a dev server (ADR 0029): it stopped before the click, or
            // the host allows no way through. Neither is an unreachable host.
            Error::DevServerGone => "dev_gone",
            Error::DevNoRelay => "dev_blocked",
            // Its own code, not "perm": the folder may be perfectly writable, it
            // is just someone else's, and a permissions card would send the user
            // checking modes instead of choosing another folder.
            Error::FolderNotOwned => "owner",
            // A file handed over that the app will not send — a folder, one it
            // cannot read, one over the size cap. Its own code, because these
            // never reached the host: the generic failure card would blame the
            // connection and mark a perfectly healthy host unreachable.
            Error::UnsupportedFile | Error::FileTooLarge => "file",
            // Its own code, not "file": every file was fine, there were simply
            // too many, and telling someone their files cannot be sent would
            // send them looking for the wrong problem.
            Error::TooManyFiles => "many",
            // License command outcomes the License pane branches on.
            Error::LicenseInvalid => "license_invalid",
            Error::LicenseSeats => "license_seats",
            Error::LicenseNetwork(_) => "license_network",
            Error::LicenseStorage => "license_storage",
            Error::LicenseUnconfigured => "license_unconfigured",
            // The About pane's update states.
            Error::Update(_) => "update",
            // A shortcut that will not parse or register, and one another slot
            // already holds — the recorder writes the value back on every render
            // and ignores both, but a log line still says which.
            Error::Shortcut(_) => "shortcut",
            Error::ShortcutTaken(_) => "shortcut_taken",
            // A window that could not be built; nothing the UI can act on.
            Error::Window(_) => "window",
            // Local clipboard/image/io/task failures: the generic failure surface
            // the prototype has always shown for these.
            Error::Io(_)
            | Error::Clipboard(_)
            | Error::ClipboardEmpty
            | Error::InvalidImageBuffer
            | Error::Image(_)
            | Error::Join => "timeout",
        }
    }
}

/// The error as it crosses the IPC boundary: serializes to the bare stable code
/// string the webview expects (`invoke(...).catch(code => …)`).
#[derive(Debug)]
pub struct CommandError(&'static str);

impl From<Error> for CommandError {
    fn from(err: Error) -> Self {
        CommandError(err.to_code())
    }
}

impl std::fmt::Display for CommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.0)
    }
}

impl Serialize for CommandError {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ssh_kinds_map_to_ui_codes() {
        let code = |kind| {
            Error::Ssh {
                kind,
                detail: String::new(),
            }
            .to_code()
        };
        assert_eq!(code(BeamErrorKind::Auth), "auth");
        assert_eq!(code(BeamErrorKind::Folder), "perm");
        assert_eq!(code(BeamErrorKind::Unreachable), "timeout");
        assert_eq!(code(BeamErrorKind::Unknown), "timeout");
    }

    #[test]
    fn validation_errors_are_generic_not_mislabeled() {
        // The intentional behavior fix: a bad alias is no longer "timeout" and a
        // bad folder is no longer "perm".
        assert_eq!(Error::InvalidAlias.to_code(), "invalid");
        assert_eq!(Error::InvalidFolder.to_code(), "invalid");
        assert_eq!(Error::FolderNotOwned.to_code(), "owner");
    }

    #[test]
    fn local_failures_stay_on_the_generic_card() {
        assert_eq!(Error::ClipboardEmpty.to_code(), "timeout");
        assert_eq!(Error::InvalidImageBuffer.to_code(), "timeout");
        assert_eq!(Error::Join.to_code(), "timeout");
    }

    #[test]
    fn shortcut_and_window_failures_have_their_own_codes() {
        assert_eq!(Error::Shortcut("x".into()).to_code(), "shortcut");
        assert_eq!(Error::ShortcutTaken("beam").to_code(), "shortcut_taken");
        assert_eq!(Error::Window("x".into()).to_code(), "window");
        assert_eq!(
            CommandError::from(Error::ShortcutTaken("auto")).to_string(),
            "shortcut_taken"
        );
    }

    #[test]
    fn command_error_serializes_to_the_bare_code() {
        let json = serde_json::to_string(&CommandError::from(Error::InvalidAlias)).unwrap();
        assert_eq!(json, "\"invalid\"");
        let json = serde_json::to_string(&CommandError::from(Error::Ssh {
            kind: BeamErrorKind::Auth,
            detail: "x".into(),
        }))
        .unwrap();
        assert_eq!(json, "\"auth\"");
    }
}
