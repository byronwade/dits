//! Reset command implementation.

use crate::core::{FileStatus, Index, IndexEntry};
use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::fs;
use std::path::Path;

/// Reset mode determines what gets reset.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ResetMode {
    /// Only move HEAD (default).
    Soft,
    /// Move HEAD and reset index (unstage all).
    Mixed,
    /// Move HEAD, reset index, and reset working tree.
    Hard,
}

/// Reset the repository to a specific state.
pub fn reset(target: Option<&str>, mode: ResetMode, paths: &[String]) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    if !paths.is_empty() {
        // Path-based reset (unstage specific files)
        reset_paths(&repo, paths)?;
    } else {
        // Commit-based reset
        reset_to_commit(&repo, target, mode)?;
    }

    Ok(())
}

/// Reset specific paths (unstage them).
fn reset_paths(repo: &Repository, paths: &[String]) -> Result<()> {
    let index_path = repo.dits_dir().join("index");
    let json = fs::read_to_string(&index_path)?;
    let mut index = Index::from_json(&json)?;

    let mut unstaged = 0;

    for path in paths {
        if let Some(entry) = index.entries.get_mut(path) {
            if entry.status != FileStatus::Unchanged {
                entry.status = FileStatus::Unchanged;
                unstaged += 1;
                println!(
                    "{} Unstaged '{}'",
                    style("U").yellow().bold(),
                    style(path).cyan()
                );
            }
        } else {
            println!(
                "{} Path '{}' not in index",
                style("!").yellow().bold(),
                path
            );
        }
    }

    // Save updated index
    fs::write(&index_path, index.to_json())?;

    if unstaged > 0 {
        println!(
            "\n{} Unstaged {} file{}",
            style("->").green().bold(),
            unstaged,
            if unstaged == 1 { "" } else { "s" }
        );
    }

    Ok(())
}

/// Reset to a specific commit.
fn reset_to_commit(repo: &Repository, target: Option<&str>, mode: ResetMode) -> Result<()> {
    // Resolve target (default to HEAD)
    let target_hash = if let Some(ref_str) = target {
        repo.resolve_ref_or_prefix(ref_str)?
            .with_context(|| format!("Could not resolve '{}' to a commit", ref_str))?
    } else {
        repo.head()?
            .context("No commits yet")?
    };

    let target_commit = repo.objects().load_commit(&target_hash)?;

    match mode {
        ResetMode::Soft => {
            // Only move HEAD
            if let Some(branch) = repo.current_branch()? {
                repo.refs().set_branch(&branch, &target_hash)?;
            } else {
                repo.refs().set_head_detached(&target_hash)?;
            }

            println!(
                "{} HEAD is now at {}",
                style("->").green().bold(),
                &target_hash.to_hex()[..8]
            );
        }

        ResetMode::Mixed => {
            // Move HEAD and reset index
            if let Some(branch) = repo.current_branch()? {
                repo.refs().set_branch(&branch, &target_hash)?;
            } else {
                repo.refs().set_head_detached(&target_hash)?;
            }

            // Reset index to match target commit
            let manifest = repo.objects().load_manifest(&target_commit.manifest)?;
            let mut new_index = Index::from_commit(target_hash);

            for (path, entry) in manifest.iter() {
                let idx_entry = IndexEntry::new(
                    path.clone(),
                    entry.content_hash,
                    entry.size,
                    0,
                    entry.chunks.clone(),
                );
                new_index.stage(idx_entry);
            }

            let index_path = repo.dits_dir().join("index");
            fs::write(&index_path, new_index.to_json())?;

            println!(
                "{} HEAD is now at {} (index reset)",
                style("->").green().bold(),
                &target_hash.to_hex()[..8]
            );
        }

        ResetMode::Hard => {
            // Move HEAD, reset index, and reset working tree
            if let Some(branch) = repo.current_branch()? {
                repo.refs().set_branch(&branch, &target_hash)?;
            } else {
                repo.refs().set_head_detached(&target_hash)?;
            }

            // Checkout the target commit (this resets both index and working tree)
            let result = repo.checkout(&target_hash)?;

            println!(
                "{} HEAD is now at {} (hard reset)",
                style("->").green().bold(),
                &target_hash.to_hex()[..8]
            );
            println!(
                "   {} file{} restored",
                result.files_restored,
                if result.files_restored == 1 { "" } else { "s" }
            );
        }
    }

    println!(
        "   {}",
        style(&target_commit.message).dim()
    );

    Ok(())
}
