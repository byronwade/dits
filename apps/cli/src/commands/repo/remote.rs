//! Remote management CLI commands.

use anyhow::{Context, Result, bail};
use crate::store::remote::{Remote, RemoteStore, RemoteType};

/// List all remotes.
pub fn remote_list(verbose: bool) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let store = RemoteStore::new(&dits_dir);

    if store.is_empty() {
        if verbose {
            println!("No remotes configured.");
        }
        return Ok(());
    }

    for remote in store.list() {
        if verbose {
            println!("{}\t{} (fetch)", remote.name, remote.url);
            println!("{}\t{} (push)", remote.name, remote.push_url());
        } else {
            println!("{}", remote.name);
        }
    }

    Ok(())
}

/// Add a new remote.
pub fn remote_add(name: &str, url: &str) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let mut store = RemoteStore::new(&dits_dir);

    // Validate URL
    let remote_type = RemoteType::parse(url);
    if let RemoteType::Local(path) = &remote_type {
        // Check if local path exists and is a dits repo
        if !path.join(".dits").exists() && !path.exists() {
            println!("Warning: path '{}' does not appear to be a dits repository", url);
        }
    }

    let remote = Remote::new(name, url);
    store.add(remote)
        .context(format!("Failed to add remote '{}'", name))?;

    println!("Added remote '{}' with URL: {}", name, url);
    Ok(())
}

/// Remove a remote.
pub fn remote_remove(name: &str) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let mut store = RemoteStore::new(&dits_dir);

    store.remove(name)
        .context(format!("Failed to remove remote '{}'", name))?;

    println!("Removed remote '{}'", name);
    Ok(())
}

/// Rename a remote.
pub fn remote_rename(old_name: &str, new_name: &str) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let mut store = RemoteStore::new(&dits_dir);

    store.rename(old_name, new_name)
        .context(format!("Failed to rename remote '{}' to '{}'", old_name, new_name))?;

    println!("Renamed remote '{}' to '{}'", old_name, new_name);
    Ok(())
}

/// Get URL for a remote.
pub fn remote_get_url(name: &str, push: bool) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let store = RemoteStore::new(&dits_dir);

    let remote = store.get(name)
        .ok_or_else(|| anyhow::anyhow!("Remote '{}' not found", name))?;

    if push {
        println!("{}", remote.push_url());
    } else {
        println!("{}", remote.url);
    }

    Ok(())
}

/// Set URL for a remote.
pub fn remote_set_url(name: &str, url: &str, push: bool) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let mut store = RemoteStore::new(&dits_dir);

    if push {
        let remote = store.get_mut(name)
            .ok_or_else(|| anyhow::anyhow!("Remote '{}' not found", name))?;
        remote.push_url = Some(url.to_string());
        store.save()?;
        println!("Updated push URL for '{}' to: {}", name, url);
    } else {
        store.set_url(name, url)
            .context(format!("Failed to set URL for remote '{}'", name))?;
        println!("Updated URL for '{}' to: {}", name, url);
    }

    Ok(())
}

/// Handle remote subcommand.
pub fn remote(
    action: Option<&str>,
    name: Option<&str>,
    url: Option<&str>,
    verbose: bool,
    push: bool,
) -> Result<()> {
    match action {
        None | Some("list") => remote_list(verbose),
        Some("add") => {
            let name = name.ok_or_else(|| anyhow::anyhow!("Remote name required"))?;
            let url = url.ok_or_else(|| anyhow::anyhow!("Remote URL required"))?;
            remote_add(name, url)
        }
        Some("remove") | Some("rm") => {
            let name = name.ok_or_else(|| anyhow::anyhow!("Remote name required"))?;
            remote_remove(name)
        }
        Some("rename") => {
            let old = name.ok_or_else(|| anyhow::anyhow!("Old remote name required"))?;
            let new = url.ok_or_else(|| anyhow::anyhow!("New remote name required"))?;
            remote_rename(old, new)
        }
        Some("get-url") => {
            let name = name.ok_or_else(|| anyhow::anyhow!("Remote name required"))?;
            remote_get_url(name, push)
        }
        Some("set-url") => {
            let name = name.ok_or_else(|| anyhow::anyhow!("Remote name required"))?;
            let url_val = url.ok_or_else(|| anyhow::anyhow!("URL required"))?;
            remote_set_url(name, url_val, push)
        }
        Some(other) => bail!("Unknown remote action: {}. Use add, remove, rename, get-url, set-url, or list.", other),
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
