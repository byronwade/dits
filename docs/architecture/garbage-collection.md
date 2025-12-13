# Garbage Collection Architecture

**Project:** Dits (Data-Intensive Version Control System)
**Document:** Orphan Chunk Detection and Garbage Collection
**Objective:** Safely reclaim storage from unreferenced chunks without risking data loss, while maintaining performance at petabyte scale.

---

## The Problem: Orphan Chunks

Chunks become orphaned when:
1. **Commit deletion:** Old commits are pruned (history truncation)
2. **Branch deletion:** Entire branch history removed
3. **Force push:** Commits replaced with rewritten history
4. **Failed uploads:** Partial ingest leaves unreferenced chunks
5. **Stash expiration:** Old stashes cleaned up

Without GC, storage grows unbounded even after "deleting" old versions.

---

## Core Principles

### 1. Safety First
- **Never delete referenced chunks** — data loss is unrecoverable
- **Grace period** — chunks must be orphaned for N days before deletion
- **Dry-run mode** — preview what would be deleted
- **Audit trail** — log all deletions for forensics

### 2. Performance
- **Incremental GC** — don't scan entire object store each run
- **Bloom filters** — probabilistic existence checks
- **Parallel scanning** — utilize multiple cores
- **Low priority** — yield to active operations

### 3. Consistency
- **Atomic reference counting** — no race conditions
- **Distributed coordination** — multi-server safety
- **Crash recovery** — GC state survives restarts

---

## Reference Counting Architecture

### Reference Sources

Chunks can be referenced by:

```rust
pub enum ReferenceSource {
    // Primary references
    Commit {
        commit_hash: CommitHash,
        repo_id: RepoId,
    },

    // Working state references
    StagingArea {
        user_id: UserId,
        repo_id: RepoId,
    },

    // Saved work-in-progress
    Stash {
        stash_id: Uuid,
        user_id: UserId,
    },

    // Named references
    Tag {
        tag_name: String,
        repo_id: RepoId,
    },

    // In-flight uploads
    PendingUpload {
        upload_id: Uuid,
        started_at: DateTime<Utc>,
        expires_at: DateTime<Utc>,
    },

    // Cache entries (soft reference)
    Cache {
        cache_tier: CacheTier,  // L1, L2
        expires_at: DateTime<Utc>,
    },
}

pub struct ChunkReference {
    pub chunk_hash: ChunkHash,
    pub ref_count: u32,
    pub references: Vec<ReferenceSource>,
    pub created_at: DateTime<Utc>,
    pub last_accessed_at: DateTime<Utc>,
}
```

### Database Schema

```sql
-- Chunk metadata and reference count
CREATE TABLE chunks (
    hash TEXT PRIMARY KEY,
    size_bytes BIGINT NOT NULL,
    compressed_size BIGINT,
    ref_count INT NOT NULL DEFAULT 1,
    storage_class TEXT DEFAULT 'HOT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,  -- Soft delete timestamp
    gc_protected_until TIMESTAMPTZ  -- Grace period
);

-- Detailed reference tracking (for debugging/forensics)
CREATE TABLE chunk_references (
    chunk_hash TEXT REFERENCES chunks(hash),
    source_type TEXT NOT NULL,  -- 'commit', 'stash', 'tag', etc.
    source_id TEXT NOT NULL,     -- Commit hash, stash ID, etc.
    repo_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (chunk_hash, source_type, source_id)
);

-- GC run history
CREATE TABLE gc_runs (
    id UUID PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL,  -- 'running', 'completed', 'failed'
    chunks_scanned BIGINT DEFAULT 0,
    chunks_deleted BIGINT DEFAULT 0,
    bytes_reclaimed BIGINT DEFAULT 0,
    error_message TEXT,
    dry_run BOOLEAN DEFAULT FALSE
);

-- Pending deletions (two-phase delete)
CREATE TABLE gc_pending_deletions (
    chunk_hash TEXT PRIMARY KEY,
    marked_at TIMESTAMPTZ NOT NULL,
    delete_after TIMESTAMPTZ NOT NULL,  -- Grace period expiry
    gc_run_id UUID REFERENCES gc_runs(id)
);

-- Indexes for GC queries
CREATE INDEX idx_chunks_ref_count ON chunks(ref_count) WHERE ref_count = 0;
CREATE INDEX idx_chunks_gc_protected ON chunks(gc_protected_until) WHERE gc_protected_until IS NOT NULL;
CREATE INDEX idx_pending_deletions_delete_after ON gc_pending_deletions(delete_after);
```

---

## Reference Counting Operations

### Increment Reference (On Commit/Upload)

```rust
pub async fn increment_ref(
    chunk_hash: &ChunkHash,
    source: ReferenceSource,
    db: &Pool,
) -> Result<()> {
    let mut tx = db.begin().await?;

    // Increment ref count atomically
    sqlx::query!(
        r#"
        UPDATE chunks
        SET ref_count = ref_count + 1,
            last_accessed_at = NOW(),
            gc_protected_until = NULL,  -- Remove any pending deletion
            deleted_at = NULL           -- Resurrect if soft-deleted
        WHERE hash = $1
        "#,
        chunk_hash.as_str()
    )
    .execute(&mut tx)
    .await?;

    // Record reference source
    sqlx::query!(
        r#"
        INSERT INTO chunk_references (chunk_hash, source_type, source_id, repo_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
        "#,
        chunk_hash.as_str(),
        source.type_name(),
        source.id(),
        source.repo_id()
    )
    .execute(&mut tx)
    .await?;

    // Remove from pending deletions if present
    sqlx::query!(
        "DELETE FROM gc_pending_deletions WHERE chunk_hash = $1",
        chunk_hash.as_str()
    )
    .execute(&mut tx)
    .await?;

    tx.commit().await?;
    Ok(())
}
```

### Decrement Reference (On Commit Delete/Prune)

```rust
pub async fn decrement_ref(
    chunk_hash: &ChunkHash,
    source: ReferenceSource,
    db: &Pool,
) -> Result<()> {
    let mut tx = db.begin().await?;

    // Remove reference record
    sqlx::query!(
        r#"
        DELETE FROM chunk_references
        WHERE chunk_hash = $1 AND source_type = $2 AND source_id = $3
        "#,
        chunk_hash.as_str(),
        source.type_name(),
        source.id()
    )
    .execute(&mut tx)
    .await?;

    // Decrement ref count atomically, but never below 0
    let result = sqlx::query!(
        r#"
        UPDATE chunks
        SET ref_count = GREATEST(ref_count - 1, 0)
        WHERE hash = $1
        RETURNING ref_count
        "#,
        chunk_hash.as_str()
    )
    .fetch_one(&mut tx)
    .await?;

    // If ref_count is now 0, mark for grace period
    if result.ref_count == 0 {
        let grace_period = Duration::days(GRACE_PERIOD_DAYS);
        sqlx::query!(
            r#"
            UPDATE chunks
            SET gc_protected_until = NOW() + $2::interval
            WHERE hash = $1
            "#,
            chunk_hash.as_str(),
            grace_period.to_std()?.as_secs() as i64
        )
        .execute(&mut tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}
```

---

## GC Algorithms

### Algorithm 1: Reference Count GC (Default)

Simple and fast — relies on accurate ref counting.

```rust
pub async fn gc_by_ref_count(
    config: &GcConfig,
    db: &Pool,
    storage: &ObjectStore,
) -> Result<GcResult> {
    let run_id = Uuid::new_v4();
    let mut result = GcResult::default();

    // Start GC run
    record_gc_start(&run_id, config.dry_run, db).await?;

    // Phase 1: Mark orphans (ref_count = 0, grace period expired)
    let orphans = sqlx::query_as!(
        OrphanChunk,
        r#"
        SELECT hash, size_bytes
        FROM chunks
        WHERE ref_count = 0
          AND gc_protected_until < NOW()
          AND deleted_at IS NULL
        LIMIT $1
        "#,
        config.batch_size as i64
    )
    .fetch_all(db)
    .await?;

    result.chunks_scanned = orphans.len();

    if config.dry_run {
        // Just report what would be deleted
        for orphan in &orphans {
            log::info!("Would delete: {} ({} bytes)", orphan.hash, orphan.size_bytes);
            result.bytes_would_reclaim += orphan.size_bytes;
        }
        return Ok(result);
    }

    // Phase 2: Delete from storage
    for orphan in &orphans {
        // Double-check ref count before delete (race condition protection)
        let current = sqlx::query!(
            "SELECT ref_count FROM chunks WHERE hash = $1 FOR UPDATE",
            orphan.hash
        )
        .fetch_one(db)
        .await?;

        if current.ref_count > 0 {
            log::warn!("Chunk {} resurrected, skipping", orphan.hash);
            continue;
        }

        // Delete from object store
        match storage.delete(&orphan.hash).await {
            Ok(_) => {
                // Soft delete in database
                sqlx::query!(
                    "UPDATE chunks SET deleted_at = NOW() WHERE hash = $1",
                    orphan.hash
                )
                .execute(db)
                .await?;

                result.chunks_deleted += 1;
                result.bytes_reclaimed += orphan.size_bytes;
            }
            Err(e) => {
                log::error!("Failed to delete chunk {}: {}", orphan.hash, e);
                result.errors.push(GcError {
                    chunk_hash: orphan.hash.clone(),
                    error: e.to_string(),
                });
            }
        }
    }

    // Record completion
    record_gc_complete(&run_id, &result, db).await?;

    Ok(result)
}
```

### Algorithm 2: Mark-and-Sweep (Full Scan)

Slower but self-correcting — doesn't rely on ref counting accuracy.

```rust
pub async fn gc_mark_and_sweep(
    config: &GcConfig,
    db: &Pool,
    storage: &ObjectStore,
) -> Result<GcResult> {
    let run_id = Uuid::new_v4();
    record_gc_start(&run_id, config.dry_run, db).await?;

    // Phase 1: Mark all reachable chunks
    let mut reachable: HashSet<ChunkHash> = HashSet::new();

    // Walk all commits
    let commits = db.get_all_commits().await?;
    for commit in commits {
        let manifest = db.get_manifest(&commit.hash).await?;
        for (_, asset) in manifest.assets {
            for chunk_hash in asset.chunks {
                reachable.insert(chunk_hash);
            }
        }
    }

    // Walk all stashes
    let stashes = db.get_all_stashes().await?;
    for stash in stashes {
        for change in stash.changes {
            for chunk_hash in change.chunks {
                reachable.insert(chunk_hash);
            }
        }
    }

    // Walk pending uploads (active for < 24h)
    let pending = db.get_pending_uploads().await?;
    for upload in pending {
        for chunk_hash in upload.chunks {
            reachable.insert(chunk_hash);
        }
    }

    log::info!("Marked {} reachable chunks", reachable.len());

    // Phase 2: Sweep unreachable chunks
    let all_chunks = storage.list_all_chunks().await?;
    let mut result = GcResult::default();

    for chunk in all_chunks {
        result.chunks_scanned += 1;

        if !reachable.contains(&chunk.hash) {
            // Check grace period
            let metadata = db.get_chunk_metadata(&chunk.hash).await?;

            if let Some(protected_until) = metadata.gc_protected_until {
                if protected_until > Utc::now() {
                    continue; // Still in grace period
                }
            } else {
                // First time seeing this orphan, start grace period
                db.set_gc_protected_until(
                    &chunk.hash,
                    Utc::now() + Duration::days(GRACE_PERIOD_DAYS)
                ).await?;
                continue;
            }

            // Grace period expired, safe to delete
            if !config.dry_run {
                storage.delete(&chunk.hash).await?;
                db.mark_deleted(&chunk.hash).await?;
                result.bytes_reclaimed += chunk.size;
            }
            result.chunks_deleted += 1;
        }
    }

    record_gc_complete(&run_id, &result, db).await?;
    Ok(result)
}
```

### Algorithm 3: Generational GC

Optimized for typical usage patterns — recent chunks unlikely to be orphaned.

```rust
pub struct GenerationalGc {
    // Generations:
    // - Gen0 (Nursery): Chunks < 1 day old, never GC'd
    // - Gen1 (Young): Chunks 1-7 days old, GC'd daily
    // - Gen2 (Old): Chunks > 7 days old, GC'd weekly
    generations: Vec<Generation>,
}

pub struct Generation {
    pub name: String,
    pub min_age: Duration,
    pub max_age: Duration,
    pub gc_frequency: Duration,
    pub last_gc: DateTime<Utc>,
}

impl GenerationalGc {
    pub async fn run(&mut self, db: &Pool, storage: &ObjectStore) -> Result<GcResult> {
        let mut total_result = GcResult::default();

        for gen in &mut self.generations {
            // Skip if not time for this generation's GC
            if Utc::now() - gen.last_gc < gen.gc_frequency {
                continue;
            }

            log::info!("Running GC for generation: {}", gen.name);

            // Find orphans in this generation
            let orphans = sqlx::query_as!(
                OrphanChunk,
                r#"
                SELECT hash, size_bytes
                FROM chunks
                WHERE ref_count = 0
                  AND created_at BETWEEN NOW() - $1::interval AND NOW() - $2::interval
                  AND gc_protected_until < NOW()
                  AND deleted_at IS NULL
                "#,
                gen.max_age.num_seconds(),
                gen.min_age.num_seconds()
            )
            .fetch_all(db)
            .await?;

            // Delete orphans
            for orphan in orphans {
                storage.delete(&orphan.hash).await?;
                db.mark_deleted(&orphan.hash).await?;
                total_result.chunks_deleted += 1;
                total_result.bytes_reclaimed += orphan.size_bytes;
            }

            gen.last_gc = Utc::now();
        }

        Ok(total_result)
    }
}
```

---

## Distributed GC Coordination

For multi-server deployments, prevent concurrent GC runs:

```rust
pub struct DistributedGcLock {
    redis: RedisClient,
    lock_key: String,
    lock_ttl: Duration,
    node_id: String,
}

impl DistributedGcLock {
    pub async fn acquire(&self) -> Result<Option<GcLockGuard>> {
        // Try to acquire lock with Redlock
        let result = self.redis.set_nx(
            &self.lock_key,
            &self.node_id,
            Some(self.lock_ttl)
        ).await?;

        if result {
            Ok(Some(GcLockGuard {
                redis: self.redis.clone(),
                lock_key: self.lock_key.clone(),
                node_id: self.node_id.clone(),
            }))
        } else {
            // Another node is running GC
            let holder = self.redis.get(&self.lock_key).await?;
            log::info!("GC lock held by node: {}", holder);
            Ok(None)
        }
    }
}

pub struct GcLockGuard {
    redis: RedisClient,
    lock_key: String,
    node_id: String,
}

impl Drop for GcLockGuard {
    fn drop(&mut self) {
        // Release lock only if we still own it (Lua script for atomicity)
        let script = r#"
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        "#;
        // Execute script asynchronously
        tokio::spawn({
            let redis = self.redis.clone();
            let key = self.lock_key.clone();
            let node = self.node_id.clone();
            async move {
                let _ = redis.eval(script, &[&key], &[&node]).await;
            }
        });
    }
}
```

---

## GC Safety Mechanisms

### 1. Grace Period

Chunks must be orphaned for a configurable period before deletion:

```rust
pub struct GcConfig {
    // How long to wait before deleting orphaned chunks
    pub grace_period: Duration,  // Default: 7 days

    // How often to run GC
    pub run_interval: Duration,  // Default: 1 hour

    // Maximum chunks to process per run
    pub batch_size: usize,  // Default: 10,000

    // Dry run mode (don't actually delete)
    pub dry_run: bool,

    // Minimum free space before GC triggers
    pub min_free_space_percent: f32,  // Default: 10%
}

impl Default for GcConfig {
    fn default() -> Self {
        Self {
            grace_period: Duration::days(7),
            run_interval: Duration::hours(1),
            batch_size: 10_000,
            dry_run: false,
            min_free_space_percent: 10.0,
        }
    }
}
```

### 2. Resurrection Protection

If a chunk is re-referenced during grace period, cancel deletion:

```rust
pub async fn check_resurrection(
    chunk_hash: &ChunkHash,
    db: &Pool,
) -> Result<bool> {
    let result = sqlx::query!(
        "SELECT ref_count FROM chunks WHERE hash = $1",
        chunk_hash.as_str()
    )
    .fetch_one(db)
    .await?;

    if result.ref_count > 0 {
        // Chunk was resurrected, remove from pending deletions
        sqlx::query!(
            "DELETE FROM gc_pending_deletions WHERE chunk_hash = $1",
            chunk_hash.as_str()
        )
        .execute(db)
        .await?;

        return Ok(true);  // Resurrected
    }

    Ok(false)  // Still orphaned
}
```

### 3. Audit Trail

Log all GC operations for forensics:

```rust
pub struct GcAuditEntry {
    pub timestamp: DateTime<Utc>,
    pub run_id: Uuid,
    pub action: GcAction,
    pub chunk_hash: ChunkHash,
    pub chunk_size: u64,
    pub previous_refs: Vec<ReferenceSource>,
    pub reason: String,
}

pub enum GcAction {
    Marked,         // Marked for deletion
    Deleted,        // Actually deleted
    Resurrected,    // Reference added during grace period
    Skipped,        // Skipped (still referenced)
    Error,          // Deletion failed
}

pub async fn audit_gc_deletion(
    entry: &GcAuditEntry,
    db: &Pool,
) -> Result<()> {
    sqlx::query!(
        r#"
        INSERT INTO gc_audit_log
        (timestamp, run_id, action, chunk_hash, chunk_size, previous_refs, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        entry.timestamp,
        entry.run_id,
        entry.action.to_string(),
        entry.chunk_hash.as_str(),
        entry.chunk_size as i64,
        serde_json::to_value(&entry.previous_refs)?,
        entry.reason
    )
    .execute(db)
    .await?;

    Ok(())
}
```

### 4. Soft Delete with Recovery Window

Don't immediately remove from database — allow recovery:

```rust
pub async fn soft_delete_chunk(
    chunk_hash: &ChunkHash,
    db: &Pool,
) -> Result<()> {
    sqlx::query!(
        r#"
        UPDATE chunks
        SET deleted_at = NOW(),
            storage_deleted = FALSE  -- Mark for storage cleanup
        WHERE hash = $1
        "#,
        chunk_hash.as_str()
    )
    .execute(db)
    .await?;

    Ok(())
}

// Separate job purges soft-deleted records after recovery window
pub async fn purge_soft_deleted(
    recovery_window: Duration,  // e.g., 30 days
    db: &Pool,
) -> Result<u64> {
    let result = sqlx::query!(
        r#"
        DELETE FROM chunks
        WHERE deleted_at IS NOT NULL
          AND deleted_at < NOW() - $1::interval
          AND storage_deleted = TRUE
        "#,
        recovery_window.num_seconds()
    )
    .execute(db)
    .await?;

    Ok(result.rows_affected())
}
```

---

## GC Scheduling

### Cron-Based Scheduling

```rust
pub struct GcScheduler {
    config: GcConfig,
    last_run: Option<DateTime<Utc>>,
}

impl GcScheduler {
    pub async fn maybe_run(
        &mut self,
        db: &Pool,
        storage: &ObjectStore,
    ) -> Result<Option<GcResult>> {
        // Check if it's time to run
        if let Some(last) = self.last_run {
            if Utc::now() - last < self.config.run_interval {
                return Ok(None);  // Not yet
            }
        }

        // Check if storage pressure requires GC
        let storage_stats = storage.get_stats().await?;
        let free_percent = storage_stats.free_bytes as f32
            / storage_stats.total_bytes as f32 * 100.0;

        if free_percent > self.config.min_free_space_percent {
            // No pressure, run light GC
            self.config.batch_size = 1_000;
        } else {
            // Pressure! Run aggressive GC
            self.config.batch_size = 100_000;
            log::warn!("Storage pressure detected ({}% free), running aggressive GC", free_percent);
        }

        // Acquire distributed lock
        let lock = DistributedGcLock::new().acquire().await?;
        if lock.is_none() {
            return Ok(None);  // Another node running GC
        }

        // Run GC
        let result = gc_by_ref_count(&self.config, db, storage).await?;
        self.last_run = Some(Utc::now());

        Ok(Some(result))
    }
}
```

### Event-Triggered GC

```rust
pub enum GcTrigger {
    // Time-based
    Scheduled,

    // Storage pressure
    LowDiskSpace { threshold_percent: f32 },

    // Administrative
    ManualRequest { user_id: UserId },

    // Post-operation
    AfterBranchDelete { branch_name: String },
    AfterCommitPrune { commits_pruned: u32 },
}

pub async fn handle_gc_trigger(
    trigger: GcTrigger,
    db: &Pool,
    storage: &ObjectStore,
) -> Result<GcResult> {
    let config = match trigger {
        GcTrigger::LowDiskSpace { .. } => {
            // Aggressive GC for disk pressure
            GcConfig {
                grace_period: Duration::hours(24),  // Shorter grace
                batch_size: 100_000,
                ..Default::default()
            }
        }
        GcTrigger::ManualRequest { .. } => {
            // Respect normal grace period for manual runs
            GcConfig::default()
        }
        GcTrigger::AfterBranchDelete { .. } | GcTrigger::AfterCommitPrune { .. } => {
            // Quick cleanup after bulk operations
            GcConfig {
                batch_size: 50_000,
                ..Default::default()
            }
        }
        _ => GcConfig::default(),
    };

    gc_by_ref_count(&config, db, storage).await
}
```

---

## CLI Commands

```bash
# Manual GC
$ dits gc
Running garbage collection...
Scanned: 150,000 chunks
Deleted: 2,341 chunks
Reclaimed: 45.2 GB
Duration: 3m 24s

# Dry run (preview)
$ dits gc --dry-run
[DRY RUN] Would delete 2,341 chunks (45.2 GB)
Top orphan sources:
  - Deleted branch 'feature/old': 1,200 chunks (20 GB)
  - Pruned commits older than 90d: 800 chunks (15 GB)
  - Failed uploads: 341 chunks (10.2 GB)

# Force aggressive GC
$ dits gc --aggressive
Running aggressive garbage collection...
Grace period reduced to 24 hours
Batch size increased to 100,000
...

# GC status
$ dits gc status
Last run: 2 hours ago
Next scheduled: in 58 minutes
Orphaned chunks: 5,234 (pending grace period)
Storage reclaimable: 89.5 GB
GC lock: Not held

# View GC history
$ dits gc history
Run ID       | Date       | Deleted | Reclaimed | Duration
-------------|------------|---------|-----------|----------
abc123       | 2025-01-15 | 2,341   | 45.2 GB   | 3m 24s
def456       | 2025-01-14 | 1,892   | 32.1 GB   | 2m 51s
...

# Configure GC
$ dits config gc.grace-period 14d
$ dits config gc.run-interval 2h
$ dits config gc.batch-size 50000
```

---

## Monitoring & Alerts

### Metrics

```rust
pub struct GcMetrics {
    // Counters
    pub gc_runs_total: Counter,
    pub gc_chunks_deleted_total: Counter,
    pub gc_bytes_reclaimed_total: Counter,
    pub gc_errors_total: Counter,

    // Gauges
    pub gc_orphaned_chunks: Gauge,
    pub gc_reclaimable_bytes: Gauge,
    pub gc_last_run_timestamp: Gauge,
    pub gc_duration_seconds: Histogram,
}

// Prometheus metrics example
gc_runs_total{status="success"} 142
gc_runs_total{status="failed"} 2
gc_chunks_deleted_total 45892
gc_bytes_reclaimed_total 1.2e12
gc_orphaned_chunks 5234
gc_reclaimable_bytes 8.95e10
gc_last_run_timestamp 1705312800
gc_duration_seconds_bucket{le="60"} 120
gc_duration_seconds_bucket{le="300"} 140
gc_duration_seconds_bucket{le="600"} 142
```

### Alerts

```yaml
# Alert rules
groups:
  - name: dits-gc
    rules:
      # GC hasn't run in 24 hours
      - alert: GcNotRunning
        expr: time() - gc_last_run_timestamp > 86400
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "GC hasn't run in 24 hours"

      # High orphan count
      - alert: HighOrphanCount
        expr: gc_orphaned_chunks > 100000
        for: 4h
        labels:
          severity: warning
        annotations:
          summary: "Over 100k orphaned chunks pending cleanup"

      # GC taking too long
      - alert: GcSlowRun
        expr: gc_duration_seconds > 1800
        labels:
          severity: warning
        annotations:
          summary: "GC run exceeded 30 minutes"

      # Storage pressure
      - alert: HighReclaimableStorage
        expr: gc_reclaimable_bytes / storage_total_bytes > 0.2
        for: 24h
        labels:
          severity: warning
        annotations:
          summary: "Over 20% of storage is reclaimable"
```

---

## Performance Optimization

### Bloom Filter for Existence Checks

```rust
pub struct ChunkExistenceFilter {
    filter: Bloom<ChunkHash>,
    last_rebuild: DateTime<Utc>,
    rebuild_interval: Duration,
}

impl ChunkExistenceFilter {
    pub fn new(expected_items: usize, fp_rate: f64) -> Self {
        Self {
            filter: Bloom::new_for_fp_rate(expected_items, fp_rate),
            last_rebuild: Utc::now(),
            rebuild_interval: Duration::hours(6),
        }
    }

    pub async fn maybe_contains(&self, hash: &ChunkHash) -> bool {
        self.filter.check(hash)  // Fast, may have false positives
    }

    pub async fn rebuild(&mut self, db: &Pool) -> Result<()> {
        let mut new_filter = Bloom::new_for_fp_rate(
            self.filter.number_of_items() * 2,
            0.01  // 1% false positive rate
        );

        // Stream all chunk hashes
        let mut stream = db.stream_all_chunk_hashes().await?;
        while let Some(hash) = stream.next().await {
            new_filter.set(&hash?);
        }

        self.filter = new_filter;
        self.last_rebuild = Utc::now();
        Ok(())
    }
}

// Usage in reference decrement
pub async fn optimized_decrement_ref(
    chunk_hash: &ChunkHash,
    bloom: &ChunkExistenceFilter,
    db: &Pool,
) -> Result<()> {
    // Quick check: is this even a known chunk?
    if !bloom.maybe_contains(chunk_hash) {
        // Definitely doesn't exist, skip DB query
        return Ok(());
    }

    // Bloom says maybe, do actual decrement
    decrement_ref(chunk_hash, db).await
}
```

### Parallel Deletion

```rust
pub async fn parallel_delete_chunks(
    chunks: Vec<ChunkHash>,
    storage: &ObjectStore,
    parallelism: usize,
) -> Result<Vec<DeletionResult>> {
    let semaphore = Arc::new(Semaphore::new(parallelism));
    let results = Arc::new(Mutex::new(Vec::new()));

    let tasks: Vec<_> = chunks
        .into_iter()
        .map(|hash| {
            let sem = semaphore.clone();
            let store = storage.clone();
            let results = results.clone();

            tokio::spawn(async move {
                let _permit = sem.acquire().await?;
                let result = store.delete(&hash).await;

                results.lock().await.push(DeletionResult {
                    hash,
                    success: result.is_ok(),
                    error: result.err().map(|e| e.to_string()),
                });

                Ok::<_, Error>(())
            })
        })
        .collect();

    futures::future::try_join_all(tasks).await?;

    Ok(Arc::try_unwrap(results).unwrap().into_inner())
}
```

---

## Disaster Recovery

### Accidental Mass Deletion Recovery

If ref counting bug causes mass orphaning:

```rust
pub async fn emergency_gc_halt(db: &Pool) -> Result<()> {
    // 1. Stop all GC runs
    sqlx::query!("UPDATE gc_config SET enabled = FALSE").execute(db).await?;

    // 2. Cancel pending deletions
    sqlx::query!("DELETE FROM gc_pending_deletions").execute(db).await?;

    // 3. Alert operations team
    alert_ops("EMERGENCY: GC halted due to mass orphan detection").await?;

    Ok(())
}

pub async fn recover_soft_deleted(
    since: DateTime<Utc>,
    db: &Pool,
) -> Result<u64> {
    // Restore chunks soft-deleted after the given time
    let result = sqlx::query!(
        r#"
        UPDATE chunks
        SET deleted_at = NULL,
            ref_count = 1,  -- Conservative, will be corrected by mark-sweep
            gc_protected_until = NOW() + INTERVAL '30 days'
        WHERE deleted_at > $1
          AND storage_deleted = FALSE
        "#,
        since
    )
    .execute(db)
    .await?;

    Ok(result.rows_affected())
}
```

### Full Rebuild from Object Store

If database is corrupted, rebuild from storage:

```rust
pub async fn rebuild_chunk_index(
    storage: &ObjectStore,
    db: &Pool,
) -> Result<RebuildResult> {
    let mut result = RebuildResult::default();

    // List all objects in storage
    let objects = storage.list_all().await?;

    for object in objects {
        // Extract hash from path
        let hash = ChunkHash::from_storage_path(&object.key)?;

        // Upsert into database
        sqlx::query!(
            r#"
            INSERT INTO chunks (hash, size_bytes, ref_count, created_at)
            VALUES ($1, $2, 0, $3)
            ON CONFLICT (hash) DO UPDATE SET size_bytes = $2
            "#,
            hash.as_str(),
            object.size as i64,
            object.last_modified
        )
        .execute(db)
        .await?;

        result.chunks_indexed += 1;
    }

    // Now rebuild reference counts from commits
    rebuild_ref_counts(db).await?;

    Ok(result)
}
```

---

## Summary

| Component | Implementation |
| :--- | :--- |
| Reference counting | Atomic increment/decrement with DB transactions |
| Orphan detection | ref_count = 0 with grace period |
| Deletion | Two-phase: soft delete → storage delete → purge |
| Distributed safety | Redis-based distributed lock |
| Performance | Bloom filters, parallel deletion, generational GC |
| Recovery | Soft delete window, emergency halt, full rebuild |
| Monitoring | Prometheus metrics, alerting rules |
