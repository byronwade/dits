//! Regression test: `dits restore` must bring a text (git-stored) file back to its
//! committed content, not blank it. Same root cause as the stash bug: reconstructing
//! from Dits chunks only blanks GitText files (whose content lives in the git engine).

use assert_cmd::Command;
use std::fs;
use tempfile::TempDir;

fn dits(dir: &std::path::Path) -> Command {
    let mut c = Command::cargo_bin("dits").unwrap();
    c.current_dir(dir);
    c
}

#[test]
fn restore_brings_back_committed_text() {
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path();

    dits(dir).arg("init").assert().success();
    fs::write(dir.join("code.txt"), b"line one\nline two\nline three\n").unwrap();
    dits(dir).args(["add", "code.txt"]).assert().success();
    dits(dir).args(["commit", "-m", "first"]).assert().success();

    // Clobber the working file, then restore it.
    fs::write(dir.join("code.txt"), b"CHANGED\n").unwrap();
    dits(dir).args(["restore", "code.txt"]).assert().success();

    let after = fs::read(dir.join("code.txt")).unwrap();
    assert_eq!(
        after, b"line one\nline two\nline three\n",
        "restore must recover committed content, got {:?}",
        String::from_utf8_lossy(&after)
    );
}
