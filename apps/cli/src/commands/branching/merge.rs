//! Merge command implementation.

use crate::core::{Author, Commit, Hash, Manifest, ManifestEntry};
use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::collections::HashSet;
use std::path::Path;

/// Merge result types.
#[derive(Debug)]
pub enum MergeResult {
    /// Already up to date.
    AlreadyUpToDate,
    /// Fast-forward merge completed.
    FastForward { commits_merged: usize },
    /// Merge commit created.
    Merged { merge_commit: Hash },
    /// Merge has conflicts.
    Conflict { conflicts: Vec<MergeConflict> },
}

/// A merge conflict.
#[derive(Debug)]
pub struct MergeConflict {
    /// Path of the conflicting file.
    pub path: String,
    /// Type of conflict.
    pub conflict_type: ConflictType,
}

/// Types of merge conflicts.
#[derive(Debug)]
pub enum ConflictType {
    /// Both sides modified the same file differently.
    BothModified,
    /// One side deleted, other modified.
    ModifyDelete,
    /// Both sides added different files at the same path.
    BothAdded,
}

/// Merge a branch into the current branch.
pub fn merge(branch: &str, message: Option<&str>) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    // Check we're on a branch
    let current_branch = repo
        .current_branch()?
        .context("Cannot merge: HEAD is detached. Switch to a branch first.")?;

    // Resolve target branch
    let their_hash = repo
        .refs()
        .get_branch(branch)?
        .with_context(|| format!("Branch '{}' not found", branch))?;

    // Get our HEAD
    let our_hash = repo
        .head()?
        .context("No commits yet - nothing to merge into")?;

    // Check if already up to date
    if our_hash == their_hash {
        println!(
            "{} Already up to date.",
            style("!").yellow().bold()
        );
        return Ok(());
    }

    // Find merge base
    let merge_base = find_merge_base(&repo, &our_hash, &their_hash)?;

    // Check for fast-forward
    if let Some(base) = &merge_base {
        if *base == our_hash {
            // Their branch is ahead - fast-forward
            return fast_forward_merge(&repo, &current_branch, &their_hash, branch);
        }
        if *base == their_hash {
            // We're ahead - already up to date
            println!(
                "{} Already up to date.",
                style("!").yellow().bold()
            );
            return Ok(());
        }
    }

    // Check for conflicts
    let conflicts = detect_conflicts(&repo, merge_base.as_ref(), &our_hash, &their_hash)?;

    if !conflicts.is_empty() {
        // Report conflicts
        println!(
            "{} Merge conflict detected!",
            style("!").red().bold()
        );
        println!();
        println!("Conflicting files:");
        for conflict in &conflicts {
            let conflict_desc = match conflict.conflict_type {
                ConflictType::BothModified => "both modified",
                ConflictType::ModifyDelete => "modify/delete",
                ConflictType::BothAdded => "both added",
            };
            println!(
                "  {} ({}: {})",
                style(&conflict.path).cyan(),
                style(conflict_desc).yellow(),
                "binary files cannot be auto-merged"
            );
        }
        println!();
        println!(
            "{}",
            style("Automatic merge failed. Resolve conflicts manually.").red()
        );
        println!("Use 'dits checkout --ours <file>' or 'dits checkout --theirs <file>' to resolve.");
        return Ok(());
    }

    // Perform three-way merge
    three_way_merge(
        &repo,
        &current_branch,
        merge_base.as_ref(),
        &our_hash,
        &their_hash,
        branch,
        message,
    )
}

/// Fast-forward merge.
fn fast_forward_merge(
    repo: &Repository,
    current_branch: &str,
    target_hash: &Hash,
    target_branch: &str,
) -> Result<()> {
    // Count commits being merged
    let commits_merged = count_commits_between(repo, &repo.head()?.unwrap(), target_hash)?;

    // Update branch ref
    repo.refs().set_branch(current_branch, target_hash)?;

    // Checkout the new state
    repo.checkout(target_hash)?;

    println!(
        "{} Fast-forward merge: {} -> {}",
        style("->").green().bold(),
        style(current_branch).cyan(),
        style(target_branch).cyan()
    );
    println!(
        "   {} commit{} merged",
        commits_merged,
        if commits_merged == 1 { "" } else { "s" }
    );

    Ok(())
}

/// Three-way merge (when histories have diverged).
fn three_way_merge(
    repo: &Repository,
    current_branch: &str,
    base: Option<&Hash>,
    ours: &Hash,
    theirs: &Hash,
    their_branch: &str,
    message: Option<&str>,
) -> Result<()> {
    // Load manifests
    let our_commit = repo.objects().load_commit(ours)?;
    let their_commit = repo.objects().load_commit(theirs)?;
    let our_manifest = repo.objects().load_manifest(&our_commit.manifest)?;
    let their_manifest = repo.objects().load_manifest(&their_commit.manifest)?;
    let base_manifest = if let Some(b) = base {
        let base_commit = repo.objects().load_commit(b)?;
        Some(repo.objects().load_manifest(&base_commit.manifest)?)
    } else {
        None
    };

    // Merge manifests
    let merged_manifest = merge_manifests(base_manifest.as_ref(), &our_manifest, &their_manifest)?;

    // Store merged manifest
    let manifest_hash = repo.objects().store_manifest(&merged_manifest)?;

    // Create merge commit
    let author = Author::from_env();
    let commit_message = message
        .filter(|m| !m.trim().is_empty())
        .map(|m| m.to_string())
        .unwrap_or_else(|| format!("Merge branch '{}' into {}", their_branch, current_branch));
    let commit = Commit::new_merge(*ours, vec![*theirs], manifest_hash, commit_message, author);

    // Store commit
    repo.objects().store_commit(&commit)?;

    // Update branch ref
    repo.refs().set_branch(current_branch, &commit.hash)?;

    // Checkout merged state
    repo.checkout(&commit.hash)?;

    println!(
        "{} Merged '{}' into '{}'",
        style("M").green().bold(),
        style(their_branch).cyan(),
        style(current_branch).cyan()
    );
    println!(
        "   Merge commit: {}",
        &commit.hash.to_hex()[..8]
    );

    Ok(())
}

/// Find the merge base (common ancestor) of two commits.
fn find_merge_base(repo: &Repository, a: &Hash, b: &Hash) -> Result<Option<Hash>> {
    // Collect all ancestors of a
    let ancestors_a = collect_ancestors(repo, a)?;

    // Walk ancestors of b until we find one in ancestors_a
    let mut queue = vec![*b];
    let mut visited = HashSet::new();

    while let Some(current) = queue.pop() {
        if ancestors_a.contains(&current) {
            return Ok(Some(current));
        }

        if visited.contains(&current) {
            continue;
        }
        visited.insert(current);

        // Add parents to queue
        let commit = repo.objects().load_commit(&current)?;
        for parent in commit.all_parents() {
            queue.push(parent);
        }
    }

    Ok(None)
}

/// Collect all ancestors of a commit.
fn collect_ancestors(repo: &Repository, start: &Hash) -> Result<HashSet<Hash>> {
    let mut ancestors = HashSet::new();
    let mut queue = vec![*start];

    while let Some(current) = queue.pop() {
        if ancestors.contains(&current) {
            continue;
        }
        ancestors.insert(current);

        let commit = repo.objects().load_commit(&current)?;
        for parent in commit.all_parents() {
            queue.push(parent);
        }
    }

    Ok(ancestors)
}

/// Count commits between two points.
fn count_commits_between(repo: &Repository, from: &Hash, to: &Hash) -> Result<usize> {
    let ancestors_from = collect_ancestors(repo, from)?;
    let mut count = 0;
    let mut current = Some(*to);

    while let Some(hash) = current {
        if ancestors_from.contains(&hash) || hash == *from {
            break;
        }
        count += 1;
        let commit = repo.objects().load_commit(&hash)?;
        current = commit.parent;
    }

    Ok(count)
}

/// Detect merge conflicts between two branches.
fn detect_conflicts(
    repo: &Repository,
    base: Option<&Hash>,
    ours: &Hash,
    theirs: &Hash,
) -> Result<Vec<MergeConflict>> {
    let our_commit = repo.objects().load_commit(ours)?;
    let their_commit = repo.objects().load_commit(theirs)?;
    let our_manifest = repo.objects().load_manifest(&our_commit.manifest)?;
    let their_manifest = repo.objects().load_manifest(&their_commit.manifest)?;

    let base_manifest = if let Some(b) = base {
        let base_commit = repo.objects().load_commit(b)?;
        Some(repo.objects().load_manifest(&base_commit.manifest)?)
    } else {
        None
    };

    let mut conflicts = Vec::new();

    // Get all paths from both sides
    let mut all_paths: HashSet<String> = HashSet::new();
    for path in our_manifest.entries.keys() {
        all_paths.insert(path.clone());
    }
    for path in their_manifest.entries.keys() {
        all_paths.insert(path.clone());
    }

    for path in all_paths {
        let in_base = base_manifest.as_ref().and_then(|m| m.entries.get(&path));
        let in_ours = our_manifest.entries.get(&path);
        let in_theirs = their_manifest.entries.get(&path);

        match (in_base, in_ours, in_theirs) {
            // Both modified differently
            (Some(base_entry), Some(our_entry), Some(their_entry)) => {
                let our_changed = our_entry.content_hash != base_entry.content_hash;
                let their_changed = their_entry.content_hash != base_entry.content_hash;
                let same_result = our_entry.content_hash == their_entry.content_hash;

                if our_changed && their_changed && !same_result {
                    conflicts.push(MergeConflict {
                        path: path.clone(),
                        conflict_type: ConflictType::BothModified,
                    });
                }
            }

            // One deleted, other modified
            (Some(base_entry), Some(our_entry), None) => {
                if our_entry.content_hash != base_entry.content_hash {
                    conflicts.push(MergeConflict {
                        path: path.clone(),
                        conflict_type: ConflictType::ModifyDelete,
                    });
                }
            }
            (Some(base_entry), None, Some(their_entry)) => {
                if their_entry.content_hash != base_entry.content_hash {
                    conflicts.push(MergeConflict {
                        path: path.clone(),
                        conflict_type: ConflictType::ModifyDelete,
                    });
                }
            }

            // Both added (no base)
            (None, Some(our_entry), Some(their_entry)) => {
                if our_entry.content_hash != their_entry.content_hash {
                    conflicts.push(MergeConflict {
                        path: path.clone(),
                        conflict_type: ConflictType::BothAdded,
                    });
                }
            }

            // No conflict cases
            _ => {}
        }
    }

    Ok(conflicts)
}

/// Merge two manifests using three-way merge strategy.
fn merge_manifests(
    base: Option<&Manifest>,
    ours: &Manifest,
    theirs: &Manifest,
) -> Result<Manifest> {
    let mut result = Manifest::new();

    // Get all paths
    let mut all_paths: HashSet<String> = HashSet::new();
    if let Some(b) = base {
        for path in b.entries.keys() {
            all_paths.insert(path.clone());
        }
    }
    for path in ours.entries.keys() {
        all_paths.insert(path.clone());
    }
    for path in theirs.entries.keys() {
        all_paths.insert(path.clone());
    }

    for path in all_paths {
        let in_base = base.and_then(|m| m.entries.get(&path));
        let in_ours = ours.entries.get(&path);
        let in_theirs = theirs.entries.get(&path);

        // Determine which version to use
        let entry_to_use: Option<&ManifestEntry> = match (in_base, in_ours, in_theirs) {
            // Both have it, same content - use ours
            (_, Some(o), Some(t)) if o.content_hash == t.content_hash => Some(o),

            // Only one side changed from base - use the changed side
            (Some(b), Some(o), Some(t)) => {
                let our_changed = o.content_hash != b.content_hash;
                let their_changed = t.content_hash != b.content_hash;
                match (our_changed, their_changed) {
                    (true, false) => Some(o),  // We changed, they didn't
                    (false, true) => Some(t),  // They changed, we didn't
                    (false, false) => Some(o), // Neither changed
                    (true, true) => Some(o),   // Both changed (conflict should have been caught)
                }
            }

            // File deleted on one side, unchanged on other - delete
            (Some(b), Some(o), None) if o.content_hash == b.content_hash => None,
            (Some(b), None, Some(t)) if t.content_hash == b.content_hash => None,

            // File deleted on one side, modified on other - keep modified (conflict)
            (Some(_), Some(o), None) => Some(o),
            (Some(_), None, Some(t)) => Some(t),

            // New file added on one side only
            (None, Some(o), None) => Some(o),
            (None, None, Some(t)) => Some(t),

            // Same file added on both sides - use ours if same, otherwise conflict
            (None, Some(o), Some(_)) => Some(o),

            // File only in base (both deleted) - don't include
            (Some(_), None, None) => None,

            // Shouldn't happen
            (None, None, None) => None,
        };

        if let Some(entry) = entry_to_use {
            result.add(entry.clone());
        }
    }

    Ok(result)
}
