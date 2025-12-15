//! Asymmetric Extremum (AE) chunking algorithm.
//!
//! Places chunk boundaries at local extrema within a sliding window.
//! Provides better chunk size control than hash-based methods.

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::{Chunk, Result};
use tokio::io::AsyncRead;

use crate::{Chunker, ChunkerConfig};

/// Asymmetric Extremum chunker implementation.
pub struct AeChunker {
    config: ChunkerConfig,
    /// Window size for finding extrema
    window_size: usize,
}

impl AeChunker {
    /// Create a new AE chunker with default config.
    pub fn new() -> Self {
        Self::with_config(ChunkerConfig::default())
    }

    /// Create a new AE chunker with custom config.
    pub fn with_config(config: ChunkerConfig) -> Self {
        // Window size based on target average chunk size
        let window_size = (config.avg_size as f64 * 0.1).max(16.0).min(256.0) as usize;
        Self {
            config,
            window_size,
        }
    }

    /// Find local minimum in the window
    fn find_local_minimum(window: &[u8]) -> Option<usize> {
        if window.len() < 3 {
            return None;
        }

        // Look for local minima (smaller than both neighbors)
        for i in 1..window.len() - 1 {
            if window[i] < window[i - 1] && window[i] < window[i + 1] {
                return Some(i);
            }
        }

        None
    }

    /// Find local maximum in the window
    fn find_local_maximum(window: &[u8]) -> Option<usize> {
        if window.len() < 3 {
            return None;
        }

        // Look for local maxima (larger than both neighbors)
        for i in 1..window.len() - 1 {
            if window[i] > window[i - 1] && window[i] > window[i + 1] {
                return Some(i);
            }
        }

        None
    }
}

impl Default for AeChunker {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Chunker for AeChunker {
    async fn chunk<R: AsyncRead + Unpin + Send>(&self, mut reader: R) -> Result<Vec<Chunk>>
    where
        R: tokio::io::AsyncReadExt,
    {
        let mut chunks = Vec::new();
        let mut buffer = Vec::new();
        let mut chunk_start = 0;
        let mut last_boundary = 0;

        loop {
            let mut byte_buf = [0u8; 1];
            match reader.read_exact(&mut byte_buf).await {
                Ok(_) => {
                    let byte = byte_buf[0];
                    buffer.push(byte);

                    // Only check for boundaries when we have enough data
                    if buffer.len() >= self.window_size && buffer.len() - last_boundary >= self.config.min_size {
                        // Check if we've hit max size
                        if buffer.len() - chunk_start >= self.config.max_size {
                            // Force split at max size
                            let chunk_size = buffer.len() - chunk_start;
                            let chunk_data: Vec<u8> = buffer[chunk_start..].to_vec();
                            chunks.push(Chunk::from_data(Bytes::from(chunk_data)));
                            chunk_start = buffer.len();
                            last_boundary = buffer.len();
                            continue;
                        }

                        // Look for extrema in the current window
                        let window_start = buffer.len().saturating_sub(self.window_size);
                        let window = &buffer[window_start..];

                        // Try to find a local minimum first (prefer smaller values for boundaries)
                        if let Some(min_pos) = Self::find_local_minimum(window) {
                            let boundary_pos = window_start + min_pos;

                            // Only split if we're past minimum size and this boundary is valid
                            if boundary_pos >= chunk_start + self.config.min_size {
                                let chunk_size = boundary_pos - chunk_start;
                                let chunk_data: Vec<u8> = buffer[chunk_start..boundary_pos].to_vec();
                                chunks.push(Chunk::from_data(Bytes::from(chunk_data)));
                                chunk_start = boundary_pos;
                                last_boundary = boundary_pos;
                            }
                        }
                        // If no minimum found, try maximum
                        else if let Some(max_pos) = Self::find_local_maximum(window) {
                            let boundary_pos = window_start + max_pos;

                            if boundary_pos >= chunk_start + self.config.min_size {
                                let chunk_size = boundary_pos - chunk_start;
                                let chunk_data: Vec<u8> = buffer[chunk_start..boundary_pos].to_vec();
                                chunks.push(Chunk::from_data(Bytes::from(chunk_data)));
                                chunk_start = boundary_pos;
                                last_boundary = boundary_pos;
                            }
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
        "ae"
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
    async fn test_ae_chunker() {
        let data = vec![0u8; 1024 * 1024]; // 1 MB
        let reader = Cursor::new(data);

        let chunker = AeChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        for chunk in &chunks {
            assert!(chunk.verify());
        }
    }

    #[tokio::test]
    async fn test_ae_small_file() {
        let data = b"Hello, world! This is a test file.";
        let reader = Cursor::new(data);

        let chunker = AeChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        let total_size: usize = chunks.iter().map(|c| c.data().len()).sum();
        assert_eq!(total_size, data.len());
    }
}



