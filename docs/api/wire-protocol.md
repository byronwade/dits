# Wire Protocol Specification

Binary protocol for efficient chunk transfer over QUIC.

---

## Overview

Dits uses a custom binary protocol over QUIC for high-performance data transfer. REST API handles metadata operations; the wire protocol handles bulk chunk transfer.

### Design Goals

1. **Efficiency**: Minimize overhead for large transfers
2. **Resumability**: Support interrupted transfer resumption
3. **Multiplexing**: Multiple concurrent operations over single connection
4. **Security**: TLS 1.3 encryption via QUIC

---

## Transport Layer

### QUIC Configuration

```rust
pub struct QuicConfig {
    /// Server address
    pub server: SocketAddr,

    /// Default port
    pub port: u16,  // 4433

    /// Maximum idle timeout
    pub idle_timeout: Duration,  // 30 seconds

    /// Initial congestion window
    pub initial_cwnd: u64,  // 10 * MSS

    /// Maximum concurrent streams
    pub max_streams: u64,  // 100

    /// Maximum stream data (per stream)
    pub max_stream_data: u64,  // 16 MB

    /// Maximum connection data
    pub max_connection_data: u64,  // 256 MB

    /// Keep-alive interval
    pub keep_alive: Duration,  // 10 seconds
}
```

### Connection Establishment

```
Client                                      Server
   |                                           |
   |  QUIC Handshake (TLS 1.3)                |
   |----------------------------------------->|
   |                                           |
   |  QUIC Handshake Complete                 |
   |<-----------------------------------------|
   |                                           |
   |  Stream 0: AUTH message                  |
   |----------------------------------------->|
   |                                           |
   |  Stream 0: AUTH_OK / AUTH_FAIL           |
   |<-----------------------------------------|
   |                                           |
   |  [Connection Ready for Operations]       |
   |                                           |
```

---

## Message Format

### Frame Structure

All messages follow this structure:

```
+--------+--------+--------+--------+--------+--------+--------+--------+
|  Magic (4)      | Version| Type   | Flags  | Reserved|
+--------+--------+--------+--------+--------+--------+--------+--------+
|                    Payload Length (4 bytes)                           |
+--------+--------+--------+--------+--------+--------+--------+--------+
|                    Request ID (8 bytes)                               |
+--------+--------+--------+--------+--------+--------+--------+--------+
|                                                                       |
|                         Payload (variable)                            |
|                                                                       |
+--------+--------+--------+--------+--------+--------+--------+--------+
```

### Header Fields

| Field | Size | Description |
|-------|------|-------------|
| Magic | 4 bytes | `0x44495453` ("DITS") |
| Version | 1 byte | Protocol version (currently `0x01`) |
| Type | 1 byte | Message type (see below) |
| Flags | 1 byte | Bit flags (compression, encryption, etc.) |
| Reserved | 1 byte | Reserved for future use |
| Payload Length | 4 bytes | Big-endian payload size |
| Request ID | 8 bytes | Unique request identifier |

### Flags

| Bit | Name | Description |
|-----|------|-------------|
| 0 | COMPRESSED | Payload is zstd-compressed |
| 1 | ENCRYPTED | Payload is encrypted (beyond TLS) |
| 2 | CHUNKED | Payload spans multiple frames |
| 3 | FINAL | Last frame in chunked sequence |
| 4-7 | Reserved | Future use |

---

## Message Types

### Control Messages (0x00 - 0x1F)

| Type | Name | Direction | Description |
|------|------|-----------|-------------|
| 0x00 | PING | Bidirectional | Keep-alive |
| 0x01 | PONG | Bidirectional | Ping response |
| 0x02 | AUTH | Client → Server | Authentication |
| 0x03 | AUTH_OK | Server → Client | Auth success |
| 0x04 | AUTH_FAIL | Server → Client | Auth failure |
| 0x05 | CLOSE | Bidirectional | Graceful close |
| 0x06 | ERROR | Server → Client | Error message |

### Chunk Operations (0x20 - 0x3F)

| Type | Name | Direction | Description |
|------|------|-----------|-------------|
| 0x20 | CHUNK_CHECK | Client → Server | Check chunk existence |
| 0x21 | CHUNK_CHECK_RESP | Server → Client | Existence response |
| 0x22 | CHUNK_UPLOAD | Client → Server | Upload chunk data |
| 0x23 | CHUNK_UPLOAD_ACK | Server → Client | Upload acknowledgment |
| 0x24 | CHUNK_DOWNLOAD | Client → Server | Request chunk |
| 0x25 | CHUNK_DATA | Server → Client | Chunk data response |
| 0x26 | CHUNK_BATCH_CHECK | Client → Server | Batch existence check |
| 0x27 | CHUNK_BATCH_RESP | Server → Client | Batch check response |

### Manifest Operations (0x40 - 0x5F)

| Type | Name | Direction | Description |
|------|------|-----------|-------------|
| 0x40 | MANIFEST_GET | Client → Server | Request manifest |
| 0x41 | MANIFEST_DATA | Server → Client | Manifest response |
| 0x42 | MANIFEST_PUSH | Client → Server | Push manifest |
| 0x43 | MANIFEST_ACK | Server → Client | Manifest accepted |

### Sync Operations (0x60 - 0x7F)

| Type | Name | Direction | Description |
|------|------|-----------|-------------|
| 0x60 | SYNC_REQUEST | Client → Server | Request sync info |
| 0x61 | SYNC_RESPONSE | Server → Client | Sync requirements |
| 0x62 | BLOOM_FILTER | Server → Client | Server's chunk Bloom filter |
| 0x63 | DELTA_REQUEST | Client → Server | Request delta for file |
| 0x64 | DELTA_DATA | Server → Client | Delta instructions |

---

## Message Payloads

### AUTH (0x02)

```rust
struct AuthPayload {
    /// Authentication method
    method: AuthMethod,  // 1 byte

    /// Token or credentials
    credentials: Vec<u8>,  // Variable

    /// Repository ID (optional, for scoped auth)
    repo_id: Option<[u8; 16]>,  // 16 bytes UUID

    /// Client info
    client_version: String,
    client_os: String,
}

enum AuthMethod {
    Token = 0x01,      // API token
    Session = 0x02,    // Session token
    SSH = 0x03,        // SSH signature
}
```

### AUTH_OK (0x03)

```rust
struct AuthOkPayload {
    /// Session ID for this connection
    session_id: [u8; 16],

    /// Server capabilities
    capabilities: Capabilities,

    /// Rate limits
    rate_limits: RateLimits,
}

struct Capabilities {
    /// Maximum chunk size server accepts
    max_chunk_size: u32,

    /// Supported compression algorithms
    compression: Vec<CompressionAlgo>,

    /// Server supports batch operations
    batch_support: bool,

    /// Server supports delta sync
    delta_sync: bool,
}
```

### AUTH_FAIL (0x04)

```rust
struct AuthFailPayload {
    /// Error code
    code: AuthErrorCode,  // 1 byte

    /// Human-readable message
    message: String,
}

enum AuthErrorCode {
    InvalidToken = 0x01,
    ExpiredToken = 0x02,
    InsufficientPermissions = 0x03,
    AccountSuspended = 0x04,
    RateLimited = 0x05,
}
```

### CHUNK_CHECK (0x20)

```rust
struct ChunkCheckPayload {
    /// Chunk hash (BLAKE3, 32 bytes)
    hash: [u8; 32],
}
```

### CHUNK_CHECK_RESP (0x21)

```rust
struct ChunkCheckRespPayload {
    /// Chunk hash
    hash: [u8; 32],

    /// Exists on server
    exists: bool,

    /// If exists, storage class
    storage_class: Option<StorageClass>,

    /// If cold storage, estimated thaw time
    thaw_time_seconds: Option<u32>,
}
```

### CHUNK_UPLOAD (0x22)

```rust
struct ChunkUploadPayload {
    /// Chunk hash (for verification)
    hash: [u8; 32],

    /// Original (uncompressed) size
    original_size: u32,

    /// Compressed size
    compressed_size: u32,

    /// Compression algorithm used
    compression: CompressionAlgo,

    /// Chunk data (compressed)
    data: Vec<u8>,
}

enum CompressionAlgo {
    None = 0x00,
    Zstd = 0x01,
    Lz4 = 0x02,
}
```

### CHUNK_UPLOAD_ACK (0x23)

```rust
struct ChunkUploadAckPayload {
    /// Chunk hash
    hash: [u8; 32],

    /// Upload status
    status: UploadStatus,
}

enum UploadStatus {
    Accepted = 0x00,       // New chunk stored
    Duplicate = 0x01,      // Already existed
    HashMismatch = 0x02,   // Verification failed
    TooLarge = 0x03,       // Exceeds limit
    QuotaExceeded = 0x04,  // Storage quota exceeded
}
```

### CHUNK_DOWNLOAD (0x24)

```rust
struct ChunkDownloadPayload {
    /// Chunk hash
    hash: [u8; 32],

    /// Preferred compression
    compression: CompressionAlgo,

    /// Byte range (optional, for partial reads)
    range: Option<(u64, u64)>,
}
```

### CHUNK_DATA (0x25)

```rust
struct ChunkDataPayload {
    /// Chunk hash
    hash: [u8; 32],

    /// Original size
    original_size: u32,

    /// Compressed size
    compressed_size: u32,

    /// Compression used
    compression: CompressionAlgo,

    /// Chunk data
    data: Vec<u8>,
}
```

### CHUNK_BATCH_CHECK (0x26)

```rust
struct ChunkBatchCheckPayload {
    /// Number of hashes
    count: u32,

    /// Chunk hashes (32 bytes each)
    hashes: Vec<[u8; 32]>,
}
```

### CHUNK_BATCH_RESP (0x27)

```rust
struct ChunkBatchRespPayload {
    /// Bitmap of existence (1 = exists, 0 = missing)
    /// Bit order matches input hash order
    bitmap: Vec<u8>,

    /// For existing chunks, storage classes
    storage_classes: Vec<StorageClass>,
}
```

### MANIFEST_GET (0x40)

```rust
struct ManifestGetPayload {
    /// Commit hash or ref name
    reference: String,

    /// Repository ID
    repo_id: [u8; 16],
}
```

### MANIFEST_DATA (0x41)

```rust
struct ManifestDataPayload {
    /// Commit hash this manifest is for
    commit: [u8; 32],

    /// Manifest format version
    version: u8,

    /// Compressed manifest data (bincode + zstd)
    data: Vec<u8>,
}
```

### SYNC_REQUEST (0x60)

```rust
struct SyncRequestPayload {
    /// Repository ID
    repo_id: [u8; 16],

    /// Local HEAD commit
    local_head: [u8; 32],

    /// Branches to sync
    branches: Vec<String>,
}
```

### SYNC_RESPONSE (0x61)

```rust
struct SyncResponsePayload {
    /// Remote HEAD
    remote_head: [u8; 32],

    /// Commits ahead (remote has, local doesn't)
    commits_ahead: Vec<CommitSummary>,

    /// Commits behind (local has, remote doesn't)
    commits_behind: Vec<CommitSummary>,

    /// Chunks needed for sync
    chunks_needed: Vec<[u8; 32]>,

    /// Total bytes to transfer
    transfer_size: u64,
}

struct CommitSummary {
    hash: [u8; 32],
    parent: [u8; 32],
    message_preview: String,  // First 80 chars
}
```

### BLOOM_FILTER (0x62)

```rust
struct BloomFilterPayload {
    /// Filter version/generation
    version: u64,

    /// Number of hash functions
    num_hashes: u8,

    /// Filter size in bits
    size_bits: u64,

    /// Compressed filter data
    data: Vec<u8>,
}
```

### DELTA_REQUEST (0x63)

```rust
struct DeltaRequestPayload {
    /// File path
    path: String,

    /// Base version (local)
    base_commit: [u8; 32],

    /// Target version (remote)
    target_commit: [u8; 32],

    /// Local chunk hashes for this file
    local_chunks: Vec<[u8; 32]>,
}
```

### DELTA_DATA (0x64)

```rust
struct DeltaDataPayload {
    /// Delta instructions
    instructions: Vec<DeltaInstruction>,
}

enum DeltaInstruction {
    /// Copy from local chunk
    Copy {
        chunk_hash: [u8; 32],
        offset: u32,
        length: u32,
    },

    /// Insert new data
    Insert {
        data: Vec<u8>,
    },

    /// Fetch remote chunk
    Fetch {
        chunk_hash: [u8; 32],
    },
}
```

### ERROR (0x06)

```rust
struct ErrorPayload {
    /// Error code
    code: ErrorCode,

    /// Human-readable message
    message: String,

    /// Request ID that caused error (if applicable)
    request_id: Option<u64>,
}

enum ErrorCode {
    Unknown = 0x00,
    InvalidMessage = 0x01,
    UnsupportedVersion = 0x02,
    ResourceNotFound = 0x03,
    PermissionDenied = 0x04,
    RateLimited = 0x05,
    ServerError = 0x06,
    Timeout = 0x07,
}
```

---

## Stream Management

### Stream Allocation

| Stream ID | Purpose |
|-----------|---------|
| 0 | Control stream (auth, ping, errors) |
| 1 | Manifest operations |
| 2-99 | Chunk transfers (parallel) |
| 100+ | Client-initiated streams |

### Multiplexing Strategy

```rust
impl ConnectionManager {
    /// Allocate stream for chunk transfer
    pub async fn allocate_chunk_stream(&self) -> Result<StreamId> {
        // Round-robin through available chunk streams
        let stream = self.chunk_streams.next_available().await?;
        Ok(stream.id())
    }

    /// Send chunk on dedicated stream
    pub async fn upload_chunk(&self, chunk: &Chunk) -> Result<()> {
        let stream = self.allocate_chunk_stream().await?;

        // Serialize payload
        let payload = ChunkUploadPayload {
            hash: chunk.hash,
            original_size: chunk.data.len() as u32,
            compressed_size: chunk.compressed.len() as u32,
            compression: CompressionAlgo::Zstd,
            data: chunk.compressed.clone(),
        };

        // Send on stream
        stream.send(Message::new(
            MessageType::ChunkUpload,
            self.next_request_id(),
            payload.encode(),
        )).await?;

        // Wait for ACK
        let ack = stream.recv().await?;
        // Handle response...

        Ok(())
    }
}
```

---

## Flow Control

### Chunk Upload Flow

```
Client                                      Server
   |                                           |
   |  CHUNK_BATCH_CHECK (hashes)              |
   |----------------------------------------->|
   |                                           |
   |  CHUNK_BATCH_RESP (bitmap)               |
   |<-----------------------------------------|
   |                                           |
   |  [For each missing chunk, in parallel:]  |
   |                                           |
   |  Stream N: CHUNK_UPLOAD (data)           |
   |----------------------------------------->|
   |                                           |
   |  Stream N: CHUNK_UPLOAD_ACK              |
   |<-----------------------------------------|
   |                                           |
   |  Stream M: CHUNK_UPLOAD (data)           |
   |----------------------------------------->|
   |                                           |
   |  Stream M: CHUNK_UPLOAD_ACK              |
   |<-----------------------------------------|
   |                                           |
```

### Chunk Download Flow

```
Client                                      Server
   |                                           |
   |  MANIFEST_GET (commit)                   |
   |----------------------------------------->|
   |                                           |
   |  MANIFEST_DATA                           |
   |<-----------------------------------------|
   |                                           |
   |  [Parse manifest, identify needed chunks]|
   |                                           |
   |  CHUNK_BATCH_CHECK (local chunks)        |
   |----------------------------------------->|
   |                                           |
   |  CHUNK_BATCH_RESP (available)            |
   |<-----------------------------------------|
   |                                           |
   |  [For each needed chunk, in parallel:]   |
   |                                           |
   |  Stream N: CHUNK_DOWNLOAD                |
   |----------------------------------------->|
   |                                           |
   |  Stream N: CHUNK_DATA                    |
   |<-----------------------------------------|
   |                                           |
```

### Delta Sync Flow

```
Client                                      Server
   |                                           |
   |  SYNC_REQUEST (local_head)               |
   |----------------------------------------->|
   |                                           |
   |  SYNC_RESPONSE (diff summary)            |
   |<-----------------------------------------|
   |                                           |
   |  [For files with many changes:]          |
   |                                           |
   |  DELTA_REQUEST (file, local_chunks)      |
   |----------------------------------------->|
   |                                           |
   |  DELTA_DATA (instructions)               |
   |<-----------------------------------------|
   |                                           |
   |  [Apply delta instructions locally]      |
   |                                           |
```

---

## Error Handling

### Retry Strategy

```rust
pub struct RetryConfig {
    /// Initial backoff duration
    pub initial_backoff: Duration,  // 100ms

    /// Maximum backoff duration
    pub max_backoff: Duration,  // 30s

    /// Backoff multiplier
    pub multiplier: f64,  // 2.0

    /// Maximum retry attempts
    pub max_retries: u32,  // 5

    /// Jitter factor (0.0 - 1.0)
    pub jitter: f64,  // 0.1
}

impl RetryConfig {
    pub fn next_backoff(&self, attempt: u32) -> Duration {
        let base = self.initial_backoff.as_millis() as f64
            * self.multiplier.powi(attempt as i32);
        let capped = base.min(self.max_backoff.as_millis() as f64);
        let jittered = capped * (1.0 + rand::random::<f64>() * self.jitter);
        Duration::from_millis(jittered as u64)
    }
}
```

### Recoverable Errors

| Error | Recovery Action |
|-------|-----------------|
| `Timeout` | Retry with exponential backoff |
| `RateLimited` | Wait for `Retry-After` duration |
| `ServerError` | Retry up to max_retries |
| `InvalidMessage` | Log and skip (don't retry) |
| `PermissionDenied` | Re-authenticate and retry once |

### Connection Recovery

```rust
impl Connection {
    pub async fn reconnect(&mut self) -> Result<()> {
        // Close existing connection gracefully
        if let Some(conn) = self.quic_conn.take() {
            conn.close(0u32.into(), b"reconnecting").await;
        }

        // Establish new connection
        let endpoint = quinn::Endpoint::client(self.config.bind_addr)?;
        let conn = endpoint.connect(self.config.server_addr, &self.config.server_name)?
            .await?;

        // Re-authenticate
        let auth_stream = conn.open_bi().await?;
        self.authenticate(auth_stream).await?;

        // Resume pending operations
        for pending in self.pending_ops.drain(..) {
            self.retry_operation(pending).await?;
        }

        self.quic_conn = Some(conn);
        Ok(())
    }
}
```

---

## Performance Optimizations

### Pipelining

```rust
impl ChunkUploader {
    /// Upload multiple chunks with pipelining
    pub async fn upload_batch(&self, chunks: Vec<Chunk>) -> Result<()> {
        let (tx, rx) = mpsc::channel(100);

        // Spawn upload tasks
        let upload_handles: Vec<_> = chunks.iter().enumerate().map(|(i, chunk)| {
            let tx = tx.clone();
            let conn = self.conn.clone();
            tokio::spawn(async move {
                let stream = conn.allocate_chunk_stream().await?;
                stream.send_chunk_upload(chunk).await?;
                let ack = stream.recv_ack().await?;
                tx.send((i, ack)).await?;
                Ok::<_, Error>(())
            })
        }).collect();

        // Collect results
        drop(tx);
        let mut results = vec![None; chunks.len()];
        while let Some((i, ack)) = rx.recv().await {
            results[i] = Some(ack);
        }

        // Wait for all tasks
        for handle in upload_handles {
            handle.await??;
        }

        Ok(())
    }
}
```

### Prefetching

```rust
impl ChunkDownloader {
    /// Download with prefetch
    pub async fn download_with_prefetch(
        &self,
        chunks: &[ChunkHash],
        prefetch_window: usize,
    ) -> Result<()> {
        let mut pending = VecDeque::new();

        for (i, hash) in chunks.iter().enumerate() {
            // Start download
            let handle = self.start_download(*hash);
            pending.push_back(handle);

            // Maintain prefetch window
            while pending.len() > prefetch_window {
                let completed = pending.pop_front().unwrap();
                completed.await??;
            }
        }

        // Drain remaining
        for handle in pending {
            handle.await??;
        }

        Ok(())
    }
}
```

### Compression Selection

```rust
impl CompressionSelector {
    /// Choose compression based on content
    pub fn select(&self, data: &[u8], mime_type: &str) -> CompressionAlgo {
        // Already compressed formats
        if matches!(mime_type, "video/mp4" | "image/jpeg" | "image/png") {
            return CompressionAlgo::None;
        }

        // Small chunks don't benefit much
        if data.len() < 1024 {
            return CompressionAlgo::None;
        }

        // Try zstd for everything else
        let compressed = zstd::encode_all(data, 3)?;
        if compressed.len() < data.len() * 95 / 100 {
            CompressionAlgo::Zstd
        } else {
            CompressionAlgo::None
        }
    }
}
```

---

## Security Considerations

### TLS Configuration

```rust
pub fn create_tls_config() -> rustls::ClientConfig {
    let mut config = rustls::ClientConfig::builder()
        .with_safe_defaults()
        .with_root_certificates(load_root_certs())
        .with_no_client_auth();

    // Require TLS 1.3 only
    config.alpn_protocols = vec![b"dits/1".to_vec()];

    config
}
```

### Message Authentication

All messages are authenticated by TLS. Additional application-layer signing is optional:

```rust
struct SignedMessage {
    /// Original message
    message: Message,

    /// Ed25519 signature of message bytes
    signature: [u8; 64],

    /// Signing key ID
    key_id: String,
}
```

---

## Compatibility

### Version Negotiation

Client sends supported versions in AUTH; server responds with chosen version:

```rust
struct VersionNegotiation {
    /// Minimum supported version
    min_version: u8,

    /// Maximum supported version
    max_version: u8,

    /// Preferred version
    preferred: u8,
}
```

### Feature Flags

Server advertises capabilities in AUTH_OK. Clients must check before using features:

```rust
if capabilities.delta_sync {
    // Use delta sync protocol
} else {
    // Fall back to full chunk transfer
}
```

---

## Implementation Notes

- Use `quinn` crate for Rust QUIC implementation
- `bincode` for efficient struct serialization
- `zstd` for compression (level 3 for speed/ratio balance)
- Request IDs should be monotonically increasing per connection
- Keep-alive pings every 10 seconds to maintain NAT mappings
- Maximum message size: 16 MB (larger transfers chunked)
