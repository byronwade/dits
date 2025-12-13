//! Caching layer for Dits.
//!
//! Provides multi-tier caching:
//! - L1: In-memory (DashMap)
//! - L2: Redis
//! - L3: Disk cache

pub mod memory;
pub mod redis;

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::Result;
use std::time::Duration;

/// Cache trait for different cache implementations.
#[async_trait]
pub trait Cache: Send + Sync {
    /// Get a value from cache.
    async fn get(&self, key: &str) -> Result<Option<Bytes>>;

    /// Set a value in cache.
    async fn set(&self, key: &str, value: Bytes, ttl: Option<Duration>) -> Result<()>;

    /// Delete a value from cache.
    async fn delete(&self, key: &str) -> Result<()>;

    /// Check if a key exists.
    async fn exists(&self, key: &str) -> Result<bool>;

    /// Clear all cache entries.
    async fn clear(&self) -> Result<()>;
}

/// Multi-tier cache configuration.
pub struct CacheConfig {
    /// Enable L1 memory cache.
    pub memory_enabled: bool,
    /// Memory cache max size in bytes.
    pub memory_max_size: usize,
    /// Enable L2 Redis cache.
    pub redis_enabled: bool,
    /// Redis URL.
    pub redis_url: String,
    /// Enable L3 disk cache.
    pub disk_enabled: bool,
    /// Disk cache path.
    pub disk_path: String,
    /// Disk cache max size in bytes.
    pub disk_max_size: u64,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            memory_enabled: true,
            memory_max_size: 1024 * 1024 * 1024, // 1 GB
            redis_enabled: true,
            redis_url: "redis://localhost:6379".to_string(),
            disk_enabled: true,
            disk_path: "/var/cache/dits".to_string(),
            disk_max_size: 100 * 1024 * 1024 * 1024, // 100 GB
        }
    }
}
