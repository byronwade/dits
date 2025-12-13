//! FUSE filesystem implementation for Dits.
//!
//! This module provides a read-only FUSE filesystem that exposes
//! a repository commit as a virtual directory structure.

use super::cache::{CacheConfig, SyncChunkCache};
use super::entry::{VfsEntry, VfsEntryType, VfsTree};
use crate::core::{Hash, Manifest, Mp4Metadata};
use crate::store::ObjectStore;
use byteorder::{BigEndian, ByteOrder};
use fuser::{
    FileAttr, FileType, Filesystem, ReplyAttr, ReplyData, ReplyDirectory, ReplyEntry,
    Request, FUSE_ROOT_ID,
};
use libc::{ENOENT, ENOTDIR, EISDIR};
use std::ffi::OsStr;
use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// TTL for cached attributes.
const TTL: Duration = Duration::from_secs(60);

/// Patch stco/co64 offsets in moov data to denormalize them.
///
/// The moov is stored with offsets normalized to 0 (relative to mdat data start).
/// When serving via FUSE, we need to add the actual mdat data position to each offset.
fn patch_moov_offsets(moov_data: &mut [u8], meta: &Mp4Metadata, mdat_data_start: u64) {
    if !meta.needs_offset_patching {
        return;
    }

    // Patch stco tables (32-bit offsets)
    for (offset_in_moov, entry_count) in &meta.stco_offsets {
        let base = *offset_in_moov as usize;
        for i in 0..*entry_count as usize {
            let entry_offset = base + i * 4;
            if entry_offset + 4 > moov_data.len() {
                break;
            }
            let current = BigEndian::read_u32(&moov_data[entry_offset..entry_offset + 4]) as u64;
            let new_value = current + mdat_data_start;
            // Write back (assuming it fits in 32 bits)
            if new_value <= u32::MAX as u64 {
                BigEndian::write_u32(&mut moov_data[entry_offset..entry_offset + 4], new_value as u32);
            }
        }
    }

    // Patch co64 tables (64-bit offsets)
    for (offset_in_moov, entry_count) in &meta.co64_offsets {
        let base = *offset_in_moov as usize;
        for i in 0..*entry_count as usize {
            let entry_offset = base + i * 8;
            if entry_offset + 8 > moov_data.len() {
                break;
            }
            let current = BigEndian::read_u64(&moov_data[entry_offset..entry_offset + 8]);
            let new_value = current + mdat_data_start;
            BigEndian::write_u64(&mut moov_data[entry_offset..entry_offset + 8], new_value);
        }
    }
}

/// Convert VfsEntry to FUSE FileAttr.
fn entry_to_attr(entry: &VfsEntry) -> FileAttr {
    let kind = match entry.entry_type {
        VfsEntryType::File => FileType::RegularFile,
        VfsEntryType::Directory => FileType::Directory,
        VfsEntryType::Symlink { .. } => FileType::Symlink,
    };

    let nlink = if entry.is_dir() {
        2 + entry.children.len() as u32
    } else {
        1
    };

    FileAttr {
        ino: entry.inode,
        size: entry.size,
        blocks: (entry.size + 511) / 512,
        atime: entry.atime,
        mtime: entry.mtime,
        ctime: entry.ctime,
        crtime: entry.ctime,
        kind,
        perm: entry.mode as u16,
        nlink,
        uid: unsafe { libc::getuid() },
        gid: unsafe { libc::getgid() },
        rdev: 0,
        blksize: 4096,
        flags: 0,
    }
}

/// Dits FUSE filesystem handler.
pub struct DitsFS {
    /// Virtual filesystem tree.
    tree: VfsTree,
    /// Chunk cache.
    cache: SyncChunkCache,
    /// Object store for blob data (ftyp, moov).
    object_store: Arc<ObjectStore>,
    /// Read buffer size.
    read_buffer_size: usize,
}

impl DitsFS {
    /// Create a new FUSE filesystem from a manifest.
    pub fn new(
        manifest: &Manifest,
        object_store: Arc<ObjectStore>,
        cache_config: CacheConfig,
    ) -> std::io::Result<Self> {
        let tree = VfsTree::from_manifest(manifest);
        let cache = SyncChunkCache::new(cache_config, object_store.clone())?;

        Ok(Self {
            tree,
            cache,
            object_store,
            read_buffer_size: 1024 * 1024, // 1MB read buffer
        })
    }

    /// Get file contents for a range.
    fn read_file(&self, entry: &VfsEntry, offset: u64, size: u32) -> Option<Vec<u8>> {
        if offset >= entry.size {
            return Some(Vec::new());
        }

        let actual_size = std::cmp::min(size as u64, entry.size - offset) as usize;
        let mut result = Vec::with_capacity(actual_size);

        // Find chunks that cover this range
        let ranges = entry.chunks_for_range(offset, actual_size as u64);

        // Prefetch upcoming chunks
        if ranges.len() > 0 {
            let chunk_idx = ranges.last().unwrap().0;
            let prefetch_hashes: Vec<Hash> = entry.chunks
                .iter()
                .skip(chunk_idx + 1)
                .take(4)
                .map(|c| c.hash)
                .collect();
            self.cache.prefetch(&prefetch_hashes);
        }

        for (_idx, chunk_ref, chunk_offset, read_len) in ranges {
            // Get chunk data
            let chunk_data = match self.cache.get(&chunk_ref.hash) {
                Some(data) => data,
                None => {
                    eprintln!("Chunk not found: {} (expected size {})",
                             chunk_ref.hash.to_hex(), chunk_ref.size);
                    return None;
                }
            };

            // Extract the needed portion
            let start = chunk_offset as usize;
            let end = start + read_len as usize;
            if end <= chunk_data.len() {
                result.extend_from_slice(&chunk_data[start..end]);
            } else {
                eprintln!(
                    "Chunk data too short: {} vs {}..{} (hash: {}, expected: {})",
                    chunk_data.len(),
                    start,
                    end,
                    chunk_ref.hash.to_hex(),
                    chunk_ref.size
                );
                return None;
            }
        }

        Some(result)
    }

    /// Read MP4 file data, reconstructing the full structure from ftyp + moov + mdat.
    fn read_mp4_file(&self, entry: &VfsEntry, offset: u64, size: u32) -> Option<Vec<u8>> {
        let meta = entry.mp4_metadata.as_ref()?;

        if offset >= entry.size {
            return Some(Vec::new());
        }

        let actual_size = std::cmp::min(size as u64, entry.size - offset) as usize;
        let mut result = Vec::with_capacity(actual_size);
        let mut current_offset = offset;
        let mut remaining = actual_size;

        // Structure: ftyp (32 bytes) + moov + mdat header (8 bytes) + mdat data (chunks)
        let ftyp_size: u64 = 32;
        let moov_end = ftyp_size + meta.moov_size;
        let mdat_header_end = moov_end + 8;

        // Region 1: ftyp (0..32)
        if current_offset < ftyp_size && remaining > 0 {
            if let Some(ftyp_hash) = &meta.ftyp_hash {
                if let Ok(ftyp_data) = self.object_store.load_blob(ftyp_hash) {
                    let start = current_offset as usize;
                    let end = std::cmp::min(ftyp_size as usize, start + remaining);
                    if end <= ftyp_data.len() {
                        result.extend_from_slice(&ftyp_data[start..end]);
                        remaining -= end - start;
                        current_offset = ftyp_size;
                    }
                } else {
                    eprintln!("Failed to load ftyp blob");
                    return None;
                }
            }
        }

        // Region 2: moov (32..32+moov_size)
        if current_offset < moov_end && remaining > 0 {
            if let Some(moov_hash) = &meta.moov_hash {
                if let Ok(moov_data) = self.object_store.load_blob(moov_hash) {
                    // Clone and patch the moov data to denormalize offsets
                    // The mdat data starts right after: ftyp + moov + mdat_header(8)
                    let mdat_data_start = ftyp_size + meta.moov_size + 8;
                    let mut patched_moov = moov_data.clone();
                    patch_moov_offsets(&mut patched_moov, meta, mdat_data_start);

                    let moov_offset = current_offset.saturating_sub(ftyp_size) as usize;
                    let moov_remaining = (moov_end - current_offset) as usize;
                    let to_read = std::cmp::min(moov_remaining, remaining);
                    let end = moov_offset + to_read;
                    if end <= patched_moov.len() {
                        result.extend_from_slice(&patched_moov[moov_offset..end]);
                        remaining -= to_read;
                        current_offset += to_read as u64;
                    } else {
                        eprintln!("moov data too short: {} vs {}..{}", patched_moov.len(), moov_offset, end);
                        return None;
                    }
                } else {
                    eprintln!("Failed to load moov blob");
                    return None;
                }
            }
        }

        // Region 3: mdat header (moov_end..moov_end+8 or moov_end+16 for extended size)
        if current_offset < mdat_header_end && remaining > 0 {
            let mdat_total_size = meta.mdat_size + 8;

            // For files > 4GB, use extended size (64-bit) header
            let mdat_header: Vec<u8> = if mdat_total_size > u32::MAX as u64 {
                // Extended size: size=1 (4 bytes) + "mdat" (4 bytes) + actual_size (8 bytes)
                let mut header = Vec::with_capacity(16);
                header.extend_from_slice(&1u32.to_be_bytes()); // size = 1 means extended
                header.extend_from_slice(b"mdat");
                header.extend_from_slice(&(mdat_total_size + 8).to_be_bytes()); // +8 for extended header
                header
            } else {
                // Standard header: size (4 bytes) + "mdat" (4 bytes)
                let mut header = Vec::with_capacity(8);
                header.extend_from_slice(&(mdat_total_size as u32).to_be_bytes());
                header.extend_from_slice(b"mdat");
                header
            };

            let header_offset = (current_offset - moov_end) as usize;
            let to_read = std::cmp::min(mdat_header.len() - header_offset, remaining);
            if header_offset < mdat_header.len() {
                result.extend_from_slice(&mdat_header[header_offset..header_offset + to_read]);
                remaining -= to_read;
                current_offset += to_read as u64;
            }
        }

        // Region 4: mdat data (chunks)
        if current_offset >= mdat_header_end && remaining > 0 {
            let chunk_offset = current_offset - mdat_header_end;
            let ranges = entry.chunks_for_range(chunk_offset, remaining as u64);

            for (_idx, chunk_ref, chunk_off, read_len) in ranges {
                let chunk_data = match self.cache.get(&chunk_ref.hash) {
                    Some(data) => data,
                    None => {
                        eprintln!("MP4 chunk not found: {}", chunk_ref.hash.to_hex());
                        return None;
                    }
                };

                let start = chunk_off as usize;
                let end = start + read_len as usize;
                if end <= chunk_data.len() {
                    result.extend_from_slice(&chunk_data[start..end]);
                } else {
                    eprintln!("MP4 chunk data too short: {} vs {}..{}", chunk_data.len(), start, end);
                    return None;
                }
            }
        }

        Some(result)
    }

    /// Get cache statistics.
    pub fn cache_stats(&self) -> super::cache::CacheStats {
        self.cache.stats()
    }
}

impl Filesystem for DitsFS {
    /// Look up a directory entry by name.
    fn lookup(&mut self, _req: &Request, parent: u64, name: &OsStr, reply: ReplyEntry) {
        let name_str = name.to_string_lossy();

        if let Some(entry) = self.tree.lookup_child(parent, &name_str) {
            let attr = entry_to_attr(entry);
            reply.entry(&TTL, &attr, 0);
        } else {
            reply.error(ENOENT);
        }
    }

    /// Get file attributes.
    fn getattr(&mut self, _req: &Request, ino: u64, _fh: Option<u64>, reply: ReplyAttr) {
        if let Some(entry) = self.tree.get(ino) {
            let attr = entry_to_attr(entry);
            reply.attr(&TTL, &attr);
        } else {
            reply.error(ENOENT);
        }
    }

    /// Read directory contents.
    fn readdir(
        &mut self,
        _req: &Request,
        ino: u64,
        _fh: u64,
        offset: i64,
        mut reply: ReplyDirectory,
    ) {
        if let Some(entries) = self.tree.readdir(ino) {
            for (i, (name, inode, entry_type)) in entries.iter().enumerate().skip(offset as usize) {
                let file_type = match entry_type {
                    VfsEntryType::File => FileType::RegularFile,
                    VfsEntryType::Directory => FileType::Directory,
                    VfsEntryType::Symlink { .. } => FileType::Symlink,
                };

                // Reply buffer is full
                if reply.add(*inode, (i + 1) as i64, file_type, name) {
                    break;
                }
            }
            reply.ok();
        } else {
            reply.error(ENOTDIR);
        }
    }

    /// Read file data.
    fn read(
        &mut self,
        _req: &Request,
        ino: u64,
        _fh: u64,
        offset: i64,
        size: u32,
        _flags: i32,
        _lock_owner: Option<u64>,
        reply: ReplyData,
    ) {
        if let Some(entry) = self.tree.get(ino) {
            if !entry.is_file() {
                reply.error(EISDIR);
                return;
            }

            // Use MP4-specific reader for files with MP4 metadata
            let data = if entry.is_mp4() {
                self.read_mp4_file(entry, offset as u64, size)
            } else {
                self.read_file(entry, offset as u64, size)
            };

            if let Some(data) = data {
                reply.data(&data);
            } else {
                reply.error(libc::EIO);
            }
        } else {
            reply.error(ENOENT);
        }
    }

    /// Open a file (no-op for read-only fs).
    fn open(&mut self, _req: &Request, ino: u64, _flags: i32, reply: fuser::ReplyOpen) {
        if let Some(entry) = self.tree.get(ino) {
            if entry.is_file() {
                // Use direct_io to disable kernel caching (we do our own)
                reply.opened(0, fuser::consts::FOPEN_DIRECT_IO);
            } else {
                reply.error(EISDIR);
            }
        } else {
            reply.error(ENOENT);
        }
    }

    /// Open a directory (no-op for read-only fs).
    fn opendir(&mut self, _req: &Request, ino: u64, _flags: i32, reply: fuser::ReplyOpen) {
        if let Some(entry) = self.tree.get(ino) {
            if entry.is_dir() {
                reply.opened(0, 0);
            } else {
                reply.error(ENOTDIR);
            }
        } else {
            reply.error(ENOENT);
        }
    }

    /// Get filesystem statistics.
    fn statfs(&mut self, _req: &Request, _ino: u64, reply: fuser::ReplyStatfs) {
        reply.statfs(
            0,           // blocks
            0,           // bfree
            0,           // bavail
            self.tree.len() as u64, // files
            0,           // ffree
            4096,        // bsize
            255,         // namelen
            4096,        // frsize
        );
    }
}

/// Mount a Dits repository as a FUSE filesystem.
///
/// This function blocks until the filesystem is unmounted.
pub fn mount(
    manifest: &Manifest,
    object_store: Arc<ObjectStore>,
    mount_point: &Path,
    cache_config: CacheConfig,
) -> Result<(), super::VfsError> {
    // Ensure mount point exists
    if !mount_point.exists() {
        std::fs::create_dir_all(mount_point)
            .map_err(|e| super::VfsError::Mount(format!("Failed to create mount point: {}", e)))?;
    }

    // Create filesystem
    let fs = DitsFS::new(manifest, object_store, cache_config)
        .map_err(|e| super::VfsError::Mount(format!("Failed to create filesystem: {}", e)))?;

    // Mount options
    let options = vec![
        fuser::MountOption::RO,           // Read-only
        fuser::MountOption::FSName("dits".to_string()),
        fuser::MountOption::AutoUnmount,  // Unmount on process exit
        fuser::MountOption::AllowOther,   // Allow other users (requires user_allow_other in fuse.conf)
    ];

    println!("Mounting Dits filesystem at {}", mount_point.display());
    println!("  Files: {}", fs.tree.len());
    println!("  Press Ctrl+C to unmount");

    // Mount (blocks until unmounted)
    fuser::mount2(fs, mount_point, &options)
        .map_err(|e| super::VfsError::Mount(format!("FUSE mount failed: {}", e)))?;

    Ok(())
}

/// Unmount a FUSE filesystem.
pub fn unmount(mount_point: &Path) -> Result<(), super::VfsError> {
    // On macOS, use diskutil
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("diskutil")
            .args(["unmount", "force"])
            .arg(mount_point)
            .output()
            .map_err(|e| super::VfsError::Mount(format!("Failed to run diskutil: {}", e)))?;

        if !output.status.success() {
            // Try umount as fallback
            let output = std::process::Command::new("umount")
                .arg(mount_point)
                .output()
                .map_err(|e| super::VfsError::Mount(format!("Failed to run umount: {}", e)))?;

            if !output.status.success() {
                return Err(super::VfsError::Mount(format!(
                    "Failed to unmount: {}",
                    String::from_utf8_lossy(&output.stderr)
                )));
            }
        }
    }

    // On Linux, use fusermount
    #[cfg(target_os = "linux")]
    {
        let output = std::process::Command::new("fusermount")
            .args(["-u"])
            .arg(mount_point)
            .output()
            .map_err(|e| super::VfsError::Mount(format!("Failed to run fusermount: {}", e)))?;

        if !output.status.success() {
            return Err(super::VfsError::Mount(format!(
                "Failed to unmount: {}",
                String::from_utf8_lossy(&output.stderr)
            )));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{Chunk, ChunkRef, ManifestEntry};
    use tempfile::tempdir;

    fn create_test_manifest() -> (Manifest, ObjectStore, tempfile::TempDir) {
        let temp = tempdir().unwrap();
        let store = ObjectStore::new(temp.path());
        store.init().unwrap();

        // Create some test chunks
        let chunk1_data = vec![0u8; 1000];
        let chunk1 = Chunk::new(chunk1_data);
        store.store_chunk(&chunk1).unwrap();

        let chunk2_data = vec![1u8; 500];
        let chunk2 = Chunk::new(chunk2_data);
        store.store_chunk(&chunk2).unwrap();

        // Create manifest
        let mut manifest = Manifest::new();
        manifest.add(ManifestEntry::new(
            "test.txt".to_string(),
            1500,
            Hash::ZERO,
            vec![
                ChunkRef::new(chunk1.hash, 0, 1000),
                ChunkRef::new(chunk2.hash, 1000, 500),
            ],
        ));
        manifest.add(ManifestEntry::new(
            "dir/nested.txt".to_string(),
            1000,
            Hash::ZERO,
            vec![ChunkRef::new(chunk1.hash, 0, 1000)],
        ));

        (manifest, store, temp)
    }

    #[test]
    fn test_ditsfs_creation() {
        let (manifest, store, _temp) = create_test_manifest();
        let config = CacheConfig::default();

        let fs = DitsFS::new(&manifest, Arc::new(store), config).unwrap();
        assert_eq!(fs.tree.len(), 4); // root + dir + 2 files
    }

    #[test]
    fn test_tree_structure() {
        let (manifest, store, _temp) = create_test_manifest();
        let tree = VfsTree::from_manifest(&manifest);

        // Check root
        let root = tree.get(1).unwrap();
        assert!(root.is_dir());
        assert_eq!(root.children.len(), 2); // test.txt and dir/

        // Check file
        let file = tree.lookup(Path::new("test.txt")).unwrap();
        assert!(file.is_file());
        assert_eq!(file.size, 1500);

        // Check nested
        let nested = tree.lookup(Path::new("dir/nested.txt")).unwrap();
        assert!(nested.is_file());
        assert_eq!(nested.size, 1000);
    }
}
