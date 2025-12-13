# Phase 3.5: Git Parity (Core VCS Features)

> **Status: ✅ COMPLETE** - All Phase 3.5 Git parity features have been implemented.

**Project:** Dits (Data-Intensive Version Control System)
**Phase:** 3.5 — Git Parity (Core VCS Features)
**Objective:** Implement essential Git-like features for a complete local VCS experience before network sync.

---

## Alignment with README (core ground rules)
- Keep branch/ref semantics git-like (refs under `.dits/refs/*`, `HEAD` pointing to a ref).
- Preserve content addressing (BLAKE3) and chunking defaults; git-parity features must not mutate object identity.
- For binaries, prefer explicit conflict detection and reporting over silent merge attempts.
- Error and UX polish: clear messages, colorized status/diff output; help text with examples.
- Add binary-aware `dits diff` mode: report size/hash/metadata deltas when full text diff is not meaningful.
- Enforce fast-forward-by-default pushes; require explicit `--force` to mirror Git safety.

---

## Overview

After completing Phases 1-3 (chunking, MP4 awareness, VFS), Dits has basic version control but lacks several Git features essential for daily use. This phase bridges that gap.

---

## Current State (Phases 1-3 Complete)

| Command | Status | Notes |
|---------|--------|-------|
| `init` | ✅ | Repository initialization |
| `add` | ✅ | Stage files with CDC chunking |
| `status` | ✅ | Show staged/modified files |
| `commit` | ✅ | Create commits with manifests |
| `log` | ✅ | Show commit history |
| `checkout` | ✅ | Restore files from commits |
| `mount` | ✅ | FUSE virtual filesystem |

---

## Phase 3.5 Features

### 1. Branching System (Priority: Critical)

**Commands:**
```bash
dits branch                    # List branches
dits branch <name>             # Create branch
dits branch -d <name>          # Delete branch
dits switch <name>             # Switch to branch
dits merge <branch>            # Merge branch into current
```

**Implementation:**
- Store branches in `.dits/refs/heads/<name>` (file contains commit hash)
- Track current branch in `.dits/HEAD` (ref: refs/heads/main)
- Support detached HEAD state for commit checkouts
- Asset-level conflict detection on merge (no auto-merge for binaries)

**Data Structures:**
```rust
pub struct Branch {
    pub name: String,
    pub head: Hash,  // Commit hash
}

pub struct Head {
    pub kind: HeadKind,
}

pub enum HeadKind {
    Branch(String),      // "main"
    Detached(Hash),      // Direct commit hash
}
```

---

### 2. Diff Command (Priority: High)

**Commands:**
```bash
dits diff                      # Show unstaged changes
dits diff --staged             # Show staged changes
dits diff <commit>             # Diff working tree vs commit
dits diff <commit1> <commit2>  # Diff between commits
dits diff <file>               # Diff specific file
```

**Implementation:**
- For text files: line-by-line diff (unified format)
- For binary files: size diff, hash diff, metadata diff
- For MP4 files: show duration, codec, resolution changes
- Use `similar` crate for text diffing

**Output Format:**
```
diff --dits a/video.mp4 b/video.mp4
Binary files differ:
  - Size: 100MB -> 102MB (+2MB)
  - Duration: 00:30:00 -> 00:32:00 (+2s)
  - Codec: H.264 (unchanged)
```

---

### 3. .ditsignore Support (Priority: High)

**File Format:**
```gitignore
# Build artifacts
*.o
*.a
target/

# OS files
.DS_Store
Thumbs.db

# Temp files
*.tmp
*.swp

# Large generated files
renders/
exports/
```

**Implementation:**
- Parse `.ditsignore` files in repo root and subdirectories
- Support glob patterns (`*`, `**`, `?`, `[...]`)
- Support negation (`!important.mp4`)
- Use `globset` crate for pattern matching
- Check ignore patterns in `add` and `status` commands

---

### 4. Tags System (Priority: Medium)

**Commands:**
```bash
dits tag                       # List tags
dits tag <name>                # Create lightweight tag at HEAD
dits tag <name> <commit>       # Create tag at specific commit
dits tag -a <name> -m "msg"    # Create annotated tag
dits tag -d <name>             # Delete tag
dits checkout <tag>            # Checkout tag (detached HEAD)
```

**Implementation:**
- Store lightweight tags in `.dits/refs/tags/<name>`
- Store annotated tags as objects in `.dits/objects/tags/`
- Tags are immutable pointers to commits

**Data Structures:**
```rust
pub struct Tag {
    pub name: String,
    pub target: Hash,           // Commit hash
    pub tagger: Option<Author>, // None for lightweight
    pub message: Option<String>,
    pub created_at: DateTime<Utc>,
}
```

---

### 5. Reset/Restore Commands (Priority: Medium)

**Commands:**
```bash
dits reset <commit>            # Move HEAD to commit (keep changes staged)
dits reset --soft <commit>     # Move HEAD only
dits reset --hard <commit>     # Move HEAD and discard all changes
dits restore <file>            # Restore file from HEAD
dits restore --source <commit> <file>  # Restore from specific commit
dits revert <commit>           # Create commit that undoes changes
```

**Implementation:**
- `reset --soft`: Update HEAD ref only
- `reset --mixed` (default): Update HEAD + clear staging
- `reset --hard`: Update HEAD + clear staging + restore working tree
- `restore`: Copy file from commit to working tree
- `revert`: Create new commit with inverse changes

---

### 6. Config System (Priority: Low)

**Commands:**
```bash
dits config user.name "Byron Wade"
dits config user.email "byron@example.com"
dits config --list
dits config --get user.name
dits config --global user.name "Byron"
```

**Implementation:**
- Local config: `.dits/config` (TOML format)
- Global config: `~/.ditsconfig`
- Config precedence: local > global > default

**Config File Format:**
```toml
[user]
name = "Byron Wade"
email = "byron@example.com"

[core]
chunk_size = "256KB"
compression = true

[diff]
tool = "meld"
```

---

### 7. Stash (Priority: Low)

**Commands:**
```bash
dits stash                     # Stash current changes
dits stash push -m "message"   # Stash with message
dits stash list                # List stashes
dits stash pop                 # Apply and remove top stash
dits stash apply [stash@{n}]   # Apply without removing
dits stash drop [stash@{n}]    # Remove stash
```

**Implementation:**
- Store stashes in `.dits/refs/stash` (stack)
- Each stash is a commit-like object with staged + unstaged changes
- Store stash metadata in `.dits/stash/`

---

## Implementation Order

| Sprint | Feature | Complexity | Impact |
|--------|---------|------------|--------|
| 1 | .ditsignore | Low | High |
| 2 | Branching (create, list, switch) | Medium | Critical |
| 3 | Diff command | Medium | High |
| 4 | Tags | Low | Medium |
| 5 | Merge | High | Critical |
| 6 | Reset/Restore | Medium | Medium |
| 7 | Config | Low | Low |
| 8 | Stash | Medium | Low |

---

## File Structure After Phase 3.5

```
.dits/
├── HEAD                    # Current branch (ref: refs/heads/main)
├── config                  # Repository config (TOML)
├── index                   # Staging area
├── refs/
│   ├── heads/             # Branch refs
│   │   ├── main           # -> commit hash
│   │   └── feature/vfx    # -> commit hash
│   ├── tags/              # Tag refs
│   │   ├── v1.0           # -> commit hash
│   │   └── release-2024   # -> commit hash
│   └── stash              # Stash stack
├── objects/
│   ├── chunks/            # Content chunks
│   ├── manifests/         # File manifests
│   ├── commits/           # Commit objects
│   └── tags/              # Annotated tag objects
└── stash/                 # Stash metadata
```

---

## Verification Tests

1. **Branching**: Create branch, make commits, switch back, verify isolation
2. **Merge**: Create divergent branches, merge, verify conflict detection
3. **Diff**: Modify files, verify correct diff output for text and binary
4. **Ignore**: Add ignored files, verify they don't appear in status
5. **Tags**: Create tags, checkout by tag, verify immutability
6. **Reset**: Test all three modes, verify working tree state
7. **Config**: Set/get values, verify precedence

---

## CLI Help Text (After Implementation)

```
dits - Version control for video and large binary files

USAGE:
    dits <COMMAND>

COMMANDS:
    init        Initialize a new repository
    add         Add files to staging area
    status      Show repository status
    commit      Create a commit
    log         Show commit history
    checkout    Checkout a commit, branch, or tag

    branch      List, create, or delete branches
    switch      Switch to a branch
    merge       Merge a branch into current branch

    diff        Show changes between commits, working tree, etc.

    tag         Create, list, or delete tags

    reset       Reset HEAD to a specific state
    restore     Restore working tree files
    revert      Create a commit that undoes changes

    config      Get and set repository or global options

    stash       Stash changes in working directory

    mount       Mount repository as virtual filesystem
    unmount     Unmount virtual filesystem
```

---

## Dependencies to Add

```toml
# Cargo.toml additions
globset = "0.4"          # For .ditsignore patterns
similar = "2.4"          # For text diffing
toml = "0.8"             # For config files
dirs = "5.0"             # For finding home directory
```
