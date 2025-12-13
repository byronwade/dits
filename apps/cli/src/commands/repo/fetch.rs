//! Fetch command - download objects and refs from a remote repository.

use anyhow::{Result, bail};
use crate::store::remote::{RemoteStore, RemoteType};
use std::fs;
use std::path::Path;

/// Fetch from a remote.
pub fn fetch(
    remote_name: Option<&str>,
    all: bool,
    prune: bool,
) -> Result<()> {
    let dits_dir = std::path::Path::new(".dits");
    if !dits_dir.exists() {
        bail!("Not a dits repository");
    }

    let remotes = RemoteStore::new(dits_dir);

    if all {
        // Fetch from all remotes
        let remote_list: Vec<_> = remotes.list().map(|r| r.name.clone()).collect();
        if remote_list.is_empty() {
            println!("No remotes configured.");
            return Ok(());
        }

        for name in remote_list {
            if let Some(remote) = remotes.get(&name) {
                println!("Fetching from {} ...", name);
                if let Err(e) = fetch_from_remote(&name, &remote.url, prune) {
                    println!("  Error: {}", e);
                }
            }
        }
    } else {
        let remote_name = remote_name.unwrap_or("origin");
        let remote = remotes.get(remote_name)
            .ok_or_else(|| anyhow::anyhow!("Remote '{}' not found", remote_name))?;

        println!("Fetching from {} ...", remote_name);
        fetch_from_remote(remote_name, &remote.url, prune)?;
    }

    Ok(())
}

/// Fetch from a specific remote.
fn fetch_from_remote(remote_name: &str, url: &str, prune: bool) -> Result<()> {
    let remote_type = RemoteType::parse(url);

    match remote_type {
        RemoteType::Local(remote_path) => {
            fetch_local(remote_name, &remote_path, prune)
        }
        RemoteType::Http(url) | RemoteType::Dits(url) | RemoteType::Ssh(url) => {
            bail!(
                "Network fetch not yet implemented.\n\
                 URL: {}\n\n\
                 For now, use local paths for testing.",
                url
            )
        }
    }
}

/// Fetch from a local remote.
fn fetch_local(remote_name: &str, remote_path: &Path, prune: bool) -> Result<()> {
    // Verify remote is a dits repo
    let remote_dits = remote_path.join(".dits");
    if !remote_dits.exists() {
        bail!("Remote is not a dits repository: {}", remote_path.display());
    }

    let local_dits = std::path::Path::new(".dits");

    // Fetch all branches from remote
    let remote_refs = remote_dits.join("refs").join("heads");
    let local_remote_refs = local_dits.join("refs").join("remotes").join(remote_name);

    let mut fetched_branches = 0;
    let mut fetched_objects = 0;

    if remote_refs.exists() {
        for entry in fs::read_dir(&remote_refs)? {
            let entry = entry?;
            if entry.file_type()?.is_file() {
                let branch_name = entry.file_name();
                let remote_ref = entry.path();
                let local_ref = local_remote_refs.join(&branch_name);

                let remote_commit = fs::read_to_string(&remote_ref)?.trim().to_string();

                // Check if we already have this commit
                let needs_update = if local_ref.exists() {
                    let local_commit = fs::read_to_string(&local_ref)?.trim().to_string();
                    local_commit != remote_commit
                } else {
                    true
                };

                if needs_update {
                    fs::create_dir_all(&local_remote_refs)?;
                    fs::write(&local_ref, format!("{}\n", remote_commit))?;
                    fetched_branches += 1;

                    println!(
                        "  {} -> {}/{}",
                        &remote_commit[..8.min(remote_commit.len())],
                        remote_name,
                        branch_name.to_string_lossy()
                    );
                }
            }
        }
    }

    // Fetch tags
    let remote_tags = remote_dits.join("refs").join("tags");
    let local_tags = local_dits.join("refs").join("tags");

    if remote_tags.exists() {
        for entry in fs::read_dir(&remote_tags)? {
            let entry = entry?;
            if entry.file_type()?.is_file() {
                let tag_name = entry.file_name();
                let remote_tag = entry.path();
                let local_tag = local_tags.join(&tag_name);

                if !local_tag.exists() {
                    let tag_content = fs::read_to_string(&remote_tag)?;
                    fs::create_dir_all(&local_tags)?;
                    fs::write(&local_tag, &tag_content)?;
                    println!("  * [new tag] {}", tag_name.to_string_lossy());
                }
            }
        }
    }

    // Copy missing objects
    let remote_objects = remote_dits.join("objects");
    let local_objects = local_dits.join("objects");
    fetched_objects = copy_missing_objects(&remote_objects, &local_objects)?;

    // Prune stale remote-tracking refs
    if prune && local_remote_refs.exists() {
        for entry in fs::read_dir(&local_remote_refs)? {
            let entry = entry?;
            if entry.file_type()?.is_file() {
                let branch_name = entry.file_name();
                let remote_ref = remote_refs.join(&branch_name);

                if !remote_ref.exists() {
                    fs::remove_file(entry.path())?;
                    println!(
                        "  - [deleted] {}/{}",
                        remote_name,
                        branch_name.to_string_lossy()
                    );
                }
            }
        }
    }

    if fetched_branches > 0 || fetched_objects > 0 {
        println!(
            "Fetched {} ref(s), {} object(s) from {}",
            fetched_branches, fetched_objects, remote_name
        );
    } else {
        println!("Already up to date.");
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
