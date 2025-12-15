//! Parallel FastCDC chunking implementation.
//!
//! Uses rayon for multi-core chunking to improve throughput on large files.
//! Splits the file into segments and chunks them in parallel.

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::{Chunk, Result};
use tokio::io::AsyncRead;
use rayon::prelude::*;
use std::sync::Arc;

use crate::{Chunker, ChunkerConfig};

/// Parallel FastCDC chunker implementation.
pub struct ParallelFastCDCChunker {
    config: ChunkerConfig,
    /// Number of parallel workers
    num_workers: usize,
}

impl ParallelFastCDCChunker {
    /// Create a new parallel FastCDC chunker with default config.
    pub fn new() -> Self {
        Self {
            config: ChunkerConfig::default(),
            num_workers: num_cpus::get(),
        }
    }

    /// Create a new parallel FastCDC chunker with custom config.
    pub fn with_config(config: ChunkerConfig) -> Self {
        Self {
            config,
            num_workers: num_cpus::get(),
        }
    }

    /// Create with specific number of workers
    pub fn with_workers(config: ChunkerConfig, num_workers: usize) -> Self {
        Self {
            config,
            num_workers: num_workers.min(num_cpus::get()),
        }
    }

    /// Chunk a single segment of data
    fn chunk_segment(&self, data: &[u8], segment_start: usize) -> Vec<(usize, Vec<u8>)> {
        let mut chunks = Vec::new();
        let mut chunk_start = 0;
        let mut hash: u32 = 0;
        let gear_table = super::gear_table::generate_gear_table();

        const WINDOW_SIZE: usize = 64;

        // Initialize hash for first window
        if data.len() >= WINDOW_SIZE {
            for &byte in &data[..WINDOW_SIZE] {
                hash = (hash << 1).wrapping_add(gear_table[byte as usize]);
            }
        }

        for i in WINDOW_SIZE..data.len() {
            // Update rolling hash
            let oldest_byte = data[i - WINDOW_SIZE];
            // Use modular arithmetic to avoid overflow
            // oldest_contrib = gear_table[oldest_byte] * (256^(WINDOW_SIZE-1)) mod 2^32
            let mut oldest_contrib = gear_table[oldest_byte as usize];
            for _ in 0..(WINDOW_SIZE - 1) {
                oldest_contrib = oldest_contrib.wrapping_mul(256);
            }
            hash = hash
                .wrapping_sub(oldest_contrib)
                .wrapping_add(gear_table[data[i] as usize]);

            // Check for chunk boundary
            let should_split = if i - chunk_start >= self.config.max_size {
                // Hit max size
                true
            } else if i - chunk_start >= self.config.min_size {
                // Check hash boundary condition
                (hash & (self.config.avg_size as u32 - 1)) == 0
            } else {
                false
            };

            if should_split {
                let chunk_data = data[chunk_start..i].to_vec();
                chunks.push((segment_start + chunk_start, chunk_data));
                chunk_start = i;
            }
        }

        // Handle remaining data
        if chunk_start < data.len() {
            let chunk_data = data[chunk_start..].to_vec();
            chunks.push((segment_start + chunk_start, chunk_data));
        }

        chunks
    }
}

impl Default for ParallelFastCDCChunker {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Chunker for ParallelFastCDCChunker {
    async fn chunk<R: AsyncRead + Unpin + Send>(&self, mut reader: R) -> Result<Vec<Chunk>>
    where
        R: tokio::io::AsyncReadExt,
    {
        // Read all data (for parallel processing)
        let mut data = Vec::new();
        reader.read_to_end(&mut data).await?;

        if data.is_empty() {
            return Ok(Vec::new());
        }

        // Split data into segments for parallel processing
        let segment_size = (data.len() / self.num_workers).max(self.config.max_size);
        let segments: Vec<(usize, &[u8])> = data
            .chunks(segment_size)
            .enumerate()
            .map(|(i, chunk)| (i * segment_size, chunk))
            .collect();

        // Process segments in parallel
        let chunk_results: Vec<Vec<(usize, Vec<u8>)>> = segments
            .par_iter()
            .map(|(offset, segment_data)| {
                self.chunk_segment(segment_data, *offset)
            })
            .collect();

        // Flatten and sort chunks by offset to maintain order
        let mut all_chunks: Vec<(usize, Vec<u8>)> = chunk_results
            .into_iter()
            .flatten()
            .collect();

        all_chunks.sort_by_key(|(offset, _)| *offset);

        // Convert to Chunk objects
        let chunks = all_chunks
            .into_iter()
            .map(|(_, chunk_data)| Chunk::from_data(Bytes::from(chunk_data)))
            .collect();

        Ok(chunks)
    }

    fn name(&self) -> &'static str {
        "parallel-fastcdc"
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
    async fn test_parallel_fastcdc_chunker() {
        let data = vec![0u8; 1024 * 1024]; // 1 MB
        let reader = Cursor::new(data);

        let chunker = ParallelFastCDCChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        for chunk in &chunks {
            assert!(chunk.verify());
        }
    }

    #[tokio::test]
    async fn test_parallel_fastcdc_small_file() {
        let data = b"Hello, world! This is a test file.";
        let reader = Cursor::new(data);

        let chunker = ParallelFastCDCChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        let total_size: usize = chunks.iter().map(|c| c.data().len()).sum();
        assert_eq!(total_size, data.len());
    }

    #[tokio::test]
    async fn test_parallel_consistency_with_sequential() {
        let data = vec![0u8; 512 * 1024]; // 512 KB
        let reader1 = Cursor::new(data.clone());
        let reader2 = Cursor::new(data);

        let parallel_chunker = ParallelFastCDCChunker::with_workers(
            ChunkerConfig::default(),
            1, // Force single worker for comparison
        );
        let sequential_chunker = crate::fastcdc::FastCDCChunker::new();

        let parallel_chunks = parallel_chunker.chunk(reader1).await.unwrap();
        let sequential_chunks = sequential_chunker.chunk(reader2).await.unwrap();

        // Should produce same number of chunks
        assert_eq!(parallel_chunks.len(), sequential_chunks.len());

        // Should produce chunks of same total size
        let parallel_total: usize = parallel_chunks.iter().map(|c| c.data().len()).sum();
        let sequential_total: usize = sequential_chunks.iter().map(|c| c.data().len()).sum();
        assert_eq!(parallel_total, sequential_total);
    }
}



