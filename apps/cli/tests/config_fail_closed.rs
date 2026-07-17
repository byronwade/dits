//! Malformed configuration must not be silently replaced with defaults.

use std::{fs, path::Path};

use assert_cmd::Command;
use tempfile::TempDir;

fn dits(dir: &Path, config_home: &Path) -> Command {
    let mut command = Command::cargo_bin("dits").unwrap();
    command.current_dir(dir).env("XDG_CONFIG_HOME", config_home);
    command
}

#[test]
fn malformed_global_config_is_never_overwritten_by_telemetry_commands() {
    let tmp = TempDir::new().unwrap();
    let config_home = tmp.path().join("config-home");
    let config_path = config_home.join("dits/config.toml");
    fs::create_dir_all(config_path.parent().unwrap()).unwrap();
    let malformed = b"[telemetry\nenabled = maybe\n";
    fs::write(&config_path, malformed).unwrap();

    // Unrelated local operations can proceed with telemetry disabled, but must
    // preserve the malformed global file for explicit repair.
    let repo = tmp.path().join("repo");
    fs::create_dir(&repo).unwrap();
    dits(&repo, &config_home).arg("init").assert().success();
    assert_eq!(fs::read(&config_path).unwrap(), malformed);

    // Telemetry cannot truthfully report or safely mutate state it could not
    // parse, so every telemetry action fails without replacing the file.
    for action in ["status", "enable", "disable"] {
        dits(&repo, &config_home)
            .args(["telemetry", action])
            .assert()
            .failure();
        assert_eq!(fs::read(&config_path).unwrap(), malformed);
    }
}
