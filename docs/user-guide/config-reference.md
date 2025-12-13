# Configuration Reference

Complete reference for all Dits configuration files and options.

## Configuration Hierarchy

Configuration is read in order (later overrides earlier):

```
1. System config:    /etc/dits/config.toml
2. Global config:    ~/.ditsconfig
3. Repository config: .dits/config
4. Worktree config:   .dits/worktrees/{name}/config
5. Environment vars:  DITS_*
6. Command line:      --config-key=value
```

## Global Configuration (~/.ditsconfig)

User-level settings that apply to all repositories.

```toml
# ~/.ditsconfig

# ============================================
# USER IDENTITY
# ============================================

[user]
# Your name (appears in commits)
name = "Jane Developer"

# Your email (appears in commits)
email = "jane@example.com"

# SSH signing key (for signed commits)
# Can be: key fingerprint, path to key file, or "ssh-agent"
signingkey = "~/.ssh/id_ed25519.pub"

# GPG key for signing (alternative to SSH)
# gpgkey = "ABCD1234EFGH5678"

# ============================================
# CREDENTIALS
# ============================================

[credential]
# Credential helper for authentication
# Options: "cache", "store", "osxkeychain", "manager-core", custom command
helper = "osxkeychain"

# Cache timeout in seconds (for "cache" helper)
# cache_timeout = 900

# OAuth token storage
# token_path = "~/.dits/tokens"

[credential "https://dits.example.com"]
# Per-host credential settings
username = "jane"
helper = "store"

# ============================================
# CORE SETTINGS
# ============================================

[core]
# Default editor for commit messages
editor = "code --wait"

# Pager for output (false to disable)
pager = "less -FRX"

# Enable file mode tracking (executable bit)
filemode = true

# Handle symlinks (false = store as plain files)
symlinks = true

# Enable case-insensitive paths (set true on macOS/Windows)
ignorecase = true

# Line ending conversion
# "true" = convert to LF on commit, native on checkout
# "input" = convert to LF on commit, no conversion on checkout
# "false" = no conversion
autocrlf = false

# Warn about mixed line endings
safecrlf = true

# ============================================
# CHUNKING & HASHING
# ============================================

[chunking]
# Chunking algorithm: "fastcdc", "fixed", "video-aware"
algorithm = "fastcdc"

# Target average chunk size (bytes)
avg_size = 65536  # 64 KB

# Minimum chunk size
min_size = 16384  # 16 KB

# Maximum chunk size
max_size = 262144  # 256 KB

# Normalize chunk sizes (0-2, higher = more uniform)
normalization = 1

[video]
# Enable keyframe-aligned chunking for video files
keyframe_align = true

# Track media containers separately (moov/mdat split)
container_aware = true

# Parse and index video metadata
index_metadata = true

[hashing]
# Hash algorithm: "blake3" (default), "sha256"
algorithm = "blake3"

# ============================================
# COMPRESSION
# ============================================

[compression]
# Compression algorithm: "zstd" (default), "lz4", "none"
algorithm = "zstd"

# Compression level (1-22 for zstd, 1-12 for lz4)
level = 3

# Minimum size to compress (smaller files stored uncompressed)
min_size = 1024  # 1 KB

# File patterns to never compress (already compressed)
skip_patterns = [
    "*.jpg", "*.jpeg", "*.png", "*.gif", "*.webp",
    "*.mp4", "*.mov", "*.avi", "*.mkv", "*.webm",
    "*.mp3", "*.aac", "*.flac", "*.ogg",
    "*.zip", "*.gz", "*.bz2", "*.xz", "*.zst"
]

# ============================================
# NETWORK & TRANSFER
# ============================================

[transfer]
# Maximum concurrent uploads/downloads
concurrency = 8

# Bandwidth limit (bytes/sec, 0 = unlimited)
bandwidth_limit = 0

# Enable resumable transfers
resumable = true

# Chunk verification after transfer
verify = true

# Timeout for network operations (seconds)
timeout = 300

# Retry failed transfers
retry_count = 3
retry_delay_seconds = 5

[http]
# HTTP proxy
# proxy = "http://proxy.example.com:8080"

# SSL certificate verification
ssl_verify = true

# Extra CA certificates
# ssl_ca_info = "/path/to/ca-bundle.crt"

# User agent string
user_agent = "dits/1.0"

# Low speed limit (abort if below this for low_speed_time)
low_speed_limit = 1000  # bytes/sec
low_speed_time = 60     # seconds

[quic]
# QUIC transport settings
port = 4433

# Maximum streams per connection
max_streams = 100

# Initial congestion window (packets)
initial_cwnd = 10

# Keep-alive interval (seconds)
keep_alive = 30

# Idle timeout (seconds)
idle_timeout = 300

# ============================================
# CACHING
# ============================================

[cache]
# Enable local chunk cache
enabled = true

# Maximum cache size (bytes)
max_size = 10737418240  # 10 GB

# Cache location (default: .dits/cache)
# path = "~/.dits/global-cache"

# Cache eviction policy: "lru", "lfu", "fifo"
eviction = "lru"

# Time-to-live for cached remote chunks (hours)
ttl_hours = 168  # 7 days

# Prefetch related chunks
prefetch = true

# Number of chunks to prefetch
prefetch_count = 10

# ============================================
# LARGE FILE STORAGE (LFS)
# ============================================

[lfs]
# Enable LFS for large files
enabled = true

# Auto-track files larger than this (bytes)
threshold = 104857600  # 100 MB

# File patterns to always use LFS
patterns = [
    "*.psd",
    "*.ai",
    "*.indd",
    "raw/**/*.arw",
    "raw/**/*.cr2",
    "raw/**/*.nef"
]

# LFS server URL (if different from main remote)
# url = "https://lfs.example.com"

# ============================================
# DIFF & MERGE
# ============================================

[diff]
# Diff tool for binary files
tool = "ffmpeg-diff"

# External diff command
# external = "diff-so-fancy"

# Color output
color = true

# Context lines in diff output
context = 3

[merge]
# Default merge strategy
strategy = "recursive"

# Merge tool
tool = "code"

# Conflict style: "merge", "diff3", "zdiff3"
conflictstyle = "diff3"

# Auto-stash before merge
autostash = true

[mergetool "code"]
cmd = "code --wait --merge $REMOTE $LOCAL $BASE $MERGED"
trustExitCode = true

[mergetool "premiere"]
cmd = "open -a 'Adobe Premiere Pro 2024' $LOCAL $REMOTE"
trustExitCode = false

# ============================================
# UI & OUTPUT
# ============================================

[color]
# Enable colored output
ui = true

# Color settings per command
status = "auto"
diff = "auto"
branch = "auto"

[color.status]
added = "green bold"
changed = "yellow"
untracked = "red"
branch = "cyan bold"

[color.diff]
meta = "yellow bold"
old = "red"
new = "green"
frag = "magenta bold"

[format]
# Default log format
pretty = "medium"

# Date format: "relative", "local", "iso", "rfc", "short"
date = "relative"

# ============================================
# ALIASES
# ============================================

[alias]
# Command aliases
st = "status"
co = "checkout"
ci = "commit"
br = "branch"
lg = "log --oneline --graph --decorate"
unstage = "reset HEAD --"
last = "log -1 HEAD"
amend = "commit --amend --no-edit"
undo = "reset --soft HEAD~1"

# Shell commands (prefix with !)
visual = "!dits log --oneline --graph | head -20"

# ============================================
# HOOKS
# ============================================

[hooks]
# Enable hooks
enabled = true

# Hook timeout (seconds)
timeout = 300

# Run hooks in parallel where possible
parallel = false

# ============================================
# SECURITY
# ============================================

[security]
# Sign all commits
sign_commits = false

# Verify signatures on fetch
verify_signatures = false

# Allowed signers file
# allowed_signers = "~/.ssh/allowed_signers"

[encryption]
# Enable client-side encryption
enabled = false

# End-to-end encryption mode
e2ee = false

# Encrypt filenames
encrypt_filenames = false

# Key agent settings
agent_timeout = 3600  # seconds

# ============================================
# PERFORMANCE
# ============================================

[performance]
# Enable parallel processing
parallel = true

# Worker thread count (0 = auto-detect)
threads = 0

# Memory limit for operations (bytes, 0 = unlimited)
memory_limit = 0

# Index preload for faster status
preload_index = true

# Untracked cache
untracked_cache = true

# Split index for large repos
split_index = false

# ============================================
# EXPERIMENTAL
# ============================================

[experimental]
# Enable experimental features
enabled = false

# Virtual filesystem mount
vfs = false

# Watch mode for auto-staging
watch = false

# AI-powered commit messages
ai_commits = false
```

## Repository Configuration (.dits/config)

Per-repository settings. Same format as global config with additional sections.

```toml
# .dits/config

[core]
# Repository format version
repositoryformatversion = 1

# Object format
objectformat = "blake3"

# Bare repository (no working directory)
bare = false

# Working directory location (for bare repos with worktree)
# worktree = "/path/to/worktree"

# ============================================
# REMOTES
# ============================================

[remote "origin"]
# Remote URL
url = "https://dits.example.com/user/repo.dits"

# Alternative push URL
# pushurl = "git@dits.example.com:user/repo.dits"

# Fetch refspec
fetch = "+refs/heads/*:refs/remotes/origin/*"

# Push refspec
push = "refs/heads/*:refs/heads/*"

# Prune stale remote-tracking branches
prune = true

# Push tags
tagopt = "--tags"

# Mirror mode
# mirror = true

[remote "upstream"]
url = "https://dits.example.com/org/repo.dits"
fetch = "+refs/heads/*:refs/remotes/upstream/*"

# ============================================
# BRANCHES
# ============================================

[branch "main"]
# Track this remote branch
remote = "origin"
merge = "refs/heads/main"

# Rebase instead of merge on pull
rebase = true

[branch "develop"]
remote = "origin"
merge = "refs/heads/develop"
rebase = false

# ============================================
# SUBMODULES
# ============================================

[submodule "lib/common"]
path = "lib/common"
url = "https://dits.example.com/org/common.dits"
branch = "main"
update = "merge"

# ============================================
# LFS OVERRIDES
# ============================================

[lfs]
# Repository-specific LFS settings
url = "https://lfs.example.com/user/repo"

# Local LFS storage path
# storage_path = ".dits/lfs"

# ============================================
# PROJECT-SPECIFIC
# ============================================

[project]
# NLE project type: "premiere", "resolve", "aftereffects", "fcpx"
nle_type = "premiere"

# Media root (for relative path resolution)
media_root = "./media"

# Proxy generation
generate_proxies = true
proxy_preset = "1080p_h264"
```

## Environment Variables

Override any config with environment variables:

```bash
# User identity
export DITS_AUTHOR_NAME="Jane Developer"
export DITS_AUTHOR_EMAIL="jane@example.com"
export DITS_COMMITTER_NAME="Jane Developer"
export DITS_COMMITTER_EMAIL="jane@example.com"

# Date override (for reproducible commits)
export DITS_AUTHOR_DATE="2024-01-15T10:30:00Z"
export DITS_COMMITTER_DATE="2024-01-15T10:30:00Z"

# Directories
export DITS_DIR="/path/to/.dits"
export DITS_WORK_TREE="/path/to/project"
export DITS_OBJECT_DIRECTORY="/path/to/objects"
export DITS_COMMON_DIR="/path/to/common"

# Authentication
export DITS_TOKEN="dits_abc123..."
export DITS_SSH_KEY="~/.ssh/id_ed25519"

# Network
export DITS_PROXY="http://proxy:8080"
export DITS_NO_PROXY="localhost,*.local"
export DITS_SSL_NO_VERIFY="1"  # Disable SSL verification (not recommended)

# Behavior
export DITS_PAGER="less"
export DITS_EDITOR="vim"
export DITS_TERMINAL_PROMPT="0"  # Disable terminal prompts (for scripts)

# Debugging
export DITS_TRACE="1"
export DITS_TRACE_PACKET="1"
export DITS_TRACE_PERFORMANCE="1"
export DITS_DEBUG="1"

# Config overrides (flat key format)
export DITS_CONFIG_core.compression="zstd"
export DITS_CONFIG_transfer.concurrency="16"
```

## .ditsignore

Patterns for files to ignore (same syntax as .gitignore):

```gitignore
# .ditsignore

# ============================================
# GENERAL PATTERNS
# ============================================

# Backup files
*~
*.bak
*.swp
*.swo

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
desktop.ini

# ============================================
# RENDER OUTPUTS
# ============================================

# Output directories
renders/
output/
exports/
deliverables/

# Temporary renders
*.tmp.mp4
*.tmp.mov
*_temp.*

# ============================================
# NLE CACHE & TEMP FILES
# ============================================

# Adobe Premiere Pro
*.pkf
*.pek
*.cfa
*.cpf
Media Cache/
Media Cache Files/
Peak Files/
Adobe Premiere Pro Auto-Save/

# DaVinci Resolve
*.dvr
*.dvr-*
CacheClip/
.gallery/

# After Effects
Adobe After Effects Auto-Save/
*.aep.autosave*

# Final Cut Pro
*.fcpcache/
Render Files/
Waveform Data/

# ============================================
# PROXIES
# ============================================

# Proxy files (regenerate as needed)
proxies/
*.proxy.mp4
*.proxy.mov

# ============================================
# LOGS
# ============================================

*.log
logs/
crash_reports/

# ============================================
# BUILD ARTIFACTS
# ============================================

# Generic
build/
dist/
node_modules/
__pycache__/
*.pyc

# ============================================
# SECRETS
# ============================================

# Never commit these
.env
.env.local
*.pem
*.key
credentials.json
secrets/
```

## .ditsattributes

Path-specific attributes:

```gitattributes
# .ditsattributes

# ============================================
# LFS PATTERNS
# ============================================

# Video files -> LFS
*.mp4 lfs
*.mov lfs
*.avi lfs
*.mkv lfs
*.mxf lfs
*.webm lfs
*.wmv lfs

# Audio files -> LFS
*.wav lfs
*.aiff lfs
*.flac lfs

# Image files -> LFS (large ones)
*.psd lfs
*.psb lfs
*.tif lfs
*.tiff lfs
*.exr lfs
*.dpx lfs

# Raw camera files
*.arw lfs
*.cr2 lfs
*.cr3 lfs
*.nef lfs
*.dng lfs

# NLE project files
*.prproj lfs
*.drp lfs
*.aep lfs
*.fcp lfs
*.fcpbundle lfs

# ============================================
# CHUNKING STRATEGIES
# ============================================

# Video: keyframe-aligned chunking
*.mp4 chunking=keyframe
*.mov chunking=keyframe
*.mxf chunking=keyframe

# Large still images: larger chunks
*.psd chunking=large
*.psb chunking=large

# Small files: fixed chunking
*.json chunking=fixed
*.xml chunking=fixed

# ============================================
# MERGE STRATEGIES
# ============================================

# Binary files: no merge possible
*.mp4 merge=binary
*.mov merge=binary
*.wav merge=binary
*.psd merge=binary

# NLE projects: timeline-aware merge
*.prproj merge=nle-recursive
*.drp merge=nle-recursive
*.fcpbundle merge=nle-recursive

# After Effects: binary only (too complex)
*.aep merge=binary

# ============================================
# DIFF SETTINGS
# ============================================

# Video: use video diff tool
*.mp4 diff=video
*.mov diff=video

# Images: use image diff
*.jpg diff=image
*.png diff=image
*.psd diff=image

# NLE: use project diff
*.prproj diff=nle
*.drp diff=nle

# ============================================
# TEXT HANDLING
# ============================================

# Force text handling
*.txt text
*.md text
*.json text
*.xml text

# Force LF line endings
*.sh text eol=lf
*.bash text eol=lf

# Force CRLF (Windows scripts)
*.bat text eol=crlf
*.ps1 text eol=crlf

# ============================================
# EXPORT SETTINGS
# ============================================

# Don't export these to releases
.ditsattributes export-ignore
.ditsignore export-ignore
.editorconfig export-ignore

# ============================================
# LOCKING
# ============================================

# These files should be locked when editing
*.prproj lockable
*.drp lockable
*.aep lockable
*.psd lockable

# ============================================
# CUSTOM FILTERS
# ============================================

# Apply custom filters
# *.mp4 filter=video-metadata
```

## Config File Locations Summary

| Config Type | Location | Scope |
|-------------|----------|-------|
| System | `/etc/dits/config.toml` | All users on system |
| Global | `~/.ditsconfig` | Current user, all repos |
| Repository | `.dits/config` | Current repository |
| Worktree | `.dits/worktrees/{name}/config` | Specific worktree |
| Local | `.dits/config.local` | Local overrides (not committed) |

## Reading Configuration Programmatically

```rust
use dits_core::config::{Config, ConfigLevel};

// Load full config stack
let config = Config::load()?;

// Get a value
let name: String = config.get("user.name")?;
let threads: u32 = config.get_or("performance.threads", 0)?;

// Get with level
let (value, level) = config.get_with_level("core.editor")?;
println!("editor = {} (from {:?})", value, level);

// Set a value
config.set(ConfigLevel::Global, "user.name", "Jane Developer")?;

// List all settings
for (key, value, level) in config.iter() {
    println!("{:?}: {} = {}", level, key, value);
}
```

## Command-Line Config

Override any setting via command line:

```bash
# Single operation override
dits -c user.name="Temp User" commit -m "Quick fix"

# Multiple overrides
dits -c core.compression=none -c transfer.concurrency=16 push

# View config
dits config --list                    # All settings
dits config --list --global           # Global only
dits config --list --local            # Repository only

# Get specific value
dits config user.name
dits config --get-all remote.origin.fetch

# Set value
dits config user.name "Jane Developer"
dits config --global user.email "jane@example.com"

# Unset value
dits config --unset user.signingkey

# Edit config file
dits config --edit                    # Open in editor
dits config --global --edit           # Edit global config
```
