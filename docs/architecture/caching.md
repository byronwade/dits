# Cache Architecture

Multi-tier caching system for optimal performance and bandwidth efficiency.

---

## Overview

Dits uses a multi-level cache hierarchy:

1. **L1 (Memory)**: Hot chunks in RAM for immediate access
2. **L2 (Disk)**: Larger capacity on local SSD
3. **L3 (Network)**: Remote object storage

```
┌─────────────────────────────────────────────────────────┐
│                     Application                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    L1 Cache (RAM)                       │
│                    ~1GB, ~10μs                          │
└─────────────────────────────────────────────────────────┘
                           │ miss
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   L2 Cache (SSD)                        │
│                   ~50GB, ~100μs                         │
└─────────────────────────────────────────────────────────┘
                           │ miss
                           ▼
┌─────────────────────────────────────────────────────────┐
│               L3 Remote (S3/Network)                    │
│                   Variable, 50-500ms                    │
└─────────────────────────────────────────────────────────┘
```

---

## L1 Cache (Memory)

### Design

- **Technology**: In-process memory cache (moka/hashbrown)
- **Capacity**: 512MB - 2GB (configurable)
- **Eviction**: LRU with frequency consideration (TinyLFU)
- **TTL**: None (evict on capacity only)
- **Scope**: Per-process

### Implementation

```rust
use moka::sync::Cache;

/// L1 memory cache for chunks
pub struct L1Cache {
    cache: Cache<ChunkHash, Arc<Vec<u8>>>,
    config: L1Config,
    metrics: L1Metrics,
}

#[derive(Clone)]
pub struct L1Config {
    /// Maximum cache size in bytes
    pub max_size: usize,

    /// Maximum number of entries
    pub max_entries: u64,

    /// Time-to-idle (evict if not accessed)
    pub time_to_idle: Option<Duration>,

    /// Enable admission policy
    pub admission_policy: bool,
}

impl Default for L1Config {
    fn default() -> Self {
        Self {
            max_size: 1024 * 1024 * 1024,  // 1GB
            max_entries: 20_000,
            time_to_idle: Some(Duration::from_secs(300)),  // 5 min
            admission_policy: true,
        }
    }
}

impl L1Cache {
    pub fn new(config: L1Config) -> Self {
        let cache = Cache::builder()
            .max_capacity(config.max_entries)
            .weigher(|_key: &ChunkHash, value: &Arc<Vec<u8>>| -> u32 {
                value.len().try_into().unwrap_or(u32::MAX)
            })
            .time_to_idle(config.time_to_idle.unwrap_or(Duration::MAX))
            .build();

        Self {
            cache,
            config,
            metrics: L1Metrics::new(),
        }
    }

    /// Get chunk from cache
    pub fn get(&self, hash: &ChunkHash) -> Option<Arc<Vec<u8>>> {
        let result = self.cache.get(hash);

        if result.is_some() {
            self.metrics.hits.fetch_add(1, Ordering::Relaxed);
        } else {
            self.metrics.misses.fetch_add(1, Ordering::Relaxed);
        }

        result
    }

    /// Insert chunk into cache
    pub fn insert(&self, hash: ChunkHash, data: Vec<u8>) {
        let size = data.len();

        // Admission policy: don't cache tiny chunks (overhead > benefit)
        if self.config.admission_policy && size < 1024 {
            return;
        }

        self.cache.insert(hash, Arc::new(data));
        self.metrics.inserts.fetch_add(1, Ordering::Relaxed);
        self.metrics.bytes.fetch_add(size, Ordering::Relaxed);
    }

    /// Invalidate chunk
    pub fn invalidate(&self, hash: &ChunkHash) {
        self.cache.invalidate(hash);
    }

    /// Get cache statistics
    pub fn stats(&self) -> CacheStats {
        let hits = self.metrics.hits.load(Ordering::Relaxed);
        let misses = self.metrics.misses.load(Ordering::Relaxed);
        let total = hits + misses;

        CacheStats {
            hits,
            misses,
            hit_rate: if total > 0 { hits as f64 / total as f64 } else { 0.0 },
            entries: self.cache.entry_count(),
            size_bytes: self.metrics.bytes.load(Ordering::Relaxed),
            evictions: self.cache.eviction_count(),
        }
    }
}

#[derive(Debug)]
pub struct L1Metrics {
    hits: AtomicU64,
    misses: AtomicU64,
    inserts: AtomicU64,
    bytes: AtomicUsize,
}
```

---

## L2 Cache (Disk)

### Design

- **Technology**: Local file system with directory sharding
- **Capacity**: 10GB - 100GB (configurable)
- **Eviction**: LRU based on atime or custom tracking
- **TTL**: Configurable (default 7 days)
- **Scope**: Per-machine (shared across processes)

### Implementation

```rust
use std::path::PathBuf;
use tokio::fs;

/// L2 disk cache for chunks
pub struct L2Cache {
    root: PathBuf,
    config: L2Config,
    index: RwLock<L2Index>,
    metrics: L2Metrics,
}

#[derive(Clone)]
pub struct L2Config {
    /// Cache root directory
    pub root: PathBuf,

    /// Maximum cache size in bytes
    pub max_size: u64,

    /// Maximum age before eviction
    pub max_age: Duration,

    /// Number of shards (directories)
    pub shards: u32,

    /// Enable compression
    pub compress: bool,
}

impl Default for L2Config {
    fn default() -> Self {
        Self {
            root: PathBuf::from(".dits/cache/l2"),
            max_size: 50 * 1024 * 1024 * 1024,  // 50GB
            max_age: Duration::from_secs(7 * 24 * 3600),  // 7 days
            shards: 256,
            compress: true,
        }
    }
}

/// In-memory index for L2 cache
struct L2Index {
    entries: HashMap<ChunkHash, L2Entry>,
    total_size: u64,
    lru: LinkedList<ChunkHash>,
}

struct L2Entry {
    path: PathBuf,
    size: u64,
    compressed_size: u64,
    accessed_at: Instant,
    lru_node: *mut LinkedListNode<ChunkHash>,
}

impl L2Cache {
    pub async fn new(config: L2Config) -> Result<Self> {
        // Create shard directories
        for shard in 0..config.shards {
            let shard_dir = config.root.join(format!("{:02x}", shard));
            fs::create_dir_all(&shard_dir).await?;
        }

        // Scan existing cache and build index
        let index = Self::scan_cache(&config).await?;

        Ok(Self {
            root: config.root.clone(),
            config,
            index: RwLock::new(index),
            metrics: L2Metrics::new(),
        })
    }

    /// Get chunk from disk cache
    pub async fn get(&self, hash: &ChunkHash) -> Option<Vec<u8>> {
        // Check index
        let path = {
            let mut index = self.index.write().await;
            let entry = index.entries.get_mut(hash)?;

            // Update LRU
            entry.accessed_at = Instant::now();
            index.move_to_front(hash);

            entry.path.clone()
        };

        // Read from disk
        match fs::read(&path).await {
            Ok(data) => {
                self.metrics.hits.fetch_add(1, Ordering::Relaxed);

                // Decompress if needed
                let data = if self.config.compress {
                    zstd::decode_all(&data[..]).unwrap_or(data)
                } else {
                    data
                };

                Some(data)
            }
            Err(_) => {
                // File missing, remove from index
                self.index.write().await.remove(hash);
                self.metrics.misses.fetch_add(1, Ordering::Relaxed);
                None
            }
        }
    }

    /// Insert chunk into disk cache
    pub async fn insert(&self, hash: ChunkHash, data: Vec<u8>) -> Result<()> {
        let size = data.len() as u64;

        // Compress if enabled
        let (write_data, compressed_size) = if self.config.compress {
            let compressed = zstd::encode_all(&data[..], 3)?;
            let csize = compressed.len() as u64;
            (compressed, csize)
        } else {
            (data, size)
        };

        // Calculate path
        let shard = hash[0] as u32 % self.config.shards;
        let path = self.root
            .join(format!("{:02x}", shard))
            .join(hex::encode(&hash));

        // Evict if needed
        self.ensure_space(compressed_size).await?;

        // Write to disk
        fs::write(&path, &write_data).await?;

        // Update index
        {
            let mut index = self.index.write().await;
            index.entries.insert(hash, L2Entry {
                path,
                size,
                compressed_size,
                accessed_at: Instant::now(),
                lru_node: std::ptr::null_mut(),
            });
            index.total_size += compressed_size;
            index.add_to_front(hash);
        }

        self.metrics.inserts.fetch_add(1, Ordering::Relaxed);
        self.metrics.bytes.fetch_add(compressed_size as usize, Ordering::Relaxed);

        Ok(())
    }

    /// Ensure space by evicting old entries
    async fn ensure_space(&self, needed: u64) -> Result<()> {
        let mut index = self.index.write().await;

        while index.total_size + needed > self.config.max_size {
            // Get LRU entry
            let hash = match index.lru.pop_back() {
                Some(h) => h,
                None => break,
            };

            if let Some(entry) = index.entries.remove(&hash) {
                // Delete file
                let _ = fs::remove_file(&entry.path).await;
                index.total_size -= entry.compressed_size;
                self.metrics.evictions.fetch_add(1, Ordering::Relaxed);
            }
        }

        Ok(())
    }

    /// Scan existing cache directory
    async fn scan_cache(config: &L2Config) -> Result<L2Index> {
        let mut entries = HashMap::new();
        let mut total_size = 0u64;

        for shard in 0..config.shards {
            let shard_dir = config.root.join(format!("{:02x}", shard));

            let mut dir = match fs::read_dir(&shard_dir).await {
                Ok(d) => d,
                Err(_) => continue,
            };

            while let Some(entry) = dir.next_entry().await? {
                let path = entry.path();
                let metadata = entry.metadata().await?;

                if metadata.is_file() {
                    let filename = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");

                    if let Ok(hash) = hex::decode(filename) {
                        if hash.len() == 32 {
                            let hash: ChunkHash = hash.try_into().unwrap();
                            let size = metadata.len();

                            entries.insert(hash, L2Entry {
                                path,
                                size,
                                compressed_size: size,
                                accessed_at: Instant::now(),
                                lru_node: std::ptr::null_mut(),
                            });

                            total_size += size;
                        }
                    }
                }
            }
        }

        Ok(L2Index {
            entries,
            total_size,
            lru: LinkedList::new(),
        })
    }

    /// Cleanup expired entries
    pub async fn cleanup_expired(&self) -> Result<u64> {
        let now = Instant::now();
        let mut cleaned = 0u64;

        let expired: Vec<ChunkHash> = {
            let index = self.index.read().await;
            index.entries.iter()
                .filter(|(_, e)| now.duration_since(e.accessed_at) > self.config.max_age)
                .map(|(h, _)| *h)
                .collect()
        };

        for hash in expired {
            let mut index = self.index.write().await;
            if let Some(entry) = index.entries.remove(&hash) {
                let _ = fs::remove_file(&entry.path).await;
                index.total_size -= entry.compressed_size;
                cleaned += entry.compressed_size;
            }
        }

        Ok(cleaned)
    }
}
```

---

## L3 Cache (Remote)

The L3 layer is the authoritative storage (S3, GCS, etc.). See [storage-layout.md](./storage-layout.md) for details.

---

## Unified Cache Manager

```rust
/// Multi-tier cache manager
pub struct CacheManager {
    l1: L1Cache,
    l2: L2Cache,
    l3: StorageClient,
    config: CacheConfig,
    prefetcher: Prefetcher,
}

#[derive(Clone)]
pub struct CacheConfig {
    /// Enable L1 cache
    pub enable_l1: bool,

    /// Enable L2 cache
    pub enable_l2: bool,

    /// Enable prefetching
    pub enable_prefetch: bool,

    /// Prefetch window size
    pub prefetch_window: usize,

    /// Write-through vs write-back
    pub write_policy: WritePolicy,
}

pub enum WritePolicy {
    /// Write to all levels immediately
    WriteThrough,

    /// Write to L1/L2, async to L3
    WriteBack,

    /// Write directly to L3
    WriteDirect,
}

impl CacheManager {
    /// Get chunk, checking each cache level
    pub async fn get(&self, hash: &ChunkHash) -> Result<Vec<u8>> {
        // Try L1
        if self.config.enable_l1 {
            if let Some(data) = self.l1.get(hash) {
                return Ok((*data).clone());
            }
        }

        // Try L2
        if self.config.enable_l2 {
            if let Some(data) = self.l2.get(hash).await {
                // Populate L1
                if self.config.enable_l1 {
                    self.l1.insert(*hash, data.clone());
                }
                return Ok(data);
            }
        }

        // Fetch from L3
        let data = self.l3.get_chunk(hash).await?;

        // Populate caches
        if self.config.enable_l1 {
            self.l1.insert(*hash, data.clone());
        }
        if self.config.enable_l2 {
            self.l2.insert(*hash, data.clone()).await?;
        }

        Ok(data)
    }

    /// Get chunk with prefetching
    pub async fn get_with_prefetch(
        &self,
        hash: &ChunkHash,
        context: &[ChunkHash],
    ) -> Result<Vec<u8>> {
        // Start prefetching nearby chunks
        if self.config.enable_prefetch {
            let to_prefetch: Vec<_> = context.iter()
                .filter(|h| !self.l1.contains(h))
                .take(self.config.prefetch_window)
                .cloned()
                .collect();

            self.prefetcher.prefetch(to_prefetch);
        }

        self.get(hash).await
    }

    /// Put chunk with write policy
    pub async fn put(&self, hash: ChunkHash, data: Vec<u8>) -> Result<()> {
        match self.config.write_policy {
            WritePolicy::WriteThrough => {
                // Write to all levels
                self.l3.put_chunk(&hash, &data).await?;
                if self.config.enable_l2 {
                    self.l2.insert(hash, data.clone()).await?;
                }
                if self.config.enable_l1 {
                    self.l1.insert(hash, data);
                }
            }
            WritePolicy::WriteBack => {
                // Write to local caches, async to L3
                if self.config.enable_l1 {
                    self.l1.insert(hash, data.clone());
                }
                if self.config.enable_l2 {
                    self.l2.insert(hash, data.clone()).await?;
                }
                // Queue async write to L3
                self.queue_l3_write(hash, data);
            }
            WritePolicy::WriteDirect => {
                // Write only to L3
                self.l3.put_chunk(&hash, &data).await?;
            }
        }

        Ok(())
    }

    /// Invalidate chunk from all caches
    pub async fn invalidate(&self, hash: &ChunkHash) {
        self.l1.invalidate(hash);
        self.l2.invalidate(hash).await;
    }

    /// Get combined statistics
    pub fn stats(&self) -> CombinedStats {
        CombinedStats {
            l1: self.l1.stats(),
            l2: self.l2.stats(),
        }
    }
}
```

---

## Prefetching

```rust
/// Background prefetcher
pub struct Prefetcher {
    cache: Arc<CacheManager>,
    queue: flume::Sender<ChunkHash>,
    workers: Vec<JoinHandle<()>>,
}

impl Prefetcher {
    pub fn new(cache: Arc<CacheManager>, worker_count: usize) -> Self {
        let (tx, rx) = flume::bounded(1000);

        let workers: Vec<_> = (0..worker_count)
            .map(|_| {
                let cache = Arc::clone(&cache);
                let rx = rx.clone();

                tokio::spawn(async move {
                    while let Ok(hash) = rx.recv_async().await {
                        // Prefetch if not in L1
                        if !cache.l1.contains(&hash) {
                            let _ = cache.get(&hash).await;
                        }
                    }
                })
            })
            .collect();

        Self {
            cache,
            queue: tx,
            workers,
        }
    }

    /// Queue chunks for prefetching
    pub fn prefetch(&self, hashes: Vec<ChunkHash>) {
        for hash in hashes {
            // Non-blocking send, drop if queue full
            let _ = self.queue.try_send(hash);
        }
    }
}

/// Sequential read prefetcher
pub struct SequentialPrefetcher {
    /// Recent access patterns
    patterns: LruCache<PathBuf, AccessPattern>,

    /// Chunks to prefetch per detection
    prefetch_count: usize,
}

struct AccessPattern {
    chunks: Vec<ChunkHash>,
    last_index: usize,
    sequential_count: usize,
}

impl SequentialPrefetcher {
    /// Detect sequential access and prefetch
    pub fn on_access(&mut self, path: &Path, chunk_index: usize, all_chunks: &[ChunkHash]) {
        let pattern = self.patterns.get_or_insert(path.to_owned(), AccessPattern::new);

        // Check if sequential
        if chunk_index == pattern.last_index + 1 {
            pattern.sequential_count += 1;
        } else {
            pattern.sequential_count = 0;
        }

        pattern.last_index = chunk_index;

        // Trigger prefetch after 3 sequential accesses
        if pattern.sequential_count >= 3 {
            let start = chunk_index + 1;
            let end = (start + self.prefetch_count).min(all_chunks.len());

            for i in start..end {
                self.prefetch(all_chunks[i]);
            }
        }
    }
}
```

---

## Cache Warming

```rust
/// Warm cache for frequently accessed files
pub struct CacheWarmer {
    cache: Arc<CacheManager>,
}

impl CacheWarmer {
    /// Warm cache for a commit
    pub async fn warm_commit(&self, commit: &Commit) -> Result<WarmResult> {
        let manifest = self.load_manifest(&commit.manifest_hash).await?;

        let mut warmed = 0;
        let mut skipped = 0;

        for entry in &manifest.entries {
            // Only warm frequently accessed files
            if self.should_warm(&entry.path) {
                for chunk in &entry.chunks {
                    if !self.cache.l2.contains(&chunk.hash).await {
                        self.cache.get(&chunk.hash).await?;
                        warmed += 1;
                    } else {
                        skipped += 1;
                    }
                }
            }
        }

        Ok(WarmResult { warmed, skipped })
    }

    /// Warm cache for working tree
    pub async fn warm_working_tree(&self, manifest: &Manifest) -> Result<WarmResult> {
        // Prioritize project files (small, frequently accessed)
        let mut priority_files = Vec::new();
        let mut media_files = Vec::new();

        for entry in &manifest.entries {
            if entry.path.ends_with(".prproj") ||
               entry.path.ends_with(".drp") ||
               entry.path.ends_with(".aep")
            {
                priority_files.push(entry);
            } else {
                media_files.push(entry);
            }
        }

        let mut warmed = 0;

        // Warm priority files first
        for entry in priority_files {
            for chunk in &entry.chunks {
                self.cache.get(&chunk.hash).await?;
                warmed += 1;
            }
        }

        // Then warm media files (background)
        for entry in media_files {
            for chunk in &entry.chunks {
                // Only warm L2, not L1 (too large)
                if !self.cache.l2.contains(&chunk.hash).await {
                    let data = self.cache.l3.get_chunk(&chunk.hash).await?;
                    self.cache.l2.insert(chunk.hash, data).await?;
                    warmed += 1;
                }
            }
        }

        Ok(WarmResult { warmed, skipped: 0 })
    }
}
```

---

## Configuration

```toml
# .dits/config

[cache]
# L1 (memory) cache size
l1_size = "1GB"

# L2 (disk) cache size
l2_size = "50GB"

# L2 cache location
l2_path = ".dits/cache/l2"

# Enable compression for L2
l2_compress = true

# Max age before eviction
l2_max_age = "7d"

# Prefetch settings
prefetch_enabled = true
prefetch_window = 16

# Write policy: "write_through", "write_back", "write_direct"
write_policy = "write_through"
```

---

## Monitoring

```rust
/// Cache metrics for monitoring
pub struct CacheMetrics {
    // L1 metrics
    pub l1_hits: Counter,
    pub l1_misses: Counter,
    pub l1_size_bytes: Gauge,
    pub l1_entries: Gauge,

    // L2 metrics
    pub l2_hits: Counter,
    pub l2_misses: Counter,
    pub l2_size_bytes: Gauge,
    pub l2_entries: Gauge,
    pub l2_evictions: Counter,

    // Combined metrics
    pub cache_hit_rate: Gauge,
    pub avg_latency_us: Histogram,
    pub prefetch_hits: Counter,
}
```

---

## Notes

- L1 uses Arc for zero-copy sharing
- L2 uses file locking for multi-process safety
- Compression is optional but recommended for L2
- Prefetching significantly improves sequential read performance
- Write-back policy requires crash recovery consideration
- Monitor hit rates to tune cache sizes
