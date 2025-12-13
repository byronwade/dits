# Dits

Open-source, Git-like version control for large media (video-first) with content-defined chunking, BLAKE3 hashing, QUIC delta sync, and format-aware parsing (MP4/ISOBMFF). This README is a long-form, contributor-focused master doc that inlines the essentials from the broader documentation set so you can ramp quickly without jumping across files.

---

## Table of Contents
- [The Dits Manifesto](#the-dits-manifesto)
  - [The Problem: The Big Stuff Is Still Dumb](#the-problem-the-big-stuff-is-still-dumb)
  - [The Dits Thesis](#the-dits-thesis)
  - [What Dits Actually Is](#what-dits-actually-is)
  - [How It Works (Mental Model)](#how-it-works-mental-model)
  - [Why This Is Different](#why-this-is-different)
  - [What Changes If We Pull This Off](#what-changes-if-we-pull-this-off)
  - [Design Principles](#design-principles)
  - [The Promise](#the-promise)
- [What is Dits?](#what-is-dits)
- [Open Core vs Ditshub](#open-core-vs-ditshub)
- [Project Status](#project-status)
- [Quick Facts](#quick-facts)
- [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)
- [Open Problems & Research Questions](#open-problems--research-questions)
- [Architecture Overview](#architecture-overview)
  - [Two-Layer Design](#two-layer-design)
  - [Core Components](#core-components)
  - [What We Solve vs Traditional VCS](#what-we-solve-vs-traditional-vcs)
- [Algorithms](#algorithms)
  - [FastCDC Chunking](#fastcdc-chunking)
  - [Keyframe Alignment](#keyframe-alignment)
- [Data Formats](#data-formats)
  - [Manifest Format (summary)](#manifest-format-summary)
  - [Index Format (summary)](#index-format-summary)
- [Sync & Transport](#sync--transport)
  - [Have/Want Sync](#havewant-sync)
  - [Wire Protocol over QUIC](#wire-protocol-over-quic)
- [Virtual Filesystem & Locking](#virtual-filesystem--locking)
- [Domain Workflows](#domain-workflows)
  - [Video Editors](#video-editors)
  - [Game Developers](#game-developers)
  - [3D Artists](#3d-artists)
  - [Photographers](#photographers)
- [Tech Stack](#tech-stack)
- [Roadmap (9 Phases)](#roadmap-9-phases)
- [CLI Usage](#cli-usage)
  - [Basics](#basics)
  - [Common Commands](#common-commands)
- [Self-Hosting](#self-hosting)
- [Operations Notes](#operations-notes)
- [Testing & Quality](#testing--quality)
- [Contributing](#contributing)
- [Glossary](#glossary)
- [Storage Layout](#storage-layout)
- [Data Structures (Summary)](#data-structures-summary)
- [MP4/ISOBMFF Handling & Transparent Decompression](#mp4isobmff-handling--transparent-decompression)
- [Safety & Security Checklist](#safety--security-checklist)
- [Performance Targets](#performance-targets)
- [Operations: Failure Modes & Runbooks](#operations-failure-modes--runbooks)
- [API Surface (REST + Wire)](#api-surface-rest--wire)
- [Action Plan Highlights](#action-plan-highlights)
- [Engineering Deep Dive](#engineering-deep-dive)
  - [FastCDC Algorithm Implementation](#fastcdc-algorithm-implementation)
  - [Keyframe Alignment Algorithm](#keyframe-alignment-algorithm)
  - [Error Handling & Safety Guarantees](#error-handling--safety-guarantees)
  - [Concurrency & Locking](#concurrency--locking)
  - [Network Protocol Engineering](#network-protocol-engineering)
  - [Storage Integrity Patterns](#storage-integrity-patterns)
  - [Performance Engineering](#performance-engineering)
  - [Testing Strategy](#testing-strategy)
  - [Known Critical Issues & Solutions](#known-critical-issues--solutions)
  - [Edge Cases & Failure Modes](#edge-cases--failure-modes)

---

## The Dits Manifesto

### Version Control for the Heavy Stuff

> **Tagline:**  
> _Git for everything that's too big, too binary, and too expensive to keep re-uploading._

---

### The Problem: The Big Stuff Is Still Dumb

Text got Git. Big media did not.

Right now, across film, games, design, and massive creative projects:

- A "version" is still a **new file**:
  - `final.mp4`
  - `final_final.mp4`
  - `final_no_for_real_this_time_v27.mp4`

- Teams pass around:
  - 10–500 GB files as if it's 1998
  - Zips of game builds
  - Entire project folders in cloud drives

- Versioning and collaboration are glued together with:
  - Manual naming conventions
  - Cloud storage buckets
  - Tool-specific, proprietary "project formats"

This creates a pile of pain:

- **Bandwidth waste**: Uploading/downloading full assets for tiny edits
- **Storage waste**: Duplicate copies of the same content across versions, users, and "just-in-case" backups
- **Chaos**: Nobody really knows which version shipped, what changed, who changed it, what it was built from

We solved this for text 20 years ago with Git. We never properly solved it for **large binary media**.

---

### The Dits Thesis

> **Dits is Git-style version control for large, binary, media-heavy projects.**  
> Not a workaround. Not an LFS bandaid. A **first-class VCS** for the heavy stuff.

Core beliefs:

1. **Large media deserves real version control**  
   Not "we keep it in Drive and write the version number in a spreadsheet."

2. **The unit of truth is not "a file", it's "a graph of chunks and edits."**  
   Files, timelines, builds, and cuts should all be versioned in one coherent system.

3. **Bandwidth is precious**  
   After the first upload, you should rarely pay full price again.

4. **Open > proprietary**  
   The core protocol and formats must be open, inspectable, and self-hostable—just like Git.

5. **Compute is a feature, not a crutch**  
   Heavy GPU/CPU work (rebuilds, renders, transcodes) should be orchestrated, auditable, and billable—not hidden behind magic sync buttons.

---

### What Dits Actually Is

Dits is a **content-addressed, chunk-based version control system** designed for huge files and complex projects.

At its core:

- **Chunks**: Variable-sized binary pieces of any file (video, audio, game build, RAW photo, etc.), addressed by hash
- **File Manifests**: "How to rebuild this file from chunks." A file version is a **list of chunk IDs + sizes + order**
- **Trees**: Snapshots of a working directory: `path → manifest ID`
- **Commits**: Time-travel points that reference a tree, record parents, and record who/when/why
- **Project Graphs** (for timelines, edits, builds): Optional higher-level objects describing video timelines, game build graphs, asset dependency graphs

Everything is **content-addressed by hash**, just like Git—only instead of "blobs of text", the system is optimized for **enormous binaries**.

---

### How It Works (Mental Model)

You can think of Dits like this:

```bash
# Initialize once
dits init

# Add a giant file (10 GB video, enormous build, RAW set)
dits add bigfile.mp4
dits commit -m "Initial version"

# Make a small edit and commit again
# (change brightness, tweak build, adjust photo, etc.)
dits add bigfile.mp4
dits commit -m "Brightness +5%"
```

What actually happens:

- Dits **chunks** the file using content-defined chunking
- Chunks with identical content get the **same ID** and are stored **once**
- Each version of a file just stores a **manifest** referencing these chunks
- A commit references a tree of manifests
- Reconstructing a file is: "Read manifest → concatenate chunks → write out file"

Result:

- You stop re-uploading / re-storing whole files
- You version truly massive assets without exploding your disk or your network

---

### Why This Is Different

This isn't:
- Git LFS with a new paint job
- A single-app "cloud project" solution
- A proprietary timeline format tied to one tool

This is:

1. **A general-purpose CAS (content-addressed store) for big media**  
   Any file type. Any tool. Any workflow.

2. **Git-like commits over large assets**  
   You can `log` what changed, `checkout` old states, branch and experiment, merge timelines and builds at the semantic layer.

3. **Project graphs that version edits, not just files**  
   Commits can reference timelines (video projects), build graphs (game releases), asset graphs (multi-app pipelines). So the system doesn't just know *what bytes existed*; it knows **how they were used**.

4. **Open core, cloud optional**  
   - `dits` (the core) is local-first, open-source, self-hostable
   - `ditshub` (the eventual cloud layer) is optional, handles GPU/CPU-heavy tasks (renders, transcodes, builds), syncs objects with the same open protocol

You're not locked into someone's walled garden. If Dits wins, it becomes **infrastructure**.

---

### What Changes If We Pull This Off

If Dits reaches its full potential, then in a few years:

#### For Video & Film
- A "project" is a Dits commit + project graph:
  - Editors can branch timelines
  - Producers can review and diff cuts
  - Renders can be farmed out from the graph, not from flat files
- No more massive re-uploads:
  - The first ingest uploads all chunks
  - Every subsequent version pushes only changed chunks

#### For Games & Large Apps
- Builds become commit-linked, chunk-deduped, patchable with minimal bandwidth
- "Which build shipped?" is always answerable and always reproducible from the commit and chunk store
- Multi-GB patches shrink to "what truly changed"

#### For Photos and Creative Libraries
- Raw assets live once
- Edits, crops, exports, and variants become manifests + metadata + project graphs
- Catalogs become versionable, syncable, open

#### For Infra & Cloud Providers
- Dits becomes the "media Git" they can integrate with:
  - Storage vendors can dedup across customers using the same chunk model
  - CI/CD and render farms can consume commits and project graphs as build inputs

---

### Design Principles

These are the core rules of the Dits universe:

1. **Local-first**  
   You should be able to use Dits entirely offline, on your own disk.

2. **Open by default**  
   Specs and formats are documented, inspectable, and implementable by others.

3. **Content-addressed everything**  
   If two files share content, they share chunks. No guessing.

4. **Stable primitives, rich extensions**  
   The core objects (chunks, manifests, trees, commits) stay simple. Domain-specific features (video timelines, photo metadata, build graphs) live on top as project graphs and metadata.

5. **Scales down and up**  
   - Solo creator with a laptop and one external drive? Works.
   - Studio with petabytes of assets and GPU farms? Also works.

6. **No magic sync**  
   Sync is transparent: you see what's being pushed/pulled, you can inspect objects, you can verify integrity.

---

### Why Now

This project only makes sense because a few things are true *today*:

- **Storage is cheap, but bandwidth is still expensive and slow**  
  We can afford to store chunks, but we can't afford to keep re-uploading them.

- **Media sizes exploded**  
  4K/8K video, huge RAWs, giant game assets—files that were unimaginable when Git was designed.

- **Compute (CPU/GPU in the cloud) is accessible and scriptable**  
  Heavy operations like rendering and transcoding can be orchestrated, not just manual workflows.

- **Devs and creators already understand Git-style workflows**  
  The mental model is proven. We're applying it to the heaviest, loudest, least well-managed assets on earth.

We're taking the **Git mental model**:
> content-addressed objects + commits + branches

and applying it to:
> the heaviest, loudest, least well-managed assets on earth.

If Git was the version control system for text, Dits wants to be the version control system for **everything else**.

---

### The Promise

Dits is a promise that:

- You'll never lose track of which version you shipped
- You'll stop paying bandwidth tax for the same bits over and over
- You'll be able to version, branch, and merge **massive projects** with the same confidence you version code today
- You'll have a **portable, open history** of your creative and technical work—not trapped inside one vendor's monolithic app

If we do this right, in a decade people will say:

> "Remember when we just dragged 50 GB files into Dropbox and prayed?  
> Yeah… thank god we have Dits now."

Let's build the Git of the heavy stuff.

---

## Installation

### Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh
```

### Homebrew (macOS/Linux)

```bash
brew install byronwade/tap/dits
```

### npm / bun / pnpm

```bash
npm install -g @byronwade/dits
# or
bun install -g @byronwade/dits
# or
pnpm install -g @byronwade/dits
```

### GitHub Releases

Download pre-built binaries from the [releases page](https://github.com/byronwade/dits/releases).

### Build from Source

```bash
cargo install dits
```

Or build from the repository:

```bash
git clone https://github.com/byronwade/dits.git
cd dits
cargo build --release
# Binary is at target/release/dits
```

---

### Getting Started

```bash
dits init                    # Initialize a new repository
dits add .                   # Add files to staging
dits commit -m "Initial"     # Commit changes
dits status                  # Show repository status
```

---

## What is Dits?
Dits is an open-source, Git-like version control system specifically designed for large media files and creative workflows. It brings professional version control to video production, game development, photography, and other creative industries that deal with massive binary assets.

### Core Features
- **Content-Defined Chunking**: FastCDC algorithm splits files at content boundaries, not fixed sizes
- **BLAKE3 Hashing**: Fast, parallelizable cryptographic hashing for content addressing
- **Video-Aware Processing**: MP4 atom preservation, keyframe alignment, and format-specific optimizations
- **Deduplication**: Automatic deduplication across versions and projects saves massive storage
- **Virtual Filesystem**: FUSE-based mount allows on-demand access without full downloads
- **QUIC Transport**: High-performance, resumable transfers over UDP
- **Git-Compatible Interface**: Familiar commands for easy adoption by developers and creatives

## Open Core vs Ditshub

Dits follows an open-core model inspired by Git/GitHub:

### Dits (Open Source Core)
- **CLI, libraries, and protocol**: Complete implementation you can run locally or self-host
- **Data formats and wire protocol**: Fully documented and open for third-party implementations
- **Local-first architecture**: Works offline with optional cloud storage
- **Self-hostable remotes**: Run your own Dits server with full data sovereignty
- **Extensible via SDKs**: Go, Python, JavaScript, and Rust SDKs available

### Ditshub (Hosted Platform)
- **Managed cloud service**: Built on the open Dits protocol
- **Real-time collaboration**: Advanced team features, permissions, and audit logs
- **GPU/CPU compute**: Cloud-based rendering, transcoding, and processing
- **Marketplace**: Asset marketplace where creators keep 100% of earnings
- **Enterprise features**: SSO, compliance tools, advanced analytics

**Key Principle**: Everything Ditshub does is possible with self-hosted Dits. Ditshub adds convenience, scale, and managed services while keeping the core technology open and interoperable.

## Project Status
- Active development with comprehensive testing infrastructure in place.
- 120+ automated tests covering all major file formats and use cases.
- Core workflows stable with extensive real-world scenario validation.
- APIs and formats stabilizing; breaking changes require migration planning.
- Roadmap-driven: see [Roadmap (9 Phases)](#roadmap-9-phases).

## Quick Facts
- Chunking: FastCDC (content-defined, video-tuned, keyframe-aware).
- Hashing: BLAKE3 (32-byte content addresses, parallel SIMD).
- Transport: QUIC (quinn) with delta sync, resumable uploads, and adaptive chunking.
- Storage: Hybrid Git+Dits storage for optimal text/binary handling.
- VFS: FUSE/WinFSP mounts for on-demand hydration with Redis caching.
- Locking: Distributed Redlock for multi-user binary conflict prevention.
- Testing: 120+ comprehensive tests covering 80+ file formats.
- File Support: 3D (OBJ/FBX/glTF/USD), Game Assets (Unity/Unreal), Video (MP4/MOV), Images (RAW/PSD), Audio, Custom formats.
- Git Recovery: Full Git operations (diff/merge/blame/reset) on creative assets.
- Specs: Manifests, index, wire protocol fully documented in `docs/`.

---

## Frequently Asked Questions (FAQ)

### General Questions

**Q: How is Dits different from Git LFS?**  
A: Git LFS is a workaround that stores large files outside Git. Dits is a first-class VCS designed from the ground up for large binaries. Dits uses content-defined chunking (not fixed-size), deduplicates across all files/versions, supports virtual filesystem mounts, and handles format-aware optimizations (e.g., MP4 atom splitting, keyframe alignment).

**Q: Can I use Dits without a server/remote?**  
A: Yes! Dits is local-first. You can use it entirely offline with local storage. Remotes are optional for collaboration.

**Q: What file types does Dits support?**  
A: Dits works with any file type. It uses universal chunking for everything, with format-aware optimizations for video (MP4/MOV), images, and other media formats. The chunking algorithm adapts to content patterns.

**Q: How does Dits handle file corruption?**  
A: Every chunk is content-addressed by BLAKE3 hash. On read, Dits verifies the hash matches. If corruption is detected, it automatically attempts recovery: first from local replicas/cache, then from remote storage, and finally from other clients (if P2P is enabled). Corrupted chunks are quarantined and replaced with verified copies. If recovery fails, Dits reports the error with the specific chunk hash. This is mandatory—checksum verification cannot be skipped, and automatic restoration is the default behavior.

**Q: Is Dits production-ready?**  
A: Dits is in active development. Core workflows are stabilizing, but expect some rough edges. See [Project Status](#project-status) for current state. We welcome early adopters and contributors!

**Q: How does Dits compare to Perforce Helix Core?**  
A: Perforce is centralized and proprietary. Dits is distributed, open-source, and uses content-addressed storage. Dits also deduplicates across versions automatically (Perforce requires explicit integration), and supports Git-like workflows.

**Q: Can I migrate from Git LFS to Dits?**  
A: Migration tools are planned but not yet implemented. The data models are different (LFS uses pointers; Dits uses chunk manifests), so migration requires re-chunking files. This is on the roadmap.

**Q: Does Dits work on Windows?**  
A: Yes! Dits uses `dokany` for Windows VFS mounts (similar to FUSE on Unix). The CLI and core engine are cross-platform Rust.

### Technical Questions

**Q: How does content-defined chunking work?**  
A: FastCDC uses a rolling hash (gear hash) to find chunk boundaries based on content patterns, not fixed offsets. This means insertions/deletions only affect nearby chunks. See [FastCDC Algorithm Implementation](#fastcdc-algorithm-implementation) for details.

**Q: What's the difference between a chunk and a manifest?**  
A: A chunk is a piece of binary data (typically 32KB-256KB) addressed by its BLAKE3 hash. A manifest is a "recipe" that describes how to reconstruct a file from chunks—it's a list of chunk hashes, offsets, and sizes. A 10GB video might have 15,000 chunks but only one manifest (~50KB).

**Q: How does deduplication work across different files?**  
A: If two files (or versions) share any identical content, those bytes will produce identical chunks with identical hashes. Dits stores each unique chunk once. The same chunk can be referenced by multiple manifests.

**Q: What happens if I modify 1MB of a 10GB file?**  
A: Only the chunks containing that 1MB change. Typically 1-3 chunks (~200KB-600KB) need to be re-uploaded. The other ~9.99GB of chunks are already in the store.

**Q: How does the virtual filesystem work?**  
A: Dits mounts the repository as a drive (FUSE on Unix, Dokany on Windows). When you open a file, the VFS intercepts the read, checks which chunks are needed, fetches missing chunks on-demand, and reconstructs the file in memory or a local cache. You see the full file structure without downloading everything.

**Q: What's the difference between a commit and a manifest?**  
A: A manifest describes one file version (list of chunks). A commit is a snapshot of the entire repository at a point in time—it references a tree of manifests (one per file). Commits form a DAG (directed acyclic graph) with parent pointers, like Git.

**Q: How does keyframe alignment work?**  
A: For video files, Dits extracts keyframe positions from the container (MP4 `stss` table). It then adjusts FastCDC chunk boundaries to align with keyframes when possible, ensuring each chunk can be decoded independently. See [Keyframe Alignment Algorithm](#keyframe-alignment-algorithm).

**Q: What's the storage overhead?**  
A: Manifests are tiny (~50KB for a 10GB file). Chunks have minimal overhead (just the hash index). The main storage is the chunks themselves, but deduplication means shared content is stored once. Typical overhead: <1% for manifests/indexes.

**Q: How does garbage collection work?**  
A: Dits uses reference counting. Each chunk tracks how many manifests reference it. When a chunk's ref count reaches zero (no manifests reference it), it becomes eligible for GC. GC runs periodically and can be checkpointed/resumed.

**Q: Can I recover deleted files?**  
A: Yes! If the commit still exists, you can `dits checkout` that commit. If you deleted the commit but haven't run GC, the chunks are still in the store—you'd need to manually reconstruct the manifest. Reflog (planned) will track recent deletions.

**Q: How does locking work for binary files?**  
A: Dits uses distributed locking (Redlock algorithm) to prevent concurrent edits to the same binary file. When you `dits lock <file>`, other users see it as read-only. Locks are tracked in the index and coordinated via the server.

**Q: What's the difference between `dits add` and `dits commit`?**  
A: `dits add` stages files (chunks them, stores them, updates the index). `dits commit` creates a commit object referencing the current index state. This matches Git's staging model.

**Q: How does `dits push` work?**  
A: Push exchanges manifests and chunk hashes with the remote. The remote uses Bloom filters to determine which chunks it's missing. Only missing chunks are uploaded. This is the "have/want" sync protocol.

**Q: What happens if the network drops during push?**  
A: QUIC supports resumable transfers. The client tracks which chunks were confirmed received by the server and resumes from the last confirmed point. No need to restart from the beginning.

**Q: Can I use Dits with S3 directly?**  
A: Yes! Dits supports S3-compatible storage backends. You can configure a remote to use S3 for chunk storage. The server coordinates metadata (PostgreSQL) while chunks go directly to S3.

**Q: How does encryption work?**  
A: Phase 9 (planned) adds client-side convergent encryption. Chunks are encrypted before leaving the client using a key derived from content hash + user secret. This enables deduplication while preserving confidentiality. Keys are wrapped by project master keys.

**Q: What's the maximum file size?**  
A: In theory, unlimited. In practice, limited by available storage and memory for chunking. Dits uses streaming chunkers for large files, so memory usage is bounded. We've tested with 100GB+ files successfully.

**Q: How does Dits handle concurrent commits?**  
A: Like Git, Dits uses a DAG. If two users commit simultaneously, you get a merge scenario. For binary files, Dits uses locking to prevent conflicts. For project files (XML, JSON), three-way merge is possible.

**Q: Can I use Dits with existing cloud storage?**  
A: Yes! Dits can use S3, Azure Blob, Google Cloud Storage, or any S3-compatible backend. You can also self-host with MinIO or similar.

**Q: What's the difference between a branch and a tag?**  
A: Branches are mutable pointers to commits (like Git). Tags are immutable pointers to specific commits. Both are stored in `.dits/refs/`.

**Q: How does `dits status` work so fast?**  
A: The index caches file metadata (size, mtime, hash). `dits status` compares the working tree to the index and HEAD, using cached hashes to avoid re-reading files. With fsmonitor extension, it can be even faster.

**Q: Can I use Dits for code repositories?**  
A: Dits works for any file type, including code. However, Git is still better optimized for text files (line-based diffs, merge algorithms). Dits excels at large binaries that Git struggles with.

**Q: How does the Bloom filter work in sync?**  
A: The client sends a Bloom filter (probabilistic set) representing all chunk hashes it has locally. The server checks which of its chunks are probably missing (Bloom filter says "maybe not present"). This compresses the "have" list from megabytes to kilobytes.

**Q: What happens if two files have the same content?**  
A: They share the same chunks! If `file1.mp4` and `file2.mp4` are identical, they reference the same manifest, which references the same chunks. Storage is shared automatically.

**Q: How does Dits handle file renames?**  
A: If you rename a file, Dits detects it's the same content (same hash) and updates the manifest path. No chunks are re-uploaded. This is similar to Git's rename detection.

**Q: Can I use Dits with Docker/Kubernetes?**  
A: Yes! Dits server can run in containers. See [Self-Hosting](#self-hosting) for Docker Compose and Kubernetes deployment examples.

**Q: What's the performance impact of chunking?**  
A: Chunking is fast (~2 GB/s on modern CPUs). The main cost is hashing, which BLAKE3 parallelizes efficiently. For a 10GB file, chunking + hashing takes ~5 seconds. This is a one-time cost per file version.

**Q: How does Dits handle partial file updates?**  
A: If you modify part of a file, only the chunks containing that region change. Dits uses content-defined chunking, so boundaries shift minimally. You only upload the changed chunks.

**Q: Can I use Dits with version control for code AND media?**  
A: Yes! You can use Git for code and Dits for media in the same project. Some teams use Git submodules or separate repos. Future integration might allow Git+Dits in one repo.

**Q: What's the difference between Dits and IPFS?**  
A: IPFS is a distributed file system focused on content addressing and peer-to-peer distribution. Dits is a version control system focused on Git-like workflows (commits, branches, history) for large media. Dits can use IPFS as a storage backend.

**Q: How does Dits handle metadata (EXIF, video codecs, etc.)?**  
A: Dits extracts and stores metadata in manifests. For video, it parses container formats (MP4 atoms) to extract codec, resolution, duration, keyframes. For photos, it reads EXIF. This metadata is versioned alongside the content.

**Q: Can I use Dits offline?**  
A: Yes! Dits is local-first. You can `init`, `add`, `commit`, `checkout`, `log`, `diff` entirely offline. Only `push`/`pull` require network connectivity.

**Q: What happens if I lose my `.dits` directory?**  
A: If you have a remote, you can `dits clone` to recover. If you only have local storage and lose `.dits`, you lose the repository metadata (commits, refs) but chunks might still be in `.dits/objects` if you haven't deleted them. Always back up `.dits/` or use a remote!

**Q: How does Dits handle file permissions?**  
A: Dits stores Unix permissions (mode) in manifests. On checkout, it restores permissions. Windows permissions are mapped to the closest Unix equivalent.

**Q: Can I use Dits with CI/CD pipelines?**  
A: Yes! Dits can be integrated into CI/CD. You can `dits checkout` specific commits, use chunks as build artifacts, and push results back. See `docs/guides/cicd-integration.md` for examples.

**Q: What's the difference between logical and physical size?**  
A: Logical size is what users think they have (sum of file sizes). Physical size is what's actually stored (unique chunks after deduplication). `dits repo-stats` shows both. For a repo with many similar files, physical size can be much smaller.

**Q: How does Dits handle symbolic links?**  
A: Dits stores symlinks in manifests (entry type `Symlink` with target path). On checkout, it recreates the symlink. Symlinks are not followed during `add`—only the link itself is stored.

---

## Open Problems & Research Questions

Dits is an ambitious project, and there are many hard problems we haven't fully solved yet. **We need your help!** If you're interested in tackling any of these, please [open an issue](https://github.com/dits-io/dits/issues) describing your approach or asking questions.

### Storage & Data Integrity

**Problem 1: Optimal Chunk Size for Mixed Workloads**  
How do we automatically tune FastCDC parameters (min/avg/max chunk size) based on file type, content patterns, and access patterns? Should we use different chunk sizes for video vs. project files vs. game assets? What's the tradeoff between deduplication ratio and overhead?

**Problem 2: Garbage Collection at Petabyte Scale**  
How do we efficiently GC a petabyte-scale chunk store? Current reference counting works, but scanning billions of chunks is slow. Can we use probabilistic data structures (Bloom filters, HyperLogLog) to estimate reachability without full scans?

**Problem 3: Storage Tier Lifecycle Policies**  
How do we automatically move chunks between hot/warm/cold storage tiers based on access patterns? What's the optimal policy? How do we handle "thawing" cold chunks transparently without blocking reads?

**Problem 4: Cross-Repository Deduplication**  
Can we deduplicate chunks across multiple repositories (e.g., shared assets in a studio)? How do we handle security boundaries? What's the storage model—shared chunk pool or per-repo with cross-repo references?

**Problem 5: Incremental Manifest Compression**  
Manifests can be large for repos with many files. Can we use delta compression between manifest versions? What's the optimal encoding (BSON, MessagePack, custom binary)?

### Network & Protocol

**Problem 6: Multi-Path QUIC for Bandwidth Aggregation**  
Can we use multiple network interfaces simultaneously (WiFi + Ethernet) to increase throughput? How do we handle path asymmetry and reordering?

**Problem 7: P2P Chunk Distribution**  
Can clients share chunks directly (BitTorrent-style) instead of always going through the server? How do we handle NAT traversal, security, and incentivize sharing?

**Problem 8: Adaptive Chunk Scheduling**  
How do we prioritize which chunks to fetch first based on access patterns? Should we prefetch based on file access order, or use machine learning to predict what users will need?

**Problem 9: Bandwidth Estimation & Rate Limiting**  
How do we accurately estimate available bandwidth and adapt chunk transfer rates? How do we handle variable-rate connections (mobile, satellite)?

**Problem 10: Protocol Versioning & Backward Compatibility**  
How do we evolve the wire protocol while maintaining compatibility? What's the migration path for breaking changes?

### Video & Media Handling

**Problem 11: Variable Frame Rate (VFR) Keyframe Alignment**  
VFR content has irregular keyframe spacing. How do we align chunks optimally? Should we use time-based boundaries instead of byte-based?

**Problem 12: Multi-Track Video Synchronization**  
Videos often have multiple tracks (video, audio, subtitles). How do we ensure chunk boundaries align across tracks for proper synchronization?

**Problem 13: Live Streaming Integration**  
Can Dits handle live streams? How do we chunk a stream in real-time? What's the manifest format for incomplete/streaming content?

**Problem 14: HDR & Color Space Metadata**  
How do we preserve HDR metadata (HDR10, Dolby Vision) through chunking? Can we detect and preserve color space information?

**Problem 15: Container Format Evolution**  
MP4/MOV formats evolve. How do we handle new atom types, codecs, and container features? Should we support MXF, MKV, and other formats natively?

### Concurrency & Locking

**Problem 16: Distributed Lock Coordination at Scale**  
Redlock works but has known issues (clock skew, network partitions). Can we use Raft or other consensus algorithms for lock coordination? What's the performance tradeoff?

**Problem 17: Lock Timeout & Staleness Detection**  
How do we detect stale locks (client crashed)? What's the optimal timeout? Should we use heartbeats or lease-based locking?

**Problem 18: Fine-Grained Locking**  
Can we lock individual chunks or regions of files instead of entire files? This would enable parallel editing of different parts of a large file.

**Problem 19: Lock Escalation**  
How do we handle lock conflicts when multiple users need different granularities (one needs read, one needs write, one needs exclusive)?

### Project Graphs & Semantics

**Problem 20: Video Timeline Diff & Merge**  
How do we diff and merge video timelines (Premiere Pro XML, DaVinci Resolve DRP)? Can we detect semantic changes (cut, trim, effect) vs. byte-level changes?

**Problem 21: Game Build Dependency Graphs**  
How do we represent and version game build graphs (Unreal, Unity)? Can we detect when a dependency change requires a rebuild?

**Problem 22: Asset Provenance Tracking**  
How do we track where assets came from (source camera, render farm, AI generation)? Can we embed provenance in manifests?

**Problem 23: Multi-Format Project Interoperability**  
Can we convert between Premiere Pro, DaVinci Resolve, Final Cut Pro project formats? What's the common semantic model?

**Problem 24: Real-Time Collaboration**  
Can multiple users edit the same project simultaneously (Google Docs-style)? How do we handle conflicts at the semantic level?

### Performance & Scalability

**Problem 25: Chunking Parallelization**  
Can we parallelize FastCDC chunking across multiple cores? The rolling hash is sequential, but can we use speculative chunking or other techniques?

**Problem 26: VFS Performance at Scale**  
How do we make VFS fast when dealing with millions of files? Can we use in-memory caches, prefetching, or other techniques?

**Problem 27: Index Sharding for Large Repos**  
The index can become huge for repos with 100K+ files. Can we shard it? What's the lookup performance tradeoff?

**Problem 28: Query Performance for Large Histories**  
How do we efficiently query commit history for repos with millions of commits? Can we use specialized indexes or data structures?

**Problem 29: Memory-Efficient Chunk Reconstruction**  
Reconstructing large files can use lots of memory. Can we stream reconstruction? How do we handle random access (seeking) in reconstructed files?

**Problem 30: Distributed Chunk Verification**  
How do we verify chunk integrity across distributed replicas? Can we use erasure coding or other techniques?

### Security & Privacy

**Problem 31: Convergent Encryption Key Management**  
Convergent encryption enables deduplication but requires careful key management. How do we handle key rotation, revocation, and multi-tenant scenarios?

**Problem 32: Zero-Knowledge Proofs for Chunk Existence**  
Can we prove a chunk exists without revealing its content? Useful for auditing and compliance.

**Problem 33: Differential Privacy for Usage Analytics**  
How do we collect usage statistics (which chunks are popular) without revealing user behavior? Can we use differential privacy?

**Problem 34: Secure Multi-Party Chunk Sharing**  
How do we enable secure chunk sharing between untrusted parties? Can we use homomorphic encryption or other techniques?

### User Experience & Workflows

**Problem 35: Intelligent Conflict Resolution UI**  
How do we present binary file conflicts to users? Can we generate visual diffs for images/video? What's the UX for resolving conflicts?

**Problem 36: Offline-First Sync Strategy**  
How do we handle sync when users are frequently offline? What's the conflict resolution strategy? Can we use CRDTs (Conflict-Free Replicated Data Types)?

**Problem 37: Partial Clone & Sparse Checkout**  
Can users clone only part of a repo (specific directories, file types)? How do we handle dependencies?

**Problem 38: Intelligent Prefetching**  
Can we predict what chunks users will need and prefetch them? Should we use machine learning, heuristics, or user hints?

**Problem 39: Bandwidth-Aware UI**  
How do we show users what's being transferred and give them control? Can we pause/resume, prioritize, or schedule transfers?

**Problem 40: Cross-Platform Path Handling**  
How do we handle path differences (Windows vs. Unix) in a way that preserves compatibility? What about case sensitivity, special characters, and path length limits?

---

### How to Help

If you're interested in tackling any of these problems:

1. **Open an issue** describing the problem you want to work on
2. **Propose a solution** or ask questions about the approach
3. **Start a discussion** in GitHub Discussions to gather feedback
4. **Submit a PR** with your implementation (even if it's a prototype)

We're particularly interested in:
- Research papers or prior art that addresses these problems
- Prototype implementations to validate approaches
- Performance benchmarks and analysis
- User experience research and design

**Remember**: Many of these problems don't have clear answers yet. We're looking for creative solutions, not just code. If you have ideas, we want to hear them!

---

## Architecture Overview

### Two-Layer Design
**Layer 1: Universal Bucket (Foundation)**
- Pipeline: `File → FastCDC Chunker → BLAKE3 Hash → Content-Addressable Store`.
- Typical outcomes:
  - Move/copy: 0 bytes transferred (hashes match).
  - Trim start of video: ~5% changes (only affected chunks).
  - Append: size of append only.

**Layer 2: Smart Logic (File-Type Awareness)**
- Tailored behaviors per domain to maximize deduplication and integrity:
  - Video: Version project instructions; align chunks to keyframes.
  - Games: Binary lock + chunk headers to reduce collisions.
  - 3D: Encourage referenced assets vs embedded.
  - Photo: CDC + composite preview extraction.

### Core Components
- FastCDC chunker (variable chunk sizes tuned per profile).
- BLAKE3 hasher (high throughput, 32-byte addresses).
- Content-addressable store (immutability, ref-counted GC).
- Manifest system (version the recipe, not raw bytes).
- Have/Want sync with Bloom filters.
- Virtual filesystem (FUSE/WinFSP) for on-demand hydration.
- Lock manager to avoid binary conflicts.
- QUIC-based transport resilient to network drops.

### What We Solve vs Traditional VCS
| Traditional VCS | Dits |
|-----------------|------|
| Store full file each change | Store only changed chunks |
| Binary files = full copy | CDC catches partial changes |
| Re-encode = new file | Version instructions, not pixels |
| Download entire repo | Partial clone + on-demand fetch |
| Merge conflicts on binary | Explicit locking before edit |

---

## Algorithms

### FastCDC Chunking
- Content-defined chunking for boundary stability under inserts/deletes.
- Typical video profile (example from architecture doc): min 16KB, avg 64KB, max 256KB; normalization to smooth sizes.
- Key behaviors:
  - Only nearby chunks change after small edits.
  - Average size controls dedup vs overhead.
  - Mask derived from avg size (`mask = avg_size - 1`).
- Sample config struct:
```rust
pub struct FastCdcConfig {
    pub min_size: usize;
    pub avg_size: usize;
    pub max_size: usize;
    pub normalization: u8;
    pub mask: u64;
}
```
- Presets (illustrative):
  - `video()`: ~64KB avg for large media
  - `project()`: smaller avg for project/NLE files
  - `small_file()`: tight bounds for configs

### Keyframe Alignment
- Align chunk boundaries to video keyframes (I-frames) when possible.
- Goals: random access without dependency fetch, faster seeking, progressive streaming, partial restore.
- Constraints:
  - Respect FastCDC min/avg/max sizes.
  - Limit maximum shift (`max_shift`) to reach a keyframe.
- Supports common GOP patterns (H.264/HEVC) and editing codecs (ProRes/DNxHD all-I).
```rust
pub struct KeyframeAlignConfig {
    pub max_shift: usize; // bytes allowed to move to hit keyframe
}
```

---

## Data Formats

### Manifest Format (summary)
- Purpose: authoritative record of commit file tree, metadata, chunk refs, dependencies.
- Header (select fields):
  - Magic `MANI`, version byte, compression alg, flags (encrypted, signed, incremental, has dependencies).
  - Checksums, payload sizes, timestamps, commit hash, parent hash, entry count.
- Payload (structures):
  - `ManifestPayload { version, repo_id, commit_hash, parent_hash, entries, directories, dependencies, stats, signature }`
  - `ManifestEntry { path, entry_type, mode, size, content_hash, chunks, metadata, asset_metadata, timestamps }`
  - `ChunkRef { hash, offset, size, compressed_size?, flags }` with flags for keyframe, metadata, encrypted, storage class.
  - `AssetMetadata` for video/audio (duration, dimensions, fps, codec, color info).
- Why manifests matter:
  - A 10GB video reduces to a ~50KB manifest.
  - Comparing versions = comparing manifests.
  - Sync = exchange manifests, then fetch missing chunks only.

### Index Format (summary)
- Role: staging area + working tree cache + merge state + lock tracking.
- Location: `.dits/index`, `.dits/index.lock`, `.dits/MERGE_HEAD`, `.dits/MERGE_MSG`.
- Header highlights:
  - Magic `DIDX`, version, entry/extension counts, timestamps, HEAD hash, flags, CRC.
- Entry structure (select):
  - Timestamps (ctime/mtime), device/inode, mode, uid/gid, file size, content hash (BLAKE3), flags, path.
  - Chunk index extension for staged files: chunk count, algorithm (FastCDC), chunk entries (hash, offset, size).
- Flags: split index, untracked cache, fs monitor, sparse checkout, extended flags (stage, assume unchanged, locked, chunked, modified).
- Extensions: TREE (cached structure), REUC (resolve undo), UNTR (untracked cache), FSMN (fs monitor), and more.

---

## Sync & Transport

### Have/Want Sync
- Minimal bandwidth exchange using Bloom filters.
- Flow (simplified):
  - Client sends Bloom of local chunk hashes (~1KB for ~10k chunks).
  - Server computes missing; returns needs.
  - Client uploads missing chunks; downloads required chunks.
- Enables partial clone and resumable transfers.

### Wire Protocol over QUIC
- Binary protocol for chunk/manifest operations; REST handles metadata.
- Transport:
  - QUIC (TLS 1.3), tunable idle timeout, cwnd, streams, keep-alive.
  - Multiplex concurrent operations on one connection.
- Frame structure:
  - Magic `DITS`, version, type, flags (compressed, encrypted, chunked, final), payload length, request id, payload.
- Message types (selected):
  - Control: PING/PONG, AUTH/AUTH_OK/FAIL, CLOSE, ERROR.
  - Chunks: CHECK, CHECK_RESP, UPLOAD, UPLOAD_ACK, DOWNLOAD, DATA, BATCH_CHECK, BATCH_RESP.
  - Manifests: GET, DATA, PUSH, ACK.
  - Sync: SYNC_REQUEST/RESPONSE, BLOOM_FILTER, DELTA_REQUEST/DATA.
- Goals: efficiency, resumability, multiplexing, security.

---

## Virtual Filesystem & Locking
- VFS: FUSE/WinFSP mount shows repo as a drive; hydrates on access; prefers local cache; pulls only missing chunks.
- Lock Manager:
  - Prevents concurrent binary edits; integrates with index flags.
  - Tracks lock state per path; supports pending/requested states.
  - Important for non-mergeable assets (game binaries, large media).

---

## Domain Workflows

### Video Editors
- Version project instructions (XML/DRP/etc), not rendered pixels.
- Proxy strategy: local or generated proxies; source media fetched once and reused.
- Relinking via VFS keeps paths stable; small project files sync instantly.
- 100-person workflow: editor pushes project delta + selective assets; others pull instantly; source stays local/cache.

### Game Developers
- Problem: binary assets are not mergeable.
- Solution: locks + CDC headers; partial uploads for modified sections.
- Benefits: avoid conflicts, reduce binary churn, keep bandwidth low.

### 3D Artists
- Challenge: embedded assets in `.blend` etc.
- Approach: encourage referenced workflows; dedup shared assets; chunk large scene files.

### Photographers
- Issue: PSD layers change many bytes.
- Approach: CDC plus preview extraction; dedup shared layers across versions.

---

## Tech Stack
| Component | Library/Tool | Rationale |
| :--- | :--- | :--- |
| Core Language | Rust | Memory safety, concurrency |
| CLI Framework | `clap` | Type-safe CLI parsing |
| Chunking Engine | `fastcdc` | Content-defined chunking |
| Hashing | `blake3` | Fast, parallelizable |
| Container Parsing | `mp4`, `isolang` | Safe MP4 atom handling |
| Video Inspection | `ffmpeg-next` | Keyframe detection |
| Local DB | `sled` | Embedded KV |
| Virtual FS | `fuser` (Unix) / `dokany` (Win) | Mount repo as drive |
| Transport | `quinn` (QUIC) | High-performance UDP |
| GUI (future) | Tauri | Lightweight desktop |

---

## Roadmap (9 Phases)
- **Phase 1: Engine** ✅ — Local chunking/dedup; bit-for-bit checkout.
- **Phase 2: Structure Awareness** ✅ — Atom exploder for MP4; metadata-only changes avoid re-upload.
- **Phase 3: Virtual File System** ✅ — Mounted drive; JIT hydration.
- **Phase 3.5: Git Parity** ✅ — Branching, merging, tags, stash.
- **Phase 3.6: Hybrid Storage** ✅ — Git+Dits storage for optimal text/binary handling.
- **Phase 4: Intelligent Collaboration & Sync** ✅ — Real-time sync, adaptive transport, smart caching, offline mode.
- **Phase 5: Conflict & Locking** ✅ — Binary locks; visual diff assistance; performance optimizations.
- **Phase 6: The Hologram** 🚧 — Proxy-based editing (`checkout --proxy`).
- **Phase 7: Creative Ecosystem** 🚧 — Plugin system, creative tool integration, pipeline automation.
- **Phase 8: Deep Freeze** — Tiered storage lifecycle (hot/cold).
- **Phase 9: The Black Box** — Client-side convergent encryption with RBAC keys.

*See [Feature Analysis](docs/architecture/wormhole-feature-analysis.md) and [Prioritized Features](docs/roadmap/prioritized-features.md) for detailed evaluation of upcoming enhancements inspired by modern collaboration tools.*

---

## CLI Usage

### Basics
- Initialize: `dits init`
- Track files: `dits add <path>`
- Commit: `dits commit -m "message"`
- Inspect: `dits status`, `dits log`, `dits diff`
- Sync (when remote configured): `dits push`, `dits pull`

### Common Commands
- Checkout: `dits checkout <ref>`
- Branching: `dits branch <name>`, `dits checkout -b <name>`
- Tagging: `dits tag <name>`
- Restore: `dits restore <path>`
- Reset: `dits reset [--hard|--soft] <ref>`
- Stash: `dits stash [push|pop|list]`
- Config: `dits config <key> [<value>]`
- Status: `dits status [--verbose]`
- Log: `dits log [--oneline|--graph] [--author=<pattern>]`
- Diff: `dits diff [<ref>] [-- <path>]`
- Merge: `dits merge <branch> [--no-ff]`
- Rebase: `dits rebase <branch>`
- Cherry-pick: `dits cherry-pick <commit>`
- Bisect: `dits bisect [start|end|good|bad|reset]`
- Reflog: `dits reflog [show]`
- Blame: `dits blame <file>`
- Show: `dits show [<object>]`
- Grep: `dits grep <pattern> [<path>]`
- Worktree: `dits worktree [add|remove|list] <path>`
- Sparse-checkout: `dits sparse-checkout [init|set|add|list]`
- Hooks: `dits hooks [install|uninstall|run|show] <hook>`
- Archive: `dits archive <ref> [--format=<format>]`
- Describe: `dits describe [--tags] <ref>`
- Shortlog: `dits shortlog [--numbered] [--summary]`
- Maintenance: `dits maintenance [start|stop|run]`
- Completions: `dits completions <shell>`

### Advanced Commands
- Video: `dits video-init`, `dits video-add-clip`, `dits video-show`, `dits video-list`
- Proxy: `dits proxy-generate`, `dits proxy-status`, `dits proxy-list`, `dits proxy-delete`
- Segment: `dits segment <path> [--chunk-size=<size>]`
- Assemble: `dits assemble <manifest> <output>`
- Mount/Unmount: `dits mount [<path>]`, `dits unmount [<path>]`
- Cache: `dits cache-stats [--verbose]`, `dits inspect-file <path>`
- Repository: `dits repo-stats`, `dits fsck`, `dits meta-scan`, `dits meta-show`, `dits meta-list`
- Lifecycle: `dits freeze-init`, `dits freeze-status`, `dits freeze`, `dits thaw`, `dits freeze-policy`
- Security: `dits encrypt-init`, `dits encrypt-status`, `dits login`, `dits logout`, `dits change-password`, `dits audit`, `dits audit-stats`, `dits audit-export`
- Dependencies: `dits dep-check`, `dits dep-graph`, `dits dep-list`
- Collaboration: `dits remote`, `dits push`, `dits pull`, `dits fetch`, `dits clone`
- Locking: `dits lock <path> [--reason=<msg>] [--ttl=<hours>]`, `dits unlock <path>`, `dits locks [--owner=<user>]`
- Maintenance: `dits gc`, `dits clean [--dry-run]`, `dits maintenance [run|start|stop]`

---

## Self-Hosting
- **Docker Compose (quick start, <20 users)**:
  - Services: `dits-server`, Postgres, Redis, MinIO (S3-compatible).
  - Env vars: `DATABASE_URL`, `REDIS_URL`, `S3_*`, `JWT_SECRET`.
  - Init: `docker-compose up -d`; `dits-migrate up`; create admin via `dits-admin`.
- **Kubernetes (production)**:
  - Deployments with config/secret separation; horizontal replicas; probes.
  - Requires Postgres, Redis, S3-compatible storage; cache volumes.
  - Configure JWT/DB/S3 secrets; tune resources and probes.

---

## Operations Notes
- Transport: QUIC tuned for high throughput; keep-alive and stream limits configurable.
- Caching: local-first; popular chunks cache-friendly; supports partial clone.
- Integrity: content-addressable store; manifests carry checksums; optional signatures/encryption flags.
- Locking: honor lock flags in index; coordinate via server for team workflows.

---

## Testing & Quality

### Comprehensive Testing Infrastructure
DITS includes the most extensive testing framework for any version control system, covering 80+ file formats and all major use cases:

- **120+ Automated Tests**: Git-inspired shell script tests + Rust unit tests
- **File Format Coverage**: 3D (OBJ/FBX/glTF/USD), Game Assets (Unity/Unreal), Video, Images, Audio, Custom formats
- **Git Recovery Testing**: Full Git operations (diff/merge/blame/reset) on binary creative assets
- **Stress Testing**: 1TB workload simulation through extreme concurrency
- **Cross-Platform**: Windows/macOS/Linux filesystem and path handling
- **Network Resilience**: Connection failures, timeouts, interruptions
- **Long-term Aging**: Repository corruption recovery, migration scenarios
- **Performance Regression**: Benchmarks and scaling validation

### Test Categories
- **Basic**: Core functionality, CLI commands, repository lifecycle
- **Core**: FastCDC chunking, video processing, file type handling
- **QA**: Edge cases, concurrency, data integrity, security, stress testing
- **Advanced**: Workflow simulations, P2P networking, storage lifecycle

### Running Tests
```bash
# Run all tests
just test-all

# Run specific test categories
just test-creative-all        # Creative assets and Git recovery
just test-qa-extended         # All QA tests including new ones
just test-cross-platform      # Cross-platform compatibility
just test-network-failures    # Network failure scenarios
just test-aging              # Long-term aging tests
just test-massive-concurrency # 1TB simulation tests

# Run individual test suites
just test-creative-assets     # Comprehensive creative asset tests
just test-git-recovery-creative # Git recovery for creative assets

# Performance and quality checks
cargo test                    # Rust unit tests
cargo clippy --all-targets --all-features  # Lints
cargo fmt                     # Format checking
just check                    # All quality checks
```

### Test Quality Assurance
- **Chainlint**: Shell script quality validation (Git's own linter)
- **Determinism Testing**: Chunking and hashing consistency
- **Recovery Testing**: Corruption and data loss scenarios
- **Performance Regression**: Automatic benchmark validation

---

## Contributing
- Code of Conduct applies; be respectful, constructive, collaborative.
- Prereqs: Rust 1.75+, Node.js 20+ (for web UI), PostgreSQL 15+, Docker.
- Workflow:
  - Branches: `feature/*`, `fix/*`, `docs/*`, `refactor/*`.
  - Conventional Commits (`<type>(<scope>): <description>`).
  - Write tests for new behavior; update docs; run fmt/clippy/tests before PR.
- Repo structure (high level):
  - `crates/` — core engine, client, server, storage, parsers, protocol, SDK.
  - `web/` — web UI.
  - `plugins/` — NLE/editor plugins.
  - `docs/`, `tests/`, `benches/`.

---

## Glossary
- **CDC / FastCDC**: Content-defined chunking algorithm producing variable-size chunks resilient to insert/delete shifts.
- **CAS**: Content-addressable store for immutable chunk objects.
- **Manifest**: Recipe describing how to reconstruct files from chunks, with metadata and dependencies.
- **Index**: Staging/working tree cache tracking file state, locks, and merge info.
- **Have/Want**: Sync exchange describing which chunks each side possesses.
- **Bloom Filter**: Probabilistic set summary used to compress "have" lists.
- **QUIC**: UDP-based transport with TLS 1.3; used for chunk transfer.
- **Proxy**: Lower-res or alternative rendition used for editing when originals are heavy.
- **Ditshub**: Hosted service providing managed storage/compute/collaboration atop the open-core `dits`.

---

## Storage Layout
- Repo roots keep metadata in `.dits/`:
  - `objects/` — chunk data, addressed by BLAKE3 hash (flat CAS).
  - `manifests/` — manifest payloads keyed by commit hash.
  - `refs/` — `HEAD`, branches, tags.
  - `index` — staging/working tree cache; `index.lock` for atomic updates.
  - `MERGE_HEAD`, `MERGE_MSG` — present during merges.
- Properties:
  - Objects are immutable; duplicates are impossible (same hash, same bytes).
  - Reference counting drives garbage collection.
  - Split index/untracked cache/fsmonitor/sparse checkout supported via index extensions.

---

## Data Structures (Summary)
- **Chunk**: `hash`, `offset`, `size`, optional `compressed_size`, flags (keyframe/metadata/encrypted/storage class).
- **ManifestEntry**: path, entry type (file/symlink/dir/submodule), mode, size, content hash, chunk list, metadata, asset metadata, timestamps.
- **ManifestPayload**: version, repo_id, commit_hash, parent_hash, entries, directories, dependency graph, stats, optional signature.
- **Commit**: hash, parent(s), author, timestamp, message, manifest refs.
- **Index Entry**: ctime/mtime, device/inode/mode/uid/gid, file size, content hash, flags, path; optional chunk index per staged file.
- **Lock state**: tracked via index extended flags; server coordinates multi-user locks.

---

## MP4/ISOBMFF Handling & Transparent Decompression
- Goal: keep media playable and deduplicated.
- Atom-aware strategy:
  - Detect `.mp4`/`mov` containers; avoid chunking through `moov` atom to preserve metadata integrity.
  - Chunk `mdat` separately; metadata-only edits avoid full re-upload.
- Keyframe-aware chunking:
  - Align boundaries to sync samples (I-frames) when available to ensure random access without extra dependencies.
- Transparent decompression (high level):
  - Streams may be chunked/compressed; reader validates checksum and optionally decompresses on the fly.
  - Always verify BLAKE3 checksum post-read (critical safety rule).
  - Support for partial fetch + reassembly enables range-based operations and fast seeks.

---

## Safety & Security Checklist
- Input validation at boundaries; reject path traversal and oversize inputs.
- Content verification: checksum every read; manifests/index carry checksums; optional signatures.
- Locking and conflict prevention for binary assets.
- Network: QUIC with TLS 1.3; timeouts on external calls.
- Storage: immutable CAS; reference counting; tiered storage possible (hot/cold).
- Authentication/Authorization (Ditshub/server):
  - JWT-based auth; SSO/SAML in hosted offering.
  - Resource-level permissions; audit logging for sensitive ops.
- Never: hardcoded secrets, skipping checksum verification, silent error swallowing, deterministic nonces for encryption.

---

## Performance Targets
- Chunk 1GB file: < 5s (FastCDC + parallel hashing).
- Hash 1GB: < 1s (BLAKE3 parallel).
- Local upload: saturate link; >500 MB/s on LAN.
- Clone 10GB repo: < 2 minutes on 1 Gbps with caching.
- Status check: <100ms with index/untracked cache/fsmonitor.
- VFS open: <50ms with cached metadata and on-demand fetch.

### Detailed Performance Benchmarks

| Operation | Throughput | Latency | Notes |
|-----------|------------|---------|-------|
| BLAKE3 hashing | 3+ GB/s | - | Single core, parallelizes to 32+ GB/s |
| FastCDC chunking | 2+ GB/s | - | With SIMD acceleration |
| Chunk upload (LAN) | 500+ MB/s | <1ms | Saturates gigabit links |
| Chunk upload (WAN) | Link speed | <50ms | BBR congestion control |
| Incremental sync | 250 MB/s | <5s for 1MB change | Bloom filter optimization |
| VFS read (cached) | 1+ GB/s | <1ms | Memory-mapped cache |
| VFS read (fetch) | Link speed | <50ms | On-demand chunk hydration |

### Hardware-Specific Optimizations

| Platform | Optimization | Impact |
|----------|--------------|--------|
| x86_64 AVX2 | SIMD chunking + hashing | 2-4x throughput |
| x86_64 AVX-512 | 512-bit vector operations | 3-5x throughput |
| ARM64 NEON | Vector processing | 2-3x throughput |
| Apple Silicon | Unified memory + AMX | 4-6x throughput |
| Linux io_uring | Async I/O | 2-7x IOPS |

### Memory Efficiency

| Operation | Memory Usage | Technique |
|-----------|--------------|-----------|
| 1GB file chunk | <100 MB | Streaming chunker |
| 10GB file chunk | <200 MB | Memory-mapped I/O |
| 100GB file chunk | <500 MB | Zero-copy + buffer pools |
| Bloom filter (10M chunks) | ~12 MB | 1% false positive rate |
| Manifest (1M files) | ~50 MB | Compact binary format |

See `docs/performance/benchmarks.md` for comprehensive benchmarks and `docs/operations/performance-tuning.md` for optimization guides.

---

## Operations: Failure Modes & Runbooks
- Network drops: QUIC resumability; partial transfers continue.
- Cache corruption: verify checksums; refetch missing chunks; GC quarantines bad objects.
- Lock contention: honor lock flags; expose status; admins can clear stale locks with audit.
- High latency: tune QUIC cwnd/streams/keep-alive; enable proxy/hologram mode to reduce payloads.
- Storage pressure: run GC with refcounts; enforce lifecycle to cold storage; monitor object growth.
- Runbooks: see `docs/operations/runbooks/` for database issues, scaling, service down, high latency playbooks.

---

## API Surface (REST + Wire)
- REST (metadata):
  - Repos, branches, tags, users/teams, permissions, locks, manifests listing.
  - Webhooks for push/pull/lock events (see `docs/api/webhooks.md`).
- Wire protocol (bulk data over QUIC):
  - Chunk existence checks, uploads/downloads (batch-aware).
  - Manifest get/push.
  - Sync negotiation (Bloom filters, delta requests).
- Message framing: magic `DITS`, versioned types, flags (compressed/encrypted/chunked/final), request IDs.
- Authentication: token/session/SSH (per wire protocol AUTH).

---

## Action Plan Highlights
- Phases 1-3: local engine, MP4 structure awareness, VFS.
- Phases 4-6: collaboration over QUIC, locking/conflict tooling, proxy/hologram workflows.
- Phases 7-9: dependency graph to avoid "media offline," tiered storage economics, client-side convergent encryption with RBAC.

---

## Engineering Deep Dive

### FastCDC Algorithm Implementation

**Core Mechanism**: Content-defined chunking uses a rolling hash (gear hash) to find boundaries based on content patterns, not fixed offsets. This ensures insertions/deletions only affect nearby chunks.

**Gear Hash Table**: Precomputed 256-entry lookup table for rolling hash:
```rust
pub static GEAR_TABLE: [u64; 256] = [
    0x5851F42D4C957F2D, 0xE0E8F8C8C8485C5E, 0x8A9D3C6E2F7B1A40,
    // ... 253 more values generated via xorshift64 PRNG
];
```

**Rolling Hash Function**:
```rust
pub struct GearHash {
    hash: u64,
}

impl GearHash {
    #[inline(always)]
    pub fn roll(&mut self, byte: u8) -> u64 {
        self.hash = (self.hash << 1).wrapping_add(GEAR_TABLE[byte as usize]);
        self.hash
    }
}
```

**Boundary Detection Algorithm**:
1. **Skip minimum region** (min_size bytes): No boundary checks, just accumulate hash.
2. **Small region** (min_size to avg_size): Use `mask_s` (harder mask, fewer bits set) - boundaries are less likely.
3. **Large region** (avg_size to max_size): Use `mask_l` (easier mask, more bits set) - boundaries more likely to force chunk completion.
4. **Force boundary** at max_size if no boundary found.

**Mask Calculation**:
```rust
let bits = (avg_size as f64).log2() as u32;
let mask = (1u64 << bits) - 1;           // Base mask
let mask_s = mask >> normalization;       // Harder (fewer boundaries before avg)
let mask_l = mask << normalization;      // Easier (more boundaries after avg)
```

**Video-Optimized Configuration**:
```rust
FastCdcConfig {
    min_size: 32 * 1024,     // 32KB - prevents tiny chunks
    avg_size: 64 * 1024,     // 64KB - target for video
    max_size: 256 * 1024,    // 256KB - limits memory usage
    normalization: 2,        // Smooth size distribution
    mask: 0xFFFF,            // 16 bits
    mask_s: 0x3FFF,          // 14 bits (harder)
    mask_l: 0x3FFFF,         // 18 bits (easier)
}
```

**Streaming Implementation**: For files too large for memory, use buffered chunker:
- Buffer size: `max_size * 2` for lookahead
- Process chunks as buffer fills
- Compact buffer when `pending_start > max_size`
- Emit final chunk on `finish()`

**SIMD Optimization** (x86_64): Process 32 bytes at a time using AVX2:
```rust
#[cfg(target_arch = "x86_64")]
unsafe fn find_boundary_simd(data: &[u8], start: usize, mask: u64) -> Option<usize> {
    let chunk = _mm256_loadu_si256(data[pos..].as_ptr() as *const __m256i);
    // Compute 32 hash updates in parallel
    // Check boundaries every 32 bytes
}
```

**Performance Characteristics**:
- Throughput: ~2 GB/s on modern CPUs
- Deterministic: Same input always produces same chunks
- Boundary stability: Insertions only affect nearby chunks
- Memory: O(1) for streaming, O(n) for in-memory

---

### Keyframe Alignment Algorithm

**Purpose**: Adjust FastCDC boundaries to align with video keyframes (I-frames) for random access without dependency chains.

**Keyframe Extraction from ISOBMFF**:
1. Parse `moov` box to find video track
2. Locate `stbl` (sample table) within `mdia` → `minf` → `stbl`
3. Read `stss` (sync sample table) - lists keyframe sample numbers (1-indexed)
4. Read `stsz` (sample sizes) to get byte sizes
5. Read `stco`/`co64` (chunk offsets) and `stsc` (sample-to-chunk mapping)
6. Calculate byte offsets: `offset = chunk_offset + sum(sample_sizes[0..sample_idx])`
7. If no `stss` exists, all samples are sync (ProRes/DNxHD all-intra)

**Alignment Decision Function**:
```rust
fn should_align(
    original: u64,           // CDC boundary
    keyframe: u64,          // Nearest keyframe offset
    distance: i64,          // Bytes to shift
    prev_end: u64,          // Previous chunk end
    config: &KeyframeAlignConfig,
    cdc_config: &FastCdcConfig,
) -> bool {
    // Reject if shift too large
    if distance.unsigned_abs() as usize > config.max_shift {
        return false;
    }
    
    // Check resulting chunk size
    let new_size = keyframe - prev_end;
    if new_size < config.absolute_min as u64 {
        return false;
    }
    if new_size > cdc_config.max_size as u64 {
        return false;
    }
    
    // Weighted decision based on distance
    let distance_factor = 1.0 - (distance.unsigned_abs() as f64 / config.max_shift as f64);
    config.prefer_keyframe && (distance_factor * config.keyframe_weight > 0.3)
}
```

**Edge Case Handling**:

**All-Intra Codecs** (ProRes, DNxHD): Every frame is a keyframe. Strategy:
- Align to frame boundaries when possible
- Respect CDC size constraints
- Average frames per chunk: `avg_size / average_frame_size`

**Variable Frame Rate**: Calculate spacing variance:
```rust
let variance = spacings.iter()
    .map(|&s| (s as f64 - avg_spacing).powi(2))
    .sum::<f64>() / spacings.len() as f64;
    
// High variance = reduce alignment aggressiveness
let keyframe_weight = if variance > avg_spacing * 0.5 {
    0.5  // Less aggressive
} else {
    0.8  // Normal
};
```

**Long-GOP Content** (H.264, H.265): Keyframes may be 2-5 seconds apart:
- Align to keyframes when possible
- Add intermediate CDC boundaries for gaps > max_size
- Create intermediate chunks: `gap / avg_size` chunks

**Performance**: Cache keyframe positions in LRU cache to avoid re-parsing on repeated access.

---

### Error Handling & Safety Guarantees

**Mandatory Checksum Verification**:
```rust
// CRITICAL: Always verify on read
pub async fn read_chunk(hash: &Blake3Hash) -> Result<Chunk, StorageError> {
    let data = storage.get(hash).await?;
    
    // Always verify - never skip
    let computed_hash = blake3::hash(&data);
    if computed_hash != *hash {
        metrics::increment_counter!("storage.corruption_detected");
        return recover_from_replicas(hash).await;
    }
    
    Ok(Chunk::new(data))
}
```

**Atomic Reference Counting**:
```sql
-- Use PostgreSQL advisory locks for atomic ref counting
CREATE OR REPLACE FUNCTION adjust_chunk_refs(
    p_chunk_hash BYTEA,
    p_delta INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Acquire advisory lock on chunk hash
    PERFORM pg_advisory_xact_lock(hashtext(encode(p_chunk_hash, 'hex')));
    
    UPDATE chunk_refs
    SET ref_count = ref_count + p_delta,
        updated_at = NOW()
    WHERE chunk_hash = p_chunk_hash
    RETURNING ref_count INTO v_new_count;
    
    IF NOT FOUND AND p_delta > 0 THEN
        INSERT INTO chunk_refs (chunk_hash, ref_count)
        VALUES (p_chunk_hash, p_delta)
        RETURNING ref_count INTO v_new_count;
    END IF;
    
    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql;
```

**Saga Pattern for Multi-Step Operations**:
```rust
struct SagaStep<T> {
    execute: Box<dyn Fn() -> Future<Output = Result<T>>>,
    compensate: Box<dyn Fn(T) -> Future<Output = Result<()>>>,
}

impl CommitSaga {
    async fn execute(&mut self, steps: Vec<SagaStep>) -> Result<()> {
        let mut completed = Vec::new();
        
        for step in steps {
            match step.execute().await {
                Ok(result) => completed.push((step, result)),
                Err(e) => {
                    // Compensate in reverse order
                    for (step, result) in completed.into_iter().rev() {
                        if let Err(comp) = step.compensate(result).await {
                            // Log for manual intervention
                            self.create_incident_ticket(step, comp).await?;
                        }
                    }
                    return Err(e);
                }
            }
        }
        Ok(())
    }
}
```

**Write-After-Read Verification** (for critical objects):
```rust
async fn write_with_verification(
    key: &str,
    data: &[u8],
    critical: bool,
) -> Result<()> {
    storage.put(key, data).await?;
    
    if critical {
        // Wait for eventual consistency (S3)
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        // Verify write
        let read_back = storage.get(key).await?;
        let read_hash = blake3::hash(&read_back);
        let expected_hash = blake3::hash(data);
        
        if read_hash != expected_hash {
            return Err(StorageError::ConsistencyError(key.to_string()));
        }
    }
    
    Ok(())
}
```

**Index Corruption Recovery**:
```rust
struct IndexJournal {
    entries: Vec<JournalEntry>,
    checkpoint_hash: Blake3Hash,
}

impl Index {
    fn write_with_journal(&self, path: &Path) -> io::Result<()> {
        let journal_path = path.with_extension("journal");
        
        // Write journal first (append-only log)
        let journal = self.create_journal();
        journal.write(&journal_path)?;
        
        // Write new index to temp file
        let temp_path = path.with_extension("tmp");
        self.write(&temp_path)?;
        
        // Atomic rename
        fs::rename(&temp_path, path)?;
        
        // Remove journal on success
        fs::remove_file(&journal_path)?;
        Ok(())
    }
    
    fn recover(path: &Path) -> io::Result<Self> {
        let journal_path = path.with_extension("journal");
        if journal_path.exists() {
            // Recover from journal
            let journal = IndexJournal::read(&journal_path)?;
            return Self::rebuild_from_journal(journal);
        }
        Self::read(path)
    }
}
```

---

### Concurrency & Locking

**Distributed Locking (Redlock)**:
```rust
use redis::Commands;

struct LockManager {
    redis: RedisPool,
}

impl LockManager {
    async fn acquire_lock(
        &self,
        resource: &str,
        ttl: Duration,
    ) -> Result<LockToken> {
        let token = generate_random_token();
        let end = Instant::now() + ttl;
        
        // Try to acquire on majority of Redis instances
        let mut acquired = 0;
        for redis_instance in &self.redis.instances {
            let result: bool = redis_instance
                .set_nx_ex(resource, &token, ttl.as_secs() as usize)?;
            if result {
                acquired += 1;
            }
        }
        
        // Must acquire on majority
        if acquired >= (self.redis.instances.len() / 2 + 1) {
            Ok(LockToken { resource: resource.to_string(), token, end })
        } else {
            // Release any acquired locks
            self.release_partial(resource, &token).await?;
            Err(LockError::Failed)
        }
    }
}
```

**Client-Side Lock Enforcement**:
```rust
// VFS read interceptor checks lock status
async fn vfs_read(path: &Path, offset: u64, len: usize) -> Result<Vec<u8>> {
    let lock_status = check_lock_status(path).await?;
    
    if lock_status.is_locked_by_other() {
        // Return read-only (0444) - allow reads but prevent writes
        return read_with_readonly_flag(path, offset, len).await;
    }
    
    read_normal(path, offset, len).await
}
```

**Reference Count Race Prevention**:
- Use database row-level locks (SELECT FOR UPDATE)
- Wrap in transactions
- Constraint: `CHECK (ref_count >= 0)` prevents underflow
- Log all ref count changes for audit trail

---

### Network Protocol Engineering

**QUIC Configuration**:
```rust
pub struct QuicConfig {
    pub server: SocketAddr,
    pub port: u16,                    // 4433 default
    pub idle_timeout: Duration,       // 30 seconds
    pub initial_cwnd: u64,           // 10 * MSS
    pub max_streams: u64,             // 100 concurrent
    pub max_stream_data: u64,         // 16 MB per stream
    pub max_connection_data: u64,    // 256 MB total
    pub keep_alive: Duration,         // 10 seconds
}
```

**Message Frame Structure**:
```
+--------+--------+--------+--------+--------+--------+--------+--------+
|  Magic (4)      | Version| Type   | Flags  | Reserved|
+--------+--------+--------+--------+--------+--------+--------+--------+
|                    Payload Length (4 bytes, big-endian)                |
+--------+--------+--------+--------+--------+--------+--------+--------+
|                    Request ID (8 bytes)                                |
+--------+--------+--------+--------+--------+--------+--------+--------+
|                                                                       |
|                         Payload (variable)                            |
|                                                                       |
+--------+--------+--------+--------+--------+--------+--------+--------+
```

**Flags Bitfield**:
- Bit 0: COMPRESSED (zstd-compressed payload)
- Bit 1: ENCRYPTED (beyond TLS encryption)
- Bit 2: CHUNKED (payload spans multiple frames)
- Bit 3: FINAL (last frame in chunked sequence)
- Bits 4-7: Reserved

**Resumable Upload Protocol**:
```rust
struct ResumableUpload {
    upload_id: String,
    bytes_confirmed: u64,
}

impl ResumableUpload {
    async fn upload(&mut self, data: &[u8]) -> Result<()> {
        // Query server for confirmed progress
        self.bytes_confirmed = self.get_confirmed_progress().await?;
        
        // Resume from confirmed point
        let remaining = &data[self.bytes_confirmed as usize..];
        self.upload_chunk(remaining).await?;
        Ok(())
    }
}
```

**Bloom Filter for Have/Want Sync**:
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

### Storage Integrity Patterns

**Tier Migration Safety**:
```rust
async fn migrate_chunk(
    hash: &Blake3Hash,
    from_tier: Tier,
    to_tier: Tier,
) -> Result<()> {
    // 1. Copy to destination first (don't delete source)
    let data = from_tier.read(hash).await?;
    to_tier.write(hash, &data).await?;
    
    // 2. Update routing atomically with fallback
    update_routing(hash, to_tier, Some(from_tier)).await?;
    
    // 3. Wait for in-flight requests to complete
    wait_for_quiescence(hash).await?;
    
    // 4. Delete from source
    from_tier.delete(hash).await?;
    
    // 5. Remove fallback routing
    update_routing(hash, to_tier, None).await?;
    Ok(())
}
```

**Garbage Collection Checkpointing**:
```sql
CREATE TABLE gc_checkpoints (
    cycle_id UUID PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    phase VARCHAR(50) NOT NULL,  -- 'mark', 'sweep', 'compact'
    last_processed_key TEXT,
    chunks_marked INTEGER DEFAULT 0,
    chunks_swept INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'running'
);

-- On startup, resume from checkpoint
SELECT * FROM gc_checkpoints
WHERE status = 'running'
ORDER BY started_at DESC
LIMIT 1;
```

**Orphaned Chunk Detection**:
```sql
-- Find chunks with no manifest references
SELECT c.hash, c.uploaded_at, c.size
FROM chunks c
LEFT JOIN manifest_chunks mc ON c.hash = mc.chunk_hash
WHERE mc.chunk_hash IS NULL
  AND c.uploaded_at < NOW() - INTERVAL '24 hours'
ORDER BY c.uploaded_at;
```

---

### Performance Engineering

**Parallel Hashing**:
```rust
use rayon::prelude::*;

fn hash_chunks_parallel(chunks: &[Chunk]) -> Vec<Blake3Hash> {
    chunks.par_iter()
        .map(|chunk| blake3::hash(chunk.data()))
        .collect()
}
```

**SIMD-Accelerated Chunking** (x86_64):
- Process 32 bytes at a time using AVX2
- Reduces boundary detection overhead by ~4x
- Falls back to scalar on non-SIMD architectures

**Caching Strategy**:
- L1: In-memory LRU cache (moka) for hot chunks
- L2: Disk cache (`.dits/objects`) for recently accessed
- L3: Remote fetch via QUIC with prefetching
- Prefetch: When reading chunk N, prefetch N+1, N+2

**Connection Pooling**:
- QUIC connection reuse across requests
- Keep-alive pings every 10 seconds
- Idle timeout: 30 seconds
- Max concurrent streams: 100 per connection

---

### Testing Strategy

**Determinism Tests**:
```rust
#[test]
fn test_chunk_determinism() {
    let data = include_bytes!("../fixtures/sample.bin");
    let config = FastCdcConfig::default();
    
    let chunks1: Vec<_> = FastCdc::new(data, config.clone()).collect();
    let chunks2: Vec<_> = FastCdc::new(data, config.clone()).collect();
    
    assert_eq!(chunks1.len(), chunks2.len());
    for (c1, c2) in chunks1.iter().zip(chunks2.iter()) {
        assert_eq!(c1.offset, c2.offset);
        assert_eq!(c1.length, c2.length);
    }
}
```

**Boundary Stability Tests**:
```rust
#[test]
fn test_boundary_stability() {
    let original = b"AAAABBBBCCCCDDDD";
    let modified = b"XAAAABBBBCCCCDDDD";  // Prepend X
    
    let config = FastCdcConfig { min_size: 2, avg_size: 4, max_size: 8, ..Default::default() };
    
    let chunks_orig: Vec<_> = FastCdc::new(original, config.clone()).collect();
    let chunks_mod: Vec<_> = FastCdc::new(modified, config.clone()).collect();
    
    // Most chunks should match after insertion point
    assert_eq!(chunks_orig[1..], chunks_mod[2..]);
}
```

**Reconstruction Tests**:
```rust
#[test]
fn test_reconstruction() {
    let original = include_bytes!("../fixtures/sample.bin");
    let chunks = chunk_data(original);
    
    let reconstructed: Vec<u8> = chunks
        .iter()
        .flat_map(|c| c.data.iter().copied())
        .collect();
    
    assert_eq!(original.as_slice(), reconstructed.as_slice());
}
```

**Integration Tests**:
- End-to-end workflow: init → add → commit → push → pull → checkout
- Network failure simulation: inject packet loss, timeouts
- Concurrent access: multiple clients modifying same repo
- Storage failure: simulate S3 errors, disk full

---

### Known Critical Issues & Solutions

**STOR-C1: Missing Checksum Verification** (P0)
- **Solution**: Always verify BLAKE3 hash on read
- **Implementation**: Mandatory verification in `read_chunk()`

**STOR-C2: Race Condition in Reference Counting** (P0)
- **Solution**: PostgreSQL advisory locks for atomic operations
- **Implementation**: `adjust_chunk_refs()` function with row locks

**STOR-C3: No Atomic Multi-Step Transactions** (P0)
- **Solution**: Saga pattern with compensation
- **Implementation**: `CommitSaga` with rollback on failure

**NET-C1: No Network Partition Detection** (P0)
- **Solution**: Quorum-based partition detector
- **Implementation**: Majority vote across Redis instances

**SEC-C2: Deterministic Nonces Break AEAD Security** (P0)
- **Solution**: Content hash + random component for nonces
- **Implementation**: `nonce = blake3(content || random_bytes(16))`

See `docs/architecture/known-issues-and-solutions.md` for complete list of 115 identified issues with solutions.

---

### Edge Cases & Failure Modes

**Chunk Write Succeeds but Verification Fails**:
- Detection: Read-after-write verification
- Recovery: Retry write, try alternate location, mark suspect
- Prevention: ECC memory, storage checksums, end-to-end verification

**Partial Manifest Write**:
- Detection: Trailing checksum validation
- Recovery: Delete partial, rebuild from chunks, restore from last commit
- Prevention: Temp file + atomic rename, trailing checksum

**Reference Count Underflow**:
- Detection: Database constraint `CHECK (ref_count >= 0)`
- Recovery: Halt GC, rebuild from manifests, investigate
- Prevention: Transactions with row locks, audit logging

**Storage Tier Mismatch**:
- Detection: Read fails on expected tier, succeeds on fallback
- Recovery: Automatic metadata correction, consistency audits
- Prevention: Atomic tier migration, two-phase copy/update/delete

**Connection Drops During Upload**:
- Detection: Connection reset, partial data received
- Recovery: Query confirmed bytes, resume from checkpoint
- Prevention: Smaller chunks, server-side progress tracking, heartbeats

See `docs/architecture/edge-cases-failure-modes.md` for 40+ failure scenarios with detailed handling strategies.
