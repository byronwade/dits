# Getting Started with Dits

**Dits** (Distributed Intelligent Transfer System) is a version control system designed specifically for large media files. Unlike Git, which struggles with binary files, Dits is built from the ground up to handle video, audio, images, and other large assets efficiently.

---

## Table of Contents

1. [What is Dits?](#what-is-dits)
2. [Who is Dits For?](#who-is-dits-for)
3. [Key Features](#key-features)
4. [System Requirements](#system-requirements)
5. [Installation](#installation)
6. [Quick Start Guide](#quick-start-guide)
7. [Understanding the Basics](#understanding-the-basics)
8. [Your First Repository](#your-first-repository)
9. [Working with Files](#working-with-files)
10. [Collaboration Basics](#collaboration-basics)
11. [P2P Sharing](#p2p-sharing)
12. [Next Steps](#next-steps)

---

## What is Dits?

Dits solves a problem every video editor, game developer, and creative professional has faced: **version control for large files**.

### The Problem

Traditional version control systems like Git were designed for source code—small text files that change line by line. When you try to use Git for video files, you encounter:

- **Massive repositories**: A single 10GB video file creates a 10GB repository
- **Slow operations**: Every commit, push, and pull moves entire files
- **No deduplication**: Minor changes to a video file store the entire file again
- **Poor merge support**: Binary files can't be merged; you just pick one version

### The Solution

Dits handles large files intelligently:

- **Content-defined chunking**: Files are split into smaller chunks based on content, not fixed sizes
- **Deduplication**: Similar content across files shares storage (97%+ savings typical for video revisions)
- **Video-aware**: Dits understands video formats and chunks at keyframes for optimal efficiency
- **On-demand hydration**: Clone only metadata; files download when you access them
- **P2P sharing**: Share directly with collaborators without cloud uploads

---

## Who is Dits For?

### Video Editors

- Manage footage, project files, and exports
- Collaborate with colorists, VFX artists, and sound designers
- Track changes across versions of your timeline
- Never lose work to "final_v27_FINAL_REAL.mp4" again

### Game Developers

- Version control for textures, models, and audio assets
- Handle large game builds efficiently
- Collaborate across distributed teams
- Integrate with your existing Git workflow for code

### VFX Artists

- Track iterations on complex compositions
- Share large Nuke/After Effects projects
- Maintain asset libraries across productions
- Collaborate with remote teams efficiently

### Photographers

- Manage RAW file collections
- Track editing history in Lightroom/Capture One
- Share photo selections with clients
- Collaborate on large shoots

### 3D Artists

- Version control for Blender, Maya, and Cinema 4D files
- Handle large texture sets and models
- Track changes to complex scenes
- Collaborate on asset-heavy projects

### Content Creators

- Manage YouTube/TikTok content libraries
- Track podcast episodes and audio files
- Organize streaming assets
- Collaborate with editors and producers

---

## Key Features

### 1. Content-Defined Chunking

Files are split into chunks based on content patterns, not fixed byte boundaries. This means:

- **Insertions don't shift all chunks**: Adding a frame to the beginning doesn't invalidate the entire file
- **Similar content shares chunks**: Two versions of a video that share 95% of content only store unique chunks
- **Efficient transfers**: Only changed chunks need to be uploaded/downloaded

### 2. Video-Aware Processing

Dits understands video container formats (MP4, MOV, MXF):

- **Keyframe alignment**: Chunks break at I-frames for optimal playback
- **Metadata preservation**: Timecodes, markers, and chapter information are preserved
- **Container integrity**: The moov atom stays intact for file playability

### 3. Virtual Filesystem (VFS)

Mount your repository as a drive on your system:

```bash
dits mount /Volumes/my-project
```

- Files appear immediately without downloading
- Content streams on-demand as you access files
- Perfect for NLE integration (Premiere Pro sees it as a regular folder)
- Read-write support for editing

### 4. P2P Sharing

Share repositories directly with collaborators:

```bash
# You share
dits p2p share
# → Join code: ABC-123

# They connect
dits p2p connect ABC-123 ./shared-project
```

- No cloud uploads required
- Direct peer-to-peer transfers
- End-to-end encrypted
- Works through firewalls

### 5. Git-Like Workflow

Familiar commands for Git users:

```bash
dits init                    # Initialize repository
dits add footage/            # Stage files
dits commit -m "Add scene 1" # Commit changes
dits branch feature/vfx      # Create branches
dits merge feature/vfx       # Merge branches
dits log                     # View history
```

### 6. Locking for Binary Files

Prevent conflicts on files that can't be merged:

```bash
dits lock footage/scene01.mov --reason "Color grading"
# Work on file...
dits unlock footage/scene01.mov
```

### 7. Storage Efficiency

Typical storage savings:

| Scenario | Without Dits | With Dits | Savings |
|----------|--------------|-----------|---------|
| 5 versions of 10GB video | 50 GB | ~12 GB | 76% |
| Similar takes from shoot | 100 GB | ~15 GB | 85% |
| Project with shared assets | 200 GB | ~40 GB | 80% |

---

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **Operating System** | macOS 12+, Ubuntu 20.04+, Windows 10+ |
| **RAM** | 8 GB |
| **Storage** | 10 GB free space (plus your project files) |
| **CPU** | 64-bit processor |

### Recommended Requirements

| Component | Recommendation |
|-----------|----------------|
| **Operating System** | macOS 14+, Ubuntu 22.04+, Windows 11 |
| **RAM** | 16 GB or more |
| **Storage** | SSD with 100 GB+ free space |
| **CPU** | Multi-core processor (4+ cores) |
| **Network** | High-speed internet for remote collaboration |

### Additional Requirements

**For Virtual Filesystem (VFS) mounting:**

| Platform | Requirement |
|----------|-------------|
| **macOS** | macFUSE (`brew install macfuse`) |
| **Linux** | FUSE 3 (`apt install fuse3`) |
| **Windows** | Dokany driver |

**For building from source:**

- Rust 1.75 or later
- C compiler (gcc, clang, or MSVC)
- OpenSSL development libraries

---

## Installation

### macOS

**Using Homebrew (Recommended):**

```bash
# Add the Dits tap
brew tap dits-io/dits

# Install Dits
brew install dits

# Install macFUSE for VFS support
brew install macfuse

# Verify installation
dits --version
```

**Manual Installation:**

```bash
# Download the latest release
curl -L https://github.com/dits-io/dits/releases/latest/download/dits-macos-arm64.tar.gz -o dits.tar.gz

# Extract
tar -xzf dits.tar.gz

# Move to PATH
sudo mv dits /usr/local/bin/

# Verify
dits --version
```

### Linux (Ubuntu/Debian)

**Using APT:**

```bash
# Add repository
curl -fsSL https://dits.io/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/dits.gpg
echo "deb [signed-by=/etc/apt/keyrings/dits.gpg] https://dits.io/apt stable main" | sudo tee /etc/apt/sources.list.d/dits.list

# Install
sudo apt update
sudo apt install dits

# Install FUSE for VFS support
sudo apt install fuse3

# Verify
dits --version
```

**Using the Install Script:**

```bash
curl -fsSL https://dits.io/install.sh | bash
```

### Linux (Fedora/RHEL)

```bash
# Add repository
sudo dnf config-manager --add-repo https://dits.io/rpm/dits.repo

# Install
sudo dnf install dits

# Install FUSE
sudo dnf install fuse3

# Verify
dits --version
```

### Windows

**Using the Installer:**

1. Download `dits-windows-x64.msi` from [GitHub Releases](https://github.com/dits-io/dits/releases)
2. Run the installer
3. Optionally install [Dokany](https://github.com/dokan-dev/dokany/releases) for VFS support
4. Open Command Prompt or PowerShell and run `dits --version`

**Using Chocolatey:**

```powershell
choco install dits
```

**Using Scoop:**

```powershell
scoop bucket add dits https://github.com/dits-io/scoop-bucket
scoop install dits
```

### Building from Source

```bash
# Clone the repository
git clone https://github.com/dits-io/dits.git
cd dits

# Build release binary
cargo build --release

# The binary will be at target/release/dits
./target/release/dits --version

# Optionally install to PATH
sudo cp target/release/dits /usr/local/bin/
```

### Verifying Your Installation

After installation, verify everything is working:

```bash
# Check version
dits --version
# Output: dits 1.0.0

# Check help
dits --help

# Run diagnostics
dits doctor
```

The `dits doctor` command checks:
- FUSE availability
- System resources
- Network connectivity
- Configuration validity

---

## Quick Start Guide

### 5-Minute Quick Start

Get up and running with Dits in 5 minutes:

```bash
# 1. Set up your identity (one-time)
dits config --global user.name "Your Name"
dits config --global user.email "you@example.com"

# 2. Create a new project
mkdir my-video-project
cd my-video-project
dits init

# 3. Add your files
dits add footage/
dits add project.prproj

# 4. Commit
dits commit -m "Initial commit: Add raw footage and project file"

# 5. Check status
dits status
dits log
```

That's it! You now have a version-controlled video project.

### Share with a Collaborator (No Cloud Required)

```bash
# On your machine: Start sharing
dits p2p share
# Output: Join code: ABC-123

# On collaborator's machine: Connect
dits p2p connect ABC-123 ./project
cd project
dits status  # They now have full access!
```

---

## Understanding the Basics

### How Dits Stores Files

When you add a file to Dits, here's what happens:

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR FILE                                │
│                     footage/scene01.mov                          │
│                          (10 GB)                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                      CHUNKING PROCESS
                            │
                            ▼
┌────────┬────────┬────────┬────────┬────────┬────────┬──────────┐
│ Chunk 1│ Chunk 2│ Chunk 3│ Chunk 4│ Chunk 5│ Chunk 6│    ...   │
│  ~1MB  │  ~1MB  │  ~1MB  │  ~1MB  │  ~1MB  │  ~1MB  │  ~10,000 │
│        │        │        │        │        │        │  chunks  │
└───┬────┴───┬────┴───┬────┴───┬────┴───┬────┴───┬────┴──────────┘
    │        │        │        │        │        │
    │    BLAKE3 HASHING (Each chunk gets unique ID)
    │        │        │        │        │        │
    ▼        ▼        ▼        ▼        ▼        ▼
┌────────────────────────────────────────────────────────────────┐
│  .dits/objects/                                                 │
│  ├── a3f8b2c1d4e5...  (Chunk 1 content)                        │
│  ├── 7b2e9f0a1c3d...  (Chunk 2 content)                        │
│  ├── 4d6e8f9a0b1c...  (Chunk 3 content)                        │
│  └── ... (only unique chunks stored)                           │
└────────────────────────────────────────────────────────────────┘
```

**Why this matters:**

1. **Deduplication**: If you have two similar videos, they share chunks
2. **Efficient updates**: Changing 1 second of video only updates a few chunks
3. **Fast transfers**: Only missing chunks are downloaded

### Repository Structure

A Dits repository looks like this:

```
my-project/
├── .dits/                    # Dits metadata (like Git's .git)
│   ├── HEAD                  # Current branch reference
│   ├── index                 # Staging area
│   ├── config                # Repository configuration
│   ├── objects/              # Content-addressed chunk storage
│   │   └── chunks/           # Your file chunks live here
│   └── refs/                 # Branch and tag references
│       ├── heads/            # Local branches
│       │   └── main          # Main branch pointer
│       └── tags/             # Tags
├── footage/                  # Your working files
│   ├── scene01.mov
│   └── scene02.mov
├── exports/
│   └── final.mp4
└── project.prproj            # Project file
```

### Key Concepts

#### Working Directory
Your actual files that you edit and work with.

#### Staging Area (Index)
Files you've marked to include in your next commit with `dits add`.

#### Repository (.dits)
The database of all your project's history and content.

#### Commit
A snapshot of your project at a point in time. Includes:
- All staged file changes
- A message describing the changes
- Timestamp and author information
- Reference to parent commit(s)

#### Branch
A named pointer to a commit. Used to work on features in isolation.

#### Tag
A named, permanent marker for a specific commit (like "v1.0" or "delivery-final").

---

## Your First Repository

### Creating a New Repository

```bash
# Navigate to your project folder
cd ~/Projects/my-video-project

# Initialize Dits
dits init
```

**Output:**
```
Initialized empty Dits repository in /Users/you/Projects/my-video-project/.dits/
```

### What Happens During Init

1. Creates the `.dits/` directory structure
2. Sets up default configuration
3. Creates the initial `main` branch
4. Points HEAD to main

### Initializing with Options

```bash
# Use a different initial branch name
dits init --initial-branch production

# Create a bare repository (for servers)
dits init --bare

# Initialize in a specific directory
dits init /path/to/project
```

---

## Working with Files

### Adding Files

```bash
# Add a single file
dits add footage/scene01.mov

# Add multiple files
dits add footage/scene01.mov footage/scene02.mov

# Add all files in a directory
dits add footage/

# Add all files matching a pattern
dits add *.mov

# Add everything in the current directory
dits add .
```

**What happens when you add a large file:**

```
Adding footage/scene01.mov...
  Parsing container: MP4 (moov + mdat)
  Detecting keyframes: 4,532 I-frames found
  Chunking: 10,432 chunks (avg 1.0 MB)
  Hashing: BLAKE3 parallelized
  Deduplication: 10,200 new, 232 existing (97.8% unique)
  Total: 9.97 GB added to staging
Done in 12.3s
```

### Checking Status

```bash
dits status
```

**Output:**
```
On branch main

Changes to be committed:
  (use "dits restore --staged <file>..." to unstage)
        new file:   footage/scene01.mov
        new file:   footage/scene02.mov

Changes not staged for commit:
  (use "dits add <file>..." to update what will be committed)
  (use "dits restore <file>..." to discard changes)
        modified:   project.prproj

Untracked files:
  (use "dits add <file>..." to include in what will be committed)
        exports/
        temp/
```

### Committing Changes

```bash
# Commit with a message
dits commit -m "Add raw footage for scene 1"

# Commit with a detailed message
dits commit -m "Add raw footage for scene 1" -m "Includes 4K ProRes files from A-cam and B-cam"

# Stage and commit in one step (modified files only)
dits commit -a -m "Update project file"
```

**Output:**
```
[main abc1234] Add raw footage for scene 1
 2 files changed, 19.94 GB added
 create mode 100644 footage/scene01.mov
 create mode 100644 footage/scene02.mov
```

### Viewing History

```bash
# View commit log
dits log

# One-line summary
dits log --oneline

# Show file changes in each commit
dits log --stat

# Show last 5 commits
dits log -n 5

# Show commits affecting a specific file
dits log -- footage/scene01.mov
```

**Output:**
```
commit abc1234def567890 (HEAD -> main)
Author: Your Name <you@example.com>
Date:   Tue Jan 14 10:30:00 2025 -0800

    Add raw footage for scene 1

    Includes 4K ProRes files from A-cam and B-cam

commit 1234567890abcdef
Author: Your Name <you@example.com>
Date:   Mon Jan 13 16:45:00 2025 -0800

    Initial commit: Add project file
```

### Viewing Changes

```bash
# See unstaged changes (working directory vs staged)
dits diff

# See staged changes (staged vs last commit)
dits diff --staged

# Compare two commits
dits diff abc1234 def5678

# See what changed in a specific file
dits diff -- footage/scene01.mov
```

**Output for binary files:**
```
diff --dits a/footage/scene01.mov b/footage/scene01.mov
Binary file modified
  - Size: 10,234,567,890 bytes → 10,234,600,000 bytes (+32,110)
  - Duration: 00:30:00.00 → 00:30:02.00 (+2s)
  - Chunks changed: 15 of 10,432 (0.14%)
  - Metadata: moov atom updated
```

### Undoing Changes

```bash
# Unstage a file (keep changes in working directory)
dits restore --staged footage/scene01.mov

# Discard changes in working directory
dits restore footage/scene01.mov

# Restore a file from a specific commit
dits restore --source abc1234 footage/scene01.mov

# Reset to a previous commit (keep changes staged)
dits reset --soft abc1234

# Reset to a previous commit (discard all changes)
dits reset --hard abc1234
```

### Stashing Changes

Save your work temporarily without committing:

```bash
# Stash current changes
dits stash

# Stash with a message
dits stash push -m "WIP: color grading"

# List stashes
dits stash list

# Apply most recent stash
dits stash pop

# Apply without removing from stash list
dits stash apply

# Drop a stash
dits stash drop
```

---

## Collaboration Basics

### Branching

```bash
# Create a new branch
dits branch feature/color-grade

# Switch to the branch
dits switch feature/color-grade

# Create and switch in one command
dits checkout -b feature/color-grade

# List all branches
dits branch

# List all branches with details
dits branch -v

# Delete a branch
dits branch -d feature/color-grade
```

### Merging

```bash
# Switch to the target branch
dits switch main

# Merge the feature branch
dits merge feature/color-grade
```

**For binary files (like videos), merging works differently:**

- Dits detects conflicts at the file level
- You choose which version to keep:

```bash
# Keep your version
dits restore --ours footage/scene01.mov

# Keep their version
dits restore --theirs footage/scene01.mov

# Then complete the merge
dits add footage/scene01.mov
dits commit -m "Merge feature/color-grade"
```

### File Locking

Prevent conflicts by locking files you're actively editing:

```bash
# Lock a file
dits lock footage/scene01.mov --reason "Color grading in progress"

# Check who has locks
dits locks

# See locks on specific files
dits locks footage/

# Unlock when done
dits unlock footage/scene01.mov
```

**Lock output:**
```
Locked: footage/scene01.mov
  Owner: you@example.com
  Acquired: 2025-01-14 10:30:00 UTC
  Expires: 2025-01-14 18:30:00 UTC (8h default)
  Reason: Color grading in progress
```

### Tags

Mark important milestones:

```bash
# Create a tag
dits tag v1.0

# Create an annotated tag with message
dits tag -a v1.0 -m "First client delivery"

# Tag a specific commit
dits tag v0.9 abc1234

# List tags
dits tag

# Delete a tag
dits tag -d v0.9
```

---

## P2P Sharing

Dits includes built-in peer-to-peer sharing for direct collaboration without cloud uploads.

### How P2P Works

```
┌──────────────────────┐         ┌──────────────────────┐
│     YOUR MACHINE     │         │  COLLABORATOR'S PC   │
│                      │ QUIC/   │                      │
│  dits p2p share      │◄───────►│  dits p2p connect    │
│  Join code: ABC-123  │ UDP     │  ABC-123 ./project   │
│                      │         │                      │
└──────────────────────┘         └──────────────────────┘
           │                                │
           │  End-to-end encrypted          │
           │  Direct connection             │
           │  NAT traversal included        │
           │                                │
           ▼                                ▼
    ┌────────────┐                   ┌────────────┐
    │Repository  │                   │Repository  │
    │ (source)   │                   │ (clone)    │
    └────────────┘                   └────────────┘
```

### Sharing Your Repository

```bash
# Share the current repository
dits p2p share

# Share with a custom name
dits p2p share --name "Commercial Project 2025"

# Share on a specific port
dits p2p share --port 8080

# Run in background
dits p2p share --daemon
```

**Output:**
```
🚀 P2P repository share active!
📋 Join code: ABC-123
🌐 Listening on 0.0.0.0:4433
📁 Repository: /Users/you/Projects/my-video-project
🔐 Encryption: SPAKE2 + AES-256-GCM

Share this code with collaborators:  ABC-123

Press Ctrl+C to stop sharing
```

### Connecting to a Share

```bash
# Connect using the join code
dits p2p connect ABC-123 ./shared-project

# Connect with custom timeout
dits p2p connect ABC-123 ./shared-project --timeout 60
```

**Output:**
```
🔗 Connecting to P2P repository...
🎯 Target: ABC-123
📁 Local path: ./shared-project
⏱️  Timeout: 30s

Finding peer... ✓
Establishing secure connection... ✓
Verifying repository... ✓

✅ Connected to P2P repository!
📁 Repository mounted at: ./shared-project

Repository info:
  Name: Commercial Project 2025
  Files: 234 tracked files
  Size: 145.6 GB (logical), 32.4 GB (physical)
  Last commit: abc1234 - "Update color grade" (2 hours ago)
```

### Managing P2P Connections

```bash
# Check status
dits p2p status

# List all active shares/connections
dits p2p list

# Test connectivity
dits p2p ping ABC-123

# View cache statistics
dits p2p cache stats

# Clear cache
dits p2p cache clear

# Disconnect
dits p2p unmount ABC-123
```

### P2P Benefits

| Feature | P2P Sharing | Cloud Upload |
|---------|-------------|--------------|
| **Speed** | Direct transfer (LAN speed possible) | Upload then download |
| **Privacy** | Data stays between you and collaborator | Data on third-party servers |
| **Cost** | Free | Storage and bandwidth fees |
| **Setup** | Just share a code | Accounts, permissions, plans |
| **Offline** | Works on local network | Requires internet |
| **Security** | End-to-end encrypted | Provider-managed encryption |

### P2P Security

- **SPAKE2 key exchange**: Secure key derivation from join code
- **AES-256-GCM encryption**: All data encrypted in transit
- **BLAKE3 verification**: All received chunks verified for integrity
- **No intermediary**: Data goes directly between peers
- **Expiring codes**: Join codes can be time-limited

---

## Next Steps

Now that you understand the basics, explore these topics:

### Learn More

- **[CLI Reference](cli-reference.md)** - Complete command documentation
- **[Configuration Reference](config-reference.md)** - All configuration options
- **[P2P Sharing Guide](p2p-sharing.md)** - Deep dive into peer-to-peer features

### Industry Guides

- **[Video Editor's Guide](../guides/video-editors.md)** - Premiere Pro, DaVinci Resolve, Final Cut Pro workflows
- **[Game Developer's Guide](../guides/game-developers.md)** - Managing game assets
- **[VFX Artist's Guide](../guides/vfx-artists.md)** - After Effects, Nuke, Fusion workflows
- **[Photographer's Guide](../guides/photographers.md)** - Lightroom, Capture One workflows

### Advanced Topics

- **[Virtual Filesystem (VFS)](../advanced/vfs.md)** - Mount repositories as drives
- **[Encryption](../advanced/encryption.md)** - Secure your repositories
- **[Storage Tiers](../advanced/storage-tiers.md)** - Hot, warm, and cold storage
- **[Self-Hosting](../operations/self-hosting.md)** - Run your own Dits server

### Troubleshooting

- **[FAQ](../troubleshooting/faq.md)** - Frequently asked questions
- **[Common Issues](../troubleshooting/common-issues.md)** - Solutions to common problems
- **[Performance Tuning](../operations/performance-tuning.md)** - Optimize for your workflow

---

## Getting Help

- **Documentation**: https://docs.dits.io
- **GitHub Issues**: https://github.com/dits-io/dits/issues
- **Discord Community**: https://discord.gg/dits
- **Email Support**: support@dits.io

---

## Quick Reference Card

```bash
# Repository
dits init                      # Initialize new repository
dits clone <url>               # Clone existing repository
dits status                    # Check current status

# Working with Files
dits add <file>                # Stage files
dits commit -m "message"       # Commit staged changes
dits diff                      # View changes
dits restore <file>            # Discard changes

# History
dits log                       # View commit history
dits show <commit>             # Show commit details

# Branching
dits branch <name>             # Create branch
dits switch <branch>           # Switch branches
dits merge <branch>            # Merge branch

# Collaboration
dits lock <file>               # Lock file for editing
dits unlock <file>             # Release lock
dits locks                     # List locks

# P2P Sharing
dits p2p share                 # Start sharing
dits p2p connect <code> <dir>  # Connect to share
dits p2p status                # Check P2P status

# Utilities
dits config --list             # View configuration
dits gc                        # Run garbage collection
dits fsck                      # Check repository integrity
```
