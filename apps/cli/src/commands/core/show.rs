//! Show command - display commit details.

use crate::store::Repository;
use crate::util::{format_bytes, format_size_change};
use anyhow::{Context, Result};
use console::style;
use std::path::Path;

/// Show details of a commit or object.
pub fn show(object: &str, stat: bool, name_only: bool, name_status: bool, no_patch: bool) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    // Resolve the object reference
    let hash = repo.resolve_ref_or_prefix(object)?
        .with_context(|| format!("Could not resolve '{}' to a commit", object))?;

    let commit = repo.load_commit(&hash)?;
    let manifest = repo.load_manifest(&commit.manifest)?;

    // Print commit header
    println!(
        "{} {}",
        style("commit").yellow(),
        style(commit.hash.to_hex()).yellow()
    );

    // Show parent if exists
    if let Some(parent) = commit.parent {
        println!("Parent: {}", &parent.to_hex()[..12]);
    }

    println!("Author: {} <{}>", commit.author.name, commit.author.email);
    println!("Date:   {}", commit.timestamp.format("%a %b %d %H:%M:%S %Y %z"));
    println!();
    println!("    {}", commit.message);
    println!();

    if no_patch {
        return Ok(());
    }

    // Get parent manifest for diff
    let parent_manifest = if let Some(parent_hash) = commit.parent {
        let parent_commit = repo.load_commit(&parent_hash)?;
        Some(repo.load_manifest(&parent_commit.manifest)?)
    } else {
        None
    };

    // Show changed files
    if stat || name_only || name_status {
        println!("{}", style("Changed files:").bold());

        let mut added_files = Vec::new();
        let mut modified_files = Vec::new();
        let mut deleted_files = Vec::new();

        // Find added/modified files
        for (path, entry) in manifest.iter() {
            if let Some(ref parent) = parent_manifest {
                if let Some(parent_entry) = parent.get(path) {
                    if parent_entry.content_hash != entry.content_hash {
                        modified_files.push((path.clone(), entry.size, parent_entry.size));
                    }
                } else {
                    added_files.push((path.clone(), entry.size));
                }
            } else {
                // No parent, all files are new
                added_files.push((path.clone(), entry.size));
            }
        }

        // Find deleted files
        if let Some(ref parent) = parent_manifest {
            for (path, entry) in parent.iter() {
                if !manifest.contains(path) {
                    deleted_files.push((path.clone(), entry.size));
                }
            }
        }

        // Display results
        for (path, size) in &added_files {
            if name_only {
                println!("{}", path);
            } else if name_status {
                println!("{}\t{}", style("A").green(), path);
            } else {
                println!(
                    " {} {} | {} (new file)",
                    style("A").green(),
                    style(path).cyan(),
                    format_bytes(*size)
                );
            }
        }

        for (path, new_size, old_size) in &modified_files {
            if name_only {
                println!("{}", path);
            } else if name_status {
                println!("{}\t{}", style("M").yellow(), path);
            } else {
                println!(
                    " {} {} | {}",
                    style("M").yellow(),
                    style(path).cyan(),
                    format_size_change(*new_size, *old_size)
                );
            }
        }

        for (path, _size) in &deleted_files {
            if name_only {
                println!("{}", path);
            } else if name_status {
                println!("{}\t{}", style("D").red(), path);
            } else {
                println!(
                    " {} {} | (deleted)",
                    style("D").red(),
                    style(path).cyan()
                );
            }
        }

        if stat {
            println!();
            let total = added_files.len() + modified_files.len() + deleted_files.len();
            println!(
                " {} file{} changed, {} addition{}, {} deletion{}",
                total,
                if total == 1 { "" } else { "s" },
                style(added_files.len()).green(),
                if added_files.len() == 1 { "" } else { "s" },
                style(deleted_files.len()).red(),
                if deleted_files.len() == 1 { "" } else { "s" }
            );
        }
    } else {
        // Default: show chunk-level diff info
        println!("{}", style("Changed files:").bold());

        for (path, entry) in manifest.iter() {
            let status = if let Some(ref parent) = parent_manifest {
                if let Some(parent_entry) = parent.get(path) {
                    if parent_entry.content_hash != entry.content_hash {
                        style("M").yellow()
                    } else {
                        continue; // Unchanged
                    }
                } else {
                    style("A").green()
                }
            } else {
                style("A").green()
            };

            println!(" {} {}", status, style(path).cyan());
            println!(
                "   Chunks: {} total, Size: {}",
                entry.chunks.len(),
                format_bytes(entry.size)
            );
        }

        // Show deleted files
        if let Some(ref parent) = parent_manifest {
            for (path, _) in parent.iter() {
                if !manifest.contains(path) {
                    println!(" {} {}", style("D").red(), style(path).cyan());
                }
            }
        }
    }

    Ok(())
}

