//! Remote porcelain must fail without mutating either repository side until a
//! complete object/ref transaction protocol exists.

use std::{collections::BTreeMap, fs, path::Path};

use assert_cmd::Command;
use tempfile::TempDir;

fn dits(dir: &Path) -> Command {
    let mut command = Command::cargo_bin("dits").unwrap();
    command.current_dir(dir);
    command
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

#[test]
fn remote_commands_fail_closed_from_a_repository_subdirectory() {
    let source = TempDir::new().unwrap();
    let local = TempDir::new().unwrap();
    dits(source.path()).arg("init").assert().success();
    dits(local.path()).arg("init").assert().success();

    fs::write(source.path().join("source.bin"), b"source").unwrap();
    dits(source.path())
        .args(["add", "source.bin"])
        .assert()
        .success();
    dits(source.path())
        .args(["commit", "-m", "source"])
        .assert()
        .success();

    fs::write(local.path().join("local.bin"), b"local").unwrap();
    dits(local.path())
        .args(["add", "local.bin"])
        .assert()
        .success();
    dits(local.path())
        .args(["commit", "-m", "local"])
        .assert()
        .success();
    let source_url = source.path().to_string_lossy().into_owned();
    dits(local.path())
        .args(["remote", "add", "origin", &source_url])
        .assert()
        .success();

    let nested = local.path().join("nested/work");
    fs::create_dir_all(&nested).unwrap();
    let local_dits = local.path().join(".dits");
    let source_dits = source.path().join(".dits");

    for args in [
        &["push", "origin"][..],
        &["pull", "origin"][..],
        &["fetch", "origin"][..],
        &["fetch", "--all"][..],
        &["sync", "origin"][..],
    ] {
        let local_before = snapshot_tree(&local_dits);
        let source_before = snapshot_tree(&source_dits);

        dits(&nested).args(args).assert().failure();

        assert_eq!(snapshot_tree(&local_dits), local_before, "local mutation after {args:?}");
        assert_eq!(snapshot_tree(&source_dits), source_before, "remote mutation after {args:?}");
    }
}
