# Runbook: High Latency

## Overview

This runbook addresses elevated API response times (p99 > 1 second).

## Detection

**Alerts:**
- `DitsAPIHighLatency` - p99 latency exceeds threshold
- `DitsSlowQueries` - Database queries taking > 100ms

**Symptoms:**
- User complaints about slow operations
- CLI timeouts
- Push/pull operations stalling

## Impact

- Degraded user experience
- Failed operations due to timeouts
- Potential cascade to other services

## Prerequisites

- kubectl access to cluster
- Database read access
- Grafana dashboard access

## Steps

### 1. Assess Current State

```bash
# Check current latency metrics
kubectl exec -it deployment/dits-api -n dits -- curl -s localhost:9090/metrics | grep http_request_duration

# Check pod status
kubectl get pods -n dits -l app.kubernetes.io/component=api

# Check recent errors
kubectl logs deployment/dits-api -n dits --since=5m | grep -i error | tail -20
```

### 2. Identify Bottleneck

Check each component:

**API Server:**
```bash
# CPU/Memory usage
kubectl top pods -n dits -l app.kubernetes.io/component=api

# Connection count
kubectl exec -it deployment/dits-api -n dits -- ss -s
```

**Database:**
```bash
# Active queries
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query
  FROM pg_stat_activity
  WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%'
  ORDER BY duration DESC
  LIMIT 10;
"

# Connection count
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT count(*) FROM pg_stat_activity;
"
```

**Redis:**
```bash
# Latency check
kubectl exec -it redis-0 -n dits -- redis-cli --latency

# Memory usage
kubectl exec -it redis-0 -n dits -- redis-cli INFO memory | grep used_memory_human
```

**Storage:**
```bash
# S3 latency (check CloudWatch)
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name TotalRequestLatency \
  --dimensions Name=BucketName,Value=dits-chunks \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average
```

### 3. Apply Remediation

Based on bottleneck identified:

**High API CPU:**
```bash
# Scale up API pods
kubectl scale deployment dits-api -n dits --replicas=10
```

**Database Connection Saturation:**
```bash
# Kill long-running queries
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE duration > interval '5 minutes'
  AND state = 'active';
"
```

**Cache Miss Storm:**
```bash
# Increase Redis memory if needed
kubectl patch statefulset redis -n dits --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "16Gi"}
]'

# Warm cache for hot repos
kubectl exec -it deployment/dits-api -n dits -- dits-admin cache warm --popular
```

**Network Issues:**
```bash
# Check network policies
kubectl get networkpolicy -n dits

# Test connectivity
kubectl exec -it deployment/dits-api -n dits -- nc -zv postgresql 5432
kubectl exec -it deployment/dits-api -n dits -- nc -zv redis 6379
```

### 4. Monitor Recovery

```bash
# Watch latency metrics
watch -n 5 'kubectl exec -it deployment/dits-api -n dits -- curl -s localhost:9090/metrics | grep "http_request_duration_seconds_bucket.*le=\"1\""'

# Check error rate
kubectl logs -f deployment/dits-api -n dits | grep -E "(error|ERROR|failed)"
```

## Verification

- [ ] p99 latency < 1 second
- [ ] No timeout errors in logs
- [ ] Database connections stable
- [ ] Cache hit rate > 80%
- [ ] User operations completing normally

## Post-Incident

1. Document root cause
2. Update capacity planning if needed
3. Review alerting thresholds
4. Schedule postmortem if P1/P2
5. Create follow-up tickets for permanent fixes

## Related Runbooks

- [Service Down](./service-down.md)
- [Database Issues](./database-issues.md)
- [Scaling](./scaling.md)

