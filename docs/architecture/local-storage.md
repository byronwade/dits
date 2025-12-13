# Local Storage Format Specification

This document specifies the `.dits/` directory structure and file formats for the local Dits repository.

> **Phase 3.6 Update:** The storage format now supports hybrid storage with separate engines for text and binary files. See [Hybrid Storage](../action-plan/phase3.6-hybrid-storage.md) for the full specification.

## Directory Structure

```
project/
├── .dits/                      # Repository metadata (like .git/)
│   ├── HEAD                    # Current branch/commit reference
│   ├── config                  # Repository configuration
│   ├── description             # Repository description (optional)
│   │
│   ├── objects/                # Content-addressed object storage
│   │   ├── pack/               # Packed objects (optimization)
│   │   │   ├── pack-{hash}.pack
│   │   │   └── pack-{hash}.idx
│   │   ├── info/               # Object metadata
│   │   │   └── packs           # List of pack files
│   │   ├── git/                # Git object store for TEXT files (Phase 3.6)
│   │   │   ├── pack/           # Git pack files
│   │   │   └── {aa}/           # Loose git objects (SHA-1 addressed)
│   │   │       └── {remaining-hash}
│   │   └── {aa}/               # Loose objects by hash prefix (BINARY files)
│   │       └── {remaining-hash}
│   │
│   ├── refs/                   # References (branches, tags)
│   │   ├── heads/              # Local branches
│   │   │   └── main
│   │   ├── tags/               # Tags
│   │   │   └── v1.0.0
│   │   └── remotes/            # Remote tracking branches
│   │       └── origin/
│   │           └── main
│   │
│   ├── index                   # Staging area (binary)
│   ├── index.lock              # Lock file during updates
│   │
│   ├── logs/                   # Reference logs (reflog)
│   │   ├── HEAD
│   │   └── refs/
│   │       └── heads/
│   │           └── main
│   │
│   ├── hooks/                  # Client-side hooks
│   │   ├── pre-commit
│   │   ├── post-commit
│   │   ├── pre-push
│   │   └── post-checkout
│   │
│   ├── info/                   # Repository info
│   │   ├── exclude             # Local .ditsignore rules
│   │   └── attributes          # Path attributes
│   │
│   ├── lfs/                    # Large file storage
│   │   ├── objects/            # LFS object cache
│   │   │   └── {aa}/{bb}/
│   │   │       └── {hash}
│   │   └── tmp/                # Temporary upload storage
│   │
│   ├── cache/                  # Local chunk cache
│   │   ├── chunks/             # Cached remote chunks
│   │   │   └── {aa}/
│   │   │       └── {hash}
│   │   ├── manifests/          # Cached manifests
│   │   ├── index.db            # Cache index (SQLite)
│   │   └── stats.json          # Cache statistics
│   │
│   ├── staging/                # Write overlay (CoW)
│   │   └── {inode}/            # Staged modifications
│   │       ├── data            # Modified data
│   │       └── meta.json       # Modification metadata
│   │
│   ├── worktrees/              # Additional worktrees
│   │   └── {worktree-name}/
│   │       ├── HEAD
│   │       ├── index
│   │       └── gitdir          # Path to main .dits
│   │
│   ├── modules/                # Submodules (if any)
│   │   └── {submodule-name}/
│   │
│   └── tmp/                    # Temporary files
│       └── ...
│
├── .ditsignore                 # Ignore patterns
├── .ditsattributes             # Path-specific attributes
└── [project files]             # Working directory
```

## Hybrid Storage Architecture (Phase 3.6)

Dits uses a **hybrid storage model** that delegates to the appropriate engine based on file type:

### Storage Strategy Classification

```rust
pub enum StorageStrategy {
    /// Text files: Use libgit2 for storage, diff, merge, blame
    GitText,
    /// Binary/media files: Use Dits chunking
    DitsChunk,
    /// NLE projects: Git for metadata, Dits for payload
    Hybrid,
}
```

### File Type Routing

| Extension | Strategy | Reason |
|-----------|----------|--------|
| `.txt`, `.md`, `.json`, `.yaml`, `.xml` | GitText | Line-based operations |
| `.rs`, `.py`, `.js`, `.ts`, `.go`, `.java` | GitText | Code needs blame/merge |
| `.mp4`, `.mov`, `.mkv`, `.avi` | DitsChunk | Video chunking |
| `.psd`, `.blend`, `.fbx` | DitsChunk | Binary deduplication |
| `.prproj`, `.aep`, `.drp` | Hybrid | XML metadata + binary refs |

### Object Store Layout

```
.dits/objects/
├── git/                    # Git objects (text files)
│   ├── pack/              # Delta-compressed packs
│   │   ├── pack-abc123.pack
│   │   └── pack-abc123.idx
│   └── ab/                # Loose objects by SHA-1 prefix
│       └── cdef1234...
│
├── chunks/                 # Dits chunks (binary files)
│   └── ab/                # By BLAKE3 prefix
│       └── cdef1234...
│
├── manifests/              # Chunk manifests (binary files)
│   └── ab/
│       └── cdef1234...
│
├── commits/                # Commit objects
├── trees/                  # Tree objects
└── tags/                   # Tag objects
```

### Unified Index

The index tracks storage strategy per file:

```rust
pub struct IndexEntry {
    // Standard fields
    pub path: String,
    pub mode: u32,
    pub size: u64,

    // Hybrid storage fields (Phase 3.6)
    pub storage: StorageStrategy,

    // GitText storage
    pub git_oid: Option<git2::Oid>,      // SHA-1 object ID

    // DitsChunk storage
    pub blake3_hash: Option<[u8; 32]>,   // BLAKE3 content hash
    pub manifest_hash: Option<[u8; 32]>, // Manifest object hash
}
```

---

## Core Files

### HEAD

Points to the current branch or commit.

```
# Branch reference (symbolic)
ref: refs/heads/main

# Detached HEAD (direct commit hash)
a1b2c3d4e5f6789012345678901234567890abcd
```

Format: UTF-8 text, newline-terminated.

### config

Repository configuration in TOML format.

```toml
[core]
# Repository format version
repositoryformatversion = 1

# Object storage format
objectformat = "blake3"

# Default compression
compression = "zstd"
compression_level = 3

# Case sensitivity
ignorecase = false

# File mode tracking
filemode = true

# Symlink support
symlinks = true

[remote "origin"]
url = "https://dits.example.com/user/repo"
fetch = "+refs/heads/*:refs/remotes/origin/*"
push = "refs/heads/*:refs/heads/*"

[branch "main"]
remote = "origin"
merge = "refs/heads/main"

[user]
name = "Jane Developer"
email = "jane@example.com"
signingkey = "ssh-ed25519 AAAA..."

[lfs]
# LFS enabled
enabled = true
# Threshold for auto-LFS (bytes)
threshold = 104857600  # 100 MB

[cache]
# Local cache size limit (bytes)
maxsize = 10737418240  # 10 GB
# Cache TTL for remote chunks
ttl_hours = 168  # 7 days

[chunking]
# Chunking algorithm
algorithm = "fastcdc"
# Target chunk size
avg_size = 65536  # 64 KB
min_size = 16384  # 16 KB
max_size = 262144 # 256 KB

[video]
# Enable keyframe-aligned chunking for video
keyframe_align = true
# Parse and track NLE project files
track_projects = true
```

### description

Plain text file with repository description.

```
Video editing project for Product Launch 2024
```

## Object Storage

### Object Types

```rust
#[repr(u8)]
pub enum ObjectType {
    /// Raw content chunk
    Chunk = 0x01,

    /// File manifest (list of chunks)
    Manifest = 0x02,

    /// Directory tree
    Tree = 0x03,

    /// Commit object
    Commit = 0x04,

    /// Annotated tag
    Tag = 0x05,

    /// Asset metadata (video structure)
    Asset = 0x06,
}
```

### Loose Object Format

```
┌──────────────────────────────────────────────────────────────┐
│ Header                                                       │
│   Type (1 byte) | Uncompressed Size (varint) | NUL (1 byte) │
├──────────────────────────────────────────────────────────────┤
│ Compressed Content (zstd)                                    │
└──────────────────────────────────────────────────────────────┘
```

Example header: `chunk 12345\0` followed by zstd-compressed data.

Path: `.dits/objects/{hash[0:2]}/{hash[2:]}`

```rust
pub fn object_path(hash: &Hash) -> PathBuf {
    let hex = hash.to_hex();
    PathBuf::from(".dits/objects")
        .join(&hex[0..2])
        .join(&hex[2..])
}
```

### Chunk Object

Raw binary content, stored with header.

```
Header: "chunk {size}\0"
Content: [raw bytes, zstd compressed]
```

### Manifest Object

Describes a file as an ordered list of chunks.

```
Header: "manifest {size}\0"
Content (MessagePack):
{
    "version": 1,
    "file_size": 1073741824,
    "file_hash": "blake3:a1b2c3...",
    "chunks": [
        {
            "hash": "blake3:d4e5f6...",
            "offset": 0,
            "size": 65536,
            "compressed_size": 45000
        },
        {
            "hash": "blake3:g7h8i9...",
            "offset": 65536,
            "size": 65536,
            "compressed_size": 42000
        }
        // ...
    ],
    "attributes": {
        "mime_type": "video/mp4",
        "keyframe_aligned": true
    }
}
```

### Tree Object

Directory listing.

```
Header: "tree {size}\0"
Content (MessagePack):
{
    "version": 1,
    "entries": [
        {
            "mode": 33188,           // 0o100644 (regular file)
            "type": "manifest",
            "hash": "blake3:a1b2c3...",
            "name": "video.mp4",
            "size": 1073741824
        },
        {
            "mode": 16384,           // 0o040000 (directory)
            "type": "tree",
            "hash": "blake3:d4e5f6...",
            "name": "assets"
        },
        {
            "mode": 33261,           // 0o100755 (executable)
            "type": "manifest",
            "hash": "blake3:g7h8i9...",
            "name": "render.sh",
            "size": 1024
        }
    ]
}
```

File modes:
- `0o100644` - Regular file
- `0o100755` - Executable
- `0o120000` - Symbolic link
- `0o040000` - Directory
- `0o160000` - Submodule

### Commit Object

```
Header: "commit {size}\0"
Content (MessagePack):
{
    "version": 1,
    "tree": "blake3:a1b2c3...",
    "parents": [
        "blake3:parent1...",
        "blake3:parent2..."   // Merge commit
    ],
    "author": {
        "name": "Jane Developer",
        "email": "jane@example.com",
        "timestamp": 1704067200,
        "timezone": "-0800"
    },
    "committer": {
        "name": "Jane Developer",
        "email": "jane@example.com",
        "timestamp": 1704067200,
        "timezone": "-0800"
    },
    "message": "Add product launch video\n\nIncludes final color grade and audio mix.",
    "signature": "-----BEGIN SSH SIGNATURE-----\n...",
    "extra_headers": {
        "encoding": "UTF-8"
    }
}
```

### Tag Object

```
Header: "tag {size}\0"
Content (MessagePack):
{
    "version": 1,
    "object": "blake3:a1b2c3...",
    "object_type": "commit",
    "tag": "v1.0.0",
    "tagger": {
        "name": "Jane Developer",
        "email": "jane@example.com",
        "timestamp": 1704067200,
        "timezone": "-0800"
    },
    "message": "Release version 1.0.0\n\nFinal approved cut.",
    "signature": "-----BEGIN SSH SIGNATURE-----\n..."
}
```

### Asset Object

Video/media structure metadata (extracted from containers).

```
Header: "asset {size}\0"
Content (MessagePack):
{
    "version": 1,
    "format": "isobmff",
    "mime_type": "video/mp4",
    "duration_ms": 180000,
    "tracks": [
        {
            "id": 1,
            "type": "video",
            "codec": "h264",
            "width": 1920,
            "height": 1080,
            "frame_rate": 23.976,
            "bitrate": 50000000,
            "keyframe_offsets": [0, 48000, 96000, ...]
        },
        {
            "id": 2,
            "type": "audio",
            "codec": "aac",
            "channels": 2,
            "sample_rate": 48000,
            "bitrate": 320000
        }
    ],
    "moov_hash": "blake3:moov...",
    "mdat_manifest": "blake3:manifest...",
    "timecode_start": "01:00:00:00",
    "metadata": {
        "creation_time": "2024-01-01T12:00:00Z",
        "encoder": "Adobe Premiere Pro 2024"
    }
}
```

## Index (Staging Area)

Binary format for tracking staged changes.

### Index Header

```
┌────────────────────────────────────────────────────────────────┐
│ Signature: "DIDX" (4 bytes)                                    │
├────────────────────────────────────────────────────────────────┤
│ Version: 2 (4 bytes, big-endian)                               │
├────────────────────────────────────────────────────────────────┤
│ Entry Count (4 bytes, big-endian)                              │
├────────────────────────────────────────────────────────────────┤
│ Extensions Offset (4 bytes, big-endian)                        │
├────────────────────────────────────────────────────────────────┤
│ Index Entries (variable)                                       │
├────────────────────────────────────────────────────────────────┤
│ Extensions (variable)                                          │
├────────────────────────────────────────────────────────────────┤
│ Checksum: BLAKE3 of all preceding content (32 bytes)           │
└────────────────────────────────────────────────────────────────┘
```

### Index Entry

```
┌────────────────────────────────────────────────────────────────┐
│ ctime_seconds (4 bytes)                                        │
│ ctime_nanoseconds (4 bytes)                                    │
├────────────────────────────────────────────────────────────────┤
│ mtime_seconds (4 bytes)                                        │
│ mtime_nanoseconds (4 bytes)                                    │
├────────────────────────────────────────────────────────────────┤
│ dev (4 bytes)                                                  │
│ ino (4 bytes)                                                  │
├────────────────────────────────────────────────────────────────┤
│ mode (4 bytes)                                                 │
│ uid (4 bytes)                                                  │
│ gid (4 bytes)                                                  │
├────────────────────────────────────────────────────────────────┤
│ file_size (8 bytes)                                            │
├────────────────────────────────────────────────────────────────┤
│ hash (32 bytes, BLAKE3)                                        │
├────────────────────────────────────────────────────────────────┤
│ flags (2 bytes)                                                │
│   - stage (2 bits): 0=normal, 1-3=conflict stages              │
│   - name_length (12 bits): path length, 0xFFF if extended      │
│   - assume_valid (1 bit)                                       │
│   - extended (1 bit): extended flags follow                    │
├────────────────────────────────────────────────────────────────┤
│ extended_flags (2 bytes, if extended bit set)                  │
│   - intent_to_add (1 bit)                                      │
│   - skip_worktree (1 bit)                                      │
├────────────────────────────────────────────────────────────────┤
│ path_name (variable, NUL-terminated)                           │
├────────────────────────────────────────────────────────────────┤
│ padding (1-8 bytes to align to 8-byte boundary)                │
└────────────────────────────────────────────────────────────────┘
```

### Index Extensions

#### TREE (Cached Tree)

```
Extension ID: "TREE"
Content:
  - path (NUL-terminated)
  - entry_count (ASCII decimal) SP subtree_count (ASCII decimal) LF
  - hash (32 bytes, if entry_count >= 0)
  - [recursive for subtrees]
```

#### REUC (Resolve Undo)

Stores pre-merge state for conflict resolution undo.

```
Extension ID: "REUC"
Content (per entry):
  - path (NUL-terminated)
  - mode_stage1 (ASCII octal) NUL
  - mode_stage2 (ASCII octal) NUL
  - mode_stage3 (ASCII octal) NUL
  - hash_stage1 (32 bytes, if mode != 0)
  - hash_stage2 (32 bytes, if mode != 0)
  - hash_stage3 (32 bytes, if mode != 0)
```

#### LINK (Split Index)

For large repositories, allows incremental index updates.

```
Extension ID: "link"
Content:
  - base_hash (32 bytes): hash of shared index
  - delete_bitmap_size (4 bytes)
  - delete_bitmap (variable)
  - replace_bitmap_size (4 bytes)
  - replace_bitmap (variable)
```

### Rust Implementation

```rust
use std::fs::File;
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::Path;

pub const INDEX_SIGNATURE: &[u8; 4] = b"DIDX";
pub const INDEX_VERSION: u32 = 2;

#[derive(Debug, Clone)]
pub struct IndexEntry {
    pub ctime: Timespec,
    pub mtime: Timespec,
    pub dev: u32,
    pub ino: u32,
    pub mode: u32,
    pub uid: u32,
    pub gid: u32,
    pub file_size: u64,
    pub hash: [u8; 32],
    pub flags: IndexFlags,
    pub path: String,
}

#[derive(Debug, Clone, Copy)]
pub struct Timespec {
    pub seconds: u32,
    pub nanoseconds: u32,
}

bitflags::bitflags! {
    #[derive(Debug, Clone, Copy)]
    pub struct IndexFlags: u16 {
        const STAGE_MASK = 0b0011_0000_0000_0000;
        const NAME_MASK  = 0b0000_1111_1111_1111;
        const ASSUME_VALID = 0b0100_0000_0000_0000;
        const EXTENDED = 0b1000_0000_0000_0000;
    }
}

impl IndexEntry {
    pub fn stage(&self) -> u8 {
        ((self.flags.bits() & IndexFlags::STAGE_MASK.bits()) >> 12) as u8
    }

    pub fn set_stage(&mut self, stage: u8) {
        let flags = self.flags.bits() & !IndexFlags::STAGE_MASK.bits();
        self.flags = IndexFlags::from_bits_truncate(flags | ((stage as u16) << 12));
    }
}

pub struct Index {
    pub entries: Vec<IndexEntry>,
    pub extensions: Vec<IndexExtension>,
}

impl Index {
    pub fn read(path: &Path) -> Result<Self, IndexError> {
        let file = File::open(path)?;
        let mut reader = BufReader::new(file);

        // Read header
        let mut sig = [0u8; 4];
        reader.read_exact(&mut sig)?;
        if &sig != INDEX_SIGNATURE {
            return Err(IndexError::InvalidSignature);
        }

        let version = read_u32_be(&mut reader)?;
        if version != INDEX_VERSION {
            return Err(IndexError::UnsupportedVersion(version));
        }

        let entry_count = read_u32_be(&mut reader)? as usize;
        let extensions_offset = read_u32_be(&mut reader)? as usize;

        // Read entries
        let mut entries = Vec::with_capacity(entry_count);
        for _ in 0..entry_count {
            entries.push(IndexEntry::read(&mut reader)?);
        }

        // Read extensions
        let extensions = IndexExtension::read_all(&mut reader)?;

        // Verify checksum
        // ...

        Ok(Index { entries, extensions })
    }

    pub fn write(&self, path: &Path) -> Result<(), IndexError> {
        let temp_path = path.with_extension("lock");
        let file = File::create(&temp_path)?;
        let mut writer = BufWriter::new(file);

        // Write header
        writer.write_all(INDEX_SIGNATURE)?;
        write_u32_be(&mut writer, INDEX_VERSION)?;
        write_u32_be(&mut writer, self.entries.len() as u32)?;

        // Placeholder for extensions offset
        let offset_pos = writer.stream_position()?;
        write_u32_be(&mut writer, 0)?;

        // Write entries
        for entry in &self.entries {
            entry.write(&mut writer)?;
        }

        // Record extensions offset
        let extensions_offset = writer.stream_position()?;

        // Write extensions
        for ext in &self.extensions {
            ext.write(&mut writer)?;
        }

        // Go back and write extensions offset
        writer.seek(std::io::SeekFrom::Start(offset_pos))?;
        write_u32_be(&mut writer, extensions_offset as u32)?;
        writer.seek(std::io::SeekFrom::End(0))?;

        // Write checksum
        writer.flush()?;
        let checksum = compute_checksum(&temp_path)?;
        writer.write_all(&checksum)?;

        // Atomic rename
        std::fs::rename(&temp_path, path)?;

        Ok(())
    }

    pub fn add(&mut self, entry: IndexEntry) {
        // Remove any existing entry at same path
        self.entries.retain(|e| e.path != entry.path || e.stage() != entry.stage());

        // Insert in sorted order
        let pos = self.entries.binary_search_by(|e| e.path.cmp(&entry.path))
            .unwrap_or_else(|pos| pos);
        self.entries.insert(pos, entry);
    }

    pub fn remove(&mut self, path: &str) {
        self.entries.retain(|e| e.path != path);
    }

    pub fn has_conflicts(&self) -> bool {
        self.entries.iter().any(|e| e.stage() != 0)
    }

    pub fn conflicts(&self) -> Vec<&str> {
        self.entries
            .iter()
            .filter(|e| e.stage() != 0)
            .map(|e| e.path.as_str())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect()
    }
}
```

## References

### Reference Format

Plain text files containing hash or symbolic reference.

```
# Direct reference (branch pointing to commit)
a1b2c3d4e5f6789012345678901234567890abcd

# Symbolic reference (HEAD pointing to branch)
ref: refs/heads/main
```

### Reference Path Mapping

```rust
pub fn ref_path(refname: &str) -> PathBuf {
    PathBuf::from(".dits").join(refname)
}

// Examples:
// "refs/heads/main" -> ".dits/refs/heads/main"
// "refs/tags/v1.0" -> ".dits/refs/tags/v1.0"
// "refs/remotes/origin/main" -> ".dits/refs/remotes/origin/main"
```

### Packed References

For repositories with many refs, pack into single file.

```
# .dits/packed-refs
# pack-refs with: peeled fully-peeled sorted
a1b2c3d4e5f6789012345678901234567890abcd refs/heads/main
b2c3d4e5f6789012345678901234567890abcde1 refs/heads/feature
c3d4e5f6789012345678901234567890abcde1f2 refs/tags/v1.0.0
^d4e5f6789012345678901234567890abcde1f23  # peeled tag target
```

## Reflog

### Reflog Format

One entry per line, tracking reference changes.

```
# .dits/logs/refs/heads/main
0000000000000000000000000000000000000000 a1b2c3d4... Jane <jane@example.com> 1704067200 -0800	commit (initial): Initial commit
a1b2c3d4... b2c3d4e5... Jane <jane@example.com> 1704153600 -0800	commit: Add video file
b2c3d4e5... c3d4e5f6... Jane <jane@example.com> 1704240000 -0800	commit (merge): Merge feature branch
```

Format: `{old_hash} {new_hash} {author} {timestamp} {timezone}\t{action}: {message}`

### Reflog Rust Implementation

```rust
pub struct ReflogEntry {
    pub old_hash: Option<Hash>,
    pub new_hash: Hash,
    pub author: String,
    pub email: String,
    pub timestamp: i64,
    pub timezone: String,
    pub action: String,
    pub message: String,
}

impl ReflogEntry {
    pub fn parse(line: &str) -> Result<Self, ReflogError> {
        // Parse format: old new author <email> timestamp tz\taction: message
        let parts: Vec<&str> = line.splitn(2, '\t').collect();
        if parts.len() != 2 {
            return Err(ReflogError::InvalidFormat);
        }

        let header = parts[0];
        let action_message = parts[1];

        // Parse header
        let tokens: Vec<&str> = header.split_whitespace().collect();
        // ... parsing logic

        Ok(ReflogEntry {
            // ... fields
        })
    }

    pub fn format(&self) -> String {
        format!(
            "{} {} {} <{}> {} {}\t{}",
            self.old_hash.map(|h| h.to_hex()).unwrap_or_else(|| "0".repeat(64)),
            self.new_hash.to_hex(),
            self.author,
            self.email,
            self.timestamp,
            self.timezone,
            self.message
        )
    }
}
```

## Cache Database

SQLite database for local cache management.

### Schema

```sql
-- .dits/cache/index.db

CREATE TABLE chunks (
    hash BLOB PRIMARY KEY,
    size INTEGER NOT NULL,
    compressed_size INTEGER,
    last_accessed INTEGER NOT NULL,
    access_count INTEGER DEFAULT 1,
    pinned BOOLEAN DEFAULT FALSE
);

CREATE TABLE manifests (
    hash BLOB PRIMARY KEY,
    file_path TEXT NOT NULL,
    size INTEGER NOT NULL,
    last_accessed INTEGER NOT NULL
);

CREATE TABLE prefetch_hints (
    chunk_hash BLOB PRIMARY KEY,
    predicted_access INTEGER,
    confidence REAL
);

CREATE INDEX idx_chunks_lru ON chunks(pinned, last_accessed);
CREATE INDEX idx_chunks_size ON chunks(size);

-- Stats view
CREATE VIEW cache_stats AS
SELECT
    COUNT(*) as total_chunks,
    SUM(size) as total_size,
    SUM(compressed_size) as compressed_size,
    AVG(access_count) as avg_access_count
FROM chunks;
```

## Staging (Write Overlay)

Copy-on-Write staging for modified files.

### Structure

```
.dits/staging/
├── {inode_1}/
│   ├── data              # Modified content
│   └── meta.json         # Modification metadata
├── {inode_2}/
│   ├── data
│   └── meta.json
└── index.json            # Staging index
```

### meta.json

```json
{
    "original_path": "footage/scene1.mp4",
    "original_hash": "blake3:a1b2c3...",
    "original_size": 1073741824,
    "modified_at": "2024-01-15T10:30:00Z",
    "modified_ranges": [
        {"start": 0, "end": 65536},
        {"start": 1048576, "end": 2097152}
    ],
    "new_size": 1073807360
}
```

### index.json

```json
{
    "version": 1,
    "entries": {
        "12345": {
            "path": "footage/scene1.mp4",
            "status": "modified"
        },
        "12346": {
            "path": "footage/scene2.mp4",
            "status": "new"
        }
    }
}
```

## Hooks

Executable scripts triggered by operations.

### Available Hooks

| Hook | Trigger | Can Abort |
|------|---------|-----------|
| `pre-commit` | Before commit created | Yes |
| `prepare-commit-msg` | After default message | Yes |
| `commit-msg` | After message entered | Yes |
| `post-commit` | After commit created | No |
| `pre-push` | Before push to remote | Yes |
| `post-checkout` | After checkout | No |
| `pre-rebase` | Before rebase | Yes |
| `post-merge` | After merge | No |
| `pre-auto-gc` | Before auto GC | Yes |

### Hook Environment

```bash
# Available environment variables
DITS_DIR=/path/to/project/.dits
DITS_WORK_TREE=/path/to/project
DITS_AUTHOR_NAME="Jane Developer"
DITS_AUTHOR_EMAIL="jane@example.com"
DITS_AUTHOR_DATE="2024-01-15T10:30:00Z"
DITS_COMMITTER_NAME="Jane Developer"
DITS_COMMITTER_EMAIL="jane@example.com"
DITS_COMMITTER_DATE="2024-01-15T10:30:00Z"
```

### Example Hook

```bash
#!/bin/bash
# .dits/hooks/pre-commit
# Prevent commits of files over 1GB without LFS

MAX_SIZE=$((1024 * 1024 * 1024))

for file in $(dits diff --cached --name-only); do
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    if [ "$size" -gt "$MAX_SIZE" ]; then
        echo "Error: $file is larger than 1GB. Use 'dits lfs track' first."
        exit 1
    fi
done

exit 0
```

## Ignore Patterns

### .ditsignore

Same syntax as .gitignore:

```
# .ditsignore

# Render outputs
renders/
output/

# Temporary files
*.tmp
*.bak
*~

# OS files
.DS_Store
Thumbs.db

# NLE-specific
*.pkf          # Premiere peak files
*.pek          # Premiere peak files
*.cfa          # Premiere cache
*.cpf          # Premiere cache
Media Cache/
Adobe Premiere Pro Auto-Save/

# Large files (use LFS instead)
# *.mov
# *.mp4

# But keep project files
!*.prproj
!*.drp
!*.aep
```

### .ditsattributes

Path-specific attributes:

```
# .ditsattributes

# All video files use LFS
*.mp4 lfs
*.mov lfs
*.mxf lfs
*.avi lfs

# Project files need special merge handling
*.prproj merge=nle-project
*.drp merge=nle-project
*.aep binary

# Ensure text files have consistent line endings
*.txt text eol=lf
*.md text eol=lf
*.json text eol=lf

# Binary files
*.png binary
*.jpg binary
*.psd binary

# Large video uses keyframe-aligned chunking
*.mp4 chunking=keyframe
*.mov chunking=keyframe

# Raw footage uses larger chunks
footage/**/*.mov chunking=large
```

## Lock Files

Prevent concurrent modifications.

### index.lock

Created when modifying index:

```rust
pub fn lock_index(repo: &Path) -> Result<FileLock, LockError> {
    let lock_path = repo.join(".dits/index.lock");

    let file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&lock_path)?;

    // Write PID for debugging
    writeln!(file, "{}", std::process::id())?;

    Ok(FileLock { path: lock_path, file })
}

impl Drop for FileLock {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.path);
    }
}
```

### refs/heads/{branch}.lock

Created when updating a branch reference.

## Temporary Files

### tmp/ directory

For in-progress operations:

```
.dits/tmp/
├── pack-{random}/        # Pack file creation
│   ├── objects/
│   └── pack.tmp
├── merge-{random}/       # Merge in progress
│   ├── MERGE_HEAD
│   ├── MERGE_MSG
│   └── MERGE_MODE
├── rebase-{random}/      # Rebase in progress
│   ├── head-name
│   ├── onto
│   └── todo
└── fetch-{random}/       # Fetch in progress
    └── incoming/
```

### Cleanup

```rust
pub fn cleanup_tmp(repo: &Path, max_age: Duration) -> Result<(), io::Error> {
    let tmp_dir = repo.join(".dits/tmp");

    for entry in fs::read_dir(&tmp_dir)? {
        let entry = entry?;
        let metadata = entry.metadata()?;

        if let Ok(modified) = metadata.modified() {
            if modified.elapsed().unwrap_or(Duration::MAX) > max_age {
                if metadata.is_dir() {
                    fs::remove_dir_all(entry.path())?;
                } else {
                    fs::remove_file(entry.path())?;
                }
            }
        }
    }

    Ok(())
}
```

## Worktrees

Additional working directories for same repository.

### Creating a Worktree

```bash
dits worktree add ../project-feature feature-branch
```

Creates:
```
../project-feature/
├── .dits -> ../project/.dits/worktrees/project-feature
└── [working files]

.dits/worktrees/project-feature/
├── HEAD           # refs/heads/feature-branch
├── index          # Separate index
├── gitdir         # Path: ../../../project-feature/.dits
└── locked         # Optional: prevent pruning
```

### Worktree Metadata

```
# .dits/worktrees/project-feature/gitdir
/Users/jane/projects/project-feature/.dits

# .dits/worktrees/project-feature/HEAD
ref: refs/heads/feature-branch

# .dits/worktrees/project-feature/commondir
../..
```
