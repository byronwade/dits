# Error Code Reference

Complete catalog of error codes, causes, and resolution steps.

---

## Overview

Dits uses structured error codes across all APIs and clients. Every error includes:

- **Code**: Machine-readable identifier (e.g., `E1001`)
- **Message**: Human-readable description
- **Details**: Additional context (optional)
- **Documentation URL**: Link to troubleshooting

---

## Error Response Format

```json
{
  "error": {
    "code": "E1001",
    "message": "Authentication required",
    "details": {
      "realm": "api.dits.io",
      "schemes": ["Bearer"]
    },
    "doc_url": "https://docs.dits.io/errors/E1001",
    "request_id": "req_abc123xyz"
  }
}
```

---

## Error Code Ranges

| Range | Category |
|-------|----------|
| E1xxx | Authentication & Authorization |
| E2xxx | Repository Operations |
| E3xxx | File & Chunk Operations |
| E4xxx | Branch & Tag Operations |
| E5xxx | Lock Operations |
| E6xxx | Transfer Operations |
| E7xxx | Storage Operations |
| E8xxx | Network & Protocol |
| E9xxx | Server & System |

---

## Authentication & Authorization (E1xxx)

### E1001 - Authentication Required

**HTTP Status**: 401

**Cause**: Request missing authentication credentials.

**Resolution**:
```bash
# Login to get credentials
dits login

# Or set token
export DITS_TOKEN="your-token"
```

---

### E1002 - Invalid Credentials

**HTTP Status**: 401

**Cause**: Token expired, revoked, or malformed.

**Resolution**:
```bash
# Re-authenticate
dits logout
dits login

# Check token status
dits auth status
```

---

### E1003 - Token Expired

**HTTP Status**: 401

**Cause**: Access token has expired.

**Resolution**:
```bash
# Refresh token
dits auth refresh

# Or re-login
dits login
```

---

### E1004 - Insufficient Permissions

**HTTP Status**: 403

**Cause**: User lacks required permissions for the operation.

**Details**:
```json
{
  "required_permission": "repo:write",
  "user_permissions": ["repo:read"]
}
```

**Resolution**:
- Request elevated permissions from repository admin
- Check if operating on correct repository

---

### E1005 - SSO Required

**HTTP Status**: 403

**Cause**: Organization requires SSO authentication.

**Resolution**:
```bash
dits login --sso
```

---

### E1006 - MFA Required

**HTTP Status**: 403

**Cause**: Multi-factor authentication required but not provided.

**Resolution**:
```bash
dits login --mfa
```

---

### E1007 - Account Suspended

**HTTP Status**: 403

**Cause**: User account has been suspended.

**Resolution**: Contact support@dits.io

---

### E1008 - IP Not Allowed

**HTTP Status**: 403

**Cause**: Request from IP not in organization's allowlist.

**Resolution**: Contact organization admin to add IP to allowlist.

---

### E1009 - API Key Invalid

**HTTP Status**: 401

**Cause**: API key doesn't exist or has been revoked.

**Resolution**:
```bash
# Generate new API key
dits auth api-key create --name "new-key"
```

---

### E1010 - OAuth Error

**HTTP Status**: 401

**Cause**: OAuth flow failed (invalid state, expired code, etc.)

**Resolution**: Retry the OAuth flow from the beginning.

---

## Repository Operations (E2xxx)

### E2001 - Repository Not Found

**HTTP Status**: 404

**Cause**: Repository doesn't exist or user lacks access.

**Resolution**:
```bash
# Verify repository exists
dits repo list

# Check for typos in name
dits repo info owner/repo
```

---

### E2002 - Repository Already Exists

**HTTP Status**: 409

**Cause**: Attempting to create repository with existing name.

**Resolution**: Choose a different repository name.

---

### E2003 - Repository Archived

**HTTP Status**: 403

**Cause**: Cannot modify an archived repository.

**Resolution**:
```bash
# Unarchive first (requires admin)
dits repo unarchive owner/repo
```

---

### E2004 - Repository Quota Exceeded

**HTTP Status**: 403

**Cause**: Maximum number of repositories reached.

**Details**:
```json
{
  "current": 10,
  "limit": 10,
  "tier": "pro"
}
```

**Resolution**: Upgrade plan or delete unused repositories.

---

### E2005 - Invalid Repository Name

**HTTP Status**: 400

**Cause**: Repository name contains invalid characters.

**Resolution**: Use only alphanumeric characters, hyphens, and underscores.

---

### E2006 - Repository Corrupted

**HTTP Status**: 500

**Cause**: Repository data integrity check failed.

**Resolution**:
```bash
# Run integrity check
dits fsck --repair

# Contact support if persists
```

---

### E2007 - Clone Failed

**HTTP Status**: 500

**Cause**: Unable to complete clone operation.

**Resolution**:
```bash
# Retry with verbose output
dits clone owner/repo --verbose

# Check network connectivity
dits network test
```

---

### E2008 - Repository Too Large

**HTTP Status**: 413

**Cause**: Repository exceeds size limits for operation.

**Resolution**: Use sparse checkout or contact support for large repository handling.

---

## File & Chunk Operations (E3xxx)

### E3001 - File Not Found

**HTTP Status**: 404

**Cause**: Requested file doesn't exist in the specified commit.

**Resolution**:
```bash
# List files in commit
dits ls-files --commit abc123

# Check file path
dits log --follow path/to/file
```

---

### E3002 - Chunk Not Found

**HTTP Status**: 404

**Cause**: Referenced chunk doesn't exist in storage.

**Resolution**:
```bash
# Verify repository integrity
dits fsck

# Re-push if chunks missing
dits push --force
```

---

### E3003 - Checksum Mismatch

**HTTP Status**: 422

**Cause**: Uploaded data doesn't match expected hash.

**Details**:
```json
{
  "expected": "abc123...",
  "received": "def456..."
}
```

**Resolution**:
```bash
# Clear cache and retry
dits cache clear
dits push
```

---

### E3004 - File Too Large

**HTTP Status**: 413

**Cause**: File exceeds maximum size limit.

**Details**:
```json
{
  "file": "video.mov",
  "size": 107374182400,
  "limit": 53687091200
}
```

**Resolution**: Contact support for large file handling or split the file.

---

### E3005 - Unsupported Format

**HTTP Status**: 415

**Cause**: File format not supported for optimized chunking.

**Resolution**:
```bash
# Use generic chunking
dits add --chunker generic path/to/file
```

---

### E3006 - Chunking Failed

**HTTP Status**: 500

**Cause**: Error during file chunking process.

**Resolution**:
```bash
# Check file integrity
ffprobe path/to/file.mov

# Try with different chunk settings
dits add --chunk-size 32KB path/to/file
```

---

### E3007 - Decompression Failed

**HTTP Status**: 500

**Cause**: Unable to decompress chunk data.

**Resolution**:
```bash
# Clear cache
dits cache clear

# Re-pull
dits pull --force
```

---

### E3008 - Encryption Failed

**HTTP Status**: 500

**Cause**: Chunk encryption/decryption failed.

**Resolution**: Verify encryption keys are available and valid.

---

## Branch & Tag Operations (E4xxx)

### E4001 - Branch Not Found

**HTTP Status**: 404

**Cause**: Specified branch doesn't exist.

**Resolution**:
```bash
# List branches
dits branch list

# Create branch if needed
dits branch create branch-name
```

---

### E4002 - Branch Already Exists

**HTTP Status**: 409

**Cause**: Attempting to create existing branch.

**Resolution**: Choose a different branch name or delete existing branch.

---

### E4003 - Branch Protected

**HTTP Status**: 403

**Cause**: Cannot modify protected branch directly.

**Resolution**: Create a pull request or request admin override.

---

### E4004 - Non-Fast-Forward

**HTTP Status**: 409

**Cause**: Push rejected because it would overwrite history.

**Details**:
```json
{
  "local_commit": "abc123",
  "remote_commit": "def456",
  "diverged_at": "xyz789"
}
```

**Resolution**:
```bash
# Pull and merge first
dits pull
dits push

# Or force push (destructive)
dits push --force
```

---

### E4005 - Tag Not Found

**HTTP Status**: 404

**Cause**: Specified tag doesn't exist.

**Resolution**:
```bash
# List tags
dits tag list
```

---

### E4006 - Tag Already Exists

**HTTP Status**: 409

**Cause**: Tag with this name already exists.

**Resolution**:
```bash
# Delete and recreate
dits tag delete v1.0.0
dits tag create v1.0.0

# Or use force
dits tag create v1.0.0 --force
```

---

### E4007 - Invalid Reference

**HTTP Status**: 400

**Cause**: Reference name is invalid or malformed.

**Resolution**: Use valid reference format (e.g., `refs/heads/main`).

---

### E4008 - Merge Conflict

**HTTP Status**: 409

**Cause**: Automatic merge failed due to conflicts.

**Details**:
```json
{
  "conflicting_files": [
    "project.prproj",
    "timeline.xml"
  ]
}
```

**Resolution**:
```bash
# View conflicts
dits status

# Resolve manually
dits resolve path/to/file

# Complete merge
dits merge --continue
```

---

## Lock Operations (E5xxx)

### E5001 - File Already Locked

**HTTP Status**: 409

**Cause**: File is locked by another user.

**Details**:
```json
{
  "path": "project.prproj",
  "locked_by": {
    "name": "johndoe",
    "email": "john@example.com"
  },
  "locked_at": "2025-01-08T12:00:00Z",
  "expires_at": "2025-01-08T20:00:00Z"
}
```

**Resolution**:
```bash
# Request unlock
dits lock request-release path/to/file

# Wait for expiration
dits lock info path/to/file
```

---

### E5002 - Lock Not Found

**HTTP Status**: 404

**Cause**: No lock exists for the specified file.

**Resolution**: The file is not locked and can be modified freely.

---

### E5003 - Lock Expired

**HTTP Status**: 410

**Cause**: Lock has expired and was released.

**Resolution**:
```bash
# Re-acquire lock
dits lock path/to/file
```

---

### E5004 - Not Lock Owner

**HTTP Status**: 403

**Cause**: Cannot release lock owned by another user.

**Resolution**: Contact lock owner or request admin intervention.

---

### E5005 - Lock Required

**HTTP Status**: 409

**Cause**: File requires lock before modification.

**Resolution**:
```bash
# Acquire lock first
dits lock path/to/file
```

---

### E5006 - Lock Limit Exceeded

**HTTP Status**: 429

**Cause**: Maximum concurrent locks reached.

**Details**:
```json
{
  "current_locks": 10,
  "limit": 10
}
```

**Resolution**: Release unused locks before acquiring new ones.

---

## Transfer Operations (E6xxx)

### E6001 - Upload Failed

**HTTP Status**: 500

**Cause**: Chunk upload failed.

**Resolution**:
```bash
# Retry upload
dits push --resume

# Check network
dits network test
```

---

### E6002 - Download Failed

**HTTP Status**: 500

**Cause**: Chunk download failed.

**Resolution**:
```bash
# Retry download
dits pull --resume

# Clear cache and retry
dits cache clear
dits pull
```

---

### E6003 - Transfer Timeout

**HTTP Status**: 504

**Cause**: Transfer operation timed out.

**Resolution**:
```bash
# Increase timeout
dits config set transfer.timeout 30m

# Reduce concurrent connections
dits config set transfer.connections 2
```

---

### E6004 - Transfer Interrupted

**HTTP Status**: 500

**Cause**: Network connection interrupted during transfer.

**Resolution**:
```bash
# Resume transfer
dits push --resume
# or
dits pull --resume
```

---

### E6005 - Bandwidth Limit

**HTTP Status**: 429

**Cause**: Transfer bandwidth quota exceeded.

**Details**:
```json
{
  "used": 107374182400,
  "limit": 107374182400,
  "reset_at": "2025-01-09T00:00:00Z"
}
```

**Resolution**: Wait for quota reset or upgrade plan.

---

### E6006 - Presigned URL Expired

**HTTP Status**: 403

**Cause**: Upload/download URL has expired.

**Resolution**: Retry the operation to get a new presigned URL.

---

## Storage Operations (E7xxx)

### E7001 - Storage Quota Exceeded

**HTTP Status**: 403

**Cause**: Storage limit reached.

**Details**:
```json
{
  "used_bytes": 107374182400,
  "limit_bytes": 107374182400,
  "tier": "pro"
}
```

**Resolution**:
```bash
# Check usage
dits storage usage

# Clean up old versions
dits gc --prune-old

# Upgrade plan
```

---

### E7002 - Storage Unavailable

**HTTP Status**: 503

**Cause**: Backend storage temporarily unavailable.

**Resolution**: Retry after a few minutes. Check status.dits.io for outages.

---

### E7003 - Region Unavailable

**HTTP Status**: 503

**Cause**: Specified storage region is unavailable.

**Resolution**: Use a different region or wait for recovery.

---

### E7004 - Glacier Retrieval Required

**HTTP Status**: 409

**Cause**: Data is in cold storage and requires retrieval.

**Details**:
```json
{
  "storage_class": "glacier",
  "retrieval_time": "3-5 hours"
}
```

**Resolution**:
```bash
# Initiate retrieval
dits storage restore path/to/file

# Check status
dits storage restore-status path/to/file
```

---

## Network & Protocol (E8xxx)

### E8001 - Connection Failed

**HTTP Status**: N/A (client-side)

**Cause**: Unable to connect to server.

**Resolution**:
```bash
# Check connectivity
dits network test

# Verify endpoint
dits config get remote.origin.url
```

---

### E8002 - SSL/TLS Error

**HTTP Status**: N/A (client-side)

**Cause**: TLS handshake failed.

**Resolution**:
```bash
# Update CA certificates
# macOS: security add-trusted-cert

# Check for proxy issues
dits config get network.proxy
```

---

### E8003 - Protocol Version Mismatch

**HTTP Status**: 426

**Cause**: Client protocol version incompatible with server.

**Resolution**:
```bash
# Update client
dits update
```

---

### E8004 - Invalid Request

**HTTP Status**: 400

**Cause**: Malformed request.

**Resolution**: Check request format and parameters.

---

### E8005 - Request Too Large

**HTTP Status**: 413

**Cause**: Request body exceeds limit.

**Resolution**: Reduce request size or use chunked upload.

---

### E8006 - DNS Resolution Failed

**HTTP Status**: N/A (client-side)

**Cause**: Cannot resolve server hostname.

**Resolution**:
```bash
# Check DNS
nslookup api.dits.io

# Try direct IP (if known)
```

---

## Server & System (E9xxx)

### E9001 - Internal Server Error

**HTTP Status**: 500

**Cause**: Unexpected server error.

**Resolution**: Retry the request. If persistent, report with request_id.

---

### E9002 - Service Unavailable

**HTTP Status**: 503

**Cause**: Server temporarily unavailable.

**Resolution**: Check status.dits.io and retry later.

---

### E9003 - Rate Limited

**HTTP Status**: 429

**Cause**: Too many requests.

**Details**:
```json
{
  "limit": 600,
  "remaining": 0,
  "reset_at": "2025-01-08T12:01:00Z"
}
```

**Resolution**: Wait for rate limit reset. Implement backoff in automation.

---

### E9004 - Maintenance Mode

**HTTP Status**: 503

**Cause**: Server undergoing maintenance.

**Resolution**: Check status.dits.io for maintenance window.

---

### E9005 - Database Error

**HTTP Status**: 500

**Cause**: Database operation failed.

**Resolution**: Retry request. Report if persistent.

---

### E9006 - Queue Full

**HTTP Status**: 503

**Cause**: Processing queue at capacity.

**Resolution**: Retry after delay with exponential backoff.

---

### E9007 - Feature Disabled

**HTTP Status**: 403

**Cause**: Requested feature not available for tier/region.

**Resolution**: Upgrade plan or contact support.

---

### E9008 - Deprecated API

**HTTP Status**: 410

**Cause**: API endpoint has been deprecated.

**Resolution**: Update to use current API version.

---

## Client Error Handling

### Retry Strategy

```rust
pub struct RetryConfig {
    /// Maximum retry attempts
    pub max_retries: u32,

    /// Initial delay
    pub initial_delay: Duration,

    /// Maximum delay
    pub max_delay: Duration,

    /// Backoff multiplier
    pub multiplier: f64,

    /// Retryable error codes
    pub retryable: HashSet<&'static str>,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_delay: Duration::from_secs(1),
            max_delay: Duration::from_secs(60),
            multiplier: 2.0,
            retryable: hashset![
                "E6001", "E6002", "E6003", "E6004",  // Transfer errors
                "E7002", "E7003",                    // Storage errors
                "E8001",                             // Connection errors
                "E9001", "E9002", "E9006",           // Server errors
            ],
        }
    }
}
```

### Error Logging

Always include:
- Error code
- Request ID
- Timestamp
- Operation context

```rust
tracing::error!(
    error_code = %error.code,
    request_id = %error.request_id,
    operation = "push",
    file = %path,
    "Operation failed"
);
```

---

## Getting Help

```bash
# Look up error code
dits help error E3003

# Generate support bundle
dits support-bundle

# Contact support
# Email: support@dits.io
# Include: Error code, request_id, support bundle
```

---

## Notes

- All error codes are stable and won't change meaning
- New codes are added in unused ranges
- Deprecated codes remain documented for 2 major versions
- Request ID is essential for support troubleshooting
