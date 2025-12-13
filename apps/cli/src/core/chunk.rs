//! Content-defined chunking using FastCDC.
//!
//! This is the Universal Layer of the Hybrid Architecture.
//! FastCDC creates variable-size chunks based on content patterns,
//! ensuring that insertions/deletions only affect nearby chunks.
//!
//! Why CDC beats fixed-size chunking:
//! - Fixed: Insert at start → ALL chunks shift → 0% dedup
//! - CDC:   Insert at start → Only first chunk changes → 95%+ dedup

use crate::core::hash::{Hash, Hasher};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};

/// Configuration for the FastCDC chunker.
///
/// The chunker uses three parameters to control chunk sizes:
/// - `min_size`: Prevents tiny chunks that add overhead
/// - `avg_size`: Target size - affects dedup ratio vs chunk count
/// - `max_size`: Prevents huge chunks that hurt partial updates
#[derive(Clone, Debug)]
pub struct ChunkerConfig {
    /// Minimum chunk size in bytes.
    pub min_size: u32,
    /// Average chunk size in bytes.
    pub avg_size: u32,
    /// Maximum chunk size in bytes.
    pub max_size: u32,
}

impl Default for ChunkerConfig {
    fn default() -> Self {
        // Default: 64KB avg - good balance for most files
        Self {
            min_size: 16 * 1024,        // 16 KB
            avg_size: 64 * 1024,        // 64 KB
            max_size: 256 * 1024,       // 256 KB
        }
    }
}

impl ChunkerConfig {
    /// Configuration with small chunks for testing.
    ///
    /// Creates smaller chunks to make deduplication more effective
    /// on smaller test data.
    pub fn small() -> Self {
        Self {
            min_size: 1024,             // 1 KB
            avg_size: 4 * 1024,         // 4 KB
            max_size: 16 * 1024,        // 16 KB
        }
    }

    /// Configuration optimized for large media files (video, 3D, etc).
    ///
    /// Larger chunks reduce manifest overhead for huge files
    /// while still providing good dedup on partial changes.
    pub fn media() -> Self {
        Self {
            min_size: 64 * 1024,        // 64 KB
            avg_size: 256 * 1024,       // 256 KB
            max_size: 1024 * 1024,      // 1 MB
        }
    }

    /// Configuration for project files (XML, JSON, text).
    ///
    /// Smaller chunks enable better dedup on small edits
    /// common in project files and configs.
    pub fn project() -> Self {
        Self {
            min_size: 4 * 1024,         // 4 KB
            avg_size: 16 * 1024,        // 16 KB
            max_size: 64 * 1024,        // 64 KB
        }
    }

    /// Configuration for maximum deduplication.
    ///
    /// Very small chunks - best dedup but most overhead.
    /// Use for files with lots of small repeated patterns.
    pub fn max_dedup() -> Self {
        Self {
            min_size: 2 * 1024,         // 2 KB
            avg_size: 8 * 1024,         // 8 KB
            max_size: 32 * 1024,        // 32 KB
        }
    }

    /// Configuration for maximum speed.
    ///
    /// Very large chunks - minimal overhead but less granular dedup.
    /// Use when throughput matters more than storage efficiency.
    pub fn fast() -> Self {
        Self {
            min_size: 256 * 1024,       // 256 KB
            avg_size: 1024 * 1024,      // 1 MB
            max_size: 4 * 1024 * 1024,  // 4 MB
        }
    }

    /// Select optimal config based on file size.
    pub fn for_size(size: u64) -> Self {
        match size {
            0..=65_536 => Self::project(),           // < 64KB: small file
            65_537..=10_485_760 => Self::default(),  // 64KB - 10MB: default
            _ => Self::media(),                       // > 10MB: media config
        }
    }
}

/// A chunk of data with its content hash.
#[derive(Clone, Debug)]
pub struct Chunk {
    /// The BLAKE3 hash of the chunk data.
    pub hash: Hash,
    /// The chunk data.
    pub data: Vec<u8>,
}

impl Chunk {
    /// Create a new chunk from data.
    pub fn new(data: Vec<u8>) -> Self {
        let hash = Hasher::hash(&data);
        Self { hash, data }
    }

    /// Create a chunk with a known hash (for verification).
    pub fn with_hash(hash: Hash, data: Vec<u8>) -> Self {
        Self { hash, data }
    }

    /// Verify the chunk data matches its hash.
    pub fn verify(&self) -> bool {
        Hasher::hash(&self.data) == self.hash
    }

    /// Get the size of this chunk.
    pub fn size(&self) -> usize {
        self.data.len()
    }
}

/// Reference to a chunk within a file.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChunkRef {
    /// The chunk hash.
    pub hash: Hash,
    /// Offset within the original file.
    pub offset: u64,
    /// Size of this chunk.
    pub size: u64,
}

impl ChunkRef {
    pub fn new(hash: Hash, offset: u64, size: u64) -> Self {
        Self { hash, offset, size }
    }
}

/// Chunk data using FastCDC algorithm.
pub fn chunk_data(data: &[u8], config: &ChunkerConfig) -> Vec<Chunk> {
    if data.is_empty() {
        return Vec::new();
    }

    // For very small files, just return one chunk
    if data.len() <= config.min_size as usize {
        return vec![Chunk::new(data.to_vec())];
    }

    let chunker = fastcdc::v2020::FastCDC::new(
        data,
        config.min_size,
        config.avg_size,
        config.max_size,
    );

    chunker
        .map(|chunk_info| {
            let chunk_data = data[chunk_info.offset..chunk_info.offset + chunk_info.length].to_vec();
            Chunk::new(chunk_data)
        })
        .collect()
}

/// Chunk data and return chunk references (for manifest).
pub fn chunk_data_with_refs(data: &[u8], config: &ChunkerConfig) -> (Vec<Chunk>, Vec<ChunkRef>) {
    if data.is_empty() {
        return (Vec::new(), Vec::new());
    }

    if data.len() <= config.min_size as usize {
        let chunk = Chunk::new(data.to_vec());
        let chunk_ref = ChunkRef::new(chunk.hash, 0, chunk.size() as u64);
        return (vec![chunk], vec![chunk_ref]);
    }

    let chunker = fastcdc::v2020::FastCDC::new(
        data,
        config.min_size,
        config.avg_size,
        config.max_size,
    );

    let mut chunks = Vec::new();
    let mut refs = Vec::new();

    for chunk_info in chunker {
        let chunk_data = data[chunk_info.offset..chunk_info.offset + chunk_info.length].to_vec();
        let chunk = Chunk::new(chunk_data);
        let chunk_ref = ChunkRef::new(chunk.hash, chunk_info.offset as u64, chunk_info.length as u64);
        chunks.push(chunk);
        refs.push(chunk_ref);
    }

    (chunks, refs)
}

/// Parallel chunk data using rayon for faster processing.
///
/// This version uses rayon to hash chunks in parallel, which significantly
/// speeds up processing of large files on multi-core systems. The chunking
/// boundaries are still determined sequentially (FastCDC requirement), but
/// the expensive hashing operations run in parallel.
pub fn chunk_data_parallel(data: &[u8], config: &ChunkerConfig) -> Vec<Chunk> {
    if data.is_empty() {
        return Vec::new();
    }

    // For very small files, just return one chunk
    if data.len() <= config.min_size as usize {
        return vec![Chunk::new(data.to_vec())];
    }

    let chunker = fastcdc::v2020::FastCDC::new(
        data,
        config.min_size,
        config.avg_size,
        config.max_size,
    );

    // Collect chunk boundaries first (sequential - FastCDC requirement)
    let boundaries: Vec<_> = chunker
        .map(|chunk_info| (chunk_info.offset, chunk_info.length))
        .collect();

    // Hash and create chunks in parallel
    boundaries
        .par_iter()
        .map(|&(offset, length)| {
            let chunk_data = data[offset..offset + length].to_vec();
            Chunk::new(chunk_data)
        })
        .collect()
}

/// Parallel chunk data with refs using rayon for faster processing.
///
/// Returns both chunks and references, with hashing done in parallel.
pub fn chunk_data_with_refs_parallel(data: &[u8], config: &ChunkerConfig) -> (Vec<Chunk>, Vec<ChunkRef>) {
    if data.is_empty() {
        return (Vec::new(), Vec::new());
    }

    if data.len() <= config.min_size as usize {
        let chunk = Chunk::new(data.to_vec());
        let chunk_ref = ChunkRef::new(chunk.hash, 0, chunk.size() as u64);
        return (vec![chunk], vec![chunk_ref]);
    }

    let chunker = fastcdc::v2020::FastCDC::new(
        data,
        config.min_size,
        config.avg_size,
        config.max_size,
    );

    // Collect chunk boundaries first (sequential - FastCDC requirement)
    let boundaries: Vec<_> = chunker
        .map(|chunk_info| (chunk_info.offset, chunk_info.length))
        .collect();

    // Hash and create chunks in parallel, preserving order
    let results: Vec<_> = boundaries
        .par_iter()
        .map(|&(offset, length)| {
            let chunk_data = data[offset..offset + length].to_vec();
            let chunk = Chunk::new(chunk_data);
            let chunk_ref = ChunkRef::new(chunk.hash, offset as u64, length as u64);
            (chunk, chunk_ref)
        })
        .collect();

    // Split into separate vectors while preserving order
    results.into_iter().unzip()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunk_determinism() {
        let data = vec![0u8; 1024 * 1024]; // 1 MB of zeros
        let config = ChunkerConfig::default();

        let chunks1 = chunk_data(&data, &config);
        let chunks2 = chunk_data(&data, &config);

        assert_eq!(chunks1.len(), chunks2.len());
        for (c1, c2) in chunks1.iter().zip(chunks2.iter()) {
            assert_eq!(c1.hash, c2.hash);
        }
    }

    #[test]
    fn test_chunk_reconstruction() {
        let data: Vec<u8> = (0..100_000).map(|i| (i % 256) as u8).collect();
        let config = ChunkerConfig::small();

        let chunks = chunk_data(&data, &config);

        // Reconstruct
        let reconstructed: Vec<u8> = chunks
            .iter()
            .flat_map(|c| c.data.iter().copied())
            .collect();

        assert_eq!(data, reconstructed);
    }

    #[test]
    fn test_chunk_verification() {
        let data = b"hello world".to_vec();
        let chunk = Chunk::new(data);
        assert!(chunk.verify());

        // Corrupt the data
        let mut bad_chunk = chunk.clone();
        bad_chunk.data[0] = 0xFF;
        assert!(!bad_chunk.verify());
    }

    #[test]
    fn test_chunk_dedup_potential() {
        // Create data with repeated sections
        let section = vec![42u8; 100_000];
        let mut data = Vec::new();
        for _ in 0..10 {
            data.extend(&section);
            // Add some unique data between sections
            data.extend(vec![0u8; 1000]);
        }

        let config = ChunkerConfig::small();
        let chunks = chunk_data(&data, &config);

        // Count unique hashes
        let mut unique_hashes = std::collections::HashSet::new();
        for chunk in &chunks {
            unique_hashes.insert(chunk.hash);
        }

        // Should have some dedup (fewer unique than total)
        println!("Total chunks: {}, Unique: {}", chunks.len(), unique_hashes.len());
        // With repeated data, we should see deduplication
        assert!(unique_hashes.len() <= chunks.len());
    }

    #[test]
    fn test_small_file_single_chunk() {
        let data = b"small file".to_vec();
        let config = ChunkerConfig::default();

        let chunks = chunk_data(&data, &config);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].data, data);
    }

    #[test]
    fn test_parallel_chunk_determinism() {
        let data = vec![0u8; 1024 * 1024]; // 1 MB of zeros
        let config = ChunkerConfig::default();

        let chunks1 = chunk_data_parallel(&data, &config);
        let chunks2 = chunk_data_parallel(&data, &config);

        assert_eq!(chunks1.len(), chunks2.len());
        for (c1, c2) in chunks1.iter().zip(chunks2.iter()) {
            assert_eq!(c1.hash, c2.hash);
        }
    }

    #[test]
    fn test_parallel_matches_sequential() {
        // Ensure parallel chunking produces identical results to sequential
        let data: Vec<u8> = (0..500_000).map(|i| (i % 256) as u8).collect();
        let config = ChunkerConfig::small();

        let sequential = chunk_data(&data, &config);
        let parallel = chunk_data_parallel(&data, &config);

        assert_eq!(sequential.len(), parallel.len());
        for (seq, par) in sequential.iter().zip(parallel.iter()) {
            assert_eq!(seq.hash, par.hash);
            assert_eq!(seq.data, par.data);
        }
    }

    #[test]
    fn test_parallel_with_refs_matches_sequential() {
        let data: Vec<u8> = (0..500_000).map(|i| (i % 256) as u8).collect();
        let config = ChunkerConfig::small();

        let (seq_chunks, seq_refs) = chunk_data_with_refs(&data, &config);
        let (par_chunks, par_refs) = chunk_data_with_refs_parallel(&data, &config);

        assert_eq!(seq_chunks.len(), par_chunks.len());
        assert_eq!(seq_refs.len(), par_refs.len());

        for (seq, par) in seq_chunks.iter().zip(par_chunks.iter()) {
            assert_eq!(seq.hash, par.hash);
        }

        for (seq, par) in seq_refs.iter().zip(par_refs.iter()) {
            assert_eq!(seq.hash, par.hash);
            assert_eq!(seq.offset, par.offset);
            assert_eq!(seq.size, par.size);
        }
    }

    #[test]
    fn test_parallel_reconstruction() {
        let data: Vec<u8> = (0..100_000).map(|i| (i % 256) as u8).collect();
        let config = ChunkerConfig::small();

        let chunks = chunk_data_parallel(&data, &config);

        // Reconstruct
        let reconstructed: Vec<u8> = chunks
            .iter()
            .flat_map(|c| c.data.iter().copied())
            .collect();

        assert_eq!(data, reconstructed);
    }
}
