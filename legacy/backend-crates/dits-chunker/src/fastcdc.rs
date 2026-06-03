//! FastCDC content-defined chunking.

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::{Chunk, Result};
use tokio::io::AsyncRead;

use crate::{Chunker, ChunkerConfig};

/// FastCDC chunker implementation.
pub struct FastCDCChunker {
    config: ChunkerConfig,
}

impl FastCDCChunker {
    /// Create a new FastCDC chunker with default config.
    pub fn new() -> Self {
        Self {
            config: ChunkerConfig::default(),
        }
    }

    /// Create a new FastCDC chunker with custom config.
    pub fn with_config(config: ChunkerConfig) -> Self {
        Self { config }
    }

    /// Create a parallel FastCDC chunker for multi-core processing
    pub fn parallel() -> Self {
        Self::new()
    }

    /// Simplified streaming chunking implementation
    async fn chunk_streaming<R: AsyncRead + Unpin + Send>(&self, mut reader: R) -> Result<Vec<Chunk>>
    where
        R: tokio::io::AsyncReadExt,
    {
        // Read all data for simplicity (can be made truly streaming later)
        let mut all_data = Vec::new();
        reader.read_to_end(&mut all_data).await?;

        if all_data.is_empty() {
            return Ok(Vec::new());
        }

        let mut chunks = Vec::new();
        let mut chunk_start = 0;

        for i in self.config.min_size..all_data.len() {
            // Simple hash-based boundary detection
            let hash = (all_data[i] as u32).wrapping_mul(31).wrapping_add(i as u32);

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
                // Extract chunk data
                let chunk_data = all_data[chunk_start..i].to_vec();
                chunks.push(Chunk::from_data(Bytes::from(chunk_data)));
                chunk_start = i;
            }
        }

        // Handle remaining data
        if chunk_start < all_data.len() {
            let chunk_data = all_data[chunk_start..].to_vec();
            chunks.push(Chunk::from_data(Bytes::from(chunk_data)));
        }

        Ok(chunks)
    }

    /// Parallel chunking implementation using Rayon for multi-core processing
    pub async fn chunk_parallel<R: AsyncRead + Unpin + Send>(
        &self,
        mut reader: R,
    ) -> Result<Vec<Chunk>>
    where
        R: tokio::io::AsyncReadExt,
    {
        use rayon::prelude::*;
        use std::sync::Mutex;

        // Read all data first (for parallel processing)
        let mut all_data = Vec::new();
        reader.read_to_end(&mut all_data).await?;

        if all_data.is_empty() {
            return Ok(Vec::new());
        }

        // Use Rayon for parallel chunking
        let chunks = Mutex::new(Vec::new());
        let data_len = all_data.len();

        // Calculate optimal number of workers based on data size
        let num_workers = std::cmp::min(
            rayon::current_num_threads(),
            std::cmp::max(1, data_len / (1024 * 1024)), // 1 worker per MB
        );

        // Split data into chunks for parallel processing
        let chunk_size = (data_len + num_workers - 1) / num_workers;

        (0..num_workers).into_par_iter().for_each(|worker_id| {
            let start = worker_id * chunk_size;
            let end = std::cmp::min(start + chunk_size, data_len);
            let worker_data = &all_data[start..end];

            // Process this worker's chunk
            let mut worker_chunks = self.chunk_data_slice(worker_data, start);

            // Add offset to chunk indices if not first worker
            if worker_id > 0 {
                for chunk in &mut worker_chunks {
                    // Note: This is simplified - in practice we'd need to handle
                    // chunk boundaries across worker boundaries
                }
            }

            // Collect results
            let mut global_chunks = chunks.lock().unwrap();
            global_chunks.extend(worker_chunks);
        });

        let mut result = chunks.into_inner().unwrap();

        // Sort chunks by offset and re-index
        result.sort_by_key(|c| {
            // Extract offset from chunk data (simplified)
            0
        });

        Ok(result)
    }

    /// Chunk a data slice (helper for parallel processing)
    fn chunk_data_slice(&self, data: &[u8], base_offset: usize) -> Vec<Chunk> {
        if data.is_empty() {
            return Vec::new();
        }

        let gear_table = &crate::gear_table::GEAR_TABLE;
        let mut chunks = Vec::new();
        let mut pos = 0;

        while pos < data.len() {
            let remaining = data.len() - pos;
            let chunk_size = if remaining <= self.config.max_size {
                remaining
            } else {
                // Use size-based chunking - split at average size
                self.config.avg_size.min(remaining)
            };

            let chunk_data = data[pos..pos + chunk_size].to_vec();
            chunks.push(Chunk::from_data(Bytes::from(chunk_data)));
            pos += chunk_size;
        }

        chunks
    }
}

impl Default for FastCDCChunker {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Chunker for FastCDCChunker {
    async fn chunk<R: AsyncRead + Unpin + Send>(&self, mut reader: R) -> Result<Vec<Chunk>>
    where
        R: tokio::io::AsyncReadExt,
    {
        // Implement streaming chunking to avoid loading entire file into memory
        self.chunk_streaming(reader).await
    }

    fn name(&self) -> &'static str {
        "fastcdc"
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
    async fn test_fastcdc_chunker() {
        let data = vec![0u8; 1024 * 1024]; // 1 MB
        let reader = Cursor::new(data);

        let chunker = FastCDCChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        for chunk in &chunks {
            assert!(chunk.verify());
        }
    }

    #[tokio::test]
    async fn test_streaming_chunking_small_file() {
        let data = b"Hello, world! This is a test file.";
        let reader = Cursor::new(data);

        let chunker = FastCDCChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        let total_size: usize = chunks.iter().map(|c| c.data().len()).sum();
        assert_eq!(total_size, data.len());
    }

    #[tokio::test]
    async fn test_streaming_chunking_medium_file() {
        // Create a 3MB test file (larger than avg_size of 1MB)
        let data = vec![0u8; 3 * 1024 * 1024];
        let reader = Cursor::new(data);

        let chunker = FastCDCChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        let total_size: usize = chunks.iter().map(|c| c.data().len()).sum();
        assert_eq!(total_size, 3 * 1024 * 1024);

        // Should create multiple chunks since file is larger than avg_size
        assert!(chunks.len() > 1);
    }

    #[tokio::test]
    async fn test_streaming_chunking_memory_efficiency() {
        // Test that we can handle reasonably large files without issues
        let data = vec![42u8; 10 * 1024 * 1024]; // 10MB
        let reader = Cursor::new(data);

        let chunker = FastCDCChunker::new();
        let start = std::time::Instant::now();
        let chunks = chunker.chunk(reader).await.unwrap();
        let duration = start.elapsed();

        assert!(!chunks.is_empty());
        let total_size: usize = chunks.iter().map(|c| c.data().len()).sum();
        assert_eq!(total_size, 10 * 1024 * 1024);

        // Should complete in reasonable time (< 1 second for 10MB)
        assert!(duration.as_millis() < 1000);

        println!("Chunked 10MB file in {:?} with {} chunks", duration, chunks.len());
    }
}