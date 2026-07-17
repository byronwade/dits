//! Create a commit.

use std::path::Path;

use anyhow::{bail, Context, Result};
use console::style;

use crate::store::Repository;

/// Create a commit from staged changes.
pub fn commit(message: &str) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    // Get the number of staged files before committing
    let index = repo.load_index()?;
    let files_committed = index
        .entries
        .values()
        .filter(|entry| entry.status != crate::core::FileStatus::Unchanged)
        .count();

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
            println!("  {} file(s) committed, {} total chunks", files_committed, stats.chunk_count);

            Ok(())
        },
        Err(crate::store::repository::RepoError::NothingToCommit) => {
            bail!("Nothing to commit (use \"dits add\" to stage changes)")
        },
        Err(e) => Err(e.into()),
    }
}
