//! Tag management commands.

use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::path::Path;

/// How to sort tags when listing.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TagSort {
    /// Sort alphabetically by name
    Name,
    /// Sort by creation date (newest first)
    CreatedAt,
    /// Sort by semantic version (v1.0.0, v1.1.0, v1.10.0, v2.0.0, etc.)
    Version,
}

/// List, create, or delete tags.
pub fn tag(name: Option<&str>, commit: Option<&str>, delete: bool, sort: TagSort) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    if let Some(tag_name) = name {
        if delete {
            // Delete tag
            delete_tag(&repo, tag_name)?;
        } else {
            // Create tag
            create_tag(&repo, tag_name, commit)?;
        }
    } else {
        // List tags
        list_tags(&repo, sort)?;
    }

    Ok(())
}

/// List all tags.
fn list_tags(repo: &Repository, sort: TagSort) -> Result<()> {
    let mut tags = repo.refs().list_tags()?;

    if tags.is_empty() {
        println!("No tags yet. Create one with: dits tag <name>");
        return Ok(());
    }

    // Sort tags according to the specified sort order
    match sort {
        TagSort::Name => {
            // Already sorted alphabetically by list_tags()
        }
        TagSort::CreatedAt => {
            // For now, fall back to name sorting since we don't have creation timestamps in the basic refs
            // TODO: This would need to be implemented with proper tag metadata storage
        }
        TagSort::Version => {
            tags.sort_by(|a, b| compare_semantic_versions(a, b));
        }
    }

    for tag in tags {
        println!("  {}", style(&tag).cyan());
    }

    Ok(())
}

/// Create a new tag at a specific commit (or HEAD).
fn create_tag(repo: &Repository, name: &str, commit_ref: Option<&str>) -> Result<()> {
    // Resolve target commit
    let target_hash = if let Some(ref_str) = commit_ref {
        repo.resolve_ref_or_prefix(ref_str)?
            .with_context(|| format!("Could not resolve '{}' to a commit", ref_str))?
    } else {
        repo.head()?
            .context("No commits yet - cannot create tag")?
    };

    // Check if tag already exists
    if repo.refs().get_tag(name)?.is_some() {
        anyhow::bail!("Tag '{}' already exists", name);
    }

    // Create the tag
    repo.refs().set_tag(name, &target_hash)?;

    println!(
        "{} Created tag '{}' at {}",
        style("✓").green().bold(),
        style(name).cyan(),
        &target_hash.to_hex()[..8]
    );

    Ok(())
}

/// Delete a tag.
fn delete_tag(repo: &Repository, name: &str) -> Result<()> {
    // Check if tag exists
    if repo.refs().get_tag(name)?.is_none() {
        println!(
            "{} Tag '{}' not found",
            style("!").yellow().bold(),
            name
        );
        return Ok(());
    }

    // Delete the tag file
    let tag_path = repo.dits_dir().join("refs").join("tags").join(name);
    std::fs::remove_file(&tag_path)?;

    println!(
        "{} Deleted tag '{}'",
        style("✓").green().bold(),
        style(name).cyan()
    );

    Ok(())
}

/// Compare two tag names using semantic versioning rules.
/// Handles versions like: v1.0.0, v1.10.0, v2.0.0-alpha, etc.
fn compare_semantic_versions(a: &str, b: &str) -> std::cmp::Ordering {
    // Extract version parts from tag names (handle common prefixes like 'v', 'release-')
    let a_version = extract_version_part(a);
    let b_version = extract_version_part(b);

    // Parse semantic version components
    let a_parts = parse_semantic_version(a_version);
    let b_parts = parse_semantic_version(b_version);

    // Compare version components
    for (a_part, b_part) in a_parts.iter().zip(b_parts.iter()) {
        match a_part.cmp(b_part) {
            std::cmp::Ordering::Equal => continue,
            ordering => return ordering,
        }
    }

    // If all compared parts are equal, longer version wins (e.g., 1.0.0 > 1.0)
    a_parts.len().cmp(&b_parts.len())
}

/// Extract the version part from a tag name, handling common prefixes.
fn extract_version_part(tag: &str) -> &str {
    // Handle common version prefixes
    if let Some(v) = tag.strip_prefix('v') {
        v
    } else if let Some(v) = tag.strip_prefix("release-") {
        v
    } else if let Some(v) = tag.strip_prefix("version-") {
        v
    } else {
        tag
    }
}

/// Parse a semantic version string into numeric components.
/// Handles formats like: 1.0.0, 1.10.0-alpha, 2.0.0-beta.1
fn parse_semantic_version(version: &str) -> Vec<u64> {
    version
        .split(|c: char| !c.is_ascii_digit())
        .filter_map(|part| part.parse::<u64>().ok())
        .collect()
}
