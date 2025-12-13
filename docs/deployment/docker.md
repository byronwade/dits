# Docker Deployment Guide

Complete guide to deploying Dits using Docker and Docker Compose.

---

## Quick Start

```bash
# Clone deployment repo
git clone https://github.com/dits-io/dits-deploy.git
cd dits-deploy/docker

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start services
docker compose up -d

# Check status
docker compose ps
docker compose logs -f
```

---

## Docker Images

### Official Images

| Image | Description | Tags |
|-------|-------------|------|
| `dits/api` | API server | `latest`, `v1.x`, `sha-xxx` |
| `dits/storage` | Chunk storage server | `latest`, `v1.x` |
| `dits/worker` | Background workers | `latest`, `v1.x` |
| `dits/cli` | CLI tools | `latest`, `v1.x` |

### Pull Images

```bash
docker pull dits/api:latest
docker pull dits/storage:latest
docker pull dits/worker:latest
```

---

## Docker Compose

### Basic Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  # API Server
  api:
    image: dits/api:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://dits:secret@postgres:5432/dits
      - REDIS_URL=redis://redis:6379
      - S3_BUCKET=dits-chunks
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Storage Server
  storage:
    image: dits/storage:latest
    ports:
      - "9000:9000"
    environment:
      - DATABASE_URL=postgres://dits:secret@postgres:5432/dits
      - S3_BUCKET=dits-chunks
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
    volumes:
      - storage_cache:/var/cache/dits
    depends_on:
      - postgres
      - minio

  # Background Worker
  worker:
    image: dits/worker:latest
    environment:
      - DATABASE_URL=postgres://dits:secret@postgres:5432/dits
      - REDIS_URL=redis://redis:6379
      - S3_BUCKET=dits-chunks
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
    depends_on:
      - postgres
      - redis

  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=dits
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=dits
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dits"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${S3_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${S3_SECRET_KEY}
    ports:
      - "9001:9001"  # Console
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  minio_data:
  storage_cache:
```

### Environment File

```bash
# .env
# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-here

# S3/MinIO credentials
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Optional: External services
# DATABASE_URL=postgres://user:pass@external-postgres:5432/dits
# REDIS_URL=redis://external-redis:6379
```

---

## Production Configuration

### Full Production Compose

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  api:
    image: dits/api:${DITS_VERSION:-latest}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "2"
          memory: 4G
        reservations:
          cpus: "0.5"
          memory: 1G
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - S3_BUCKET=${S3_BUCKET}
      - S3_REGION=${S3_REGION}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - LOG_LEVEL=info
      - METRICS_ENABLED=true
    networks:
      - dits-internal
      - dits-external
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  storage:
    image: dits/storage:${DITS_VERSION:-latest}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "4"
          memory: 8G
        reservations:
          cpus: "1"
          memory: 2G
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - S3_BUCKET=${S3_BUCKET}
      - S3_REGION=${S3_REGION}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
      - CACHE_SIZE=50GB
    volumes:
      - type: volume
        source: storage_cache
        target: /var/cache/dits
        volume:
          nocopy: true
    networks:
      - dits-internal

  worker:
    image: dits/worker:${DITS_VERSION:-latest}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "2"
          memory: 4G
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - S3_BUCKET=${S3_BUCKET}
      - S3_REGION=${S3_REGION}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
      - WORKER_CONCURRENCY=10
    networks:
      - dits-internal

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - api
    networks:
      - dits-external

  # Prometheus for metrics
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    networks:
      - dits-internal

  # Grafana for dashboards
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - dits-internal

networks:
  dits-internal:
    driver: bridge
    internal: true
  dits-external:
    driver: bridge

volumes:
  storage_cache:
    driver: local
    driver_opts:
      type: none
      device: /mnt/ssd/dits-cache
      o: bind
  prometheus_data:
  grafana_data:
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 4096;
}

http {
    upstream api {
        least_conn;
        server api:8080;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

    server {
        listen 80;
        server_name dits.example.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name dits.example.com;

        ssl_certificate /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # Large file uploads
        client_max_body_size 10G;
        client_body_timeout 300s;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;

        location / {
            limit_req zone=api_limit burst=50 nodelay;

            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location /health {
            proxy_pass http://api/health;
            access_log off;
        }
    }
}
```

---

## Building Custom Images

### Dockerfile for API

```dockerfile
# Dockerfile.api
FROM rust:1.75-slim AS builder

WORKDIR /app
COPY . .

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN cargo build --release --bin dits-api

# Runtime image
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/dits-api /usr/local/bin/

# Non-root user
RUN useradd -r -s /bin/false dits
USER dits

EXPOSE 8080 9090

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dits-api"]
```

### Multi-stage Build

```dockerfile
# Dockerfile
ARG RUST_VERSION=1.75

# Build stage
FROM rust:${RUST_VERSION}-slim AS builder

WORKDIR /app

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release && rm -rf src

# Build application
COPY . .
RUN cargo build --release

# Runtime stage
FROM gcr.io/distroless/cc-debian12

COPY --from=builder /app/target/release/dits-* /usr/local/bin/

USER nonroot:nonroot

ENTRYPOINT ["dits-api"]
```

---

## Operations

### Starting Services

```bash
# Development
docker compose up -d

# Production
docker compose -f docker-compose.prod.yml up -d

# With build
docker compose up -d --build

# Specific services
docker compose up -d api storage
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api

# Last 100 lines
docker compose logs --tail=100 api

# With timestamps
docker compose logs -f -t api
```

### Scaling

```bash
# Scale specific service
docker compose up -d --scale api=5

# Scale multiple services
docker compose up -d --scale api=5 --scale worker=3
```

### Updates

```bash
# Pull latest images
docker compose pull

# Update with zero downtime (rolling)
docker compose up -d --no-deps api

# Full restart
docker compose down && docker compose up -d
```

### Backup

```bash
# Backup PostgreSQL
docker compose exec postgres pg_dump -U dits dits > backup.sql

# Backup volumes
docker run --rm \
  -v dits_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data.tar.gz /data
```

### Health Checks

```bash
# Check all services
docker compose ps

# Check specific service health
docker inspect --format='{{.State.Health.Status}}' dits-api-1

# Manual health check
curl http://localhost:8080/health
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs api

# Check resource usage
docker stats

# Verify environment
docker compose config

# Shell into container
docker compose exec api /bin/sh
```

### Network Issues

```bash
# List networks
docker network ls

# Inspect network
docker network inspect dits_default

# Test connectivity
docker compose exec api ping postgres
docker compose exec api nc -zv postgres 5432
```

### Storage Issues

```bash
# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes

# Check volume
docker volume inspect dits_postgres_data
```

---

## Security

### Non-root Containers

All official images run as non-root:

```dockerfile
USER 1000:1000
```

### Secrets Management

```yaml
# docker-compose.yml with secrets
services:
  api:
    secrets:
      - db_password
      - jwt_secret
    environment:
      - DATABASE_PASSWORD_FILE=/run/secrets/db_password
      - JWT_SECRET_FILE=/run/secrets/jwt_secret

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### Network Isolation

```yaml
networks:
  internal:
    internal: true  # No external access
  external:
    driver: bridge
```

---

## Notes

- Use external PostgreSQL/Redis for production
- Configure proper resource limits
- Enable health checks for all services
- Use secrets for sensitive data
- Regular backup of volumes
- Monitor container metrics

