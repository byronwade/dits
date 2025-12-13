# Kubernetes Deployment Guide

Complete guide to deploying Dits on Kubernetes.

---

## Overview

Dits can be deployed on Kubernetes using Helm charts or raw manifests. This guide covers both approaches along with best practices for production deployments.

---

## Prerequisites

- Kubernetes 1.25+
- Helm 3.10+ (if using Helm)
- kubectl configured
- Storage class with dynamic provisioning
- Ingress controller (nginx, traefik, or similar)
- cert-manager (for TLS)

---

## Quick Start with Helm

### Add Repository

```bash
helm repo add dits https://charts.dits.io
helm repo update
```

### Install

```bash
# Create namespace
kubectl create namespace dits

# Install with defaults
helm install dits dits/dits -n dits

# Install with custom values
helm install dits dits/dits -n dits -f values.yaml
```

### Verify Installation

```bash
kubectl get pods -n dits
kubectl get services -n dits
kubectl get ingress -n dits
```

---

## Helm Chart Values

### Minimal Production Values

```yaml
# values.yaml
global:
  environment: production
  domain: dits.example.com

api:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

storage:
  replicas: 3
  persistence:
    size: 100Gi
    storageClass: fast-ssd

database:
  # Use external PostgreSQL
  external:
    enabled: true
    host: postgres.example.com
    port: 5432
    database: dits
    existingSecret: dits-db-credentials

cache:
  # Use external Redis
  external:
    enabled: true
    host: redis.example.com
    port: 6379
    existingSecret: dits-redis-credentials

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: dits.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: dits-tls
      hosts:
        - dits.example.com
```

### Full Values Reference

```yaml
# values.yaml - Full configuration

global:
  # Environment: development, staging, production
  environment: production

  # Base domain for services
  domain: dits.example.com

  # Image pull secrets
  imagePullSecrets: []

  # Node selector for all pods
  nodeSelector: {}

  # Tolerations for all pods
  tolerations: []

  # Pod security context
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000

# ============================================
# API Service
# ============================================
api:
  enabled: true
  replicas: 3

  image:
    repository: dits/api
    tag: latest
    pullPolicy: IfNotPresent

  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

  # Horizontal Pod Autoscaler
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilization: 70
    targetMemoryUtilization: 80

  # Pod Disruption Budget
  pdb:
    enabled: true
    minAvailable: 2

  # Service configuration
  service:
    type: ClusterIP
    port: 8080

  # Health checks
  livenessProbe:
    httpGet:
      path: /health/live
      port: 8080
    initialDelaySeconds: 10
    periodSeconds: 10

  readinessProbe:
    httpGet:
      path: /health/ready
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 5

  # Environment variables
  env:
    LOG_LEVEL: info
    METRICS_ENABLED: "true"

  # Extra environment from secrets/configmaps
  envFrom: []

# ============================================
# Storage Service (Chunk Server)
# ============================================
storage:
  enabled: true
  replicas: 3

  image:
    repository: dits/storage
    tag: latest
    pullPolicy: IfNotPresent

  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 4000m
      memory: 8Gi

  # Persistence
  persistence:
    enabled: true
    size: 100Gi
    storageClass: fast-ssd
    accessModes:
      - ReadWriteOnce

  # StatefulSet configuration
  updateStrategy:
    type: RollingUpdate

  # Anti-affinity rules
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/component: storage
          topologyKey: kubernetes.io/hostname

# ============================================
# Worker Service (Background Jobs)
# ============================================
worker:
  enabled: true
  replicas: 2

  image:
    repository: dits/worker
    tag: latest
    pullPolicy: IfNotPresent

  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

  # Specific worker types
  types:
    - name: chunking
      replicas: 3
      queues:
        - chunking
        - deduplication
    - name: webhooks
      replicas: 2
      queues:
        - webhooks
        - notifications

# ============================================
# Database (PostgreSQL)
# ============================================
database:
  # Use bundled PostgreSQL (not recommended for production)
  internal:
    enabled: false
    replicas: 1
    persistence:
      size: 20Gi

  # Use external PostgreSQL (recommended)
  external:
    enabled: true
    host: postgres.example.com
    port: 5432
    database: dits
    # Reference existing secret with 'username' and 'password' keys
    existingSecret: dits-db-credentials
    # Or specify directly (not recommended)
    # username: dits
    # password: secret

  # Connection pool settings
  pool:
    maxConnections: 100
    minConnections: 10
    idleTimeout: 30s

# ============================================
# Cache (Redis)
# ============================================
cache:
  # Use bundled Redis
  internal:
    enabled: false
    replicas: 1

  # Use external Redis
  external:
    enabled: true
    host: redis.example.com
    port: 6379
    existingSecret: dits-redis-credentials
    # TLS settings
    tls:
      enabled: false

  # Redis Cluster mode
  cluster:
    enabled: false
    nodes: []

# ============================================
# Object Storage (S3)
# ============================================
objectStorage:
  # S3-compatible storage
  type: s3
  bucket: dits-chunks
  region: us-east-1
  endpoint: ""  # Leave empty for AWS S3

  # Credentials
  existingSecret: dits-s3-credentials
  # Or specify directly (not recommended)
  # accessKey: AKIAXXXXXXXX
  # secretKey: secret

  # Storage class for tiering
  storageClasses:
    hot: STANDARD
    warm: STANDARD_IA
    cold: GLACIER

# ============================================
# Ingress
# ============================================
ingress:
  enabled: true
  className: nginx

  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "10g"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"

  hosts:
    - host: dits.example.com
      paths:
        - path: /
          pathType: Prefix
          service: api

    - host: api.dits.example.com
      paths:
        - path: /
          pathType: Prefix
          service: api

  tls:
    - secretName: dits-tls
      hosts:
        - dits.example.com
        - api.dits.example.com

# ============================================
# Monitoring
# ============================================
monitoring:
  # ServiceMonitor for Prometheus Operator
  serviceMonitor:
    enabled: true
    interval: 30s
    scrapeTimeout: 10s

  # Grafana dashboards
  dashboards:
    enabled: true

  # Alerting rules
  prometheusRule:
    enabled: true
    rules:
      - alert: DitsAPIHighLatency
        expr: histogram_quantile(0.99, rate(dits_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"

# ============================================
# Security
# ============================================
security:
  # Network policies
  networkPolicy:
    enabled: true

  # Pod security standards
  podSecurityStandards:
    enforce: restricted

  # Secrets encryption
  secretsEncryption:
    enabled: true
    provider: aws-kms
    keyId: arn:aws:kms:...
```

---

## Raw Kubernetes Manifests

### Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dits
  labels:
    app.kubernetes.io/name: dits
```

### ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dits-config
  namespace: dits
data:
  LOG_LEVEL: info
  METRICS_ENABLED: "true"
  API_PORT: "8080"
  STORAGE_BACKEND: s3
  STORAGE_BUCKET: dits-chunks
  DATABASE_POOL_SIZE: "50"
  CACHE_TTL: "3600"
```

### Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: dits-secrets
  namespace: dits
type: Opaque
stringData:
  DATABASE_URL: postgres://user:pass@postgres:5432/dits
  REDIS_URL: redis://redis:6379
  JWT_SECRET: your-jwt-secret-here
  S3_ACCESS_KEY: AKIAXXXXXXXX
  S3_SECRET_KEY: your-secret-key
```

### API Deployment

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dits-api
  namespace: dits
  labels:
    app.kubernetes.io/name: dits
    app.kubernetes.io/component: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: dits
      app.kubernetes.io/component: api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: dits
        app.kubernetes.io/component: api
    spec:
      serviceAccountName: dits-api
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: api
          image: dits/api:latest
          ports:
            - name: http
              containerPort: 8080
            - name: metrics
              containerPort: 9090
          envFrom:
            - configMapRef:
                name: dits-config
            - secretRef:
                name: dits-secrets
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 4Gi
          livenessProbe:
            httpGet:
              path: /health/live
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/component: api
                topologyKey: kubernetes.io/hostname
```

### API Service

```yaml
# api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: dits-api
  namespace: dits
  labels:
    app.kubernetes.io/name: dits
    app.kubernetes.io/component: api
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 8080
      targetPort: http
    - name: metrics
      port: 9090
      targetPort: metrics
  selector:
    app.kubernetes.io/name: dits
    app.kubernetes.io/component: api
```

### Storage StatefulSet

```yaml
# storage-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: dits-storage
  namespace: dits
  labels:
    app.kubernetes.io/name: dits
    app.kubernetes.io/component: storage
spec:
  serviceName: dits-storage
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: dits
      app.kubernetes.io/component: storage
  template:
    metadata:
      labels:
        app.kubernetes.io/name: dits
        app.kubernetes.io/component: storage
    spec:
      serviceAccountName: dits-storage
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: storage
          image: dits/storage:latest
          ports:
            - name: grpc
              containerPort: 9000
            - name: metrics
              containerPort: 9090
          envFrom:
            - configMapRef:
                name: dits-config
            - secretRef:
                name: dits-secrets
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 1000m
              memory: 2Gi
            limits:
              cpu: 4000m
              memory: 8Gi
          livenessProbe:
            grpc:
              port: 9000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            grpc:
              port: 9000
            initialDelaySeconds: 5
            periodSeconds: 5
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app.kubernetes.io/component: storage
              topologyKey: kubernetes.io/hostname
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

### HorizontalPodAutoscaler

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
  maxReplicas: 20
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

### PodDisruptionBudget

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: dits-api
  namespace: dits
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: dits
      app.kubernetes.io/component: api
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: dits-storage
  namespace: dits
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: dits
      app.kubernetes.io/component: storage
```

### Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dits
  namespace: dits
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "10g"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - dits.example.com
      secretName: dits-tls
  rules:
    - host: dits.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dits-api
                port:
                  number: 8080
```

### NetworkPolicy

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dits-api
  namespace: dits
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/component: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: prometheus
      ports:
        - protocol: TCP
          port: 9090
  egress:
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/component: storage
      ports:
        - protocol: TCP
          port: 9000
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
```

---

## Service Accounts and RBAC

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dits-api
  namespace: dits
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dits-storage
  namespace: dits
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dits-api
  namespace: dits
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dits-api
  namespace: dits
subjects:
  - kind: ServiceAccount
    name: dits-api
    namespace: dits
roleRef:
  kind: Role
  name: dits-api
  apiGroup: rbac.authorization.k8s.io
```

---

## Monitoring Setup

### ServiceMonitor

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dits
  namespace: dits
  labels:
    app.kubernetes.io/name: dits
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: dits
  endpoints:
    - port: metrics
      interval: 30s
      scrapeTimeout: 10s
      path: /metrics
```

### PrometheusRule

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dits-alerts
  namespace: dits
spec:
  groups:
    - name: dits
      rules:
        - alert: DitsAPIDown
          expr: up{job="dits-api"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dits API is down"
            description: "Dits API pod {{ $labels.pod }} is down"

        - alert: DitsStorageDown
          expr: up{job="dits-storage"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dits storage node is down"

        - alert: DitsHighLatency
          expr: |
            histogram_quantile(0.99,
              rate(dits_http_request_duration_seconds_bucket[5m])
            ) > 2
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High API latency detected"

        - alert: DitsHighErrorRate
          expr: |
            rate(dits_http_requests_total{status=~"5.."}[5m]) /
            rate(dits_http_requests_total[5m]) > 0.01
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High error rate detected"

        - alert: DitsStorageLow
          expr: |
            (1 - node_filesystem_avail_bytes{mountpoint="/data"} /
            node_filesystem_size_bytes{mountpoint="/data"}) > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Storage node disk usage above 80%"
```

---

## Operations

### Scaling

```bash
# Scale API replicas
kubectl scale deployment dits-api -n dits --replicas=5

# Scale storage (careful - data rebalancing)
kubectl scale statefulset dits-storage -n dits --replicas=5
```

### Rolling Updates

```bash
# Update API image
kubectl set image deployment/dits-api -n dits api=dits/api:v1.2.0

# Watch rollout
kubectl rollout status deployment/dits-api -n dits

# Rollback if needed
kubectl rollout undo deployment/dits-api -n dits
```

### Debugging

```bash
# Check pod logs
kubectl logs -f deployment/dits-api -n dits

# Exec into pod
kubectl exec -it deployment/dits-api -n dits -- /bin/sh

# Port forward for local access
kubectl port-forward svc/dits-api -n dits 8080:8080

# Check events
kubectl get events -n dits --sort-by='.lastTimestamp'
```

### Backup

```bash
# Backup PVCs
kubectl get pvc -n dits -o yaml > pvc-backup.yaml

# Snapshot storage volumes (cloud-specific)
# AWS EBS example:
aws ec2 create-snapshot --volume-id vol-xxx --description "dits-storage backup"
```

---

## Troubleshooting

### Common Issues

**Pods not starting:**
```bash
kubectl describe pod <pod-name> -n dits
kubectl logs <pod-name> -n dits --previous
```

**Database connection issues:**
```bash
# Test connectivity from pod
kubectl exec -it deployment/dits-api -n dits -- nc -zv postgres 5432
```

**Storage performance issues:**
```bash
# Check storage class
kubectl get storageclass
kubectl describe pvc -n dits
```

**Ingress not working:**
```bash
kubectl describe ingress dits -n dits
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

---

## Notes

- Use external PostgreSQL and Redis for production
- Enable pod anti-affinity for high availability
- Configure proper resource limits
- Set up monitoring and alerting
- Use network policies for security
- Regular backup of persistent volumes
- Test disaster recovery procedures

