//! File locking types and operations.

use crate::user::User;
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A file lock.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Lock {
    /// Unique lock ID.
    pub id: Uuid,
    /// Locked file path.
    pub path: String,
    /// User who owns the lock.
    pub owner: User,
    /// Repository ID.
    pub repository_id: Uuid,
    /// When the lock was acquired.
    pub locked_at: DateTime<Utc>,
    /// When the lock expires.
    pub expires_at: DateTime<Utc>,
    /// Reason for locking.
    pub reason: Option<String>,
}

impl Lock {
    /// Create a new lock.
    pub fn new(path: impl Into<String>, owner: User, repository_id: Uuid) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            path: path.into(),
            owner,
            repository_id,
            locked_at: now,
            expires_at: now + Duration::hours(24), // Default 24 hour lock
            reason: None,
        }
    }

    /// Create a lock with custom duration.
    pub fn with_duration(
        path: impl Into<String>,
        owner: User,
        repository_id: Uuid,
        duration: Duration,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            path: path.into(),
            owner,
            repository_id,
            locked_at: now,
            expires_at: now + duration,
            reason: None,
        }
    }

    /// Check if the lock is expired.
    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }

    /// Check if the lock is owned by the given user.
    pub fn is_owned_by(&self, user_id: Uuid) -> bool {
        self.owner.id == user_id
    }

    /// Extend the lock duration.
    pub fn extend(&mut self, duration: Duration) {
        self.expires_at = Utc::now() + duration;
    }

    /// Time remaining on the lock.
    pub fn time_remaining(&self) -> Option<Duration> {
        let now = Utc::now();
        if now > self.expires_at {
            None
        } else {
            Some(self.expires_at - now)
        }
    }
}

/// Summary information about a lock.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LockInfo {
    /// Lock ID.
    pub id: Uuid,
    /// Locked file path.
    pub path: String,
    /// Owner's display name.
    pub owner_name: String,
    /// Owner's email.
    pub owner_email: String,
    /// When the lock was acquired.
    pub locked_at: DateTime<Utc>,
    /// When the lock expires.
    pub expires_at: DateTime<Utc>,
    /// Reason for locking.
    pub reason: Option<String>,
}

impl From<Lock> for LockInfo {
    fn from(lock: Lock) -> Self {
        Self {
            id: lock.id,
            path: lock.path,
            owner_name: lock.owner.name,
            owner_email: lock.owner.email,
            locked_at: lock.locked_at,
            expires_at: lock.expires_at,
            reason: lock.reason,
        }
    }
}

/// Request to acquire a lock.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LockRequest {
    /// File path to lock.
    pub path: String,
    /// Duration in seconds.
    pub duration_secs: Option<u64>,
    /// Reason for locking.
    pub reason: Option<String>,
    /// Force acquire (break existing lock).
    pub force: bool,
}

/// Response to a lock request.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LockResponse {
    /// Whether the lock was acquired.
    pub locked: bool,
    /// Lock info (if acquired).
    pub lock: Option<LockInfo>,
    /// Existing lock info (if not acquired).
    pub existing_lock: Option<LockInfo>,
    /// Error message.
    pub message: Option<String>,
}

/// Request to release a lock.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UnlockRequest {
    /// Lock ID or file path.
    pub id: String,
    /// Force release (admin only).
    pub force: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_user() -> User {
        User {
            id: Uuid::new_v4(),
            name: "Test User".to_string(),
            email: "test@example.com".to_string(),
        }
    }

    #[test]
    fn test_lock_new() {
        let user = test_user();
        let repo_id = Uuid::new_v4();
        let lock = Lock::new("project.prproj", user.clone(), repo_id);

        assert_eq!(lock.path, "project.prproj");
        assert!(lock.is_owned_by(user.id));
        assert!(!lock.is_expired());
    }

    #[test]
    fn test_lock_expired() {
        let user = test_user();
        let repo_id = Uuid::new_v4();
        let mut lock = Lock::new("test.txt", user, repo_id);

        // Set expiration to the past
        lock.expires_at = Utc::now() - Duration::hours(1);
        assert!(lock.is_expired());
        assert!(lock.time_remaining().is_none());
    }

    #[test]
    fn test_lock_extend() {
        let user = test_user();
        let repo_id = Uuid::new_v4();
        let mut lock = Lock::new("test.txt", user, repo_id);

        let original_expiry = lock.expires_at;
        lock.extend(Duration::hours(48));

        assert!(lock.expires_at > original_expiry);
    }

    #[test]
    fn test_lock_info_from() {
        let user = test_user();
        let repo_id = Uuid::new_v4();
        let lock = Lock::new("test.txt", user.clone(), repo_id);

        let info: LockInfo = lock.into();
        assert_eq!(info.owner_name, user.name);
        assert_eq!(info.owner_email, user.email);
    }
}
