//! Reflog command - show reference history.

use crate::core::Hash;
use crate::store::Repository;
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use console::style;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// A single reflog entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflogEntry {
    /// The commit hash after this action.
    pub hash: Hash,
    /// The previous commit hash (if any).
    pub previous: Option<Hash>,
    /// Description of the action.
    pub action: String,
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
    let reflog_path = repo.dits_dir().join("logs").join(ref_name);

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
            let action = if i == 0 {
                format!("commit: {}", commit.message.lines().next().unwrap_or(&commit.message))
            } else {
                format!("commit: {}", commit.message.lines().next().unwrap_or(&commit.message))
            };

            println!(
                "{} {}@{{{}}}: {}",
                style(&commit.hash.to_hex()[..7]).yellow(),
                ref_name,
                i,
                action
            );
        }

        println!();
        println!(
            "{} Reflog is reconstructed from commit history.",
            style("Note:").cyan()
        );
        println!("Future actions will be recorded automatically.");

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
    let logs_dir = repo.dits_dir().join("logs");
    fs::create_dir_all(&logs_dir)?;

    let reflog_path = logs_dir.join(ref_name);
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
