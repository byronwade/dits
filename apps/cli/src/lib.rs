//! Dits - Version control for video and large binary files.
//!
//! This library provides the core functionality for the Dits version control system,
//! which is optimized for large binary files like video, 3D assets, and game files.
//!
//! # Architecture
//!
//! Dits uses a hybrid approach combining:
//! - **Content-Defined Chunking (FastCDC)**: Splits files into variable-size chunks based on
//!   content patterns, enabling efficient deduplication even when files are modified.
//! - **File-Type Awareness**: Special handling for MP4/video files to preserve playability
//!   while still enabling chunk-level deduplication.
//!
//! # Modules
//!
//! - [`core`]: Core data structures (hashes, chunks, manifests, commits, indexes)
//! - [`store`]: Storage layer (object store, refs, repository)
//! - [`mp4`]: MP4 file parsing, deconstruction, and reconstruction
//! - [`segment`]: GOP-aligned video segmentation
//! - [`vfs`]: Virtual filesystem (FUSE) for on-demand file access

pub mod config;
pub mod core;
pub mod dependency;
pub mod lifecycle;
pub mod metadata;
pub mod mp4;
pub mod p2p;
pub mod project;
pub mod proxy;
pub mod security;
pub mod segment;
pub mod store;
pub mod util;
pub mod vfs;

// Re-export commonly used types at the crate root for convenience
pub use core::{
    chunk_data_with_refs, chunk_data_with_refs_parallel, chunk_data_parallel,
    Author, Chunk, ChunkRef, ChunkerConfig, Commit, FileStatus, Hash,
    Hasher, IgnoreMatcher, Index, IndexEntry, Manifest, ManifestEntry, Mp4Metadata,
};
pub use store::{Repository, AddResult, Status};
