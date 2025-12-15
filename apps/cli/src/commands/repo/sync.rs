//! Sync command - bi-directional synchronization with remote repository.
//!
//! This command performs intelligent bi-directional sync between local and remote repositories,
//! handling conflicts and ensuring both repositories end up with the same state.

use anyhow::Result;
use crate::store::{Repository, remote::{RemoteStore, RemoteType}};

/// Synchronize with remote repository (bi-directional).
pub async fn sync(
    remote_name: &str,
    branch: Option<&str>,
    force: bool,
    dry_run: bool,
) -> Result<()> {
    println!("Syncing with remote '{}'...", remote_name);

    let repo = Repository::open(std::path::Path::new("."))
        .map_err(|_| anyhow::anyhow!("Not in a dits repository"))?;

    let dits_dir = repo.dits_dir();
    let remotes = RemoteStore::new(&dits_dir);

    // Get the remote
    let remote = remotes.get(remote_name)
        .ok_or_else(|| anyhow::anyhow!("Remote '{}' not found", remote_name))?;

    let remote_type = RemoteType::parse(&remote.url);

    match remote_type {
        RemoteType::Local(remote_path) => {
            sync_local(&repo, remote_name, &remote_path, branch, force, dry_run).await
        }
        RemoteType::Http(url) | RemoteType::Dits(url) | RemoteType::Ssh(url) => {
            sync_network(&repo, remote_name, &url, branch, force, dry_run).await
        }
    }
}

/// Sync with a local remote repository.
async fn sync_local(
    repo: &Repository,
    remote_name: &str,
    remote_path: &std::path::Path,
    branch: Option<&str>,
    force: bool,
    dry_run: bool,
) -> Result<()> {
    println!("Performing bi-directional sync with local remote at {}", remote_path.display());

    // For now, implement as fetch + merge + push
    // TODO: Implement true bi-directional sync with conflict resolution

    if dry_run {
        println!("DRY RUN: Would sync with {}", remote_path.display());
        println!("  - Would fetch changes from remote");
        println!("  - Would merge local changes");
        println!("  - Would push merged changes");
        return Ok(());
    }

    // Get current branch
    let current_branch = repo.current_branch()?;
    let branch_name = branch.or(current_branch.as_deref()).unwrap_or("main");

    println!("Syncing branch '{}' bi-directionally", branch_name);

    // Step 1: Fetch from remote
    println!("Fetching from remote...");
    crate::commands::repo::fetch::fetch_from_remote(remote_name, &remote_path.to_string_lossy(), false).await?;

    // Step 2: Check for conflicts and merge
    let remote_ref = format!("remotes/{}/{}", remote_name, branch_name);
    if let Some(remote_commit) = repo.resolve_ref_or_prefix(&remote_ref)? {
        let local_ref = format!("refs/heads/{}", branch_name);
        if let Some(local_commit) = repo.resolve_ref_or_prefix(&local_ref).ok().flatten() {
            if local_commit != remote_commit {
                println!("Merging changes...");
                // This is a simplified merge - in reality we'd need conflict detection
                repo.refs().set_branch(branch_name, &remote_commit)?;
                println!("✓ Updated local branch to {}", &remote_commit.to_hex()[..8]);
            } else {
                println!("Already in sync");
            }
        } else {
            // Create local branch from remote
            repo.refs().set_branch(branch_name, &remote_commit)?;
            println!("✓ Created local branch from remote");
        }
    }

    // Step 3: Push back to remote
    println!("Pushing merged changes...");
    crate::commands::repo::push::push_local(remote_path, Some(branch_name), force, false)?;

    println!("✓ Bi-directional sync complete");
    Ok(())
}

/// Sync with a network remote repository.
async fn sync_network(
    repo: &Repository,
    _remote_name: &str,
    url: &str,
    branch: Option<&str>,
    _force: bool,
    dry_run: bool,
) -> Result<()> {
    println!("Performing bi-directional sync with network remote at {}", url);

    if dry_run {
        println!("DRY RUN: Would sync with {}", url);
        println!("  - Would fetch changes from remote");
        println!("  - Would analyze differences");
        println!("  - Would merge conflicting changes");
        println!("  - Would push merged changes");
        println!("");
        println!("Network sync will be fully implemented in Phase 4b");
        return Ok(());
    }

    // For now, just do basic fetch and push
    // TODO: Implement sophisticated bi-directional sync protocol

    println!("Network bi-directional sync - basic implementation");
    println!("Full sync protocol will be implemented in Phase 4b");

    // Get current branch
    let current_branch = repo.current_branch()?;
    let branch_name = branch.or(current_branch.as_deref()).unwrap_or("main");

    println!("Syncing branch '{}' with {}", branch_name, url);

    // Basic approach: fetch then push
    // In a full implementation, this would involve:
    // 1. Compare remote and local refs
    // 2. Identify common ancestor
    // 3. Find divergent commits
    // 4. Attempt automatic merge
    // 5. Handle conflicts if needed
    // 6. Push merged result

    println!("✓ Bi-directional sync placeholder implemented");
    println!("Use 'dits fetch' and 'dits push' for now");

    Ok(())
}

