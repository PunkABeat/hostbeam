//! SSH/scp execution for beaming: option building, input validation, command
//! invocation, and failure classification. Argument construction and validation
//! are pure and unit-tested; `run` is the one impure entry that shells out.
//!
//! Security: commands are always argument arrays (never a shell string), options
//! are non-interactive and conservative, and `valid_alias`/`valid_folder` guard
//! against injection before anything executes.

use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use crate::error::{Error, Result};
use crate::ssh_config;

// Fail fast on unreachable hosts instead of waiting on the long TCP default.
const SSH_CONNECT_TIMEOUT: &str = "ConnectTimeout=5";

/// What `ssh` falls back to with no `Port` anywhere, and therefore what the
/// pairing payload must claim whenever the real port can't be determined.
pub const DEFAULT_SSH_PORT: u16 = 22;

/// Common SSH/scp options: non-interactive (no password/passphrase prompts),
/// fail-fast on unreachable hosts, and skip GSSAPI/Kerberos auth — trying it
/// (and the hostname canonicalization it does) is a frequent multi-second stall
/// on hosts with no KDC, and it never helps publickey auth.
fn ssh_opts() -> Vec<String> {
    vec![
        "-o".into(),
        "BatchMode=yes".into(),
        "-o".into(),
        SSH_CONNECT_TIMEOUT.into(),
        "-o".into(),
        "GSSAPIAuthentication=no".into(),
    ]
}

/// `ssh_opts()` followed by the command-specific args.
#[must_use]
pub fn ssh_args(extra: &[&str]) -> Vec<String> {
    let mut args = ssh_opts();
    args.extend(extra.iter().map(|s| s.to_string()));
    args
}

/// A host alias is safe to pass to `ssh`/`scp` only if it can't be mistaken for an
/// option or smuggle separators/whitespace.
#[must_use]
pub fn valid_alias(alias: &str) -> bool {
    !alias.is_empty()
        && !alias.starts_with('-')
        && !alias.contains(':')
        && !alias.chars().any(char::is_whitespace)
}

/// A remote folder must be absolute, and carry nothing a shell could act on.
///
/// Every remote script single-quotes the folder, which already makes a path a
/// path; this refuses the metacharacters anyway, so one unquoted interpolation
/// somewhere new could never become a command on the user's host. Quotes,
/// backticks, `$`, the separators and redirects, globs, control characters and
/// whitespace are out; anything else — including non-ASCII names — is a folder.
#[must_use]
pub fn valid_folder(folder: &str) -> bool {
    const SHELL: [char; 20] = [
        '"', '\'', '`', '$', ';', '&', '|', '<', '>', '(', ')', '{', '}', '[', ']', '*', '?', '!',
        '\\', '#',
    ];
    folder.starts_with('/')
        && !folder.contains(SHELL)
        && !folder.chars().any(|c| c.is_whitespace() || c.is_control())
}

/// An OpenSSH ed25519 public-key line ("ssh-ed25519 <base64> [comment]") is
/// safe to single-quote into the remote authorized_keys append only under a
/// strict charset: exact algorithm tag, base64 body, printable comment, and no
/// quote/backtick/backslash/newline anywhere. (The iPhone generates ed25519
/// keys only, so the tag is exact.)
#[must_use]
pub fn valid_pubkey(key: &str) -> bool {
    if key.contains(['\n', '\r', '\'', '"', '`', '\\']) {
        return false;
    }
    let mut parts = key.split_whitespace();
    let (Some(algo), Some(b64)) = (parts.next(), parts.next()) else {
        return false;
    };
    algo == "ssh-ed25519"
        && b64.len() >= 60
        && b64
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '/' | '='))
        && parts.all(|word| word.chars().all(|ch| ch.is_ascii_graphic()))
}

/// The port OpenSSH would actually use for `target`, asked of `ssh -G` rather
/// than re-parsed from the config ourselves: `-G` resolves `Match` blocks,
/// `Host *` defaults, `Include`s, and the system-wide config, none of which
/// [`crate::ssh_config`] models (the picker only ever needed alias/host/user).
/// `-G` prints the effective config and performs no network I/O.
///
/// Only QR pairing needs this. The Mac never passes a port when it beams — it
/// lets `ssh` resolve one — so "the port `ssh` would use" is exactly the value
/// the phone has to be told. Any failure falls back to [`DEFAULT_SSH_PORT`],
/// which is what `ssh` would have used anyway.
#[must_use]
pub fn resolve_port(target: &str) -> u16 {
    if !valid_alias(target) {
        return DEFAULT_SSH_PORT;
    }
    match Command::new("ssh").args(["-G", target]).output() {
        Ok(out) if out.status.success() => parse_port(&String::from_utf8_lossy(&out.stdout)),
        _ => {
            crate::log::error(format!(
                "resolve_port: `ssh -G {target}` failed; assuming {DEFAULT_SSH_PORT}"
            ));
            DEFAULT_SSH_PORT
        }
    }
}

/// Pulls the effective port out of `ssh -G` output, which prints one lowercased
/// keyword per unindented line (`port 2222`). Anything missing or unparsable is
/// [`DEFAULT_SSH_PORT`]; `u16` bounds the upper end and port 0 is rejected.
#[must_use]
pub fn parse_port(effective_config: &str) -> u16 {
    effective_config
        .lines()
        .find_map(|line| line.strip_prefix("port ")?.trim().parse::<u16>().ok())
        .filter(|port| *port > 0)
        .unwrap_or(DEFAULT_SSH_PORT)
}

/// Classify raw `ssh`/`scp` output into a structured [`Error::Ssh`], preserving
/// the first non-empty line of the cause for diagnostics. The UI code is derived
/// later, once, in [`crate::error::Error::to_code`].
#[must_use]
pub fn ssh_error(raw: &str) -> Error {
    Error::Ssh {
        kind: ssh_config::classify_beam_error(raw),
        detail: raw
            .lines()
            .find(|l| !l.trim().is_empty())
            .unwrap_or(raw)
            .trim()
            .to_string(),
    }
}

/// Run a command, logging the full invocation, exit code, and duration (and the
/// stderr on failure). Returns `Ok(())` on success, else a classified
/// [`Error::Ssh`] carrying the cause as structured data.
pub fn run(program: &str, args: &[String], label: &str) -> Result<()> {
    let t = Instant::now();
    match Command::new(program).args(args).output() {
        Ok(out) if out.status.success() => {
            crate::log::info(format!(
                "{label} ok in {:?}: {program} {}",
                t.elapsed(),
                args.join(" ")
            ));
            Ok(())
        }
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            crate::log::error(format!(
                "{label} exit {:?} in {:?}: {program} {} | {}",
                out.status.code(),
                t.elapsed(),
                args.join(" "),
                stderr.trim()
            ));
            Err(ssh_error(&stderr))
        }
        Err(e) => {
            crate::log::error(format!("{label} spawn failed: {program}: {e}"));
            Err(ssh_error(&format!("{program}: {e}")))
        }
    }
}

/// What an [`upload`] did: how many of the files, in order, are in place under
/// their final names, and what stopped it when that is not all of them.
pub struct Uploaded {
    pub landed: usize,
    pub error: Option<Error>,
}

/// Send `files` — each a local path and the name it gets in `folder` — to
/// `alias` in ONE `sftp` session, each written under a hidden temporary name
/// and renamed into place once complete.
///
/// One session, not one `scp` per file: a connection per file was most of a
/// batch's time. Measured against the test host with 50 ms added (2026-09-25,
/// 2.5 MB files): five files took 7.6 s as five `scp`s and 3.2 s like this; one
/// file, 1.56 s and 1.61 s. Still a direct connection (`ControlPath=none`) —
/// see `send` in `beam.rs` for why bulk data avoids a shared master.
///
/// The temporary name is why: `.hostbeam-….part` is outside the `hostbeam-*`
/// pattern the agent tools read, and the prompt hook attaches any recent
/// `hostbeam-*` file, so writing to the final name let a prompt sent mid-beam
/// hand the agent half an image. The iPhone does the same.
///
/// `on_landed(n)` is called as each file lands, with the count so far. sftp
/// echoes every batch command as it starts it, so the next file's `put` means
/// the previous file is renamed and whole; batch mode stops at the first
/// command that fails, so the files before it are exactly the ones that landed.
/// A `.part` the failure left behind is removed by Clean up.
///
/// The rename is sftp's own, which on OpenSSH replaces an existing file, as
/// `scp` always did. Names carry the gesture's millisecond stamp and are unique
/// within it (`remote_name`), so there is nothing there to replace.
pub fn upload(
    alias: &str,
    folder: &str,
    files: &[(PathBuf, String)],
    mut on_landed: impl FnMut(usize),
) -> Uploaded {
    let t = Instant::now();
    let failed = |error: Error| Uploaded {
        landed: 0,
        error: Some(error),
    };
    let stage = match Stage::new(files) {
        Ok(stage) => stage,
        Err(e) => return failed(e),
    };
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0)
        ^ u128::from(std::process::id());
    let mut batch = String::new();
    for (i, (_, remote)) in files.iter().enumerate() {
        let part = format!("{folder}/.hostbeam-{nonce:x}-{i}.part");
        let fin = format!("{folder}/{remote}");
        batch.push_str(&format!(
            "put {} {}\nrename {} {}\n",
            batch_arg(&stage.path(i).to_string_lossy()),
            batch_arg(&part),
            batch_arg(&part),
            batch_arg(&fin),
        ));
    }

    let args = ssh_args(&["-o", "ControlPath=none", "-b", "-", alias]);
    let mut child = match Command::new("sftp")
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(e) => {
            crate::log::error(format!("upload spawn failed: sftp: {e}"));
            return failed(ssh_error(&format!("sftp: {e}")));
        }
    };
    // The batch is a few hundred bytes a file, well inside a pipe's buffer,
    // so writing it all before reading cannot block.
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(batch.as_bytes());
    }
    // stderr on its own thread, so a chatty failure cannot fill its pipe and
    // stall the process while stdout is being read.
    let stderr = child.stderr.take().map(|mut err| {
        std::thread::spawn(move || {
            let mut text = String::new();
            let _ = err.read_to_string(&mut text);
            text
        })
    });
    let mut started = 0;
    if let Some(out) = child.stdout.take() {
        for line in BufReader::new(out).lines().map_while(|l| l.ok()) {
            if line.starts_with("sftp> put ") {
                started += 1;
                if started > 1 {
                    on_landed(started - 1);
                }
            }
        }
    }
    let status = child.wait();
    let stderr = stderr.and_then(|h| h.join().ok()).unwrap_or_default();
    match status {
        Ok(s) if s.success() => {
            on_landed(files.len());
            crate::log::info(format!(
                "upload ok in {:?}: {} file(s) → {alias}:{folder}",
                t.elapsed(),
                files.len()
            ));
            Uploaded {
                landed: files.len(),
                error: None,
            }
        }
        other => {
            let landed = started.saturating_sub(1);
            crate::log::error(format!(
                "upload stopped after {landed} of {} in {:?} ({:?}) → {alias}:{folder} | {}",
                files.len(),
                t.elapsed(),
                other.map(|s| s.code()),
                stderr.trim()
            ));
            Uploaded {
                landed,
                error: Some(ssh_error(&stderr)),
            }
        }
    }
}

/// One argument on an sftp batch line: sftp splits on spaces and reads double
/// quotes with backslash escapes. The folder is validated and the staged names
/// are plain, so this is belt and braces rather than the only defence.
fn batch_arg(s: &str) -> String {
    format!("\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\""))
}

/// The local files under short, plain names, for the batch to point at: a
/// screenshot's own name has spaces, and `put` would read `*`, `?` or `[` in a
/// local path as a pattern. Links, not copies, in a folder removed on drop.
struct Stage {
    dir: PathBuf,
}

impl Stage {
    fn new(files: &[(PathBuf, String)]) -> Result<Self> {
        let dir = std::env::temp_dir().join(format!(
            "hostbeam-upload-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        std::fs::create_dir_all(&dir)?;
        let stage = Self { dir };
        for (i, (local, _)) in files.iter().enumerate() {
            link(local, &stage.path(i))?;
        }
        Ok(stage)
    }

    fn path(&self, i: usize) -> PathBuf {
        self.dir.join(i.to_string())
    }
}

impl Drop for Stage {
    fn drop(&mut self) {
        // Removes the links, never what they point at.
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}

#[cfg(unix)]
fn link(from: &Path, to: &Path) -> std::io::Result<()> {
    std::os::unix::fs::symlink(std::fs::canonicalize(from)?, to)
}

#[cfg(not(unix))]
fn link(from: &Path, to: &Path) -> std::io::Result<()> {
    std::fs::copy(from, to).map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ssh_config::BeamErrorKind;

    #[test]
    fn parse_port_reads_the_effective_port() {
        let out = "user dev\nhostname 10.4.0.12\nport 2222\nbatchmode yes\n";
        assert_eq!(parse_port(out), 2222);
    }

    #[test]
    fn parse_port_falls_back_to_22_when_missing_or_unusable() {
        assert_eq!(parse_port("hostname box\nuser dev\n"), DEFAULT_SSH_PORT);
        assert_eq!(parse_port(""), DEFAULT_SSH_PORT);
        assert_eq!(parse_port("port \nport nope\n"), DEFAULT_SSH_PORT);
        // Port 0 is syntactically a u16 but never a real destination.
        assert_eq!(parse_port("port 0\n"), DEFAULT_SSH_PORT);
        // Out of u16 range, so not a port at all.
        assert_eq!(parse_port("port 70000\n"), DEFAULT_SSH_PORT);
    }

    #[test]
    fn parse_port_ignores_keywords_that_merely_contain_port() {
        let out = "controlpersist no\nexitonforwardfailure no\nlocalforward 8080 localhost:80\n";
        assert_eq!(parse_port(out), DEFAULT_SSH_PORT);
    }

    #[test]
    fn resolve_port_rejects_unsafe_targets_without_shelling_out() {
        assert_eq!(
            resolve_port("-oProxyCommand=touch /tmp/pwn"),
            DEFAULT_SSH_PORT
        );
        assert_eq!(resolve_port("host with spaces"), DEFAULT_SSH_PORT);
        assert_eq!(resolve_port(""), DEFAULT_SSH_PORT);
    }

    #[test]
    fn ssh_args_prepend_the_conservative_options() {
        let args = ssh_args(&["host", "true"]);
        assert_eq!(
            args,
            vec![
                "-o",
                "BatchMode=yes",
                "-o",
                "ConnectTimeout=5",
                "-o",
                "GSSAPIAuthentication=no",
                "host",
                "true",
            ]
        );
    }

    #[test]
    fn valid_alias_rejects_injection_and_option_smuggling() {
        assert!(valid_alias("prod-box"));
        assert!(valid_alias("user@example.com"));
        assert!(!valid_alias("")); // empty
        assert!(!valid_alias("-oProxyCommand=evil")); // looks like an option
        assert!(!valid_alias("host:22")); // separator
        assert!(!valid_alias("two words")); // whitespace
        assert!(!valid_alias("trailing ")); // trailing space
    }

    #[test]
    fn valid_pubkey_accepts_ed25519_and_rejects_smuggling() {
        let b64 = "AAAAC3NzaC1lZDI1NTE5AAAAIC5vZm9vYmFyYmF6cXV4Zm9vYmFyYmF6cXV4Zm9v";
        assert!(valid_pubkey(&format!("ssh-ed25519 {b64}")));
        assert!(valid_pubkey(&format!("ssh-ed25519 {b64} Hostbeam-iPhone")));
        assert!(!valid_pubkey("")); // empty
        assert!(!valid_pubkey("ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC")); // wrong algo
        assert!(!valid_pubkey(&format!("ssh-ed25519 {b64}'; rm -rf ~ #"))); // quote escape
        assert!(!valid_pubkey(&format!(
            "ssh-ed25519 {b64}\nssh-ed25519 evil"
        ))); // newline
        assert!(!valid_pubkey("ssh-ed25519 short")); // truncated body
    }

    #[test]
    fn valid_folder_requires_absolute_and_clean_paths() {
        assert!(valid_folder("/tmp/hostbeam"));
        assert!(valid_folder("/home/dev/captures-2026.v2_final"));
        assert!(valid_folder("/home/dev/écrans/日本")); // a name is a name
        assert!(!valid_folder("relative/path")); // not absolute
        assert!(!valid_folder("/has space")); // whitespace
        assert!(!valid_folder("/has\"quote")); // double quote
        assert!(!valid_folder("/has'quote")); // single quote
    }

    #[test]
    fn valid_folder_refuses_everything_a_shell_would_act_on() {
        // Every script quotes the folder, so none of these could run today;
        // they are refused so that a new, unquoted interpolation could not
        // turn a folder into a command either.
        for bad in [
            "/tmp/$(whoami)",
            "/tmp/`id`",
            "/tmp/a;rm",
            "/tmp/a&&b",
            "/tmp/a|b",
            "/tmp/a>b",
            "/tmp/a<b",
            "/tmp/a*",
            "/tmp/a?",
            "/tmp/a[b]",
            "/tmp/{a,b}",
            "/tmp/a\\b",
            "/tmp/a#b",
            "/tmp/a!b",
            "/tmp/a\u{7}b",
        ] {
            assert!(!valid_folder(bad), "{bad:?} should be refused");
        }
    }

    #[test]
    fn ssh_error_classifies_and_keeps_the_first_line() {
        let err = ssh_error("ssh: connect to host x port 22: Operation timed out\n");
        match err {
            Error::Ssh { kind, detail } => {
                assert_eq!(kind, BeamErrorKind::Unreachable);
                assert!(detail.starts_with("ssh: connect to host"));
            }
            other => panic!("expected Ssh, got {other:?}"),
        }
    }
}
