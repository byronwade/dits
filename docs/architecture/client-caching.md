# Client-Side Caching Strategy

This document specifies the multi-tier caching architecture for the Dits client, including cache structures, eviction policies, prefetching strategies, and cache coherence mechanisms.

## Cache Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Dits Client                                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    L1: Memory Cache                          │   │
│  │                    (Hot chunks, 256 MB)                      │   │
│  │                    TTL: Session, LRU eviction                │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                              │ Miss                                 │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │                    L2: Disk Cache                            │   │
│  │                    (.dits/cache/, 10 GB default)             │   │
│  │                    TTL: 7 days, LRU eviction                 │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                              │ Miss                                 │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │                    L3: Local Objects                         │   │
│  │                    (.dits/objects/)                          │   │
│  │                    Permanent, ref-counted                    │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                              │ Miss                                 │
├──────────────────────────────┼──────────────────────────────────────┤
│                              │ Network                              │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │                    Remote Storage                            │   │
│  │                    (S3/Server)                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## L1: Memory Cache

In-process cache for frequently accessed chunks during a session.

### Implementation

```rust
use moka::sync::Cache;
use std::sync::Arc;

/// L1 Memory Cache Configuration
pub struct L1Config {
    /// Maximum cache size in bytes
    pub max_size: u64,  // Default: 256 MB

    /// Time-to-live for cached entries
    pub ttl: Duration,  // Default: 30 minutes

    /// Time-to-idle before eviction
    pub tti: Duration,  // Default: 10 minutes

    /// Number of segments for concurrent access
    pub segments: usize,  // Default: 16
}

impl Default for L1Config {
    fn default() -> Self {
        Self {
            max_size: 256 * 1024 * 1024,  // 256 MB
            ttl: Duration::from_secs(1800),  // 30 min
            tti: Duration::from_secs(600),   // 10 min
            segments: 16,
        }
    }
}

pub struct MemoryCache {
    cache: Cache<Hash, Arc<Chunk>>,
    config: L1Config,
    stats: CacheStats,
}

impl MemoryCache {
    pub fn new(config: L1Config) -> Self {
        let cache = Cache::builder()
            .max_capacity(config.max_size)
            .time_to_live(config.ttl)
            .time_to_idle(config.tti)
            .weigher(|_key: &Hash, value: &Arc<Chunk>| -> u32 {
                value.data.len() as u32
            })
            .eviction_listener(|key, value, cause| {
                tracing::debug!(
                    "L1 evicted chunk {} ({} bytes): {:?}",
                    key, value.data.len(), cause
                );
            })
            .build();

        Self {
            cache,
            config,
            stats: CacheStats::default(),
        }
    }

    pub fn get(&self, hash: &Hash) -> Option<Arc<Chunk>> {
        let result = self.cache.get(hash);
        if result.is_some() {
            self.stats.hits.fetch_add(1, Ordering::Relaxed);
        } else {
            self.stats.misses.fetch_add(1, Ordering::Relaxed);
        }
        result
    }

    pub fn insert(&self, hash: Hash, chunk: Arc<Chunk>) {
        self.cache.insert(hash, chunk);
        self.stats.inserts.fetch_add(1, Ordering::Relaxed);
    }

    pub fn invalidate(&self, hash: &Hash) {
        self.cache.invalidate(hash);
    }

    pub fn clear(&self) {
        self.cache.invalidate_all();
    }

    pub fn stats(&self) -> CacheStatsSnapshot {
        CacheStatsSnapshot {
            hits: self.stats.hits.load(Ordering::Relaxed),
            misses: self.stats.misses.load(Ordering::Relaxed),
            inserts: self.stats.inserts.load(Ordering::Relaxed),
            size: self.cache.weighted_size(),
            entry_count: self.cache.entry_count(),
        }
    }
}
```

### Memory Cache Policies

| Policy | Value | Rationale |
|--------|-------|-----------|
| Eviction | LRU (Least Recently Used) | Video editing accesses same frames repeatedly |
| Size Limit | 256 MB default | Balance RAM usage with performance |
| TTL | 30 minutes | Prevent stale data |
| TTI | 10 minutes | Evict unused chunks quickly |
| Concurrency | 16 segments | Support parallel reads |

## L2: Disk Cache

Persistent cache for remote chunks on local disk.

### Structure

```
.dits/cache/
├── chunks/                    # Cached chunk data
│   ├── 00/                    # Hash prefix buckets
│   │   ├── 00a1b2c3d4...     # Chunk file
│   │   └── 00f6g7h8i9...
│   ├── 01/
│   │   └── ...
│   └── ff/
├── index.db                   # SQLite index
├── stats.json                 # Cache statistics
└── lock                       # Process lock file
```

### Index Schema

```sql
-- .dits/cache/index.db

-- Cached chunks metadata
CREATE TABLE chunks (
    hash BLOB PRIMARY KEY,          -- BLAKE3 hash (32 bytes)
    size INTEGER NOT NULL,          -- Uncompressed size
    compressed_size INTEGER,        -- Compressed size on disk
    compression TEXT,               -- Compression algorithm
    last_accessed INTEGER NOT NULL, -- Unix timestamp
    access_count INTEGER DEFAULT 1, -- Access frequency
    pinned BOOLEAN DEFAULT FALSE,   -- Prevent eviction
    source TEXT,                    -- Where chunk came from
    created_at INTEGER NOT NULL     -- When cached
);

-- Manifest cache (for directory listings)
CREATE TABLE manifests (
    hash BLOB PRIMARY KEY,
    repository_id TEXT NOT NULL,
    path TEXT NOT NULL,
    data BLOB NOT NULL,
    last_accessed INTEGER NOT NULL,
    expires_at INTEGER
);

-- Prefetch queue
CREATE TABLE prefetch_queue (
    hash BLOB PRIMARY KEY,
    priority INTEGER NOT NULL,      -- Lower = higher priority
    predicted_at INTEGER NOT NULL,  -- When prediction was made
    reason TEXT                     -- Why prefetched
);

-- Access patterns for prediction
CREATE TABLE access_patterns (
    id INTEGER PRIMARY KEY,
    file_path TEXT NOT NULL,
    chunk_sequence BLOB NOT NULL,   -- Ordered list of chunk hashes
    access_time INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_chunks_lru ON chunks(pinned, last_accessed);
CREATE INDEX idx_chunks_size ON chunks(size DESC);
CREATE INDEX idx_chunks_source ON chunks(source);
CREATE INDEX idx_prefetch_priority ON prefetch_queue(priority);
```

### Implementation

```rust
use rusqlite::{Connection, params};
use std::path::PathBuf;

pub struct DiskCache {
    path: PathBuf,
    db: Connection,
    config: L2Config,
    current_size: AtomicU64,
}

pub struct L2Config {
    /// Maximum cache size in bytes
    pub max_size: u64,  // Default: 10 GB

    /// TTL for cached chunks (hours)
    pub ttl_hours: u32,  // Default: 168 (7 days)

    /// Eviction policy
    pub eviction: EvictionPolicy,

    /// Low watermark (start eviction below this)
    pub low_watermark: f64,  // Default: 0.8 (80%)

    /// High watermark (stop eviction above this)
    pub high_watermark: f64,  // Default: 0.9 (90%)

    /// Compression for stored chunks
    pub compression: Compression,
}

#[derive(Clone, Copy)]
pub enum EvictionPolicy {
    /// Least Recently Used
    Lru,
    /// Least Frequently Used
    Lfu,
    /// Combination of LRU and LFU
    Lrfu { decay: f64 },
    /// First In First Out
    Fifo,
    /// Size-aware LRU (evict large chunks first)
    SizeLru,
}

impl DiskCache {
    pub fn open(path: PathBuf, config: L2Config) -> Result<Self, CacheError> {
        std::fs::create_dir_all(&path)?;

        let db_path = path.join("index.db");
        let db = Connection::open(&db_path)?;

        // Initialize schema
        db.execute_batch(include_str!("cache_schema.sql"))?;

        // Calculate current size
        let current_size: u64 = db.query_row(
            "SELECT COALESCE(SUM(compressed_size), 0) FROM chunks",
            [],
            |row| row.get(0),
        )?;

        Ok(Self {
            path,
            db,
            config,
            current_size: AtomicU64::new(current_size),
        })
    }

    pub fn get(&self, hash: &Hash) -> Result<Option<Chunk>, CacheError> {
        // Check if exists and not expired
        let row = self.db.query_row(
            "SELECT compressed_size, compression, last_accessed, created_at
             FROM chunks WHERE hash = ?",
            [hash.as_bytes()],
            |row| Ok((
                row.get::<_, i64>(0)? as u64,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i64>(3)?,
            )),
        );

        let (compressed_size, compression, _last_accessed, created_at) = match row {
            Ok(r) => r,
            Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(None),
            Err(e) => return Err(e.into()),
        };

        // Check TTL
        let age_hours = (now_unix() - created_at) / 3600;
        if age_hours > self.config.ttl_hours as i64 {
            // Expired, remove it
            self.remove(hash)?;
            return Ok(None);
        }

        // Read chunk from disk
        let chunk_path = self.chunk_path(hash);
        let compressed = std::fs::read(&chunk_path)?;

        // Decompress
        let data = decompress(&compressed, &compression)?;

        // Update access time and count
        self.db.execute(
            "UPDATE chunks SET last_accessed = ?, access_count = access_count + 1
             WHERE hash = ?",
            params![now_unix(), hash.as_bytes()],
        )?;

        Ok(Some(Chunk { hash: *hash, data }))
    }

    pub fn insert(&self, chunk: &Chunk) -> Result<(), CacheError> {
        // Check if we need to evict
        let current = self.current_size.load(Ordering::Relaxed);
        let threshold = (self.config.max_size as f64 * self.config.high_watermark) as u64;

        if current + chunk.data.len() as u64 > threshold {
            self.evict_to_target(
                (self.config.max_size as f64 * self.config.low_watermark) as u64
            )?;
        }

        // Compress
        let compressed = compress(&chunk.data, &self.config.compression)?;

        // Write to disk
        let chunk_path = self.chunk_path(&chunk.hash);
        std::fs::create_dir_all(chunk_path.parent().unwrap())?;
        std::fs::write(&chunk_path, &compressed)?;

        // Update index
        self.db.execute(
            "INSERT OR REPLACE INTO chunks
             (hash, size, compressed_size, compression, last_accessed, created_at, source)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                chunk.hash.as_bytes(),
                chunk.data.len() as i64,
                compressed.len() as i64,
                self.config.compression.to_string(),
                now_unix(),
                now_unix(),
                "remote",
            ],
        )?;

        self.current_size.fetch_add(compressed.len() as u64, Ordering::Relaxed);

        Ok(())
    }

    fn evict_to_target(&self, target_size: u64) -> Result<usize, CacheError> {
        let mut evicted = 0;

        while self.current_size.load(Ordering::Relaxed) > target_size {
            // Select victim based on policy
            let victim = match self.config.eviction {
                EvictionPolicy::Lru => self.select_lru_victim()?,
                EvictionPolicy::Lfu => self.select_lfu_victim()?,
                EvictionPolicy::Lrfu { decay } => self.select_lrfu_victim(decay)?,
                EvictionPolicy::Fifo => self.select_fifo_victim()?,
                EvictionPolicy::SizeLru => self.select_size_lru_victim()?,
            };

            match victim {
                Some((hash, size)) => {
                    self.remove(&hash)?;
                    self.current_size.fetch_sub(size, Ordering::Relaxed);
                    evicted += 1;
                }
                None => break,  // No more evictable chunks
            }
        }

        tracing::info!("Evicted {} chunks from L2 cache", evicted);
        Ok(evicted)
    }

    fn select_lru_victim(&self) -> Result<Option<(Hash, u64)>, CacheError> {
        let result = self.db.query_row(
            "SELECT hash, compressed_size FROM chunks
             WHERE pinned = FALSE
             ORDER BY last_accessed ASC
             LIMIT 1",
            [],
            |row| Ok((
                Hash::from_bytes(row.get::<_, Vec<u8>>(0)?),
                row.get::<_, i64>(1)? as u64,
            )),
        );

        match result {
            Ok((hash, size)) => Ok(Some((hash, size))),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn select_lfu_victim(&self) -> Result<Option<(Hash, u64)>, CacheError> {
        let result = self.db.query_row(
            "SELECT hash, compressed_size FROM chunks
             WHERE pinned = FALSE
             ORDER BY access_count ASC, last_accessed ASC
             LIMIT 1",
            [],
            |row| Ok((
                Hash::from_bytes(row.get::<_, Vec<u8>>(0)?),
                row.get::<_, i64>(1)? as u64,
            )),
        );

        match result {
            Ok((hash, size)) => Ok(Some((hash, size))),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn select_lrfu_victim(&self, decay: f64) -> Result<Option<(Hash, u64)>, CacheError> {
        // LRFU combines recency and frequency with exponential decay
        // Score = frequency * decay^(now - last_access)
        let now = now_unix();

        let result = self.db.query_row(
            "SELECT hash, compressed_size,
                    access_count * POWER(?, (? - last_accessed) / 3600.0) as score
             FROM chunks
             WHERE pinned = FALSE
             ORDER BY score ASC
             LIMIT 1",
            params![decay, now],
            |row| Ok((
                Hash::from_bytes(row.get::<_, Vec<u8>>(0)?),
                row.get::<_, i64>(1)? as u64,
            )),
        );

        match result {
            Ok((hash, size)) => Ok(Some((hash, size))),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn select_size_lru_victim(&self) -> Result<Option<(Hash, u64)>, CacheError> {
        // Prefer evicting larger chunks when they're equally old
        let result = self.db.query_row(
            "SELECT hash, compressed_size FROM chunks
             WHERE pinned = FALSE
             ORDER BY last_accessed ASC, compressed_size DESC
             LIMIT 1",
            [],
            |row| Ok((
                Hash::from_bytes(row.get::<_, Vec<u8>>(0)?),
                row.get::<_, i64>(1)? as u64,
            )),
        );

        match result {
            Ok((hash, size)) => Ok(Some((hash, size))),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn chunk_path(&self, hash: &Hash) -> PathBuf {
        let hex = hash.to_hex();
        self.path
            .join("chunks")
            .join(&hex[0..2])
            .join(&hex[2..])
    }

    pub fn pin(&self, hash: &Hash) -> Result<(), CacheError> {
        self.db.execute(
            "UPDATE chunks SET pinned = TRUE WHERE hash = ?",
            [hash.as_bytes()],
        )?;
        Ok(())
    }

    pub fn unpin(&self, hash: &Hash) -> Result<(), CacheError> {
        self.db.execute(
            "UPDATE chunks SET pinned = FALSE WHERE hash = ?",
            [hash.as_bytes()],
        )?;
        Ok(())
    }

    pub fn stats(&self) -> Result<L2Stats, CacheError> {
        let (total_chunks, total_size, avg_access): (i64, i64, f64) = self.db.query_row(
            "SELECT COUNT(*), COALESCE(SUM(compressed_size), 0),
                    COALESCE(AVG(access_count), 0)
             FROM chunks",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )?;

        Ok(L2Stats {
            total_chunks: total_chunks as u64,
            total_size: total_size as u64,
            max_size: self.config.max_size,
            avg_access_count: avg_access,
            utilization: total_size as f64 / self.config.max_size as f64,
        })
    }
}
```

## L3: Local Objects

Permanent storage for committed objects. Not evictable.

```rust
pub struct ObjectStore {
    path: PathBuf,
}

impl ObjectStore {
    pub fn get(&self, hash: &Hash) -> Result<Option<Vec<u8>>, IoError> {
        let path = self.object_path(hash);
        match std::fs::read(&path) {
            Ok(data) => {
                // Parse object header and decompress
                let (obj_type, content) = parse_object(&data)?;
                Ok(Some(content))
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn exists(&self, hash: &Hash) -> bool {
        self.object_path(hash).exists()
    }

    fn object_path(&self, hash: &Hash) -> PathBuf {
        let hex = hash.to_hex();
        self.path
            .join(&hex[0..2])
            .join(&hex[2..])
    }
}
```

## Unified Cache Manager

Coordinates all cache tiers.

```rust
pub struct CacheManager {
    l1: MemoryCache,
    l2: DiskCache,
    l3: ObjectStore,
    prefetcher: Prefetcher,
    stats: GlobalStats,
}

impl CacheManager {
    /// Get a chunk, checking all cache tiers
    pub async fn get(&self, hash: &Hash) -> Result<Option<Arc<Chunk>>, CacheError> {
        // L1: Memory cache
        if let Some(chunk) = self.l1.get(hash) {
            self.stats.l1_hits.fetch_add(1, Ordering::Relaxed);
            return Ok(Some(chunk));
        }
        self.stats.l1_misses.fetch_add(1, Ordering::Relaxed);

        // L2: Disk cache
        if let Some(chunk) = self.l2.get(hash)? {
            self.stats.l2_hits.fetch_add(1, Ordering::Relaxed);

            // Promote to L1
            let chunk = Arc::new(chunk);
            self.l1.insert(*hash, chunk.clone());

            return Ok(Some(chunk));
        }
        self.stats.l2_misses.fetch_add(1, Ordering::Relaxed);

        // L3: Local objects
        if let Some(data) = self.l3.get(hash)? {
            self.stats.l3_hits.fetch_add(1, Ordering::Relaxed);

            let chunk = Arc::new(Chunk { hash: *hash, data });

            // Promote to L1 (skip L2 for local objects)
            self.l1.insert(*hash, chunk.clone());

            return Ok(Some(chunk));
        }
        self.stats.l3_misses.fetch_add(1, Ordering::Relaxed);

        // Cache miss - need to fetch from remote
        Ok(None)
    }

    /// Get a chunk, fetching from remote if needed
    pub async fn get_or_fetch(
        &self,
        hash: &Hash,
        remote: &RemoteClient,
    ) -> Result<Arc<Chunk>, CacheError> {
        // Try cache first
        if let Some(chunk) = self.get(hash).await? {
            return Ok(chunk);
        }

        // Fetch from remote
        self.stats.remote_fetches.fetch_add(1, Ordering::Relaxed);
        let chunk = remote.fetch_chunk(hash).await?;
        let chunk = Arc::new(chunk);

        // Store in L2 (for remote chunks)
        self.l2.insert(&chunk)?;

        // Store in L1
        self.l1.insert(*hash, chunk.clone());

        Ok(chunk)
    }

    /// Prefetch chunks that might be needed soon
    pub async fn prefetch(&self, hashes: &[Hash], remote: &RemoteClient) {
        self.prefetcher.prefetch(hashes, remote, &self.l2).await;
    }

    /// Get cache statistics
    pub fn stats(&self) -> CacheStats {
        CacheStats {
            l1: self.l1.stats(),
            l2: self.l2.stats().unwrap_or_default(),
            l1_hit_rate: self.stats.l1_hit_rate(),
            l2_hit_rate: self.stats.l2_hit_rate(),
            l3_hit_rate: self.stats.l3_hit_rate(),
            remote_fetches: self.stats.remote_fetches.load(Ordering::Relaxed),
        }
    }
}
```

## Prefetching Strategy

### Sequential Prefetch

For sequential file access (video playback):

```rust
pub struct SequentialPrefetcher {
    /// Number of chunks to prefetch ahead
    lookahead: usize,

    /// Active prefetch tasks
    active: DashMap<Hash, JoinHandle<()>>,

    /// Prefetch queue
    queue: Arc<Mutex<VecDeque<Hash>>>,
}

impl SequentialPrefetcher {
    pub async fn on_access(&self, file: &FileManifest, chunk_index: usize) {
        // Calculate chunks to prefetch
        let start = chunk_index + 1;
        let end = (chunk_index + self.lookahead).min(file.chunks.len());

        for i in start..end {
            let hash = file.chunks[i].hash;

            // Skip if already cached or prefetching
            if self.active.contains_key(&hash) {
                continue;
            }

            // Add to prefetch queue
            self.queue.lock().push_back(hash);
        }
    }
}
```

### Predictive Prefetch

Learn access patterns for NLE projects:

```rust
pub struct PredictivePrefetcher {
    /// Markov chain of chunk access transitions
    transitions: DashMap<Hash, Vec<(Hash, f64)>>,

    /// Recent access history
    history: RwLock<VecDeque<Hash>>,

    /// Prediction threshold
    threshold: f64,
}

impl PredictivePrefetcher {
    /// Record an access for learning
    pub fn record_access(&self, hash: Hash) {
        let mut history = self.history.write();

        // Update transition probabilities
        if let Some(&last) = history.back() {
            let mut transitions = self.transitions
                .entry(last)
                .or_insert_with(Vec::new);

            // Increment count for this transition
            if let Some(entry) = transitions.iter_mut().find(|(h, _)| h == &hash) {
                entry.1 += 1.0;
            } else {
                transitions.push((hash, 1.0));
            }

            // Normalize probabilities
            let total: f64 = transitions.iter().map(|(_, c)| *c).sum();
            for (_, p) in transitions.iter_mut() {
                *p /= total;
            }
        }

        history.push_back(hash);
        if history.len() > 1000 {
            history.pop_front();
        }
    }

    /// Predict next chunks based on current access
    pub fn predict(&self, current: &Hash) -> Vec<Hash> {
        self.transitions
            .get(current)
            .map(|t| {
                t.iter()
                    .filter(|(_, p)| *p >= self.threshold)
                    .map(|(h, _)| *h)
                    .collect()
            })
            .unwrap_or_default()
    }
}
```

### Project-Aware Prefetch

Prefetch based on NLE project structure:

```rust
pub struct ProjectPrefetcher {
    /// Parsed project file
    project: NleProject,
}

impl ProjectPrefetcher {
    /// Prefetch media for a timeline segment
    pub async fn prefetch_timeline_segment(
        &self,
        sequence_id: &str,
        time_range: TimeRange,
        cache: &CacheManager,
        remote: &RemoteClient,
    ) {
        let sequence = match self.project.get_sequence(sequence_id) {
            Some(s) => s,
            None => return,
        };

        // Find all media clips in this time range
        let clips: Vec<_> = sequence.tracks
            .iter()
            .flat_map(|t| &t.clips)
            .filter(|c| c.overlaps(&time_range))
            .collect();

        // Get chunk hashes for each clip's time range
        let mut hashes = Vec::new();
        for clip in clips {
            let media = match self.project.get_media(&clip.media_ref) {
                Some(m) => m,
                None => continue,
            };

            // Calculate which chunks cover this clip's portion
            let chunk_range = media.chunks_for_time_range(
                clip.source_in,
                clip.source_out,
            );

            hashes.extend(chunk_range);
        }

        // Deduplicate and prefetch
        let unique: HashSet<_> = hashes.into_iter().collect();
        cache.prefetch(&unique.into_iter().collect::<Vec<_>>(), remote).await;
    }
}
```

## Cache Coherence

### Invalidation Triggers

```rust
pub enum InvalidationTrigger {
    /// Remote ref updated (push/fetch)
    RefUpdate { ref_name: String, old_hash: Hash, new_hash: Hash },

    /// File modified in working directory
    FileModified { path: PathBuf },

    /// Explicit user request
    UserRequest,

    /// TTL expired
    TtlExpired,

    /// Storage pressure
    StoragePressure,
}

impl CacheManager {
    pub fn invalidate(&self, trigger: InvalidationTrigger) {
        match trigger {
            InvalidationTrigger::RefUpdate { ref_name, old_hash, new_hash } => {
                // Invalidate manifests for changed files
                self.invalidate_ref_manifests(&ref_name, &old_hash, &new_hash);
            }

            InvalidationTrigger::FileModified { path } => {
                // Invalidate cached manifest for this file
                self.invalidate_file_manifest(&path);
            }

            InvalidationTrigger::UserRequest => {
                // Clear all caches
                self.l1.clear();
                self.l2.clear_all().ok();
            }

            InvalidationTrigger::TtlExpired => {
                // L2 handles this during access
            }

            InvalidationTrigger::StoragePressure => {
                // Aggressive eviction
                self.l2.evict_to_target(
                    (self.l2.config.max_size as f64 * 0.5) as u64
                ).ok();
            }
        }
    }
}
```

### Cache Warming

Pre-populate cache for common operations:

```rust
impl CacheManager {
    /// Warm cache for checkout operation
    pub async fn warm_for_checkout(
        &self,
        commit: &Hash,
        remote: &RemoteClient,
    ) -> Result<WarmStats, CacheError> {
        let manifest = remote.fetch_commit_tree(commit).await?;

        let mut stats = WarmStats::default();

        // Prioritize small files (metadata, configs)
        let mut files: Vec<_> = manifest.files().collect();
        files.sort_by_key(|f| f.size);

        for file in files {
            // Skip if all chunks are cached
            let missing: Vec<_> = file.chunks
                .iter()
                .filter(|c| self.get(&c.hash).await.ok().flatten().is_none())
                .cloned()
                .collect();

            if missing.is_empty() {
                stats.cached_files += 1;
                continue;
            }

            // Fetch missing chunks
            for chunk in missing {
                match self.get_or_fetch(&chunk.hash, remote).await {
                    Ok(_) => stats.fetched_chunks += 1,
                    Err(e) => {
                        tracing::warn!("Failed to warm chunk {}: {}", chunk.hash, e);
                        stats.failed_chunks += 1;
                    }
                }
            }
        }

        Ok(stats)
    }

    /// Warm cache for diff operation
    pub async fn warm_for_diff(
        &self,
        old_commit: &Hash,
        new_commit: &Hash,
        remote: &RemoteClient,
    ) -> Result<WarmStats, CacheError> {
        // Fetch both trees
        let old_tree = remote.fetch_commit_tree(old_commit).await?;
        let new_tree = remote.fetch_commit_tree(new_commit).await?;

        // Find changed files
        let changes = diff_trees(&old_tree, &new_tree);

        let mut stats = WarmStats::default();

        // Only warm chunks for changed files
        for change in changes {
            match change {
                TreeChange::Modified { old, new } => {
                    // Warm both old and new chunks
                    self.warm_file_chunks(&old, remote, &mut stats).await?;
                    self.warm_file_chunks(&new, remote, &mut stats).await?;
                }
                TreeChange::Added { new } => {
                    self.warm_file_chunks(&new, remote, &mut stats).await?;
                }
                TreeChange::Deleted { old } => {
                    self.warm_file_chunks(&old, remote, &mut stats).await?;
                }
            }
        }

        Ok(stats)
    }
}
```

## Configuration

### Cache Configuration Options

```toml
# .ditsconfig or .dits/config

[cache]
# Enable caching
enabled = true

# L1 (Memory) settings
[cache.memory]
max_size = 268435456  # 256 MB
ttl_seconds = 1800     # 30 minutes
tti_seconds = 600      # 10 minutes

# L2 (Disk) settings
[cache.disk]
max_size = 10737418240  # 10 GB
ttl_hours = 168         # 7 days
eviction = "lru"        # lru, lfu, lrfu, fifo, size-lru
low_watermark = 0.8
high_watermark = 0.9
compression = "zstd"
compression_level = 3

# Prefetching
[cache.prefetch]
enabled = true
sequential_lookahead = 10
predictive = true
predictive_threshold = 0.3
max_concurrent = 4
bandwidth_limit = 0  # 0 = unlimited

# Cache location (default: .dits/cache)
# path = "/path/to/cache"
```

## CLI Commands

```bash
# View cache stats
dits cache stats
# L1 Memory Cache:
#   Entries: 1,234
#   Size: 180 MB / 256 MB
#   Hit rate: 94.5%
#
# L2 Disk Cache:
#   Entries: 45,678
#   Size: 7.2 GB / 10 GB
#   Hit rate: 87.3%

# Clear caches
dits cache clear          # Clear all
dits cache clear --l1     # Clear memory only
dits cache clear --l2     # Clear disk only

# Warm cache for a commit
dits cache warm HEAD
dits cache warm v1.0.0 --include="*.mp4"

# Pin chunks to prevent eviction
dits cache pin footage/hero.mp4

# Unpin
dits cache unpin footage/hero.mp4

# Analyze cache usage
dits cache analyze
# Top cached files:
#   footage/hero.mp4:      2.1 GB (3,456 chunks)
#   sequences/main.prproj: 156 MB (89 chunks)
#   ...

# Set cache size
dits config cache.disk.max_size 20GB
```

## Performance Metrics

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| L1 hit rate | >90% | <80% |
| L2 hit rate | >80% | <60% |
| Overall hit rate | >95% | <85% |
| Prefetch hit rate | >70% | <50% |
| Eviction rate | <1/sec | >10/sec |
| Cache utilization | 60-90% | >95% |

### Prometheus Metrics

```rust
lazy_static! {
    static ref CACHE_HITS: IntCounterVec = register_int_counter_vec!(
        "dits_cache_hits_total",
        "Total cache hits",
        &["tier"]  // l1, l2, l3
    ).unwrap();

    static ref CACHE_MISSES: IntCounterVec = register_int_counter_vec!(
        "dits_cache_misses_total",
        "Total cache misses",
        &["tier"]
    ).unwrap();

    static ref CACHE_SIZE: IntGaugeVec = register_int_gauge_vec!(
        "dits_cache_size_bytes",
        "Current cache size",
        &["tier"]
    ).unwrap();

    static ref CACHE_EVICTIONS: IntCounterVec = register_int_counter_vec!(
        "dits_cache_evictions_total",
        "Total evictions",
        &["tier", "reason"]  // lru, ttl, manual
    ).unwrap();

    static ref PREFETCH_HITS: IntCounter = register_int_counter!(
        "dits_prefetch_hits_total",
        "Chunks accessed that were prefetched"
    ).unwrap();

    static ref FETCH_LATENCY: Histogram = register_histogram!(
        "dits_chunk_fetch_seconds",
        "Chunk fetch latency",
        vec![0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
    ).unwrap();
}
```
