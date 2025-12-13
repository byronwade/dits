-- Migration: 00004_add_analytics
-- Description: Analytics and usage tracking tables
-- Created: 2024-01-01

-- ============================================
-- REPOSITORY ANALYTICS
-- ============================================

-- Daily aggregated statistics
CREATE TABLE repository_stats_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Activity metrics
    commits INTEGER NOT NULL DEFAULT 0,
    pushes INTEGER NOT NULL DEFAULT 0,
    pulls INTEGER NOT NULL DEFAULT 0,
    clones INTEGER NOT NULL DEFAULT 0,

    -- Storage metrics
    bytes_uploaded BIGINT NOT NULL DEFAULT 0,
    bytes_downloaded BIGINT NOT NULL DEFAULT 0,
    chunks_created INTEGER NOT NULL DEFAULT 0,
    chunks_deduplicated INTEGER NOT NULL DEFAULT 0,

    -- Unique visitors
    unique_cloners INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, date)
);

CREATE INDEX idx_repo_stats_daily_repo ON repository_stats_daily(repository_id, date DESC);

-- Hourly metrics for recent data (kept for 7 days)
CREATE TABLE repository_stats_hourly (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    hour TIMESTAMPTZ NOT NULL, -- Truncated to hour

    commits INTEGER NOT NULL DEFAULT 0,
    pushes INTEGER NOT NULL DEFAULT 0,
    pulls INTEGER NOT NULL DEFAULT 0,
    clones INTEGER NOT NULL DEFAULT 0,
    bytes_uploaded BIGINT NOT NULL DEFAULT 0,
    bytes_downloaded BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, hour)
);

CREATE INDEX idx_repo_stats_hourly_repo ON repository_stats_hourly(repository_id, hour DESC);

-- ============================================
-- USER ANALYTICS
-- ============================================

CREATE TABLE user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Activity counts
    commits INTEGER NOT NULL DEFAULT 0,
    pushes INTEGER NOT NULL DEFAULT 0,
    pulls INTEGER NOT NULL DEFAULT 0,
    repos_created INTEGER NOT NULL DEFAULT 0,

    -- Storage usage
    bytes_uploaded BIGINT NOT NULL DEFAULT 0,
    bytes_downloaded BIGINT NOT NULL DEFAULT 0,

    UNIQUE(user_id, date)
);

CREATE INDEX idx_user_activity_user ON user_activity(user_id, date DESC);

-- ============================================
-- STORAGE ANALYTICS
-- ============================================

-- Track storage usage over time
CREATE TABLE storage_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,

    -- Global metrics
    total_chunks BIGINT NOT NULL DEFAULT 0,
    total_bytes BIGINT NOT NULL DEFAULT 0,
    unique_chunks BIGINT NOT NULL DEFAULT 0,
    deduplicated_bytes BIGINT NOT NULL DEFAULT 0,

    -- By storage tier
    hot_bytes BIGINT NOT NULL DEFAULT 0,
    warm_bytes BIGINT NOT NULL DEFAULT 0,
    cold_bytes BIGINT NOT NULL DEFAULT 0,
    archive_bytes BIGINT NOT NULL DEFAULT 0,

    -- Compression stats
    compressed_bytes BIGINT NOT NULL DEFAULT 0,
    uncompressed_bytes BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date)
);

CREATE INDEX idx_storage_usage_date ON storage_usage(date DESC);

-- Per-repository storage breakdown
CREATE TABLE repository_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    total_bytes BIGINT NOT NULL DEFAULT 0,
    unique_bytes BIGINT NOT NULL DEFAULT 0, -- After dedup
    chunk_count BIGINT NOT NULL DEFAULT 0,
    file_count BIGINT NOT NULL DEFAULT 0,
    commit_count BIGINT NOT NULL DEFAULT 0,

    -- Largest files
    largest_files JSONB, -- [{path, size, hash}]

    UNIQUE(repository_id)
);

CREATE INDEX idx_repo_storage_repo ON repository_storage(repository_id);

-- ============================================
-- PERFORMANCE METRICS
-- ============================================

-- API latency percentiles (aggregated every 5 minutes)
CREATE TABLE api_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL, -- Truncated to 5-minute interval
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,

    -- Request counts
    request_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,

    -- Latency percentiles (in milliseconds)
    p50_latency REAL,
    p95_latency REAL,
    p99_latency REAL,
    max_latency REAL,

    -- Response sizes
    avg_response_bytes INTEGER,

    UNIQUE(timestamp, endpoint, method)
);

CREATE INDEX idx_api_metrics_time ON api_metrics(timestamp DESC);
CREATE INDEX idx_api_metrics_endpoint ON api_metrics(endpoint, timestamp DESC);

-- ============================================
-- CLEANUP JOBS
-- ============================================

-- Schedule cleanup of old metrics
-- Run daily: DELETE FROM repository_stats_hourly WHERE hour < NOW() - INTERVAL '7 days';
-- Run monthly: DELETE FROM api_metrics WHERE timestamp < NOW() - INTERVAL '30 days';
