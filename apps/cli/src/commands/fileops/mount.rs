//! Mount command - mount repository as a virtual filesystem.

use crate::store::Repository;
use crate::vfs::{CacheConfig, mount as fuse_mount};
use anyhow::{bail, Result};
use std::path::Path;
use std::sync::Arc;

/// Mount a repository commit as a FUSE filesystem.
pub fn mount(mount_point: &str, commit: Option<&str>, cache_mb: u64) -> Result<()> {
    let repo = Repository::open(Path::new("."))?;

    // Resolve commit
    let commit_hash = match commit {
        Some(ref_str) => {
            repo.resolve_ref(ref_str)?
                .ok_or_else(|| anyhow::anyhow!("Cannot resolve: {}", ref_str))?
        }
        None => {
            repo.head()?
                .ok_or_else(|| anyhow::anyhow!("No HEAD commit. Create a commit first."))?
        }
    };

    // Load commit and manifest
    let commit_obj = repo.load_commit(&commit_hash)?;
    let manifest = repo.load_manifest(&commit_obj.manifest)?;

    println!("Mounting commit {} ({} files)", &commit_hash.to_hex()[..8], manifest.len());

    // Configure cache
    let cache_config = CacheConfig {
        l1_max_bytes: cache_mb * 1024 * 1024,
        l2_path: repo.dits_dir().join("cache"),
        ..Default::default()
    };

    // Mount (blocks until unmounted)
    let mount_path = Path::new(mount_point);
    let object_store = Arc::new(repo.into_object_store());

    fuse_mount(&manifest, object_store, mount_path, cache_config)?;

    println!("Unmounted.");
    Ok(())
}
