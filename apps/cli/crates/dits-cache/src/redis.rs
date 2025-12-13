//! Redis cache implementation for Dits.
//!
//! Provides Redis-based caching for distributed deployments.

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::Result;
use redis::{AsyncCommands, Client};
use std::time::Duration;

/// Redis cache implementation.
pub struct RedisCache {
    client: Client,
}

impl RedisCache {
    /// Create a new Redis cache with the given URL.
    pub fn new(url: &str) -> Result<Self> {
        let client = Client::open(url)
            .map_err(|e| dits_core::Error::Internal(format!("Failed to connect to Redis: {}", e)))?;
        Ok(Self { client })
    }

    /// Get a Redis connection.
    async fn get_connection(&self) -> Result<redis::aio::MultiplexedConnection> {
        self.client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| dits_core::Error::Internal(format!("Redis connection error: {}", e)))
    }
}

#[async_trait]
impl super::Cache for RedisCache {
    async fn get(&self, key: &str) -> Result<Option<Bytes>> {
        let mut conn = self.get_connection().await?;
        let result: Option<Vec<u8>> = conn.get(key).await
            .map_err(|e| dits_core::Error::Internal(format!("Redis get error: {}", e)))?;
        Ok(result.map(Bytes::from))
    }

    async fn set(&self, key: &str, value: Bytes, ttl: Option<Duration>) -> Result<()> {
        let mut conn = self.get_connection().await?;
        match ttl {
            Some(duration) => {
                conn.set_ex::<_, _, ()>(key, value.as_ref(), duration.as_secs()).await
            }
            None => {
                conn.set::<_, _, ()>(key, value.as_ref()).await
            }
        }
        .map_err(|e| dits_core::Error::Internal(format!("Redis set error: {}", e)))?;
        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<()> {
        let mut conn = self.get_connection().await?;
        conn.del::<_, ()>(key).await
            .map_err(|e| dits_core::Error::Internal(format!("Redis delete error: {}", e)))?;
        Ok(())
    }

    async fn exists(&self, key: &str) -> Result<bool> {
        let mut conn = self.get_connection().await?;
        let result: i32 = conn.exists(key).await
            .map_err(|e| dits_core::Error::Internal(format!("Redis exists error: {}", e)))?;
        Ok(result == 1)
    }

    async fn clear(&self) -> Result<()> {
        let mut conn = self.get_connection().await?;
        redis::cmd("FLUSHDB").query_async::<_, ()>(&mut conn).await
            .map_err(|e| dits_core::Error::Internal(format!("Redis flush error: {}", e)))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Cache;
    use std::env;

    #[tokio::test]
    #[ignore = "Requires Redis server to be running"]
    async fn test_redis_cache_operations() {
        // Skip test if Redis is not available
        if env::var("SKIP_REDIS_TESTS").is_ok() {
            return;
        }

        // Try to create Redis connection
        let cache_result = RedisCache::new("redis://localhost:6379");
        if cache_result.is_err() {
            // Redis not available, skip test
            eprintln!("Skipping Redis test - Redis server not available");
            return;
        }

        let cache = cache_result.unwrap();

        let key = "test_key";
        let value = Bytes::from("test_value");

        // Test set and get
        cache.set(key, value.clone(), None).await.unwrap();
        let retrieved = cache.get(key).await.unwrap();
        assert_eq!(retrieved, Some(value));

        // Test exists
        assert!(cache.exists(key).await.unwrap());

        // Test delete
        cache.delete(key).await.unwrap();
        assert!(!cache.exists(key).await.unwrap());
    }
}
