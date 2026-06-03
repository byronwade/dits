//! # dits-core
//!
//! Core types, traits, and abstractions for the Dits version control system.
//!
//! This crate provides the foundational building blocks used across all Dits components:
//!
//! - **Types**: Repository, Commit, Chunk, Branch, Lock, and other domain objects
//! - **Traits**: Storage backends, chunking algorithms, hash functions
//! - **Errors**: Unified error types for the entire system
//!
//! ## Example
//!
//! ```rust
//! use dits_core::{ChunkHash, Chunk, Repository};
//!
//! // Create a chunk from data
//! let chunk = Chunk::from_data("Hello, Dits!".as_bytes());
//! println!("Chunk hash: {}", chunk.hash());
//! ```

pub mod chunk;
pub mod commit;
pub mod config;
pub mod error;
pub mod hash;
pub mod hybrid;
pub mod lock;
pub mod repository;
pub mod types;
pub mod user;

// Re-exports
pub use chunk::{Chunk, ChunkHash, ChunkMeta};
pub use commit::{Commit, CommitHash};
pub use config::Config;
pub use error::{Error, Result};
pub use hash::{Hash, Hasher};
pub use hybrid::{FileClassifier, GitStorage, HybridManifest, HybridManifestEntry, HybridStorage, StorageStrategy};
pub use lock::{Lock, LockInfo};
pub use repository::{Branch, Repository, RepositoryInfo, Tag};
pub use types::*;
pub use user::{Author, User};
