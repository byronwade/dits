# Runbook: Database Issues

## Overview

This runbook addresses PostgreSQL database problems including performance degradation, connection issues, replication lag, and data corruption.

## Detection

**Alerts:**
- `DitsDBConnectionsHigh` - Connection pool exhausted
- `DitsDBReplicationLag` - Replica behind primary
- `DitsDBDiskSpaceLow` - Storage filling up
- `DitsDBSlowQueries` - Query time exceeds threshold

## Scenarios

### Scenario 1: Connection Pool Exhausted

**Symptoms:**
- "too many connections" errors
- New connections failing
- API returning 503 errors

**Investigation:**
```bash
# Check connection count
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT count(*), state
  FROM pg_stat_activity
  GROUP BY state;
"

# Find connection sources
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT client_addr, usename, count(*)
  FROM pg_stat_activity
  GROUP BY client_addr, usename
  ORDER BY count DESC;
"

# Check for idle connections
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT count(*)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND query_start < now() - interval '5 minutes';
"
```

**Resolution:**
```bash
# Kill idle connections
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND query_start < now() - interval '5 minutes';
"

# Increase max connections (requires restart)
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  ALTER SYSTEM SET max_connections = 500;
"
kubectl delete pod postgresql-0 -n dits

# Configure application connection pooling
# Update API config to use PgBouncer or reduce pool size
```

---

### Scenario 2: Slow Queries

**Symptoms:**
- High API latency
- Database CPU elevated
- Query queue building

**Investigation:**
```bash
# Find slow queries
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  ORDER BY duration DESC;
"

# Check query statistics
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT
    substring(query, 1, 50) as query_start,
    calls,
    round(total_exec_time::numeric, 2) as total_time_ms,
    round(mean_exec_time::numeric, 2) as mean_time_ms,
    rows
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Check for missing indexes
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT
    schemaname,
    relname,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
  FROM pg_stat_user_tables
  WHERE seq_scan > idx_scan
  ORDER BY seq_tup_read DESC
  LIMIT 10;
"
```

**Resolution:**
```bash
# Kill long-running queries
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE duration > interval '10 minutes'
  AND state = 'active';
"

# Add missing indexes (example)
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  CREATE INDEX CONCURRENTLY idx_chunks_repo_hash
  ON chunks(repository_id, hash);
"

# Update statistics
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  ANALYZE VERBOSE;
"
```

---

### Scenario 3: Replication Lag

**Symptoms:**
- Read replica returning stale data
- Replication lag alerts firing

**Investigation:**
```bash
# Check replication status on primary
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
  FROM pg_stat_replication;
"

# Check replica status
kubectl exec -it postgresql-replica-0 -n dits -- psql -U dits -c "
  SELECT
    pg_is_in_recovery(),
    pg_last_wal_receive_lsn(),
    pg_last_wal_replay_lsn(),
    pg_last_xact_replay_timestamp();
"

# Check WAL disk usage
kubectl exec -it postgresql-0 -n dits -- du -sh /var/lib/postgresql/data/pg_wal/
```

**Resolution:**
```bash
# If network issue, check connectivity
kubectl exec -it postgresql-replica-0 -n dits -- nc -zv postgresql-0.postgresql 5432

# If replica too far behind, re-sync
kubectl delete pvc data-postgresql-replica-0 -n dits
kubectl delete pod postgresql-replica-0 -n dits
# Pod will re-create and sync from primary

# If WAL accumulating, check archive_command
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT * FROM pg_stat_archiver;
"
```

---

### Scenario 4: Disk Space Low

**Symptoms:**
- "no space left on device" errors
- Database refusing writes
- Disk usage alerts

**Investigation:**
```bash
# Check disk usage
kubectl exec -it postgresql-0 -n dits -- df -h /var/lib/postgresql

# Check table sizes
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT
    relname,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(relid) DESC
  LIMIT 10;
"

# Check WAL size
kubectl exec -it postgresql-0 -n dits -- du -sh /var/lib/postgresql/data/pg_wal/

# Check for bloat
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT
    schemaname,
    relname,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup::numeric / nullif(n_live_tup, 0) * 100, 2) AS dead_pct
  FROM pg_stat_user_tables
  WHERE n_dead_tup > 10000
  ORDER BY n_dead_tup DESC;
"
```

**Resolution:**
```bash
# Clean up dead tuples
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  VACUUM (VERBOSE, ANALYZE) chunks;
"

# Clean up old WAL files (if archiving is working)
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT pg_switch_wal();
"

# Expand PVC (cloud-specific)
kubectl patch pvc data-postgresql-0 -n dits -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'

# Delete old data if safe
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  DELETE FROM audit_logs WHERE created_at < now() - interval '90 days';
"
```

---

### Scenario 5: Database Corruption

**Symptoms:**
- Checksum errors in logs
- Queries returning unexpected results
- Database crash loops

**Investigation:**
```bash
# Check for corruption
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT * FROM pg_catalog.pg_stat_database WHERE checksum_failures > 0;
"

# Check specific table
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT count(*) FROM chunks;
"

# Full table check (slow)
kubectl exec -it postgresql-0 -n dits -- pg_amcheck -d dits --heapallindexed
```

**Resolution:**
```bash
# If minor corruption, try reindex
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  REINDEX TABLE CONCURRENTLY chunks;
"

# If serious corruption, restore from backup
# See backup-restore.md for full procedure

# Stop writes
kubectl scale deployment dits-api -n dits --replicas=0

# Restore from last known good backup
pg_restore -h postgresql-0 -U dits -d dits_restored backup.dump

# Verify restored data
psql -d dits_restored -c "SELECT count(*) FROM repositories;"

# Switch databases
psql -c "ALTER DATABASE dits RENAME TO dits_corrupted;"
psql -c "ALTER DATABASE dits_restored RENAME TO dits;"

# Restart services
kubectl scale deployment dits-api -n dits --replicas=3
```

---

## Verification Checklist

- [ ] Connection count within limits
- [ ] Query times below threshold
- [ ] Replication lag < 1 second
- [ ] Disk usage < 80%
- [ ] No checksum errors
- [ ] Application functioning normally

## Post-Incident

1. Document what happened and resolution
2. Review and tune database parameters
3. Update monitoring thresholds if needed
4. Schedule maintenance window if required
5. Review backup/recovery procedures

## Related Runbooks

- [High Latency](./high-latency.md)
- [Backup and Restore](../backup-restore.md)
- [Performance Tuning](../performance-tuning.md)

