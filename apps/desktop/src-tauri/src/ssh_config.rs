//! SSH config discovery and beam-error classification, ported from the Flutter
//! app (`ssh_config_parser.dart`, `file_ssh_config_host_source.dart`,
//! `beam_error.dart`). Parses `~/.ssh/config`, resolves `Include` directives
//! (incl. globs), and classifies `ssh`/`scp` failures.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SshHost {
    pub alias: String,
    pub source: String,
    pub host_name: Option<String>,
    pub user: Option<String>,
}

impl SshHost {
    /// `user@hostName`, just the host name, or `None` when neither is declared.
    pub fn address(&self) -> Option<String> {
        let host = self.host_name.as_ref()?;
        Some(match &self.user {
            Some(user) => format!("{user}@{host}"),
            None => host.clone(),
        })
    }
}

/// Splits one config line into tokens: honours `"`/`'` quoting and stops at an
/// unquoted `#` comment.
fn tokenize(line: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut quote: Option<char> = None;

    for ch in line.chars() {
        if quote.is_none() && ch == '#' {
            break;
        }
        if (ch == '"' || ch == '\'') && quote.is_none() {
            quote = Some(ch);
            continue;
        }
        if Some(ch) == quote {
            quote = None;
            continue;
        }
        if quote.is_none() && ch.is_whitespace() {
            if !current.is_empty() {
                tokens.push(std::mem::take(&mut current));
            }
            continue;
        }
        current.push(ch);
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}

/// A `Host` token is selectable only if it is a concrete alias (no patterns,
/// negations, `proxy:jump` syntax, or whitespace).
fn is_selectable_alias(pattern: &str) -> bool {
    !pattern.is_empty()
        && !pattern.starts_with('!')
        && !pattern.contains(':')
        && !pattern.contains('*')
        && !pattern.contains('?')
        && !pattern.chars().any(char::is_whitespace)
}

/// Parses a single config file's contents into hosts (no `Include` resolution).
pub fn parse_config(config: &str, source: &str) -> Vec<SshHost> {
    let mut hosts: Vec<SshHost> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    let mut block_aliases: Vec<String> = Vec::new();
    let mut block_host: Option<String> = None;
    let mut block_user: Option<String> = None;

    for raw_line in config.split('\n') {
        let tokens = tokenize(raw_line);
        if tokens.is_empty() {
            continue;
        }
        let keyword = tokens[0].to_lowercase();
        if keyword == "host" {
            // Materialise the previous block, then open a new one.
            for alias in block_aliases.drain(..) {
                hosts.push(SshHost {
                    alias,
                    source: source.to_string(),
                    host_name: block_host.clone(),
                    user: block_user.clone(),
                });
            }
            block_host = None;
            block_user = None;
            for pattern in tokens.iter().skip(1) {
                if is_selectable_alias(pattern) && seen.insert(pattern.clone()) {
                    block_aliases.push(pattern.clone());
                }
            }
        } else if keyword == "hostname" && tokens.len() >= 2 {
            block_host = Some(tokens[1].clone());
        } else if keyword == "user" && tokens.len() >= 2 {
            block_user = Some(tokens[1].clone());
        }
    }
    for alias in block_aliases.drain(..) {
        hosts.push(SshHost {
            alias,
            source: source.to_string(),
            host_name: block_host.clone(),
            user: block_user.clone(),
        });
    }

    hosts.sort_by(|a, b| a.alias.cmp(&b.alias));
    hosts
}

/// Reads hosts from a config file and every file it `Include`s, deduped by
/// alias (first wins) and sorted. `home` expands a leading `~`.
pub fn discover_hosts(config_path: &Path, home: Option<&str>) -> Vec<SshHost> {
    let mut visited: HashSet<PathBuf> = HashSet::new();
    let hosts = read_hosts(config_path, home, &mut visited);

    let mut seen: HashSet<String> = HashSet::new();
    let mut deduped: Vec<SshHost> = hosts
        .into_iter()
        .filter(|h| seen.insert(h.alias.clone()))
        .collect();
    deduped.sort_by(|a, b| a.alias.cmp(&b.alias));
    deduped
}

fn read_hosts(path: &Path, home: Option<&str>, visited: &mut HashSet<PathBuf>) -> Vec<SshHost> {
    let key = std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    if !visited.insert(key) || !path.exists() {
        return Vec::new();
    }
    let contents = match std::fs::read_to_string(path) {
        Ok(text) => text,
        Err(_) => return Vec::new(),
    };

    let mut hosts = parse_config(&contents, &path.display().to_string());
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    for pattern in include_patterns(&contents) {
        for include in resolve_include(&pattern, parent, home) {
            hosts.extend(read_hosts(&include, home, visited));
        }
    }
    hosts
}

fn include_patterns(contents: &str) -> Vec<String> {
    let mut patterns = Vec::new();
    for raw_line in contents.split('\n') {
        let line = raw_line.split('#').next().unwrap_or("").trim();
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 || parts[0].to_lowercase() != "include" {
            continue;
        }
        patterns.extend(parts[1..].iter().map(|p| p.to_string()));
    }
    patterns
}

fn resolve_include(pattern: &str, relative_to: &Path, home: Option<&str>) -> Vec<PathBuf> {
    let expanded = expand_home(pattern, home);
    let absolute: PathBuf = if expanded.starts_with('/') {
        PathBuf::from(&expanded)
    } else {
        relative_to.join(&expanded)
    };

    if !contains_glob(&expanded) {
        return vec![absolute];
    }

    let dir = absolute.parent().unwrap_or_else(|| Path::new("."));
    let file_pattern = absolute
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    if !dir.exists() {
        return Vec::new();
    }

    let mut matches: Vec<PathBuf> = match std::fs::read_dir(dir) {
        Ok(entries) => entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.is_file())
            .filter(|p| {
                p.file_name()
                    .map(|n| glob_match(&file_pattern, &n.to_string_lossy()))
                    .unwrap_or(false)
            })
            .collect(),
        Err(_) => Vec::new(),
    };
    matches.sort();
    matches
}

fn contains_glob(pattern: &str) -> bool {
    pattern.contains('*') || pattern.contains('?')
}

/// Classic wildcard match (`*` any run, `?` one char), anchored.
fn glob_match(pattern: &str, name: &str) -> bool {
    fn helper(p: &[char], n: &[char]) -> bool {
        match p.first() {
            None => n.is_empty(),
            Some('*') => helper(&p[1..], n) || (!n.is_empty() && helper(p, &n[1..])),
            Some('?') => !n.is_empty() && helper(&p[1..], &n[1..]),
            Some(&c) => !n.is_empty() && n[0] == c && helper(&p[1..], &n[1..]),
        }
    }
    let p: Vec<char> = pattern.chars().collect();
    let n: Vec<char> = name.chars().collect();
    helper(&p, &n)
}

fn expand_home(pattern: &str, home: Option<&str>) -> String {
    match home {
        Some(h) if !h.is_empty() => {
            if pattern == "~" {
                h.to_string()
            } else if let Some(rest) = pattern.strip_prefix("~/") {
                format!("{h}/{rest}")
            } else {
                pattern.to_string()
            }
        }
        _ => pattern.to_string(),
    }
}

/// Coarse reason a beam failed, from `ssh`/`scp` output. Order matters:
/// reachability before auth before the folder/write bucket.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BeamErrorKind {
    Unreachable,
    Auth,
    Folder,
    Unknown,
}

pub fn classify_beam_error(raw: &str) -> BeamErrorKind {
    let s = raw.to_lowercase();
    const UNREACHABLE: [&str; 8] = [
        "timed out",
        "timeout",
        "could not resolve",
        "name or service not known",
        "connection refused",
        "no route to host",
        "connection closed",
        "connect to host",
    ];
    const AUTH: [&str; 3] = ["publickey", "authentication", "permission denied ("];
    const FOLDER: [&str; 5] = [
        "mkdir",
        "not writable",
        "read-only",
        "no such file",
        "permission denied",
    ];

    // A refused key first: scp and sftp both follow `Permission denied
    // (publickey).` with `Connection closed`, which on its own reads as an
    // unreachable host — and would send someone to check their network about a
    // host that answered.
    if AUTH.iter().any(|p| s.contains(p)) {
        return BeamErrorKind::Auth;
    }
    if UNREACHABLE.iter().any(|p| s.contains(p)) {
        return BeamErrorKind::Unreachable;
    }
    if FOLDER.iter().any(|p| s.contains(p)) {
        return BeamErrorKind::Folder;
    }
    BeamErrorKind::Unknown
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_explicit_aliases_and_address() {
        let config = "\
Host prod-box
  HostName 10.4.0.12
  User dev
Host bare
  HostName example.com
Host aliasonly
";
        let hosts = parse_config(config, "fixture");
        let aliases: Vec<&str> = hosts.iter().map(|h| h.alias.as_str()).collect();
        assert_eq!(aliases, ["aliasonly", "bare", "prod-box"]);

        let by = |a: &str| hosts.iter().find(|h| h.alias == a).unwrap();
        assert_eq!(by("prod-box").address().as_deref(), Some("dev@10.4.0.12"));
        assert_eq!(by("bare").address().as_deref(), Some("example.com"));
        assert_eq!(by("aliasonly").address(), None);
    }

    #[test]
    fn ignores_patterns_and_duplicate_aliases() {
        let config = "\
Host *.internal !blocked jump-?
  User developer

Host quoted-host \"quoted alias\" duplicate duplicate
  HostName example.invalid

host lowercase
  HostName lowercase.invalid
";
        let hosts = parse_config(config, "fixture");
        let aliases: Vec<&str> = hosts.iter().map(|h| h.alias.as_str()).collect();
        assert_eq!(aliases, ["duplicate", "lowercase", "quoted-host"]);
    }

    #[test]
    fn glob_matches_conf_files() {
        assert!(glob_match("*.conf", "extra.conf"));
        assert!(!glob_match("*.conf", "extra.txt"));
        assert!(glob_match("jump-?", "jump-1"));
        assert!(!glob_match("jump-?", "jump-12"));
    }

    #[test]
    fn classifies_beam_errors() {
        assert_eq!(
            classify_beam_error("ssh: connect to host x port 22: Operation timed out"),
            BeamErrorKind::Unreachable
        );
        assert_eq!(
            classify_beam_error("Permission denied (publickey)."),
            BeamErrorKind::Auth
        );
        assert_eq!(
            classify_beam_error("scp: mkdir /tmp/x: Permission denied"),
            BeamErrorKind::Folder
        );
        assert_eq!(
            classify_beam_error("weird unexpected"),
            BeamErrorKind::Unknown
        );
    }

    #[test]
    fn a_refused_key_is_auth_even_when_the_connection_closes_after() {
        // Exactly what sftp and scp print (captured from the test host,
        // 2026-09-25): the refusal, then the connection closing.
        for raw in [
            "dev@172.30.1.79: Permission denied (publickey).\r\nConnection closed\r\n",
            "dev@172.30.1.79: Permission denied (publickey).\r\nscp: Connection closed\r\n",
        ] {
            assert_eq!(classify_beam_error(raw), BeamErrorKind::Auth, "{raw}");
        }
        assert_eq!(
            classify_beam_error(
                "ssh: connect to host 172.30.1.79 port 2299: Connection refused\r\nConnection closed\r\n"
            ),
            BeamErrorKind::Unreachable
        );
        assert_eq!(
            classify_beam_error("dest open \"/root/x.part\": Permission denied\r\n"),
            BeamErrorKind::Folder
        );
    }
}
