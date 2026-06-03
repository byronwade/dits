//! Regression test: `dits add` must not SILENTLY drop symlinks. Symlink versioning
//! isn't supported yet, but skipping must be reported so links aren't lost unnoticed.

#![cfg(unix)]

use assert_cmd::Command;
use std::fs;
use std::os::unix::fs::symlink;
use tempfile::TempDir;

#[test]
fn add_warns_when_skipping_symlinks() {
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path();

    Command::cargo_bin("dits").unwrap().current_dir(dir).arg("init").assert().success();
    fs::write(dir.join("real.txt"), b"content").unwrap();
    symlink("real.txt", dir.join("link.txt")).unwrap();

    let out = Command::cargo_bin("dits")
        .unwrap()
        .current_dir(dir)
        .args(["add", "."])
        .assert()
        .success();

    let stdout = String::from_utf8_lossy(&out.get_output().stdout);
    assert!(
        stdout.to_lowercase().contains("symbolic link") || stdout.to_lowercase().contains("symlink"),
        "add should warn about the skipped symlink, got:\n{stdout}"
    );
}
