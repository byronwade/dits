//! Sync command - bi-directional synchronization with remote repository.
//!
//! This command performs intelligent bi-directional sync between local and
//! remote repositories, handling conflicts and ensuring both repositories end
//! up with the same state.

use anyhow::Result;

use crate::{
    core::Hash,
    store::{
        remote::{RemoteStore, RemoteType},
        Repository,
    },
};

/// Returns true if `ancestor` is reachable from `descendant` by following
/// parent links. A commit is considered its own ancestor. Used to decide
/// whether a sync can fast-forward safely or whether the branches have
/// diverged.
fn is_ancestor(repo: &Repository, ancestor: &Hash, descendant: &Hash) -> Result<bool> {
    let mut stack = vec![*descendant];
    let mut seen = std::collections::HashSet::new();
    while let Some(h) = stack.pop() {
        if h == *ancestor {
            return Ok(true);
        }
        if !seen.insert(h) {
            continue;
        }
        let commit = repo.load_commit(&h)?;
        if let Some(p) = commit.parent {
            stack.push(p);
        }
        for p in &commit.parents {
            stack.push(*p);
        }
    }
    Ok(false)
}

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
    let remote = remotes
        .get(remote_name)
        .ok_or_else(|| anyhow::anyhow!("Remote '{}' not found", remote_name))?;

    let remote_type = RemoteType::parse(&remote.url);

    match remote_type {
        RemoteType::Local(remote_path) => {
            sync_local(&repo, remote_name, &remote_path, branch, force, dry_run).await
        },
        RemoteType::Http(url) | RemoteType::Dits(url) | RemoteType::Ssh(url) => {
            sync_network(&repo, remote_name, &url, branch, force, dry_run).await
        },
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
    crate::commands::repo::fetch::fetch_from_remote(
        remote_name,
        &remote_path.to_string_lossy(),
        false,
    )
    .await?;

    // Step 2: Check for conflicts and merge
    let remote_ref = format!("remotes/{}/{}", remote_name, branch_name);
    if let Some(remote_commit) = repo.resolve_ref_or_prefix(&remote_ref)? {
        let local_ref = format!("refs/heads/{}", branch_name);
        if let Some(local_commit) = repo.resolve_ref_or_prefix(&local_ref).ok().flatten() {
            if local_commit != remote_commit {
                if is_ancestor(repo, &local_commit, &remote_commit)? {
                    // Remote is strictly ahead: fast-forward is safe (no local commits lost).
                    repo.refs().set_branch(branch_name, &remote_commit)?;
                    println!("✓ Fast-forwarded local branch to {}", &remote_commit.to_hex()[..8]);
                } else if is_ancestor(repo, &remote_commit, &local_commit)? {
                    // Local is strictly ahead: nothing to pull, local already has remote's history.
                    println!("✓ Local branch is ahead of remote; nothing to merge locally");
                } else if force {
                    // Diverged, but the caller explicitly accepted discarding local commits.
                    repo.refs().set_branch(branch_name, &remote_commit)?;
                    println!(
                        "⚠ Local and remote diverged; --force discarded local commits, now at {}",
                        &remote_commit.to_hex()[..8]
                    );
                } else {
                    // Diverged without --force: refuse rather than silently lose local work.
                    anyhow::bail!(
                        "Local and remote branch '{}' have diverged.\n  Refusing to overwrite \
                         local commits (this would lose local work).\n  Re-run with --force to \
                         discard local changes, or merge manually first.",
                        branch_name
                    );
                }
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

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::*;

    #[test]
    fn is_ancestor_follows_parent_chain() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        fs::write(temp.path().join("a.txt"), b"a").unwrap();
        repo.add("a.txt").unwrap();
        let c1 = repo.commit("c1").unwrap();

        fs::write(temp.path().join("b.txt"), b"b").unwrap();
        repo.add("b.txt").unwrap();
        let c2 = repo.commit("c2").unwrap();

        // c1 is an ancestor of c2, but not vice versa.
        assert!(is_ancestor(&repo, &c1.hash, &c2.hash).unwrap());
        assert!(!is_ancestor(&repo, &c2.hash, &c1.hash).unwrap());
        // A commit is its own ancestor.
        assert!(is_ancestor(&repo, &c1.hash, &c1.hash).unwrap());
    }
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
