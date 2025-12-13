//! Hook runner - Execute hook scripts.

use anyhow::{Context, Result};
use std::path::Path;
use std::process::{Command, Stdio};

use super::{get_hooks_dir, hook_exists, HookType};

/// Result of running a hook
#[derive(Debug)]
pub struct HookResult {
    /// Whether the hook succeeded (exit code 0)
    pub success: bool,
    /// Exit code
    pub exit_code: i32,
    /// Standard output
    pub stdout: String,
    /// Standard error
    pub stderr: String,
}

impl HookResult {
    /// Create a success result (for when hook doesn't exist)
    pub fn skipped() -> Self {
        Self {
            success: true,
            exit_code: 0,
            stdout: String::new(),
            stderr: String::new(),
        }
    }
}

/// Run a hook if it exists
///
/// Returns Ok(HookResult) if hook ran or was skipped (doesn't exist).
/// Returns Err only if there was an error executing the hook.
pub fn run_hook(
    repo_root: &Path,
    hook_type: HookType,
    args: &[&str],
    stdin: Option<&str>,
) -> Result<HookResult> {
    // Check if hook exists
    if !hook_exists(repo_root, hook_type) {
        return Ok(HookResult::skipped());
    }
    
    let hooks_dir = get_hooks_dir(repo_root);
    let hook_path = hooks_dir.join(hook_type.filename());
    
    // Build command
    let mut cmd = Command::new(&hook_path);
    cmd.args(args)
        .current_dir(repo_root)
        .env("DITS_DIR", repo_root.join(".dits"))
        .env("DITS_HOOK", hook_type.filename())
        .stdin(if stdin.is_some() { Stdio::piped() } else { Stdio::null() })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    // Spawn process
    let mut child = cmd.spawn()
        .with_context(|| format!("Failed to execute hook: {}", hook_path.display()))?;
    
    // Write stdin if provided
    if let Some(input) = stdin {
        use std::io::Write;
        if let Some(mut stdin_pipe) = child.stdin.take() {
            stdin_pipe.write_all(input.as_bytes())?;
        }
    }
    
    // Wait for completion
    let output = child.wait_with_output()
        .with_context(|| format!("Failed to wait for hook: {}", hook_path.display()))?;
    
    let exit_code = output.status.code().unwrap_or(-1);
    
    Ok(HookResult {
        success: output.status.success(),
        exit_code,
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

/// Run a hook and fail the operation if hook fails
pub fn run_hook_or_fail(
    repo_root: &Path,
    hook_type: HookType,
    args: &[&str],
    stdin: Option<&str>,
) -> Result<()> {
    let result = run_hook(repo_root, hook_type, args, stdin)?;
    
    if !result.success {
        // Print hook output
        if !result.stdout.is_empty() {
            eprintln!("{}", result.stdout);
        }
        if !result.stderr.is_empty() {
            eprintln!("{}", result.stderr);
        }
        
        anyhow::bail!(
            "Hook '{}' failed with exit code {}",
            hook_type.filename(),
            result.exit_code
        );
    }
    
    // Print output even on success
    if !result.stdout.is_empty() {
        print!("{}", result.stdout);
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;
    use std::io::Write;

    fn create_hook(dir: &Path, hook_type: HookType, script: &str) {
        let hooks_dir = dir.join(".dits").join("hooks");
        fs::create_dir_all(&hooks_dir).unwrap();
        
        let hook_path = hooks_dir.join(hook_type.filename());
        let mut file = fs::File::create(&hook_path).unwrap();
        file.write_all(script.as_bytes()).unwrap();
        
        // Make executable
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&hook_path).unwrap().permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&hook_path, perms).unwrap();
        }
    }

    #[test]
    fn test_hook_result_skipped() {
        let result = HookResult::skipped();
        assert!(result.success);
        assert_eq!(result.exit_code, 0);
    }

    #[test]
    #[cfg(unix)]
    fn test_run_hook_success() {
        let temp = TempDir::new().unwrap();
        fs::create_dir_all(temp.path().join(".dits")).unwrap();
        
        create_hook(temp.path(), HookType::PreCommit, "#!/bin/sh\necho 'Hello'");
        
        let result = run_hook(temp.path(), HookType::PreCommit, &[], None).unwrap();
        assert!(result.success);
        assert!(result.stdout.contains("Hello"));
    }

    #[test]
    #[cfg(unix)]
    fn test_run_hook_failure() {
        let temp = TempDir::new().unwrap();
        fs::create_dir_all(temp.path().join(".dits")).unwrap();
        
        create_hook(temp.path(), HookType::PreCommit, "#!/bin/sh\nexit 1");
        
        let result = run_hook(temp.path(), HookType::PreCommit, &[], None).unwrap();
        assert!(!result.success);
        assert_eq!(result.exit_code, 1);
    }

    #[test]
    fn test_run_hook_not_exists() {
        let temp = TempDir::new().unwrap();
        fs::create_dir_all(temp.path().join(".dits")).unwrap();
        
        let result = run_hook(temp.path(), HookType::PreCommit, &[], None).unwrap();
        assert!(result.success); // Skipped hooks are considered success
    }
}
