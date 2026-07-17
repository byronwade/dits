//! Garbage collection command - clean up unreferenced objects.

use std::{collections::HashSet, fs, path::Path};

use anyhow::{bail, Context, Result};

use crate::{commands::branching::stash::StashList, core::Hash, store::Repository};

/// Run garbage collection.
pub fn gc(dry_run: bool, prune: bool, aggressive: bool) -> Result<()> {
    let repo =
        Repository::open_read_only(Path::new(".")).context("Could not open Dits repository")?;

    if !dry_run {
        bail!(
            "Destructive garbage collection is disabled in this alpha until reachability covers \
             every object type and deletion has a quarantine/grace period. Run `dits gc \
             --dry-run` for a read-only report. No objects or locks were changed."
        );
    }

    println!("Auditing garbage collection candidates (read-only)...");

    let mut stats = GcStats::default();

    // Step 1: Collect all reachable objects
    let reachable = collect_reachable_objects(&repo)?;
    stats.reachable_objects = reachable.len();

    // Step 2: Find unreferenced objects
    let objects_dir = repo.dits_dir().join("objects");
    let unreferenced = find_unreferenced_objects(&objects_dir, &reachable)?;
    stats.unreferenced_objects = unreferenced.len();

    // Step 3: Calculate space that would be freed
    for obj_path in &unreferenced {
        if let Ok(meta) = fs::metadata(obj_path) {
            stats.bytes_to_free += meta.len();
        }
    }

    if prune || aggressive {
        println!(
            "Note: --prune and --aggressive are ignored in read-only mode; no locks or objects \
             were changed."
        );
    }

    // Print summary
    println!();
    println!("Dry run - no changes made");
    println!();

    println!("Garbage collection summary:");
    println!("  Reachable objects: {}", stats.reachable_objects);
    println!("  Unreferenced objects: {}", stats.unreferenced_objects);

    if stats.bytes_to_free > 0 {
        let size_str = format_size(stats.bytes_to_free);
        println!("  Candidate space (not removed): {}", size_str);
    }

    Ok(())
}

/// Stats for garbage collection run.
#[derive(Default)]
struct GcStats {
    reachable_objects:    usize,
    unreferenced_objects: usize,
    bytes_to_free:        u64,
}

/// Collect every object hash reachable from any ref, by actually walking the
/// object graph: refs/HEAD/tags/index/stash -> commits -> parents -> manifest
/// -> per-entry content/chunks/mp4 blobs. (Git-text content lives in the git
/// engine, not `.dits/objects`, so it is never scanned for pruning here.)
fn collect_reachable_objects(repo: &Repository) -> Result<HashSet<String>> {
    let mut reachable: HashSet<String> = HashSet::new();
    let mut seen: HashSet<Hash> = HashSet::new();
    let mut stack: Vec<Hash> = Vec::new();

    // Roots: HEAD, every branch, every tag.
    if let Some(h) = repo.head()? {
        stack.push(h);
    }
    for branch in repo.list_branches()? {
        if let Some(h) = repo.refs().get_branch(&branch)? {
            stack.push(h);
        }
    }
    for tag in repo.refs().list_tags()? {
        if let Some(h) = repo.refs().get_tag(&tag)? {
            stack.push(h);
        }
    }
    // The staging index owns objects even before they appear in a commit.
    let index = repo.load_index_read_only()?;
    if let Some(base_commit) = index.base_commit {
        stack.push(base_commit);
    }
    for entry in index.entries.values() {
        reachable.insert(entry.content_hash.to_hex());
        for chunk in &entry.chunks {
            reachable.insert(chunk.hash.to_hex());
        }
        if let Some(mp4) = &entry.mp4_metadata {
            if let Some(hash) = &mp4.ftyp_hash {
                reachable.insert(hash.to_hex());
            }
            if let Some(hash) = &mp4.moov_hash {
                reachable.insert(hash.to_hex());
            }
            for atom in &mp4.other_atoms {
                if let Some(hash) = &atom.hash {
                    reachable.insert(hash.to_hex());
                }
            }
        }
    }
    // Stash entries are stored in one typed JSON file. Their base commits and
    // two manifests are independent roots and must survive any future GC.
    let stash_path = repo.dits_dir().join("stash.json");
    let stash_list = StashList::load(&stash_path)?;
    for entry in stash_list.entries {
        if let Some(base_commit) = entry.base_commit {
            stack.push(base_commit);
        }
        mark_manifest(repo, entry.index_manifest, &mut reachable);
        mark_manifest(repo, entry.worktree_manifest, &mut reachable);
    }

    while let Some(commit_hash) = stack.pop() {
        if !seen.insert(commit_hash) {
            continue;
        }
        reachable.insert(commit_hash.to_hex());

        let commit = match repo.load_commit(&commit_hash) {
            Ok(c) => c,
            Err(_) => continue, // dangling reference — nothing more to mark
        };

        // The commit's manifest and everything it references.
        mark_manifest(repo, commit.manifest, &mut reachable);

        if let Some(p) = commit.parent {
            stack.push(p);
        }
        for p in &commit.parents {
            stack.push(*p);
        }
    }

    Ok(reachable)
}

/// Mark a manifest and every Dits object it directly references.
fn mark_manifest(repo: &Repository, manifest_hash: Hash, reachable: &mut HashSet<String>) {
    reachable.insert(manifest_hash.to_hex());
    let Ok(manifest) = repo.load_manifest(&manifest_hash) else {
        return;
    };

    for entry in manifest.entries.values() {
        reachable.insert(entry.content_hash.to_hex());
        for chunk in &entry.chunks {
            reachable.insert(chunk.hash.to_hex());
        }
        if let Some(mp4) = &entry.mp4_metadata {
            if let Some(hash) = &mp4.ftyp_hash {
                reachable.insert(hash.to_hex());
            }
            if let Some(hash) = &mp4.moov_hash {
                reachable.insert(hash.to_hex());
            }
            for atom in &mp4.other_atoms {
                if let Some(hash) = &atom.hash {
                    reachable.insert(hash.to_hex());
                }
            }
        }
    }
}

/// Find unreferenced objects.
fn find_unreferenced_objects(
    objects_dir: &Path,
    reachable: &HashSet<String>,
) -> Result<Vec<std::path::PathBuf>> {
    let mut unreferenced = Vec::new();

    if !objects_dir.exists() {
        return Ok(unreferenced);
    }

    // Only prune Dits's own content-addressed categories, laid out as
    // objects/<category>/<aa>/<rest> where <aa><rest> is the object hash.
    // CRITICALLY, never descend into objects/git — that is the embedded git
    // engine; its files (HEAD/config/blobs/...) are not Dits hashes and
    // deleting them corrupts text storage. The git engine manages its own
    // garbage.
    for category in ["commits", "manifests", "chunks", "blobs"] {
        let cat_dir = objects_dir.join(category);
        if !cat_dir.exists() {
            continue;
        }
        for fanout in fs::read_dir(&cat_dir)?.flatten() {
            let fanout_path = fanout.path();
            if !fanout_path.is_dir() {
                continue;
            }
            let prefix = fanout.file_name().to_string_lossy().to_string();
            for obj in fs::read_dir(&fanout_path)?.flatten() {
                if obj.file_type()?.is_file() {
                    let suffix = obj.file_name().to_string_lossy().to_string();
                    let hash = format!("{}{}", prefix, suffix);
                    if !reachable.contains(&hash) {
                        unreferenced.push(obj.path());
                    }
                }
            }
        }
    }

    Ok(unreferenced)
}

/// Format byte size as human-readable string.
fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} bytes", bytes)
    }
}

#[cfg(test)]
mod tests {}
