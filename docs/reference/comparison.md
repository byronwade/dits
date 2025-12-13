# Dits vs. Alternatives: Complete Comparison Guide

A comprehensive comparison of Dits with other version control and file management solutions for large binary files.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Comparison Matrix](#quick-comparison-matrix)
3. [Dits vs. Git LFS](#dits-vs-git-lfs)
4. [Dits vs. Perforce Helix Core](#dits-vs-perforce-helix-core)
5. [Dits vs. SVN (Subversion)](#dits-vs-svn-subversion)
6. [Dits vs. Dropbox / Google Drive](#dits-vs-dropbox--google-drive)
7. [Dits vs. Frame.io](#dits-vs-frameio)
8. [Dits vs. Plastic SCM](#dits-vs-plastic-scm)
9. [Dits vs. DVC (Data Version Control)](#dits-vs-dvc-data-version-control)
10. [When to Use What](#when-to-use-what)
11. [Hybrid Approaches](#hybrid-approaches)

---

## Overview

Dits is designed specifically for version control of large binary files—video, audio, images, 3D assets, and game builds. Unlike tools that were originally built for source code or simple file syncing, Dits understands binary file formats and optimizes storage and transfers accordingly.

### Key Dits Innovations

| Feature | What It Means |
|---------|---------------|
| **Content-Defined Chunking** | Files split into ~1MB chunks based on content, enabling deduplication |
| **Video-Aware Chunking** | Chunks align to keyframes for optimal deduplication |
| **Hybrid Storage** | Text files use Git-style storage, binaries use Dits CDC |
| **P2P Sharing** | Direct transfer between computers without cloud |
| **Virtual Filesystem** | Mount repos as drives, download files on demand |
| **File Locking** | Prevent conflicts on binary files |

---

## Quick Comparison Matrix

### Feature Comparison

| Feature | Dits | Git LFS | Perforce | Dropbox | Frame.io | Plastic SCM |
|---------|------|---------|----------|---------|----------|-------------|
| **Designed for binaries** | Yes | No | Partial | No | Yes | Partial |
| **Deduplication** | Chunk-level | None | File-level | File-level | None | File-level |
| **Video-aware** | Yes | No | No | No | Yes | No |
| **Distributed** | Yes | Yes | No | No | No | Yes |
| **Offline work** | Full | Full | Limited | Partial | No | Full |
| **File locking** | Yes | Yes | Yes | No | No | Yes |
| **P2P sharing** | Yes | No | No | No | No | No |
| **VFS mounting** | Yes | No | Yes | Yes | No | Yes |
| **Open source** | Yes | Yes | No | No | No | Free tier |
| **Self-hosting** | Yes | Yes | Yes | No | No | Yes |

### Storage Efficiency

| Scenario | Git | Git LFS | Dits | Dropbox |
|----------|-----|---------|------|---------|
| 10GB video, 5 versions | 50 GB | 50 GB | ~15 GB | 50 GB |
| 100 similar RAW photos (500MB each) | 50 GB | 50 GB | ~8 GB | 50 GB |
| Game build, 10 iterations | 100 GB | 100 GB | ~25 GB | 100 GB |
| PSD file, 20 saves | 10 GB | 10 GB | ~2 GB | 10 GB |

### Cost Comparison (Team of 10, 1TB data)

| Solution | Setup | Monthly Cost | Notes |
|----------|-------|--------------|-------|
| **Dits + DitsHub** | Free | ~$100 | Deduplication reduces actual storage |
| **Git + GitHub LFS** | Free | ~$250+ | LFS data packs expensive |
| **Perforce** | Complex | $390+ | Per-user licensing |
| **Dropbox Business** | Easy | $150+ | No version control features |
| **Frame.io** | Easy | $249+ | Review-focused, not VC |
| **Dits (Self-hosted)** | Moderate | Infra only | Open source, your hardware |

---

## Dits vs. Git LFS

### What is Git LFS?

Git LFS (Large File Storage) is an extension to Git that stores large files on a separate server, keeping only pointers in the Git repository.

### Architecture Comparison

```
Git LFS:
┌─────────────┐        ┌─────────────┐
│ Git Repo    │───────▶│ LFS Server  │
│ (pointers)  │        │ (full files)│
└─────────────┘        └─────────────┘

Dits:
┌─────────────────────────────────────┐
│           Dits Repository           │
│  ┌─────────────┬─────────────────┐  │
│  │ Text Files  │  Binary Files   │  │
│  │  (libgit2)  │  (CDC chunks)   │  │
│  └─────────────┴─────────────────┘  │
└─────────────────────────────────────┘
```

### Feature-by-Feature Comparison

| Feature | Git LFS | Dits |
|---------|---------|------|
| **Storage model** | Pointer files in Git, full files in LFS | Unified repo with hybrid storage |
| **Deduplication** | None (each version stored fully) | Content-defined chunking (80-95% savings) |
| **Binary diff** | "Binary files differ" | Chunk-level changes shown |
| **Clone time** | Downloads all LFS files | Sparse clone, download on demand |
| **Setup complexity** | Requires Git + LFS installation | Single binary |
| **Learning curve** | Git knowledge + LFS commands | Git-like commands |
| **Merge conflicts** | "Choose ours/theirs" only | Locking prevents conflicts |
| **File locking** | Available (experimental) | Built-in, robust |
| **Self-hosted** | Requires separate LFS server | Single server |

### Storage Example

**Scenario: 5 versions of a 10GB video file**

```
Git LFS:
  Version 1: 10 GB (stored fully)
  Version 2: 10 GB (stored fully)
  Version 3: 10 GB (stored fully)
  Version 4: 10 GB (stored fully)
  Version 5: 10 GB (stored fully)
  Total: 50 GB

Dits:
  Version 1: 10 GB (10,000 chunks)
  Version 2: 0.5 GB (only changed chunks)
  Version 3: 0.3 GB (only changed chunks)
  Version 4: 0.4 GB (only changed chunks)
  Version 5: 0.2 GB (only changed chunks)
  Total: ~11.4 GB (77% savings)
```

### When to Choose Git LFS

- You already have a Git-based workflow
- Team is deeply familiar with Git
- Files change completely between versions (no dedup benefit)
- You need tight GitHub/GitLab integration

### When to Choose Dits

- Large binary files are primary content (video, game assets)
- Storage costs are a concern
- You need efficient network transfers
- Offline/P2P sharing is important
- Team is new to version control

### Migration Path

```bash
# Migrate from Git LFS to Dits
cd your-git-lfs-repo
git lfs pull --all  # Ensure all files are local

dits init
dits add .
dits commit -m "Migrated from Git LFS"
dits remote add origin https://ditshub.com/org/project
dits push -u origin main
```

---

## Dits vs. Perforce Helix Core

### What is Perforce?

Perforce Helix Core is an enterprise version control system popular in game development and large organizations. It uses a centralized model with exclusive checkout (locking).

### Architecture Comparison

```
Perforce (Centralized):
┌─────────────┐        ┌─────────────┐
│  Workspace  │───────▶│   Server    │
│  (checked   │        │ (source of  │
│   out copy) │        │   truth)    │
└─────────────┘        └─────────────┘
      │
      ▼
  Must be online for
  most operations

Dits (Distributed):
┌─────────────┐        ┌─────────────┐
│   Local     │◀──────▶│   Remote    │
│ Repository  │        │  (backup/   │
│ (full copy) │        │   share)    │
└─────────────┘        └─────────────┘
      │
      ▼
  Work offline,
  sync when ready
```

### Feature Comparison

| Feature | Perforce | Dits |
|---------|----------|------|
| **Model** | Centralized | Distributed |
| **Offline work** | Limited (need checkout) | Full capability |
| **Exclusive checkout** | Core feature | `dits lock` |
| **Streams (branches)** | Complex setup | Simple branches |
| **Administration** | Requires dedicated admin | Self-service |
| **Learning curve** | Steep | Moderate (Git-like) |
| **GUI client** | P4V (mature) | DitsHub Desktop |
| **Cost** | Per-user licensing ($$$$) | Open source or DitsHub |
| **Integrations** | Game engines, IDEs | Growing ecosystem |

### Workflow Translation

**Perforce:**
```bash
p4 sync //depot/project/...          # Get latest
p4 edit file.psd                     # Check out (lock)
# Make changes
p4 submit -d "Description"           # Check in
```

**Dits:**
```bash
dits pull                            # Get latest
dits lock file.psd                   # Lock (optional but recommended)
# Make changes
dits add file.psd
dits commit -m "Description"
dits push
dits unlock file.psd
```

### When to Choose Perforce

- Enterprise with existing Perforce infrastructure
- Need for complex access control (streams, permissions)
- Game studios with established Perforce workflows
- Organizations with dedicated SCM administrators
- Tight Unreal Engine integration required

### When to Choose Dits

- New projects without existing infrastructure
- Budget constraints (Perforce licensing is expensive)
- Teams that want Git-like simplicity
- Need for distributed/offline work
- Smaller teams without dedicated SCM admins
- Open source preference

---

## Dits vs. SVN (Subversion)

### What is SVN?

Subversion is a centralized version control system that was popular before Git. Some organizations still use it, especially for binary files since Git wasn't designed for them.

### Comparison

| Feature | SVN | Dits |
|---------|-----|------|
| **Model** | Centralized | Distributed |
| **Offline work** | No | Yes |
| **Binary handling** | Stores full copies | Chunk deduplication |
| **Locking** | Yes | Yes |
| **Performance** | Slow for large files | Optimized for large files |
| **Branching** | Directory copies | Lightweight branches |
| **Learning curve** | Moderate | Moderate (Git-like) |
| **Modern tooling** | Declining | Active development |

### When to Choose Dits over SVN

- Pretty much always for new projects
- SVN is a legacy system with declining support
- Dits offers better performance, offline work, and modern features

---

## Dits vs. Dropbox / Google Drive

### What are Cloud Storage Services?

Dropbox and Google Drive are file synchronization services designed for general file sharing, not version control.

### Comparison

| Feature | Dropbox/Drive | Dits |
|---------|---------------|------|
| **Primary purpose** | File sync/share | Version control |
| **Version history** | 30-180 days | Unlimited |
| **Branching** | No | Yes |
| **Merge capability** | No | Yes (locking for binaries) |
| **Deduplication** | File-level | Chunk-level |
| **Offline work** | Partial (Smart Sync) | Full |
| **Collaboration** | Basic sharing | Commits, branches, locks |
| **Conflict handling** | Creates duplicate files | Locking prevents conflicts |
| **Audit trail** | Limited | Complete commit history |
| **Selective sync** | Yes | Yes (sparse checkout, VFS) |

### Real-World Scenario

**Team editing video project on Dropbox:**
```
Problem: Two editors modify video.mp4 at the same time

Dropbox result:
video.mp4
video (John's conflicted copy 2024-06-15).mp4
video (Jane's conflicted copy 2024-06-15).mp4
→ Manual merge required, easy to lose work
```

**Same scenario with Dits:**
```
John: dits lock video.mp4 --reason "Color grading"
Jane: dits locks
→ Shows video.mp4 is locked by John
→ Jane works on different file or waits
John: dits unlock video.mp4
Jane: dits lock video.mp4
→ No conflicts, clear audit trail
```

### When to Choose Dropbox/Drive

- Simple file sharing (not version control)
- Non-technical users
- Documents, spreadsheets (Google Docs better)
- Quick sharing without setup

### When to Choose Dits

- Need actual version control
- Multiple people editing large files
- Want to track project history
- Need branches for different versions
- Working with video, game assets, creative files

---

## Dits vs. Frame.io

### What is Frame.io?

Frame.io is a video review and collaboration platform designed for video production workflows. It focuses on review/approval, not version control.

### Comparison

| Feature | Frame.io | Dits |
|---------|----------|------|
| **Primary purpose** | Video review/approval | Version control |
| **Target users** | Clients, reviewers | Production team |
| **Commenting** | Time-coded comments | Commit messages |
| **Versioning** | Version stacks | Full history |
| **Approval workflow** | Built-in | External integration |
| **Storage model** | Cloud only | Local + cloud |
| **Offline work** | No | Yes |
| **Branching** | No | Yes |
| **Open source** | No | Yes |
| **Self-hosting** | No | Yes |

### Complementary Workflow

**Dits + Frame.io Together:**
```bash
# Work on video in your NLE
# Export review cut
dits add exports/client_review_v1.mp4
dits commit -m "Client review: First cut"
dits push

# Upload to Frame.io for client review
frameio upload exports/client_review_v1.mp4 --project "Client Project"

# After client feedback, make changes
# Export new version
dits add exports/client_review_v2.mp4
dits commit -m "Client review: Incorporated feedback"
dits push

# Upload new version to Frame.io
frameio upload exports/client_review_v2.mp4 --project "Client Project"
```

### When to Choose Frame.io

- Client review and approval workflows
- Time-coded feedback needed
- Stakeholder collaboration (non-editors)
- Marketing/approval processes

### When to Choose Dits

- Version control during production
- Team collaboration (editors, colorists, VFX)
- Long-term project history
- Asset management
- Offline work requirements

### Best Practice: Use Both

- **Dits**: Version control for production team
- **Frame.io**: Client review and approval

---

## Dits vs. Plastic SCM

### What is Plastic SCM?

Plastic SCM (now Unity Version Control) is a version control system with good binary file support, popular in game development.

### Comparison

| Feature | Plastic SCM | Dits |
|---------|-------------|------|
| **Model** | Distributed or centralized | Distributed |
| **Binary handling** | Good | Excellent (chunk-level) |
| **GUI client** | Excellent (Gluon) | DitsHub Desktop |
| **Unity integration** | Deep (owned by Unity) | Plugin available |
| **Open source** | No (free tier available) | Yes |
| **Deduplication** | File-level | Chunk-level |
| **Video-aware** | No | Yes |
| **P2P sharing** | No | Yes |
| **Learning curve** | Moderate | Moderate |
| **Cost** | Free up to 5GB, then paid | Open source or DitsHub |

### When to Choose Plastic SCM

- Unity game development (best integration)
- Need excellent GUI (Gluon is very good)
- Enterprise with Unity Enterprise license

### When to Choose Dits

- Video production workflows
- Storage efficiency is critical
- Need P2P sharing
- Prefer open source
- Working outside Unity ecosystem

---

## Dits vs. DVC (Data Version Control)

### What is DVC?

DVC is a version control system designed for machine learning projects, focusing on datasets and models.

### Comparison

| Feature | DVC | Dits |
|---------|-----|------|
| **Primary purpose** | ML data/models | Large binary files |
| **Integration** | Git extension | Standalone |
| **Deduplication** | File-level | Chunk-level |
| **Pipeline tracking** | Yes (experiments) | No |
| **Storage backends** | S3, GCS, Azure, etc. | Local, S3, DitsHub |
| **Video-aware** | No | Yes |
| **Target users** | Data scientists | Creative professionals |
| **Locking** | No | Yes |

### When to Choose DVC

- Machine learning projects
- Dataset versioning
- Experiment tracking needed
- Already using Git for code

### When to Choose Dits

- Video/audio production
- Game development
- Creative workflows
- Need file locking
- Better deduplication for similar files

---

## When to Use What

### Decision Flowchart

```
What type of files are you managing?
│
├── Source code only
│   └── Use Git
│
├── Source code + some large files
│   └── Use Git + Git LFS
│
├── Primarily large binary files
│   │
│   ├── Video production?
│   │   └── Use Dits
│   │
│   ├── Game development?
│   │   ├── Unity? → Consider Plastic SCM or Dits
│   │   └── Other → Consider Dits or Perforce
│   │
│   ├── Photography/Images?
│   │   └── Use Dits
│   │
│   └── ML/Data Science?
│       └── Consider DVC
│
└── Simple file sharing (no version control)
    └── Dropbox/Google Drive is fine
```

### Recommendation Summary

| Use Case | Primary Recommendation | Alternative |
|----------|----------------------|-------------|
| **Video production** | Dits | Git LFS |
| **Game dev (Unity)** | Plastic SCM | Dits |
| **Game dev (Unreal)** | Perforce or Dits | Git LFS |
| **Game dev (indie)** | Dits | Git LFS |
| **Photography** | Dits | Lightroom + cloud |
| **3D/VFX** | Dits | Perforce |
| **ML/Data Science** | DVC | Dits |
| **Mixed code + assets** | Git + Dits | Git LFS |
| **Enterprise (existing Perforce)** | Keep Perforce | Evaluate Dits |
| **Budget-conscious** | Dits (self-hosted) | Git LFS |

---

## Hybrid Approaches

### Git + Dits (Recommended for Mixed Projects)

```bash
# Project structure
my-project/
├── .git/              # Git for code
├── .dits/             # Dits for assets
├── .gitignore         # Ignore assets/
├── src/               # Tracked by Git
├── docs/              # Tracked by Git
└── assets/            # Tracked by Dits
    ├── video/
    ├── audio/
    └── textures/

# Workflow
# For code changes:
git add src/
git commit -m "Add new feature"
git push

# For asset changes:
dits add assets/
dits commit -m "Update hero textures"
dits push
```

### Perforce + Dits (Migration Strategy)

```bash
# During migration period:
# - Keep Perforce for existing projects
# - Start new projects with Dits
# - Gradually migrate completed projects

# New project:
mkdir new-project
cd new-project
dits init
dits remote add origin https://ditshub.com/studio/new-project

# Migrating old project:
# 1. Archive in Perforce
# 2. Export files
# 3. Initialize Dits
# 4. Import to Dits
```

### Dits + Frame.io (Production + Review)

```bash
# Production team uses Dits
dits clone https://ditshub.com/studio/commercial
cd commercial

# Work, commit, push...
dits add exports/review_v1.mp4
dits commit -m "Client review v1"
dits push

# Upload to Frame.io for client
frameio upload exports/review_v1.mp4

# After approval
dits tag client-approved-v1
dits push --tags
```

---

## Migration Resources

### From Git LFS
See: [Migration Guide - Git LFS](../guides/migration.md#migrating-from-git-lfs)

### From Perforce
See: [Migration Guide - Perforce](../guides/migration.md#migrating-from-perforce-helix-core)

### From Dropbox
See: [Migration Guide - Dropbox](../guides/migration.md#migrating-from-dropbox)

### From Frame.io
See: [Migration Guide - Frame.io](../guides/migration.md#migrating-from-frameio)

---

## Further Reading

- [Getting Started Guide](../user-guide/getting-started.md)
- [Video Editor's Guide](../guides/video-editors.md)
- [Game Developer's Guide](../guides/game-developers.md)
- [CLI Reference](cli.md)
- [FAQ](../troubleshooting/faq.md)
