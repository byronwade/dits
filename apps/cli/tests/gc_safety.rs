//! Regression test: `dits gc` must NEVER delete referenced objects. The
//! reachability walk previously only marked commit hashes (not
//! manifests/chunks/blobs), so gc silently deleted live data and fsck still
//! reported "healthy".

use std::{fs, path::Path};

use assert_cmd::Command;
use tempfile::TempDir;

fn dits(dir: &Path) -> Command {
    let mut c = Command::cargo_bin("dits").unwrap();
    c.current_dir(dir);
    c
}

#[test]
fn gc_preserves_referenced_text_and_binary() {
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path();
    dits(dir).arg("init").assert().success();

    // A deterministic binary blob that spans multiple chunks.
    let blob: Vec<u8> = (0..2_000_000u32)
        .map(|i| (i.wrapping_mul(2654435761) >> 13) as u8)
        .collect();

    // Commit 1.
    fs::write(dir.join("a.txt"), b"version one\n").unwrap();
    fs::write(dir.join("keep.bin"), &blob).unwrap();
    dits(dir).args(["add", "."]).assert().success();
    dits(dir).args(["commit", "-m", "c1"]).assert().success();

    // Commit 2 changes a.txt, orphaning version one's object — gc has real work to
    // do.
    fs::write(dir.join("a.txt"), b"version two\n").unwrap();
    dits(dir).args(["add", "a.txt"]).assert().success();
    dits(dir).args(["commit", "-m", "c2"]).assert().success();

    // Garbage collect.
    dits(dir).arg("gc").assert().success();

    // The current committed content must survive gc byte-for-byte.
    fs::remove_file(dir.join("a.txt")).unwrap();
    fs::remove_file(dir.join("keep.bin")).unwrap();
    dits(dir).args(["checkout", "HEAD"]).assert().success();

    assert_eq!(
        fs::read(dir.join("a.txt")).unwrap(),
        b"version two\n",
        "gc must not destroy the current text file"
    );
    assert_eq!(
        fs::read(dir.join("keep.bin")).unwrap(),
        blob,
        "gc must not destroy referenced binary chunks"
    );
}
