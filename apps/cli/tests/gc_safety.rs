//! Regression test: the read-only GC audit must NEVER delete referenced
//! objects. The reachability walk previously only marked commit hashes (not
//! manifests/chunks/blobs), so gc silently deleted live data and fsck still
//! reported "healthy".

use std::{collections::BTreeMap, fs, path::Path};

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

    // Destructive GC fails closed; the explicit audit is read-only, including
    // for objects that are currently unreachable.
    fs::write(dir.join("orphan.bin"), b"stored but never committed").unwrap();
    dits(dir).args(["add", "orphan.bin"]).assert().success();
    fs::remove_file(dir.join("orphan.bin")).unwrap();
    dits(dir).args(["add", "orphan.bin"]).assert().success();
    fs::write(dir.join("staged.bin"), b"owned only by the index").unwrap();
    dits(dir).args(["add", "staged.bin"]).assert().success();
    let before = snapshot_tree(&dir.join(".dits/objects"));

    dits(dir).arg("gc").assert().failure();
    dits(dir).args(["gc", "--dry-run"]).assert().success();
    assert_eq!(snapshot_tree(&dir.join(".dits/objects")), before);

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

#[test]
fn gc_dry_run_leaves_a_corrupt_index_untouched() {
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path();
    dits(dir).arg("init").assert().success();

    let index_path = dir.join(".dits/index");
    fs::write(&index_path, b"not a valid index\xff\x00").unwrap();
    let before = snapshot_tree(&dir.join(".dits"));

    dits(dir).args(["gc", "--dry-run"]).assert().failure();

    assert_eq!(snapshot_tree(&dir.join(".dits")), before);
    assert_eq!(fs::read(index_path).unwrap(), b"not a valid index\xff\x00");
    assert!(!dir.join(".dits/index.corrupted").exists());
}

fn snapshot_tree(root: &Path) -> BTreeMap<String, Vec<u8>> {
    fn visit(root: &Path, current: &Path, snapshot: &mut BTreeMap<String, Vec<u8>>) {
        for entry in fs::read_dir(current).unwrap() {
            let path = entry.unwrap().path();
            if path.is_dir() {
                visit(root, &path, snapshot);
            } else {
                let relative = path
                    .strip_prefix(root)
                    .unwrap()
                    .to_string_lossy()
                    .into_owned();
                snapshot.insert(relative, fs::read(path).unwrap());
            }
        }
    }

    let mut snapshot = BTreeMap::new();
    visit(root, root, &mut snapshot);
    snapshot
}
