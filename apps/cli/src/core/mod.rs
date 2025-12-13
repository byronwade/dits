//! Core types and algorithms for Dits.
//!
//! This module implements the Hybrid Architecture (Phase 3.6):
//!
//! ## Layer 0: Storage Strategy Selection
//! - Routes text files to libgit2, binary files to Dits CDC
//! - See `storage_strategy` module
//!
//! ## Layer 1: Universal Layer
//! - FastCDC chunking (content-defined, boundary-stable)
//! - BLAKE3 hashing (32-byte content addresses)
//! - Manifest system (version recipes, not raw bytes)
//!
//! ## Layer 2: Smart Layer
//! - File-type awareness in the `filetype` module

mod hash;
mod chunk;
mod filetype;
mod manifest;
mod commit;
mod index;
mod ignore;
mod storage_strategy;

// Storage Strategy Layer (Phase 3.6)
pub use storage_strategy::{StorageStrategy, FileClassifier};

// Universal Layer exports
pub use hash::{Hash, Hasher};
pub use chunk::{Chunk, ChunkRef, ChunkerConfig, chunk_data, chunk_data_with_refs, chunk_data_parallel, chunk_data_with_refs_parallel};
pub use manifest::{Manifest, ManifestEntry};
pub use commit::{Commit, Author};
pub use index::{Index, IndexEntry, FileStatus, Mp4Metadata, StoredAtom};
pub use ignore::IgnoreMatcher;

// Smart Layer exports
pub use filetype::{FileCategory, FileHandling};
