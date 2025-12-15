//! Sparse checkout command - Partial checkout for large repositories.
//!
//! This command enables working with a subset of files in large repositories.

use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

use crate::store::Repository;
use crate::core::ManifestEntry;

/// Sparse checkout configuration
#[derive(Debug, Clone)]
pub struct SparseCheckoutConfig {
    /// Enabled
    pub enabled: bool,
    /// Cone mode (directory-based patterns)
    pub cone: bool,
    /// Patterns to include
    pub patterns: Vec<String>,
}

impl Default for SparseCheckoutConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            cone: true,
            patterns: Vec::new(),
        }
    }
}

/// Initialize sparse checkout
pub fn init(cone: bool) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let sparse_dir = repo.dits_dir().join("info");
    fs::create_dir_all(&sparse_dir)?;
    
    // Write initial patterns (include everything by default)
    let sparse_file = sparse_dir.join("sparse-checkout");
    fs::write(&sparse_file, "/*\n")?;
    
    // Enable sparse checkout in config
    let config_file = repo.dits_dir().join("config");
    let mut config = if config_file.exists() {
        fs::read_to_string(&config_file)?
    } else {
        String::new()
    };
    
    if !config.contains("[core]") {
        config.push_str("[core]\n");
    }
    
    if !config.contains("sparseCheckout") {
        config.push_str("\tsparseCheckout = true\n");
    }
    
    if cone && !config.contains("sparseCheckoutCone") {
        config.push_str("\tsparseCheckoutCone = true\n");
    }
    
    fs::write(&config_file, config)?;
    
    println!("Sparse checkout initialized{}", if cone { " in cone mode" } else { "" });
    println!("Use 'dits sparse-checkout set <paths>' to define what to check out");
    
    Ok(())
}

/// Set sparse checkout patterns
pub fn set(patterns: &[String], cone: bool) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let sparse_dir = repo.dits_dir().join("info");
    fs::create_dir_all(&sparse_dir)?;
    
    let sparse_file = sparse_dir.join("sparse-checkout");
    
    let content = if cone {
        // Cone mode: patterns are directory paths
        let mut lines = Vec::new();
        for pattern in patterns {
            let pattern = pattern.trim_end_matches('/');
            // Include the directory and all its contents
            lines.push(format!("/{}/", pattern));
        }
        lines.join("\n")
    } else {
        // Pattern mode: use patterns as-is
        patterns.join("\n")
    };
    
    fs::write(&sparse_file, content)?;
    
    // Apply the sparse checkout
    apply_sparse_checkout(&repo)?;
    
    println!("Sparse checkout set with {} pattern(s)", patterns.len());
    Ok(())
}

/// Add patterns to sparse checkout
pub fn add(patterns: &[String]) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let sparse_file = repo.dits_dir().join("info").join("sparse-checkout");
    
    let mut existing = if sparse_file.exists() {
        fs::read_to_string(&sparse_file)?
    } else {
        String::new()
    };
    
    for pattern in patterns {
        let pattern = pattern.trim();
        if !existing.lines().any(|l| l.trim() == pattern) {
            existing.push_str(pattern);
            existing.push('\n');
        }
    }
    
    fs::write(&sparse_file, existing)?;
    
    // Apply the sparse checkout
    apply_sparse_checkout(&repo)?;
    
    println!("Added {} pattern(s) to sparse checkout", patterns.len());
    Ok(())
}

/// List current sparse checkout patterns
pub fn list() -> Result<Vec<String>> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let sparse_file = repo.dits_dir().join("info").join("sparse-checkout");
    
    if !sparse_file.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&sparse_file)?;
    let patterns: Vec<String> = content
        .lines()
        .filter(|l| !l.trim().is_empty() && !l.starts_with('#'))
        .map(|l| l.to_string())
        .collect();
    
    Ok(patterns)
}

/// Disable sparse checkout
pub fn disable() -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    // Remove sparse checkout config
    let config_file = repo.dits_dir().join("config");
    if config_file.exists() {
        let content = fs::read_to_string(&config_file)?;
        let new_content = content
            .lines()
            .filter(|l| !l.contains("sparseCheckout"))
            .collect::<Vec<_>>()
            .join("\n");
        fs::write(&config_file, new_content)?;
    }
    
    // Remove sparse-checkout file
    let sparse_file = repo.dits_dir().join("info").join("sparse-checkout");
    if sparse_file.exists() {
        fs::remove_file(&sparse_file)?;
    }
    
    // Checkout all files
    restore_full_checkout(&repo)?;
    
    println!("Sparse checkout disabled");
    Ok(())
}

/// Check if sparse checkout is enabled
pub fn is_enabled() -> Result<bool> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let config_file = repo.dits_dir().join("config");
    if !config_file.exists() {
        return Ok(false);
    }
    
    let content = fs::read_to_string(&config_file)?;
    Ok(content.contains("sparseCheckout = true"))
}

/// Apply sparse checkout - remove files not matching patterns and restore matching files
fn apply_sparse_checkout(repo: &Repository) -> Result<()> {
    let patterns = list()?;
    if patterns.is_empty() {
        return Ok(());
    }

    // Build pattern matchers
    let matchers: Vec<glob::Pattern> = patterns
        .iter()
        .filter_map(|p| glob::Pattern::new(p).ok())
        .collect();

    // Get current HEAD to determine what files to restore
    let head_commit = repo.head()?;
    if head_commit.is_none() {
        return Ok(());
    }
    let commit = repo.load_commit(&head_commit.unwrap())?;
    let manifest = repo.load_manifest(&commit.manifest)?;

    let _index = repo.load_index()?;
    let repo_root = repo.root();

    for (path, entry) in manifest.iter() {
        let matches = matchers.iter().any(|m| m.matches(path));
        let file_path = repo_root.join(path);

        if !matches && file_path.exists() {
            // Remove file that doesn't match sparse patterns
            fs::remove_file(&file_path)?;

            // Clean up empty parent directories
            cleanup_empty_parents(&file_path, repo_root)?;
        } else if matches && !file_path.exists() {
            // Restore file that matches sparse patterns but is missing
            restore_file(repo, path, entry)?;
        }
    }

    Ok(())
}

/// Restore a single file from the current HEAD commit
fn restore_file(repo: &Repository, path: &str, entry: &ManifestEntry) -> Result<()> {
    let full_path = repo.root().join(path);

    // Create parent directories
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Check if this is an MP4 file with MP4 metadata
    if entry.mp4_metadata.is_some() {
        // For MP4 files, we need special handling
        // For now, fall back to regular file reconstruction
        // TODO: Implement proper MP4 reconstruction for sparse checkout
        restore_regular_file(repo, &full_path, entry)?;
    } else {
        restore_regular_file(repo, &full_path, entry)?;
    }

    Ok(())
}

/// Restore a regular file by reconstructing it from chunks
fn restore_regular_file(repo: &Repository, full_path: &std::path::Path, entry: &ManifestEntry) -> Result<()> {
    use crate::store::GitTextEngine;

    // Phase 3.6: Check storage strategy
    if entry.is_git_text() {
        // Load from Git object store
        if let (Some(ref git_oid), Some(ref engine)) = (&entry.git_oid, &repo.git_engine()) {
            let oid = GitTextEngine::parse_oid(git_oid)?;
            let data = engine.read_blob(oid)?;
            fs::write(full_path, &data)?;
            return Ok(());
        }
        // Fall through to chunk-based restore if Git engine not available
    }

    // Reassemble file from chunks
    let mut data = Vec::with_capacity(entry.size as usize);
    for chunk_ref in &entry.chunks {
        let chunk = repo.objects().load_chunk(&chunk_ref.hash)?;
        data.extend_from_slice(&chunk.data);
    }

    fs::write(full_path, &data)?;
    Ok(())
}

/// Restore full checkout
fn restore_full_checkout(_repo: &Repository) -> Result<()> {
    // Full checkout restore would require reconstruct_file for each entry
    // For now, advise users to use `dits checkout HEAD`
    println!("Run 'dits checkout HEAD' to restore all files");
    Ok(())
}

/// Clean up empty parent directories
fn cleanup_empty_parents(path: &Path, stop_at: &Path) -> Result<()> {
    let mut current = path.parent();
    
    while let Some(parent) = current {
        if parent == stop_at {
            break;
        }
        
        // Check if directory is empty
        match fs::read_dir(parent) {
            Ok(mut entries) => {
                if entries.next().is_none() {
                    fs::remove_dir(parent)?;
                } else {
                    break;
                }
            }
            Err(_) => break,
        }
        
        current = parent.parent();
    }
    
    Ok(())
}

/// Print sparse checkout status
pub fn print_status() -> Result<()> {
    let enabled = is_enabled()?;
    
    if !enabled {
        println!("Sparse checkout is not enabled");
        println!("Run 'dits sparse-checkout init' to enable");
        return Ok(());
    }
    
    let patterns = list()?;
    
    println!("Sparse checkout is enabled");
    if patterns.is_empty() {
        println!("No patterns defined (all files checked out)");
    } else {
        println!("Patterns:");
        for pattern in &patterns {
            println!("  {}", pattern);
        }
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sparse_config_default() {
        let config = SparseCheckoutConfig::default();
        assert!(!config.enabled);
        assert!(config.cone);
        assert!(config.patterns.is_empty());
    }

    #[test]
    fn test_pattern_matching() {
        let pattern = glob::Pattern::new("/src/**").unwrap();
        assert!(pattern.matches("/src/main.rs"));
        assert!(pattern.matches("/src/lib/mod.rs"));
        assert!(!pattern.matches("/test/main.rs"));
    }
}
