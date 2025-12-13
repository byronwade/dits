//! Video-aware chunking with keyframe alignment.

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::{Chunk, Result};
use tokio::io::AsyncRead;

use crate::{Chunker, VideoChunkerConfig};

/// Video-aware chunker that aligns chunks to keyframes.
pub struct VideoChunker {
    config: VideoChunkerConfig,
}

impl VideoChunker {
    /// Create a new video chunker with default config.
    pub fn new() -> Self {
        Self {
            config: VideoChunkerConfig::default(),
        }
    }

    /// Create a new video chunker with custom config.
    pub fn with_config(config: VideoChunkerConfig) -> Self {
        Self { config }
    }

    /// Find keyframe positions in video data.
    fn find_keyframes(&self, data: &[u8]) -> Vec<usize> {
        let mut keyframes = vec![0]; // Always start at 0

        // Simple keyframe detection for H.264/H.265
        // In production, this would use proper demuxing
        let mut i = 0;
        while i < data.len().saturating_sub(4) {
            // Look for NAL unit start codes
            if data[i..i + 4] == [0x00, 0x00, 0x00, 0x01]
                || data[i..i + 3] == [0x00, 0x00, 0x01]
            {
                let start_code_len = if data[i..i + 4] == [0x00, 0x00, 0x00, 0x01] {
                    4
                } else {
                    3
                };

                if i + start_code_len < data.len() {
                    let nal_type = data[i + start_code_len] & 0x1F;
                    // IDR frame (keyframe) for H.264
                    if nal_type == 5 {
                        keyframes.push(i);
                    }
                }
            }
            i += 1;
        }

        keyframes
    }
}

impl Default for VideoChunker {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Chunker for VideoChunker {
    async fn chunk<R: AsyncRead + Unpin + Send>(&self, mut reader: R) -> Result<Vec<Chunk>> {
        use tokio::io::AsyncReadExt;

        // Read all data
        let mut data = Vec::new();
        reader.read_to_end(&mut data).await?;

        if !self.config.keyframe_align {
            // Fall back to FastCDC if keyframe alignment disabled
            let fastcdc = crate::fastcdc::FastCDCChunker::with_config(self.config.base.clone());
            return fastcdc.chunk(std::io::Cursor::new(data)).await;
        }

        // Find keyframe boundaries
        let keyframes = self.find_keyframes(&data);

        let mut chunks = Vec::new();
        let mut current_pos = 0;

        for &keyframe_pos in keyframes.iter().skip(1) {
            let chunk_size = keyframe_pos - current_pos;

            // Check if chunk is within size bounds
            if chunk_size >= self.config.base.min_size && chunk_size <= self.config.base.max_size {
                let bytes = Bytes::copy_from_slice(&data[current_pos..keyframe_pos]);
                chunks.push(Chunk::from_data(bytes));
                current_pos = keyframe_pos;
            } else if chunk_size > self.config.base.max_size {
                // Chunk too large, split it
                while current_pos < keyframe_pos {
                    let end = (current_pos + self.config.base.avg_size).min(keyframe_pos);
                    let bytes = Bytes::copy_from_slice(&data[current_pos..end]);
                    chunks.push(Chunk::from_data(bytes));
                    current_pos = end;
                }
            }
            // If chunk too small, continue accumulating
        }

        // Handle remaining data
        if current_pos < data.len() {
            let bytes = Bytes::copy_from_slice(&data[current_pos..]);
            chunks.push(Chunk::from_data(bytes));
        }

        Ok(chunks)
    }

    fn name(&self) -> &'static str {
        "video-aware"
    }

    fn min_size(&self) -> usize {
        self.config.base.min_size
    }

    fn max_size(&self) -> usize {
        self.config.base.max_size
    }

    fn avg_size(&self) -> usize {
        self.config.base.avg_size
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[tokio::test]
    async fn test_video_chunker() {
        // Create mock video data with fake keyframes
        let mut data = vec![0u8; 10 * 1024 * 1024]; // 10 MB
        // Insert fake NAL start codes
        data[0..4].copy_from_slice(&[0x00, 0x00, 0x00, 0x01]);
        data[4] = 0x05; // IDR frame

        let reader = Cursor::new(data);
        let chunker = VideoChunker::new();
        let chunks = chunker.chunk(reader).await.unwrap();

        assert!(!chunks.is_empty());
        for chunk in &chunks {
            assert!(chunk.verify());
        }
    }
}
