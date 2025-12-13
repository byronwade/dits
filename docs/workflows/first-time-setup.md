# Workflow: First-Time Setup

A complete guide for setting up Dits for the first time, from installation to first commit.

---

## Prerequisites

- macOS 12+, Windows 10+, or Linux (Ubuntu 20.04+)
- 8GB RAM minimum (16GB recommended for large files)
- 50GB free disk space for cache
- Internet connection for remote repositories

---

## Step 1: Install Dits

### macOS (Homebrew)
```bash
brew tap dits/dits
brew install dits
```

### macOS (Direct Download)
```bash
curl -fsSL https://get.dits.dev/install.sh | bash
```

### Windows (Installer)
1. Download `dits-setup.exe` from https://dits.dev/download
2. Run installer
3. Restart terminal

### Windows (Winget)
```powershell
winget install Dits.Dits
```

### Linux (apt)
```bash
curl -fsSL https://get.dits.dev/gpg | sudo gpg --dearmor -o /usr/share/keyrings/dits-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/dits-archive-keyring.gpg] https://apt.dits.dev stable main" | sudo tee /etc/apt/sources.list.d/dits.list
sudo apt update
sudo apt install dits
```

### Verify Installation
```bash
dits --version
# dits version 1.0.0
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

### Option A: Interactive Login
```bash
dits auth login
# Opens browser for authentication
# Follow prompts to authorize
```

### Option B: Token-Based Login
```bash
# Get token from web dashboard: https://app.dits.dev/settings/tokens
dits auth login --token dits_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Option C: SSO (Enterprise)
```bash
dits auth login --sso --server https://dits.yourcompany.com
```

Verify authentication:
```bash
dits auth status
# Logged in as your.email@example.com
# Server: https://api.dits.dev
# Token expires: 2025-02-15
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

View cache status:
```bash
dits cache status
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
# Clone from server
dits clone https://dits.example.com/team/project

# Clone with metadata only (faster, hydrate on demand)
dits clone --filter blob:none https://dits.example.com/team/project
```

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

### Add Remote
```bash
dits remote add origin https://dits.example.com/team/my-video-project
```

### Push to Remote
```bash
dits push -u origin main

# Output:
# Pushing to origin...
# Computing delta: 2,456 chunks to transfer
# Uploading: 100% (2,456/2,456), 3.4 GB | 45.2 MB/s
# Branch 'main' set up to track 'origin/main'
# To https://dits.example.com/team/my-video-project
#  * [new branch]      main -> main
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

Mount repository for seamless NLE integration:

```bash
# Mount repository
dits mount /Volumes/my-project

# Files appear immediately
ls /Volumes/my-project/footage/
# interview_raw.mov  b-roll/  ...

# Open files in your NLE
# Files stream on demand - no waiting!

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
dits cache status

# Clear old cache entries
dits cache prune

# Or clear all
dits cache clear
```

### Authentication expired
```bash
dits auth status
# Token expired

dits auth login
# Re-authenticate
```

---

## Next Steps

- Read [Daily Workflow](daily-workflow.md) for everyday usage
- Learn about [Collaboration](collaboration.md) for team projects
- Explore [Virtual Filesystem](virtual-filesystem.md) for NLE integration
