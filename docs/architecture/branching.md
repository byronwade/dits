# Branching Model Architecture

**Project:** Dits (Data-Intensive Version Control System)
**Document:** Branching, Merging, and History Model
**Objective:** Define how Dits handles divergent work, parallel editing, and history navigation for large binary media files.

---

## Core Philosophy: Simplified Branching for Media

Git's branching model is optimized for text files with line-by-line merging. Video files are fundamentally different:
- **Atomic units:** A video frame, not a text line
- **No semantic merge:** Cannot "merge" two different color grades
- **Size matters:** Branch operations must not duplicate 100GB files
- **Collaboration patterns:** Usually sequential, not parallel editing

Dits uses a **fork-and-reconcile** model optimized for media workflows, not a full DAG like git.

---

## Branching Model Options

### Option A: Linear History (Simplified) - RECOMMENDED FOR V1

```
main: ───●───●───●───●───●───●
              │         │
              │         └── Tag: "v1.0-delivery"
              │
              └── Tag: "client-review-2024-01"
```

**Characteristics:**
- Single branch (`main`) with tagged checkpoints
- No divergent branches
- Conflicts prevented by locking (Phase 5)
- History is a simple linked list

**Pros:**
- Simplest mental model for video editors
- No merge conflicts possible
- Storage-efficient (no branch duplication)
- Fast checkout (single path to traverse)

**Cons:**
- No parallel work on same file
- Must rely on locking for coordination
- No "experimental" branches

**Implementation:**
```rust
pub struct Commit {
    pub id: CommitHash,
    pub parent_id: Option<CommitHash>,  // Single parent only
    pub author: Author,
    pub message: String,
    pub timestamp: DateTime<Utc>,
    pub assets: HashMap<AssetPath, AssetHash>,
    pub tags: Vec<Tag>,
}

pub struct Tag {
    pub name: String,
    pub commit_id: CommitHash,
    pub created_at: DateTime<Utc>,
    pub created_by: UserId,
    pub description: Option<String>,
}
```

---

### Option B: Named Branches (Git-like)

```
main:      ───●───●───●───●───●───●───●
                  │               │
feature/vfx:      └───●───●───●───┘ (merge)
                          │
                          └── (conflict if both modify same asset)
```

**Characteristics:**
- Multiple named branches
- Explicit merge points
- Conflict detection on merge

**Pros:**
- Familiar to git users
- Enables parallel workstreams
- Experimental work isolation

**Cons:**
- Binary merge conflicts are unsolvable automatically
- Branch divergence can waste storage if not managed
- More complex mental model

**Implementation:**
```rust
pub struct Branch {
    pub name: String,
    pub head: CommitHash,
    pub created_from: CommitHash,
    pub created_at: DateTime<Utc>,
    pub created_by: UserId,
    pub protected: bool,
    pub merge_strategy: MergeStrategy,
}

pub enum MergeStrategy {
    FastForwardOnly,     // Only if no divergence
    CreateMergeCommit,   // Always create merge commit
    Rebase,              // Replay commits (risky for binaries)
    RequireManual,       // Force manual resolution
}
```

---

### Option C: Fork Model (Recommended for V2+)

```
main (canonical):     ───●───●───●───●───●
                              │       ↑
                              │       │ (Pull Request)
alice/experiment:             └───●───●
                                  │
                                  └── alice's private workspace

bob/color-grade:      ───●───●───● (independent fork)
```

**Characteristics:**
- Each user has implicit private workspace
- Changes proposed via "Pull Request" equivalent
- Main branch is protected, requires approval
- Forks share underlying chunks (dedup)

**Pros:**
- Clear ownership model
- Safe experimentation
- Natural approval workflow
- Storage-efficient via dedup

**Cons:**
- More complex than linear
- Need PR/review infrastructure

**Implementation:**
```rust
pub struct Fork {
    pub id: Uuid,
    pub name: String,                    // "alice/color-experiment"
    pub owner: UserId,
    pub source_repo: RepoId,
    pub source_commit: CommitHash,       // Fork point
    pub head: CommitHash,                // Current state
    pub visibility: ForkVisibility,
    pub created_at: DateTime<Utc>,
}

pub enum ForkVisibility {
    Private,      // Only owner sees
    Team,         // Team members see
    Public,       // Everyone with repo access sees
}

pub struct PullRequest {
    pub id: Uuid,
    pub fork_id: Uuid,
    pub target_branch: String,           // Usually "main"
    pub source_commits: Vec<CommitHash>, // Commits to merge
    pub title: String,
    pub description: String,
    pub author: UserId,
    pub reviewers: Vec<UserId>,
    pub status: PrStatus,
    pub created_at: DateTime<Utc>,
    pub merged_at: Option<DateTime<Utc>>,
    pub merged_by: Option<UserId>,
}

pub enum PrStatus {
    Draft,
    Open,
    Approved,
    ChangesRequested,
    Merged,
    Closed,
}
```

---

## Recommended Phased Approach

| Phase | Model | Rationale |
| :--- | :--- | :--- |
| V1.0 | Linear + Tags | Ship fast, validate core value |
| V1.5 | Add Protected Branches | Enable `main` protection |
| V2.0 | Fork Model | Full collaboration workflow |
| V3.0 | Named Branches (Optional) | Only if user demand |

---

## Conflict Handling for Binary Files

### The Problem

Unlike text, binary files cannot be auto-merged:
```
# Text (mergeable)
<<<<<<< HEAD
Hello World
=======
Hello Universe
>>>>>>> feature

# Video (NOT mergeable)
<<<<<<< HEAD
[100GB of video bytes]
=======
[100GB of different video bytes]
>>>>>>> feature
# What does "merge" even mean here?
```

### Solution: Asset-Level Conflict Detection

```rust
pub struct MergeResult {
    pub status: MergeStatus,
    pub merged_commit: Option<CommitHash>,
    pub conflicts: Vec<AssetConflict>,
}

pub enum MergeStatus {
    FastForward,        // No divergence, just move pointer
    Clean,              // All assets compatible
    Conflicts,          // Some assets modified in both
}

pub struct AssetConflict {
    pub path: AssetPath,
    pub base_version: AssetHash,      // Common ancestor
    pub ours_version: AssetHash,      // Our change
    pub theirs_version: AssetHash,    // Their change
    pub conflict_type: ConflictType,
    pub resolution: Option<ConflictResolution>,
}

pub enum ConflictType {
    BothModified,       // Same file changed differently
    ModifyDelete,       // One modified, one deleted
    AddAdd,             // Both added same path with different content
    RenameRename,       // Both renamed differently
}

pub enum ConflictResolution {
    KeepOurs,
    KeepTheirs,
    KeepBoth { ours_path: AssetPath, theirs_path: AssetPath },
    Manual { chosen_version: AssetHash },
}
```

### Conflict Resolution Workflow

```
1. User attempts merge
2. Dits detects asset-level conflicts
3. For each conflict:
   a. Show side-by-side comparison (video player / image viewer)
   b. Show metadata diff (duration, codec, resolution)
   c. User chooses: Keep Mine | Keep Theirs | Keep Both (rename)
4. Generate merge commit with resolutions
```

**CLI Example:**
```bash
$ dits merge feature/vfx

Conflict detected in 2 assets:

1. scenes/explosion.mov
   Base:   v1.2 (2024-01-01, 00:30:00, 4K ProRes)
   Ours:   v1.3 (2024-01-15, 00:30:00, 4K ProRes) - color graded
   Theirs: v1.4 (2024-01-10, 00:32:00, 4K ProRes) - extended 2 sec

   Resolution options:
   [o] Keep ours (color graded version)
   [t] Keep theirs (extended version)
   [b] Keep both (save theirs as explosion_vfx.mov)
   [v] View side-by-side
   [d] Show detailed diff

   Choose [o/t/b/v/d]: b

2. exports/final_master.mov
   ...

All conflicts resolved. Creating merge commit...
Merge complete: abc123
```

### Visual Diff Tool (Phase 5 Integration)

```rust
pub struct VisualDiff {
    pub left: AssetVersion,
    pub right: AssetVersion,
    pub diff_type: VisualDiffType,
}

pub enum VisualDiffType {
    SideBySide,         // Two players, synced playback
    Overlay,            // Blend/difference overlay
    Wipe,               // Horizontal/vertical wipe
    Toggle,             // Quick switch between versions
}

pub struct AssetVersion {
    pub asset_hash: AssetHash,
    pub thumbnail_url: String,
    pub proxy_url: Option<String>,
    pub metadata: AssetMetadata,
}

// Launch diff viewer
pub fn open_visual_diff(
    left: &AssetVersion,
    right: &AssetVersion,
) -> Result<()> {
    // Generate temp URLs for proxy playback
    let left_url = generate_playback_url(left)?;
    let right_url = generate_playback_url(right)?;

    // Launch diff tool (mpv with side-by-side, or custom Tauri app)
    Command::new("dits-diff")
        .arg("--left").arg(left_url)
        .arg("--right").arg(right_url)
        .spawn()?;

    Ok(())
}
```

---

## Branch Protection Rules

```rust
pub struct BranchProtection {
    pub branch_pattern: String,          // "main", "release/*"
    pub rules: Vec<ProtectionRule>,
}

pub enum ProtectionRule {
    // Push restrictions
    RequirePullRequest,
    RequireApprovals { count: u32 },
    RequireCodeOwnerApproval,
    DismissStaleApprovals,

    // Merge restrictions
    RequireLinearHistory,                // No merge commits
    RequireSignedCommits,
    RequireStatusChecks { checks: Vec<String> },

    // Direct push allowlist
    AllowForcePush { users: Vec<UserId> },
    AllowDeletion { users: Vec<UserId> },

    // Lock restrictions
    RequireLockForEdit,                  // Must lock before push
}
```

**Database Schema:**
```sql
CREATE TABLE branch_protections (
    id UUID PRIMARY KEY,
    repo_id UUID REFERENCES repositories(id),
    branch_pattern TEXT NOT NULL,
    rules JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE required_approvals (
    pr_id UUID REFERENCES pull_requests(id),
    user_id UUID REFERENCES users(id),
    status TEXT NOT NULL,  -- 'pending', 'approved', 'changes_requested'
    reviewed_at TIMESTAMP,
    comment TEXT,
    PRIMARY KEY (pr_id, user_id)
);
```

---

## History Navigation

### Time Travel (Checkout by Date/Tag)

```bash
# Checkout by tag
$ dits checkout --tag "client-review-2024-01"

# Checkout by date
$ dits checkout --date "2024-01-15"

# Checkout by commit
$ dits checkout abc123

# Show what changed
$ dits log --oneline -10
abc123 (HEAD, main) Final color grade
def456 Added VFX shots
789abc Client feedback round 2
...

# Show specific file history
$ dits log scenes/intro.mov
abc123 Color graded
def456 Added lens flare
789abc Initial import
```

### Restoring Previous Versions

```rust
pub enum RestoreMode {
    // Restore to working directory (doesn't change HEAD)
    WorkingCopy,

    // Create new commit reverting to old version
    RevertCommit,

    // Restore single file from history
    SingleFile { path: AssetPath },
}

pub async fn restore(
    commit: CommitHash,
    mode: RestoreMode,
    repo: &Repository,
) -> Result<RestoreResult> {
    match mode {
        RestoreMode::WorkingCopy => {
            // Hydrate old version to working directory
            let manifest = repo.get_manifest(commit).await?;
            for (path, asset_hash) in manifest.assets {
                repo.hydrate_asset(&path, &asset_hash).await?;
            }
            Ok(RestoreResult::WorkingCopyUpdated)
        }
        RestoreMode::RevertCommit => {
            // Create new commit with old state
            let old_manifest = repo.get_manifest(commit).await?;
            let revert_commit = Commit {
                parent_id: Some(repo.head()),
                message: format!("Revert to {}", commit.short()),
                assets: old_manifest.assets,
                ..Default::default()
            };
            repo.commit(revert_commit).await?;
            Ok(RestoreResult::RevertCommitCreated)
        }
        RestoreMode::SingleFile { path } => {
            // Restore just one file
            let old_manifest = repo.get_manifest(commit).await?;
            let asset_hash = old_manifest.assets.get(&path)
                .ok_or(Error::AssetNotFound)?;
            repo.hydrate_asset(&path, asset_hash).await?;
            Ok(RestoreResult::SingleFileRestored)
        }
    }
}
```

---

## Stash / Shelve (Work-in-Progress)

For when editors need to quickly switch contexts:

```rust
pub struct Stash {
    pub id: Uuid,
    pub name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub base_commit: CommitHash,
    pub staged_changes: Vec<StagedChange>,
    pub unstaged_changes: Vec<UnstagedChange>,
}

pub struct StagedChange {
    pub path: AssetPath,
    pub change_type: ChangeType,
    pub content_hash: AssetHash,
}

pub enum ChangeType {
    Added,
    Modified,
    Deleted,
    Renamed { from: AssetPath },
}
```

**CLI Usage:**
```bash
# Save current work
$ dits stash
Saved working directory to stash@0

# Save with name
$ dits stash push -m "WIP color grade"
Saved working directory to stash@0: WIP color grade

# List stashes
$ dits stash list
stash@0: WIP color grade (2 hours ago)
stash@1: Temp export (yesterday)

# Apply stash
$ dits stash pop
Applied stash@0 and dropped it

# Apply without dropping
$ dits stash apply stash@1
Applied stash@1

# Drop stash
$ dits stash drop stash@1
Dropped stash@1
```

---

## Storage Efficiency

### Branch Storage (Deduplication)

Branches don't duplicate data thanks to content-addressable storage:

```
main:     commit A ──► commit B ──► commit C
              │            │            │
              ▼            ▼            ▼
          [chunks]    [chunks]     [chunks]
              │            │            │
              └──────┬─────┴──────┬─────┘
                     │            │
                     ▼            ▼
              Shared chunk pool (deduplicated)

feature:  commit X ──► commit Y
              │            │
              ▼            ▼
          [chunks]    [new chunks only]
              │            │
              └────────────┤
                           ▼
                    Same shared pool
```

**Storage calculation:**
- Main branch: 100GB of unique chunks
- Feature branch modifies 1GB: Only 1GB additional storage
- Total: ~101GB, not 200GB

### Garbage Collection Impact

Branches create additional chunk references. GC must track:
```rust
pub struct ChunkReference {
    pub chunk_hash: ChunkHash,
    pub referenced_by: Vec<ReferenceSource>,
}

pub enum ReferenceSource {
    Commit { commit_hash: CommitHash },
    Stash { stash_id: Uuid },
    Tag { tag_name: String },
}

// Chunk is safe to delete when:
// - No commits reference it
// - No stashes reference it
// - No tags reference it (tags can keep old versions alive)
```

---

## Implementation Roadmap

### Phase 1: Tags Only (V1.0)
```rust
// Simple tag support
pub struct Tag {
    pub name: String,
    pub commit: CommitHash,
    pub message: Option<String>,
}

// Commands:
// dits tag <name>           - Create tag at HEAD
// dits tag <name> <commit>  - Create tag at commit
// dits tag -d <name>        - Delete tag
// dits tag -l               - List tags
// dits checkout <tag>       - Checkout tag
```

### Phase 2: Branch Protection (V1.5)
```rust
// Protected main branch
// dits protect main --require-pr
// dits protect main --require-approvals 2
```

### Phase 3: Fork Model (V2.0)
```rust
// Full fork + PR workflow
// dits fork create my-experiment
// dits fork switch my-experiment
// dits pr create --target main --title "Add VFX"
// dits pr merge 123
```

### Phase 4: Named Branches (V3.0 - Optional)
```rust
// Git-like branches if demanded
// dits branch create feature/vfx
// dits branch switch feature/vfx
// dits merge feature/vfx
```

---

## CLI Commands Summary

```bash
# Tags
dits tag <name> [commit]        # Create tag
dits tag -l                     # List tags
dits tag -d <name>              # Delete tag

# History
dits log                        # Show commit history
dits log <file>                 # Show file history
dits show <commit>              # Show commit details
dits diff <commit1> <commit2>   # Compare commits

# Checkout
dits checkout <commit|tag>      # Checkout version
dits checkout --date "2024-01"  # Checkout by date

# Restore
dits restore <commit>           # Restore full state
dits restore <commit> -- <file> # Restore single file
dits revert <commit>            # Create revert commit

# Stash
dits stash                      # Stash changes
dits stash pop                  # Apply and drop
dits stash list                 # List stashes

# Branches (V2+)
dits branch create <name>       # Create branch
dits branch switch <name>       # Switch branch
dits branch list                # List branches
dits branch delete <name>       # Delete branch

# Forks (V2+)
dits fork create <name>         # Create fork
dits fork list                  # List forks
dits pr create                  # Create pull request
dits pr list                    # List pull requests
dits pr merge <id>              # Merge pull request
```

---

## Database Schema

```sql
-- Tags
CREATE TABLE tags (
    name TEXT NOT NULL,
    repo_id UUID REFERENCES repositories(id),
    commit_hash TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    PRIMARY KEY (repo_id, name)
);

-- Branches
CREATE TABLE branches (
    name TEXT NOT NULL,
    repo_id UUID REFERENCES repositories(id),
    head_commit TEXT NOT NULL,
    created_from TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    is_default BOOLEAN DEFAULT FALSE,
    protected BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (repo_id, name)
);

-- Forks
CREATE TABLE forks (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES users(id),
    source_repo_id UUID REFERENCES repositories(id),
    fork_point_commit TEXT NOT NULL,
    head_commit TEXT NOT NULL,
    visibility TEXT DEFAULT 'private',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (source_repo_id, name)
);

-- Pull Requests
CREATE TABLE pull_requests (
    id UUID PRIMARY KEY,
    number SERIAL,
    repo_id UUID REFERENCES repositories(id),
    fork_id UUID REFERENCES forks(id),
    source_branch TEXT,
    target_branch TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    author_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    merged_at TIMESTAMP,
    merged_by UUID REFERENCES users(id),
    merge_commit TEXT
);

-- Stashes
CREATE TABLE stashes (
    id UUID PRIMARY KEY,
    repo_id UUID REFERENCES repositories(id),
    user_id UUID REFERENCES users(id),
    name TEXT,
    base_commit TEXT NOT NULL,
    changes JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    position INT NOT NULL  -- For ordering (stash@0, stash@1, etc.)
);

-- Indexes
CREATE INDEX idx_tags_repo ON tags(repo_id);
CREATE INDEX idx_branches_repo ON branches(repo_id);
CREATE INDEX idx_forks_source ON forks(source_repo_id);
CREATE INDEX idx_prs_repo ON pull_requests(repo_id, status);
CREATE INDEX idx_stashes_user ON stashes(repo_id, user_id, position);
```

---

## Key Decisions Summary

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| V1 Model | Linear + Tags | Simplest, matches video workflows |
| V2 Model | Fork + PR | Enables collaboration without complexity |
| Merge Strategy | Asset-level conflicts | Binary files can't auto-merge |
| Conflict Resolution | Visual diff + manual choice | Editors need to see, not read diffs |
| Storage | Shared chunk pool | Branches don't duplicate data |
| History | Immutable commits | Git-like integrity guarantees |
