//! Create a commit.

use std::path::Path;

use anyhow::{bail, Context, Result};
use console::style;

use crate::{commands::branching::reflog::record_reflog, store::Repository};

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
    let previous = repo.head()?;
    let ref_name = repo
        .current_branch()?
        .map(|branch| format!("refs/heads/{branch}"))
        .unwrap_or_else(|| "HEAD".to_string());

    match repo.commit(message) {
        Ok(commit) => {
            let action = format!("commit: {}", message.lines().next().unwrap_or(message));
            // Reflog recording is best-effort so a logging failure cannot undo
            // a durable commit that already published objects and refs.
            if let Err(error) = record_reflog(&repo, &ref_name, &commit.hash, previous, &action) {
                eprintln!(
                    "{} Failed to record reflog for {}: {error}",
                    style("!").yellow().bold(),
                    ref_name
                );
            }

            println!(
                "{} [{}] {}",
                style("✓").green().bold(),
                style(commit.short_hash()).yellow(),
                message
            );

            // Avoid walking the entire object store merely to decorate the
            // success message. Full repository statistics remain available
            // through `dits stats`.
            println!("  {} file(s) committed", files_committed);

            Ok(())
        },
        Err(crate::store::repository::RepoError::NothingToCommit) => {
            bail!("Nothing to commit (use \"dits add\" to stage changes)")
        },
        Err(e) => Err(e.into()),
    }
}
