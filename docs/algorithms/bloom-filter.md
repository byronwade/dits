# Bloom Filter Design

Space-efficient probabilistic data structure for chunk existence checking.

---

## Overview

Bloom filters provide fast, memory-efficient "probably exists" checks. In Dits, they reduce network round-trips when syncing by allowing clients to quickly filter out chunks that definitely don't exist on the server.

### Properties

- **No false negatives**: If filter says "not present", it's definitely not present
- **Possible false positives**: If filter says "might be present", need to verify
- **Space efficient**: ~10 bits per element for 1% false positive rate
- **Fast**: O(k) operations where k is small (typically 3-10)

---

## Mathematical Foundation

### Size Calculation

For n elements with false positive rate p:

```
Optimal bits (m) = -n * ln(p) / (ln(2))^2
Optimal hashes (k) = (m/n) * ln(2)
```

### False Positive Rate

For m bits, n elements, k hash functions:

```
p ≈ (1 - e^(-kn/m))^k
```

---

## Implementation

### Core Structure

```rust
use bitvec::prelude::*;

/// Bloom filter for chunk hashes
pub struct BloomFilter {
    /// Bit array
    bits: BitVec<u8, Lsb0>,

    /// Number of bits
    size: usize,

    /// Number of hash functions
    num_hashes: u8,

    /// Elements inserted
    count: u64,

    /// Filter generation (for versioning)
    generation: u64,
}

impl BloomFilter {
    /// Create new filter for expected elements and false positive rate
    pub fn new(expected_elements: usize, false_positive_rate: f64) -> Self {
        let (size, num_hashes) = Self::optimal_params(expected_elements, false_positive_rate);

        Self {
            bits: bitvec![u8, Lsb0; 0; size],
            size,
            num_hashes,
            count: 0,
            generation: 0,
        }
    }

    /// Calculate optimal parameters
    fn optimal_params(n: usize, p: f64) -> (usize, u8) {
        // m = -n * ln(p) / (ln(2))^2
        let ln2_squared = std::f64::consts::LN_2.powi(2);
        let m = (-(n as f64) * p.ln() / ln2_squared).ceil() as usize;

        // k = (m/n) * ln(2)
        let k = ((m as f64 / n as f64) * std::f64::consts::LN_2).round() as u8;

        // Clamp k to reasonable range
        let k = k.clamp(1, 16);

        // Round m up to byte boundary
        let m = (m + 7) / 8 * 8;

        (m, k)
    }

    /// Insert element
    pub fn insert(&mut self, hash: &[u8; 32]) {
        for i in 0..self.num_hashes {
            let idx = self.hash_index(hash, i);
            self.bits.set(idx, true);
        }
        self.count += 1;
    }

    /// Check if element might be present
    pub fn contains(&self, hash: &[u8; 32]) -> bool {
        for i in 0..self.num_hashes {
            let idx = self.hash_index(hash, i);
            if !self.bits[idx] {
                return false;
            }
        }
        true
    }

    /// Compute hash index using double hashing
    fn hash_index(&self, hash: &[u8; 32], k: u8) -> usize {
        // Split 32-byte hash into two 64-bit values
        let h1 = u64::from_le_bytes(hash[0..8].try_into().unwrap());
        let h2 = u64::from_le_bytes(hash[8..16].try_into().unwrap());

        // Double hashing: h(i) = h1 + i * h2
        let combined = h1.wrapping_add((k as u64).wrapping_mul(h2));

        (combined as usize) % self.size
    }

    /// Estimated false positive rate
    pub fn estimated_fpr(&self) -> f64 {
        let k = self.num_hashes as f64;
        let n = self.count as f64;
        let m = self.size as f64;

        (1.0 - (-k * n / m).exp()).powf(k)
    }

    /// Fill ratio (proportion of bits set)
    pub fn fill_ratio(&self) -> f64 {
        let set_bits = self.bits.count_ones();
        set_bits as f64 / self.size as f64
    }

    /// Check if filter is too full and should be rebuilt
    pub fn needs_rebuild(&self) -> bool {
        self.fill_ratio() > 0.5 || self.estimated_fpr() > 0.1
    }
}
```

### Serialization

```rust
impl BloomFilter {
    /// Serialize for network transfer
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(24 + self.bits.as_raw_slice().len());

        // Header
        bytes.extend_from_slice(b"BLMF");  // Magic
        bytes.push(1);  // Version
        bytes.push(self.num_hashes);
        bytes.extend_from_slice(&(self.size as u64).to_le_bytes());
        bytes.extend_from_slice(&self.count.to_le_bytes());
        bytes.extend_from_slice(&self.generation.to_le_bytes());

        // Compressed bit array
        let raw_bits = self.bits.as_raw_slice();
        let compressed = zstd::encode_all(&raw_bits[..], 3).unwrap_or_else(|_| raw_bits.to_vec());

        bytes.extend_from_slice(&(compressed.len() as u32).to_le_bytes());
        bytes.extend_from_slice(&compressed);

        bytes
    }

    /// Deserialize from bytes
    pub fn from_bytes(data: &[u8]) -> Result<Self, Error> {
        if data.len() < 28 {
            return Err(Error::InvalidBloomFilter("Too short"));
        }

        // Validate magic
        if &data[0..4] != b"BLMF" {
            return Err(Error::InvalidBloomFilter("Invalid magic"));
        }

        let version = data[4];
        if version != 1 {
            return Err(Error::InvalidBloomFilter("Unsupported version"));
        }

        let num_hashes = data[5];
        let size = u64::from_le_bytes(data[6..14].try_into()?) as usize;
        let count = u64::from_le_bytes(data[14..22].try_into()?);
        let generation = u64::from_le_bytes(data[22..30].try_into()?);
        let compressed_len = u32::from_le_bytes(data[30..34].try_into()?) as usize;

        if data.len() < 34 + compressed_len {
            return Err(Error::InvalidBloomFilter("Truncated data"));
        }

        let compressed = &data[34..34 + compressed_len];
        let raw_bits = zstd::decode_all(compressed)?;

        let bits = BitVec::from_vec(raw_bits);

        if bits.len() != size {
            return Err(Error::InvalidBloomFilter("Size mismatch"));
        }

        Ok(Self {
            bits,
            size,
            num_hashes,
            count,
            generation,
        })
    }
}
```

### Batch Operations

```rust
impl BloomFilter {
    /// Insert multiple elements
    pub fn insert_batch(&mut self, hashes: &[[u8; 32]]) {
        for hash in hashes {
            self.insert(hash);
        }
    }

    /// Check multiple elements
    pub fn contains_batch(&self, hashes: &[[u8; 32]]) -> Vec<bool> {
        hashes.iter().map(|h| self.contains(h)).collect()
    }

    /// Filter to only elements that might be present
    pub fn filter_possible(&self, hashes: &[[u8; 32]]) -> Vec<[u8; 32]> {
        hashes.iter()
            .filter(|h| self.contains(h))
            .copied()
            .collect()
    }

    /// Filter to only elements that are definitely not present
    pub fn filter_missing(&self, hashes: &[[u8; 32]]) -> Vec<[u8; 32]> {
        hashes.iter()
            .filter(|h| !self.contains(h))
            .copied()
            .collect()
    }
}
```

---

## Counting Bloom Filter

For scenarios where deletions are needed:

```rust
/// Counting Bloom filter with 4-bit counters
pub struct CountingBloomFilter {
    /// Counter array (4 bits per counter, packed)
    counters: Vec<u8>,

    /// Number of counters
    size: usize,

    /// Number of hash functions
    num_hashes: u8,

    /// Elements inserted
    count: u64,
}

impl CountingBloomFilter {
    pub fn new(expected_elements: usize, false_positive_rate: f64) -> Self {
        let (size, num_hashes) = BloomFilter::optimal_params(expected_elements, false_positive_rate);

        // Each byte holds 2 counters (4 bits each)
        let counter_bytes = (size + 1) / 2;

        Self {
            counters: vec![0; counter_bytes],
            size,
            num_hashes,
            count: 0,
        }
    }

    /// Get counter value at index
    fn get_counter(&self, idx: usize) -> u8 {
        let byte_idx = idx / 2;
        let nibble = idx % 2;

        if nibble == 0 {
            self.counters[byte_idx] & 0x0F
        } else {
            (self.counters[byte_idx] >> 4) & 0x0F
        }
    }

    /// Increment counter at index
    fn increment(&mut self, idx: usize) {
        let byte_idx = idx / 2;
        let nibble = idx % 2;

        if nibble == 0 {
            let current = self.counters[byte_idx] & 0x0F;
            if current < 15 {
                self.counters[byte_idx] = (self.counters[byte_idx] & 0xF0) | (current + 1);
            }
        } else {
            let current = (self.counters[byte_idx] >> 4) & 0x0F;
            if current < 15 {
                self.counters[byte_idx] = (self.counters[byte_idx] & 0x0F) | ((current + 1) << 4);
            }
        }
    }

    /// Decrement counter at index
    fn decrement(&mut self, idx: usize) {
        let byte_idx = idx / 2;
        let nibble = idx % 2;

        if nibble == 0 {
            let current = self.counters[byte_idx] & 0x0F;
            if current > 0 {
                self.counters[byte_idx] = (self.counters[byte_idx] & 0xF0) | (current - 1);
            }
        } else {
            let current = (self.counters[byte_idx] >> 4) & 0x0F;
            if current > 0 {
                self.counters[byte_idx] = (self.counters[byte_idx] & 0x0F) | ((current - 1) << 4);
            }
        }
    }

    /// Insert element
    pub fn insert(&mut self, hash: &[u8; 32]) {
        for i in 0..self.num_hashes {
            let idx = self.hash_index(hash, i);
            self.increment(idx);
        }
        self.count += 1;
    }

    /// Remove element
    pub fn remove(&mut self, hash: &[u8; 32]) {
        // Only remove if element is present
        if !self.contains(hash) {
            return;
        }

        for i in 0..self.num_hashes {
            let idx = self.hash_index(hash, i);
            self.decrement(idx);
        }
        self.count = self.count.saturating_sub(1);
    }

    /// Check if element might be present
    pub fn contains(&self, hash: &[u8; 32]) -> bool {
        for i in 0..self.num_hashes {
            let idx = self.hash_index(hash, i);
            if self.get_counter(idx) == 0 {
                return false;
            }
        }
        true
    }

    fn hash_index(&self, hash: &[u8; 32], k: u8) -> usize {
        let h1 = u64::from_le_bytes(hash[0..8].try_into().unwrap());
        let h2 = u64::from_le_bytes(hash[8..16].try_into().unwrap());
        let combined = h1.wrapping_add((k as u64).wrapping_mul(h2));
        (combined as usize) % self.size
    }
}
```

---

## Scalable Bloom Filter

For growing datasets where size is unknown:

```rust
/// Scalable Bloom filter that grows as needed
pub struct ScalableBloomFilter {
    /// Array of bloom filters
    filters: Vec<BloomFilter>,

    /// Initial capacity
    initial_capacity: usize,

    /// Target false positive rate
    fpr: f64,

    /// Growth ratio
    growth_ratio: f64,

    /// FPR tightening ratio
    fpr_ratio: f64,
}

impl ScalableBloomFilter {
    pub fn new(initial_capacity: usize, fpr: f64) -> Self {
        let first_filter = BloomFilter::new(initial_capacity, fpr * 0.5);

        Self {
            filters: vec![first_filter],
            initial_capacity,
            fpr,
            growth_ratio: 2.0,
            fpr_ratio: 0.5,  // Each new filter has tighter FPR
        }
    }

    /// Insert element
    pub fn insert(&mut self, hash: &[u8; 32]) {
        // Check if we need a new filter
        let last_filter = self.filters.last_mut().unwrap();

        if last_filter.needs_rebuild() {
            let new_capacity = (self.initial_capacity as f64
                * self.growth_ratio.powi(self.filters.len() as i32)) as usize;

            let new_fpr = self.fpr * self.fpr_ratio.powi(self.filters.len() as i32 + 1);

            self.filters.push(BloomFilter::new(new_capacity, new_fpr));
        }

        // Insert into latest filter
        self.filters.last_mut().unwrap().insert(hash);
    }

    /// Check if element might be present
    pub fn contains(&self, hash: &[u8; 32]) -> bool {
        // Check all filters (any match = might be present)
        self.filters.iter().any(|f| f.contains(hash))
    }

    /// Total elements
    pub fn count(&self) -> u64 {
        self.filters.iter().map(|f| f.count).sum()
    }

    /// Combined false positive rate
    pub fn estimated_fpr(&self) -> f64 {
        // Union of independent events
        1.0 - self.filters.iter()
            .map(|f| 1.0 - f.estimated_fpr())
            .product::<f64>()
    }
}
```

---

## Server Integration

### Building Repository Filter

```rust
/// Build Bloom filter for repository's chunks
pub async fn build_repo_filter(
    repo_id: Uuid,
    db: &Pool,
) -> Result<BloomFilter> {
    // Count chunks
    let count: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM chunks WHERE repo_id = $1",
        repo_id
    )
    .fetch_one(db)
    .await?
    .unwrap_or(0);

    // Create appropriately sized filter
    let mut filter = BloomFilter::new(count as usize, 0.01);

    // Stream chunks and insert
    let mut stream = sqlx::query!(
        "SELECT hash FROM chunks WHERE repo_id = $1",
        repo_id
    )
    .fetch(db);

    while let Some(row) = stream.try_next().await? {
        let hash: [u8; 32] = hex::decode(&row.hash)?
            .try_into()
            .map_err(|_| Error::InvalidHash)?;
        filter.insert(&hash);
    }

    Ok(filter)
}

/// Periodically update filter
pub async fn update_repo_filter(
    repo_id: Uuid,
    filter: &mut BloomFilter,
    since: DateTime<Utc>,
    db: &Pool,
) -> Result<()> {
    // Get new chunks since last update
    let mut stream = sqlx::query!(
        "SELECT hash FROM chunks WHERE repo_id = $1 AND created_at > $2",
        repo_id,
        since
    )
    .fetch(db);

    while let Some(row) = stream.try_next().await? {
        let hash: [u8; 32] = hex::decode(&row.hash)?
            .try_into()
            .map_err(|_| Error::InvalidHash)?;
        filter.insert(&hash);
    }

    Ok(())
}
```

### Sync Protocol Usage

```rust
/// Server-side bloom filter endpoint
pub async fn get_bloom_filter(
    repo_id: Uuid,
    cache: &FilterCache,
    db: &Pool,
) -> Result<Vec<u8>> {
    // Check cache
    if let Some(cached) = cache.get(&repo_id).await {
        return Ok(cached.to_bytes());
    }

    // Build fresh filter
    let filter = build_repo_filter(repo_id, db).await?;
    let bytes = filter.to_bytes();

    // Cache for future requests
    cache.insert(repo_id, filter).await;

    Ok(bytes)
}

/// Client-side filter usage
pub async fn sync_with_filter(
    local: &Repository,
    remote: &Remote,
) -> Result<SyncPlan> {
    // Get remote's bloom filter
    let filter_bytes = remote.get_bloom_filter().await?;
    let filter = BloomFilter::from_bytes(&filter_bytes)?;

    // Get local chunks to potentially push
    let local_chunks = local.list_chunk_hashes().await?;

    // Fast filter: definitely missing on remote
    let definitely_missing: Vec<_> = local_chunks.iter()
        .filter(|h| !filter.contains(h))
        .copied()
        .collect();

    // Might exist on remote (need verification)
    let maybe_exists: Vec<_> = local_chunks.iter()
        .filter(|h| filter.contains(h))
        .copied()
        .collect();

    // Verify the "maybe exists" chunks with actual lookup
    let actually_missing = if !maybe_exists.is_empty() {
        let exists_bitmap = remote.batch_check_chunks(&maybe_exists).await?;
        maybe_exists.iter()
            .zip(exists_bitmap.iter())
            .filter(|(_, exists)| !*exists)
            .map(|(hash, _)| *hash)
            .collect()
    } else {
        Vec::new()
    };

    Ok(SyncPlan {
        chunks_to_push: definitely_missing.into_iter()
            .chain(actually_missing)
            .collect(),
    })
}
```

---

## Memory Optimization

### Memory-Mapped Filter

```rust
use memmap2::Mmap;

/// Memory-mapped bloom filter for large filters
pub struct MmapBloomFilter {
    mmap: Mmap,
    size: usize,
    num_hashes: u8,
}

impl MmapBloomFilter {
    /// Open existing filter file
    pub fn open(path: &Path) -> Result<Self> {
        let file = File::open(path)?;
        let mmap = unsafe { Mmap::map(&file)? };

        // Parse header
        let num_hashes = mmap[5];
        let size = u64::from_le_bytes(mmap[6..14].try_into()?) as usize;

        Ok(Self {
            mmap,
            size,
            num_hashes,
        })
    }

    /// Check if element might be present
    pub fn contains(&self, hash: &[u8; 32]) -> bool {
        let data_offset = 34;  // After header

        for i in 0..self.num_hashes {
            let idx = self.hash_index(hash, i);
            let byte_idx = data_offset + idx / 8;
            let bit_idx = idx % 8;

            if byte_idx >= self.mmap.len() {
                return false;
            }

            if (self.mmap[byte_idx] & (1 << bit_idx)) == 0 {
                return false;
            }
        }
        true
    }

    fn hash_index(&self, hash: &[u8; 32], k: u8) -> usize {
        let h1 = u64::from_le_bytes(hash[0..8].try_into().unwrap());
        let h2 = u64::from_le_bytes(hash[8..16].try_into().unwrap());
        let combined = h1.wrapping_add((k as u64).wrapping_mul(h2));
        (combined as usize) % self.size
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
    fn test_basic_operations() {
        let mut filter = BloomFilter::new(1000, 0.01);

        let hash1 = [1u8; 32];
        let hash2 = [2u8; 32];
        let hash3 = [3u8; 32];

        // Insert hash1 and hash2
        filter.insert(&hash1);
        filter.insert(&hash2);

        // Should contain inserted elements
        assert!(filter.contains(&hash1));
        assert!(filter.contains(&hash2));

        // hash3 not inserted - should usually not be found
        // (might be false positive, but unlikely with 1% FPR)
    }

    #[test]
    fn test_false_positive_rate() {
        let n = 10000;
        let target_fpr = 0.01;
        let mut filter = BloomFilter::new(n, target_fpr);

        // Insert n elements
        for i in 0..n {
            let hash = blake3::hash(&i.to_le_bytes());
            filter.insert(hash.as_bytes().try_into().unwrap());
        }

        // Test with n elements that were NOT inserted
        let mut false_positives = 0;
        for i in n..(n * 2) {
            let hash = blake3::hash(&i.to_le_bytes());
            if filter.contains(hash.as_bytes().try_into().unwrap()) {
                false_positives += 1;
            }
        }

        let actual_fpr = false_positives as f64 / n as f64;
        println!("Target FPR: {}, Actual FPR: {}", target_fpr, actual_fpr);

        // Allow 50% margin for statistical variation
        assert!(actual_fpr < target_fpr * 1.5);
    }

    #[test]
    fn test_serialization() {
        let mut filter = BloomFilter::new(1000, 0.01);

        for i in 0..100 {
            let hash = blake3::hash(&i.to_le_bytes());
            filter.insert(hash.as_bytes().try_into().unwrap());
        }

        // Serialize
        let bytes = filter.to_bytes();

        // Deserialize
        let restored = BloomFilter::from_bytes(&bytes).unwrap();

        // Verify same behavior
        for i in 0..100 {
            let hash = blake3::hash(&i.to_le_bytes());
            assert_eq!(
                filter.contains(hash.as_bytes().try_into().unwrap()),
                restored.contains(hash.as_bytes().try_into().unwrap())
            );
        }
    }

    #[test]
    fn test_counting_filter() {
        let mut filter = CountingBloomFilter::new(1000, 0.01);

        let hash1 = [1u8; 32];

        // Insert
        filter.insert(&hash1);
        assert!(filter.contains(&hash1));

        // Remove
        filter.remove(&hash1);
        assert!(!filter.contains(&hash1));
    }

    #[test]
    fn test_scalable_filter() {
        let mut filter = ScalableBloomFilter::new(100, 0.01);

        // Insert more than initial capacity
        for i in 0..1000 {
            let hash = blake3::hash(&i.to_le_bytes());
            filter.insert(hash.as_bytes().try_into().unwrap());
        }

        // Should have grown
        assert!(filter.filters.len() > 1);

        // Should still find elements
        for i in 0..1000 {
            let hash = blake3::hash(&i.to_le_bytes());
            assert!(filter.contains(hash.as_bytes().try_into().unwrap()));
        }
    }
}
```

---

## Performance Characteristics

| Operation | Time Complexity | Space |
|-----------|-----------------|-------|
| Insert | O(k) | - |
| Contains | O(k) | - |
| Serialize | O(m) | O(m) |
| Memory | - | ~10 bits/element @ 1% FPR |

### Size Examples (1% FPR)

| Elements | Filter Size | Hash Functions |
|----------|-------------|----------------|
| 1,000 | 1.2 KB | 7 |
| 10,000 | 12 KB | 7 |
| 100,000 | 120 KB | 7 |
| 1,000,000 | 1.2 MB | 7 |
| 10,000,000 | 12 MB | 7 |

---

## Notes

- Use 1% FPR as default (good balance of size and accuracy)
- Rebuild filter when fill ratio exceeds 50%
- Cache filters server-side, invalidate on chunk changes
- Memory-map large filters to reduce RAM usage
- Consider counting filters if deletions are frequent
