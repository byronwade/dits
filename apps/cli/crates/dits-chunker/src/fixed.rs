//! Fixed-size chunking.

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::{Chunk, Result};
use tokio::io::AsyncRead;

use crate::Chunker;

/// Fixed-size chunker implementation.
pub struct FixedChunker {
    chunk_size: usize,
}

impl FixedChunker {
    /// Create a new fixed-size chunker.
    pub fn new(chunk_size: usize) -> Self {
        Self { chunk_size }
    }
}

impl Default for FixedChunker {
    fn default() -> Self {
        Self::new(1024 * 1024) // 1 MB default
    }
}

#[async_trait]
impl Chunker for FixedChunker {
    async fn chunk<R: AsyncRead + Unpin + Send>(&self, mut reader: R) -> Result<Vec<Chunk>>
    where
        R: tokio::io::AsyncReadExt,
    {
        use tokio::io::AsyncReadExt;

        let mut chunks = Vec::new();
        let mut buffer = vec![0u8; self.chunk_size];

        loop {
            let mut total_read = 0;
            while total_read < self.chunk_size {
                let n = reader.read(&mut buffer[total_read..]).await?;
                if n == 0 {
                    break;
                }
                total_read += n;
            }

            if total_read == 0 {
                break;
            }

            let bytes = Bytes::copy_from_slice(&buffer[..total_read]);
            chunks.push(Chunk::from_data(bytes));

            if total_read < self.chunk_size {
                break;
            }
        }

        Ok(chunks)
    }

    fn name(&self) -> &'static str {
        "fixed"
    }

    fn min_size(&self) -> usize {
        self.chunk_size
    }

    fn max_size(&self) -> usize {
        self.chunk_size
    }

    fn avg_size(&self) -> usize {
        self.chunk_size
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[tokio::test]
    async fn test_fixed_chunker() {
        let data = vec![0u8; 2500]; // 2500 bytes
        let reader = Cursor::new(data);

        let chunker = FixedChunker::new(1000);
        let chunks = chunker.chunk(reader).await.unwrap();

        assert_eq!(chunks.len(), 3); // 1000 + 1000 + 500
        assert_eq!(chunks[0].size(), 1000);
        assert_eq!(chunks[1].size(), 1000);
        assert_eq!(chunks[2].size(), 500);
    }
}
