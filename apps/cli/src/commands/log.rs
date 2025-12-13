//! Show commit history.

use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::collections::HashSet;
use std::path::Path;

/// Show commit history.
pub fn log(limit: usize, oneline: bool, graph: bool, all: bool) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    if graph {
        log_with_graph(&repo, limit, oneline, all)?;
    } else if all {
        log_all_branches(&repo, limit, oneline)?;
    } else {
        let commits = repo.log(limit)?;

        if commits.is_empty() {
            println!("No commits yet");
            return Ok(());
        }

        for commit in commits {
            if oneline {
                // Get branch/tag decorations
                let decorations = get_decorations(&repo, &commit.hash)?;
                let dec_str = if decorations.is_empty() {
                    String::new()
                } else {
                    format!(" ({})", decorations.join(", "))
                };

                println!(
                    "{}{} {}",
                    style(&commit.hash.to_hex()[..7]).yellow(),
                    style(&dec_str).cyan(),
                    commit.message.lines().next().unwrap_or(&commit.message)
                );
            } else {
                // Get branch/tag decorations
                let decorations = get_decorations(&repo, &commit.hash)?;
                let dec_str = if decorations.is_empty() {
                    String::new()
                } else {
                    format!(" ({})", decorations.join(", "))
                };

                println!(
                    "{} {}{}",
                    style("commit").yellow(),
                    style(commit.hash.to_hex()).yellow(),
                    style(&dec_str).cyan()
                );
                println!("Author: {} <{}>", commit.author.name, commit.author.email);
                println!("Date:   {}", commit.timestamp.format("%a %b %d %H:%M:%S %Y %z"));
                println!();
                println!("    {}", commit.message);
                println!();
            }
        }
    }

    Ok(())
}

/// Get decorations (branch names, tags) for a commit.
fn get_decorations(repo: &Repository, hash: &crate::core::Hash) -> Result<Vec<String>> {
    let mut decorations = Vec::new();

    // Check HEAD
    if let Some(head_hash) = repo.head()? {
        if head_hash == *hash {
            if let Some(branch) = repo.current_branch()? {
                decorations.push(format!("HEAD -> {}", style(&branch).green()));
            } else {
                decorations.push(style("HEAD").bold().red().to_string());
            }
        }
    }

    // Check branches
    for branch in repo.list_branches()? {
        if let Some(branch_hash) = repo.refs().get_branch(&branch)? {
            if branch_hash == *hash && !decorations.iter().any(|d| d.contains(&branch)) {
                decorations.push(style(&branch).green().to_string());
            }
        }
    }

    // Check tags
    for tag in repo.refs().list_tags()? {
        if let Some(tag_hash) = repo.refs().get_tag(&tag)? {
            if tag_hash == *hash {
                decorations.push(format!("tag: {}", style(&tag).yellow()));
            }
        }
    }

    Ok(decorations)
}

/// Show log with ASCII graph.
fn log_with_graph(repo: &Repository, limit: usize, oneline: bool, all: bool) -> Result<()> {
    let commits = if all {
        collect_all_commits(repo, limit)?
    } else {
        repo.log(limit)?
    };

    if commits.is_empty() {
        println!("No commits yet");
        return Ok(());
    }

    for (i, commit) in commits.iter().enumerate() {
        let decorations = get_decorations(repo, &commit.hash)?;
        let dec_str = if decorations.is_empty() {
            String::new()
        } else {
            format!(" ({})", decorations.join(", "))
        };

        // Simple linear graph
        let prefix = if i == 0 { "*" } else { "*" };
        let connector = if i < commits.len() - 1 { "|" } else { " " };

        if oneline {
            println!(
                "{} {}{} {}",
                style(prefix).yellow(),
                style(&commit.hash.to_hex()[..7]).yellow(),
                style(&dec_str).cyan(),
                commit.message.lines().next().unwrap_or(&commit.message)
            );
        } else {
            println!(
                "{} {} {}{}",
                style(prefix).yellow(),
                style("commit").yellow(),
                style(commit.hash.to_hex()).yellow(),
                style(&dec_str).cyan()
            );
            println!("{} Author: {} <{}>", style(connector).yellow(), commit.author.name, commit.author.email);
            println!("{} Date:   {}", style(connector).yellow(), commit.timestamp.format("%a %b %d %H:%M:%S %Y %z"));
            println!("{}", style(connector).yellow());
            println!("{}     {}", style(connector).yellow(), commit.message);
            println!("{}", style(connector).yellow());
        }
    }

    Ok(())
}

/// Log all branches.
fn log_all_branches(repo: &Repository, limit: usize, oneline: bool) -> Result<()> {
    let commits = collect_all_commits(repo, limit)?;

    if commits.is_empty() {
        println!("No commits yet");
        return Ok(());
    }

    for commit in commits {
        let decorations = get_decorations(repo, &commit.hash)?;
        let dec_str = if decorations.is_empty() {
            String::new()
        } else {
            format!(" ({})", decorations.join(", "))
        };

        if oneline {
            println!(
                "{}{} {}",
                style(&commit.hash.to_hex()[..7]).yellow(),
                style(&dec_str).cyan(),
                commit.message.lines().next().unwrap_or(&commit.message)
            );
        } else {
            println!(
                "{} {}{}",
                style("commit").yellow(),
                style(commit.hash.to_hex()).yellow(),
                style(&dec_str).cyan()
            );
            println!("Author: {} <{}>", commit.author.name, commit.author.email);
            println!("Date:   {}", commit.timestamp.format("%a %b %d %H:%M:%S %Y %z"));
            println!();
            println!("    {}", commit.message);
            println!();
        }
    }

    Ok(())
}

/// Collect commits from all branches.
fn collect_all_commits(repo: &Repository, limit: usize) -> Result<Vec<crate::core::Commit>> {
    let mut seen: HashSet<crate::core::Hash> = HashSet::new();
    let mut commits = Vec::new();

    // Collect from all branches
    for branch in repo.list_branches()? {
        if let Some(hash) = repo.refs().get_branch(&branch)? {
            collect_commits_recursive(repo, &hash, &mut seen, &mut commits)?;
        }
    }

    // Sort by timestamp (newest first)
    commits.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    // Limit results
    commits.truncate(limit);

    Ok(commits)
}

/// Recursively collect commits.
fn collect_commits_recursive(
    repo: &Repository,
    hash: &crate::core::Hash,
    seen: &mut HashSet<crate::core::Hash>,
    commits: &mut Vec<crate::core::Commit>,
) -> Result<()> {
    if seen.contains(hash) {
        return Ok(());
    }
    seen.insert(*hash);

    let commit = repo.load_commit(hash)?;
    let parent = commit.parent;
    commits.push(commit);

    if let Some(parent_hash) = parent {
        collect_commits_recursive(repo, &parent_hash, seen, commits)?;
    }

    Ok(())
}
