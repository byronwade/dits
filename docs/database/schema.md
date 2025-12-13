# Complete Database Schema

PostgreSQL database schema for Dits server-side storage.

---

## Overview

The database stores:
- User accounts and authentication
- Organizations and memberships
- Repository metadata and settings
- Commits, branches, and tags
- Chunk references and storage classes
- Locks and permissions
- Audit logs and analytics

---

## Schema Version Management

```sql
-- Schema version tracking
CREATE TABLE schema_migrations (
    version BIGINT PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum TEXT NOT NULL
);

-- Current schema version
INSERT INTO schema_migrations (version, description, checksum)
VALUES (20250108001, 'Initial schema', 'sha256:...');
```

---

## Users and Authentication

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_verification'
        CHECK (status IN ('active', 'suspended', 'pending_verification', 'deleted')),
    status_reason TEXT,
    status_until TIMESTAMPTZ,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE status != 'deleted';

-- User credentials (separate for security)
CREATE TABLE user_credentials (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_algorithm TEXT NOT NULL DEFAULT 'argon2id',
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret_encrypted BYTEA,
    mfa_recovery_codes_hash TEXT[],
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    force_password_change BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_failed_login_at TIMESTAMPTZ
);

-- User sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    device_id TEXT,
    mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE revoked_at IS NULL;

-- API tokens
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
CREATE INDEX idx_api_tokens_hash ON api_tokens(token_hash);

-- SSH keys
CREATE TABLE ssh_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    public_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL UNIQUE,
    key_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_ssh_keys_user ON ssh_keys(user_id);
CREATE INDEX idx_ssh_keys_fingerprint ON ssh_keys(fingerprint);

-- User cryptographic keys
CREATE TABLE user_keys (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    public_key BYTEA NOT NULL,
    encrypted_private_key BYTEA NOT NULL,
    key_derivation_salt BYTEA NOT NULL,
    key_derivation_params JSONB NOT NULL,
    key_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Organizations

```sql
-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    email TEXT,
    website TEXT,
    billing_email TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    plan_seats INT,
    plan_storage_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settings JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_orgs_name ON organizations(name);

-- Organization members
CREATE TABLE organization_members (
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member', 'billing')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invited_by UUID REFERENCES users(id),
    PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- Organization invitations
CREATE TABLE organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    token_hash TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    UNIQUE (org_id, email)
);

CREATE INDEX idx_org_invites_token ON organization_invitations(token_hash);

-- Teams (within organizations)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, name)
);

CREATE TABLE team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);
```

---

## Repositories

```sql
-- Repositories
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'organization')),
    owner_id UUID NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private', 'internal', 'public')),
    default_branch TEXT NOT NULL DEFAULT 'main',
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    disabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pushed_at TIMESTAMPTZ,
    settings JSONB NOT NULL DEFAULT '{}',
    storage_bucket TEXT NOT NULL,
    storage_region TEXT NOT NULL,
    UNIQUE (owner_type, owner_id, name)
);

CREATE INDEX idx_repos_owner ON repositories(owner_type, owner_id);
CREATE INDEX idx_repos_name ON repositories(name);
CREATE INDEX idx_repos_pushed ON repositories(pushed_at DESC) WHERE NOT archived;

-- Repository statistics (updated periodically)
CREATE TABLE repository_stats (
    repo_id UUID PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
    commit_count BIGINT NOT NULL DEFAULT 0,
    branch_count INT NOT NULL DEFAULT 0,
    tag_count INT NOT NULL DEFAULT 0,
    contributor_count INT NOT NULL DEFAULT 0,
    file_count BIGINT NOT NULL DEFAULT 0,
    chunk_count BIGINT NOT NULL DEFAULT 0,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    logical_bytes BIGINT NOT NULL DEFAULT 0,
    dedup_ratio FLOAT NOT NULL DEFAULT 1.0,
    last_activity_at TIMESTAMPTZ,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Repository collaborators
CREATE TABLE repository_collaborators (
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'read'
        CHECK (permission IN ('admin', 'write', 'read')),
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, user_id)
);

CREATE INDEX idx_repo_collabs_user ON repository_collaborators(user_id);

-- Team repository access
CREATE TABLE team_repositories (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'read'
        CHECK (permission IN ('admin', 'write', 'read')),
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, repo_id)
);

-- Repository settings/features
CREATE TABLE repository_settings (
    repo_id UUID PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
    require_lock_for_edit BOOLEAN NOT NULL DEFAULT TRUE,
    auto_generate_proxies BOOLEAN NOT NULL DEFAULT TRUE,
    proxy_resolution TEXT DEFAULT '1080p',
    max_file_size_bytes BIGINT DEFAULT 0,  -- 0 = unlimited
    allowed_extensions TEXT[],
    lifecycle_policy JSONB,
    webhook_secret TEXT
);
```

---

## Branches and Tags

```sql
-- Branches
CREATE TABLE branches (
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    head_commit TEXT NOT NULL,  -- Commit hash
    created_from TEXT,  -- Parent commit when created
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    protection JSONB,
    PRIMARY KEY (repo_id, name)
);

CREATE INDEX idx_branches_updated ON branches(repo_id, updated_at DESC);
CREATE UNIQUE INDEX idx_branches_default ON branches(repo_id)
    WHERE is_default = TRUE;

-- Tags
CREATE TABLE tags (
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    commit_hash TEXT NOT NULL,
    tag_type TEXT NOT NULL DEFAULT 'lightweight'
        CHECK (tag_type IN ('lightweight', 'annotated')),
    message TEXT,
    tagger_name TEXT,
    tagger_email TEXT,
    tagger_timestamp TIMESTAMPTZ,
    signature BYTEA,
    signature_verified BOOLEAN,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, name)
);

CREATE INDEX idx_tags_commit ON tags(repo_id, commit_hash);
```

---

## Commits and Manifests

```sql
-- Commits
CREATE TABLE commits (
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    hash TEXT NOT NULL,  -- BLAKE3 hash
    parent_hashes TEXT[] NOT NULL DEFAULT '{}',
    tree_hash TEXT NOT NULL,  -- Manifest hash
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_timestamp TIMESTAMPTZ NOT NULL,
    committer_name TEXT NOT NULL,
    committer_email TEXT NOT NULL,
    committer_timestamp TIMESTAMPTZ NOT NULL,
    message TEXT NOT NULL,
    signature BYTEA,
    signature_verified BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, hash)
);

CREATE INDEX idx_commits_author ON commits(repo_id, author_email);
CREATE INDEX idx_commits_time ON commits(repo_id, committer_timestamp DESC);
CREATE INDEX idx_commits_parent ON commits(repo_id, parent_hashes);

-- Manifests (file tree for each commit)
CREATE TABLE manifests (
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    hash TEXT NOT NULL,  -- BLAKE3 hash of manifest content
    commit_hash TEXT NOT NULL,
    parent_hash TEXT,
    entry_count INT NOT NULL,
    total_size BIGINT NOT NULL,
    chunk_count BIGINT NOT NULL,
    content BYTEA NOT NULL,  -- Compressed manifest data
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, hash)
);

CREATE INDEX idx_manifests_commit ON manifests(repo_id, commit_hash);

-- Assets (unique files across repo)
CREATE TABLE assets (
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    hash TEXT NOT NULL,  -- Content hash
    size BIGINT NOT NULL,
    mime_type TEXT,
    file_name TEXT,  -- Last seen filename
    chunk_count INT NOT NULL,
    metadata JSONB,  -- Video dimensions, duration, etc.
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, hash)
);

CREATE INDEX idx_assets_mime ON assets(repo_id, mime_type);
CREATE INDEX idx_assets_size ON assets(repo_id, size DESC);
```

---

## Chunks

```sql
-- Chunks (content-addressable blocks)
CREATE TABLE chunks (
    hash TEXT PRIMARY KEY,  -- BLAKE3 hash (32 bytes hex = 64 chars)
    size INT NOT NULL,
    compressed_size INT,
    compression TEXT,  -- 'none', 'zstd'
    storage_class TEXT NOT NULL DEFAULT 'standard'
        CHECK (storage_class IN ('standard', 'infrequent', 'glacier', 'deep_archive')),
    storage_bucket TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    ref_count INT NOT NULL DEFAULT 0,
    encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    encryption_key_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    delete_after TIMESTAMPTZ  -- For pending deletion
);

CREATE INDEX idx_chunks_storage ON chunks(storage_class, last_accessed_at);
CREATE INDEX idx_chunks_refcount ON chunks(ref_count) WHERE ref_count = 0;
CREATE INDEX idx_chunks_delete ON chunks(delete_after) WHERE delete_after IS NOT NULL;

-- Chunk references (which repos use which chunks)
CREATE TABLE chunk_refs (
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    chunk_hash TEXT NOT NULL REFERENCES chunks(hash),
    ref_count INT NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, chunk_hash)
);

CREATE INDEX idx_chunk_refs_hash ON chunk_refs(chunk_hash);

-- Chunk location cache (for multi-region)
CREATE TABLE chunk_locations (
    chunk_hash TEXT NOT NULL REFERENCES chunks(hash) ON DELETE CASCADE,
    region TEXT NOT NULL,
    bucket TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    replicated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (chunk_hash, region)
);
```

---

## Locks

```sql
-- File locks
CREATE TABLE locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id),
    lock_type TEXT NOT NULL DEFAULT 'exclusive'
        CHECK (lock_type IN ('exclusive', 'advisory', 'shared')),
    reason TEXT,
    locked_at_commit TEXT,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE (repo_id, path)
);

CREATE INDEX idx_locks_owner ON locks(owner_id);
CREATE INDEX idx_locks_expires ON locks(expires_at);

-- Lock history (audit trail)
CREATE TABLE lock_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lock_id UUID NOT NULL,
    repo_id UUID NOT NULL,
    path TEXT NOT NULL,
    owner_id UUID NOT NULL,
    action TEXT NOT NULL
        CHECK (action IN ('acquired', 'released', 'expired', 'force_released')),
    action_by UUID REFERENCES users(id),
    action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT
);

CREATE INDEX idx_lock_history_repo ON lock_history(repo_id, action_at DESC);
CREATE INDEX idx_lock_history_path ON lock_history(repo_id, path, action_at DESC);
```

---

## Webhooks

```sql
-- Webhooks
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret_encrypted BYTEA NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_repo ON webhooks(repo_id) WHERE active;

-- Webhook deliveries
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB NOT NULL,
    request_headers JSONB,
    response_status INT,
    response_body TEXT,
    response_headers JSONB,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INT,
    success BOOLEAN NOT NULL
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, delivered_at DESC);
```

---

## Audit and Analytics

```sql
-- Audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID REFERENCES users(id),
    actor_type TEXT NOT NULL,  -- 'user', 'system', 'api_token'
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_name TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_actor ON audit_log(actor_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id, timestamp DESC);

-- Usage metrics
CREATE TABLE usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,  -- 'user', 'organization', 'repository'
    entity_id UUID NOT NULL,
    metric_date DATE NOT NULL,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    bandwidth_bytes BIGINT NOT NULL DEFAULT 0,
    api_requests INT NOT NULL DEFAULT 0,
    push_count INT NOT NULL DEFAULT 0,
    pull_count INT NOT NULL DEFAULT 0,
    unique_contributors INT NOT NULL DEFAULT 0,
    UNIQUE (entity_type, entity_id, metric_date)
);

CREATE INDEX idx_usage_entity ON usage_metrics(entity_type, entity_id, metric_date DESC);

-- Daily snapshots for billing
CREATE TABLE billing_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    snapshot_date DATE NOT NULL,
    storage_bytes BIGINT NOT NULL,
    bandwidth_bytes BIGINT NOT NULL,
    active_users INT NOT NULL,
    repo_count INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, snapshot_date)
);
```

---

## Jobs and Background Tasks

```sql
-- Background jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue TEXT NOT NULL DEFAULT 'default',
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    locked_by TEXT,
    locked_until TIMESTAMPTZ,
    error TEXT,
    result JSONB
);

CREATE INDEX idx_jobs_queue ON jobs(queue, status, scheduled_at)
    WHERE status IN ('pending', 'running');
CREATE INDEX idx_jobs_locked ON jobs(locked_until)
    WHERE status = 'running' AND locked_until IS NOT NULL;

-- Dead letter queue
CREATE TABLE dead_letter_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_job_id UUID NOT NULL,
    queue TEXT NOT NULL,
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    error TEXT NOT NULL,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retry_count INT NOT NULL
);
```

---

## Notifications

```sql
-- User notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC)
    WHERE NOT read;

-- Notification preferences
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_on_mention BOOLEAN NOT NULL DEFAULT TRUE,
    email_on_review_request BOOLEAN NOT NULL DEFAULT TRUE,
    email_on_lock_expiry BOOLEAN NOT NULL DEFAULT TRUE,
    email_on_push BOOLEAN NOT NULL DEFAULT FALSE,
    email_digest TEXT NOT NULL DEFAULT 'daily'
        CHECK (email_digest IN ('never', 'daily', 'weekly'))
);
```

---

## Functions and Triggers

```sql
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_repositories_updated_at
    BEFORE UPDATE ON repositories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment chunk reference count
CREATE OR REPLACE FUNCTION increment_chunk_ref(p_hash TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE chunks SET ref_count = ref_count + 1 WHERE hash = p_hash;
END;
$$ LANGUAGE plpgsql;

-- Decrement chunk reference count
CREATE OR REPLACE FUNCTION decrement_chunk_ref(p_hash TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE chunks
    SET ref_count = GREATEST(0, ref_count - 1),
        delete_after = CASE
            WHEN ref_count <= 1 THEN NOW() + INTERVAL '30 days'
            ELSE delete_after
        END
    WHERE hash = p_hash;
END;
$$ LANGUAGE plpgsql;

-- Update repository stats
CREATE OR REPLACE FUNCTION update_repo_stats(p_repo_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO repository_stats (repo_id, commit_count, branch_count, tag_count)
    SELECT
        p_repo_id,
        (SELECT COUNT(*) FROM commits WHERE repo_id = p_repo_id),
        (SELECT COUNT(*) FROM branches WHERE repo_id = p_repo_id),
        (SELECT COUNT(*) FROM tags WHERE repo_id = p_repo_id)
    ON CONFLICT (repo_id) DO UPDATE SET
        commit_count = EXCLUDED.commit_count,
        branch_count = EXCLUDED.branch_count,
        tag_count = EXCLUDED.tag_count,
        calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## Notes

- UUIDs used for all primary keys (globally unique)
- Text hashes stored as hex strings (64 chars for BLAKE3)
- JSONB used for flexible schema fields
- Soft deletes via `deleted_at` where appropriate
- Indexes optimized for common query patterns
- Partitioning recommended for audit_log and usage_metrics at scale
