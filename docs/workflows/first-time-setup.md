# Workflow: First-Time Setup

A complete guide for setting up Dits for the first time, from installation to first commit.

> 🚧 **Roadmap notice.** Some steps below assume networked features that are **not
> implemented yet**: `dits auth login` does not exist (there is no `dits auth` command —
> `login`/`logout`/`change-password` manage **local encryption keys** only), and network
> `dits clone <url>`, `dits push`, and `dits remote` print placeholders / transfer no data.
> Local setup — `init`, `config`, `add`, `commit` — works today. Use a **local-path**
> `dits clone /path/to/repo` for local copies. `dits mount`/`unmount` work **local-only**
> and require a `--features fuser` build. See `docs/STATUS.md` for authoritative status.

---

## Prerequisites

- macOS 12+, Windows 10+, or Linux (Ubuntu 20.04+)
- 8GB RAM minimum (16GB recommended for large files)
- 50GB free disk space for cache
- Internet connection (only needed for the planned networked features; local use is offline)

---

## Step 1: Install Dits

The only install that works today is the npm package (or bun/pnpm), or building from
source. Homebrew taps, `curl | bash` installers from a custom domain, apt/dnf repos,
Chocolatey, Scoop, and Winget packages are **not yet published** (planned).

### npm / bun / pnpm (Recommended)
```bash
# npm
npm install -g @byronwade/dits

# or bun
bun install -g @byronwade/dits

# or pnpm
pnpm add -g @byronwade/dits
```

### Building from Source
```bash
git clone https://github.com/byronwade/dits.git
cd dits
cargo build --release
# Binary at target/release/dits

# To enable VFS mount support (local-only), build with the fuser feature:
cargo build --release --features fuser
```

> Not yet available: `cargo install dits`, `brew tap`, apt/dnf/choco/scoop/winget
> packages, and prebuilt installers from a custom domain. Use npm or build from source today.

### Verify Installation
```bash
dits --version
# dits 0.1.5
```

---

## Step 2: Configure Identity

Set your name and email (used in commit metadata):

```bash
dits config --global user.name "Your Full Name"
dits config --global user.email "your.email@example.com"
```

Verify configuration:
```bash
dits config --global --list
# user.name=Your Full Name
# user.email=your.email@example.com
```

---

## Step 3: Set Up Authentication

> 🚧 **Roadmap — not implemented.** There is **no `dits auth` command** and no hosted
> Dits service to authenticate against. `login` / `logout` / `change-password` manage
> **local encryption keys** only. The browser/token/SSO login flows below describe intended
> design for the planned hosted service and do not work today. See `docs/STATUS.md`.

### Option A: Interactive Login (roadmap)
```bash
dits auth login
# Opens browser for authentication
# Follow prompts to authorize
```

### Option B: Token-Based Login (roadmap)
```bash
# Get token from web dashboard (planned)
dits auth login --token dits_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Option C: SSO (Enterprise) (roadmap)
```bash
dits auth login --sso --server https://dits.yourcompany.com
```

---

## Step 4: Configure Cache

Dits caches chunks locally for performance. Configure based on your available disk:

```bash
# Set cache size (default: 10GB)
dits config --global cache.size 50GB

# Set cache location (optional)
dits config --global cache.path /path/to/fast/ssd/dits-cache
```

View cache statistics:
```bash
dits cache-stats
# Location: ~/.dits/cache
# Size limit: 50 GB
# Used: 0 B
# Files cached: 0
```

---

## Step 5: Create Your First Repository

### Option A: Initialize New Repository
```bash
# Create project directory
mkdir my-video-project
cd my-video-project

# Initialize Dits repository
dits init

# Output:
# Initialized empty Dits repository in /Users/you/my-video-project/.dits/
```

### Option B: Clone Existing Repository
```bash
# Clone from a LOCAL filesystem path (this is the only clone that works today)
dits clone /path/to/existing/repo

# Network clone (roadmap — does NOT transfer data today):
dits clone https://example.com/team/project
```

> 🚧 Only **local-filesystem** `dits clone /path/to/repo` works today. Network clone over
> a URL is roadmap / scaffolding and transfers no data.

---

## Step 6: Add Files

### Add Video Files
```bash
# Add single file
dits add footage/interview_raw.mov

# Add directory
dits add footage/

# Add with progress (useful for large files)
dits add --progress raw/*.mov
```

**Expected output:**
```
Adding footage/interview_raw.mov...
  Parsing container: MOV (moov + mdat)
  Chunking: 2,456 chunks (avg 64KB)
  Deduplication: 2,456 new, 0 existing
  Total: 157.2 MB staged

Adding footage/b-roll/...
  Processing 24 files...
  Total: 3.2 GB staged
Done.
```

### Check Status
```bash
dits status

# On branch main
#
# Changes to be committed:
#   new file:   footage/interview_raw.mov
#   new file:   footage/b-roll/shot01.mov
#   ... (23 more files)
```

---

## Step 7: Commit Changes

```bash
dits commit -m "Initial import: interview footage and b-roll"

# Output:
# [main abc1234] Initial import: interview footage and b-roll
#  25 files changed, 3.4 GB added
```

---

## Step 8: Connect to Remote (If Not Cloned)

> 🚧 **Roadmap — not implemented.** `dits remote add` writes config/scaffolding only, and
> `dits push` prints a placeholder and **transfers no data** today. Networked sync is on the
> roadmap. The commands and output below describe intended design. See `docs/STATUS.md`.

### Add Remote (config/scaffolding only)
```bash
dits remote add origin https://example.com/team/my-video-project
```

### Push to Remote (roadmap — transfers no data today)
```bash
dits push -u origin main

# Intended output (not produced today):
# Pushing to origin...
# Computing delta: 2,456 chunks to transfer
# Uploading: 100% (2,456/2,456), 3.4 GB | 45.2 MB/s
# Branch 'main' set up to track 'origin/main'
```

---

## Step 9: Verify Setup

### Check Repository Status
```bash
dits status
# On branch main
# Your branch is up to date with 'origin/main'.
# nothing to commit, working tree clean
```

### View Commit History
```bash
dits log --oneline
# abc1234 (HEAD -> main, origin/main) Initial import: interview footage and b-roll
```

### Test Deduplication
```bash
# Copy a file and add it
cp footage/interview_raw.mov footage/interview_raw_backup.mov
dits add footage/interview_raw_backup.mov
dits status

# Output should show:
# new file: footage/interview_raw_backup.mov (deduplicated: 100%)
```

---

## Optional: Set Up Virtual Filesystem

Mount repository for seamless NLE integration. `dits mount` requires a `--features fuser`
build and a platform FUSE driver (macFUSE / FUSE 3), and is **local-only** today — remote /
on-demand hydration over the network is roadmap.

```bash
# Mount repository (local-only)
dits mount /Volumes/my-project

# Files appear immediately
ls /Volumes/my-project/footage/
# interview_raw.mov  b-roll/  ...

# When done
dits unmount /Volumes/my-project
```

---

## Troubleshooting

### "Permission denied" on add
```bash
# Check file permissions
ls -la footage/
# Ensure you own the files
```

### Slow initial upload
```bash
# Check network speed
dits config --global network.maxConnections 10
dits config --global network.chunkParallelism 8
```

### Cache filling up
```bash
# Check cache usage
dits cache-stats
```

---

## Next Steps

- Read [Daily Workflow](daily-workflow.md) for everyday usage
- Learn about [Collaboration](collaboration.md) for team projects
- Explore [Virtual Filesystem](virtual-filesystem.md) for NLE integration
