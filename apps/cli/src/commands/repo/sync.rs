//! Bi-directional synchronization command.
//!
//! Sync is deliberately fail-closed while the remote transaction protocol is
//! still a design. Returning an error is safer than simulating success or
//! overwriting one side of a divergent history.

use std::path::Path;

use anyhow::{bail, Context, Result};

use crate::store::{
    remote::{RemoteStore, RemoteType},
    Repository,
};

/// Synchronize with a remote repository.
pub async fn sync(
    remote_name: &str,
    _branch: Option<&str>,
    _force: bool,
    _dry_run: bool,
) -> Result<()> {
    let repo =
        Repository::open_read_only(Path::new(".")).context("Could not open Dits repository")?;
    let remotes = RemoteStore::open(repo.dits_dir())?;
    let remote = remotes
        .get(remote_name)
        .ok_or_else(|| anyhow::anyhow!("Remote '{}' not found", remote_name))?;

    match RemoteType::parse(&remote.url) {
        RemoteType::Local(path) => bail!(
            "Local-path sync is disabled in this alpha because complete object transfer, \
             divergence handling, and atomic two-sided ref updates are not implemented.\nRemote: \
             {} ({})\nNo objects, refs, or working-tree files were changed.",
            remote_name,
            path.display()
        ),
        RemoteType::Http(url) | RemoteType::Dits(url) | RemoteType::Ssh(url) => bail!(
            "Network sync is not implemented in this alpha.\nRemote: {} ({})\nNo objects, refs, \
             or working-tree files were changed.",
            remote_name,
            url
        ),
    }
}
