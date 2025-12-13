//! Hooks command - Manage repository hooks.

use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

use crate::hooks::{get_hooks_dir, get_sample_hook, HookType};
use crate::store::Repository;

/// List all available hooks and their status
pub fn list() -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let hooks_dir = get_hooks_dir(repo.root());
    
    println!("Available hooks:\n");
    
    for hook_type in HookType::all() {
        let hook_path = hooks_dir.join(hook_type.filename());
        let installed = hook_path.exists();
        let status = if installed { "✓ installed" } else { "  not installed" };
        
        println!("{:<20} {} - {}", hook_type.filename(), status, hook_type.description());
    }
    
    println!("\nHooks directory: {}", hooks_dir.display());
    println!("\nUse 'dits hooks install <hook>' to install a sample hook");
    
    Ok(())
}

/// Install a sample hook
pub fn install(hook_name: &str, force: bool) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let hook_type = HookType::from_str(hook_name)
        .ok_or_else(|| anyhow::anyhow!("Unknown hook: {}. Use 'dits hooks list' to see available hooks.", hook_name))?;
    
    let hooks_dir = get_hooks_dir(repo.root());
    fs::create_dir_all(&hooks_dir)?;
    
    let hook_path = hooks_dir.join(hook_type.filename());
    
    if hook_path.exists() && !force {
        anyhow::bail!(
            "Hook '{}' already exists. Use --force to overwrite.",
            hook_name
        );
    }
    
    let sample = get_sample_hook(hook_type);
    fs::write(&hook_path, sample)?;
    
    // Make executable
    make_executable(&hook_path)?;
    
    println!("Installed sample hook: {}", hook_path.display());
    println!("Edit the hook to customize its behavior.");
    
    Ok(())
}

/// Uninstall a hook
pub fn uninstall(hook_name: &str) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let hook_type = HookType::from_str(hook_name)
        .ok_or_else(|| anyhow::anyhow!("Unknown hook: {}", hook_name))?;
    
    let hook_path = get_hooks_dir(repo.root()).join(hook_type.filename());
    
    if !hook_path.exists() {
        println!("Hook '{}' is not installed", hook_name);
        return Ok(());
    }
    
    fs::remove_file(&hook_path)?;
    println!("Uninstalled hook: {}", hook_name);
    
    Ok(())
}

/// Run a hook manually
pub fn run(hook_name: &str, args: &[String]) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let hook_type = HookType::from_str(hook_name)
        .ok_or_else(|| anyhow::anyhow!("Unknown hook: {}", hook_name))?;
    
    let hook_path = get_hooks_dir(repo.root()).join(hook_type.filename());
    
    if !hook_path.exists() {
        anyhow::bail!("Hook '{}' is not installed", hook_name);
    }
    
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let result = crate::hooks::run_hook(repo.root(), hook_type, &args_refs, None)?;
    
    if !result.stdout.is_empty() {
        print!("{}", result.stdout);
    }
    if !result.stderr.is_empty() {
        eprint!("{}", result.stderr);
    }
    
    if result.success {
        println!("Hook '{}' completed successfully", hook_name);
    } else {
        anyhow::bail!("Hook '{}' failed with exit code {}", hook_name, result.exit_code);
    }
    
    Ok(())
}

/// Show the content of a hook
pub fn show(hook_name: &str) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let hook_type = HookType::from_str(hook_name)
        .ok_or_else(|| anyhow::anyhow!("Unknown hook: {}", hook_name))?;
    
    let hook_path = get_hooks_dir(repo.root()).join(hook_type.filename());
    
    if !hook_path.exists() {
        // Show sample
        println!("Hook '{}' is not installed. Here's a sample:\n", hook_name);
        println!("{}", get_sample_hook(hook_type));
    } else {
        let content = fs::read_to_string(&hook_path)?;
        println!("{}", content);
    }
    
    Ok(())
}

#[cfg(unix)]
fn make_executable(path: &Path) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;
    let mut perms = fs::metadata(path)?.permissions();
    perms.set_mode(0o755);
    fs::set_permissions(path, perms)?;
    Ok(())
}

#[cfg(not(unix))]
fn make_executable(_path: &Path) -> Result<()> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hook_type_parsing() {
        assert!(HookType::from_str("pre-commit").is_some());
        assert!(HookType::from_str("invalid").is_none());
    }
}
