# Rate Limiting & Quotas

Request throttling, resource quotas, and fair usage policies.

---

## Overview

Dits implements multi-level rate limiting and quota management to ensure fair resource allocation and protect system stability. This document covers:

- API rate limiting algorithms
- Storage and transfer quotas
- Burst handling
- Enterprise overrides
- Implementation details

---

## Rate Limiting Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Request Flow                             │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                    Global Rate Limiter                          │
│              (Cloudflare / CDN Edge)                           │
│            • DDoS protection                                    │
│            • IP-based limits                                    │
│            • Geographic limits                                  │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                    Application Rate Limiter                     │
│                      (Redis-backed)                            │
│            • User-based limits                                  │
│            • API key limits                                     │
│            • Endpoint-specific limits                           │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                       Quota Manager                             │
│                      (Database-backed)                         │
│            • Storage quotas                                     │
│            • Transfer quotas                                    │
│            • Repository limits                                  │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                       Request Handler                           │
└────────────────────────────────────────────────────────────────┘
```

---

## Rate Limiting Algorithms

### Token Bucket Algorithm

```rust
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};

/// Token bucket rate limiter
pub struct TokenBucket {
    /// Maximum tokens (burst capacity)
    capacity: u64,

    /// Current token count
    tokens: AtomicU64,

    /// Tokens added per second
    refill_rate: f64,

    /// Last refill timestamp
    last_refill: AtomicU64,
}

impl TokenBucket {
    pub fn new(capacity: u64, refill_rate: f64) -> Self {
        Self {
            capacity,
            tokens: AtomicU64::new(capacity),
            refill_rate,
            last_refill: AtomicU64::new(now_millis()),
        }
    }

    /// Try to consume tokens
    pub fn try_acquire(&self, tokens: u64) -> RateLimitResult {
        self.refill();

        let current = self.tokens.load(Ordering::Relaxed);
        if current >= tokens {
            self.tokens.fetch_sub(tokens, Ordering::Relaxed);
            RateLimitResult::Allowed {
                remaining: current - tokens,
                reset_at: self.next_reset(),
            }
        } else {
            RateLimitResult::Limited {
                retry_after: self.time_until_tokens(tokens),
                limit: self.capacity,
            }
        }
    }

    fn refill(&self) {
        let now = now_millis();
        let last = self.last_refill.load(Ordering::Relaxed);
        let elapsed_ms = now.saturating_sub(last);

        if elapsed_ms > 0 {
            let tokens_to_add = (elapsed_ms as f64 / 1000.0 * self.refill_rate) as u64;
            if tokens_to_add > 0 {
                let current = self.tokens.load(Ordering::Relaxed);
                let new_tokens = std::cmp::min(current + tokens_to_add, self.capacity);
                self.tokens.store(new_tokens, Ordering::Relaxed);
                self.last_refill.store(now, Ordering::Relaxed);
            }
        }
    }

    fn time_until_tokens(&self, needed: u64) -> Duration {
        let current = self.tokens.load(Ordering::Relaxed);
        if current >= needed {
            Duration::ZERO
        } else {
            let deficit = needed - current;
            Duration::from_secs_f64(deficit as f64 / self.refill_rate)
        }
    }
}
```

### Sliding Window Log

```rust
use redis::AsyncCommands;

/// Sliding window rate limiter using Redis
pub struct SlidingWindowLimiter {
    redis: redis::Client,
    window_size: Duration,
    max_requests: u64,
}

impl SlidingWindowLimiter {
    pub async fn check(&self, key: &str) -> RateLimitResult {
        let mut conn = self.redis.get_async_connection().await?;

        let now = Utc::now().timestamp_millis();
        let window_start = now - self.window_size.as_millis() as i64;

        // Redis pipeline for atomic operations
        let (count, _): (u64, ()) = redis::pipe()
            // Remove old entries
            .zrembyscore(key, 0, window_start)
            // Count entries in window
            .zcard(key)
            // Add current request
            .zadd(key, now, format!("{}:{}", now, uuid::Uuid::new_v4()))
            // Set expiry
            .expire(key, self.window_size.as_secs() as usize)
            .query_async(&mut conn)
            .await?;

        if count < self.max_requests {
            RateLimitResult::Allowed {
                remaining: self.max_requests - count - 1,
                reset_at: Utc::now() + self.window_size,
            }
        } else {
            RateLimitResult::Limited {
                retry_after: self.calculate_retry_after(&mut conn, key, window_start).await?,
                limit: self.max_requests,
            }
        }
    }

    async fn calculate_retry_after(
        &self,
        conn: &mut redis::aio::Connection,
        key: &str,
        window_start: i64,
    ) -> Result<Duration> {
        // Get oldest entry in window
        let oldest: Vec<(String, i64)> = conn
            .zrangebyscore_withscores(key, window_start, "+inf")
            .await?;

        if let Some((_, timestamp)) = oldest.first() {
            let expires_at = *timestamp + self.window_size.as_millis() as i64;
            let now = Utc::now().timestamp_millis();
            Ok(Duration::from_millis((expires_at - now).max(0) as u64))
        } else {
            Ok(Duration::ZERO)
        }
    }
}
```

### Fixed Window Counter

```rust
/// Simple fixed window counter for high-throughput scenarios
pub struct FixedWindowCounter {
    redis: redis::Client,
    window_size: Duration,
    max_requests: u64,
}

impl FixedWindowCounter {
    pub async fn check(&self, key: &str) -> RateLimitResult {
        let mut conn = self.redis.get_async_connection().await?;

        // Get current window
        let window = Utc::now().timestamp() / self.window_size.as_secs() as i64;
        let window_key = format!("{}:{}", key, window);

        // Increment and check
        let count: u64 = conn.incr(&window_key, 1).await?;

        if count == 1 {
            // First request in window, set expiry
            conn.expire(&window_key, self.window_size.as_secs() as usize).await?;
        }

        if count <= self.max_requests {
            RateLimitResult::Allowed {
                remaining: self.max_requests - count,
                reset_at: self.window_end(window),
            }
        } else {
            RateLimitResult::Limited {
                retry_after: self.time_until_window_end(window),
                limit: self.max_requests,
            }
        }
    }
}
```

---

## Rate Limit Configuration

### Per-Tier Limits

```rust
/// Rate limit configuration by tier
pub struct RateLimitConfig {
    /// Tier-specific limits
    pub tiers: HashMap<Tier, TierLimits>,

    /// Default limits
    pub default: TierLimits,

    /// Global limits (across all users)
    pub global: GlobalLimits,
}

#[derive(Debug, Clone)]
pub struct TierLimits {
    /// API requests per minute
    pub api_rpm: u64,

    /// API requests per hour
    pub api_rph: u64,

    /// Upload bytes per hour
    pub upload_bph: u64,

    /// Download bytes per hour
    pub download_bph: u64,

    /// Concurrent connections
    pub max_connections: u32,

    /// Burst multiplier
    pub burst_multiplier: f64,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        let mut tiers = HashMap::new();

        tiers.insert(Tier::Free, TierLimits {
            api_rpm: 60,
            api_rph: 1_000,
            upload_bph: 1_073_741_824,      // 1 GB
            download_bph: 5_368_709_120,     // 5 GB
            max_connections: 2,
            burst_multiplier: 1.5,
        });

        tiers.insert(Tier::Pro, TierLimits {
            api_rpm: 600,
            api_rph: 10_000,
            upload_bph: 107_374_182_400,     // 100 GB
            download_bph: 536_870_912_000,   // 500 GB
            max_connections: 8,
            burst_multiplier: 2.0,
        });

        tiers.insert(Tier::Team, TierLimits {
            api_rpm: 3_000,
            api_rph: 100_000,
            upload_bph: 1_099_511_627_776,   // 1 TB
            download_bph: 5_497_558_138_880, // 5 TB
            max_connections: 32,
            burst_multiplier: 3.0,
        });

        tiers.insert(Tier::Enterprise, TierLimits {
            api_rpm: 10_000,
            api_rph: 1_000_000,
            upload_bph: u64::MAX,
            download_bph: u64::MAX,
            max_connections: 128,
            burst_multiplier: 5.0,
        });

        Self {
            tiers,
            default: TierLimits {
                api_rpm: 30,
                api_rph: 500,
                upload_bph: 536_870_912,    // 512 MB
                download_bph: 1_073_741_824, // 1 GB
                max_connections: 1,
                burst_multiplier: 1.0,
            },
            global: GlobalLimits::default(),
        }
    }
}
```

### Endpoint-Specific Limits

```rust
/// Endpoint-specific rate limits
pub struct EndpointLimits {
    /// Default limit for all endpoints
    pub default: RateLimit,

    /// Per-endpoint overrides
    pub endpoints: HashMap<String, RateLimit>,
}

impl EndpointLimits {
    pub fn new() -> Self {
        let mut endpoints = HashMap::new();

        // High-frequency endpoints
        endpoints.insert("GET /health".into(), RateLimit::unlimited());
        endpoints.insert("GET /status".into(), RateLimit::unlimited());

        // Read operations (higher limits)
        endpoints.insert("GET /api/v1/repos".into(), RateLimit::per_minute(100));
        endpoints.insert("GET /api/v1/repos/:id".into(), RateLimit::per_minute(200));
        endpoints.insert("GET /api/v1/chunks/:hash".into(), RateLimit::per_minute(1000));

        // Write operations (stricter limits)
        endpoints.insert("POST /api/v1/repos".into(), RateLimit::per_hour(10));
        endpoints.insert("PUT /api/v1/chunks/:hash".into(), RateLimit::per_minute(100));
        endpoints.insert("POST /api/v1/commits".into(), RateLimit::per_hour(100));

        // Expensive operations
        endpoints.insert("POST /api/v1/repos/:id/gc".into(), RateLimit::per_day(1));
        endpoints.insert("POST /api/v1/repos/:id/fsck".into(), RateLimit::per_day(5));

        Self {
            default: RateLimit::per_minute(60),
            endpoints,
        }
    }

    pub fn get(&self, endpoint: &str) -> &RateLimit {
        self.endpoints.get(endpoint).unwrap_or(&self.default)
    }
}
```

---

## Storage Quotas

### Quota Management

```rust
/// Storage quota configuration
#[derive(Debug, Clone)]
pub struct StorageQuota {
    /// Maximum storage in bytes
    pub storage_bytes: u64,

    /// Maximum repositories
    pub max_repositories: u32,

    /// Maximum collaborators per repo
    pub max_collaborators: u32,

    /// Maximum file size
    pub max_file_size: u64,

    /// Maximum upload size per request
    pub max_upload_size: u64,
}

/// Quota manager
pub struct QuotaManager {
    db: Database,
    cache: Cache,
}

impl QuotaManager {
    /// Check if operation is within quota
    pub async fn check_quota(
        &self,
        user_id: &Uuid,
        operation: &QuotaOperation,
    ) -> Result<QuotaCheckResult> {
        // Get current usage
        let usage = self.get_usage(user_id).await?;

        // Get quota limits
        let quota = self.get_quota(user_id).await?;

        match operation {
            QuotaOperation::Upload { size } => {
                if usage.storage_bytes + size > quota.storage_bytes {
                    return Ok(QuotaCheckResult::Exceeded {
                        current: usage.storage_bytes,
                        limit: quota.storage_bytes,
                        required: *size,
                    });
                }
            }

            QuotaOperation::CreateRepository => {
                if usage.repositories >= quota.max_repositories {
                    return Ok(QuotaCheckResult::Exceeded {
                        current: usage.repositories as u64,
                        limit: quota.max_repositories as u64,
                        required: 1,
                    });
                }
            }

            QuotaOperation::AddCollaborator { repo_id } => {
                let collaborators = self.count_collaborators(repo_id).await?;
                if collaborators >= quota.max_collaborators {
                    return Ok(QuotaCheckResult::Exceeded {
                        current: collaborators as u64,
                        limit: quota.max_collaborators as u64,
                        required: 1,
                    });
                }
            }
        }

        Ok(QuotaCheckResult::Allowed {
            remaining: self.calculate_remaining(&usage, &quota, operation),
        })
    }

    /// Update usage after operation
    pub async fn record_usage(
        &self,
        user_id: &Uuid,
        operation: &QuotaOperation,
    ) -> Result<()> {
        match operation {
            QuotaOperation::Upload { size } => {
                sqlx::query!(
                    r#"
                    UPDATE user_quotas
                    SET storage_bytes_used = storage_bytes_used + $1,
                        updated_at = NOW()
                    WHERE user_id = $2
                    "#,
                    *size as i64,
                    user_id
                )
                .execute(&self.db)
                .await?;
            }

            QuotaOperation::Delete { size } => {
                sqlx::query!(
                    r#"
                    UPDATE user_quotas
                    SET storage_bytes_used = GREATEST(0, storage_bytes_used - $1),
                        updated_at = NOW()
                    WHERE user_id = $2
                    "#,
                    *size as i64,
                    user_id
                )
                .execute(&self.db)
                .await?;
            }

            _ => {}
        }

        // Invalidate cache
        self.cache.delete(&format!("quota:{}", user_id)).await?;

        Ok(())
    }
}
```

### Transfer Quotas

```rust
/// Transfer quota tracking
pub struct TransferQuotaTracker {
    redis: redis::Client,
    window: Duration,
}

impl TransferQuotaTracker {
    /// Track transfer and check quota
    pub async fn track_transfer(
        &self,
        user_id: &Uuid,
        direction: TransferDirection,
        bytes: u64,
    ) -> Result<TransferQuotaResult> {
        let key = format!("transfer:{}:{}", direction, user_id);
        let mut conn = self.redis.get_async_connection().await?;

        // Get current window
        let window = Utc::now().timestamp() / self.window.as_secs() as i64;
        let window_key = format!("{}:{}", key, window);

        // Increment and get total
        let total: u64 = conn.incr(&window_key, bytes).await?;

        // Set expiry if first entry
        if total == bytes {
            conn.expire(&window_key, self.window.as_secs() as usize * 2).await?;
        }

        // Get quota
        let quota = self.get_transfer_quota(user_id, direction).await?;

        if total > quota {
            Ok(TransferQuotaResult::Exceeded {
                used: total,
                limit: quota,
                reset_at: self.window_end(window),
            })
        } else {
            Ok(TransferQuotaResult::Allowed {
                used: total,
                remaining: quota - total,
            })
        }
    }
}
```

---

## Response Headers

### Rate Limit Headers

```rust
impl RateLimitResult {
    /// Generate response headers
    pub fn to_headers(&self) -> HeaderMap {
        let mut headers = HeaderMap::new();

        match self {
            RateLimitResult::Allowed { remaining, reset_at } => {
                headers.insert("X-RateLimit-Remaining", remaining.into());
                headers.insert("X-RateLimit-Reset", reset_at.timestamp().into());
            }

            RateLimitResult::Limited { retry_after, limit } => {
                headers.insert("X-RateLimit-Limit", limit.into());
                headers.insert("X-RateLimit-Remaining", 0.into());
                headers.insert("Retry-After", retry_after.as_secs().into());
            }
        }

        headers
    }
}
```

### Example Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704672060
Retry-After: 45

{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please retry after 45 seconds.",
    "details": {
      "limit": 60,
      "window": "1m",
      "reset_at": "2025-01-08T12:01:00Z"
    }
  }
}
```

---

## Quota Dashboard

### Usage API

```rust
/// Usage summary endpoint
#[get("/api/v1/usage")]
async fn get_usage(user: User, quota_manager: &QuotaManager) -> Json<UsageSummary> {
    let usage = quota_manager.get_usage(&user.id).await?;
    let quota = quota_manager.get_quota(&user.id).await?;

    Json(UsageSummary {
        storage: StorageUsage {
            used_bytes: usage.storage_bytes,
            limit_bytes: quota.storage_bytes,
            percentage: (usage.storage_bytes as f64 / quota.storage_bytes as f64) * 100.0,
        },
        transfer: TransferUsage {
            upload: TransferMetric {
                used_bytes: usage.upload_bytes,
                limit_bytes: quota.upload_bytes_per_hour,
                window: "1h",
                reset_at: usage.upload_reset_at,
            },
            download: TransferMetric {
                used_bytes: usage.download_bytes,
                limit_bytes: quota.download_bytes_per_hour,
                window: "1h",
                reset_at: usage.download_reset_at,
            },
        },
        repositories: RepositoryUsage {
            count: usage.repositories,
            limit: quota.max_repositories,
        },
        api: ApiUsage {
            requests_this_minute: usage.api_requests_minute,
            limit_per_minute: quota.api_rpm,
            requests_this_hour: usage.api_requests_hour,
            limit_per_hour: quota.api_rph,
        },
    })
}
```

---

## Burst Handling

### Burst Configuration

```rust
/// Burst handling configuration
pub struct BurstConfig {
    /// Burst multiplier (e.g., 2x normal rate)
    pub multiplier: f64,

    /// Burst duration
    pub duration: Duration,

    /// Cooldown period after burst
    pub cooldown: Duration,

    /// Maximum bursts per day
    pub max_bursts_per_day: u32,
}

impl BurstHandler {
    /// Check if burst is available
    pub async fn can_burst(&self, user_id: &Uuid) -> bool {
        let bursts_today = self.get_burst_count(user_id).await;
        let last_burst = self.get_last_burst(user_id).await;

        bursts_today < self.config.max_bursts_per_day
            && last_burst.map_or(true, |t| t + self.config.cooldown < Utc::now())
    }

    /// Activate burst mode
    pub async fn activate_burst(&self, user_id: &Uuid) -> Result<BurstActivation> {
        if !self.can_burst(user_id).await {
            return Err(Error::BurstNotAvailable);
        }

        let activation = BurstActivation {
            user_id: *user_id,
            activated_at: Utc::now(),
            expires_at: Utc::now() + self.config.duration,
            multiplier: self.config.multiplier,
        };

        self.store_activation(&activation).await?;
        self.increment_burst_count(user_id).await?;

        Ok(activation)
    }
}
```

---

## Enterprise Overrides

```rust
/// Enterprise custom limits
pub struct EnterpriseOverride {
    /// Organization ID
    pub org_id: Uuid,

    /// Custom rate limits
    pub rate_limits: Option<TierLimits>,

    /// Custom quotas
    pub quotas: Option<StorageQuota>,

    /// Dedicated resources
    pub dedicated: DedicatedResources,

    /// Priority level
    pub priority: Priority,
}

impl RateLimiter {
    /// Get limits for user, considering enterprise overrides
    pub async fn get_effective_limits(&self, user: &User) -> TierLimits {
        // Check for organization override
        if let Some(org_id) = &user.organization_id {
            if let Some(override_) = self.get_enterprise_override(org_id).await? {
                if let Some(limits) = override_.rate_limits {
                    return limits;
                }
            }
        }

        // Fall back to tier limits
        self.config.tiers.get(&user.tier)
            .cloned()
            .unwrap_or_else(|| self.config.default.clone())
    }
}
```

---

## Monitoring

### Metrics

```rust
/// Rate limiting metrics
pub struct RateLimitMetrics {
    /// Requests allowed
    requests_allowed: Counter,

    /// Requests limited
    requests_limited: Counter,

    /// Current rate by user
    current_rate: Gauge,

    /// Quota usage percentage
    quota_usage: Histogram,

    /// Burst activations
    burst_activations: Counter,
}

// Prometheus metrics
static RATE_LIMIT_REQUESTS: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "dits_rate_limit_requests_total",
        "Total rate limit decisions",
        &["result", "tier", "endpoint"]
    ).unwrap()
});

static QUOTA_USAGE: Lazy<GaugeVec> = Lazy::new(|| {
    register_gauge_vec!(
        "dits_quota_usage_ratio",
        "Quota usage as a ratio (0-1)",
        &["user_id", "quota_type"]
    ).unwrap()
});
```

---

## CLI Commands

```bash
# Check current usage
dits quota show

# Output:
# Storage: 45.2 GB / 100 GB (45.2%)
# Transfer (this hour):
#   Upload:   2.1 GB / 100 GB
#   Download: 15.3 GB / 500 GB
# Repositories: 12 / unlimited
# API Requests (this minute): 23 / 600

# Request quota increase
dits quota request-increase --storage 500GB --reason "Large project migration"

# Check rate limit status
dits rate-limit status

# Output:
# Current rate: 45 req/min
# Limit: 600 req/min
# Burst available: Yes (2/5 today)
```

---

## Notes

- Rate limits apply per user, not per IP
- Authenticated requests have higher limits than anonymous
- Enterprise customers can request custom limits
- Burst mode provides temporary limit increases
- All limits are documented at docs.dits.io/limits
