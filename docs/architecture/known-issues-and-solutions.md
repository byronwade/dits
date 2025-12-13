# Known Issues, Edge Cases, and Solutions

> Comprehensive analysis of potential problems identified across the Dits documentation, with recommended solutions and implementation priorities.

## Executive Summary

This document consolidates findings from a systematic review of all 89 documentation files in the Dits project. We identified **115 potential issues** across 6 categories:

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Storage & Data Integrity | 3 | 4 | 7 | 2 | 16 |
| Network & Protocol | 3 | 4 | 5 | 0 | 12 |
| Security & Authentication | 4 | 8 | 8 | 5 | 25 |
| Video & Media Handling | 4 | 6 | 8 | 6 | 24 |
| Concurrency & Locking | 3 | 5 | 8 | 2 | 18 |
| Operations & Deployment | 4 | 4 | 6 | 6 | 20 |
| **Total** | **21** | **31** | **42** | **21** | **115** |

---

## Category 1: Storage & Data Integrity

### CRITICAL Issues

#### STOR-C1: Missing Checksum Verification on Read

**Problem**: The documentation specifies BLAKE3 hashing for content addressing but doesn't mandate verification when chunks are read back from storage.

**Impact**: Silent data corruption could propagate through the system undetected. A corrupted chunk could be served to multiple clients, replicated across regions, and eventually cause video playback failures or data loss.

**Solution**:
```rust
// MANDATORY: Verify on every read
pub async fn read_chunk(hash: &Blake3Hash) -> Result<Chunk, StorageError> {
    let data = storage.get(hash).await?;

    // Always verify
    let computed_hash = blake3::hash(&data);
    if computed_hash != *hash {
        // Log corruption event
        metrics::increment_counter!("storage.corruption_detected");

        // Attempt recovery from replicas
        return recover_from_replicas(hash).await;
    }

    Ok(Chunk::new(data))
}
```

**Implementation Priority**: P0 - Must be implemented before any production use.

---

#### STOR-C2: Race Condition in Chunk Reference Counting

**Problem**: Reference counting for garbage collection isn't atomic across the increment/decrement operations when multiple operations reference the same chunk simultaneously.

**Impact**: Chunks could be garbage collected while still referenced (data loss) or never collected (storage leak). In a multi-user environment with shared assets, this is almost certain to occur.

**Solution**:
```sql
-- Use PostgreSQL advisory locks for atomic ref counting
CREATE OR REPLACE FUNCTION adjust_chunk_refs(
    p_chunk_hash BYTEA,
    p_delta INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Acquire advisory lock on chunk hash
    PERFORM pg_advisory_xact_lock(hashtext(encode(p_chunk_hash, 'hex')));

    UPDATE chunk_refs
    SET ref_count = ref_count + p_delta,
        updated_at = NOW()
    WHERE chunk_hash = p_chunk_hash
    RETURNING ref_count INTO v_new_count;

    IF NOT FOUND THEN
        IF p_delta > 0 THEN
            INSERT INTO chunk_refs (chunk_hash, ref_count)
            VALUES (p_chunk_hash, p_delta)
            RETURNING ref_count INTO v_new_count;
        ELSE
            RAISE EXCEPTION 'Cannot decrement non-existent ref';
        END IF;
    END IF;

    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql;
```

**Implementation Priority**: P0 - Critical for data integrity.

---

#### STOR-C3: No Atomic Multi-Step Transaction Guarantees

**Problem**: Operations like "upload manifest + update refs + increment chunk refs" span multiple storage systems (S3 + PostgreSQL) without distributed transaction support.

**Impact**: Partial failures leave the system in inconsistent states. A crash between writing the manifest and updating refs creates orphaned data or dangling references.

**Solution**: Implement a saga pattern with compensation:

```typescript
interface SagaStep<T> {
  execute(): Promise<T>;
  compensate(result: T): Promise<void>;
}

class CommitSaga {
  private completedSteps: Array<{ step: SagaStep<any>; result: any }> = [];

  async execute(steps: SagaStep<any>[]): Promise<void> {
    try {
      for (const step of steps) {
        const result = await step.execute();
        this.completedSteps.push({ step, result });
      }
    } catch (error) {
      // Compensate in reverse order
      for (const { step, result } of this.completedSteps.reverse()) {
        try {
          await step.compensate(result);
        } catch (compensateError) {
          // Log for manual intervention
          logger.error('Compensation failed', { step, compensateError });
          await this.createIncidentTicket(step, compensateError);
        }
      }
      throw error;
    }
  }
}

// Usage for commit operation
const commitSaga = new CommitSaga();
await commitSaga.execute([
  {
    execute: () => uploadManifest(manifest),
    compensate: (key) => deleteObject(key),
  },
  {
    execute: () => incrementChunkRefs(chunkHashes),
    compensate: (hashes) => decrementChunkRefs(hashes),
  },
  {
    execute: () => updateRef(branch, commitHash),
    compensate: (prevHash) => updateRef(branch, prevHash),
  },
]);
```

**Implementation Priority**: P0 - Required for consistency.

---

### HIGH Priority Issues

#### STOR-H1: Storage Tier Migration During Active Access

**Problem**: Moving chunks between hot/warm/cold storage tiers while they're being accessed could cause read failures or serve stale data.

**Solution**:
```typescript
class TierMigration {
  async migrateChunk(hash: string, fromTier: Tier, toTier: Tier): Promise<void> {
    // 1. Copy to destination first (don't delete source)
    await toTier.write(hash, await fromTier.read(hash));

    // 2. Update routing atomically
    await this.updateRouting(hash, toTier, {
      fallback: fromTier,
      ttl: '5m' // Keep fallback active for in-flight requests
    });

    // 3. Wait for in-flight requests to complete
    await this.waitForQuiescence(hash);

    // 4. Delete from source
    await fromTier.delete(hash);

    // 5. Remove fallback routing
    await this.updateRouting(hash, toTier, { fallback: null });
  }
}
```

---

#### STOR-H2: Incomplete Garbage Collection Cycle Recovery

**Problem**: If GC crashes mid-cycle, the documentation doesn't specify how to resume safely without re-scanning everything.

**Solution**:
```sql
-- GC checkpoint table
CREATE TABLE gc_checkpoints (
  cycle_id UUID PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  phase VARCHAR(50) NOT NULL, -- 'mark', 'sweep', 'compact'
  last_processed_key TEXT,
  chunks_marked INTEGER DEFAULT 0,
  chunks_swept INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'running'
);

-- On startup, check for incomplete cycles
SELECT * FROM gc_checkpoints
WHERE status = 'running'
ORDER BY started_at DESC
LIMIT 1;

-- Resume from checkpoint
```

---

#### STOR-H3: No Handling for Storage Backend Inconsistencies

**Problem**: If S3 returns success but data isn't actually persisted (rare but possible with eventual consistency), no verification step catches this.

**Solution**: Implement read-after-write verification for critical objects:

```typescript
async function writeWithVerification(
  key: string,
  data: Buffer,
  options: { critical: boolean }
): Promise<void> {
  await s3.putObject({ Key: key, Body: data });

  if (options.critical) {
    // Wait for consistency
    await sleep(100);

    // Verify write
    const readBack = await s3.getObject({ Key: key });
    const readHash = blake3(readBack.Body);
    const expectedHash = blake3(data);

    if (readHash !== expectedHash) {
      throw new StorageConsistencyError(key);
    }
  }
}
```

---

#### STOR-H4: Chunk Size Variance Impact on Deduplication

**Problem**: FastCDC parameters affect deduplication ratios, but there's no guidance on tuning for video content patterns.

**Solution**: Add adaptive chunking based on content analysis:

```typescript
interface ChunkingProfile {
  minSize: number;
  avgSize: number;
  maxSize: number;
  hashBits: number;
}

const PROFILES: Record<string, ChunkingProfile> = {
  'video/high-motion': { minSize: 256*1024, avgSize: 1*1024*1024, maxSize: 4*1024*1024, hashBits: 20 },
  'video/static': { minSize: 512*1024, avgSize: 2*1024*1024, maxSize: 8*1024*1024, hashBits: 21 },
  'video/mixed': { minSize: 384*1024, avgSize: 1.5*1024*1024, maxSize: 6*1024*1024, hashBits: 20 },
};

function selectProfile(videoMetadata: VideoMetadata): ChunkingProfile {
  const motionScore = analyzeMotionComplexity(videoMetadata);
  if (motionScore > 0.7) return PROFILES['video/high-motion'];
  if (motionScore < 0.3) return PROFILES['video/static'];
  return PROFILES['video/mixed'];
}
```

---

### MEDIUM Priority Issues

#### STOR-M1: Index File Corruption Recovery

**Problem**: Binary index format corruption could make the entire staging area unreadable.

**Solution**: Implement index file journaling and recovery:

```rust
struct IndexJournal {
    entries: Vec<JournalEntry>,
    checkpoint_hash: Blake3Hash,
}

impl Index {
    fn write_with_journal(&self, path: &Path) -> io::Result<()> {
        let journal_path = path.with_extension("journal");

        // Write journal first
        let journal = self.create_journal();
        journal.write(&journal_path)?;

        // Write new index
        let temp_path = path.with_extension("tmp");
        self.write(&temp_path)?;

        // Atomic rename
        fs::rename(&temp_path, path)?;

        // Remove journal
        fs::remove_file(&journal_path)?;

        Ok(())
    }

    fn recover(path: &Path) -> io::Result<Self> {
        let journal_path = path.with_extension("journal");

        if journal_path.exists() {
            // Recover from journal
            let journal = IndexJournal::read(&journal_path)?;
            return Self::rebuild_from_journal(journal);
        }

        Self::read(path)
    }
}
```

---

#### STOR-M2: Object Store Path Length Limits

**Problem**: S3 key length limit is 1024 bytes. Deeply nested repository structures could exceed this.

**Solution**:
```typescript
function generateStorageKey(repoId: string, objectType: string, hash: string): string {
  // Use hash-based distribution instead of paths
  const prefix = hash.substring(0, 2);
  const key = `${repoId}/${objectType}/${prefix}/${hash}`;

  if (key.length > 900) { // Leave margin
    // Fall back to hashed key with metadata lookup
    const shortKey = blake3(`${repoId}/${objectType}/${hash}`).substring(0, 64);
    return `${repoId}/_hashed/${shortKey}`;
  }

  return key;
}
```

---

#### STOR-M3: Large Directory Handling

**Problem**: A directory with 100,000+ files would create an enormous tree object.

**Solution**: Implement tree sharding:

```typescript
interface ShardedTree {
  type: 'sharded-tree';
  shardBits: number; // e.g., 8 = 256 shards
  shards: Map<string, TreeShard>;
}

function shardTree(entries: TreeEntry[], threshold: number = 10000): Tree | ShardedTree {
  if (entries.length < threshold) {
    return { type: 'tree', entries };
  }

  // Shard by first byte of entry name hash
  const shards = new Map<string, TreeEntry[]>();
  for (const entry of entries) {
    const shardKey = blake3(entry.name).substring(0, 2);
    if (!shards.has(shardKey)) shards.set(shardKey, []);
    shards.get(shardKey)!.push(entry);
  }

  return {
    type: 'sharded-tree',
    shardBits: 8,
    shards: new Map([...shards.entries()].map(([k, v]) => [k, { entries: v }])),
  };
}
```

---

#### STOR-M4-M7: Additional Medium Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| STOR-M4 | Reflog rotation edge cases | Implement atomic rotation with crash recovery |
| STOR-M5 | Pack file index corruption | Add redundant index with checksums |
| STOR-M6 | Sparse checkout state persistence | Store sparse patterns in dedicated config |
| STOR-M7 | Shallow clone depth tracking | Track depth in commit metadata |

---

### LOW Priority Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| STOR-L1 | Object type magic byte collisions | Use 4-byte magic instead of 1-byte |
| STOR-L2 | Cache database lock contention | Use WAL mode with busy timeout |

---

## Category 2: Network & Protocol

### CRITICAL Issues

#### NET-C1: Network Partition Detection and Handling

**Problem**: The documentation doesn't specify how to detect network partitions or handle split-brain scenarios between regions.

**Impact**: Two regions could accept conflicting writes during a partition, leading to data divergence that's difficult or impossible to reconcile.

**Solution**:
```typescript
class PartitionDetector {
  private readonly quorumSize: number;
  private readonly heartbeatInterval = 1000; // ms
  private readonly failureThreshold = 3;

  constructor(private regions: Region[]) {
    this.quorumSize = Math.floor(regions.length / 2) + 1;
  }

  async checkQuorum(): Promise<QuorumStatus> {
    const results = await Promise.allSettled(
      this.regions.map(r => this.heartbeat(r))
    );

    const reachable = results.filter(r => r.status === 'fulfilled').length;

    if (reachable >= this.quorumSize) {
      return { status: 'healthy', reachable, required: this.quorumSize };
    }

    // Partition detected
    return {
      status: 'partitioned',
      reachable,
      required: this.quorumSize,
      action: reachable === 0 ? 'read-only' : 'degraded'
    };
  }

  async enterSafeMode(): Promise<void> {
    // Reject writes, allow reads
    await this.setWriteMode('reject');

    // Start leader election if we're in majority partition
    if (await this.inMajorityPartition()) {
      await this.electLeader();
    }
  }
}
```

---

#### NET-C2: QUIC Connection Recovery After Network Change

**Problem**: When a client's network changes (WiFi to cellular), QUIC connection migration may fail silently, leaving operations hanging.

**Impact**: Users experience frozen uploads/downloads when switching networks, requiring manual intervention.

**Solution**:
```typescript
class ResilientQuicConnection {
  private connectionId: string;
  private migrationInProgress = false;

  async onNetworkChange(newNetwork: NetworkInfo): Promise<void> {
    if (this.migrationInProgress) return;
    this.migrationInProgress = true;

    try {
      // Attempt QUIC connection migration
      const migrated = await this.migrateConnection(newNetwork);

      if (!migrated) {
        // Fall back to new connection
        await this.reconnect(newNetwork);
      }

      // Resume pending operations
      await this.resumePendingOperations();
    } finally {
      this.migrationInProgress = false;
    }
  }

  private async reconnect(network: NetworkInfo): Promise<void> {
    // Save operation state
    const pendingOps = this.getPendingOperations();

    // Close old connection gracefully
    await this.close();

    // Exponential backoff reconnection
    let attempt = 0;
    while (attempt < 5) {
      try {
        await this.connect(network);

        // Restore pending operations
        for (const op of pendingOps) {
          this.queueOperation(op);
        }
        return;
      } catch (e) {
        await sleep(Math.pow(2, attempt) * 1000);
        attempt++;
      }
    }

    throw new ConnectionFailedError('Unable to reconnect after network change');
  }
}
```

---

#### NET-C3: Split-Brain Prevention in Multi-Region Setup

**Problem**: No fencing mechanism prevents a minority partition from accepting writes.

**Solution**: Implement distributed fencing with tokens:

```typescript
interface FencingToken {
  epoch: number;
  holder: string;
  signature: string;
  expiresAt: Date;
}

class FencedWriter {
  async write(data: any, token: FencingToken): Promise<void> {
    // Verify token is still valid
    const currentEpoch = await this.getEpoch();
    if (token.epoch < currentEpoch) {
      throw new FencingError('Token epoch is stale');
    }

    // Include token in write for server-side verification
    await this.storage.write({
      data,
      fencingToken: token,
    });
  }

  async acquireToken(): Promise<FencingToken> {
    // Must get consensus from majority
    const responses = await this.requestTokenFromQuorum();

    if (responses.approved < this.quorumSize) {
      throw new FencingError('Could not acquire fencing token');
    }

    return responses.token;
  }
}
```

---

### HIGH Priority Issues

#### NET-H1: Connection Pool Exhaustion Under Load

**Problem**: No documentation on connection pool sizing or exhaustion handling.

**Solution**:
```typescript
class AdaptiveConnectionPool {
  private minConnections = 5;
  private maxConnections = 100;
  private currentConnections = 0;
  private waitQueue: Array<(conn: Connection) => void> = [];

  async acquire(): Promise<Connection> {
    // Try to get existing connection
    const conn = this.tryAcquire();
    if (conn) return conn;

    // Try to create new connection
    if (this.currentConnections < this.maxConnections) {
      return this.createConnection();
    }

    // Wait with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.waitQueue.indexOf(resolve);
        if (idx >= 0) this.waitQueue.splice(idx, 1);
        reject(new PoolExhaustedError());
      }, 30000);

      this.waitQueue.push((conn) => {
        clearTimeout(timeout);
        resolve(conn);
      });
    });
  }

  // Auto-scale based on usage patterns
  private async autoScale(): Promise<void> {
    const usage = this.currentConnections / this.maxConnections;
    const avgWaitTime = this.getAverageWaitTime();

    if (usage > 0.8 && avgWaitTime > 100) {
      this.maxConnections = Math.min(this.maxConnections * 1.5, 500);
    } else if (usage < 0.3 && avgWaitTime < 10) {
      this.maxConnections = Math.max(this.maxConnections * 0.75, this.minConnections);
    }
  }
}
```

---

#### NET-H2: Retry Logic Without Idempotency Keys

**Problem**: Retrying failed requests could cause duplicate operations (double commits, double uploads).

**Solution**:
```typescript
interface IdempotentRequest {
  idempotencyKey: string;
  operation: string;
  payload: any;
  createdAt: Date;
}

class IdempotentClient {
  async execute<T>(operation: string, payload: any): Promise<T> {
    const key = this.generateKey(operation, payload);

    // Check for existing result
    const cached = await this.cache.get(key);
    if (cached) {
      if (cached.status === 'completed') return cached.result;
      if (cached.status === 'in-progress') {
        return this.waitForCompletion(key);
      }
    }

    // Mark as in-progress
    await this.cache.set(key, { status: 'in-progress', startedAt: new Date() });

    try {
      const result = await this.client.execute(operation, payload, { idempotencyKey: key });
      await this.cache.set(key, { status: 'completed', result, completedAt: new Date() });
      return result;
    } catch (e) {
      await this.cache.set(key, { status: 'failed', error: e, failedAt: new Date() });
      throw e;
    }
  }

  private generateKey(operation: string, payload: any): string {
    return blake3(`${operation}:${JSON.stringify(payload)}`).substring(0, 32);
  }
}
```

---

#### NET-H3: WebSocket Reconnection State Management

**Problem**: When WebSocket reconnects, there's no specification for state synchronization.

**Solution**:
```typescript
class StatefulWebSocket {
  private lastEventId: string | null = null;
  private pendingAcks = new Map<string, EventData>();

  async reconnect(): Promise<void> {
    const ws = await this.connect();

    // Request events since last known
    if (this.lastEventId) {
      ws.send(JSON.stringify({
        type: 'replay',
        since: this.lastEventId,
      }));
    }

    // Resend unacknowledged events
    for (const [id, event] of this.pendingAcks) {
      ws.send(JSON.stringify({
        type: 'retry',
        eventId: id,
        event,
      }));
    }
  }

  onMessage(msg: Message): void {
    if (msg.type === 'event') {
      this.lastEventId = msg.eventId;
      this.emit('event', msg.data);
    } else if (msg.type === 'ack') {
      this.pendingAcks.delete(msg.eventId);
    }
  }
}
```

---

#### NET-H4: Bandwidth Estimation Accuracy

**Problem**: Initial bandwidth estimates could be wildly inaccurate, causing poor chunk scheduling.

**Solution**: Use TCP-style slow start with rapid adaptation:

```typescript
class BandwidthEstimator {
  private samples: number[] = [];
  private ewma: number = 0;
  private ewmaVariance: number = 0;
  private alpha = 0.125; // EWMA smoothing factor

  addSample(bytesPerSecond: number): void {
    this.samples.push(bytesPerSecond);
    if (this.samples.length > 100) this.samples.shift();

    // Update EWMA
    const error = bytesPerSecond - this.ewma;
    this.ewma += this.alpha * error;
    this.ewmaVariance = (1 - this.alpha) * (this.ewmaVariance + this.alpha * error * error);
  }

  getEstimate(): { bandwidth: number; confidence: number } {
    if (this.samples.length < 3) {
      return { bandwidth: 1_000_000, confidence: 0.1 }; // Conservative 1 MB/s default
    }

    const stdDev = Math.sqrt(this.ewmaVariance);
    const confidence = Math.max(0, 1 - (stdDev / this.ewma));

    return { bandwidth: this.ewma, confidence };
  }
}
```

---

### MEDIUM Priority Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| NET-M1 | DNS resolution caching issues | Use TTL-aware resolver with negative caching |
| NET-M2 | TLS certificate rotation handling | Implement certificate pinning with backup pins |
| NET-M3 | Protocol version negotiation | Add version handshake with capability flags |
| NET-M4 | Request timeout granularity | Different timeouts for different operation types |
| NET-M5 | Proxy/firewall compatibility | Add HTTP/2 fallback for QUIC-blocked networks |

---

## Category 3: Security & Authentication

### CRITICAL Issues

#### SEC-C1: Convergent Encryption Confirmation Attacks

**Problem**: Convergent encryption enables attackers to confirm presence of specific files by uploading the same content and checking for deduplication.

**Impact**: Attackers can verify if specific videos (leaked content, copyrighted material) exist in the system, violating user privacy.

**Solution**: Implement per-repository salt to prevent cross-user deduplication attacks:

```typescript
interface EncryptionContext {
  repoSalt: Buffer; // Unique per repository, stored in repo metadata
  userKey: Buffer;  // Derived from user password
}

function deriveChunkKey(chunk: Buffer, ctx: EncryptionContext): Buffer {
  // Include repo salt to prevent cross-repo confirmation
  return hkdf({
    ikm: ctx.userKey,
    salt: ctx.repoSalt,
    info: Buffer.concat([
      Buffer.from('chunk-encryption'),
      blake3(chunk),
    ]),
    length: 32,
  });
}
```

**Trade-off**: This sacrifices global deduplication for security. Document this clearly:

```
Deduplication scope options:
1. Global (cross-user): Maximum storage efficiency, vulnerable to confirmation attacks
2. Per-organization: Good efficiency within org, isolated between orgs
3. Per-repository: Minimal cross-exposure, reduced efficiency
4. None: Maximum security, maximum storage cost
```

---

#### SEC-C2: Deterministic Nonce Derivation Breaks AEAD Security

**Problem**: If nonces are derived deterministically from content hash, using the same key with the same nonce twice breaks authenticated encryption security guarantees.

**Impact**: Catastrophic. Key-nonce reuse can enable plaintext recovery.

**Solution**: Use content-hash plus random component:

```typescript
function generateNonce(contentHash: Buffer, random: Buffer): Buffer {
  // 12-byte nonce for AES-GCM
  // First 8 bytes from content hash (for cache-friendliness)
  // Last 4 bytes random (for security)
  return Buffer.concat([
    contentHash.subarray(0, 8),
    random.subarray(0, 4), // cryptographically random
  ]);
}

// Store nonce with encrypted chunk
interface EncryptedChunk {
  ciphertext: Buffer;
  nonce: Buffer; // Must be stored, not derived
  tag: Buffer;
}
```

---

#### SEC-C3: Master Key Protection Weaknesses

**Problem**: Documentation mentions master key but doesn't specify secure storage, rotation, or access logging.

**Impact**: Master key compromise means all encrypted data is compromised.

**Solution**:

```typescript
// 1. HSM-backed key storage in production
interface KeyStorage {
  // AWS KMS, Azure Key Vault, HashiCorp Vault, etc.
  generateKey(params: KeyGenParams): Promise<KeyId>;
  encrypt(keyId: KeyId, plaintext: Buffer): Promise<Buffer>;
  decrypt(keyId: KeyId, ciphertext: Buffer): Promise<Buffer>;

  // Audit logging
  getAccessLog(keyId: KeyId, since: Date): Promise<AccessLogEntry[]>;
}

// 2. Key hierarchy
interface KeyHierarchy {
  masterKey: KeyId;        // In HSM, never exported
  regionKeys: KeyId[];     // Encrypted by master, rotated monthly
  repoKeys: KeyId[];       // Encrypted by region, rotated on schedule
  chunkKeys: Buffer[];     // Derived per-chunk, ephemeral
}

// 3. Automatic rotation
async function rotateKey(keyId: KeyId, hierarchy: KeyHierarchy): Promise<void> {
  const newKey = await keyStorage.generateKey({ purpose: 'rotation' });

  // Re-encrypt all child keys with new key
  for (const childKeyId of hierarchy.getChildren(keyId)) {
    const childPlaintext = await keyStorage.decrypt(keyId, childKeyId);
    const newChildCiphertext = await keyStorage.encrypt(newKey, childPlaintext);
    await hierarchy.updateChild(childKeyId, newChildCiphertext);
  }

  // Mark old key for destruction after grace period
  await keyStorage.scheduleDestruction(keyId, { after: '30d' });
}
```

---

#### SEC-C4: Recovery Key Vulnerabilities

**Problem**: Shamir secret sharing for recovery doesn't specify share distribution, verification, or refresh.

**Solution**:

```typescript
interface RecoveryKeySystem {
  // Generate shares with proactive refresh capability
  generateShares(
    secret: Buffer,
    threshold: number,
    totalShares: number
  ): Share[];

  // Verify shares without reconstructing
  verifyShare(share: Share, commitment: Commitment): boolean;

  // Refresh shares (re-randomize without changing secret)
  refreshShares(shares: Share[], threshold: number): Share[];
}

// Implementation using Feldman VSS for verifiability
class FeldmanVSS {
  private readonly prime: bigint;
  private readonly generator: bigint;

  generateShares(secret: Buffer, k: number, n: number): VerifiableShare[] {
    const coefficients = [
      BigInt(`0x${secret.toString('hex')}`),
      ...Array(k - 1).fill(0).map(() => randomBigInt(this.prime)),
    ];

    // Public commitments for verification
    const commitments = coefficients.map(c =>
      modPow(this.generator, c, this.prime)
    );

    // Generate shares
    const shares: VerifiableShare[] = [];
    for (let i = 1; i <= n; i++) {
      const x = BigInt(i);
      let y = 0n;
      for (let j = 0; j < k; j++) {
        y += coefficients[j] * modPow(x, BigInt(j), this.prime);
        y %= this.prime;
      }
      shares.push({ x, y, commitments });
    }

    return shares;
  }

  verify(share: VerifiableShare): boolean {
    const { x, y, commitments } = share;
    let expected = 1n;
    for (let j = 0; j < commitments.length; j++) {
      expected *= modPow(commitments[j], modPow(x, BigInt(j), this.prime), this.prime);
      expected %= this.prime;
    }
    return modPow(this.generator, y, this.prime) === expected;
  }
}
```

---

### HIGH Priority Issues

#### SEC-H1: JWT Token Refresh Race Conditions

**Problem**: Multiple tabs/clients refreshing simultaneously could invalidate each other's tokens.

**Solution**:
```typescript
class TokenRefreshCoordinator {
  private refreshPromise: Promise<TokenPair> | null = null;
  private readonly refreshLock = new AsyncLock();

  async getValidToken(): Promise<string> {
    const token = this.getCurrentToken();

    if (this.isValid(token)) {
      return token.accessToken;
    }

    // Coordinate refresh across tabs using BroadcastChannel
    return this.refreshLock.acquire(async () => {
      // Double-check after acquiring lock
      const recheck = this.getCurrentToken();
      if (this.isValid(recheck)) {
        return recheck.accessToken;
      }

      // Actually refresh
      const newTokens = await this.refresh(recheck.refreshToken);
      this.setTokens(newTokens);

      // Broadcast to other tabs
      this.broadcastChannel.postMessage({
        type: 'token-refresh',
        tokens: newTokens,
      });

      return newTokens.accessToken;
    });
  }
}
```

---

#### SEC-H2: OAuth State Parameter Validation

**Problem**: CSRF protection via OAuth state parameter isn't specified.

**Solution**:
```typescript
interface OAuthFlow {
  startAuth(provider: string): AuthStartResult;
  handleCallback(params: CallbackParams): Promise<TokenPair>;
}

class SecureOAuthFlow implements OAuthFlow {
  startAuth(provider: string): AuthStartResult {
    // Generate cryptographically random state
    const state = crypto.randomBytes(32).toString('base64url');

    // Include binding to browser session
    const nonce = crypto.randomBytes(16).toString('base64url');
    const codeverifier = crypto.randomBytes(32).toString('base64url');

    // Store securely (HttpOnly cookie or server-side)
    this.stateStore.set(state, {
      provider,
      codeVerifier,
      nonce,
      createdAt: Date.now(),
      browserFingerprint: this.getBrowserFingerprint(),
    });

    return {
      authUrl: this.buildAuthUrl(provider, state, codeVerifier),
      state,
    };
  }

  async handleCallback(params: CallbackParams): Promise<TokenPair> {
    const stored = this.stateStore.get(params.state);

    if (!stored) {
      throw new SecurityError('Invalid OAuth state');
    }

    if (Date.now() - stored.createdAt > 600000) { // 10 min expiry
      throw new SecurityError('OAuth state expired');
    }

    if (stored.browserFingerprint !== this.getBrowserFingerprint()) {
      throw new SecurityError('Browser fingerprint mismatch');
    }

    // Exchange code for tokens with PKCE
    return this.exchangeCode(params.code, stored.codeVerifier);
  }
}
```

---

#### SEC-H3-H8: Additional High Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| SEC-H3 | API key rotation during active use | Use key versioning, accept both during rotation window |
| SEC-H4 | Rate limiting bypass via distributed IPs | Add fingerprinting + account-level limits |
| SEC-H5 | Webhook signature timing attacks | Use constant-time comparison |
| SEC-H6 | MFA recovery codes storage | Hash with Argon2id, rate-limit attempts |
| SEC-H7 | Session fixation after auth | Regenerate session ID on privilege changes |
| SEC-H8 | Certificate pinning update mechanism | Include backup pins, support remote config |

---

### MEDIUM Priority Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| SEC-M1 | Password reset token entropy | Use 256-bit tokens, 15-min expiry |
| SEC-M2 | Account enumeration via timing | Constant-time responses for auth failures |
| SEC-M3 | Audit log tampering | Append-only with cryptographic chaining |
| SEC-M4 | Cross-tenant data isolation | Row-level security + tenant context validation |
| SEC-M5 | API versioning security | Separate auth for deprecated versions |
| SEC-M6 | Debug endpoints in production | Compile-time removal, auth if needed |
| SEC-M7 | Dependency vulnerability scanning | Automated CI/CD checks, block on critical |
| SEC-M8 | Secrets in error messages | Sanitize all error outputs |

---

### LOW Priority Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| SEC-L1 | User-agent logging privacy | Hash or truncate |
| SEC-L2 | Referrer header leakage | Add referrer-policy headers |
| SEC-L3 | CORS configuration exposure | Minimize allowed origins |
| SEC-L4 | Security headers completeness | Add CSP, HSTS, X-Frame-Options |
| SEC-L5 | Cookie security attributes | SameSite=Strict, Secure, HttpOnly |

---

## Category 4: Video & Media Handling

### CRITICAL Issues

#### VID-C1: Corrupted ISOBMFF File Handling

**Problem**: No specification for handling corrupted MP4/MOV files that have partial box structures or invalid offsets.

**Impact**: Crashes during parsing could leave operations incomplete, corrupted uploads could waste bandwidth.

**Solution**:
```rust
pub struct RobustIsoParser {
    strict_mode: bool,
    recovery_enabled: bool,
}

impl RobustIsoParser {
    pub fn parse(&self, reader: &mut impl Read) -> ParseResult {
        let mut boxes = Vec::new();
        let mut errors = Vec::new();

        loop {
            match self.parse_box(reader) {
                Ok(Some(box_)) => boxes.push(box_),
                Ok(None) => break, // EOF
                Err(e) if self.recovery_enabled => {
                    errors.push(e);
                    // Try to recover by scanning for next valid box
                    if !self.scan_to_next_box(reader) {
                        break;
                    }
                }
                Err(e) => return ParseResult::Failed(e),
            }
        }

        if errors.is_empty() {
            ParseResult::Success(boxes)
        } else {
            ParseResult::Partial { boxes, errors }
        }
    }

    fn scan_to_next_box(&self, reader: &mut impl Read) -> bool {
        // Scan for known box type signatures
        const BOX_TYPES: &[&[u8; 4]] = &[
            b"ftyp", b"moov", b"mdat", b"moof", b"free",
            b"skip", b"meta", b"uuid", b"pdin",
        ];

        let mut buf = [0u8; 4096];
        while let Ok(n) = reader.read(&mut buf) {
            if n == 0 { return false; }
            for i in 0..n-3 {
                if BOX_TYPES.iter().any(|t| &buf[i..i+4] == *t) {
                    // Found potential box, seek back
                    reader.seek(SeekFrom::Current(-(n as i64 - i as i64 + 4)))?;
                    return true;
                }
            }
        }
        false
    }
}
```

---

#### VID-C2: Silent Keyframe Table Failures

**Problem**: If keyframe extraction fails, there's no fallback behavior specified—could cause chunking to ignore keyframe boundaries entirely.

**Impact**: Poor chunk boundaries lead to inefficient deduplication and expensive random access.

**Solution**:
```typescript
interface KeyframeResult {
  keyframes: number[];
  source: 'index' | 'scan' | 'estimated' | 'none';
  confidence: number;
}

async function extractKeyframes(file: VideoFile): Promise<KeyframeResult> {
  // Strategy 1: Try stss/stsc atoms from index
  try {
    const fromIndex = await extractFromIndex(file);
    if (fromIndex.length > 0) {
      return { keyframes: fromIndex, source: 'index', confidence: 1.0 };
    }
  } catch (e) {
    logger.warn('Index keyframe extraction failed', { error: e });
  }

  // Strategy 2: Scan for sync samples
  try {
    const fromScan = await scanForSyncSamples(file, { timeout: 30000 });
    if (fromScan.length > 0) {
      return { keyframes: fromScan, source: 'scan', confidence: 0.9 };
    }
  } catch (e) {
    logger.warn('Sync sample scan failed', { error: e });
  }

  // Strategy 3: Estimate based on codec/GOP
  const estimated = estimateKeyframes(file.metadata);
  if (estimated.length > 0) {
    return { keyframes: estimated, source: 'estimated', confidence: 0.5 };
  }

  // Strategy 4: Fall back to no keyframe awareness
  logger.error('All keyframe extraction methods failed', { file: file.path });
  return { keyframes: [], source: 'none', confidence: 0 };
}
```

---

#### VID-C3: fragmented MP4 Offset Patching

**Problem**: fMP4 segment serving requires patching moof/mdat offsets, but the documentation doesn't address byte range request handling.

**Impact**: Byte-range requests would return incorrect data, breaking streaming playback.

**Solution**:
```typescript
class FragmentedMp4Server {
  async serveFragment(
    fragmentId: string,
    byteRange?: { start: number; end: number }
  ): Promise<Response> {
    const fragment = await this.getFragment(fragmentId);

    // Get base offset for this fragment in virtual file
    const virtualOffset = await this.getVirtualOffset(fragmentId);

    // Patch moof box with correct offsets
    const patched = this.patchMoof(fragment, virtualOffset);

    if (byteRange) {
      // Map virtual byte range to actual data
      const actualRange = this.mapByteRange(
        byteRange,
        virtualOffset,
        patched.length
      );

      return new Response(
        patched.subarray(actualRange.start, actualRange.end + 1),
        {
          status: 206,
          headers: {
            'Content-Range': `bytes ${byteRange.start}-${byteRange.end}/${this.totalVirtualSize}`,
            'Accept-Ranges': 'bytes',
          },
        }
      );
    }

    return new Response(patched);
  }

  private patchMoof(data: Buffer, virtualOffset: number): Buffer {
    const result = Buffer.from(data);

    // Find and patch trun box's data_offset
    let pos = 0;
    while (pos < result.length - 8) {
      const boxSize = result.readUInt32BE(pos);
      const boxType = result.toString('ascii', pos + 4, pos + 8);

      if (boxType === 'trun') {
        const flags = result.readUInt32BE(pos + 8) & 0xFFFFFF;
        if (flags & 0x000001) { // data-offset-present
          const currentOffset = result.readUInt32BE(pos + 16);
          result.writeUInt32BE(currentOffset + virtualOffset, pos + 16);
        }
      }

      pos += boxSize;
      if (boxSize === 0) break;
    }

    return result;
  }
}
```

---

#### VID-C4: NLE Project Parsing Depth Limits

**Problem**: Deeply nested timelines in NLE projects could cause stack overflows or extremely long parse times.

**Solution**:
```typescript
interface ParserConfig {
  maxDepth: number;
  maxNodes: number;
  timeout: number;
}

class SafeNLEParser {
  private nodeCount = 0;
  private startTime = 0;

  constructor(private config: ParserConfig = {
    maxDepth: 100,
    maxNodes: 1_000_000,
    timeout: 60_000,
  }) {}

  async parse(project: Buffer): Promise<NLEProject> {
    this.nodeCount = 0;
    this.startTime = Date.now();

    return this.parseNode(project, 0);
  }

  private async parseNode(data: Buffer, depth: number): Promise<NLENode> {
    // Check limits
    if (depth > this.config.maxDepth) {
      throw new ParseError(`Max depth exceeded: ${depth}`);
    }

    this.nodeCount++;
    if (this.nodeCount > this.config.maxNodes) {
      throw new ParseError(`Max nodes exceeded: ${this.nodeCount}`);
    }

    if (Date.now() - this.startTime > this.config.timeout) {
      throw new ParseError('Parse timeout');
    }

    // Yield to event loop periodically
    if (this.nodeCount % 10000 === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }

    // Actual parsing...
    const node = this.parseNodeSync(data);

    // Recurse for children
    for (const child of node.children) {
      await this.parseNode(child, depth + 1);
    }

    return node;
  }
}
```

---

### HIGH Priority Issues

#### VID-H1: Variable Frame Rate (VFR) Video Handling

**Problem**: VFR content has inconsistent frame timing that breaks timestamp calculations.

**Solution**:
```typescript
interface FrameTimingMode {
  type: 'cfr' | 'vfr';
  baseFrameRate?: number;
  timestampMap?: Map<number, number>; // frame -> pts
}

function detectFrameTimingMode(stts: STTSBox): FrameTimingMode {
  if (stts.entries.length === 1) {
    return {
      type: 'cfr',
      baseFrameRate: stts.timescale / stts.entries[0].sampleDelta
    };
  }

  // Check variance in sample deltas
  const deltas = stts.entries.map(e => e.sampleDelta);
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const variance = deltas.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / deltas.length;

  if (variance / mean < 0.01) { // Within 1% variance
    return { type: 'cfr', baseFrameRate: stts.timescale / mean };
  }

  // VFR: Build complete timestamp map
  const timestampMap = new Map<number, number>();
  let pts = 0;
  let frame = 0;
  for (const entry of stts.entries) {
    for (let i = 0; i < entry.sampleCount; i++) {
      timestampMap.set(frame++, pts);
      pts += entry.sampleDelta;
    }
  }

  return { type: 'vfr', timestampMap };
}
```

---

#### VID-H2: HDR Metadata Preservation

**Problem**: HDR10/Dolby Vision metadata in SEI NAL units could be lost during chunking.

**Solution**:
```typescript
interface HDRMetadata {
  type: 'hdr10' | 'hdr10+' | 'dolby-vision' | 'hlg';
  staticMetadata?: {
    masteringDisplay: MasteringDisplay;
    contentLightLevel: ContentLightLevel;
  };
  dynamicMetadata?: Buffer[]; // Per-frame SEI
}

class HDRAwareChunker {
  async chunk(video: VideoFile): Promise<Chunk[]> {
    const hdrMeta = await this.extractHDRMetadata(video);

    if (hdrMeta.dynamicMetadata && hdrMeta.dynamicMetadata.length > 0) {
      // Store dynamic metadata alongside chunks
      const chunks = await super.chunk(video);

      return chunks.map((chunk, i) => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          hdr: {
            ...hdrMeta.staticMetadata,
            dynamicSEI: this.getDynamicMetadataForChunk(
              hdrMeta.dynamicMetadata!,
              chunk.frameRange
            ),
          },
        },
      }));
    }

    return super.chunk(video);
  }
}
```

---

#### VID-H3-H6: Additional High Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| VID-H3 | Audio sync in multi-track files | Store per-track timing offsets |
| VID-H4 | Codec-specific chunk boundary rules | Codec-aware chunker with access unit boundaries |
| VID-H5 | Thumbnail generation memory limits | Stream-based extraction with frame limits |
| VID-H6 | Subtitle track handling | Parse and version subtitle tracks separately |

---

### MEDIUM Priority Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| VID-M1 | Color space conversion | Preserve NCLC/NCLX atoms |
| VID-M2 | Chapter markers | Include in manifest metadata |
| VID-M3 | Edit list handling | Apply edits during chunk boundary calc |
| VID-M4 | Variable bitrate impact on chunking | Use time-based rather than size-based targets |
| VID-M5 | Dolby Atmos spatial audio | Preserve EC3 extension data |
| VID-M6 | ProRes flavor detection | Parse codec atoms for quality level |
| VID-M7 | Closed caption preservation | Extract and store CEA-608/708 |
| VID-M8 | Timecode track handling | Parse tmcd track for NLE integration |

---

### LOW Priority Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| VID-L1 | XML metadata boxes | Extract and index XMP |
| VID-L2 | GPS/location data | Privacy-aware extraction with user consent |
| VID-L3 | Camera metadata | Preserve manufacturer-specific atoms |
| VID-L4 | User data atoms | Store in asset metadata |
| VID-L5 | 3D video support | Handle stereo arrangement |
| VID-L6 | Rotation metadata | Preserve and handle in playback |

---

## Category 5: Concurrency & Locking

### CRITICAL Issues

#### CONC-C1: Redis-PostgreSQL Lock Synchronization Race

**Problem**: Using both Redis (Redlock) and PostgreSQL advisory locks creates potential for desynchronization.

**Impact**: Two operations could both believe they hold the lock, leading to data corruption.

**Solution**: Use a single authoritative lock source with the other as optimization:

```typescript
class HybridLockManager {
  // PostgreSQL is the source of truth
  // Redis is used as a fast check to avoid DB roundtrips

  async acquire(resource: string, ttl: number): Promise<Lock> {
    // 1. Try Redis first (fast path)
    const redisLock = await this.tryRedisLock(resource, ttl);

    // 2. Always verify with PostgreSQL (authoritative)
    try {
      const pgLock = await this.acquirePgLock(resource, ttl);

      return {
        resource,
        release: async () => {
          await this.releasePgLock(pgLock);
          await this.releaseRedisLock(redisLock);
        },
      };
    } catch (e) {
      // PostgreSQL lock failed, release Redis lock
      await this.releaseRedisLock(redisLock);
      throw e;
    }
  }

  private async acquirePgLock(resource: string, ttl: number): Promise<PgLock> {
    const lockId = this.hashToInt64(resource);

    // Use pg_try_advisory_lock to avoid blocking
    const result = await this.pg.query(
      'SELECT pg_try_advisory_lock($1) as acquired',
      [lockId]
    );

    if (!result.rows[0].acquired) {
      throw new LockConflictError(resource);
    }

    // Set up TTL release
    const releaseTimer = setTimeout(async () => {
      await this.pg.query('SELECT pg_advisory_unlock($1)', [lockId]);
    }, ttl);

    return { lockId, releaseTimer };
  }
}
```

---

#### CONC-C2: Lock Expiry During Long Operations

**Problem**: If an operation takes longer than the lock TTL, the lock expires while the operation is still in progress.

**Impact**: Another operation acquires the lock and modifies data, causing corruption when the original operation completes.

**Solution**: Implement lock extension with fencing tokens:

```typescript
interface FencedLock {
  resource: string;
  fencingToken: bigint;
  expiresAt: Date;
  extend(): Promise<void>;
}

class ExtendableLock implements FencedLock {
  private extensionInterval: NodeJS.Timeout | null = null;

  constructor(
    public resource: string,
    public fencingToken: bigint,
    public expiresAt: Date,
    private lockManager: LockManager
  ) {}

  startAutoExtension(intervalMs: number = 10000): void {
    this.extensionInterval = setInterval(async () => {
      try {
        await this.extend();
      } catch (e) {
        // Extension failed, operation should abort
        this.onExtensionFailed?.(e);
      }
    }, intervalMs);
  }

  async extend(): Promise<void> {
    const newExpiry = await this.lockManager.extendLock(
      this.resource,
      this.fencingToken,
      30000 // 30 second extension
    );
    this.expiresAt = newExpiry;
  }

  async release(): Promise<void> {
    if (this.extensionInterval) {
      clearInterval(this.extensionInterval);
    }
    await this.lockManager.releaseLock(this.resource, this.fencingToken);
  }
}

// Usage in operations that use the lock
async function doOperation(lock: FencedLock, data: any): Promise<void> {
  // Include fencing token in all writes
  await storage.write(data, { fencingToken: lock.fencingToken });

  // Storage verifies fencing token is still valid
}
```

---

#### CONC-C3: NLE Merge Deadlock Potential

**Problem**: Merging changes from multiple users editing the same timeline could deadlock if lock ordering isn't consistent.

**Solution**: Always acquire locks in consistent order:

```typescript
class OrderedLockManager {
  async acquireMultiple(resources: string[]): Promise<Lock[]> {
    // Sort resources to ensure consistent ordering
    const sorted = [...resources].sort();

    const acquired: Lock[] = [];
    try {
      for (const resource of sorted) {
        const lock = await this.acquire(resource);
        acquired.push(lock);
      }
      return acquired;
    } catch (e) {
      // Release all acquired locks in reverse order
      for (const lock of acquired.reverse()) {
        await lock.release().catch(() => {});
      }
      throw e;
    }
  }
}

// For timeline merging specifically
async function mergeTimelines(
  base: Timeline,
  ours: Timeline,
  theirs: Timeline
): Promise<Timeline> {
  // Collect all track IDs that need locking
  const trackIds = new Set([
    ...ours.tracks.map(t => t.id),
    ...theirs.tracks.map(t => t.id),
  ]);

  // Acquire locks in sorted order
  const locks = await lockManager.acquireMultiple(
    [...trackIds].map(id => `timeline:${base.id}:track:${id}`)
  );

  try {
    return await performMerge(base, ours, theirs);
  } finally {
    for (const lock of locks) {
      await lock.release();
    }
  }
}
```

---

### HIGH Priority Issues

#### CONC-H1: Concurrent Chunk Upload Race

**Problem**: Two clients uploading the same content simultaneously could both start uploads, wasting bandwidth.

**Solution**:
```typescript
class DeduplicatedUploader {
  private inProgress = new Map<string, Promise<void>>();

  async upload(data: Buffer): Promise<string> {
    const hash = blake3(data);

    // Check if already stored
    if (await this.exists(hash)) {
      return hash;
    }

    // Check if upload already in progress
    const existing = this.inProgress.get(hash);
    if (existing) {
      await existing;
      return hash;
    }

    // Start upload and track promise
    const uploadPromise = this.doUpload(hash, data);
    this.inProgress.set(hash, uploadPromise);

    try {
      await uploadPromise;
      return hash;
    } finally {
      this.inProgress.delete(hash);
    }
  }
}
```

---

#### CONC-H2: Lock Starvation Under High Contention

**Problem**: Frequently accessed resources could cause some clients to never acquire locks.

**Solution**: Implement fair queuing:

```typescript
class FairLockQueue {
  private queues = new Map<string, Array<{
    resolve: (lock: Lock) => void;
    reject: (error: Error) => void;
    enqueuedAt: Date;
  }>>();

  async acquire(resource: string, timeout: number): Promise<Lock> {
    const queue = this.queues.get(resource) || [];

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const idx = queue.findIndex(item => item.resolve === resolve);
        if (idx >= 0) queue.splice(idx, 1);
        reject(new LockTimeoutError(resource));
      }, timeout);

      queue.push({
        resolve: (lock) => {
          clearTimeout(timeoutId);
          resolve(lock);
        },
        reject,
        enqueuedAt: new Date(),
      });

      this.queues.set(resource, queue);

      // If we're first in queue, try to acquire immediately
      if (queue.length === 1) {
        this.tryNext(resource);
      }
    });
  }

  private async tryNext(resource: string): Promise<void> {
    const queue = this.queues.get(resource);
    if (!queue || queue.length === 0) return;

    const next = queue[0]; // FIFO ordering
    try {
      const lock = await this.doAcquire(resource);
      queue.shift();
      next.resolve(lock);
    } catch (e) {
      // Lock not available, will be retried when current holder releases
    }
  }

  async release(resource: string): Promise<void> {
    await this.doRelease(resource);
    // Notify next waiter
    setImmediate(() => this.tryNext(resource));
  }
}
```

---

#### CONC-H3-H5: Additional High Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| CONC-H3 | Optimistic locking version conflicts | Retry with exponential backoff, merge if possible |
| CONC-H4 | Distributed cache invalidation timing | Use versioned cache keys with pub/sub |
| CONC-H5 | Branch push race conditions | Compare-and-swap with ref logs |

---

### MEDIUM Priority Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| CONC-M1 | Reader-writer lock fairness | Writer priority with reader batching |
| CONC-M2 | Lock timeout tuning | Adaptive timeouts based on operation type |
| CONC-M3 | Deadlock detection | Build wait-for graph, detect cycles |
| CONC-M4 | Transaction isolation levels | Document required isolation per operation |
| CONC-M5 | Connection pool vs lock interaction | Pool-aware lock holders |
| CONC-M6 | Bulk operation atomicity | Batch with shared transaction |
| CONC-M7 | Event ordering guarantees | Sequence numbers per resource |
| CONC-M8 | Lock inheritance for nested operations | Pass lock context through call chain |

---

### LOW Priority Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| CONC-L1 | Lock metrics and monitoring | Prometheus histograms for wait times |
| CONC-L2 | Lock holder identification for debugging | Store holder metadata |

---

## Category 6: Operations & Deployment

### CRITICAL Issues

#### OPS-C1: Database Failover Requires Manual Intervention

**Problem**: The HA documentation describes replica promotion but requires manual steps.

**Impact**: Extended downtime during database failures, potentially hours in the worst case.

**Solution**: Automated failover with Patroni:

```yaml
# Patroni configuration for PostgreSQL HA
scope: dits-db
name: pg-node-1

restapi:
  listen: 0.0.0.0:8008
  connect_address: pg-node-1:8008

etcd3:
  hosts:
    - etcd-1:2379
    - etcd-2:2379
    - etcd-3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      parameters:
        max_connections: 200
        shared_buffers: 4GB
        wal_level: replica
        hot_standby: on

  initdb:
    - encoding: UTF8
    - data-checksums

postgresql:
  listen: 0.0.0.0:5432
  connect_address: pg-node-1:5432
  data_dir: /var/lib/postgresql/data

  authentication:
    superuser:
      username: postgres
      password: ${POSTGRES_PASSWORD}
    replication:
      username: replicator
      password: ${REPLICATION_PASSWORD}
```

```typescript
// Application-side failover handling
class HADatabasePool {
  private primary: Pool;
  private replica: Pool;
  private patroni: PatroniClient;

  constructor(config: HAConfig) {
    this.patroni = new PatroniClient(config.patroniEndpoints);
    this.setupPools();
    this.watchForFailover();
  }

  private async watchForFailover(): Promise<void> {
    for await (const event of this.patroni.watch()) {
      if (event.type === 'leader_changed') {
        logger.info('Database failover detected', { newLeader: event.leader });
        await this.reconnectPools(event.leader);
      }
    }
  }

  private async reconnectPools(newPrimary: string): Promise<void> {
    // Drain existing connections gracefully
    await this.primary.drain();

    // Connect to new primary
    this.primary = new Pool({
      host: newPrimary,
      // ... other config
    });

    // Update replica pool
    const replicas = await this.patroni.getReplicas();
    this.replica = new Pool({
      host: replicas[0],
      // ... other config
    });
  }

  async query(sql: string, params: any[]): Promise<QueryResult> {
    try {
      return await this.primary.query(sql, params);
    } catch (e) {
      if (this.isConnectionError(e)) {
        // Trigger immediate failover check
        await this.patroni.refresh();
        // Retry once after potential failover
        return await this.primary.query(sql, params);
      }
      throw e;
    }
  }
}
```

---

#### OPS-C2: Backup Verification Gap

**Problem**: Documentation mentions backups but not verification that restores actually work.

**Solution**:
```typescript
interface BackupVerification {
  backupId: string;
  verifiedAt: Date;
  status: 'passed' | 'failed';
  metrics: {
    restoreTimeMs: number;
    dataIntegrityChecks: number;
    checksumMatches: number;
    checksumFailures: number;
  };
}

class BackupVerifier {
  // Run daily, verify random sample of backups
  async verifyBackups(): Promise<void> {
    const backups = await this.listBackups({ last: '7d' });
    const sample = this.selectRandomSample(backups, 3);

    for (const backup of sample) {
      const result = await this.verifyBackup(backup);
      await this.recordVerification(result);

      if (result.status === 'failed') {
        await this.alert({
          severity: 'critical',
          message: `Backup verification failed: ${backup.id}`,
          details: result,
        });
      }
    }
  }

  private async verifyBackup(backup: Backup): Promise<BackupVerification> {
    // 1. Restore to isolated environment
    const testDb = await this.createTestDatabase();
    const restoreStart = Date.now();

    try {
      await this.restore(backup, testDb);
      const restoreTime = Date.now() - restoreStart;

      // 2. Run integrity checks
      const integrityResult = await this.runIntegrityChecks(testDb);

      // 3. Verify sample data
      const dataResult = await this.verifyDataSamples(testDb);

      return {
        backupId: backup.id,
        verifiedAt: new Date(),
        status: integrityResult.passed && dataResult.passed ? 'passed' : 'failed',
        metrics: {
          restoreTimeMs: restoreTime,
          dataIntegrityChecks: integrityResult.totalChecks,
          checksumMatches: dataResult.matches,
          checksumFailures: dataResult.failures,
        },
      };
    } finally {
      await this.destroyTestDatabase(testDb);
    }
  }
}
```

---

#### OPS-C3: No Secret Rotation Procedure

**Problem**: Database passwords, API keys, and encryption keys need rotation, but no procedure is documented.

**Solution**:
```typescript
// Secret rotation orchestrator
class SecretRotator {
  async rotateSecret(secretId: string): Promise<void> {
    const secret = await this.vault.getSecret(secretId);

    // 1. Generate new secret value
    const newValue = await this.generateNewValue(secret.type);

    // 2. Update dependent systems BEFORE rotating
    await this.updateDependents(secret, newValue);

    // 3. Store new version
    await this.vault.createSecretVersion(secretId, newValue);

    // 4. Verify new secret works
    const verified = await this.verifySecret(secretId, newValue);
    if (!verified) {
      // Rollback
      await this.vault.disableSecretVersion(secretId, 'latest');
      throw new SecretRotationError('New secret verification failed');
    }

    // 5. Schedule old version deprecation
    await this.vault.scheduleDeprecation(secretId, 'previous', {
      after: '24h', // Grace period for cached credentials
    });

    // 6. Log rotation for audit
    await this.auditLog.record({
      action: 'secret_rotated',
      secretId,
      rotatedAt: new Date(),
      gracePeriod: '24h',
    });
  }

  private async updateDependents(secret: Secret, newValue: string): Promise<void> {
    switch (secret.type) {
      case 'database_password':
        // Update PostgreSQL user password
        await this.pg.query(
          `ALTER USER ${secret.username} WITH PASSWORD $1`,
          [newValue]
        );
        break;

      case 'api_key':
        // Create new API key, keep old one valid temporarily
        await this.apiKeyManager.create(newValue, {
          expiresAt: null,
        });
        await this.apiKeyManager.setExpiry(secret.currentValue, {
          expiresAt: addHours(new Date(), 24),
        });
        break;

      case 'encryption_key':
        // More complex - need to re-encrypt data
        await this.keyRotationManager.rotateEncryptionKey(
          secret.keyId,
          newValue
        );
        break;
    }
  }
}

// Cron job for automatic rotation
// 0 2 * * 0 - Every Sunday at 2 AM
const rotationSchedule = [
  { secretId: 'db-password', interval: '30d' },
  { secretId: 'api-signing-key', interval: '90d' },
  { secretId: 'webhook-secret', interval: '180d' },
];
```

---

#### OPS-C4: Missing Disaster Recovery Test Procedure

**Problem**: DR is documented but no runbook for actually executing a DR event.

**Solution**:
```markdown
## DR Runbook

### Prerequisites
- [ ] DR region infrastructure provisioned
- [ ] Database replica healthy in DR region
- [ ] Object storage replication current (< 15 min lag)
- [ ] DNS TTL lowered to 60s (do 24h before test)

### Procedure

1. **Decision Point**
   - Primary region unavailable for > 5 minutes
   - Or: Scheduled DR test

2. **Pause Traffic**
   ```bash
   kubectl --context primary patch ingress dits-api -p '{"spec":{"rules":[]}}'
   ```

3. **Verify Replica Sync**
   ```bash
   # Check replication lag
   psql -h dr-db -c "SELECT pg_last_wal_receive_lsn() - pg_last_wal_replay_lsn();"

   # Should be < 1MB or 0 for sync replication
   ```

4. **Promote DR Database**
   ```bash
   # If using Patroni
   patronictl -c /etc/patroni.yml switchover --master primary-db --candidate dr-db

   # Manual PostgreSQL
   psql -h dr-db -c "SELECT pg_promote();"
   ```

5. **Update DNS**
   ```bash
   # Point API to DR region
   aws route53 change-resource-record-sets \
     --hosted-zone-id $ZONE_ID \
     --change-batch file://dr-dns-update.json
   ```

6. **Enable DR Traffic**
   ```bash
   kubectl --context dr apply -f ingress.yaml
   ```

7. **Verify**
   - [ ] API health check passes
   - [ ] Sample read operations succeed
   - [ ] Sample write operations succeed
   - [ ] WebSocket connections establish

### Rollback
If DR region fails during activation:
1. Revert DNS changes
2. Re-enable primary ingress
3. Investigate DR failure

### Post-DR
- [ ] Update incident ticket
- [ ] Notify customers
- [ ] Plan failback when primary recovers
```

---

### HIGH Priority Issues

#### OPS-H1: Kubernetes Pod Disruption During Deploy

**Problem**: Rolling deployments could disrupt long-running uploads/downloads.

**Solution**:
```yaml
# PodDisruptionBudget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: dits-api-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: dits-api

---
# Graceful shutdown configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dits-api
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 120  # 2 minutes for in-flight requests
      containers:
        - name: api
          lifecycle:
            preStop:
              exec:
                command:
                  - /bin/sh
                  - -c
                  - |
                    # Stop accepting new connections
                    curl -X POST localhost:8080/admin/drain
                    # Wait for in-flight requests
                    sleep 90
```

```typescript
// Application-side graceful shutdown
class GracefulServer {
  private draining = false;
  private activeRequests = 0;

  middleware(req: Request, res: Response, next: NextFunction): void {
    if (this.draining) {
      res.status(503).json({ error: 'Server draining' });
      return;
    }

    this.activeRequests++;
    res.on('finish', () => this.activeRequests--);
    next();
  }

  async drain(): Promise<void> {
    this.draining = true;

    // Wait for active requests to complete
    while (this.activeRequests > 0) {
      await sleep(100);
    }

    // Close database connections
    await this.db.end();

    // Close Redis connections
    await this.redis.quit();
  }
}
```

---

#### OPS-H2: Log Aggregation During High Volume

**Problem**: Verbose logging during high activity could overwhelm log aggregation.

**Solution**:
```typescript
class AdaptiveLogger {
  private samplingRate = 1.0; // 100% initially
  private readonly maxLogsPerSecond = 10000;
  private currentSecondLogs = 0;
  private lastSecond = 0;

  log(level: string, message: string, meta?: object): void {
    const now = Math.floor(Date.now() / 1000);

    if (now !== this.lastSecond) {
      this.adjustSamplingRate();
      this.currentSecondLogs = 0;
      this.lastSecond = now;
    }

    this.currentSecondLogs++;

    // Always log errors
    if (level === 'error' || level === 'fatal') {
      this.doLog(level, message, meta);
      return;
    }

    // Sample other logs
    if (Math.random() < this.samplingRate) {
      this.doLog(level, message, {
        ...meta,
        _sampled: this.samplingRate < 1.0,
        _samplingRate: this.samplingRate,
      });
    }
  }

  private adjustSamplingRate(): void {
    if (this.currentSecondLogs > this.maxLogsPerSecond) {
      this.samplingRate = Math.max(0.01, this.samplingRate * 0.5);
    } else if (this.currentSecondLogs < this.maxLogsPerSecond * 0.5) {
      this.samplingRate = Math.min(1.0, this.samplingRate * 1.2);
    }
  }
}
```

---

#### OPS-H3-H4: Additional High Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| OPS-H3 | Monitoring alert fatigue | Implement alert deduplication and escalation |
| OPS-H4 | Config drift between environments | Use GitOps with automated drift detection |

---

### MEDIUM Priority Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| OPS-M1 | Database connection leak detection | Pool monitoring with stale connection alerts |
| OPS-M2 | Disk space exhaustion prediction | Trend analysis with proactive alerting |
| OPS-M3 | Certificate expiry tracking | Automated renewal with monitoring |
| OPS-M4 | API deprecation notification | Version headers with sunset dates |
| OPS-M5 | Performance regression detection | Automated benchmark comparison in CI |
| OPS-M6 | Incident response playbooks | Documented procedures for common incidents |

---

### LOW Priority Issues

| ID | Issue | Solution Summary |
|----|-------|------------------|
| OPS-L1 | Changelog generation | Automated from conventional commits |
| OPS-L2 | Feature flag cleanup | Track flag age, alert on stale flags |
| OPS-L3 | Dependency update cadence | Automated PRs with security prioritization |
| OPS-L4 | Documentation versioning | Sync docs with release branches |
| OPS-L5 | On-call rotation tooling | PagerDuty/Opsgenie integration |
| OPS-L6 | Capacity planning reports | Monthly trend analysis dashboards |

---

## Cross-Cutting Concerns

### Issue Correlation Matrix

Some issues interact with each other. Solving one may solve or worsen another:

| Issue | Related Issues | Interaction |
|-------|---------------|-------------|
| STOR-C3 (Atomic transactions) | CONC-C1 (Redis-PG sync) | Same root cause |
| NET-C1 (Partition detection) | NET-C3 (Split-brain) | Solving C1 enables C3 |
| SEC-C1 (Convergent encryption) | VID-H2 (HDR metadata) | Encryption affects metadata |
| CONC-C2 (Lock expiry) | OPS-H1 (Pod disruption) | Long ops need both solutions |
| NET-H2 (Idempotency) | CONC-H1 (Upload race) | Idempotency prevents races |

### Priority Implementation Order

Based on dependencies and impact, implement in this order:

**Phase 1: Foundation (Must have before beta)**
1. STOR-C1: Checksum verification
2. STOR-C2: Atomic ref counting
3. SEC-C2: Secure nonce generation
4. NET-H2: Idempotency keys
5. OPS-C1: Automated failover

**Phase 2: Safety (Before GA)**
1. STOR-C3: Saga transactions
2. NET-C1/C3: Partition handling
3. SEC-C1/C3: Key management
4. CONC-C1/C2: Lock reliability
5. OPS-C2/C3: Backup & secrets

**Phase 3: Robustness (First 90 days post-GA)**
1. VID-C1-C4: Video handling edge cases
2. All HIGH priority items
3. NET-H1/H3/H4: Connection resilience

**Phase 4: Polish (Ongoing)**
1. MEDIUM priority items
2. LOW priority items
3. Performance optimizations

---

## Appendix: Testing Recommendations

### Chaos Engineering Tests

```typescript
// Tests to validate solutions
const chaosTests = [
  {
    name: 'Storage corruption recovery',
    setup: () => corruptRandomChunk(),
    verify: () => ensureReadFailsGracefully() && ensureRecoveryAttempted(),
  },
  {
    name: 'Network partition handling',
    setup: () => blockNetworkBetweenRegions(),
    verify: () => ensureWritesRejectedInMinority() && ensureReadsStillWork(),
  },
  {
    name: 'Lock expiry during operation',
    setup: () => pauseOperationMidway() && waitForLockExpiry(),
    verify: () => ensureOperationFailsSafely() && ensureNoDataCorruption(),
  },
  {
    name: 'Database failover',
    setup: () => killPrimaryDatabase(),
    verify: () => ensureFailoverComplete() && measureDowntime() < 30000,
  },
];
```

### Load Testing Scenarios

```yaml
scenarios:
  - name: concurrent_uploads
    vus: 100
    duration: 10m
    exec: uploadLargeFile

  - name: mixed_workload
    vus: 200
    duration: 30m
    exec:
      - upload: 20%
      - download: 50%
      - list: 20%
      - delete: 10%

  - name: burst_traffic
    stages:
      - duration: 1m, target: 50
      - duration: 30s, target: 500  # 10x spike
      - duration: 5m, target: 500
      - duration: 30s, target: 50
```

---

## Document Information

- **Version**: 1.0.0
- **Created**: Based on comprehensive documentation analysis
- **Total Issues Identified**: 115
- **Categories**: 6
- **Critical Issues**: 21
- **High Priority Issues**: 31

This document should be reviewed and updated as issues are addressed or new issues are discovered during implementation.
