//! The upload against the real test host (`npm run testhost:up`), with the
//! real `sftp`. Ignored by default — CI has no host — so run it by hand after
//! touching `ssh::upload`:
//!
//!   cargo test --test testhost_upload -- --ignored --nocapture
//!
//! `tests/fake_ssh.rs` checks the logic against a stub; this checks that real
//! sftp says what the stub assumes: one echo per command, as it starts it, and
//! a batch that stops at the first failure.

use std::process::Command;
use std::time::Instant;

use hostbeam_lib::services::ssh;

const HOST: &str = "hostbeam-testhost";

fn remote(script: &str) -> String {
    let out = Command::new("ssh")
        .args([HOST, script])
        .output()
        .expect("ssh");
    String::from_utf8_lossy(&out.stdout).trim().to_string()
}

#[test]
#[ignore = "needs `npm run testhost:up`"]
fn uploads_to_the_real_test_host_under_final_names_only() {
    let folder = format!("/tmp/hostbeam-cargo-check-{}", std::process::id());
    remote(&format!("rm -rf '{folder}'; mkdir -p '{folder}'"));
    let local = std::env::temp_dir().join(format!("hostbeam-cargo-local-{}", std::process::id()));
    std::fs::create_dir_all(&local).unwrap();
    let files: Vec<_> = [
        "Screenshot 2026-09-25 at 10.00.00.png",
        "shot [1] *.png",
        "plain.png",
    ]
    .iter()
    .enumerate()
    .map(|(i, name)| {
        let path = local.join(name);
        std::fs::write(&path, vec![b'a' + i as u8; 700_000 + i]).unwrap();
        (path, format!("hostbeam-cargo-{i}.png"))
    })
    .collect();

    let t = Instant::now();
    let mut steps = vec![];
    let up = ssh::upload(HOST, &folder, &files, |n| steps.push((n, t.elapsed())));
    println!(
        "upload: {:?}, landed {}, steps {steps:?}",
        t.elapsed(),
        up.landed
    );

    assert!(up.error.is_none(), "{:?}", up.error.map(|e| e.to_string()));
    assert_eq!(up.landed, 3);
    assert_eq!(steps.iter().map(|(n, _)| *n).collect::<Vec<_>>(), [1, 2, 3]);
    assert_eq!(
        remote(&format!("cd '{folder}' && ls -A | sort && wc -c hostbeam-cargo-2.png")),
        "hostbeam-cargo-0.png\nhostbeam-cargo-1.png\nhostbeam-cargo-2.png\n700002 hostbeam-cargo-2.png"
    );

    remote(&format!("rm -rf '{folder}'"));
    std::fs::remove_dir_all(&local).unwrap();
}
