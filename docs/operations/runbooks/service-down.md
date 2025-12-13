# Runbook: Service Down

## Overview

This runbook addresses complete or partial service outages.

## Detection

**Alerts:**
- `DitsAPIDown` - API pods not responding
- `DitsStorageDown` - Storage nodes unavailable
- `DitsHealthCheckFailed` - Health endpoint returning errors

**Symptoms:**
- HTTP 5xx errors from API
- Connection refused errors
- Complete inability to access service

## Impact

**P1 - Critical:**
- Complete service outage
- All users affected
- Data operations halted

## Prerequisites

- kubectl cluster admin access
- AWS/cloud console access
- Access to PagerDuty/incident management

## Steps

### 1. Declare Incident

```bash
# Page team if not already
# Create incident channel
# Start incident timeline
```

### 2. Quick Assessment (2 minutes)

```bash
# Overall cluster health
kubectl get nodes
kubectl get pods -n dits

# Check recent events
kubectl get events -n dits --sort-by='.lastTimestamp' | tail -20

# Check ingress
kubectl get ingress -n dits
kubectl describe ingress dits -n dits
```

### 3. Identify Failing Component

**API Pods:**
```bash
# Pod status
kubectl get pods -n dits -l app.kubernetes.io/component=api -o wide

# Pod details
kubectl describe pod -n dits -l app.kubernetes.io/component=api

# Recent logs
kubectl logs deployment/dits-api -n dits --tail=100

# Previous container logs (if restarting)
kubectl logs deployment/dits-api -n dits --previous --tail=100
```

**Storage Pods:**
```bash
kubectl get pods -n dits -l app.kubernetes.io/component=storage -o wide
kubectl describe pod -n dits -l app.kubernetes.io/component=storage
kubectl logs statefulset/dits-storage -n dits --tail=100
```

**Dependencies:**
```bash
# Database
kubectl get pods -n dits -l app=postgresql
kubectl exec -it postgresql-0 -n dits -- pg_isready

# Redis
kubectl get pods -n dits -l app=redis
kubectl exec -it redis-0 -n dits -- redis-cli ping

# Check external S3
aws s3 ls s3://dits-chunks/ --max-items 1
```

### 4. Apply Immediate Fix

**Pods Crashing (CrashLoopBackOff):**
```bash
# Check resource limits
kubectl describe pod <pod-name> -n dits | grep -A5 "Limits:"

# Temporarily increase limits
kubectl set resources deployment/dits-api -n dits \
  --limits=cpu=4000m,memory=8Gi \
  --requests=cpu=1000m,memory=2Gi

# Or restart with previous known-good image
kubectl set image deployment/dits-api -n dits api=dits/api:v1.2.3
```

**Pods Pending (No Resources):**
```bash
# Check node capacity
kubectl describe nodes | grep -A5 "Allocated resources"

# Scale down non-critical workloads
kubectl scale deployment dits-worker -n dits --replicas=1

# Or add nodes (cloud-specific)
# AWS EKS example:
eksctl scale nodegroup --cluster=dits --name=workers --nodes=10
```

**Pods Not Starting (ImagePullBackOff):**
```bash
# Check image pull secrets
kubectl get secret -n dits | grep docker
kubectl describe secret docker-registry -n dits

# Verify image exists
docker manifest inspect dits/api:latest

# Use backup registry if needed
kubectl set image deployment/dits-api -n dits api=backup-registry.io/dits/api:latest
```

**Database Down:**
```bash
# Check PostgreSQL status
kubectl exec -it postgresql-0 -n dits -- pg_isready

# If not responding, restart
kubectl delete pod postgresql-0 -n dits

# Check for disk full
kubectl exec -it postgresql-0 -n dits -- df -h /var/lib/postgresql

# Failover to replica if available
kubectl exec -it postgresql-0 -n dits -- psql -c "SELECT pg_promote();"
```

**Network Issues:**
```bash
# Check network policies
kubectl get networkpolicy -n dits

# Temporarily disable restrictive policies
kubectl delete networkpolicy dits-api -n dits

# Check DNS
kubectl exec -it deployment/dits-api -n dits -- nslookup postgresql.dits.svc.cluster.local

# Check service endpoints
kubectl get endpoints -n dits
```

### 5. Restore Service

```bash
# Force pod recreation
kubectl rollout restart deployment/dits-api -n dits

# Wait for rollout
kubectl rollout status deployment/dits-api -n dits --timeout=300s

# Verify health
curl -s https://api.dits.example.com/health
```

### 6. Scale to Handle Backlog

```bash
# Increase replicas to handle queued requests
kubectl scale deployment dits-api -n dits --replicas=10
kubectl scale deployment dits-worker -n dits --replicas=5
```

## Verification

- [ ] Health endpoint returns 200
- [ ] API requests completing successfully
- [ ] No error logs in last 5 minutes
- [ ] All pods in Running state
- [ ] Metrics showing normal latency
- [ ] User reports resolved

## Post-Incident

1. **Immediate (within 1 hour):**
   - Post status update
   - Verify all systems stable
   - Return to normal replica counts

2. **Short-term (within 24 hours):**
   - Write incident timeline
   - Identify root cause
   - Schedule postmortem

3. **Long-term (within 1 week):**
   - Implement preventive measures
   - Update monitoring/alerting
   - Document in runbook

## Emergency Contacts

| Role | Contact |
|------|---------|
| On-Call Engineer | PagerDuty |
| Platform Lead | See roster |
| Cloud Provider | AWS Support |

## Related Runbooks

- [High Latency](./high-latency.md)
- [Database Issues](./database-issues.md)
- [Disaster Recovery](./disaster-recovery.md)

