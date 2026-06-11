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

// The Universal Layer (chunking + hashing) lives in the shared `dits-core`
// crate so the exact same engine compiles to the CLI and to wasm for the web
// Playground. Re-exported as `core::hash` / `core::chunk` so the rest of the
// CLI keeps its existing import paths unchanged.
pub use dits_core::{chunk, hash};

mod commit;
mod filetype;
mod ignore;
mod index;
mod manifest;
mod storage_strategy;

// Storage Strategy Layer (Phase 3.6)
#[allow(unused_imports)]
pub use chunk::{
    chunk_data, chunk_data_parallel, chunk_data_with_refs, chunk_data_with_refs_parallel, Chunk,
    ChunkRef, ChunkerConfig,
};
pub use commit::{Author, Commit};
// Smart Layer exports
#[allow(unused_imports)]
pub use filetype::{FileCategory, FileHandling};
// Universal Layer exports
pub use hash::{Hash, Hasher};
pub use ignore::IgnoreMatcher;
pub use index::{FileStatus, FileType, Index, IndexEntry, Mp4Metadata, StoredAtom};
pub use manifest::{FileMode, Manifest, ManifestEntry};
pub use storage_strategy::{FileClassifier, StorageStrategy};
