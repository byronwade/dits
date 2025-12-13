# QUIC Chunk Transfer Protocol Specification

This document specifies the QUIC-based protocol used for efficient chunk transfer in Dits. The protocol is optimized for large file transfers with support for parallel streams, resumable transfers, and end-to-end encryption.

## Protocol Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Control   │  │    Data     │  │      Metadata           │ │
│  │   Stream    │  │   Streams   │  │       Stream            │ │
│  │  (Stream 0) │  │ (Stream 4+) │  │     (Stream 2)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      Dits Protocol Layer                        │
│         Message Framing, Serialization, Compression            │
├─────────────────────────────────────────────────────────────────┤
│                         QUIC Transport                          │
│    Streams, Flow Control, Congestion Control, 0-RTT, TLS 1.3   │
├─────────────────────────────────────────────────────────────────┤
│                            UDP                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Connection Establishment

### ALPN Negotiation

```
ALPN Protocol IDs:
  - "dits/1"      : Version 1.0 protocol
  - "dits/1-lfs"  : Version 1.0 with LFS extensions
```

### Connection Flow

```
┌────────┐                                    ┌────────┐
│ Client │                                    │ Server │
└───┬────┘                                    └───┬────┘
    │                                             │
    │  QUIC Initial (ALPN: dits/1)               │
    │────────────────────────────────────────────>│
    │                                             │
    │  QUIC Handshake + TLS 1.3                  │
    │<────────────────────────────────────────────│
    │                                             │
    │  0-RTT Data (if resuming)                  │
    │────────────────────────────────────────────>│
    │                                             │
    │  Handshake Complete                        │
    │<───────────────────────────────────────────>│
    │                                             │
    │  AUTH_REQUEST (Stream 0)                   │
    │────────────────────────────────────────────>│
    │                                             │
    │  AUTH_RESPONSE (Stream 0)                  │
    │<────────────────────────────────────────────│
    │                                             │
    │  Connection Ready                          │
    ├─────────────────────────────────────────────┤
```

### 0-RTT Resumption

For previously authenticated clients:

```rust
pub struct SessionTicket {
    /// Encrypted session state
    pub encrypted_state: Vec<u8>,
    /// Ticket lifetime in seconds
    pub lifetime: u32,
    /// Age add value for obfuscation
    pub age_add: u32,
    /// Associated repository access
    pub repository_ids: Vec<Uuid>,
    /// Maximum 0-RTT data size
    pub max_early_data: u32,
}
```

## Stream Allocation

| Stream ID | Direction | Purpose |
|-----------|-----------|---------|
| 0 | Bidirectional | Control messages (auth, errors, close) |
| 2 | Bidirectional | Metadata exchange (manifests, refs) |
| 4+ | Bidirectional | Data transfer (one per chunk) |

### Stream ID Assignment

```
Client-initiated bidirectional:  0, 4, 8, 12, ...  (ID & 0x3 == 0)
Server-initiated bidirectional:  1, 5, 9, 13, ...  (ID & 0x3 == 1)
Client-initiated unidirectional: 2, 6, 10, 14, ... (ID & 0x3 == 2)
Server-initiated unidirectional: 3, 7, 11, 15, ... (ID & 0x3 == 3)
```

## Message Framing

All messages use a common frame format:

```
┌────────────────────────────────────────────────────────────────┐
│  Magic (4 bytes)  │  Version (1)  │  Type (1)  │  Flags (2)   │
├────────────────────────────────────────────────────────────────┤
│                    Payload Length (4 bytes)                    │
├────────────────────────────────────────────────────────────────┤
│                    Request ID (8 bytes)                        │
├────────────────────────────────────────────────────────────────┤
│                    Payload (variable)                          │
├────────────────────────────────────────────────────────────────┤
│                    Checksum (4 bytes, optional)                │
└────────────────────────────────────────────────────────────────┘
```

### Header Fields

```rust
pub struct MessageHeader {
    /// Magic bytes: 0x44495453 ("DITS")
    pub magic: [u8; 4],

    /// Protocol version (current: 1)
    pub version: u8,

    /// Message type
    pub message_type: MessageType,

    /// Flags
    pub flags: MessageFlags,

    /// Payload length (max 16 MB)
    pub payload_length: u32,

    /// Request ID for correlation
    pub request_id: u64,
}

bitflags! {
    pub struct MessageFlags: u16 {
        const COMPRESSED    = 0b0000_0001;  // Payload is compressed
        const ENCRYPTED     = 0b0000_0010;  // Additional encryption layer
        const CHUNKED       = 0b0000_0100;  // Multi-part message
        const FINAL         = 0b0000_1000;  // Final chunk of multi-part
        const CHECKSUM      = 0b0001_0000;  // Checksum present
        const PRIORITY_HIGH = 0b0010_0000;  // High priority message
        const PRIORITY_LOW  = 0b0100_0000;  // Low priority message
    }
}
```

### Message Types

```rust
#[repr(u8)]
pub enum MessageType {
    // Control messages (0x00-0x0F)
    AuthRequest         = 0x00,
    AuthResponse        = 0x01,
    AuthChallenge       = 0x02,
    Ping                = 0x03,
    Pong                = 0x04,
    Error               = 0x05,
    Close               = 0x06,
    GoAway              = 0x07,

    // Metadata messages (0x10-0x1F)
    RefList             = 0x10,
    RefUpdate           = 0x11,
    ManifestRequest     = 0x12,
    ManifestResponse    = 0x13,
    ObjectInfo          = 0x14,

    // Chunk transfer (0x20-0x2F)
    ChunkRequest        = 0x20,
    ChunkResponse       = 0x21,
    ChunkData           = 0x22,
    ChunkAck            = 0x23,
    ChunkNack           = 0x24,
    ChunkCancel         = 0x25,

    // Batch operations (0x30-0x3F)
    BatchRequest        = 0x30,
    BatchResponse       = 0x31,
    BatchProgress       = 0x32,
    BatchComplete       = 0x33,

    // Upload operations (0x40-0x4F)
    UploadInit          = 0x40,
    UploadChunk         = 0x41,
    UploadComplete      = 0x42,
    UploadAbort         = 0x43,

    // Lock operations (0x50-0x5F)
    LockAcquire         = 0x50,
    LockRelease         = 0x51,
    LockStatus          = 0x52,
    LockForceRelease    = 0x53,
}
```

## Authentication Messages

### AUTH_REQUEST (0x00)

Sent by client to authenticate the connection.

```rust
pub struct AuthRequest {
    /// Authentication method
    pub method: AuthMethod,

    /// Credentials based on method
    pub credentials: AuthCredentials,

    /// Requested repository access
    pub repositories: Vec<RepositoryAccess>,

    /// Client capabilities
    pub capabilities: ClientCapabilities,
}

#[derive(Serialize, Deserialize)]
pub enum AuthMethod {
    /// JWT bearer token
    BearerToken,
    /// API key
    ApiKey,
    /// SSH key signature
    SshSignature,
    /// Session resumption
    SessionResume,
}

pub struct AuthCredentials {
    /// JWT token or API key
    pub token: Option<String>,

    /// SSH public key
    pub ssh_public_key: Option<Vec<u8>>,

    /// SSH signature over challenge
    pub ssh_signature: Option<Vec<u8>>,

    /// Session ticket for resumption
    pub session_ticket: Option<Vec<u8>>,
}

pub struct RepositoryAccess {
    /// Repository UUID or path
    pub repository: RepositoryRef,

    /// Requested access level
    pub access: AccessLevel,
}

bitflags! {
    pub struct ClientCapabilities: u32 {
        const COMPRESSION_ZSTD  = 0b0000_0001;
        const COMPRESSION_LZ4   = 0b0000_0010;
        const DELTA_ENCODING    = 0b0000_0100;
        const PARALLEL_STREAMS  = 0b0000_1000;
        const RESUME_TRANSFER   = 0b0001_0000;
        const LFS_SUPPORT       = 0b0010_0000;
        const ENCRYPTION_EXTRA  = 0b0100_0000;
    }
}
```

**Wire Format:**

```
AUTH_REQUEST:
┌──────────────────────────────────────┐
│ Method (1 byte)                      │
├──────────────────────────────────────┤
│ Token Length (2 bytes)               │
├──────────────────────────────────────┤
│ Token (variable)                     │
├──────────────────────────────────────┤
│ Repository Count (2 bytes)           │
├──────────────────────────────────────┤
│ Repository Access entries (variable) │
├──────────────────────────────────────┤
│ Capabilities (4 bytes)               │
└──────────────────────────────────────┘
```

### AUTH_RESPONSE (0x01)

Server response to authentication.

```rust
pub struct AuthResponse {
    /// Authentication result
    pub status: AuthStatus,

    /// Session ID for this connection
    pub session_id: Option<Uuid>,

    /// Granted permissions per repository
    pub grants: Vec<RepositoryGrant>,

    /// Server capabilities
    pub server_capabilities: ServerCapabilities,

    /// Session ticket for future resumption
    pub session_ticket: Option<SessionTicket>,

    /// Error details if failed
    pub error: Option<AuthError>,
}

#[derive(Serialize, Deserialize)]
pub enum AuthStatus {
    Success,
    ChallengePending,  // Need to respond to challenge
    InvalidCredentials,
    Expired,
    InsufficientScope,
    RateLimited,
    ServerError,
}

pub struct RepositoryGrant {
    pub repository_id: Uuid,
    pub permissions: Permissions,
    pub expires_at: Option<DateTime<Utc>>,
}
```

### AUTH_CHALLENGE (0x02)

For SSH key authentication or MFA.

```rust
pub struct AuthChallenge {
    /// Challenge type
    pub challenge_type: ChallengeType,

    /// Random nonce to sign
    pub nonce: [u8; 32],

    /// Timestamp for replay protection
    pub timestamp: u64,

    /// TOTP required
    pub requires_totp: bool,
}

pub enum ChallengeType {
    SshSignature,
    TotpCode,
    WebAuthn,
}
```

## Chunk Transfer Messages

### CHUNK_REQUEST (0x20)

Request to download one or more chunks.

```rust
pub struct ChunkRequest {
    /// Repository context
    pub repository_id: Uuid,

    /// Requested chunks
    pub chunks: Vec<ChunkSpec>,

    /// Transfer preferences
    pub preferences: TransferPreferences,
}

pub struct ChunkSpec {
    /// Chunk hash (blake3)
    pub hash: [u8; 32],

    /// Expected size (for pre-allocation)
    pub expected_size: Option<u64>,

    /// Byte range for partial transfer
    pub range: Option<ByteRange>,

    /// Priority (0 = highest)
    pub priority: u8,
}

pub struct ByteRange {
    pub start: u64,
    pub end: Option<u64>,  // None = to end
}

pub struct TransferPreferences {
    /// Preferred compression
    pub compression: Option<Compression>,

    /// Maximum concurrent streams
    pub max_streams: u32,

    /// Enable delta encoding if available
    pub delta_encoding: bool,

    /// Base chunks for delta encoding
    pub delta_bases: Vec<[u8; 32]>,
}
```

**Wire Format:**

```
CHUNK_REQUEST:
┌──────────────────────────────────────┐
│ Repository ID (16 bytes)             │
├──────────────────────────────────────┤
│ Chunk Count (2 bytes)                │
├──────────────────────────────────────┤
│ For each chunk:                      │
│   ├─ Hash (32 bytes)                 │
│   ├─ Expected Size (8 bytes)         │
│   ├─ Has Range (1 byte bool)         │
│   ├─ Range Start (8 bytes, optional) │
│   ├─ Range End (8 bytes, optional)   │
│   └─ Priority (1 byte)               │
├──────────────────────────────────────┤
│ Preferences:                         │
│   ├─ Compression (1 byte)            │
│   ├─ Max Streams (4 bytes)           │
│   ├─ Delta Encoding (1 byte bool)    │
│   ├─ Delta Base Count (2 bytes)      │
│   └─ Delta Bases (32 * count bytes)  │
└──────────────────────────────────────┘
```

### CHUNK_RESPONSE (0x21)

Server's response with transfer plan.

```rust
pub struct ChunkResponse {
    /// Per-chunk status
    pub chunks: Vec<ChunkStatus>,

    /// Stream assignments for parallel transfer
    pub stream_assignments: Vec<StreamAssignment>,

    /// Estimated total transfer size
    pub total_size: u64,

    /// ETA in milliseconds
    pub estimated_time_ms: Option<u64>,
}

pub struct ChunkStatus {
    /// Chunk hash
    pub hash: [u8; 32],

    /// Availability status
    pub status: ChunkAvailability,

    /// Actual size (may differ if compressed/delta)
    pub transfer_size: u64,

    /// Delta information if applicable
    pub delta_info: Option<DeltaInfo>,
}

pub enum ChunkAvailability {
    /// Chunk is available
    Available,
    /// Chunk exists but needs migration from cold storage
    ColdStorage { estimated_delay_seconds: u32 },
    /// Chunk not found
    NotFound,
    /// Access denied
    AccessDenied,
}

pub struct StreamAssignment {
    /// Stream ID for this chunk
    pub stream_id: u64,

    /// Chunk hash
    pub hash: [u8; 32],

    /// Assigned priority
    pub priority: u8,
}

pub struct DeltaInfo {
    /// Base chunk hash
    pub base_hash: [u8; 32],

    /// Delta algorithm used
    pub algorithm: DeltaAlgorithm,

    /// Delta size (should be smaller than full)
    pub delta_size: u64,
}

pub enum DeltaAlgorithm {
    Xdelta3,
    Bsdiff,
    Rsync,
}
```

### CHUNK_DATA (0x22)

Actual chunk data transfer.

```rust
pub struct ChunkData {
    /// Chunk hash for verification
    pub hash: [u8; 32],

    /// Sequence number within chunk
    pub sequence: u32,

    /// Offset within chunk
    pub offset: u64,

    /// Total chunk size
    pub total_size: u64,

    /// Whether this is the last segment
    pub is_final: bool,

    /// Compression used for this segment
    pub compression: Compression,

    /// Actual data
    pub data: Vec<u8>,
}

pub enum Compression {
    None,
    Zstd { level: u8 },
    Lz4,
    Brotli { level: u8 },
}
```

**Wire Format (optimized for streaming):**

```
CHUNK_DATA:
┌──────────────────────────────────────┐
│ Hash (32 bytes)                      │
├──────────────────────────────────────┤
│ Sequence (4 bytes)                   │
├──────────────────────────────────────┤
│ Offset (8 bytes)                     │
├──────────────────────────────────────┤
│ Total Size (8 bytes)                 │
├──────────────────────────────────────┤
│ Flags (1 byte)                       │
│   bit 0: is_final                    │
│   bit 1-3: compression type          │
├──────────────────────────────────────┤
│ Data Length (4 bytes)                │
├──────────────────────────────────────┤
│ Data (variable)                      │
└──────────────────────────────────────┘
```

### CHUNK_ACK (0x23)

Acknowledgment of received chunk data.

```rust
pub struct ChunkAck {
    /// Chunk hash
    pub hash: [u8; 32],

    /// Acknowledged through sequence
    pub acked_sequence: u32,

    /// Bytes successfully received
    pub bytes_received: u64,

    /// Verification status (if complete)
    pub verified: Option<bool>,
}
```

### CHUNK_NACK (0x24)

Negative acknowledgment for retransmission.

```rust
pub struct ChunkNack {
    /// Chunk hash
    pub hash: [u8; 32],

    /// Missing sequence numbers
    pub missing_sequences: Vec<u32>,

    /// Reason for NACK
    pub reason: NackReason,
}

pub enum NackReason {
    MissingData,
    ChecksumMismatch,
    DecompressionFailed,
    Timeout,
}
```

## Upload Operations

### UPLOAD_INIT (0x40)

Initialize a chunk upload.

```rust
pub struct UploadInit {
    /// Repository context
    pub repository_id: Uuid,

    /// Chunks to upload
    pub chunks: Vec<UploadChunkInfo>,

    /// Commit this upload is part of (optional)
    pub commit_context: Option<CommitContext>,
}

pub struct UploadChunkInfo {
    /// Chunk hash (pre-computed)
    pub hash: [u8; 32],

    /// Uncompressed size
    pub size: u64,

    /// Suggested compression
    pub compression: Option<Compression>,
}

pub struct CommitContext {
    /// Parent commit hash
    pub parent: Option<[u8; 32]>,

    /// Commit message
    pub message: String,

    /// Author information
    pub author: Author,
}
```

### UPLOAD_INIT Response

```rust
pub struct UploadInitResponse {
    /// Upload session ID
    pub upload_id: Uuid,

    /// Per-chunk upload status
    pub chunks: Vec<UploadChunkStatus>,

    /// Stream assignments for upload
    pub stream_assignments: Vec<StreamAssignment>,

    /// Upload expires at
    pub expires_at: DateTime<Utc>,
}

pub struct UploadChunkStatus {
    pub hash: [u8; 32],
    pub status: UploadStatus,
}

pub enum UploadStatus {
    /// Server needs this chunk
    Required,
    /// Server already has this chunk (dedup)
    AlreadyExists,
    /// Partial upload exists, resume from offset
    Resume { offset: u64 },
}
```

### UPLOAD_CHUNK (0x41)

Upload chunk data.

```rust
pub struct UploadChunk {
    /// Upload session ID
    pub upload_id: Uuid,

    /// Chunk hash
    pub hash: [u8; 32],

    /// Sequence number
    pub sequence: u32,

    /// Offset within chunk
    pub offset: u64,

    /// Whether this is the last segment
    pub is_final: bool,

    /// Compression applied
    pub compression: Compression,

    /// Data payload
    pub data: Vec<u8>,
}
```

### UPLOAD_COMPLETE (0x42)

Finalize upload session.

```rust
pub struct UploadComplete {
    /// Upload session ID
    pub upload_id: Uuid,

    /// Create commit if all chunks uploaded
    pub create_commit: bool,

    /// Files to include in commit
    pub files: Vec<FileEntry>,
}

pub struct FileEntry {
    /// File path in repository
    pub path: String,

    /// File mode
    pub mode: u32,

    /// Chunks comprising this file
    pub chunks: Vec<FileChunk>,

    /// Total file size
    pub size: u64,
}

pub struct FileChunk {
    pub hash: [u8; 32],
    pub offset: u64,
    pub size: u64,
}
```

### UPLOAD_COMPLETE Response

```rust
pub struct UploadCompleteResponse {
    /// Success status
    pub success: bool,

    /// Created commit hash (if applicable)
    pub commit_hash: Option<[u8; 32]>,

    /// Per-chunk verification results
    pub chunk_results: Vec<ChunkVerifyResult>,

    /// Any errors
    pub errors: Vec<UploadError>,
}

pub struct ChunkVerifyResult {
    pub hash: [u8; 32],
    pub verified: bool,
    pub storage_location: Option<String>,
}
```

## Batch Operations

### BATCH_REQUEST (0x30)

Request batch download of multiple objects.

```rust
pub struct BatchRequest {
    /// Repository context
    pub repository_id: Uuid,

    /// Operation type
    pub operation: BatchOperation,

    /// Objects to transfer
    pub objects: Vec<BatchObject>,

    /// Transfer configuration
    pub config: BatchConfig,
}

pub enum BatchOperation {
    Download,
    Upload,
    Verify,
}

pub struct BatchObject {
    /// Object identifier (commit, tree, or chunk hash)
    pub oid: ObjectId,

    /// Object type
    pub object_type: ObjectType,

    /// Size if known
    pub size: Option<u64>,
}

pub struct BatchConfig {
    /// Maximum parallel transfers
    pub concurrency: u32,

    /// Bandwidth limit in bytes/sec (0 = unlimited)
    pub bandwidth_limit: u64,

    /// Enable resume on disconnect
    pub resumable: bool,

    /// Timeout per object in seconds
    pub timeout_seconds: u32,
}
```

### BATCH_PROGRESS (0x32)

Progress update during batch transfer.

```rust
pub struct BatchProgress {
    /// Batch operation ID
    pub batch_id: Uuid,

    /// Objects completed
    pub completed: u32,

    /// Objects in progress
    pub in_progress: u32,

    /// Objects remaining
    pub remaining: u32,

    /// Bytes transferred
    pub bytes_transferred: u64,

    /// Total bytes
    pub total_bytes: u64,

    /// Current transfer rate (bytes/sec)
    pub transfer_rate: u64,

    /// Estimated time remaining (seconds)
    pub eta_seconds: Option<u32>,

    /// Per-object progress
    pub object_progress: Vec<ObjectProgress>,
}

pub struct ObjectProgress {
    pub oid: ObjectId,
    pub status: TransferStatus,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
}

pub enum TransferStatus {
    Pending,
    InProgress,
    Complete,
    Failed { error: String },
    Skipped { reason: String },
}
```

## Metadata Messages

### REF_LIST (0x10)

List references in a repository.

```rust
pub struct RefListRequest {
    pub repository_id: Uuid,

    /// Optional pattern filter
    pub pattern: Option<String>,

    /// Include peeled tags
    pub peel_tags: bool,
}

pub struct RefListResponse {
    pub refs: Vec<RefInfo>,
    pub head: Option<String>,
}

pub struct RefInfo {
    /// Full ref name (refs/heads/main)
    pub name: String,

    /// Object hash
    pub hash: [u8; 32],

    /// Object type
    pub object_type: ObjectType,

    /// Peeled value for tags
    pub peeled: Option<[u8; 32]>,

    /// Symbolic target if symref
    pub symbolic_target: Option<String>,
}
```

### REF_UPDATE (0x11)

Update references (push).

```rust
pub struct RefUpdateRequest {
    pub repository_id: Uuid,
    pub updates: Vec<RefUpdate>,
    pub atomic: bool,  // All-or-nothing
}

pub struct RefUpdate {
    pub name: String,
    pub old_hash: Option<[u8; 32]>,  // None for create
    pub new_hash: Option<[u8; 32]>,  // None for delete
    pub force: bool,
}

pub struct RefUpdateResponse {
    pub success: bool,
    pub results: Vec<RefUpdateResult>,
}

pub struct RefUpdateResult {
    pub name: String,
    pub status: RefUpdateStatus,
    pub message: Option<String>,
}

pub enum RefUpdateStatus {
    Ok,
    Rejected,
    NonFastForward,
    LockFailed,
    Denied,
}
```

### MANIFEST_REQUEST (0x12)

Request file manifest for a commit.

```rust
pub struct ManifestRequest {
    pub repository_id: Uuid,
    pub commit_hash: [u8; 32],

    /// Optional path filter
    pub path_prefix: Option<String>,

    /// Depth limit (-1 for unlimited)
    pub depth: i32,
}

pub struct ManifestResponse {
    pub commit_hash: [u8; 32],
    pub entries: Vec<ManifestEntry>,
    pub truncated: bool,
}

pub struct ManifestEntry {
    pub path: String,
    pub mode: u32,
    pub object_type: ObjectType,
    pub hash: [u8; 32],
    pub size: u64,
    pub chunks: Vec<[u8; 32]>,
}
```

## Error Handling

### ERROR (0x05)

Protocol-level error message.

```rust
pub struct ErrorMessage {
    /// Error code
    pub code: ErrorCode,

    /// Related request ID
    pub request_id: Option<u64>,

    /// Related stream ID
    pub stream_id: Option<u64>,

    /// Human-readable message
    pub message: String,

    /// Retry information
    pub retry: Option<RetryInfo>,
}

#[repr(u16)]
pub enum ErrorCode {
    // Protocol errors (1xxx)
    InvalidMessage      = 1000,
    UnsupportedVersion  = 1001,
    InvalidChecksum     = 1002,
    MessageTooLarge     = 1003,
    StreamError         = 1004,

    // Authentication errors (2xxx)
    AuthRequired        = 2000,
    AuthFailed          = 2001,
    TokenExpired        = 2002,
    InsufficientScope   = 2003,
    MfaRequired         = 2004,

    // Resource errors (3xxx)
    NotFound            = 3000,
    AlreadyExists       = 3001,
    Conflict            = 3002,
    Gone                = 3003,

    // Permission errors (4xxx)
    AccessDenied        = 4000,
    ReadOnly            = 4001,
    Locked              = 4002,

    // Server errors (5xxx)
    InternalError       = 5000,
    Unavailable         = 5001,
    Overloaded          = 5002,
    Timeout             = 5003,
    StorageError        = 5004,

    // Transfer errors (6xxx)
    TransferFailed      = 6000,
    ChecksumMismatch    = 6001,
    UploadExpired       = 6002,
    ResumeFailed        = 6003,
}

pub struct RetryInfo {
    /// Whether retry is allowed
    pub retryable: bool,

    /// Minimum delay before retry (ms)
    pub retry_after_ms: u32,

    /// Maximum retries suggested
    pub max_retries: u8,
}
```

### GO_AWAY (0x07)

Server graceful shutdown.

```rust
pub struct GoAway {
    /// Reason for shutdown
    pub reason: GoAwayReason,

    /// Last stream ID that was processed
    pub last_stream_id: u64,

    /// Human-readable message
    pub message: Option<String>,

    /// Reconnect delay in seconds
    pub reconnect_after_seconds: Option<u32>,
}

pub enum GoAwayReason {
    Shutdown,
    Maintenance,
    Overloaded,
    ProtocolError,
    InternalError,
}
```

## Flow Control

### Connection-Level Flow Control

```rust
pub struct FlowControlConfig {
    /// Initial connection window size (bytes)
    pub initial_connection_window: u64,

    /// Initial stream window size (bytes)
    pub initial_stream_window: u64,

    /// Maximum stream window size (bytes)
    pub max_stream_window: u64,

    /// Maximum concurrent bidirectional streams
    pub max_bidirectional_streams: u64,

    /// Maximum concurrent unidirectional streams
    pub max_unidirectional_streams: u64,
}

// Recommended defaults
impl Default for FlowControlConfig {
    fn default() -> Self {
        Self {
            initial_connection_window: 16 * 1024 * 1024,  // 16 MB
            initial_stream_window: 1 * 1024 * 1024,       // 1 MB
            max_stream_window: 8 * 1024 * 1024,           // 8 MB
            max_bidirectional_streams: 100,
            max_unidirectional_streams: 100,
        }
    }
}
```

### Adaptive Streaming

```rust
pub struct AdaptiveStreamConfig {
    /// Enable adaptive streaming
    pub enabled: bool,

    /// Minimum chunk segment size
    pub min_segment_size: u32,      // 32 KB

    /// Maximum chunk segment size
    pub max_segment_size: u32,      // 4 MB

    /// Target buffer fill level
    pub target_buffer_fill: f32,    // 0.75

    /// RTT smoothing factor
    pub rtt_smoothing: f32,         // 0.125

    /// Bandwidth estimation window
    pub bandwidth_window_ms: u32,   // 1000
}
```

## Congestion Control

### Algorithm Selection

```rust
pub enum CongestionAlgorithm {
    /// CUBIC (default)
    Cubic,

    /// BBR v2 (for high-bandwidth networks)
    Bbr,

    /// Reno (conservative)
    Reno,
}

pub struct CongestionConfig {
    pub algorithm: CongestionAlgorithm,

    /// Initial congestion window (packets)
    pub initial_window: u32,

    /// Minimum congestion window (packets)
    pub minimum_window: u32,

    /// Maximum congestion window (packets)
    pub maximum_window: u32,

    /// Loss reduction factor
    pub loss_reduction_factor: f32,

    /// Enable pacing
    pub pacing_enabled: bool,
}

impl Default for CongestionConfig {
    fn default() -> Self {
        Self {
            algorithm: CongestionAlgorithm::Cubic,
            initial_window: 10,
            minimum_window: 2,
            maximum_window: 10000,
            loss_reduction_factor: 0.5,
            pacing_enabled: true,
        }
    }
}
```

## Security Considerations

### Channel Binding

```rust
/// Binds authentication to the TLS session
pub struct ChannelBinding {
    /// TLS Finished message hash
    pub tls_finished: [u8; 32],

    /// Token binding ID
    pub binding_id: Vec<u8>,
}
```

### Request Signing

For sensitive operations (push, force-push, lock):

```rust
pub struct SignedRequest {
    /// Original request bytes
    pub request: Vec<u8>,

    /// Ed25519 signature
    pub signature: [u8; 64],

    /// Signing key ID
    pub key_id: String,

    /// Timestamp (Unix ms)
    pub timestamp: u64,

    /// Nonce for replay protection
    pub nonce: [u8; 16],
}
```

### Rate Limiting Headers

Embedded in AUTH_RESPONSE and ERROR messages:

```rust
pub struct RateLimitInfo {
    /// Requests remaining in window
    pub remaining: u32,

    /// Window reset time (Unix seconds)
    pub reset_at: u64,

    /// Retry-After for 429 responses
    pub retry_after_seconds: Option<u32>,
}
```

## Connection Lifecycle

### Keep-Alive

```
PING/PONG interval: 30 seconds
Idle timeout: 5 minutes
Max connection duration: 24 hours
```

### Graceful Shutdown Sequence

```
┌────────┐                                    ┌────────┐
│ Client │                                    │ Server │
└───┬────┘                                    └───┬────┘
    │                                             │
    │  (Complete in-flight requests)             │
    │                                             │
    │  CLOSE (Stream 0)                          │
    │────────────────────────────────────────────>│
    │                                             │
    │  (Server completes in-flight)              │
    │                                             │
    │  CLOSE ACK (Stream 0)                      │
    │<────────────────────────────────────────────│
    │                                             │
    │  QUIC CONNECTION_CLOSE                     │
    │<───────────────────────────────────────────>│
```

## Implementation Example

### Client Connection

```rust
use quinn::{ClientConfig, Endpoint};
use std::sync::Arc;

pub struct DitsClient {
    endpoint: Endpoint,
    connection: Option<quinn::Connection>,
    config: ClientConfig,
}

impl DitsClient {
    pub async fn connect(&mut self, addr: &str) -> Result<(), DitsError> {
        let server_addr = addr.parse()?;

        let connection = self.endpoint
            .connect_with(self.config.clone(), server_addr, "dits.example.com")?
            .await?;

        // Authenticate
        let (mut send, mut recv) = connection.open_bi().await?;

        let auth_request = AuthRequest {
            method: AuthMethod::BearerToken,
            credentials: AuthCredentials {
                token: Some(self.token.clone()),
                ..Default::default()
            },
            repositories: vec![],
            capabilities: ClientCapabilities::all(),
        };

        send_message(&mut send, &auth_request).await?;
        let response: AuthResponse = recv_message(&mut recv).await?;

        if response.status != AuthStatus::Success {
            return Err(DitsError::AuthFailed(response.error));
        }

        self.connection = Some(connection);
        Ok(())
    }

    pub async fn fetch_chunks(
        &self,
        repository_id: Uuid,
        hashes: Vec<[u8; 32]>,
    ) -> Result<Vec<Chunk>, DitsError> {
        let conn = self.connection.as_ref()
            .ok_or(DitsError::NotConnected)?;

        // Open metadata stream for request
        let (mut send, mut recv) = conn.open_bi().await?;

        let request = ChunkRequest {
            repository_id,
            chunks: hashes.iter().map(|h| ChunkSpec {
                hash: *h,
                expected_size: None,
                range: None,
                priority: 0,
            }).collect(),
            preferences: TransferPreferences::default(),
        };

        send_message(&mut send, &request).await?;
        let response: ChunkResponse = recv_message(&mut recv).await?;

        // Receive chunks on assigned streams
        let mut chunks = Vec::new();
        for assignment in response.stream_assignments {
            let chunk = self.receive_chunk(conn, assignment).await?;
            chunks.push(chunk);
        }

        Ok(chunks)
    }

    async fn receive_chunk(
        &self,
        conn: &quinn::Connection,
        assignment: StreamAssignment,
    ) -> Result<Chunk, DitsError> {
        let recv = conn.accept_uni().await?;
        let mut reader = recv;

        let mut data = Vec::new();
        let mut hasher = blake3::Hasher::new();

        loop {
            let chunk_data: ChunkData = recv_message(&mut reader).await?;

            let decompressed = decompress(&chunk_data.data, chunk_data.compression)?;
            hasher.update(&decompressed);
            data.extend(decompressed);

            if chunk_data.is_final {
                break;
            }
        }

        // Verify hash
        let computed_hash = hasher.finalize();
        if computed_hash.as_bytes() != &assignment.hash {
            return Err(DitsError::ChecksumMismatch);
        }

        Ok(Chunk {
            hash: assignment.hash,
            data,
        })
    }
}
```

### Server Handler

```rust
use quinn::{Endpoint, ServerConfig};
use std::sync::Arc;

pub struct DitsServer {
    endpoint: Endpoint,
    storage: Arc<ChunkStorage>,
    auth: Arc<AuthService>,
}

impl DitsServer {
    pub async fn run(&self) -> Result<(), DitsError> {
        while let Some(conn) = self.endpoint.accept().await {
            let connection = conn.await?;

            let storage = self.storage.clone();
            let auth = self.auth.clone();

            tokio::spawn(async move {
                if let Err(e) = handle_connection(connection, storage, auth).await {
                    tracing::error!("Connection error: {}", e);
                }
            });
        }
        Ok(())
    }
}

async fn handle_connection(
    conn: quinn::Connection,
    storage: Arc<ChunkStorage>,
    auth: Arc<AuthService>,
) -> Result<(), DitsError> {
    // First bidirectional stream is control
    let (mut send, mut recv) = conn.accept_bi().await?;

    // Authenticate
    let auth_request: AuthRequest = recv_message(&mut recv).await?;
    let session = auth.authenticate(&auth_request).await?;

    let response = AuthResponse {
        status: AuthStatus::Success,
        session_id: Some(session.id),
        grants: session.grants.clone(),
        server_capabilities: ServerCapabilities::all(),
        session_ticket: Some(session.create_ticket()?),
        error: None,
    };

    send_message(&mut send, &response).await?;

    // Handle streams
    loop {
        tokio::select! {
            stream = conn.accept_bi() => {
                let (send, recv) = stream?;
                let storage = storage.clone();
                let session = session.clone();

                tokio::spawn(async move {
                    handle_stream(send, recv, storage, session).await
                });
            }
            _ = conn.closed() => {
                break;
            }
        }
    }

    Ok(())
}

async fn handle_stream(
    mut send: quinn::SendStream,
    mut recv: quinn::RecvStream,
    storage: Arc<ChunkStorage>,
    session: Session,
) -> Result<(), DitsError> {
    let header: MessageHeader = recv_header(&mut recv).await?;

    match header.message_type {
        MessageType::ChunkRequest => {
            let request: ChunkRequest = recv_payload(&mut recv, &header).await?;

            // Validate access
            session.check_access(request.repository_id, AccessLevel::Read)?;

            // Build response
            let mut statuses = Vec::new();
            let mut assignments = Vec::new();
            let mut stream_id = 4u64;

            for chunk_spec in &request.chunks {
                match storage.check_chunk(&chunk_spec.hash).await {
                    Ok(info) => {
                        statuses.push(ChunkStatus {
                            hash: chunk_spec.hash,
                            status: ChunkAvailability::Available,
                            transfer_size: info.compressed_size,
                            delta_info: None,
                        });

                        assignments.push(StreamAssignment {
                            stream_id,
                            hash: chunk_spec.hash,
                            priority: chunk_spec.priority,
                        });
                        stream_id += 4;
                    }
                    Err(StorageError::NotFound) => {
                        statuses.push(ChunkStatus {
                            hash: chunk_spec.hash,
                            status: ChunkAvailability::NotFound,
                            transfer_size: 0,
                            delta_info: None,
                        });
                    }
                    Err(e) => return Err(e.into()),
                }
            }

            let response = ChunkResponse {
                chunks: statuses,
                stream_assignments: assignments.clone(),
                total_size: statuses.iter()
                    .filter(|s| matches!(s.status, ChunkAvailability::Available))
                    .map(|s| s.transfer_size)
                    .sum(),
                estimated_time_ms: None,
            };

            send_message(&mut send, &response).await?;

            // Send chunks on unidirectional streams
            for assignment in assignments {
                let storage = storage.clone();
                let conn = send.connection();

                tokio::spawn(async move {
                    let mut uni = conn.open_uni().await?;
                    send_chunk(&mut uni, &storage, assignment.hash).await
                });
            }
        }

        MessageType::UploadInit => {
            // Handle upload initialization
            let request: UploadInit = recv_payload(&mut recv, &header).await?;
            session.check_access(request.repository_id, AccessLevel::Write)?;

            // Check which chunks we already have
            let mut statuses = Vec::new();
            for chunk_info in &request.chunks {
                let status = if storage.has_chunk(&chunk_info.hash).await? {
                    UploadStatus::AlreadyExists
                } else if let Some(partial) = storage.get_partial(&chunk_info.hash).await? {
                    UploadStatus::Resume { offset: partial.bytes_received }
                } else {
                    UploadStatus::Required
                };

                statuses.push(UploadChunkStatus {
                    hash: chunk_info.hash,
                    status,
                });
            }

            let upload_id = Uuid::new_v4();
            let response = UploadInitResponse {
                upload_id,
                chunks: statuses,
                stream_assignments: vec![],  // Client opens streams
                expires_at: Utc::now() + chrono::Duration::hours(24),
            };

            send_message(&mut send, &response).await?;
        }

        _ => {
            return Err(DitsError::UnsupportedMessage(header.message_type));
        }
    }

    Ok(())
}
```

## Performance Tuning

### Recommended Settings by Network Type

| Setting | LAN | Broadband | Satellite |
|---------|-----|-----------|-----------|
| Initial window | 32 packets | 10 packets | 4 packets |
| Stream window | 8 MB | 1 MB | 256 KB |
| Connection window | 64 MB | 16 MB | 4 MB |
| Max streams | 200 | 100 | 20 |
| Congestion algo | BBR | CUBIC | Reno |
| Segment size | 4 MB | 1 MB | 128 KB |

### Metrics to Monitor

```rust
pub struct ConnectionMetrics {
    /// Round-trip time (smoothed)
    pub srtt_us: u64,

    /// RTT variance
    pub rttvar_us: u64,

    /// Congestion window (bytes)
    pub cwnd: u64,

    /// Bytes in flight
    pub bytes_in_flight: u64,

    /// Packets lost
    pub packets_lost: u64,

    /// Packets sent
    pub packets_sent: u64,

    /// Bytes sent
    pub bytes_sent: u64,

    /// Bytes received
    pub bytes_received: u64,

    /// Current estimated bandwidth (bytes/sec)
    pub estimated_bandwidth: u64,
}
```

## Appendix: Wire Format Quick Reference

### Magic Numbers

| Value | Meaning |
|-------|---------|
| `0x44495453` | DITS message ("DITS") |
| `0x4C465300` | LFS extension message |

### Version History

| Version | Features |
|---------|----------|
| 1 | Initial protocol |

### Size Limits

| Limit | Value |
|-------|-------|
| Max message size | 16 MB |
| Max chunk segment | 4 MB |
| Max path length | 4096 bytes |
| Max concurrent streams | 1000 |
| Max request ID | 2^64 - 1 |

---

## Performance Optimizations

### High-Performance QUIC Configuration

#### For Maximum Throughput (LAN/10Gbps+)

```rust
pub fn high_throughput_config() -> TransportConfig {
    let mut config = TransportConfig::default();

    // Large initial windows
    config.initial_window(128 * 1024);          // 128KB initial cwnd
    config.receive_window(256 * 1024 * 1024);   // 256MB receive window
    config.send_window(256 * 1024 * 1024);      // 256MB send window

    // Stream configuration
    config.max_concurrent_bidi_streams(500u32.into());
    config.stream_receive_window(32 * 1024 * 1024);  // 32MB per stream

    // Datagram configuration
    config.datagram_receive_buffer_size(Some(65536));
    config.datagram_send_buffer_size(65536);

    // Keep-alive
    config.max_idle_timeout(Some(Duration::from_secs(60)));
    config.keep_alive_interval(Some(Duration::from_secs(10)));

    // Congestion control: BBR for high throughput
    config.congestion_controller_factory(Arc::new(BbrConfig::default()));

    config
}
```

#### For Low Latency (Interactive/VFS)

```rust
pub fn low_latency_config() -> TransportConfig {
    let mut config = TransportConfig::default();

    // Smaller windows for faster ACK
    config.initial_window(32 * 1024);           // 32KB initial
    config.receive_window(4 * 1024 * 1024);     // 4MB receive
    config.send_window(4 * 1024 * 1024);        // 4MB send

    // More streams for parallel small requests
    config.max_concurrent_bidi_streams(1000u32.into());
    config.stream_receive_window(1024 * 1024);  // 1MB per stream

    // Aggressive keep-alive
    config.max_idle_timeout(Some(Duration::from_secs(30)));
    config.keep_alive_interval(Some(Duration::from_secs(5)));

    // CUBIC for lower latency
    config.congestion_controller_factory(Arc::new(CubicConfig::default()));

    // Enable PMTUD for optimal packet size
    config.mtu_discovery_config(Some(MtuDiscoveryConfig::default()));

    config
}
```

#### For High-Latency Networks (Satellite/WAN)

```rust
pub fn high_latency_config() -> TransportConfig {
    let mut config = TransportConfig::default();

    // Very large windows to fill the pipe
    config.initial_window(64 * 1024);
    config.receive_window(512 * 1024 * 1024);   // 512MB to handle BDP
    config.send_window(512 * 1024 * 1024);

    // Fewer streams to reduce head-of-line blocking overhead
    config.max_concurrent_bidi_streams(50u32.into());
    config.stream_receive_window(64 * 1024 * 1024);  // 64MB per stream

    // Long idle timeout for satellite
    config.max_idle_timeout(Some(Duration::from_secs(120)));
    config.keep_alive_interval(Some(Duration::from_secs(30)));

    // BBR handles high latency well
    config.congestion_controller_factory(Arc::new(BbrConfig::default()));

    config
}
```

### Zero-Copy I/O

```rust
/// Zero-copy chunk sender using sendfile/splice
pub struct ZeroCopyChunkSender {
    socket: UdpSocket,
}

impl ZeroCopyChunkSender {
    /// Send chunk directly from file to network (Linux)
    #[cfg(target_os = "linux")]
    pub async fn send_from_file(
        &self,
        file: &File,
        offset: u64,
        length: usize,
        stream: &mut SendStream,
    ) -> Result<()> {
        use std::os::unix::io::AsRawFd;

        // Create pipe for splice
        let (read_pipe, write_pipe) = pipe()?;

        // Splice from file to pipe (zero-copy)
        let spliced = splice(
            file.as_raw_fd(),
            Some(&mut (offset as i64)),
            write_pipe.as_raw_fd(),
            None,
            length,
            SpliceFlags::SPLICE_F_MOVE | SpliceFlags::SPLICE_F_MORE,
        )?;

        // Splice from pipe to socket (zero-copy)
        let sent = splice(
            read_pipe.as_raw_fd(),
            None,
            self.socket.as_raw_fd(),
            None,
            spliced,
            SpliceFlags::SPLICE_F_MOVE,
        )?;

        Ok(())
    }

    /// Send using scatter-gather I/O
    pub async fn send_vectored(
        &self,
        header: &[u8],
        chunk_data: &[u8],
        stream: &mut SendStream,
    ) -> Result<()> {
        let bufs = [
            IoSlice::new(header),
            IoSlice::new(chunk_data),
        ];

        stream.write_all_vectored(&mut bufs.iter().copied()).await?;
        Ok(())
    }
}
```

### Multi-Path QUIC (Experimental)

For clients with multiple network interfaces:

```rust
/// Multi-path QUIC configuration
pub struct MultiPathConfig {
    /// Primary path (usually WiFi)
    pub primary: SocketAddr,
    /// Secondary paths (e.g., cellular, Ethernet)
    pub secondary: Vec<SocketAddr>,
    /// Path selection strategy
    pub strategy: PathStrategy,
    /// Enable path migration
    pub enable_migration: bool,
}

#[derive(Clone, Copy)]
pub enum PathStrategy {
    /// Use lowest latency path
    LowestLatency,
    /// Use highest throughput path
    HighestThroughput,
    /// Round-robin across paths
    RoundRobin,
    /// Use all paths simultaneously
    Aggregate,
    /// Primary with failover
    PrimaryWithFailover,
}

impl MultiPathQuic {
    /// Create connection with multi-path support
    pub async fn connect_multipath(
        &self,
        config: MultiPathConfig,
    ) -> Result<MultiPathConnection> {
        // Establish primary connection
        let primary = self.connect(config.primary).await?;

        // Probe secondary paths
        let mut paths = vec![PathInfo::new(config.primary, true)];

        for addr in &config.secondary {
            if let Ok(rtt) = self.probe_path(*addr).await {
                paths.push(PathInfo {
                    addr: *addr,
                    rtt,
                    active: true,
                    is_primary: false,
                });
            }
        }

        Ok(MultiPathConnection {
            connection: primary,
            paths,
            strategy: config.strategy,
        })
    }

    /// Send chunk using multi-path
    pub async fn send_multipath(
        &self,
        conn: &mut MultiPathConnection,
        chunk: &Chunk,
    ) -> Result<()> {
        match conn.strategy {
            PathStrategy::Aggregate => {
                // Split chunk across paths proportionally to bandwidth
                let total_bw: f64 = conn.paths.iter()
                    .map(|p| p.estimated_bandwidth)
                    .sum();

                let mut offset = 0;
                for path in &conn.paths {
                    let share = (path.estimated_bandwidth / total_bw * chunk.data.len() as f64) as usize;
                    let end = (offset + share).min(chunk.data.len());

                    self.send_on_path(path.addr, &chunk.data[offset..end]).await?;
                    offset = end;
                }
            }
            PathStrategy::LowestLatency => {
                let best = conn.paths.iter()
                    .min_by_key(|p| p.rtt)
                    .ok_or(Error::NoPath)?;
                self.send_on_path(best.addr, &chunk.data).await?;
            }
            _ => todo!("Other strategies"),
        }
        Ok(())
    }
}
```

### Adaptive Chunk Scheduling

```rust
/// Scheduler that adapts to network conditions
pub struct AdaptiveScheduler {
    /// Current network estimation
    bandwidth: BandwidthEstimator,
    /// RTT tracker
    rtt: RttTracker,
    /// Loss rate tracker
    loss: LossTracker,
    /// Pending chunks
    queue: PriorityQueue<ScheduledChunk>,
}

impl AdaptiveScheduler {
    /// Schedule chunks for optimal transfer
    pub fn schedule(&mut self, chunks: Vec<Chunk>) -> Vec<ScheduledTransfer> {
        let mut transfers = Vec::new();

        // Calculate optimal batch based on BDP
        let bdp = self.bandwidth.estimate() * self.rtt.smoothed().as_secs_f64();
        let batch_size = (bdp as usize).clamp(64 * 1024, 64 * 1024 * 1024);

        // Calculate optimal concurrency based on loss rate
        let concurrency = if self.loss.rate() > 0.01 {
            // High loss: reduce concurrency
            4.max((self.rtt.smoothed().as_millis() as usize / 10).min(16))
        } else {
            // Low loss: can be more aggressive
            8.max((self.rtt.smoothed().as_millis() as usize / 5).min(64))
        };

        // Sort chunks by priority and size
        let mut sorted: Vec<_> = chunks.into_iter()
            .map(|c| (c.priority, c.data.len(), c))
            .collect();
        sorted.sort_by(|a, b| {
            a.0.cmp(&b.0).then_with(|| b.1.cmp(&a.1)) // Higher priority, larger first
        });

        // Create batches
        let mut current_batch = Vec::new();
        let mut current_size = 0;

        for (_, size, chunk) in sorted {
            if current_size + size > batch_size && !current_batch.is_empty() {
                transfers.push(ScheduledTransfer {
                    chunks: std::mem::take(&mut current_batch),
                    concurrency,
                    deadline: None,
                });
                current_size = 0;
            }
            current_batch.push(chunk);
            current_size += size;
        }

        if !current_batch.is_empty() {
            transfers.push(ScheduledTransfer {
                chunks: current_batch,
                concurrency,
                deadline: None,
            });
        }

        transfers
    }

    /// Update estimates from completed transfer
    pub fn record_transfer(&mut self, bytes: usize, duration: Duration, lost: usize) {
        self.bandwidth.record(bytes, duration);
        self.loss.record(bytes, lost);
    }
}
```

### Connection Pooling

```rust
/// Connection pool for persistent connections
pub struct ConnectionPool {
    /// Active connections by endpoint
    connections: DashMap<SocketAddr, PooledConnection>,
    /// Configuration
    config: PoolConfig,
    /// Endpoint for creating new connections
    endpoint: Endpoint,
}

pub struct PoolConfig {
    /// Maximum connections per endpoint
    pub max_connections_per_endpoint: usize,
    /// Connection idle timeout
    pub idle_timeout: Duration,
    /// Maximum total connections
    pub max_total_connections: usize,
    /// Connection creation timeout
    pub connect_timeout: Duration,
}

impl ConnectionPool {
    /// Get or create connection
    pub async fn get(&self, addr: SocketAddr) -> Result<PooledConnection> {
        // Try existing connection
        if let Some(conn) = self.connections.get(&addr) {
            if conn.is_healthy() {
                return Ok(conn.clone());
            }
        }

        // Create new connection
        let conn = tokio::time::timeout(
            self.config.connect_timeout,
            self.endpoint.connect(addr, "dits")?,
        ).await??;

        let pooled = PooledConnection::new(conn);
        self.connections.insert(addr, pooled.clone());

        Ok(pooled)
    }

    /// Release connection back to pool
    pub fn release(&self, conn: PooledConnection) {
        // Connection returns automatically via Drop
        // Just mark as available
        conn.mark_available();
    }

    /// Background task to maintain pool
    pub async fn maintain(&self) {
        loop {
            tokio::time::sleep(Duration::from_secs(30)).await;

            // Remove dead connections
            self.connections.retain(|_, conn| conn.is_healthy());

            // Close idle connections
            for mut entry in self.connections.iter_mut() {
                if entry.value().idle_time() > self.config.idle_timeout {
                    entry.value_mut().close();
                }
            }
        }
    }
}
```

### Performance Monitoring

```rust
/// Real-time performance metrics
pub struct PerformanceMonitor {
    /// Per-connection metrics
    connections: DashMap<ConnectionId, ConnectionStats>,
    /// Aggregate throughput (rolling window)
    throughput: RollingAverage,
    /// Aggregate latency
    latency: LatencyHistogram,
    /// Export callback
    exporter: Option<Box<dyn MetricsExporter>>,
}

impl PerformanceMonitor {
    /// Record chunk transfer
    pub fn record_transfer(
        &self,
        conn_id: ConnectionId,
        bytes: u64,
        duration: Duration,
        retries: u32,
    ) {
        // Update connection stats
        if let Some(mut stats) = self.connections.get_mut(&conn_id) {
            stats.bytes_transferred += bytes;
            stats.transfers_completed += 1;
            stats.total_retries += retries as u64;
            stats.last_activity = Instant::now();
        }

        // Update aggregates
        self.throughput.record(bytes as f64 / duration.as_secs_f64());
        self.latency.record(duration);

        // Export if configured
        if let Some(exporter) = &self.exporter {
            exporter.export_transfer(bytes, duration, retries);
        }
    }

    /// Get current throughput (bytes/sec)
    pub fn current_throughput(&self) -> f64 {
        self.throughput.average()
    }

    /// Get latency percentiles
    pub fn latency_percentiles(&self) -> LatencyPercentiles {
        self.latency.percentiles()
    }

    /// Generate performance report
    pub fn report(&self) -> PerformanceReport {
        PerformanceReport {
            throughput_mbps: self.current_throughput() / 1_000_000.0 * 8.0,
            latency_p50: self.latency.p50(),
            latency_p95: self.latency.p95(),
            latency_p99: self.latency.p99(),
            active_connections: self.connections.len(),
            total_bytes: self.connections.iter()
                .map(|c| c.bytes_transferred)
                .sum(),
            total_retries: self.connections.iter()
                .map(|c| c.total_retries)
                .sum(),
        }
    }
}
```

### Performance Targets Summary

| Metric | LAN Target | WAN Target | Satellite Target |
|--------|------------|------------|------------------|
| Throughput | 1+ Gbps | 100+ Mbps | 10+ Mbps |
| Latency (p50) | < 1ms | < 50ms | < 300ms |
| Latency (p99) | < 10ms | < 200ms | < 1000ms |
| Connection setup | < 5ms | < 100ms | < 500ms |
| 0-RTT success | > 95% | > 90% | > 80% |
| Retransmit rate | < 0.1% | < 1% | < 5% |
