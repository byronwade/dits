//! Invalid remote configuration must be preserved for explicit recovery.

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
fn malformed_remotes_file_blocks_reads_and_writes_without_replacement() {
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path();
    dits(dir).arg("init").assert().success();

    let remotes_path = dir.join(".dits/remotes");
    fs::write(&remotes_path, b"{not valid remote JSON").unwrap();
    let before = snapshot_tree(&dir.join(".dits"));

    for args in [
        &["remote"][..],
        &["remote", "add", "origin", "/tmp/elsewhere"][..],
        &["push", "origin"][..],
        &["pull", "origin"][..],
        &["fetch", "origin"][..],
        &["sync", "origin"][..],
    ] {
        dits(dir).args(args).assert().failure();
        assert_eq!(snapshot_tree(&dir.join(".dits")), before, "mutation after {args:?}");
    }

    assert_eq!(fs::read(remotes_path).unwrap(), b"{not valid remote JSON");
}
