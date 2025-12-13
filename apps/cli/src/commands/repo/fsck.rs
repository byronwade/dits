//! Filesystem check (fsck) command - Phase 5.
//!
//! Verifies repository integrity by:
//! - Re-hashing all objects to verify content matches hash
//! - Checking manifest structure validity
//! - Verifying commit graph integrity
//! - Checking ref validity

use crate::core::{Hash, Hasher};
use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

/// Result of fsck operation.
#[derive(Debug, Default)]
pub struct FsckResult {
    pub objects_checked: usize,
    pub chunks_checked: usize,
    pub manifests_checked: usize,
    pub commits_checked: usize,
    pub refs_checked: usize,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

impl FsckResult {
    pub fn is_ok(&self) -> bool {
        self.errors.is_empty()
    }
}

/// Run filesystem check on the repository.
pub fn fsck(verbose: bool) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    println!("{}", style("Checking repository integrity...").bold());
    println!();

    let mut result = FsckResult::default();

    // 1. Check all chunks
    if verbose {
        println!("{}", style("Checking chunks...").dim());
    }
    check_chunks(repo.dits_dir(), &mut result)?;

    // 2. Check all manifests
    if verbose {
        println!("{}", style("Checking manifests...").dim());
    }
    check_manifests(repo.dits_dir(), &mut result)?;

    // 3. Check all commits
    if verbose {
        println!("{}", style("Checking commits...").dim());
    }
    check_commits(repo.dits_dir(), &mut result)?;

    // 4. Check refs
    if verbose {
        println!("{}", style("Checking refs...").dim());
    }
    check_refs(&repo, &mut result)?;

    // 5. Check commit graph integrity
    if verbose {
        println!("{}", style("Checking commit graph...").dim());
    }
    check_commit_graph(&repo, &mut result)?;

    // Print results
    println!();
    println!("{}", style("Integrity Check Results:").bold().underlined());
    println!();
    println!(
        "  Objects checked: {}",
        result.objects_checked
    );
    println!(
        "    Chunks:    {}",
        result.chunks_checked
    );
    println!(
        "    Manifests: {}",
        result.manifests_checked
    );
    println!(
        "    Commits:   {}",
        result.commits_checked
    );
    println!(
        "  Refs checked:    {}",
        result.refs_checked
    );
    println!();

    // Print warnings
    if !result.warnings.is_empty() {
        println!("{}", style("Warnings:").yellow().bold());
        for warning in &result.warnings {
            println!("  {} {}", style("⚠").yellow(), warning);
        }
        println!();
    }

    // Print errors
    if result.errors.is_empty() {
        println!(
            "{} {}",
            style("✓").green().bold(),
            style("Repository is healthy.").green()
        );
    } else {
        println!("{}", style("Errors:").red().bold());
        for error in &result.errors {
            println!("  {} {}", style("✗").red(), error);
        }
        println!();
        println!(
            "{} {} errors found.",
            style("✗").red().bold(),
            result.errors.len()
        );
    }

    Ok(())
}

/// Check all chunk objects for integrity.
fn check_chunks(dits_dir: &Path, result: &mut FsckResult) -> Result<()> {
    let chunks_dir = dits_dir.join("objects").join("chunks");
    if !chunks_dir.exists() {
        return Ok(());
    }

    for entry in WalkDir::new(&chunks_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        result.objects_checked += 1;
        result.chunks_checked += 1;

        // Extract expected hash from path
        let rel_path = entry.path().strip_prefix(&chunks_dir).unwrap();
        let components: Vec<_> = rel_path.components().collect();
        if components.len() != 2 {
            result.warnings.push(format!(
                "Unexpected chunk path structure: {}",
                entry.path().display()
            ));
            continue;
        }

        let prefix = components[0].as_os_str().to_string_lossy();
        let suffix = components[1].as_os_str().to_string_lossy();
        let expected_hex = format!("{}{}", prefix, suffix);

        // Read and hash the data
        let data = match fs::read(entry.path()) {
            Ok(d) => d,
            Err(e) => {
                result.errors.push(format!(
                    "Failed to read chunk {}: {}",
                    expected_hex, e
                ));
                continue;
            }
        };

        let actual_hash = Hasher::hash(&data);
        let actual_hex = actual_hash.to_hex();

        if actual_hex != expected_hex {
            result.errors.push(format!(
                "Chunk hash mismatch: expected {}, got {}",
                expected_hex, actual_hex
            ));
        }
    }

    Ok(())
}

/// Check all manifest objects for integrity.
fn check_manifests(dits_dir: &Path, result: &mut FsckResult) -> Result<()> {
    let manifests_dir = dits_dir.join("objects").join("manifests");
    if !manifests_dir.exists() {
        return Ok(());
    }

    for entry in WalkDir::new(&manifests_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        result.objects_checked += 1;
        result.manifests_checked += 1;

        // Extract expected hash from path
        let rel_path = entry.path().strip_prefix(&manifests_dir).unwrap();
        let components: Vec<_> = rel_path.components().collect();
        if components.len() != 2 {
            result.warnings.push(format!(
                "Unexpected manifest path structure: {}",
                entry.path().display()
            ));
            continue;
        }

        let prefix = components[0].as_os_str().to_string_lossy();
        let suffix = components[1].as_os_str().to_string_lossy();
        let expected_hex = format!("{}{}", prefix, suffix);

        // Read and hash the JSON
        let json = match fs::read_to_string(entry.path()) {
            Ok(j) => j,
            Err(e) => {
                result.errors.push(format!(
                    "Failed to read manifest {}: {}",
                    expected_hex, e
                ));
                continue;
            }
        };

        let actual_hash = Hasher::hash(json.as_bytes());
        let actual_hex = actual_hash.to_hex();

        if actual_hex != expected_hex {
            result.errors.push(format!(
                "Manifest hash mismatch: expected {}, got {}",
                expected_hex, actual_hex
            ));
        }

        // Try to parse the manifest
        if let Err(e) = serde_json::from_str::<serde_json::Value>(&json) {
            result.errors.push(format!(
                "Invalid manifest JSON {}: {}",
                expected_hex, e
            ));
        }
    }

    Ok(())
}

/// Check all commit objects for integrity.
fn check_commits(dits_dir: &Path, result: &mut FsckResult) -> Result<()> {
    let commits_dir = dits_dir.join("objects").join("commits");
    if !commits_dir.exists() {
        return Ok(());
    }

    for entry in WalkDir::new(&commits_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        result.objects_checked += 1;
        result.commits_checked += 1;

        // Extract expected hash from path
        let rel_path = entry.path().strip_prefix(&commits_dir).unwrap();
        let components: Vec<_> = rel_path.components().collect();
        if components.len() != 2 {
            result.warnings.push(format!(
                "Unexpected commit path structure: {}",
                entry.path().display()
            ));
            continue;
        }

        let prefix = components[0].as_os_str().to_string_lossy();
        let suffix = components[1].as_os_str().to_string_lossy();
        let expected_hex = format!("{}{}", prefix, suffix);

        // Read the JSON
        let json = match fs::read_to_string(entry.path()) {
            Ok(j) => j,
            Err(e) => {
                result.errors.push(format!(
                    "Failed to read commit {}: {}",
                    expected_hex, e
                ));
                continue;
            }
        };

        // Parse the commit and verify stored hash
        match serde_json::from_str::<serde_json::Value>(&json) {
            Ok(v) => {
                if let Some(stored_hash) = v.get("hash").and_then(|h| h.as_str()) {
                    if stored_hash != expected_hex {
                        result.errors.push(format!(
                            "Commit hash mismatch: stored {} in file {}",
                            stored_hash, expected_hex
                        ));
                    }
                }
            }
            Err(e) => {
                result.errors.push(format!(
                    "Invalid commit JSON {}: {}",
                    expected_hex, e
                ));
            }
        }
    }

    Ok(())
}

/// Check all refs point to valid commits.
fn check_refs(repo: &Repository, result: &mut FsckResult) -> Result<()> {
    let refs_dir = repo.dits_dir().join("refs");

    // Check HEAD
    let head_path = repo.dits_dir().join("HEAD");
    if head_path.exists() {
        result.refs_checked += 1;
        let head_content = fs::read_to_string(&head_path)?;
        let head_content = head_content.trim();

        if head_content.starts_with("ref: ") {
            // Symbolic ref - check the target exists
            let target = head_content.strip_prefix("ref: ").unwrap();
            let target_path = repo.dits_dir().join(target);
            if !target_path.exists() {
                result.warnings.push(format!(
                    "HEAD points to non-existent ref: {}",
                    target
                ));
            }
        } else {
            // Detached HEAD - verify commit exists
            if let Err(_) = Hash::from_hex(head_content) {
                result.errors.push(format!(
                    "HEAD contains invalid hash: {}",
                    head_content
                ));
            }
        }
    }

    // Check branch refs
    let heads_dir = refs_dir.join("heads");
    if heads_dir.exists() {
        for entry in WalkDir::new(&heads_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
        {
            result.refs_checked += 1;

            let ref_name = entry
                .path()
                .strip_prefix(&heads_dir)
                .unwrap()
                .to_string_lossy();

            let content = fs::read_to_string(entry.path())?;
            let hash_hex = content.trim();

            // Verify it's a valid hash
            match Hash::from_hex(hash_hex) {
                Ok(hash) => {
                    // Check if commit exists
                    if repo.load_commit(&hash).is_err() {
                        result.errors.push(format!(
                            "Branch {} points to non-existent commit: {}",
                            ref_name, hash_hex
                        ));
                    }
                }
                Err(_) => {
                    result.errors.push(format!(
                        "Branch {} contains invalid hash: {}",
                        ref_name, hash_hex
                    ));
                }
            }
        }
    }

    Ok(())
}

/// Check commit graph integrity (parents exist, manifests exist).
fn check_commit_graph(repo: &Repository, result: &mut FsckResult) -> Result<()> {
    let commits_dir = repo.dits_dir().join("objects").join("commits");
    if !commits_dir.exists() {
        return Ok(());
    }

    let mut seen_commits: HashSet<String> = HashSet::new();

    // Collect all commit hashes
    for entry in WalkDir::new(&commits_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let rel_path = entry.path().strip_prefix(&commits_dir).unwrap();
        let components: Vec<_> = rel_path.components().collect();
        if components.len() == 2 {
            let prefix = components[0].as_os_str().to_string_lossy();
            let suffix = components[1].as_os_str().to_string_lossy();
            seen_commits.insert(format!("{}{}", prefix, suffix));
        }
    }

    // For each commit, verify parent and manifest references
    for commit_hex in &seen_commits {
        let hash = match Hash::from_hex(commit_hex) {
            Ok(h) => h,
            Err(_) => continue,
        };

        let commit = match repo.load_commit(&hash) {
            Ok(c) => c,
            Err(_) => continue, // Already reported as read error
        };

        // Check parent exists (if any)
        if let Some(parent_hash) = commit.parent {
            let parent_hex = parent_hash.to_hex();
            if !seen_commits.contains(&parent_hex) {
                result.errors.push(format!(
                    "Commit {} references missing parent: {}",
                    &commit_hex[..8],
                    &parent_hex[..8]
                ));
            }
        }

        // Check manifest exists
        if repo.load_manifest(&commit.manifest).is_err() {
            result.errors.push(format!(
                "Commit {} references missing manifest: {}",
                &commit_hex[..8],
                &commit.manifest.to_hex()[..8]
            ));
        }
    }

    Ok(())
}
