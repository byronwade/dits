//! Push command - push changes to a remote repository.

use anyhow::{Context, Result, bail};
use crate::store::remote::{RemoteStore, RemoteType};
use std::fs;
use std::path::Path;

/// Push changes to a remote.
pub fn push(
    remote_name: Option<&str>,
    branch: Option<&str>,
    force: bool,
    all: bool,
) -> Result<()> {
    let dits_dir = std::path::Path::new(".dits");
    if !dits_dir.exists() {
        bail!("Not a dits repository");
    }

    let remotes = RemoteStore::new(dits_dir);

    // Get the remote
    let remote_name = remote_name.unwrap_or("origin");
    let remote = remotes.get(remote_name)
        .ok_or_else(|| anyhow::anyhow!("Remote '{}' not found", remote_name))?;

    let remote_type = RemoteType::parse(&remote.url);

    match remote_type {
        RemoteType::Local(remote_path) => {
            push_local(&remote_path, branch, force, all)
        }
        RemoteType::Http(url) | RemoteType::Dits(url) | RemoteType::Ssh(url) => {
            bail!(
                "Network push not yet implemented.\n\
                 Remote: {} ({})\n\n\
                 For now, use local paths for testing.",
                remote_name, url
            )
        }
    }
}

/// Push to a local remote.
fn push_local(
    remote_path: &Path,
    branch: Option<&str>,
    force: bool,
    all: bool,
) -> Result<()> {
    // Verify remote is a dits repo
    let remote_dits = remote_path.join(".dits");
    if !remote_dits.exists() {
        bail!("Remote is not a dits repository: {}", remote_path.display());
    }

    let local_dits = std::path::Path::new(".dits");

    // Get branches to push
    let branches: Vec<String> = if all {
        // Push all branches
        let refs_dir = local_dits.join("refs").join("heads");
        if refs_dir.exists() {
            fs::read_dir(&refs_dir)?
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().map(|t| t.is_file()).unwrap_or(false))
                .filter_map(|e| e.file_name().into_string().ok())
                .collect()
        } else {
            vec![]
        }
    } else {
        // Push current branch or specified branch
        let branch_name = if let Some(b) = branch {
            b.to_string()
        } else {
            // Get current branch from HEAD
            let head_content = fs::read_to_string(local_dits.join("HEAD"))
                .context("Failed to read HEAD")?;
            if let Some(refname) = head_content.strip_prefix("ref: refs/heads/") {
                refname.trim().to_string()
            } else {
                bail!("Cannot push detached HEAD. Specify a branch name.");
            }
        };
        vec![branch_name]
    };

    if branches.is_empty() {
        println!("Nothing to push.");
        return Ok(());
    }

    println!("Pushing to {} ...", remote_path.display());

    let mut pushed_count = 0;
    let mut objects_copied = 0;

    for branch_name in &branches {
        let local_ref = local_dits.join("refs").join("heads").join(&branch_name);
        let remote_ref = remote_dits.join("refs").join("heads").join(&branch_name);

        if !local_ref.exists() {
            println!("  ! Branch '{}' does not exist locally", branch_name);
            continue;
        }

        let local_commit = fs::read_to_string(&local_ref)?.trim().to_string();

        // Check if remote already has this commit
        if remote_ref.exists() {
            let remote_commit = fs::read_to_string(&remote_ref)?.trim().to_string();
            if remote_commit == local_commit && !force {
                println!("  = {} is up to date", branch_name);
                continue;
            }

            // In a real implementation, we'd check if this is a fast-forward
            // For now, just warn about potential non-fast-forward
            if !force {
                println!("  Warning: {} may not be a fast-forward push. Use --force to override.", branch_name);
            }
        }

        // Copy missing objects
        let local_objects = local_dits.join("objects");
        let remote_objects = remote_dits.join("objects");

        let copied = copy_missing_objects(&local_objects, &remote_objects)?;
        objects_copied += copied;

        // Update remote ref
        fs::create_dir_all(remote_ref.parent().unwrap())?;
        fs::write(&remote_ref, format!("{}\n", local_commit))?;

        pushed_count += 1;
        println!("  + {} -> {}", branch_name, &local_commit[..8.min(local_commit.len())]);
    }

    if pushed_count > 0 {
        println!(
            "\nPushed {} branch(es), {} objects copied.",
            pushed_count, objects_copied
        );
    } else {
        println!("\nNothing to push (everything up-to-date).");
    }

    Ok(())
}

/// Copy objects that exist locally but not on remote.
/// Handles the objects directory structure (blobs, chunks, commits, manifests).
fn copy_missing_objects(local_objects: &Path, remote_objects: &Path) -> Result<usize> {
    if !local_objects.exists() {
        return Ok(0);
    }

    let mut count = 0;

    // Handle the dits objects directory structure: blobs/, chunks/, commits/, manifests/
    for category in &["blobs", "chunks", "commits", "manifests"] {
        let local_category = local_objects.join(category);
        let remote_category = remote_objects.join(category);

        if !local_category.exists() {
            continue;
        }

        for entry in fs::read_dir(&local_category)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                // Fan-out directory (e.g., "ab" for objects starting with "ab")
                let dir_name = entry.file_name();
                let remote_subdir = remote_category.join(&dir_name);

                for sub_entry in fs::read_dir(&path)? {
                    let sub_entry = sub_entry?;
                    let obj_path = sub_entry.path();

                    if obj_path.is_file() {
                        let remote_obj = remote_subdir.join(sub_entry.file_name());

                        if !remote_obj.exists() {
                            fs::create_dir_all(&remote_subdir)?;
                            fs::copy(&obj_path, &remote_obj)?;
                            count += 1;
                        }
                    }
                }
            } else if path.is_file() {
                // Direct object file (no fan-out)
                let remote_obj = remote_category.join(entry.file_name());
                if !remote_obj.exists() {
                    fs::create_dir_all(&remote_category)?;
                    fs::copy(&path, &remote_obj)?;
                    count += 1;
                }
            }
        }
    }

    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
}
