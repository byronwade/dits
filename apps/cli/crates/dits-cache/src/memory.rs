//! In-memory cache using DashMap.

use async_trait::async_trait;
use bytes::Bytes;
use dashmap::DashMap;
use dits_core::Result;
use std::time::{Duration, Instant};

use crate::Cache;

/// In-memory cache entry.
struct CacheEntry {
    value: Bytes,
    expires_at: Option<Instant>,
}

/// In-memory LRU cache.
pub struct MemoryCache {
    data: DashMap<String, CacheEntry>,
    max_size: usize,
}

impl MemoryCache {
    /// Create a new memory cache.
    pub fn new(max_size: usize) -> Self {
        Self {
            data: DashMap::new(),
            max_size,
        }
    }
}

#[async_trait]
impl Cache for MemoryCache {
    async fn get(&self, key: &str) -> Result<Option<Bytes>> {
        if let Some(entry) = self.data.get(key) {
            if let Some(expires_at) = entry.expires_at {
                if Instant::now() > expires_at {
                    drop(entry);
                    self.data.remove(key);
                    return Ok(None);
                }
            }
            Ok(Some(entry.value.clone()))
        } else {
            Ok(None)
        }
    }

    async fn set(&self, key: &str, value: Bytes, ttl: Option<Duration>) -> Result<()> {
        let expires_at = ttl.map(|d| Instant::now() + d);
        self.data.insert(
            key.to_string(),
            CacheEntry { value, expires_at },
        );
        // TODO: Implement LRU eviction when max_size exceeded
        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<()> {
        self.data.remove(key);
        Ok(())
    }

    async fn exists(&self, key: &str) -> Result<bool> {
        Ok(self.get(key).await?.is_some())
    }

    async fn clear(&self) -> Result<()> {
        self.data.clear();
        Ok(())
    }
}
