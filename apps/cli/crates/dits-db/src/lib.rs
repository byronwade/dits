//! Database layer for Dits.
//!
//! Provides PostgreSQL-based storage for:
//! - Repositories and metadata
//! - Users and organizations
//! - Commits and trees
//! - Chunk references
//! - Locks

pub mod migrations;
pub mod models;
pub mod queries;
pub mod pool;

pub use pool::Pool;
