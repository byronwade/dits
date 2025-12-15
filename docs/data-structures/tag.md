# Tag (The Milestone)

A tag is an immutable named reference to a specific commit, used to mark releases, milestones, or important versions.

---

## Data Structure

```rust
/// Tag represents a named reference to a specific commit
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Tag {
    /// Lightweight tag (just a pointer)
    Lightweight {
        name: String,
        commit: CommitHash,
        created_at: DateTime<Utc>,
        created_by: UserId,
    },

    /// Annotated tag (with metadata)
    Annotated {
        name: String,
        commit: CommitHash,
        message: String,
        tagger: Tagger,
        created_at: DateTime<Utc>,
        signature: Option<Signature>,
    },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Tagger {
    pub name: String,
    pub email: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Signature {
    pub algorithm: String,  // "pgp", "ssh", etc.
    pub key_id: String,
    pub signature_data: Vec<u8>,
    pub verified: bool,
}

impl Tag {
    pub fn name(&self) -> &str {
        match self {
            Tag::Lightweight { name, .. } => name,
            Tag::Annotated { name, .. } => name,
        }
    }

    pub fn commit(&self) -> &CommitHash {
        match self {
            Tag::Lightweight { commit, .. } => commit,
            Tag::Annotated { commit, .. } => commit,
        }
    }

    pub fn is_annotated(&self) -> bool {
        matches!(self, Tag::Annotated { .. })
    }

    pub fn message(&self) -> Option<&str> {
        match self {
            Tag::Annotated { message, .. } => Some(message),
            _ => None,
        }
    }
}
```

---

## Common Tag Patterns for Media

```
# Release versions
v1.0
v1.1
v2.0-beta

# Client deliverables
client-review-1
client-review-2
client-approved

# Production milestones
rough-cut
fine-cut
picture-lock
final-master

# Broadcast/Distribution
broadcast-master-2025-01-15
online-master
archive-master

# Project phases
pre-production
production
post-production
delivery
```

---

## Local Storage

```
# .dits/refs/tags/v1.0
abc123def456789...

# .dits/refs/tags/client-review-1
def456789abc123...

# For annotated tags, tag object stored in objects/
# .dits/objects/ta/g123...
```

---

## Database Schema

```sql
-- Tags table
CREATE TABLE tags (
    repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    commit_hash TEXT NOT NULL,
    tag_type TEXT NOT NULL,  -- 'lightweight' or 'annotated'
    message TEXT,
    tagger_name TEXT,
    tagger_email TEXT,
    tagger_timestamp TIMESTAMPTZ,
    signature BYTEA,
    signature_verified BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    PRIMARY KEY (repo_id, name)
);

-- Index for listing tags
CREATE INDEX idx_tags_repo ON tags(repo_id, created_at DESC);
CREATE INDEX idx_tags_commit ON tags(repo_id, commit_hash);
```

---

## Operations

### Create Lightweight Tag

```rust
pub async fn create_lightweight_tag(
    repo_id: Uuid,
    name: &str,
    commit: Option<&str>,  // Defaults to HEAD
    user_id: UserId,
    force: bool,
    db: &Pool,
) -> Result<Tag> {
    validate_tag_name(name)?;

    // Check if tag exists
    if !force && tag_exists(repo_id, name, db).await? {
        return Err(Error::TagAlreadyExists(name.to_string()));
    }

    // Resolve commit
    let commit_hash = match commit {
        Some(ref_name) => resolve_ref(repo_id, ref_name, db).await?,
        None => get_head_commit(repo_id, db).await?,
    };

    let tag = Tag::Lightweight {
        name: name.to_string(),
        commit: commit_hash,
        created_at: Utc::now(),
        created_by: user_id,
    };

    // Upsert tag
    sqlx::query!(
        r#"
        INSERT INTO tags (repo_id, name, commit_hash, tag_type, created_by)
        VALUES ($1, $2, $3, 'lightweight', $4)
        ON CONFLICT (repo_id, name) DO UPDATE
        SET commit_hash = $3, created_by = $4, created_at = NOW()
        "#,
        repo_id,
        name,
        commit_hash.as_str(),
        user_id,
    )
    .execute(db)
    .await?;

    Ok(tag)
}
```

### Create Annotated Tag

```rust
pub async fn create_annotated_tag(
    repo_id: Uuid,
    name: &str,
    commit: Option<&str>,
    message: &str,
    user: &User,
    sign: bool,
    force: bool,
    db: &Pool,
) -> Result<Tag> {
    validate_tag_name(name)?;

    if !force && tag_exists(repo_id, name, db).await? {
        return Err(Error::TagAlreadyExists(name.to_string()));
    }

    let commit_hash = match commit {
        Some(ref_name) => resolve_ref(repo_id, ref_name, db).await?,
        None => get_head_commit(repo_id, db).await?,
    };

    let tagger = Tagger {
        name: user.name.clone(),
        email: user.email.clone(),
        timestamp: Utc::now(),
    };

    // Optionally sign the tag
    let signature = if sign {
        let tag_content = format!(
            "object {}\ntype commit\ntag {}\ntagger {} <{}> {}\n\n{}",
            commit_hash, name, tagger.name, tagger.email,
            tagger.timestamp.timestamp(), message
        );
        Some(sign_content(&tag_content, &user.signing_key)?)
    } else {
        None
    };

    let tag = Tag::Annotated {
        name: name.to_string(),
        commit: commit_hash,
        message: message.to_string(),
        tagger,
        created_at: Utc::now(),
        signature,
    };

    sqlx::query!(
        r#"
        INSERT INTO tags (repo_id, name, commit_hash, tag_type, message, tagger_name, tagger_email, tagger_timestamp, signature, created_by)
        VALUES ($1, $2, $3, 'annotated', $4, $5, $6, $7, $8, $9)
        ON CONFLICT (repo_id, name) DO UPDATE
        SET commit_hash = $3, message = $4, tagger_name = $5, tagger_email = $6, tagger_timestamp = $7, signature = $8, created_at = NOW()
        "#,
        repo_id,
        name,
        commit_hash.as_str(),
        message,
        tag.tagger().map(|t| &t.name),
        tag.tagger().map(|t| &t.email),
        tag.tagger().map(|t| t.timestamp),
        signature.as_ref().map(|s| &s.signature_data),
        user.id,
    )
    .execute(db)
    .await?;

    Ok(tag)
}
```

### List Tags

```rust
pub async fn list_tags(
    repo_id: Uuid,
    pattern: Option<&str>,  // Glob pattern like "v1.*"
    sort: TagSort,
    db: &Pool,
) -> Result<Vec<Tag>> {
    let pattern_sql = pattern
        .map(|p| glob_to_sql(p))
        .unwrap_or("%".to_string());

    // Tags are sorted in Rust code after retrieval for proper semantic versioning support
    // TagSort::Version uses semantic version comparison (e.g., v1.10.0 > v1.2.0)

    let rows = sqlx::query!(
        &format!(
            r#"
            SELECT name, commit_hash, tag_type, message, tagger_name, tagger_email, tagger_timestamp, signature, created_at, created_by
            FROM tags
            WHERE repo_id = $1 AND name LIKE $2
            ORDER BY {}
            "#,
            order
        ),
        repo_id,
        pattern_sql,
    )
    .fetch_all(db)
    .await?;

    let tags = rows.into_iter().map(|row| {
        if row.tag_type == "annotated" {
            Tag::Annotated {
                name: row.name,
                commit: CommitHash::new(row.commit_hash),
                message: row.message.unwrap_or_default(),
                tagger: Tagger {
                    name: row.tagger_name.unwrap_or_default(),
                    email: row.tagger_email.unwrap_or_default(),
                    timestamp: row.tagger_timestamp.unwrap_or(row.created_at),
                },
                created_at: row.created_at,
                signature: row.signature.map(|data| Signature {
                    algorithm: "pgp".to_string(),
                    key_id: "".to_string(),
                    signature_data: data,
                    verified: false,
                }),
            }
        } else {
            Tag::Lightweight {
                name: row.name,
                commit: CommitHash::new(row.commit_hash),
                created_at: row.created_at,
                created_by: row.created_by,
            }
        }
    }).collect();

    Ok(tags)
}
```

### Delete Tag

```rust
pub async fn delete_tag(
    repo_id: Uuid,
    name: &str,
    db: &Pool,
) -> Result<()> {
    let result = sqlx::query!(
        "DELETE FROM tags WHERE repo_id = $1 AND name = $2",
        repo_id,
        name,
    )
    .execute(db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(Error::TagNotFound(name.to_string()));
    }

    Ok(())
}
```

### Push Tags

```rust
pub async fn push_tags(
    local_repo: &LocalRepository,
    remote: &Remote,
    tags: Option<Vec<String>>,  // None = all tags
    force: bool,
) -> Result<PushResult> {
    let local_tags = match tags {
        Some(names) => local_repo.get_tags(&names)?,
        None => local_repo.all_tags()?,
    };

    let remote_tags = remote.list_tags().await?;

    let mut results = Vec::new();

    for tag in local_tags {
        let remote_tag = remote_tags.iter().find(|t| t.name() == tag.name());

        match remote_tag {
            Some(existing) if existing.commit() == tag.commit() => {
                // Already up to date
                results.push(TagPushResult::UpToDate(tag.name().to_string()));
            }
            Some(_) if !force => {
                // Tag exists with different commit
                results.push(TagPushResult::Rejected(tag.name().to_string()));
            }
            _ => {
                // Push tag
                remote.push_tag(&tag).await?;
                results.push(TagPushResult::Pushed(tag.name().to_string()));
            }
        }
    }

    Ok(PushResult { tags: results })
}
```

---

## Tag Name Validation

```rust
pub fn validate_tag_name(name: &str) -> Result<()> {
    // Same rules as branch names, mostly
    if name.is_empty() || name.len() > 256 {
        return Err(Error::InvalidTagName("Invalid length"));
    }

    if name.starts_with('-') || name.starts_with('.') {
        return Err(Error::InvalidTagName("Cannot start with - or ."));
    }

    if name.contains("..") || name.contains("//") || name.contains("@{") {
        return Err(Error::InvalidTagName("Contains invalid sequence"));
    }

    for c in name.chars() {
        if c.is_control() || c.is_whitespace() || "~^:?*[\\".contains(c) {
            return Err(Error::InvalidTagName("Contains invalid character"));
        }
    }

    Ok(())
}
```

---

## Notes

- Tags are immutable (unlike branches)
- Use lightweight tags for personal bookmarks
- Use annotated tags for releases and deliverables
- Signed tags provide authenticity verification
- Tags don't auto-push (explicit `dits push --tags` required)
- Deleting a tag doesn't delete the commit it points to
- Tags can point to the same commit as branches
