-- Migration: 00001_initial_schema
-- Description: Initial database schema for Dits
-- Created: 2024-01-01

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- NULL for OAuth-only users
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    website VARCHAR(255),
    location VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'github', 'google', 'gitlab'
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_accounts_user ON oauth_accounts(user_id);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 of session token
    refresh_token_hash VARCHAR(64) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(8) NOT NULL, -- First 8 chars for identification
    key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 of full key
    scopes TEXT[] NOT NULL DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;

-- ============================================
-- ORGANIZATIONS
-- ============================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    website VARCHAR(255),
    billing_email VARCHAR(255),
    plan VARCHAR(50) NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_organizations_name ON organizations(name) WHERE deleted_at IS NULL;

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'reader'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_permission VARCHAR(50) NOT NULL DEFAULT 'read', -- 'read', 'write', 'admin'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE INDEX idx_teams_org ON teams(organization_id);

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- ============================================
-- REPOSITORIES
-- ============================================

CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_type VARCHAR(20) NOT NULL, -- 'user' or 'organization'
    owner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_branch VARCHAR(255) NOT NULL DEFAULT 'main',
    visibility VARCHAR(20) NOT NULL DEFAULT 'private', -- 'public', 'private', 'internal'
    is_archived BOOLEAN NOT NULL DEFAULT false,
    is_template BOOLEAN NOT NULL DEFAULT false,
    forked_from_id UUID REFERENCES repositories(id) ON DELETE SET NULL,

    -- Statistics (cached)
    size_bytes BIGINT NOT NULL DEFAULT 0,
    commit_count BIGINT NOT NULL DEFAULT 0,
    branch_count INTEGER NOT NULL DEFAULT 0,
    tag_count INTEGER NOT NULL DEFAULT 0,

    -- Settings
    settings JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pushed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_repositories_owner_name ON repositories(owner_type, owner_id, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_repositories_owner ON repositories(owner_type, owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_repositories_visibility ON repositories(visibility) WHERE deleted_at IS NULL;

CREATE TABLE repository_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL DEFAULT 'read', -- 'read', 'write', 'admin'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, user_id)
);

CREATE INDEX idx_repo_collaborators_repo ON repository_collaborators(repository_id);
CREATE INDEX idx_repo_collaborators_user ON repository_collaborators(user_id);

CREATE TABLE team_repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL DEFAULT 'read',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, repository_id)
);

-- ============================================
-- COMMITS & TREES
-- ============================================

CREATE TABLE commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    hash BYTEA NOT NULL, -- 32 bytes BLAKE3
    tree_hash BYTEA NOT NULL,
    parent_hashes BYTEA[], -- Array of parent commit hashes

    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    author_date TIMESTAMPTZ NOT NULL,

    committer_name VARCHAR(255) NOT NULL,
    committer_email VARCHAR(255) NOT NULL,
    committer_date TIMESTAMPTZ NOT NULL,

    message TEXT NOT NULL,
    signature TEXT, -- GPG signature if signed

    -- Metadata
    additions INTEGER NOT NULL DEFAULT 0,
    deletions INTEGER NOT NULL DEFAULT 0,
    files_changed INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, hash)
);

CREATE INDEX idx_commits_repo ON commits(repository_id);
CREATE INDEX idx_commits_repo_hash ON commits(repository_id, hash);
CREATE INDEX idx_commits_repo_date ON commits(repository_id, committer_date DESC);
CREATE INDEX idx_commits_author ON commits(author_email);

CREATE TABLE trees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    hash BYTEA NOT NULL,
    entries JSONB NOT NULL, -- Array of {name, mode, hash, size}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, hash)
);

CREATE INDEX idx_trees_repo_hash ON trees(repository_id, hash);

-- ============================================
-- BRANCHES & TAGS
-- ============================================

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    commit_hash BYTEA NOT NULL,
    is_protected BOOLEAN NOT NULL DEFAULT false,
    protection_rules JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, name)
);

CREATE INDEX idx_branches_repo ON branches(repository_id);

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    commit_hash BYTEA NOT NULL,

    -- For annotated tags
    tagger_name VARCHAR(255),
    tagger_email VARCHAR(255),
    message TEXT,
    signature TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, name)
);

CREATE INDEX idx_tags_repo ON tags(repository_id);

-- ============================================
-- CHUNKS & FILES
-- ============================================

CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hash BYTEA NOT NULL UNIQUE, -- 32 bytes BLAKE3, globally unique
    size_bytes BIGINT NOT NULL,
    compressed_size BIGINT,
    compression VARCHAR(20), -- 'zstd', 'lz4', 'none'

    -- Storage location
    storage_backend VARCHAR(50) NOT NULL DEFAULT 's3',
    storage_key TEXT NOT NULL,
    storage_tier VARCHAR(20) NOT NULL DEFAULT 'hot', -- 'hot', 'warm', 'cold', 'archive'

    -- Deduplication
    ref_count INTEGER NOT NULL DEFAULT 1,

    -- Integrity
    checksum_verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_chunks_hash ON chunks(hash);
CREATE INDEX idx_chunks_tier ON chunks(storage_tier);
CREATE INDEX idx_chunks_last_access ON chunks(last_accessed_at);

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_hash BYTEA NOT NULL,
    path TEXT NOT NULL,

    -- File metadata
    mode INTEGER NOT NULL, -- Unix file mode
    size_bytes BIGINT NOT NULL,
    hash BYTEA NOT NULL, -- Hash of complete file content

    -- For binary detection
    is_binary BOOLEAN NOT NULL DEFAULT false,
    mime_type VARCHAR(255),

    -- Chunk references (ordered list of chunk hashes)
    chunk_hashes BYTEA[] NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_repo_commit ON files(repository_id, commit_hash);
CREATE INDEX idx_files_repo_commit_path ON files(repository_id, commit_hash, path);
CREATE INDEX idx_files_hash ON files(hash);

-- Reference counting for chunks
CREATE TABLE chunk_refs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chunk_hash BYTEA NOT NULL REFERENCES chunks(hash) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    offset_in_file BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chunk_refs_chunk ON chunk_refs(chunk_hash);
CREATE INDEX idx_chunk_refs_repo ON chunk_refs(repository_id);

-- ============================================
-- LOCKS
-- ============================================

CREATE TABLE locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    UNIQUE(repository_id, path) -- Only one lock per path
);

CREATE INDEX idx_locks_repo ON locks(repository_id) WHERE released_at IS NULL;
CREATE INDEX idx_locks_user ON locks(user_id) WHERE released_at IS NULL;
CREATE INDEX idx_locks_expires ON locks(expires_at) WHERE released_at IS NULL;

-- ============================================
-- WEBHOOKS
-- ============================================

CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    url TEXT NOT NULL,
    secret VARCHAR(255), -- For HMAC signing
    content_type VARCHAR(50) NOT NULL DEFAULT 'application/json',

    events TEXT[] NOT NULL DEFAULT '{}', -- ['push', 'commit', 'branch', etc.]
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Statistics
    last_triggered_at TIMESTAMPTZ,
    last_response_code INTEGER,
    failure_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (repository_id IS NOT NULL OR organization_id IS NOT NULL)
);

CREATE INDEX idx_webhooks_repo ON webhooks(repository_id) WHERE repository_id IS NOT NULL;
CREATE INDEX idx_webhooks_org ON webhooks(organization_id) WHERE organization_id IS NOT NULL;

CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,

    request_headers JSONB,
    request_body JSONB,

    response_code INTEGER,
    response_headers JSONB,
    response_body TEXT,

    duration_ms INTEGER,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- For retry logic
    attempt_number INTEGER NOT NULL DEFAULT 1,
    next_retry_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type VARCHAR(50) NOT NULL, -- 'user', 'api_key', 'system'

    action VARCHAR(100) NOT NULL, -- 'repository.create', 'commit.push', etc.
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,

    metadata JSONB,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Partition audit logs by month for better performance
-- In production, you'd create partitions:
-- CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update repository statistics
CREATE OR REPLACE FUNCTION update_repository_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE repositories SET
        commit_count = (SELECT COUNT(*) FROM commits WHERE repository_id = NEW.repository_id),
        updated_at = NOW()
    WHERE id = NEW.repository_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_repo_stats_on_commit
    AFTER INSERT ON commits
    FOR EACH ROW EXECUTE FUNCTION update_repository_stats();

-- Function to update chunk reference count
CREATE OR REPLACE FUNCTION update_chunk_ref_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chunks SET ref_count = ref_count + 1 WHERE hash = NEW.chunk_hash;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chunks SET ref_count = ref_count - 1 WHERE hash = OLD.chunk_hash;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chunk_refs_on_insert
    AFTER INSERT ON chunk_refs
    FOR EACH ROW EXECUTE FUNCTION update_chunk_ref_count();

CREATE TRIGGER update_chunk_refs_on_delete
    AFTER DELETE ON chunk_refs
    FOR EACH ROW EXECUTE FUNCTION update_chunk_ref_count();

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert system user for automated actions
INSERT INTO users (id, username, email, name, is_active, is_admin)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system',
    'system@dits.local',
    'System',
    true,
    true
);
