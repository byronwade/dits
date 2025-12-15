//! Keyed FastCDC (KCDC) chunking for privacy protection.
//!
//! Prevents fingerprinting attacks by incorporating a secret key into the chunking process.
//! Uses HMAC-SHA256 as a PRF to randomize chunk boundary decisions.

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::{Chunk, Result};
use tokio::io::AsyncRead;
use hmac::{Hmac, Mac};
use sha2::Sha256;

use crate::{Chunker, ChunkerConfig};

type HmacSha256 = Hmac<Sha256>;

/// Keyed FastCDC chunker with privacy protection.
pub struct KeyedFastCDCChunker {
    config: ChunkerConfig,
    key: Vec<u8>,
}

impl KeyedFastCDCChunker {
    /// Create a new keyed FastCDC chunker with default config.
    pub fn new(key: Vec<u8>) -> Self {
        Self {
            config: ChunkerConfig::default(),
            key,
        }
    }

    /// Create a new keyed FastCDC chunker with custom config.
    pub fn with_config(config: ChunkerConfig, key: Vec<u8>) -> Self {
        Self { config, key }
    }

    /// Generate a pseudorandom value using HMAC-SHA256 as PRF
    fn prf(&self, counter: u64, window_data: &[u8]) -> u64 {
        let mut mac = HmacSha256::new_from_slice(&self.key)
            .expect("HMAC can take key of any size");

        // Include counter and window data in the PRF input
        mac.update(&counter.to_be_bytes());
        mac.update(window_data);

        let result = mac.finalize().into_bytes();

        // Convert first 8 bytes to u64 for chunking decision
        let mut bytes = [0u8; 8];
        bytes.copy_from_slice(&result[..8]);
        u64::from_be_bytes(bytes)
    }

    /// Keyed streaming chunking implementation
    async fn chunk_streaming<R: AsyncRead + Unpin + Send>(&self, mut reader: R) -> Result<Vec<Chunk>>
    where
        R: tokio::io::AsyncReadExt,
    {
        const WINDOW_SIZE: usize = 64;

        let mut chunks = Vec::new();
        let mut buffer = Vec::new();
        let mut chunk_start = 0;
        let mut counter = 0u64;

        loop {
            // Read next byte
            let mut byte_buf = [0u8; 1];
            match reader.read_exact(&mut byte_buf).await {
                Ok(_) => {
                    let byte = byte_buf[0];
                    buffer.push(byte);

                    // Only check for boundaries when we have enough data
                    if buffer.len() >= WINDOW_SIZE && buffer.len() - chunk_start >= self.config.min_size {
                        // Get window data for PRF
                        let window_start = buffer.len().saturating_sub(WINDOW_SIZE);
                        let window_data = &buffer[window_start..];

                        // Use PRF to generate pseudorandom chunking decision
                        let prf_value = self.prf(counter, window_data);
                        counter += 1;

                        // Check for chunk boundary
                        let should_split = if buffer.len() - chunk_start >= self.config.max_size {
                            // Hit max size - always split
                            true
                        } else if buffer.len() - chunk_start >= self.config.min_size {
                            // Use PRF value for boundary decision
                            // Split if PRF value mod avg_size == 0 (same pattern as FastCDC)
                            (prf_value % self.config.avg_size as u64) == 0
                        } else {
                            false
                        };

                        if should_split {
                            // Extract chunk data
                            let chunk_size = buffer.len() - chunk_start;
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
}

impl KeyedFastCDCChunker {
    /// Generate a random key for chunking
    pub fn generate_key() -> Vec<u8> {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        (0..32).map(|_| rng.gen()).collect()
    }
}

#[async_trait]
impl Chunker for KeyedFastCDCChunker {
    async fn chunk<R: AsyncRead + Unpin + Send>(&self, reader: R) -> Result<Vec<Chunk>>
    where
        R: tokio::io::AsyncReadExt,
    {
        // Use streaming chunking for memory efficiency
        self.chunk_streaming(reader).await
    }

    fn name(&self) -> &'static str {
        "keyed-fastcdc"
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
    async fn test_keyed_fastcdc_chunker() {
        let key = KeyedFastCDCChunker::generate_key();
        let data = vec![0u8; 1024 * 1024]; // 1 MB
        let reader = Cursor::new(data);

        let chunker = KeyedFastCDCChunker::new(key);
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        for chunk in &chunks {
            assert!(chunk.verify());
        }
    }

    #[tokio::test]
    async fn test_keyed_fastcdc_small_file() {
        let key = KeyedFastCDCChunker::generate_key();
        let data = b"Hello, world! This is a test file.";
        let reader = Cursor::new(data);

        let chunker = KeyedFastCDCChunker::new(key);
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        let total_size: usize = chunks.iter().map(|c| c.data().len()).sum();
        assert_eq!(total_size, data.len());
    }

    #[tokio::test]
    async fn test_different_keys_produce_different_chunks() {
        let data: Vec<u8> = (0..(512 * 1024))
            .map(|i| (i as u8).wrapping_mul(31).wrapping_add(7))
            .collect();

        let key1 = KeyedFastCDCChunker::generate_key();
        let chunker1 = KeyedFastCDCChunker::new(key1);
        let chunks1 = chunker1.chunk(Cursor::new(data.clone())).await.unwrap();

        let total1: usize = chunks1.iter().map(|c| c.data().len()).sum();
        assert_eq!(total1, data.len());

        let sizes1: Vec<usize> = chunks1.iter().map(|c| c.data().len()).collect();

        // Different keys should (in practice) produce different boundary decisions.
        // To avoid flakes if a particular key collides, retry a few times.
        let mut saw_different_boundaries = false;
        for _ in 0..8 {
            let key2 = KeyedFastCDCChunker::generate_key();
            let chunker2 = KeyedFastCDCChunker::new(key2);
            let chunks2 = chunker2.chunk(Cursor::new(data.clone())).await.unwrap();

            let total2: usize = chunks2.iter().map(|c| c.data().len()).sum();
            assert_eq!(total2, data.len());

            let sizes2: Vec<usize> = chunks2.iter().map(|c| c.data().len()).collect();
            if sizes2 != sizes1 {
                saw_different_boundaries = true;
                break;
            }
        }

        assert!(
            saw_different_boundaries,
            "expected different keys to produce different chunk boundaries"
        );
    }

    #[tokio::test]
    async fn test_same_key_produces_consistent_chunks() {
        let data = vec![0u8; 512 * 1024]; // 512 KB
        let key = KeyedFastCDCChunker::generate_key();

        let reader1 = Cursor::new(data.clone());
        let reader2 = Cursor::new(data);

        let chunker1 = KeyedFastCDCChunker::new(key.clone());
        let chunker2 = KeyedFastCDCChunker::new(key);

        let chunks1 = chunker1.chunk(reader1).await.unwrap();
        let chunks2 = chunker2.chunk(reader2).await.unwrap();

        // Same key should produce identical chunking
        assert_eq!(chunks1.len(), chunks2.len());
        for (c1, c2) in chunks1.iter().zip(chunks2.iter()) {
            assert_eq!(c1.data(), c2.data());
        }
    }

    #[tokio::test]
    async fn test_key_generation() {
        let key1 = KeyedFastCDCChunker::generate_key();
        let key2 = KeyedFastCDCChunker::generate_key();

        assert_eq!(key1.len(), 32); // 256-bit key
        assert_eq!(key2.len(), 32);
        assert_ne!(key1, key2); // Keys should be different
    }
}


