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
}

impl Default for FastCDCChunker {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Chunker for FastCDCChunker {
    async fn chunk<R: AsyncRead + Unpin + Send>(&self, mut reader: R) -> Result<Vec<Chunk>> {
        use tokio::io::AsyncReadExt;

        // Read all data (in production, this would be streamed)
        let mut data = Vec::new();
        reader.read_to_end(&mut data).await?;

        // Use fastcdc crate for chunking
        let chunker = fastcdc::v2020::FastCDC::new(
            &data,
            self.config.min_size as u32,
            self.config.avg_size as u32,
            self.config.max_size as u32,
        );

        let mut chunks = Vec::new();
        for chunk_data in chunker {
            let bytes = Bytes::copy_from_slice(&data[chunk_data.offset..chunk_data.offset + chunk_data.length]);
            chunks.push(Chunk::from_data(bytes));
        }

        Ok(chunks)
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
}
