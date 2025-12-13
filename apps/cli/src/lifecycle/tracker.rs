//! Chunk access tracking for intelligent tiering.

use crate::core::Hash;
use super::tier::StorageTier;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{BufReader, BufWriter};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Access record for a chunk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessRecord {
    /// Chunk hash.
    pub hash: Hash,
    /// Size in bytes.
    pub size: u64,
    /// Current storage tier.
    pub tier: StorageTier,
    /// Unix timestamp of first access.
    pub created_at: u64,
    /// Unix timestamp of last access.
    pub last_accessed: u64,
    /// Total number of accesses.
    pub access_count: u64,
    /// Whether this chunk is referenced by a proxy (never freeze proxies).
    pub is_proxy: bool,
    /// Whether this chunk is part of a manifest (keep hot for browsing).
    pub is_manifest: bool,
}

impl AccessRecord {
    /// Create a new access record.
    pub fn new(hash: Hash, size: u64) -> Self {
        let now = current_timestamp();
        Self {
            hash,
            size,
            tier: StorageTier::Hot,
            created_at: now,
            last_accessed: now,
            access_count: 1,
            is_proxy: false,
            is_manifest: false,
        }
    }

    /// Record an access.
    pub fn record_access(&mut self) {
        self.last_accessed = current_timestamp();
        self.access_count += 1;
    }

    /// Get days since last access.
    pub fn days_since_access(&self) -> u32 {
        let now = current_timestamp();
        let seconds = now.saturating_sub(self.last_accessed);
        (seconds / 86400) as u32
    }

    /// Get age in days.
    pub fn age_days(&self) -> u32 {
        let now = current_timestamp();
        let seconds = now.saturating_sub(self.created_at);
        (seconds / 86400) as u32
    }

    /// Check if this chunk should never be frozen.
    pub fn is_protected(&self) -> bool {
        self.is_proxy || self.is_manifest
    }
}

/// Access tracker database.
#[derive(Debug)]
pub struct AccessTracker {
    /// Path to the tracker database file.
    db_path: PathBuf,
    /// In-memory access records.
    records: HashMap<Hash, AccessRecord>,
    /// Whether there are unsaved changes.
    dirty: bool,
}

impl AccessTracker {
    /// Open or create an access tracker.
    pub fn open(dits_dir: &Path) -> std::io::Result<Self> {
        let db_path = dits_dir.join("access.json");
        let records = if db_path.exists() {
            let file = File::open(&db_path)?;
            let reader = BufReader::new(file);
            // Deserialize as Vec<AccessRecord> and convert to HashMap
            let vec: Vec<AccessRecord> = serde_json::from_reader(reader).unwrap_or_default();
            vec.into_iter().map(|r| (r.hash, r)).collect()
        } else {
            HashMap::new()
        };

        Ok(Self {
            db_path,
            records,
            dirty: false,
        })
    }

    /// Record a chunk access.
    pub fn record_access(&mut self, hash: &Hash, size: u64) {
        if let Some(record) = self.records.get_mut(hash) {
            record.record_access();
        } else {
            self.records.insert(*hash, AccessRecord::new(*hash, size));
        }
        self.dirty = true;
    }

    /// Record multiple chunk accesses.
    pub fn record_accesses(&mut self, chunks: &[(Hash, u64)]) {
        for (hash, size) in chunks {
            self.record_access(hash, *size);
        }
    }

    /// Mark a chunk as a proxy chunk (never freeze).
    pub fn mark_as_proxy(&mut self, hash: &Hash) {
        if let Some(record) = self.records.get_mut(hash) {
            record.is_proxy = true;
            self.dirty = true;
        }
    }

    /// Mark a chunk as a manifest chunk (keep hot).
    pub fn mark_as_manifest(&mut self, hash: &Hash) {
        if let Some(record) = self.records.get_mut(hash) {
            record.is_manifest = true;
            self.dirty = true;
        }
    }

    /// Get access record for a chunk.
    pub fn get(&self, hash: &Hash) -> Option<&AccessRecord> {
        self.records.get(hash)
    }

    /// Get mutable access record.
    pub fn get_mut(&mut self, hash: &Hash) -> Option<&mut AccessRecord> {
        self.dirty = true;
        self.records.get_mut(hash)
    }

    /// Get all records.
    pub fn all_records(&self) -> impl Iterator<Item = &AccessRecord> {
        self.records.values()
    }

    /// Get chunks in a specific tier.
    pub fn chunks_in_tier(&self, tier: StorageTier) -> Vec<&AccessRecord> {
        self.records.values()
            .filter(|r| r.tier == tier)
            .collect()
    }

    /// Get chunks eligible for tier transition.
    pub fn transition_candidates(&self, from_tier: StorageTier, days_threshold: u32) -> Vec<&AccessRecord> {
        self.records.values()
            .filter(|r| {
                r.tier == from_tier &&
                !r.is_protected() &&
                r.days_since_access() >= days_threshold
            })
            .collect()
    }

    /// Update tier for a chunk.
    pub fn set_tier(&mut self, hash: &Hash, tier: StorageTier) {
        if let Some(record) = self.records.get_mut(hash) {
            record.tier = tier;
            self.dirty = true;
        }
    }

    /// Get overall statistics.
    pub fn stats(&self) -> AccessStats {
        let mut stats = AccessStats::default();

        for record in self.records.values() {
            stats.total_chunks += 1;
            stats.total_size += record.size;

            match record.tier {
                StorageTier::Hot => {
                    stats.hot_chunks += 1;
                    stats.hot_size += record.size;
                }
                StorageTier::Warm => {
                    stats.warm_chunks += 1;
                    stats.warm_size += record.size;
                }
                StorageTier::Cold => {
                    stats.cold_chunks += 1;
                    stats.cold_size += record.size;
                }
                StorageTier::Archive => {
                    stats.archive_chunks += 1;
                    stats.archive_size += record.size;
                }
            }

            if record.is_proxy {
                stats.proxy_chunks += 1;
                stats.proxy_size += record.size;
            }
            if record.is_manifest {
                stats.manifest_chunks += 1;
            }
        }

        stats
    }

    /// Save changes to disk.
    pub fn save(&mut self) -> std::io::Result<()> {
        if !self.dirty {
            return Ok(());
        }

        // Ensure parent directory exists
        if let Some(parent) = self.db_path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Serialize as Vec<AccessRecord> for JSON compatibility
        let vec: Vec<&AccessRecord> = self.records.values().collect();

        let file = File::create(&self.db_path)?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, &vec)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

        self.dirty = false;
        Ok(())
    }

    /// Number of tracked chunks.
    pub fn len(&self) -> usize {
        self.records.len()
    }

    /// Check if empty.
    pub fn is_empty(&self) -> bool {
        self.records.is_empty()
    }

    /// Remove a chunk from tracking.
    pub fn remove(&mut self, hash: &Hash) -> Option<AccessRecord> {
        self.dirty = true;
        self.records.remove(hash)
    }

    /// Initialize tracking for existing chunks.
    pub fn initialize_from_objects(&mut self, objects_dir: &Path) -> std::io::Result<u64> {
        let chunks_dir = objects_dir.join("chunks");
        if !chunks_dir.exists() {
            return Ok(0);
        }

        let mut count = 0;

        // Scan prefix directories (00-ff)
        for prefix_entry in fs::read_dir(&chunks_dir)? {
            let prefix_entry = prefix_entry?;
            let prefix_path = prefix_entry.path();

            if !prefix_path.is_dir() {
                continue;
            }

            // Scan chunk files
            for chunk_entry in fs::read_dir(&prefix_path)? {
                let chunk_entry = chunk_entry?;
                let chunk_path = chunk_entry.path();

                if !chunk_path.is_file() {
                    continue;
                }

                // Parse hash from prefix dir + filename
                if let Some(filename) = chunk_path.file_name() {
                    if let Some(hash_str) = filename.to_str() {
                        // Get prefix from parent directory name
                        let prefix = prefix_path.file_name()
                            .and_then(|p| p.to_str())
                            .unwrap_or("");
                        let full_hash = format!("{}{}", prefix, hash_str);
                        if let Ok(hash) = Hash::from_hex(&full_hash) {
                            // Get file size
                            let metadata = fs::metadata(&chunk_path)?;
                            let size = metadata.len();

                            // Only add if not already tracked
                            if !self.records.contains_key(&hash) {
                                let mut record = AccessRecord::new(hash, size);
                                // Set created time from file metadata if possible
                                if let Ok(created) = metadata.created() {
                                    if let Ok(duration) = created.duration_since(UNIX_EPOCH) {
                                        record.created_at = duration.as_secs();
                                        record.last_accessed = duration.as_secs();
                                    }
                                }
                                self.records.insert(hash, record);
                                count += 1;
                            }
                        }
                    }
                }
            }
        }

        if count > 0 {
            self.dirty = true;
        }

        Ok(count)
    }
}

impl Drop for AccessTracker {
    fn drop(&mut self) {
        let _ = self.save();
    }
}

/// Overall access statistics.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AccessStats {
    pub total_chunks: u64,
    pub total_size: u64,
    pub hot_chunks: u64,
    pub hot_size: u64,
    pub warm_chunks: u64,
    pub warm_size: u64,
    pub cold_chunks: u64,
    pub cold_size: u64,
    pub archive_chunks: u64,
    pub archive_size: u64,
    pub proxy_chunks: u64,
    pub proxy_size: u64,
    pub manifest_chunks: u64,
}

impl AccessStats {
    /// Format a size as human-readable.
    pub fn format_size(bytes: u64) -> String {
        const KB: u64 = 1024;
        const MB: u64 = KB * 1024;
        const GB: u64 = MB * 1024;
        const TB: u64 = GB * 1024;

        if bytes >= TB {
            format!("{:.2} TB", bytes as f64 / TB as f64)
        } else if bytes >= GB {
            format!("{:.2} GB", bytes as f64 / GB as f64)
        } else if bytes >= MB {
            format!("{:.2} MB", bytes as f64 / MB as f64)
        } else if bytes >= KB {
            format!("{:.2} KB", bytes as f64 / KB as f64)
        } else {
            format!("{} B", bytes)
        }
    }

    /// Calculate estimated monthly storage cost (relative).
    pub fn estimated_monthly_cost(&self) -> f64 {
        // Using relative costs (hot = 1.0 baseline per GB)
        let hot_cost = self.hot_size as f64 * 1.0;
        let warm_cost = self.warm_size as f64 * 0.5;
        let cold_cost = self.cold_size as f64 * 0.17;
        let archive_cost = self.archive_size as f64 * 0.04;

        // Return normalized cost units
        (hot_cost + warm_cost + cold_cost + archive_cost) / (1024.0 * 1024.0 * 1024.0)
    }
}

/// Get current Unix timestamp.
fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_access_record() {
        let hash = Hash::from_hex("a".repeat(64).as_str()).unwrap();
        let record = AccessRecord::new(hash, 1024);

        assert_eq!(record.tier, StorageTier::Hot);
        assert_eq!(record.size, 1024);
        assert_eq!(record.access_count, 1);
        assert!(!record.is_protected());
    }

    #[test]
    fn test_tracker_persistence() {
        let dir = tempdir().unwrap();
        let hash = Hash::from_hex("b".repeat(64).as_str()).unwrap();

        // Create and save
        {
            let mut tracker = AccessTracker::open(dir.path()).unwrap();
            tracker.record_access(&hash, 2048);
            tracker.save().unwrap();
        }

        // Reload and verify
        {
            let tracker = AccessTracker::open(dir.path()).unwrap();
            let record = tracker.get(&hash).unwrap();
            assert_eq!(record.size, 2048);
        }
    }

    #[test]
    fn test_protected_chunks() {
        let dir = tempdir().unwrap();
        let hash = Hash::from_hex("c".repeat(64).as_str()).unwrap();

        let mut tracker = AccessTracker::open(dir.path()).unwrap();
        tracker.record_access(&hash, 1024);

        // Not protected by default
        assert!(!tracker.get(&hash).unwrap().is_protected());

        // Mark as proxy
        tracker.mark_as_proxy(&hash);
        assert!(tracker.get(&hash).unwrap().is_protected());
    }
}
