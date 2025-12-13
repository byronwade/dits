//! Repository deduplication statistics (Phase 4).
//!
//! Shows comprehensive repo-level deduplication metrics.

use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::path::Path;

/// Display comprehensive repository deduplication statistics.
pub fn repo_stats(verbose: bool) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    // Get HEAD commit
    let head = match repo.head()? {
        Some(h) => h,
        None => {
            println!("{}", style("No commits yet - nothing to analyze.").yellow());
            return Ok(());
        }
    };

    let commit = repo.load_commit(&head)?;

    // Get basic stats
    let basic_stats = repo.stats()?;

    // Get dedup stats
    let dedup_stats = repo
        .compute_repo_dedup_stats(&head)
        .context("Failed to compute dedup stats")?;

    // Print header
    println!(
        "{} {}",
        style("Repository Statistics").bold().underlined(),
        style(format!("(commit {})", &head.to_hex()[..8])).dim()
    );
    println!();

    // Current branch
    if let Ok(Some(branch)) = repo.current_branch() {
        println!(
            "  Branch: {}",
            style(branch).cyan()
        );
    }
    println!(
        "  Commit: {}",
        style(&head.to_hex()[..12]).cyan()
    );
    println!(
        "  Message: {}",
        style(&commit.message).dim()
    );
    println!();

    // File summary
    println!("{}", style("Files:").bold());
    println!(
        "  Tracked files: {}",
        dedup_stats.file_count
    );
    println!();

    // Storage summary
    println!("{}", style("Storage:").bold());
    println!(
        "  Logical size:  {} {}",
        style(format_bytes(dedup_stats.logical_size)).white().bold(),
        style("(sum of all file sizes)").dim()
    );
    println!(
        "  Physical size: {} {}",
        style(format_bytes(dedup_stats.physical_size)).white().bold(),
        style("(actual storage used)").dim()
    );
    println!();

    // Deduplication metrics
    println!("{}", style("Deduplication:").bold());
    println!(
        "  Unique chunks: {}",
        dedup_stats.unique_chunk_count
    );
    println!(
        "  Space saved:   {} ({:.1}%)",
        style(format_bytes(dedup_stats.saved_bytes)).green().bold(),
        dedup_stats.savings_percentage
    );
    println!(
        "  Dedup ratio:   {:.3} {}",
        dedup_stats.dedup_ratio,
        style("(physical / logical, lower is better)").dim()
    );
    println!();

    // Interpretation
    println!("{}", style("Analysis:").bold());
    if dedup_stats.savings_percentage > 50.0 {
        println!(
            "  {} Excellent deduplication! Over half the data is shared.",
            style("✓").green().bold()
        );
    } else if dedup_stats.savings_percentage > 20.0 {
        println!(
            "  {} Good deduplication. Significant chunk reuse detected.",
            style("✓").green()
        );
    } else if dedup_stats.savings_percentage > 5.0 {
        println!(
            "  {} Moderate deduplication. Some chunk reuse detected.",
            style("○").yellow()
        );
    } else {
        println!(
            "  {} Limited deduplication. Files have mostly unique content.",
            style("○").yellow()
        );
        println!("    Consider versioning similar files to increase savings.");
    }

    // Object store stats
    if verbose {
        println!();
        println!("{}", style("Object Store:").bold());
        println!(
            "  Total chunks:    {}",
            basic_stats.chunk_count
        );
        println!(
            "  Total manifests: {}",
            basic_stats.manifest_count
        );
        println!(
            "  Total commits:   {}",
            basic_stats.commit_count
        );
        println!(
            "  Storage bytes:   {}",
            format_bytes(basic_stats.storage_bytes)
        );

        // Per-file breakdown
        println!();
        println!("{}", style("Per-File Breakdown:").bold());
        println!(
            "  {:<40} {:>12} {:>8} {:>8}",
            "Path", "Size", "Chunks", "Type"
        );
        println!("  {}", "-".repeat(72));

        let file_stats = repo.file_stats_for_commit(&head)?;
        for fs in file_stats {
            let file_type = if fs.is_mp4 { "MP4" } else { "file" };
            let display_path = if fs.path.len() > 38 {
                format!("...{}", &fs.path[fs.path.len()-35..])
            } else {
                fs.path.clone()
            };
            println!(
                "  {:<40} {:>12} {:>8} {:>8}",
                display_path,
                format_bytes_short(fs.file_size),
                fs.chunk_count,
                file_type
            );
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

/// Short format for tables.
fn format_bytes_short(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.1} GiB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MiB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KiB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}
