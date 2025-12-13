# Common Issues and Solutions

This guide covers the most common issues users encounter with Dits and provides step-by-step solutions.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Repository Issues](#repository-issues)
3. [File Operations](#file-operations)
4. [Networking & Sync](#networking--sync)
5. [P2P Sharing Issues](#p2p-sharing-issues)
6. [Virtual Filesystem (VFS)](#virtual-filesystem-vfs)
7. [Performance Issues](#performance-issues)
8. [Storage Issues](#storage-issues)
9. [Authentication Issues](#authentication-issues)
10. [Merge & Conflict Issues](#merge--conflict-issues)
11. [Platform-Specific Issues](#platform-specific-issues)

---

## Installation Issues

### "Command not found: dits"

**Cause**: Dits is not in your PATH.

**Solution:**

```bash
# Check if dits is installed
which dits

# If installed but not in PATH, add to PATH
# For bash (~/.bashrc or ~/.bash_profile):
export PATH="$PATH:/usr/local/bin"

# For zsh (~/.zshrc):
export PATH="$PATH:/usr/local/bin"

# Reload shell
source ~/.bashrc  # or ~/.zshrc

# Verify
dits --version
```

**If not installed:**
```bash
# macOS
brew tap dits-io/dits && brew install dits

# Linux
curl -fsSL https://dits.io/install.sh | bash

# Windows (PowerShell as Admin)
choco install dits
```

---

### "Error: FUSE not found" (macOS)

**Cause**: macFUSE is not installed, required for VFS mounting.

**Solution:**

```bash
# Install macFUSE
brew install macfuse

# If you see a security warning:
# 1. Open System Preferences → Security & Privacy
# 2. Click "Allow" for the blocked extension
# 3. Restart your Mac

# Verify installation
kextstat | grep -i fuse
```

---

### "Permission denied during installation" (Linux)

**Cause**: Insufficient permissions to install to system directories.

**Solution:**

```bash
# Option 1: Install with sudo
curl -fsSL https://dits.io/install.sh | sudo bash

# Option 2: Install to user directory
curl -fsSL https://dits.io/install.sh | bash -s -- --prefix=$HOME/.local
export PATH="$PATH:$HOME/.local/bin"
```

---

### "cargo build fails with linking errors"

**Cause**: Missing system dependencies.

**Solution:**

```bash
# macOS
xcode-select --install
brew install openssl pkg-config

# Ubuntu/Debian
sudo apt install build-essential pkg-config libssl-dev

# Fedora
sudo dnf install gcc pkg-config openssl-devel

# Then rebuild
cargo build --release
```

---

## Repository Issues

### "fatal: not a dits repository"

**Cause**: You're not in a Dits repository or the `.dits` directory is missing/corrupted.

**Solution:**

```bash
# Check if you're in the right directory
pwd
ls -la .dits

# If no .dits directory, initialize one
dits init

# If .dits exists but corrupted, try fsck
dits fsck --repair
```

---

### "Repository appears to be corrupted"

**Cause**: Incomplete write, disk error, or interrupted operation.

**Solution:**

```bash
# 1. Run integrity check
dits fsck

# 2. Attempt automatic repair
dits fsck --repair

# 3. If repair fails, check for backup
ls .dits/objects/backup/

# 4. If you have a remote, re-clone
cd ..
mv my-project my-project-corrupted
dits clone <remote-url> my-project
```

---

### "HEAD points to invalid reference"

**Cause**: Corrupted HEAD file or missing branch reference.

**Solution:**

```bash
# Check HEAD
cat .dits/HEAD

# Reset to main branch
echo "ref: refs/heads/main" > .dits/HEAD

# Or point to a known good commit
echo "abc123def456..." > .dits/HEAD

# Verify
dits status
```

---

## File Operations

### "File too large to add"

**Cause**: By default, Dits handles any file size, but system limits may apply.

**Solution:**

```bash
# Check system limits
ulimit -f  # File size limit
ulimit -n  # Open files limit

# Increase limits temporarily
ulimit -f unlimited
ulimit -n 65536

# Or add in chunks with progress
dits add large-file.mp4 --progress
```

---

### "Add is very slow for first file"

**Cause**: First add must chunk and hash the entire file; this is expected.

**Solution:**

This is normal behavior. The first add:
- Parses the file format
- Creates content-defined chunks
- Computes BLAKE3 hashes
- Writes chunks to storage

Subsequent adds of similar files will be much faster due to deduplication.

```bash
# Monitor progress
dits add file.mp4 --progress --verbose
```

---

### "Cannot add file: permission denied"

**Cause**: File is locked by another process or insufficient permissions.

**Solution:**

```bash
# Check file permissions
ls -la problematic-file

# Check if file is in use
lsof | grep problematic-file

# Fix permissions
chmod 644 problematic-file

# If locked by another app, close that app first
```

---

### "Restore fails: file in use"

**Cause**: The file is open in another application.

**Solution:**

```bash
# Close the file in other applications
# Then retry
dits restore path/to/file

# Force restore (Unix)
dits restore --force path/to/file

# Check what's using the file
lsof | grep "path/to/file"
```

---

### "Binary file shows as 'modified' but hasn't changed"

**Cause**: File timestamp changed, or metadata was modified.

**Solution:**

```bash
# Check what changed
dits diff path/to/file

# If truly unchanged, refresh the index
dits update-index --refresh

# Or re-add the file
dits add path/to/file
```

---

## Networking & Sync

### "Push failed: connection refused"

**Cause**: Remote server is down or unreachable.

**Solution:**

```bash
# 1. Check remote URL
dits remote -v

# 2. Test connectivity
ping remote.server.com
curl -I https://remote.server.com

# 3. Check if you're behind a proxy
echo $HTTP_PROXY
echo $HTTPS_PROXY

# 4. Configure proxy if needed
dits config --global http.proxy http://proxy.company.com:8080
```

---

### "Push failed: authentication required"

**Cause**: Missing or invalid credentials.

**Solution:**

```bash
# Login
dits auth login

# Or use token
dits auth login --token YOUR_TOKEN

# Check auth status
dits auth status

# If using SSH, check keys
ssh-add -l
ssh -T dits@ditshub.com
```

---

### "Fetch timeout: operation timed out"

**Cause**: Slow network, large transfer, or server issues.

**Solution:**

```bash
# Increase timeout
dits config --global transfer.timeout 300  # 5 minutes

# Use fewer parallel connections on slow networks
dits config --global transfer.maxParallel 2

# Try fetching in smaller batches
dits fetch origin main  # Just one branch
```

---

### "Push rejected: remote has changes"

**Cause**: Remote has commits you don't have locally.

**Solution:**

```bash
# Pull first
dits pull

# Resolve any conflicts, then push
dits push

# If you're sure you want to overwrite (dangerous!)
dits push --force
```

---

### "SSL certificate problem"

**Cause**: SSL/TLS certificate verification failed.

**Solution:**

```bash
# Check system date/time
date

# If date is wrong, fix it
# Then retry

# If using self-signed certs (not recommended for production):
dits config --global http.sslVerify false

# Better: Add your CA certificate
dits config --global http.sslCAInfo /path/to/ca-bundle.crt
```

---

## P2P Sharing Issues

### "Cannot connect: peer not found"

**Cause**: Peer is offline, code expired, or network issue.

**Solution:**

```bash
# 1. Verify the peer is sharing
#    Ask them to confirm: dits p2p status

# 2. Check the join code is correct
#    Codes are case-sensitive

# 3. Test connectivity
dits p2p ping ABC-123

# 4. Check firewall settings
#    UDP port 4433 should be open

# 5. Try with longer timeout
dits p2p connect ABC-123 ./project --timeout 120
```

---

### "P2P connection unstable / keeps disconnecting"

**Cause**: Network instability, NAT issues, or firewall interference.

**Solution:**

```bash
# Check connection stats
dits p2p status

# Use a different port
dits p2p share --port 8443

# Enable verbose logging
DITS_DEBUG=1 dits p2p connect ABC-123 ./project

# If behind corporate firewall, may need TURN server
# Contact your IT department about UDP access
```

---

### "P2P transfer very slow"

**Cause**: Limited bandwidth, routing through relay, or peer's upload speed.

**Solution:**

```bash
# Check if using direct connection or relay
dits p2p status --verbose

# If going through relay, both parties should try:
# 1. Connect to same network (LAN is fastest)
# 2. Check uplink bandwidth
# 3. Use wired connection instead of WiFi

# Check peer's upload speed
dits p2p ping ABC-123 --count 10
```

---

### "Join code invalid or expired"

**Cause**: Code entered incorrectly or share was stopped.

**Solution:**

```bash
# Verify code format (usually ABC-123 pattern)
# Ask peer to regenerate code

# On sharing side:
dits p2p share  # Generates new code

# With explicit expiration:
dits p2p share --expires 24h
```

---

## Virtual Filesystem (VFS)

### "Mount failed: FUSE not available"

**Cause**: FUSE driver not installed or not loaded.

**Solution:**

```bash
# macOS
brew install macfuse
# Then restart and approve in System Preferences

# Linux
sudo apt install fuse3  # or fuse on older systems
sudo modprobe fuse

# Check FUSE is working
ls /dev/fuse
```

---

### "Mount failed: directory not empty"

**Cause**: Trying to mount to a non-empty directory.

**Solution:**

```bash
# Create a new empty directory
mkdir /Volumes/my-mount
dits mount /Volumes/my-mount

# Or unmount existing mount
dits unmount /Volumes/existing-mount
```

---

### "Mount point busy / cannot unmount"

**Cause**: Files in the mount are being accessed.

**Solution:**

```bash
# Find what's using the mount
lsof +D /Volumes/my-mount

# Close those applications, then:
dits unmount /Volumes/my-mount

# Force unmount if necessary
dits unmount --force /Volumes/my-mount

# macOS alternative
diskutil unmount force /Volumes/my-mount
```

---

### "Files not appearing in mount"

**Cause**: VFS hasn't loaded the file index, or filter is applied.

**Solution:**

```bash
# Verify mount status
dits mount --status

# Check if specific commit is mounted
dits mount /Volumes/project --commit HEAD

# Ensure index is up to date
dits status
```

---

### "VFS read performance is slow"

**Cause**: Files being fetched on-demand from remote.

**Solution:**

```bash
# Pre-cache files you'll need
dits fetch --blob path/to/needed/files/

# Increase cache size
dits config cache.size 50GB

# Mount with prefetch
dits mount /Volumes/project --prefetch

# Use local cache path on SSD
dits config cache.path /Volumes/FastSSD/dits-cache
```

---

## Performance Issues

### "Operations are slow on large repository"

**Cause**: Index scanning takes time on large repos.

**Solution:**

```bash
# Enable filesystem monitor (automatic updates)
dits config core.fsmonitor true

# Use sparse checkout for large repos
dits sparse-checkout set path/to/needed/files/

# Increase cache
dits config cache.size 100GB
```

---

### "High CPU usage during add"

**Cause**: Hashing and chunking are CPU-intensive operations.

**Solution:**

This is normal for initial adds. To reduce impact:

```bash
# Limit parallel operations
dits config core.parallelChunking 2

# Add files in smaller batches
dits add folder1/
dits commit -m "Add folder1"
dits add folder2/
dits commit -m "Add folder2"
```

---

### "High memory usage"

**Cause**: Large file processing or cache.

**Solution:**

```bash
# Limit chunk buffer
dits config core.chunkBufferSize 256MB

# Process large files one at a time
dits add large-file-1.mp4
dits commit -m "Add file 1"
dits add large-file-2.mp4
dits commit -m "Add file 2"

# Clear cache
dits cache clear
```

---

### "Clone/pull downloads too much data"

**Cause**: Fetching entire repository when only subset needed.

**Solution:**

```bash
# Partial clone (metadata only)
dits clone --filter blob:none <url>

# Shallow clone
dits clone --depth 1 <url>

# Sparse checkout
dits sparse-checkout set needed/directory/

# Fetch only specific paths
dits fetch origin -- path/to/needed/files/
```

---

## Storage Issues

### "Disk space running low"

**Cause**: Repository or cache consuming too much space.

**Solution:**

```bash
# Check repository stats
dits repo-stats

# Run garbage collection
dits gc --aggressive

# Clear cache
dits cache clear

# Check what's taking space
dits repo-stats -v | sort -k2 -h

# Freeze old content to cold storage
dits freeze old-content/ --tier archive
```

---

### "Cannot write to repository: disk full"

**Cause**: No space left on device.

**Solution:**

```bash
# Check disk space
df -h

# Clear dits cache (safe)
dits cache clear

# Run garbage collection
dits gc

# Move repository to larger disk
mv .dits /Volumes/LargerDisk/.dits
ln -s /Volumes/LargerDisk/.dits .dits
```

---

### "Deduplication not working as expected"

**Cause**: Files may not be similar enough, or using fixed chunking.

**Solution:**

```bash
# Check deduplication stats
dits repo-stats

# Inspect specific file
dits inspect-file path/to/file

# Verify chunking settings
dits config --list | grep chunk

# For video files, ensure video-aware chunking is enabled
dits config core.videoAware true
```

---

## Authentication Issues

### "Authentication failed"

**Cause**: Invalid or expired credentials.

**Solution:**

```bash
# Re-login
dits auth logout
dits auth login

# Check token status
dits auth status

# Generate new token
dits auth token --create
```

---

### "Access denied to repository"

**Cause**: Insufficient permissions for the repository.

**Solution:**

```bash
# Check your access level
dits auth status

# Contact repository owner for access

# Verify remote URL is correct
dits remote -v

# Try cloning with explicit credentials
dits clone https://user:token@ditshub.com/org/repo
```

---

### "SSH key not accepted"

**Cause**: SSH key not added or wrong key being used.

**Solution:**

```bash
# Check loaded keys
ssh-add -l

# Add your key
ssh-add ~/.ssh/id_ed25519

# Test connection
ssh -T dits@ditshub.com

# Check SSH config
cat ~/.ssh/config
```

---

## Merge & Conflict Issues

### "Merge conflict in binary file"

**Cause**: Both parties modified the same binary file.

**Solution:**

```bash
# See conflict status
dits status

# For binary files, choose one version:

# Keep your version
dits restore --ours path/to/file

# Or take their version
dits restore --theirs path/to/file

# Then complete merge
dits add path/to/file
dits commit -m "Resolve merge conflict"
```

---

### "Cannot merge: local changes would be overwritten"

**Cause**: Uncommitted changes conflict with incoming changes.

**Solution:**

```bash
# Option 1: Commit your changes first
dits add .
dits commit -m "Save my changes"
dits merge other-branch

# Option 2: Stash your changes
dits stash
dits merge other-branch
dits stash pop

# Option 3: Discard your changes (if not needed)
dits restore .
dits merge other-branch
```

---

### "File is locked by another user"

**Cause**: Someone else has locked the file for editing.

**Solution:**

```bash
# See who has the lock
dits locks path/to/file

# Contact the lock owner

# If lock is stale (user left), admin can force unlock:
dits unlock --force path/to/file
```

---

## Platform-Specific Issues

### macOS: "Operation not permitted" errors

**Cause**: macOS security restrictions.

**Solution:**

```bash
# Grant Terminal/IDE Full Disk Access:
# System Preferences → Security & Privacy → Privacy → Full Disk Access
# Add Terminal.app, VS Code, or your IDE

# For FUSE issues, approve macFUSE:
# System Preferences → Security & Privacy → Allow
```

---

### Windows: "Access is denied"

**Cause**: Administrator privileges required or file in use.

**Solution:**

```powershell
# Run as Administrator
# Right-click PowerShell → Run as Administrator

# Check if file is locked
handle.exe path\to\file

# Close the application using the file
# Then retry
```

---

### Linux: "FUSE: permission denied"

**Cause**: User not in fuse group.

**Solution:**

```bash
# Add user to fuse group
sudo usermod -aG fuse $USER

# Logout and login again
# Or reload groups
newgrp fuse

# Check permissions
ls -la /dev/fuse
```

---

### Windows: Long path issues

**Cause**: Windows has 260 character path limit by default.

**Solution:**

```powershell
# Enable long paths (requires admin and Windows 10 1607+)
# Run in PowerShell as Administrator:
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

# Or configure Git:
git config --system core.longpaths true
```

---

## Still Having Issues?

If your issue isn't covered here:

1. **Search existing issues**: [github.com/dits-io/dits/issues](https://github.com/dits-io/dits/issues)
2. **Check Discord**: [discord.gg/dits](https://discord.gg/dits)
3. **Run diagnostics**: `dits doctor` (outputs diagnostic information)
4. **Collect logs**: `DITS_DEBUG=1 dits [command] 2>&1 | tee dits-debug.log`
5. **Open an issue**: Include the diagnostic output and debug logs

When reporting issues, please include:
- Operating system and version
- Dits version (`dits --version`)
- Output of `dits doctor`
- Steps to reproduce the issue
- Any error messages (full text)
