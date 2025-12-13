# Branch (The Pointer)

A branch is a named, movable pointer to a commit, enabling parallel development and version management.

---

## Data Structure

```rust
/// Branch represents a named reference to a commit
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Branch {
    /// Branch name (e.g., "main", "feature/vfx")
    pub name: String,

    /// Repository this branch belongs to
    pub repo_id: Uuid,

    /// Commit hash this branch points to
    pub head: CommitHash,

    /// Commit this branch was created from (for tracking)
    pub created_from: Option<CommitHash>,

    /// Who created this branch
    pub created_by: UserId,

    /// When this branch was created
    pub created_at: DateTime<Utc>,

    /// Last time the branch was updated (new commit pushed)
    pub updated_at: DateTime<Utc>,

    /// Is this the default branch?
    pub is_default: bool,

    /// Protection rules for this branch
    pub protection: Option<BranchProtection>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BranchProtection {
    /// Require pull request for changes
    pub require_pull_request: bool,

    /// Minimum approvals required
    pub required_approvals: u32,

    /// Require status checks to pass
    pub required_status_checks: Vec<String>,

    /// Dismiss stale approvals on new commits
    pub dismiss_stale_approvals: bool,

    /// Require linear history (no merge commits)
    pub require_linear_history: bool,

    /// Allow force push (dangerous)
    pub allow_force_push: bool,

    /// Allow deletion
    pub allow_deletion: bool,

    /// Users/roles who can bypass protection
    pub bypass_actors: Vec<BypassActor>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum BypassActor {
    User(UserId),
    Role(String),
    Team(Uuid),
}

/// Reference to HEAD (current branch or detached commit)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Head {
    /// Points to a branch
    Branch { name: String },

    /// Detached HEAD (pointing directly to commit)
    Detached { commit: CommitHash },
}
```

---

## Local Storage

### HEAD File

```
# .dits/HEAD

# When on a branch:
ref: refs/heads/main

# When detached:
abc123def456...
```

### Branch References

```
# .dits/refs/heads/main
abc123def456789...

# .dits/refs/heads/feature/vfx
def456789abc123...
```

### Remote Tracking Branches

```
# .dits/refs/remotes/origin/main
abc123def456789...

# .dits/refs/remotes/origin/feature/vfx
def456789abc123...
```

---

## Database Schema

```sql
-- Branches table
CREATE TABLE branches (
    repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    head_commit TEXT NOT NULL,
    created_from TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    protection JSONB,
    PRIMARY KEY (repo_id, name)
);

-- Ensure only one default branch per repo
CREATE UNIQUE INDEX idx_branches_default ON branches(repo_id) WHERE is_default = TRUE;

-- Branch update tracking
CREATE INDEX idx_branches_updated ON branches(repo_id, updated_at DESC);
```

---

## Operations

### Create Branch

```rust
pub async fn create_branch(
    repo_id: Uuid,
    name: &str,
    start_point: Option<&str>,  // Commit or branch name
    user_id: UserId,
    db: &Pool,
) -> Result<Branch> {
    // Validate branch name
    validate_branch_name(name)?;

    // Check if branch already exists
    if branch_exists(repo_id, name, db).await? {
        return Err(Error::BranchAlreadyExists(name.to_string()));
    }

    // Resolve start point to commit hash
    let head = match start_point {
        Some(ref_name) => resolve_ref(repo_id, ref_name, db).await?,
        None => get_head_commit(repo_id, db).await?,
    };

    let branch = Branch {
        name: name.to_string(),
        repo_id,
        head,
        created_from: Some(head),
        created_by: user_id,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        is_default: false,
        protection: None,
    };

    sqlx::query!(
        r#"
        INSERT INTO branches (repo_id, name, head_commit, created_from, created_by)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        branch.repo_id,
        branch.name,
        branch.head.as_str(),
        branch.created_from.as_ref().map(|h| h.as_str()),
        branch.created_by,
    )
    .execute(db)
    .await?;

    Ok(branch)
}
```

### Update Branch (Fast-Forward)

```rust
pub async fn update_branch(
    repo_id: Uuid,
    name: &str,
    new_head: CommitHash,
    old_head: Option<CommitHash>,  // For optimistic locking
    force: bool,
    db: &Pool,
) -> Result<()> {
    // Get current branch state
    let current = get_branch(repo_id, name, db).await?;

    // Check protection rules
    if let Some(protection) = &current.protection {
        if !force || !protection.allow_force_push {
            // Verify new_head is descendant of current head
            if !is_ancestor(&current.head, &new_head, db).await? {
                return Err(Error::NonFastForward);
            }
        }
    }

    // Optimistic locking check
    if let Some(expected) = old_head {
        if current.head != expected {
            return Err(Error::ConcurrentUpdate);
        }
    }

    // Update branch
    sqlx::query!(
        r#"
        UPDATE branches
        SET head_commit = $3, updated_at = NOW()
        WHERE repo_id = $1 AND name = $2
        "#,
        repo_id,
        name,
        new_head.as_str(),
    )
    .execute(db)
    .await?;

    Ok(())
}
```

### Switch Branch (Checkout)

```rust
pub async fn switch_branch(
    local_repo: &mut LocalRepository,
    branch_name: &str,
    create: bool,
    force: bool,
) -> Result<()> {
    // Check for uncommitted changes
    if !force {
        let status = local_repo.status().await?;
        if status.has_changes() {
            return Err(Error::UncommittedChanges);
        }
    }

    // Get or create branch
    let target_commit = if create {
        let head = local_repo.head_commit()?;
        local_repo.create_branch(branch_name, &head)?;
        head
    } else {
        let branch = local_repo.get_branch(branch_name)?;
        branch.head
    };

    // Update working tree
    local_repo.checkout_commit(&target_commit).await?;

    // Update HEAD
    local_repo.set_head(Head::Branch { name: branch_name.to_string() })?;

    Ok(())
}
```

### Delete Branch

```rust
pub async fn delete_branch(
    repo_id: Uuid,
    name: &str,
    force: bool,
    user_id: UserId,
    db: &Pool,
) -> Result<()> {
    let branch = get_branch(repo_id, name, db).await?;

    // Cannot delete default branch
    if branch.is_default {
        return Err(Error::CannotDeleteDefaultBranch);
    }

    // Check protection
    if let Some(protection) = &branch.protection {
        if !protection.allow_deletion {
            return Err(Error::BranchProtected);
        }
    }

    // Check if branch is merged (unless force)
    if !force {
        let default_branch = get_default_branch(repo_id, db).await?;
        if !is_ancestor(&branch.head, &default_branch.head, db).await? {
            return Err(Error::BranchNotMerged);
        }
    }

    // Delete branch
    sqlx::query!(
        "DELETE FROM branches WHERE repo_id = $1 AND name = $2",
        repo_id,
        name,
    )
    .execute(db)
    .await?;

    Ok(())
}
```

---

## Branch Name Validation

```rust
pub fn validate_branch_name(name: &str) -> Result<()> {
    // Length check
    if name.is_empty() || name.len() > 256 {
        return Err(Error::InvalidBranchName("Invalid length"));
    }

    // Cannot start with dash or dot
    if name.starts_with('-') || name.starts_with('.') {
        return Err(Error::InvalidBranchName("Cannot start with - or ."));
    }

    // Cannot end with slash, dot, or .lock
    if name.ends_with('/') || name.ends_with('.') || name.ends_with(".lock") {
        return Err(Error::InvalidBranchName("Invalid ending"));
    }

    // Cannot contain special sequences
    if name.contains("..") || name.contains("//") || name.contains("@{") {
        return Err(Error::InvalidBranchName("Contains invalid sequence"));
    }

    // Cannot contain control characters or certain special chars
    for c in name.chars() {
        if c.is_control() || "~^:?*[\\".contains(c) {
            return Err(Error::InvalidBranchName("Contains invalid character"));
        }
    }

    // Cannot be reserved names
    if ["HEAD", "FETCH_HEAD", "ORIG_HEAD", "MERGE_HEAD"].contains(&name) {
        return Err(Error::InvalidBranchName("Reserved name"));
    }

    Ok(())
}
```

---

## Notes

- Branches are lightweight (just pointers to commits)
- Default branch cannot be deleted
- Branch protection is enforced server-side
- Local branches can differ from remote (tracked via remotes/origin/*)
- Reflog tracks branch movements for recovery
