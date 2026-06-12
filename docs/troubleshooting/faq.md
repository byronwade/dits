# Frequently Asked Questions (FAQ)

Find answers to the most common questions about Dits. If you can't find what you're looking for, check our [Troubleshooting Guide](common-issues.md) or open an issue on [GitHub](https://github.com/byronwade/dits/issues).

> 🚧 **Roadmap notice.** Answers describing **P2P sharing**, **remotes**, **network clone**,
> and **TLS/QUIC transport** refer to **roadmap** features that are **not implemented yet** —
> they print placeholders and transfer no data. Dits is **local-first** today: commits,
> branches, locks, MP4/FACR tooling, encryption, and audit all work locally.

---

## Table of Contents

1. [General Questions](#general-questions)
2. [Getting Started](#getting-started)
3. [Files and Storage](#files-and-storage)
4. [Collaboration](#collaboration)
5. [P2P Sharing](#p2p-sharing)
6. [Performance](#performance)
7. [Compatibility](#compatibility)
8. [Security](#security)
9. [Pricing and Licensing](#pricing-and-licensing)
10. [Comparison with Other Tools](#comparison-with-other-tools)

---

## General Questions

### What is Dits?

**Dits** (Distributed Intelligent Transfer System) is a version control system designed specifically for large binary files like video, audio, images, and game assets. While Git excels at tracking source code, it struggles with large files. Dits uses content-defined chunking and deduplication to handle files of any size efficiently.

### How is Dits different from Git?

| Feature | Git | Dits |
|---------|-----|------|
| Designed for | Source code (text) | Large binary files |
| File handling | Stores entire file each version | Content-aware chunking |
| Deduplication | None (or minimal with pack files) | 80-98% for similar files |
| Large files | Slow, repository bloat | Optimized, efficient |
| Binary diff | "Binary files differ" | Chunk-level changes |
| Merge | Line-by-line for text | File-level + locking |

### Can I use Dits alongside Git?

Yes! This is actually the recommended approach for many projects. Use Git for source code and Dits for binary assets:

```bash
# Your project structure
my-project/
├── .git/           # Git for code
├── .dits/          # Dits for assets
├── src/            # Git-tracked
└── assets/         # Dits-tracked
```

### What file types does Dits handle best?

Dits excels with:
- **Video**: MP4, MOV, MXF, ProRes, DNxHD
- **Audio**: WAV, AIFF, MP3, FLAC, AAC
- **Images**: PSD, TIFF, RAW (CR2, NEF, ARW), PNG, EXR
- **3D**: FBX, OBJ, BLEND, MAX, C4D
- **Game assets**: Textures, models, levels, builds
- **Any large binary**: ZIP, TAR, disk images

### Is Dits open source?

Yes. The Dits CLI and engine are open source under a dual **Apache-2.0 OR MIT** license. (A hosted service is roadmap and does not exist yet.)

---

## Getting Started

### How do I install Dits?

**npm (or bun/pnpm):**
```bash
npm install -g @byronwade/dits
# or: bun add -g @byronwade/dits
# or: pnpm add -g @byronwade/dits
```

**From source:**
```bash
git clone https://github.com/byronwade/dits.git
cd dits
cargo build --release
```

> Homebrew taps, `cargo install dits`, apt/dnf/choco/scoop/winget, and a curl install
> script are **not yet published** — use npm or build from source.

### How do I create my first repository?

```bash
mkdir my-project
cd my-project
dits init
dits add .
dits commit -m "Initial commit"
```

### Do I need an account to use Dits?

No! Dits works entirely locally without any account. (Hosted cloud, team collaboration,
and remote backup are **roadmap** features that do not exist yet — see the roadmap notice
at the top.)

### How do I configure my identity?

```bash
dits config --global user.name "Your Name"
dits config --global user.email "you@example.com"
```

---

## Files and Storage

### How much storage space does Dits save?

Typical savings depend on your use case:

| Scenario | Without Dits | With Dits | Savings |
|----------|--------------|-----------|---------|
| 5 versions of 10GB video | 50 GB | ~12 GB | 76% |
| Similar takes from shoot | 100 GB | ~15 GB | 85% |
| Game build iterations | 50 GB | ~10 GB | 80% |
| Photo shoot variants | 200 GB | ~30 GB | 85% |

### How does deduplication work?

When you add a file, Dits:
1. **Chunks** the file into content-defined pieces using FastCDC. Chunk sizes depend on the
   active profile — e.g. the `default` profile targets 16KB/64KB/256KB (min/avg/max), and
   the `media` profile targets 64KB/256KB/1MB.
2. **Hashes** each chunk with BLAKE3
3. **Stores** only unique chunks
4. **Creates a manifest** listing which chunks make up the file

If you add a similar file, most chunks already exist and aren't stored again.

### What's the maximum file size Dits can handle?

There's no practical limit. Dits has been tested with:
- Individual files up to 2 TB
- Repositories totaling 50+ TB
- Millions of files in a single repository

### Where is my data stored locally?

Data is stored in the `.dits/` directory:
```
.dits/
├── HEAD           # Current branch pointer
├── index          # Staging area
├── config         # Repository configuration
├── objects/       # Content storage
│   └── chunks/    # Deduplicated chunks
└── refs/          # Branches and tags
```

### Can I see what's taking up space?

```bash
# Repository statistics
dits repo-stats

# Detailed per-file breakdown
dits repo-stats -v

# Inspect a specific file
dits inspect-file path/to/file
```

### How do I clean up old data?

```bash
# Run garbage collection
dits gc

# Aggressive cleanup (removes more orphaned data)
dits gc --aggressive

# See what would be cleaned without doing it
dits gc --dry-run
```

---

## Collaboration

### How do I share my repository with others?

> 🚧 **Roadmap — not implemented yet.** Both options below are scaffolding and transfer no
> data today. For now, share a repository by copying it and using a **local-path** clone
> (`dits clone /path/to/repo`).

**Option 1: P2P (Direct sharing, no cloud)**
```bash
# You share
dits p2p share
# → Join code: ABC-123

# They connect
dits p2p connect ABC-123 ./project
```

**Option 2: Remote server (roadmap)**
```bash
# Add remote
dits remote add origin https://example.com/team/project

# Push
dits push -u origin main
```

### How do I prevent conflicts on binary files?

Use file locking:
```bash
# Before editing
dits lock video.mp4 --reason "Color grading"

# When done
dits unlock video.mp4
```

### Can multiple people edit the same file?

For binary files (video, images, etc.), no—only one person should edit at a time. Use locking to coordinate:

```bash
# Check locks before starting
dits locks

# Lock your file
dits lock myfile.psd

# Work on it...

# Release lock when done
dits unlock myfile.psd
```

For text files, Dits supports merging through its hybrid storage (uses Git's merge algorithms).

### How do I resolve a merge conflict?

For binary files:
```bash
# See conflict status
dits status

# Choose a version
dits restore --ours file.mp4   # Keep your version
# OR
dits restore --theirs file.mp4 # Take their version

# Complete the merge
dits add file.mp4
dits commit -m "Resolved conflict"
```

### Can I see who changed what?

```bash
# See commit history
dits log

# See who changed a specific file
dits log -- path/to/file

# Detailed file history
dits log --stat -- path/to/file
```

---

## P2P Sharing

> 🚧 **Roadmap — not implemented yet.** The entire P2P feature is scaffolding: `dits p2p`
> subcommands print placeholders and transfer no data, with no NAT traversal or QUIC. The
> answers below describe the intended design, not current behavior.

### What is P2P sharing?

P2P (peer-to-peer) sharing is designed to let you share your repository directly with collaborators without uploading to a cloud server. Data would transfer directly between your computers.

### How does P2P work?

1. You run `dits p2p share` and get a join code
2. Your collaborator runs `dits p2p connect <code> <directory>`
3. A direct, encrypted connection is established
4. Files transfer directly between your computers

### Do both computers need to be online?

In the intended design, both computers must be online at the same time for P2P sharing. Asynchronous collaboration via a remote server is also roadmap.

### Does P2P work through firewalls?

Yes! Dits uses NAT traversal techniques (STUN/TURN) to establish connections even when both parties are behind firewalls or NAT routers.

### Is P2P sharing secure?

Yes. P2P connections are:
- **End-to-end encrypted** using AES-256-GCM
- **Authenticated** via the join code (SPAKE2 key exchange)
- **Verified** with BLAKE3 checksums on all data

### Can multiple people connect to my share?

Yes, multiple collaborators can connect to a single share simultaneously.

### How long do join codes last?

By default, join codes are valid as long as the share is running. You can set an expiration:
```bash
dits p2p share --expires 1h  # Expires in 1 hour
```

---

## Performance

### How long does it take to add a large file?

First add of a 10GB video: ~30-60 seconds (depending on disk speed)
- Parsing container: 1-2 seconds
- Chunking: 10-20 seconds
- Hashing: 5-10 seconds
- Writing: 10-20 seconds

Subsequent adds of similar files are much faster due to deduplication.

### Why is my clone so slow?

> 🚧 **Roadmap — network clone is not implemented yet.** Only a **local-path** clone works
> today (`dits clone /path/to/repo`), and partial/shallow flags (`--filter`, `--depth`) do
> not exist. The guidance below is for the future networked clone.

Possible reasons (future networked clone):
1. **Large repository**: partial clone (`dits clone --filter blob:none`) is roadmap
2. **Slow network**: Check connection speed
3. **Remote server load**: Try off-peak hours
4. **First clone**: Subsequent syncs are much faster

### How can I speed up operations?

```bash
# Use SSD for cache
dits config cache.path /Volumes/SSD/dits-cache

# Increase cache size
dits config cache.size 100GB

# Use more parallel transfers (roadmap — no networked transfer today)
dits config transfer.maxParallel 16

# For very large repos, partial clones are roadmap (network clone not implemented)
dits clone --filter blob:none <url>
```

### What are the hardware recommendations?

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 8 GB | 16+ GB |
| Storage | HDD | NVMe SSD |
| Network | 10 Mbps | 100+ Mbps |
| CPU | 2 cores | 4+ cores |

---

## Compatibility

### Which operating systems are supported?

- **macOS**: 12 (Monterey) and later
- **Linux**: Ubuntu 20.04+, Debian 11+, Fedora 35+, and most modern distros
- **Windows**: Windows 10 (1903+) and Windows 11

### Does Dits work with my NLE (video editor)?

Yes! Dits works with any NLE because it tracks regular files. Specific integrations:

| NLE | Support Level |
|-----|---------------|
| Premiere Pro | Full (project files + media) |
| DaVinci Resolve | Full |
| Final Cut Pro | Full |
| Avid Media Composer | Full |
| After Effects | Full |

### Does Dits work with game engines?

Yes! Supported engines:
- **Unity**: Full support
- **Unreal Engine**: Full support
- **Godot**: Full support
- **Custom engines**: Full support

### Can I use Dits with 3D software?

Yes! Works with:
- Blender
- Maya
- 3ds Max
- Cinema 4D
- Houdini
- ZBrush

### What video formats are optimized?

Dits has special handling for:
- **MP4/M4V** (H.264, H.265/HEVC)
- **MOV** (ProRes, DNxHD, Animation)
- **MXF** (Broadcast formats)

Other video formats work but without keyframe-aligned chunking.

---

## Security

### Is my data encrypted?

**At rest**: Optional, and **available today**. Enable with:
```bash
dits encrypt-init
```

**In transit**: 🚧 Roadmap. Network transfer (TLS 1.3 / QUIC) is not implemented yet, so
there is no in-transit encryption to speak of — there is no networked transfer today.

**P2P transfers**: 🚧 Roadmap. P2P is scaffolding; no encrypted (or any) data transfer
happens yet.

### Where is my data stored with a hosted service?

> 🚧 **Roadmap.** A hosted cloud service does not exist yet. Today all data is stored
> locally in your `.dits/` directory; nothing is uploaded anywhere.

### Can I self-host Dits?

A self-hosted Dits server is **roadmap** and not implemented. The only server in-tree today
is the embedded per-repo object server (`dits serve`) used for local object fetching.

### How do I report a security vulnerability?

Open a security advisory or issue at [github.com/byronwade/dits](https://github.com/byronwade/dits). Please follow responsible disclosure and do not file public exploit details.

---

## Pricing and Licensing

### Is Dits free?

**Dits CLI (open source)**: Free, under a dual **Apache-2.0 OR MIT** license.

A hosted service with tiered pricing is **roadmap** and does not exist yet.

### Can I use Dits for commercial projects?

Yes! The Apache-2.0 OR MIT dual license allows commercial use without restrictions.

### Do I need a license for the desktop app?

There is no desktop app today; it is roadmap.

---

## Comparison with Other Tools

### Dits vs Git LFS

| Feature | Git LFS | Dits |
|---------|---------|------|
| Integration | Git extension | Standalone |
| Deduplication | None | Full content-aware |
| Large file handling | Better than Git | Optimal |
| Self-contained | No (requires Git) | Yes |
| Chunking | No | Yes (with keyframe alignment) |

### Dits vs Perforce

| Feature | Perforce | Dits |
|---------|----------|------|
| Model | Centralized | Distributed |
| Cost | $$$$ | Free (open source) |
| Setup | Complex | Simple |
| Binary handling | Good | Excellent |
| Learning curve | Steep | Git-like (familiar) |

### Dits vs Dropbox/Google Drive

| Feature | Cloud Storage | Dits |
|---------|---------------|------|
| Version history | Limited (30-180 days) | Unlimited |
| Branching | No | Yes |
| Deduplication | File-level only | Chunk-level |
| Merge capabilities | No | Yes |
| Offline work | Partial | Full |

### Dits vs Frame.io

| Feature | Frame.io | Dits |
|---------|----------|------|
| Primary purpose | Review/approval | Version control |
| Storage model | Cloud-only | Local + cloud |
| Version control | Basic | Full (branches, merges, tags) |
| Open source | No | Yes |
| Self-hosting | No | Yes |

### When should I use Dits vs Git?

**Use Git for:**
- Source code
- Small text files
- Configuration files
- Documentation (Markdown)

**Use Dits for:**
- Video files
- Audio files
- Images and textures
- 3D models
- Game assets
- Any large binary files

**Use both for:**
- Game development (Git for code, Dits for assets)
- Web development with media assets
- Any project mixing code and large files

---

## Still Have Questions?

- **Source & Documentation**: [github.com/byronwade/dits](https://github.com/byronwade/dits)
- **GitHub Issues**: [github.com/byronwade/dits/issues](https://github.com/byronwade/dits/issues)
