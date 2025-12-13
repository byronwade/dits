# Master System Architecture (v1.0)

Unified blueprint for Dits: structure-aware, deduplicating version control for video across 8 phases.

---

## 1. System Context
- Client (edge): heavy compute—parsing, chunking, hashing, encryption.
- Server (control plane): coordination—auth, metadata, locking.
- Storage (data plane): object store (S3) with immutable chunks.

---

## 2. Client Architecture (Agent)
Rust daemon + CLI.

Layered stack:
- Interface: `dits-cli` (`clap`) — commands (`init`, `commit`, `checkout`).
- Virtualization: `dits-vfs` (`fuser`/`winfsp`) — mounts drive, intercepts I/O.
- Processing: `dits-core` (`fastcdc`, `blake3`) — CDC + hashing.
- Parsers: `dits-parser` (`mp4`, `quick-xml`) — atom exploder + project deps.
- State: `dits-db` (`sled`) — local index/staging/cache map.
- Transport: `dits-net` (`quinn`) — QUIC parallel encrypted transfer.

Ingest pipeline (write path):
1) Identify type → project parser (Phase 7) or atom splitter (Phase 2) or generic chunker.  
2) Atom splitter: extract `moov` → AssetBlob; stream `mdat` to chunker.  
3) Chunker (FastCDC ~64KB), hash with BLAKE3.  
4) Dedup: check sled; check server Bloom filter.  
5) Write: new chunks to `.dits/objects`; structure to `.dits/index`.

---

## 3. Server Architecture (Coordinator)
Rust Axum API, stateless; k8s/serverless deploy.

Services:
- API gateway (Axum): metadata ops (`commit_push`, `get_manifest`).
- Lock manager (Redis): Redlock-based atomic locks.
- Transport node (Quinn): UDP chunk ingress.
- Lifecycle reaper (cron): moves cold chunks (Phase 8).
- Worker fleet (Celery/Faktory queues): `transcode_jobs`, `verify_integrity`.

PostgreSQL schema (sketch):
- `repositories(id, name, owner_id, storage_bucket)`
- `commits(hash, repo_id, parent_hash, author_id, message, created_at, manifest_blob JSONB)`
- `assets(hash, size, mime_type, variants JSONB)`
- `chunks(hash, size, ref_count, storage_class, last_accessed)`

---

## 4. Virtual File System (VFS) Logic
Read interceptor:
1) Map handle → manifest.  
2) Compute chunk covering offset.  
3) L1 RAM (`moka`) → L2 disk (`.dits/objects`) → L3 QUIC fetch with prefetch.  
4) Return requested range.

Write overlay (CoW):
- Immutable base untouched.  
- Staging sparse file `.dits/staging/{inode}` for writes.  
- Reads consult staging first.  
- `dits add` merges and rechunks.

---

## 5. Storage & Network Layer
Object store layout: `v1/objects/{hash[0..2]}/{rest}` (e.g., `a1/b2c3...`).  
Compression: Zstd before encryption.

Encryption (convergent):
- `Key = HMAC(User_Secret, Chunk_Content)` enables dedup while preserving confidentiality.  
- Keys wrapped by project master key and stored in metadata DB.

---

## 6. Safety & Conflict
Distributed locking via Redis Lua/Redlock; client enforces read-only (0444) on lock failure.

---

## 7. Deployment / DevOps
Containers: `dits-server` (Alpine + Rust), `dits-worker` (Ubuntu + FFmpeg + Rust), managed Postgres (RDS), Redis (ElastiCache).  
Scaling: stateless API horizontal; presigned URLs for client→S3 direct uploads to offload bandwidth.

---

## 8. Data Formats
Manifest (`.ditsm`, bincode):
```rust
struct Manifest {
    version: u8,
    file_path: String,
    permissions: u32,
    structure: VideoStructure,
    chunks: Vec<ChunkEntry>,
    dependencies: Vec<AssetID>,
}

struct ChunkEntry {
    hash: [u8; 32],
    compressed_size: u32,
    original_size: u32,
    is_keyframe: bool,
}
```

---

## Summary of USPs
1) Format-aware parsing avoids MP4 corruption.  
2) Virtual hydration opens 10TB repos on a laptop.  
3) QUIC-based transport survives drops.  
4) Lifecycle reaper makes petabyte storage economical.


