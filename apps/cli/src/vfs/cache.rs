//! Chunk caching layer with multi-tier storage.
//!
//! This implements a three-tier caching strategy:
//! - L1: In-memory cache (moka) - fastest, limited by RAM
//! - L2: Local disk cache (.dits/cache) - fast, limited by SSD
//! - L3: Object store / remote - slower, unlimited
//!
//! Reads check each tier in order. Cache misses trigger fetches
//! from the next tier and populate the faster tiers.

use crate::core::Hash;
use crate::store::ObjectStore;
use moka::future::Cache;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::fs;
use tokio::sync::RwLock;

/// Configuration for the chunk cache.
#[derive(Clone, Debug)]
pub struct CacheConfig {
    /// Maximum L1 (RAM) cache size in bytes.
    pub l1_max_bytes: u64,
    /// Maximum L2 (disk) cache size in bytes.
    pub l2_max_bytes: u64,
    /// Path to L2 disk cache directory.
    pub l2_path: PathBuf,
    /// Whether to enable read-ahead prefetching.
    pub prefetch_enabled: bool,
    /// Number of chunks to prefetch ahead.
    pub prefetch_count: usize,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            l1_max_bytes: 256 * 1024 * 1024,  // 256 MB RAM cache
            l2_max_bytes: 4 * 1024 * 1024 * 1024, // 4 GB disk cache
            l2_path: PathBuf::from(".dits/cache"),
            prefetch_enabled: true,
            prefetch_count: 4,
        }
    }
}

impl CacheConfig {
    /// Create config for a small device (limited RAM/storage).
    pub fn small() -> Self {
        Self {
            l1_max_bytes: 64 * 1024 * 1024,   // 64 MB
            l2_max_bytes: 512 * 1024 * 1024,  // 512 MB
            ..Default::default()
        }
    }

    /// Create config for a workstation (lots of RAM/storage).
    pub fn large() -> Self {
        Self {
            l1_max_bytes: 1024 * 1024 * 1024,     // 1 GB
            l2_max_bytes: 32 * 1024 * 1024 * 1024, // 32 GB
            ..Default::default()
        }
    }
}

/// Multi-tier chunk cache.
pub struct ChunkCache {
    /// Configuration.
    config: CacheConfig,
    /// L1 in-memory cache.
    l1: Cache<Hash, Arc<Vec<u8>>>,
    /// Path to L2 disk cache.
    l2_path: PathBuf,
    /// Object store for L3 (local chunks).
    object_store: Arc<ObjectStore>,
    /// Statistics.
    stats: Arc<RwLock<CacheStats>>,
    /// L2 cache current size in bytes.
    l2_size: Arc<RwLock<u64>>,
}

/// Cache statistics.
#[derive(Clone, Debug, Default)]
pub struct CacheStats {
    /// L1 cache hits.
    pub l1_hits: u64,
    /// L2 cache hits.
    pub l2_hits: u64,
    /// L3 (object store) hits.
    pub l3_hits: u64,
    /// Total cache misses (chunk not found anywhere).
    pub misses: u64,
    /// Total bytes read from cache.
    pub bytes_read: u64,
    /// Total bytes fetched from object store.
    pub bytes_fetched: u64,
}

impl CacheStats {
    /// Calculate L1 hit rate.
    pub fn l1_hit_rate(&self) -> f64 {
        let total = self.l1_hits + self.l2_hits + self.l3_hits + self.misses;
        if total == 0 {
            0.0
        } else {
            self.l1_hits as f64 / total as f64
        }
    }

    /// Calculate overall hit rate (any tier).
    pub fn overall_hit_rate(&self) -> f64 {
        let total = self.l1_hits + self.l2_hits + self.l3_hits + self.misses;
        if total == 0 {
            0.0
        } else {
            (self.l1_hits + self.l2_hits + self.l3_hits) as f64 / total as f64
        }
    }
}

impl ChunkCache {
    /// Create a new chunk cache.
    pub fn new(config: CacheConfig, object_store: Arc<ObjectStore>) -> Self {
        // Calculate L1 capacity based on average chunk size (~64KB)
        let avg_chunk_size = 64 * 1024;
        let l1_capacity = (config.l1_max_bytes / avg_chunk_size) as u64;

        let l1 = Cache::builder()
            .max_capacity(l1_capacity)
            .weigher(|_key: &Hash, value: &Arc<Vec<u8>>| -> u32 {
                // Weight by actual size
                value.len().try_into().unwrap_or(u32::MAX)
            })
            .build();

        Self {
            l2_path: config.l2_path.clone(),
            config,
            l1,
            object_store,
            stats: Arc::new(RwLock::new(CacheStats::default())),
            l2_size: Arc::new(RwLock::new(0)),
        }
    }

    /// Initialize the cache (create directories).
    pub async fn init(&self) -> std::io::Result<()> {
        fs::create_dir_all(&self.l2_path).await?;
        Ok(())
    }

    /// Get a chunk by hash, checking all cache tiers.
    pub async fn get(&self, hash: &Hash) -> Option<Arc<Vec<u8>>> {
        // L1: RAM cache
        if let Some(data) = self.l1.get(hash).await {
            let mut stats = self.stats.write().await;
            stats.l1_hits += 1;
            stats.bytes_read += data.len() as u64;
            return Some(data);
        }

        // L2: Disk cache
        if let Some(data) = self.get_l2(hash).await {
            let data = Arc::new(data);
            // Promote to L1
            self.l1.insert(*hash, data.clone()).await;
            let mut stats = self.stats.write().await;
            stats.l2_hits += 1;
            stats.bytes_read += data.len() as u64;
            return Some(data);
        }

        // L3: Object store
        match self.object_store.load_chunk(hash) {
            Ok(chunk) => {
                let data = Arc::new(chunk.data);
                // Populate L1 and L2
                self.l1.insert(*hash, data.clone()).await;
                let _ = self.put_l2(hash, &data).await;
                let mut stats = self.stats.write().await;
                stats.l3_hits += 1;
                stats.bytes_read += data.len() as u64;
                stats.bytes_fetched += data.len() as u64;
                return Some(data);
            }
            Err(e) => {
                eprintln!("L3 miss for {}: {:?}", hash.to_hex(), e);
            }
        }

        // Not found anywhere
        let mut stats = self.stats.write().await;
        stats.misses += 1;
        None
    }

    /// Get chunk from L2 disk cache.
    async fn get_l2(&self, hash: &Hash) -> Option<Vec<u8>> {
        let path = self.l2_chunk_path(hash);
        fs::read(&path).await.ok()
    }

    /// Put chunk into L2 disk cache with size limiting.
    async fn put_l2(&self, hash: &Hash, data: &[u8]) -> std::io::Result<()> {
        let path = self.l2_chunk_path(hash);

        // Check if we have room in L2 cache
        let data_size = data.len() as u64;
        {
            let current_size = *self.l2_size.read().await;
            if current_size + data_size > self.config.l2_max_bytes {
                // L2 cache is full, skip caching (LRU eviction would be more complex)
                // In production, we'd implement proper eviction based on access time
                return Ok(());
            }
        }

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).await?;
        }
        fs::write(&path, data).await?;

        // Update size tracking
        *self.l2_size.write().await += data_size;
        Ok(())
    }

    /// Get the L2 cache path for a chunk.
    fn l2_chunk_path(&self, hash: &Hash) -> PathBuf {
        let hex = hash.to_hex();
        self.l2_path.join(&hex[..2]).join(&hex[2..])
    }

    /// Prefetch chunks (for read-ahead optimization).
    pub async fn prefetch(&self, hashes: &[Hash]) {
        if !self.config.prefetch_enabled {
            return;
        }

        for hash in hashes.iter().take(self.config.prefetch_count) {
            // Check if already in L1
            if self.l1.contains_key(hash) {
                continue;
            }

            // Fetch in background (don't wait)
            let cache = self.clone_for_prefetch();
            let hash = *hash;
            tokio::spawn(async move {
                let _ = cache.get(&hash).await;
            });
        }
    }

    /// Clone self for use in prefetch tasks.
    fn clone_for_prefetch(&self) -> Self {
        Self {
            config: self.config.clone(),
            l1: self.l1.clone(),
            l2_path: self.l2_path.clone(),
            object_store: self.object_store.clone(),
            stats: self.stats.clone(),
            l2_size: self.l2_size.clone(),
        }
    }

    /// Get cache statistics.
    pub async fn stats(&self) -> CacheStats {
        self.stats.read().await.clone()
    }

    /// Clear all caches.
    pub async fn clear(&self) -> std::io::Result<()> {
        self.l1.invalidate_all();
        if self.l2_path.exists() {
            fs::remove_dir_all(&self.l2_path).await?;
            fs::create_dir_all(&self.l2_path).await?;
        }
        *self.stats.write().await = CacheStats::default();
        Ok(())
    }

    /// Get L1 cache entry count.
    pub fn l1_entry_count(&self) -> u64 {
        self.l1.entry_count()
    }

    /// Get estimated L1 cache size in bytes.
    pub fn l1_weighted_size(&self) -> u64 {
        self.l1.weighted_size()
    }
}

/// Synchronous wrapper for use in FUSE handlers.
pub struct SyncChunkCache {
    inner: ChunkCache,
    runtime: tokio::runtime::Runtime,
}

impl SyncChunkCache {
    /// Create a new synchronous cache wrapper.
    pub fn new(config: CacheConfig, object_store: Arc<ObjectStore>) -> std::io::Result<Self> {
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .worker_threads(2)
            .enable_all()
            .build()?;

        let inner = ChunkCache::new(config, object_store);

        // Initialize cache directories
        runtime.block_on(inner.init())?;

        Ok(Self { inner, runtime })
    }

    /// Get a chunk synchronously.
    pub fn get(&self, hash: &Hash) -> Option<Arc<Vec<u8>>> {
        self.runtime.block_on(self.inner.get(hash))
    }

    /// Prefetch chunks synchronously.
    pub fn prefetch(&self, hashes: &[Hash]) {
        self.runtime.block_on(self.inner.prefetch(hashes))
    }

    /// Get statistics.
    pub fn stats(&self) -> CacheStats {
        self.runtime.block_on(self.inner.stats())
    }

    /// Clear cache.
    pub fn clear(&self) -> std::io::Result<()> {
        self.runtime.block_on(self.inner.clear())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Chunk;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_cache_basic() {
        let temp = tempdir().unwrap();
        let store = Arc::new(ObjectStore::new(temp.path()));
        store.init().unwrap();

        // Store a chunk
        let data = b"test chunk data".to_vec();
        let chunk = Chunk::new(data.clone());
        store.store_chunk(&chunk).unwrap();

        // Create cache
        let config = CacheConfig {
            l2_path: temp.path().join("cache"),
            ..Default::default()
        };
        let cache = ChunkCache::new(config, store);
        cache.init().await.unwrap();

        // Get from cache (should hit L3, then populate L1/L2)
        let result = cache.get(&chunk.hash).await.unwrap();
        assert_eq!(&*result, &data);

        // Get again (should hit L1)
        let result = cache.get(&chunk.hash).await.unwrap();
        assert_eq!(&*result, &data);

        // Check stats
        let stats = cache.stats().await;
        assert_eq!(stats.l3_hits, 1);
        assert_eq!(stats.l1_hits, 1);
    }

    #[tokio::test]
    async fn test_cache_miss() {
        let temp = tempdir().unwrap();
        let store = Arc::new(ObjectStore::new(temp.path()));
        store.init().unwrap();

        let config = CacheConfig {
            l2_path: temp.path().join("cache"),
            ..Default::default()
        };
        let cache = ChunkCache::new(config, store);
        cache.init().await.unwrap();

        // Try to get non-existent chunk
        let result = cache.get(&Hash::ZERO).await;
        assert!(result.is_none());

        let stats = cache.stats().await;
        assert_eq!(stats.misses, 1);
    }
}
