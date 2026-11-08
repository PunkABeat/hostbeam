//! Integration tests for Include-aware host discovery (ports the Flutter
//! `file_ssh_config_host_source_test.dart`).

use std::path::{Path, PathBuf};

use hostbeam_lib::ssh_config::discover_hosts;

fn fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(name)
}

fn aliases(name: &str) -> Vec<String> {
    discover_hosts(&fixture(name), None)
        .into_iter()
        .map(|h| h.alias)
        .collect()
}

#[test]
fn missing_config_is_empty() {
    assert!(discover_hosts(&fixture("missing_config"), None).is_empty());
}

#[test]
fn reads_hosts_from_config_file() {
    assert_eq!(aliases("ssh_config_basic"), ["devbox", "prod", "staging"]);
}

#[test]
fn reads_hosts_from_included_files() {
    assert_eq!(
        aliases("ssh_config_with_include"),
        ["included-host", "root-host"]
    );
}
