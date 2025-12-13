-- Migration: 00005_add_reflog
-- Description: Reference log for branch/tag history
-- Created: 2024-01-01

-- ============================================
-- REFLOG
-- ============================================

-- Track all reference updates (like git reflog)
CREATE TABLE reflog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,

    ref_type VARCHAR(20) NOT NULL, -- 'branch', 'tag', 'HEAD'
    ref_name VARCHAR(255) NOT NULL,

    old_hash BYTEA, -- NULL for creation
    new_hash BYTEA, -- NULL for deletion

    -- Who made the change
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- What caused the change
    action VARCHAR(50) NOT NULL, -- 'push', 'create', 'delete', 'force-push', 'merge', 'rebase'
    message TEXT,

    -- Client info
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reflog_repo ON reflog(repository_id, created_at DESC);
CREATE INDEX idx_reflog_repo_ref ON reflog(repository_id, ref_type, ref_name, created_at DESC);
CREATE INDEX idx_reflog_user ON reflog(user_id, created_at DESC);

-- Function to record reflog entries automatically
CREATE OR REPLACE FUNCTION record_branch_reflog()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO reflog (repository_id, ref_type, ref_name, old_hash, new_hash, action)
        VALUES (NEW.repository_id, 'branch', NEW.name, NULL, NEW.commit_hash, 'create');
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.commit_hash != NEW.commit_hash THEN
            INSERT INTO reflog (repository_id, ref_type, ref_name, old_hash, new_hash, action)
            VALUES (NEW.repository_id, 'branch', NEW.name, OLD.commit_hash, NEW.commit_hash, 'update');
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO reflog (repository_id, ref_type, ref_name, old_hash, new_hash, action)
        VALUES (OLD.repository_id, 'branch', OLD.name, OLD.commit_hash, NULL, 'delete');
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER branch_reflog_trigger
    AFTER INSERT OR UPDATE OR DELETE ON branches
    FOR EACH ROW EXECUTE FUNCTION record_branch_reflog();

CREATE OR REPLACE FUNCTION record_tag_reflog()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO reflog (repository_id, ref_type, ref_name, old_hash, new_hash, action)
        VALUES (NEW.repository_id, 'tag', NEW.name, NULL, NEW.commit_hash, 'create');
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO reflog (repository_id, ref_type, ref_name, old_hash, new_hash, action)
        VALUES (OLD.repository_id, 'tag', OLD.name, OLD.commit_hash, NULL, 'delete');
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tag_reflog_trigger
    AFTER INSERT OR DELETE ON tags
    FOR EACH ROW EXECUTE FUNCTION record_tag_reflog();

-- ============================================
-- STASH (for future implementation)
-- ============================================

CREATE TABLE stashes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Stash content
    tree_hash BYTEA NOT NULL,
    parent_commit_hash BYTEA NOT NULL,
    message TEXT,

    -- Index state (staged changes)
    index_tree_hash BYTEA,

    -- Stack order
    stash_index INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stashes_repo_user ON stashes(repository_id, user_id, stash_index);

-- ============================================
-- WORKTREES (for future implementation)
-- ============================================

CREATE TABLE worktrees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    branch_name VARCHAR(255),
    commit_hash BYTEA NOT NULL,

    is_locked BOOLEAN NOT NULL DEFAULT false,
    lock_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, name)
);

CREATE INDEX idx_worktrees_repo ON worktrees(repository_id);
