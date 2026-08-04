//! Regression tests for manifest-to-content integrity checks.

use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

use assert_cmd::Command;
use tempfile::TempDir;

fn dits(dir: &Path) -> Command {
    let mut command = Command::cargo_bin("dits").unwrap();
    command.current_dir(dir);
    command
}

#[test]
fn fsck_fails_when_a_committed_binary_chunk_is_missing() {
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path();
    dits(dir).arg("init").assert().success();

    let content: Vec<u8> = (0..256_000u32)
        .map(|value| (value.wrapping_mul(2_654_435_761) >> 11) as u8)
        .collect();
    fs::write(dir.join("asset.bin"), content).unwrap();
    dits(dir).args(["add", "asset.bin"]).assert().success();
    dits(dir)
        .args(["commit", "-m", "binary asset"])
        .assert()
        .success();

    let chunk_path = first_file_below(&dir.join(".dits/objects/chunks"));
    fs::remove_file(&chunk_path).unwrap();
    let before = snapshot_tree(&dir.join(".dits"));

    let assertion = dits(dir).arg("fsck").assert().failure();
    let stdout = String::from_utf8_lossy(&assertion.get_output().stdout);
    assert!(
        stdout.contains("references unavailable chunk"),
        "fsck did not report the missing referenced chunk:\n{stdout}"
    );

    assert_eq!(snapshot_tree(&dir.join(".dits")), before);
    assert!(!chunk_path.exists(), "fsck must not recreate missing content");
}

#[test]
fn fsck_fails_when_a_committed_binary_chunk_is_corrupted() {
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path();
    dits(dir).arg("init").assert().success();

    let content: Vec<u8> = (0..256_000u32)
        .map(|value| (value.wrapping_mul(2_654_435_761) >> 11) as u8)
        .collect();
    fs::write(dir.join("asset.bin"), content).unwrap();
    dits(dir).args(["add", "asset.bin"]).assert().success();
    dits(dir)
        .args(["commit", "-m", "binary asset"])
        .assert()
        .success();

    let chunk_path = first_file_below(&dir.join(".dits/objects/chunks"));
    let mut bytes = fs::read(&chunk_path).unwrap();
    assert!(!bytes.is_empty(), "stored chunk must contain bytes to corrupt");
    bytes[0] ^= 0xFF;
    fs::write(&chunk_path, &bytes).unwrap();
    let before = snapshot_tree(&dir.join(".dits"));

    let assertion = dits(dir).arg("fsck").assert().failure();
    let stdout = String::from_utf8_lossy(&assertion.get_output().stdout);
    assert!(
        stdout.contains("hash mismatch") || stdout.contains("references unavailable chunk"),
        "fsck did not report the corrupted chunk:\n{stdout}"
    );

    assert_eq!(
        snapshot_tree(&dir.join(".dits")),
        before,
        "fsck must leave corrupted bytes untouched"
    );
}

fn first_file_below(root: &Path) -> PathBuf {
    for directory in fs::read_dir(root).unwrap() {
        let directory = directory.unwrap().path();
        if !directory.is_dir() {
            continue;
        }
        for entry in fs::read_dir(directory).unwrap() {
            let path = entry.unwrap().path();
            if path.is_file() {
                return path;
            }
        }
    }
    panic!("expected at least one stored binary chunk below {}", root.display());
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
