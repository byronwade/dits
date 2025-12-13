//! Clean command - Remove untracked files from the working tree.
//!
//! This command removes untracked files from the working directory,
//! helping to keep the repository clean.

use anyhow::{Context, Result};
use globset::{Glob, GlobSetBuilder};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::store::Repository;

/// Options for the clean command
pub struct CleanOptions {
    /// Dry run - show what would be deleted without deleting
    pub dry_run: bool,
    /// Force - actually delete files (required unless dry_run)
    pub force: bool,
    /// Remove untracked directories recursively
    pub directories: bool,
    /// Remove ignored files as well
    pub remove_ignored: bool,
    /// Remove only ignored files
    pub only_ignored: bool,
    /// Exclude patterns
    pub exclude: Vec<String>,
    /// Paths to clean (empty = all)
    pub paths: Vec<String>,
}

impl Default for CleanOptions {
    fn default() -> Self {
        Self {
            dry_run: false,
            force: false,
            directories: false,
            remove_ignored: false,
            only_ignored: false,
            exclude: Vec::new(),
            paths: Vec::new(),
        }
    }
}

/// Results of the clean operation
pub struct CleanResult {
    /// Files that were (or would be) removed
    pub removed_files: Vec<PathBuf>,
    /// Directories that were (or would be) removed
    pub removed_dirs: Vec<PathBuf>,
    /// Files that were skipped
    pub skipped: Vec<PathBuf>,
}

/// Execute the clean command
pub fn clean(options: &CleanOptions) -> Result<CleanResult> {
    // Must have force or dry_run
    if !options.force && !options.dry_run {
        anyhow::bail!(
            "clean requires -f (force) to actually remove files, or -n (dry-run) to preview.\n\
             Use 'dits clean -n' to see what would be removed."
        );
    }

    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository (or any parent directory)")?;
    
    let repo_root = repo.root();
    
    // Get tracked files
    let tracked_files = get_tracked_files(&repo)?;
    
    // Build exclude patterns
    let exclude_set = build_exclude_set(&options.exclude)?;
    
    // Get ignored patterns from .ditsignore
    let ignored_patterns = load_ignore_patterns(repo_root)?;
    
    // Find untracked files
    let mut result = CleanResult {
        removed_files: Vec::new(),
        removed_dirs: Vec::new(),
        skipped: Vec::new(),
    };
    
    // Determine which paths to scan
    let scan_paths: Vec<PathBuf> = if options.paths.is_empty() {
        vec![repo_root.to_path_buf()]
    } else {
        options.paths.iter().map(|p| repo_root.join(p)).collect()
    };
    
    for scan_path in scan_paths {
        scan_for_untracked(
            &scan_path,
            repo_root,
            &tracked_files,
            &ignored_patterns,
            &exclude_set,
            options,
            &mut result,
        )?;
    }
    
    // Actually remove files if not dry run
    if options.force && !options.dry_run {
        for file in &result.removed_files {
            fs::remove_file(file)
                .with_context(|| format!("Failed to remove file: {}", file.display()))?;
        }
        for dir in &result.removed_dirs {
            fs::remove_dir_all(dir)
                .with_context(|| format!("Failed to remove directory: {}", dir.display()))?;
        }
    }
    
    Ok(result)
}

fn get_tracked_files(repo: &Repository) -> Result<HashSet<PathBuf>> {
    let mut tracked = HashSet::new();
    
    // Get files from index
    let index = repo.load_index()?;
    for path in index.entries.keys() {
        tracked.insert(PathBuf::from(path));
    }
    
    Ok(tracked)
}

fn build_exclude_set(patterns: &[String]) -> Result<globset::GlobSet> {
    let mut builder = GlobSetBuilder::new();
    for pattern in patterns {
        let glob = Glob::new(pattern)
            .with_context(|| format!("Invalid exclude pattern: {}", pattern))?;
        builder.add(glob);
    }
    builder.build().context("Failed to build exclude set")
}

fn load_ignore_patterns(repo_root: &Path) -> Result<Vec<Glob>> {
    let mut patterns = Vec::new();
    
    let ignore_file = repo_root.join(".ditsignore");
    if ignore_file.exists() {
        let content = fs::read_to_string(&ignore_file)
            .context("Failed to read .ditsignore")?;
        
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            
            if let Ok(glob) = Glob::new(line) {
                patterns.push(glob);
            }
        }
    }
    
    // Also add .dits directory as always ignored
    if let Ok(glob) = Glob::new(".dits/**") {
        patterns.push(glob);
    }
    
    Ok(patterns)
}

fn is_ignored(path: &Path, patterns: &[Glob]) -> bool {
    let path_str = path.to_string_lossy();
    for pattern in patterns {
        if pattern.compile_matcher().is_match(path_str.as_ref()) {
            return true;
        }
    }
    false
}

fn scan_for_untracked(
    scan_path: &Path,
    repo_root: &Path,
    tracked: &HashSet<PathBuf>,
    ignored_patterns: &[Glob],
    exclude_set: &globset::GlobSet,
    options: &CleanOptions,
    result: &mut CleanResult,
) -> Result<()> {
    if !scan_path.exists() {
        return Ok(());
    }
    
    let walker = WalkDir::new(scan_path)
        .min_depth(1)
        .into_iter()
        .filter_entry(|e| {
            // Skip .dits directory
            let name = e.file_name().to_string_lossy();
            name != ".dits"
        });
    
    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        
        let path = entry.path();
        let relative_path = match path.strip_prefix(repo_root) {
            Ok(p) => p.to_path_buf(),
            Err(_) => continue,
        };
        
        // Check if excluded
        if exclude_set.is_match(&relative_path) {
            result.skipped.push(relative_path.clone());
            continue;
        }
        
        // Check if tracked
        if tracked.contains(&relative_path) {
            continue;
        }
        
        let is_ignored_file = is_ignored(&relative_path, ignored_patterns);
        
        // Apply options
        if options.only_ignored && !is_ignored_file {
            continue;
        }
        
        if !options.only_ignored && !options.remove_ignored && is_ignored_file {
            continue;
        }
        
        // Handle directories
        if entry.file_type().is_dir() {
            if options.directories {
                // Check if directory is empty or only contains untracked files
                let has_tracked = has_tracked_descendant(path, repo_root, tracked);
                if !has_tracked {
                    result.removed_dirs.push(path.to_path_buf());
                }
            }
        } else {
            result.removed_files.push(path.to_path_buf());
        }
    }
    
    Ok(())
}

fn has_tracked_descendant(dir: &Path, repo_root: &Path, tracked: &HashSet<PathBuf>) -> bool {
    for entry in WalkDir::new(dir).min_depth(1) {
        if let Ok(entry) = entry {
            if let Ok(relative) = entry.path().strip_prefix(repo_root) {
                if tracked.contains(&relative.to_path_buf()) {
                    return true;
                }
            }
        }
    }
    false
}

/// Print clean results
pub fn print_results(result: &CleanResult, dry_run: bool) {
    let prefix = if dry_run { "Would remove " } else { "Removing " };
    
    for file in &result.removed_files {
        println!("{}{}", prefix, file.display());
    }
    
    for dir in &result.removed_dirs {
        println!("{}{}/", prefix, dir.display());
    }
    
    if result.removed_files.is_empty() && result.removed_dirs.is_empty() {
        println!("Nothing to clean.");
    } else if dry_run {
        let total = result.removed_files.len() + result.removed_dirs.len();
        println!("\nWould remove {} item(s). Use -f to actually remove.", total);
    } else {
        let total = result.removed_files.len() + result.removed_dirs.len();
        println!("\nRemoved {} item(s).", total);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::io::Write;

    fn create_test_repo() -> (TempDir, Repository) {
        let temp = TempDir::new().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        (temp, repo)
    }

    fn create_file(dir: &Path, name: &str, content: &[u8]) {
        let path = dir.join(name);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        let mut file = fs::File::create(&path).unwrap();
        file.write_all(content).unwrap();
    }

    #[test]
    fn test_clean_requires_force_or_dry_run() {
        let (_temp, _repo) = create_test_repo();
        let options = CleanOptions::default();
        let result = clean(&options);
        assert!(result.is_err());
    }

    #[test]
    fn test_clean_dry_run_shows_untracked() {
        let (temp, repo) = create_test_repo();
        
        // Create a tracked file
        create_file(temp.path(), "tracked.txt", b"tracked");
        repo.add("tracked.txt").unwrap();
        
        // Create an untracked file
        create_file(temp.path(), "untracked.txt", b"untracked");
        
        let options = CleanOptions {
            dry_run: true,
            ..Default::default()
        };
        
        // Change to repo directory for the test
        let _guard = std::env::set_current_dir(temp.path());
        let result = clean(&options);
        
        // Result should show untracked file
        assert!(result.is_ok());
    }

    #[test]
    fn test_clean_respects_exclude() {
        let exclude_patterns = vec!["*.log".to_string()];
        let exclude_set = build_exclude_set(&exclude_patterns).unwrap();
        
        assert!(exclude_set.is_match("test.log"));
        assert!(!exclude_set.is_match("test.txt"));
    }
}
