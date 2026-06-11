//! Regression test: `dits checkout HEAD` must resolve the symbolic HEAD ref and
//! restore tracked files. Previously it fell through to "pathspec did not
//! match".

use std::fs;

use assert_cmd::Command;
use tempfile::TempDir;

fn dits(dir: &std::path::Path) -> Command {
    let mut c = Command::cargo_bin("dits").unwrap();
    c.current_dir(dir);
    c
}

#[test]
fn checkout_head_restores_deleted_file() {
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path();

    dits(dir).arg("init").assert().success();
    fs::write(dir.join("a.txt"), b"hello dits").unwrap();
    dits(dir).args(["add", "a.txt"]).assert().success();
    dits(dir).args(["commit", "-m", "first"]).assert().success();

    // Delete the working-tree file, then restore it via the symbolic HEAD ref.
    fs::remove_file(dir.join("a.txt")).unwrap();
    assert!(!dir.join("a.txt").exists());

    dits(dir).args(["checkout", "HEAD"]).assert().success();

    assert!(dir.join("a.txt").exists(), "checkout HEAD must restore tracked files");
    assert_eq!(fs::read(dir.join("a.txt")).unwrap(), b"hello dits");
}
