# Edge Cases and Failure Modes

> Comprehensive catalog of edge cases, failure scenarios, and their handling strategies for the Dits video version control system.

## Overview

This document catalogs edge cases and failure modes that implementations must handle. Each scenario includes:
- **Trigger**: What causes this scenario
- **Symptoms**: How it manifests
- **Detection**: How to identify it's happening
- **Recovery**: How to handle it
- **Prevention**: How to avoid it

---

## 1. Storage Failures

### 1.1 Chunk Write Succeeds but Verification Fails

**Trigger**: Data corruption during write, disk error, or cosmic ray bit flip.

**Symptoms**:
- Write returns success
- Subsequent read returns different data
- Checksum mismatch

**Detection**:
```typescript
async function writeWithVerify(key: string, data: Buffer): Promise<void> {
  await storage.put(key, data);

  const readBack = await storage.get(key);
  const expectedHash = blake3(data);
  const actualHash = blake3(readBack);

  if (expectedHash !== actualHash) {
    throw new WriteVerificationError(key, expectedHash, actualHash);
  }
}
```

**Recovery**:
1. Retry write to same location
2. If retry fails, try alternate storage location
3. Mark original location as suspect for investigation
4. Alert operations team

**Prevention**:
- Use storage with built-in checksums (S3 Content-MD5)
- Enable ECC memory on storage servers
- Implement end-to-end checksums in application layer

---

### 1.2 Partial Manifest Write

**Trigger**: Process crash, network timeout, or disk full during manifest upload.

**Symptoms**:
- Manifest file exists but is truncated
- JSON/binary parsing fails
- Missing chunks referenced

**Detection**:
```typescript
interface Manifest {
  version: number;
  chunks: ChunkRef[];
  checksum: string; // Last field, validates whole manifest
}

function validateManifest(data: Buffer): Manifest {
  const manifest = parseManifest(data);

  // Verify trailing checksum covers entire manifest
  const withoutChecksum = data.slice(0, -32);
  const expectedChecksum = blake3(withoutChecksum);

  if (manifest.checksum !== expectedChecksum) {
    throw new ManifestCorruptionError('Checksum mismatch - partial write detected');
  }

  return manifest;
}
```

**Recovery**:
1. Delete partial manifest
2. Rebuild from chunks if possible
3. If rebuild fails, restore from last good commit

**Prevention**:
- Write manifest to temp location first
- Atomic rename after verification
- Include trailing checksum

---

### 1.3 Orphaned Chunks After Failed Commit

**Trigger**: Chunks uploaded but commit operation fails before manifest is saved.

**Symptoms**:
- Storage usage grows
- Chunks exist with no manifest references
- GC eventually cleans them up (if working)

**Detection**:
```sql
-- Find chunks with no manifest references
SELECT c.hash, c.uploaded_at
FROM chunks c
LEFT JOIN manifest_chunks mc ON c.hash = mc.chunk_hash
WHERE mc.chunk_hash IS NULL
  AND c.uploaded_at < NOW() - INTERVAL '24 hours';
```

**Recovery**:
- Automatic: GC will clean up after grace period
- Manual: Run targeted cleanup for specific upload session

**Prevention**:
- Use saga pattern with compensation
- Track upload sessions, clean up failed ones
- Client-side retry with same idempotency key

---

### 1.4 Reference Count Underflow

**Trigger**: Double-decrement of reference count, race condition in concurrent deletes.

**Symptoms**:
- Reference count goes negative
- Chunk marked for deletion while still referenced
- Data loss on next GC run

**Detection**:
```sql
-- Alert on negative ref counts
SELECT * FROM chunk_refs WHERE ref_count < 0;

-- Or constraint
ALTER TABLE chunk_refs ADD CONSTRAINT positive_refs CHECK (ref_count >= 0);
```

**Recovery**:
1. Immediately halt GC
2. Rebuild reference counts from manifests
3. Investigate root cause
4. Resume GC after verification

**Prevention**:
- Use database constraints to prevent negative
- Wrap all operations in transactions with row locks
- Log all ref count changes for debugging

---

### 1.5 Storage Tier Mismatch

**Trigger**: Metadata says chunk is in hot tier, but it's actually in cold.

**Symptoms**:
- Fast read path fails
- Fallback to cold tier works
- Higher latency than expected

**Detection**:
```typescript
async function readWithTierTracking(hash: string): Promise<Buffer> {
  const metadata = await getChunkMetadata(hash);

  try {
    const data = await tiers[metadata.tier].read(hash);
    return data;
  } catch (e) {
    // Track tier mismatch
    metrics.increment('storage.tier_mismatch', { expected: metadata.tier });

    // Try other tiers
    for (const tier of Object.keys(tiers)) {
      if (tier === metadata.tier) continue;
      try {
        const data = await tiers[tier].read(hash);
        // Fix metadata
        await updateChunkMetadata(hash, { tier });
        return data;
      } catch {}
    }
    throw new ChunkNotFoundError(hash);
  }
}
```

**Recovery**:
- Automatic metadata correction when found
- Periodic consistency check job
- Rebuild tier map from storage scan

**Prevention**:
- Atomic tier migration with metadata update
- Two-phase migration: copy, update, delete
- Regular consistency audits

---

## 2. Network Failures

### 2.1 Connection Drops During Chunk Upload

**Trigger**: Network instability, mobile switching networks, timeout.

**Symptoms**:
- Upload progress stalls
- Connection reset error
- Partial data received by server

**Detection**:
```typescript
class ResumableUpload {
  private uploadId: string;
  private bytesConfirmed = 0;

  async upload(data: Buffer): Promise<void> {
    // Get server-confirmed progress
    this.bytesConfirmed = await this.getConfirmedProgress(this.uploadId);

    // Resume from confirmed point
    const remaining = data.slice(this.bytesConfirmed);
    await this.uploadChunk(remaining);
  }
}
```

**Recovery**:
1. Client detects connection loss
2. Query server for confirmed bytes
3. Resume from confirmed position
4. Complete upload

**Prevention**:
- Smaller chunk sizes for unreliable networks
- Server-side progress tracking
- Heartbeat pings during upload

---

### 2.2 DNS Resolution Failure

**Trigger**: DNS server unavailable, cached entry expired, misconfiguration.

**Symptoms**:
- "Host not found" errors
- All connections to service fail
- Other services (to different hosts) may work

**Detection**:
```typescript
class DNSAwareClient {
  private dnsCache = new Map<string, { ip: string; expiry: Date }>();

  async resolve(hostname: string): Promise<string> {
    // Check cache
    const cached = this.dnsCache.get(hostname);
    if (cached && cached.expiry > new Date()) {
      return cached.ip;
    }

    try {
      const ip = await dns.resolve(hostname);
      this.dnsCache.set(hostname, {
        ip,
        expiry: new Date(Date.now() + 300000), // 5 min
      });
      return ip;
    } catch (e) {
      // Return cached even if expired (stale-while-revalidate)
      if (cached) {
        metrics.increment('dns.stale_cache_used');
        return cached.ip;
      }
      throw e;
    }
  }
}
```

**Recovery**:
- Use cached IP if available (stale-while-revalidate)
- Fall back to secondary DNS servers
- Use IP literals as last resort

**Prevention**:
- Multiple DNS servers configured
- Local DNS caching
- IP-based fallback endpoints documented

---

### 2.3 TLS Certificate Expiry

**Trigger**: Certificate renewal failed or was forgotten.

**Symptoms**:
- All HTTPS connections fail
- "Certificate expired" errors
- Site/API completely unreachable

**Detection**:
```typescript
// Proactive monitoring
async function checkCertificateExpiry(host: string): Promise<number> {
  const socket = tls.connect({
    host,
    port: 443,
    rejectUnauthorized: false, // We want to check even if expired
  });

  return new Promise((resolve, reject) => {
    socket.on('secureConnect', () => {
      const cert = socket.getPeerCertificate();
      const expiryDate = new Date(cert.valid_to);
      const daysRemaining = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      socket.end();
      resolve(daysRemaining);
    });
    socket.on('error', reject);
  });
}

// Alert if < 14 days
```

**Recovery**:
1. Immediate: Issue new certificate (Let's Encrypt ~2 min)
2. Deploy new certificate
3. Verify with external checker

**Prevention**:
- Automated certificate renewal (cert-manager, Caddy)
- Monitoring for expiry > 14 days out
- Multiple notification channels

---

### 2.4 Load Balancer Health Check Flapping

**Trigger**: Marginal server health, network jitter, aggressive thresholds.

**Symptoms**:
- Servers cycling in/out of pool
- Uneven traffic distribution
- Intermittent connection errors

**Detection**:
```yaml
# Health check metrics
alerts:
  - name: HealthCheckFlapping
    expr: |
      changes(up{job="api"}[10m]) > 5
    for: 5m
    labels:
      severity: warning
```

**Recovery**:
- Temporarily increase health check tolerance
- Investigate root cause (memory, CPU, network)
- Fix underlying issue
- Return to normal thresholds

**Prevention**:
- Appropriate health check thresholds
- Gradual failure detection (3 failures before removal)
- Slow recovery (successful checks before adding back)

---

### 2.5 WebSocket Connection Limit Exhaustion

**Trigger**: Too many concurrent real-time connections, connection leaks.

**Symptoms**:
- New connections rejected
- "Too many connections" errors
- Existing connections work fine

**Detection**:
```typescript
class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  private readonly maxConnections = 10000;

  accept(ws: WebSocket, userId: string): boolean {
    if (this.connections.size >= this.maxConnections) {
      metrics.increment('websocket.rejected_at_limit');
      return false;
    }

    // Track by user to detect connection leaks
    const userConnections = [...this.connections.values()]
      .filter(c => c.userId === userId).length;

    if (userConnections > 10) {
      metrics.increment('websocket.user_limit_exceeded', { userId });
      // Close oldest connection from this user
      this.closeOldestForUser(userId);
    }

    this.connections.set(ws.id, ws);
    return true;
  }
}
```

**Recovery**:
- Close idle connections (no activity for X minutes)
- Increase limits if resources allow
- Scale horizontally

**Prevention**:
- Per-user connection limits
- Idle connection timeout
- Connection pooling for similar clients

---

## 3. Concurrency Issues

### 3.1 Lost Update (Write Skew)

**Trigger**: Two concurrent updates to related data without proper isolation.

**Symptoms**:
- Data inconsistency
- One update silently lost
- No error reported

**Example**:
```
Time 1: User A reads balance = 100
Time 2: User B reads balance = 100
Time 3: User A writes balance = 100 - 30 = 70
Time 4: User B writes balance = 100 - 50 = 50
Result: Balance = 50, but should be 20 (100 - 30 - 50)
```

**Detection**:
```typescript
// Use optimistic locking with version numbers
interface Asset {
  id: string;
  version: number;
  data: any;
}

async function update(id: string, version: number, newData: any): Promise<void> {
  const result = await db.query(
    `UPDATE assets SET data = $1, version = version + 1
     WHERE id = $2 AND version = $3
     RETURNING version`,
    [newData, id, version]
  );

  if (result.rowCount === 0) {
    throw new ConcurrencyConflictError(id);
  }
}
```

**Recovery**:
- Retry with fresh read
- Merge changes if possible
- Notify user of conflict

**Prevention**:
- Optimistic locking with version numbers
- Pessimistic locking for critical sections
- Serializable transaction isolation

---

### 3.2 Deadlock in Lock Acquisition

**Trigger**: Two operations acquire locks in different orders.

**Symptoms**:
- Operations hang indefinitely
- Eventually timeout
- Neither operation completes

**Example**:
```
Operation A: Lock(resource1) -> Lock(resource2)
Operation B: Lock(resource2) -> Lock(resource1)

If A gets resource1 and B gets resource2, both wait forever.
```

**Detection**:
```typescript
class DeadlockDetector {
  private waitForGraph = new Map<string, Set<string>>(); // operation -> waiting for

  recordWait(operation: string, resource: string, holder: string): void {
    if (!this.waitForGraph.has(operation)) {
      this.waitForGraph.set(operation, new Set());
    }
    this.waitForGraph.get(operation)!.add(holder);

    // Check for cycle
    if (this.hasCycle(operation, new Set())) {
      throw new DeadlockDetectedError(operation);
    }
  }

  private hasCycle(node: string, visited: Set<string>): boolean {
    if (visited.has(node)) return true;
    visited.add(node);

    const neighbors = this.waitForGraph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (this.hasCycle(neighbor, new Set(visited))) return true;
    }
    return false;
  }
}
```

**Recovery**:
- Abort one operation (victim selection)
- Release its locks
- Allow other to proceed
- Retry aborted operation

**Prevention**:
- Always acquire locks in consistent order (e.g., by resource ID)
- Use lock timeout
- Use single lock manager with deadlock detection

---

### 3.3 Stale Read After Write

**Trigger**: Read from replica before replication completes.

**Symptoms**:
- User doesn't see their own changes
- Intermittent - depends on replica lag
- Eventually consistent behavior

**Detection**:
```typescript
class SessionConsistentClient {
  private lastWriteToken: string | null = null;

  async write(data: any): Promise<void> {
    const result = await this.primary.write(data);
    this.lastWriteToken = result.writeToken;
  }

  async read(query: any): Promise<any> {
    if (this.lastWriteToken) {
      // Request read-after-write consistency
      return this.primary.read(query, {
        afterToken: this.lastWriteToken,
      });
    }
    return this.replica.read(query);
  }
}
```

**Recovery**:
- Wait and retry
- Read from primary
- Force replication sync

**Prevention**:
- Read-your-writes consistency tokens
- Sticky sessions to primary after write
- Synchronous replication for critical reads

---

### 3.4 Lock Holder Process Dies

**Trigger**: Process crash, OOM kill, network partition from lock service.

**Symptoms**:
- Lock never released
- Resource locked indefinitely
- Other operations waiting forever

**Detection**:
```typescript
interface DistributedLock {
  resource: string;
  holder: string;
  acquiredAt: Date;
  ttl: number;
  lastHeartbeat: Date;
}

// Periodic cleanup
async function cleanupStaleLocks(): Promise<void> {
  const staleLocks = await db.query(
    `SELECT * FROM locks
     WHERE last_heartbeat < NOW() - INTERVAL '30 seconds'`
  );

  for (const lock of staleLocks) {
    logger.warn('Cleaning up stale lock', { lock });
    await db.query('DELETE FROM locks WHERE id = $1', [lock.id]);
    metrics.increment('locks.stale_cleanup');
  }
}
```

**Recovery**:
- Automatic TTL-based expiry
- Heartbeat-based detection
- Force release with admin intervention

**Prevention**:
- Short TTLs with heartbeat extension
- Lock fencing tokens to prevent zombie holders
- Graceful shutdown releases locks

---

### 3.5 Transaction Serialization Failure

**Trigger**: Concurrent transactions with SERIALIZABLE isolation conflict.

**Symptoms**:
- "could not serialize access" error
- Transaction rolled back
- Intermittent failures under load

**Detection**:
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e.code === '40001') { // serialization_failure
        lastError = e;
        await sleep(Math.pow(2, i) * 100 + Math.random() * 100);
        continue;
      }
      throw e;
    }
  }

  throw lastError;
}
```

**Recovery**:
- Automatic retry with backoff
- Jitter to prevent thundering herd
- Fall back to pessimistic locking if retries exhausted

**Prevention**:
- Minimize transaction duration
- Reduce contention through data partitioning
- Consider lower isolation levels where safe

---

## 4. Video Processing Failures

### 4.1 Corrupted Video Container

**Trigger**: Incomplete transfer, disk error, encoding bug.

**Symptoms**:
- Parser throws exception
- Missing moov atom
- Invalid box sizes

**Detection**:
```typescript
async function validateVideoContainer(file: Buffer): Promise<ValidationResult> {
  const issues: Issue[] = [];

  try {
    const boxes = parseISOBMFF(file);

    // Check for required boxes
    if (!boxes.find(b => b.type === 'ftyp')) {
      issues.push({ severity: 'error', message: 'Missing ftyp box' });
    }
    if (!boxes.find(b => b.type === 'moov')) {
      issues.push({ severity: 'error', message: 'Missing moov box' });
    }
    if (!boxes.find(b => b.type === 'mdat')) {
      issues.push({ severity: 'warning', message: 'Missing mdat box' });
    }

    // Validate box sizes
    for (const box of boxes) {
      if (box.declaredSize !== box.actualSize) {
        issues.push({
          severity: 'error',
          message: `Box ${box.type} size mismatch: declared ${box.declaredSize}, actual ${box.actualSize}`,
        });
      }
    }
  } catch (e) {
    issues.push({ severity: 'error', message: `Parse failed: ${e.message}` });
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}
```

**Recovery**:
- Try to recover with ffmpeg
- Extract playable portions
- Reject and notify user

**Prevention**:
- Validate on upload before accepting
- Checksum verification
- Container repair tools available

---

### 4.2 Codec Not Supported

**Trigger**: New or uncommon codec, proprietary format.

**Symptoms**:
- "Unknown codec" error
- Fallback to raw storage
- No keyframe extraction possible

**Detection**:
```typescript
const SUPPORTED_CODECS = new Set([
  'avc1', 'hev1', 'hvc1', 'vp09', 'av01', // Video
  'mp4a', 'ac-3', 'ec-3', 'opus', 'fLaC', // Audio
]);

function checkCodecSupport(track: Track): CodecSupportResult {
  const codecId = track.codecId.split('.')[0];

  if (!SUPPORTED_CODECS.has(codecId)) {
    return {
      supported: false,
      fallback: 'raw', // Store without parsing
      warning: `Unsupported codec: ${track.codecId}`,
    };
  }

  return { supported: true };
}
```

**Recovery**:
- Store as raw file (no chunking optimization)
- Transcode to supported format (optional)
- Flag for future support

**Prevention**:
- Document supported formats
- Graceful degradation for unknown
- Regular codec support updates

---

### 4.3 Audio/Video Sync Loss

**Trigger**: Edit decision changes, variable frame rate, incorrect timestamps.

**Symptoms**:
- Audio drifts from video
- Lip sync issues
- Jumps in playback

**Detection**:
```typescript
function validateAVSync(videoTrack: Track, audioTrack: Track): SyncValidation {
  const videoDuration = videoTrack.duration / videoTrack.timescale;
  const audioDuration = audioTrack.duration / audioTrack.timescale;

  const driftMs = Math.abs(videoDuration - audioDuration) * 1000;

  if (driftMs > 100) { // More than 100ms drift
    return {
      valid: false,
      driftMs,
      suggestion: 'Tracks have significant duration mismatch',
    };
  }

  // Check for timestamp discontinuities
  const videoGaps = findTimestampGaps(videoTrack);
  const audioGaps = findTimestampGaps(audioTrack);

  return {
    valid: videoGaps.length === 0 && audioGaps.length === 0,
    videoGaps,
    audioGaps,
  };
}
```

**Recovery**:
- Warn user about detected sync issues
- Provide resync tool
- Store original timestamps for reference

**Prevention**:
- Validate sync on ingest
- Preserve edit lists
- Handle VFR properly

---

### 4.4 HDR Metadata Loss

**Trigger**: Improper handling during chunking, codec reconfiguration.

**Symptoms**:
- Washed out colors on HDR displays
- Incorrect tone mapping
- Missing color profile

**Detection**:
```typescript
interface HDRCheck {
  hasHDR: boolean;
  type: 'hdr10' | 'hdr10+' | 'dolby-vision' | 'hlg' | null;
  metadata: {
    masteringDisplay?: boolean;
    contentLightLevel?: boolean;
    dynamicMetadata?: boolean;
  };
}

function validateHDRPreservation(original: HDRCheck, reconstructed: HDRCheck): boolean {
  if (original.hasHDR !== reconstructed.hasHDR) {
    return false;
  }

  if (original.hasHDR) {
    // All original metadata must be present in reconstructed
    if (original.metadata.masteringDisplay && !reconstructed.metadata.masteringDisplay) {
      return false;
    }
    if (original.metadata.contentLightLevel && !reconstructed.metadata.contentLightLevel) {
      return false;
    }
    if (original.metadata.dynamicMetadata && !reconstructed.metadata.dynamicMetadata) {
      return false;
    }
  }

  return true;
}
```

**Recovery**:
- Store HDR metadata separately
- Reinsert during reconstruction
- Warn if metadata unrecoverable

**Prevention**:
- Extract and store all metadata before chunking
- Verify metadata preservation after reconstruction
- HDR-aware chunk boundaries

---

### 4.5 NLE Project Version Incompatibility

**Trigger**: Project saved in newer NLE version than parser supports.

**Symptoms**:
- Parse fails or incomplete
- Missing elements
- Incorrect structure

**Detection**:
```typescript
interface ProjectVersion {
  nle: 'premiere' | 'resolve' | 'fcpx' | 'aftereffects';
  version: string;
  supported: boolean;
}

const SUPPORTED_VERSIONS: Record<string, string[]> = {
  premiere: ['14.0', '15.0', '22.0', '23.0', '24.0'],
  resolve: ['16', '17', '18', '19'],
  fcpx: ['10.4', '10.5', '10.6', '10.7'],
  aftereffects: ['2020', '2021', '2022', '2023', '2024'],
};

function checkProjectVersion(project: Buffer): ProjectVersion {
  const detected = detectNLEType(project);
  const version = extractVersion(project, detected.nle);

  return {
    nle: detected.nle,
    version,
    supported: SUPPORTED_VERSIONS[detected.nle]?.includes(version) ?? false,
  };
}
```

**Recovery**:
- Store project as opaque blob
- Provide upgrade path when parser updated
- Fall back to file-level versioning

**Prevention**:
- Regular parser updates
- Version detection before parsing
- Graceful degradation for unsupported versions

---

## 5. Authentication & Authorization Failures

### 5.1 Token Expired During Long Operation

**Trigger**: Upload/download takes longer than token TTL.

**Symptoms**:
- Operation fails mid-stream
- 401 error
- Progress lost

**Detection**:
```typescript
class TokenAwareOperation {
  async execute(token: Token, operation: () => Promise<void>): Promise<void> {
    // Check if token will expire during estimated operation time
    const estimatedDuration = this.estimateDuration();
    const tokenExpiresIn = token.expiresAt.getTime() - Date.now();

    if (tokenExpiresIn < estimatedDuration + 60000) { // 1 min buffer
      // Proactively refresh
      const newToken = await this.refreshToken(token);
      return this.execute(newToken, operation);
    }

    try {
      await operation();
    } catch (e) {
      if (e.status === 401) {
        // Try refresh and retry
        const newToken = await this.refreshToken(token);
        return this.execute(newToken, operation);
      }
      throw e;
    }
  }
}
```

**Recovery**:
- Automatic token refresh
- Resume operation from checkpoint
- Re-authenticate if refresh fails

**Prevention**:
- Proactive token refresh before expiry
- Long-lived tokens for long operations
- Operation checkpointing

---

### 5.2 Session Fixation Attack

**Trigger**: Attacker sets session ID before authentication.

**Symptoms**:
- Attacker can hijack authenticated session
- No visible error
- Unauthorized access

**Detection**:
```typescript
// Server-side logging
function auditSessionCreation(req: Request, session: Session): void {
  const suspicious =
    session.createdBeforeAuth &&
    session.ipChanged &&
    session.userAgentChanged;

  if (suspicious) {
    logger.warn('Potential session fixation', {
      sessionId: session.id,
      originalIp: session.originalIp,
      currentIp: req.ip,
    });

    // Force new session
    throw new SessionSecurityError('Session regeneration required');
  }
}
```

**Recovery**:
- Invalidate compromised session
- Force re-authentication
- Alert security team

**Prevention**:
- Regenerate session ID on authentication
- Regenerate on privilege escalation
- Bind sessions to client fingerprint

---

### 5.3 OAuth State Mismatch

**Trigger**: CSRF attack, expired state, browser back button.

**Symptoms**:
- "Invalid state" error on callback
- Authentication fails
- User frustrated

**Detection**:
```typescript
async function handleOAuthCallback(state: string, code: string): Promise<Token> {
  const storedState = await stateStore.get(state);

  if (!storedState) {
    throw new OAuthError('STATE_NOT_FOUND', 'Authentication session expired or invalid');
  }

  if (storedState.expiresAt < Date.now()) {
    throw new OAuthError('STATE_EXPIRED', 'Authentication session expired');
  }

  if (storedState.used) {
    throw new OAuthError('STATE_REUSED', 'Authentication already completed');
  }

  // Mark as used before exchange
  await stateStore.markUsed(state);

  return await exchangeCode(code, storedState.codeVerifier);
}
```

**Recovery**:
- Clear state and start over
- Show helpful error message
- Log for security review

**Prevention**:
- Short state TTL (10 minutes)
- One-time use enforcement
- Clear error messages

---

### 5.4 Permission Check Bypass via Race Condition

**Trigger**: Permission revoked between check and use.

**Symptoms**:
- Unauthorized action succeeds
- Audit log shows revocation after action
- Data accessed without permission

**Detection**:
```typescript
// Time-of-check to time-of-use (TOCTOU) prevention
async function authorizedAction<T>(
  userId: string,
  resource: string,
  action: () => Promise<T>
): Promise<T> {
  // Acquire lock on permission
  const lock = await permissionLock.acquire(`perm:${userId}:${resource}`);

  try {
    // Check permission under lock
    const allowed = await checkPermission(userId, resource);
    if (!allowed) {
      throw new UnauthorizedError();
    }

    // Execute action under same lock
    return await action();
  } finally {
    await lock.release();
  }
}
```

**Recovery**:
- Audit and revert unauthorized actions
- Notify affected parties
- Fix race condition

**Prevention**:
- Lock permissions during sensitive operations
- Re-check permissions at action time
- Use database constraints where possible

---

### 5.5 API Key Leaked in Logs

**Trigger**: Debug logging includes authorization header.

**Symptoms**:
- API keys visible in logs
- Potential unauthorized access
- Compliance violation

**Detection**:
```typescript
// Log sanitizer
function sanitizeLogs(obj: any): any {
  const sensitive = ['authorization', 'api-key', 'x-api-key', 'password', 'token'];

  if (typeof obj === 'string') {
    // Redact Bearer tokens
    return obj.replace(/Bearer [a-zA-Z0-9\-_]+/g, 'Bearer [REDACTED]');
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitive.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogs(value);
      }
    }
    return sanitized;
  }

  return obj;
}
```

**Recovery**:
- Rotate leaked keys immediately
- Purge logs containing keys
- Audit access using leaked keys

**Prevention**:
- Log sanitization middleware
- Never log authorization headers
- Use structured logging with redaction

---

## 6. Deployment Failures

### 6.1 Database Migration Fails Mid-Deployment

**Trigger**: Migration script error, constraint violation, timeout.

**Symptoms**:
- Deployment stuck
- Database in inconsistent state
- Application errors

**Detection**:
```typescript
interface MigrationStatus {
  version: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

async function checkMigrationHealth(): Promise<HealthResult> {
  const migrations = await getMigrationStatus();

  const failed = migrations.filter(m => m.status === 'failed');
  const stuck = migrations.filter(m =>
    m.status === 'running' &&
    m.startedAt &&
    Date.now() - m.startedAt.getTime() > 3600000 // 1 hour
  );

  if (failed.length > 0 || stuck.length > 0) {
    return { healthy: false, failed, stuck };
  }

  return { healthy: true };
}
```

**Recovery**:
1. Stop deployment
2. Assess damage
3. Fix migration or roll back
4. Resume deployment

**Prevention**:
- Test migrations in staging
- Use reversible migrations
- Break large migrations into steps
- Add timeout handling

---

### 6.2 Blue-Green Deployment Database Schema Mismatch

**Trigger**: New code deployed to blue, old code still running on green.

**Symptoms**:
- Errors on green instances
- Inconsistent behavior between requests
- Data corruption possible

**Detection**:
```typescript
// Schema version check on startup
async function verifySchemaCompatibility(): Promise<void> {
  const dbVersion = await getSchemaVersion();
  const codeVersion = CODE_SCHEMA_VERSION;

  if (dbVersion < codeVersion - 1 || dbVersion > codeVersion) {
    throw new SchemaIncompatibleError(
      `Database schema ${dbVersion} not compatible with code version ${codeVersion}`
    );
  }

  if (dbVersion < codeVersion) {
    logger.warn('Running with older schema version', { dbVersion, codeVersion });
  }
}
```

**Recovery**:
- Complete cutover to single version
- Fix schema compatibility
- Rollback if necessary

**Prevention**:
- Expand-contract migrations
- Forward/backward compatible schemas
- Schema version checks on startup

---

### 6.3 Configuration Secret Not Available

**Trigger**: Secret manager unavailable, permission denied, secret deleted.

**Symptoms**:
- Application won't start
- "Secret not found" errors
- Partial functionality

**Detection**:
```typescript
async function loadSecrets(required: string[]): Promise<Map<string, string>> {
  const secrets = new Map<string, string>();
  const missing: string[] = [];

  for (const name of required) {
    try {
      const value = await secretManager.getSecret(name);
      secrets.set(name, value);
    } catch (e) {
      logger.error('Failed to load secret', { name, error: e.message });
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new MissingSecretsError(missing);
  }

  return secrets;
}
```

**Recovery**:
- Check secret manager connectivity
- Verify permissions
- Use fallback/default if safe
- Fail fast with clear error

**Prevention**:
- Secret availability monitoring
- Redundant secret storage
- Local encrypted fallback for critical secrets

---

### 6.4 Container Image Pull Failure

**Trigger**: Registry unavailable, image deleted, network issue.

**Symptoms**:
- Pods stuck in ImagePullBackOff
- Deployment doesn't progress
- Old pods keep running

**Detection**:
```yaml
# Kubernetes event monitoring
apiVersion: v1
kind: Event
reason: Failed
message: "Failed to pull image"
---
# Alert rule
alert: ImagePullFailure
expr: |
  kube_pod_container_status_waiting_reason{reason="ImagePullBackOff"} > 0
for: 5m
labels:
  severity: critical
```

**Recovery**:
1. Check registry availability
2. Verify image exists
3. Check credentials
4. Retry pull or use fallback registry

**Prevention**:
- Multiple registry mirrors
- Pre-pull images on nodes
- Image pull secrets properly configured
- Regular cleanup of old images

---

### 6.5 Resource Limits Cause OOMKill

**Trigger**: Memory limit too low, memory leak, large request.

**Symptoms**:
- Pod restarts frequently
- OOMKilled status
- Request failures

**Detection**:
```yaml
# Memory pressure alert
alert: PodOOMKilled
expr: |
  kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} > 0
for: 0m
labels:
  severity: warning
annotations:
  summary: "Pod {{ $labels.pod }} OOMKilled"
```

**Recovery**:
- Increase memory limits
- Investigate memory usage
- Add memory profiling
- Restart problematic pods

**Prevention**:
- Right-size resource limits
- Load testing with realistic data
- Memory usage monitoring
- Graceful degradation for memory pressure

---

## 7. Data Consistency Issues

### 7.1 Eventual Consistency Window Visible to User

**Trigger**: Read from replica before sync, caching.

**Symptoms**:
- User's changes not immediately visible
- "Flashing" between states
- Confusion and support tickets

**Detection**:
```typescript
// Track write timestamps
class ConsistencyTracker {
  private writes = new Map<string, Date>();

  recordWrite(key: string): void {
    this.writes.set(key, new Date());
  }

  async read<T>(key: string, reader: () => Promise<T>): Promise<T> {
    const lastWrite = this.writes.get(key);
    const value = await reader();

    if (lastWrite && Date.now() - lastWrite.getTime() < 5000) {
      // Recent write, verify we got fresh data
      await this.waitForConsistency(key);
      return reader();
    }

    return value;
  }
}
```

**Recovery**:
- Read from primary
- Wait for consistency
- Show loading state

**Prevention**:
- Read-your-writes consistency
- Optimistic UI updates
- Clear consistency expectations

---

### 7.2 Duplicate Entries from Retry

**Trigger**: Request succeeds but response times out, client retries.

**Symptoms**:
- Duplicate records
- Double-charged
- Inconsistent counts

**Detection**:
```typescript
// Idempotency check
async function processWithIdempotency<T>(
  key: string,
  processor: () => Promise<T>
): Promise<T> {
  const existing = await idempotencyStore.get(key);

  if (existing) {
    if (existing.status === 'completed') {
      return existing.result;
    }
    if (existing.status === 'processing') {
      // Wait for completion
      return await this.waitForResult(key);
    }
  }

  await idempotencyStore.set(key, { status: 'processing' });

  try {
    const result = await processor();
    await idempotencyStore.set(key, { status: 'completed', result });
    return result;
  } catch (e) {
    await idempotencyStore.set(key, { status: 'failed', error: e.message });
    throw e;
  }
}
```

**Recovery**:
- Deduplicate based on idempotency key
- Remove duplicates
- Refund if applicable

**Prevention**:
- Require idempotency keys
- Database unique constraints
- Retry-aware design

---

### 7.3 Foreign Key Reference to Deleted Record

**Trigger**: Delete without cascade, race condition.

**Symptoms**:
- "Record not found" errors
- Dangling references
- Broken relationships

**Detection**:
```sql
-- Find orphaned references
SELECT mc.chunk_hash
FROM manifest_chunks mc
LEFT JOIN chunks c ON mc.chunk_hash = c.hash
WHERE c.hash IS NULL;

-- Find orphaned commits
SELECT c.id
FROM commits c
LEFT JOIN refs r ON c.id = r.commit_id
LEFT JOIN commit_parents cp ON c.id = cp.child_id OR c.id = cp.parent_id
WHERE r.commit_id IS NULL AND cp.child_id IS NULL AND cp.parent_id IS NULL;
```

**Recovery**:
- Rebuild references from source of truth
- Delete orphaned records
- Fix application logic

**Prevention**:
- Foreign key constraints with CASCADE
- Soft deletes
- Transactional deletes

---

### 7.4 Cache Inconsistency After Update

**Trigger**: Cache not invalidated, invalidation message lost.

**Symptoms**:
- Stale data served
- Updates not visible
- Inconsistent between requests

**Detection**:
```typescript
// Version-based cache validation
interface CachedItem<T> {
  data: T;
  version: number;
  cachedAt: Date;
}

async function getWithVersionCheck<T>(
  key: string,
  fetcher: () => Promise<{ data: T; version: number }>
): Promise<T> {
  const cached = await cache.get<CachedItem<T>>(key);

  if (cached) {
    // Periodically verify version
    if (Math.random() < 0.1) { // 10% of requests
      const current = await fetcher();
      if (current.version !== cached.version) {
        metrics.increment('cache.stale_detected');
        await cache.set(key, { data: current.data, version: current.version, cachedAt: new Date() });
        return current.data;
      }
    }
    return cached.data;
  }

  const fresh = await fetcher();
  await cache.set(key, { data: fresh.data, version: fresh.version, cachedAt: new Date() });
  return fresh.data;
}
```

**Recovery**:
- Invalidate cache
- Force refresh
- Clear affected caches

**Prevention**:
- Write-through caching
- Version-based invalidation
- Short TTLs for frequently changing data

---

### 7.5 Clock Skew Causes Ordering Issues

**Trigger**: Server clocks not synchronized, NTP failure.

**Symptoms**:
- Events appear out of order
- "Future" timestamps
- Expiry logic fails

**Detection**:
```typescript
// Monitor clock skew
async function checkClockSkew(referenceServers: string[]): Promise<number> {
  const localTime = Date.now();

  const remoteTimes = await Promise.all(
    referenceServers.map(async server => {
      const response = await fetch(server, { method: 'HEAD' });
      const dateHeader = response.headers.get('Date');
      return dateHeader ? new Date(dateHeader).getTime() : null;
    })
  );

  const validRemoteTimes = remoteTimes.filter(t => t !== null);
  const avgRemoteTime = validRemoteTimes.reduce((a, b) => a + b, 0) / validRemoteTimes.length;

  const skewMs = Math.abs(localTime - avgRemoteTime);

  if (skewMs > 1000) {
    logger.warn('Clock skew detected', { skewMs });
  }

  return skewMs;
}
```

**Recovery**:
- Sync clocks with NTP
- Use logical clocks for ordering
- Reprocess affected events

**Prevention**:
- NTP monitoring
- Logical clocks / vector clocks
- Clock skew tolerance in comparisons

---

## 8. Integration Failures

### 8.1 Webhook Delivery Failure

**Trigger**: Endpoint down, timeout, SSL error.

**Symptoms**:
- Events not delivered
- Integration out of sync
- User complaints

**Detection**:
```typescript
interface WebhookDelivery {
  id: string;
  event: WebhookEvent;
  endpoint: string;
  attempts: number;
  lastAttempt: Date;
  lastError?: string;
  status: 'pending' | 'delivered' | 'failed';
}

// Delivery with exponential backoff
async function deliverWebhook(delivery: WebhookDelivery): Promise<void> {
  const maxAttempts = 5;
  const baseDelay = 60000; // 1 minute

  while (delivery.attempts < maxAttempts) {
    try {
      await sendWebhook(delivery.event, delivery.endpoint);
      delivery.status = 'delivered';
      return;
    } catch (e) {
      delivery.attempts++;
      delivery.lastAttempt = new Date();
      delivery.lastError = e.message;

      if (delivery.attempts >= maxAttempts) {
        delivery.status = 'failed';
        await notifyWebhookFailure(delivery);
        return;
      }

      const delay = baseDelay * Math.pow(2, delivery.attempts - 1);
      await sleep(delay);
    }
  }
}
```

**Recovery**:
- Retry with backoff
- Manual replay
- Notify user of persistent failure

**Prevention**:
- Health check endpoints
- Circuit breaker
- Dead letter queue

---

### 8.2 Third-Party API Rate Limited

**Trigger**: Too many requests, burst traffic, shared limits.

**Symptoms**:
- 429 errors
- Degraded functionality
- Slow responses

**Detection**:
```typescript
class RateLimitedClient {
  private remaining = Infinity;
  private resetAt = 0;

  async request<T>(endpoint: string): Promise<T> {
    // Wait if we know we're rate limited
    if (this.remaining === 0 && Date.now() < this.resetAt) {
      const waitMs = this.resetAt - Date.now();
      await sleep(waitMs);
    }

    const response = await fetch(endpoint);

    // Track rate limit headers
    this.remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || 'Infinity');
    this.resetAt = parseInt(response.headers.get('X-RateLimit-Reset') || '0') * 1000;

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      await sleep(retryAfter * 1000);
      return this.request(endpoint);
    }

    return response.json();
  }
}
```

**Recovery**:
- Wait for rate limit reset
- Queue and retry
- Use fallback if available

**Prevention**:
- Respect rate limits
- Use caching
- Batch requests
- Request higher limits

---

### 8.3 SSO Provider Unavailable

**Trigger**: Provider outage, network issue, misconfiguration.

**Symptoms**:
- Users can't log in
- 500 errors on auth
- Complete authentication failure

**Detection**:
```typescript
// SSO health monitoring
async function checkSSOHealth(providers: SSOProvider[]): Promise<SSOHealth> {
  const results = await Promise.allSettled(
    providers.map(async provider => {
      const start = Date.now();
      try {
        await fetch(provider.wellKnownUrl);
        return { provider: provider.name, healthy: true, latency: Date.now() - start };
      } catch (e) {
        return { provider: provider.name, healthy: false, error: e.message };
      }
    })
  );

  return {
    providers: results.map(r => r.status === 'fulfilled' ? r.value : { healthy: false }),
    allHealthy: results.every(r => r.status === 'fulfilled' && r.value.healthy),
  };
}
```

**Recovery**:
- Fall back to backup auth method
- Allow password login temporarily
- Clear session and retry

**Prevention**:
- Multiple SSO providers
- Fallback authentication
- SSO provider monitoring

---

### 8.4 Email Delivery Failure

**Trigger**: SMTP error, spam filter, invalid address.

**Symptoms**:
- Verification emails not received
- Password reset fails
- User thinks system broken

**Detection**:
```typescript
interface EmailDelivery {
  id: string;
  to: string;
  template: string;
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'complained';
  provider: string;
  providerMessageId?: string;
  error?: string;
}

// Track delivery via webhooks
async function handleEmailWebhook(event: EmailEvent): Promise<void> {
  const delivery = await findDelivery(event.messageId);

  if (event.type === 'bounce') {
    delivery.status = 'bounced';
    await markAddressInvalid(delivery.to);
    await notifyEmailBounce(delivery);
  }

  if (event.type === 'complaint') {
    delivery.status = 'complained';
    await addToSuppression(delivery.to);
  }

  await updateDelivery(delivery);
}
```

**Recovery**:
- Retry with different provider
- Use alternative contact method
- Manual intervention for important emails

**Prevention**:
- Email validation on input
- Bounce handling
- Multiple email providers

---

### 8.5 Storage Provider Quota Exceeded

**Trigger**: Hit storage limit, unexpected growth.

**Symptoms**:
- Uploads fail
- 507 Insufficient Storage
- Write operations blocked

**Detection**:
```typescript
interface StorageQuota {
  provider: string;
  used: number;
  limit: number;
  usagePercent: number;
}

async function checkStorageQuota(): Promise<StorageQuota[]> {
  const quotas: StorageQuota[] = [];

  for (const provider of storageProviders) {
    const quota = await provider.getQuota();
    quotas.push({
      provider: provider.name,
      used: quota.used,
      limit: quota.limit,
      usagePercent: (quota.used / quota.limit) * 100,
    });

    if (quota.usagePercent > 80) {
      await alert({
        severity: quota.usagePercent > 95 ? 'critical' : 'warning',
        message: `Storage quota at ${quota.usagePercent.toFixed(1)}%`,
        provider: provider.name,
      });
    }
  }

  return quotas;
}
```

**Recovery**:
- Clean up unused data
- Request quota increase
- Use alternative storage

**Prevention**:
- Quota monitoring
- Proactive cleanup
- Growth forecasting

---

## Summary

This document covers 40+ edge cases and failure modes across 8 categories:

1. **Storage Failures** (5 scenarios)
2. **Network Failures** (5 scenarios)
3. **Concurrency Issues** (5 scenarios)
4. **Video Processing Failures** (5 scenarios)
5. **Authentication & Authorization Failures** (5 scenarios)
6. **Deployment Failures** (5 scenarios)
7. **Data Consistency Issues** (5 scenarios)
8. **Integration Failures** (5 scenarios)

Each scenario includes detection mechanisms, recovery procedures, and prevention strategies. Use this document as a reference during implementation and testing.

## Related Documents

- [Known Issues and Solutions](./known-issues-and-solutions.md)
- [Implementation Safety Checklist](./implementation-safety-checklist.md)
- [High Availability Architecture](./high-availability.md)
- [Security Architecture](./security.md)
