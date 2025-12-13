# Backup and Disaster Recovery Guide

Complete guide to backup strategies and disaster recovery procedures for Dits.

---

## Overview

Dits data falls into three categories requiring different backup strategies:

| Data Type | Location | Backup Method | RPO | RTO |
|-----------|----------|---------------|-----|-----|
| Metadata | PostgreSQL | pg_dump, streaming replication | 1 min | 5 min |
| Chunk data | S3/Object Storage | Cross-region replication | 0 (sync) | Instant |
| Cache | Redis | Optional - can rebuild | N/A | N/A |
| Config | Files/K8s | GitOps, etcd backup | Instant | 5 min |

---

## Backup Strategies

### PostgreSQL Database

#### Logical Backups (pg_dump)

```bash
# Full database backup
pg_dump -h localhost -U dits -d dits -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Backup specific tables
pg_dump -h localhost -U dits -d dits -t repositories -t commits -F c -f repos_backup.dump

# Parallel backup for large databases
pg_dump -h localhost -U dits -d dits -F d -j 4 -f backup_dir/
```

#### Automated Backup Script

```bash
#!/bin/bash
# backup-postgres.sh

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-dits}"
DB_NAME="${DB_NAME:-dits}"
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-dits-backups}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dits_$TIMESTAMP.dump"

# Create backup
echo "Starting backup at $(date)"
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

# Calculate checksum
sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/postgres/"
aws s3 cp "$BACKUP_FILE.sha256" "s3://$S3_BUCKET/postgres/"

# Clean up old local backups
find "$BACKUP_DIR" -name "*.dump.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.sha256" -mtime +$RETENTION_DAYS -delete

# Clean up old S3 backups (using lifecycle policy is preferred)
echo "Backup completed: $BACKUP_FILE"
```

#### Continuous Archiving (WAL)

```ini
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://dits-backups/wal/%f'
archive_timeout = 60
```

#### Point-in-Time Recovery Setup

```yaml
# pg_hba.conf for streaming replication
host replication replicator 10.0.0.0/8 scram-sha-256
```

```bash
# On replica server
pg_basebackup -h primary -D /var/lib/postgresql/data -U replicator -P -R
```

### Object Storage (S3)

#### Cross-Region Replication

```json
{
  "Rules": [
    {
      "ID": "ReplicateChunks",
      "Status": "Enabled",
      "Priority": 1,
      "DeleteMarkerReplication": { "Status": "Disabled" },
      "Filter": { "Prefix": "chunks/" },
      "Destination": {
        "Bucket": "arn:aws:s3:::dits-chunks-dr",
        "StorageClass": "STANDARD_IA",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": { "Minutes": 15 }
        },
        "Metrics": {
          "Status": "Enabled",
          "EventThreshold": { "Minutes": 15 }
        }
      }
    }
  ]
}
```

#### Versioning

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket dits-chunks \
  --versioning-configuration Status=Enabled

# List versions
aws s3api list-object-versions --bucket dits-chunks --prefix chunks/
```

#### Lifecycle Policies

```json
{
  "Rules": [
    {
      "ID": "TransitionToIA",
      "Status": "Enabled",
      "Filter": { "Prefix": "chunks/" },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    }
  ]
}
```

### Redis Cache

Redis data is ephemeral and can be rebuilt. Optional backup:

```bash
# Trigger RDB snapshot
redis-cli BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backups/redis/dump_$(date +%Y%m%d).rdb

# Upload to S3
aws s3 cp /backups/redis/dump_$(date +%Y%m%d).rdb s3://dits-backups/redis/
```

### Configuration Backup

#### Kubernetes

```bash
# Backup all resources in namespace
kubectl get all,configmap,secret,pvc -n dits -o yaml > dits-resources.yaml

# Backup using Velero
velero backup create dits-backup --include-namespaces dits
```

#### Docker Compose

```bash
# Backup compose files and env
tar -czf config_backup.tar.gz docker-compose.yml .env config/
```

---

## Restore Procedures

### PostgreSQL Restore

#### From pg_dump

```bash
# Stop application
kubectl scale deployment dits-api -n dits --replicas=0

# Restore database
gunzip -c backup.dump.gz | pg_restore -h localhost -U dits -d dits -c

# Verify data
psql -h localhost -U dits -d dits -c "SELECT COUNT(*) FROM repositories;"

# Restart application
kubectl scale deployment dits-api -n dits --replicas=3
```

#### Point-in-Time Recovery

```bash
# Stop PostgreSQL
systemctl stop postgresql

# Restore base backup
rm -rf /var/lib/postgresql/data/*
tar -xzf base_backup.tar.gz -C /var/lib/postgresql/data/

# Configure recovery
cat > /var/lib/postgresql/data/recovery.signal << EOF
EOF

cat >> /var/lib/postgresql/data/postgresql.conf << EOF
restore_command = 'aws s3 cp s3://dits-backups/wal/%f %p'
recovery_target_time = '2024-01-15 14:30:00 UTC'
recovery_target_action = 'promote'
EOF

# Start PostgreSQL
systemctl start postgresql
```

### Object Storage Restore

#### From Cross-Region Replica

```bash
# Update application config to use DR bucket
kubectl set env deployment/dits-api -n dits \
  S3_BUCKET=dits-chunks-dr \
  S3_REGION=us-west-2

# Or restore chunks to primary bucket
aws s3 sync s3://dits-chunks-dr/chunks/ s3://dits-chunks/chunks/
```

#### Restore Deleted Objects

```bash
# List deleted objects
aws s3api list-object-versions --bucket dits-chunks \
  --prefix chunks/ --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}'

# Restore specific version
aws s3api delete-object --bucket dits-chunks \
  --key chunks/abc123 --version-id "delete-marker-version-id"
```

### Redis Restore

```bash
# Stop Redis
systemctl stop redis

# Restore RDB file
cp backup/dump.rdb /var/lib/redis/dump.rdb
chown redis:redis /var/lib/redis/dump.rdb

# Start Redis
systemctl start redis
```

### Full System Restore

```bash
#!/bin/bash
# full-restore.sh

set -euo pipefail

BACKUP_DATE="$1"
S3_BUCKET="dits-backups"

echo "Starting full system restore from $BACKUP_DATE"

# 1. Restore PostgreSQL
echo "Step 1: Restoring PostgreSQL..."
aws s3 cp "s3://$S3_BUCKET/postgres/dits_$BACKUP_DATE.dump.gz" /tmp/
gunzip /tmp/dits_$BACKUP_DATE.dump.gz

kubectl exec -it postgresql-0 -n dits -- \
  pg_restore -U dits -d dits -c /tmp/dits_$BACKUP_DATE.dump

# 2. Verify S3 replication
echo "Step 2: Verifying object storage..."
PRIMARY_COUNT=$(aws s3 ls s3://dits-chunks/chunks/ --recursive | wc -l)
DR_COUNT=$(aws s3 ls s3://dits-chunks-dr/chunks/ --recursive | wc -l)

if [ "$PRIMARY_COUNT" -lt "$DR_COUNT" ]; then
  echo "Primary bucket has fewer objects, syncing from DR..."
  aws s3 sync s3://dits-chunks-dr/chunks/ s3://dits-chunks/chunks/
fi

# 3. Restart services
echo "Step 3: Restarting services..."
kubectl rollout restart deployment -n dits

# 4. Run integrity check
echo "Step 4: Running integrity check..."
kubectl exec -it deployment/dits-api -n dits -- dits-admin verify --all

echo "Restore completed successfully"
```

---

## Disaster Recovery Scenarios

### Scenario 1: Single AZ Failure

**Detection:**
- CloudWatch/monitoring alerts
- Health check failures

**Response:**
1. Traffic automatically routes to healthy AZ (if multi-AZ)
2. If not multi-AZ, manually switch to DR region

```bash
# Update DNS to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123 \
  --change-batch file://failover-dns.json
```

### Scenario 2: Database Corruption

**Detection:**
- Application errors
- Data integrity alerts

**Response:**
```bash
# 1. Stop writes immediately
kubectl scale deployment dits-api -n dits --replicas=0

# 2. Assess corruption extent
psql -h localhost -U dits -d dits -c "
  SELECT relname, n_dead_tup, last_vacuum
  FROM pg_stat_user_tables
  ORDER BY n_dead_tup DESC;
"

# 3. Restore from backup
pg_restore -h localhost -U dits -d dits_restored backup.dump

# 4. Compare data
pg_dump dits | md5sum
pg_dump dits_restored | md5sum

# 5. Switch databases
psql -c "ALTER DATABASE dits RENAME TO dits_corrupted;"
psql -c "ALTER DATABASE dits_restored RENAME TO dits;"

# 6. Restart application
kubectl scale deployment dits-api -n dits --replicas=3
```

### Scenario 3: Complete Region Failure

**Response Time Target:** < 30 minutes

**Runbook:**

```bash
#!/bin/bash
# dr-failover.sh

set -euo pipefail

DR_REGION="us-west-2"
DR_CLUSTER="dits-dr"

echo "Starting DR failover to $DR_REGION"

# 1. Verify DR infrastructure
echo "Step 1: Verifying DR infrastructure..."
aws eks describe-cluster --name $DR_CLUSTER --region $DR_REGION

# 2. Update kubeconfig
aws eks update-kubeconfig --name $DR_CLUSTER --region $DR_REGION

# 3. Scale up DR cluster
echo "Step 2: Scaling DR cluster..."
kubectl scale deployment dits-api -n dits --replicas=3
kubectl scale statefulset dits-storage -n dits --replicas=3

# 4. Verify PostgreSQL replica is caught up
echo "Step 3: Verifying database..."
REPLICA_LAG=$(kubectl exec -it postgresql-0 -n dits -- \
  psql -U dits -t -c "SELECT pg_last_wal_replay_lsn() - pg_last_wal_receive_lsn();")

if [ "$REPLICA_LAG" != "0" ]; then
  echo "Warning: Replica lag detected: $REPLICA_LAG"
fi

# 5. Promote PostgreSQL replica
echo "Step 4: Promoting database replica..."
kubectl exec -it postgresql-0 -n dits -- \
  psql -U dits -c "SELECT pg_promote();"

# 6. Update DNS
echo "Step 5: Updating DNS..."
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.dits.example.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "dits-dr.us-west-2.elb.amazonaws.com"}]
      }
    }]
  }'

# 7. Verify services
echo "Step 6: Verifying services..."
for i in {1..30}; do
  if curl -s https://api.dits.example.com/health | grep -q "healthy"; then
    echo "Services are healthy"
    break
  fi
  sleep 10
done

echo "DR failover completed"
```

### Scenario 4: Ransomware/Security Incident

**Response:**

```bash
# 1. Isolate affected systems
kubectl cordon --all
kubectl drain --all --force

# 2. Preserve evidence
kubectl logs deployment/dits-api -n dits --all-containers > /evidence/api-logs.txt
kubectl get events -n dits > /evidence/events.txt

# 3. Restore from known-good backup
# (Use backup from before incident)
./full-restore.sh 20240114_060000

# 4. Change all credentials
kubectl delete secret dits-secrets -n dits
kubectl create secret generic dits-secrets -n dits \
  --from-literal=DATABASE_URL="postgres://..." \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)"

# 5. Rotate API keys
psql -c "UPDATE api_keys SET revoked_at = NOW();"
```

---

## Backup Verification

### Automated Verification

```bash
#!/bin/bash
# verify-backups.sh

set -euo pipefail

BACKUP_BUCKET="dits-backups"
VERIFY_DB="dits_verify"

echo "Starting backup verification"

# 1. Download latest backup
LATEST_BACKUP=$(aws s3 ls s3://$BACKUP_BUCKET/postgres/ --recursive | sort | tail -1 | awk '{print $4}')
aws s3 cp "s3://$BACKUP_BUCKET/$LATEST_BACKUP" /tmp/verify_backup.dump.gz

# 2. Verify checksum
aws s3 cp "s3://$BACKUP_BUCKET/${LATEST_BACKUP%.dump.gz}.sha256" /tmp/
cd /tmp && sha256sum -c verify_backup.dump.gz.sha256

# 3. Restore to test database
dropdb --if-exists $VERIFY_DB
createdb $VERIFY_DB
gunzip -c /tmp/verify_backup.dump.gz | pg_restore -d $VERIFY_DB

# 4. Run integrity checks
psql -d $VERIFY_DB -c "
  SELECT
    (SELECT COUNT(*) FROM repositories) as repos,
    (SELECT COUNT(*) FROM commits) as commits,
    (SELECT COUNT(*) FROM chunks) as chunks;
"

# 5. Verify foreign key constraints
psql -d $VERIFY_DB -c "
  SELECT conname, conrelid::regclass, confrelid::regclass
  FROM pg_constraint
  WHERE contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_depend d
    WHERE d.objid = pg_constraint.oid
  );
"

# 6. Clean up
dropdb $VERIFY_DB
rm /tmp/verify_backup.*

echo "Backup verification completed successfully"
```

### Monthly DR Drill

```markdown
## DR Drill Checklist

### Pre-Drill
- [ ] Notify stakeholders
- [ ] Ensure DR environment is ready
- [ ] Document current production state

### Drill Execution
- [ ] Simulate primary region failure
- [ ] Execute failover runbook
- [ ] Measure RTO (target: < 30 min)
- [ ] Verify application functionality
- [ ] Test write operations
- [ ] Verify data integrity

### Post-Drill
- [ ] Document actual RTO
- [ ] Note any issues encountered
- [ ] Update runbooks if needed
- [ ] Failback to primary
- [ ] Verify data sync
```

---

## Monitoring and Alerts

### Backup Monitoring

```yaml
# prometheus-rules.yaml
groups:
  - name: backup-alerts
    rules:
      - alert: BackupMissing
        expr: |
          time() - backup_last_success_timestamp{type="postgres"} > 86400
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL backup missing for 24+ hours"

      - alert: BackupFailed
        expr: backup_last_status == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Backup job failed"

      - alert: ReplicationLag
        expr: pg_replication_lag_seconds > 300
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL replication lag > 5 minutes"

      - alert: S3ReplicationLag
        expr: s3_replication_pending_objects > 1000
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "S3 cross-region replication backlog"
```

### Backup Metrics

```go
// Export backup metrics
var (
    backupLastSuccess = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "backup_last_success_timestamp",
            Help: "Timestamp of last successful backup",
        },
        []string{"type"},
    )

    backupDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "backup_duration_seconds",
            Help:    "Backup duration in seconds",
            Buckets: []float64{60, 300, 600, 1800, 3600},
        },
        []string{"type"},
    )

    backupSize = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "backup_size_bytes",
            Help: "Size of backup in bytes",
        },
        []string{"type"},
    )
)
```

---

## Retention Policies

| Backup Type | Retention | Storage Class |
|------------|-----------|---------------|
| Hourly (WAL) | 24 hours | Standard |
| Daily | 7 days | Standard |
| Weekly | 4 weeks | Standard-IA |
| Monthly | 12 months | Glacier |
| Yearly | 7 years | Glacier Deep Archive |

---

## Notes

- Test restores regularly (monthly minimum)
- Document recovery procedures
- Maintain backup encryption keys separately
- Cross-region backups for critical data
- Automate backup verification
- Include configuration in backups
- Monitor backup job success/failure

