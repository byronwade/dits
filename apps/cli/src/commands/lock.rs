//! Lock management CLI commands.
//!
//! Provides commands for locking/unlocking files (primarily for binary files).

use anyhow::{Context, Result, bail};
use crate::store::locks::{Lock, LockStore};
use std::path::Path;

/// Lock a file.
pub fn lock(
    path: &str,
    reason: Option<&str>,
    ttl_hours: Option<u64>,
    force: bool,
) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let mut store = LockStore::new(&dits_dir);

    let owner = get_current_user()?;
    let ttl_secs = ttl_hours.map(|h| h * 3600);

    match store.acquire(path, &owner, ttl_secs, reason, force) {
        Ok(lock) => {
            if force {
                println!("Force-locked '{}'", path);
            } else {
                println!("Locked '{}'", path);
            }
            if let Some(r) = &lock.reason {
                println!("  Reason: {}", r);
            }
            println!("  Expires in: {}", lock.expires_in_human());
            Ok(())
        }
        Err(e) => {
            bail!("{}", e)
        }
    }
}

/// Unlock a file.
pub fn unlock(path: &str, force: bool) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let mut store = LockStore::new(&dits_dir);

    let owner = get_current_user()?;

    match store.release(path, &owner, force) {
        Ok(()) => {
            if force {
                println!("Force-unlocked '{}'", path);
            } else {
                println!("Unlocked '{}'", path);
            }
            Ok(())
        }
        Err(e) => {
            bail!("{}", e)
        }
    }
}

/// List all locks.
pub fn locks(owner_filter: Option<&str>, verbose: bool) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let store = LockStore::new(&dits_dir);

    let lock_list: Vec<&Lock> = if let Some(owner) = owner_filter {
        store.list_by_owner(owner)
    } else {
        store.list()
    };

    if lock_list.is_empty() {
        if owner_filter.is_some() {
            println!("No locks found for specified owner.");
        } else {
            println!("No active locks.");
        }
        return Ok(());
    }

    println!("Active locks:");
    println!();

    for lock in lock_list {
        if verbose {
            println!("  Path:    {}", lock.path);
            println!("  Owner:   {}", lock.owner);
            println!("  Expires: {} ({})", lock.expires_in_human(), format_timestamp(lock.expires_at));
            if let Some(reason) = &lock.reason {
                println!("  Reason:  {}", reason);
            }
            println!();
        } else {
            let reason_str = lock.reason.as_deref().unwrap_or("");
            println!(
                "  {} (by {}, expires in {}){}",
                lock.path,
                lock.owner,
                lock.expires_in_human(),
                if reason_str.is_empty() { String::new() } else { format!(" - {}", reason_str) }
            );
        }
    }

    Ok(())
}

/// Get the current user identifier.
fn get_current_user() -> Result<String> {
    // Try git config first
    if let Ok(output) = std::process::Command::new("git")
        .args(["config", "user.email"])
        .output()
    {
        if output.status.success() {
            let email = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !email.is_empty() {
                return Ok(email);
            }
        }
    }

    // Fall back to system username
    std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .context("Could not determine current user. Set USER environment variable or configure git user.email")
}

/// Format a Unix timestamp as a human-readable string.
fn format_timestamp(ts: u64) -> String {
    use std::time::{Duration, UNIX_EPOCH};

    let datetime = UNIX_EPOCH + Duration::from_secs(ts);
    if let Ok(duration) = datetime.duration_since(UNIX_EPOCH) {
        // Simple ISO-like format
        let secs = duration.as_secs();
        let days = secs / 86400;
        let years = days / 365;
        let remaining_days = days % 365;
        let months = remaining_days / 30;
        let day = remaining_days % 30 + 1;
        let hour = (secs % 86400) / 3600;
        let min = (secs % 3600) / 60;

        format!("{:04}-{:02}-{:02} {:02}:{:02}", 1970 + years, months + 1, day, hour, min)
    } else {
        "unknown".to_string()
    }
}

/// Find the .dits directory.
fn find_dits_dir() -> Result<std::path::PathBuf> {
    let current = std::env::current_dir()?;

    let dits_dir = current.join(".dits");
    if dits_dir.exists() {
        return Ok(dits_dir);
    }

    // Search parent directories
    let mut dir = current.as_path();
    while let Some(parent) = dir.parent() {
        let dits = parent.join(".dits");
        if dits.exists() {
            return Ok(dits);
        }
        dir = parent;
    }

    bail!("Not a dits repository (or any parent up to mount point)")
}

#[cfg(test)]
mod tests {
    use super::*;
}
