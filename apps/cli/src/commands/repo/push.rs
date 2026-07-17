//! Push command.
//!
//! Repository mutation over a remote is deliberately fail-closed until Dits
//! can prove object completeness, ancestry, and atomic reference updates.

use std::path::Path;

use anyhow::{bail, Context, Result};

use crate::store::{
    remote::{RemoteStore, RemoteType},
    Repository,
};

/// Push changes to a remote.
pub async fn push(
    remote_name: Option<&str>,
    _branch: Option<&str>,
    _force: bool,
    _all: bool,
) -> Result<()> {
    let repo =
        Repository::open_read_only(Path::new(".")).context("Could not open Dits repository")?;
    let remotes = RemoteStore::open(repo.dits_dir())?;
    let remote_name = remote_name.unwrap_or("origin");
    let remote = remotes
        .get(remote_name)
        .ok_or_else(|| anyhow::anyhow!("Remote '{}' not found", remote_name))?;

    match RemoteType::parse(&remote.url) {
        RemoteType::Local(path) => bail!(
            "Local-path push is disabled in this alpha because safe fast-forward checks and \
             atomic ref updates are not implemented.\nRemote: {} ({})\nNo objects or refs were \
             changed. Use a normal filesystem backup or a fresh local `dits clone` for evaluation.",
            remote_name,
            path.display()
        ),
        RemoteType::Http(url) | RemoteType::Dits(url) | RemoteType::Ssh(url) => bail!(
            "Network push is not implemented in this alpha.\nRemote: {} ({})\nNo objects or refs \
             were changed.",
            remote_name,
            url
        ),
    }
}
