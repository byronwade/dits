//! `dits fetch-objects` — content-addressed incremental object pull from a local repo.

use crate::store::sync::{transfer_objects, transfer_objects_http};
use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::path::Path;

fn human(bytes: u64) -> String {
    const U: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    let mut v = bytes as f64;
    let mut i = 0;
    while v >= 1024.0 && i < U.len() - 1 {
        v /= 1024.0;
        i += 1;
    }
    format!("{:.1} {}", v, U[i])
}

/// Pull objects this repository is missing from another local dits repository. Only the
/// objects the destination lacks are transferred (content-addressed), so re-fetching is
/// free and an interrupted fetch resumes with only the remainder. Purely additive — never
/// deletes or overwrites local objects.
pub async fn fetch_objects(source: &str) -> Result<()> {
    // Ensure we are inside a dits repository.
    let _repo = Repository::open(Path::new("."))
        .context("Not a dits repository (or any parent directory)")?;

    println!("Fetching objects from {} ...", style(source).cyan());
    let stats = if source.starts_with("http://") || source.starts_with("https://") {
        // Remote: pull missing objects from a `dits serve` HTTP endpoint.
        transfer_objects_http(source, Path::new(".dits")).await?
    } else {
        // Local: copy missing objects from another repo on the filesystem.
        let src_dits = Path::new(source).join(".dits");
        anyhow::ensure!(
            src_dits.is_dir(),
            "source is not a dits repository: {} (no .dits/)",
            source
        );
        transfer_objects(&src_dits, Path::new(".dits"))?
    };

    println!(
        "  {} {} object(s), {}",
        style("copied:").bold(),
        style(stats.copied).green().bold(),
        human(stats.bytes)
    );
    println!(
        "  {} {} (deduplicated — already present, not transferred)",
        style("skipped:").bold(),
        stats.skipped
    );
    if stats.copied == 0 {
        println!("  {}", style("Already up to date.").green());
    }
    Ok(())
}
