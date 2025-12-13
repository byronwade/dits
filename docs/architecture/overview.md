# High-Level Architecture

Dits is a **hybrid media version control system** combining:
1. **Smart Storage Delegation** - Git for text, Dits for binary
2. **Universal Binary Deduplication** - Works on ANY file type
3. **File-Type Awareness** - Industry-specific optimizations

> See [Hybrid Architecture](./hybrid-architecture.md) for the complete "Gold Standard" design.
> See [Hybrid Text Storage](./hybrid-text-storage.md) for the Git integration details.

---

## The Three-Layer Approach

### Layer 0: Storage Strategy Selection (NEW)

Files are classified and routed to the appropriate storage engine:

```
                    ┌─────────────┐
                    │   File In   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Classify   │
                    │  (by type)  │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  Text File  │ │ Binary File │ │   Hybrid    │
    │ (.md, .json)│ │ (.mp4, .mov)│ │  (.prproj)  │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   libgit2   │ │  FastCDC    │ │  Git + CDC  │
    │  • Diff     │ │  • Chunk    │ │  (combined) │
    │  • Merge    │ │  • Dedup    │ │             │
    │  • Blame    │ │  • Delta    │ │             │
    └─────────────┘ └─────────────┘ └─────────────┘
```

**Why this matters:**
- Git's text engine has 20+ years of refinement
- 3-way merge with conflict markers for text files
- Line-level diff and blame for code/config
- Chunking is overkill for small text files

### Layer 1: Universal Bucket (Foundation)

Binary and media files go through the chunking pipeline:

```
Binary File → FastCDC Chunker → BLAKE3 Hash → Content-Addressable Store
```

| Operation | Result |
|-----------|--------|
| Move file A→B | 0 bytes (hashes match) |
| Trim video start | ~5% of file (only start chunks change) |
| Append to file | Size of append only |

### Layer 2: Smart Logic (File-Type Awareness)

| Industry | Problem | Solution |
|----------|---------|----------|
| **Video Editors** | Re-encodes change all bytes | Version project files, not rendered video |
| **Game Devs** | Binary files can't merge | File locking + CDC for headers |
| **3D Artists** | Embedded assets in .blend | Reference workflow encouragement |
| **Photographers** | PSD layers affect whole file | CDC + composite preview extraction |

---

## Core Components

1. **FastCDC Chunker** - Content-defined chunking (variable 16KB-256KB blocks)
2. **BLAKE3 Hasher** - 32-byte content addresses, 2+ GB/s throughput
3. **Content-Addressable Store** - Objects stored by hash, duplicates impossible
4. **Manifest System** - Version the "recipe", not the raw bytes
5. **Have/Want Sync** - Minimal bandwidth protocol with Bloom filters
6. **Virtual Filesystem** - FUSE/WinFSP for on-demand hydration
7. **Lock Manager** - Prevent binary file conflicts
8. **QUIC Transport** - UDP-based, survives network drops

---

## What We Solved

| Traditional VCS | Dits |
|-----------------|------|
| Store full file on every change | Store only changed chunks |
| Binary files = full copy | CDC catches partial changes |
| Re-encode = new file | Version instructions, not pixels |
| Download entire repo | Partial clone + on-demand fetch |
| Merge conflicts on binary | Explicit locking before edit |
| Reinvent text handling | **Use Git's proven engine** |
| Line diff for binaries? | Chunk diff + visual compare |

---

## Hybrid Storage Summary

| File Type | Storage Engine | Diff | Merge | Blame |
|-----------|---------------|------|-------|-------|
| Text (.txt, .md, .json, .rs, .py) | libgit2 | Line-based | 3-way with markers | Yes |
| Binary (.mp4, .mov, .psd, .blend) | Dits CDC | Chunk-based | Choose version | No |
| NLE Projects (.prproj, .drp) | Hybrid | Timeline-level | Sequence merge | Partial |

**Key Benefits:**
- Text files get Git-quality merging (conflict markers, not "choose ours/theirs")
- Binary files get video-aware chunking and deduplication
- Best of both worlds without reinventing proven algorithms


