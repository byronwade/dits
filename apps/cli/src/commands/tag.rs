//! Tag management commands.

use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::path::Path;

/// List, create, or delete tags.
pub fn tag(name: Option<&str>, commit: Option<&str>, delete: bool) -> Result<()> {
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
        list_tags(&repo)?;
    }

    Ok(())
}

/// List all tags.
fn list_tags(repo: &Repository) -> Result<()> {
    let tags = repo.refs().list_tags()?;

    if tags.is_empty() {
        println!("No tags yet. Create one with: dits tag <name>");
        return Ok(());
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
