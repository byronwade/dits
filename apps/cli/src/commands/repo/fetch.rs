//! Fetch command.
//!
//! Fetch is deliberately fail-closed until it can transfer every storage
//! engine, validate the object graph, and update nested tracking refs safely.

use std::path::Path;

use anyhow::{bail, Context, Result};

use crate::store::{
    remote::{RemoteStore, RemoteType},
    Repository,
};

/// Fetch from a remote.
pub async fn fetch(remote_name: Option<&str>, all: bool, prune: bool) -> Result<()> {
    let repo =
        Repository::open_read_only(Path::new(".")).context("Could not open Dits repository")?;
    let remotes = RemoteStore::open(repo.dits_dir())?;
    if all {
        let configured: Vec<_> = remotes.list().map(|remote| remote.name.as_str()).collect();
        if configured.is_empty() {
            bail!(
                "Remote fetch is disabled in this alpha and no remotes are configured. No objects \
                 or refs were changed."
            );
        }
        bail!(
            "Remote fetch is disabled in this alpha; no configured remote was \
             contacted.\nRemotes: {}\nNo objects or refs were changed.",
            configured.join(", ")
        );
    }

    let remote_name = remote_name.unwrap_or("origin");
    let remote = remotes
        .get(remote_name)
        .ok_or_else(|| anyhow::anyhow!("Remote '{}' not found", remote_name))?;
    fetch_from_remote(remote_name, &remote.url, prune).await
}
/// Fail safely for a configured remote until complete fetch exists.
pub async fn fetch_from_remote(remote_name: &str, url: &str, _prune: bool) -> Result<()> {
    match RemoteType::parse(url) {
        RemoteType::Local(path) => bail!(
            "Local-path fetch is disabled in this alpha because the current transfer cannot prove \
             that every Dits and embedded Git object is complete.\nRemote: {} ({})\nNo objects or \
             refs were changed.",
            remote_name,
            path.display()
        ),
        RemoteType::Http(url) | RemoteType::Dits(url) | RemoteType::Ssh(url) => bail!(
            "Network fetch is not implemented in this alpha.\nRemote: {} ({})\nNo objects or refs \
             were changed.",
            remote_name,
            url
        ),
    }
}
