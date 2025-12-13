//! Chunk types and operations.

use crate::hash::{Hash, Hasher};
use bytes::Bytes;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Type alias for chunk hashes.
pub type ChunkHash = Hash;

/// A content-addressed chunk of data.
#[derive(Clone, Debug)]
pub struct Chunk {
    /// The content-addressed hash of this chunk.
    hash: ChunkHash,
    /// The chunk data.
    data: Bytes,
}

impl Chunk {
    /// Create a new chunk from data.
    pub fn from_data(data: impl Into<Bytes>) -> Self {
        let data = data.into();
        let hash = Hasher::hash(&data);
        Self { hash, data }
    }

    /// Create a chunk with a known hash (for validation).
    pub fn with_hash(hash: ChunkHash, data: impl Into<Bytes>) -> Self {
        Self {
            hash,
            data: data.into(),
        }
    }

    /// Get the hash of this chunk.
    pub fn hash(&self) -> &ChunkHash {
        &self.hash
    }

    /// Get the data of this chunk.
    pub fn data(&self) -> &Bytes {
        &self.data
    }

    /// Get the size of this chunk in bytes.
    pub fn size(&self) -> usize {
        self.data.len()
    }

    /// Verify the chunk data matches its hash.
    pub fn verify(&self) -> bool {
        let computed = Hasher::hash(&self.data);
        computed == self.hash
    }

    /// Consume the chunk and return its data.
    pub fn into_data(self) -> Bytes {
        self.data
    }
}

/// Metadata about a stored chunk.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChunkMeta {
    /// The content hash.
    pub hash: ChunkHash,
    /// Size in bytes.
    pub size: u64,
    /// Compression algorithm used (if any).
    pub compression: Option<Compression>,
    /// Original size before compression.
    pub original_size: u64,
    /// When the chunk was created.
    pub created_at: DateTime<Utc>,
    /// Reference count (how many files reference this chunk).
    pub ref_count: u32,
    /// Storage tier.
    pub tier: StorageTier,
}

impl ChunkMeta {
    /// Create new chunk metadata.
    pub fn new(hash: ChunkHash, size: u64) -> Self {
        Self {
            hash,
            size,
            compression: None,
            original_size: size,
            created_at: Utc::now(),
            ref_count: 1,
            tier: StorageTier::Hot,
        }
    }

    /// Check if the chunk is compressed.
    pub fn is_compressed(&self) -> bool {
        self.compression.is_some()
    }

    /// Get the compression ratio (compressed/original).
    pub fn compression_ratio(&self) -> f64 {
        if self.original_size == 0 {
            1.0
        } else {
            self.size as f64 / self.original_size as f64
        }
    }
}

/// Compression algorithms supported.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Compression {
    /// Zstandard compression.
    Zstd,
    /// LZ4 compression.
    Lz4,
    /// No compression (stored raw).
    None,
}

impl Default for Compression {
    fn default() -> Self {
        Self::Zstd
    }
}

/// Storage tier for chunk data.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StorageTier {
    /// Hot storage (frequently accessed).
    Hot,
    /// Warm storage (occasionally accessed).
    Warm,
    /// Cold storage (rarely accessed).
    Cold,
    /// Archive storage (long-term retention).
    Archive,
}

impl Default for StorageTier {
    fn default() -> Self {
        Self::Hot
    }
}

/// A reference to a chunk within a file.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChunkRef {
    /// The chunk hash.
    pub hash: ChunkHash,
    /// Offset within the file.
    pub offset: u64,
    /// Size of this chunk.
    pub size: u64,
}

impl ChunkRef {
    /// Create a new chunk reference.
    pub fn new(hash: ChunkHash, offset: u64, size: u64) -> Self {
        Self { hash, offset, size }
    }
}

/// Statistics about chunking operations.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ChunkStats {
    /// Total number of chunks.
    pub total_chunks: u64,
    /// Number of unique chunks.
    pub unique_chunks: u64,
    /// Total size of all chunks.
    pub total_size: u64,
    /// Size after deduplication.
    pub dedup_size: u64,
    /// Average chunk size.
    pub avg_chunk_size: u64,
    /// Minimum chunk size.
    pub min_chunk_size: u64,
    /// Maximum chunk size.
    pub max_chunk_size: u64,
}

impl ChunkStats {
    /// Calculate deduplication ratio (1.0 = no dedup, > 1.0 = space saved).
    pub fn dedup_ratio(&self) -> f64 {
        if self.dedup_size == 0 {
            1.0
        } else {
            self.total_size as f64 / self.dedup_size as f64
        }
    }

    /// Calculate space saved by deduplication.
    pub fn space_saved(&self) -> u64 {
        self.total_size.saturating_sub(self.dedup_size)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunk_from_data() {
        let data = b"hello world";
        let chunk = Chunk::from_data(data.to_vec());

        assert_eq!(chunk.size(), data.len());
        assert!(chunk.verify());
    }

    #[test]
    fn test_chunk_verify() {
        let data = b"test data";
        let chunk = Chunk::from_data(data.to_vec());

        assert!(chunk.verify());

        // Create chunk with wrong hash
        let bad_chunk = Chunk::with_hash(Hash::ZERO, data.to_vec());
        assert!(!bad_chunk.verify());
    }

    #[test]
    fn test_chunk_meta() {
        let hash = Hasher::hash(b"test");
        let meta = ChunkMeta::new(hash, 1000);

        assert_eq!(meta.size, 1000);
        assert_eq!(meta.ref_count, 1);
        assert!(!meta.is_compressed());
    }

    #[test]
    fn test_compression_ratio() {
        let hash = Hasher::hash(b"test");
        let mut meta = ChunkMeta::new(hash, 500);
        meta.original_size = 1000;
        meta.compression = Some(Compression::Zstd);

        assert_eq!(meta.compression_ratio(), 0.5);
    }

    #[test]
    fn test_chunk_stats() {
        let stats = ChunkStats {
            total_chunks: 100,
            unique_chunks: 80,
            total_size: 10000,
            dedup_size: 8000,
            avg_chunk_size: 100,
            min_chunk_size: 50,
            max_chunk_size: 200,
        };

        assert_eq!(stats.dedup_ratio(), 1.25);
        assert_eq!(stats.space_saved(), 2000);
    }
}
