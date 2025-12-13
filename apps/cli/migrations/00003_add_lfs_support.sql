-- Migration: 00003_add_lfs_support
-- Description: Large File Storage (LFS) specific tables
-- Created: 2024-01-01

-- ============================================
-- LFS OBJECTS
-- ============================================

-- LFS objects are stored separately from regular chunks
-- for compatibility with Git LFS protocol
CREATE TABLE lfs_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    oid VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 OID (Git LFS uses SHA-256)
    size_bytes BIGINT NOT NULL,

    -- Storage location (may differ from chunks)
    storage_backend VARCHAR(50) NOT NULL DEFAULT 's3',
    storage_key TEXT NOT NULL,

    -- Upload status
    upload_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'uploading', 'complete', 'failed'
    upload_expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX idx_lfs_objects_oid ON lfs_objects(oid);
CREATE INDEX idx_lfs_objects_pending ON lfs_objects(upload_expires_at)
    WHERE upload_status = 'pending';

-- LFS pointers in repositories
CREATE TABLE lfs_pointers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    commit_hash BYTEA NOT NULL,
    oid VARCHAR(64) NOT NULL REFERENCES lfs_objects(oid) ON DELETE RESTRICT,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lfs_pointers_repo ON lfs_pointers(repository_id);
CREATE INDEX idx_lfs_pointers_oid ON lfs_pointers(oid);

-- LFS locks (separate from regular locks for LFS protocol compatibility)
CREATE TABLE lfs_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, path)
);

CREATE INDEX idx_lfs_locks_repo ON lfs_locks(repository_id);

-- ============================================
-- LFS BATCH OPERATIONS
-- ============================================

-- Track batch upload/download operations
CREATE TABLE lfs_batch_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation VARCHAR(20) NOT NULL, -- 'upload', 'download'

    -- Objects in this batch
    objects JSONB NOT NULL, -- [{oid, size, actions}]

    -- Authentication
    auth_token_hash VARCHAR(64),
    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lfs_batch_ops_repo ON lfs_batch_operations(repository_id);
CREATE INDEX idx_lfs_batch_ops_expires ON lfs_batch_operations(expires_at);

-- ============================================
-- LFS TRANSFER PROGRESS
-- ============================================

CREATE TABLE lfs_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES lfs_batch_operations(id) ON DELETE CASCADE,
    oid VARCHAR(64) NOT NULL,

    -- Progress tracking
    bytes_transferred BIGINT NOT NULL DEFAULT 0,
    total_bytes BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'complete', 'failed'

    -- Multipart upload tracking
    upload_id TEXT, -- S3 multipart upload ID
    parts_completed INTEGER NOT NULL DEFAULT 0,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX idx_lfs_transfers_batch ON lfs_transfers(batch_id);
CREATE INDEX idx_lfs_transfers_oid ON lfs_transfers(oid);
