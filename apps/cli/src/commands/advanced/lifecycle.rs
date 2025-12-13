//! Lifecycle management commands (Phase 8).
//!
//! Commands for storage tiering, freeze/thaw operations.

use dits::lifecycle::{
    LifecycleManager, LifecyclePolicy, StorageTier, AccessStats,
};
use dits::store::Repository;
use anyhow::{Context, Result, bail};
use console::style;

/// Initialize lifecycle tracking for existing chunks.
pub fn freeze_init() -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let mut manager = LifecycleManager::open(repo.dits_dir())?;
    let count = manager.initialize_tracking()?;
    manager.save()?;

    if count > 0 {
        println!("{} Initialized tracking for {} chunk(s)", style("✓").green(), count);
    } else {
        println!("{}", style("No new chunks to track.").dim());
    }

    // Show current stats
    let stats = manager.stats();
    print_stats(&stats);

    Ok(())
}

/// Show freeze/storage tier status.
pub fn freeze_status() -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let manager = LifecycleManager::open(repo.dits_dir())?;
    let stats = manager.stats();

    println!("{}", style("Storage Tier Status:").bold().underlined());
    println!();
    print_stats(&stats);

    // Show pending transitions
    let transitions = manager.get_transitions();
    if !transitions.is_empty() {
        println!();
        println!("{}", style("Pending Transitions:").bold());
        println!(
            "  {} chunk(s) eligible for tier transition",
            style(transitions.len()).yellow()
        );

        let total_size: u64 = transitions.iter().map(|t| t.size).sum();
        println!(
            "  Total size: {}",
            AccessStats::format_size(total_size)
        );
        println!();
        println!(
            "{} Run {} to apply policy transitions",
            style("Hint:").cyan(),
            style("dits freeze --apply-policy").bold()
        );
    }

    Ok(())
}

/// Freeze chunks to a colder tier.
pub fn freeze(
    files: &[String],
    tier: Option<&str>,
    apply_policy: bool,
    all_cold: bool,
) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let mut manager = LifecycleManager::open(repo.dits_dir())?;

    // Initialize tracking if needed
    let init_count = manager.initialize_tracking()?;
    if init_count > 0 {
        println!(
            "{} Initialized tracking for {} chunk(s)",
            style("→").blue(),
            init_count
        );
    }

    if apply_policy {
        // Apply lifecycle policy
        println!("{} Applying lifecycle policy...", style("→").blue());
        let result = manager.apply_policy()?;

        if result.frozen.is_empty() {
            println!("{}", style("No chunks eligible for transition.").dim());
        } else {
            println!(
                "{} Moved {} chunk(s) ({}) to colder tiers",
                style("✓").green(),
                result.frozen.len(),
                AccessStats::format_size(result.bytes_moved)
            );
        }

        if !result.protected.is_empty() {
            println!(
                "  {} {} protected chunk(s) skipped (proxies/manifests)",
                style("→").blue(),
                result.protected.len()
            );
        }
    } else if all_cold {
        // Freeze all non-protected chunks to archive
        let target = StorageTier::from_str(tier.unwrap_or("archive"))
            .unwrap_or(StorageTier::Archive);

        println!(
            "{} Freezing all eligible chunks to {} tier...",
            style("→").blue(),
            style(target.name()).cyan()
        );

        let hot_chunks = manager.chunks_by_tier(StorageTier::Hot);
        let warm_chunks = manager.chunks_by_tier(StorageTier::Warm);
        let cold_chunks = manager.chunks_by_tier(StorageTier::Cold);

        let mut all_chunks = hot_chunks;
        if target != StorageTier::Warm {
            all_chunks.extend(warm_chunks);
        }
        if target == StorageTier::Archive {
            all_chunks.extend(cold_chunks);
        }

        let result = manager.freeze(&all_chunks, target)?;

        println!(
            "{} Frozen {} chunk(s) ({})",
            style("✓").green(),
            result.frozen.len(),
            AccessStats::format_size(result.bytes_moved)
        );

        if !result.protected.is_empty() {
            println!(
                "  {} {} protected chunk(s) skipped",
                style("→").blue(),
                result.protected.len()
            );
        }
    } else if !files.is_empty() {
        // Freeze specific files
        let target = StorageTier::from_str(tier.unwrap_or("cold"))
            .unwrap_or(StorageTier::Cold);

        println!(
            "{} Freezing {} file(s) to {} tier...",
            style("→").blue(),
            files.len(),
            style(target.name()).cyan()
        );

        // Get chunks for files
        let hashes = get_file_chunks(&repo, files)?;

        if hashes.is_empty() {
            println!("{}", style("No chunks found for specified files.").yellow());
            return Ok(());
        }

        let result = manager.freeze(&hashes, target)?;

        println!(
            "{} Frozen {} chunk(s) ({})",
            style("✓").green(),
            result.frozen.len(),
            AccessStats::format_size(result.bytes_moved)
        );
    } else {
        // Show help
        println!("{}", style("Usage:").bold());
        println!("  dits freeze --apply-policy    Apply lifecycle policy transitions");
        println!("  dits freeze --all             Freeze all eligible chunks to archive");
        println!("  dits freeze <file>...         Freeze specific files");
        println!("  dits freeze --tier warm <file>...  Freeze to specific tier");
    }

    manager.save()?;
    Ok(())
}

/// Thaw chunks from cold/archive storage.
pub fn thaw(files: &[String], all: bool) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let mut manager = LifecycleManager::open(repo.dits_dir())?;

    if all {
        // Thaw all archived/cold chunks
        println!("{} Thawing all frozen chunks...", style("→").blue());

        let cold_chunks = manager.chunks_by_tier(StorageTier::Cold);
        let archive_chunks = manager.chunks_by_tier(StorageTier::Archive);

        let mut all_chunks = cold_chunks;
        all_chunks.extend(archive_chunks);

        if all_chunks.is_empty() {
            println!("{}", style("No frozen chunks to thaw.").dim());
            return Ok(());
        }

        let result = manager.thaw(&all_chunks)?;

        println!(
            "{} Thawed {} chunk(s) ({})",
            style("✓").green(),
            result.thawed.len(),
            AccessStats::format_size(result.bytes_restored)
        );
    } else if !files.is_empty() {
        // Thaw specific files
        println!("{} Thawing {} file(s)...", style("→").blue(), files.len());

        let hashes = get_file_chunks(&repo, files)?;

        if hashes.is_empty() {
            println!("{}", style("No chunks found for specified files.").yellow());
            return Ok(());
        }

        // Check if any need async thaw
        let mut needs_async = Vec::new();
        let mut can_thaw = Vec::new();

        for hash in &hashes {
            if manager.requires_thaw(hash) {
                needs_async.push(*hash);
            } else {
                can_thaw.push(*hash);
            }
        }

        // Thaw immediately available chunks
        if !can_thaw.is_empty() {
            let result = manager.thaw(&can_thaw)?;
            println!(
                "{} Thawed {} chunk(s) ({})",
                style("✓").green(),
                result.thawed.len(),
                AccessStats::format_size(result.bytes_restored)
            );
        }

        // Request async thaw for archived chunks
        if !needs_async.is_empty() {
            let statuses = manager.request_thaw(&needs_async)?;
            println!(
                "{} Requested thaw for {} archived chunk(s)",
                style("→").blue(),
                statuses.len()
            );
            for status in &statuses {
                if let Some(eta) = status.eta_seconds {
                    println!(
                        "  {} ETA: {} seconds",
                        style(status.hash.short()).dim(),
                        eta
                    );
                }
            }
            println!();
            println!(
                "{} Run {} to complete thaw when ready",
                style("Hint:").cyan(),
                style("dits thaw --process-queue").bold()
            );
        }
    } else {
        // Process pending thaw queue
        println!("{} Processing thaw queue...", style("→").blue());

        let result = manager.process_thaw_queue()?;

        if result.thawed.is_empty() {
            println!("{}", style("No chunks ready to thaw.").dim());
        } else {
            println!(
                "{} Thawed {} chunk(s) ({})",
                style("✓").green(),
                result.thawed.len(),
                AccessStats::format_size(result.bytes_restored)
            );
        }
    }

    manager.save()?;
    Ok(())
}

/// Set lifecycle policy.
pub fn freeze_policy(policy_name: Option<&str>, list: bool) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let mut manager = LifecycleManager::open(repo.dits_dir())?;

    if list {
        println!("{}", style("Available Policies:").bold().underlined());
        println!();
        println!("  {} - Move to warm after 30d, cold after 6mo, archive after 2yr", style("default").cyan());
        println!("  {} - Move to warm after 7d, cold after 30d, archive after 90d", style("aggressive").cyan());
        println!("  {} - Move to warm after 90d, cold after 1yr, archive after 3yr", style("conservative").cyan());
        return Ok(());
    }

    if let Some(name) = policy_name {
        let policy = match name {
            "default" => LifecyclePolicy::default_policy(),
            "aggressive" => LifecyclePolicy::aggressive_policy(),
            "conservative" => LifecyclePolicy::conservative_policy(),
            _ => bail!("Unknown policy: {}. Use: default, aggressive, conservative", name),
        };

        manager.set_policy(policy);
        manager.save_policy()?;

        println!(
            "{} Set lifecycle policy to '{}'",
            style("✓").green(),
            style(name).cyan()
        );
    } else {
        println!("{}", style("Current policy rules:").bold());
        // Would show current policy rules here
        println!();
        println!(
            "{} Use {} to see available policies",
            style("Hint:").cyan(),
            style("dits freeze-policy --list").bold()
        );
    }

    Ok(())
}

// Helper functions

fn print_stats(stats: &AccessStats) {
    println!("  {} {} chunk(s) ({})",
        style("Hot:").green().bold(),
        stats.hot_chunks,
        AccessStats::format_size(stats.hot_size)
    );
    println!("  {} {} chunk(s) ({})",
        style("Warm:").yellow().bold(),
        stats.warm_chunks,
        AccessStats::format_size(stats.warm_size)
    );
    println!("  {} {} chunk(s) ({})",
        style("Cold:").blue().bold(),
        stats.cold_chunks,
        AccessStats::format_size(stats.cold_size)
    );
    println!("  {} {} chunk(s) ({})",
        style("Archive:").magenta().bold(),
        stats.archive_chunks,
        AccessStats::format_size(stats.archive_size)
    );
    println!();
    println!("  Total: {} chunk(s) ({})",
        stats.total_chunks,
        AccessStats::format_size(stats.total_size)
    );

    if stats.proxy_chunks > 0 {
        println!();
        println!("  {} {} proxy chunk(s) (protected)",
            style("Proxies:").dim(),
            stats.proxy_chunks
        );
    }
}

fn get_file_chunks(repo: &Repository, files: &[String]) -> Result<Vec<dits::core::Hash>> {
    let mut hashes = Vec::new();

    // Get manifest from HEAD
    let head = repo.head()?.context("No commits yet")?;
    let commit = repo.load_commit(&head)?;
    let manifest = repo.load_manifest(&commit.manifest)?;

    for file in files {
        let normalized = file.replace('\\', "/");
        if let Some(entry) = manifest.entries.get(&normalized) {
            for chunk_ref in &entry.chunks {
                hashes.push(chunk_ref.hash);
            }
        }
    }

    Ok(hashes)
}
