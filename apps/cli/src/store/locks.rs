//! File locking for exclusive editing.
//!
//! Provides file-level locks to prevent concurrent edits to binary files.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{BufReader, BufWriter};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Default lock TTL (8 hours).
const DEFAULT_TTL_SECS: u64 = 8 * 60 * 60;

/// A file lock.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lock {
    /// Path being locked (relative to repo root).
    pub path: String,
    /// Owner (user identifier).
    pub owner: String,
    /// When the lock was acquired (Unix timestamp).
    pub acquired_at: u64,
    /// When the lock expires (Unix timestamp).
    pub expires_at: u64,
    /// Optional reason for locking.
    pub reason: Option<String>,
}

impl Lock {
    /// Create a new lock.
    pub fn new(path: impl Into<String>, owner: impl Into<String>, ttl_secs: u64) -> Self {
        let now = current_timestamp();
        Self {
            path: path.into(),
            owner: owner.into(),
            acquired_at: now,
            expires_at: now + ttl_secs,
            reason: None,
        }
    }

    /// Create a lock with a reason.
    pub fn with_reason(mut self, reason: impl Into<String>) -> Self {
        self.reason = Some(reason.into());
        self
    }

    /// Check if the lock is expired.
    pub fn is_expired(&self) -> bool {
        current_timestamp() > self.expires_at
    }

    /// Get time until expiration.
    pub fn time_until_expiry(&self) -> Option<Duration> {
        let now = current_timestamp();
        if self.expires_at > now {
            Some(Duration::from_secs(self.expires_at - now))
        } else {
            None
        }
    }

    /// Format expiry as human-readable string.
    pub fn expires_in_human(&self) -> String {
        if let Some(duration) = self.time_until_expiry() {
            let secs = duration.as_secs();
            if secs >= 3600 {
                format!("{}h {}m", secs / 3600, (secs % 3600) / 60)
            } else if secs >= 60 {
                format!("{}m", secs / 60)
            } else {
                format!("{}s", secs)
            }
        } else {
            "expired".to_string()
        }
    }
}

/// Lock store - manages file locks for a repository.
#[derive(Debug)]
pub struct LockStore {
    /// Path to the locks file.
    locks_path: PathBuf,
    /// Cached locks.
    locks: HashMap<String, Lock>,
}

impl LockStore {
    /// Open or create a lock store in the given .dits directory.
    pub fn new(dits_dir: &Path) -> Self {
        let locks_path = dits_dir.join("locks.json");
        let locks = Self::load(&locks_path).unwrap_or_default();
        Self { locks_path, locks }
    }

    /// Load locks from disk.
    fn load(path: &Path) -> Option<HashMap<String, Lock>> {
        if !path.exists() {
            return None;
        }
        let file = File::open(path).ok()?;
        let reader = BufReader::new(file);
        serde_json::from_reader(reader).ok()
    }

    /// Save locks to disk.
    pub fn save(&self) -> std::io::Result<()> {
        let file = File::create(&self.locks_path)?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, &self.locks)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
    }

    /// Acquire a lock on a file.
    pub fn acquire(
        &mut self,
        path: &str,
        owner: &str,
        ttl_secs: Option<u64>,
        reason: Option<&str>,
        force: bool,
    ) -> Result<Lock, LockError> {
        // Clean up expired locks first
        self.cleanup_expired();

        // Check if already locked
        if let Some(existing) = self.locks.get(path) {
            if !existing.is_expired() && !force {
                return Err(LockError::AlreadyLocked {
                    path: path.to_string(),
                    owner: existing.owner.clone(),
                    expires_in: existing.expires_in_human(),
                });
            }
        }

        let ttl = ttl_secs.unwrap_or(DEFAULT_TTL_SECS);
        let mut lock = Lock::new(path, owner, ttl);
        if let Some(r) = reason {
            lock = lock.with_reason(r);
        }

        self.locks.insert(path.to_string(), lock.clone());
        self.save()?;

        Ok(lock)
    }

    /// Release a lock.
    pub fn release(&mut self, path: &str, owner: &str, force: bool) -> Result<(), LockError> {
        let lock = self.locks.get(path)
            .ok_or_else(|| LockError::NotLocked(path.to_string()))?;

        // Check ownership
        if lock.owner != owner && !force {
            return Err(LockError::NotOwner {
                path: path.to_string(),
                owner: lock.owner.clone(),
            });
        }

        self.locks.remove(path);
        self.save()?;

        Ok(())
    }

    /// Get lock for a path.
    pub fn get(&self, path: &str) -> Option<&Lock> {
        self.locks.get(path).filter(|l| !l.is_expired())
    }

    /// List all active (non-expired) locks.
    pub fn list(&self) -> Vec<&Lock> {
        self.locks.values()
            .filter(|l| !l.is_expired())
            .collect()
    }

    /// List locks owned by a specific user.
    pub fn list_by_owner(&self, owner: &str) -> Vec<&Lock> {
        self.locks.values()
            .filter(|l| !l.is_expired() && l.owner == owner)
            .collect()
    }

    /// Check if a path is locked.
    pub fn is_locked(&self, path: &str) -> bool {
        self.get(path).is_some()
    }

    /// Clean up expired locks.
    pub fn cleanup_expired(&mut self) {
        let expired: Vec<String> = self.locks.iter()
            .filter(|(_, l)| l.is_expired())
            .map(|(p, _)| p.clone())
            .collect();

        for path in expired {
            self.locks.remove(&path);
        }

        if !self.locks.is_empty() {
            let _ = self.save();
        }
    }

    /// Release all locks owned by a user.
    pub fn release_all_by_owner(&mut self, owner: &str) -> Result<usize, LockError> {
        let to_remove: Vec<String> = self.locks.iter()
            .filter(|(_, l)| l.owner == owner)
            .map(|(p, _)| p.clone())
            .collect();

        let count = to_remove.len();
        for path in to_remove {
            self.locks.remove(&path);
        }

        self.save()?;
        Ok(count)
    }
}

/// Lock errors.
#[derive(Debug, thiserror::Error)]
pub enum LockError {
    #[error("File '{path}' is already locked by {owner} (expires in {expires_in})")]
    AlreadyLocked {
        path: String,
        owner: String,
        expires_in: String,
    },

    #[error("File '{0}' is not locked")]
    NotLocked(String),

    #[error("Cannot unlock '{path}': owned by {owner}")]
    NotOwner { path: String, owner: String },

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
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
    fn test_acquire_release() {
        let dir = tempdir().unwrap();
        let mut store = LockStore::new(dir.path());

        // Acquire lock
        let lock = store.acquire("test.mov", "user@example.com", None, None, false).unwrap();
        assert_eq!(lock.path, "test.mov");
        assert!(store.is_locked("test.mov"));

        // Release lock
        store.release("test.mov", "user@example.com", false).unwrap();
        assert!(!store.is_locked("test.mov"));
    }

    #[test]
    fn test_already_locked() {
        let dir = tempdir().unwrap();
        let mut store = LockStore::new(dir.path());

        store.acquire("test.mov", "user1@example.com", None, None, false).unwrap();

        // Another user tries to lock
        let result = store.acquire("test.mov", "user2@example.com", None, None, false);
        assert!(matches!(result, Err(LockError::AlreadyLocked { .. })));
    }

    #[test]
    fn test_force_lock() {
        let dir = tempdir().unwrap();
        let mut store = LockStore::new(dir.path());

        store.acquire("test.mov", "user1@example.com", None, None, false).unwrap();

        // Force acquire
        let lock = store.acquire("test.mov", "user2@example.com", None, None, true).unwrap();
        assert_eq!(lock.owner, "user2@example.com");
    }

    #[test]
    fn test_list_by_owner() {
        let dir = tempdir().unwrap();
        let mut store = LockStore::new(dir.path());

        store.acquire("a.mov", "user1@example.com", None, None, false).unwrap();
        store.acquire("b.mov", "user1@example.com", None, None, false).unwrap();
        store.acquire("c.mov", "user2@example.com", None, None, false).unwrap();

        let user1_locks = store.list_by_owner("user1@example.com");
        assert_eq!(user1_locks.len(), 2);
    }

    #[test]
    fn test_persistence() {
        let dir = tempdir().unwrap();

        // Acquire and save
        {
            let mut store = LockStore::new(dir.path());
            store.acquire("test.mov", "user@example.com", Some(3600), Some("Editing"), false).unwrap();
        }

        // Load and verify
        {
            let store = LockStore::new(dir.path());
            let lock = store.get("test.mov").unwrap();
            assert_eq!(lock.owner, "user@example.com");
            assert_eq!(lock.reason, Some("Editing".to_string()));
        }
    }
}
