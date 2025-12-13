# Monitoring & Observability

**Project:** Dits (Data-Intensive Version Control System)
**Document:** Monitoring, Metrics, Logging, and Alerting Architecture
**Objective:** Ensure system health visibility, rapid incident response, and performance optimization.

---

## Observability Stack

### Recommended Tools

| Component | Tool | Alternative |
| :--- | :--- | :--- |
| Metrics | Prometheus | Datadog, CloudWatch |
| Visualization | Grafana | Datadog Dashboards |
| Logging | Loki / ELK | CloudWatch Logs, Datadog |
| Tracing | Jaeger / Tempo | Datadog APM, X-Ray |
| Alerting | Alertmanager | PagerDuty, Opsgenie |
| Status Page | Statuspage.io | Cachet, custom |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   OBSERVABILITY ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Dits Server  │  │ Dits Worker  │  │ Dits Client  │          │
│  │              │  │              │  │ (opt-in)     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         │ Metrics (Prometheus format)       │                   │
│         │ Logs (JSON structured)            │                   │
│         │ Traces (OpenTelemetry)            │                   │
│         │                 │                 │                   │
│         └────────┬────────┴────────┬────────┘                   │
│                  │                 │                             │
│         ┌────────▼────────┐ ┌──────▼───────┐                   │
│         │   Prometheus    │ │     Loki     │                   │
│         │   (Metrics)     │ │    (Logs)    │                   │
│         └────────┬────────┘ └──────┬───────┘                   │
│                  │                 │                             │
│         ┌────────▼─────────────────▼───────┐                   │
│         │           Grafana                 │                   │
│         │  - Dashboards                     │                   │
│         │  - Alerting                       │                   │
│         │  - Exploration                    │                   │
│         └────────┬─────────────────────────┘                   │
│                  │                                               │
│         ┌────────▼────────┐                                     │
│         │  Alertmanager   │──────▶ PagerDuty / Slack / Email   │
│         └─────────────────┘                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Metrics

### Server Metrics

```rust
use prometheus::{Counter, Gauge, Histogram, Registry};

lazy_static! {
    pub static ref REGISTRY: Registry = Registry::new();

    // HTTP Metrics
    pub static ref HTTP_REQUESTS_TOTAL: Counter = Counter::new(
        "dits_http_requests_total",
        "Total HTTP requests"
    ).unwrap();

    pub static ref HTTP_REQUEST_DURATION: Histogram = Histogram::with_opts(
        HistogramOpts::new(
            "dits_http_request_duration_seconds",
            "HTTP request duration in seconds"
        ).buckets(vec![0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0])
    ).unwrap();

    pub static ref HTTP_REQUESTS_IN_FLIGHT: Gauge = Gauge::new(
        "dits_http_requests_in_flight",
        "Current HTTP requests being processed"
    ).unwrap();

    // Repository Metrics
    pub static ref REPOS_TOTAL: Gauge = Gauge::new(
        "dits_repositories_total",
        "Total number of repositories"
    ).unwrap();

    pub static ref COMMITS_TOTAL: Counter = Counter::new(
        "dits_commits_total",
        "Total commits across all repos"
    ).unwrap();

    // Chunk Metrics
    pub static ref CHUNKS_STORED: Gauge = Gauge::new(
        "dits_chunks_stored",
        "Total chunks in storage"
    ).unwrap();

    pub static ref CHUNKS_SIZE_BYTES: Gauge = Gauge::new(
        "dits_chunks_size_bytes",
        "Total size of stored chunks"
    ).unwrap();

    pub static ref CHUNK_UPLOADS_TOTAL: Counter = Counter::new(
        "dits_chunk_uploads_total",
        "Total chunk uploads"
    ).unwrap();

    pub static ref CHUNK_DOWNLOADS_TOTAL: Counter = Counter::new(
        "dits_chunk_downloads_total",
        "Total chunk downloads"
    ).unwrap();

    pub static ref DEDUP_RATIO: Gauge = Gauge::new(
        "dits_deduplication_ratio",
        "Current deduplication ratio"
    ).unwrap();

    // Transfer Metrics
    pub static ref BYTES_UPLOADED: Counter = Counter::new(
        "dits_bytes_uploaded_total",
        "Total bytes uploaded"
    ).unwrap();

    pub static ref BYTES_DOWNLOADED: Counter = Counter::new(
        "dits_bytes_downloaded_total",
        "Total bytes downloaded"
    ).unwrap();

    pub static ref TRANSFER_SPEED: Histogram = Histogram::with_opts(
        HistogramOpts::new(
            "dits_transfer_speed_bytes_per_second",
            "Transfer speed in bytes per second"
        ).buckets(vec![1e6, 5e6, 10e6, 50e6, 100e6, 500e6, 1e9])
    ).unwrap();

    // Lock Metrics
    pub static ref LOCKS_ACTIVE: Gauge = Gauge::new(
        "dits_locks_active",
        "Currently active locks"
    ).unwrap();

    pub static ref LOCK_ACQUISITIONS: Counter = Counter::new(
        "dits_lock_acquisitions_total",
        "Total lock acquisitions"
    ).unwrap();

    pub static ref LOCK_CONTENTIONS: Counter = Counter::new(
        "dits_lock_contentions_total",
        "Lock contention events"
    ).unwrap();

    // Database Metrics
    pub static ref DB_CONNECTIONS_ACTIVE: Gauge = Gauge::new(
        "dits_db_connections_active",
        "Active database connections"
    ).unwrap();

    pub static ref DB_QUERY_DURATION: Histogram = Histogram::with_opts(
        HistogramOpts::new(
            "dits_db_query_duration_seconds",
            "Database query duration"
        ).buckets(vec![0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0])
    ).unwrap();

    // GC Metrics
    pub static ref GC_RUNS_TOTAL: Counter = Counter::new(
        "dits_gc_runs_total",
        "Total GC runs"
    ).unwrap();

    pub static ref GC_CHUNKS_DELETED: Counter = Counter::new(
        "dits_gc_chunks_deleted_total",
        "Chunks deleted by GC"
    ).unwrap();

    pub static ref GC_BYTES_RECLAIMED: Counter = Counter::new(
        "dits_gc_bytes_reclaimed_total",
        "Bytes reclaimed by GC"
    ).unwrap();

    pub static ref GC_DURATION: Histogram = Histogram::with_opts(
        HistogramOpts::new(
            "dits_gc_duration_seconds",
            "GC run duration"
        ).buckets(vec![1.0, 5.0, 10.0, 30.0, 60.0, 300.0, 600.0])
    ).unwrap();
}

// Metrics endpoint handler
pub async fn metrics_handler() -> impl IntoResponse {
    let encoder = TextEncoder::new();
    let metric_families = REGISTRY.gather();
    let mut buffer = Vec::new();
    encoder.encode(&metric_families, &mut buffer).unwrap();
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, encoder.format_type())],
        buffer,
    )
}
```

### Client Metrics (Opt-in Telemetry)

```rust
pub struct ClientTelemetry {
    enabled: bool,
    endpoint: String,
    buffer: Vec<TelemetryEvent>,
    flush_interval: Duration,
}

#[derive(Serialize)]
pub struct TelemetryEvent {
    pub timestamp: DateTime<Utc>,
    pub event_type: String,
    pub properties: HashMap<String, Value>,
    pub client_version: String,
    pub os: String,
    pub anonymized_user_id: String,  // Hash of user ID
}

impl ClientTelemetry {
    pub fn track(&mut self, event: &str, properties: HashMap<String, Value>) {
        if !self.enabled {
            return;
        }

        self.buffer.push(TelemetryEvent {
            timestamp: Utc::now(),
            event_type: event.to_string(),
            properties,
            client_version: env!("CARGO_PKG_VERSION").to_string(),
            os: std::env::consts::OS.to_string(),
            anonymized_user_id: self.anonymized_id(),
        });

        if self.buffer.len() >= 100 {
            self.flush();
        }
    }

    // Track common events
    pub fn track_add(&mut self, file_count: usize, total_bytes: u64, dedup_ratio: f64) {
        self.track("add", hashmap! {
            "file_count" => json!(file_count),
            "total_bytes" => json!(total_bytes),
            "dedup_ratio" => json!(dedup_ratio),
        });
    }

    pub fn track_push(&mut self, chunks_uploaded: usize, bytes_uploaded: u64, duration_ms: u64) {
        self.track("push", hashmap! {
            "chunks_uploaded" => json!(chunks_uploaded),
            "bytes_uploaded" => json!(bytes_uploaded),
            "duration_ms" => json!(duration_ms),
        });
    }

    pub fn track_mount(&mut self, file_count: usize) {
        self.track("mount", hashmap! {
            "file_count" => json!(file_count),
        });
    }
}
```

---

## Logging

### Structured Logging Format

```rust
use tracing::{info, warn, error, instrument, Span};
use tracing_subscriber::fmt::format::JsonFields;

// Configure structured logging
pub fn init_logging() {
    let subscriber = tracing_subscriber::fmt()
        .json()
        .with_current_span(true)
        .with_span_list(true)
        .with_file(true)
        .with_line_number(true)
        .with_target(true)
        .finish();

    tracing::subscriber::set_global_default(subscriber).unwrap();
}

// Example log output:
// {
//   "timestamp": "2025-01-15T14:30:00.123Z",
//   "level": "INFO",
//   "target": "dits_server::api::commits",
//   "message": "Commit pushed",
//   "fields": {
//     "repo_id": "abc-123",
//     "commit_hash": "def456",
//     "user_id": "user-789",
//     "chunks_uploaded": 45,
//     "bytes_uploaded": 12345678
//   },
//   "spans": [
//     {"name": "push_commit", "repo_id": "abc-123"}
//   ]
// }
```

### Log Levels and Guidelines

```rust
// ERROR: System failures, data loss risks, unrecoverable errors
error!(
    error = %e,
    repo_id = %repo_id,
    "Failed to write chunk to storage"
);

// WARN: Degraded performance, recoverable errors, unusual conditions
warn!(
    user_id = %user_id,
    attempts = login_attempts,
    "Multiple failed login attempts"
);

// INFO: Significant business events, state changes
info!(
    repo_id = %repo_id,
    commit_hash = %hash,
    user_id = %user_id,
    files_changed = count,
    "Commit pushed"
);

// DEBUG: Detailed operational information
debug!(
    chunk_hash = %hash,
    size = bytes,
    "Chunk uploaded"
);

// TRACE: Very detailed debugging information
trace!(
    offset = offset,
    length = length,
    "Reading chunk range"
);
```

### Request Tracing

```rust
#[instrument(
    skip(db, storage),
    fields(
        request_id = %Uuid::new_v4(),
        user_id = %auth.user_id,
    )
)]
pub async fn handle_push_commit(
    auth: Auth,
    Path(repo_id): Path<Uuid>,
    Json(payload): Json<PushRequest>,
    db: Extension<Pool>,
    storage: Extension<ObjectStore>,
) -> Result<Json<PushResponse>, ApiError> {
    info!(repo_id = %repo_id, "Push commit started");

    let chunks_needed = calculate_missing_chunks(&payload, &db).await?;
    debug!(missing_chunks = chunks_needed.len(), "Calculated missing chunks");

    for chunk in &payload.chunks {
        upload_chunk(chunk, &storage).await?;
        trace!(chunk_hash = %chunk.hash, "Chunk uploaded");
    }

    let commit = create_commit(&payload, &db).await?;
    info!(
        commit_hash = %commit.hash,
        chunks_uploaded = payload.chunks.len(),
        "Push commit completed"
    );

    Ok(Json(PushResponse { commit_hash: commit.hash }))
}
```

### Log Aggregation (Loki)

```yaml
# promtail config
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: dits-server
    static_configs:
      - targets:
          - localhost
        labels:
          job: dits-server
          __path__: /var/log/dits/server.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            timestamp: timestamp
            request_id: fields.request_id
            user_id: fields.user_id
            repo_id: fields.repo_id
      - labels:
          level:
          request_id:
          user_id:
          repo_id:

  - job_name: dits-worker
    static_configs:
      - targets:
          - localhost
        labels:
          job: dits-worker
          __path__: /var/log/dits/worker.log
```

---

## Tracing

### OpenTelemetry Integration

```rust
use opentelemetry::trace::{Tracer, SpanKind};
use opentelemetry_jaeger::JaegerPropagator;

pub fn init_tracing() -> Result<()> {
    let tracer = opentelemetry_jaeger::new_pipeline()
        .with_service_name("dits-server")
        .with_agent_endpoint("localhost:6831")
        .install_batch(opentelemetry::runtime::Tokio)?;

    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

    let subscriber = Registry::default()
        .with(telemetry)
        .with(fmt::layer().json());

    tracing::subscriber::set_global_default(subscriber)?;

    Ok(())
}

// Distributed tracing across services
#[instrument(skip_all)]
pub async fn push_commit(request: PushRequest) -> Result<PushResponse> {
    // Parent span: push_commit

    // Child span: validate_request
    let _validate_span = tracing::info_span!("validate_request").entered();
    validate(&request)?;
    drop(_validate_span);

    // Child span: calculate_delta
    let missing = tracing::info_span!("calculate_delta")
        .in_scope(|| calculate_missing_chunks(&request))?;

    // Child span: upload_chunks (parallel)
    let upload_span = tracing::info_span!("upload_chunks", count = missing.len());
    let _upload_guard = upload_span.enter();

    let results = futures::future::join_all(
        missing.iter().map(|chunk| {
            let span = tracing::info_span!("upload_chunk", hash = %chunk.hash);
            async move {
                let _guard = span.enter();
                upload_chunk(chunk).await
            }
        })
    ).await;

    // Child span: create_commit
    let commit = tracing::info_span!("create_commit")
        .in_scope(|| create_commit(&request))?;

    Ok(PushResponse { commit_hash: commit.hash })
}
```

### Trace Visualization (Jaeger)

```
┌─────────────────────────────────────────────────────────────────┐
│ Trace: push_commit (request_id: abc-123)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ dits-server                                                      │
│ └── push_commit ─────────────────────────────────── 2.5s        │
│     ├── validate_request ──── 5ms                               │
│     ├── calculate_delta ───── 150ms                             │
│     │   └── db.query ──────── 120ms                             │
│     ├── upload_chunks ─────────────────────────── 2.2s         │
│     │   ├── upload_chunk (abc) ── 400ms                        │
│     │   ├── upload_chunk (def) ── 380ms                        │
│     │   ├── upload_chunk (ghi) ── 450ms                        │
│     │   └── ... (42 more)                                       │
│     └── create_commit ────── 100ms                              │
│         └── db.insert ────── 80ms                               │
│                                                                  │
│ dits-storage (S3)                                               │
│ └── put_object (abc) ─────── 350ms                              │
│ └── put_object (def) ─────── 330ms                              │
│ └── put_object (ghi) ─────── 400ms                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dashboards

### Main Dashboard (Grafana)

```json
{
  "title": "Dits Overview",
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(dits_http_requests_total[5m])",
          "legendFormat": "{{method}} {{path}}"
        }
      ]
    },
    {
      "title": "Error Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(dits_http_requests_total{status=~\"5..\"}[5m]) / rate(dits_http_requests_total[5m]) * 100",
          "legendFormat": "Error %"
        }
      ]
    },
    {
      "title": "P99 Latency",
      "type": "graph",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, rate(dits_http_request_duration_seconds_bucket[5m]))",
          "legendFormat": "P99"
        }
      ]
    },
    {
      "title": "Active Users",
      "type": "stat",
      "targets": [
        {
          "expr": "count(dits_active_sessions)"
        }
      ]
    },
    {
      "title": "Storage Used",
      "type": "gauge",
      "targets": [
        {
          "expr": "dits_chunks_size_bytes / 1e12",
          "legendFormat": "TB"
        }
      ]
    },
    {
      "title": "Deduplication Ratio",
      "type": "stat",
      "targets": [
        {
          "expr": "dits_deduplication_ratio"
        }
      ]
    },
    {
      "title": "Transfer Speed",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(dits_bytes_uploaded_total[5m])",
          "legendFormat": "Upload"
        },
        {
          "expr": "rate(dits_bytes_downloaded_total[5m])",
          "legendFormat": "Download"
        }
      ]
    },
    {
      "title": "Active Locks",
      "type": "stat",
      "targets": [
        {
          "expr": "dits_locks_active"
        }
      ]
    }
  ]
}
```

### Storage Dashboard

```json
{
  "title": "Dits Storage",
  "panels": [
    {
      "title": "Storage by Tier",
      "type": "piechart",
      "targets": [
        {
          "expr": "dits_chunks_size_bytes{tier=\"hot\"}",
          "legendFormat": "Hot"
        },
        {
          "expr": "dits_chunks_size_bytes{tier=\"warm\"}",
          "legendFormat": "Warm"
        },
        {
          "expr": "dits_chunks_size_bytes{tier=\"cold\"}",
          "legendFormat": "Cold"
        }
      ]
    },
    {
      "title": "Chunk Operations",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(dits_chunk_uploads_total[5m])",
          "legendFormat": "Uploads"
        },
        {
          "expr": "rate(dits_chunk_downloads_total[5m])",
          "legendFormat": "Downloads"
        }
      ]
    },
    {
      "title": "GC Activity",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(dits_gc_chunks_deleted_total[1h])",
          "legendFormat": "Chunks Deleted"
        },
        {
          "expr": "rate(dits_gc_bytes_reclaimed_total[1h])",
          "legendFormat": "Bytes Reclaimed"
        }
      ]
    },
    {
      "title": "S3 Costs (Estimated)",
      "type": "stat",
      "targets": [
        {
          "expr": "dits_chunks_size_bytes{tier=\"hot\"} * 0.023 / 1e9 + dits_chunks_size_bytes{tier=\"warm\"} * 0.012 / 1e9 + dits_chunks_size_bytes{tier=\"cold\"} * 0.004 / 1e9",
          "legendFormat": "Monthly $"
        }
      ]
    }
  ]
}
```

### Database Dashboard

```json
{
  "title": "Dits Database",
  "panels": [
    {
      "title": "Connection Pool",
      "type": "graph",
      "targets": [
        {
          "expr": "dits_db_connections_active",
          "legendFormat": "Active"
        },
        {
          "expr": "dits_db_connections_idle",
          "legendFormat": "Idle"
        },
        {
          "expr": "dits_db_connections_max",
          "legendFormat": "Max"
        }
      ]
    },
    {
      "title": "Query Latency",
      "type": "heatmap",
      "targets": [
        {
          "expr": "rate(dits_db_query_duration_seconds_bucket[5m])"
        }
      ]
    },
    {
      "title": "Slow Queries",
      "type": "table",
      "targets": [
        {
          "expr": "topk(10, dits_db_slow_query_duration_seconds)"
        }
      ]
    }
  ]
}
```

---

## Alerting

### Alert Rules (Prometheus)

```yaml
groups:
  - name: dits-critical
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          rate(dits_http_requests_total{status=~"5.."}[5m])
          / rate(dits_http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

      # Service down
      - alert: ServiceDown
        expr: up{job="dits-server"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Dits server is down"
          description: "Instance {{ $labels.instance }} is not responding"

      # Database connection exhausted
      - alert: DatabaseConnectionsExhausted
        expr: |
          dits_db_connections_active / dits_db_connections_max > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connections nearly exhausted"
          description: "{{ $value | humanizePercentage }} of connections in use"

  - name: dits-warning
    rules:
      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, rate(dits_http_request_duration_seconds_bucket[5m])) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"
          description: "P99 latency is {{ $value | humanizeDuration }}"

      # Low disk space
      - alert: LowDiskSpace
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/data"} / node_filesystem_size_bytes{mountpoint="/data"}) < 0.1
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space on storage volume"
          description: "Only {{ $value | humanizePercentage }} free"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      # GC not running
      - alert: GCNotRunning
        expr: |
          time() - dits_gc_last_run_timestamp > 86400
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "GC hasn't run in 24 hours"
          description: "Last GC run was {{ $value | humanizeDuration }} ago"

      # Lock contention
      - alert: HighLockContention
        expr: |
          rate(dits_lock_contentions_total[5m]) > 10
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High lock contention"
          description: "{{ $value }} contentions per second"

  - name: dits-info
    rules:
      # Unusual traffic
      - alert: UnusualTrafficSpike
        expr: |
          rate(dits_http_requests_total[5m]) > 2 * avg_over_time(rate(dits_http_requests_total[5m])[1d:5m])
        for: 15m
        labels:
          severity: info
        annotations:
          summary: "Unusual traffic spike detected"
          description: "Traffic is 2x normal levels"

      # Large upload
      - alert: LargeUpload
        expr: |
          dits_upload_size_bytes > 100e9
        labels:
          severity: info
        annotations:
          summary: "Large upload in progress"
          description: "Upload of {{ $value | humanizeBytes }} detected"
```

### Alertmanager Config

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/xxx'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true

    - match:
        severity: warning
      receiver: 'slack-warnings'

    - match:
        severity: info
      receiver: 'slack-info'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#dits-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<pagerduty-key>'
        severity: critical

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#dits-alerts'
        color: 'warning'

  - name: 'slack-info'
    slack_configs:
      - channel: '#dits-info'
        color: 'good'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname']
```

---

## Health Checks

### Endpoint Implementation

```rust
#[derive(Serialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
    pub uptime_seconds: u64,
    pub checks: Vec<HealthCheck>,
}

#[derive(Serialize)]
pub struct HealthCheck {
    pub name: String,
    pub status: String,
    pub latency_ms: Option<u64>,
    pub message: Option<String>,
}

pub async fn health_handler(
    db: Extension<Pool>,
    redis: Extension<RedisClient>,
    storage: Extension<ObjectStore>,
) -> impl IntoResponse {
    let start = Instant::now();
    let mut checks = Vec::new();

    // Database check
    let db_check = tokio::time::timeout(Duration::from_secs(5), db.execute("SELECT 1"))
        .await
        .map(|r| r.is_ok())
        .unwrap_or(false);

    checks.push(HealthCheck {
        name: "database".to_string(),
        status: if db_check { "healthy" } else { "unhealthy" }.to_string(),
        latency_ms: Some(start.elapsed().as_millis() as u64),
        message: None,
    });

    // Redis check
    let redis_check = redis.ping().await.is_ok();
    checks.push(HealthCheck {
        name: "redis".to_string(),
        status: if redis_check { "healthy" } else { "unhealthy" }.to_string(),
        latency_ms: None,
        message: None,
    });

    // Storage check
    let storage_check = storage.head_bucket().await.is_ok();
    checks.push(HealthCheck {
        name: "storage".to_string(),
        status: if storage_check { "healthy" } else { "unhealthy" }.to_string(),
        latency_ms: None,
        message: None,
    });

    let all_healthy = checks.iter().all(|c| c.status == "healthy");

    let status = HealthStatus {
        status: if all_healthy { "healthy" } else { "degraded" }.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds: UPTIME.elapsed().as_secs(),
        checks,
    };

    let code = if all_healthy {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (code, Json(status))
}

// Kubernetes probes
pub async fn liveness_handler() -> impl IntoResponse {
    // Basic liveness: can the process respond?
    StatusCode::OK
}

pub async fn readiness_handler(
    db: Extension<Pool>,
) -> impl IntoResponse {
    // Readiness: can we serve traffic?
    match db.execute("SELECT 1").await {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::SERVICE_UNAVAILABLE,
    }
}
```

### Health Check Endpoints

```
GET /health          # Full health status with checks
GET /health/live     # Liveness probe (always 200 if running)
GET /health/ready    # Readiness probe (200 if can serve traffic)
GET /metrics         # Prometheus metrics
```

---

## Runbooks

### Runbook: High Error Rate

```markdown
# Runbook: High Error Rate Alert

## Symptoms
- Alert: HighErrorRate firing
- Error rate > 5% for > 5 minutes

## Diagnosis Steps

1. Check error logs
   ```
   kubectl logs -l app=dits-server --tail=100 | grep ERROR
   ```

2. Identify error types
   ```
   # Grafana query
   sum by (status, path) (rate(dits_http_requests_total{status=~"5.."}[5m]))
   ```

3. Check downstream services
   - Database: `dits_db_connections_active`
   - Redis: `redis_connected_clients`
   - S3: Check AWS status page

## Resolution Steps

### If database issues:
1. Check connection pool: `dits_db_connections_active`
2. Restart unhealthy pods: `kubectl rollout restart deployment/dits-server`
3. Scale if needed: `kubectl scale deployment/dits-server --replicas=5`

### If S3 issues:
1. Check S3 bucket status
2. Verify IAM credentials
3. Check for rate limiting

### If application bug:
1. Identify recent deployments: `kubectl rollout history deployment/dits-server`
2. Rollback if needed: `kubectl rollout undo deployment/dits-server`
3. Create incident ticket

## Escalation
- After 15 minutes: Page on-call engineer
- After 30 minutes: Page engineering manager
```

### Runbook: Database Connection Exhaustion

```markdown
# Runbook: Database Connections Exhausted

## Symptoms
- Alert: DatabaseConnectionsExhausted firing
- > 90% of max connections in use

## Diagnosis Steps

1. Check current connections
   ```sql
   SELECT count(*), state FROM pg_stat_activity GROUP BY state;
   ```

2. Find long-running queries
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC
   LIMIT 10;
   ```

3. Check for connection leaks in application logs

## Resolution Steps

1. Kill long-running queries if safe
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE duration > interval '5 minutes' AND state != 'idle';
   ```

2. Increase connection pool size (temporary)
   ```
   kubectl set env deployment/dits-server DATABASE_POOL_SIZE=50
   ```

3. Scale horizontally
   ```
   kubectl scale deployment/dits-server --replicas=10
   ```

4. Long-term: Optimize queries, add connection pooler (PgBouncer)

## Escalation
- After 10 minutes: Page DBA
- After 30 minutes: Consider enabling maintenance mode
```

---

## Summary

| Component | Tool | Purpose |
| :--- | :--- | :--- |
| Metrics | Prometheus | Quantitative system health |
| Logs | Loki | Qualitative debugging |
| Traces | Jaeger | Request flow analysis |
| Dashboards | Grafana | Visualization |
| Alerts | Alertmanager | Incident notification |
| Health | /health endpoints | Load balancer integration |
| Runbooks | Wiki/Confluence | Incident response |
