//! Proxy generation and management commands (Phase 6).
//!
//! Commands for generating and managing video proxy files.

use dits::proxy::{ProxyConfig, ProxyGenerator, ProxyStore, ProxyResolution, ProxyCodec};
use dits::store::Repository;
use dits::core::Hasher;
use anyhow::{Context, Result, bail};
use console::style;
use indicatif::{ProgressBar, ProgressStyle};

/// Generate proxies for video files.
pub fn proxy_generate(
    files: &[String],
    resolution: Option<&str>,
    codec: Option<&str>,
    preset: Option<&str>,
    all: bool,
) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    // Check FFmpeg availability
    let ffmpeg_version = ProxyGenerator::check_ffmpeg()
        .context("FFmpeg is required for proxy generation")?;
    println!("{} FFmpeg: {}", style("✓").green(), ffmpeg_version);

    ProxyGenerator::check_ffprobe()
        .context("FFprobe is required for proxy generation")?;

    // Initialize proxy store
    let proxy_store = ProxyStore::new(repo.dits_dir());
    proxy_store.init()?;

    // Build config from options
    let config = build_config(resolution, codec, preset)?;

    println!(
        "  Resolution: {} | Codec: {}",
        style(format!("{:?}", config.resolution)).cyan(),
        style(format!("{:?}", config.codec)).cyan()
    );
    println!();

    // Get files to process
    let video_files = if all {
        find_all_video_files(&repo)?
    } else if files.is_empty() {
        bail!("No files specified. Use --all to generate proxies for all videos.");
    } else {
        files.iter().map(|s| s.to_string()).collect()
    };

    if video_files.is_empty() {
        println!("{}", style("No video files to process.").yellow());
        return Ok(());
    }

    println!("{} Processing {} video file(s)...", style("→").blue(), video_files.len());
    println!();

    let generator = ProxyGenerator::new(config);
    let output_dir = repo.dits_dir().join("proxies").join("temp");
    std::fs::create_dir_all(&output_dir)?;

    let mut success_count = 0;
    let skip_count = 0;
    let mut error_count = 0;

    for file_path in &video_files {
        let display_path = if file_path.len() > 50 {
            format!("...{}", &file_path[file_path.len()-47..])
        } else {
            file_path.clone()
        };

        // Check if file exists
        let full_path = cwd.join(file_path);
        if !full_path.exists() {
            println!(
                "  {} {} (file not found)",
                style("✗").red(),
                display_path
            );
            error_count += 1;
            continue;
        }

        // Create progress bar for this file
        let pb = ProgressBar::new_spinner();
        pb.set_style(
            ProgressStyle::default_spinner()
                .template("{spinner:.blue} {msg}")
                .unwrap()
        );
        pb.set_message(format!("Generating proxy for {}...", display_path));
        pb.enable_steady_tick(std::time::Duration::from_millis(100));

        match generator.generate(&full_path, &output_dir) {
            Ok(result) => {
                pb.finish_and_clear();

                // Store variant metadata
                proxy_store.store(&result.variant)?;

                // Store proxy data
                let proxy_data = std::fs::read(&result.proxy_path)?;
                proxy_store.store_data(&result.variant.content_hash, &proxy_data)?;

                // Store thumbnail data if generated
                let variant_size = result.variant.size;
                if let Some(ref thumb_path) = result.thumbnail_path {
                    if thumb_path.exists() {
                        let thumb_data = std::fs::read(thumb_path)?;
                        let thumb_hash = Hasher::hash(&thumb_data);
                        proxy_store.store_data(&thumb_hash, &thumb_data)?;
                        // Update variant with thumbnail hash
                        let updated_variant = result.variant.with_thumbnail(thumb_hash);
                        proxy_store.store(&updated_variant)?;
                    }
                }

                // Clean up temp files
                let _ = std::fs::remove_file(&result.proxy_path);
                if let Some(ref thumb_path) = result.thumbnail_path {
                    let _ = std::fs::remove_file(thumb_path);
                }

                let size_mb = variant_size as f64 / (1024.0 * 1024.0);
                println!(
                    "  {} {} ({:.1} MB, {:.1}s)",
                    style("✓").green(),
                    display_path,
                    size_mb,
                    result.proxy_duration
                );
                success_count += 1;
            }
            Err(e) => {
                pb.finish_and_clear();
                println!(
                    "  {} {} ({})",
                    style("✗").red(),
                    display_path,
                    e
                );
                error_count += 1;
            }
        }
    }

    // Clean up temp directory
    let _ = std::fs::remove_dir(&output_dir);

    println!();
    println!(
        "{} Generated: {}, Skipped: {}, Errors: {}",
        style("Summary:").bold(),
        style(success_count).green(),
        style(skip_count).yellow(),
        style(error_count).red()
    );

    Ok(())
}

/// Show proxy status for repository.
pub fn proxy_status() -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let proxy_store = ProxyStore::new(repo.dits_dir());

    // Get stats
    let stats = proxy_store.stats()?;

    println!("{}", style("Proxy Status").bold().underlined());
    println!();

    if stats.variant_count == 0 {
        println!("{}", style("  No proxies generated yet.").dim());
        println!();
        println!("Generate proxies with: dits proxy-generate --all");
        return Ok(());
    }

    println!("  Variants:    {}", stats.variant_count);
    println!("  Data files:  {}", stats.data_files);
    println!("  Total size:  {}", stats.data_size_human());
    println!();

    if !stats.by_type.is_empty() {
        println!("{}", style("By Type:").bold());
        for (type_name, count) in &stats.by_type {
            println!("  {}: {}", style(type_name).cyan(), count);
        }
    }

    Ok(())
}

/// List all generated proxies.
pub fn proxy_list(verbose: bool) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let proxy_store = ProxyStore::new(repo.dits_dir());
    let variants = proxy_store.list_all()?;

    if variants.is_empty() {
        println!("{}", style("No proxies generated yet.").dim());
        println!("Generate proxies with: dits proxy-generate --all");
        return Ok(());
    }

    println!("{}", style("Generated Proxies:").bold().underlined());
    println!();

    for variant in &variants {
        let size_str = if variant.size >= 1024 * 1024 {
            format!("{:.1} MB", variant.size as f64 / (1024.0 * 1024.0))
        } else {
            format!("{:.1} KB", variant.size as f64 / 1024.0)
        };

        if verbose {
            println!("  {}", style(&variant.id[..8]).yellow());
            println!("    Type:    {}", variant.variant_type);
            println!("    Parent:  {}", &variant.parent_hash.to_hex()[..12]);
            println!("    Size:    {}", size_str);
            if let Some(duration) = variant.duration {
                println!("    Duration: {:.2}s", duration);
            }
            if let (Some(w), Some(h)) = (variant.width, variant.height) {
                println!("    Resolution: {}x{}", w, h);
            }
            if let Some(ref codec) = variant.codec {
                println!("    Codec:   {}", codec);
            }
            println!("    Created: {}", variant.created_at.format("%Y-%m-%d %H:%M:%S"));
            println!();
        } else {
            let dims = match (variant.width, variant.height) {
                (Some(w), Some(h)) => format!("{}x{}", w, h),
                _ => "?".to_string(),
            };
            println!(
                "  {} {} ({}, {})",
                style(&variant.parent_hash.to_hex()[..8]).yellow(),
                variant.variant_type,
                dims,
                size_str
            );
        }
    }

    if !verbose {
        println!();
        println!("Use --verbose for more details.");
    }

    Ok(())
}

/// Delete proxies for specific files or all proxies.
pub fn proxy_delete(files: &[String], all: bool) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let proxy_store = ProxyStore::new(repo.dits_dir());

    if all {
        // Delete all proxies
        let variants = proxy_store.list_all()?;
        let count = variants.len();

        for variant in variants {
            proxy_store.delete(&variant.parent_hash, variant.variant_type)?;
        }

        println!(
            "{} Deleted {} proxy variant(s)",
            style("✓").green(),
            count
        );
    } else if files.is_empty() {
        bail!("No files specified. Use --all to delete all proxies.");
    } else {
        // Delete proxies for specific files
        // We need to find the content hash of the original file to match with proxy parent_hash
        let mut deleted_count = 0;

        for file_path in files {
            let full_path = cwd.join(file_path);

            // Compute content hash of the file
            let file_hash = if full_path.exists() {
                let data = std::fs::read(&full_path)?;
                dits::core::Hasher::hash(&data)
            } else {
                // Try to find from index
                let index = repo.load_index()?;
                if let Some(entry) = index.entries.get(file_path) {
                    entry.content_hash
                } else {
                    println!(
                        "  {} {} (file not found and not in index)",
                        style("✗").red(),
                        file_path
                    );
                    continue;
                }
            };

            // Find and delete matching proxies
            let variants = proxy_store.list_all()?;
            let matching: Vec<_> = variants
                .into_iter()
                .filter(|v| v.parent_hash == file_hash)
                .collect();

            if matching.is_empty() {
                println!(
                    "  {} {} (no proxies found)",
                    style("!").yellow(),
                    file_path
                );
            } else {
                for variant in &matching {
                    proxy_store.delete(&variant.parent_hash, variant.variant_type.clone())?;
                    deleted_count += 1;
                }
                println!(
                    "  {} {} ({} proxy variant(s) deleted)",
                    style("✓").green(),
                    file_path,
                    matching.len()
                );
            }
        }

        println!();
        println!(
            "{} Deleted {} proxy variant(s) total",
            style("Summary:").bold(),
            style(deleted_count).green()
        );
    }

    Ok(())
}

// ========== Helper Functions ==========

/// Build proxy config from command-line options.
fn build_config(
    resolution: Option<&str>,
    codec: Option<&str>,
    preset: Option<&str>,
) -> Result<ProxyConfig> {
    // Start with preset if specified
    let mut config = match preset {
        Some("fast") => ProxyConfig::fast_edit(),
        Some("hq") | Some("high-quality") => ProxyConfig::high_quality(),
        Some("offline") => ProxyConfig::offline(),
        Some(p) => bail!("Unknown preset: {}. Use: fast, hq, offline", p),
        None => ProxyConfig::default(),
    };

    // Override resolution if specified
    if let Some(res) = resolution {
        config.resolution = match res {
            "1080" | "1080p" => ProxyResolution::HD1080,
            "720" | "720p" => ProxyResolution::HD720,
            "540" | "540p" => ProxyResolution::QHD540,
            "half" => ProxyResolution::Half,
            "quarter" => ProxyResolution::Quarter,
            _ => bail!("Unknown resolution: {}. Use: 1080, 720, 540, half, quarter", res),
        };
    }

    // Override codec if specified
    if let Some(c) = codec {
        config.codec = match c {
            "h264" => ProxyCodec::H264,
            "h265" | "hevc" => ProxyCodec::H265,
            "prores" | "prores-proxy" => ProxyCodec::ProResProxy,
            "prores-lt" => ProxyCodec::ProResLT,
            "dnxhr" | "dnxhr-lb" => ProxyCodec::DnxhrLB,
            "dnxhr-sq" => ProxyCodec::DnxhrSQ,
            _ => bail!("Unknown codec: {}. Use: h264, h265, prores, prores-lt, dnxhr, dnxhr-sq", c),
        };
    }

    Ok(config)
}

/// Find all video files tracked in the repository.
fn find_all_video_files(repo: &Repository) -> Result<Vec<String>> {
    let head = repo.head()?.context("No commits yet")?;
    let commit = repo.load_commit(&head)?;
    let manifest = repo.load_manifest(&commit.manifest)?;

    let video_extensions = ["mp4", "mov", "mkv", "avi", "mxf", "m4v", "webm"];

    let video_files: Vec<String> = manifest
        .entries
        .iter()
        .filter_map(|(path, _entry)| {
            let path_lower = path.to_lowercase();
            if video_extensions.iter().any(|ext| path_lower.ends_with(ext)) {
                Some(path.clone())
            } else {
                None
            }
        })
        .collect();

    Ok(video_files)
}
