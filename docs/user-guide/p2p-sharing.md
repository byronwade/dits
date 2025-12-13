# P2P Sharing Guide

Dits includes integrated peer-to-peer (P2P) sharing capabilities, allowing you to share repositories directly between computers without uploading to cloud services.

## Overview

Traditional file sharing requires uploading files to a cloud service, then downloading them on another computer. Dits P2P sharing connects computers directly:

```
Computer A          Internet          Computer B
    │                   │                   │
    └─ Share ───────────┼──────────── Connect ─┘
        │               │                   │
        └───────────────┼───────────────────┘
                    Direct P2P connection
```

## Quick Start

### 1. Share a Repository

```bash
cd my-project
dits p2p share
```

**Output:**
```
🚀 P2P repository share active!
📋 Join code: ABC-123
🌐 Listening on 0.0.0.0:4433
📁 Repository: /path/to/my-project
```

### 2. Connect from Another Computer

```bash
dits p2p connect ABC-123 ./shared-project
```

**Output:**
```
🔗 Connecting to P2P repository...
🎯 Target: ABC-123
📁 Local path: ./shared-project
⏱️  Timeout: 30s
✅ Connected to P2P repository!
📁 Repository mounted at: ./shared-project
```

### 3. Use Like a Local Repository

```bash
cd ./shared-project
dits status
dits log
dits checkout feature-branch
```

## Commands

### Sharing

#### `dits p2p share`

Share a repository for P2P access.

```bash
# Basic sharing
dits p2p share

# Share with custom name
dits p2p share --name "VFX Project v2"

# Share specific directory
dits p2p share ./projects/commercial

# Share on custom port
dits p2p share --port 8080

# Run in background
dits p2p share --daemon
```

#### `dits p2p status`

Show current P2P status.

```bash
dits p2p status
```

**Output:**
```
📊 P2P Status
════════════
Active shares: 1
Active connections: 0

Shares:
- Repository: My Project
  Join code: ABC-123
  Port: 4433
  Peers connected: 2

Connections:
- (No active connections)
```

#### `dits p2p list`

List all active shares and connections.

```bash
dits p2p list
```

### Connecting

#### `dits p2p connect`

Connect to a shared repository.

```bash
# Connect with join code
dits p2p connect ABC-123 ./shared-repo

# Connect with custom timeout
dits p2p connect ABC-123 ./shared-repo --timeout 60

# Connect to direct address (advanced)
dits p2p connect 192.168.1.100:4433 ./shared-repo
```

#### `dits p2p ping`

Test connectivity to a peer.

```bash
# Ping with join code
dits p2p ping ABC-123

# Multiple pings
dits p2p ping ABC-123 --count 10 --interval 2
```

**Output:**
```
🏓 Pinging ABC-123
   Count: 4, Interval: 1s, Timeout: 5s

64 bytes from ABC-123: seq=1 ttl=64 time=12.3ms
64 bytes from ABC-123: seq=2 ttl=64 time=11.8ms
64 bytes from ABC-123: seq=3 ttl=64 time=12.1ms
64 bytes from ABC-123: seq=4 ttl=64 time=11.9ms

--- ABC-123 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss
round-trip min/avg/max = 11.8/12.0/12.3 ms
```

#### `dits p2p unmount`

Disconnect from shared repositories.

```bash
# Unmount specific share
dits p2p unmount ABC-123

# Force unmount
dits p2p unmount ABC-123 --force

# Unmount all connections
dits p2p unmount --all
```

### Cache Management

#### `dits p2p cache stats`

Show P2P cache statistics.

```bash
dits p2p cache stats
dits p2p cache stats --detailed
```

#### `dits p2p cache clear`

Clear the P2P cache.

```bash
dits p2p cache clear
```

#### `dits p2p cache gc`

Run garbage collection on the cache.

```bash
dits p2p cache gc
```

## How It Works

### Join Codes

When you share a repository, Dits generates a short, memorable join code like `ABC-123`. This code:

- Contains encrypted connection information
- Is time-limited (expires after sharing stops)
- Works only for the specific shared repository
- Is secure (can't be guessed or brute-forced)

### Direct Connections

Dits uses QUIC protocol for direct peer-to-peer connections:

- **NAT Traversal**: Works through home routers and firewalls
- **End-to-end Encryption**: All data is encrypted with SPAKE2
- **Fast Transfer**: Direct connection, no cloud intermediaries
- **Reliable**: QUIC provides congestion control and loss recovery

### Repository Access

Connected repositories work exactly like local repositories:

- Full Git-like workflow (status, log, checkout, etc.)
- All Dits features available (deduplication, VFS, etc.)
- Changes sync automatically when you commit/push
- File operations are fast (only changed chunks transfer)

## Security Features

### End-to-End Encryption

- **SPAKE2 Key Exchange**: Secure password-authenticated key agreement
- **Forward Secrecy**: Each session has unique encryption keys
- **Perfect Forward Secrecy**: Compromised keys don't affect past sessions

### Access Control

- **Join Codes**: Time-limited, repository-specific access
- **No Authentication**: Simple sharing without accounts
- **Direct Connection**: No intermediate servers storing data

### Network Security

- **TLS 1.3**: Modern encryption standards
- **Certificate Pinning**: Prevents man-in-the-middle attacks
- **Firewall Friendly**: Uses standard ports and protocols

## Performance

### Transfer Speeds

P2P sharing typically achieves:

- **LAN**: 100-1000 MB/s (limited by disk I/O)
- **Fast Internet**: 50-200 MB/s (limited by network)
- **Slow Internet**: 10-50 MB/s (still faster than cloud roundtrips)

### Deduplication Benefits

Since Dits uses content-defined chunking:

- **Incremental Sync**: Only changed chunks transfer
- **Cross-File Dedup**: Shared footage between projects transfers once
- **Smart Caching**: Frequently accessed chunks stay local

### Example: Editing Session

```
Day 1: Initial sync (50GB project)
       Transfer: 50GB over 10-30 minutes

Day 2: Small edit (change 30 seconds of video)
       Transfer: 45MB over 5 seconds

Day 3: Color grade (modify same footage)
       Transfer: 120MB over 12 seconds

Total bandwidth: 50.165GB vs 150GB (70% savings)
```

## Troubleshooting

### Connection Issues

#### "Connection timed out"
```bash
# Check if the share is still active
dits p2p status

# Test connectivity
dits p2p ping <join-code>

# Try direct IP connection
dits p2p connect <ip>:<port> ./repo
```

#### "Join code invalid"
- Join codes expire when sharing stops
- Check the sharing computer is still running
- Verify the code was copied correctly

#### Firewall blocking connections
- Try a different port: `dits p2p share --port 8080`
- Check firewall settings for QUIC/UDP traffic
- Some corporate networks block P2P traffic

### Performance Issues

#### Slow transfers
```bash
# Check cache status
dits p2p cache stats

# Clear cache if corrupted
dits p2p cache clear

# Test network speed
dits p2p ping <join-code> --count 10
```

#### High CPU usage
- P2P sharing is CPU-intensive during initial sync
- This is normal for content-defined chunking
- CPU usage drops significantly after initial transfer

### Repository Issues

#### "Repository not found"
- Ensure the shared directory contains a `.dits` folder
- Check that `dits init` was run in the shared directory

#### Permission errors
- Ensure read/write access to the shared directory
- Check that the sharing user has proper permissions

## Advanced Usage

### Custom Network Configuration

```bash
# Bind to specific interface
dits p2p share --bind 192.168.1.100

# Use custom port range
dits p2p share --port 8080

# Share read-only
# (Future feature - currently all shares are read-write)
```

### Batch Operations

```bash
# Share multiple repositories
for repo in project-a project-b project-c; do
    dits p2p share ./$repo &
done

# Connect to multiple shares
dits p2p connect ABC-123 ./shared/project-a
dits p2p connect DEF-456 ./shared/project-b
```

### Integration with CI/CD

```yaml
# GitHub Actions example
- name: Connect to shared assets
  run: dits p2p connect ${{ secrets.JOIN_CODE }} ./assets

- name: Build with shared assets
  run: |
    dits status
    # Build commands here

- name: Disconnect
  run: dits p2p unmount --all
```

## Comparison with Alternatives

| Feature | Dits P2P | Dropbox | Git LFS | Resilio Sync |
|---------|----------|---------|---------|--------------|
| Setup | Join code | Account + install | Git hooks | Complex config |
| Speed | Direct P2P | Upload + download | HTTP slow | P2P fast |
| Cost | Free | $10-100/month | $5-45/month | $60/lifetime |
| Security | End-to-end | Provider encryption | Git security | End-to-end |
| VCS Integration | Full Git workflow | File sync only | Git LFS | File sync only |
| Version Control | Yes | Limited | Yes | No |
| Deduplication | Content-aware | Block-level | None | File-level |

## Future Features

### Planned P2P Enhancements

- **Selective Sync**: Choose which branches/files to sync
- **Bandwidth Limiting**: Control transfer speeds
- **Offline Mode**: Queue changes for later sync
- **Conflict Resolution**: Handle concurrent edits
- **Access Permissions**: Read-only vs read-write shares
- **Team Management**: Manage multiple users per share

### Integration Improvements

- **GitHub Integration**: Share repositories with GitHub links
- **CI/CD Integration**: Automated sharing in build pipelines
- **Mobile Support**: Connect from mobile devices
- **Web Interface**: Browser-based repository browsing
