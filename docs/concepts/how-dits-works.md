# How Dits Works: Concepts & Architecture

A user-friendly explanation of the technology behind Dits and why it's so efficient at handling large files.

---

## Table of Contents

1. [The Big Picture](#the-big-picture)
2. [Why Traditional Version Control Fails for Large Files](#why-traditional-version-control-fails-for-large-files)
3. [Content-Defined Chunking](#content-defined-chunking)
4. [Deduplication: The Magic of Shared Chunks](#deduplication-the-magic-of-shared-chunks)
5. [Video-Aware Chunking](#video-aware-chunking)
6. [Hybrid Storage: Best of Both Worlds](#hybrid-storage-best-of-both-worlds)
7. [The Repository Structure](#the-repository-structure)
8. [How Syncing Works](#how-syncing-works)
9. [File Locking Explained](#file-locking-explained)
10. [Virtual Filesystem (VFS)](#virtual-filesystem-vfs)
11. [P2P Sharing](#p2p-sharing)
12. [Security & Integrity](#security--integrity)

---

## The Big Picture

Dits is a version control system designed for large binary files—video, audio, images, 3D models, and game assets. It provides Git-like workflow (add, commit, push, pull) but with technology optimized for files that Git struggles with.

### Core Principles

```
┌─────────────────────────────────────────────────────────────┐
│                        DITS CORE                            │
│                                                              │
│   1. CHUNK FILES     Instead of storing whole files,        │
│                      break them into ~1MB pieces            │
│                                                              │
│   2. DEDUPLICATE     Only store unique chunks—identical     │
│                      pieces are shared                       │
│                                                              │
│   3. SYNC SMART      Only transfer chunks that are          │
│                      missing on the other side              │
│                                                              │
│   4. VERIFY ALWAYS   Every chunk has a cryptographic        │
│                      hash to ensure integrity               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### The Result

| Metric | Traditional Approach | With Dits |
|--------|---------------------|-----------|
| 10 versions of 10GB video | 100 GB | ~15 GB |
| Upload after small edit | Full 10 GB | ~50 MB changed |
| Clone 100GB project | Download 100 GB | Download what you need |
| Find what changed | "Binary files differ" | Exact chunks changed |

---

## Why Traditional Version Control Fails for Large Files

### Git's Approach

Git was designed for source code—small text files where changes happen line by line.

```
Source Code Change:
Line 42: "Hello"  →  "Hello World"

Git stores:
- A new blob for the file
- The diff is tiny (one line)
- Compression works well on text
- Delta compression helps
```

### The Problem with Binary Files

```
Video File Change:
- Re-encoded same video with different bitrate
- Added 5 seconds to the beginning
- Color corrected one scene

Git stores:
- Entire new file (10 GB)
- Can't compute meaningful diff
- "Binary files differ"
- No delta compression (random-looking data)
```

### Why Git LFS Doesn't Fully Solve This

Git LFS stores large files on a separate server, keeping only pointers in Git:

```
Git Repository:          LFS Server:
┌─────────────┐          ┌─────────────┐
│ version 1   │ ──────▶  │ 10 GB file  │
│ (pointer)   │          ├─────────────┤
├─────────────┤          │ 10 GB file  │
│ version 2   │ ──────▶  │ (full copy) │
│ (pointer)   │          ├─────────────┤
├─────────────┤          │ 10 GB file  │
│ version 3   │ ──────▶  │ (full copy) │
│ (pointer)   │          └─────────────┘
└─────────────┘          Total: 30 GB
```

**Problem**: Even with LFS, each version is stored fully. No deduplication.

---

## Content-Defined Chunking

### The Core Innovation

Instead of treating files as opaque blobs, Dits breaks them into **chunks** based on the actual content.

```
10 GB Video File
│
▼ CHUNKING
│
├── Chunk 1:  [1.02 MB] hash: abc123
├── Chunk 2:  [0.98 MB] hash: def456
├── Chunk 3:  [1.05 MB] hash: ghi789
├── ...
└── Chunk 9,850: [0.89 MB] hash: xyz999

Total chunks: ~10,000
Average size: ~1 MB
```

### How Chunk Boundaries Are Determined

**Fixed-size chunking** (what you might expect):
- Cut every 1 MB exactly
- Problem: Insert 1 byte at the start, and EVERY chunk shifts

**Content-defined chunking** (what Dits uses):
- Cut based on content patterns
- Find "cut points" using a rolling hash
- Same content = same cut points

```
Example: Original file
[=====A=====|=====B=====|=====C=====]
          ^           ^
     cut points based on content

After inserting data at beginning:
[XX=====A=====|=====B=====|=====C=====]
            ^           ^
     cut points UNCHANGED (same content patterns)
```

### The FastCDC Algorithm

Dits uses FastCDC (Fast Content-Defined Chunking):

```
Parameters:
  MIN_SIZE = 256 KB   (minimum chunk)
  AVG_SIZE = 1 MB     (target average)
  MAX_SIZE = 4 MB     (maximum chunk)

For each byte in file:
  1. Compute rolling hash
  2. If hash matches pattern AND size >= MIN_SIZE:
     → Create chunk boundary
  3. If size reaches MAX_SIZE:
     → Force chunk boundary
```

### Why This Matters

When you modify part of a file:
- Old chunking: Every chunk after the change is different
- Content-defined: Only chunks containing changes are different

```
Original video: [A][B][C][D][E][F][G][H][I][J]
Edit scene in middle:          ↓
Modified video: [A][B][C][D'][E'][F][G][H][I][J]

Only chunks D' and E' are new!
8 out of 10 chunks are shared.
```

---

## Deduplication: The Magic of Shared Chunks

### How Deduplication Works

Every chunk is identified by its **BLAKE3 hash**—a cryptographic fingerprint:

```
Chunk content  →  BLAKE3 hash
[raw bytes]    →  "abc123def456..."

If two chunks have the same content,
they have the same hash (guaranteed)
```

### Storage Model

```
File Manifest:                  Chunk Storage:
┌─────────────────────┐         ┌─────────────────────┐
│ video.mp4           │         │ abc123: [1.02 MB]   │
│   Chunk 1: abc123   │────────▶│                     │
│   Chunk 2: def456   │────┐    ├─────────────────────┤
│   Chunk 3: ghi789   │──┐ └───▶│ def456: [0.98 MB]   │
│   ...               │  │      ├─────────────────────┤
└─────────────────────┘  └─────▶│ ghi789: [1.05 MB]   │
                                │ ...                 │
┌─────────────────────┐         │                     │
│ video_v2.mp4        │         │                     │
│   Chunk 1: abc123   │────────▶│ (same chunk!)       │
│   Chunk 2: def456   │────────▶│ (same chunk!)       │
│   Chunk 3: xyz999   │───┐     ├─────────────────────┤
│   ...               │   └────▶│ xyz999: [1.01 MB]   │
└─────────────────────┘         └─────────────────────┘

v1 and v2 share chunks abc123 and def456!
Only xyz999 is stored once more.
```

### Real-World Deduplication Examples

| Scenario | Files | Raw Size | Deduplicated | Savings |
|----------|-------|----------|--------------|---------|
| 5 versions of video (minor edits) | 5 | 50 GB | 12 GB | 76% |
| 100 similar photos (same shoot) | 100 | 50 GB | 8 GB | 84% |
| 10 game builds (iterative) | 10 | 100 GB | 18 GB | 82% |
| 20 PSD saves (same file) | 20 | 10 GB | 1.5 GB | 85% |

### Why Similar Files Deduplicate Well

**Photos from same shoot:**
- Same camera, lighting, composition
- RAW sensor data has similar patterns
- Chunks containing background/unchanged areas match

**Game builds:**
- Most assets unchanged between builds
- Only modified assets create new chunks
- Common libraries shared across builds

**Video edits:**
- Most frames unchanged
- Only edited sections create new chunks
- Re-encodes may chunk differently (bitrate changes)

---

## Video-Aware Chunking

### The Problem with Naive Chunking

Video files have internal structure:
- Keyframes (I-frames): Complete images
- Delta frames (P/B-frames): Changes from keyframes

```
Video stream:
[I]--[P]--[P]--[P]--[I]--[P]--[P]--[P]--[I]...
 ^                   ^                   ^
 Keyframes (scene boundaries)

Naive chunking might cut here:
[I]--[P]--[P]-|-[P]--[I]--[P]--[P]--[P]--[I]...
              ^
              Bad cut! Splits a GOP (group of pictures)
```

### Keyframe-Aligned Chunking

Dits understands video container formats (MP4, MOV, MXF) and aligns chunk boundaries to keyframes:

```
Video stream:
[I]--[P]--[P]--[P]--[I]--[P]--[P]--[P]--[I]...
                    |                    |
                    Good cuts! At keyframes

Chunk 1: [I]--[P]--[P]--[P]
Chunk 2: [I]--[P]--[P]--[P]
Chunk 3: [I]--...
```

### Why This Matters

**Without keyframe alignment:**
- Different encodes of same footage → different chunks
- Inserting content shifts all subsequent chunks
- Poor deduplication

**With keyframe alignment:**
- Same scenes tend to create same chunks
- Insert at scene boundary → existing chunks preserved
- Better deduplication (often 20-30% improvement)

### Supported Formats

Dits parses and optimizes for:
- **MP4/M4V**: H.264, H.265/HEVC
- **MOV**: ProRes, DNxHD, Animation
- **MXF**: Broadcast formats
- Other formats work but without keyframe optimization

---

## Hybrid Storage: Best of Both Worlds

### The Problem with One-Size-Fits-All

Text files and binary files have different needs:

| Need | Text Files | Binary Files |
|------|------------|--------------|
| Diff | Line-by-line | Chunk-level |
| Merge | 3-way merge | Not possible |
| Storage | Compress well | Already compressed |
| Changes | Small, incremental | May be large |

### Dits Hybrid Storage

Dits automatically routes files to the right storage engine:

```
┌─────────────────────────────────────────────────────────────┐
│                     FILE CLASSIFIER                          │
│                                                              │
│  Extension/Content            Storage Engine                 │
│  ─────────────────            ──────────────                 │
│  .txt, .md, .json     →       libgit2 (Git storage)         │
│  .rs, .py, .js        →       libgit2 (Git storage)         │
│                                                              │
│  .mp4, .mov, .mxf     →       Dits CDC (chunks)             │
│  .psd, .blend, .ztl   →       Dits CDC (chunks)             │
│  .wav, .aiff, .mp3    →       Dits CDC (chunks)             │
│                                                              │
│  .prproj, .aep        →       Hybrid (both engines)         │
│  (XML + embedded)                                            │
└─────────────────────────────────────────────────────────────┘
```

### Benefits

**Text files get:**
- Git-quality merging with conflict markers
- Line-by-line diff
- Blame support
- 20+ years of Git refinement

**Binary files get:**
- Content-defined chunking
- Deduplication
- Format-aware handling
- Optimized for large files

**Project files (.prproj, .aep):**
- XML metadata handled as text
- Embedded assets chunked as binary
- Best of both worlds

---

## The Repository Structure

### What's in .dits/?

```
.dits/
├── HEAD                    # Current branch pointer
├── config                  # Repository configuration
├── index                   # Staging area
├── objects/                # Content storage
│   ├── chunks/             # Deduplicated chunks (BLAKE3)
│   │   ├── ab/
│   │   │   └── c123...     # Chunk files
│   │   └── de/
│   │       └── f456...
│   ├── git/                # Text file objects (SHA-1)
│   └── manifests/          # File→chunk mappings
├── refs/                   # Branches and tags
│   ├── heads/
│   │   └── main
│   └── tags/
│       └── v1.0
└── logs/                   # Reference history
```

### Commits, Trees, and Manifests

```
Commit (abc123):
┌─────────────────────┐
│ parent: def456      │
│ tree: manifest-789  │
│ author: Jane        │
│ message: "Update"   │
│ timestamp: ...      │
└─────────────────────┘
         │
         ▼
Manifest (manifest-789):
┌─────────────────────────────────────┐
│ video.mp4     → asset-111           │
│ audio.wav     → asset-222           │
│ script.py     → git-blob-333        │
└─────────────────────────────────────┘
         │
         ▼
Asset (asset-111):
┌─────────────────────────────────────┐
│ size: 10,485,760,000                │
│ chunks:                             │
│   - chunk-aaa (1,048,576 bytes)     │
│   - chunk-bbb (1,032,192 bytes)     │
│   - chunk-ccc (1,056,768 bytes)     │
│   - ...                             │
└─────────────────────────────────────┘
```

---

## How Syncing Works

### Push: Uploading Changes

```
Local                           Remote
┌──────────┐                    ┌──────────┐
│ Chunks:  │                    │ Chunks:  │
│ A, B, C  │                    │ A, B     │
│ D, E, F  │                    │          │
└──────────┘                    └──────────┘

Step 1: Query which chunks remote has
        "Do you have A, B, C, D, E, F?"

Step 2: Remote responds
        "I have A, B. Send C, D, E, F"

Step 3: Upload only missing chunks
        → Transfer C, D, E, F (not A, B!)

Result: Only new data uploaded
```

### Pull: Downloading Changes

```
Local                           Remote
┌──────────┐                    ┌──────────┐
│ Chunks:  │                    │ Chunks:  │
│ A, B     │                    │ A, B, C  │
│          │                    │ D, E, F  │
└──────────┘                    └──────────┘

Step 1: Get new manifest from remote

Step 2: Determine which chunks we need
        We have: A, B
        Need: C, D, E, F

Step 3: Download only missing chunks
        ← Receive C, D, E, F (not A, B!)

Step 4: Reconstruct files from chunks
```

### Delta Sync Efficiency

**Traditional sync (Dropbox-style):**
- File changed → upload entire file
- 10 GB video, small edit → transfer 10 GB

**Dits delta sync:**
- File changed → identify changed chunks
- 10 GB video, small edit → transfer ~50 MB

---

## File Locking Explained

### Why Locking Matters for Binary Files

Text files can be merged:
```
Your change:    Line 10: "Hello"
Their change:   Line 20: "World"
Merge result:   Both changes applied ✓
```

Binary files cannot be merged:
```
Your change:    Re-exported video with color grade
Their change:   Re-exported video with different cut
Merge result:   ??? (impossible to combine)
```

### How Locking Works

```
1. LOCK
   ┌─────────────────────────────────────────┐
   │ dits lock video.mp4 --reason "Editing"  │
   └─────────────────────────────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────────────┐
   │ Lock stored locally and on remote       │
   │ File: video.mp4                         │
   │ User: jane@example.com                  │
   │ Reason: "Editing"                       │
   │ Time: 2024-06-15 10:30:00              │
   └─────────────────────────────────────────┘

2. WORK
   - Jane works on video.mp4
   - Others see the lock: dits locks
   - Others cannot lock the same file

3. UNLOCK
   ┌─────────────────────────────────────────┐
   │ dits add video.mp4                      │
   │ dits commit -m "Updated edit"           │
   │ dits push                               │
   │ dits unlock video.mp4                   │
   └─────────────────────────────────────────┘
```

### Lock Enforcement

```
Alex tries to edit locked file:

$ dits lock video.mp4
Error: File is locked by jane@example.com
Reason: "Editing"
Since: 2024-06-15 10:30:00

Options:
1. Wait for Jane to finish
2. Ask Jane to release lock
3. Force-break lock (admin only): dits lock -f video.mp4
```

---

## Virtual Filesystem (VFS)

### The Problem: Huge Repositories

```
Repository: 500 GB of assets
Your task: Edit one 2 GB video file

Traditional approach:
  dits clone → Download ALL 500 GB
  Time: Hours
  Disk space: 500 GB needed
```

### VFS Solution

```
dits vfs mount /mnt/project

$ ls /mnt/project
Assets/  Scenes/  Renders/  project.prproj

$ ls /mnt/project/Assets/
character.blend   (shows as 500 MB, not downloaded yet)
environment.psd   (shows as 2 GB, not downloaded yet)
video.mp4         (shows as 10 GB, not downloaded yet)

$ open /mnt/project/Assets/video.mp4
→ Chunks downloaded on demand as video plays
→ Only accessed portions transferred
```

### How VFS Works

```
┌─────────────────────────────────────────────────────────┐
│                    User Application                      │
│                 (Premiere, Blender, etc.)               │
└──────────────────────────┬──────────────────────────────┘
                           │ File read request
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     Dits VFS Layer                       │
│    ┌─────────────────────────────────────────────┐      │
│    │ Is chunk in local cache?                    │      │
│    │   YES → Return immediately                  │      │
│    │   NO  → Fetch from remote, cache, return    │      │
│    └─────────────────────────────────────────────┘      │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
     ┌─────────────┐           ┌─────────────┐
     │ Local Cache │           │   Remote    │
     │  (fast SSD) │           │   Server    │
     └─────────────┘           └─────────────┘
```

### Cache Management

```
Cache configuration:
  Location: /Volumes/SSD/dits-cache
  Size: 100 GB (configurable)
  Policy: LRU (Least Recently Used)

When cache is full:
  - Remove oldest unused chunks
  - Keep recently accessed chunks
  - Prefetch predictively (optional)
```

---

## P2P Sharing

### Why P2P?

**Traditional sharing:**
```
You (NYC)  ──────▶  Cloud Server (SF)  ──────▶  Colleague (NYC)
                         △                           △
                    Upload 10 GB                Download 10 GB
                    (slow, costly)              (slow, redundant)

Total transferred: 20 GB over internet
```

**P2P sharing:**
```
You (NYC)  ◀───────────────────────────────▶  Colleague (NYC)
                    Direct transfer
                    Same network/city

Total transferred: 10 GB (direct)
```

### How It Works

```
1. START SHARE
   $ dits p2p share
   P2P sharing started
   Join code: ABC-123-XYZ
   Waiting for connections...

2. CONNECT
   (On colleague's machine)
   $ dits p2p connect ABC-123-XYZ ./project
   Connecting to peer...
   Connected! Starting transfer...

3. TRANSFER
   - Direct encrypted connection (QUIC protocol)
   - Only missing chunks transferred
   - NAT traversal handles firewalls
   - Progress shown in real-time
```

### Security

```
P2P connections are:

1. ENCRYPTED
   - AES-256-GCM encryption
   - Keys derived from join code

2. AUTHENTICATED
   - SPAKE2 key exchange
   - Join code acts as password

3. VERIFIED
   - BLAKE3 checksums on all chunks
   - Data integrity guaranteed
```

---

## Security & Integrity

### Content Addressing

Every piece of content is identified by its cryptographic hash:

```
Content → BLAKE3 hash → Storage

If content changes by even 1 bit:
  → Completely different hash
  → Stored as new content
  → Tampering is detectable
```

### Verification

```
$ dits fsck
Verifying repository integrity...

Checking objects... ✓
Checking references... ✓
Checking manifests... ✓
Verifying 45,678 chunks...
  [████████████████████████████████] 100%
All chunks verified ✓

Repository is healthy.
```

### Encryption Options

**In transit:**
- All network transfers use TLS 1.3 or QUIC
- P2P uses AES-256-GCM

**At rest (optional):**
```bash
# Enable encryption
dits encrypt-init

# Files encrypted before storage
# Only you (with key) can decrypt
```

### Hash Algorithm: BLAKE3

Dits uses BLAKE3 instead of SHA-256:

| Property | SHA-256 | BLAKE3 |
|----------|---------|--------|
| Speed | ~500 MB/s | ~6 GB/s (10x faster) |
| Parallelism | Single-threaded | Multi-threaded |
| Security | Proven | Proven (BLAKE family) |

```
Hashing 10 GB video:
  SHA-256: ~20 seconds
  BLAKE3:  ~2 seconds (uses all CPU cores)
```

---

## Summary

### Why Dits is Efficient

1. **Chunking**: Files broken into ~1MB pieces based on content
2. **Deduplication**: Identical chunks stored once, shared across files
3. **Video-awareness**: Chunks aligned to keyframes for better dedup
4. **Delta sync**: Only changed chunks transferred
5. **Hybrid storage**: Right engine for each file type

### The User Experience

```bash
# It just works like Git
dits init
dits add .
dits commit -m "My changes"
dits push

# But with massive storage savings
$ dits repo-stats
Files: 500
Raw size: 150 GB
Stored: 35 GB
Savings: 77%
```

### Learn More

- [Getting Started Guide](../user-guide/getting-started.md)
- [CLI Reference](../reference/cli.md)
- [FAQ](../troubleshooting/faq.md)
- [Technical Architecture](../architecture/overview.md) (advanced)
