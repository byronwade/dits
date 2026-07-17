//! P2P scaffolding must never report success or create local state.

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
fn p2p_operations_fail_before_creating_or_changing_state() {
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path();
    dits(dir).arg("init").assert().success();
    let before = snapshot_tree(&dir.join(".dits"));
    let mount_path = dir.join("would-be-mount");
    let mount_arg = mount_path.to_string_lossy().into_owned();

    for args in [
        vec!["p2p", "share", "."],
        vec!["p2p", "connect", "ABC-123", mount_arg.as_str()],
        vec!["p2p", "status"],
        vec!["p2p", "list"],
        vec!["p2p", "cache", "stats"],
        vec!["p2p", "cache", "clear"],
        vec!["p2p", "cache", "path"],
        vec!["p2p", "cache", "gc"],
        vec!["p2p", "ping", "ABC-123"],
        vec!["p2p", "unmount", "--all"],
    ] {
        let output = dits(dir).args(&args).output().unwrap();
        assert!(!output.status.success(), "P2P command succeeded: {args:?}");
        assert!(
            String::from_utf8_lossy(&output.stderr).contains("P2P sharing is design scaffolding"),
            "missing fail-closed diagnostic for {args:?}: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert_eq!(snapshot_tree(&dir.join(".dits")), before, "mutation after {args:?}");
        assert!(!mount_path.exists(), "connect created a target directory");
    }
}
