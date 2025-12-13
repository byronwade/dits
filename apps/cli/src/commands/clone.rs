//! Clone command - clone a repository from a source.

use anyhow::{Context, Result, bail};
use crate::store::{Repository, remote::{Remote, RemoteStore, RemoteType}};
use std::fs;
use std::path::{Path, PathBuf};

/// Clone a repository.
///
/// Currently supports local clones. Network clones will be added in future.
pub fn clone(source: &str, dest: Option<&str>, branch: Option<&str>) -> Result<()> {
    let source_type = RemoteType::parse(source);

    match source_type {
        RemoteType::Local(source_path) => {
            clone_local(&source_path, dest, branch)
        }
        RemoteType::Http(url) | RemoteType::Dits(url) | RemoteType::Ssh(url) => {
            bail!(
                "Network cloning not yet implemented.\n\
                 URL: {}\n\n\
                 For now, use local paths or copy the repository manually.",
                url
            )
        }
    }
}

/// Clone a local repository.
fn clone_local(source: &Path, dest: Option<&str>, branch: Option<&str>) -> Result<()> {
    // Resolve source path
    let source_path = if source.is_absolute() {
        source.to_path_buf()
    } else {
        std::env::current_dir()?.join(source)
    };

    // Verify source is a dits repo
    let source_dits = source_path.join(".dits");
    if !source_dits.exists() {
        bail!("Source is not a dits repository: {}", source_path.display());
    }

    // Determine destination directory
    let dest_path = if let Some(d) = dest {
        PathBuf::from(d)
    } else {
        // Use source directory name
        source_path.file_name()
            .map(|n| PathBuf::from(n))
            .ok_or_else(|| anyhow::anyhow!("Cannot determine destination name from source"))?
    };

    // Check destination doesn't exist
    if dest_path.exists() {
        bail!("Destination already exists: {}", dest_path.display());
    }

    println!("Cloning from {} into {}...", source_path.display(), dest_path.display());

    // Create destination directory
    fs::create_dir_all(&dest_path)?;

    // Initialize new repository
    let repo = Repository::init(&dest_path)
        .context("Failed to initialize destination repository")?;

    // Copy objects
    println!("Copying objects...");
    let source_objects = source_dits.join("objects");
    let dest_objects = dest_path.join(".dits").join("objects");
    copy_dir_recursive(&source_objects, &dest_objects)?;

    // Copy refs
    println!("Copying refs...");
    let source_refs = source_dits.join("refs");
    let dest_refs = dest_path.join(".dits").join("refs");
    if source_refs.exists() {
        copy_dir_recursive(&source_refs, &dest_refs)?;
    }

    // Copy HEAD
    let source_head = source_dits.join("HEAD");
    let dest_head = dest_path.join(".dits").join("HEAD");
    if source_head.exists() {
        fs::copy(&source_head, &dest_head)?;
    }

    // Set up origin remote
    let dest_dits = dest_path.join(".dits");
    let mut remotes = RemoteStore::new(&dest_dits);
    let abs_source = source_path.canonicalize()
        .unwrap_or_else(|_| source_path.clone());
    remotes.add(Remote::new("origin", abs_source.to_string_lossy().to_string()))?;

    // Checkout the specified branch or HEAD
    let target_branch = branch.unwrap_or("main");

    // Check if target branch exists
    let branch_ref = dest_path.join(".dits").join("refs").join("heads").join(target_branch);
    if branch_ref.exists() {
        // Set HEAD to the branch
        let head_content = format!("ref: refs/heads/{}\n", target_branch);
        fs::write(&dest_head, head_content)?;

        // Re-open repository to perform checkout
        let repo = Repository::open(&dest_path)
            .context("Failed to open cloned repository")?;

        // Checkout the files
        println!("Checking out branch '{}'...", target_branch);
        match repo.checkout_branch(target_branch) {
            Ok(result) => {
                println!(
                    "Cloned into '{}': {} files",
                    dest_path.display(),
                    result.files_restored
                );
            }
            Err(e) => {
                println!("Warning: Could not checkout files: {}", e);
                println!("Repository cloned, but working tree is empty.");
            }
        }
    } else {
        // No commits yet or branch doesn't exist
        println!("Cloned into '{}' (empty repository)", dest_path.display());
    }

    Ok(())
}

/// Recursively copy a directory.
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<()> {
    if !src.exists() {
        return Ok(());
    }

    fs::create_dir_all(dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if ty.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_clone_nonexistent_source() {
        let result = clone("/nonexistent/path", Some("/tmp/dest"), None);
        assert!(result.is_err());
    }
}
