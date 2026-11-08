//! Bring back images the agent left on the host — the beam pointed backwards.
//!
//! An agent produces pictures too: a browser test screenshots the page it
//! rendered, the fix you asked for gets captured to prove it worked. Seeing any
//! of that means leaving the flow for a terminal and an `scp`, which is the
//! interruption this product exists to remove.
//!
//! **Deliberately narrow, and off by default.** Pull only, never a watch: it
//! fetches when asked and never talks to a host on its own, so the app keeps
//! acting only when a key is pressed. Images only, because
//! [`docs/product.md`] defers arbitrary file transfer until the screenshot
//! workflow proves itself — whether Hostbeam is a screenshot bridge or a
//! two-way file bridge is a product decision that has not been made, and it
//! must not be arrived at through a feature. If people start asking why the PDF
//! did not come back, that is the evidence for making it.
//!
//! **Every filename here comes from a remote machine**, so it is treated as
//! untrusted input even though the host is the user's own: it is what the
//! remote `find` printed, and it is about to be interpolated into a shell
//! command and joined onto a local path. [`safe_name`] is the whole defence and
//! is where the tests are.

use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

use crate::error::{CommandError, Error, Result};
use crate::services::{image, ssh};

/// What a pull will bring back: the beam side's `IMAGE_EXTENSIONS` minus the
/// ones the `image` crate cannot decode for a thumbnail — those would arrive
/// as a nameless row, which is worse than not offering them. Pictures only,
/// still: any file goes *out* since 2026-09-26, but files coming back wait for
/// beam back's checks (next.md § 10).
const PULL_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "tif", "tiff", "bmp"];

/// Most files one pull will consider. A remote folder with thousands of images
/// is not the case this serves, and an unbounded list is an unbounded scp.
const MAX_FILES: usize = 20;

/// Largest single file fetched — what the beam side allowed until 2026-09-26,
/// when files going out rose to 100 MB. Pulls are pictures, so it stayed.
const MAX_BYTES: u64 = 50 * 1024 * 1024;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Incoming {
    /// Base name on the host, already validated by [`safe_name`].
    pub name: String,
    pub bytes: u64,
    /// Where it landed on this Mac.
    pub local: String,
    /// A ≤480px preview, or null when the bytes did not decode.
    pub preview: Option<String>,
}

/// Whether a name printed by the remote `find` is safe to put back into a shell
/// command and to join onto a local directory.
///
/// Rejects, in order of how badly each would go: anything with a path separator
/// or `..` (traversal, on both ends), a leading `-` (the name would be read as
/// an option by `scp`), quotes and backslashes (they end the single-quoted
/// remote argument), control characters and whitespace, and anything that is
/// not one of the image extensions this feature is limited to.
#[must_use]
pub fn safe_name(name: &str) -> bool {
    if name.is_empty() || name.len() > 255 {
        return false;
    }
    if name.starts_with('-') || name.starts_with('.') {
        return false;
    }
    if name.contains("..") || name.contains('/') || name.contains('\\') {
        return false;
    }
    if name.contains(['\'', '"', '`', '$', '\n', '\r', '\0']) {
        return false;
    }
    if name.chars().any(|c| c.is_control() || c.is_whitespace()) {
        return false;
    }
    match name.rsplit_once('.') {
        Some((stem, ext)) => {
            !stem.is_empty() && PULL_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str())
        }
        None => false,
    }
}

/// Remote script that fails, silently, only when `folder` exists and belongs to
/// another user. The same rule the beam's `mkdir` step enforces (`beam.rs`).
fn owner_script(folder: &str) -> String {
    format!("test ! -e '{folder}' || test -O '{folder}'")
}

/// Remote script listing candidate images, newest first, as `bytes<TAB>name`.
///
/// `! -name 'hostbeam-*'` is what makes this "what the agent left" rather than
/// "everything in the folder": Hostbeam's own uploads are excluded, so a pull
/// never re-downloads the screenshots you just sent. `-maxdepth 1` and
/// `-type f` mirror the storage and cleanup scripts — never recursive, never a
/// directory.
fn list_script(folder: &str) -> String {
    let names = PULL_EXTENSIONS
        .iter()
        .map(|e| format!("-iname '*.{e}'"))
        .collect::<Vec<_>>()
        .join(" -o ");
    format!(
        "find '{folder}' -maxdepth 1 -type f ! -name 'hostbeam-*' \\( {names} \\) \
         -exec stat -c '%Y %s %n' {{}} + 2>/dev/null \
         || find '{folder}' -maxdepth 1 -type f ! -name 'hostbeam-*' \\( {names} \\) \
         -exec stat -f '%m %z %N' {{}} + 2>/dev/null"
    )
}

/// One `mtime bytes /path/name` line → `(mtime, bytes, name)`, or None if the
/// line is malformed, the path is not directly inside `folder`, or the name is
/// not one this feature will touch.
///
/// The path must be exactly `{folder}/{name}` — which is all `find -maxdepth 1`
/// can print. Taking the base name and trusting it would accept a line like
/// `/tmp/hostbeam/../../../etc/shadow.png`: harmless, because only the base name
/// is ever used and the fetch would look for `{folder}/shadow.png`, but it means
/// silently trying to pull a file that was never in the folder. If the listing
/// says something this parser did not ask for, the right answer is to drop it.
fn parse_line(line: &str, folder: &str) -> Option<(u64, u64, String)> {
    let mut it = line.split_whitespace();
    let mtime: u64 = it.next()?.parse().ok()?;
    let bytes: u64 = it.next()?.parse().ok()?;
    // The rest is the path. A name with whitespace is rejected by `safe_name`
    // anyway, so a path arriving in more than one piece is not ours.
    let path = it.next()?;
    if it.next().is_some() {
        return None;
    }
    let name = path.strip_prefix(folder)?.strip_prefix('/')?;
    safe_name(name).then(|| (mtime, bytes, name.to_string()))
}

/// Parse the listing, newest first, capped.
fn parse_listing(out: &str, folder: &str) -> Vec<(u64, String)> {
    let mut rows: Vec<(u64, u64, String)> =
        out.lines().filter_map(|l| parse_line(l, folder)).collect();
    rows.sort_by_key(|a| std::cmp::Reverse(a.0));
    rows.into_iter()
        .take(MAX_FILES)
        .map(|(_, b, n)| (b, n))
        .collect()
}

/// Fetch every image the agent left in `folder` on `target`.
///
/// Returns them newest first, each already on this Mac with a preview, because
/// a list of names the user then has to click through one at a time is a worse
/// version of the terminal they were trying to avoid. The caps are what makes
/// fetching everything reasonable.
#[tauri::command]
pub async fn pull_incoming(
    target: String,
    folder: String,
) -> std::result::Result<Vec<Incoming>, CommandError> {
    let _transfer = crate::updates::transfer();
    let result = tauri::async_runtime::spawn_blocking(move || pull_blocking(&target, &folder))
        .await
        .map_err(|_| Error::Join)?;
    result.map_err(CommandError::from)
}

/// No `AppHandle`: a pull touches no config, no licence gate and no window, so
/// it stays a plain function over a host and a folder — which is also what makes
/// it runnable against the real test host without an app, and against the stub
/// `ssh` in `tests/fake_ssh.rs`.
pub fn pull_blocking(target: &str, folder: &str) -> Result<Vec<Incoming>> {
    if !ssh::valid_alias(target) {
        return Err(Error::InvalidAlias);
    }
    let folder = folder.trim_end_matches('/');
    if !ssh::valid_folder(folder) {
        return Err(Error::InvalidFolder);
    }

    // Nothing comes back from a folder another user owns: whatever is in it may
    // be theirs, and a pull would put it on this Mac. A folder that does not
    // exist yet passes, and the listing finds nothing in it as before.
    crate::beam::ssh_capture(target, &owner_script(folder), "pull_owner").map_err(|e| {
        if crate::beam::failed_silently(&e) {
            Error::FolderNotOwned
        } else {
            e
        }
    })?;
    let listing = crate::beam::ssh_capture(target, &list_script(folder), "pull_list")?;
    let files = parse_listing(&listing, folder);
    crate::log::info(format!(
        "pull {target}:{folder} — {} candidate(s)",
        files.len()
    ));
    if files.is_empty() {
        return Ok(Vec::new());
    }

    let dir = pulled_dir();
    std::fs::create_dir_all(&dir)?;

    let mut out = Vec::new();
    for (bytes, name) in files {
        if bytes > MAX_BYTES {
            crate::log::warn(format!("pull skipped {name}: {bytes} bytes"));
            continue;
        }
        // Prefixed with the epoch millis so two hosts, or two pulls of a
        // rewritten file, never collide in one directory.
        let local: PathBuf = dir.join(format!("{}-{name}", stamp()));
        let mut args = ssh::ssh_args(&["-o", "ControlPath=none"]);
        args.push(format!("{target}:{folder}/{name}"));
        args.push(local.to_string_lossy().into_owned());
        if let Err(e) = ssh::run("scp", &args, "pull") {
            crate::log::warn(format!("pull failed for {name}: {e}"));
            continue;
        }
        let preview = image::preview_from_file(&local, 480);
        out.push(Incoming {
            name,
            bytes,
            local: local.to_string_lossy().into_owned(),
            preview,
        });
    }
    crate::log::info(format!("pull {target}:{folder} — {} fetched", out.len()));
    Ok(out)
}

/// Where pulled images land. One directory, so [`open_pulled`] has something
/// definite to check against.
fn pulled_dir() -> PathBuf {
    std::env::temp_dir().join("hostbeam-pulled")
}

/// Open a pulled image in whatever the user views images with.
///
/// Takes a path but will only open one *inside* the pull directory. The webview
/// must not be able to ask the app to launch an arbitrary file — the same reason
/// `open_url` is restricted to https rather than widened. Both sides are
/// canonicalised first, so `.../hostbeam-pulled/../../etc/passwd` fails the
/// prefix check rather than passing it as a string.
#[tauri::command]
pub fn open_pulled(path: String) -> std::result::Result<(), CommandError> {
    let dir = pulled_dir()
        .canonicalize()
        .map_err(|_| Error::UnsupportedFile)?;
    let file = PathBuf::from(&path)
        .canonicalize()
        .map_err(|_| Error::UnsupportedFile)?;
    if !file.starts_with(&dir) || !file.is_file() {
        crate::log::warn(format!("open_pulled refused: {path}"));
        return Err(Error::UnsupportedFile.into());
    }
    std::process::Command::new("open")
        .arg(&file)
        .spawn()
        .map_err(|e| {
            crate::log::warn(format!("open_pulled failed: {e}"));
            Error::UnsupportedFile
        })?;
    Ok(())
}

fn stamp() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_ordinary_image_names() {
        for n in [
            "shot.png",
            "Result.PNG",
            "chart-2026-09-08.jpeg",
            "a.webp",
            "screenshot_final.tiff",
        ] {
            assert!(safe_name(n), "{n} should be accepted");
        }
    }

    #[test]
    fn rejects_path_traversal_in_both_directions() {
        // The name is joined onto a local directory *and* interpolated into a
        // remote path; a separator or `..` is dangerous at both ends.
        for n in [
            "../etc/passwd.png",
            "..",
            "a/b.png",
            "/abs.png",
            "sub\\dir.png",
            "x..y/../z.png",
        ] {
            assert!(!safe_name(n), "{n} should be rejected");
        }
    }

    #[test]
    fn rejects_names_that_would_break_out_of_the_quoted_argument() {
        for n in [
            "a'.png",
            "a\".png",
            "a`.png",
            "a$(id).png",
            "a;rm -rf.png",
            "a\nb.png",
        ] {
            assert!(!safe_name(n), "{n} should be rejected");
        }
    }

    #[test]
    fn rejects_a_leading_dash_that_scp_would_read_as_an_option() {
        assert!(!safe_name("-oProxyCommand=evil.png"));
        assert!(!safe_name("--help.png"));
    }

    #[test]
    fn rejects_hidden_files_and_anything_without_an_image_extension() {
        for n in [
            ".hidden.png",
            "notes.txt",
            "archive.zip",
            "noext",
            "x.",
            ".",
        ] {
            assert!(!safe_name(n), "{n} should be rejected");
        }
    }

    #[test]
    fn rejects_whitespace_and_control_characters() {
        assert!(!safe_name("two words.png"));
        assert!(!safe_name("tab\tname.png"));
        assert!(!safe_name("bell\u{7}.png"));
    }

    const FOLDER: &str = "/tmp/hostbeam";

    #[test]
    fn parses_a_listing_newest_first_and_caps_it() {
        let mut lines = vec![
            "100 2048 /tmp/hostbeam/old.png".to_string(),
            "300 4096 /tmp/hostbeam/new.png".to_string(),
            "200 1024 /tmp/hostbeam/mid.png".to_string(),
        ];
        for i in 0..40 {
            lines.push(format!("1 10 /tmp/hostbeam/f{i}.png"));
        }
        let got = parse_listing(&lines.join("\n"), FOLDER);
        assert_eq!(got.len(), MAX_FILES);
        assert_eq!(got[0], (4096, "new.png".to_string()));
        assert_eq!(got[1], (1024, "mid.png".to_string()));
        assert_eq!(got[2], (2048, "old.png".to_string()));
    }

    #[test]
    fn a_path_outside_the_folder_is_dropped_rather_than_reduced_to_its_name() {
        // Only the base name is ever used, so this was never a way out of the
        // folder — but a listing that names a file we did not ask about is not
        // one to act on.
        let out = "5 10 /tmp/hostbeam/../../../etc/shadow.png\n6 20 /tmp/hostbeam/ok.png";
        assert_eq!(parse_listing(out, FOLDER), vec![(20, "ok.png".to_string())]);
    }

    #[test]
    fn a_nested_path_is_dropped_even_though_find_should_not_print_one() {
        let out = "5 10 /tmp/hostbeam/sub/deep.png";
        assert!(parse_listing(out, FOLDER).is_empty());
    }

    #[test]
    fn a_sibling_folder_with_the_same_prefix_is_not_ours() {
        // `/tmp/hostbeam-other/x.png` starts with the folder string; the
        // separator check is what stops it being read as ours.
        let out = "5 10 /tmp/hostbeam-other/x.png";
        assert!(parse_listing(out, FOLDER).is_empty());
    }

    #[test]
    fn malformed_lines_are_ignored_rather_than_guessed_at() {
        for bad in [
            "",
            "nonsense",
            "1 notanumber /tmp/a.png",
            "1 2",
            "x 2 /tmp/a.png",
        ] {
            assert!(
                parse_listing(bad, FOLDER).is_empty(),
                "{bad:?} should yield nothing"
            );
        }
    }

    #[test]
    fn open_pulled_refuses_anything_outside_the_pull_directory() {
        // The guard is what stops the webview asking the app to open any file
        // on the disk. Canonicalisation means a traversal cannot spell its way
        // back inside.
        let dir = pulled_dir();
        std::fs::create_dir_all(&dir).unwrap();
        assert!(open_pulled("/etc/hosts".to_string()).is_err());
        assert!(open_pulled(
            dir.join("../../../etc/hosts")
                .to_string_lossy()
                .into_owned()
        )
        .is_err());
        // A path inside the directory that does not exist is refused too —
        // canonicalize fails before anything is spawned.
        assert!(open_pulled(dir.join("nope.png").to_string_lossy().into_owned()).is_err());
        // And a directory is not a file.
        assert!(open_pulled(dir.to_string_lossy().into_owned()).is_err());
    }

    #[test]
    fn the_list_script_excludes_hostbeams_own_uploads() {
        // Without this a pull would re-download every screenshot just beamed.
        let s = list_script("/tmp/hostbeam");
        assert!(s.contains("! -name 'hostbeam-*'"), "{s}");
        assert!(s.contains("-maxdepth 1"), "never recursive: {s}");
        assert!(s.contains("-type f"), "never a directory: {s}");
    }
}
