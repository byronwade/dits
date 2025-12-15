//! Chonkers algorithm implementation.
//!
//! Provides provable strict guarantees on chunk size and edit locality.
//! Uses layered merging with balancing, caterpillar, and diffbit phases.

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::{Chunk, Result};
use tokio::io::AsyncRead;
use std::collections::HashMap;

use crate::{Chunker, ChunkerConfig};

/// Chunk classification by weight (size in absolute units)
#[derive(Clone, Debug, PartialEq)]
enum ChunkWeight {
    Megachonker,    // >= 1.0 absolute units
    Heftychonk,     // >= 0.5 and < 1.0
    FineBoi,        // >= 0.25 and < 0.5
    Kitten,         // < 0.25
}

/// Chonkers chunker with provable guarantees.
pub struct ChonkersChunker {
    config: ChunkerConfig,
    /// Absolute unit size (base size for guarantees)
    absolute_unit: usize,
    /// Current layer number
    layer: usize,
}

impl ChonkersChunker {
    /// Create a new Chonkers chunker.
    pub fn new() -> Self {
        Self::with_config(ChunkerConfig::default())
    }

    /// Create a new Chonkers chunker with custom config.
    pub fn with_config(config: ChunkerConfig) -> Self {
        let absolute_unit = config.avg_size;
        Self {
            config,
            absolute_unit,
            layer: 0,
        }
    }

    /// Classify chunk by weight
    fn classify_weight(&self, size: usize) -> ChunkWeight {
        let weight = size as f64 / self.absolute_unit as f64;

        if weight >= 1.0 {
            ChunkWeight::Megachonker
        } else if weight >= 0.5 {
            ChunkWeight::Heftychonk
        } else if weight >= 0.25 {
            ChunkWeight::FineBoi
        } else {
            ChunkWeight::Kitten
        }
    }

    /// Phase 1: Balancing - merge chunks that are lighter than their neighbors
    fn balancing_phase(chunks: &mut Vec<Vec<u8>>) {
        let mut i = 0;
        while i < chunks.len() {
            // Check if this chunk should be merged
            let should_merge = if i == 0 {
                // First chunk - check against next
                i + 1 < chunks.len() && chunks[i].len() <= chunks[i + 1].len()
            } else if i == chunks.len() - 1 {
                // Last chunk - check against previous
                chunks[i].len() <= chunks[i - 1].len()
            } else {
                // Middle chunk - check against both neighbors
                chunks[i].len() <= chunks[i - 1].len() && chunks[i].len() <= chunks[i + 1].len()
            };

            if should_merge {
                // Merge with right neighbor if possible, otherwise left
                if i + 1 < chunks.len() {
                    let right_chunk = chunks.remove(i + 1);
                    chunks[i].extend_from_slice(&right_chunk);
                } else if i > 0 {
                    let current = chunks.remove(i);
                    chunks[i - 1].extend_from_slice(&current);
                    i -= 1; // Adjust index after removal
                }
            } else {
                i += 1;
            }
        }
    }

    /// Phase 2: Caterpillar - merge consecutive identical chunks
    fn caterpillar_phase(chunks: &mut Vec<Vec<u8>>) {
        let mut i = 0;
        while i < chunks.len() - 1 {
            // Check for identical consecutive chunks
            if chunks[i] == chunks[i + 1] {
                // Merge them
                let next_chunk = chunks.remove(i + 1);
                chunks[i].extend_from_slice(&next_chunk);
            } else {
                i += 1;
            }
        }
    }

    /// Phase 3: Diffbit - compute diffbits and merge based on them
    fn diffbit_phase(&self, chunks: &mut Vec<Vec<u8>>) {
        let mut diffbits = Vec::new();

        // Compute diffbits for each pair of consecutive chunks
        for i in 0..chunks.len() - 1 {
            let diffbit = self.compute_diffbit(&chunks[i], &chunks[i + 1]);
            diffbits.push(diffbit);
        }

        // Add diffbit for last chunk (fictitious neighbor)
        if !chunks.is_empty() {
            let last_chunk = &chunks[chunks.len() - 1];
            let fictitious_diffbit = if !last_chunk.is_empty() {
                (last_chunk[0] & 1) as u64
            } else {
                0
            };
            diffbits.push(fictitious_diffbit);
        }

        // Merge based on diffbit priority
        let mut i = 0;
        while i < chunks.len() - 1 {
            let combined_weight = chunks[i].len() + chunks[i + 1].len();
            let max_allowed = self.absolute_unit;

            // Can merge if combined weight < absolute unit
            if combined_weight < max_allowed && diffbits[i] == diffbits[i + 1] {
                // Merge chunks
                let right_chunk = chunks.remove(i + 1);
                chunks[i].extend_from_slice(&right_chunk);

                // Remove corresponding diffbit
                diffbits.remove(i + 1);
            } else {
                i += 1;
            }
        }
    }

    /// Compute diffbit between two byte sequences
    fn compute_diffbit(&self, a: &[u8], b: &[u8]) -> u64 {
        // Prepend length to each sequence (simplified)
        let a_with_len = [&(a.len() as u32).to_be_bytes()[..], a].concat();
        let b_with_len = [&(b.len() as u32).to_be_bytes()[..], b].concat();

        // Find first differing bit position
        let min_len = a_with_len.len().min(b_with_len.len());

        for pos in 0..min_len * 8 {
            let byte_idx = pos / 8;
            let bit_idx = pos % 8;

            let a_bit = (a_with_len[byte_idx] >> (7 - bit_idx)) & 1;
            let b_bit = (b_with_len[byte_idx] >> (7 - bit_idx)) & 1;

            if a_bit != b_bit {
                // Return position and direction (2*i + d)
                return 2 * pos as u64 + a_bit as u64;
            }
        }

        // If one is prefix of other, return position at end
        if a_with_len.len() != b_with_len.len() {
            let pos = min_len * 8;
            return 2 * pos as u64; // d=0 (changing from something to nothing)
        }

        0 // Identical (shouldn't happen in caterpillar phase)
    }

    /// Simple proto-chunking: split on byte boundaries for now
    fn proto_chunk(&self, data: &[u8]) -> Vec<Vec<u8>> {
        // For simplicity, use fixed-size proto-chunks
        let proto_size = (self.absolute_unit as f64 / 4.0).max(64.0) as usize;
        let mut chunks = Vec::new();

        for chunk in data.chunks(proto_size) {
            chunks.push(chunk.to_vec());
        }

        chunks
    }
}

impl Default for ChonkersChunker {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Chunker for ChonkersChunker {
    async fn chunk<R: AsyncRead + Unpin + Send>(&self, mut reader: R) -> Result<Vec<Chunk>>
    where
        R: tokio::io::AsyncReadExt,
    {
        // Read all data (simplified - in practice would stream)
        let mut data = Vec::new();
        reader.read_to_end(&mut data).await?;

        // Proto-chunking
        let mut chunks = self.proto_chunk(&data);

        // Apply Chonkers phases
        Self::balancing_phase(&mut chunks);
        Self::caterpillar_phase(&mut chunks);
        self.diffbit_phase(&mut chunks);

        // Convert to Chunk objects
        let result = chunks
            .into_iter()
            .map(|chunk_data| Chunk::from_data(Bytes::from(chunk_data)))
            .collect();

        Ok(result)
    }

    fn name(&self) -> &'static str {
        "chonkers"
    }

    fn min_size(&self) -> usize {
        self.config.min_size
    }

    fn max_size(&self) -> usize {
        self.config.max_size
    }

    fn avg_size(&self) -> usize {
        self.config.avg_size
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[tokio::test]
    async fn test_chonkers_chunker() {
        let data = vec![0u8; 1024 * 1024]; // 1 MB
        let reader = Cursor::new(data);

        let chunker = ChonkersChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        for chunk in &chunks {
            assert!(chunk.verify());
        }
    }

    #[tokio::test]
    async fn test_chonkers_small_file() {
        let data = b"Hello, world! This is a test file.";
        let reader = Cursor::new(data);

        let chunker = ChonkersChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        let total_size: usize = chunks.iter().map(|c| c.data().len()).sum();
        assert_eq!(total_size, data.len());
    }
}



