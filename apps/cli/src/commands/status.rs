//! Show repository status.

use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::path::Path;

/// Show repository status.
pub fn status() -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    let status = repo.status()?;

    // Print branch
    if let Some(branch) = &status.branch {
        println!("On branch {}", style(branch).cyan().bold());
    } else {
        println!("{}", style("HEAD detached").yellow());
    }

    println!();

    // Print staged changes
    if status.has_staged() {
        println!("Changes to be committed:");
        println!("  (use \"dits restore --staged <file>...\" to unstage)");
        println!();

        for file in &status.staged_new {
            println!("        {}: {}", style("new file").green(), file);
        }
        for file in &status.staged_modified {
            println!("        {}: {}", style("modified").green(), file);
        }
        for file in &status.staged_deleted {
            println!("        {}: {}", style("deleted").green(), file);
        }
        println!();
    }

    // Print unstaged modifications
    if !status.modified.is_empty() {
        println!("Changes not staged for commit:");
        println!("  (use \"dits add <file>...\" to update what will be committed)");
        println!();

        for file in &status.modified {
            println!("        {}: {}", style("modified").red(), file);
        }
        println!();
    }

    // Print untracked files
    if !status.untracked.is_empty() {
        println!("Untracked files:");
        println!("  (use \"dits add <file>...\" to include in what will be committed)");
        println!();

        for file in &status.untracked {
            println!("        {}", style(file).red());
        }
        println!();
    }

    // Clean status
    if status.is_clean() && status.untracked.is_empty() {
        println!("nothing to commit, working tree clean");
    } else if status.is_clean() && !status.untracked.is_empty() {
        println!(
            "nothing added to commit but untracked files present (use \"dits add\" to track)"
        );
    }

    Ok(())
}
