//! Summarize commit history grouped by author (`dits shortlog`).

use crate::store::Repository;
use anyhow::{Context, Result};
use std::collections::HashMap;
use std::path::Path;

/// Options controlling `shortlog`.
#[derive(Clone, Debug, Default)]
pub struct ShortlogOptions {
    /// Sort authors by descending commit count.
    pub numbered: bool,
    /// Show only per-author counts, not individual messages.
    pub summary: bool,
    /// Include author email addresses in the heading.
    pub email: bool,
    /// Maximum commits to process (0 = all).
    pub limit: usize,
}

/// Per-author aggregation.
#[derive(Clone, Debug)]
pub struct ShortlogEntry {
    pub author: String,
    pub email: String,
    pub commits: Vec<String>,
}

impl ShortlogEntry {
    pub fn count(&self) -> usize {
        self.commits.len()
    }
}

/// Aggregate commit history by author.
pub fn shortlog(options: &ShortlogOptions) -> Result<Vec<ShortlogEntry>> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    let limit = if options.limit == 0 {
        usize::MAX
    } else {
        options.limit
    };
    let commits = repo.log(limit)?;

    // Group by author name (and email when requested) preserving first-seen order.
    let mut index: HashMap<String, usize> = HashMap::new();
    let mut entries: Vec<ShortlogEntry> = Vec::new();

    for commit in commits {
        let key = if options.email {
            format!("{} <{}>", commit.author.name, commit.author.email)
        } else {
            commit.author.name.clone()
        };
        let subject = commit
            .message
            .lines()
            .next()
            .unwrap_or("")
            .to_string();

        match index.get(&key) {
            Some(&i) => entries[i].commits.push(subject),
            None => {
                index.insert(key, entries.len());
                entries.push(ShortlogEntry {
                    author: commit.author.name,
                    email: commit.author.email,
                    commits: vec![subject],
                });
            }
        }
    }

    if options.numbered {
        entries.sort_by(|a, b| b.count().cmp(&a.count()).then_with(|| a.author.cmp(&b.author)));
    } else {
        entries.sort_by(|a, b| a.author.cmp(&b.author));
    }

    Ok(entries)
}

/// Print a shortlog.
pub fn print_shortlog(entries: &[ShortlogEntry], options: &ShortlogOptions) {
    for entry in entries {
        let heading = if options.email {
            format!("{} <{}>", entry.author, entry.email)
        } else {
            entry.author.clone()
        };

        if options.summary {
            println!("{:>6}\t{}", entry.count(), heading);
        } else {
            println!("{} ({}):", heading, entry.count());
            for subject in &entry.commits {
                println!("      {}", subject);
            }
            println!();
        }
    }
}
