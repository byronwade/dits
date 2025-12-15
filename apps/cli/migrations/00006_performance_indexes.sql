-- Migration: 00006_performance_indexes
-- Description: Performance indexes for critical operations (status, diff, etc.)
-- Created: 2024-12-13

-- ============================================
-- STATUS OPERATION OPTIMIZATIONS
-- ============================================

-- Fast file listing for status operations (repository + commit + path prefix)
CREATE INDEX CONCURRENTLY idx_files_repo_commit_path_prefix ON files(repository_id, commit_hash, path varchar_pattern_ops)
    WHERE path IS NOT NULL;

-- Index for finding files by repository and commit (covers most status queries)
CREATE INDEX CONCURRENTLY idx_files_repo_commit_size ON files(repository_id, commit_hash, size_bytes)
    INCLUDE (path, hash, chunk_hashes);

-- ============================================
-- DIFF OPERATION OPTIMIZATIONS
-- ============================================

-- Fast commit-to-commit file comparisons
CREATE INDEX CONCURRENTLY idx_files_repo_hash ON files(repository_id, hash)
    INCLUDE (path, size_bytes, commit_hash);

-- ============================================
-- CHUNK REFERENCE COUNT OPTIMIZATIONS
-- ============================================

-- Faster chunk deduplication queries
CREATE INDEX CONCURRENTLY idx_chunks_ref_count_active ON chunks(ref_count DESC, last_accessed_at DESC)
    WHERE ref_count > 0;

-- Index for chunk cleanup operations
CREATE INDEX CONCURRENTLY idx_chunks_storage_tier_ref_count ON chunks(storage_tier, ref_count, last_accessed_at)
    WHERE ref_count = 0;

-- ============================================
-- BRANCH/TAG RESOLUTION OPTIMIZATIONS
-- ============================================

-- Fast branch resolution (name lookup)
CREATE INDEX CONCURRENTLY idx_branches_repo_name_hash ON branches(repository_id, name)
    INCLUDE (commit_hash, is_protected);

-- Fast tag resolution
CREATE INDEX CONCURRENTLY idx_tags_repo_name_hash ON tags(repository_id, name)
    INCLUDE (commit_hash);

-- ============================================
-- COMMIT GRAPH TRAVERSAL OPTIMIZATIONS
-- ============================================

-- Faster commit ancestry queries (parent traversal)
CREATE INDEX CONCURRENTLY idx_commits_parent_lookup ON commits(repository_id, hash)
    INCLUDE (parent_hashes, committer_date);

-- ============================================
-- LOCK PERFORMANCE OPTIMIZATIONS
-- ============================================

-- Faster lock conflict detection
CREATE INDEX CONCURRENTLY idx_locks_repo_path_active ON locks(repository_id, path text_pattern_ops)
    WHERE released_at IS NULL AND expires_at > NOW();

-- ============================================
-- AUDIT LOG PERFORMANCE
-- ============================================

-- Faster audit queries by time range and repository
CREATE INDEX CONCURRENTLY idx_audit_logs_repo_time ON audit_logs(resource_type, resource_id, created_at DESC)
    WHERE resource_type = 'repository';

-- ============================================
-- STATISTICS & ANALYTICS OPTIMIZATIONS
-- ============================================

-- Faster repository size calculations
CREATE INDEX CONCURRENTLY idx_files_repo_size ON files(repository_id, size_bytes DESC)
    INCLUDE (commit_hash);

-- ============================================
-- PARTIAL INDEXES FOR FREQUENT FILTERS
-- ============================================

-- Active, non-archived repositories
CREATE INDEX CONCURRENTLY idx_repositories_active ON repositories(owner_type, owner_id, updated_at DESC)
    WHERE deleted_at IS NULL AND is_archived = false;

-- Recent commits (for history/log operations)
CREATE INDEX CONCURRENTLY idx_commits_recent ON commits(repository_id, committer_date DESC)
    WHERE committer_date > NOW() - INTERVAL '90 days';

-- ============================================
-- COVERING INDEXES FOR COMMON QUERIES
-- ============================================

-- Status operation covering index
CREATE INDEX CONCURRENTLY idx_files_status_covering ON files(repository_id, commit_hash)
    INCLUDE (path, hash, size_bytes, mode, is_binary, mime_type);

-- Commit listing covering index
CREATE INDEX CONCURRENTLY idx_commits_listing_covering ON commits(repository_id, committer_date DESC)
    INCLUDE (hash, message, author_name, author_email, additions, deletions, files_changed);

-- ============================================
-- FUNCTIONS FOR INDEX MAINTENANCE
-- ============================================

-- Function to analyze and optimize indexes periodically
CREATE OR REPLACE FUNCTION optimize_performance_indexes()
RETURNS void AS $$
BEGIN
    -- Reindex critical indexes during low-traffic periods
    REINDEX INDEX CONCURRENTLY idx_files_repo_commit_path;
    REINDEX INDEX CONCURRENTLY idx_files_repo_commit_size;
    REINDEX INDEX CONCURRENTLY idx_chunks_ref_count_active;

    -- Update statistics for better query planning
    ANALYZE files;
    ANALYZE chunks;
    ANALYZE commits;
    ANALYZE repositories;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MONITORING INDEXES
-- ============================================

-- Index for monitoring chunk storage distribution
CREATE INDEX CONCURRENTLY idx_chunks_storage_monitoring ON chunks(storage_backend, storage_tier, created_at DESC)
    INCLUDE (size_bytes, compressed_size, ref_count);




