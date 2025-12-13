# Runbook: Scaling Operations

## Overview

This runbook covers horizontal and vertical scaling procedures for Dits components.

## When to Scale

| Metric | Threshold | Action |
|--------|-----------|--------|
| API CPU | > 70% sustained | Scale out API pods |
| API Memory | > 80% | Scale up or add pods |
| Database connections | > 80% max | Add read replicas |
| Storage IOPS | > 80% capacity | Scale storage nodes |
| Request latency | p99 > 1s | Scale API tier |

---

## Horizontal Scaling

### API Tier

**Manual Scaling:**
```bash
# Current state
kubectl get deployment dits-api -n dits

# Scale to specific count
kubectl scale deployment dits-api -n dits --replicas=10

# Verify scaling
kubectl rollout status deployment/dits-api -n dits
kubectl get pods -n dits -l app.kubernetes.io/component=api
```

**Auto-scaling Configuration:**
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dits-api
  namespace: dits
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dits-api
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
```

```bash
# Apply HPA
kubectl apply -f hpa.yaml

# Check HPA status
kubectl get hpa dits-api -n dits
kubectl describe hpa dits-api -n dits
```

### Storage Tier

**Scale StatefulSet:**
```bash
# Current state
kubectl get statefulset dits-storage -n dits

# Scale up (pods created sequentially)
kubectl scale statefulset dits-storage -n dits --replicas=5

# Watch progress
kubectl get pods -n dits -l app.kubernetes.io/component=storage -w
```

**Important:** After scaling storage, rebalance data:
```bash
# Trigger rebalancing
kubectl exec -it deployment/dits-api -n dits -- dits-admin storage rebalance

# Monitor progress
kubectl exec -it deployment/dits-api -n dits -- dits-admin storage status
```

### Worker Tier

```bash
# Scale workers by type
kubectl scale deployment dits-worker-chunking -n dits --replicas=5
kubectl scale deployment dits-worker-webhooks -n dits --replicas=3

# Or scale all workers
kubectl scale deployment -n dits -l app.kubernetes.io/component=worker --replicas=3
```

### Database Read Replicas

```bash
# Add read replica (using StatefulSet)
kubectl scale statefulset postgresql-replica -n dits --replicas=3

# Verify replication
kubectl exec -it postgresql-0 -n dits -- psql -U dits -c "
  SELECT client_addr, state, sent_lsn, replay_lsn
  FROM pg_stat_replication;
"
```

---

## Vertical Scaling

### API Pods

```bash
# Update resource limits
kubectl set resources deployment/dits-api -n dits \
  --limits=cpu=4000m,memory=8Gi \
  --requests=cpu=1000m,memory=2Gi

# Rolling restart applies changes
kubectl rollout status deployment/dits-api -n dits
```

### Storage Pods

```bash
# Update StatefulSet (requires pod deletion for changes)
kubectl patch statefulset dits-storage -n dits --type='json' -p='[
  {
    "op": "replace",
    "path": "/spec/template/spec/containers/0/resources",
    "value": {
      "limits": {"cpu": "8000m", "memory": "16Gi"},
      "requests": {"cpu": "2000m", "memory": "4Gi"}
    }
  }
]'

# Delete pods one at a time to apply
for pod in $(kubectl get pods -n dits -l app.kubernetes.io/component=storage -o name); do
  kubectl delete $pod -n dits
  kubectl wait --for=condition=ready $pod -n dits --timeout=300s
done
```

### Database

**Increase PostgreSQL Resources:**
```bash
# Update StatefulSet
kubectl patch statefulset postgresql -n dits --type='json' -p='[
  {
    "op": "replace",
    "path": "/spec/template/spec/containers/0/resources",
    "value": {
      "limits": {"cpu": "8000m", "memory": "32Gi"},
      "requests": {"cpu": "4000m", "memory": "16Gi"}
    }
  }
]'

# Restart pod (brief downtime)
kubectl delete pod postgresql-0 -n dits
kubectl wait --for=condition=ready pod/postgresql-0 -n dits --timeout=300s
```

**Expand PVC Storage:**
```bash
# Check current size
kubectl get pvc -n dits

# Expand (storage class must support expansion)
kubectl patch pvc data-postgresql-0 -n dits -p '{"spec":{"resources":{"requests":{"storage":"500Gi"}}}}'

# Verify expansion
kubectl get pvc data-postgresql-0 -n dits
```

### Node Scaling (Infrastructure)

**AWS EKS:**
```bash
# Scale node group
eksctl scale nodegroup \
  --cluster=dits-production \
  --name=workers \
  --nodes=20 \
  --nodes-min=10 \
  --nodes-max=50

# Or add larger instance type
eksctl create nodegroup \
  --cluster=dits-production \
  --name=workers-large \
  --instance-types=m6i.4xlarge \
  --nodes=5
```

**GKE:**
```bash
gcloud container clusters resize dits-production \
  --node-pool=default-pool \
  --num-nodes=20
```

---

## Scale Down Procedures

### Graceful Scale Down

```bash
# Reduce API pods gradually
kubectl scale deployment dits-api -n dits --replicas=5
sleep 60
kubectl scale deployment dits-api -n dits --replicas=3

# Drain storage node before removal
kubectl exec -it dits-storage-4 -n dits -- dits-storage drain
kubectl scale statefulset dits-storage -n dits --replicas=4
```

### Disable Auto-scaling Temporarily

```bash
# Suspend HPA
kubectl patch hpa dits-api -n dits -p '{"spec":{"minReplicas":5,"maxReplicas":5}}'

# Or delete HPA
kubectl delete hpa dits-api -n dits
```

---

## Capacity Planning

### Current Usage

```bash
# Resource utilization
kubectl top pods -n dits --containers
kubectl top nodes

# Request queue depth
kubectl exec -it deployment/dits-api -n dits -- curl -s localhost:9090/metrics | grep queue_depth
```

### Sizing Guidelines

| Users | API Pods | Storage Nodes | Database | Cache |
|-------|----------|---------------|----------|-------|
| 100 | 3 | 3 | 4 CPU/16GB | 8GB |
| 1,000 | 5 | 5 | 8 CPU/32GB | 16GB |
| 10,000 | 10 | 10 | 16 CPU/64GB | 32GB |
| 100,000 | 30 | 20 | 32 CPU/128GB | 64GB |

---

## Verification

After scaling:

- [ ] All pods in Running state
- [ ] No OOMKilled events
- [ ] Latency within thresholds
- [ ] No failed requests
- [ ] Database connections stable
- [ ] Storage balanced across nodes

## Related Runbooks

- [High Latency](./high-latency.md)
- [Performance Tuning](../performance-tuning.md)
- [Database Issues](./database-issues.md)

