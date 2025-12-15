//! Add files to staging area.

use crate::store::Repository;
use crate::util::{format_bytes, safe_percentage};
use anyhow::{Context, Result};
use console::style;
use indicatif::{ProgressBar, ProgressStyle};
use std::path::Path;

/// Add files to the staging area.
pub fn add(files: &[String]) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    let progress = ProgressBar::new(files.len() as u64);
    progress.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{bar:40.cyan/blue}] {pos}/{len} {msg}")
            .unwrap()
            .progress_chars("#>-"),
    );

    let mut total_result = crate::store::repository::AddResult::default();

    for file in files {
        progress.set_message(file.clone());

        match repo.add(file) {
            Ok(result) => {
                total_result.files_staged += result.files_staged;
                total_result.files_ignored += result.files_ignored;
                total_result.new_chunks += result.new_chunks;
                total_result.new_bytes += result.new_bytes;
                total_result.dedup_chunks += result.dedup_chunks;
                total_result.dedup_bytes += result.dedup_bytes;
            }
            Err(crate::store::repository::RepoError::FileNotFound(f)) => {
                progress.println(format!(
                    "{} File not found: {}",
                    style("!").yellow().bold(),
                    f
                ));
            }
            Err(crate::store::repository::RepoError::FileIgnored(f)) => {
                progress.println(format!(
                    "{} Ignored: {} (matches .ditsignore)",
                    style("!").yellow().bold(),
                    f
                ));
                total_result.files_ignored += 1;
            }
            Err(e) => {
                progress.println(format!(
                    "{} Error adding {}: {}",
                    style("✗").red().bold(),
                    file,
                    e
                ));
            }
        }

        progress.inc(1);
    }

    progress.finish_and_clear();

    // Print summary
    if total_result.files_staged > 0 {
        println!(
            "{} Staged {} file(s)",
            style("✓").green().bold(),
            total_result.files_staged
        );

        let total_bytes = total_result.new_bytes + total_result.dedup_bytes;
        let total_chunks = total_result.new_chunks + total_result.dedup_chunks;

        if total_chunks > 0 {
            println!(
                "  {} chunks ({} new, {} deduplicated)",
                total_chunks,
                total_result.new_chunks,
                total_result.dedup_chunks
            );

            if total_result.dedup_bytes > 0 {
                let saved_pct = safe_percentage(total_result.dedup_bytes, total_bytes);
                println!(
                    "  {} saved through deduplication ({:.1}%)",
                    format_bytes(total_result.dedup_bytes),
                    saved_pct
                );
            }
        }

        if total_result.files_ignored > 0 {
            println!(
                "  {} file(s) ignored",
                total_result.files_ignored
            );
        }
    } else if total_result.files_ignored > 0 {
        println!(
            "{} All {} file(s) were ignored",
            style("!").yellow().bold(),
            total_result.files_ignored
        );
    } else {
        println!("{} No files to stage", style("!").yellow().bold());
    }

    Ok(())
}

