//! Local clone must fail closed around paths, refs, and incomplete checkouts.

use std::{fs, path::Path};

use assert_cmd::Command;
use tempfile::TempDir;

fn dits(dir: &Path) -> Command {
    let mut command = Command::cargo_bin("dits").unwrap();
    command.current_dir(dir);
    command
}

fn init_with_commit(root: &Path, name: &str) -> std::path::PathBuf {
    let repo = root.join(name);
    fs::create_dir(&repo).unwrap();
    dits(&repo).arg("init").assert().success();
    fs::write(repo.join("asset.bin"), b"versioned binary content").unwrap();
    dits(&repo).args(["add", "asset.bin"]).assert().success();
    dits(&repo)
        .args(["commit", "-m", "source snapshot"])
        .assert()
        .success();
    repo
}

#[test]
fn clone_preserves_current_branch_and_validated_local_config() {
    let tmp = TempDir::new().unwrap();
    let source = tmp.path().join("source");
    fs::create_dir(&source).unwrap();
    dits(&source).arg("init").assert().success();

    let config = b"[chunking]\ntarget_size = 32768\nmin_size = 8192\nmax_size = 131072\n";
    fs::write(source.join(".dits/config.toml"), config).unwrap();
    fs::write(source.join("asset.bin"), b"versioned binary content").unwrap();
    dits(&source).args(["add", "asset.bin"]).assert().success();
    dits(&source)
        .args(["commit", "-m", "source snapshot"])
        .assert()
        .success();
    dits(&source)
        .args(["branch", "feature/editor"])
        .assert()
        .success();
    dits(&source)
        .args(["switch", "feature/editor"])
        .assert()
        .success();

    let destination = tmp.path().join("destination");
    dits(tmp.path())
        .args(["clone", source.to_str().unwrap(), destination.to_str().unwrap()])
        .assert()
        .success();

    assert_eq!(
        fs::read_to_string(destination.join(".dits/HEAD")).unwrap(),
        "ref: refs/heads/feature/editor\n"
    );
    assert_eq!(fs::read(destination.join(".dits/config.toml")).unwrap(), config);
    assert_eq!(fs::read(destination.join("asset.bin")).unwrap(), b"versioned binary content");
}

#[test]
fn clone_preserves_detached_and_unborn_head_states() {
    let tmp = TempDir::new().unwrap();

    let detached_source = init_with_commit(tmp.path(), "detached-source");
    let commit = fs::read_to_string(detached_source.join(".dits/refs/heads/main"))
        .unwrap()
        .trim()
        .to_string();
    dits(&detached_source)
        .args(["checkout", &commit])
        .assert()
        .success();

    let detached_destination = tmp.path().join("detached-destination");
    dits(tmp.path())
        .args(["clone", detached_source.to_str().unwrap(), detached_destination.to_str().unwrap()])
        .assert()
        .success();
    assert_eq!(
        fs::read_to_string(detached_destination.join(".dits/HEAD"))
            .unwrap()
            .trim(),
        commit
    );
    assert_eq!(
        fs::read(detached_destination.join("asset.bin")).unwrap(),
        b"versioned binary content"
    );

    let unborn_source = tmp.path().join("unborn-source");
    fs::create_dir(&unborn_source).unwrap();
    dits(&unborn_source).arg("init").assert().success();

    let unborn_destination = tmp.path().join("unborn-destination");
    dits(tmp.path())
        .args(["clone", unborn_source.to_str().unwrap(), unborn_destination.to_str().unwrap()])
        .assert()
        .success();
    assert_eq!(
        fs::read_to_string(unborn_destination.join(".dits/HEAD")).unwrap(),
        "ref: refs/heads/main\n"
    );
}

#[test]
fn clone_rejects_traversal_and_missing_requested_branches_before_creation() {
    let tmp = TempDir::new().unwrap();
    let source = init_with_commit(tmp.path(), "source");

    let traversal_destination = tmp.path().join("traversal-destination");
    dits(tmp.path())
        .args([
            "clone",
            source.to_str().unwrap(),
            traversal_destination.to_str().unwrap(),
            "--branch",
            "../outside",
        ])
        .assert()
        .failure();
    assert!(!traversal_destination.exists());
    assert!(!tmp.path().join("outside").exists());

    let missing_destination = tmp.path().join("missing-destination");
    let assertion = dits(tmp.path())
        .args([
            "clone",
            source.to_str().unwrap(),
            missing_destination.to_str().unwrap(),
            "--branch",
            "does-not-exist",
        ])
        .assert()
        .failure();
    assert!(String::from_utf8_lossy(&assertion.get_output().stderr)
        .contains("does not exist in source repository"));
    assert!(!missing_destination.exists());

    // A nested clone mutates the source worktree and, below `.dits`, could make
    // a recursive copy consume its own output. Reject the whole source tree.
    let nested_destination = source.join("nested-clone");
    dits(tmp.path())
        .args(["clone", source.to_str().unwrap(), nested_destination.to_str().unwrap()])
        .assert()
        .failure();
    assert!(!nested_destination.exists());
}

#[test]
fn clone_returns_failure_when_checkout_cannot_be_completed() {
    let tmp = TempDir::new().unwrap();
    let source = init_with_commit(tmp.path(), "source");
    let manifest = first_file_below(&source.join(".dits/objects/manifests"));
    fs::remove_file(manifest).unwrap();

    let destination = tmp.path().join("incomplete-destination");
    let assertion = dits(tmp.path())
        .args(["clone", source.to_str().unwrap(), destination.to_str().unwrap()])
        .assert()
        .failure();

    assert!(destination.exists(), "incomplete destination may remain for inspection");
    assert!(!destination.join("asset.bin").exists());
    assert!(
        String::from_utf8_lossy(&assertion.get_output().stderr).contains("is incomplete"),
        "clone error did not identify the incomplete destination: {}",
        String::from_utf8_lossy(&assertion.get_output().stderr)
    );
}

#[cfg(unix)]
#[test]
fn clone_rejects_symlinks_in_source_metadata_without_copying_them() {
    use std::os::unix::fs::symlink;

    let tmp = TempDir::new().unwrap();
    let source = init_with_commit(tmp.path(), "source");
    let outside = tmp.path().join("outside-secret");
    fs::write(&outside, b"must not be imported").unwrap();

    let injected_dir = source.join(".dits/objects/blobs/ff");
    fs::create_dir_all(&injected_dir).unwrap();
    symlink(&outside, injected_dir.join("injected-link")).unwrap();

    let destination = tmp.path().join("destination");
    let assertion = dits(tmp.path())
        .args(["clone", source.to_str().unwrap(), destination.to_str().unwrap()])
        .assert()
        .failure();

    assert!(String::from_utf8_lossy(&assertion.get_output().stderr).contains("symbolic link"));
    assert!(!destination.exists(), "metadata preflight should run before destination creation");
    assert_eq!(fs::read(outside).unwrap(), b"must not be imported");
}

fn first_file_below(root: &Path) -> std::path::PathBuf {
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
    panic!("expected an object below {}", root.display());
}
