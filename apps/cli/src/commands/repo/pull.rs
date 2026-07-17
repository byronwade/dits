//! Pull command.
//!
//! Pull is deliberately fail-closed until fetching, divergence handling,
//! dirty-worktree protection, and atomic reference updates are complete.

use std::path::Path;

use anyhow::{bail, Context, Result};

use crate::store::{
    remote::{RemoteStore, RemoteType},
    Repository,
};

/// Pull changes from a remote.
pub async fn pull(remote_name: Option<&str>, _branch: Option<&str>, _rebase: bool) -> Result<()> {
    let repo =
        Repository::open_read_only(Path::new(".")).context("Could not open Dits repository")?;
    let remotes = RemoteStore::open(repo.dits_dir())?;
    let remote_name = remote_name.unwrap_or("origin");
    let remote = remotes
        .get(remote_name)
        .ok_or_else(|| anyhow::anyhow!("Remote '{}' not found", remote_name))?;

    match RemoteType::parse(&remote.url) {
        RemoteType::Local(path) => bail!(
            "Local-path pull is disabled in this alpha because safe fast-forward checks, complete \
             object transfer, and dirty-worktree protection are not implemented.\nRemote: {} \
             ({})\nNo objects, refs, or working-tree files were changed.",
            remote_name,
            path.display()
        ),
        RemoteType::Http(url) | RemoteType::Dits(url) | RemoteType::Ssh(url) => bail!(
            "Network pull is not implemented in this alpha.\nRemote: {} ({})\nNo objects, refs, \
             or working-tree files were changed.",
            remote_name,
            url
        ),
    }
}
