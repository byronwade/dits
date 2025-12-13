# Hybrid Architecture: Universal Deduplication + File-Type Awareness

This document describes the "Gold Standard" architecture for Dits - a media version control system designed for 100+ editor teams without exploding bandwidth.

---

## Philosophy

**Stop trying to force Video, 3D, and Code into the same box.**

The architecture combines:
1. **Universal Binary Deduplication** - Works on ANY file type
2. **File-Type Awareness** - Industry-specific optimizations

This solves 80% of storage problems immediately, then applies smart logic for the remaining 20%.

---

## Layer 1: The Universal Bucket (Foundation)

**Technology:** Rust + FastCDC + BLAKE3

Before looking at file types, this engine runs on EVERYTHING:

### Ingest Pipeline
```
File → FastCDC Chunker → BLAKE3 Hash → Content-Addressable Store
```

1. **Break** every file (Video, EXE, PSD, ZIP) into variable chunks based on binary patterns
2. **Hash** each chunk with BLAKE3 (32-byte content address)
3. **Store** chunks by hash - duplicates are physically impossible
4. **Track** the "recipe" (manifest) that describes how to reassemble the file

### Key Behaviors

| Operation | What Happens | Bytes Transferred |
|-----------|--------------|-------------------|
| Move file A→B | Hashes match | **0 bytes** |
| Copy file | Hashes match | **0 bytes** |
| Trim video start | Only start chunks change | **~5% of file** |
| Append to file | Only new chunks added | **Size of append** |
| Small edit in middle | ~1-3 chunks change | **~200KB** |

### Chunk Configuration

```rust
pub struct ChunkConfig {
    min_size: usize,    // 16KB - prevent tiny chunks
    avg_size: usize,    // 64KB - target size
    max_size: usize,    // 256KB - limit memory usage
}

// Presets
impl ChunkConfig {
    fn video() -> Self;       // 64KB avg for large media
    fn project() -> Self;     // 8KB avg for project files
    fn small_file() -> Self;  // 4KB avg for configs
}
```

---

## Layer 2: Content-Addressable Store (CAS)

All chunks live in a flat hash-addressed store:

```
.dits/
├── objects/
│   ├── a7/
│   │   └── b9c3d4e5f6...  (chunk data)
│   ├── f2/
│   │   └── 1a2b3c4d5e...  (chunk data)
│   └── ...
├── manifests/
│   └── {commit_hash}.json
└── refs/
    ├── HEAD
    └── branches/
        └── main
```

### Object Storage Rules
1. Objects are immutable - write once, never modify
2. Objects are named by their content hash (content-addressable)
3. Duplicates are impossible - same content = same hash = same file
4. Reference counting for garbage collection

---

## Layer 3: Manifest-Based Versioning (DAG)

We version the **recipe**, not the file.

```rust
struct Manifest {
    version: u8,
    file_path: String,
    file_size: u64,
    file_hash: Hash,        // Hash of complete reconstructed file
    chunks: Vec<ChunkRef>,
    metadata: FileMetadata,
}

struct ChunkRef {
    hash: Hash,             // Points to object in CAS
    offset: u64,            // Position in reconstructed file
    size: u32,              // Chunk size
}

struct Commit {
    hash: Hash,
    parent: Option<Hash>,
    author: String,
    timestamp: u64,
    message: String,
    manifests: Vec<ManifestRef>,  // Files in this commit
}
```

### Why Manifests Matter
- A 10GB video is represented by a ~50KB manifest
- Comparing versions = comparing manifest hashes
- Syncing = exchanging manifests, then fetching missing chunks

---

## Layer 4: Have/Want Sync Protocol

Minimal bandwidth sync between client and server:

```
CLIENT                              SERVER
   |                                   |
   |-- "I have chunks: [a,b,c,d]" ---> |
   |                                   |
   |<-- "I need: [c,d], you need: [x]" |
   |                                   |
   |-- Push chunks [c,d] -----------> |
   |<-- Pull chunk [x] --------------- |
   |                                   |
```

### Bloom Filter Optimization
```rust
// Client sends compressed "have" set
let bloom = BloomFilter::from_hashes(&local_chunks);
let bloom_bytes = bloom.serialize();  // ~1KB for 10,000 chunks

// Server checks what's missing
let missing = server_chunks
    .iter()
    .filter(|h| !bloom.probably_contains(h))
    .collect();
```

---

## Layer 5: Industry-Specific Logic (The Smart Layer)

### For Video Editors (Premiere, Resolve, After Effects)

**Problem:** Visual edits (color/VFX) change every byte, breaking deduplication.

**Solution: Proxy & Project Workflow**

```
┌─────────────────────────────────────────────────────────┐
│  SOURCE FOOTAGE (8K RAW)                                │
│  ├── Immutable - downloaded once                        │
│  ├── Never pushed back                                  │
│  └── Stored on shared/cloud storage                     │
├─────────────────────────────────────────────────────────┤
│  PROXY (1080p)                                          │
│  ├── Auto-generated locally                             │
│  └── Lightweight editing copy                           │
├─────────────────────────────────────────────────────────┤
│  PROJECT FILE (.prproj, .drp, .xml)                     │
│  ├── This is what we version!                           │
│  ├── ~50KB-5MB (instructions, not pixels)               │
│  └── Links to source via relative paths                 │
└─────────────────────────────────────────────────────────┘
```

**100-Person Workflow:**
1. Editor A pushes a change → 50KB XML + maybe 50MB VFX asset
2. Editor B pulls → Gets XML instantly
3. Local FUSE drive relinks XML to their local source copy
4. **Result:** Simulating "editing video" while versioning instructions

### For Game Developers (Unreal, Unity)

**Problem:** Binary files (.uasset, .prefab) can't be merged.

**Solution: File Locking + CDC**

```rust
struct LockManager {
    locks: HashMap<PathBuf, Lock>,
}

struct Lock {
    owner: UserId,
    acquired_at: Timestamp,
    file_path: PathBuf,
    lock_type: LockType,  // Exclusive | Shared
}

impl LockManager {
    fn acquire(&mut self, path: &Path, user: UserId) -> Result<Lock>;
    fn release(&mut self, lock: Lock) -> Result<()>;
    fn is_locked(&self, path: &Path) -> Option<&Lock>;
}
```

**UX Integration:**
- User A opens `Level_01.umap` → Lock acquired, server notified
- User B sees "Read Only" icon on that file
- On close/push, lock released

**Why CDC still helps:**
- Game textures often have small header/metadata changes
- CDC isolates these changes effectively
- 4GB asset pack moved? 0 bytes uploaded

### For 3D Artists (Blender, Maya, C4D)

**Problem:** Huge .blend/.c4d files containing model + textures + cache.

**Solution: Reference Workflow Encouragement**

```
Recommended:                    Not Recommended:
project/                        project/
├── models/                     └── scene.blend (500MB blob)
│   └── character.blend (10MB)      ├── embedded texture1
├── textures/                       ├── embedded texture2
│   ├── skin.png (50MB)             └── embedded simulation
│   └── cloth.png (20MB)
└── scene.blend (5MB)
    └── links to external files
```

**Dits detects and advises:**
```
Warning: scene.blend contains 3 embedded textures (450MB)
  Tip: Extract to external files for better deduplication
  Run: dits extract-assets scene.blend
```

### For Photographers (Photoshop, Lightroom)

**Problem:** PSD layers - changing bottom layer changes composite bytes.

**Solution: Layered Previewing + CDC**

- CDC handles uncompressed TIFFs/PSDs reasonably well
- Build previewer that reads "Composite Image" from PSD header
- Users can see changes without opening Photoshop

---

## Layer 6: Virtual Filesystem (FUSE)

The "magic" that ties everything together.

### The Phantom Drive

```
User sees:              Reality:
Z:\ (10TB project)      500GB SSD
├── footage/            ├── .dits/objects/ (cached chunks)
│   └── raw_8k.mov      └── .dits/manifests/
├── exports/
└── project.prproj
```

### On-Demand Hydration

```rust
impl FuseHandler {
    fn read(&self, path: &Path, offset: u64, size: u64) -> Result<Vec<u8>> {
        let manifest = self.get_manifest(path)?;
        let chunks = manifest.chunks_for_range(offset, size);

        let mut data = Vec::new();
        for chunk_ref in chunks {
            let chunk_data = self.get_chunk(&chunk_ref.hash)?;
            data.extend_from_slice(&chunk_data);
        }
        Ok(data)
    }

    fn get_chunk(&self, hash: &Hash) -> Result<Vec<u8>> {
        // L1: RAM cache (moka)
        if let Some(data) = self.ram_cache.get(hash) {
            return Ok(data);
        }

        // L2: Local disk cache
        if let Some(data) = self.disk_cache.get(hash)? {
            self.ram_cache.insert(hash, data.clone());
            return Ok(data);
        }

        // L3: Remote fetch (stream like YouTube)
        let data = self.remote.fetch_chunk(hash)?;
        self.disk_cache.put(hash, &data)?;
        self.ram_cache.insert(hash, data.clone());
        Ok(data)
    }
}
```

### Partial Clone (Ghost Files)

```bash
# Clone repo metadata only
dits clone --filter=none https://server/project

# User sees 500GB of files, but has 0 bytes locally
# Files appear as "ghosts" - visible but empty

# Explicitly fetch what you need
dits fetch Level_3/  # Downloads just this folder

# Or just open a file - it streams on demand
open footage/scene_01.mov  # Streams chunks as VLC reads
```

---

## Implementation Checklist

### Phase 1: Universal Bucket (Current Focus)

- [ ] FastCDC chunker with configurable sizes
- [ ] BLAKE3 hashing
- [ ] Content-addressable object store
- [ ] Manifest format (JSON for now, bincode later)
- [ ] Basic CLI: `init`, `add`, `commit`, `checkout`

### Phase 2: Sync Protocol

- [ ] Have/Want chunk negotiation
- [ ] Bloom filter optimization
- [ ] QUIC transport layer
- [ ] Remote push/pull

### Phase 3: Virtual Filesystem

- [ ] FUSE mount (Unix)
- [ ] WinFSP mount (Windows)
- [ ] Read-through caching
- [ ] On-demand hydration

### Phase 4: Industry Logic

- [ ] File type detection
- [ ] Lock manager for binary files
- [ ] Project file parsing (Premiere, Resolve)
- [ ] Reference workflow tooling

---

## Architecture Summary

| Component | Technology | Role |
|-----------|------------|------|
| **Chunking Engine** | Rust + FastCDC | Break ANY file into content-defined blocks |
| **Hashing** | BLAKE3 | 32-byte content addresses, 2+ GB/s |
| **Storage** | Content-Addressable Store | `/objects/{hash[0..2]}/{hash}` |
| **Versioning** | DAG of Manifests | Track recipes, not files |
| **Sync** | Have/Want + Bloom | Minimal bandwidth negotiation |
| **Virtualization** | FUSE / WinFSP | Show files without downloading |
| **Locking** | Redis / Real-time DB | Prevent binary conflicts |
| **Transport** | QUIC (quinn) | UDP-based, survives drops |

---

## What We're NOT Building

1. **Video compositor** - Let Premiere/Resolve do their job
2. **AI compression** - Codecs already optimized for 40 years
3. **Frame-level storage** - GOP segmentation already provides granularity
4. **Custom merge algorithms** - Binary files don't merge; use locks

---

## Migration from Phase 3 (GOP Segmentation)

The GOP segmentation work is **not wasted** - it becomes an optional layer:

```
Universal Layer (always):
  File → FastCDC → Chunks → Store

Optional Video Layer:
  Video → GOP Segment → Each segment → FastCDC → Chunks → Store
```

For videos where users want segment-level control (e.g., editing specific GOPs), they can:
1. `dits segment video.mp4` → Creates segment directory
2. Edit individual segments
3. `dits add segments/` → Each segment chunked independently
4. `dits assemble segments/ → video.mp4` → Reconstruct

But for most workflows, **raw FastCDC on the video file** is sufficient:
- Trim operations: Only affected chunks change
- Append operations: Only new chunks added
- No re-encoding: Perfect dedup
