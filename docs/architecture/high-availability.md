# High Availability & Multi-Region Architecture

Designing Dits for production-grade reliability and global distribution.

---

## Overview

This document covers:
- High availability deployment patterns
- Multi-region replication
- Disaster recovery strategies
- Load balancing and failover
- Data consistency models

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Global Load Balancer                     │
│                    (Cloudflare / AWS Global Accelerator)         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   US-EAST-1     │    │   EU-WEST-1     │    │   AP-SOUTH-1    │
│   (Primary)     │    │   (Secondary)   │    │   (Secondary)   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   API GW    │ │    │ │   API GW    │ │    │ │   API GW    │ │
│ └──────┬──────┘ │    │ └──────┬──────┘ │    │ └──────┬──────┘ │
│        │        │    │        │        │    │        │        │
│ ┌──────┴──────┐ │    │ ┌──────┴──────┐ │    │ ┌──────┴──────┐ │
│ │  App Nodes  │ │    │ │  App Nodes  │ │    │ │  App Nodes  │ │
│ │   (x3-10)   │ │    │ │   (x3-10)   │ │    │ │   (x3-10)   │ │
│ └──────┬──────┘ │    │ └──────┬──────┘ │    │ └──────┬──────┘ │
│        │        │    │        │        │    │        │        │
│ ┌──────┴──────┐ │    │ ┌──────┴──────┐ │    │ ┌──────┴──────┐ │
│ │  PostgreSQL │ │    │ │  PostgreSQL │ │    │ │  PostgreSQL │ │
│ │  (Primary)  │◄┼────┼─│  (Replica)  │─┼────┼─│  (Replica)  │ │
│ └──────┬──────┘ │    │ └──────┬──────┘ │    │ └──────┬──────┘ │
│        │        │    │        │        │    │        │        │
│ ┌──────┴──────┐ │    │ ┌──────┴──────┐ │    │ ┌──────┴──────┐ │
│ │    Redis    │ │    │ │    Redis    │ │    │ │    Redis    │ │
│ │  (Primary)  │◄┼────┼─│  (Replica)  │─┼────┼─│  (Replica)  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │     S3      │◄┼────┼─│     S3      │─┼────┼─│     S3      │ │
│ │   Bucket    │ │    │ │  (Replica)  │ │    │ │  (Replica)  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## High Availability Patterns

### Application Layer HA

```rust
/// Application node configuration
pub struct NodeConfig {
    /// Node identifier
    pub node_id: String,

    /// Region identifier
    pub region: String,

    /// Availability zone
    pub availability_zone: String,

    /// Health check configuration
    pub health: HealthConfig,

    /// Cluster membership
    pub cluster: ClusterConfig,
}

/// Health check configuration
pub struct HealthConfig {
    /// Health check endpoint
    pub endpoint: String,

    /// Check interval
    pub interval: Duration,

    /// Unhealthy threshold
    pub unhealthy_threshold: u32,

    /// Healthy threshold
    pub healthy_threshold: u32,
}

impl HealthCheck {
    /// Perform comprehensive health check
    pub async fn check(&self) -> HealthStatus {
        let mut status = HealthStatus::Healthy;
        let mut details = Vec::new();

        // Check database
        match self.check_database().await {
            Ok(_) => details.push(("database", true)),
            Err(e) => {
                status = HealthStatus::Unhealthy;
                details.push(("database", false));
            }
        }

        // Check Redis
        match self.check_redis().await {
            Ok(_) => details.push(("redis", true)),
            Err(e) => {
                status = HealthStatus::Degraded;
                details.push(("redis", false));
            }
        }

        // Check S3
        match self.check_storage().await {
            Ok(_) => details.push(("storage", true)),
            Err(e) => {
                status = HealthStatus::Unhealthy;
                details.push(("storage", false));
            }
        }

        // Check memory/CPU
        if self.memory_usage() > 0.9 {
            status = HealthStatus::Degraded;
            details.push(("memory", false));
        }

        HealthStatus {
            status,
            details,
            timestamp: Utc::now(),
        }
    }
}
```

### Database HA

#### PostgreSQL Streaming Replication

```yaml
# Primary server configuration
# postgresql.conf

wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
synchronous_commit = on
synchronous_standby_names = 'ANY 1 (replica1, replica2)'

# Hot standby settings (for replicas)
hot_standby = on
hot_standby_feedback = on
```

```yaml
# Kubernetes StatefulSet for PostgreSQL HA
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secrets
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 5
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

#### Automatic Failover with Patroni

```yaml
# patroni.yml
scope: dits-cluster
name: node1

restapi:
  listen: 0.0.0.0:8008
  connect_address: node1:8008

etcd3:
  hosts:
    - etcd1:2379
    - etcd2:2379
    - etcd3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_level: replica
        max_wal_senders: 10
        max_replication_slots: 10
        synchronous_commit: on

postgresql:
  listen: 0.0.0.0:5432
  connect_address: node1:5432
  data_dir: /var/lib/postgresql/16/main
  authentication:
    replication:
      username: replicator
      password: secret
    superuser:
      username: postgres
      password: secret
```

### Redis HA

```yaml
# Redis Sentinel configuration
sentinel monitor dits-master 10.0.0.1 6379 2
sentinel down-after-milliseconds dits-master 5000
sentinel failover-timeout dits-master 60000
sentinel parallel-syncs dits-master 1

# Kubernetes Redis with Sentinel
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          command:
            - redis-server
            - /etc/redis/redis.conf
            - --replica-of
            - $(MASTER_HOST)
            - "6379"
          volumeMounts:
            - name: config
              mountPath: /etc/redis
            - name: data
              mountPath: /data
        - name: sentinel
          image: redis:7-alpine
          ports:
            - containerPort: 26379
          command:
            - redis-sentinel
            - /etc/redis/sentinel.conf
```

---

## Multi-Region Replication

### Data Replication Strategy

```rust
/// Replication configuration
pub struct ReplicationConfig {
    /// Primary region
    pub primary_region: String,

    /// Secondary regions
    pub secondary_regions: Vec<RegionConfig>,

    /// Replication mode
    pub mode: ReplicationMode,

    /// Conflict resolution
    pub conflict_resolution: ConflictResolution,
}

pub enum ReplicationMode {
    /// Synchronous replication (strong consistency)
    Synchronous {
        quorum: u32,
    },

    /// Asynchronous replication (eventual consistency)
    Asynchronous {
        max_lag: Duration,
    },

    /// Semi-synchronous (acknowledged by at least one replica)
    SemiSynchronous {
        min_replicas: u32,
    },
}

pub enum ConflictResolution {
    /// Last write wins based on timestamp
    LastWriteWins,

    /// Primary region always wins
    PrimaryWins,

    /// Custom resolver function
    Custom(Box<dyn ConflictResolver>),
}

impl MultiRegionReplicator {
    /// Replicate write to secondary regions
    pub async fn replicate(&self, write: &Write) -> Result<ReplicationResult> {
        match &self.config.mode {
            ReplicationMode::Synchronous { quorum } => {
                // Wait for quorum acknowledgment
                let results = self.replicate_to_all(write).await;
                let acks = results.iter().filter(|r| r.is_ok()).count();

                if acks as u32 >= *quorum {
                    Ok(ReplicationResult::Success { acks: acks as u32 })
                } else {
                    Err(Error::QuorumNotReached)
                }
            }

            ReplicationMode::Asynchronous { max_lag } => {
                // Enqueue for async replication
                self.replication_queue.enqueue(write).await?;
                Ok(ReplicationResult::Queued)
            }

            ReplicationMode::SemiSynchronous { min_replicas } => {
                // Wait for at least one replica
                let (tx, mut rx) = mpsc::channel(self.config.secondary_regions.len());

                for region in &self.config.secondary_regions {
                    let write = write.clone();
                    let region = region.clone();
                    let tx = tx.clone();

                    tokio::spawn(async move {
                        let result = self.replicate_to_region(&region, &write).await;
                        let _ = tx.send(result).await;
                    });
                }

                let mut acks = 0;
                while let Some(result) = rx.recv().await {
                    if result.is_ok() {
                        acks += 1;
                        if acks >= *min_replicas {
                            return Ok(ReplicationResult::Success { acks });
                        }
                    }
                }

                Err(Error::InsufficientReplicas)
            }
        }
    }
}
```

### S3 Cross-Region Replication

```json
{
  "Role": "arn:aws:iam::account:role/dits-replication",
  "Rules": [
    {
      "ID": "ReplicateAll",
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {},
      "Destination": {
        "Bucket": "arn:aws:s3:::dits-storage-eu-west-1",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {
            "Minutes": 15
          }
        },
        "Metrics": {
          "Status": "Enabled",
          "EventThreshold": {
            "Minutes": 15
          }
        }
      },
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      }
    }
  ]
}
```

### Conflict Resolution

```rust
/// Handle conflicts in multi-region writes
pub struct ConflictResolver {
    strategy: ConflictStrategy,
}

impl ConflictResolver {
    /// Resolve conflict between two versions
    pub fn resolve(
        &self,
        local: &Version,
        remote: &Version,
    ) -> Resolution {
        match &self.strategy {
            ConflictStrategy::LastWriteWins => {
                if local.timestamp > remote.timestamp {
                    Resolution::KeepLocal
                } else {
                    Resolution::KeepRemote
                }
            }

            ConflictStrategy::PrimaryWins => {
                if local.region == self.primary_region {
                    Resolution::KeepLocal
                } else if remote.region == self.primary_region {
                    Resolution::KeepRemote
                } else {
                    // Fall back to LWW
                    self.resolve_lww(local, remote)
                }
            }

            ConflictStrategy::Merge => {
                // For chunk-based data, we can merge
                Resolution::Merge(self.merge_versions(local, remote))
            }
        }
    }

    /// Merge two versions of a manifest
    fn merge_versions(&self, local: &Version, remote: &Version) -> MergedVersion {
        let local_manifest = local.manifest();
        let remote_manifest = remote.manifest();

        let mut merged = Manifest::new();

        // Include all entries, preferring newer versions
        for entry in local_manifest.entries.iter().chain(remote_manifest.entries.iter()) {
            merged.insert_if_newer(entry);
        }

        MergedVersion {
            manifest: merged,
            parents: vec![local.hash.clone(), remote.hash.clone()],
        }
    }
}
```

---

## Load Balancing

### Global Load Balancer Configuration

```terraform
# Cloudflare Load Balancer
resource "cloudflare_load_balancer" "dits" {
  zone_id          = var.zone_id
  name             = "api.dits.io"
  fallback_pool_id = cloudflare_load_balancer_pool.primary.id
  default_pool_ids = [
    cloudflare_load_balancer_pool.primary.id,
    cloudflare_load_balancer_pool.eu.id,
    cloudflare_load_balancer_pool.ap.id
  ]

  steering_policy = "geo"

  pop_pools {
    pop  = "EWR"
    pool_ids = [cloudflare_load_balancer_pool.primary.id]
  }
  pop_pools {
    pop  = "LHR"
    pool_ids = [cloudflare_load_balancer_pool.eu.id]
  }
  pop_pools {
    pop  = "SIN"
    pool_ids = [cloudflare_load_balancer_pool.ap.id]
  }

  region_pools {
    region   = "WNAM"
    pool_ids = [cloudflare_load_balancer_pool.primary.id]
  }
  region_pools {
    region   = "EEUR"
    pool_ids = [cloudflare_load_balancer_pool.eu.id]
  }
  region_pools {
    region   = "SEAS"
    pool_ids = [cloudflare_load_balancer_pool.ap.id]
  }
}

resource "cloudflare_load_balancer_pool" "primary" {
  name = "us-east-primary"

  origins {
    name    = "us-east-1a"
    address = "api-us-east-1a.dits.io"
    enabled = true
    weight  = 1.0
  }
  origins {
    name    = "us-east-1b"
    address = "api-us-east-1b.dits.io"
    enabled = true
    weight  = 1.0
  }

  minimum_origins = 1

  monitor = cloudflare_load_balancer_monitor.health.id
}

resource "cloudflare_load_balancer_monitor" "health" {
  type           = "https"
  expected_body  = "OK"
  expected_codes = "200"
  method         = "GET"
  timeout        = 5
  path           = "/health"
  interval       = 60
  retries        = 2
}
```

### Regional Load Balancing

```yaml
# AWS ALB configuration
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dits-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '30'
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '5'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '3'
spec:
  rules:
    - host: api.dits.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dits-server
                port:
                  number: 80
```

---

## Disaster Recovery

### Backup Strategy

```rust
/// Backup configuration
pub struct BackupConfig {
    /// Backup frequency
    pub frequency: Duration,

    /// Retention policy
    pub retention: RetentionPolicy,

    /// Backup destinations
    pub destinations: Vec<BackupDestination>,

    /// Encryption settings
    pub encryption: EncryptionConfig,
}

/// Retention policy
pub struct RetentionPolicy {
    /// Keep hourly backups for N days
    pub hourly_days: u32,

    /// Keep daily backups for N weeks
    pub daily_weeks: u32,

    /// Keep weekly backups for N months
    pub weekly_months: u32,

    /// Keep monthly backups for N years
    pub monthly_years: u32,
}

impl BackupManager {
    /// Perform full backup
    pub async fn full_backup(&self) -> Result<BackupResult> {
        let backup_id = Uuid::new_v4();
        let timestamp = Utc::now();

        // Backup database
        let db_backup = self.backup_database(&backup_id).await?;

        // Backup metadata
        let meta_backup = self.backup_metadata(&backup_id).await?;

        // Verify chunk integrity (chunks are immutable, no backup needed)
        let chunk_manifest = self.create_chunk_manifest(&backup_id).await?;

        // Create backup manifest
        let manifest = BackupManifest {
            id: backup_id,
            timestamp,
            database: db_backup,
            metadata: meta_backup,
            chunks: chunk_manifest,
        };

        // Upload to backup destinations
        for dest in &self.config.destinations {
            self.upload_backup(&manifest, dest).await?;
        }

        Ok(BackupResult {
            id: backup_id,
            size: manifest.total_size(),
            duration: timestamp.elapsed(),
        })
    }

    /// Restore from backup
    pub async fn restore(&self, backup_id: Uuid) -> Result<RestoreResult> {
        // Download backup manifest
        let manifest = self.download_manifest(backup_id).await?;

        // Verify backup integrity
        self.verify_backup(&manifest).await?;

        // Restore database
        self.restore_database(&manifest.database).await?;

        // Restore metadata
        self.restore_metadata(&manifest.metadata).await?;

        // Verify chunk availability
        self.verify_chunks(&manifest.chunks).await?;

        Ok(RestoreResult {
            backup_id,
            restored_at: Utc::now(),
        })
    }
}
```

### Recovery Procedures

```bash
#!/bin/bash
# disaster-recovery.sh

# Variables
BACKUP_BUCKET="s3://dits-backups"
RESTORE_REGION="us-west-2"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

echo "Starting disaster recovery to $RESTORE_REGION"

# 1. Provision infrastructure
echo "Provisioning infrastructure..."
terraform apply -var="region=$RESTORE_REGION" -auto-approve

# 2. Wait for resources
echo "Waiting for resources..."
aws rds wait db-instance-available --db-instance-identifier dits-restore

# 3. Restore database from snapshot
echo "Restoring database..."
LATEST_SNAPSHOT=$(aws rds describe-db-snapshots \
    --db-instance-identifier dits-primary \
    --query 'DBSnapshots[-1].DBSnapshotIdentifier' \
    --output text)

aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier dits-restore \
    --db-snapshot-identifier $LATEST_SNAPSHOT \
    --db-instance-class db.r6g.xlarge

# 4. Update DNS
echo "Updating DNS..."
aws route53 change-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --change-batch file://dns-failover.json

# 5. Verify services
echo "Verifying services..."
curl -f https://api-$RESTORE_REGION.dits.io/health

# 6. Notify team
echo "Sending notifications..."
aws sns publish \
    --topic-arn arn:aws:sns:us-east-1:account:dits-alerts \
    --message "DR completed. Services restored to $RESTORE_REGION"

echo "Disaster recovery complete"
```

### RTO/RPO Targets

| Tier | RTO | RPO | Strategy |
|------|-----|-----|----------|
| Standard | 4 hours | 1 hour | Daily backups, async replication |
| Professional | 1 hour | 15 min | Hourly backups, sync replication |
| Enterprise | 15 min | 5 min | Real-time replication, hot standby |
| Enterprise+ | 5 min | 1 min | Active-active, global distribution |

---

## Monitoring & Alerting

### Health Metrics

```rust
/// Metrics to monitor for HA
pub struct HAMetrics {
    // Replication lag
    replication_lag_seconds: Histogram,

    // Failover events
    failover_count: Counter,
    failover_duration_seconds: Histogram,

    // Region health
    region_healthy: Gauge,
    region_latency_seconds: Histogram,

    // Database
    db_connections_active: Gauge,
    db_replication_state: Gauge,

    // Storage
    s3_replication_pending: Gauge,
    s3_replication_failed: Counter,
}
```

### Alerting Rules

```yaml
# prometheus-rules.yaml
groups:
  - name: ha-alerts
    rules:
      - alert: ReplicationLagHigh
        expr: dits_replication_lag_seconds > 60
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Replication lag exceeds 60 seconds

      - alert: ReplicationLagCritical
        expr: dits_replication_lag_seconds > 300
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: Replication lag exceeds 5 minutes

      - alert: RegionDown
        expr: dits_region_healthy == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Region {{ $labels.region }} is down

      - alert: FailoverTriggered
        expr: increase(dits_failover_count[5m]) > 0
        labels:
          severity: warning
        annotations:
          summary: Failover triggered in {{ $labels.region }}

      - alert: DatabaseReplicationBroken
        expr: dits_db_replication_state != 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Database replication is broken
```

---

## Cost Optimization

### Multi-Region Cost Considerations

| Component | Single Region | Multi-Region (3) |
|-----------|---------------|------------------|
| Compute | $X | ~2.5X |
| Database | $X | ~3X |
| Storage | $X | ~1.5X (with dedup) |
| Transfer | $X | ~2X |
| Total | $X | ~2.2X |

### Optimization Strategies

1. **Storage Deduplication**: Chunks are globally deduplicated
2. **Read Replicas**: Use read replicas instead of full writes
3. **Regional Caching**: CDN for frequently accessed content
4. **Off-Peak Replication**: Schedule non-critical replication

---

## Notes

- Minimum 3 regions recommended for enterprise deployments
- Synchronous replication adds latency but ensures consistency
- Test failover procedures quarterly
- Document and automate all recovery procedures
- Monitor replication lag as key health indicator
