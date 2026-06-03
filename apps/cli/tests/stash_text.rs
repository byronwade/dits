//! Regression test: `dits stash` must reset a text (git-stored) file to its committed
//! content, not blank it. Previously stash reconstructed only from Dits chunks, so
//! GitText files (which keep content in the git engine, not chunks) became empty.

use assert_cmd::Command;
use std::fs;
use tempfile::TempDir;

fn dits(dir: &std::path::Path) -> Command {
    let mut c = Command::cargo_bin("dits").unwrap();
    c.current_dir(dir);
    c
}

#[test]
fn stash_resets_text_file_to_committed_content() {
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path();

    dits(dir).arg("init").assert().success();
    fs::write(dir.join("f.txt"), b"one\n").unwrap();
    dits(dir).args(["add", "f.txt"]).assert().success();
    dits(dir).args(["commit", "-m", "first"]).assert().success();

    // Make a working-tree change, then stash.
    fs::write(dir.join("f.txt"), b"one\ntwo\n").unwrap();
    dits(dir).arg("stash").assert().success();

    // After stash, the working file must hold the committed content — not be empty.
    let after = fs::read(dir.join("f.txt")).unwrap();
    assert_eq!(
        after, b"one\n",
        "stash should restore committed content, got {:?}",
        String::from_utf8_lossy(&after)
    );
}
