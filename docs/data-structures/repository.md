# Repository (The Container)

The top-level container that holds all versioned content, configuration, and metadata.

---

## Data Structure

```rust
/// Repository represents a complete Dits repository
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Repository {
    /// Unique identifier (UUID v4)
    pub id: Uuid,

    /// Human-readable name (e.g., "commercial-q1-2025")
    pub name: String,

    /// Optional description
    pub description: Option<String>,

    /// Owner (user or organization)
    pub owner: Owner,

    /// Creation timestamp
    pub created_at: DateTime<Utc>,

    /// Last modification timestamp
    pub updated_at: DateTime<Utc>,

    /// Repository visibility
    pub visibility: Visibility,

    /// Default branch name
    pub default_branch: String,

    /// Repository settings
    pub settings: RepoSettings,

    /// Storage configuration
    pub storage: StorageConfig,

    /// Statistics (cached, updated periodically)
    pub stats: RepoStats,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Owner {
    User { id: Uuid, username: String },
    Organization { id: Uuid, name: String },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Visibility {
    Private,    // Only members can access
    Internal,   // Organization members can access
    Public,     // Anyone can read (rare for media)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RepoSettings {
    /// Require locking before editing
    pub require_lock_for_edit: bool,

    /// Maximum file size (0 = unlimited)
    pub max_file_size_bytes: u64,

    /// Allowed file extensions (empty = all)
    pub allowed_extensions: Vec<String>,

    /// Auto-generate proxies on upload
    pub auto_generate_proxies: bool,

    /// Proxy resolution
    pub proxy_resolution: Option<String>,

    /// Lifecycle policy for cold storage
    pub lifecycle_policy: Option<LifecyclePolicy>,

    /// Branch protection rules
    pub branch_protections: Vec<BranchProtection>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StorageConfig {
    /// Storage bucket/container name
    pub bucket: String,

    /// Storage region
    pub region: String,

    /// Storage class for new objects
    pub default_storage_class: StorageClass,

    /// Encryption settings
    pub encryption: EncryptionConfig,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RepoStats {
    /// Total commits
    pub commit_count: u64,

    /// Total unique chunks
    pub chunk_count: u64,

    /// Total storage used (bytes)
    pub storage_bytes: u64,

    /// Logical size (sum of all file sizes)
    pub logical_bytes: u64,

    /// Deduplication ratio
    pub dedup_ratio: f64,

    /// Number of contributors
    pub contributor_count: u32,

    /// Last activity timestamp
    pub last_activity_at: DateTime<Utc>,

    /// Stats last calculated
    pub calculated_at: DateTime<Utc>,
}
```

---

## Local Repository Structure

```
project/
├── .dits/                      # Repository metadata (hidden)
│   ├── config                  # Local configuration
│   ├── HEAD                    # Current branch/commit reference
│   ├── index                   # Staging area
│   ├── objects/                # Local chunk cache
│   │   ├── a1/
│   │   │   └── b2c3d4...       # Chunk files (hash-based paths)
│   │   └── ...
│   ├── refs/                   # Branch and tag references
│   │   ├── heads/
│   │   │   └── main            # Branch pointers
│   │   ├── tags/
│   │   │   └── v1.0            # Tag pointers
│   │   └── remotes/
│   │       └── origin/
│   │           └── main        # Remote tracking branches
│   ├── logs/                   # Reference logs (reflog)
│   │   └── HEAD
│   ├── manifests/              # Asset manifests
│   │   └── abc123.manifest     # Per-commit manifests
│   ├── staging/                # VFS write staging
│   └── cache/                  # Chunk cache for VFS
│       ├── l1/                 # L1 RAM-backed cache
│       └── l2/                 # L2 disk cache
├── footage/                    # Working tree (your files)
│   ├── scene01.mov
│   └── scene02.mov
└── project.prproj              # Project files
```

---

## Database Schema

```sql
-- Repositories table
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_type TEXT NOT NULL,  -- 'user' or 'organization'
    owner_id UUID NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'private',
    default_branch TEXT NOT NULL DEFAULT 'main',
    settings JSONB NOT NULL DEFAULT '{}',
    storage_bucket TEXT NOT NULL,
    storage_region TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (owner_id, name)
);

-- Repository statistics (materialized for performance)
CREATE TABLE repository_stats (
    repo_id UUID PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
    commit_count BIGINT NOT NULL DEFAULT 0,
    chunk_count BIGINT NOT NULL DEFAULT 0,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    logical_bytes BIGINT NOT NULL DEFAULT 0,
    dedup_ratio FLOAT NOT NULL DEFAULT 1.0,
    contributor_count INT NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Repository members
CREATE TABLE repository_members (
    repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,  -- 'admin', 'editor', 'viewer'
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repo_id, user_id)
);

-- Indexes
CREATE INDEX idx_repos_owner ON repositories(owner_id);
CREATE INDEX idx_repos_name ON repositories(name);
CREATE INDEX idx_repo_members_user ON repository_members(user_id);
```

---

## Operations

### Create Repository

```rust
pub async fn create_repository(
    owner: Owner,
    name: &str,
    settings: RepoSettings,
    db: &Pool,
    storage: &StorageProvider,
) -> Result<Repository> {
    // Validate name
    validate_repo_name(name)?;

    // Check for duplicates
    if repo_exists(&owner, name, db).await? {
        return Err(Error::RepoAlreadyExists);
    }

    // Create storage bucket
    let bucket = format!("dits-{}-{}", owner.id(), slugify(name));
    storage.create_bucket(&bucket).await?;

    // Create repository record
    let repo = Repository {
        id: Uuid::new_v4(),
        name: name.to_string(),
        owner,
        visibility: Visibility::Private,
        default_branch: "main".to_string(),
        settings,
        storage: StorageConfig {
            bucket,
            region: storage.default_region(),
            ..Default::default()
        },
        created_at: Utc::now(),
        updated_at: Utc::now(),
        ..Default::default()
    };

    // Insert into database
    sqlx::query!(
        r#"
        INSERT INTO repositories (id, name, owner_type, owner_id, visibility, settings, storage_bucket, storage_region)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        repo.id,
        repo.name,
        repo.owner.type_str(),
        repo.owner.id(),
        repo.visibility.as_str(),
        serde_json::to_value(&repo.settings)?,
        repo.storage.bucket,
        repo.storage.region,
    )
    .execute(db)
    .await?;

    // Initialize stats
    sqlx::query!(
        "INSERT INTO repository_stats (repo_id) VALUES ($1)",
        repo.id
    )
    .execute(db)
    .await?;

    Ok(repo)
}
```

### Clone Repository

```rust
pub async fn clone_repository(
    url: &str,
    local_path: &Path,
    options: CloneOptions,
    progress: impl Fn(CloneProgress),
) -> Result<LocalRepository> {
    // Parse URL
    let remote = Remote::parse(url)?;

    // Create local directory
    fs::create_dir_all(local_path)?;
    fs::create_dir_all(local_path.join(".dits"))?;

    // Fetch repository info
    let repo_info = remote.fetch_repo_info().await?;
    progress(CloneProgress::FetchingMetadata);

    // Fetch refs
    let refs = remote.fetch_refs().await?;
    progress(CloneProgress::FetchingRefs);

    // Determine what to fetch
    let commits_to_fetch = match &options.depth {
        Some(n) => refs.head_commits(*n),
        None => refs.all_commits(),
    };

    // Fetch commits and manifests
    for (i, commit) in commits_to_fetch.iter().enumerate() {
        let manifest = remote.fetch_manifest(commit).await?;
        save_manifest(local_path, &manifest)?;
        progress(CloneProgress::FetchingManifest { current: i, total: commits_to_fetch.len() });
    }

    // Optionally fetch chunks (or defer to VFS hydration)
    if !options.filter.is_blob_none() {
        let head_manifest = get_head_manifest(local_path)?;
        let chunk_hashes: Vec<_> = head_manifest.all_chunk_hashes().collect();

        for (i, chunk) in chunk_hashes.iter().enumerate() {
            let data = remote.fetch_chunk(chunk).await?;
            save_chunk(local_path, chunk, &data)?;
            progress(CloneProgress::FetchingChunks {
                current: i,
                total: chunk_hashes.len(),
                bytes: data.len(),
            });
        }
    }

    // Set up refs
    save_refs(local_path, &refs)?;

    // Write config
    let config = LocalConfig {
        remote_url: url.to_string(),
        ..Default::default()
    };
    save_config(local_path, &config)?;

    // Checkout HEAD
    if !options.no_checkout {
        checkout_head(local_path, progress)?;
    }

    Ok(LocalRepository::open(local_path)?)
}
```

---

## Notes

- Repository ID is immutable and used for all server-side references
- Name can be changed (with URL redirect handling)
- Owner transfer is supported with proper permission checks
- Statistics are eventually consistent (updated async)
- Storage bucket naming follows cloud provider conventions
- Local `.dits/` structure mirrors git's `.git/` for familiarity
