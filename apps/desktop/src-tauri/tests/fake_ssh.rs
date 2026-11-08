//! The orchestration against a stub `ssh` and `scp`.
//!
//! The functions under test shell out to whatever `ssh` is first on `PATH`, so
//! the harness puts two shell scripts there. Each is data-driven from a
//! per-host directory: `stdout` is printed, `status` is the exit code, `stderr`
//! is what a failure says, and every invocation appends its arguments to
//! `calls` as one line. Hosts are unique per test, so the tests can run in parallel with
//! one `PATH` between them.
//!
//! What this covers is the shape of each conversation with the host: which
//! commands run, in what order, what is made of their answers. A real host is
//! still `npm run testhost:up`.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Once;

use hostbeam_lib::beam::{diagnose_blocking, install_pubkey_blocking, test_host_blocking};
use hostbeam_lib::error::Error;
use hostbeam_lib::pull::pull_blocking;
use hostbeam_lib::services::ssh;
use hostbeam_lib::ssh_config::BeamErrorKind;

const SSH: &str = r#"#!/bin/sh
# Stub ssh: `ssh [-o opt]... host [command]` or `ssh -G host`.
root="$HB_FAKE_ROOT"
while [ "$1" = "-o" ]; do shift 2; done
if [ "$1" = "-G" ]; then shift; fi
host="$1"; shift
dir="$root/$host"
mkdir -p "$dir"
# One line per call: a multi-line remote script is folded onto it.
printf 'ssh %s\t%s\n' "$host" "$(printf '%s' "$*" | tr '\n' ' ')" >> "$dir/calls"
[ -f "$dir/stdout" ] && cat "$dir/stdout"
[ -f "$dir/stderr" ] && cat "$dir/stderr" >&2
[ -f "$dir/status" ] && exit "$(cat "$dir/status")"
exit 0
"#;

const SCP: &str = r#"#!/bin/sh
# Stub scp: `scp [-o opt]... src dst`; whichever side has a colon is the host.
root="$HB_FAKE_ROOT"
while [ "$1" = "-o" ]; do shift 2; done
src="$1"; dst="$2"
case "$src" in *:*) host="${src%%:*}";; *) host="${dst%%:*}";; esac
dir="$root/$host"
mkdir -p "$dir"
printf 'scp %s\t%s\t%s\n' "$host" "$src" "$dst" >> "$dir/calls"
[ -f "$dir/stderr" ] && cat "$dir/stderr" >&2
[ -f "$dir/status" ] && exit "$(cat "$dir/status")"
case "$dst" in *:*) ;; *) : > "$dst";; esac
exit 0
"#;

const SFTP: &str = r#"#!/bin/sh
# Stub sftp: `sftp [-o opt]... -b - host`, the batch on stdin. Echoes each
# command as it starts it, as sftp does, and keeps the host's files in
# $dir/remote by base name. `fail_at` fails that (1-based) command; `status`
# fails before any, as a connection that never opened.
root="$HB_FAKE_ROOT"
for a in "$@"; do host="$a"; done
dir="$root/$host"
mkdir -p "$dir/remote"
if [ -f "$dir/status" ]; then
  [ -f "$dir/stderr" ] && cat "$dir/stderr" >&2
  exit "$(cat "$dir/status")"
fi
fail_at=""
[ -f "$dir/fail_at" ] && fail_at="$(cat "$dir/fail_at")"
n=0
while IFS= read -r line; do
  n=$((n+1))
  echo "sftp> $line"
  printf 'sftp %s\t%s\n' "$host" "$line" >> "$dir/calls"
  if [ "$n" = "$fail_at" ]; then
    echo 'dest open "/x": Permission denied' >&2
    exit 1
  fi
  eval "set -- $line"
  case "$1" in
    put) cp "$2" "$dir/remote/$(basename "$3")" ;;
    rename) mv "$dir/remote/$(basename "$2")" "$dir/remote/$(basename "$3")" ;;
  esac
done
exit 0
"#;

static INSTALL: Once = Once::new();

fn root() -> PathBuf {
    std::env::temp_dir().join(format!("hostbeam-fake-ssh-{}", std::process::id()))
}

/// Puts the stubs first on `PATH`, once per test binary, before any test spawns.
fn install() {
    INSTALL.call_once(|| {
        let bin = root().join("bin");
        fs::create_dir_all(&bin).unwrap();
        for (name, body) in [("ssh", SSH), ("scp", SCP), ("sftp", SFTP)] {
            let path = bin.join(name);
            // The root is baked in through the environment rather than the
            // script so the script text above stays readable as a script.
            fs::write(&path, body).unwrap();
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                fs::set_permissions(&path, fs::Permissions::from_mode(0o755)).unwrap();
            }
        }
        let path = std::env::var("PATH").unwrap_or_default();
        std::env::set_var("PATH", format!("{}:{path}", bin.display()));
        std::env::set_var("HB_FAKE_ROOT", root());
    });
}

/// One host the stub knows, with what it should answer.
struct Host {
    name: String,
    dir: PathBuf,
}

impl Host {
    fn new(name: &str) -> Self {
        install();
        let dir = root().join(name);
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        Self {
            name: name.to_string(),
            dir,
        }
    }

    fn answers(self, stdout: &str) -> Self {
        fs::write(self.dir.join("stdout"), stdout).unwrap();
        self
    }

    /// sftp only: the batch's `n`th command (1-based) fails.
    fn fails_at_command(self, n: usize) -> Self {
        fs::write(self.dir.join("fail_at"), n.to_string()).unwrap();
        self
    }

    /// What the host holds in its beam folder, by name, after an sftp upload.
    fn remote(&self) -> std::collections::BTreeMap<String, Vec<u8>> {
        fs::read_dir(self.dir.join("remote"))
            .map(|entries| {
                entries
                    .flatten()
                    .map(|e| {
                        (
                            e.file_name().to_string_lossy().into_owned(),
                            fs::read(e.path()).unwrap(),
                        )
                    })
                    .collect()
            })
            .unwrap_or_default()
    }

    fn fails(self, status: i32, stderr: &str) -> Self {
        fs::write(self.dir.join("status"), status.to_string()).unwrap();
        fs::write(self.dir.join("stderr"), stderr).unwrap();
        self
    }

    /// Every invocation so far, one per line: `ssh host\tcommand` or
    /// `scp host\tsrc\tdst`.
    fn calls(&self) -> Vec<String> {
        fs::read_to_string(self.dir.join("calls"))
            .unwrap_or_default()
            .lines()
            .map(str::to_string)
            .collect()
    }
}

const KEY: &str =
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIC5vZm9vYmFyYmF6cXV4Zm9vYmFyYmF6cXV4Zm9v phone";

fn ssh_kind(e: &Error) -> Option<BeamErrorKind> {
    match e {
        Error::Ssh { kind, .. } => Some(*kind),
        _ => None,
    }
}

// --- test_host -------------------------------------------------------------

#[test]
fn a_reachable_host_reports_which_keys_it_holds() {
    let host = Host::new("probe-ok").answers("banner line\n0\n2\n");
    let keys = vec![KEY.to_string(), "not a key".to_string(), KEY.to_string()];
    let r = test_host_blocking(host.name.clone(), &keys);
    assert!(r.ok, "{}", r.detail);
    assert_eq!(r.detail, "Reachable");
    assert_eq!(r.keys_present, [0, 2], "the banner is not a device");
    let calls = host.calls();
    assert_eq!(calls.len(), 1, "one connection answers both questions");
    assert!(calls[0].contains("authorized_keys"), "{}", calls[0]);
    assert!(calls[0].contains("echo 0") && calls[0].contains("echo 2"));
    assert!(
        !calls[0].contains("echo 1"),
        "an invalid key is not asked about"
    );
}

#[test]
fn a_refused_host_reports_the_first_line_and_no_keys() {
    let host =
        Host::new("probe-refused").fails(255, "ssh: connect to host: Connection refused\nmore\n");
    let r = test_host_blocking(host.name.clone(), &[KEY.to_string()]);
    assert!(!r.ok);
    assert_eq!(r.detail, "ssh: connect to host: Connection refused");
    assert!(r.keys_present.is_empty());
}

#[test]
fn an_unsupported_alias_never_reaches_ssh() {
    let host = Host::new("probe-bad");
    let r = test_host_blocking("-oProxyCommand=evil".into(), &[]);
    assert!(!r.ok);
    assert_eq!(r.detail, "Unsupported host");
    assert!(host.calls().is_empty());
}

// --- diagnose --------------------------------------------------------------

fn statuses(rows: &[hostbeam_lib::beam::DiagRow]) -> Vec<&str> {
    rows.iter().map(|r| r.status.as_str()).collect()
}

#[test]
fn diagnostics_on_a_good_host_check_the_folder_as_one_script() {
    let host = Host::new("diag-ok");
    let rows = diagnose_blocking("en", host.name.clone(), "/srv/shots/".into());
    assert_eq!(rows.len(), 4);
    assert_eq!(statuses(&rows)[..3], ["ok", "ok", "ok"]);
    assert!(
        matches!(rows[3].status.as_str(), "ok" | "warn"),
        "latency is a number, not a verdict"
    );
    assert_eq!(
        rows[2].detail, "/srv/shots",
        "the trailing slash is dropped"
    );
    let calls = host.calls();
    assert_eq!(calls.len(), 2, "one probe, one folder check");
    assert!(calls[0].ends_with("\ttrue"), "{}", calls[0]);
    assert!(
        calls[1].contains("mkdir -p") && calls[1].contains("&& test -w '/srv/shots'"),
        "the folder check is one remote command string: {}",
        calls[1]
    );
}

#[test]
fn diagnostics_on_an_unwritable_folder_say_so() {
    // The probe (`true`) and the folder check share one stub answer, so a host
    // that fails everything is read through the probe first.
    let host = Host::new("diag-ro").fails(1, "");
    let rows = diagnose_blocking("en", host.name.clone(), "/srv/shots".into());
    // An empty stderr on a failed probe is not an auth failure.
    assert_eq!(statuses(&rows), ["fail", "skip", "skip", "skip"]);
}

#[test]
fn diagnostics_tell_auth_apart_from_unreachable() {
    let auth = Host::new("diag-auth").fails(255, "user@host: Permission denied (publickey).\n");
    let rows = diagnose_blocking("en", auth.name.clone(), "/srv/shots".into());
    assert_eq!(statuses(&rows), ["ok", "fail", "skip", "skip"]);
    assert_eq!(rows[1].detail, "user@host: Permission denied (publickey).");

    let down = Host::new("diag-down").fails(255, "ssh: connect to host: Operation timed out\n");
    let rows = diagnose_blocking("en", down.name.clone(), "/srv/shots".into());
    assert_eq!(statuses(&rows), ["fail", "skip", "skip", "skip"]);
    assert!(rows[0].detail.contains("timed out"));
}

// --- install_pubkey --------------------------------------------------------

#[test]
fn installing_a_key_appends_it_once_over_the_users_access() {
    let host = Host::new("install-ok");
    install_pubkey_blocking(&host.name, &format!("  {KEY}\n")).unwrap();
    let calls = host.calls();
    assert_eq!(calls.len(), 1);
    assert!(
        calls[0].contains(&format!("k='{KEY}'")),
        "trimmed and single-quoted: {}",
        calls[0]
    );
    assert!(calls[0].contains("grep -qxF"), "idempotent: {}", calls[0]);
    assert!(calls[0].contains("chmod 600 ~/.ssh/authorized_keys"));
}

#[test]
fn a_bad_key_or_alias_is_refused_before_anything_runs() {
    let host = Host::new("install-bad");
    assert!(matches!(
        install_pubkey_blocking(&host.name, "ssh-ed25519 abc'; rm -rf ~ '"),
        Err(Error::InvalidPubkey)
    ));
    assert!(matches!(
        install_pubkey_blocking("bad host", KEY),
        Err(Error::InvalidAlias)
    ));
    assert!(host.calls().is_empty());
}

#[test]
fn a_host_that_refuses_the_key_reports_a_classified_error() {
    let host = Host::new("install-auth").fails(255, "Permission denied (publickey).\n");
    let e = install_pubkey_blocking(&host.name, KEY).unwrap_err();
    assert_eq!(ssh_kind(&e), Some(BeamErrorKind::Auth));
    assert_eq!(e.to_code(), "auth");
}

// --- pull ------------------------------------------------------------------

#[test]
fn a_pull_lists_then_fetches_each_file_newest_first() {
    let host = Host::new("pull-ok").answers(
        "1700000000 300 /srv/shots/old.png\n\
         1700000100 200 /srv/shots/new.jpg\n\
         1700000050 100 /srv/shots/hostbeam-mine.png\n\
         1700000060 400 /srv/shots/has space.png\n",
    );
    let got = pull_blocking(&host.name, "/srv/shots/").unwrap();
    let names: Vec<&str> = got.iter().map(|i| i.name.as_str()).collect();
    // The listing script excludes hostbeam-* on the host; the parser excludes
    // names it will not put on a command line.
    assert_eq!(names, ["new.jpg", "hostbeam-mine.png", "old.png"]);
    assert_eq!(got[0].bytes, 200);
    for i in &got {
        assert!(Path::new(&i.local).is_file(), "{} landed locally", i.local);
        assert!(i.preview.is_none(), "an empty file has no preview");
    }
    let calls = host.calls();
    assert_eq!(
        calls.len(),
        5,
        "owner check, listing, three scps: {calls:?}"
    );
    assert!(calls[0].contains("test -O '/srv/shots'"), "{}", calls[0]);
    assert!(
        calls[1].contains("find '/srv/shots' -maxdepth 1"),
        "{}",
        calls[1]
    );
    assert!(calls[1].contains("! -name 'hostbeam-*'"));
    assert!(calls[2].starts_with(&format!(
        "scp {}\t{}:/srv/shots/new.jpg\t",
        host.name, host.name
    )));
}

#[test]
fn a_pull_from_a_folder_someone_else_owns_stops_at_the_owner_check() {
    // `test -O` failing says nothing on stderr; that silence is the signal.
    let host = Host::new("pull-owner").fails(1, "");
    let e = pull_blocking(&host.name, "/srv/theirs").unwrap_err();
    assert!(matches!(e, Error::FolderNotOwned), "{e}");
    assert_eq!(host.calls().len(), 1);
}

#[test]
fn a_pull_with_nothing_to_fetch_does_not_scp() {
    let host = Host::new("pull-empty");
    assert!(pull_blocking(&host.name, "/srv/shots").unwrap().is_empty());
    assert_eq!(host.calls().len(), 2);
}

#[test]
fn a_pull_refuses_a_folder_the_shell_could_misread() {
    let host = Host::new("pull-folder");
    assert!(matches!(
        pull_blocking(&host.name, "/srv/$(id)"),
        Err(Error::InvalidFolder)
    ));
    assert!(host.calls().is_empty());
}

// --- the runner and the port lookup ----------------------------------------

#[test]
fn run_classifies_failures_and_keeps_the_first_line() {
    let host = Host::new("run-fail").fails(
        255,
        "\nssh: connect to host: Connection refused\r\nsecond\n",
    );
    let e = ssh::run("ssh", &ssh::ssh_args(&[&host.name, "true"]), "test").unwrap_err();
    assert_eq!(ssh_kind(&e), Some(BeamErrorKind::Unreachable));
    match e {
        Error::Ssh { detail, .. } => assert_eq!(detail, "ssh: connect to host: Connection refused"),
        other => panic!("{other}"),
    }
    let ok = Host::new("run-ok");
    ssh::run("ssh", &ssh::ssh_args(&[&ok.name, "true"]), "test").unwrap();
}

#[test]
fn run_reports_a_missing_program_as_an_ssh_error() {
    install();
    let e = ssh::run("hostbeam-no-such-program", &[], "test").unwrap_err();
    match e {
        Error::Ssh { detail, .. } => {
            assert!(detail.starts_with("hostbeam-no-such-program:"), "{detail}")
        }
        other => panic!("{other}"),
    }
}

#[test]
fn the_port_is_whatever_ssh_g_says_it_is() {
    let host = Host::new("port-2222").answers("user me\nport 2222\nhostname h\n");
    assert_eq!(ssh::resolve_port(&host.name), 2222);
    assert_eq!(
        host.calls(),
        [format!("ssh {}\t", host.name)],
        "`-G host`, nothing else"
    );
    let none = Host::new("port-none").fails(255, "no such host");
    assert_eq!(ssh::resolve_port(&none.name), 22);
}

// --- upload: one sftp session per beam ---------------------------------------

/// Local files with the bytes each should arrive as — one named the way macOS
/// names a screenshot, spaces and all, and one with characters `put` would
/// read as a pattern.
fn local_files(tag: &str) -> Vec<(std::path::PathBuf, String, Vec<u8>)> {
    let dir = root().join(format!("local-{tag}"));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    [
        "Screenshot 2026-09-25 at 10.00.00.png",
        "shot [1] *.png",
        "plain.png",
    ]
    .iter()
    .enumerate()
    .map(|(i, name)| {
        let path = dir.join(name);
        let bytes = vec![i as u8 + 1; 1000 + i];
        fs::write(&path, &bytes).unwrap();
        (path, format!("hostbeam-42-{i}.png"), bytes)
    })
    .collect()
}

fn files(local: &[(std::path::PathBuf, String, Vec<u8>)]) -> Vec<(std::path::PathBuf, String)> {
    local
        .iter()
        .map(|(p, r, _)| (p.clone(), r.clone()))
        .collect()
}

#[test]
fn an_upload_is_one_session_and_each_file_is_named_only_when_whole() {
    let host = Host::new("upload-ok");
    let local = local_files("ok");
    let mut progress = vec![];
    let up = ssh::upload(&host.name, "/srv/shots", &files(&local), |n| {
        progress.push(n)
    });
    assert!(up.error.is_none());
    assert_eq!(up.landed, 3);
    assert_eq!(progress, [1, 2, 3], "one step per file, as the HUD counts");

    // Exactly the final names, with the right bytes, and nothing half-done.
    let remote = host.remote();
    assert_eq!(
        remote.keys().cloned().collect::<Vec<_>>(),
        [
            "hostbeam-42-0.png",
            "hostbeam-42-1.png",
            "hostbeam-42-2.png"
        ]
    );
    for (_, name, bytes) in &local {
        assert_eq!(&remote[name], bytes, "{name}");
    }

    let calls = host.calls();
    assert_eq!(
        calls.len(),
        6,
        "put and rename per file, one session: {calls:?}"
    );
    for (i, pair) in calls.chunks(2).enumerate() {
        assert!(
            pair[0].contains("put ") && pair[0].contains("/.hostbeam-"),
            "{}",
            pair[0]
        );
        assert!(
            pair[0].ends_with(".part\""),
            "written under the hidden name: {}",
            pair[0]
        );
        assert!(
            pair[1].contains(&format!("/srv/shots/hostbeam-42-{i}.png")),
            "{}",
            pair[1]
        );
    }
    // The local names never reach the batch line: sftp's parser, and `put`'s
    // pattern matching, only ever see the staged ones.
    assert!(
        calls
            .iter()
            .all(|c| !c.contains("Screenshot 2026") && !c.contains("[1]")),
        "{calls:?}"
    );
}

#[test]
fn an_upload_that_stops_reports_exactly_the_files_before_it() {
    // Command 3 is the second file's put: one file landed, whole.
    let host = Host::new("upload-put-fails").fails_at_command(3);
    let local = local_files("put-fails");
    let mut progress = vec![];
    let up = ssh::upload(&host.name, "/srv/shots", &files(&local), |n| {
        progress.push(n)
    });
    assert_eq!(up.landed, 1);
    assert_eq!(progress, [1]);
    assert_eq!(
        up.error.as_ref().and_then(ssh_kind),
        Some(BeamErrorKind::Folder)
    );
    assert_eq!(
        host.remote().keys().cloned().collect::<Vec<_>>(),
        ["hostbeam-42-0.png"]
    );
}

#[test]
fn a_rename_that_fails_leaves_only_a_hidden_part_behind() {
    // Command 4 is the second file's rename: its bytes arrived, but never
    // under a name the agent tools read. Clean up removes the .part.
    let host = Host::new("upload-rename-fails").fails_at_command(4);
    let local = local_files("rename-fails");
    let up = ssh::upload(&host.name, "/srv/shots", &files(&local), |_| {});
    assert_eq!(up.landed, 1);
    let names: Vec<String> = host.remote().keys().cloned().collect();
    assert_eq!(names.len(), 2);
    assert!(names.contains(&"hostbeam-42-0.png".to_string()));
    assert!(
        names
            .iter()
            .any(|n| n.starts_with(".hostbeam-") && n.ends_with(".part")),
        "{names:?}"
    );
}

#[test]
fn an_upload_that_never_connects_lands_nothing_and_says_why() {
    let host = Host::new("upload-down").fails(
        255,
        "ssh: connect to host 10.0.0.9 port 22: Connection refused\r\nConnection closed\r\n",
    );
    let local = local_files("down");
    let mut progress = vec![];
    let up = ssh::upload(&host.name, "/srv/shots", &files(&local), |n| {
        progress.push(n)
    });
    assert_eq!(up.landed, 0);
    assert!(progress.is_empty());
    assert_eq!(
        up.error.as_ref().and_then(ssh_kind),
        Some(BeamErrorKind::Unreachable)
    );
}
