# Performance Tuning Guide

Complete guide to optimizing Dits performance for production workloads.

---

## Overview

Dits performance depends on several components:

| Component | Key Metrics | Optimization Focus |
|-----------|-------------|-------------------|
| API Server | Latency, throughput | Connection pooling, caching |
| Storage Engine | IOPS, bandwidth | Chunking strategy, tiering |
| PostgreSQL | Query time, connections | Indexes, query optimization |
| Redis | Hit rate, memory | Key design, eviction |
| Network | Latency, bandwidth | Protocol optimization, CDN |

---

## Benchmarking

### Baseline Metrics

Before optimization, establish baselines:

```bash
# API latency benchmark
wrk -t12 -c400 -d30s https://api.dits.example.com/health

# Push throughput
dits benchmark push --size 1GB --concurrency 4

# Pull throughput
dits benchmark pull --size 1GB --concurrency 4

# Database query performance
pgbench -c 10 -j 2 -T 60 -f queries.sql dits
```

### Performance Test Suite

```bash
#!/bin/bash
# benchmark.sh

echo "=== Dits Performance Benchmark ==="
echo "Date: $(date)"
echo ""

# 1. API Latency
echo "1. API Latency (p50, p95, p99)"
wrk -t4 -c100 -d30s --latency https://api.dits.example.com/v1/repos/test/status | \
  grep -E "(Latency|Req/Sec)"

# 2. Chunk Upload
echo ""
echo "2. Chunk Upload Throughput"
dd if=/dev/urandom bs=1M count=100 2>/dev/null | \
  time dits push --stdin --repo test/benchmark

# 3. Chunk Download
echo ""
echo "3. Chunk Download Throughput"
time dits pull --repo test/benchmark --output /dev/null

# 4. Concurrent Operations
echo ""
echo "4. Concurrent Push Operations"
for i in {1..10}; do
  dd if=/dev/urandom bs=1M count=10 2>/dev/null | \
    dits push --stdin --repo test/benchmark-$i &
done
wait

# 5. Database Query Performance
echo ""
echo "5. Database Query Performance"
psql -d dits -c "EXPLAIN ANALYZE SELECT * FROM chunks WHERE hash = 'abc123';"
```

---

## API Server Optimization

### Connection Pooling

```toml
# config.toml
[server]
# Maximum concurrent connections
max_connections = 10000

# Keep-alive settings
keep_alive_timeout = "75s"
keep_alive_interval = "15s"

# Request limits
max_request_body_size = "10GB"
request_timeout = "300s"

[server.tls]
# TLS session resumption
session_tickets = true
session_timeout = "24h"
```

### HTTP/2 and HTTP/3

```toml
[server.http2]
enabled = true
max_concurrent_streams = 250
initial_connection_window_size = "2MB"
initial_stream_window_size = "1MB"

[server.http3]
enabled = true
max_idle_timeout = "30s"
```

### Request Processing

```rust
// Optimize async runtime
#[tokio::main(flavor = "multi_thread", worker_threads = 16)]
async fn main() {
    // Use work-stealing scheduler
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(num_cpus::get())
        .max_blocking_threads(512)
        .enable_all()
        .build()
        .unwrap();
}
```

### Compression

```toml
[server.compression]
enabled = true
algorithms = ["zstd", "gzip", "br"]
min_size = "1KB"
level = "fast"  # fast, balanced, best
```

---

## Storage Engine Optimization

### Chunking Strategy

```toml
[chunking]
# Default chunker for most files
default = "fastcdc"

# Video-aware chunking for media files
[chunking.video]
enabled = true
extensions = [".mov", ".mp4", ".mxf", ".avi"]
# Align chunks to keyframes
keyframe_alignment = true
# Target chunk size (larger = fewer chunks = faster)
target_size = "8MB"
min_size = "2MB"
max_size = "16MB"

[chunking.fastcdc]
# Tune for your workload
avg_size = "1MB"
min_size = "256KB"
max_size = "4MB"
# Higher = better dedup, slower
normalization = 2
```

### Deduplication

```toml
[dedup]
enabled = true
# Global dedup across all repos
scope = "global"
# Use BLAKE3 for speed
hash_algorithm = "blake3"
# Bloom filter for quick negative lookups
bloom_filter_size = "1GB"
bloom_filter_fp_rate = 0.001
```

### Storage Tiering

```toml
[storage.tiering]
enabled = true

[storage.tiering.hot]
# Recently accessed chunks
storage_class = "STANDARD"
max_age = "7d"

[storage.tiering.warm]
# Less frequently accessed
storage_class = "STANDARD_IA"
max_age = "30d"

[storage.tiering.cold]
# Rarely accessed
storage_class = "GLACIER_IR"
max_age = "90d"

[storage.tiering.archive]
storage_class = "GLACIER_DEEP_ARCHIVE"
```

### Local Cache

```toml
[cache.local]
enabled = true
path = "/var/cache/dits"
max_size = "100GB"

# LRU eviction
eviction_policy = "lru"
# Start evicting at 90% capacity
high_watermark = 0.90
low_watermark = 0.80

# Prefetch popular chunks
prefetch_enabled = true
prefetch_threshold = 10  # Access count
```

---

## PostgreSQL Optimization

### Connection Settings

```ini
# postgresql.conf

# Connections
max_connections = 500
superuser_reserved_connections = 3

# Memory
shared_buffers = 8GB                 # 25% of RAM
effective_cache_size = 24GB          # 75% of RAM
work_mem = 256MB                     # Per-operation memory
maintenance_work_mem = 2GB           # For VACUUM, CREATE INDEX
wal_buffers = 256MB

# Parallelism
max_worker_processes = 16
max_parallel_workers_per_gather = 4
max_parallel_workers = 16
max_parallel_maintenance_workers = 4
```

### Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_chunks_repo_created
  ON chunks(repository_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_commits_repo_branch
  ON commits(repository_id, branch_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_files_commit_path
  ON files(commit_id, path);

-- Partial index for active locks
CREATE INDEX CONCURRENTLY idx_locks_active
  ON locks(file_path)
  WHERE released_at IS NULL;

-- Covering index for status checks
CREATE INDEX CONCURRENTLY idx_chunks_status_covering
  ON chunks(repository_id, status)
  INCLUDE (hash, size, created_at);
```

### Query Analysis

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms

-- Analyze slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### Vacuum and Analyze

```sql
-- Configure autovacuum
ALTER TABLE chunks SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_limit = 1000
);

-- Manual maintenance for large tables
VACUUM (VERBOSE, ANALYZE, PARALLEL 4) chunks;
REINDEX TABLE CONCURRENTLY chunks;

-- Update statistics
ANALYZE VERBOSE chunks;
```

### Partitioning

```sql
-- Partition chunks by repository
CREATE TABLE chunks (
  id UUID PRIMARY KEY,
  repository_id UUID NOT NULL,
  hash BYTEA NOT NULL,
  size BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
) PARTITION BY HASH (repository_id);

-- Create partitions
CREATE TABLE chunks_p0 PARTITION OF chunks FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE chunks_p1 PARTITION OF chunks FOR VALUES WITH (MODULUS 16, REMAINDER 1);
-- ... repeat for all partitions

-- Partition by time for commits
CREATE TABLE commits (
  id UUID PRIMARY KEY,
  repository_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

CREATE TABLE commits_2024_q1 PARTITION OF commits
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
```

---

## Redis Optimization

### Memory Configuration

```conf
# redis.conf
maxmemory 8gb
maxmemory-policy allkeys-lru

# Hash optimization
hash-max-listpack-entries 512
hash-max-listpack-value 64

# Disable persistence if using as cache only
save ""
appendonly no
```

### Key Design

```python
# Efficient key patterns
# Bad: large keys
key = f"repo:{repo_id}:commit:{commit_id}:file:{file_path}:chunk:{chunk_index}"

# Good: hashed paths, shorter keys
key = f"c:{repo_id[:8]}:{hash(file_path)[:8]}:{chunk_index}"

# Use hashes for related data
redis.hset(f"repo:{repo_id}", {
    "name": name,
    "size": size,
    "commit_count": commit_count
})
```

### Pipeline Operations

```python
# Bad: individual commands
for chunk_id in chunk_ids:
    redis.get(f"chunk:{chunk_id}")

# Good: pipeline
pipe = redis.pipeline()
for chunk_id in chunk_ids:
    pipe.get(f"chunk:{chunk_id}")
results = pipe.execute()
```

### Cluster Configuration

```conf
# redis-cluster.conf
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
cluster-require-full-coverage no
```

---

## Network Optimization

### QUIC Protocol Tuning

```toml
[network.quic]
enabled = true

# Congestion control
congestion_controller = "bbr"

# Flow control
initial_max_data = "100MB"
initial_max_stream_data_bidi_local = "10MB"
initial_max_stream_data_bidi_remote = "10MB"
initial_max_streams_bidi = 100

# Keep-alive
max_idle_timeout = "30s"
keep_alive_interval = "10s"
```

### CDN Configuration

```yaml
# CloudFront distribution
Origins:
  - DomainName: api.dits.example.com
    CustomOriginConfig:
      OriginProtocolPolicy: https-only
      OriginSSLProtocols:
        - TLSv1.2

CacheBehaviors:
  # Cache chunk downloads
  - PathPattern: /v1/chunks/*
    CachePolicyId: !Ref ChunkCachePolicy
    TTL:
      DefaultTTL: 86400
      MaxTTL: 31536000
    Compress: false  # Chunks are already compressed

  # Don't cache API responses
  - PathPattern: /v1/*
    CachePolicyId: !Ref NoCachePolicy

# Cache policy for chunks
ChunkCachePolicy:
  QueryStringsConfig:
    QueryStringBehavior: none
  HeadersConfig:
    HeaderBehavior: whitelist
    Headers:
      - Accept-Encoding
```

### TCP Tuning (Linux)

```bash
# /etc/sysctl.conf

# Increase buffer sizes
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# Enable TCP BBR
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# Connection handling
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# TIME_WAIT handling
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Apply changes
sysctl -p
```

---

## Application-Level Optimization

### Batch Operations

```rust
// Bad: individual chunk uploads
for chunk in chunks {
    upload_chunk(chunk).await?;
}

// Good: batch upload with concurrency
let semaphore = Arc::new(Semaphore::new(32));
let futures: Vec<_> = chunks
    .into_iter()
    .map(|chunk| {
        let permit = semaphore.clone().acquire_owned();
        async move {
            let _permit = permit.await?;
            upload_chunk(chunk).await
        }
    })
    .collect();

futures::future::try_join_all(futures).await?;
```

### Streaming

```rust
// Stream large files instead of loading into memory
pub async fn push_file(path: &Path) -> Result<()> {
    let file = File::open(path).await?;
    let stream = ReaderStream::new(file);

    // Chunk on the fly
    let chunker = FastCDC::new();
    let chunk_stream = chunker.stream(stream);

    // Upload chunks as they're produced
    let mut uploaded = 0;
    pin_mut!(chunk_stream);
    while let Some(chunk) = chunk_stream.next().await {
        upload_chunk(chunk?).await?;
        uploaded += 1;
    }

    Ok(())
}
```

### Memory Management

```rust
// Use memory pools for frequent allocations
use bumpalo::Bump;

fn process_chunks(chunks: &[Chunk]) {
    let arena = Bump::new();

    for chunk in chunks {
        // Allocate from arena instead of heap
        let buffer = arena.alloc_slice_copy(&chunk.data);
        process(buffer);
    }
    // Arena deallocated in bulk here
}
```

---

## Monitoring Performance

### Key Metrics

```yaml
# prometheus-rules.yaml
groups:
  - name: performance
    rules:
      # API latency
      - record: dits:api_latency:p99
        expr: histogram_quantile(0.99, rate(dits_http_request_duration_seconds_bucket[5m]))

      # Chunk throughput
      - record: dits:chunk_upload_rate
        expr: rate(dits_chunks_uploaded_total[5m])

      # Cache hit rate
      - record: dits:cache_hit_rate
        expr: |
          rate(dits_cache_hits_total[5m]) /
          (rate(dits_cache_hits_total[5m]) + rate(dits_cache_misses_total[5m]))

      # Database query time
      - record: dits:db_query_time:p99
        expr: histogram_quantile(0.99, rate(dits_db_query_duration_seconds_bucket[5m]))
```

### Alerts

```yaml
alerts:
  - alert: HighAPILatency
    expr: dits:api_latency:p99 > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "API p99 latency > 1s"

  - alert: LowCacheHitRate
    expr: dits:cache_hit_rate < 0.8
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Cache hit rate below 80%"

  - alert: SlowDatabaseQueries
    expr: dits:db_query_time:p99 > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Database p99 query time > 100ms"
```

---

## Performance Checklist

### Pre-Production

- [ ] Connection pooling configured
- [ ] Database indexes created
- [ ] Cache warmed up
- [ ] CDN configured
- [ ] Compression enabled
- [ ] HTTP/2 enabled
- [ ] Load testing completed

### Ongoing

- [ ] Monitor p99 latencies
- [ ] Track cache hit rates
- [ ] Review slow query logs weekly
- [ ] Analyze chunk distribution
- [ ] Profile memory usage
- [ ] Check connection pool utilization

---

## Common Issues and Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| High latency | p99 > 1s | Check connection pools, add caching |
| OOM errors | Pods restarting | Increase limits, enable streaming |
| Slow queries | DB CPU high | Add indexes, optimize queries |
| Low throughput | Transfer slow | Enable parallel uploads, tune QUIC |
| Cache thrashing | Low hit rate | Increase cache size, review TTLs |

---

## Advanced Performance Optimizations

### io_uring for Linux (Kernel 5.1+)

io_uring provides asynchronous I/O with minimal syscall overhead:

```rust
use tokio_uring::fs::File;

/// io_uring-based chunk operations
pub async fn read_chunks_uring(hashes: &[[u8; 32]]) -> Result<Vec<Vec<u8>>> {
    tokio_uring::start(async {
        let futures: Vec<_> = hashes.iter()
            .map(|hash| async move {
                let path = chunk_path(hash);
                let file = File::open(&path).await?;

                // io_uring handles batching automatically
                let buf = vec![0u8; 256 * 1024];
                let (res, buf) = file.read_at(buf, 0).await;
                res?;
                Ok(buf)
            })
            .collect();

        futures::future::try_join_all(futures).await
    })
}
```

**io_uring Performance Benefits:**

| Operation | epoll latency | io_uring latency | Improvement |
|-----------|--------------|------------------|-------------|
| 4KB read | 15μs | 3μs | 5x |
| 64KB read | 45μs | 12μs | 3.75x |
| 1MB read | 350μs | 120μs | 3x |
| Batched reads (100x) | 1500μs | 200μs | 7.5x |

### Direct I/O (Bypass Page Cache)

For large chunk storage, bypass the page cache:

```rust
use std::os::unix::fs::OpenOptionsExt;

/// Open file with O_DIRECT for unbuffered I/O
pub fn open_direct(path: &Path) -> io::Result<File> {
    OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_DIRECT)
        .open(path)
}

// Buffer must be aligned to 512 bytes or filesystem block size
#[repr(align(4096))]
struct AlignedBuffer([u8; 4096]);
```

**When to use Direct I/O:**
- Large sequential reads/writes (chunk store)
- When data won't be re-read soon
- To avoid polluting page cache
- For predictable latency

**When NOT to use:**
- Small random I/O
- Frequently accessed metadata
- When OS caching improves performance

### Memory-Mapped I/O Optimization

```rust
use memmap2::{MmapOptions, MmapMut};

/// Memory-mapped chunk store
pub struct MmapChunkStore {
    mmap: MmapMut,
    // Index: hash -> (offset, size)
    index: HashMap<[u8; 32], (u64, u32)>,
}

impl MmapChunkStore {
    pub fn new(path: &Path, size: u64) -> Result<Self> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(path)?;

        file.set_len(size)?;

        let mmap = unsafe {
            MmapOptions::new()
                .len(size as usize)
                .map_mut(&file)?
        };

        // Advise kernel about access pattern
        #[cfg(unix)]
        unsafe {
            libc::madvise(
                mmap.as_ptr() as *mut libc::c_void,
                mmap.len(),
                libc::MADV_RANDOM,  // or MADV_SEQUENTIAL for streaming
            );
        }

        Ok(Self { mmap, index: HashMap::new() })
    }

    /// Read chunk with zero-copy
    pub fn get(&self, hash: &[u8; 32]) -> Option<&[u8]> {
        let (offset, size) = self.index.get(hash)?;
        Some(&self.mmap[*offset as usize..(*offset + *size as u64) as usize])
    }
}
```

### NUMA-Aware Memory Allocation

For multi-socket servers:

```rust
#[cfg(target_os = "linux")]
mod numa {
    use libc::{mbind, MPOL_BIND, MPOL_PREFERRED};

    /// Allocate memory on specific NUMA node
    pub fn alloc_on_node(size: usize, node: i32) -> *mut u8 {
        let ptr = unsafe {
            libc::mmap(
                std::ptr::null_mut(),
                size,
                libc::PROT_READ | libc::PROT_WRITE,
                libc::MAP_PRIVATE | libc::MAP_ANONYMOUS,
                -1,
                0,
            )
        };

        // Bind to NUMA node
        let nodemask: u64 = 1 << node;
        unsafe {
            mbind(
                ptr,
                size,
                MPOL_BIND,
                &nodemask as *const u64 as *const libc::c_ulong,
                64,
                0,
            );
        }

        ptr as *mut u8
    }

    /// Get current NUMA node
    pub fn current_node() -> i32 {
        unsafe { libc::numa_node_of_cpu(libc::sched_getcpu()) }
    }
}
```

### Lock-Free Data Structures

For high-concurrency chunk caching:

```rust
use crossbeam_skiplist::SkipMap;
use std::sync::atomic::{AtomicU64, Ordering};

/// Lock-free chunk cache
pub struct LockFreeChunkCache {
    // Skip list for ordered access and lock-free operations
    cache: SkipMap<[u8; 32], Arc<Vec<u8>>>,
    // Atomic counters for stats
    hits: AtomicU64,
    misses: AtomicU64,
    size: AtomicU64,
    max_size: u64,
}

impl LockFreeChunkCache {
    pub fn get(&self, hash: &[u8; 32]) -> Option<Arc<Vec<u8>>> {
        match self.cache.get(hash) {
            Some(entry) => {
                self.hits.fetch_add(1, Ordering::Relaxed);
                Some(entry.value().clone())
            }
            None => {
                self.misses.fetch_add(1, Ordering::Relaxed);
                None
            }
        }
    }

    pub fn insert(&self, hash: [u8; 32], data: Vec<u8>) {
        let size = data.len() as u64;

        // Evict if necessary (approximate, lock-free)
        while self.size.load(Ordering::Relaxed) + size > self.max_size {
            if let Some(entry) = self.cache.pop_front() {
                self.size.fetch_sub(entry.value().len() as u64, Ordering::Relaxed);
            }
        }

        self.cache.insert(hash, Arc::new(data));
        self.size.fetch_add(size, Ordering::Relaxed);
    }

    pub fn hit_rate(&self) -> f64 {
        let hits = self.hits.load(Ordering::Relaxed) as f64;
        let misses = self.misses.load(Ordering::Relaxed) as f64;
        hits / (hits + misses)
    }
}
```

### Batch Database Operations

```rust
/// Batch insert with PostgreSQL COPY
pub async fn batch_insert_chunks(
    pool: &PgPool,
    chunks: &[ChunkRecord],
) -> Result<()> {
    // COPY is 10-50x faster than INSERT
    let mut copy = pool.copy_in_raw(
        "COPY chunks (hash, size, created_at, storage_tier) FROM STDIN WITH (FORMAT binary)"
    ).await?;

    for chunk in chunks {
        // Write PostgreSQL binary format
        copy.write_all(&chunk.to_pg_binary()).await?;
    }

    copy.finish().await?;
    Ok(())
}

/// Batch existence check
pub async fn batch_exists(
    pool: &PgPool,
    hashes: &[[u8; 32]],
) -> Result<Vec<bool>> {
    // Use ANY instead of multiple queries
    let exists: Vec<[u8; 32]> = sqlx::query_scalar!(
        r#"
        SELECT hash FROM chunks
        WHERE hash = ANY($1)
        "#,
        &hashes[..]
    )
    .fetch_all(pool)
    .await?;

    let exists_set: HashSet<_> = exists.into_iter().collect();
    Ok(hashes.iter().map(|h| exists_set.contains(h)).collect())
}
```

### Compression Pipeline Optimization

```rust
/// Adaptive compression based on content
pub fn compress_adaptive(data: &[u8]) -> (Vec<u8>, Compression) {
    // Skip compression for already-compressed data
    if is_compressed(data) {
        return (data.to_vec(), Compression::None);
    }

    // Test compressibility on sample
    let sample = &data[..data.len().min(4096)];
    let test_compressed = zstd::encode_all(sample, 1).unwrap();

    let ratio = test_compressed.len() as f64 / sample.len() as f64;

    if ratio > 0.95 {
        // Not compressible
        (data.to_vec(), Compression::None)
    } else if ratio > 0.7 || data.len() < 16384 {
        // Use fast compression
        let compressed = lz4_flex::compress_prepend_size(data);
        (compressed, Compression::Lz4)
    } else {
        // Use zstd for good ratio
        let compressed = zstd::encode_all(data, 3).unwrap();
        (compressed, Compression::Zstd3)
    }
}

/// Parallel compression for multiple chunks
pub fn compress_parallel(chunks: &[Vec<u8>]) -> Vec<(Vec<u8>, Compression)> {
    use rayon::prelude::*;

    chunks.par_iter()
        .map(|data| compress_adaptive(data))
        .collect()
}
```

---

## Hardware-Specific Tuning

### NVMe Optimization

```toml
[storage.nvme]
# Queue depth for NVMe
queue_depth = 64
# I/O scheduler (none for NVMe)
scheduler = "none"
# Direct I/O for consistent latency
direct_io = true
```

```bash
# Linux NVMe tuning
echo 0 > /sys/block/nvme0n1/queue/iostats
echo none > /sys/block/nvme0n1/queue/scheduler
echo 1024 > /sys/block/nvme0n1/queue/nr_requests
```

### SSD Trim/Discard

```bash
# Enable discard for ext4
mount -o discard /dev/nvme0n1p1 /var/dits

# Or use periodic fstrim
systemctl enable fstrim.timer
```

### Network Interface Tuning

```bash
# Increase ring buffer size
ethtool -G eth0 rx 4096 tx 4096

# Enable receive-side scaling (RSS)
ethtool -L eth0 combined 16

# Enable TCP segmentation offload
ethtool -K eth0 tso on gso on gro on

# Interrupt coalescing for throughput
ethtool -C eth0 adaptive-rx on adaptive-tx on
```

---

## Workload-Specific Tuning

### High-Throughput (Video Ingest)

```toml
[performance.ingest]
# Larger chunks for sequential writes
chunk_size = "4MB"
# High concurrency
upload_concurrency = 32
# Streaming without buffering
stream_buffer_size = "64MB"
# Disable dedup during ingest, run later
dedup_on_write = false
```

### Low-Latency (Interactive)

```toml
[performance.interactive]
# Smaller chunks for faster first byte
chunk_size = "256KB"
# Aggressive caching
cache_size = "50GB"
# Prefetch likely chunks
prefetch_enabled = true
prefetch_depth = 5
# Use memory-mapped I/O
mmap_enabled = true
```

### Balanced (General Use)

```toml
[performance.balanced]
chunk_size = "1MB"
upload_concurrency = 8
cache_size = "10GB"
prefetch_enabled = true
prefetch_depth = 2
```

---

## Performance Regression Testing

```yaml
# .github/workflows/perf-test.yml
name: Performance Regression

on:
  pull_request:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run benchmarks
        run: cargo bench --bench chunk_throughput -- --save-baseline pr

      - name: Compare with main
        run: |
          git checkout main
          cargo bench --bench chunk_throughput -- --baseline main
          cargo bench --bench chunk_throughput -- --compare pr main

      - name: Fail if regression > 10%
        run: |
          cargo bench --bench chunk_throughput -- --compare pr main --threshold 10
```

---

## Notes

- Benchmark before and after changes
- Change one thing at a time
- Monitor for regressions
- Document all tuning parameters
- Review performance weekly
- Plan capacity 3-6 months ahead
- Use profiling tools (perf, flamegraphs) for bottleneck analysis
- Consider workload characteristics when tuning

