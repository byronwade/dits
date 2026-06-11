//! Permanent CLI data-integrity guards.
//!
//! These run the real `dits` binary on real files and assert the properties
//! that matter most for a VCS: that committing and restoring content — text,
//! binary, encrypted — is byte-exact, and that the porcelain
//! (diff/blame/archive/stash) handles BOTH storage strategies (GitText +
//! chunks). This whole class of bugs existed because real files were never run
//! through the real binary.

use std::{fs, path::Path};

use assert_cmd::Command;
use tempfile::TempDir;

fn dits(dir: &Path) -> Command {
    let mut c = Command::cargo_bin("dits").unwrap();
    c.current_dir(dir);
    c
}

fn init_repo() -> TempDir {
    let tmp = TempDir::new().unwrap();
    dits(tmp.path()).arg("init").assert().success();
    tmp
}

const TEXT: &[u8] = b"line one\nline two\nline three\n";
fn binary_blob() -> Vec<u8> {
    // Deterministic ~3 MB blob that spans many chunks (no rng -> reproducible).
    (0..3_000_000u32)
        .map(|i| (i.wrapping_mul(2654435761) >> 13) as u8)
        .collect()
}

#[test]
fn commit_and_checkout_are_byte_identical_for_text_and_binary() {
    let tmp = init_repo();
    let dir = tmp.path();
    let blob = binary_blob();
    fs::write(dir.join("doc.txt"), TEXT).unwrap();
    fs::write(dir.join("data.bin"), &blob).unwrap();

    dits(dir).args(["add", "."]).assert().success();
    dits(dir).args(["commit", "-m", "c"]).assert().success();

    fs::remove_file(dir.join("doc.txt")).unwrap();
    fs::remove_file(dir.join("data.bin")).unwrap();
    dits(dir).args(["checkout", "HEAD"]).assert().success();

    assert_eq!(fs::read(dir.join("doc.txt")).unwrap(), TEXT, "text round-trip");
    assert_eq!(fs::read(dir.join("data.bin")).unwrap(), blob, "binary round-trip");
}

#[test]
fn diff_shows_only_the_changed_lines() {
    let tmp = init_repo();
    let dir = tmp.path();
    fs::write(dir.join("f.txt"), b"a\nb\nc\n").unwrap();
    dits(dir).args(["add", "f.txt"]).assert().success();
    dits(dir).args(["commit", "-m", "c"]).assert().success();

    fs::write(dir.join("f.txt"), b"a\nb\nc\nd\n").unwrap();
    let out = dits(dir).arg("diff").assert().success();
    let text = String::from_utf8_lossy(&out.get_output().stdout);

    // The added line shows as `+d`; unchanged lines must NOT all show as added.
    assert!(text.contains("+d"), "diff should show the added line:\n{text}");
    assert!(!text.contains("+a"), "diff must not mark unchanged lines as added:\n{text}");
}

#[test]
fn blame_attributes_text_lines() {
    let tmp = init_repo();
    let dir = tmp.path();
    fs::write(dir.join("code.txt"), b"alpha\nbeta\n").unwrap();
    dits(dir).args(["add", "code.txt"]).assert().success();
    dits(dir).args(["commit", "-m", "c"]).assert().success();

    let out = dits(dir).args(["blame", "code.txt"]).assert().success();
    let text = String::from_utf8_lossy(&out.get_output().stdout);
    assert!(text.contains("alpha") && text.contains("beta"), "blame should show content:\n{text}");
}

#[test]
fn archive_default_head_contains_correct_content() {
    let tmp = init_repo();
    let dir = tmp.path();
    fs::write(dir.join("t.txt"), b"alpha\nbeta\n").unwrap();
    fs::write(dir.join("b.bin"), b"BINARYDATA123").unwrap();
    dits(dir).args(["add", "."]).assert().success();
    dits(dir).args(["commit", "-m", "c"]).assert().success();

    // tree-ish defaults to HEAD — this used to fail with "Cannot resolve HEAD".
    dits(dir)
        .args(["archive", "--format", "tar", "--output", "out.tar"])
        .assert()
        .success();

    let tar = fs::read(dir.join("out.tar")).unwrap();
    // Crude but dependency-free: the raw tar must contain both files' bytes.
    let needle = b"alpha\nbeta\n";
    assert!(
        tar.windows(needle.len()).any(|w| w == needle),
        "archive must contain the text file's real content"
    );
    assert!(
        tar.windows(b"BINARYDATA123".len())
            .any(|w| w == b"BINARYDATA123"),
        "archive must contain the binary file's content"
    );
}

#[test]
fn stash_resets_then_pop_restores() {
    let tmp = init_repo();
    let dir = tmp.path();
    fs::write(dir.join("f.txt"), b"committed\n").unwrap();
    dits(dir).args(["add", "f.txt"]).assert().success();
    dits(dir).args(["commit", "-m", "c"]).assert().success();

    fs::write(dir.join("f.txt"), b"committed\nwip\n").unwrap();
    dits(dir).arg("stash").assert().success();
    assert_eq!(fs::read(dir.join("f.txt")).unwrap(), b"committed\n", "stash resets to committed");

    dits(dir).args(["stash", "pop"]).assert().success();
    assert_eq!(fs::read(dir.join("f.txt")).unwrap(), b"committed\nwip\n", "pop restores WIP");
}

#[test]
fn encrypted_roundtrip_is_byte_exact_and_leaks_no_plaintext() {
    let tmp = init_repo();
    let dir = tmp.path();
    dits(dir)
        .args(["encrypt-init", "-p", "testpass123"])
        .assert()
        .success();

    let secret = b"top secret payroll figures\nrow2,row3\n";
    fs::write(dir.join("secret.txt"), secret).unwrap();
    dits(dir).args(["add", "secret.txt"]).assert().success();
    dits(dir).args(["commit", "-m", "c"]).assert().success();

    fs::remove_file(dir.join("secret.txt")).unwrap();
    dits(dir).args(["checkout", "HEAD"]).assert().success();
    assert_eq!(
        fs::read(dir.join("secret.txt")).unwrap(),
        secret,
        "encrypted round-trip byte-exact"
    );

    // The plaintext must not appear anywhere under .dits/ (objects are encrypted).
    let mut leaked = false;
    for entry in walk(&dir.join(".dits")) {
        if let Ok(bytes) = fs::read(&entry) {
            if bytes.windows(b"payroll".len()).any(|w| w == b"payroll") {
                leaked = true;
                break;
            }
        }
    }
    assert!(!leaked, "plaintext leaked into .dits/ objects");
}

fn walk(dir: &Path) -> Vec<std::path::PathBuf> {
    let mut out = Vec::new();
    if let Ok(rd) = fs::read_dir(dir) {
        for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() {
                out.extend(walk(&p));
            } else {
                out.push(p);
            }
        }
    }
    out
}
