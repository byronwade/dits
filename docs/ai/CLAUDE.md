# Dits - AI Assistant Guidelines

This document provides comprehensive context and guidelines for AI assistants working on the Dits codebase.

## Project Summary

**Dits** (Distributed Intelligent Transfer System) is a version control system purpose-built for video production workflows. It combines Git-like semantics with video-aware optimizations to handle large binary files efficiently.

### Core Innovations

1. **Hybrid Storage Engine**: Uses libgit2 for text files (line-based diff, 3-way merge, blame) and FastCDC for binary/media files (content-defined chunking, deduplication). Best of both worlds without reinventing Git's proven algorithms.

2. **Format-Aware Chunking**: Unlike Git's content-agnostic approach, Dits understands video container formats (MP4, MOV, MXF) and chunks at semantically meaningful boundaries (keyframes, atoms).

3. **Content-Addressable Deduplication**: Uses BLAKE3 hashing for fast, parallelizable content addressing. Similar footage across projects shares storage.

4. **Delta Sync over QUIC**: Only transfers missing chunks, using UDP-based QUIC for maximum bandwidth utilization.

5. **Virtual Filesystem**: Mount repositories as drives with JIT chunk fetching - no full download required.

6. **NLE Integration**: Deep integration with Premiere Pro, DaVinci Resolve, After Effects, and Final Cut Pro.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├──────────┬──────────┬──────────┬──────────┬────────────────────┤
│   CLI    │  GUI     │  SDK     │  VFS     │  NLE Plugins       │
│  (clap)  │ (Tauri)  │  (Rust)  │ (FUSE)   │ (Premiere/Resolve) │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────────┬───────────┘
     │          │          │          │              │
     └──────────┴──────────┴──────────┴──────────────┘
                           │
              ┌────────────▼────────────┐
              │      CORE ENGINE        │
              ├─────────────────────────┤
              │  • Hybrid Storage       │
              │    - libgit2 (text)     │
              │    - FastCDC (binary)   │
              │  • BLAKE3 Hashing       │
              │  • ISOBMFF Parsing      │
              │  • Manifest Management  │
              │  • Conflict Resolution  │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │    TRANSPORT LAYER      │
              ├─────────────────────────┤
              │  • QUIC (quinn)         │
              │  • Delta Sync           │
              │  • Bandwidth Estimation │
              │  • Resume/Retry         │
              └────────────┬────────────┘
                           │
     ┌─────────────────────┼─────────────────────┐
     ▼                     ▼                     ▼
┌─────────┐         ┌─────────────┐        ┌─────────┐
│  LOCAL  │         │   SERVER    │        │ STORAGE │
│ (.dits/)│         │   (Axum)    │        │  (S3)   │
└─────────┘         └──────┬──────┘        └─────────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    │  + Redis    │
                    └─────────────┘
```

---

## Hybrid Storage Architecture (Phase 3.6)

Dits uses a **hybrid storage model** that routes files to the appropriate engine:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FILE CLASSIFIER                           │
│                                                                  │
│   .txt, .md, .json, .rs, .py    →    libgit2 (Git storage)     │
│   .mp4, .mov, .psd, .blend      →    Dits CDC (Chunk storage)  │
│   .prproj, .aep, .drp           →    Hybrid (Git + CDC)        │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Strategy Decision

| File Type | Engine | Why |
|-----------|--------|-----|
| **Text** (.md, .json, .rs, .py) | libgit2 | Line-based diff, 3-way merge with conflict markers, blame support |
| **Binary** (.mp4, .mov, .psd) | Dits CDC | Content-defined chunking, keyframe alignment, deduplication |
| **NLE Projects** (.prproj, .drp) | Hybrid | Git for XML metadata, CDC for embedded assets |

### Key Benefits

1. **Text files get Git-quality merging**: Conflict markers (`<<<<<<<`) instead of "choose ours/theirs"
2. **Binary files get video-aware handling**: Keyframe alignment, efficient deduplication
3. **No reinvention**: Leverages 20+ years of Git refinement for text operations

### Implementation Notes

```rust
/// Storage strategy per file
pub enum StorageStrategy {
    GitText,    // → .dits/objects/git/ (SHA-1 addressed)
    DitsChunk,  // → .dits/objects/chunks/ (BLAKE3 addressed)
    Hybrid,     // → Both stores
}

/// File classification happens at add time
pub fn classify_file(path: &Path, content: &[u8]) -> StorageStrategy;
```

### Documentation

- **Full Specification**: `/docs/action-plan/phase3.6-hybrid-storage.md`
- **Architecture Details**: `/docs/architecture/hybrid-text-storage.md`
- **Storage Format**: `/docs/architecture/local-storage.md`

---

## Crate Structure

| Crate | Purpose | Key Dependencies |
|-------|---------|------------------|
| `dits-core` | Chunking, hashing, manifests, object model | `blake3`, `fastcdc` |
| `dits-parsers` | ISOBMFF, NLE project file parsing | `mp4`, `ffmpeg-next` |
| `dits-storage` | Local and remote storage backends | `aws-sdk-s3`, `sled` |
| `dits-protocol` | Wire protocol, serialization | `quinn`, `tokio`, `serde` |
| `dits-client` | CLI implementation | `clap`, `indicatif` |
| `dits-server` | REST API and QUIC server | `axum`, `sqlx`, `tower` |
| `dits-sdk` | Public Rust SDK | All above |

---

## Key Data Structures

### Chunk
```rust
pub struct Chunk {
    pub hash: Blake3Hash,      // 32-byte BLAKE3 hash
    pub size: u32,             // Uncompressed size
    pub offset: u64,           // Offset in original file
    pub compression: Option<Compression>,
}
```

### Asset
```rust
pub struct Asset {
    pub hash: Blake3Hash,      // Content hash of entire file
    pub size: u64,             // Total file size
    pub chunks: Vec<ChunkRef>, // Ordered list of chunks
    pub metadata: AssetMetadata, // Video dimensions, duration, codec
}
```

### Commit
```rust
pub struct Commit {
    pub hash: Blake3Hash,
    pub parents: Vec<Blake3Hash>,
    pub tree: Blake3Hash,      // Manifest hash
    pub author: Signature,
    pub committer: Signature,
    pub message: String,
    pub timestamp: DateTime<Utc>,
}
```

### Manifest
```rust
pub struct Manifest {
    pub entries: BTreeMap<PathBuf, ManifestEntry>,
}

pub struct ManifestEntry {
    pub asset_hash: Blake3Hash,
    pub mode: FileMode,
    pub size: u64,
    pub executable: bool,
}
```

---

## Critical Algorithms

### FastCDC (Content-Defined Chunking)

```rust
// Parameters optimized for video
const MIN_CHUNK_SIZE: usize = 256 * 1024;     // 256 KB
const AVG_CHUNK_SIZE: usize = 1 * 1024 * 1024; // 1 MB
const MAX_CHUNK_SIZE: usize = 4 * 1024 * 1024; // 4 MB

// Rolling hash to find chunk boundaries
fn find_boundary(data: &[u8], mask: u64) -> Option<usize> {
    let mut hash = 0u64;
    for (i, &byte) in data.iter().enumerate() {
        hash = hash.rotate_left(1) ^ GEAR_TABLE[byte as usize];
        if i >= MIN_CHUNK_SIZE && (hash & mask) == 0 {
            return Some(i);
        }
    }
    None
}
```

### Keyframe Alignment

For video files, align chunk boundaries to I-frames when possible:

```rust
fn align_to_keyframe(boundary: usize, keyframes: &[usize], tolerance: usize) -> usize {
    // Find nearest keyframe within tolerance
    keyframes
        .iter()
        .filter(|&&kf| kf.abs_diff(boundary) <= tolerance)
        .min_by_key(|&&kf| kf.abs_diff(boundary))
        .copied()
        .unwrap_or(boundary)
}
```

### ISOBMFF Parsing

MP4/MOV files have a box (atom) structure:

```
ftyp  - File type declaration
moov  - Metadata container (must parse carefully)
├── mvhd - Movie header
├── trak - Track container
│   ├── tkhd - Track header
│   ├── mdia - Media container
│   │   ├── mdhd - Media header
│   │   ├── hdlr - Handler
│   │   └── minf - Media information
│   │       └── stbl - Sample table (keyframe info here!)
│   │           ├── stss - Sync samples (keyframes)
│   │           ├── stts - Time-to-sample
│   │           └── stsc - Sample-to-chunk
mdat  - Actual media data (chunk this, not moov!)
```

**Critical**: Never chunk through the `moov` atom - it must remain intact for the file to be playable.

---

## Known Issues and Solutions

We have identified **115 potential issues** across the codebase. Key categories:

### Critical (P0) - Must Fix Before Production

1. **STOR-C1**: Missing checksum verification on reads
   - **Solution**: Always verify BLAKE3 hash after reading chunks

2. **STOR-C2**: Race condition in reference counting
   - **Solution**: Use PostgreSQL advisory locks

3. **SEC-C2**: Deterministic nonces break AEAD security
   - **Solution**: Use content hash + random component for nonces

4. **NET-C1**: No network partition detection
   - **Solution**: Implement quorum-based partition detector

5. **CONC-C1**: Redis-PostgreSQL lock sync race
   - **Solution**: Use PostgreSQL as authoritative, Redis as cache

### High Priority (P1)

6. **VID-H1**: Variable frame rate handling
7. **VID-H2**: HDR metadata preservation
8. **NET-H2**: Missing idempotency keys
9. **OPS-C1**: Manual database failover

See `/docs/architecture/known-issues-and-solutions.md` for complete list.

---

## Code Patterns to Follow

### Error Handling

```rust
// Library code: Use thiserror
#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("Chunk not found: {hash}")]
    NotFound { hash: String },

    #[error("Checksum mismatch for {hash}: expected {expected}, got {actual}")]
    ChecksumMismatch {
        hash: String,
        expected: String,
        actual: String,
    },

    #[error("Storage backend error: {0}")]
    Backend(#[from] std::io::Error),
}

// Application code: Use anyhow with context
use anyhow::{Context, Result};

fn process_file(path: &Path) -> Result<()> {
    let data = fs::read(path)
        .with_context(|| format!("Failed to read file: {}", path.display()))?;
    // ...
}
```

### Async Patterns

```rust
// Prefer structured concurrency
async fn upload_all(chunks: Vec<Chunk>) -> Result<()> {
    let results: Vec<Result<_>> = stream::iter(chunks)
        .map(|chunk| async move { upload_chunk(chunk).await })
        .buffer_unordered(8)  // Max 8 concurrent uploads
        .collect()
        .await;

    // Check all results
    for result in results {
        result?;
    }
    Ok(())
}

// Use timeouts on all external calls
async fn fetch_with_timeout(url: &str) -> Result<Response> {
    tokio::time::timeout(
        Duration::from_secs(30),
        reqwest::get(url)
    )
    .await
    .context("Request timed out")?
    .context("Request failed")
}
```

### Database Access

```rust
// Use transactions for multi-step operations
async fn create_commit(pool: &PgPool, commit: NewCommit) -> Result<Commit> {
    let mut tx = pool.begin().await?;

    // Insert commit
    let commit = sqlx::query_as!(Commit, "INSERT INTO commits ...")
        .fetch_one(&mut *tx)
        .await?;

    // Update references atomically
    for chunk in &commit.chunks {
        sqlx::query!("SELECT increment_chunk_ref($1)", chunk.hash)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;
    Ok(commit)
}
```

### Logging

```rust
use tracing::{info, warn, error, instrument};

#[instrument(skip(pool), fields(repo_id = %repo_id))]
async fn push_changes(pool: &PgPool, repo_id: Uuid) -> Result<PushResult> {
    info!("Starting push");

    let chunks = get_pending_chunks(repo_id).await?;
    info!(chunk_count = chunks.len(), "Found chunks to upload");

    for chunk in chunks {
        if let Err(e) = upload_chunk(&chunk).await {
            warn!(chunk_hash = %chunk.hash, error = %e, "Chunk upload failed, will retry");
        }
    }

    info!("Push completed");
    Ok(result)
}
```

---

## Testing Requirements

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunk_determinism() {
        // Same input must produce same chunks
        let data = include_bytes!("../fixtures/sample.bin");
        let chunks1 = chunk_data(data);
        let chunks2 = chunk_data(data);

        assert_eq!(chunks1.len(), chunks2.len());
        for (c1, c2) in chunks1.iter().zip(chunks2.iter()) {
            assert_eq!(c1.hash, c2.hash);
        }
    }

    #[test]
    fn test_reconstruction() {
        // Chunks must reconstruct original exactly
        let original = include_bytes!("../fixtures/sample.bin");
        let chunks = chunk_data(original);
        let reconstructed: Vec<u8> = chunks
            .iter()
            .flat_map(|c| c.data.iter().copied())
            .collect();

        assert_eq!(original.as_slice(), reconstructed.as_slice());
    }
}
```

### Integration Tests

```rust
#[tokio::test]
async fn test_end_to_end_workflow() {
    let server = TestServer::start().await;
    let client = server.client();

    // Create repo
    let repo = client.create_repo("test-project").await.unwrap();

    // Add file
    let video = generate_test_video(10 * 1024 * 1024); // 10MB
    client.add(&repo, "video.mp4", &video).await.unwrap();

    // Commit
    client.commit(&repo, "Add video").await.unwrap();

    // Push
    let push_result = client.push(&repo).await.unwrap();
    assert!(push_result.chunks_uploaded > 0);

    // Clone to new location
    let cloned = client.clone(&repo.url, "./cloned").await.unwrap();

    // Verify content
    let content = fs::read("./cloned/video.mp4").unwrap();
    assert_eq!(video, content);
}
```

---

## Security Considerations

### Authentication

- JWT tokens with RS256 signing
- Refresh tokens stored in HttpOnly cookies
- Session binding to client fingerprint
- MFA support with TOTP

### Authorization

- Repository-level permissions (admin, write, read)
- Team-based access control
- Permission checks at every resource access
- Audit logging for sensitive operations

### Encryption

- Convergent encryption for deduplication (with per-repo salt)
- AES-256-GCM for chunk encryption
- Key hierarchy: Master → Region → Repo → Chunk
- Argon2id for key derivation

### Input Validation

```rust
// Always validate at boundaries
fn validate_path(path: &str) -> Result<PathBuf> {
    let path = PathBuf::from(path);

    // No path traversal
    if path.components().any(|c| c == Component::ParentDir) {
        return Err(ValidationError::PathTraversal);
    }

    // No absolute paths from client
    if path.is_absolute() {
        return Err(ValidationError::AbsolutePath);
    }

    // Reasonable length
    if path.as_os_str().len() > 4096 {
        return Err(ValidationError::PathTooLong);
    }

    Ok(path)
}
```

---

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/issue-123` - Bug fixes
- `docs/topic` - Documentation
- `refactor/area` - Refactoring

### Commit Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

### Pull Request Checklist

- [ ] Tests pass (`cargo test`)
- [ ] No clippy warnings (`cargo clippy`)
- [ ] Formatted (`cargo fmt`)
- [ ] Documentation updated
- [ ] Changelog entry added
- [ ] Security review (if auth/crypto changes)

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Chunk 1GB file | < 5 seconds | With keyframe alignment |
| Hash 1GB | < 1 second | BLAKE3 parallelized |
| Upload (local) | > 500 MB/s | To local storage |
| Upload (WAN) | Saturate link | Adaptive chunk scheduling |
| Clone 10GB repo | < 2 minutes | On 1 Gbps connection |
| Status check | < 100ms | Cached index |
| VFS file open | < 50ms | Prefetched metadata |

---

## Documentation Map

### Architecture
- `/docs/architecture/overview.md` - High-level design
- `/docs/architecture/master-architecture.md` - Detailed architecture
- `/docs/architecture/hybrid-text-storage.md` - Git/Dits hybrid storage spec
- `/docs/architecture/local-storage.md` - .dits/ directory format
- `/docs/architecture/merge-conflicts.md` - Merge strategy by file type
- `/docs/architecture/known-issues-and-solutions.md` - Issue registry
- `/docs/architecture/edge-cases-failure-modes.md` - Failure handling
- `/docs/architecture/implementation-safety-checklist.md` - Safety checks

### Implementation Phases
- `/docs/action-plan/phase3.6-hybrid-storage.md` - **Next Priority**: Git+Dits integration
- `/docs/roadmap/phases.md` - Full engineering roadmap

### Algorithms
- `/docs/algorithms/fastcdc.md` - Chunking algorithm (binary files only)
- `/docs/algorithms/keyframe-alignment.md` - Video-aware chunking
- `/docs/data-structures/diff.md` - Hybrid diff system (libgit2 + chunk diff)
- `/docs/parsers/isobmff.md` - MP4 parsing
- `/docs/parsers/nle-parsers.md` - Premiere/Resolve parsing
- `/docs/database/schema.md` - PostgreSQL schema

### Operations
- `/docs/deployment/kubernetes.md` - K8s deployment
- `/docs/operations/monitoring.md` - Metrics and alerting
- `/docs/operations/backup-restore.md` - Backup procedures
- `/docs/operations/runbooks/` - Incident response

### API
- `/docs/api/rest-api.md` - HTTP API reference
- `/docs/api/wire-protocol.md` - QUIC protocol
- `/docs/api/webhooks.md` - Webhook events
- `/docs/sdks/rust-sdk.md` - Rust SDK guide

---

## Quick Reference Commands

```bash
# Development
cargo build                    # Build all crates
cargo test                     # Run tests
cargo clippy                   # Lint
cargo fmt                      # Format
cargo doc --open               # Generate docs

# Testing specific crate
cargo test -p dits-core
cargo test -p dits-parsers

# Run server locally
docker-compose up -d postgres redis
cargo run --bin dits-server

# Run CLI
cargo run --bin dits -- init
cargo run --bin dits -- add .
cargo run --bin dits -- commit -m "message"

# Benchmarks
cargo bench
```

---

## Contact

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Discord**: #dev channel
- **Email**: dev@dits.io
