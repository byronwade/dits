# Self-Hosting Guide

Deploy and operate Dits on your own infrastructure.

---

## Overview

Dits can be self-hosted on your own infrastructure for full control over data, compliance requirements, or air-gapped environments.

---

## Deployment Options

### Quick Start (Docker Compose)

Ideal for small teams (< 20 users) and evaluation.

```yaml
# docker-compose.yml
version: '3.8'

services:
  dits-server:
    image: dits/server:latest
    ports:
      - "8080:8080"
      - "8443:8443"
    environment:
      - DATABASE_URL=postgres://dits:secret@postgres:5432/dits
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://minio:9000
      - S3_BUCKET=dits-storage
      - S3_ACCESS_KEY=minio
      - S3_SECRET_KEY=minio123
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./config:/etc/dits
      - dits-cache:/var/cache/dits
    depends_on:
      - postgres
      - redis
      - minio

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=dits
      - POSTGRES_USER=dits
      - POSTGRES_PASSWORD=secret
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=minio
      - MINIO_ROOT_PASSWORD=minio123
    volumes:
      - minio-data:/data
    ports:
      - "9001:9001"

volumes:
  postgres-data:
  redis-data:
  minio-data:
  dits-cache:
```

```bash
# Start services
docker-compose up -d

# Initialize database
docker-compose exec dits-server dits-migrate up

# Create admin user
docker-compose exec dits-server dits-admin user create \
    --email admin@example.com \
    --password secret \
    --role admin
```

### Production (Kubernetes)

For production deployments with high availability.

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dits
---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dits-config
  namespace: dits
data:
  config.toml: |
    [server]
    host = "0.0.0.0"
    port = 8080

    [database]
    pool_size = 20

    [storage]
    backend = "s3"

    [cache]
    l1_size = "1GB"
    l2_enabled = true
---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: dits-secrets
  namespace: dits
type: Opaque
stringData:
  database-url: "postgres://dits:secret@postgres.dits.svc:5432/dits"
  redis-url: "redis://redis.dits.svc:6379"
  jwt-secret: "your-jwt-secret-here"
  s3-access-key: "your-access-key"
  s3-secret-key: "your-secret-key"
---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dits-server
  namespace: dits
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dits-server
  template:
    metadata:
      labels:
        app: dits-server
    spec:
      containers:
        - name: dits-server
          image: dits/server:1.0.0
          ports:
            - containerPort: 8080
            - containerPort: 8443
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: dits-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: dits-secrets
                  key: redis-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: dits-secrets
                  key: jwt-secret
            - name: S3_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: dits-secrets
                  key: s3-access-key
            - name: S3_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: dits-secrets
                  key: s3-secret-key
          volumeMounts:
            - name: config
              mountPath: /etc/dits
            - name: cache
              mountPath: /var/cache/dits
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: config
          configMap:
            name: dits-config
        - name: cache
          emptyDir:
            medium: Memory
            sizeLimit: 2Gi
---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: dits-server
  namespace: dits
spec:
  selector:
    app: dits-server
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
  type: ClusterIP
---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dits-ingress
  namespace: dits
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
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
                name: dits-server
                port:
                  number: 80
---
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dits-server-hpa
  namespace: dits
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dits-server
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
```

### Helm Chart

```bash
# Add Dits Helm repository
helm repo add dits https://charts.dits.io
helm repo update

# Install with custom values
helm install dits dits/dits \
    --namespace dits \
    --create-namespace \
    --values values.yaml
```

```yaml
# values.yaml
replicaCount: 3

image:
  repository: dits/server
  tag: "1.0.0"
  pullPolicy: IfNotPresent

ingress:
  enabled: true
  hosts:
    - host: dits.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: dits-tls
      hosts:
        - dits.example.com

database:
  external: false
  postgresqlDatabase: dits
  postgresqlUsername: dits
  persistence:
    size: 50Gi
    storageClass: fast-ssd

redis:
  external: false
  auth:
    enabled: true

storage:
  backend: s3
  s3:
    endpoint: https://s3.amazonaws.com
    bucket: my-dits-storage
    region: us-east-1

resources:
  requests:
    memory: 512Mi
    cpu: 500m
  limits:
    memory: 2Gi
    cpu: 2000m

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

persistence:
  cache:
    enabled: true
    size: 10Gi
    storageClass: fast-ssd
```

---

## Configuration

### Server Configuration

```toml
# /etc/dits/config.toml

[server]
# Server hostname
host = "0.0.0.0"
# HTTP port
port = 8080
# HTTPS port (optional)
tls_port = 8443
# TLS certificate paths
tls_cert = "/etc/dits/tls/cert.pem"
tls_key = "/etc/dits/tls/key.pem"
# Worker threads (0 = auto-detect)
workers = 0
# Request timeout
request_timeout = "5m"
# Maximum upload size
max_upload_size = "10GB"

[database]
# PostgreSQL connection URL
url = "${DATABASE_URL}"
# Connection pool size
pool_size = 20
# Pool timeout
pool_timeout = "30s"
# Minimum connections
min_connections = 5

[redis]
# Redis connection URL
url = "${REDIS_URL}"
# Pool size
pool_size = 10

[storage]
# Storage backend: s3, gcs, azure, local
backend = "s3"

[storage.s3]
# S3 endpoint (use for MinIO, R2, etc.)
endpoint = "https://s3.amazonaws.com"
# Bucket name
bucket = "dits-storage"
# AWS region
region = "us-east-1"
# Access credentials
access_key = "${S3_ACCESS_KEY}"
secret_key = "${S3_SECRET_KEY}"
# Use path-style URLs (required for MinIO)
path_style = false
# Upload part size for multipart
part_size = "64MB"

[cache]
# L1 (memory) cache size
l1_size = "1GB"
# L2 (disk) cache enabled
l2_enabled = true
# L2 cache directory
l2_path = "/var/cache/dits"
# L2 cache size
l2_size = "50GB"
# Cache TTL
ttl = "24h"

[auth]
# JWT secret (required)
jwt_secret = "${JWT_SECRET}"
# Token expiration
token_expiration = "7d"
# Refresh token expiration
refresh_expiration = "30d"
# Session timeout
session_timeout = "24h"

[auth.oauth]
# Enable OAuth providers
enabled = true

[auth.oauth.github]
client_id = "${GITHUB_CLIENT_ID}"
client_secret = "${GITHUB_CLIENT_SECRET}"

[auth.oauth.google]
client_id = "${GOOGLE_CLIENT_ID}"
client_secret = "${GOOGLE_CLIENT_SECRET}"

[auth.saml]
# Enable SAML SSO
enabled = false
# Entity ID
entity_id = "https://dits.example.com/saml"
# IdP metadata URL
idp_metadata_url = "https://idp.example.com/metadata"
# Certificate path
certificate = "/etc/dits/saml/cert.pem"
# Private key path
private_key = "/etc/dits/saml/key.pem"

[logging]
# Log level: trace, debug, info, warn, error
level = "info"
# Log format: json, pretty
format = "json"
# Log output: stdout, file
output = "stdout"
# Log file path (if output = file)
file_path = "/var/log/dits/server.log"

[metrics]
# Enable Prometheus metrics
enabled = true
# Metrics endpoint path
path = "/metrics"
# Include detailed histograms
detailed = true

[tracing]
# Enable distributed tracing
enabled = false
# Jaeger endpoint
jaeger_endpoint = "http://jaeger:14268/api/traces"
# Sampling rate (0.0 - 1.0)
sampling_rate = 0.1

[limits]
# Rate limiting
[limits.rate]
# Requests per minute per user
requests_per_minute = 600
# Upload bytes per hour
upload_bytes_per_hour = "100GB"
# Download bytes per hour
download_bytes_per_hour = "500GB"

[limits.quotas]
# Default storage quota per user
default_storage = "10GB"
# Default repositories per user
default_repos = 10
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing (32+ chars) | Yes |
| `S3_ENDPOINT` | S3-compatible endpoint URL | Yes |
| `S3_BUCKET` | Storage bucket name | Yes |
| `S3_ACCESS_KEY` | S3 access key | Yes |
| `S3_SECRET_KEY` | S3 secret key | Yes |
| `S3_REGION` | AWS region | No |
| `LOG_LEVEL` | Logging level | No |
| `DITS_CONFIG` | Path to config file | No |

---

## Database Setup

### PostgreSQL

```sql
-- Create database and user
CREATE USER dits WITH PASSWORD 'secure_password';
CREATE DATABASE dits OWNER dits;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dits TO dits;

-- Enable required extensions
\c dits
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Run migrations
-- dits-migrate up
```

### PostgreSQL Tuning

```conf
# postgresql.conf optimizations for Dits

# Memory
shared_buffers = 4GB              # 25% of RAM
effective_cache_size = 12GB       # 75% of RAM
work_mem = 256MB
maintenance_work_mem = 1GB

# Connections
max_connections = 200

# WAL
wal_buffers = 64MB
min_wal_size = 1GB
max_wal_size = 4GB
checkpoint_completion_target = 0.9

# Query planner
random_page_cost = 1.1            # For SSDs
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000  # Log queries > 1s
log_checkpoints = on
log_connections = on
log_disconnections = on
```

---

## Storage Setup

### AWS S3

```bash
# Create bucket
aws s3 mb s3://my-dits-storage --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket my-dits-storage \
    --versioning-configuration Status=Enabled

# Set lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-dits-storage \
    --lifecycle-configuration file://lifecycle.json

# Enable encryption
aws s3api put-bucket-encryption \
    --bucket my-dits-storage \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "aws:kms"
            },
            "BucketKeyEnabled": true
        }]
    }'
```

### MinIO (Self-Hosted S3)

```yaml
# minio-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: dits
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
        - name: minio
          image: minio/minio:latest
          args:
            - server
            - /data
            - --console-address
            - ":9001"
          env:
            - name: MINIO_ROOT_USER
              valueFrom:
                secretKeyRef:
                  name: minio-secrets
                  key: access-key
            - name: MINIO_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: minio-secrets
                  key: secret-key
          ports:
            - containerPort: 9000
            - containerPort: 9001
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              memory: 1Gi
              cpu: 500m
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: minio-data
```

---

## SSL/TLS Setup

### Let's Encrypt with Certbot

```bash
# Install certbot
apt-get install certbot

# Get certificate
certbot certonly --standalone \
    -d dits.example.com \
    --email admin@example.com \
    --agree-tos

# Certificate paths
# /etc/letsencrypt/live/dits.example.com/fullchain.pem
# /etc/letsencrypt/live/dits.example.com/privkey.pem

# Auto-renewal cron
echo "0 0 * * * certbot renew --quiet" | crontab -
```

### Kubernetes cert-manager

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

---

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/postgres

# Create backup
pg_dump -h localhost -U dits dits | gzip > $BACKUP_DIR/dits_$DATE.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/dits_$DATE.sql.gz s3://my-backups/dits/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Storage Backup

```bash
# Replicate to backup bucket
aws s3 sync s3://my-dits-storage s3://my-dits-backup \
    --storage-class STANDARD_IA

# Or use S3 cross-region replication (recommended)
```

### Recovery Procedure

```bash
# 1. Stop server
docker-compose down

# 2. Restore database
gunzip -c dits_backup.sql.gz | psql -h localhost -U dits dits

# 3. Verify storage
aws s3 ls s3://my-dits-storage/v1/chunks/ --recursive | wc -l

# 4. Start server
docker-compose up -d

# 5. Verify health
curl https://dits.example.com/health
```

---

## Monitoring

### Prometheus Metrics

```yaml
# prometheus.yaml
scrape_configs:
  - job_name: 'dits'
    static_configs:
      - targets: ['dits-server:8080']
    metrics_path: /metrics
```

### Key Metrics

```
# Server metrics
dits_http_requests_total{method, path, status}
dits_http_request_duration_seconds{method, path}
dits_active_connections

# Storage metrics
dits_storage_operations_total{operation, status}
dits_storage_bytes_transferred{direction}
dits_storage_latency_seconds{operation}

# Cache metrics
dits_cache_hits_total{layer}
dits_cache_misses_total{layer}
dits_cache_size_bytes{layer}

# Repository metrics
dits_repositories_total
dits_commits_total
dits_chunks_total
dits_storage_bytes_total
```

### Grafana Dashboard

Import dashboard ID: `12345` from Grafana.com or use the included JSON in `/deploy/grafana/`.

### Alerting

```yaml
# alerts.yaml
groups:
  - name: dits
    rules:
      - alert: DitsHighErrorRate
        expr: rate(dits_http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate on Dits server

      - alert: DitsHighLatency
        expr: histogram_quantile(0.95, rate(dits_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High latency on Dits server

      - alert: DitsDatabaseConnectionsLow
        expr: dits_database_connections_available < 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: Low database connections available
```

---

## Upgrade Procedure

### Rolling Update (Kubernetes)

```bash
# Update image tag
kubectl set image deployment/dits-server \
    dits-server=dits/server:1.1.0 \
    -n dits

# Watch rollout
kubectl rollout status deployment/dits-server -n dits

# Rollback if needed
kubectl rollout undo deployment/dits-server -n dits
```

### Docker Compose

```bash
# Pull new image
docker-compose pull

# Backup database
docker-compose exec postgres pg_dump -U dits dits > backup.sql

# Run migrations
docker-compose run --rm dits-server dits-migrate up

# Recreate containers
docker-compose up -d --force-recreate

# Verify
curl https://dits.example.com/health
```

---

## Security Hardening

### Network Security

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dits-network-policy
  namespace: dits
spec:
  podSelector:
    matchLabels:
      app: dits-server
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - port: 6379
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - port: 443  # S3/external APIs
```

### Pod Security

```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: dits-restricted
spec:
  privileged: false
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'secret'
    - 'persistentVolumeClaim'
```

---

## Troubleshooting

### Common Issues

**Database connection errors:**
```bash
# Check connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check pool status
curl localhost:8080/debug/pool
```

**Storage access issues:**
```bash
# Test S3 connectivity
aws s3 ls s3://my-dits-storage --endpoint-url $S3_ENDPOINT

# Check IAM permissions
aws sts get-caller-identity
```

**Memory issues:**
```bash
# Check memory usage
docker stats dits-server

# Adjust cache size in config
# l1_size = "512MB"
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug docker-compose up

# Or set in config
[logging]
level = "debug"
```

### Health Checks

```bash
# Basic health
curl https://dits.example.com/health

# Detailed health
curl https://dits.example.com/health/detailed

# Ready check
curl https://dits.example.com/ready
```

---

## Support

- Documentation: docs.dits.io
- Community Forum: community.dits.io
- Enterprise Support: support@dits.io
- GitHub Issues: github.com/dits-io/dits/issues

---

## Notes

- Minimum recommended: 4 CPU, 8GB RAM, 100GB SSD
- Production recommended: 8+ CPU, 32GB+ RAM, 500GB+ SSD
- Database should be on dedicated instance for production
- Use managed PostgreSQL (RDS, Cloud SQL) when possible
- Always enable TLS in production
- Regular backups are critical
