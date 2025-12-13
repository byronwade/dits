//! Virtual filesystem entry types.
//!
//! This module defines the in-memory tree structure that represents
//! the virtual filesystem view of a repository commit.

use crate::core::{ChunkRef, Hash, Manifest, ManifestEntry, Mp4Metadata};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// Type of VFS entry.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum VfsEntryType {
    /// Regular file with content.
    File,
    /// Directory containing entries.
    Directory,
    /// Symbolic link.
    Symlink { target: PathBuf },
}

/// A single entry in the virtual filesystem.
#[derive(Clone, Debug)]
pub struct VfsEntry {
    /// Entry name (filename, not full path).
    pub name: String,
    /// Entry type.
    pub entry_type: VfsEntryType,
    /// Full file size (for files).
    pub size: u64,
    /// Modification time.
    pub mtime: SystemTime,
    /// Access time.
    pub atime: SystemTime,
    /// Creation time.
    pub ctime: SystemTime,
    /// Unix permissions mode.
    pub mode: u32,
    /// FUSE inode number (assigned during tree construction).
    pub inode: u64,
    /// Parent inode (0 for root).
    pub parent_inode: u64,
    /// For files: ordered chunk references for content reconstruction.
    pub chunks: Vec<ChunkRef>,
    /// Content hash (for files).
    pub content_hash: Option<Hash>,
    /// MP4 metadata (for MP4 files only).
    pub mp4_metadata: Option<Mp4Metadata>,
    /// Child entries (for directories).
    pub children: HashMap<String, u64>, // name -> inode
}

impl VfsEntry {
    /// Create a new directory entry.
    pub fn directory(name: String, inode: u64, parent_inode: u64) -> Self {
        let now = SystemTime::now();
        Self {
            name,
            entry_type: VfsEntryType::Directory,
            size: 0,
            mtime: now,
            atime: now,
            ctime: now,
            mode: 0o755,
            inode,
            parent_inode,
            chunks: Vec::new(),
            content_hash: None,
            mp4_metadata: None,
            children: HashMap::new(),
        }
    }

    /// Create a new file entry from a manifest entry.
    pub fn file(name: String, inode: u64, parent_inode: u64, manifest_entry: &ManifestEntry) -> Self {
        let now = SystemTime::now();
        Self {
            name,
            entry_type: VfsEntryType::File,
            size: manifest_entry.size,
            mtime: now,
            atime: now,
            ctime: now,
            mode: 0o644,
            inode,
            parent_inode,
            chunks: manifest_entry.chunks.clone(),
            content_hash: Some(manifest_entry.content_hash),
            mp4_metadata: manifest_entry.mp4_metadata.clone(),
            children: HashMap::new(),
        }
    }

    /// Check if this file is an MP4 that needs reconstruction.
    pub fn is_mp4(&self) -> bool {
        self.mp4_metadata.is_some()
    }

    /// Get the header size for MP4 files (ftyp + moov + mdat header).
    pub fn mp4_header_size(&self) -> u64 {
        if let Some(ref meta) = self.mp4_metadata {
            // ftyp (32 bytes typical) + moov_size + mdat header (8 bytes)
            32 + meta.moov_size + 8
        } else {
            0
        }
    }

    /// Check if this is a directory.
    pub fn is_dir(&self) -> bool {
        matches!(self.entry_type, VfsEntryType::Directory)
    }

    /// Check if this is a file.
    pub fn is_file(&self) -> bool {
        matches!(self.entry_type, VfsEntryType::File)
    }

    /// Add a child entry to this directory.
    pub fn add_child(&mut self, name: String, inode: u64) {
        self.children.insert(name, inode);
    }

    /// Find chunk(s) covering a byte range.
    pub fn chunks_for_range(&self, offset: u64, size: u64) -> Vec<(usize, &ChunkRef, u64, u64)> {
        let mut result = Vec::new();
        let end = offset + size;
        let mut chunk_start = 0u64;

        for (idx, chunk) in self.chunks.iter().enumerate() {
            let chunk_end = chunk_start + chunk.size;

            // Check if this chunk overlaps with our range
            if chunk_end > offset && chunk_start < end {
                // Calculate the overlap
                let read_start = offset.saturating_sub(chunk_start);
                let read_end = (end - chunk_start).min(chunk.size);
                result.push((idx, chunk, read_start, read_end - read_start));
            }

            if chunk_start >= end {
                break;
            }

            chunk_start = chunk_end;
        }

        result
    }
}

/// The complete virtual filesystem tree.
pub struct VfsTree {
    /// All entries by inode.
    entries: HashMap<u64, VfsEntry>,
    /// Next available inode.
    next_inode: u64,
    /// Root inode (always 1 in FUSE).
    pub root_inode: u64,
}

impl VfsTree {
    /// Create a new empty VFS tree.
    pub fn new() -> Self {
        let mut tree = Self {
            entries: HashMap::new(),
            next_inode: 2, // 1 is reserved for root
            root_inode: 1,
        };

        // Create root directory
        let root = VfsEntry::directory(String::new(), 1, 0);
        tree.entries.insert(1, root);

        tree
    }

    /// Build VFS tree from a manifest.
    pub fn from_manifest(manifest: &Manifest) -> Self {
        let mut tree = Self::new();

        for (path, entry) in manifest.iter() {
            tree.add_file(path, entry);
        }

        tree
    }

    /// Add a file to the tree, creating parent directories as needed.
    fn add_file(&mut self, path: &str, manifest_entry: &ManifestEntry) {
        let components: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
        if components.is_empty() {
            return;
        }

        let mut current_inode = self.root_inode;

        // Create/traverse directories
        for (i, component) in components.iter().enumerate() {
            let is_last = i == components.len() - 1;

            let current = self.entries.get(&current_inode).unwrap();

            if let Some(&child_inode) = current.children.get(*component) {
                // Entry exists
                if is_last {
                    // This shouldn't happen - file already exists
                    return;
                }
                current_inode = child_inode;
            } else {
                // Need to create entry
                let new_inode = self.next_inode;
                self.next_inode += 1;

                let new_entry = if is_last {
                    // Create file
                    VfsEntry::file(component.to_string(), new_inode, current_inode, manifest_entry)
                } else {
                    // Create directory
                    VfsEntry::directory(component.to_string(), new_inode, current_inode)
                };

                // Add to parent's children
                self.entries.get_mut(&current_inode).unwrap().add_child(component.to_string(), new_inode);

                // Insert new entry
                self.entries.insert(new_inode, new_entry);
                current_inode = new_inode;
            }
        }
    }

    /// Get an entry by inode.
    pub fn get(&self, inode: u64) -> Option<&VfsEntry> {
        self.entries.get(&inode)
    }

    /// Get a mutable entry by inode.
    pub fn get_mut(&mut self, inode: u64) -> Option<&mut VfsEntry> {
        self.entries.get_mut(&inode)
    }

    /// Look up an entry by path.
    pub fn lookup(&self, path: &Path) -> Option<&VfsEntry> {
        let mut current_inode = self.root_inode;

        for component in path.components() {
            if let std::path::Component::Normal(name) = component {
                let name_str = name.to_string_lossy();
                let current = self.entries.get(&current_inode)?;
                current_inode = *current.children.get(name_str.as_ref())?;
            }
        }

        self.entries.get(&current_inode)
    }

    /// Look up child by name in a directory.
    pub fn lookup_child(&self, parent_inode: u64, name: &str) -> Option<&VfsEntry> {
        let parent = self.entries.get(&parent_inode)?;
        let child_inode = parent.children.get(name)?;
        self.entries.get(child_inode)
    }

    /// List entries in a directory.
    pub fn readdir(&self, inode: u64) -> Option<Vec<(String, u64, VfsEntryType)>> {
        let entry = self.entries.get(&inode)?;
        if !entry.is_dir() {
            return None;
        }

        let mut result = vec![
            (".".to_string(), inode, VfsEntryType::Directory),
            ("..".to_string(), entry.parent_inode.max(1), VfsEntryType::Directory),
        ];

        for (name, child_inode) in &entry.children {
            if let Some(child) = self.entries.get(child_inode) {
                result.push((name.clone(), *child_inode, child.entry_type.clone()));
            }
        }

        Some(result)
    }

    /// Get total number of entries.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Check if tree is empty (only root).
    pub fn is_empty(&self) -> bool {
        self.entries.len() <= 1
    }
}

impl Default for VfsTree {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Hash;

    fn make_manifest_entry(size: u64) -> ManifestEntry {
        ManifestEntry::new(
            String::new(),
            size,
            Hash::ZERO,
            vec![ChunkRef::new(Hash::ZERO, 0, size)],
        )
    }

    #[test]
    fn test_tree_creation() {
        let tree = VfsTree::new();
        assert_eq!(tree.root_inode, 1);
        assert!(tree.get(1).unwrap().is_dir());
    }

    #[test]
    fn test_add_file() {
        let mut tree = VfsTree::new();
        let entry = make_manifest_entry(1000);
        tree.add_file("video.mp4", &entry);

        let file = tree.lookup(Path::new("video.mp4")).unwrap();
        assert!(file.is_file());
        assert_eq!(file.size, 1000);
    }

    #[test]
    fn test_add_nested_file() {
        let mut tree = VfsTree::new();
        let entry = make_manifest_entry(2000);
        tree.add_file("footage/raw/scene01.mov", &entry);

        // Check directory structure
        let footage = tree.lookup(Path::new("footage")).unwrap();
        assert!(footage.is_dir());

        let raw = tree.lookup(Path::new("footage/raw")).unwrap();
        assert!(raw.is_dir());

        let file = tree.lookup(Path::new("footage/raw/scene01.mov")).unwrap();
        assert!(file.is_file());
        assert_eq!(file.size, 2000);
    }

    #[test]
    fn test_readdir() {
        let mut tree = VfsTree::new();
        tree.add_file("a.txt", &make_manifest_entry(100));
        tree.add_file("b.txt", &make_manifest_entry(200));
        tree.add_file("dir/c.txt", &make_manifest_entry(300));

        let entries = tree.readdir(1).unwrap();
        assert!(entries.iter().any(|(n, _, _)| n == "a.txt"));
        assert!(entries.iter().any(|(n, _, _)| n == "b.txt"));
        assert!(entries.iter().any(|(n, _, _)| n == "dir"));
    }

    #[test]
    fn test_chunks_for_range() {
        let mut entry = VfsEntry::directory("test".into(), 1, 0);
        entry.entry_type = VfsEntryType::File;
        entry.chunks = vec![
            ChunkRef::new(Hash::ZERO, 0, 100),
            ChunkRef::new(Hash::ZERO, 100, 100),
            ChunkRef::new(Hash::ZERO, 200, 100),
        ];

        // Read spanning two chunks
        let ranges = entry.chunks_for_range(50, 100);
        assert_eq!(ranges.len(), 2);

        // First chunk: read from offset 50, length 50
        assert_eq!(ranges[0].2, 50); // read_start
        assert_eq!(ranges[0].3, 50); // read_length

        // Second chunk: read from offset 0, length 50
        assert_eq!(ranges[1].2, 0);
        assert_eq!(ranges[1].3, 50);
    }
}
