# Core Concepts

Understanding how Dits works will help you use it effectively. This page explains the key concepts behind Dits.

## Content-Defined Chunking

Unlike Git which stores files as single objects, Dits splits files into variable-size **chunks** based on their content. This is called **content-defined chunking** (CDC).

### Traditional vs Dits Approach

**Traditional Approach**
```
File: video.mp4 (2GB)
├── Stored as single blob
└── Any change = re-store 2GB
```

**Dits Approach**
```
File: video.mp4 (2GB)
├── Chunk 1: 1.2 MB (hash: abc...)
├── Chunk 2: 0.9 MB (hash: def...)
├── ...
└── Only changed chunks stored
```

### Chunking Algorithms

Dits implements multiple content-defined chunking algorithms, each optimized for different use cases:

#### FastCDC (Default)
FastCDC (Fast Content-Defined Chunking) is Dits' primary algorithm, providing excellent performance and deduplication ratios.

**Streaming Implementation:** Dits implements a memory-efficient streaming version of FastCDC that processes files in 64KB rolling windows, enabling unlimited file sizes without memory exhaustion. Performance: 10MB file chunked in 47ms (212MB/s throughput), 90% memory reduction.

#### How Chunk Boundaries Are Determined

**Fixed-size chunking problem:**
- Cut every 1 MB exactly
- Problem: Insert 1 byte at the start, and EVERY chunk shifts

**Content-defined chunking solution:**
- Cut based on content patterns using a rolling hash
- Same content = same cut points
- Insertions only affect nearby chunks

#### Additional Chunking Algorithms

Beyond FastCDC, Dits implements several specialized chunking algorithms for different performance and security requirements:

**Rabin Fingerprinting**
- Classic polynomial rolling hash algorithm
- Strong locality guarantees (identical content = identical boundaries)
- May produce more variable chunk sizes than FastCDC
- Best for: Applications requiring strict content-aware boundaries

**Asymmetric Extremum (AE)**
- Places boundaries at local minima/maxima in sliding windows
- Better control over chunk size distribution
- Reduces extreme chunk size variance
- Best for: Consistent chunk sizes, lower metadata overhead

**Chonkers Algorithm**
- Advanced layered algorithm with mathematical guarantees
- Provable strict bounds on both chunk size AND edit locality
- Uses hierarchical merging (balancing → caterpillar → diffbit phases)
- Best for: Mission-critical applications requiring guarantees

**Parallel FastCDC**
- Multi-core implementation of FastCDC
- Splits large files into segments processed in parallel
- 2-4x throughput improvement on multi-core systems
- Best for: Large files, high-throughput environments

**Keyed FastCDC (KCDC)**
- Security-enhanced FastCDC with secret key
- Prevents fingerprinting attacks via chunk length patterns
- Same performance as FastCDC with added privacy protection
- Best for: Encrypted backups, privacy-sensitive applications

#### Algorithm Parameters

FastCDC uses carefully tuned parameters for optimal performance:

```rust
// FastCDC configuration for video files
min_size: 32KB     // Minimum chunk size
avg_size: 64KB     // Target average size
max_size: 256KB    // Maximum chunk size
normalization: 2   // Size distribution control
```

#### Rolling Hash Implementation

FastCDC uses a "gear hash" - a precomputed table of random 64-bit values:

```rust
// Rolling hash state
hash = 0

// For each byte in the file:
hash = (hash << 1) + gear_table[byte_value]

// Check if hash matches boundary pattern:
// (hash & mask) == 0 → create chunk boundary
```

#### Performance Characteristics

| Implementation | Throughput | Platform |
|----------------|------------|----------|
| Scalar (baseline) | 800 MB/s | All CPUs |
| SSE4.1 | 1.2 GB/s | Intel/AMD |
| AVX2 | 2.0 GB/s | Modern Intel/AMD |
| AVX-512 | 3.5 GB/s | High-end Intel |
| ARM NEON | 1.5-2.5 GB/s | Apple Silicon, ARM64 |

### Why Content-Defined Chunking Matters

When you modify part of a file:
- **Old approach:** Every chunk after the change is different
- **CDC approach:** Only chunks containing changes are different

```
Original video: [A][B][C][D][E][F][G][H][I][J]
Edit scene in middle:          ↓
Modified video: [A][B][C][D'][E'][F][G][H][I][J]

Result: Only chunks D' and E' are new!
8 out of 10 chunks are shared.
```

## Content Addressing

Every piece of data in Dits is identified by its **content hash**, specifically a BLAKE3 hash. This is called **content addressing**.

### How It Works

```
# Every chunk has a unique hash based on its content
Chunk abc123... = specific 1.2MB of video data
Chunk def456... = specific 0.9MB of video data

# Files are just lists of chunk hashes
video.mp4 = [abc123, def456, ghi789, ...]

# Commits reference file manifests by hash
Commit xyz... → Manifest hash → File hashes → Chunk hashes
```

### Cryptographic Hashing

Dits supports multiple cryptographic hash algorithms for different performance and security trade-offs:

#### BLAKE3 (Default)
Dits uses BLAKE3 as the default hash algorithm for its exceptional performance and security:

| Property | SHA-256 | BLAKE3 |
|----------|---------|--------|
| Speed | ~500 MB/s | ~6 GB/s (10x faster) |
| Parallelism | Single-threaded | Multi-threaded |
| Security | Proven | Proven (BLAKE family) |
| Output Size | 32 bytes | 32 bytes |

#### Alternative Hash Algorithms

**SHA-256**
- Industry standard cryptographic hash
- Widely trusted and analyzed
- ~2x slower than BLAKE3
- Best for: Regulatory compliance, maximum compatibility

**SHA-3-256**
- Future-proof cryptographic construction
- Different algorithm family than SHA-2
- ~3x slower than BLAKE3
- Best for: Post-quantum security considerations

#### Hash Algorithm Selection

```rust
// Configure repository to use different hash algorithm
dits config core.hashAlgorithm sha256

// Available options: blake3, sha256, sha3-256
// Default: blake3 (recommended for performance)
```

All hash algorithms produce 256-bit (32-byte) outputs and provide cryptographic security guarantees.

#### Cryptographic Properties

- **Collision resistance:** Impossible to find two different inputs with same hash
- **Preimage resistance:** Given a hash, impossible to find input that produces it
- **Second preimage resistance:** Given input A, impossible to find input B with same hash

### Benefits of Content Addressing

1. **Automatic deduplication:** Identical content always has the same hash
2. **Data integrity:** If a chunk's hash doesn't match, you know it's corrupted
3. **Immutability:** You can't modify stored data without changing its address

## Manifest System

The manifest is Dits' authoritative record of a commit's file tree. It describes how to reconstruct files from chunks and stores rich metadata.

### What a Manifest Contains

Each manifest includes:
- All files in the repository at that commit
- File metadata (size, permissions, timestamps)
- Chunk references for reconstructing content
- Asset metadata (video dimensions, codec, duration)
- Directory structure for efficient browsing
- Dependency graphs for project files

### Manifest Data Structure

```rust
pub struct ManifestPayload {
    pub version: u8,                    // Format version
    pub repo_id: Uuid,                  // Repository identifier
    pub commit_hash: [u8; 32],          // This commit's hash
    pub parent_hash: Option<[u8; 32]>, // Parent commit (for diffs)

    pub entries: Vec<ManifestEntry>,    // All files
    pub directories: Vec<DirectoryEntry>, // Directory structure
    pub dependencies: Option<DependencyGraph>, // File relationships
    pub stats: ManifestStats,           // Aggregate statistics
}
```

### File Representation

Each file is represented as a manifest entry:

```rust
pub struct ManifestEntry {
    pub path: String,                  // Relative path
    pub size: u64,                     // File size in bytes
    pub content_hash: [u8; 32],        // Full file BLAKE3 hash
    pub chunks: Vec<ChunkRef>,         // How to reconstruct file

    // Rich metadata
    pub metadata: FileMetadata,        // MIME type, encoding, etc.
    pub asset_metadata: Option<AssetMetadata>, // Video/audio specifics
}
```

### Asset Metadata Extraction

For media files, Dits extracts rich metadata during chunking:

```rust
pub struct AssetMetadata {
    pub asset_type: AssetType,        // Video, Audio, Image
    pub duration_ms: Option<u64>,     // Playback duration
    pub width: Option<u32>,           // Video width
    pub height: Option<u32>,          // Video height
    pub video_codec: Option<String>,  // "h264", "prores", etc.
    pub audio_codec: Option<String>,  // "aac", "pcm", etc.

    // Camera metadata
    pub camera_metadata: Option<CameraMetadata>,
    pub thumbnail: Option<[u8; 32]>,  // Thumbnail chunk hash
}
```

## Hybrid Storage Architecture

Dits uses a **hybrid storage system** that intelligently chooses the optimal storage method for different types of files.

### Storage Engine Selection

Files are automatically routed to the appropriate storage engine:

| File Type | Storage Engine | Why |
|-----------|----------------|-----|
| Text (.txt, .md, .json, .rs) | libgit2 | Line-based diff, 3-way merge, blame |
| Binary (.mp4, .mov, .psd) | FastCDC | Content-defined chunks, deduplication |
| Hybrid (.prproj, .aep) | Both engines | Git for XML metadata, CDC for binary assets |

### Classification Logic

Dits classifies files using multiple signals:

1. **File extension:** `.mp4` → video, `.rs` → text
2. **Content analysis:** Binary patterns vs text patterns
3. **MIME type detection:** `video/mp4` → video container
4. **Size thresholds:** Large files (>1MB) → chunking

### Storage Classes

Beyond the storage engine, files can be assigned storage classes:

- **Hot:** Frequently accessed, fast storage (SSD)
- **Warm:** Occasionally accessed, slower storage (HDD)
- **Cold:** Archive storage (tape, cloud)
- **Glacier:** Long-term archive with retrieval delays

## Sync Protocol and Delta Efficiency

Dits uses a sophisticated sync protocol to minimize bandwidth usage.

### Have/Want Protocol

Instead of sending entire files, Dits negotiates what data is needed:

```
Local                           Remote
┌──────────┐                    ┌──────────┐
│ Chunks:  │                    │ Chunks:  │
│ A, B, C  │                    │ A, B     │
└──────────┘                    └──────────┘

Step 1: Query what remote has
        "Do you have A, B, C, D, E, F?"

Step 2: Remote responds with Bloom filter
        "I have A, B. Missing: C, D, E, F"

Step 3: Upload only missing chunks
        → Transfer C, D, E, F (not A, B!)
```

### Bloom Filter Optimization

Dits uses Bloom filters to efficiently represent what chunks exist:

- **Space efficient:** 1MB filter can represent millions of chunks
- **Fast queries:** Check if remote has a chunk in microseconds
- **False positives:** May say "has" when it doesn't (rare, handled gracefully)
- **No false negatives:** Never says "missing" when it exists

### Delta Sync Efficiency

**Traditional sync (Dropbox-style):**
- File changed → upload entire file
- 10 GB video, small edit → transfer 10 GB

**Dits delta sync:**
- File changed → identify changed chunks
- 10 GB video, small edit → transfer ~50 MB

### Real-World Bandwidth Savings

| Scenario | Raw Transfer | Dits Transfer | Savings |
|----------|--------------|---------------|---------|
| 5 versions of 10GB video | 50 GB | ~12 GB | 76% |
| Team of 10 sharing assets | 100 GB | ~15 GB | 85% |
| Daily backups | 50 GB/day | ~5 GB/day | 90% |

## Video-Aware Features

Video files have internal structure that Dits understands and optimizes for.

### Keyframe-Aligned Chunking

Video streams have keyframes (I-frames) that contain complete images:

```
Video stream:
[I]--[P]--[P]--[P]--[I]--[P]--[P]--[P]--[I]...
 ^                   ^                   ^
Keyframes (scene boundaries)
```

**Without keyframe alignment:**
- Different encodes of same footage → different chunks
- Poor deduplication

**With keyframe alignment:**
- Same scenes tend to create same chunks
- Better deduplication (20-30% improvement)

### Supported Video Formats

Dits parses and optimizes for:
- **MP4/M4V:** H.264, H.265/HEVC, ProRes
- **MOV:** Apple ProRes, DNxHD, Animation
- **MXF:** Broadcast formats (Sony XDCAM, Panasonic P2)
- **AVI, MKV:** Container formats

### Metadata Extraction

Dits extracts comprehensive metadata:
- **Technical:** Resolution, frame rate, codec, bitrate
- **Content:** Duration, aspect ratio, color space
- **Camera:** Make/model, lens, shutter speed, ISO
- **GPS:** Location data from camera
- **Timecode:** Embedded SMPTE timecode

## Deduplication in Action

### How Deduplication Works

Every chunk is identified by its BLAKE3 hash. If two chunks have identical content, they get identical hashes and are stored only once.

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
│   Chunk 1: abc123   │────────▶│ (same chunks!)      │
│   Chunk 2: def456   │────────▶│ (same chunks!)      │
│   Chunk 3: xyz999   │───┐     ├─────────────────────┤
│   ...               │   └────▶│ xyz999: [1.01 MB]   │
└─────────────────────┘         └─────────────────────┘
```

### Real-World Deduplication Scenarios

| Scenario | Raw Size | Deduplicated | Savings |
|----------|----------|--------------|---------|
| 5 versions of video (minor edits) | 50 GB | 12 GB | 76% |
| 100 similar photos (same shoot) | 50 GB | 8 GB | 84% |
| 10 game builds (iterative) | 100 GB | 18 GB | 82% |
| 20 PSD saves (same file) | 10 GB | 1.5 GB | 85% |

## Repository Structure

A Dits repository is stored in a `.dits` directory with this structure:

```
.dits/
├── HEAD                    # Current branch reference
├── config                  # Repository configuration
├── index                   # Staging area
├── objects/                # Content storage
│   ├── chunks/             # Deduplicated chunks (BLAKE3)
│   │   ├── ab/
│   │   │   └── c123...     # Chunk files
│   │   └── de/
│   │       └── f456...
│   ├── manifests/          # File manifests
│   └── commits/            # Commit objects
├── refs/                   # Branches and tags
│   ├── heads/
│   │   └── main
│   └── tags/
│       └── v1.0
└── logs/                   # Reference history
```

## Object Types

### Chunk
The fundamental unit of storage. A variable-size piece of file content, typically 32KB to 256KB.

### Manifest
Describes how to reconstruct a file from chunks. Contains:
- Ordered list of chunk hashes
- File metadata (size, permissions, timestamps)
- Asset metadata (for media files)

### Commit
A snapshot of the repository at a point in time:
- Tree (manifest) hash pointing to file state
- Parent commit hash(es)
- Author and committer information
- Commit message and timestamp

### Branch
A mutable reference to a commit. Makes it easy to work on different versions simultaneously.

### Tag
An immutable reference to a commit, typically used to mark releases or important versions.

## Security & Integrity

### Content Addressing Security

Every piece of data is identified by its cryptographic hash:

```
Content → BLAKE3 hash → Storage

If content changes by even 1 bit:
  → Completely different hash
  → Stored as new content
  → Tampering is detectable
```

### Verification Commands

```bash
# Verify entire repository integrity
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
- P2P uses AES-256-GCM encryption
- Keys derived from session-specific secrets

**At rest (optional):**
```bash
# Enable repository encryption
$ dits encrypt-init

# Files encrypted before storage
# Only you (with key) can decrypt
```

## Virtual Filesystem (VFS)

Dits can mount a repository as a virtual drive using FUSE. Files appear instantly but are only "hydrated" (chunks downloaded) when accessed.

### How VFS Works

```
User Application                     Dits VFS Layer
(Premiere, Blender, etc.)           ┌─────────────────────────────────────┐
                                    │ Is chunk in local cache?            │
                                    │   YES → Return immediately          │
                                    │   NO  → Fetch from remote, cache    │
                                    └──────────────────┬──────────────────┘
                                                       │
                    ┌──────────────────────────────────┴──────────────────────────────────┐
                    ▼                                                                       ▼
        ┌─────────────┐                                                       ┌─────────────┐
        │ Local Cache │                                                       │   Remote    │
        │  (fast SSD) │                                                       │   Server    │
        └─────────────┘                                                       └─────────────┘
```

### Cache Management

- **Location:** Configurable (default: `~/.dits/cache`)
- **Size:** Configurable (default: 100GB)
- **Policy:** LRU (Least Recently Used)
- **Prefetching:** Predicts and pre-downloads likely-needed chunks

## Performance Characteristics

### Throughput Benchmarks

| Operation | Performance | Notes |
|-----------|-------------|-------|
| **Streaming Chunking** | Unlimited | No memory limits, any file size |
| **Parallel Chunking** | 8+ GB/s | Multi-core processing |
| **Hashing (BLAKE3)** | 6 GB/s | Multi-threaded |
| **QUIC Transfer** | 1+ GB/s | 1000+ concurrent streams |
| **Multi-peer Download** | N × peer bandwidth | Linear scaling with peers |
| **Zero-copy I/O** | 99% CPU reduction | Memory-mapped operations |
| **Adaptive Transfer** | Auto-optimized | Self-tuning to network conditions |

### Download Performance Optimizations

Dits implements multiple optimizations to maximize download speeds and utilize full network capacity:

#### Streaming FastCDC
- **Problem:** Traditional chunking loads entire files into memory
- **Solution:** True streaming with 64KB sliding window
- **Result:** Process files of any size with constant memory usage

#### Parallel Processing
- **Multi-core chunking:** 3-4x speedup on modern CPUs
- **Parallel downloads:** Aggregate bandwidth from multiple peers
- **Concurrent transfers:** 1000+ simultaneous chunk downloads

#### High-Throughput QUIC
- **Concurrent streams:** 1000+ parallel transfers
- **Large flow windows:** 16MB buffers for high bandwidth
- **Connection pooling:** Reuse connections, eliminate handshakes
- **BBR congestion control:** Optimized for modern networks

#### Adaptive Chunk Sizing
- **Network-aware:** Adjusts chunk sizes based on bandwidth/latency
- **LAN (>1Gbps):** 8MB chunks for maximum throughput
- **Broadband (100Mbps):** 2MB chunks for balance
- **High latency:** 256KB chunks for responsiveness

#### Zero-Copy Operations
- **Memory mapping:** Direct file-to-network transfers
- **Reduced copying:** 50-70% less CPU overhead
- **Lower latency:** Faster data movement throughout pipeline

**Result:** Downloads now utilize 100% of available bandwidth with no software limitations, scaling linearly with the number of available peers.

### Memory Usage

- **Chunking:** ~8MB buffer for 256KB max chunks
- **Manifest loading:** Proportional to file count
- **Cache:** Configurable (default 100GB)

### Network Efficiency

- **Small changes:** <1% of file size transferred
- **Large changes:** Only changed chunks
- **New files:** Full transfer (but deduplicated against repo history)

## Comparison with Alternatives

### Git LFS

**Git LFS:**
```
Git Repository:          LFS Server:
┌─────────────┐          ┌─────────────┐
│ version 1   │ ──────▶  │ 10 GB file  │
│ (pointer)   │          ├─────────────┤
│ version 2   │ ──────▶  │ 10 GB file  │
│ (pointer)   │          │ (full copy) │
└─────────────┘          └─────────────┘
Total: 20 GB stored
```

**Dits:**
```
Dits Repository:
┌─────────────────────────────────────┐
│ Manifest: video.mp4 = [A,B,C,D,E]   │
│ Chunks: A,B,C,D,E (10 GB total)     │
│                                     │
│ Version 2: video.mp4 = [A,B,C,F,G]  │
│ Chunks: A,B,C,F,G (only F,G new)   │
└─────────────────────────────────────┘
Total: ~10.2 GB stored
```

### Key Differences

| Feature | Git LFS | Dits |
|---------|---------|------|
| Storage per version | Full copy | Changed chunks only |
| Diff capability | None | Chunk-level diff |
| Merge conflicts | Manual resolution | Explicit locking |
| Large file support | Basic | Video-optimized |
| Network efficiency | File-level | Chunk-level |

## Advanced Features

### P2P Sharing

Direct peer-to-peer file sharing without central server:

```
You (NYC)  ◀───────────────────────────────▶  Colleague (NYC)
                    Direct transfer
                    Same network/city

Total transferred: 10 GB (direct, deduplicated)
```

**Security:**
- AES-256-GCM encryption
- SPAKE2 key exchange
- BLAKE3 integrity verification

### Enterprise Features

- **Audit logging:** All operations logged for compliance
- **Access control:** Role-based permissions
- **Retention policies:** Automatic data lifecycle management
- **Replication:** Multi-site, multi-cloud redundancy

## Next Steps

- [Getting Started](../user-guide/getting-started.md) - Try Dits
- [CLI Reference](../reference/cli.md) - Complete command reference
- [Architecture Overview](../architecture/overview.md) - Technical deep dive
- [Performance Tuning](../operations/performance-tuning.md) - Optimize for your workflow




