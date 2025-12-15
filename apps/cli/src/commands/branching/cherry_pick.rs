//! Cherry-pick command - apply specific commits.

use crate::core::{Author, Commit, Index, IndexEntry};
use crate::store::Repository;
use anyhow::{Context, Result, bail};
use console::style;
use std::fs;
use std::path::Path;

/// Apply specific commits to the current branch.
pub fn cherry_pick(commits: &[String], no_commit: bool) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    if commits.is_empty() {
        bail!("No commits specified");
    }

    let _head = repo.head()?
        .context("No commits yet - nothing to cherry-pick onto")?;

    for commit_ref in commits {
        cherry_pick_single(&repo, commit_ref, no_commit)?;
    }

    Ok(())
}

/// Cherry-pick a single commit.
fn cherry_pick_single(repo: &Repository, commit_ref: &str, no_commit: bool) -> Result<()> {
    // Resolve the commit
    let commit_hash = repo.resolve_ref_or_prefix(commit_ref)?
        .with_context(|| format!("Could not resolve '{}' to a commit", commit_ref))?;

    let commit = repo.load_commit(&commit_hash)?;
    let commit_manifest = repo.load_manifest(&commit.manifest)?;

    // Get the parent manifest (if any) to determine what changed
    let parent_manifest = if let Some(parent_hash) = commit.parent {
        let parent_commit = repo.load_commit(&parent_hash)?;
        Some(repo.load_manifest(&parent_commit.manifest)?)
    } else {
        None
    };

    // Get current HEAD manifest
    let head_hash = repo.head()?.context("No HEAD")?;
    let head_commit = repo.load_commit(&head_hash)?;
    let head_manifest = repo.load_manifest(&head_commit.manifest)?;

    println!(
        "{} Applying commit {}...",
        style("→").blue(),
        &commit_hash.to_hex()[..7]
    );

    // Find files that changed in the cherry-picked commit
    let mut applied_files = Vec::new();
    let mut conflict_files = Vec::new();

    // Load current index
    let index_path = repo.dits_dir().join("index");
    let index_json = fs::read_to_string(&index_path)?;
    let mut index = Index::from_json(&index_json)?;

    // Apply changes from the commit
    for (path, entry) in commit_manifest.iter() {
        let was_in_parent = parent_manifest.as_ref()
            .map(|m| m.get(path))
            .flatten();

        let is_new = was_in_parent.is_none();
        let is_modified = was_in_parent
            .map(|pe| pe.content_hash != entry.content_hash)
            .unwrap_or(false);

        if is_new || is_modified {
            // Check if file exists in HEAD with different content
            if let Some(head_entry) = head_manifest.get(path) {
                if head_entry.content_hash != entry.content_hash {
                    // Check if there's a common base
                    if let Some(parent_entry) = was_in_parent {
                        if head_entry.content_hash == parent_entry.content_hash {
                            // HEAD has the same as parent - we can apply cleanly
                        } else {
                            // Both HEAD and commit changed from parent - conflict
                            conflict_files.push(path.clone());
                            continue;
                        }
                    }
                }
            }

            // Apply the change
            let full_path = repo.root().join(path);

            // Create parent directories
            if let Some(parent) = full_path.parent() {
                fs::create_dir_all(parent)?;
            }

            // Restore file from chunks
            let mut data = Vec::with_capacity(entry.size as usize);
            for chunk_ref in &entry.chunks {
                let chunk = repo.objects().load_chunk(&chunk_ref.hash)?;
                data.extend_from_slice(&chunk.data);
            }
            fs::write(&full_path, &data)?;

            // Update index
            let idx_entry = IndexEntry::new(
                path.clone(),
                entry.content_hash,
                entry.size,
                0,
                0o644, // Default mode
                entry.file_type,
                entry.symlink_target.clone(),
                entry.chunks.clone(),
            );
            index.stage(idx_entry);

            applied_files.push(path.clone());
            println!(
                "  {} {}",
                if is_new { style("A").green() } else { style("M").yellow() },
                style(path).cyan()
            );
        }
    }

    // Handle deleted files
    if let Some(ref parent) = parent_manifest {
        for (path, _) in parent.iter() {
            if !commit_manifest.contains(path) {
                // File was deleted in the cherry-picked commit
                let full_path = repo.root().join(path);
                if full_path.exists() {
                    fs::remove_file(&full_path)?;
                    index.entries.remove(path);
                    applied_files.push(path.clone());
                    println!("  {} {}", style("D").red(), style(path).cyan());
                }
            }
        }
    }

    // Save index
    fs::write(&index_path, index.to_json())?;

    if !conflict_files.is_empty() {
        println!();
        println!("{}", style("CONFLICT: The following files have conflicts:").red().bold());
        for path in &conflict_files {
            println!("  {}", style(path).yellow());
        }
        println!();
        println!("Resolve conflicts and run:");
        println!("  dits add <conflicted-files>");
        println!("  dits commit -m \"Cherry-picked {}\"", &commit_hash.to_hex()[..7]);
        return Ok(());
    }

    if applied_files.is_empty() {
        println!("{}", style("Nothing to cherry-pick - commit already applied").yellow());
        return Ok(());
    }

    if no_commit {
        println!();
        println!(
            "{} Applied {} file(s) without committing",
            style("✓").green(),
            applied_files.len()
        );
        println!("Run 'dits commit' to create the commit.");
    } else {
        // Create a new commit
        let new_message = format!(
            "{}\n\n(cherry picked from commit {})",
            commit.message,
            commit_hash.to_hex()
        );

        let author = Author::from_env();
        let new_commit = Commit::new(Some(head_hash), commit.manifest, &new_message, author);

        // Store the new commit
        repo.objects().store_commit(&new_commit)?;

        // Update HEAD
        if let Some(branch) = repo.current_branch()? {
            repo.refs().set_branch(&branch, &new_commit.hash)?;
        } else {
            repo.refs().set_head_detached(&new_commit.hash)?;
        }

        println!();
        println!(
            "{} [{}] {}",
            style("✓").green(),
            style(&new_commit.hash.to_hex()[..7]).yellow(),
            commit.message.lines().next().unwrap_or(&commit.message)
        );
    }

    Ok(())
}
