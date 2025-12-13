# Lock (The Guardian)

A lock prevents concurrent modifications to binary files, ensuring editors don't overwrite each other's work.

---

## Data Structure

```rust
/// Lock represents an exclusive edit lock on a file
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Lock {
    /// Unique lock identifier
    pub id: Uuid,

    /// Repository the lock belongs to
    pub repo_id: Uuid,

    /// Path to the locked file (relative to repo root)
    pub path: String,

    /// User who holds the lock
    pub owner: LockOwner,

    /// When the lock was acquired
    pub locked_at: DateTime<Utc>,

    /// When the lock expires (if not refreshed)
    pub expires_at: DateTime<Utc>,

    /// Why the file was locked
    pub reason: Option<String>,

    /// Lock type
    pub lock_type: LockType,

    /// Commit hash when lock was acquired (for conflict detection)
    pub locked_at_commit: Option<CommitHash>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LockOwner {
    pub user_id: Uuid,
    pub username: String,
    pub email: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum LockType {
    /// Exclusive edit lock (default)
    Exclusive,

    /// Soft lock (advisory only, not enforced)
    Advisory,

    /// Read lock (for critical operations like archiving)
    Shared,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LockRequest {
    pub path: String,
    pub reason: Option<String>,
    pub lock_type: LockType,
    pub ttl_seconds: Option<u64>,  // Time-to-live, default 8 hours
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LockResult {
    pub lock: Lock,
    pub status: LockStatus,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum LockStatus {
    Acquired,
    AlreadyHeld,      // You already have this lock
    Denied { holder: LockOwner, locked_at: DateTime<Utc>, reason: Option<String> },
    PathNotFound,
    PermissionDenied,
}
```

---

## Database Schema

```sql
-- Locks table
CREATE TABLE locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id),
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    lock_type TEXT NOT NULL DEFAULT 'exclusive',
    locked_at_commit TEXT,

    UNIQUE (repo_id, path)  -- Only one lock per file
);

-- Index for querying user's locks
CREATE INDEX idx_locks_owner ON locks(owner_id);

-- Index for expiry cleanup
CREATE INDEX idx_locks_expires ON locks(expires_at);

-- Lock history for audit
CREATE TABLE lock_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lock_id UUID NOT NULL,
    repo_id UUID NOT NULL,
    path TEXT NOT NULL,
    owner_id UUID NOT NULL,
    action TEXT NOT NULL,  -- 'acquired', 'released', 'expired', 'force_released'
    action_by UUID,        -- Who performed action (for force release)
    action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT
);

CREATE INDEX idx_lock_history_repo ON lock_history(repo_id, action_at DESC);
CREATE INDEX idx_lock_history_path ON lock_history(repo_id, path, action_at DESC);
```

---

## Operations

### Acquire Lock

```rust
pub async fn acquire_lock(
    repo_id: Uuid,
    request: LockRequest,
    user: &User,
    db: &Pool,
    redis: &RedisClient,
) -> Result<LockResult> {
    // Validate path exists in repository
    if !path_exists(repo_id, &request.path, db).await? {
        return Ok(LockResult {
            lock: Lock::default(),
            status: LockStatus::PathNotFound,
        });
    }

    // Check user has permission to lock
    if !user.can_lock(repo_id, &request.path) {
        return Ok(LockResult {
            lock: Lock::default(),
            status: LockStatus::PermissionDenied,
        });
    }

    let ttl = Duration::seconds(request.ttl_seconds.unwrap_or(8 * 3600) as i64);
    let expires_at = Utc::now() + ttl;

    // Try to acquire lock atomically
    let lock = Lock {
        id: Uuid::new_v4(),
        repo_id,
        path: request.path.clone(),
        owner: LockOwner {
            user_id: user.id,
            username: user.username.clone(),
            email: user.email.clone(),
        },
        locked_at: Utc::now(),
        expires_at,
        reason: request.reason,
        lock_type: request.lock_type,
        locked_at_commit: get_head_commit(repo_id, db).await.ok(),
    };

    // Use Redis for distributed locking with PostgreSQL as source of truth
    let redis_key = format!("lock:{}:{}", repo_id, request.path);

    // Try Redis first (fast path)
    let acquired = redis.set_nx(&redis_key, &lock.id.to_string(), Some(ttl)).await?;

    if acquired {
        // Persist to database
        sqlx::query!(
            r#"
            INSERT INTO locks (id, repo_id, path, owner_id, expires_at, reason, lock_type, locked_at_commit)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
            lock.id,
            lock.repo_id,
            lock.path,
            lock.owner.user_id,
            lock.expires_at,
            lock.reason,
            lock.lock_type.as_str(),
            lock.locked_at_commit.as_ref().map(|c| c.as_str()),
        )
        .execute(db)
        .await?;

        // Record in history
        record_lock_action(&lock, "acquired", None, db).await?;

        // Broadcast lock event
        broadcast_lock_event(repo_id, LockEvent::Acquired(lock.clone())).await;

        return Ok(LockResult {
            lock,
            status: LockStatus::Acquired,
        });
    }

    // Lock exists, check who holds it
    let existing = get_lock(repo_id, &request.path, db).await?;

    if let Some(existing_lock) = existing {
        if existing_lock.owner.user_id == user.id {
            // User already holds this lock
            return Ok(LockResult {
                lock: existing_lock,
                status: LockStatus::AlreadyHeld,
            });
        }

        // Someone else holds it
        return Ok(LockResult {
            lock: Lock::default(),
            status: LockStatus::Denied {
                holder: existing_lock.owner,
                locked_at: existing_lock.locked_at,
                reason: existing_lock.reason,
            },
        });
    }

    // Race condition: Redis says locked but DB doesn't have it
    // Retry once
    Err(Error::LockConflict)
}
```

### Release Lock

```rust
pub async fn release_lock(
    repo_id: Uuid,
    path: &str,
    user: &User,
    db: &Pool,
    redis: &RedisClient,
) -> Result<()> {
    // Get existing lock
    let lock = get_lock(repo_id, path, db).await?
        .ok_or(Error::LockNotFound)?;

    // Verify ownership
    if lock.owner.user_id != user.id {
        return Err(Error::NotLockOwner);
    }

    // Remove from Redis
    let redis_key = format!("lock:{}:{}", repo_id, path);
    redis.del(&redis_key).await?;

    // Remove from database
    sqlx::query!(
        "DELETE FROM locks WHERE repo_id = $1 AND path = $2",
        repo_id,
        path,
    )
    .execute(db)
    .await?;

    // Record in history
    record_lock_action(&lock, "released", None, db).await?;

    // Broadcast unlock event
    broadcast_lock_event(repo_id, LockEvent::Released {
        path: path.to_string(),
        by: user.id,
    }).await;

    Ok(())
}
```

### Force Release Lock (Admin)

```rust
pub async fn force_release_lock(
    repo_id: Uuid,
    path: &str,
    admin: &User,
    reason: &str,
    db: &Pool,
    redis: &RedisClient,
) -> Result<()> {
    // Verify admin permission
    if !admin.is_admin_for(repo_id) {
        return Err(Error::PermissionDenied);
    }

    let lock = get_lock(repo_id, path, db).await?
        .ok_or(Error::LockNotFound)?;

    // Remove from Redis
    let redis_key = format!("lock:{}:{}", repo_id, path);
    redis.del(&redis_key).await?;

    // Remove from database
    sqlx::query!(
        "DELETE FROM locks WHERE repo_id = $1 AND path = $2",
        repo_id,
        path,
    )
    .execute(db)
    .await?;

    // Record in history with admin info
    record_lock_action(&lock, "force_released", Some(admin.id), db).await?;

    // Notify the lock owner
    notify_user(lock.owner.user_id, Notification::LockForceReleased {
        path: path.to_string(),
        by: admin.username.clone(),
        reason: reason.to_string(),
    }).await;

    // Broadcast
    broadcast_lock_event(repo_id, LockEvent::ForceReleased {
        path: path.to_string(),
        previous_owner: lock.owner.user_id,
        by: admin.id,
    }).await;

    Ok(())
}
```

### Refresh Lock

```rust
pub async fn refresh_lock(
    repo_id: Uuid,
    path: &str,
    user: &User,
    new_ttl: Option<Duration>,
    db: &Pool,
    redis: &RedisClient,
) -> Result<Lock> {
    let lock = get_lock(repo_id, path, db).await?
        .ok_or(Error::LockNotFound)?;

    if lock.owner.user_id != user.id {
        return Err(Error::NotLockOwner);
    }

    let ttl = new_ttl.unwrap_or(Duration::hours(8));
    let new_expires = Utc::now() + ttl;

    // Update Redis TTL
    let redis_key = format!("lock:{}:{}", repo_id, path);
    redis.expire(&redis_key, ttl.num_seconds() as usize).await?;

    // Update database
    sqlx::query!(
        "UPDATE locks SET expires_at = $3 WHERE repo_id = $1 AND path = $2",
        repo_id,
        path,
        new_expires,
    )
    .execute(db)
    .await?;

    Ok(Lock {
        expires_at: new_expires,
        ..lock
    })
}
```

### List Locks

```rust
pub async fn list_locks(
    repo_id: Uuid,
    filter: LockFilter,
    db: &Pool,
) -> Result<Vec<Lock>> {
    let mut query = "SELECT * FROM locks WHERE repo_id = $1".to_string();
    let mut params: Vec<&(dyn ToSql + Sync)> = vec![&repo_id];

    if let Some(user_id) = filter.owner_id {
        query.push_str(" AND owner_id = $2");
        params.push(&user_id);
    }

    if let Some(path_prefix) = &filter.path_prefix {
        query.push_str(" AND path LIKE $3");
        let pattern = format!("{}%", path_prefix);
        params.push(&pattern);
    }

    if filter.include_expired {
        // No filter
    } else {
        query.push_str(" AND expires_at > NOW()");
    }

    query.push_str(" ORDER BY locked_at DESC");

    let rows = sqlx::query_as::<_, LockRow>(&query)
        .bind_all(params)
        .fetch_all(db)
        .await?;

    Ok(rows.into_iter().map(Lock::from).collect())
}
```

### Cleanup Expired Locks

```rust
pub async fn cleanup_expired_locks(
    db: &Pool,
    redis: &RedisClient,
) -> Result<u64> {
    // Find expired locks
    let expired = sqlx::query!(
        r#"
        SELECT id, repo_id, path, owner_id
        FROM locks
        WHERE expires_at < NOW()
        "#
    )
    .fetch_all(db)
    .await?;

    let count = expired.len() as u64;

    for lock in &expired {
        // Remove from Redis (may already be gone)
        let redis_key = format!("lock:{}:{}", lock.repo_id, lock.path);
        let _ = redis.del(&redis_key).await;

        // Record expiry in history
        sqlx::query!(
            r#"
            INSERT INTO lock_history (lock_id, repo_id, path, owner_id, action)
            VALUES ($1, $2, $3, $4, 'expired')
            "#,
            lock.id,
            lock.repo_id,
            lock.path,
            lock.owner_id,
        )
        .execute(db)
        .await?;

        // Broadcast
        broadcast_lock_event(lock.repo_id, LockEvent::Expired {
            path: lock.path.clone(),
        }).await;
    }

    // Delete from database
    sqlx::query!("DELETE FROM locks WHERE expires_at < NOW()")
        .execute(db)
        .await?;

    Ok(count)
}
```

---

## VFS Integration

```rust
impl VirtualFilesystem {
    /// Check if file can be opened for writing
    pub async fn check_write_access(&self, path: &str) -> Result<WriteAccess> {
        let lock = self.lock_manager.get_lock(&self.repo_id, path).await?;

        match lock {
            Some(lock) if lock.owner.user_id == self.user_id => {
                Ok(WriteAccess::Allowed)
            }
            Some(lock) => {
                Ok(WriteAccess::Denied {
                    reason: format!(
                        "Locked by {} since {}",
                        lock.owner.username,
                        lock.locked_at.format("%Y-%m-%d %H:%M")
                    ),
                })
            }
            None => {
                // Check if locking is required
                if self.repo_settings.require_lock_for_edit {
                    Ok(WriteAccess::RequiresLock)
                } else {
                    Ok(WriteAccess::Allowed)
                }
            }
        }
    }

    /// Set file permissions based on lock status
    pub fn get_file_permissions(&self, path: &str) -> u32 {
        let access = self.check_write_access(path).await;

        match access {
            Ok(WriteAccess::Allowed) => 0o644,  // rw-r--r--
            _ => 0o444,                          // r--r--r--
        }
    }
}
```

---

## Notes

- Locks are advisory by default but enforced by VFS
- TTL prevents abandoned locks from blocking forever
- Heartbeat/refresh extends lock lifetime
- Force release requires admin privileges
- Lock history provides audit trail
- Redis provides distributed coordination, PostgreSQL is source of truth
- WebSocket broadcasts lock events in real-time
