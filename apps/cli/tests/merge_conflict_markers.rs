//! Regression/feature test: a conflicting `dits merge` must write git-style conflict
//! markers into the working file so the user can resolve them — not just report and bail.

use assert_cmd::Command;
use std::fs;
use std::path::Path;
use tempfile::TempDir;

fn dits(dir: &Path) -> Command {
    let mut c = Command::cargo_bin("dits").unwrap();
    c.current_dir(dir);
    c
}

#[test]
fn conflicting_merge_writes_conflict_markers() {
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path();

    dits(dir).arg("init").assert().success();
    fs::write(dir.join("f.txt"), b"line one\nSHARED\nline three\n").unwrap();
    dits(dir).args(["add", "f.txt"]).assert().success();
    dits(dir).args(["commit", "-m", "base"]).assert().success();

    // Branch b1 changes the shared line one way.
    dits(dir).args(["branch", "b1"]).assert().success();
    dits(dir).args(["switch", "b1"]).assert().success();
    fs::write(dir.join("f.txt"), b"line one\nFROM_B1\nline three\n").unwrap();
    dits(dir).args(["add", "f.txt"]).assert().success();
    dits(dir).args(["commit", "-m", "b1"]).assert().success();

    // main changes the same line a different way.
    dits(dir).args(["switch", "main"]).assert().success();
    fs::write(dir.join("f.txt"), b"line one\nFROM_MAIN\nline three\n").unwrap();
    dits(dir).args(["add", "f.txt"]).assert().success();
    dits(dir).args(["commit", "-m", "main2"]).assert().success();

    // Merge — this is a real conflict on the shared line.
    dits(dir).args(["merge", "b1"]).assert().success();

    let merged = fs::read_to_string(dir.join("f.txt")).unwrap();
    assert!(merged.contains("<<<<<<<"), "missing <<<<<<< marker:\n{merged}");
    assert!(merged.contains("======="), "missing ======= marker:\n{merged}");
    assert!(merged.contains(">>>>>>>"), "missing >>>>>>> marker:\n{merged}");
    // Both sides' content should be present for the user to choose between.
    assert!(merged.contains("FROM_B1") && merged.contains("FROM_MAIN"), "both versions should appear:\n{merged}");
    // Unconflicted lines should survive unmarked.
    assert!(merged.contains("line one") && merged.contains("line three"), "context lines lost:\n{merged}");
}
