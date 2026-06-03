//! Database layer for Dits.
//!
//! Provides PostgreSQL-based storage for:
//! - Repositories and metadata
//! - Users and organizations
//! - Commits and trees
//! - Chunk references
//! - Locks

pub mod models;
pub mod pool;

pub use pool::Pool;
