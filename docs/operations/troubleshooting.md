# Troubleshooting Guide

Common issues, diagnostics, and solutions for Dits.

---

## Overview

This guide covers common problems encountered when using Dits and how to resolve them. Issues are organized by category for quick reference.

---

## Quick Diagnostics

### Health Check Commands

```bash
# Check CLI version and connection
dits --version
dits status

# Check server health
curl -s https://api.dits.io/health | jq

# Check detailed diagnostics
dits doctor

# Verify authentication
dits whoami
```

### Common First Steps

1. **Update to latest version**: `dits update`
2. **Check network connectivity**: `ping api.dits.io`
3. **Verify credentials**: `dits login`
4. **Clear local cache**: `dits cache clear`

---

## Authentication Issues

### "Authentication failed" or "Invalid credentials"

**Symptoms:**
- Cannot push or pull
- `dits login` fails
- Token expired messages

**Solutions:**

```bash
# Re-authenticate
dits logout
dits login

# Check token status
dits auth status

# Use environment variable
export DITS_TOKEN="your-token-here"

# Verify token works
dits whoami
```

### "SSO authentication failed"

**Symptoms:**
- Browser redirect fails
- SAML/OIDC errors
- Callback URL mismatch

**Solutions:**

```bash
# Try alternative auth flow
dits login --device-code

# Check SSO configuration
dits auth sso-status

# Use personal access token instead
dits login --token
```

### "Permission denied"

**Symptoms:**
- Cannot access repository
- Cannot push to branch
- Cannot create/delete resources

**Solutions:**

```bash
# Check your permissions
dits repo permissions owner/repo

# Request access from admin
# Or check if branch is protected
dits branch list --protected
```

---

## Push/Pull Issues

### "Failed to push: conflict"

**Symptoms:**
- Push rejected
- Conflict detected
- Out of sync with remote

**Solutions:**

```bash
# Pull latest changes first
dits pull

# If conflicts exist, resolve them
dits status
# Edit conflicted files
dits resolve path/to/file.mov

# Retry push
dits push
```

### "Push failed: file too large"

**Symptoms:**
- Upload fails for large files
- Timeout during upload
- Memory errors

**Solutions:**

```bash
# Check file size
ls -lh path/to/file.mov

# Increase timeout
dits push --timeout 30m

# Use chunked upload (default, but can force)
dits push --chunked

# For very large files (> 100GB), use direct upload
dits push --direct-upload
```

### "Pull failed: disk space"

**Symptoms:**
- Pull fails partway
- "No space left on device"
- Incomplete files

**Solutions:**

```bash
# Check disk space
df -h

# Clear cache
dits cache clear

# Pull specific files only
dits pull path/to/needed/file.mov

# Use sparse checkout
dits config set checkout.sparse true
dits sparse add "*.prproj"
dits pull
```

### "Slow transfer speeds"

**Symptoms:**
- Uploads/downloads taking too long
- Speeds below expected
- Throttling suspected

**Solutions:**

```bash
# Check current speed
dits push --progress

# Increase concurrent connections
dits config set transfer.connections 8

# Check for bandwidth limits
dits quota show

# Use nearest region
dits config set remote.region us-west-2

# Verify network speed
dits benchmark network
```

---

## Repository Issues

### "Repository not found"

**Symptoms:**
- Cannot access repo
- 404 errors
- Clone fails

**Solutions:**

```bash
# Verify repository exists
dits repo list

# Check repository URL
dits remote -v

# Verify permissions
dits repo permissions owner/repo

# Check for typos in path
dits repo info owner/repo
```

### "Repository corrupted"

**Symptoms:**
- Integrity errors
- Missing chunks
- Checksum mismatches

**Solutions:**

```bash
# Run integrity check
dits fsck

# Repair corrupted data
dits fsck --repair

# Re-clone if needed
mv repo repo.backup
dits clone owner/repo repo

# Report persistent issues
dits fsck --report > fsck-report.txt
```

### "Cannot initialize repository"

**Symptoms:**
- `dits init` fails
- Permission errors
- Existing repo detected

**Solutions:**

```bash
# Check for existing .dits directory
ls -la .dits

# Force re-initialization
dits init --force

# Verify directory permissions
ls -la .
chmod 755 .

# Check for disk space
df -h .
```

---

## Chunking Issues

### "Chunking failed for file"

**Symptoms:**
- File cannot be processed
- Parser errors
- Invalid format messages

**Solutions:**

```bash
# Check file integrity
ffprobe path/to/file.mov

# Try with generic chunking
dits add --chunker generic path/to/file.mov

# Check supported formats
dits formats list

# Report unsupported format
dits formats report path/to/file.mov
```

### "Keyframe alignment failed"

**Symptoms:**
- Video chunking suboptimal
- GOP detection errors
- Large chunk deltas on small changes

**Solutions:**

```bash
# Force keyframe re-detection
dits add --reparse path/to/video.mov

# Use fallback chunking
dits config set chunking.fallback generic

# Check video codec
ffprobe -show_streams path/to/video.mov | grep codec

# For problematic codecs, use fixed chunking
dits add --chunk-size 64KB path/to/video.mov
```

---

## Lock Issues

### "File is locked by another user"

**Symptoms:**
- Cannot edit file
- Push rejected
- Lock conflict

**Solutions:**

```bash
# Check who holds the lock
dits lock list

# Request lock release
dits lock request-release path/to/file.mov

# Force unlock (admin only)
dits lock break path/to/file.mov --force

# Wait for lock expiration
dits lock info path/to/file.mov
```

### "Lock expired unexpectedly"

**Symptoms:**
- Lost lock while editing
- Someone else took the lock
- Work potentially lost

**Solutions:**

```bash
# Check lock duration setting
dits config get lock.duration

# Extend lock before expiration
dits lock extend path/to/file.mov --duration 4h

# Enable lock auto-renewal
dits config set lock.auto-renew true

# Set longer default duration
dits config set lock.duration 8h
```

---

## Storage Issues

### "Storage quota exceeded"

**Symptoms:**
- Cannot push new files
- Quota warning messages
- Billing alerts

**Solutions:**

```bash
# Check current usage
dits storage usage

# Find large files
dits storage analyze

# Remove old versions
dits gc --prune-old

# Request quota increase
dits quota request-increase --amount 100GB
```

### "Cache corrupted"

**Symptoms:**
- Hash mismatches
- Repeated downloads
- Integrity errors

**Solutions:**

```bash
# Clear local cache
dits cache clear

# Rebuild cache from remote
dits cache rebuild

# Verify cache integrity
dits cache verify

# Reset cache settings
dits config reset cache
```

---

## Network Issues

### "Connection timeout"

**Symptoms:**
- Operations hang
- Timeout errors
- Intermittent failures

**Solutions:**

```bash
# Test connectivity
dits network test

# Increase timeout
dits config set network.timeout 120s

# Try different endpoint
dits config set remote.endpoint https://api-west.dits.io

# Check proxy settings
dits config get network.proxy
```

### "SSL certificate error"

**Symptoms:**
- Certificate verification failed
- TLS handshake errors
- Self-signed cert issues

**Solutions:**

```bash
# For self-hosted with custom CA
dits config set network.ca-cert /path/to/ca.pem

# Skip verification (not recommended for production)
dits config set network.verify-ssl false

# Update system CA certificates
# macOS: security add-trusted-cert -d -r trustRoot /path/to/cert.pem
# Linux: update-ca-certificates
```

### "Proxy issues"

**Symptoms:**
- Cannot connect through proxy
- Authentication failures
- Connection refused

**Solutions:**

```bash
# Set proxy explicitly
dits config set network.proxy http://proxy.corp:8080

# With authentication
dits config set network.proxy http://user:pass@proxy.corp:8080

# Set no-proxy for local
dits config set network.no-proxy "localhost,127.0.0.1,.corp.local"

# Use environment variables
export HTTP_PROXY=http://proxy.corp:8080
export HTTPS_PROXY=http://proxy.corp:8080
```

---

## NLE Plugin Issues

### Premiere Pro Plugin

**"Plugin not loading"**

```bash
# Check installation
ls -la "/Library/Application Support/Adobe/CEP/extensions/com.dits.premiere"

# Enable debug mode
defaults write com.adobe.CSXS.9 PlayerDebugMode 1

# Check logs
tail -f ~/Library/Logs/CSXS/CEPHtmlEngine*.log

# Reinstall plugin
dits plugin install premiere --force
```

**"Cannot sync project"**

```bash
# Verify project path
dits repo status

# Check file associations
dits premiere scan-project /path/to/project.prproj

# Reset plugin state
rm ~/Library/Application\ Support/Adobe/Premiere\ Pro/*/dits-cache/*
```

### DaVinci Resolve Plugin

**"Script not found"**

```bash
# Check script location
ls -la "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Comp/Dits"

# Verify Python environment
python3 -c "import dits; print(dits.__version__)"

# Reinstall
dits plugin install resolve --force
```

---

## Server-Side Issues (Self-Hosted)

### Database Connection Issues

```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
curl localhost:8080/debug/pool

# Reset stuck connections
dits-admin db reset-connections

# Check for locks
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted"
```

### Storage Backend Issues

```bash
# Test S3 connectivity
aws s3 ls s3://$S3_BUCKET --endpoint-url $S3_ENDPOINT

# Check IAM permissions
aws sts get-caller-identity

# Verify bucket policy
aws s3api get-bucket-policy --bucket $S3_BUCKET

# Test presigned URL generation
dits-admin storage test-presign
```

### Memory Issues

```bash
# Check memory usage
docker stats dits-server

# Reduce cache size
# In config.toml:
# l1_size = "512MB"

# Force garbage collection
dits-admin gc run --aggressive

# Check for memory leaks
curl localhost:8080/debug/memory
```

### High CPU Usage

```bash
# Check for expensive queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active'"

# Check worker threads
curl localhost:8080/debug/threads

# Enable query logging
# In postgresql.conf:
# log_min_duration_statement = 1000
```

---

## Diagnostic Commands

### Full System Diagnostic

```bash
# Run comprehensive diagnostic
dits doctor --full

# Output includes:
# - Version information
# - Network connectivity
# - Authentication status
# - Repository health
# - Cache status
# - Plugin status
```

### Debug Logging

```bash
# Enable debug output
export DITS_LOG=debug
dits push

# Write to file
DITS_LOG=debug dits push 2>&1 | tee debug.log

# Trace-level logging
DITS_LOG=trace dits push
```

### Generate Support Bundle

```bash
# Create diagnostic bundle (redacts sensitive info)
dits support-bundle

# Creates: dits-support-YYYYMMDD-HHMMSS.zip
# Contains:
# - Config (redacted)
# - Logs
# - System info
# - Network diagnostics
```

---

## Performance Issues

### Slow Operations

```bash
# Profile specific operation
dits push --profile

# Benchmark storage
dits benchmark storage

# Benchmark network
dits benchmark network

# Check for throttling
dits quota show --verbose
```

### High Memory Usage

```bash
# Limit memory usage
dits config set memory.limit 2GB

# Reduce concurrent operations
dits config set transfer.connections 2

# Disable memory cache
dits config set cache.l1-enabled false
```

---

## Getting Help

### Community Resources

- **Documentation**: docs.dits.io
- **GitHub Issues**: github.com/dits-io/dits/issues
- **Discussions**: github.com/dits-io/dits/discussions
- **Discord**: discord.gg/dits

### Reporting Bugs

```bash
# Search existing issues first
dits issues search "my error message"

# Create issue with diagnostics
dits bug-report
# Opens browser with pre-filled template

# Include:
# 1. Steps to reproduce
# 2. Expected behavior
# 3. Actual behavior
# 4. Output of: dits doctor --full
# 5. Relevant logs
```

### Enterprise Support

- Email: support@dits.io
- Emergency: +1 (888) DITS-911
- SLA response times apply

---

## Quick Reference

### Common Error Codes

| Code | Meaning | Common Solution |
|------|---------|-----------------|
| E001 | Authentication failed | Re-login |
| E002 | Permission denied | Check access |
| E003 | Repository not found | Verify URL |
| E004 | Conflict detected | Pull first |
| E005 | Quota exceeded | Upgrade or cleanup |
| E006 | Network timeout | Check connectivity |
| E007 | File locked | Wait or request unlock |
| E008 | Checksum mismatch | Clear cache, retry |
| E009 | Invalid format | Check file type |
| E010 | Server error | Contact support |

### Useful Config Settings

```bash
# Increase timeouts
dits config set network.timeout 120s
dits config set transfer.timeout 30m

# Reduce memory usage
dits config set cache.l1-size 256MB
dits config set transfer.connections 2

# Enable debugging
dits config set log.level debug

# Improve performance
dits config set transfer.connections 8
dits config set cache.l1-size 2GB
```

---

## Notes

- Always update to latest version before troubleshooting
- Clear cache when in doubt
- Check network connectivity for remote operations
- Enable debug logging for detailed diagnostics
- Include `dits doctor` output in support requests
