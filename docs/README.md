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
| 3.6 | Hybrid Storage | ✅ Complete | Git+Dits storage for optimal text/binary handling |
| 4 | POC & Introspection | ✅ Complete | Dedup stats, inspect-file, repo-stats, Redis caching |
| 4b | Network Sync | ✅ Complete | QUIC delta sync, push/pull, P2P networking |
| 5 | Conflict & Locking | ✅ Complete | Binary locks, visual diff, conflict resolution |
| 6 | Hologram Layer | 🚧 In Progress | Proxy-based editing workflows |
| 7 | Dependency Graph | ✅ Complete | Project file parsing, creative ecosystem |
| 8 | Deep Freeze | 🚧 Planned | Tiered storage lifecycle |
| 9 | Black Box | 🚧 Planned | Client-side encryption |

**Comprehensive Testing Infrastructure:**
- **120+ Automated Tests**: Git-inspired shell script framework + Rust unit tests
- **80+ File Formats**: Creative assets, 3D models, game assets, video, audio
- **Git Recovery**: Full Git operations on binary assets (diff/merge/blame/reset)
- **Cross-Platform**: Windows/macOS/Linux filesystem compatibility
- **Stress Testing**: 1TB workload simulation, concurrency testing
- **Quality Assurance**: Chainlint for test script validation

**Current CLI Commands (60+ Commands):**
- ✅ **Core Git**: `init`, `add`, `status`, `commit`, `log`, `checkout`, `branch`, `switch`, `diff`, `tag`, `merge`, `reset`, `restore`, `config`, `stash`, `rebase`, `cherry-pick`, `bisect`, `reflog`, `blame`, `show`, `grep`, `worktree`, `sparse-checkout`, `hooks`, `archive`, `describe`, `shortlog`, `maintenance`, `completions`
- ✅ **Creative Workflows**: `video-init`, `video-add-clip`, `video-show`, `video-list`, `proxy-generate`, `proxy-status`, `proxy-list`, `proxy-delete`
- ✅ **Asset Management**: `segment`, `assemble`, `roundtrip`, `mount`, `unmount`, `inspect`, `inspect-file`, `repo-stats`, `cache-stats`, `fsck`, `meta-scan`, `meta-show`, `meta-list`
- ✅ **Collaboration**: `remote`, `push`, `pull`, `fetch`, `clone`, `lock`, `unlock`, `locks`, `login`, `logout`, `change-password`, `audit`, `audit-stats`, `audit-export`, `p2p`
- ✅ **Lifecycle**: `freeze-init`, `freeze-status`, `freeze`, `thaw`, `freeze-policy`, `encrypt-init`, `encrypt-status`, `dep-check`, `dep-graph`, `dep-list`, `gc`, `clean`

---

## Quick Start

### Basic Workflow
```bash
# Initialize a repository
dits init

# Add and commit files (any format: video, 3D, game assets, etc.)
dits add .
dits commit -m "Initial project"

# View history and status
dits log --oneline
dits status

# Branch and merge
dits checkout -b feature
# ... make changes ...
dits checkout main
dits merge feature
```

### Creative Asset Management
```bash
# Video editing workflow
dits video-init "My Project"
dits video-add-clip footage/shot_001.mp4 --timeline 00:00:00
dits proxy-generate footage/*.mp4

# Game development workflow
dits lock assets/character.fbx  # Prevent conflicts
# ... edit character ...
dits add assets/character.fbx
dits commit -m "Updated character model"
dits unlock assets/character.fbx

# 3D animation workflow
dits add models/character.obj materials/*.mtl
dits commit -m "Character model with materials"
```

### Advanced Features
```bash
# Mount as virtual filesystem
dits mount /mnt/project

# Collaborate with team
dits remote add origin https://dits.example.com/project
dits push origin main

# Lock binary assets for editing
dits lock assets/*.blend --reason "Rigging character"

# View repository statistics
dits repo-stats
dits cache-stats
```

---

## Core Architecture

- **[Hybrid Architecture](architecture/hybrid-architecture.md)** - The "Gold Standard" design: Universal Deduplication + File-Type Awareness
- [Architecture Overview](architecture/overview.md)
- [Master Architecture](architecture/master-architecture.md)
- [Open Problems & Solutions](architecture/open-problems-solutions.md) - Detailed solutions for 40 research questions
- [Tech Stack](architecture/tech-stack.md)

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
- **[FastCDC Chunking](algorithms/fastcdc.md)** - Content-defined chunking with SIMD acceleration and streaming support
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

