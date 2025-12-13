//! Branch management commands.

use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::path::Path;

/// List, create, or delete branches.
pub fn branch(name: Option<&str>, delete: bool) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    if let Some(branch_name) = name {
        if delete {
            // Delete branch
            delete_branch(&repo, branch_name)?;
        } else {
            // Create branch
            create_branch(&repo, branch_name)?;
        }
    } else {
        // List branches
        list_branches(&repo)?;
    }

    Ok(())
}

/// List all branches.
fn list_branches(repo: &Repository) -> Result<()> {
    let branches = repo.list_branches()?;
    let current = repo.current_branch()?;

    if branches.is_empty() {
        println!("No branches yet. Create one with: dits branch <name>");
        return Ok(());
    }

    for branch in branches {
        if Some(&branch) == current.as_ref() {
            println!("{} {}", style("*").green().bold(), style(&branch).green().bold());
        } else {
            println!("  {}", branch);
        }
    }

    Ok(())
}

/// Create a new branch at HEAD.
fn create_branch(repo: &Repository, name: &str) -> Result<()> {
    repo.create_branch(name)?;
    println!(
        "{} Created branch '{}'",
        style("✓").green().bold(),
        style(name).cyan()
    );
    Ok(())
}

/// Delete a branch.
fn delete_branch(repo: &Repository, name: &str) -> Result<()> {
    let current = repo.current_branch()?;

    if Some(name.to_string()) == current {
        anyhow::bail!("Cannot delete the currently checked out branch '{}'", name);
    }

    if repo.delete_branch(name)? {
        println!(
            "{} Deleted branch '{}'",
            style("✓").green().bold(),
            style(name).cyan()
        );
    } else {
        println!(
            "{} Branch '{}' not found",
            style("!").yellow().bold(),
            name
        );
    }

    Ok(())
}

/// Switch to a different branch.
pub fn switch(branch: &str) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    // Check if it's a branch
    if repo.branch_exists(branch)? {
        let result = repo.checkout_branch(branch)?;
        println!(
            "{} Switched to branch '{}'",
            style("✓").green().bold(),
            style(branch).cyan()
        );
        if result.files_restored > 0 {
            println!("  {} file(s) updated", result.files_restored);
        }
    } else {
        anyhow::bail!("Branch '{}' not found. Create it with: dits branch {}", branch, branch);
    }

    Ok(())
}
