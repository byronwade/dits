//! Reflog command - show reference history.

use std::{fs, path::Path};

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use console::style;
use serde::{Deserialize, Serialize};

use crate::{core::Hash, store::Repository};

/// A single reflog entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflogEntry {
    /// The commit hash after this action.
    pub hash:      Hash,
    /// The previous commit hash (if any).
    pub previous:  Option<Hash>,
    /// Description of the action.
    pub action:    String,
    /// Timestamp of the action.
    pub timestamp: DateTime<Utc>,
}

/// The reflog for a ref.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Reflog {
    pub entries: Vec<ReflogEntry>,
}

impl Reflog {
    /// Load reflog from file.
    pub fn load(path: &Path) -> Result<Self> {
        if !path.exists() {
            return Ok(Self::default());
        }
        let json = fs::read_to_string(path)?;
        Ok(serde_json::from_str(&json)?)
    }

    /// Save reflog to file.
    pub fn save(&self, path: &Path) -> Result<()> {
        let json = serde_json::to_string_pretty(self)?;
        fs::write(path, json)?;
        Ok(())
    }

    /// Add a new entry.
    pub fn add(&mut self, entry: ReflogEntry) {
        self.entries.insert(0, entry);
        // Keep only last 1000 entries
        self.entries.truncate(1000);
    }
}

/// Show reflog entries.
pub fn reflog(ref_name: Option<&str>, limit: usize) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    let ref_name = ref_name.unwrap_or("HEAD");
    let reflog_path = reflog_path(&repo, ref_name)?;

    // If reflog doesn't exist, try to reconstruct from commits
    if !reflog_path.exists() {
        println!("{}", style("Reflog not found. Reconstructing from commit history...").dim());
        println!();

        // Show commit history as a pseudo-reflog
        let commits = repo.log(limit)?;

        if commits.is_empty() {
            println!("No entries in reflog for {}", ref_name);
            return Ok(());
        }

        for (i, commit) in commits.iter().enumerate() {
            let action =
                format!("commit: {}", commit.message.lines().next().unwrap_or(&commit.message));

            println!(
                "{} {}@{{{}}}: {}",
                style(&commit.hash.to_hex()[..7]).yellow(),
                ref_name,
                i,
                action
            );
        }

        println!();
        println!("{} Reflog is reconstructed from commit history.", style("Note:").cyan());
        println!("The current alpha does not record every ref-changing action.");

        return Ok(());
    }

    let reflog = Reflog::load(&reflog_path)?;

    if reflog.entries.is_empty() {
        println!("No entries in reflog for {}", ref_name);
        return Ok(());
    }

    let entries_to_show = std::cmp::min(limit, reflog.entries.len());

    for (i, entry) in reflog.entries.iter().take(entries_to_show).enumerate() {
        println!(
            "{} {}@{{{}}}: {}",
            style(&entry.hash.to_hex()[..7]).yellow(),
            ref_name,
            i,
            entry.action
        );
    }

    Ok(())
}

/// Record an action in the reflog.
pub fn record_reflog(
    repo: &Repository,
    ref_name: &str,
    hash: &Hash,
    previous: Option<Hash>,
    action: &str,
) -> Result<()> {
    let reflog_path = reflog_path(repo, ref_name)?;
    let parent = reflog_path
        .parent()
        .context("reflog path has no parent directory")?;
    fs::create_dir_all(parent)?;
    let mut reflog = Reflog::load(&reflog_path)?;

    reflog.add(ReflogEntry {
        hash: *hash,
        previous,
        action: action.to_string(),
        timestamp: Utc::now(),
    });

    reflog.save(&reflog_path)?;
    Ok(())
}

fn reflog_path(repo: &Repository, ref_name: &str) -> Result<std::path::PathBuf> {
    crate::store::validate_ref_name(ref_name)?;
    Ok(crate::util::safe_join_repo_path(repo.dits_dir(), &format!("logs/{ref_name}"))?)
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn reflog_names_are_confined_to_repository_metadata() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        assert_eq!(
            reflog_path(&repo, "refs/heads/main").unwrap(),
            repo.dits_dir().join("logs/refs/heads/main")
        );
        for invalid in ["", ".", "..", "../HEAD", "/absolute", "refs/../../HEAD"] {
            assert!(reflog_path(&repo, invalid).is_err(), "accepted {invalid}");
        }
    }

    #[test]
    fn nested_reflog_names_create_their_parent_directories() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        let hash = Hash::from_bytes([9; 32]);

        record_reflog(&repo, "refs/heads/feature/editor", &hash, None, "test").unwrap();

        assert!(repo
            .dits_dir()
            .join("logs/refs/heads/feature/editor")
            .is_file());
    }

    #[cfg(unix)]
    #[test]
    fn reflog_names_reject_symlinked_log_storage() {
        use std::os::unix::fs::symlink;

        let temp = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        symlink(outside.path(), repo.dits_dir().join("logs")).unwrap();

        assert!(reflog_path(&repo, "HEAD").is_err());
    }
}
