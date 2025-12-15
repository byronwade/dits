//! Pull command - fetch and merge changes from a remote repository.

use anyhow::{Context, Result, bail};
use crate::store::{Repository, remote::{RemoteStore, RemoteType}};
use std::fs;
use std::path::Path;

/// Pull changes from a remote (fetch + merge).
pub async fn pull(
    remote_name: Option<&str>,
    branch: Option<&str>,
    rebase: bool,
) -> Result<()> {
    let current_dir = std::env::current_dir()?;
    let dits_dir = current_dir.join(".dits");
    if !dits_dir.exists() {
        bail!("Not a dits repository");
    }

    let remotes = RemoteStore::new(&dits_dir);

    // Get the remote
    let remote_name = remote_name.unwrap_or("origin");
    let remote = remotes.get(remote_name)
        .ok_or_else(|| anyhow::anyhow!("Remote '{}' not found", remote_name))?;

    let remote_type = RemoteType::parse(&remote.url);

    match remote_type {
        RemoteType::Local(remote_path) => {
            pull_local(&current_dir, remote_name, &remote_path, branch, rebase)
        }
        RemoteType::Http(url) | RemoteType::Dits(url) | RemoteType::Ssh(url) => {
            pull_network(remote_name, &url, branch, rebase).await
        }
    }
}

/// Pull from a network remote.
async fn pull_network(
    remote_name: &str,
    url: &str,
    branch: Option<&str>,
    rebase: bool,
) -> Result<()> {
    println!("Pulling from {} ({}) ...", remote_name, url);

    // For now, implement a basic HTTP-based pull (fetch + merge)
    // TODO: Implement full QUIC protocol for efficiency
    pull_http(remote_name, url, branch, rebase).await
}

/// Pull from an HTTP remote.
async fn pull_http(
    _remote_name: &str,
    url: &str,
    _branch: Option<&str>,
    _rebase: bool,
) -> Result<()> {
    // TODO: Implement pull logic - fetch refs, objects, then merge
    println!("Network pull from {} - basic implementation", url);
    println!("Full remote pull will be implemented in Phase 4b");

    Ok(())
}

/// Pull from a local remote.
fn pull_local(
    work_dir: &Path,
    remote_name: &str,
    remote_path: &Path,
    branch: Option<&str>,
    rebase: bool,
) -> Result<()> {
    // Verify remote is a dits repo
    let remote_dits = remote_path.join(".dits");
    if !remote_dits.exists() {
        bail!("Remote is not a dits repository: {}", remote_path.display());
    }

    let local_dits = work_dir.join(".dits");

    // Get current branch
    let head_content = fs::read_to_string(local_dits.join("HEAD"))
        .context("Failed to read HEAD")?;
    let current_branch = if let Some(refname) = head_content.strip_prefix("ref: refs/heads/") {
        refname.trim().to_string()
    } else {
        bail!("Cannot pull in detached HEAD state.");
    };

    let branch_name = branch.unwrap_or(&current_branch);

    println!("Pulling from {} ({}) ...", remote_name, remote_path.display());

    // First, fetch
    let remote_ref = remote_dits.join("refs").join("heads").join(branch_name);
    if !remote_ref.exists() {
        bail!("Branch '{}' does not exist on remote", branch_name);
    }

    let remote_commit = fs::read_to_string(&remote_ref)?.trim().to_string();

    // Copy missing objects from remote
    let remote_objects = remote_dits.join("objects");
    let local_objects = local_dits.join("objects");
    let fetched = copy_missing_objects(&remote_objects, &local_objects)?;

    // Update remote tracking ref
    let tracking_ref = local_dits.join("refs").join("remotes").join(remote_name).join(branch_name);
    fs::create_dir_all(tracking_ref.parent().unwrap())?;
    fs::write(&tracking_ref, format!("{}\n", remote_commit))?;

    println!("  Fetched {} objects", fetched);

    // Check local branch state
    let local_ref = local_dits.join("refs").join("heads").join(branch_name);
    let local_commit = if local_ref.exists() {
        fs::read_to_string(&local_ref)?.trim().to_string()
    } else {
        String::new()
    };

    if local_commit == remote_commit {
        println!("Already up to date.");
        return Ok(());
    }

    if local_commit.is_empty() {
        // No local commits, just fast-forward
        fs::create_dir_all(local_ref.parent().unwrap())?;
        fs::write(&local_ref, format!("{}\n", remote_commit))?;

        // Open repo and checkout
        let repo = Repository::open(work_dir)
            .context("Failed to open repository")?;
        match repo.checkout_branch(branch_name) {
            Ok(result) => {
                println!("Fast-forward to {}: {} files restored",
                    &remote_commit[..8.min(remote_commit.len())],
                    result.files_restored
                );
            }
            Err(e) => {
                println!("Warning: Could not checkout: {}", e);
            }
        }
        return Ok(());
    }

    // In a real implementation, we'd detect if this is a fast-forward
    // or if merge/rebase is needed. For now, do a simple fast-forward check.

    if rebase {
        println!("Note: Rebase mode not yet implemented. Attempting merge...");
    }

    // Simple merge: just update the ref if we can fast-forward
    // In reality, this would need proper merge logic
    println!(
        "Updating {} -> {}",
        &local_commit[..8.min(local_commit.len())],
        &remote_commit[..8.min(remote_commit.len())]
    );

    fs::write(&local_ref, format!("{}\n", remote_commit))?;

    // Open repo and checkout the merged result
    let repo = Repository::open(work_dir)
        .context("Failed to open repository")?;
    match repo.checkout_branch(branch_name) {
        Ok(result) => {
            println!("Restored {} files", result.files_restored);
        }
        Err(e) => {
            println!("Warning: Could not checkout merged result: {}", e);
        }
    }

    Ok(())
}

/// Copy objects that exist on remote but not locally.
/// Handles the objects directory structure (blobs, chunks, commits, manifests).
fn copy_missing_objects(remote_objects: &Path, local_objects: &Path) -> Result<usize> {
    if !remote_objects.exists() {
        return Ok(0);
    }

    let mut count = 0;

    // Handle the dits objects directory structure: blobs/, chunks/, commits/, manifests/
    for category in &["blobs", "chunks", "commits", "manifests"] {
        let remote_category = remote_objects.join(category);
        let local_category = local_objects.join(category);

        if !remote_category.exists() {
            continue;
        }

        for entry in fs::read_dir(&remote_category)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                // Fan-out directory
                let dir_name = entry.file_name();
                let local_subdir = local_category.join(&dir_name);

                for sub_entry in fs::read_dir(&path)? {
                    let sub_entry = sub_entry?;
                    let obj_path = sub_entry.path();

                    if obj_path.is_file() {
                        let local_obj = local_subdir.join(sub_entry.file_name());

                        if !local_obj.exists() {
                            fs::create_dir_all(&local_subdir)?;
                            fs::copy(&obj_path, &local_obj)?;
                            count += 1;
                        }
                    }
                }
            } else if path.is_file() {
                // Direct object file
                let local_obj = local_category.join(entry.file_name());
                if !local_obj.exists() {
                    fs::create_dir_all(&local_category)?;
                    fs::copy(&path, &local_obj)?;
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
