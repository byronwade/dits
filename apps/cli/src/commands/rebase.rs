//! Rebase command - reapply commits on top of another base.

use crate::core::{Author, Commit, Index, IndexEntry};
use crate::store::Repository;
use anyhow::{Context, Result, bail};
use console::style;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// Rebase state for interrupted rebases.
#[derive(Debug, Serialize, Deserialize)]
struct RebaseState {
    /// Original branch/commit we started from.
    original_head: String,
    /// Target base commit.
    onto: crate::core::Hash,
    /// Commits to apply (in order).
    commits_to_apply: Vec<crate::core::Hash>,
    /// Current index in commits_to_apply.
    current_index: usize,
}

/// Rebase current branch onto another.
pub fn rebase(
    upstream: Option<&str>,
    onto: Option<&str>,
    continue_rebase: bool,
    abort: bool,
    skip: bool,
) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    let rebase_dir = repo.dits_dir().join("rebase-merge");

    if abort {
        return abort_rebase(&repo, &rebase_dir);
    }

    if continue_rebase {
        return continue_rebase_op(&repo, &rebase_dir);
    }

    if skip {
        return skip_commit(&repo, &rebase_dir);
    }

    // Start new rebase
    let upstream = upstream.context("Please specify the upstream branch to rebase onto")?;

    // Resolve upstream
    let upstream_hash = repo.resolve_ref_or_prefix(upstream)?
        .with_context(|| format!("Could not resolve '{}' to a commit", upstream))?;

    // Get current HEAD
    let head_hash = repo.head()?
        .context("No commits yet - nothing to rebase")?;

    // Find the merge base (for now, just use upstream as base)
    let base_hash = if let Some(onto_ref) = onto {
        repo.resolve_ref_or_prefix(onto_ref)?
            .with_context(|| format!("Could not resolve '{}' to a commit", onto_ref))?
    } else {
        upstream_hash
    };

    // Collect commits to rebase (from base to HEAD)
    let commits_to_rebase = collect_commits_to_rebase(&repo, &head_hash, &upstream_hash)?;

    if commits_to_rebase.is_empty() {
        println!("{}", style("Current branch is up to date with upstream.").green());
        return Ok(());
    }

    println!(
        "{} Rebasing {} commit(s) onto {}...",
        style("→").blue(),
        commits_to_rebase.len(),
        &upstream_hash.to_hex()[..7]
    );
    println!();

    // Save original head
    let original_head = if let Some(branch) = repo.current_branch()? {
        branch
    } else {
        head_hash.to_hex()
    };

    // Create rebase state
    fs::create_dir_all(&rebase_dir)?;
    let state = RebaseState {
        original_head,
        onto: base_hash,
        commits_to_apply: commits_to_rebase.clone(),
        current_index: 0,
    };
    let state_json = serde_json::to_string_pretty(&state)?;
    fs::write(rebase_dir.join("state.json"), state_json)?;

    // Move HEAD to upstream
    repo.refs().set_head_detached(&upstream_hash)?;

    // Apply commits one by one
    apply_commits(&repo, &rebase_dir, &commits_to_rebase, 0)?;

    // If we get here, rebase completed successfully
    finish_rebase(&repo, &rebase_dir)?;

    Ok(())
}

/// Collect commits that need to be rebased.
fn collect_commits_to_rebase(
    repo: &Repository,
    head: &crate::core::Hash,
    upstream: &crate::core::Hash,
) -> Result<Vec<crate::core::Hash>> {
    let mut commits = Vec::new();
    let mut current = Some(*head);

    // Walk back from HEAD to find commits not in upstream
    while let Some(hash) = current {
        if hash == *upstream {
            break;
        }

        let commit = repo.load_commit(&hash)?;
        commits.push(hash);
        current = commit.parent;
    }

    // Reverse to apply in chronological order
    commits.reverse();
    Ok(commits)
}

/// Apply commits starting from given index.
fn apply_commits(
    repo: &Repository,
    rebase_dir: &Path,
    commits: &[crate::core::Hash],
    start_index: usize,
) -> Result<()> {
    for (i, commit_hash) in commits.iter().enumerate().skip(start_index) {
        let commit = repo.load_commit(commit_hash)?;
        let commit_manifest = repo.load_manifest(&commit.manifest)?;

        println!(
            "Rebasing ({}/{}): {}",
            i + 1,
            commits.len(),
            commit.message.lines().next().unwrap_or(&commit.message)
        );

        // Get current HEAD
        let current_head = repo.head()?.context("Lost HEAD during rebase")?;

        // Get parent manifest for this commit
        let parent_manifest = if let Some(parent_hash) = commit.parent {
            let parent_commit = repo.load_commit(&parent_hash)?;
            Some(repo.load_manifest(&parent_commit.manifest)?)
        } else {
            None
        };

        // Apply changes
        let current_commit = repo.load_commit(&current_head)?;
        let current_manifest = repo.load_manifest(&current_commit.manifest)?;

        // Build new index with applied changes
        let index_path = repo.dits_dir().join("index");
        let index_json = fs::read_to_string(&index_path)?;
        let mut index = Index::from_json(&index_json)?;

        let mut has_conflicts = false;

        for (path, entry) in commit_manifest.iter() {
            let was_in_parent = parent_manifest.as_ref()
                .and_then(|m| m.get(path));

            let is_new = was_in_parent.is_none();
            let is_modified = was_in_parent
                .map(|pe| pe.content_hash != entry.content_hash)
                .unwrap_or(false);

            if is_new || is_modified {
                // Apply the change
                let full_path = repo.root().join(path);

                if let Some(parent) = full_path.parent() {
                    fs::create_dir_all(parent)?;
                }

                let mut data = Vec::with_capacity(entry.size as usize);
                for chunk_ref in &entry.chunks {
                    let chunk = repo.objects().load_chunk(&chunk_ref.hash)?;
                    data.extend_from_slice(&chunk.data);
                }
                fs::write(&full_path, &data)?;

                let idx_entry = IndexEntry::new(
                    path.clone(),
                    entry.content_hash,
                    entry.size,
                    0,
                    entry.chunks.clone(),
                );
                index.stage(idx_entry);
            }
        }

        // Save index
        fs::write(&index_path, index.to_json())?;

        if has_conflicts {
            // Update state
            let mut state: RebaseState = serde_json::from_str(
                &fs::read_to_string(rebase_dir.join("state.json"))?
            )?;
            state.current_index = i;
            fs::write(
                rebase_dir.join("state.json"),
                serde_json::to_string_pretty(&state)?
            )?;

            println!();
            println!("{}", style("CONFLICT: Resolve conflicts and run:").red().bold());
            println!("  dits rebase --continue");
            println!("Or skip this commit with:");
            println!("  dits rebase --skip");
            println!("Or abort the rebase with:");
            println!("  dits rebase --abort");
            return Ok(());
        }

        // Create new commit
        let author = Author::from_env();
        let new_commit = Commit::new(
            Some(current_head),
            commit.manifest,
            &commit.message,
            author,
        );
        repo.objects().store_commit(&new_commit)?;
        repo.refs().set_head_detached(&new_commit.hash)?;

        // Update state
        let mut state: RebaseState = serde_json::from_str(
            &fs::read_to_string(rebase_dir.join("state.json"))?
        )?;
        state.current_index = i + 1;
        fs::write(
            rebase_dir.join("state.json"),
            serde_json::to_string_pretty(&state)?
        )?;
    }

    Ok(())
}

/// Continue a rebase after resolving conflicts.
fn continue_rebase_op(repo: &Repository, rebase_dir: &Path) -> Result<()> {
    if !rebase_dir.exists() {
        bail!("No rebase in progress");
    }

    let state: RebaseState = serde_json::from_str(
        &fs::read_to_string(rebase_dir.join("state.json"))?
    )?;

    // Continue from current index
    apply_commits(repo, rebase_dir, &state.commits_to_apply, state.current_index)?;

    // Check if complete
    let updated_state: RebaseState = serde_json::from_str(
        &fs::read_to_string(rebase_dir.join("state.json"))?
    )?;

    if updated_state.current_index >= updated_state.commits_to_apply.len() {
        finish_rebase(repo, rebase_dir)?;
    }

    Ok(())
}

/// Skip the current commit.
fn skip_commit(repo: &Repository, rebase_dir: &Path) -> Result<()> {
    if !rebase_dir.exists() {
        bail!("No rebase in progress");
    }

    let mut state: RebaseState = serde_json::from_str(
        &fs::read_to_string(rebase_dir.join("state.json"))?
    )?;

    let commit_str = state.commits_to_apply.get(state.current_index)
        .map(|h| h.to_hex()[..7].to_string())
        .unwrap_or_else(|| "unknown".to_string());
    println!(
        "{} Skipping commit {}",
        style("→").yellow(),
        commit_str
    );

    state.current_index += 1;
    fs::write(
        rebase_dir.join("state.json"),
        serde_json::to_string_pretty(&state)?
    )?;

    if state.current_index >= state.commits_to_apply.len() {
        finish_rebase(repo, rebase_dir)?;
    } else {
        apply_commits(repo, rebase_dir, &state.commits_to_apply, state.current_index)?;

        // Check if complete after applying
        let updated_state: RebaseState = serde_json::from_str(
            &fs::read_to_string(rebase_dir.join("state.json"))?
        )?;

        if updated_state.current_index >= updated_state.commits_to_apply.len() {
            finish_rebase(repo, rebase_dir)?;
        }
    }

    Ok(())
}

/// Abort the rebase.
fn abort_rebase(repo: &Repository, rebase_dir: &Path) -> Result<()> {
    if !rebase_dir.exists() {
        bail!("No rebase in progress");
    }

    let state: RebaseState = serde_json::from_str(
        &fs::read_to_string(rebase_dir.join("state.json"))?
    )?;

    // Restore original HEAD
    if let Ok(hash) = crate::core::Hash::from_hex(&state.original_head) {
        repo.refs().set_head_detached(&hash)?;
    } else {
        // It's a branch name
        repo.refs().set_head_branch(&state.original_head)?;
    }

    // Clean up
    fs::remove_dir_all(rebase_dir)?;

    println!(
        "{} Rebase aborted, returned to {}",
        style("→").yellow(),
        state.original_head
    );

    Ok(())
}

/// Finish the rebase successfully.
fn finish_rebase(repo: &Repository, rebase_dir: &Path) -> Result<()> {
    let state: RebaseState = serde_json::from_str(
        &fs::read_to_string(rebase_dir.join("state.json"))?
    )?;

    // If we started on a branch, update it to point to new HEAD
    if !state.original_head.chars().all(|c| c.is_ascii_hexdigit()) {
        // It's a branch name
        let new_head = repo.head()?.context("Lost HEAD")?;
        repo.refs().set_branch(&state.original_head, &new_head)?;
        repo.refs().set_head_branch(&state.original_head)?;
    }

    // Clean up
    fs::remove_dir_all(rebase_dir)?;

    println!();
    println!(
        "{} Successfully rebased onto {}",
        style("✓").green().bold(),
        &state.onto.to_hex()[..7]
    );

    Ok(())
}
