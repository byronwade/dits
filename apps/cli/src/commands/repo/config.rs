//! Config command implementation.

use dits::config::{Config, global_config_path};
use dits::store::Repository;
use anyhow::Result;
use console::style;
use std::fs;
use std::path::Path;

/// Get the local config path (repository-specific).
fn local_config_path(repo: &Repository) -> std::path::PathBuf {
    repo.dits_dir().join("config.toml")
}

/// Config command: get, set, or list configuration.
pub fn config(
    key: Option<&str>,
    value: Option<&str>,
    global: bool,
    list: bool,
    unset: bool,
) -> Result<()> {
    // Determine config file path
    let config_path = if global {
        let path = global_config_path();
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        path
    } else {
        // Try to find repository, fall back to global
        match Repository::open(Path::new(".")) {
            Ok(repo) => local_config_path(&repo),
            Err(_) if key.is_none() || list => {
                // For listing or no key, use global if no repo
                let path = global_config_path();
                if let Some(parent) = path.parent() {
                    fs::create_dir_all(parent)?;
                }
                path
            }
            Err(e) => return Err(e.into()),
        }
    };

    let mut config = Config::load(&config_path)
        .map_err(|e| anyhow::anyhow!("{}", e))?;

    if list {
        // List all config values
        let items = config.list();
        if items.is_empty() {
            println!("{}", style("No configuration set").dim());
        } else {
            for (k, v) in items {
                println!("{}={}", style(&k).cyan(), v);
            }
        }
        return Ok(());
    }

    match (key, value, unset) {
        (Some(k), Some(v), false) => {
            // Set value
            config.set(k, v).map_err(|e| anyhow::anyhow!("{}", e))?;
            config.save(&config_path).map_err(|e| anyhow::anyhow!("{}", e))?;
            println!(
                "{} Set {}={}",
                style("->").green().bold(),
                style(k).cyan(),
                v
            );
        }
        (Some(_), Some(_), true) => {
            // Can't both set and unset
            anyhow::bail!("Cannot both set and unset a value");
        }
        (Some(k), None, true) => {
            // Unset value
            if config.unset(k).map_err(|e| anyhow::anyhow!("{}", e))? {
                config.save(&config_path).map_err(|e| anyhow::anyhow!("{}", e))?;
                println!(
                    "{} Unset {}",
                    style("->").green().bold(),
                    style(k).cyan()
                );
            } else {
                println!(
                    "{} Key '{}' was not set",
                    style("!").yellow().bold(),
                    k
                );
            }
        }
        (Some(k), None, false) => {
            // Get value
            if let Some(v) = config.get(k) {
                println!("{}", v);
            } else {
                println!(
                    "{} Key '{}' not found",
                    style("!").yellow().bold(),
                    k
                );
            }
        }
        (None, Some(_), _) => {
            anyhow::bail!("Key required when setting a value");
        }
        (None, None, _) => {
            // List all (same as --list)
            let items = config.list();
            if items.is_empty() {
                println!("{}", style("No configuration set").dim());
            } else {
                for (k, v) in items {
                    println!("{}={}", style(&k).cyan(), v);
                }
            }
        }
    }

    Ok(())
}
