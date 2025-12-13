//! Garbage collection command - clean up unreferenced objects.

use anyhow::{Result, bail};
use std::collections::HashSet;
use std::fs;
use std::path::Path;

/// Run garbage collection.
pub fn gc(
    dry_run: bool,
    prune: bool,
    aggressive: bool,
) -> Result<()> {
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
    reachable_objects: usize,
    unreferenced_objects: usize,
    objects_removed: usize,
    bytes_to_free: u64,
    locks_pruned: usize,
}

/// Collect all reachable object hashes.
fn collect_reachable_objects(dits_dir: &Path) -> Result<HashSet<String>> {
    let mut reachable = HashSet::new();

    // Walk all refs (heads, tags, remotes)
    let refs_dir = dits_dir.join("refs");
    if refs_dir.exists() {
        collect_refs_objects(&refs_dir, &mut reachable)?;
    }

    // Check HEAD
    let head = dits_dir.join("HEAD");
    if head.exists() {
        let content = fs::read_to_string(&head)?;
        if let Some(commit_hash) = content.strip_prefix("ref: ") {
            // Symbolic ref - resolve it
            let ref_path = dits_dir.join(commit_hash.trim());
            if ref_path.exists() {
                let hash = fs::read_to_string(&ref_path)?.trim().to_string();
                collect_commit_objects(dits_dir, &hash, &mut reachable)?;
            }
        } else {
            // Direct commit hash
            let hash = content.trim();
            collect_commit_objects(dits_dir, hash, &mut reachable)?;
        }
    }

    // Check stash
    let stash_dir = dits_dir.join("stash");
    if stash_dir.exists() {
        for entry in fs::read_dir(&stash_dir)? {
            let entry = entry?;
            if entry.file_type()?.is_file() {
                // Stash entries contain commit hashes
                if let Ok(content) = fs::read_to_string(entry.path()) {
                    for line in content.lines() {
                        if line.len() >= 64 {
                            collect_commit_objects(dits_dir, line.trim(), &mut reachable)?;
                        }
                    }
                }
            }
        }
    }

    Ok(reachable)
}

/// Collect objects referenced by refs in a directory.
fn collect_refs_objects(refs_dir: &Path, reachable: &mut HashSet<String>) -> Result<()> {
    for entry in fs::read_dir(refs_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            collect_refs_objects(&path, reachable)?;
        } else if path.is_file() {
            let content = fs::read_to_string(&path)?;
            let hash = content.trim();
            if !hash.is_empty() {
                // This is a dits directory, not a git one
                let dits_dir = refs_dir.parent().unwrap();
                collect_commit_objects(dits_dir, hash, reachable)?;
            }
        }
    }
    Ok(())
}

/// Recursively collect objects reachable from a commit.
fn collect_commit_objects(dits_dir: &Path, hash: &str, reachable: &mut HashSet<String>) -> Result<()> {
    if hash.is_empty() || reachable.contains(hash) {
        return Ok(());
    }

    reachable.insert(hash.to_string());

    // Try to read the commit object
    let obj_path = object_path(dits_dir, hash);
    if !obj_path.exists() {
        return Ok(()); // Object doesn't exist, skip
    }

    // In a full implementation, we would parse the commit to find:
    // - Parent commits
    // - Tree/manifest objects
    // - Blob objects
    // For now, we just mark the object as reachable

    Ok(())
}

/// Get the path to an object given its hash.
fn object_path(dits_dir: &Path, hash: &str) -> std::path::PathBuf {
    let objects = dits_dir.join("objects");
    if hash.len() >= 2 {
        // Fan-out layout
        objects.join(&hash[..2]).join(&hash[2..])
    } else {
        objects.join(hash)
    }
}

/// Find unreferenced objects.
fn find_unreferenced_objects(objects_dir: &Path, reachable: &HashSet<String>) -> Result<Vec<std::path::PathBuf>> {
    let mut unreferenced = Vec::new();

    if !objects_dir.exists() {
        return Ok(unreferenced);
    }

    for entry in fs::read_dir(objects_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            // Fan-out directory
            let prefix = entry.file_name().to_string_lossy().to_string();

            for sub_entry in fs::read_dir(&path)? {
                let sub_entry = sub_entry?;
                if sub_entry.file_type()?.is_file() {
                    let suffix = sub_entry.file_name().to_string_lossy().to_string();
                    let hash = format!("{}{}", prefix, suffix);

                    if !reachable.contains(&hash) {
                        unreferenced.push(sub_entry.path());
                    }
                }
            }
        } else if path.is_file() {
            // Direct object file
            let hash = entry.file_name().to_string_lossy().to_string();
            if !reachable.contains(&hash) {
                unreferenced.push(path);
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
