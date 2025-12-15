//! Inspect file deduplication statistics (Phase 4).
//!
//! Shows detailed chunk-level deduplication stats for a tracked file.

use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;

/// Inspect a tracked file's deduplication statistics.
pub fn inspect_file(path: &str, show_chunks: bool) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    // Get HEAD commit
    let head = repo
        .head()?
        .context("No commits yet - nothing to inspect")?;

    let commit = repo.load_commit(&head)?;

    // Get file dedup stats
    let stats = repo
        .compute_file_dedup_stats(&head, path)
        .context("Failed to compute file stats")?;

    // Print header
    println!(
        "{} {}",
        style("Inspecting:").bold(),
        style(path).yellow()
    );
    println!();

    // File info
    println!("{}", style("File Information:").bold().underlined());
    println!(
        "  Path:         {}",
        stats.path
    );
    println!(
        "  Commit:       {}",
        style(&head.to_hex()[..12]).cyan()
    );
    println!(
        "  Manifest:     {}",
        style(&stats.manifest_hash.to_hex()[..12]).dim()
    );
    println!(
        "  Content hash: {}",
        style(&stats.content_hash.to_hex()[..12]).dim()
    );
    if stats.is_mp4 {
        println!(
            "  Type:         {}",
            style("MP4 (structure-aware)").green()
        );
    }
    println!();

    // Size info
    println!("{}", style("Size:").bold().underlined());
    println!(
        "  Logical size:          {}",
        format_bytes(stats.logical_size)
    );
    println!(
        "  Estimated unique size: {}",
        format_bytes(stats.estimated_unique_bytes)
    );
    println!();

    // Chunk breakdown
    println!("{}", style("Chunk Breakdown:").bold().underlined());
    println!(
        "  Total chunks:  {}",
        stats.chunk_count
    );
    println!(
        "  Shared chunks: {} ({:.1}%)",
        style(stats.shared_chunk_count).green(),
        stats.shared_percentage()
    );
    println!(
        "  Unique chunks: {} ({:.1}%)",
        style(stats.unique_chunk_count).yellow(),
        stats.unique_percentage()
    );
    println!();

    // Dedup interpretation
    println!("{}", style("Deduplication Analysis:").bold().underlined());
    if stats.shared_chunk_count > 0 {
        let savings = stats.logical_size.saturating_sub(stats.estimated_unique_bytes);
        println!(
            "  This file shares {} chunks with other files in the repo.",
            style(stats.shared_chunk_count).green()
        );
        println!(
            "  Estimated storage savings: {} ({:.1}% of file)",
            style(format_bytes(savings)).green(),
            (savings as f64 / stats.logical_size as f64) * 100.0
        );
    } else {
        println!(
            "  {}",
            style("All chunks are unique to this file.").yellow()
        );
        println!("  Consider adding similar files to increase deduplication.");
    }

    // Optional: show all chunk hashes
    if show_chunks {
        println!();
        println!("{}", style("Chunk Hashes:").bold().underlined());
        for (i, hash) in stats.chunk_hashes.iter().enumerate() {
            println!("  [{:4}] {}", i, hash.to_hex());
        }
    }

    Ok(())
}

/// Format bytes as human-readable string.
fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GiB ({} bytes)", bytes as f64 / GB as f64, bytes)
    } else if bytes >= MB {
        format!("{:.2} MiB ({} bytes)", bytes as f64 / MB as f64, bytes)
    } else if bytes >= KB {
        format!("{:.2} KiB ({} bytes)", bytes as f64 / KB as f64, bytes)
    } else {
        format!("{} bytes", bytes)
    }
}
