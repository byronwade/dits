-- Migration: 00002_add_indices
-- Description: Additional performance indices
-- Created: 2024-01-01

-- ============================================
-- COMPOSITE INDICES FOR COMMON QUERIES
-- ============================================

-- Fast repository lookup by full name
CREATE INDEX idx_repositories_full_name ON repositories(owner_type, owner_id, name)
    WHERE deleted_at IS NULL;

-- Fast commit history traversal
CREATE INDEX idx_commits_parents ON commits USING GIN(parent_hashes);

-- File path search
CREATE INDEX idx_files_path_pattern ON files(repository_id, path text_pattern_ops);

-- Active locks lookup
CREATE INDEX idx_locks_active ON locks(repository_id, path)
    WHERE released_at IS NULL AND expires_at > NOW();

-- Webhook delivery retries
CREATE INDEX idx_webhook_deliveries_pending ON webhook_deliveries(next_retry_at)
    WHERE next_retry_at IS NOT NULL AND response_code IS NULL;

-- ============================================
-- PARTIAL INDICES FOR FILTERED QUERIES
-- ============================================

-- Public repositories
CREATE INDEX idx_repositories_public ON repositories(created_at DESC)
    WHERE visibility = 'public' AND deleted_at IS NULL;

-- Unverified chunks (for integrity checks)
CREATE INDEX idx_chunks_unverified ON chunks(created_at)
    WHERE checksum_verified_at IS NULL;

-- Orphaned chunks (ref_count = 0)
CREATE INDEX idx_chunks_orphaned ON chunks(created_at)
    WHERE ref_count = 0;

-- ============================================
-- FULL TEXT SEARCH
-- ============================================

-- Add tsvector column for repository search
ALTER TABLE repositories ADD COLUMN search_vector tsvector;

CREATE INDEX idx_repositories_search ON repositories USING GIN(search_vector);

-- Update search vector on insert/update
CREATE OR REPLACE FUNCTION update_repository_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_repo_search_vector
    BEFORE INSERT OR UPDATE OF name, description ON repositories
    FOR EACH ROW EXECUTE FUNCTION update_repository_search_vector();

-- Add tsvector for commit message search
ALTER TABLE commits ADD COLUMN message_search tsvector;

CREATE INDEX idx_commits_message_search ON commits USING GIN(message_search);

CREATE OR REPLACE FUNCTION update_commit_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.message_search := to_tsvector('english', COALESCE(NEW.message, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_commit_search_vector
    BEFORE INSERT ON commits
    FOR EACH ROW EXECUTE FUNCTION update_commit_search_vector();

-- ============================================
-- BLOOM FILTER FOR CHUNK EXISTENCE CHECKS
-- ============================================

-- Enable bloom extension (if available)
-- CREATE EXTENSION IF NOT EXISTS bloom;
--
-- CREATE INDEX idx_chunks_bloom ON chunks USING bloom(hash)
--     WITH (length=80, col1=2);
