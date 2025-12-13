import { Metadata } from "next";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const metadata: Metadata = {
  title: "Network Protocol",
  description: "The Dits network protocol for efficient data transfer",
};

export default function ProtocolPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Network Protocol</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits uses a custom protocol over QUIC for efficient, resumable transfers
        of large datasets with delta synchronization.
      </p>

      <h2>Transport Layer</h2>
      <p>
        Dits uses QUIC (via the <code>quinn</code> crate) as its primary transport:
      </p>

      <h3>Why QUIC?</h3>
      <ul>
        <li><strong>Multiplexing:</strong> Multiple streams without head-of-line blocking</li>
        <li><strong>0-RTT:</strong> Faster connection establishment for repeat connections</li>
        <li><strong>Connection migration:</strong> Handles network changes gracefully</li>
        <li><strong>Built-in encryption:</strong> TLS 1.3 by default</li>
        <li><strong>Better congestion control:</strong> Designed for modern networks</li>
      </ul>

      <pre className="not-prose">
        <code>{`Connection Setup:
Client                              Server
   |                                   |
   |-------- QUIC Handshake --------→ |
   |←------- QUIC Handshake --------- |
   |                                   |
   |------ Authentication Frame ----→ |
   |←----- Auth Result Frame -------- |
   |                                   |
   | (Multiple bidirectional streams) |
   |←------------------------------- →|`}</code>
      </pre>

      <h2>Protocol Messages</h2>
      <p>
        All messages are serialized using MessagePack for compact binary representation:
      </p>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Message Type</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Purpose</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">AUTH</TableCell>
            <TableCell>C → S</TableCell>
            <TableCell>Client authentication</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">LIST_REFS</TableCell>
            <TableCell>C → S</TableCell>
            <TableCell>Get remote references</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">HAVE</TableCell>
            <TableCell>C ↔ S</TableCell>
            <TableCell>Advertise owned chunks</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">WANT</TableCell>
            <TableCell>C → S</TableCell>
            <TableCell>Request specific chunks</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">CHUNK</TableCell>
            <TableCell>C ↔ S</TableCell>
            <TableCell>Transfer chunk data</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">OBJECT</TableCell>
            <TableCell>C ↔ S</TableCell>
            <TableCell>Transfer commits/trees/assets</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">UPDATE_REF</TableCell>
            <TableCell>C → S</TableCell>
            <TableCell>Update a reference (push)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">ACK</TableCell>
            <TableCell>S → C</TableCell>
            <TableCell>Acknowledge receipt</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">ERROR</TableCell>
            <TableCell>S → C</TableCell>
            <TableCell>Error response</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Message Formats</h2>

      <h3>Authentication</h3>
      <pre className="not-prose">
        <code>{`message Auth {
    // Authentication method
    method: AuthMethod,

    // Credentials based on method
    credentials: Credentials,

    // Client capabilities
    capabilities: Vec<String>,
}

enum AuthMethod {
    Token,      // JWT bearer token
    SSH,        // SSH key signature
    Password,   // Username/password (discouraged)
}

message AuthResult {
    success: bool,
    user_id: Option<String>,
    permissions: Vec<Permission>,
    error: Option<String>,
}`}</code>
      </pre>

      <h3>Reference Negotiation</h3>
      <pre className="not-prose">
        <code>{`message ListRefsRequest {
    // Optional prefix filter
    prefix: Option<String>,
}

message ListRefsResponse {
    refs: Vec<RefInfo>,
}

message RefInfo {
    name: String,           // e.g., "refs/heads/main"
    hash: [u8; 32],         // Commit hash
    peeled: Option<[u8; 32]>,  // For annotated tags
}`}</code>
      </pre>

      <h3>Chunk Negotiation</h3>
      <pre className="not-prose">
        <code>{`// Client advertises what it has
message HaveChunks {
    // List of chunk hashes client has
    chunks: Vec<[u8; 32]>,

    // Whether this is a complete list
    complete: bool,
}

// Client requests what it needs
message WantChunks {
    // List of chunk hashes needed
    chunks: Vec<[u8; 32]>,

    // Priority hints
    priority: Priority,
}

enum Priority {
    Low,      // Background fetch
    Normal,   // Standard fetch
    High,     // User is waiting
    Urgent,   // Blocking operation
}`}</code>
      </pre>

      <h3>Chunk Transfer</h3>
      <pre className="not-prose">
        <code>{`message ChunkData {
    // Chunk hash (for verification)
    hash: [u8; 32],

    // Compression used
    compression: Compression,

    // The data (compressed if applicable)
    data: Vec<u8>,

    // Sequence number (for ordering)
    sequence: u64,
}

// Server acknowledges chunks
message ChunkAck {
    // Hashes of successfully received chunks
    received: Vec<[u8; 32]>,

    // Hashes of chunks to resend
    resend: Vec<[u8; 32]>,
}`}</code>
      </pre>

      <h2>Fetch Protocol</h2>
      <pre className="not-prose">
        <code>{`Fetch Flow:

Client                              Server
   |                                   |
   |-------- LIST_REFS -------------→ |
   |←------- refs list --------------- |
   |                                   |
   |-------- WANT commits ----------→ |
   |←------- commit objects --------- |
   |                                   |
   |-------- WANT trees ------------→ |
   |←------- tree objects ----------- |
   |                                   |
   |-------- WANT assets -----------→ |
   |←------- asset manifests -------- |
   |                                   |
   |-------- HAVE chunks -----------→ |
   |←------- CHUNK (delta) ---------- |
   |←------- CHUNK (delta) ---------- |
   |←------- CHUNK (delta) ---------- |
   |-------- ACK -------------------→ |
   |                                   |
   |-------- DONE ------------------→ |`}</code>
      </pre>

      <h2>Push Protocol</h2>
      <pre className="not-prose">
        <code>{`Push Flow:

Client                              Server
   |                                   |
   |-------- LIST_REFS -------------→ |
   |←------- refs list --------------- |
   |                                   |
   |  (Client computes delta)          |
   |                                   |
   |-------- HAVE chunks -----------→ |
   |←------- WANT chunks ------------ |
   |                                   |
   |-------- CHUNK -----------------→ |
   |-------- CHUNK -----------------→ |
   |-------- CHUNK -----------------→ |
   |←------- ACK -------------------- |
   |                                   |
   |-------- OBJECT (assets) -------→ |
   |-------- OBJECT (trees) --------→ |
   |-------- OBJECT (commits) ------→ |
   |                                   |
   |-------- UPDATE_REF ------------→ |
   |←------- ACK/ERROR -------------- |`}</code>
      </pre>

      <h2>Parallel Streams</h2>
      <p>
        QUIC allows multiple streams per connection. Dits uses this for parallel
        chunk transfer:
      </p>

      <pre className="not-prose">
        <code>{`// Stream allocation
Stream 0: Control messages (AUTH, LIST_REFS, UPDATE_REF)
Stream 1: Object transfer (commits, trees, assets)
Stream 2-N: Parallel chunk transfer

// Example: 8 parallel chunk streams
fn transfer_chunks(chunks: Vec<Chunk>, connection: &Connection) {
    let streams: Vec<_> = (0..8)
        .map(|_| connection.open_bi())
        .collect();

    // Distribute chunks across streams
    for (i, chunk) in chunks.into_iter().enumerate() {
        let stream = &streams[i % 8];
        stream.send(ChunkData::from(chunk)).await?;
    }
}`}</code>
      </pre>

      <h2>Resumable Transfers</h2>
      <p>
        Transfers can be resumed after interruption:
      </p>

      <pre className="not-prose">
        <code>{`// Client tracks transfer state
struct TransferState {
    // Unique transfer ID
    id: Uuid,

    // Chunks already confirmed
    completed: HashSet<[u8; 32]>,

    // Chunks in flight (sent but not ACKed)
    pending: HashSet<[u8; 32]>,

    // Chunks still to send
    remaining: Vec<[u8; 32]>,
}

// Resume protocol
message ResumeRequest {
    transfer_id: Uuid,
    last_ack_sequence: u64,
}

message ResumeResponse {
    // Server's view of completed chunks
    completed: Vec<[u8; 32]>,

    // Resume from this point
    resume_from: u64,
}`}</code>
      </pre>

      <h2>Bandwidth Adaptation</h2>
      <p>
        Dits adjusts transfer parameters based on network conditions:
      </p>

      <pre className="not-prose">
        <code>{`struct BandwidthEstimator {
    // Exponentially weighted moving average
    estimated_bandwidth: f64,

    // Current RTT
    rtt: Duration,

    // Packet loss rate
    loss_rate: f64,
}

impl BandwidthEstimator {
    fn update(&mut self, bytes_sent: u64, time_taken: Duration) {
        let sample = bytes_sent as f64 / time_taken.as_secs_f64();
        self.estimated_bandwidth =
            0.8 * self.estimated_bandwidth + 0.2 * sample;
    }

    fn recommended_parallelism(&self) -> usize {
        // More streams for high bandwidth, fewer for constrained
        let base = (self.estimated_bandwidth / 10_000_000.0) as usize;
        base.clamp(1, 16)
    }

    fn recommended_chunk_batch(&self) -> usize {
        // Batch size based on bandwidth-delay product
        let bdp = self.estimated_bandwidth * self.rtt.as_secs_f64();
        (bdp / 1_000_000.0) as usize + 1
    }
}`}</code>
      </pre>

      <h2>REST API (Fallback)</h2>
      <p>
        For environments where QUIC is blocked, Dits supports HTTP/2 REST API:
      </p>

      <pre className="not-prose">
        <code>{`Endpoints:

GET  /api/v1/repos/{repo}/refs
GET  /api/v1/repos/{repo}/objects/{hash}
POST /api/v1/repos/{repo}/objects
GET  /api/v1/repos/{repo}/chunks/{hash}
POST /api/v1/repos/{repo}/chunks
PUT  /api/v1/repos/{repo}/refs/{name}

// Chunked upload for large data
POST /api/v1/repos/{repo}/upload
     Content-Type: application/octet-stream
     X-Dits-Chunk-Hash: {hash}
     X-Dits-Compression: zstd

// Batch operations
POST /api/v1/repos/{repo}/batch
     Content-Type: application/json
     {
       "operations": [
         {"op": "get_chunk", "hash": "..."},
         {"op": "get_chunk", "hash": "..."},
       ]
     }`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Protocol Selection</AlertTitle>
        <AlertDescription>
          Dits automatically selects the best available protocol. QUIC is
          preferred for performance, but falls back to HTTPS if UDP is blocked.
        </AlertDescription>
      </Alert>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/architecture/data-structures">Data Structures</Link> -
          What gets transferred
        </li>
        <li>
          <Link href="/docs/cli/remotes">Remote Commands</Link> -
          Using push/pull/fetch
        </li>
        <li>
          <Link href="/docs/advanced/encryption">Encryption</Link> -
          Securing transfers
        </li>
      </ul>
    </div>
  );
}
