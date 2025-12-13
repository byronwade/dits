//! Cache statistics command.

use crate::store::Repository;
use anyhow::Result;
use std::path::Path;

/// Show cache statistics.
pub fn cache_stats() -> Result<()> {
    let repo = Repository::open(Path::new("."))?;
    let cache_dir = repo.dits_dir().join("cache");

    println!("Cache Statistics");
    println!("================");
    println!();

    // Check if cache directory exists
    if !cache_dir.exists() {
        println!("No cache directory found.");
        println!("Cache is created when using `dits mount`.");
        return Ok(());
    }

    // Calculate disk cache size
    let mut total_size = 0u64;
    let mut file_count = 0u64;

    for entry in walkdir::WalkDir::new(&cache_dir) {
        if let Ok(entry) = entry {
            if entry.file_type().is_file() {
                if let Ok(meta) = entry.metadata() {
                    total_size += meta.len();
                    file_count += 1;
                }
            }
        }
    }

    let size_str = if total_size > 1_073_741_824 {
        format!("{:.2} GB", total_size as f64 / 1_073_741_824.0)
    } else if total_size > 1_048_576 {
        format!("{:.2} MB", total_size as f64 / 1_048_576.0)
    } else {
        format!("{:.2} KB", total_size as f64 / 1024.0)
    };

    println!("Disk cache (L2):");
    println!("  Location: {}", cache_dir.display());
    println!("  Chunks:   {}", file_count);
    println!("  Size:     {}", size_str);
    println!();
    println!("Note: L1 (RAM) cache stats are only available during mount.");

    Ok(())
}
