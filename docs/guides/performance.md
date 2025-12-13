# Performance Optimization Guide

Maximize Dits performance for large repositories, slow networks, and resource-constrained systems.

---

## Table of Contents

1. [Performance Overview](#performance-overview)
2. [Hardware Recommendations](#hardware-recommendations)
3. [Network Optimization](#network-optimization)
4. [Storage Optimization](#storage-optimization)
5. [Large Repository Strategies](#large-repository-strategies)
6. [Chunking Performance](#chunking-performance)
7. [Clone & Sync Optimization](#clone--sync-optimization)
8. [VFS Performance](#vfs-performance)
9. [Cache Management](#cache-management)
10. [Parallel Operations](#parallel-operations)
11. [Monitoring & Profiling](#monitoring--profiling)
12. [Platform-Specific Tuning](#platform-specific-tuning)

---

## Performance Overview

### Performance Targets

| Operation | Target | Bottleneck |
|-----------|--------|------------|
| `dits add` (1GB file) | < 5 seconds | Disk I/O, CPU (chunking) |
| `dits commit` | < 1 second | Index update |
| `dits status` | < 100ms | Index scan |
| `dits push` (10GB new) | Network limited | Bandwidth |
| `dits clone` (sparse) | < 30 seconds | Network, manifest size |
| VFS file open | < 50ms | Cache hit/miss |

### Factors Affecting Performance

```
Performance Equation:
┌──────────────────────────────────────────────────┐
│                                                  │
│  Performance = f(Hardware, Network, Repository,  │
│                  Configuration, Workflow)         │
│                                                  │
└──────────────────────────────────────────────────┘

Hardware: CPU cores, RAM, disk speed, disk type
Network: Bandwidth, latency, reliability
Repository: Size, file count, history depth
Configuration: Chunk size, parallel jobs, cache size
Workflow: Operations used, access patterns
```

---

## Hardware Recommendations

### Minimum Requirements

| Component | Minimum | Notes |
|-----------|---------|-------|
| CPU | 2 cores | Chunking is parallelized |
| RAM | 8 GB | For repositories up to 100GB |
| Storage | HDD | Works but slower |
| Network | 10 Mbps | Usable for small projects |

### Recommended Specifications

| Component | Recommended | Why |
|-----------|-------------|-----|
| CPU | 4+ cores | Faster chunking, hashing |
| RAM | 16+ GB | Larger index caching |
| Storage | NVMe SSD | 10x faster than HDD |
| Network | 100+ Mbps | Reasonable sync times |

### Optimal Setup (Power Users)

| Component | Optimal | Use Case |
|-----------|---------|----------|
| CPU | 8+ cores | Video production, game dev |
| RAM | 32+ GB | Very large repositories |
| Storage | NVMe SSD (1TB+) | Large local cache |
| Network | 1 Gbps | Team collaboration |

### Storage Impact Comparison

```
Adding 10GB video file:

HDD (100 MB/s):
  Read: 100 seconds
  Chunk: 10 seconds
  Write: 100 seconds
  Total: ~3.5 minutes

SATA SSD (500 MB/s):
  Read: 20 seconds
  Chunk: 10 seconds
  Write: 20 seconds
  Total: ~50 seconds

NVMe SSD (3000 MB/s):
  Read: 3.5 seconds
  Chunk: 10 seconds
  Write: 3.5 seconds
  Total: ~17 seconds
```

---

## Network Optimization

### Bandwidth Settings

```bash
# Check current settings
dits config transfer.maxBandwidth
dits config transfer.maxConnections

# Limit bandwidth (useful on shared networks)
dits config transfer.maxBandwidth 50MB/s

# Unlimited (default)
dits config transfer.maxBandwidth 0

# Adjust concurrent connections
dits config transfer.maxConnections 8  # Default: 8
```

### Connection Tuning

```bash
# For high-latency networks (satellite, VPN)
dits config transfer.timeout 60s
dits config transfer.retryDelay 5s
dits config transfer.maxRetries 5

# For low-latency, high-bandwidth networks
dits config transfer.maxConnections 16
dits config transfer.bufferSize 8MB

# For unreliable networks
dits config transfer.resumable true  # Default: true
```

### Protocol Selection

```bash
# QUIC (default, best for most cases)
dits config transfer.protocol quic

# HTTPS (fallback for restrictive firewalls)
dits config transfer.protocol https

# Prefer QUIC, fall back to HTTPS
dits config transfer.protocol auto
```

### Network Diagnostics

```bash
# Test connection speed
dits remote test origin

# Output:
# Testing connection to origin...
# Latency: 45ms
# Download: 125 MB/s
# Upload: 85 MB/s
# Protocol: QUIC

# Verbose transfer info
dits push -v
# Shows per-chunk transfer speeds
```

---

## Storage Optimization

### Cache Configuration

```bash
# Set cache location (use fast SSD)
dits config cache.path /Volumes/FastSSD/dits-cache

# Set cache size
dits config cache.size 100GB  # Default: 10GB

# Cache eviction policy
dits config cache.policy lru  # Least Recently Used (default)
dits config cache.policy lfu  # Least Frequently Used
```

### Disk Space Management

```bash
# Check repository size
dits repo-stats

# Output:
# Total files: 5,234
# Total size: 156.7 GB
# Deduplicated: 42.3 GB
# Deduplication ratio: 73%

# Clean up unused chunks
dits gc

# Aggressive cleanup
dits gc --aggressive

# See what would be cleaned
dits gc --dry-run
```

### Optimizing .dits Location

```bash
# For projects on slow storage, put .dits on fast storage
dits config core.repositoryPath /Volumes/SSD/dits-repos/project

# Or use symlink
mv .dits /Volumes/SSD/dits-repos/project/.dits
ln -s /Volumes/SSD/dits-repos/project/.dits .dits
```

### Storage Backend Options

```bash
# Local storage (default)
dits config storage.backend local

# S3-compatible storage (self-hosted)
dits config storage.backend s3
dits config storage.s3.endpoint https://s3.example.com
dits config storage.s3.bucket my-dits-bucket
```

---

## Large Repository Strategies

### Sparse Checkout

For repositories with many files you don't need:

```bash
# Clone without content
dits clone --filter=sparse https://ditshub.com/org/huge-project

# Add only paths you need
dits sparse add Assets/Characters/Hero/
dits sparse add Scenes/MainScene/

# Check sparse configuration
dits sparse list

# Remove paths you no longer need
dits sparse remove Assets/OldAssets/
```

### Partial Clone

Clone with limited history:

```bash
# Shallow clone (recent commits only)
dits clone --depth 10 https://ditshub.com/org/project

# Clone without blobs (download on demand)
dits clone --filter=blob:none https://ditshub.com/org/project

# Deepen later if needed
dits fetch --deepen 100
```

### Monorepo Strategies

For very large repositories:

```bash
# Use VFS mounting instead of full checkout
dits vfs mount /mnt/project --cache-size 50GB

# Access files through mount point
# Only accessed files are downloaded

# Prefetch what you need
dits vfs hydrate Assets/CurrentProject/
```

### Repository Splitting

When a repository gets too large:

```bash
# Option 1: Separate repos for code and assets
project-code/       # Git repository
project-assets/     # Dits repository

# Option 2: Submodules (when dits supports them)
# Link asset repos as submodules

# Option 3: Archive old projects
dits archive --format tar -o archive.tar v1.0
# Store archive externally
# Remove archived content from active repo
```

---

## Chunking Performance

### Chunk Size Tuning

```bash
# Default chunk sizes (optimized for most cases)
# MIN: 256 KB
# AVG: 1 MB
# MAX: 4 MB

# For smaller files (more deduplication, more chunks)
dits config chunk.averageSize 512KB

# For larger files (fewer chunks, less overhead)
dits config chunk.averageSize 2MB

# Reset to defaults
dits config --unset chunk.averageSize
```

### When to Adjust Chunk Size

| Scenario | Recommended Setting | Why |
|----------|---------------------|-----|
| Many similar files | Smaller (512KB) | More deduplication |
| Mostly unique files | Larger (2MB) | Less overhead |
| Slow network | Smaller (256KB) | Better resume |
| Fast network | Default or larger | Less chunk management |
| Limited storage | Smaller | Better deduplication |

### Chunking Performance Analysis

```bash
# See how a file was chunked
dits inspect-file video.mp4

# Output:
# File: video.mp4
# Size: 10,485,760,000 bytes (10 GB)
# Chunks: 9,847
# Chunk sizes:
#   Min: 262,144 bytes
#   Avg: 1,064,832 bytes
#   Max: 4,194,304 bytes
# Dedup candidates: 234 chunks (2.4%)
```

---

## Clone & Sync Optimization

### Faster Clones

```bash
# Parallel chunk downloads
dits clone -j 16 https://ditshub.com/org/project

# Sparse clone for immediate use
dits clone --filter=sparse https://ditshub.com/org/project
cd project
dits sparse add path/you/need/

# Shallow clone (limited history)
dits clone --depth 1 https://ditshub.com/org/project
```

### Faster Pushes

```bash
# Parallel uploads
dits push -j 16

# Dry run to estimate
dits push -n
# Output: Would upload 234 chunks (2.3 GB)

# Resume interrupted push
dits push --resume
```

### Faster Pulls

```bash
# Parallel downloads
dits pull -j 16

# Fetch only (no merge)
dits fetch -j 16
# Review changes
dits log origin/main ^main
# Then merge
dits merge origin/main
```

### Optimizing Daily Workflow

```bash
# Fetch in background while working
dits fetch --background &

# Pull only changed files
dits pull --autostash

# Push immediately after commit
dits commit -m "Changes" && dits push
```

---

## VFS Performance

### VFS Cache Settings

```bash
# Mount with larger cache
dits vfs mount /mnt/project --cache-size 100GB

# Use fast storage for cache
dits config vfs.cachePath /Volumes/NVMe/vfs-cache

# Prefetch metadata
dits vfs mount /mnt/project --prefetch-metadata
```

### Prefetching Strategies

```bash
# Hydrate directories you'll use
dits vfs hydrate Assets/CurrentScene/

# Hydrate by pattern
dits vfs hydrate "*.prproj"

# Parallel hydration
dits vfs hydrate -j 8 Assets/

# Background hydration
dits vfs hydrate --background Assets/ &
```

### VFS Performance Tips

```bash
# 1. Use SSD for VFS cache
dits config vfs.cachePath /Volumes/SSD/vfs-cache

# 2. Increase cache size for active projects
dits vfs mount /mnt/project --cache-size 200GB

# 3. Prefetch predictively
dits config vfs.prefetch.enabled true
dits config vfs.prefetch.depth 2  # Prefetch 2 directories deep

# 4. Monitor cache effectiveness
dits vfs status

# Output:
# Mount: /mnt/project
# Cache: 45 GB / 100 GB used
# Hit rate: 94%
# Hydrated: 1,234 / 10,456 files
```

### When NOT to Use VFS

VFS may not be ideal for:
- Applications that scan entire directories
- Build systems that need all files
- When you have fast network + storage

In these cases, prefer full checkout or sparse checkout.

---

## Cache Management

### Understanding the Cache

```
Cache structure:
┌─────────────────────────────────────────────┐
│                 DITS CACHE                   │
├─────────────────────────────────────────────┤
│ Chunk cache:    Downloaded chunks           │
│ Metadata cache: Manifests, indexes          │
│ VFS cache:      On-demand file content      │
└─────────────────────────────────────────────┘
```

### Cache Commands

```bash
# View cache status
dits cache status

# Output:
# Cache location: /Users/jane/.dits-cache
# Total size: 45.6 GB / 100 GB
# Chunk cache: 40.2 GB (12,345 chunks)
# Metadata cache: 5.4 GB
# Oldest entry: 45 days ago

# Clear all cache
dits cache clear

# Clear only old entries
dits cache prune --older-than 30d

# Clear specific repository's cache
dits cache clear --repo /path/to/repo
```

### Cache Warming

```bash
# Pre-populate cache before going offline
dits cache warm

# Warm specific paths
dits cache warm Assets/Characters/

# Warm for offline editing
dits cache warm --offline-mode
```

### Cache Location Recommendations

| Storage Type | Use For |
|--------------|---------|
| Internal SSD | Primary cache |
| External SSD | Portable projects |
| NAS | Shared team cache |
| Cloud sync folder | NOT recommended (corruption risk) |

---

## Parallel Operations

### Configuring Parallelism

```bash
# Global parallel jobs setting
dits config transfer.jobs 8

# Per-command parallelism
dits clone -j 16 https://...
dits push -j 12
dits pull -j 8

# Automatic based on cores
dits config transfer.jobs auto
```

### Optimal Parallelism

```
Rule of thumb:
  Fast network + Fast storage: jobs = 2 × CPU cores
  Slow network: jobs = 4-8 (limited by bandwidth)
  Slow storage: jobs = CPU cores (limited by I/O)

Example (8-core CPU):
  Fast network: -j 16
  Slow network: -j 8
  HDD storage: -j 8
```

### Background Operations

```bash
# Run operations in background
dits push --background

# Check background job status
dits jobs

# Output:
# Job 1: push (running, 45% complete)
# Job 2: fetch (completed)

# Cancel background job
dits jobs cancel 1
```

---

## Monitoring & Profiling

### Performance Metrics

```bash
# Time any command
time dits add large-file.mp4

# Verbose output with timing
dits push -v --timing

# Output:
# Analyzing changes... 1.2s
# Chunking new content... 15.3s
# Computing hashes... 2.1s
# Uploading chunks... 45.6s (125 MB/s)
# Updating references... 0.5s
# Total: 64.7s
```

### Repository Analysis

```bash
# Detailed repository stats
dits repo-stats -v

# Find largest files
dits repo-stats --top-files 20

# Analyze deduplication
dits repo-stats --dedup-analysis

# Output:
# Deduplication analysis:
# Unique chunks: 45,678
# Shared chunks: 12,345 (21%)
# Most shared chunk: abc123 (used by 234 files)
```

### Identifying Bottlenecks

```bash
# Profile a slow operation
DITS_TRACE=1 dits push

# Output shows time spent in each phase:
# [0.1s] Loading index
# [1.2s] Scanning working tree
# [15.3s] Chunking new files    ← Bottleneck!
# [0.5s] Computing manifests
# [30.2s] Uploading chunks
```

### Continuous Monitoring

```bash
# Enable metrics endpoint (for Prometheus/Grafana)
dits config metrics.enabled true
dits config metrics.port 9090

# Metrics available at http://localhost:9090/metrics
# - dits_chunks_total
# - dits_cache_hit_rate
# - dits_transfer_bytes_total
# - dits_operation_duration_seconds
```

---

## Platform-Specific Tuning

### macOS

```bash
# Use APFS cloning for local copies
dits config core.useCloning true

# Spotlight exclusion (prevent indexing .dits)
# Add .dits to System Preferences → Spotlight → Privacy

# Increase file descriptor limit
ulimit -n 10000

# Disable App Nap for background operations
defaults write com.dits.cli NSAppSleepDisabled -bool YES
```

### Linux

```bash
# Increase inotify watchers for large repos
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Use io_uring for better I/O (if available)
dits config core.ioBackend io_uring

# Optimize for BTRFS/ZFS (if using)
dits config storage.compressionEnabled false  # Filesystem handles it
```

### Windows

```bash
# Exclude from Windows Defender
# Add .dits folder to exclusions

# Use long path support
git config --system core.longpaths true

# Disable Windows Search indexing for .dits
# Right-click .dits folder → Properties → Advanced → Uncheck indexing
```

### Network File Systems

```bash
# NFS: Increase timeout
dits config transfer.timeout 120s

# SMB: Reduce parallel operations
dits config transfer.jobs 4

# General NAS: Use local cache
dits config cache.path /local/ssd/dits-cache
```

---

## Performance Troubleshooting

### Slow `dits add`

```bash
# Problem: Adding files is slow
# Diagnosis:
time dits add large-file.mp4 -v

# Solutions:
# 1. Use faster storage
# 2. Increase chunk size for unique files
dits config chunk.averageSize 2MB

# 3. Exclude unnecessary files
# Add to .ditsignore
```

### Slow `dits status`

```bash
# Problem: Status check is slow
# Diagnosis:
time dits status

# Solutions:
# 1. Update index more frequently
dits update-index

# 2. Check for filesystem issues
dits fsck

# 3. For very large repos, use sparse checkout
```

### Slow `dits push/pull`

```bash
# Problem: Sync is slow
# Diagnosis:
dits remote test origin

# Solutions:
# 1. Increase parallelism
dits config transfer.jobs 16

# 2. Check network
ping ditshub.com
speedtest-cli

# 3. Use QUIC protocol
dits config transfer.protocol quic
```

### High Memory Usage

```bash
# Problem: Dits uses too much RAM
# Diagnosis:
dits config --list | grep memory

# Solutions:
# 1. Limit index cache
dits config index.cacheSize 512MB

# 2. Process files in batches
dits add Assets/Characters/
dits commit -m "Characters"
dits add Assets/Environments/
dits commit -m "Environments"
```

---

## Quick Reference

### Performance Configuration Cheatsheet

```bash
# Network optimization
dits config transfer.jobs 16
dits config transfer.protocol quic
dits config transfer.maxConnections 16

# Storage optimization
dits config cache.path /Volumes/SSD/dits-cache
dits config cache.size 100GB

# Large repository optimization
dits clone --filter=sparse <url>
dits sparse add <paths>

# VFS optimization
dits vfs mount /mnt/project --cache-size 100GB --prefetch-metadata

# Cleanup
dits gc --aggressive
dits cache prune --older-than 30d
```

### Performance Benchmarks

Run these to test your setup:

```bash
# Create test file
dd if=/dev/urandom of=test-1gb.bin bs=1M count=1024

# Benchmark add
time dits add test-1gb.bin

# Benchmark push
time dits push

# Benchmark clone
time dits clone <url> test-clone

# Clean up
rm test-1gb.bin
rm -rf test-clone
```

---

## Further Reading

- [CLI Reference](../reference/cli.md)
- [How Dits Works](../concepts/how-dits-works.md)
- [Troubleshooting Guide](../troubleshooting/common-issues.md)
- [Self-Hosting Guide](../operations/self-hosting.md)
