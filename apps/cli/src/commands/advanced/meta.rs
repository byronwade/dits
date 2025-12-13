//! Metadata commands (Phase 5).
//!
//! Commands for extracting and viewing file metadata.

use dits::metadata::{MetadataRegistry, MetadataStore};
use dits::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::path::Path;

/// Scan files in HEAD and extract metadata.
pub fn meta_scan(verbose: bool) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    // Get HEAD commit
    let head = repo.head()?.context("No commits yet")?;
    let commit = repo.load_commit(&head)?;
    let manifest = repo.load_manifest(&commit.manifest)?;

    // Initialize metadata store
    let meta_store = MetadataStore::new(repo.dits_dir());
    meta_store.init()?;

    // Initialize extractor registry
    let registry = MetadataRegistry::new();

    println!("{}", style("Scanning files for metadata...").bold());
    if verbose {
        println!("Available extractors: {:?}", registry.list_extractors());
    }
    println!();

    let mut scanned = 0;
    let mut extracted = 0;
    let mut skipped = 0;
    let mut errors = 0;

    for (path, entry) in manifest.iter() {
        scanned += 1;

        // Check if already has metadata
        if meta_store.exists(&entry.content_hash) {
            if verbose {
                println!("  {} {} (already scanned)", style("○").dim(), path);
            }
            skipped += 1;
            continue;
        }

        // Full path to file
        let full_path = repo.work_dir().join(path);

        if !full_path.exists() {
            if verbose {
                println!("  {} {} (file not in working dir)", style("?").yellow(), path);
            }
            skipped += 1;
            continue;
        }

        // Extract metadata
        match registry.extract(&full_path) {
            Ok(metadata) => {
                // Store metadata keyed by manifest hash (content hash)
                if let Err(e) = meta_store.store(&entry.content_hash, &metadata) {
                    if verbose {
                        println!("  {} {} (store error: {})", style("✗").red(), path, e);
                    }
                    errors += 1;
                } else {
                    if verbose {
                        println!(
                            "  {} {} [{}]",
                            style("✓").green(),
                            path,
                            style(&metadata.content_type).cyan()
                        );
                    }
                    extracted += 1;
                }
            }
            Err(e) => {
                if verbose {
                    println!("  {} {} ({})", style("✗").red(), path, e);
                }
                errors += 1;
            }
        }
    }

    println!();
    println!("{}", style("Scan complete:").bold());
    println!("  Files scanned:   {}", scanned);
    println!("  Metadata stored: {}", style(extracted).green());
    println!("  Already scanned: {}", skipped);
    if errors > 0 {
        println!("  Errors:          {}", style(errors).red());
    }

    Ok(())
}

/// Show metadata for a file.
pub fn meta_show(path: &str) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    // Get HEAD commit
    let head = repo.head()?.context("No commits yet")?;
    let commit = repo.load_commit(&head)?;
    let manifest = repo.load_manifest(&commit.manifest)?;

    // Find the file in manifest
    let entry = manifest
        .get(path)
        .context(format!("File not found in HEAD: {}", path))?;

    // Load metadata
    let meta_store = MetadataStore::new(repo.dits_dir());

    match meta_store.load(&entry.content_hash)? {
        Some(metadata) => {
            println!("{} {}", style("Metadata for:").bold(), style(path).yellow());
            println!();

            // Pretty print JSON
            let json = serde_json::to_string_pretty(&metadata)
                .context("Failed to serialize metadata")?;
            println!("{}", json);
        }
        None => {
            println!(
                "{} No metadata found for {}",
                style("!").yellow(),
                path
            );
            println!("Run `dits meta scan` to extract metadata.");
        }
    }

    Ok(())
}

/// List all stored metadata.
pub fn meta_list() -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let meta_store = MetadataStore::new(repo.dits_dir());
    let hashes = meta_store.list()?;

    println!("{} {} metadata entries", style("Found").bold(), hashes.len());

    for hash in hashes {
        if let Ok(Some(metadata)) = meta_store.load(&hash) {
            println!(
                "  {} [{}] {}",
                &hash.to_hex()[..12],
                style(&metadata.content_type).cyan(),
                metadata.mime
            );
        }
    }

    Ok(())
}
