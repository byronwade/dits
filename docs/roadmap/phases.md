# Engineering Roadmap

This document outlines the phased development plan for Dits. Phases 1-3.5 are complete; Phase 3.6 is next priority.

---

## Implementation Status

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 1 | The Engine | ✅ Complete | Local chunking and deduplication |
| 2 | Structure Awareness | ✅ Complete | MP4/ISOBMFF atom parsing |
| 3 | Virtual File System | ✅ Complete | FUSE mount for on-demand access |
| 3.5 | Git Parity | ✅ Complete | Branching, merging, tags, stash |
| **3.6** | **Hybrid Storage** | **🔜 Next** | **Git for text, Dits for binary** |
| 4 | Collaboration & Sync | 🚧 Planned | QUIC-based push/pull |
| 5 | Conflict & Locking | 🚧 Planned | Binary locks, conflict detection |
| 6 | The Hologram | 🚧 Planned | Proxy-based editing |
| 7 | The Spiderweb | 🚧 Planned | Dependency graph parsing |
| 8 | Deep Freeze | 🚧 Planned | Tiered storage lifecycle |
| 9 | The Black Box | 🚧 Planned | Client-side encryption |

---

## Completed Phases

### Phase 1: The Engine (Foundation) ✅

**Goal:** CLI chunks binary files and dedupes locally.

**Deliverables:**
- `dits add large_file.bin` stores chunks in `.dits/objects`
- `dits checkout` restores bit-for-bit
- FastCDC content-defined chunking
- BLAKE3 content addressing

**Key Test:** Modify 1MB of a 10GB file; storage grows by ~1MB.

---

### Phase 2: Structure Awareness (Corruption Shield) ✅

**Goal:** Protect container integrity via Atom Exploder.

**Deliverables:**
- Detect `.mp4`/`.mov` containers
- Parse and store `moov` atom separately
- Chunk `mdat` payload independently
- Metadata-only changes cause zero payload re-upload

**Commands:** `dits inspect`, `dits roundtrip`

---

### Phase 3: Virtual File System (UX) ✅

**Goal:** Eliminate download time via mounted drive.

**Deliverables:**
- FUSE mount shows files from any commit
- Real disk holds only accessed chunks
- JIT (just-in-time) chunk fetching on access
- Caching with configurable cache size

**Commands:** `dits mount`, `dits unmount`

---

### Phase 3.5: Git Parity ✅

**Goal:** Implement essential Git-like features for daily VCS use.

**Deliverables:**
- Branching system (`branch`, `switch`)
- Merge with conflict detection
- Tags (lightweight and annotated)
- Diff command (text and binary aware)
- Reset and restore commands
- Stash for WIP changes
- Configuration system

**Commands:** `branch`, `switch`, `merge`, `tag`, `diff`, `reset`, `restore`, `stash`, `config`

---

## Next Priority Phase

### Phase 3.6: Hybrid Storage Engine 🔜

**Goal:** Use the right tool for each job - Git's proven text engine for text files, Dits' chunking for binary/media files.

> **Full specification:** See [Phase 3.6 Action Plan](../action-plan/phase3.6-hybrid-storage.md)

**Why This Phase:**
- Git's 3-way merge with conflict markers is superior to "choose ours/theirs" for text
- Line-based diff and blame are essential for code/config files
- Chunking is overkill for small text files
- No need to reinvent 20+ years of Git refinement

**Deliverables:**

| Component | Description |
|-----------|-------------|
| File Classifier | Route files to appropriate storage engine |
| libgit2 Integration | Git object store for text files |
| Unified Index | Track storage strategy per file |
| Hybrid Diff | Line diff for text, chunk diff for binary |
| Hybrid Merge | 3-way with markers for text, choose for binary |
| `dits blame` | Line-by-line attribution for text files |
| Migration Tool | Upgrade existing repos to hybrid format |

**Key Commands:**
```bash
dits diff README.md          # Line-based unified diff
dits diff video.mp4          # Chunk-based stats
dits blame src/config.rs     # Line attribution
dits merge feature           # Auto-selects strategy per file
```

**Implementation Order:**
1. File classification system
2. Git object store initialization
3. Unified index format
4. Diff engine selection
5. Merge engine selection
6. Blame support
7. Repository migration

**Dependencies:**
```toml
git2 = { version = "0.18", features = ["vendored-libgit2"] }
```

---

## Planned Phases

### Phase 4: Intelligent Collaboration & Sync (Network) 🚧

**Goal:** Real-time, adaptive sync with smart caching and offline capabilities.

**Enhanced Deliverables:**
- **Adaptive Transport System**: Bandwidth-aware QUIC with automatic compression and chunk sizing
- **Incremental Change Detection**: Real-time filesystem monitoring with selective sync
- **Smart VFS Caching**: Predictive prefetching and offline mode with conflict resolution
- **UX Improvements**: Real-time progress, better error handling, and web UI enhancements
- **Core Sync Infrastructure**: Rust server (Axum + Quinn), Have/Want sync with Bloom filters, resumable transfers

**Planned Commands:** `push`, `pull`, `fetch`, `sync`, `clone`, `remote`, `watch`, `offline`

**Key Innovations:**
- Network condition detection (LAN bulk mode vs WAN compression)
- Intelligent prefetching based on access patterns
- Offline editing with automatic conflict resolution
- Real-time collaboration for large media workflows

---

### Phase 5: Conflict & Locking (Safety) 🚧

**Goal:** Prevent concurrent edits to the same binary.

**Planned Deliverables:**
- File-level exclusive locks
- Lock coordination via server
- Visual diff tool for conflicts
- Garbage collection
- Filesystem consistency checking

**Planned Commands:** `lock`, `unlock`, `locks`, `gc`, `fsck`

---

### Phase 6: The Hologram (Bandwidth) 🚧

**Goal:** Proxy-based editing for slow links.

**Planned Deliverables:**
- `checkout --proxy` fetches low-res versions
- Original media stays server-side
- Automatic upgrade to full-res when needed

---

### Phase 7: Creative Ecosystem & Integration 🚧

**Goal:** Seamless integration with creative pipelines and collaborative workflows.

**Enhanced Deliverables:**
- **Plugin Ecosystem**: WebAssembly runtime for custom integrations and automation
- **Creative Tool Integration**: SDKs and APIs for Unreal Engine, Premiere Pro, DaVinci Resolve, etc.
- **Pipeline Automation**: Webhook system and live watch APIs for build consumption
- **Dependency Management**: Advanced parsing for project files with automatic asset inclusion
- **Real-time Collaboration**: Operational transforms for concurrent project editing

**Key Features:**
- Plugin hooks for mount/unmount events and CI/CD integration
- Live streaming APIs for render farm and build pipeline consumption
- Cross-tool workflow orchestration and dependency tracking

---

### Phase 8: Deep Freeze (Economics) 🚧

**Goal:** Tiered storage at scale.

**Planned Deliverables:**
- Automated lifecycle policies
- Hot tier: NVMe/SSD
- Cold tier: S3/Glacier
- Transparent thaw UX

---

### Phase 9: The Black Box (Security) 🚧

**Goal:** Enterprise-grade security.

**Planned Deliverables:**
- Client-side convergent encryption
- RBAC-managed keys
- Chunks encrypted before leaving host
- Authentication system

**Planned Commands:** `auth login`, `auth logout`, `auth status`


