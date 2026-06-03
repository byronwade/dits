//! Give a commit a human-readable name based on the nearest tag (`dits describe`).

use crate::core::Hash;
use crate::store::Repository;
use anyhow::{Context, Result};
use std::collections::HashMap;
use std::path::Path;

/// Options controlling `describe`.
#[derive(Clone, Debug)]
pub struct DescribeOptions {
    /// Commit to describe (defaults to HEAD).
    pub commit: Option<String>,
    /// Use any tag (placeholder: all tags are treated equally here).
    pub tags: bool,
    /// Use any ref (placeholder: branches are not yet used as describe anchors).
    pub all: bool,
    /// Always use the long `tag-N-gHASH` format even for an exact match.
    pub long: bool,
    /// Append `-dirty` if the working tree has uncommitted changes.
    pub dirty: bool,
    /// Number of hex characters in the abbreviated hash.
    pub abbrev: usize,
}

impl Default for DescribeOptions {
    fn default() -> Self {
        Self {
            commit: None,
            tags: false,
            all: false,
            long: false,
            dirty: false,
            abbrev: 7,
        }
    }
}

/// Result of describing a commit.
#[derive(Clone, Debug)]
pub struct DescribeResult {
    pub description: String,
}

/// Describe a commit relative to the nearest reachable tag.
pub fn describe(options: &DescribeOptions) -> Result<DescribeResult> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    // Resolve the starting commit.
    let start = match &options.commit {
        Some(c) => repo
            .resolve_ref_or_prefix(c)?
            .with_context(|| format!("Unknown revision: {}", c))?,
        None => repo
            .head()?
            .context("No commits yet (HEAD does not point to a commit)")?,
    };

    // Map tagged commit -> tag name.
    let mut tag_by_hash: HashMap<Hash, String> = HashMap::new();
    for tag in repo.refs().list_tags()? {
        if let Some(hash) = repo.refs().get_tag(&tag)? {
            tag_by_hash.entry(hash).or_insert(tag);
        }
    }

    let abbrev = options.abbrev.clamp(4, 40);
    let short = |h: &Hash| h.to_hex()[..abbrev.min(h.to_hex().len())].to_string();

    // Walk the first-parent chain counting distance to the nearest tag.
    let mut current = start;
    let mut distance = 0usize;
    let mut found: Option<String> = None;
    loop {
        if let Some(tag) = tag_by_hash.get(&current) {
            let base = if distance == 0 && !options.long {
                tag.clone()
            } else {
                format!("{}-{}-g{}", tag, distance, short(&start))
            };
            found = Some(base);
            break;
        }
        let commit = repo.load_commit(&current)?;
        match commit.parent {
            Some(parent) => {
                current = parent;
                distance += 1;
            }
            None => break,
        }
    }

    // No tag reachable: fall back to the abbreviated commit hash (git errors here).
    let mut description = found.unwrap_or_else(|| short(&start));

    if options.dirty {
        let status = repo.status()?;
        let dirty = !status.is_clean()
            || !status.untracked.is_empty()
            || !status.unstaged_renamed.is_empty();
        if dirty {
            description.push_str("-dirty");
        }
    }

    Ok(DescribeResult { description })
}

/// Print a describe result.
pub fn print_result(result: &DescribeResult) {
    println!("{}", result.description);
}
