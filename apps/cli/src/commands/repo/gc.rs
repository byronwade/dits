//! Garbage collection command - clean up unreferenced objects.

use std::{collections::HashSet, fs, path::Path};

use anyhow::{bail, Result};

use crate::{core::Hash, store::Repository};

/// Run garbage collection.
pub fn gc(dry_run: bool, prune: bool, aggressive: bool) -> Result<()> {
    let dits_dir = std::path::Path::new(".dits");
    if !dits_dir.exists() {
        bail!("Not a dits repository");
    }

    println!("Running garbage collection...");

    let mut stats = GcStats::default();

    // Step 1: Collect all reachable objects
    let reachable = collect_reachable_objects(dits_dir)?;
    stats.reachable_objects = reachable.len();

    // Step 2: Find unreferenced objects
    let objects_dir = dits_dir.join("objects");
    let unreferenced = find_unreferenced_objects(&objects_dir, &reachable)?;
    stats.unreferenced_objects = unreferenced.len();

    // Step 3: Calculate space that would be freed
    for obj_path in &unreferenced {
        if let Ok(meta) = fs::metadata(obj_path) {
            stats.bytes_to_free += meta.len();
        }
    }

    // Step 4: Prune expired locks
    let locks_pruned = if prune {
        prune_expired_locks(dits_dir)?
    } else {
        0
    };
    stats.locks_pruned = locks_pruned;

    // Step 5: Remove unreferenced objects (if not dry run)
    if !dry_run && !unreferenced.is_empty() {
        for obj_path in &unreferenced {
            if let Err(e) = fs::remove_file(obj_path) {
                eprintln!("Warning: Could not remove {}: {}", obj_path.display(), e);
            }
        }
        stats.objects_removed = unreferenced.len();

        // Clean up empty fan-out directories
        cleanup_empty_directories(&objects_dir)?;
    }

    // Step 6: Aggressive mode - repack objects
    if aggressive && !dry_run {
        println!("Aggressive mode: repacking objects...");
        // In a full implementation, this would:
        // - Re-delta compress objects
        // - Repack into fewer files
        // - Optimize storage layout
        println!("  (Repacking not yet implemented)");
    }

    // Print summary
    println!();
    if dry_run {
        println!("Dry run - no changes made");
        println!();
    }

    println!("Garbage collection summary:");
    println!("  Reachable objects: {}", stats.reachable_objects);
    println!("  Unreferenced objects: {}", stats.unreferenced_objects);

    if stats.bytes_to_free > 0 {
        let size_str = format_size(stats.bytes_to_free);
        if dry_run {
            println!("  Space to be freed: {}", size_str);
        } else {
            println!("  Space freed: {}", size_str);
        }
    }

    if prune {
        println!("  Expired locks pruned: {}", stats.locks_pruned);
    }

    if !dry_run && stats.objects_removed > 0 {
        println!("  Objects removed: {}", stats.objects_removed);
    }

    Ok(())
}

/// Stats for garbage collection run.
#[derive(Default)]
struct GcStats {
    reachable_objects:    usize,
    unreferenced_objects: usize,
    objects_removed:      usize,
    bytes_to_free:        u64,
    locks_pruned:         usize,
}

/// Collect every object hash reachable from any ref, by actually walking the
/// object graph: refs/HEAD/tags/stash -> commits -> parents -> manifest ->
/// per-entry content/chunks/mp4 blobs. (Git-text content lives in the git
/// engine, not `.dits/objects`, so it is never scanned for pruning here.)
fn collect_reachable_objects(_dits_dir: &Path) -> Result<HashSet<String>> {
    let repo = Repository::open(Path::new("."))?;
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
    // Stash entries also keep commits alive — harvest any 64-hex hashes they
    // contain.
    let stash_dir = Path::new(".dits").join("stash");
    if stash_dir.exists() {
        for entry in fs::read_dir(&stash_dir)?.flatten() {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                for tok in content.split(|c: char| !c.is_ascii_hexdigit()) {
                    if tok.len() == 64 {
                        if let Ok(h) = Hash::from_hex(tok) {
                            stack.push(h);
                        }
                    }
                }
            }
        }
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
        reachable.insert(commit.manifest.to_hex());
        if let Ok(manifest) = repo.load_manifest(&commit.manifest) {
            for entry in manifest.entries.values() {
                reachable.insert(entry.content_hash.to_hex());
                for chunk in &entry.chunks {
                    reachable.insert(chunk.hash.to_hex());
                }
                if let Some(mp4) = &entry.mp4_metadata {
                    if let Some(h) = &mp4.ftyp_hash {
                        reachable.insert(h.to_hex());
                    }
                    if let Some(h) = &mp4.moov_hash {
                        reachable.insert(h.to_hex());
                    }
                }
            }
        }

        if let Some(p) = commit.parent {
            stack.push(p);
        }
        for p in &commit.parents {
            stack.push(*p);
        }
    }

    Ok(reachable)
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

/// Prune expired locks.
fn prune_expired_locks(dits_dir: &Path) -> Result<usize> {
    use crate::store::locks::LockStore;

    let mut store = LockStore::new(dits_dir);
    let before_count = store.list().len();
    store.cleanup_expired();
    let after_count = store.list().len();

    Ok(before_count.saturating_sub(after_count))
}

/// Clean up empty fan-out directories.
fn cleanup_empty_directories(objects_dir: &Path) -> Result<()> {
    if !objects_dir.exists() {
        return Ok(());
    }

    for entry in fs::read_dir(objects_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            // Check if directory is empty
            let is_empty = fs::read_dir(&path)?.next().is_none();
            if is_empty {
                let _ = fs::remove_dir(&path);
            }
        }
    }

    Ok(())
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
mod tests {
    use super::*;
}
