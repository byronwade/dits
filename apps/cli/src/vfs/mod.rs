//! Virtual File System (VFS) layer for on-demand file hydration.
//!
//! This module implements the "Phantom Drive" concept from the Hybrid Architecture:
//! - Mount a repository as a virtual filesystem
//! - Files appear with full size but are fetched on-demand
//! - Chunks are cached locally for fast repeated access
//!
//! ## Architecture
//!
//! ```text
//! User Application (VLC, Premiere, etc.)
//!         │
//!         ▼
//! ┌─────────────────────┐
//! │   FUSE Mount Point  │  ← /mnt/dits or Z: drive
//! └─────────────────────┘
//!         │
//!         ▼
//! ┌─────────────────────┐
//! │     DitsFS          │  ← FUSE handler
//! │  ├── read()         │
//! │  ├── getattr()      │
//! │  └── readdir()      │
//! └─────────────────────┘
//!         │
//!         ▼
//! ┌─────────────────────┐
//! │   ChunkCache        │  ← L1: RAM, L2: Disk, L3: Remote
//! └─────────────────────┘
//!         │
//!         ▼
//! ┌─────────────────────┐
//! │   ObjectStore       │  ← Content-addressable chunks
//! └─────────────────────┘
//! ```

mod cache;
mod entry;

#[cfg(feature = "fuser")]
mod fuse;

pub use cache::{ChunkCache, CacheConfig};
pub use entry::{VfsEntry, VfsEntryType, VfsTree};

#[cfg(feature = "fuser")]
pub use fuse::{DitsFS, mount, unmount};

/// Errors from VFS operations.
#[derive(Debug, thiserror::Error)]
pub enum VfsError {
    #[error("Entry not found: {0}")]
    NotFound(String),

    #[error("Not a directory: {0}")]
    NotADirectory(String),

    #[error("Not a file: {0}")]
    NotAFile(String),

    #[error("Chunk not found: {0}")]
    ChunkNotFound(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Cache error: {0}")]
    Cache(String),

    #[error("Mount error: {0}")]
    Mount(String),
}
