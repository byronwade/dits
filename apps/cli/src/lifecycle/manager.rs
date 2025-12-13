//! Lifecycle manager for freeze/thaw operations.

use crate::core::Hash;
use super::tier::StorageTier;
use super::tracker::{AccessTracker, AccessStats};
use super::policy::{LifecyclePolicy, TierTransition};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::{self, BufReader, BufWriter, Read, Write};
use std::path::{Path, PathBuf};

/// Lifecycle manager handles freeze/thaw operations.
pub struct LifecycleManager {
    /// Repository .dits directory.
    dits_dir: PathBuf,
    /// Access tracker.
    tracker: AccessTracker,
    /// Lifecycle policy.
    policy: LifecyclePolicy,
    /// Pending thaw requests.
    thaw_queue: ThawQueue,
}

impl LifecycleManager {
    /// Open or create a lifecycle manager.
    pub fn open(dits_dir: &Path) -> io::Result<Self> {
        let tracker = AccessTracker::open(dits_dir)?;
        let policy = Self::load_policy(dits_dir).unwrap_or_default();
        let thaw_queue = ThawQueue::load(dits_dir)?;

        Ok(Self {
            dits_dir: dits_dir.to_path_buf(),
            tracker,
            policy,
            thaw_queue,
        })
    }

    /// Load policy from config file.
    fn load_policy(dits_dir: &Path) -> Option<LifecyclePolicy> {
        let policy_path = dits_dir.join("lifecycle-policy.json");
        if policy_path.exists() {
            let file = File::open(&policy_path).ok()?;
            let reader = BufReader::new(file);
            serde_json::from_reader(reader).ok()
        } else {
            None
        }
    }

    /// Save policy to config file.
    pub fn save_policy(&self) -> io::Result<()> {
        let policy_path = self.dits_dir.join("lifecycle-policy.json");
        let file = File::create(&policy_path)?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, &self.policy)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))
    }

    /// Get access statistics.
    pub fn stats(&self) -> AccessStats {
        self.tracker.stats()
    }

    /// Initialize tracking for existing chunks.
    pub fn initialize_tracking(&mut self) -> io::Result<u64> {
        let objects_dir = self.dits_dir.join("objects");
        self.tracker.initialize_from_objects(&objects_dir)
    }

    /// Record a chunk access.
    pub fn record_access(&mut self, hash: &Hash, size: u64) {
        self.tracker.record_access(hash, size);
    }

    /// Mark a chunk as a proxy (never freeze).
    pub fn mark_as_proxy(&mut self, hash: &Hash) {
        self.tracker.mark_as_proxy(hash);
    }

    /// Get the current tier for a chunk.
    pub fn get_tier(&self, hash: &Hash) -> Option<StorageTier> {
        self.tracker.get(hash).map(|r| r.tier)
    }

    /// Set the lifecycle policy.
    pub fn set_policy(&mut self, policy: LifecyclePolicy) {
        self.policy = policy;
    }

    /// Get recommended tier transitions based on policy.
    pub fn get_transitions(&self) -> Vec<TierTransition> {
        self.policy.evaluate_all(self.tracker.all_records())
    }

    /// Freeze chunks (move to colder tier).
    pub fn freeze(&mut self, hashes: &[Hash], target_tier: StorageTier) -> io::Result<FreezeResult> {
        let mut result = FreezeResult::default();
        let objects_dir = self.dits_dir.join("objects");

        for hash in hashes {
            // Get current record info (copy what we need)
            let (tier, is_protected, size) = match self.tracker.get(hash) {
                Some(record) => (record.tier, record.is_protected(), record.size),
                None => {
                    result.not_found.push(*hash);
                    continue;
                }
            };

            // Check if already at or below target tier
            if tier_colder_or_equal(tier, target_tier) {
                result.already_frozen.push(*hash);
                continue;
            }

            // Check if protected
            if is_protected {
                result.protected.push(*hash);
                continue;
            }

            // Move chunk to tiered storage
            let src_chunk_path = chunk_path(&objects_dir, hash);
            if !src_chunk_path.exists() {
                result.not_found.push(*hash);
                continue;
            }

            let tier_dir = self.tier_dir(target_tier);
            fs::create_dir_all(&tier_dir)?;

            let dest_path = tier_chunk_path(&tier_dir, hash);
            fs::create_dir_all(dest_path.parent().unwrap())?;

            // Move or copy based on tier
            if target_tier == StorageTier::Archive {
                // For archive, compress the chunk
                compress_chunk(&src_chunk_path, &dest_path)?;
                fs::remove_file(&src_chunk_path)?;
            } else {
                // For other tiers, just move
                fs::rename(&src_chunk_path, &dest_path)?;
            }

            // Update tracker
            self.tracker.set_tier(hash, target_tier);
            result.frozen.push(*hash);
            result.bytes_moved += size;
        }

        self.tracker.save()?;
        Ok(result)
    }

    /// Thaw chunks (move to warmer tier or hot).
    pub fn thaw(&mut self, hashes: &[Hash]) -> io::Result<ThawResult> {
        let mut result = ThawResult::default();
        let objects_dir = self.dits_dir.join("objects");

        for hash in hashes {
            // Get current record info (copy what we need)
            let (tier, size) = match self.tracker.get(hash) {
                Some(record) => (record.tier, record.size),
                None => {
                    result.not_found.push(*hash);
                    continue;
                }
            };

            // Check if already hot
            if tier == StorageTier::Hot {
                result.already_hot.push(*hash);
                continue;
            }

            // Find the chunk in tiered storage
            let tier_dir = self.tier_dir(tier);
            let tier_path = tier_chunk_path(&tier_dir, hash);

            if !tier_path.exists() {
                result.not_found.push(*hash);
                continue;
            }

            // For archive tier, check if thaw is pending/required
            if tier == StorageTier::Archive {
                // Decompress and restore
                let dest_path = chunk_path(&objects_dir, hash);
                fs::create_dir_all(dest_path.parent().unwrap())?;
                decompress_chunk(&tier_path, &dest_path)?;
                fs::remove_file(&tier_path)?;
            } else {
                // For other tiers, just move back
                let dest_path = chunk_path(&objects_dir, hash);
                fs::create_dir_all(dest_path.parent().unwrap())?;
                fs::rename(&tier_path, &dest_path)?;
            }

            // Update tracker
            self.tracker.set_tier(hash, StorageTier::Hot);
            self.tracker.record_access(hash, size);
            result.thawed.push(*hash);
            result.bytes_restored += size;
        }

        self.tracker.save()?;
        Ok(result)
    }

    /// Request async thaw for archived chunks.
    pub fn request_thaw(&mut self, hashes: &[Hash]) -> io::Result<Vec<ThawStatus>> {
        let mut statuses = Vec::new();

        for hash in hashes {
            let Some(record) = self.tracker.get(hash) else {
                statuses.push(ThawStatus {
                    hash: *hash,
                    status: ThawState::NotFound,
                    eta_seconds: None,
                });
                continue;
            };

            if record.tier != StorageTier::Archive {
                // Not archived, can thaw immediately
                statuses.push(ThawStatus {
                    hash: *hash,
                    status: ThawState::Ready,
                    eta_seconds: Some(0),
                });
            } else if self.thaw_queue.is_pending(hash) {
                // Already requested
                statuses.push(ThawStatus {
                    hash: *hash,
                    status: ThawState::Pending,
                    eta_seconds: self.thaw_queue.eta_seconds(hash),
                });
            } else {
                // Add to queue
                self.thaw_queue.add(*hash, record.size);
                statuses.push(ThawStatus {
                    hash: *hash,
                    status: ThawState::Requested,
                    eta_seconds: Some(60), // Simulated for local storage
                });
            }
        }

        self.thaw_queue.save(&self.dits_dir)?;
        Ok(statuses)
    }

    /// Process pending thaw requests.
    pub fn process_thaw_queue(&mut self) -> io::Result<ThawResult> {
        let ready: Vec<Hash> = self.thaw_queue.ready_hashes();
        if ready.is_empty() {
            return Ok(ThawResult::default());
        }

        let result = self.thaw(&ready)?;

        // Remove processed items from queue
        for hash in &result.thawed {
            self.thaw_queue.remove(hash);
        }
        self.thaw_queue.save(&self.dits_dir)?;

        Ok(result)
    }

    /// Apply policy transitions.
    pub fn apply_policy(&mut self) -> io::Result<FreezeResult> {
        let transitions = self.get_transitions();
        if transitions.is_empty() {
            return Ok(FreezeResult::default());
        }

        let mut combined = FreezeResult::default();

        // Group by target tier
        let mut by_tier: std::collections::HashMap<StorageTier, Vec<Hash>> = std::collections::HashMap::new();
        for t in transitions {
            by_tier.entry(t.to_tier).or_default().push(t.hash);
        }

        for (tier, hashes) in by_tier {
            let result = self.freeze(&hashes, tier)?;
            combined.frozen.extend(result.frozen);
            combined.protected.extend(result.protected);
            combined.not_found.extend(result.not_found);
            combined.already_frozen.extend(result.already_frozen);
            combined.bytes_moved += result.bytes_moved;
        }

        Ok(combined)
    }

    /// Get directory for a tier.
    fn tier_dir(&self, tier: StorageTier) -> PathBuf {
        match tier {
            StorageTier::Hot => self.dits_dir.join("objects"),
            StorageTier::Warm => self.dits_dir.join("warm"),
            StorageTier::Cold => self.dits_dir.join("cold"),
            StorageTier::Archive => self.dits_dir.join("archive"),
        }
    }

    /// Save state.
    pub fn save(&mut self) -> io::Result<()> {
        self.tracker.save()?;
        self.thaw_queue.save(&self.dits_dir)?;
        Ok(())
    }

    /// Get chunks by tier.
    pub fn chunks_by_tier(&self, tier: StorageTier) -> Vec<Hash> {
        self.tracker
            .chunks_in_tier(tier)
            .iter()
            .map(|r| r.hash)
            .collect()
    }

    /// Get total chunk count.
    pub fn total_chunks(&self) -> usize {
        self.tracker.len()
    }

    /// Check if a chunk requires thaw.
    pub fn requires_thaw(&self, hash: &Hash) -> bool {
        self.tracker.get(hash)
            .map(|r| r.tier.requires_thaw())
            .unwrap_or(false)
    }
}

/// Result of a freeze operation.
#[derive(Debug, Default, Clone)]
pub struct FreezeResult {
    /// Successfully frozen chunks.
    pub frozen: Vec<Hash>,
    /// Chunks that were protected (proxy/manifest).
    pub protected: Vec<Hash>,
    /// Chunks not found.
    pub not_found: Vec<Hash>,
    /// Chunks already at target tier.
    pub already_frozen: Vec<Hash>,
    /// Total bytes moved.
    pub bytes_moved: u64,
}

impl FreezeResult {
    pub fn is_success(&self) -> bool {
        !self.frozen.is_empty() && self.not_found.is_empty()
    }
}

/// Result of a thaw operation.
#[derive(Debug, Default, Clone)]
pub struct ThawResult {
    /// Successfully thawed chunks.
    pub thawed: Vec<Hash>,
    /// Chunks not found.
    pub not_found: Vec<Hash>,
    /// Chunks already hot.
    pub already_hot: Vec<Hash>,
    /// Total bytes restored.
    pub bytes_restored: u64,
}

impl ThawResult {
    pub fn is_success(&self) -> bool {
        !self.thawed.is_empty() && self.not_found.is_empty()
    }
}

/// Status of a thaw request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThawStatus {
    pub hash: Hash,
    pub status: ThawState,
    pub eta_seconds: Option<u64>,
}

/// State of a thaw request.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ThawState {
    /// Chunk not found.
    NotFound,
    /// Already available (hot).
    Ready,
    /// Thaw requested, waiting.
    Requested,
    /// Thaw in progress.
    Pending,
    /// Thaw complete, ready to restore.
    Complete,
}

/// Queue of pending thaw requests.
#[derive(Debug, Default, Serialize, Deserialize)]
struct ThawQueue {
    requests: Vec<ThawRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ThawRequest {
    hash: Hash,
    size: u64,
    requested_at: u64,
    #[serde(default)]
    ready_at: Option<u64>,
}

impl ThawQueue {
    fn load(dits_dir: &Path) -> io::Result<Self> {
        let path = dits_dir.join("thaw-queue.json");
        if path.exists() {
            let file = File::open(&path)?;
            let reader = BufReader::new(file);
            Ok(serde_json::from_reader(reader).unwrap_or_default())
        } else {
            Ok(Self::default())
        }
    }

    fn save(&self, dits_dir: &Path) -> io::Result<()> {
        let path = dits_dir.join("thaw-queue.json");
        let file = File::create(&path)?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, self)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))
    }

    fn add(&mut self, hash: Hash, size: u64) {
        if !self.is_pending(&hash) {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);

            self.requests.push(ThawRequest {
                hash,
                size,
                requested_at: now,
                ready_at: Some(now + 60), // Simulate 60-second thaw for local
            });
        }
    }

    fn is_pending(&self, hash: &Hash) -> bool {
        self.requests.iter().any(|r| &r.hash == hash)
    }

    fn eta_seconds(&self, hash: &Hash) -> Option<u64> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        self.requests.iter()
            .find(|r| &r.hash == hash)
            .and_then(|r| r.ready_at)
            .map(|ready| ready.saturating_sub(now))
    }

    fn ready_hashes(&self) -> Vec<Hash> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        self.requests.iter()
            .filter(|r| r.ready_at.map(|t| t <= now).unwrap_or(false))
            .map(|r| r.hash)
            .collect()
    }

    fn remove(&mut self, hash: &Hash) {
        self.requests.retain(|r| &r.hash != hash);
    }
}

// Helper functions

fn chunk_path(objects_dir: &Path, hash: &Hash) -> PathBuf {
    let hex = hash.to_hex();
    objects_dir
        .join("chunks")
        .join(&hex[..2])
        .join(&hex[2..])  // Filename is hash without prefix
}

fn tier_chunk_path(tier_dir: &Path, hash: &Hash) -> PathBuf {
    let hex = hash.to_hex();
    tier_dir
        .join(&hex[..2])
        .join(&hex[2..])  // Filename is hash without prefix
}

fn tier_colder_or_equal(a: StorageTier, b: StorageTier) -> bool {
    let order = |t: StorageTier| match t {
        StorageTier::Hot => 0,
        StorageTier::Warm => 1,
        StorageTier::Cold => 2,
        StorageTier::Archive => 3,
    };
    order(a) >= order(b)
}

fn compress_chunk(src: &Path, dest: &Path) -> io::Result<()> {
    use flate2::write::GzEncoder;
    use flate2::Compression;

    let mut input = File::open(src)?;
    let output = File::create(dest)?;
    let mut encoder = GzEncoder::new(output, Compression::default());

    let mut buffer = Vec::new();
    input.read_to_end(&mut buffer)?;
    encoder.write_all(&buffer)?;
    encoder.finish()?;

    Ok(())
}

fn decompress_chunk(src: &Path, dest: &Path) -> io::Result<()> {
    use flate2::read::GzDecoder;

    let input = File::open(src)?;
    let mut decoder = GzDecoder::new(input);
    let mut output = File::create(dest)?;

    let mut buffer = Vec::new();
    decoder.read_to_end(&mut buffer)?;
    output.write_all(&buffer)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_tier_ordering() {
        assert!(tier_colder_or_equal(StorageTier::Archive, StorageTier::Hot));
        assert!(tier_colder_or_equal(StorageTier::Cold, StorageTier::Warm));
        assert!(tier_colder_or_equal(StorageTier::Hot, StorageTier::Hot));
        assert!(!tier_colder_or_equal(StorageTier::Hot, StorageTier::Warm));
    }
}
