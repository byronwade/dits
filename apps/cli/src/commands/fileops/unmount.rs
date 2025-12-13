//! Unmount command - unmount a virtual filesystem.

use crate::vfs::unmount as fuse_unmount;
use anyhow::Result;
use std::path::Path;

/// Unmount a FUSE filesystem.
pub fn unmount(mount_point: &str) -> Result<()> {
    let path = Path::new(mount_point);

    if !path.exists() {
        println!("Mount point does not exist: {}", mount_point);
        return Ok(());
    }

    fuse_unmount(path)?;
    println!("Unmounted: {}", mount_point);
    Ok(())
}
