//! Content-defined chunking for Dits.
//!
//! This crate provides chunking algorithms optimized for different file types:
//!
//! - **FastCDC**: General-purpose content-defined chunking
//! - **VideoAware**: Keyframe-aligned chunking for video files
//! - **Fixed**: Fixed-size chunking (fallback)

pub mod adaptive;
pub mod ae;
pub mod chonkers;
pub mod fastcdc;
pub mod fixed;
pub mod gear_table;
pub mod hash;
pub mod keyed_fastcdc;
pub mod parallel_fastcdc;
pub mod rabin;
pub mod video;

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::{Chunk, ChunkHash, Result};

/// Trait for chunking algorithms.
#[async_trait]
pub trait Chunker: Send + Sync {
    /// Chunk data from a reader.
    async fn chunk<R: tokio::io::AsyncRead + Unpin + Send>(
        &self,
        reader: R,
    ) -> Result<Vec<Chunk>>;

    /// Get the name of this chunker.
    fn name(&self) -> &'static str;

    /// Get recommended minimum chunk size.
    fn min_size(&self) -> usize;

    /// Get recommended maximum chunk size.
    fn max_size(&self) -> usize;

    /// Get target average chunk size.
    fn avg_size(&self) -> usize;
}

/// Configuration for chunking.
#[derive(Clone, Debug)]
pub struct ChunkerConfig {
    /// Minimum chunk size in bytes.
    pub min_size: usize,
    /// Maximum chunk size in bytes.
    pub max_size: usize,
    /// Target average chunk size in bytes.
    pub avg_size: usize,
    /// Enable compression.
    pub compress: bool,
    /// Compression level (1-22 for zstd).
    pub compression_level: i32,
}

impl Default for ChunkerConfig {
    fn default() -> Self {
        Self {
            min_size: 256 * 1024,      // 256 KB
            max_size: 4 * 1024 * 1024,  // 4 MB
            avg_size: 1024 * 1024,      // 1 MB
            compress: true,
            compression_level: 3,
        }
    }
}

/// Video-specific chunking configuration.
#[derive(Clone, Debug)]
pub struct VideoChunkerConfig {
    /// Base chunker config.
    pub base: ChunkerConfig,
    /// Align chunks to keyframes.
    pub keyframe_align: bool,
    /// Maximum GOP size to consider.
    pub max_gop_size: usize,
}

impl Default for VideoChunkerConfig {
    fn default() -> Self {
        Self {
            base: ChunkerConfig {
                min_size: 2 * 1024 * 1024,  // 2 MB
                max_size: 16 * 1024 * 1024, // 16 MB
                avg_size: 8 * 1024 * 1024,  // 8 MB
                compress: false, // Video is already compressed
                compression_level: 0,
            },
            keyframe_align: true,
            max_gop_size: 250,
        }
    }
}
