//! Index (staging area) for tracking file changes.
//!
//! ## Phase 3.6: Hybrid Storage Support
//!
//! The index now tracks storage strategy per file:
//! - `StorageStrategy::GitText` → stores `git_oid` (SHA-1)
//! - `StorageStrategy::DitsChunk` → stores `chunks` (BLAKE3)
//! - `StorageStrategy::Hybrid` → stores both

use crate::core::chunk::ChunkRef;
use crate::core::hash::Hash;
use crate::core::storage_strategy::StorageStrategy;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Status of a file in the working directory.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileStatus {
    /// File has been added (new file).
    Added,
    /// File has been modified.
    Modified,
    /// File has been deleted.
    Deleted,
    /// File is unchanged.
    Unchanged,
    /// File is not tracked.
    Untracked,
}

/// Represents an atom in the MP4 file structure.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StoredAtom {
    /// 4-character atom type (e.g., "ftyp", "uuid", "free").
    pub atom_type: String,
    /// Hash of the atom data (if stored separately).
    pub hash: Option<Hash>,
    /// Inline data for small atoms (< 64 bytes).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inline_data: Option<Vec<u8>>,
}

/// MP4-specific metadata for structure-aware versioning.
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct Mp4Metadata {
    /// Hash of the ftyp atom data.
    pub ftyp_hash: Option<Hash>,
    /// Hash of the normalized moov atom data.
    pub moov_hash: Option<Hash>,
    /// Size of the moov atom.
    pub moov_size: u64,
    /// Size of the mdat data (without header).
    pub mdat_size: u64,
    /// Whether offsets need patching on reconstruction.
    pub needs_offset_patching: bool,
    /// Original stco table locations (relative to moov start).
    pub stco_offsets: Vec<(u64, u32)>, // (offset, count)
    /// Original co64 table locations (relative to moov start).
    pub co64_offsets: Vec<(u64, u32)>, // (offset, count)
    /// Original atom order (ftyp, uuid, moov, free, mdat, etc.) for reconstruction.
    /// Each entry is the 4-char atom type name.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub atom_order: Vec<String>,
    /// Other atoms (uuid, free, etc.) stored separately.
    /// Keyed by their hash.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub other_atoms: Vec<StoredAtom>,
}

/// An entry in the index representing a staged file.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct IndexEntry {
    /// File path.
    pub path: String,
    /// Content hash of the staged version (BLAKE3).
    pub content_hash: Hash,
    /// File size.
    pub size: u64,
    /// Modification time (unix timestamp).
    pub mtime: i64,
    /// Chunk references for this file (mdat chunks for MP4).
    /// Empty for GitText storage strategy.
    pub chunks: Vec<ChunkRef>,
    /// Status of this entry.
    pub status: FileStatus,
    /// MP4-specific metadata (None for non-MP4 files).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mp4_metadata: Option<Mp4Metadata>,

    // === Phase 3.6: Hybrid Storage Fields ===

    /// Storage strategy for this file.
    /// Determines whether content is stored in Git or Dits.
    #[serde(default)]
    pub storage: StorageStrategy,

    /// Git blob OID (SHA-1, 20 bytes as hex string).
    /// Set when storage is GitText or Hybrid.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub git_oid: Option<String>,
}

impl IndexEntry {
    /// Create a new index entry for a binary file (Dits storage).
    pub fn new(
        path: String,
        content_hash: Hash,
        size: u64,
        mtime: i64,
        chunks: Vec<ChunkRef>,
    ) -> Self {
        Self {
            path,
            content_hash,
            size,
            mtime,
            chunks,
            status: FileStatus::Added,
            mp4_metadata: None,
            storage: StorageStrategy::DitsChunk,
            git_oid: None,
        }
    }

    /// Create a new index entry for an MP4 file.
    pub fn new_mp4(
        path: String,
        content_hash: Hash,
        size: u64,
        mtime: i64,
        chunks: Vec<ChunkRef>,
        mp4_metadata: Mp4Metadata,
    ) -> Self {
        Self {
            path,
            content_hash,
            size,
            mtime,
            chunks,
            status: FileStatus::Added,
            mp4_metadata: Some(mp4_metadata),
            storage: StorageStrategy::DitsChunk,
            git_oid: None,
        }
    }

    /// Create a new index entry for a text file (Git storage).
    ///
    /// Phase 3.6: Text files are stored using libgit2.
    pub fn new_text(
        path: String,
        content_hash: Hash,
        size: u64,
        mtime: i64,
        git_oid: String,
    ) -> Self {
        Self {
            path,
            content_hash,
            size,
            mtime,
            chunks: Vec::new(), // No chunks for Git storage
            status: FileStatus::Added,
            mp4_metadata: None,
            storage: StorageStrategy::GitText,
            git_oid: Some(git_oid),
        }
    }

    /// Create a new index entry with explicit storage strategy.
    pub fn new_with_strategy(
        path: String,
        content_hash: Hash,
        size: u64,
        mtime: i64,
        chunks: Vec<ChunkRef>,
        storage: StorageStrategy,
        git_oid: Option<String>,
    ) -> Self {
        Self {
            path,
            content_hash,
            size,
            mtime,
            chunks,
            status: FileStatus::Added,
            mp4_metadata: None,
            storage,
            git_oid,
        }
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

    /// Check if this entry uses hybrid storage.
    pub fn is_hybrid(&self) -> bool {
        matches!(self.storage, StorageStrategy::Hybrid)
    }

    /// Get storage strategy label for display.
    pub fn storage_label(&self) -> &'static str {
        self.storage.label()
    }
}

/// The index (staging area).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Index {
    /// Staged entries.
    pub entries: BTreeMap<String, IndexEntry>,
    /// The commit this index is based on (HEAD).
    pub base_commit: Option<Hash>,
}

impl Index {
    /// Create a new empty index.
    pub fn new() -> Self {
        Self {
            entries: BTreeMap::new(),
            base_commit: None,
        }
    }

    /// Create an index based on a commit.
    pub fn from_commit(commit_hash: Hash) -> Self {
        Self {
            entries: BTreeMap::new(),
            base_commit: Some(commit_hash),
        }
    }

    /// Stage an entry.
    pub fn stage(&mut self, entry: IndexEntry) {
        self.entries.insert(entry.path.clone(), entry);
    }

    /// Unstage a file.
    pub fn unstage(&mut self, path: &str) -> Option<IndexEntry> {
        self.entries.remove(path)
    }

    /// Get a staged entry.
    pub fn get(&self, path: &str) -> Option<&IndexEntry> {
        self.entries.get(path)
    }

    /// Check if a path is staged.
    pub fn is_staged(&self, path: &str) -> bool {
        self.entries.contains_key(path)
    }

    /// Get all staged paths.
    pub fn staged_paths(&self) -> impl Iterator<Item = &str> {
        self.entries.keys().map(|s| s.as_str())
    }

    /// Get the number of staged entries.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Check if the index is empty.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Clear all staged entries.
    pub fn clear(&mut self) {
        self.entries.clear();
    }

    /// Get entries by status.
    pub fn entries_by_status(&self, status: FileStatus) -> Vec<&IndexEntry> {
        self.entries
            .values()
            .filter(|e| e.status == status)
            .collect()
    }

    /// Serialize to JSON.
    pub fn to_json(&self) -> String {
        serde_json::to_string_pretty(self).expect("index serialization should not fail")
    }

    /// Deserialize from JSON.
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}

impl Default for Index {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_index_stage_unstage() {
        let mut index = Index::new();

        let entry = IndexEntry::new(
            "test.bin".to_string(),
            Hash::ZERO,
            100,
            0,
            vec![],
        );

        index.stage(entry);
        assert!(index.is_staged("test.bin"));
        assert_eq!(index.len(), 1);

        index.unstage("test.bin");
        assert!(!index.is_staged("test.bin"));
        assert_eq!(index.len(), 0);
    }

    #[test]
    fn test_index_json_roundtrip() {
        let mut index = Index::new();
        index.stage(IndexEntry::new(
            "test.bin".to_string(),
            Hash::ZERO,
            100,
            0,
            vec![],
        ));

        let json = index.to_json();
        let parsed = Index::from_json(&json).unwrap();

        assert_eq!(index.len(), parsed.len());
        assert!(parsed.is_staged("test.bin"));
    }

    #[test]
    fn test_text_entry_storage() {
        let entry = IndexEntry::new_text(
            "README.md".to_string(),
            Hash::ZERO,
            500,
            0,
            "abc123def456".to_string(),
        );

        assert!(entry.is_git_text());
        assert!(!entry.is_dits_chunk());
        assert!(entry.chunks.is_empty());
        assert_eq!(entry.git_oid, Some("abc123def456".to_string()));
        assert_eq!(entry.storage_label(), "text");
    }

    #[test]
    fn test_binary_entry_storage() {
        let entry = IndexEntry::new(
            "video.mp4".to_string(),
            Hash::ZERO,
            1_000_000,
            0,
            vec![],
        );

        assert!(!entry.is_git_text());
        assert!(entry.is_dits_chunk());
        assert!(entry.git_oid.is_none());
        assert_eq!(entry.storage_label(), "binary");
    }

    #[test]
    fn test_index_json_roundtrip_with_storage() {
        let mut index = Index::new();

        // Add text file
        index.stage(IndexEntry::new_text(
            "config.json".to_string(),
            Hash::ZERO,
            200,
            0,
            "oid123".to_string(),
        ));

        // Add binary file
        index.stage(IndexEntry::new(
            "image.png".to_string(),
            Hash::ZERO,
            50000,
            0,
            vec![],
        ));

        let json = index.to_json();
        let parsed = Index::from_json(&json).unwrap();

        assert_eq!(parsed.len(), 2);

        let text_entry = parsed.get("config.json").unwrap();
        assert!(text_entry.is_git_text());
        assert_eq!(text_entry.git_oid, Some("oid123".to_string()));

        let bin_entry = parsed.get("image.png").unwrap();
        assert!(bin_entry.is_dits_chunk());
        assert!(bin_entry.git_oid.is_none());
    }
}
