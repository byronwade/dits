//! Rabin fingerprinting chunking algorithm.
//!
//! Classic content-defined chunking using polynomial rolling hash.
//! Provides strict locality guarantees but may have size variance issues.

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::{Chunk, Result};
use tokio::io::AsyncRead;

use crate::{Chunker, ChunkerConfig};

/// Rabin chunker implementation.
/// Simplified rolling hash implementation to avoid complex modular arithmetic.
pub struct RabinChunker {
    config: ChunkerConfig,
    /// Window size for rolling hash
    window_size: usize,
}

impl RabinChunker {
    /// Create a new Rabin chunker with default config.
    pub fn new() -> Self {
        Self::with_config(ChunkerConfig::default())
    }

    /// Create a new Rabin chunker with custom config.
    pub fn with_config(config: ChunkerConfig) -> Self {
        let window_size = 64; // Standard Rabin window size

        Self {
            config,
            window_size,
        }
    }

    /// Simplified Rabin-like rolling hash (not true Rabin fingerprinting)
    /// Uses a simple rolling hash to avoid complex modular arithmetic issues
    fn rolling_hash(&self, window: &[u8]) -> u32 {
        if window.is_empty() {
            return 0;
        }

        let mut hash: u32 = 0;
        for &byte in window {
            hash = hash.wrapping_mul(31).wrapping_add(byte as u32);
        }
        hash
    }
}

impl Default for RabinChunker {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Chunker for RabinChunker {
    async fn chunk<R: AsyncRead + Unpin + Send>(&self, mut reader: R) -> Result<Vec<Chunk>>
    where
        R: tokio::io::AsyncReadExt,
    {
        let mut chunks = Vec::new();
        let mut buffer = Vec::new();
        let mut chunk_start = 0;

        loop {
            let mut byte_buf = [0u8; 1];
            match reader.read_exact(&mut byte_buf).await {
                Ok(_) => {
                    let byte = byte_buf[0];
                    buffer.push(byte);

                    // Only check for boundaries when we have enough data
                    if buffer.len() >= self.window_size && buffer.len() - chunk_start >= self.config.min_size {
                        // Get window for rolling hash
                        let window_start = buffer.len() - self.window_size;
                        let window = &buffer[window_start..];

                        // Compute rolling hash
                        let hash = self.rolling_hash(window);

                        // Check for chunk boundary
                        let should_split = if buffer.len() - chunk_start >= self.config.max_size {
                            // Hit max size
                            true
                        } else if buffer.len() - chunk_start >= self.config.min_size {
                            // Check hash boundary condition (similar to FastCDC)
                            (hash & (self.config.avg_size as u32 - 1)) == 0
                        } else {
                            false
                        };

                        if should_split {
                            // Extract chunk data
                            let chunk_data: Vec<u8> = buffer[chunk_start..].to_vec();

                            chunks.push(Chunk::from_data(Bytes::from(chunk_data)));
                            chunk_start = buffer.len();
                        }
                    }
                }
                Err(_) => break, // EOF
            }
        }

        // Handle remaining data
        if chunk_start < buffer.len() {
            let chunk_data: Vec<u8> = buffer[chunk_start..].to_vec();
            chunks.push(Chunk::from_data(Bytes::from(chunk_data)));
        }

        Ok(chunks)
    }

    fn name(&self) -> &'static str {
        "rabin"
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
    use tokio::io::AsyncReadExt;

    #[tokio::test]
    async fn test_rabin_chunker() {
        let data = vec![0u8; 1024 * 1024]; // 1 MB
        let reader = Cursor::new(data);

        let chunker = RabinChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        for chunk in &chunks {
            assert!(chunk.verify());
        }
    }

    #[tokio::test]
    async fn test_rabin_small_file() {
        let data = b"Hello, world! This is a test file.";
        let reader = Cursor::new(data);

        let chunker = RabinChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        let total_size: usize = chunks.iter().map(|c| c.data().len()).sum();
        assert_eq!(total_size, data.len());
    }
}



