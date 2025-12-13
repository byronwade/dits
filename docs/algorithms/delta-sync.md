# Delta Sync Algorithm

Efficient synchronization using content-defined chunking and delta compression.

---

## Overview

Delta sync minimizes data transfer by:
1. Comparing chunk manifests to identify differences
2. Transferring only new/modified chunks
3. Using delta compression for similar chunks
4. Pipelining transfers for maximum throughput

---

## Sync Modes

### Full Sync
Transfer all missing chunks. Used for:
- Initial clone
- Large divergence
- Corruption recovery

### Incremental Sync
Transfer only changes since last sync. Used for:
- Regular push/pull
- Real-time collaboration

### Delta Sync
Transfer compressed differences. Used for:
- Minor edits to large files
- Bandwidth-constrained environments

---

## Algorithm Components

### 1. Manifest Comparison

```rust
/// Compare two manifests to determine sync requirements
pub struct ManifestDiff {
    /// Files added in target
    pub added: Vec<FileDiff>,

    /// Files removed in target
    pub removed: Vec<String>,

    /// Files modified in target
    pub modified: Vec<FileDiff>,

    /// Files unchanged
    pub unchanged: Vec<String>,

    /// Total bytes to transfer
    pub transfer_bytes: u64,

    /// Estimated savings from dedup
    pub dedup_savings: u64,
}

#[derive(Debug, Clone)]
pub struct FileDiff {
    pub path: String,
    pub old_size: Option<u64>,
    pub new_size: u64,
    pub chunks_added: Vec<ChunkRef>,
    pub chunks_removed: Vec<ChunkRef>,
    pub chunks_unchanged: Vec<ChunkRef>,
}

impl ManifestDiff {
    /// Compute difference between source and target manifests
    pub fn compute(source: &Manifest, target: &Manifest) -> Self {
        let source_files: HashMap<&str, &ManifestEntry> = source.entries
            .iter()
            .map(|e| (e.path.as_str(), e))
            .collect();

        let target_files: HashMap<&str, &ManifestEntry> = target.entries
            .iter()
            .map(|e| (e.path.as_str(), e))
            .collect();

        let mut added = Vec::new();
        let mut removed = Vec::new();
        let mut modified = Vec::new();
        let mut unchanged = Vec::new();
        let mut transfer_bytes = 0u64;
        let mut dedup_savings = 0u64;

        // Find added and modified files
        for (path, target_entry) in &target_files {
            match source_files.get(path) {
                None => {
                    // New file
                    let diff = FileDiff {
                        path: path.to_string(),
                        old_size: None,
                        new_size: target_entry.size,
                        chunks_added: target_entry.chunks.clone(),
                        chunks_removed: Vec::new(),
                        chunks_unchanged: Vec::new(),
                    };
                    transfer_bytes += target_entry.size;
                    added.push(diff);
                }
                Some(source_entry) => {
                    if source_entry.content_hash == target_entry.content_hash {
                        // Unchanged
                        unchanged.push(path.to_string());
                    } else {
                        // Modified - compute chunk diff
                        let diff = compute_chunk_diff(source_entry, target_entry);
                        transfer_bytes += diff.chunks_added.iter()
                            .map(|c| c.size as u64)
                            .sum::<u64>();
                        dedup_savings += diff.chunks_unchanged.iter()
                            .map(|c| c.size as u64)
                            .sum::<u64>();
                        modified.push(diff);
                    }
                }
            }
        }

        // Find removed files
        for path in source_files.keys() {
            if !target_files.contains_key(path) {
                removed.push(path.to_string());
            }
        }

        Self {
            added,
            removed,
            modified,
            unchanged,
            transfer_bytes,
            dedup_savings,
        }
    }
}

/// Compute chunk-level diff for a modified file
fn compute_chunk_diff(source: &ManifestEntry, target: &ManifestEntry) -> FileDiff {
    let source_chunks: HashSet<[u8; 32]> = source.chunks
        .iter()
        .map(|c| c.hash)
        .collect();

    let target_chunks: HashSet<[u8; 32]> = target.chunks
        .iter()
        .map(|c| c.hash)
        .collect();

    let chunks_added: Vec<_> = target.chunks
        .iter()
        .filter(|c| !source_chunks.contains(&c.hash))
        .cloned()
        .collect();

    let chunks_removed: Vec<_> = source.chunks
        .iter()
        .filter(|c| !target_chunks.contains(&c.hash))
        .cloned()
        .collect();

    let chunks_unchanged: Vec<_> = target.chunks
        .iter()
        .filter(|c| source_chunks.contains(&c.hash))
        .cloned()
        .collect();

    FileDiff {
        path: target.path.clone(),
        old_size: Some(source.size),
        new_size: target.size,
        chunks_added,
        chunks_removed,
        chunks_unchanged,
    }
}
```

### 2. Chunk Existence Check

```rust
/// Bloom filter for fast chunk existence check
pub struct ChunkBloomFilter {
    /// Bit array
    bits: BitVec,

    /// Number of hash functions
    num_hashes: u8,

    /// Number of items inserted
    count: u64,
}

impl ChunkBloomFilter {
    /// Create filter for expected number of chunks
    pub fn new(expected_chunks: usize, false_positive_rate: f64) -> Self {
        // Calculate optimal size: m = -n*ln(p) / (ln(2)^2)
        let m = (-(expected_chunks as f64) * false_positive_rate.ln()
            / (2.0_f64.ln().powi(2))) as usize;

        // Calculate optimal hash count: k = m/n * ln(2)
        let k = ((m as f64 / expected_chunks as f64) * 2.0_f64.ln()) as u8;

        Self {
            bits: BitVec::from_elem(m, false),
            num_hashes: k.max(1).min(16),
            count: 0,
        }
    }

    /// Add chunk hash to filter
    pub fn insert(&mut self, hash: &[u8; 32]) {
        for i in 0..self.num_hashes {
            let idx = self.hash_index(hash, i);
            self.bits.set(idx, true);
        }
        self.count += 1;
    }

    /// Check if chunk might exist
    pub fn might_contain(&self, hash: &[u8; 32]) -> bool {
        for i in 0..self.num_hashes {
            let idx = self.hash_index(hash, i);
            if !self.bits[idx] {
                return false;
            }
        }
        true
    }

    /// Calculate hash index for given hash function number
    fn hash_index(&self, hash: &[u8; 32], k: u8) -> usize {
        // Use different portions of the hash
        let h1 = u64::from_le_bytes(hash[0..8].try_into().unwrap());
        let h2 = u64::from_le_bytes(hash[8..16].try_into().unwrap());

        // Double hashing: h(i) = h1 + i*h2
        let combined = h1.wrapping_add((k as u64).wrapping_mul(h2));
        (combined as usize) % self.bits.len()
    }

    /// Serialize for transfer
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.push(self.num_hashes);
        bytes.extend_from_slice(&self.count.to_le_bytes());
        bytes.extend_from_slice(&(self.bits.len() as u64).to_le_bytes());
        bytes.extend_from_slice(&self.bits.to_bytes());
        bytes
    }
}
```

### 3. Delta Compression

For chunks that are similar but not identical (e.g., minor edits):

```rust
/// Delta instruction types
#[derive(Debug, Clone)]
pub enum DeltaOp {
    /// Copy bytes from source
    Copy { offset: u64, length: u32 },

    /// Insert new bytes
    Insert { data: Vec<u8> },
}

/// Compute delta between two chunks
pub fn compute_delta(source: &[u8], target: &[u8]) -> Vec<DeltaOp> {
    // Use rsync-style rolling checksum algorithm
    let mut ops = Vec::new();
    let block_size = 64;  // Small blocks for fine-grained matching

    // Build index of source blocks
    let source_blocks = index_blocks(source, block_size);

    let mut target_pos = 0;
    let mut pending_insert = Vec::new();

    while target_pos < target.len() {
        // Try to find matching block in source
        if target_pos + block_size <= target.len() {
            let target_block = &target[target_pos..target_pos + block_size];
            let weak_hash = rolling_checksum(target_block);

            if let Some(matches) = source_blocks.get(&weak_hash) {
                // Verify with strong hash
                let strong = blake3::hash(target_block);

                for &source_offset in matches {
                    let source_block = &source[source_offset..source_offset + block_size];

                    if blake3::hash(source_block) == strong {
                        // Found match! Flush pending inserts
                        if !pending_insert.is_empty() {
                            ops.push(DeltaOp::Insert {
                                data: std::mem::take(&mut pending_insert),
                            });
                        }

                        // Extend match as far as possible
                        let (copy_start, copy_len) = extend_match(
                            source, source_offset,
                            target, target_pos,
                        );

                        ops.push(DeltaOp::Copy {
                            offset: copy_start as u64,
                            length: copy_len as u32,
                        });

                        target_pos += copy_len;
                        continue;
                    }
                }
            }
        }

        // No match, add to pending insert
        pending_insert.push(target[target_pos]);
        target_pos += 1;
    }

    // Flush remaining inserts
    if !pending_insert.is_empty() {
        ops.push(DeltaOp::Insert { data: pending_insert });
    }

    ops
}

/// Build hash index of source blocks
fn index_blocks(data: &[u8], block_size: usize) -> HashMap<u32, Vec<usize>> {
    let mut index: HashMap<u32, Vec<usize>> = HashMap::new();

    for offset in (0..data.len().saturating_sub(block_size)).step_by(block_size) {
        let block = &data[offset..offset + block_size];
        let hash = rolling_checksum(block);
        index.entry(hash).or_default().push(offset);
    }

    index
}

/// Adler-32 style rolling checksum
fn rolling_checksum(data: &[u8]) -> u32 {
    let mut a: u32 = 1;
    let mut b: u32 = 0;

    for &byte in data {
        a = a.wrapping_add(byte as u32);
        b = b.wrapping_add(a);
    }

    (b << 16) | (a & 0xFFFF)
}

/// Extend match in both directions
fn extend_match(
    source: &[u8], source_offset: usize,
    target: &[u8], target_offset: usize,
) -> (usize, usize) {
    let mut start_s = source_offset;
    let mut start_t = target_offset;
    let mut end_s = source_offset;
    let mut end_t = target_offset;

    // Extend backward
    while start_s > 0 && start_t > 0 && source[start_s - 1] == target[start_t - 1] {
        start_s -= 1;
        start_t -= 1;
    }

    // Extend forward
    while end_s < source.len() && end_t < target.len() && source[end_s] == target[end_t] {
        end_s += 1;
        end_t += 1;
    }

    (start_s, end_s - start_s)
}

/// Apply delta to reconstruct target
pub fn apply_delta(source: &[u8], delta: &[DeltaOp]) -> Vec<u8> {
    let mut result = Vec::new();

    for op in delta {
        match op {
            DeltaOp::Copy { offset, length } => {
                let start = *offset as usize;
                let end = start + *length as usize;
                result.extend_from_slice(&source[start..end]);
            }
            DeltaOp::Insert { data } => {
                result.extend_from_slice(data);
            }
        }
    }

    result
}
```

### 4. Sync Protocol

```rust
/// Sync state machine
pub struct SyncSession {
    /// Local repository
    local: Repository,

    /// Remote connection
    remote: RemoteConnection,

    /// Sync direction
    direction: SyncDirection,

    /// Progress tracking
    progress: SyncProgress,
}

pub enum SyncDirection {
    Push,
    Pull,
    Bidirectional,
}

impl SyncSession {
    /// Execute sync operation
    pub async fn sync(&mut self) -> Result<SyncResult> {
        // Phase 1: Exchange manifests
        let (local_manifest, remote_manifest) = self.exchange_manifests().await?;

        // Phase 2: Compute diff
        let diff = match self.direction {
            SyncDirection::Push => ManifestDiff::compute(&remote_manifest, &local_manifest),
            SyncDirection::Pull => ManifestDiff::compute(&local_manifest, &remote_manifest),
            SyncDirection::Bidirectional => {
                // Three-way merge needed
                return self.bidirectional_sync().await;
            }
        };

        self.progress.total_bytes = diff.transfer_bytes;
        self.progress.total_chunks = diff.added.iter()
            .chain(diff.modified.iter())
            .flat_map(|f| &f.chunks_added)
            .count();

        // Phase 3: Get remote's bloom filter
        let remote_filter = self.remote.get_bloom_filter().await?;

        // Phase 4: Identify chunks to transfer
        let chunks_to_transfer = self.filter_existing_chunks(&diff, &remote_filter).await?;

        // Phase 5: Transfer chunks
        let transfer_result = match self.direction {
            SyncDirection::Push => {
                self.upload_chunks(&chunks_to_transfer).await?
            }
            SyncDirection::Pull => {
                self.download_chunks(&chunks_to_transfer).await?
            }
            _ => unreachable!(),
        };

        // Phase 6: Update refs
        self.update_refs(&diff).await?;

        Ok(SyncResult {
            chunks_transferred: transfer_result.chunks,
            bytes_transferred: transfer_result.bytes,
            bytes_saved: diff.dedup_savings,
            duration: self.progress.elapsed(),
        })
    }

    /// Filter chunks that already exist on remote
    async fn filter_existing_chunks(
        &self,
        diff: &ManifestDiff,
        bloom: &ChunkBloomFilter,
    ) -> Result<Vec<ChunkRef>> {
        // Collect all chunks to potentially transfer
        let candidate_chunks: Vec<_> = diff.added.iter()
            .chain(diff.modified.iter())
            .flat_map(|f| &f.chunks_added)
            .collect();

        // Fast filter using bloom filter
        let maybe_missing: Vec<_> = candidate_chunks.iter()
            .filter(|c| !bloom.might_contain(&c.hash))
            .cloned()
            .cloned()
            .collect();

        // Bloom filter has false positives, so some chunks might exist
        // For the rest, do a batch existence check
        let maybe_exists: Vec<_> = candidate_chunks.iter()
            .filter(|c| bloom.might_contain(&c.hash))
            .map(|c| c.hash)
            .collect();

        let actually_exists = self.remote.batch_check_chunks(&maybe_exists).await?;
        let actually_missing: Vec<_> = maybe_exists.iter()
            .zip(actually_exists.iter())
            .filter(|(_, exists)| !*exists)
            .map(|(hash, _)| {
                candidate_chunks.iter()
                    .find(|c| &c.hash == hash)
                    .unwrap()
                    .clone()
                    .clone()
            })
            .collect();

        let mut all_missing = maybe_missing;
        all_missing.extend(actually_missing);

        Ok(all_missing)
    }

    /// Upload chunks with pipelining
    async fn upload_chunks(&mut self, chunks: &[ChunkRef]) -> Result<TransferResult> {
        let mut bytes_transferred = 0u64;
        let mut chunks_transferred = 0usize;

        // Create upload stream
        let (tx, rx) = mpsc::channel(32);

        // Producer: read and prepare chunks
        let producer = {
            let local = self.local.clone();
            let chunks = chunks.to_vec();
            tokio::spawn(async move {
                for chunk_ref in chunks {
                    let chunk_data = local.read_chunk(&chunk_ref.hash).await?;

                    // Compress if beneficial
                    let (data, compressed) = compress_if_beneficial(&chunk_data);

                    tx.send(PreparedChunk {
                        hash: chunk_ref.hash,
                        data,
                        compressed,
                    }).await?;
                }
                Ok::<_, Error>(())
            })
        };

        // Consumer: upload chunks
        let consumer = {
            let remote = self.remote.clone();
            let progress = self.progress.clone();
            tokio::spawn(async move {
                let mut bytes = 0u64;
                let mut count = 0usize;

                while let Some(chunk) = rx.recv().await {
                    remote.upload_chunk(&chunk.hash, &chunk.data, chunk.compressed).await?;
                    bytes += chunk.data.len() as u64;
                    count += 1;
                    progress.update(bytes, count);
                }

                Ok::<_, Error>((bytes, count))
            })
        };

        // Wait for both
        producer.await??;
        let (bytes, count) = consumer.await??;

        Ok(TransferResult {
            bytes,
            chunks: count,
        })
    }

    /// Download chunks with prefetching
    async fn download_chunks(&mut self, chunks: &[ChunkRef]) -> Result<TransferResult> {
        let mut bytes_transferred = 0u64;
        let mut chunks_transferred = 0usize;

        // Sort chunks by offset for sequential access pattern
        let mut sorted_chunks = chunks.to_vec();
        sorted_chunks.sort_by_key(|c| c.offset);

        // Create download stream with prefetch
        let prefetch_count = 16;
        let mut pending = FuturesOrdered::new();

        for chunk in sorted_chunks {
            // Start download
            let remote = self.remote.clone();
            let hash = chunk.hash;

            pending.push_back(async move {
                let data = remote.download_chunk(&hash).await?;
                Ok::<_, Error>((hash, data))
            });

            // Process completed downloads while maintaining prefetch window
            while pending.len() >= prefetch_count {
                if let Some(result) = pending.next().await {
                    let (hash, data) = result?;
                    self.local.store_chunk(&hash, &data).await?;
                    bytes_transferred += data.len() as u64;
                    chunks_transferred += 1;
                    self.progress.update(bytes_transferred, chunks_transferred);
                }
            }
        }

        // Drain remaining
        while let Some(result) = pending.next().await {
            let (hash, data) = result?;
            self.local.store_chunk(&hash, &data).await?;
            bytes_transferred += data.len() as u64;
            chunks_transferred += 1;
        }

        Ok(TransferResult {
            bytes: bytes_transferred,
            chunks: chunks_transferred,
        })
    }
}
```

---

## Optimization Strategies

### 1. Chunk Batching

```rust
/// Batch multiple small chunks into single transfer
pub struct ChunkBatcher {
    max_batch_size: usize,
    max_batch_count: usize,
}

impl ChunkBatcher {
    /// Create optimal batches for transfer
    pub fn batch(&self, chunks: &[ChunkRef]) -> Vec<ChunkBatch> {
        let mut batches = Vec::new();
        let mut current_batch = ChunkBatch::new();

        for chunk in chunks {
            if current_batch.size + chunk.size as usize > self.max_batch_size
                || current_batch.chunks.len() >= self.max_batch_count
            {
                if !current_batch.chunks.is_empty() {
                    batches.push(current_batch);
                    current_batch = ChunkBatch::new();
                }
            }

            current_batch.add(chunk.clone());
        }

        if !current_batch.chunks.is_empty() {
            batches.push(current_batch);
        }

        batches
    }
}
```

### 2. Adaptive Compression

```rust
/// Choose compression based on content type and size
pub fn compress_if_beneficial(data: &[u8]) -> (Vec<u8>, bool) {
    // Don't compress small chunks
    if data.len() < 1024 {
        return (data.to_vec(), false);
    }

    // Try compression
    let compressed = zstd::encode_all(data, 3).unwrap();

    // Only use if significant savings
    if compressed.len() < data.len() * 90 / 100 {
        (compressed, true)
    } else {
        (data.to_vec(), false)
    }
}
```

### 3. Delta for Similar Chunks

```rust
/// Use delta compression for modified files
pub async fn sync_with_delta(
    local: &Repository,
    remote: &RemoteConnection,
    file_diff: &FileDiff,
) -> Result<TransferResult> {
    // If file has many unchanged chunks, delta might be better
    let unchanged_ratio = file_diff.chunks_unchanged.len() as f64
        / (file_diff.chunks_added.len() + file_diff.chunks_unchanged.len()) as f64;

    if unchanged_ratio > 0.5 && file_diff.new_size > 1_000_000 {
        // Use delta compression
        let source_data = remote.download_file(&file_diff.path).await?;
        let target_data = local.read_file(&file_diff.path).await?;

        let delta = compute_delta(&source_data, &target_data);
        let delta_size: usize = delta.iter().map(|op| match op {
            DeltaOp::Copy { .. } => 8,
            DeltaOp::Insert { data } => 8 + data.len(),
        }).sum();

        let full_size: usize = file_diff.chunks_added.iter()
            .map(|c| c.size as usize)
            .sum();

        if delta_size < full_size {
            // Delta is smaller, use it
            return remote.upload_delta(&file_diff.path, &delta).await;
        }
    }

    // Fall back to chunk transfer
    upload_chunks(local, remote, &file_diff.chunks_added).await
}
```

---

## Progress Tracking

```rust
/// Sync progress information
#[derive(Clone)]
pub struct SyncProgress {
    /// Total bytes to transfer
    pub total_bytes: u64,

    /// Bytes transferred so far
    pub transferred_bytes: AtomicU64,

    /// Total chunks to transfer
    pub total_chunks: usize,

    /// Chunks transferred so far
    pub transferred_chunks: AtomicUsize,

    /// Start time
    pub started_at: Instant,

    /// Current file being processed
    pub current_file: RwLock<String>,
}

impl SyncProgress {
    pub fn update(&self, bytes: u64, chunks: usize) {
        self.transferred_bytes.store(bytes, Ordering::Relaxed);
        self.transferred_chunks.store(chunks, Ordering::Relaxed);
    }

    pub fn percent_complete(&self) -> f64 {
        let transferred = self.transferred_bytes.load(Ordering::Relaxed);
        if self.total_bytes == 0 {
            100.0
        } else {
            (transferred as f64 / self.total_bytes as f64) * 100.0
        }
    }

    pub fn estimated_remaining(&self) -> Duration {
        let elapsed = self.started_at.elapsed();
        let transferred = self.transferred_bytes.load(Ordering::Relaxed);

        if transferred == 0 {
            return Duration::from_secs(u64::MAX);
        }

        let rate = transferred as f64 / elapsed.as_secs_f64();
        let remaining_bytes = self.total_bytes - transferred;
        Duration::from_secs_f64(remaining_bytes as f64 / rate)
    }

    pub fn throughput_mbps(&self) -> f64 {
        let elapsed = self.started_at.elapsed().as_secs_f64();
        let transferred = self.transferred_bytes.load(Ordering::Relaxed);

        if elapsed == 0.0 {
            0.0
        } else {
            (transferred as f64 / elapsed) / 1_000_000.0 * 8.0
        }
    }
}
```

---

## Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manifest_diff() {
        let source = Manifest {
            entries: vec![
                ManifestEntry {
                    path: "file1.mov".into(),
                    content_hash: [1; 32],
                    chunks: vec![ChunkRef { hash: [1; 32], offset: 0, size: 1000 }],
                    ..Default::default()
                },
                ManifestEntry {
                    path: "file2.mov".into(),
                    content_hash: [2; 32],
                    chunks: vec![ChunkRef { hash: [2; 32], offset: 0, size: 2000 }],
                    ..Default::default()
                },
            ],
            ..Default::default()
        };

        let target = Manifest {
            entries: vec![
                ManifestEntry {
                    path: "file1.mov".into(),
                    content_hash: [1; 32],  // Unchanged
                    chunks: vec![ChunkRef { hash: [1; 32], offset: 0, size: 1000 }],
                    ..Default::default()
                },
                ManifestEntry {
                    path: "file3.mov".into(),  // New file
                    content_hash: [3; 32],
                    chunks: vec![ChunkRef { hash: [3; 32], offset: 0, size: 3000 }],
                    ..Default::default()
                },
            ],
            ..Default::default()
        };

        let diff = ManifestDiff::compute(&source, &target);

        assert_eq!(diff.added.len(), 1);
        assert_eq!(diff.added[0].path, "file3.mov");
        assert_eq!(diff.removed.len(), 1);
        assert_eq!(diff.removed[0], "file2.mov");
        assert_eq!(diff.unchanged.len(), 1);
    }

    #[test]
    fn test_delta_compression() {
        let source = b"Hello, World! This is a test file with some content.";
        let target = b"Hello, World! This is a modified test file with some content.";

        let delta = compute_delta(source, target);
        let reconstructed = apply_delta(source, &delta);

        assert_eq!(&reconstructed, target);

        // Delta should be smaller than full target
        let delta_size: usize = delta.iter().map(|op| match op {
            DeltaOp::Copy { .. } => 8,
            DeltaOp::Insert { data } => data.len() + 4,
        }).sum();

        assert!(delta_size < target.len());
    }

    #[test]
    fn test_bloom_filter() {
        let mut filter = ChunkBloomFilter::new(1000, 0.01);

        let hash1 = [1u8; 32];
        let hash2 = [2u8; 32];
        let hash3 = [3u8; 32];

        filter.insert(&hash1);
        filter.insert(&hash2);

        assert!(filter.might_contain(&hash1));
        assert!(filter.might_contain(&hash2));
        // hash3 might be false positive, but should usually be false
        // Can't assert definitively due to probabilistic nature
    }
}
```

---

## Advanced Performance Optimizations

### Zero-Copy Networking

Eliminate memory copies during network transfer:

```rust
use bytes::Bytes;
use tokio::io::{AsyncRead, AsyncWrite};

/// Zero-copy chunk transfer using Bytes
pub struct ZeroCopyTransfer {
    buffer_pool: BufferPool,
}

impl ZeroCopyTransfer {
    /// Send chunk without copying
    pub async fn send_chunk<W: AsyncWrite + Unpin>(
        &self,
        writer: &mut W,
        chunk: &Chunk,
    ) -> Result<()> {
        // Get buffer from pool (avoids allocation)
        let mut buf = self.buffer_pool.get();

        // Write header directly
        buf.put_u32(chunk.data.len() as u32);
        buf.put_slice(&chunk.hash);

        // Use writev to send header + data in one syscall
        let mut slices = [
            IoSlice::new(&buf),
            IoSlice::new(&chunk.data),
        ];

        writer.write_vectored(&mut slices).await?;
        Ok(())
    }

    /// Receive chunk with zero-copy
    pub async fn recv_chunk<R: AsyncRead + Unpin>(
        &self,
        reader: &mut R,
    ) -> Result<Chunk> {
        // Read into pre-allocated buffer
        let mut header = [0u8; 36];
        reader.read_exact(&mut header).await?;

        let size = u32::from_be_bytes(header[0..4].try_into()?);
        let hash: [u8; 32] = header[4..36].try_into()?;

        // Use Bytes for zero-copy reference counting
        let mut data = BytesMut::with_capacity(size as usize);
        data.resize(size as usize, 0);
        reader.read_exact(&mut data).await?;

        Ok(Chunk {
            hash,
            data: data.freeze(), // Zero-copy conversion
        })
    }
}

/// Pre-allocated buffer pool
pub struct BufferPool {
    pool: ArrayQueue<BytesMut>,
    buffer_size: usize,
}

impl BufferPool {
    pub fn new(capacity: usize, buffer_size: usize) -> Self {
        let pool = ArrayQueue::new(capacity);
        for _ in 0..capacity {
            let _ = pool.push(BytesMut::with_capacity(buffer_size));
        }
        Self { pool, buffer_size }
    }

    pub fn get(&self) -> BytesMut {
        self.pool.pop().unwrap_or_else(|| BytesMut::with_capacity(self.buffer_size))
    }

    pub fn put(&self, mut buf: BytesMut) {
        buf.clear();
        let _ = self.pool.push(buf);
    }
}
```

### Pipelined Transfer with Backpressure

```rust
use tokio::sync::Semaphore;

/// Pipelined chunk transfer with backpressure control
pub struct PipelinedTransfer {
    /// Maximum outstanding requests
    max_in_flight: usize,
    /// Semaphore for backpressure
    semaphore: Arc<Semaphore>,
    /// Request tracking
    pending: DashMap<[u8; 32], Instant>,
}

impl PipelinedTransfer {
    pub fn new(max_in_flight: usize) -> Self {
        Self {
            max_in_flight,
            semaphore: Arc::new(Semaphore::new(max_in_flight)),
            pending: DashMap::new(),
        }
    }

    /// Upload chunks with pipelining and adaptive concurrency
    pub async fn upload_pipelined(
        &self,
        chunks: Vec<Chunk>,
        connection: &mut QuicConnection,
    ) -> Result<TransferStats> {
        let mut stats = TransferStats::default();
        let (tx, mut rx) = mpsc::channel::<Result<[u8; 32]>>(self.max_in_flight);

        // Spawn uploader tasks
        let upload_tasks: Vec<_> = chunks.into_iter()
            .map(|chunk| {
                let permit = self.semaphore.clone().acquire_owned();
                let tx = tx.clone();
                let hash = chunk.hash;

                tokio::spawn(async move {
                    let _permit = permit.await?;

                    // Track request timing
                    let start = Instant::now();

                    // Upload chunk
                    let result = upload_single_chunk(&chunk, connection).await;

                    // Send result
                    let _ = tx.send(result.map(|_| hash)).await;

                    Ok::<_, Error>(start.elapsed())
                })
            })
            .collect();

        // Collect results
        drop(tx); // Close sender so rx completes when all done

        while let Some(result) = rx.recv().await {
            match result {
                Ok(hash) => {
                    stats.chunks_uploaded += 1;
                    self.pending.remove(&hash);
                }
                Err(e) => {
                    stats.errors.push(e);
                }
            }
        }

        // Wait for all tasks
        for task in upload_tasks {
            if let Ok(Ok(duration)) = task.await {
                stats.add_latency(duration);
            }
        }

        Ok(stats)
    }

    /// Adaptive concurrency based on RTT and throughput
    pub fn adjust_concurrency(&self, stats: &TransferStats) {
        let avg_rtt = stats.average_latency();
        let throughput = stats.throughput_mbps();

        // Increase concurrency if throughput is good and RTT is stable
        if throughput > 100.0 && avg_rtt < Duration::from_millis(100) {
            self.increase_permits(4);
        }
        // Decrease if RTT is increasing
        else if avg_rtt > Duration::from_millis(500) {
            self.decrease_permits(4);
        }
    }

    fn increase_permits(&self, count: usize) {
        // Add permits up to max
        self.semaphore.add_permits(count.min(
            self.max_in_flight * 2 - self.semaphore.available_permits()
        ));
    }

    fn decrease_permits(&self, count: usize) {
        // Reduce permits (will block new requests until acquired)
        for _ in 0..count.min(self.semaphore.available_permits() - 1) {
            let _ = self.semaphore.try_acquire();
        }
    }
}
```

### Speculative Prefetching

```rust
/// Predictive chunk prefetching based on access patterns
pub struct SpeculativePrefetcher {
    /// Access pattern tracker
    patterns: RwLock<AccessPatterns>,
    /// Prefetch cache
    cache: Cache<[u8; 32], Bytes>,
    /// Background fetch queue
    fetch_queue: mpsc::Sender<[u8; 32]>,
}

#[derive(Default)]
struct AccessPatterns {
    /// Sequential access detector
    sequential: SequentialDetector,
    /// Manifest-based predictor
    manifest_predictor: ManifestPredictor,
    /// ML-based predictor (optional)
    #[cfg(feature = "ml_prefetch")]
    ml_predictor: MlPredictor,
}

impl SpeculativePrefetcher {
    /// Called when a chunk is accessed
    pub async fn on_chunk_access(&self, hash: [u8; 32], manifest: &Manifest) {
        let mut patterns = self.patterns.write().await;

        // Update sequential detector
        patterns.sequential.record(hash);

        // Predict next chunks
        let predictions = self.predict_next_chunks(&patterns, hash, manifest);

        // Queue prefetch for likely chunks
        for (predicted_hash, confidence) in predictions {
            if confidence > 0.7 && !self.cache.contains_key(&predicted_hash) {
                let _ = self.fetch_queue.send(predicted_hash).await;
            }
        }
    }

    fn predict_next_chunks(
        &self,
        patterns: &AccessPatterns,
        current: [u8; 32],
        manifest: &Manifest,
    ) -> Vec<([u8; 32], f64)> {
        let mut predictions = Vec::new();

        // Sequential prediction
        if let Some((next, confidence)) = patterns.sequential.predict_next(current) {
            predictions.push((next, confidence));
        }

        // Manifest-based prediction (next chunks in file order)
        predictions.extend(patterns.manifest_predictor.predict(current, manifest));

        // Sort by confidence
        predictions.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        predictions.truncate(8); // Top 8 predictions

        predictions
    }
}

/// Detect sequential access patterns
struct SequentialDetector {
    recent: VecDeque<[u8; 32]>,
    file_orders: HashMap<Uuid, Vec<[u8; 32]>>,
}

impl SequentialDetector {
    fn record(&mut self, hash: [u8; 32]) {
        self.recent.push_back(hash);
        if self.recent.len() > 32 {
            self.recent.pop_front();
        }
    }

    fn predict_next(&self, current: [u8; 32]) -> Option<([u8; 32], f64)> {
        // Find current in known file orders
        for (_, order) in &self.file_orders {
            if let Some(pos) = order.iter().position(|h| *h == current) {
                if pos + 1 < order.len() {
                    return Some((order[pos + 1], 0.9));
                }
            }
        }
        None
    }
}
```

### Bandwidth Estimation and Scheduling

```rust
/// Bandwidth estimator for optimal transfer scheduling
pub struct BandwidthEstimator {
    /// Rolling average of throughput samples
    samples: VecDeque<ThroughputSample>,
    /// Current estimate (bytes/second)
    current_estimate: AtomicU64,
    /// Congestion detection
    congestion: AtomicBool,
}

#[derive(Clone, Copy)]
struct ThroughputSample {
    bytes: u64,
    duration: Duration,
    timestamp: Instant,
}

impl BandwidthEstimator {
    /// Record a transfer sample
    pub fn record_sample(&mut self, bytes: u64, duration: Duration) {
        let sample = ThroughputSample {
            bytes,
            duration,
            timestamp: Instant::now(),
        };

        self.samples.push_back(sample);

        // Keep last 60 seconds of samples
        while let Some(front) = self.samples.front() {
            if front.timestamp.elapsed() > Duration::from_secs(60) {
                self.samples.pop_front();
            } else {
                break;
            }
        }

        // Update estimate (exponential moving average)
        let new_throughput = bytes as f64 / duration.as_secs_f64();
        let old_estimate = self.current_estimate.load(Ordering::Relaxed) as f64;
        let alpha = 0.3; // Smoothing factor

        let new_estimate = alpha * new_throughput + (1.0 - alpha) * old_estimate;
        self.current_estimate.store(new_estimate as u64, Ordering::Relaxed);

        // Detect congestion (throughput dropping)
        self.detect_congestion();
    }

    /// Get estimated throughput in bytes/second
    pub fn estimate(&self) -> u64 {
        self.current_estimate.load(Ordering::Relaxed)
    }

    /// Optimal chunk batch size for current bandwidth
    pub fn optimal_batch_size(&self) -> usize {
        let throughput = self.estimate();

        // Aim for ~1 second worth of data per batch
        let batch_bytes = throughput.min(64 * 1024 * 1024); // Cap at 64MB

        batch_bytes as usize
    }

    /// Optimal concurrency for current conditions
    pub fn optimal_concurrency(&self) -> usize {
        if self.congestion.load(Ordering::Relaxed) {
            4 // Reduce during congestion
        } else {
            let throughput = self.estimate() as f64;
            // Scale concurrency with bandwidth
            ((throughput / 10_000_000.0) as usize).clamp(4, 64)
        }
    }

    fn detect_congestion(&mut self) {
        if self.samples.len() < 10 {
            return;
        }

        // Compare recent throughput to historical
        let recent: f64 = self.samples.iter()
            .rev()
            .take(5)
            .map(|s| s.bytes as f64 / s.duration.as_secs_f64())
            .sum::<f64>() / 5.0;

        let historical: f64 = self.samples.iter()
            .take(self.samples.len() - 5)
            .map(|s| s.bytes as f64 / s.duration.as_secs_f64())
            .sum::<f64>() / (self.samples.len() - 5) as f64;

        // Congestion if recent < 70% of historical
        self.congestion.store(recent < historical * 0.7, Ordering::Relaxed);
    }
}

/// Schedule chunk transfers based on bandwidth and priorities
pub struct TransferScheduler {
    bandwidth: Arc<BandwidthEstimator>,
    priority_queue: BinaryHeap<PrioritizedChunk>,
}

#[derive(Eq, PartialEq)]
struct PrioritizedChunk {
    hash: [u8; 32],
    size: u32,
    priority: Priority,
}

#[derive(Clone, Copy, Eq, PartialEq, Ord, PartialOrd)]
pub enum Priority {
    Critical,  // Needed immediately (user waiting)
    High,      // Needed soon (prefetch for active file)
    Normal,    // Regular sync
    Low,       // Background sync
}

impl TransferScheduler {
    pub fn schedule(&mut self, chunks: Vec<(Chunk, Priority)>) -> Vec<TransferBatch> {
        // Add to priority queue
        for (chunk, priority) in chunks {
            self.priority_queue.push(PrioritizedChunk {
                hash: chunk.hash,
                size: chunk.data.len() as u32,
                priority,
            });
        }

        // Create batches based on bandwidth estimate
        let batch_size = self.bandwidth.optimal_batch_size();
        let mut batches = Vec::new();
        let mut current_batch = TransferBatch::new();

        while let Some(chunk) = self.priority_queue.pop() {
            if current_batch.size() + chunk.size as usize > batch_size {
                if !current_batch.is_empty() {
                    batches.push(current_batch);
                    current_batch = TransferBatch::new();
                }
            }
            current_batch.add(chunk);
        }

        if !current_batch.is_empty() {
            batches.push(current_batch);
        }

        batches
    }
}
```

### Deduplication-Aware Sync

```rust
/// Cross-repository deduplication during sync
pub struct DedupAwareSync {
    /// Global chunk index
    global_index: Arc<ChunkIndex>,
    /// Reference count tracker
    refcount: Arc<RefCountStore>,
}

impl DedupAwareSync {
    /// Sync with deduplication across all repositories
    pub async fn sync_with_global_dedup(
        &self,
        source_manifest: &Manifest,
        target_repo: Uuid,
    ) -> Result<SyncStats> {
        let mut stats = SyncStats::default();

        for entry in &source_manifest.entries {
            for chunk_ref in &entry.chunks {
                // Check if chunk exists anywhere in the system
                if let Some(locations) = self.global_index.find(&chunk_ref.hash).await? {
                    // Chunk exists - just add reference
                    self.refcount.increment(&chunk_ref.hash, target_repo).await?;
                    stats.bytes_deduped += chunk_ref.size as u64;
                } else {
                    // Need to transfer
                    stats.bytes_to_transfer += chunk_ref.size as u64;
                    stats.chunks_to_transfer.push(chunk_ref.clone());
                }
            }
        }

        Ok(stats)
    }

    /// Find optimal source for chunk (closest, fastest)
    pub async fn find_best_source(&self, hash: &[u8; 32]) -> Result<Option<ChunkSource>> {
        let locations = self.global_index.find(hash).await?;

        if locations.is_empty() {
            return Ok(None);
        }

        // Score each location
        let mut scored: Vec<_> = locations.into_iter()
            .map(|loc| {
                let latency_score = 1.0 / (1.0 + loc.estimated_latency.as_millis() as f64);
                let bandwidth_score = loc.estimated_bandwidth as f64 / 1_000_000_000.0;
                let local_score = if loc.is_local { 10.0 } else { 0.0 };

                let score = latency_score * 0.3 + bandwidth_score * 0.3 + local_score * 0.4;
                (loc, score)
            })
            .collect();

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        Ok(scored.into_iter().next().map(|(loc, _)| loc))
    }
}
```

---

## Performance Metrics

### Transfer Performance Targets

| Scenario | Target | Notes |
|----------|--------|-------|
| LAN push (1Gbps) | 100+ MB/s | With pipelining |
| WAN push (100Mbps) | 10+ MB/s | BBR congestion control |
| High-latency (200ms RTT) | 80% link utilization | With 32x pipelining |
| Incremental sync | < 5s for 1MB changes | Bloom filter + manifest diff |

### Memory Usage Targets

| Operation | Memory | Notes |
|-----------|--------|-------|
| Manifest diff (1M files) | < 500 MB | Streaming comparison |
| Bloom filter (10M chunks) | ~12 MB | 1% FPR |
| Chunk transfer | < 100 MB | Buffer pooling |
| Delta compression | < 2x chunk size | Streaming delta |

---

## Notes

- Bloom filters reduce round-trips for existence checks
- Delta compression best for minor edits to large files
- Pipelining maximizes bandwidth utilization
- Progress tracking enables responsive UI
- Batching reduces per-chunk overhead
- Compression decisions based on content type
- Zero-copy reduces memory pressure and latency
- Adaptive concurrency responds to network conditions
- Speculative prefetching hides latency for sequential access
- Bandwidth estimation enables optimal scheduling
