//! Bisect command - binary search for bugs.

use crate::core::Hash;
use crate::store::Repository;
use anyhow::{Context, Result, bail};
use console::style;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// Bisect state.
#[derive(Debug, Serialize, Deserialize)]
struct BisectState {
    /// Original HEAD before bisect started.
    original_head: String,
    /// Known good commit.
    good: Option<Hash>,
    /// Known bad commit.
    bad: Option<Hash>,
    /// List of all commits between good and bad.
    commits: Vec<Hash>,
    /// Commits marked as good.
    good_commits: Vec<Hash>,
    /// Commits marked as bad.
    bad_commits: Vec<Hash>,
    /// Currently testing commit.
    current: Option<Hash>,
}

impl BisectState {
    fn new(original_head: String) -> Self {
        Self {
            original_head,
            good: None,
            bad: None,
            commits: Vec::new(),
            good_commits: Vec::new(),
            bad_commits: Vec::new(),
            current: None,
        }
    }

    fn remaining(&self) -> usize {
        if self.commits.is_empty() {
            return 0;
        }
        // Binary search remaining
        let total = self.commits.len();
        let tested = self.good_commits.len() + self.bad_commits.len();
        if tested >= total {
            0
        } else {
            // Approximate remaining steps in binary search
            let remaining = total - tested;
            (remaining as f64).log2().ceil() as usize
        }
    }
}

/// Bisect command handler.
pub fn bisect(
    action: Option<&str>,
    commit: Option<&str>,
) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    let bisect_file = repo.dits_dir().join("BISECT");

    match action {
        Some("start") => bisect_start(&repo, &bisect_file),
        Some("good") => bisect_mark(&repo, &bisect_file, commit, true),
        Some("bad") => bisect_mark(&repo, &bisect_file, commit, false),
        Some("reset") => bisect_reset(&repo, &bisect_file),
        Some("status") => bisect_status(&bisect_file),
        Some(other) => bail!("Unknown bisect action: {}. Use: start, good, bad, reset, status", other),
        None => {
            if bisect_file.exists() {
                bisect_status(&bisect_file)
            } else {
                println!("No bisect session in progress.");
                println!();
                println!("Start with:");
                println!("  dits bisect start");
                println!("  dits bisect bad HEAD");
                println!("  dits bisect good <known-good-commit>");
                Ok(())
            }
        }
    }
}

/// Start a bisect session.
fn bisect_start(repo: &Repository, bisect_file: &Path) -> Result<()> {
    if bisect_file.exists() {
        bail!("Bisect session already in progress. Use 'dits bisect reset' to abort.");
    }

    let original_head = if let Some(branch) = repo.current_branch()? {
        branch
    } else {
        repo.head()?
            .map(|h| h.to_hex())
            .unwrap_or_else(|| "HEAD".to_string())
    };

    let state = BisectState::new(original_head);
    let json = serde_json::to_string_pretty(&state)?;
    fs::write(bisect_file, json)?;

    println!("{}", style("Bisect session started.").green().bold());
    println!();
    println!("Mark commits as good or bad:");
    println!("  dits bisect bad <commit>   # Mark a commit as bad");
    println!("  dits bisect good <commit>  # Mark a commit as good");
    println!();
    println!("Dits will checkout commits for you to test.");

    Ok(())
}

/// Mark a commit as good or bad.
fn bisect_mark(repo: &Repository, bisect_file: &Path, commit: Option<&str>, is_good: bool) -> Result<()> {
    if !bisect_file.exists() {
        bail!("No bisect session in progress. Run 'dits bisect start' first.");
    }

    let json = fs::read_to_string(bisect_file)?;
    let mut state: BisectState = serde_json::from_str(&json)?;

    // Resolve commit
    let commit_hash = if let Some(ref_str) = commit {
        repo.resolve_ref_or_prefix(ref_str)?
            .with_context(|| format!("Could not resolve '{}' to a commit", ref_str))?
    } else {
        // Use current HEAD
        repo.head()?.context("No HEAD to mark")?
    };

    if is_good {
        if state.good.is_none() {
            state.good = Some(commit_hash);
            println!(
                "{} Marked {} as the known good commit",
                style("✓").green(),
                &commit_hash.to_hex()[..7]
            );
        } else {
            state.good_commits.push(commit_hash);
            println!(
                "{} Marked {} as good",
                style("✓").green(),
                &commit_hash.to_hex()[..7]
            );
        }
    } else {
        if state.bad.is_none() {
            state.bad = Some(commit_hash);
            println!(
                "{} Marked {} as the known bad commit",
                style("✗").red(),
                &commit_hash.to_hex()[..7]
            );
        } else {
            state.bad_commits.push(commit_hash);
            println!(
                "{} Marked {} as bad",
                style("✗").red(),
                &commit_hash.to_hex()[..7]
            );
        }
    }

    // If we have both good and bad, start bisecting
    if let (Some(good), Some(bad)) = (state.good, state.bad) {
        if state.commits.is_empty() {
            // Collect commits between good and bad
            state.commits = collect_commits_between(repo, &good, &bad)?;

            if state.commits.is_empty() {
                println!();
                println!("{}", style("No commits between good and bad!").yellow());
                fs::remove_file(bisect_file)?;
                return Ok(());
            }

            println!();
            println!(
                "Bisecting: {} revision{} left to test",
                state.commits.len(),
                if state.commits.len() == 1 { "" } else { "s" }
            );
        }

        // Find next commit to test
        let next = find_midpoint(&state.commits, &state.good_commits, &state.bad_commits);

        if let Some(next_hash) = next {
            state.current = Some(next_hash);

            // Checkout the commit
            repo.checkout(&next_hash)?;
            repo.refs().set_head_detached(&next_hash)?;

            let commit = repo.load_commit(&next_hash)?;
            println!();
            println!(
                "[{}] {}",
                style(&next_hash.to_hex()[..7]).yellow(),
                commit.message.lines().next().unwrap_or(&commit.message)
            );
            println!();
            println!("Test this version, then mark it:");
            println!("  dits bisect good  # if the bug is NOT present");
            println!("  dits bisect bad   # if the bug IS present");
        } else {
            // We found it!
            let first_bad = state.bad_commits.last()
                .or(state.bad.as_ref())
                .copied();

            if let Some(bad_hash) = first_bad {
                let commit = repo.load_commit(&bad_hash)?;
                println!();
                println!("{}", style("Bisect complete!").green().bold());
                println!();
                println!(
                    "{} is the first bad commit",
                    style(&bad_hash.to_hex()).yellow()
                );
                println!();
                println!("Author: {} <{}>", commit.author.name, commit.author.email);
                println!("Date:   {}", commit.timestamp.format("%Y-%m-%d %H:%M:%S"));
                println!();
                println!("    {}", commit.message);
                println!();
                println!("Run 'dits bisect reset' to return to your original HEAD.");
            }
        }
    }

    // Save state
    let json = serde_json::to_string_pretty(&state)?;
    fs::write(bisect_file, json)?;

    Ok(())
}

/// Collect commits between good and bad.
fn collect_commits_between(repo: &Repository, good: &Hash, bad: &Hash) -> Result<Vec<Hash>> {
    let mut commits = Vec::new();
    let mut current = Some(*bad);

    while let Some(hash) = current {
        if hash == *good {
            break;
        }

        let commit = repo.load_commit(&hash)?;
        commits.push(hash);
        current = commit.parent;
    }

    // Don't include the bad commit itself in the search
    if !commits.is_empty() {
        commits.remove(0);
    }

    Ok(commits)
}

/// Find the midpoint commit to test.
fn find_midpoint(
    commits: &[Hash],
    good: &[Hash],
    bad: &[Hash],
) -> Option<Hash> {
    // Filter out already tested commits
    let untested: Vec<&Hash> = commits.iter()
        .filter(|h| !good.contains(h) && !bad.contains(h))
        .collect();

    if untested.is_empty() {
        return None;
    }

    // Return the middle one
    let mid = untested.len() / 2;
    Some(*untested[mid])
}

/// Reset bisect session.
fn bisect_reset(repo: &Repository, bisect_file: &Path) -> Result<()> {
    if !bisect_file.exists() {
        println!("No bisect session in progress.");
        return Ok(());
    }

    let json = fs::read_to_string(bisect_file)?;
    let state: BisectState = serde_json::from_str(&json)?;

    // Restore original HEAD
    if let Ok(hash) = Hash::from_hex(&state.original_head) {
        repo.refs().set_head_detached(&hash)?;
    } else {
        // It's a branch name
        if let Some(branch_hash) = repo.refs().get_branch(&state.original_head)? {
            repo.checkout(&branch_hash)?;
            repo.refs().set_head_branch(&state.original_head)?;
        }
    }

    // Clean up
    fs::remove_file(bisect_file)?;

    println!(
        "{} Bisect session ended, returned to {}",
        style("→").green(),
        state.original_head
    );

    Ok(())
}

/// Show bisect status.
fn bisect_status(bisect_file: &Path) -> Result<()> {
    if !bisect_file.exists() {
        println!("No bisect session in progress.");
        return Ok(());
    }

    let json = fs::read_to_string(bisect_file)?;
    let state: BisectState = serde_json::from_str(&json)?;

    println!("{}", style("Bisect Status").bold().underlined());
    println!();

    if let Some(ref good) = state.good {
        println!("  Good: {}", style(&good.to_hex()[..7]).green());
    } else {
        println!("  Good: {}", style("not set").dim());
    }

    if let Some(ref bad) = state.bad {
        println!("  Bad:  {}", style(&bad.to_hex()[..7]).red());
    } else {
        println!("  Bad:  {}", style("not set").dim());
    }

    if let Some(ref current) = state.current {
        println!("  Testing: {}", style(&current.to_hex()[..7]).yellow());
    }

    if !state.commits.is_empty() {
        let remaining = state.remaining();
        println!();
        println!(
            "  ~{} step{} remaining (approximately {} commit{} to test)",
            remaining,
            if remaining == 1 { "" } else { "s" },
            state.commits.len() - state.good_commits.len() - state.bad_commits.len(),
            ""
        );
    }

    Ok(())
}
