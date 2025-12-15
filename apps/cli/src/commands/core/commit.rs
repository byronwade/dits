//! Create a commit.

use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::path::Path;

/// Create a commit from staged changes.
pub fn commit(message: &str) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    // Get the number of staged files before committing
    let index = repo.load_index()?;
    let files_committed = index.len();

    match repo.commit(message) {
        Ok(commit) => {
            println!(
                "{} [{}] {}",
                style("✓").green().bold(),
                style(commit.short_hash()).yellow(),
                message
            );

            // Get stats
            let stats = repo.stats()?;
            println!(
                "  {} file(s) committed, {} total chunks",
                files_committed,
                stats.chunk_count
            );

            Ok(())
        }
        Err(crate::store::repository::RepoError::NothingToCommit) => {
            println!(
                "{} Nothing to commit (use \"dits add\" to stage files)",
                style("!").yellow().bold()
            );
            Ok(())
        }
        Err(e) => Err(e.into()),
    }
}
