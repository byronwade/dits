//! Checkout commits or branches.

use crate::core::Hash;
use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use dits::proxy::{ProxyStore, VariantType};
use std::path::Path;

/// Checkout mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CheckoutMode {
    /// Full quality - restore original files (default)
    Full,
    /// Proxy mode - restore proxy files where available
    Proxy,
}

impl CheckoutMode {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "full" | "original" => Some(Self::Full),
            "proxy" | "proxies" => Some(Self::Proxy),
            _ => None,
        }
    }
}

/// Checkout a commit or branch.
pub fn checkout(target: &str, mode: CheckoutMode) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    let mode_str = match mode {
        CheckoutMode::Full => "",
        CheckoutMode::Proxy => " (proxy mode)",
    };

    // Try as branch first
    if let Ok(result) = repo.checkout_branch(target) {
        let proxy_result = if mode == CheckoutMode::Proxy {
            apply_proxy_checkout(&repo)?
        } else {
            (0, 0)
        };

        println!(
            "{} Switched to branch '{}'{}",
            style("✓").green().bold(),
            style(target).cyan(),
            mode_str
        );
        println!(
            "  Restored {} file(s), {}",
            result.files_restored,
            format_bytes(result.bytes_restored)
        );
        if proxy_result.0 > 0 {
            println!(
                "  {} video(s) replaced with proxies (saved {})",
                style(proxy_result.0).cyan(),
                format_bytes(proxy_result.1)
            );
        }
        return Ok(());
    }

    // Try as commit hash
    if let Ok(hash) = Hash::from_hex(target) {
        let result = repo.checkout(&hash)?;
        let proxy_result = if mode == CheckoutMode::Proxy {
            apply_proxy_checkout(&repo)?
        } else {
            (0, 0)
        };

        println!(
            "{} HEAD is now at {}{}",
            style("✓").green().bold(),
            style(&target[..8.min(target.len())]).yellow(),
            mode_str
        );
        println!(
            "  Restored {} file(s), {}",
            result.files_restored,
            format_bytes(result.bytes_restored)
        );
        if proxy_result.0 > 0 {
            println!(
                "  {} video(s) replaced with proxies (saved {})",
                style(proxy_result.0).cyan(),
                format_bytes(proxy_result.1)
            );
        }
        return Ok(());
    }

    // Try as short hash (find matching commit)
    let commits = repo.log(100)?;
    for commit in commits {
        if commit.hash.to_hex().starts_with(target) {
            let result = repo.checkout(&commit.hash)?;
            let proxy_result = if mode == CheckoutMode::Proxy {
                apply_proxy_checkout(&repo)?
            } else {
                (0, 0)
            };

            println!(
                "{} HEAD is now at {} {}{}",
                style("✓").green().bold(),
                style(commit.short_hash()).yellow(),
                commit.message.lines().next().unwrap_or(""),
                mode_str
            );
            println!(
                "  Restored {} file(s), {}",
                result.files_restored,
                format_bytes(result.bytes_restored)
            );
            if proxy_result.0 > 0 {
                println!(
                    "  {} video(s) replaced with proxies (saved {})",
                    style(proxy_result.0).cyan(),
                    format_bytes(proxy_result.1)
                );
            }
            return Ok(());
        }
    }

    anyhow::bail!("pathspec '{}' did not match any branch or commit", target);
}

/// Apply proxy checkout - replace video files with their proxies where available.
/// Returns (files_replaced, bytes_saved).
fn apply_proxy_checkout(repo: &Repository) -> Result<(usize, u64)> {
    use dits::core::Hash as DitsHash;

    let proxy_store = ProxyStore::new(repo.dits_dir());
    let cwd = std::env::current_dir()?;

    // Get HEAD manifest to find video files
    let head = match repo.head()? {
        Some(h) => h,
        None => return Ok((0, 0)),
    };
    let commit = repo.load_commit(&head)?;
    let manifest = repo.load_manifest(&commit.manifest)?;

    let video_extensions = ["mp4", "mov", "mkv", "avi", "mxf", "m4v", "webm"];

    let mut files_replaced = 0;
    let mut bytes_saved: u64 = 0;

    for (path, entry) in manifest.entries.iter() {
        let path_lower = path.to_lowercase();
        if !video_extensions.iter().any(|ext| path_lower.ends_with(ext)) {
            continue;
        }

        // Convert the hash to the library type via hex string
        let content_hash_hex = entry.content_hash.to_hex();
        let content_hash = match DitsHash::from_hex(&content_hash_hex) {
            Ok(h) => h,
            Err(_) => continue,
        };

        // Look for a proxy variant for this file
        // Try different resolutions in order of preference
        let variant_types = [
            VariantType::Proxy1080p,
            VariantType::Proxy720p,
            VariantType::Proxy540p,
            VariantType::ProxyHalf,
            VariantType::ProxyQuarter,
        ];

        for variant_type in &variant_types {
            if let Ok(Some(variant)) = proxy_store.load(&content_hash, *variant_type) {
                // Found a proxy - load and write it
                if let Ok(Some(proxy_data)) = proxy_store.load_data(&variant.content_hash) {
                    let file_path = cwd.join(path);
                    let original_size = entry.size;

                    // Write proxy in place of original
                    if let Err(e) = std::fs::write(&file_path, &proxy_data) {
                        eprintln!("  Warning: Failed to write proxy for {}: {}", path, e);
                        continue;
                    }

                    files_replaced += 1;
                    if original_size > proxy_data.len() as u64 {
                        bytes_saved += original_size - proxy_data.len() as u64;
                    }
                }
                break; // Found a proxy, don't try other resolutions
            }
        }
    }

    Ok((files_replaced, bytes_saved))
}

/// Format bytes as human-readable string.
fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} bytes", bytes)
    }
}
