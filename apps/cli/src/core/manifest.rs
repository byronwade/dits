//! Manifest (tree) objects that track file contents.
//!
//! ## Phase 3.6: Hybrid Storage Support
//!
//! Manifest entries now track storage strategy and git_oid for text files.

use crate::core::chunk::ChunkRef;
use crate::core::hash::{Hash, Hasher};
use crate::core::index::{FileType, Mp4Metadata};
use crate::core::storage_strategy::StorageStrategy;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// File mode/type.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileMode {
    /// Regular file.
    Regular,
    /// Executable file.
    Executable,
    /// Symbolic link.
    Symlink,
}

impl Default for FileMode {
    fn default() -> Self {
        Self::Regular
    }
}

/// An entry in the manifest representing a single file.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ManifestEntry {
    /// File path relative to repository root.
    pub path: String,
    /// File mode.
    pub mode: FileMode,
    /// File type (regular, symlink, directory, etc.).
    pub file_type: FileType,
    /// Symlink target (empty string for non-symlinks).
    pub symlink_target: String,
    /// Total file size.
    pub size: u64,
    /// Hash of the file content (all chunks combined).
    pub content_hash: Hash,
    /// Ordered list of chunk references (for mdat data if MP4).
    /// Empty for GitText storage strategy.
    pub chunks: Vec<ChunkRef>,
    /// MP4-specific metadata (None for non-MP4 files).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mp4_metadata: Option<Mp4Metadata>,

    // === Phase 3.6: Hybrid Storage Fields ===

    /// Storage strategy for this file.
    #[serde(default)]
    pub storage: StorageStrategy,

    /// Git blob OID (SHA-1, 20 bytes as hex string).
    /// Set when storage is GitText or Hybrid.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub git_oid: Option<String>,
}

impl ManifestEntry {
    /// Create a new manifest entry for a binary file (Dits storage).
    pub fn new(path: String, size: u64, content_hash: Hash, chunks: Vec<ChunkRef>) -> Self {
        Self {
            path,
            mode: FileMode::Regular,
            file_type: FileType::Regular,
            symlink_target: String::new(),
            size,
            content_hash,
            chunks,
            mp4_metadata: None,
            storage: StorageStrategy::DitsChunk,
            git_oid: None,
        }
    }

    /// Create a new manifest entry for an MP4 file.
    pub fn new_mp4(
        path: String,
        size: u64,
        content_hash: Hash,
        chunks: Vec<ChunkRef>,
        mp4_metadata: Mp4Metadata,
    ) -> Self {
        Self {
            path,
            mode: FileMode::Regular,
            file_type: FileType::Regular,
            symlink_target: String::new(),
            size,
            content_hash,
            chunks,
            mp4_metadata: Some(mp4_metadata),
            storage: StorageStrategy::DitsChunk,
            git_oid: None,
        }
    }

    /// Create a new manifest entry for a text file (Git storage).
    pub fn new_text(path: String, size: u64, content_hash: Hash, git_oid: String) -> Self {
        Self {
            path,
            mode: FileMode::Regular,
            file_type: FileType::Regular,
            symlink_target: String::new(),
            size,
            content_hash,
            chunks: Vec::new(),
            mp4_metadata: None,
            storage: StorageStrategy::GitText,
            git_oid: Some(git_oid),
        }
    }

    /// Create a new manifest entry with explicit storage strategy.
    pub fn new_with_strategy(
        path: String,
        size: u64,
        content_hash: Hash,
        chunks: Vec<ChunkRef>,
        storage: StorageStrategy,
        git_oid: Option<String>,
    ) -> Self {
        Self {
            path,
            mode: FileMode::Regular,
            file_type: FileType::Regular,
            symlink_target: String::new(),
            size,
            content_hash,
            chunks,
            mp4_metadata: None,
            storage,
            git_oid,
        }
    }

    /// Get the number of chunks in this file.
    pub fn chunk_count(&self) -> usize {
        self.chunks.len()
    }

    /// Check if this entry is an MP4 file.
    pub fn is_mp4(&self) -> bool {
        self.mp4_metadata.is_some()
    }

    /// Check if this entry uses Git storage.
    pub fn is_git_text(&self) -> bool {
        matches!(self.storage, StorageStrategy::GitText)
    }

    /// Check if this entry uses Dits chunk storage.
    pub fn is_dits_chunk(&self) -> bool {
        matches!(self.storage, StorageStrategy::DitsChunk)
    }
}

/// A manifest (tree) object containing all files in a commit.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Manifest {
    /// Map of path -> entry.
    pub entries: BTreeMap<String, ManifestEntry>,
}

impl Manifest {
    /// Create a new empty manifest.
    pub fn new() -> Self {
        Self {
            entries: BTreeMap::new(),
        }
    }

    /// Add an entry to the manifest.
    pub fn add(&mut self, entry: ManifestEntry) {
        self.entries.insert(entry.path.clone(), entry);
    }

    /// Remove an entry from the manifest.
    pub fn remove(&mut self, path: &str) -> Option<ManifestEntry> {
        self.entries.remove(path)
    }

    /// Get an entry by path.
    pub fn get(&self, path: &str) -> Option<&ManifestEntry> {
        self.entries.get(path)
    }

    /// Check if the manifest contains a path.
    pub fn contains(&self, path: &str) -> bool {
        self.entries.contains_key(path)
    }

    /// Get the number of files in the manifest.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Check if the manifest is empty.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Get all file paths.
    pub fn paths(&self) -> impl Iterator<Item = &str> {
        self.entries.keys().map(|s| s.as_str())
    }

    /// Get all entries.
    pub fn iter(&self) -> impl Iterator<Item = (&String, &ManifestEntry)> {
        self.entries.iter()
    }

    /// Calculate the total size of all files.
    pub fn total_size(&self) -> u64 {
        self.entries.values().map(|e| e.size).sum()
    }

    /// Calculate the total number of chunks.
    pub fn total_chunks(&self) -> usize {
        self.entries.values().map(|e| e.chunks.len()).sum()
    }

    /// Get all unique chunk hashes.
    pub fn unique_chunk_hashes(&self) -> Vec<Hash> {
        let mut hashes: Vec<Hash> = self
            .entries
            .values()
            .flat_map(|e| e.chunks.iter().map(|c| c.hash))
            .collect();
        hashes.sort_by(|a, b| a.to_hex().cmp(&b.to_hex()));
        hashes.dedup();
        hashes
    }

    /// Compute the hash of this manifest.
    pub fn hash(&self) -> Hash {
        let json = serde_json::to_vec(self).expect("manifest serialization should not fail");
        Hasher::hash(&json)
    }

    /// Serialize to JSON.
    pub fn to_json(&self) -> String {
        serde_json::to_string_pretty(self).expect("manifest serialization should not fail")
    }

    /// Deserialize from JSON.
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}

impl Default for Manifest {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manifest_add_remove() {
        let mut manifest = Manifest::new();

        let entry = ManifestEntry::new(
            "test.txt".to_string(),
            100,
            Hash::ZERO,
            vec![ChunkRef::new(Hash::ZERO, 0, 100)],
        );

        manifest.add(entry);
        assert!(manifest.contains("test.txt"));
        assert_eq!(manifest.len(), 1);

        manifest.remove("test.txt");
        assert!(!manifest.contains("test.txt"));
        assert_eq!(manifest.len(), 0);
    }

    #[test]
    fn test_manifest_hash_deterministic() {
        let mut manifest = Manifest::new();
        manifest.add(ManifestEntry::new(
            "a.txt".to_string(),
            10,
            Hash::ZERO,
            vec![],
        ));
        manifest.add(ManifestEntry::new(
            "b.txt".to_string(),
            20,
            Hash::ZERO,
            vec![],
        ));

        let hash1 = manifest.hash();
        let hash2 = manifest.hash();
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_manifest_json_roundtrip() {
        let mut manifest = Manifest::new();
        manifest.add(ManifestEntry::new(
            "test.txt".to_string(),
            100,
            Hash::ZERO,
            vec![ChunkRef::new(Hash::ZERO, 0, 100)],
        ));

        let json = manifest.to_json();
        let parsed = Manifest::from_json(&json).unwrap();

        assert_eq!(manifest.len(), parsed.len());
        assert!(parsed.contains("test.txt"));
    }
}
