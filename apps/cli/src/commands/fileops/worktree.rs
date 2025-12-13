//! Worktree command - Manage multiple working trees.
//!
//! This command allows managing multiple working trees attached to the same repository.

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::store::Repository;

/// Worktree information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Worktree {
    /// Path to the worktree
    pub path: PathBuf,
    /// Branch checked out (or detached HEAD)
    pub head: String,
    /// Whether this is the main worktree
    pub is_main: bool,
    /// Whether the worktree is locked
    pub locked: bool,
    /// Lock reason if locked
    pub lock_reason: Option<String>,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Whether the worktree is prunable (path doesn't exist)
    pub prunable: bool,
}

/// List all worktrees
pub fn list() -> Result<Vec<Worktree>> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let worktrees_dir = repo.dits_dir().join("worktrees");
    let mut worktrees = Vec::new();
    
    // Add main worktree
    let head = repo.head().ok().flatten().map(|h| h.to_hex()).unwrap_or_else(|| "HEAD".to_string());
    worktrees.push(Worktree {
        path: repo.root().to_path_buf(),
        head,
        is_main: true,
        locked: false,
        lock_reason: None,
        created_at: Utc::now(),
        prunable: false,
    });
    
    // Add linked worktrees
    if worktrees_dir.exists() {
        for entry in fs::read_dir(&worktrees_dir)? {
            let entry = entry?;
            if entry.file_type()?.is_dir() {
                if let Some(wt) = load_worktree(&entry.path())? {
                    worktrees.push(wt);
                }
            }
        }
    }
    
    Ok(worktrees)
}

fn load_worktree(wt_admin_dir: &Path) -> Result<Option<Worktree>> {
    let gitdir_file = wt_admin_dir.join("gitdir");
    if !gitdir_file.exists() {
        return Ok(None);
    }
    
    let worktree_path = fs::read_to_string(&gitdir_file)?
        .trim()
        .to_string();
    let worktree_path = PathBuf::from(&worktree_path)
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from(&worktree_path));
    
    let head_file = wt_admin_dir.join("HEAD");
    let head = if head_file.exists() {
        fs::read_to_string(&head_file)?.trim().to_string()
    } else {
        "HEAD".to_string()
    };
    
    let locked_file = wt_admin_dir.join("locked");
    let (locked, lock_reason) = if locked_file.exists() {
        let reason = fs::read_to_string(&locked_file).ok();
        (true, reason.map(|s| s.trim().to_string()))
    } else {
        (false, None)
    };
    
    let prunable = !worktree_path.exists();
    
    Ok(Some(Worktree {
        path: worktree_path,
        head,
        is_main: false,
        locked,
        lock_reason,
        created_at: Utc::now(),
        prunable,
    }))
}

/// Add a new worktree
pub fn add(path: &str, branch: Option<&str>, new_branch: bool, force: bool) -> Result<Worktree> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let worktree_path = PathBuf::from(path);
    
    // Check if path exists
    if worktree_path.exists() && !force {
        anyhow::bail!(
            "Path '{}' already exists. Use --force to overwrite.",
            path
        );
    }
    
    // Determine branch
    let branch_name = match branch {
        Some(b) => b.to_string(),
        None => {
            // Use directory name as branch name if creating new branch
            if new_branch {
                worktree_path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("worktree")
                    .to_string()
            } else {
                // Detached HEAD from current HEAD
                "HEAD".to_string()
            }
        }
    };
    
    // Create worktree directory
    fs::create_dir_all(&worktree_path)
        .with_context(|| format!("Failed to create worktree directory: {}", path))?;
    
    // Create worktree admin directory
    let wt_name = worktree_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("worktree");
    let wt_admin_dir = repo.dits_dir().join("worktrees").join(wt_name);
    fs::create_dir_all(&wt_admin_dir)?;
    
    // Write gitdir file (points to worktree's .dits)
    let wt_dits_dir = worktree_path.join(".dits");
    fs::write(
        wt_admin_dir.join("gitdir"),
        wt_dits_dir.to_string_lossy().as_ref(),
    )?;
    
    // Create .dits file in worktree (points back to main repo)
    fs::write(
        &wt_dits_dir,
        format!("gitdir: {}", wt_admin_dir.display()),
    )?;
    
    // Write HEAD file
    let head_content = if new_branch || branch.is_some() {
        format!("ref: refs/heads/{}", branch_name)
    } else {
        repo.head().ok().flatten().map(|h| h.to_hex()).unwrap_or_else(|| "HEAD".to_string())
    };
    fs::write(wt_admin_dir.join("HEAD"), &head_content)?;
    
    // Checkout files to the worktree
    checkout_to_worktree(&repo, &worktree_path)?;
    
    Ok(Worktree {
        path: worktree_path,
        head: head_content,
        is_main: false,
        locked: false,
        lock_reason: None,
        created_at: Utc::now(),
        prunable: false,
    })
}

fn checkout_to_worktree(repo: &Repository, worktree_path: &Path) -> Result<()> {
    // Copy files from the current working tree to the new worktree
    let repo_root = repo.root();
    
    // Get files from manifest
    if let Some(head) = repo.head()? {
        let commit = repo.load_commit(&head)?;
        let manifest = repo.load_manifest(&commit.manifest)?;
        
        for (path, _entry) in manifest.iter() {
            let source_path = repo_root.join(path);
            let dest_path = worktree_path.join(path);
            
            if source_path.exists() {
                if let Some(parent) = dest_path.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::copy(&source_path, &dest_path)?;
            }
        }
    }
    
    Ok(())
}

/// Remove a worktree
pub fn remove(path: &str, force: bool) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let worktree_path = PathBuf::from(path);
    
    // Find worktree in admin directory
    let worktrees_dir = repo.dits_dir().join("worktrees");
    let mut found_admin_dir: Option<PathBuf> = None;
    
    if worktrees_dir.exists() {
        for entry in fs::read_dir(&worktrees_dir)? {
            let entry = entry?;
            if entry.file_type()?.is_dir() {
                let gitdir_file = entry.path().join("gitdir");
                if gitdir_file.exists() {
                    let content = fs::read_to_string(&gitdir_file)?;
                    let wt_path = PathBuf::from(content.trim())
                        .parent()
                        .map(|p| p.to_path_buf());
                    
                    if wt_path.as_ref() == Some(&worktree_path) {
                        found_admin_dir = Some(entry.path());
                        break;
                    }
                }
            }
        }
    }
    
    let admin_dir = found_admin_dir
        .ok_or_else(|| anyhow::anyhow!("Worktree '{}' not found", path))?;
    
    // Check if locked
    let locked_file = admin_dir.join("locked");
    if locked_file.exists() && !force {
        let reason = fs::read_to_string(&locked_file)
            .unwrap_or_default();
        anyhow::bail!(
            "Worktree '{}' is locked{}. Use --force to remove anyway.",
            path,
            if reason.is_empty() { "".to_string() } else { format!(": {}", reason.trim()) }
        );
    }
    
    // Remove admin directory
    fs::remove_dir_all(&admin_dir)?;
    
    // Remove worktree directory if it exists and force is set
    if worktree_path.exists() {
        if force {
            fs::remove_dir_all(&worktree_path)?;
        } else {
            println!(
                "Note: Worktree directory '{}' still exists. Remove manually if desired.",
                path
            );
        }
    }
    
    Ok(())
}

/// Lock a worktree
pub fn lock(path: &str, reason: Option<&str>) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let worktree_path = PathBuf::from(path);
    let wt_name = worktree_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("worktree");
    
    let admin_dir = repo.dits_dir().join("worktrees").join(wt_name);
    if !admin_dir.exists() {
        anyhow::bail!("Worktree '{}' not found", path);
    }
    
    let locked_file = admin_dir.join("locked");
    let content = reason.unwrap_or("");
    fs::write(&locked_file, content)?;
    
    println!("Locked worktree '{}'", path);
    Ok(())
}

/// Unlock a worktree
pub fn unlock(path: &str) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let worktree_path = PathBuf::from(path);
    let wt_name = worktree_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("worktree");
    
    let admin_dir = repo.dits_dir().join("worktrees").join(wt_name);
    if !admin_dir.exists() {
        anyhow::bail!("Worktree '{}' not found", path);
    }
    
    let locked_file = admin_dir.join("locked");
    if locked_file.exists() {
        fs::remove_file(&locked_file)?;
        println!("Unlocked worktree '{}'", path);
    } else {
        println!("Worktree '{}' is not locked", path);
    }
    
    Ok(())
}

/// Prune stale worktree information
pub fn prune(dry_run: bool) -> Result<Vec<PathBuf>> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let worktrees_dir = repo.dits_dir().join("worktrees");
    let mut pruned = Vec::new();
    
    if !worktrees_dir.exists() {
        return Ok(pruned);
    }
    
    for entry in fs::read_dir(&worktrees_dir)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            let gitdir_file = entry.path().join("gitdir");
            if gitdir_file.exists() {
                let content = fs::read_to_string(&gitdir_file)?;
                let wt_path = PathBuf::from(content.trim())
                    .parent()
                    .map(|p| p.to_path_buf());
                
                // Check if worktree directory exists
                if let Some(wt_path) = wt_path {
                    if !wt_path.exists() {
                        pruned.push(entry.path());
                        if !dry_run {
                            fs::remove_dir_all(entry.path())?;
                        }
                    }
                }
            }
        }
    }
    
    Ok(pruned)
}

/// Print worktree list
pub fn print_list(worktrees: &[Worktree], verbose: bool) {
    for wt in worktrees {
        let status = if wt.locked {
            " (locked)"
        } else if wt.prunable {
            " (prunable)"
        } else {
            ""
        };
        
        if verbose {
            println!("worktree {}", wt.path.display());
            println!("HEAD       {}", wt.head);
            if wt.is_main {
                println!("           (main worktree)");
            }
            if wt.locked {
                if let Some(reason) = &wt.lock_reason {
                    println!("locked     {}", reason);
                } else {
                    println!("locked");
                }
            }
            println!();
        } else {
            println!(
                "{} {}{}",
                wt.path.display(),
                wt.head,
                status
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_worktree_struct() {
        let wt = Worktree {
            path: PathBuf::from("/tmp/test"),
            head: "main".to_string(),
            is_main: true,
            locked: false,
            lock_reason: None,
            created_at: Utc::now(),
            prunable: false,
        };
        
        assert!(wt.is_main);
        assert!(!wt.locked);
    }
}
