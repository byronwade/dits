# Index Format Specification

The index (staging area) tracks files staged for the next commit and manages working tree state.

---

## Overview

The index serves multiple purposes:
1. **Staging area**: Files added with `dits add` awaiting commit
2. **Working tree cache**: Fast status checks without filesystem scans
3. **Merge state**: Tracking conflicts during merges
4. **Lock tracking**: Local record of held file locks

---

## File Location

```
.dits/index                 # Primary index
.dits/index.lock            # Lock file during updates
.dits/MERGE_HEAD            # Present during merge
.dits/MERGE_MSG             # Merge commit message
```

---

## Binary Format

### Header

```
Offset  Size  Description
------  ----  -----------
0x00    4     Magic number: 0x44494458 ("DIDX")
0x04    4     Version (currently 4)
0x08    4     Number of entries
0x0C    4     Number of extensions
0x10    8     Timestamp of last update (Unix micros)
0x18    32    HEAD commit hash (what working tree is based on)
0x38    4     Flags
0x3C    4     Header checksum (CRC32)
0x40    -     Entries (variable)
-       -     Extensions (variable)
-       32    Index content hash (BLAKE3)
```

### Flags

| Bit | Name | Description |
|-----|------|-------------|
| 0 | SPLIT_INDEX | Uses split index format |
| 1 | UNTRACKED_CACHE | Includes untracked file cache |
| 2 | FS_MONITOR | Includes filesystem monitor data |
| 3 | SPARSE_CHECKOUT | Sparse checkout active |
| 4-31 | Reserved | Future use |

---

## Entry Format

### Entry Structure

```
Offset  Size  Description
------  ----  -----------
0x00    8     ctime (creation time, nanoseconds)
0x08    8     mtime (modification time, nanoseconds)
0x10    4     device
0x14    4     inode
0x18    4     mode (permissions + file type)
0x1C    4     uid
0x20    4     gid
0x24    8     file size
0x2C    32    content hash (BLAKE3)
0x4C    2     flags
0x4E    2     extended flags (if flag bit 14 set)
0x50    2     path length
0x52    -     path (variable, NUL-padded to 8-byte boundary)
-       -     Chunk index (if staged)
```

### Entry Flags

| Bit | Name | Description |
|-----|------|-------------|
| 0-11 | name_length | Path length (if < 4096) |
| 12 | VALID | Entry is up-to-date with filesystem |
| 13 | EXTENDED | Has extended flags |
| 14 | SKIP_WORKTREE | Sparse checkout: don't populate |
| 15 | INTENT_TO_ADD | Placeholder for intended add |

### Extended Flags

| Bit | Name | Description |
|-----|------|-------------|
| 0-1 | STAGE | Merge stage (0=normal, 1-3=conflict) |
| 2 | ASSUME_UNCHANGED | Trust cache, don't stat |
| 3 | FSMONITOR_VALID | Filesystem monitor confirms unchanged |
| 4 | LOCKED | File is locked by user |
| 5 | LOCK_PENDING | Lock requested, not confirmed |
| 6 | CHUNKED | Chunk index follows entry |
| 7 | MODIFIED | Known modified since HEAD |

---

## Chunk Index

For staged files, chunk information follows the entry:

```
Offset  Size  Description
------  ----  -----------
0x00    4     Number of chunks
0x04    1     Chunking algorithm (0x01=FastCDC)
0x05    3     Reserved
0x08    -     Chunk entries (40 bytes each)
```

### Chunk Entry

```
Offset  Size  Description
------  ----  -----------
0x00    32    Chunk hash
0x20    4     Offset within file
0x24    4     Chunk size
```

---

## Extensions

Extensions provide additional index features:

### Extension Header

```
Offset  Size  Description
------  ----  -----------
0x00    4     Extension signature (4 chars)
0x04    4     Extension size
0x08    -     Extension data
```

### TREE Extension

Caches tree object structure for fast tree computation:

```
Signature: "TREE"

Data:
  path_component (NUL-terminated)
  entry_count (ASCII decimal)
  subtree_count (ASCII decimal)
  object_hash (20 or 32 bytes)
  [recursive subtrees...]
```

### REUC Extension (Resolve Undo)

Stores original index entries for conflict resolution undo:

```
Signature: "REUC"

Data:
  For each entry:
    path (NUL-terminated)
    mode_stage1 (ASCII octal, NUL)
    mode_stage2 (ASCII octal, NUL)
    mode_stage3 (ASCII octal, NUL)
    hash_stage1 (if mode != 0)
    hash_stage2 (if mode != 0)
    hash_stage3 (if mode != 0)
```

### UNTR Extension (Untracked Cache)

Caches untracked file information:

```
Signature: "UNTR"

Data:
  ident_string (identifies filesystem state)
  flags
  dir_count
  For each directory:
    dir_path (NUL-terminated)
    stat_data
    dir_flags
    untracked_count
    untracked_names[]
```

### FSMN Extension (Filesystem Monitor)

Integrates with filesystem monitor:

```
Signature: "FSMN"

Data:
  version (4 bytes)
  last_update (8 bytes, Unix time)
  token_length (4 bytes)
  token (variable)
```

### LOCK Extension (Dits-specific)

Tracks file locks:

```
Signature: "LOCK"

Data:
  For each lock:
    path (NUL-terminated)
    lock_id (16 bytes, UUID)
    owner_id (16 bytes, UUID)
    locked_at (8 bytes, Unix micros)
    expires_at (8 bytes, Unix micros)
    lock_type (1 byte)
```

### SPRX Extension (Dits-specific: Sparse Proxy)

For proxy-based checkout:

```
Signature: "SPRX"

Data:
  For each proxied file:
    path (NUL-terminated)
    full_size (8 bytes)
    proxy_path (NUL-terminated)
    proxy_hash (32 bytes)
```

---

## Rust Structures

```rust
/// Complete index
#[derive(Debug)]
pub struct Index {
    /// Index version
    pub version: u32,

    /// Entries sorted by path
    pub entries: Vec<IndexEntry>,

    /// Tree cache
    pub tree_cache: Option<TreeCache>,

    /// Resolve undo information
    pub resolve_undo: Vec<ResolveUndoEntry>,

    /// Untracked cache
    pub untracked_cache: Option<UntrackedCache>,

    /// Lock information
    pub locks: Vec<LockEntry>,

    /// Sparse proxy mappings
    pub sparse_proxies: Vec<SparseProxy>,

    /// HEAD commit this index is based on
    pub head_commit: [u8; 32],

    /// Last modification time
    pub timestamp: i64,
}

/// Single index entry
#[derive(Debug, Clone)]
pub struct IndexEntry {
    /// File path (relative to repo root)
    pub path: String,

    /// Filesystem stat cache
    pub stat: StatCache,

    /// Content hash
    pub hash: [u8; 32],

    /// Entry mode (permissions + type)
    pub mode: u32,

    /// Entry flags
    pub flags: IndexFlags,

    /// Merge stage (0 = normal)
    pub stage: u8,

    /// Chunk information (if staged)
    pub chunks: Option<Vec<ChunkInfo>>,
}

/// Cached stat information
#[derive(Debug, Clone)]
pub struct StatCache {
    pub ctime_sec: u32,
    pub ctime_nsec: u32,
    pub mtime_sec: u32,
    pub mtime_nsec: u32,
    pub dev: u32,
    pub ino: u32,
    pub uid: u32,
    pub gid: u32,
    pub size: u64,
}

/// Entry flags
#[derive(Debug, Clone)]
pub struct IndexFlags {
    pub valid: bool,
    pub skip_worktree: bool,
    pub intent_to_add: bool,
    pub assume_unchanged: bool,
    pub fsmonitor_valid: bool,
    pub locked: bool,
    pub lock_pending: bool,
    pub modified: bool,
}

/// Chunk information for staged file
#[derive(Debug, Clone)]
pub struct ChunkInfo {
    pub hash: [u8; 32],
    pub offset: u64,
    pub size: u32,
}

/// Lock tracking entry
#[derive(Debug, Clone)]
pub struct LockEntry {
    pub path: String,
    pub lock_id: Uuid,
    pub owner_id: Uuid,
    pub locked_at: i64,
    pub expires_at: i64,
    pub lock_type: LockType,
}

/// Sparse proxy entry
#[derive(Debug, Clone)]
pub struct SparseProxy {
    pub path: String,
    pub full_size: u64,
    pub proxy_path: String,
    pub proxy_hash: [u8; 32],
}
```

---

## Operations

### Reading Index

```rust
impl Index {
    pub fn read(path: &Path) -> Result<Self> {
        let data = fs::read(path)?;

        // Validate header
        if &data[0..4] != b"DIDX" {
            return Err(Error::InvalidIndex("Bad magic"));
        }

        let version = u32::from_be_bytes(data[4..8].try_into()?);
        if version > 4 {
            return Err(Error::InvalidIndex("Unsupported version"));
        }

        let entry_count = u32::from_be_bytes(data[8..12].try_into()?) as usize;
        let ext_count = u32::from_be_bytes(data[12..16].try_into()?) as usize;
        let timestamp = i64::from_be_bytes(data[16..24].try_into()?);
        let head_commit: [u8; 32] = data[24..56].try_into()?;

        // Verify checksum
        let stored_checksum = u32::from_be_bytes(data[60..64].try_into()?);
        let calculated = crc32(&data[0..60]);
        if stored_checksum != calculated {
            return Err(Error::InvalidIndex("Checksum mismatch"));
        }

        // Parse entries
        let mut offset = 64;
        let mut entries = Vec::with_capacity(entry_count);

        for _ in 0..entry_count {
            let (entry, size) = parse_entry(&data[offset..])?;
            entries.push(entry);
            offset += size;
        }

        // Parse extensions
        let mut tree_cache = None;
        let mut resolve_undo = Vec::new();
        let mut untracked_cache = None;
        let mut locks = Vec::new();
        let mut sparse_proxies = Vec::new();

        for _ in 0..ext_count {
            let sig = &data[offset..offset + 4];
            let size = u32::from_be_bytes(data[offset + 4..offset + 8].try_into()?) as usize;
            let ext_data = &data[offset + 8..offset + 8 + size];

            match sig {
                b"TREE" => tree_cache = Some(parse_tree_cache(ext_data)?),
                b"REUC" => resolve_undo = parse_resolve_undo(ext_data)?,
                b"UNTR" => untracked_cache = Some(parse_untracked_cache(ext_data)?),
                b"LOCK" => locks = parse_locks(ext_data)?,
                b"SPRX" => sparse_proxies = parse_sparse_proxies(ext_data)?,
                _ => { /* Unknown extension, skip */ }
            }

            offset += 8 + size;
        }

        // Verify final hash
        let stored_hash: [u8; 32] = data[data.len() - 32..].try_into()?;
        let calculated_hash = blake3::hash(&data[..data.len() - 32]);
        if stored_hash != calculated_hash.as_bytes() {
            return Err(Error::InvalidIndex("Content hash mismatch"));
        }

        Ok(Index {
            version,
            entries,
            tree_cache,
            resolve_undo,
            untracked_cache,
            locks,
            sparse_proxies,
            head_commit,
            timestamp,
        })
    }
}
```

### Writing Index

```rust
impl Index {
    pub fn write(&self, path: &Path) -> Result<()> {
        let lock_path = path.with_extension("lock");

        // Acquire lock
        let lock_file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&lock_path)?;

        let result = self.write_locked(&lock_file);

        if result.is_ok() {
            fs::rename(&lock_path, path)?;
        } else {
            fs::remove_file(&lock_path)?;
        }

        result
    }

    fn write_locked(&self, file: &File) -> Result<()> {
        let mut data = Vec::new();

        // Header
        data.extend_from_slice(b"DIDX");
        data.extend_from_slice(&self.version.to_be_bytes());
        data.extend_from_slice(&(self.entries.len() as u32).to_be_bytes());
        data.extend_from_slice(&self.extension_count().to_be_bytes());
        data.extend_from_slice(&self.timestamp.to_be_bytes());
        data.extend_from_slice(&self.head_commit);
        data.extend_from_slice(&0u32.to_be_bytes());  // Flags
        data.extend_from_slice(&0u32.to_be_bytes());  // Checksum placeholder

        // Calculate and insert checksum
        let checksum = crc32(&data[0..60]);
        data[60..64].copy_from_slice(&checksum.to_be_bytes());

        // Entries
        for entry in &self.entries {
            write_entry(&mut data, entry)?;
        }

        // Extensions
        if let Some(ref tree) = self.tree_cache {
            write_extension(&mut data, b"TREE", &encode_tree_cache(tree)?)?;
        }
        if !self.resolve_undo.is_empty() {
            write_extension(&mut data, b"REUC", &encode_resolve_undo(&self.resolve_undo)?)?;
        }
        if let Some(ref untracked) = self.untracked_cache {
            write_extension(&mut data, b"UNTR", &encode_untracked_cache(untracked)?)?;
        }
        if !self.locks.is_empty() {
            write_extension(&mut data, b"LOCK", &encode_locks(&self.locks)?)?;
        }
        if !self.sparse_proxies.is_empty() {
            write_extension(&mut data, b"SPRX", &encode_sparse_proxies(&self.sparse_proxies)?)?;
        }

        // Final hash
        let hash = blake3::hash(&data);
        data.extend_from_slice(hash.as_bytes());

        file.write_all(&data)?;
        Ok(())
    }
}
```

### Adding Files

```rust
impl Index {
    /// Stage a file for commit
    pub fn add(&mut self, path: &str, repo: &Repository) -> Result<()> {
        let full_path = repo.working_dir().join(path);

        // Stat the file
        let metadata = fs::metadata(&full_path)?;

        // Hash and chunk the file
        let (hash, chunks) = chunk_and_hash(&full_path, &repo.chunker_config)?;

        // Create or update entry
        let entry = IndexEntry {
            path: path.to_string(),
            stat: StatCache::from_metadata(&metadata),
            hash,
            mode: metadata.permissions().mode(),
            flags: IndexFlags::default(),
            stage: 0,
            chunks: Some(chunks),
        };

        // Insert sorted by path
        match self.entries.binary_search_by(|e| e.path.cmp(path)) {
            Ok(pos) => self.entries[pos] = entry,
            Err(pos) => self.entries.insert(pos, entry),
        }

        // Invalidate tree cache
        self.tree_cache = None;

        Ok(())
    }

    /// Remove file from staging
    pub fn remove(&mut self, path: &str) -> Result<()> {
        if let Ok(pos) = self.entries.binary_search_by(|e| e.path.cmp(path)) {
            self.entries.remove(pos);
            self.tree_cache = None;
        }
        Ok(())
    }

    /// Check if file is modified since index
    pub fn is_modified(&self, path: &str) -> Result<bool> {
        let entry = match self.entries.binary_search_by(|e| e.path.cmp(path)) {
            Ok(pos) => &self.entries[pos],
            Err(_) => return Ok(true),  // Not in index = new file
        };

        // Check stat cache first (fast path)
        if entry.flags.valid && entry.flags.assume_unchanged {
            return Ok(false);
        }

        let full_path = self.repo_path.join(path);
        let metadata = fs::metadata(&full_path)?;

        if !entry.stat.matches(&metadata) {
            return Ok(true);
        }

        // Stat matches, but might be false positive
        // Full content check if paranoid mode enabled
        if self.paranoid {
            let hash = hash_file(&full_path)?;
            return Ok(hash != entry.hash);
        }

        Ok(false)
    }
}
```

### Status Computation

```rust
impl Index {
    /// Compute working tree status
    pub fn status(&self, repo: &Repository) -> Result<Status> {
        let mut staged = Vec::new();
        let mut modified = Vec::new();
        let mut deleted = Vec::new();
        let mut untracked = Vec::new();
        let mut conflicts = Vec::new();

        // Check index entries against HEAD and working tree
        let head_manifest = repo.get_head_manifest()?;

        for entry in &self.entries {
            // Check for conflicts
            if entry.stage > 0 {
                conflicts.push(entry.path.clone());
                continue;
            }

            // Check against HEAD
            let in_head = head_manifest.get(&entry.path);
            let staged_change = match in_head {
                Some(head_entry) if head_entry.content_hash != entry.hash => {
                    Some(if entry.chunks.is_some() {
                        ChangeType::Modified
                    } else {
                        ChangeType::Deleted
                    })
                }
                None if entry.chunks.is_some() => Some(ChangeType::Added),
                _ => None,
            };

            if let Some(change) = staged_change {
                staged.push((entry.path.clone(), change));
            }

            // Check working tree against index
            let full_path = repo.working_dir().join(&entry.path);
            if !full_path.exists() {
                deleted.push(entry.path.clone());
            } else if self.is_modified(&entry.path)? {
                modified.push(entry.path.clone());
            }
        }

        // Find untracked files
        let tracked: HashSet<_> = self.entries.iter().map(|e| &e.path).collect();
        for entry in WalkDir::new(repo.working_dir()) {
            let entry = entry?;
            if entry.file_type().is_file() {
                let path = entry.path()
                    .strip_prefix(repo.working_dir())?
                    .to_string_lossy()
                    .to_string();

                if !tracked.contains(&path) && !repo.is_ignored(&path)? {
                    untracked.push(path);
                }
            }
        }

        Ok(Status {
            staged,
            modified,
            deleted,
            untracked,
            conflicts,
        })
    }
}
```

---

## Merge Conflict Handling

During merge, conflicting entries are stored with different stages:

| Stage | Meaning |
|-------|---------|
| 0 | Normal (no conflict) |
| 1 | Common ancestor |
| 2 | Ours (current branch) |
| 3 | Theirs (merging branch) |

```rust
impl Index {
    /// Record merge conflict
    pub fn record_conflict(
        &mut self,
        path: &str,
        ancestor: Option<IndexEntry>,
        ours: Option<IndexEntry>,
        theirs: Option<IndexEntry>,
    ) {
        // Remove any existing entries for this path
        self.entries.retain(|e| e.path != path);

        // Add conflict entries
        if let Some(mut entry) = ancestor {
            entry.stage = 1;
            self.entries.push(entry);
        }
        if let Some(mut entry) = ours {
            entry.stage = 2;
            self.entries.push(entry);
        }
        if let Some(mut entry) = theirs {
            entry.stage = 3;
            self.entries.push(entry);
        }

        // Sort entries
        self.entries.sort_by(|a, b| {
            a.path.cmp(&b.path).then(a.stage.cmp(&b.stage))
        });

        // Store for undo
        self.resolve_undo.push(ResolveUndoEntry {
            path: path.to_string(),
            entries: vec![ancestor, ours, theirs],
        });
    }

    /// Resolve conflict by choosing a version
    pub fn resolve_conflict(&mut self, path: &str, resolution: Resolution) {
        let chosen = match resolution {
            Resolution::Ours => self.get_stage(path, 2),
            Resolution::Theirs => self.get_stage(path, 3),
            Resolution::Manual(entry) => Some(entry),
        };

        // Remove all stages
        self.entries.retain(|e| e.path != path);

        // Add resolved entry
        if let Some(mut entry) = chosen {
            entry.stage = 0;
            let pos = self.entries.binary_search_by(|e| e.path.cmp(path))
                .unwrap_or_else(|p| p);
            self.entries.insert(pos, entry);
        }
    }

    /// Get all conflicted paths
    pub fn conflicts(&self) -> Vec<String> {
        self.entries
            .iter()
            .filter(|e| e.stage > 0)
            .map(|e| e.path.clone())
            .collect::<HashSet<_>>()
            .into_iter()
            .collect()
    }
}
```

---

## Filesystem Monitor Integration

```rust
impl Index {
    /// Update from filesystem monitor events
    pub fn apply_fsmonitor_events(&mut self, events: &[FsEvent]) {
        for event in events {
            match event {
                FsEvent::Modified(path) => {
                    if let Ok(pos) = self.entries.binary_search_by(|e| e.path.cmp(path)) {
                        self.entries[pos].flags.valid = false;
                        self.entries[pos].flags.fsmonitor_valid = false;
                    }
                }
                FsEvent::Created(path) => {
                    // Mark as potentially untracked
                }
                FsEvent::Deleted(path) => {
                    if let Ok(pos) = self.entries.binary_search_by(|e| e.path.cmp(path)) {
                        self.entries[pos].flags.valid = false;
                    }
                }
            }
        }
    }

    /// Refresh entries marked invalid
    pub fn refresh(&mut self, repo: &Repository) -> Result<()> {
        for entry in &mut self.entries {
            if !entry.flags.valid {
                let full_path = repo.working_dir().join(&entry.path);
                if let Ok(metadata) = fs::metadata(&full_path) {
                    entry.stat = StatCache::from_metadata(&metadata);
                    entry.flags.valid = true;
                    entry.flags.fsmonitor_valid = true;
                }
            }
        }
        Ok(())
    }
}
```

---

## Notes

- Index is Git-compatible for easier migration
- Extensions enable Dits-specific features (locks, proxies)
- Stat cache avoids rehashing unchanged files
- Tree cache speeds up commit creation
- FSMONITOR integration enables instant status on large repos
- Conflict stages preserve all versions for resolution
