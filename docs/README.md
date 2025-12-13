# Dits Documentation Hub

This folder captures the Dits Master Specification in a navigable structure. Use the links below to explore architecture, tech stack, data structures, roadmap, workflows, and the immediate execution plan.

---

## Implementation Status

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 1 | Engine | ✅ Complete | Local chunking, deduplication, commit/checkout |
| 2 | Atom Exploder | ✅ Complete | MP4/ISOBMFF structure-aware parsing |
| 3 | Virtual File System | ✅ Complete | FUSE mount for on-demand hydration |
| 3.5 | Git Parity | ✅ Complete | Branching, tags, diff, merge, stash, config |
| 4 | POC & Introspection | ✅ Complete | Dedup stats, inspect-file, repo-stats |
| 4b | Network Sync | 🚧 Planned | QUIC delta sync, push/pull |
| 5 | Conflict & Locking | 🚧 Planned | Binary locks, visual diff |
| 6 | Hologram Layer | 🚧 Planned | Proxy-based editing |
| 7 | Dependency Graph | 🚧 Planned | Project file parsing |
| 8 | Deep Freeze | 🚧 Planned | Tiered storage lifecycle |
| 9 | Black Box | 🚧 Planned | Client-side encryption |

**Current CLI Commands:**
- ✅ Implemented: `init`, `add`, `status`, `commit`, `log`, `checkout`, `branch`, `switch`, `diff`, `tag`, `merge`, `reset`, `restore`, `config`, `stash`, `mount`, `unmount`, `inspect`, `inspect-file`, `repo-stats`, `segment`, `assemble`, `roundtrip`, `cache-stats`
- 🚧 Planned: `clone`, `push`, `pull`, `fetch`, `sync`, `remote`, `lock`, `unlock`, `gc`, `fsck`, `auth`

---

## Quick Start

```bash
# Initialize a repository
dits init

# Add and commit files
dits add video.mp4
dits commit -m "Initial version"

# View history and status
dits log
dits status

# Branch and merge
dits branch feature
dits switch feature
dits merge main

# Mount as virtual filesystem (read-only access)
dits mount /mnt/dits
```

---

## Core Architecture

- **[Hybrid Architecture](architecture/hybrid-architecture.md)** - The "Gold Standard" design: Universal Deduplication + File-Type Awareness
- [Architecture Overview](architecture/overview.md)
- [Master Architecture](architecture/master-architecture.md)
- [Open Problems & Solutions](architecture/open-problems-solutions.md) - Detailed solutions for 40 research questions
- [Tech Stack](tech-stack.md)

---

## Data Structures

- [Chunk](data-structures/chunk.md) - Content-addressed binary pieces
- [Asset](data-structures/asset.md) - File metadata and manifest
- [Commit](data-structures/commit.md) - Snapshot with parent pointers
- [Branch](data-structures/branch.md) - Mutable ref to commit
- [Tag](data-structures/tag.md) - Immutable ref to commit
- [Diff](data-structures/diff.md) - Change representation
- [Lock](data-structures/lock.md) - Binary file locking (Phase 5)
- [Config](data-structures/config.md) - Repository configuration

---

## User Guide

- [CLI Reference](user-guide/cli-reference.md) - Complete command documentation
- [Getting Started](user-guide/getting-started.md) - First steps with Dits

---

## Roadmap & Action Plans

- [Roadmap Overview](roadmap/phases.md) - 9-phase development plan

### Completed Phases
- [Phase 1: Engine](action-plan/phase1.md) - Local chunking and deduplication
- [Phase 2: Atom Exploder](action-plan/phase2.md) - MP4 structure awareness
- [Phase 3: Virtual File System](action-plan/phase3.md) - FUSE mounting
- [Phase 3.5: Git Parity](action-plan/phase3.5-git-parity.md) - Branching, tags, merge, stash

### Planned Phases
- [Phase 4: Collaboration & Sync](action-plan/phase4.md) - QUIC transport, push/pull
- [Phase 5: Conflict & Locking](action-plan/phase5.md) - Binary locks
- [Phase 6: Hologram Layer](action-plan/phase6.md) - Proxy editing
- [Phase 7: Dependency Graph](action-plan/phase7.md) - Project file parsing
- [Phase 8: Deep Freeze](action-plan/phase8.md) - Tiered storage
- [Phase 9: Black Box](action-plan/phase9.md) - Client-side encryption

---

## Workflows

- [Quick Fix Workflow](workflows/quick-fix.md) - Fast iteration pattern

---

## API & Formats

- [Manifest Format](formats/manifest.md) - File reconstruction recipe
- [Index Format](formats/index.md) - Staging area structure
- [Wire Protocol](api/wire-protocol.md) - QUIC transport frames

---

## Performance

Dits is engineered for maximum throughput with large media files. Our performance documentation covers:

### Benchmarks & Metrics
- **[Performance Benchmarks](performance/benchmarks.md)** - Comprehensive benchmark results and advanced optimization techniques
  - SIMD acceleration (AVX2, AVX-512, ARM NEON)
  - Zero-copy I/O operations
  - Memory pool allocation
  - io_uring async I/O
  - Hardware-specific tuning

### Algorithm Optimizations
- **[FastCDC Chunking](algorithms/fastcdc.md)** - Content-defined chunking with SIMD acceleration
  - AVX2/AVX-512 implementations for x86_64
  - ARM NEON/Apple Silicon optimizations
  - Zero-copy mmap chunking
  - Rayon parallel processing
- **[Delta Sync](algorithms/delta-sync.md)** - Efficient transfer with minimal data movement
  - Zero-copy networking with buffer pools
  - Pipelined transfers with backpressure
  - Speculative prefetching
  - Bandwidth estimation and adaptive scheduling

### Network Performance
- **[QUIC Protocol](architecture/quic-protocol.md)** - High-performance transport layer
  - BBR/CUBIC congestion control
  - Multi-path QUIC (experimental)
  - Connection pooling
  - Zero-copy splice operations
  - Profile configs: high-throughput, low-latency, satellite

### Production Tuning
- **[Performance Tuning Guide](operations/performance-tuning.md)** - Comprehensive production optimization
  - Linux io_uring configuration
  - Direct I/O and memory-mapped stores
  - NUMA-aware memory allocation
  - Lock-free data structures
  - Database batch operations
  - Storage device tuning (NVMe, SSD, HDD)
  - Network interface optimization

### Performance Targets

| Operation | Target | Conditions |
|-----------|--------|------------|
| Chunk 1GB file | < 2s | SIMD + parallel |
| BLAKE3 hash 1GB | < 500ms | Rayon parallel |
| Upload (LAN) | > 800 MB/s | QUIC + zero-copy |
| Clone 10GB repo | < 90s | 1 Gbps link |
| Status check | < 50ms | Cached index |
| VFS file open | < 30ms | Prefetched metadata |

---

## Operations

- [Self-Hosting Guide](operations/self-hosting.md)
- [Performance Tuning](operations/performance-tuning.md)
- [Runbooks](operations/runbooks/) - Incident response

---

## Development

- [Testing Strategy](testing/strategy.md)
- [Contributing Guide](development/contributing.md)

