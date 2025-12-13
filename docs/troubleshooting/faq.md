# Frequently Asked Questions (FAQ)

Find answers to the most common questions about Dits. If you can't find what you're looking for, check our [Troubleshooting Guide](common-issues.md) or reach out on [Discord](https://discord.gg/dits).

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

The core Dits CLI and engine are open source under the MIT license. DitsHub (the hosted service) is a commercial offering built on the open-source core.

---

## Getting Started

### How do I install Dits?

**macOS (Homebrew):**
```bash
brew tap dits-io/dits
brew install dits
```

**Linux:**
```bash
curl -fsSL https://dits.io/install.sh | bash
```

**Windows:**
```powershell
choco install dits
# or download from GitHub releases
```

**From source:**
```bash
git clone https://github.com/dits-io/dits.git
cd dits
cargo build --release
```

### How do I create my first repository?

```bash
mkdir my-project
cd my-project
dits init
dits add .
dits commit -m "Initial commit"
```

### Do I need an account to use Dits?

No! Dits works entirely locally without any account. You only need an account if you want to:
- Use DitsHub cloud hosting
- Access team collaboration features
- Use remote backup services

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
1. **Chunks** the file into ~1MB pieces based on content patterns
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

**Option 1: P2P (Direct sharing, no cloud)**
```bash
# You share
dits p2p share
# → Join code: ABC-123

# They connect
dits p2p connect ABC-123 ./project
```

**Option 2: Remote server (DitsHub or self-hosted)**
```bash
# Add remote
dits remote add origin https://ditshub.com/team/project

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

### What is P2P sharing?

P2P (peer-to-peer) sharing lets you share your repository directly with collaborators without uploading to a cloud server. Data transfers directly between your computers.

### How does P2P work?

1. You run `dits p2p share` and get a join code
2. Your collaborator runs `dits p2p connect <code> <directory>`
3. A direct, encrypted connection is established
4. Files transfer directly between your computers

### Do both computers need to be online?

Yes, for P2P sharing both computers must be online at the same time. For asynchronous collaboration, use a remote server (DitsHub or self-hosted).

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

Possible reasons:
1. **Large repository**: Use partial clone: `dits clone --filter blob:none`
2. **Slow network**: Check connection speed
3. **Remote server load**: Try off-peak hours
4. **First clone**: Subsequent syncs are much faster

### How can I speed up operations?

```bash
# Use SSD for cache
dits config cache.path /Volumes/SSD/dits-cache

# Increase cache size
dits config cache.size 100GB

# Use more parallel transfers
dits config transfer.maxParallel 16

# For very large repos, use partial clones
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

**In transit**: Yes, all network transfers use TLS 1.3 or QUIC encryption.

**At rest**: Optional. Enable with:
```bash
dits encrypt-init
```

**P2P transfers**: End-to-end encrypted with AES-256-GCM.

### Where is my data stored with DitsHub?

DitsHub stores data in secure data centers:
- AWS (multiple regions)
- Data encrypted at rest
- SOC 2 Type II compliant
- GDPR compliant

### Can I self-host Dits?

Yes! You can run your own Dits server. See the [Self-Hosting Guide](../operations/self-hosting.md).

### How do I report a security vulnerability?

Email security@dits.io with details. We follow responsible disclosure practices and typically respond within 24 hours.

---

## Pricing and Licensing

### Is Dits free?

**Dits CLI (open source)**: Free forever under MIT license.

**DitsHub (hosted service)**:
- Free tier: 5 GB storage, 1 user
- Pro tier: 100 GB storage, unlimited users
- Enterprise: Custom pricing

### Can I use Dits for commercial projects?

Yes! The MIT license allows commercial use without restrictions.

### Do I need a license for the desktop app?

The desktop app is part of DitsHub and follows DitsHub pricing. A free tier is available.

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

- **Documentation**: [docs.dits.io](https://docs.dits.io)
- **GitHub Issues**: [github.com/dits-io/dits/issues](https://github.com/dits-io/dits/issues)
- **Discord**: [discord.gg/dits](https://discord.gg/dits)
- **Email**: support@dits.io
