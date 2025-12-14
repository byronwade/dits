import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Zap, Shield, Network, Clock, CheckCircle, AlertTriangle, Info } from "lucide-react";

export const metadata: Metadata = {
  title: "Wire Protocol",
  description: "Dits wire protocol specification for chunk transfer and sync",
};

export default function WireProtocolPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Dits Wire Protocol</h1>
      <p className="lead text-xl text-muted-foreground">
        The Dits wire protocol handles efficient, resumable transfer of chunks and metadata
        over QUIC, with built-in integrity verification and compression.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Protocol Version</AlertTitle>
        <AlertDescription>
          Current version: <strong>v1</strong>. The protocol is designed for forward compatibility
          with version negotiation and feature flags.
        </AlertDescription>
      </Alert>

      <h2>Overview</h2>
      <p>
        The Dits wire protocol is a binary protocol optimized for transferring large binary chunks
        and metadata between Dits clients and servers. Built on QUIC for reliable, multiplexed transport,
        it features:
      </p>
      <ul>
        <li><strong>Content-defined chunking</strong> - Variable-size chunks based on content patterns</li>
        <li><strong>BLAKE3 integrity</strong> - Cryptographic verification of all data</li>
        <li><strong>Resumable transfers</strong> - Continue interrupted uploads/downloads</li>
        <li><strong>Compression</strong> - Optional zstd compression for metadata</li>
        <li><strong>Multiplexing</strong> - Concurrent chunk transfers over single connection</li>
      </ul>

      <h2>Transport Layer</h2>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-blue-600" />
              QUIC Transport
            </CardTitle>
            <CardDescription>Modern UDP-based transport protocol</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong className="text-green-600">Advantages:</strong>
              <ul className="mt-1 space-y-1">
                <li>Built-in multiplexing (streams)</li>
                <li>Connection migration</li>
                <li>Forward error correction</li>
                <li>TLS 1.3 encryption</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Security Features
            </CardTitle>
            <CardDescription>End-to-end encryption and verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong className="text-green-600">Built-in:</strong>
              <ul className="mt-1 space-y-1">
                <li>TLS 1.3 encryption</li>
                <li>Content integrity (BLAKE3)</li>
                <li>Authentication (JWT/bearer tokens)</li>
                <li>Optional end-to-end encryption</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2>Message Framing</h2>
      <p>All wire protocol messages follow this binary frame structure:</p>

      <div className="bg-muted p-4 rounded-lg font-mono text-sm my-6">
        <div className="grid grid-cols-8 gap-2 text-center">
          <div className="col-span-4 border rounded p-2">
            <div className="text-xs text-muted-foreground">Magic (4 bytes)</div>
            <div className="font-bold">DITS</div>
          </div>
          <div className="border rounded p-2">
            <div className="text-xs text-muted-foreground">Version (1 byte)</div>
            <div className="font-bold">0x01</div>
          </div>
          <div className="border rounded p-2">
            <div className="text-xs text-muted-foreground">Type (1 byte)</div>
            <div className="font-bold">0x01-0xFF</div>
          </div>
          <div className="border rounded p-2">
            <div className="text-xs text-muted-foreground">Flags (1 byte)</div>
            <div className="font-bold">Bitfield</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="border rounded p-2">
            <div className="text-xs text-muted-foreground">Length (4 bytes, big-endian)</div>
            <div className="font-bold">Payload size</div>
          </div>
          <div className="border rounded p-2">
            <div className="text-xs text-muted-foreground">Payload (variable)</div>
            <div className="font-bold">Message data</div>
          </div>
        </div>
      </div>

      <h3>Message Types</h3>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Direction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">0x01</TableCell>
            <TableCell className="font-medium">HELLO</TableCell>
            <TableCell>Protocol handshake and version negotiation</TableCell>
            <TableCell>Bidirectional</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">0x02</TableCell>
            <TableCell className="font-medium">AUTH</TableCell>
            <TableCell>Authentication request/response</TableCell>
            <TableCell>Bidirectional</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">0x10</TableCell>
            <TableCell className="font-medium">HAVE_WANT</TableCell>
            <TableCell>Bloom filter sync for chunk discovery</TableCell>
            <TableCell>Bidirectional</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">0x11</TableCell>
            <TableCell className="font-medium">CHUNK_REQUEST</TableCell>
            <TableCell>Request specific chunks by hash</TableCell>
            <TableCell>Client → Server</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">0x12</TableCell>
            <TableCell className="font-medium">CHUNK_DATA</TableCell>
            <TableCell>Chunk data with integrity verification</TableCell>
            <TableCell>Server → Client</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">0x13</TableCell>
            <TableCell className="font-medium">CHUNK_UPLOAD</TableCell>
            <TableCell>Upload chunk to server</TableCell>
            <TableCell>Client → Server</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">0x20</TableCell>
            <TableCell className="font-medium">MANIFEST_PUSH</TableCell>
            <TableCell>Push manifest (file metadata)</TableCell>
            <TableCell>Client → Server</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">0x21</TableCell>
            <TableCell className="font-medium">MANIFEST_PULL</TableCell>
            <TableCell>Request manifest by commit hash</TableCell>
            <TableCell>Client → Server</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">0x30</TableCell>
            <TableCell className="font-medium">LOCK_ACQUIRE</TableCell>
            <TableCell>Request file lock</TableCell>
            <TableCell>Client → Server</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">0x31</TableCell>
            <TableCell className="font-medium">LOCK_RELEASE</TableCell>
            <TableCell>Release file lock</TableCell>
            <TableCell>Client → Server</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">0xFF</TableCell>
            <TableCell className="font-medium">ERROR</TableCell>
            <TableCell>Error response with details</TableCell>
            <TableCell>Bidirectional</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Flags</h2>
      <p>Message flags are encoded as a bitfield in the flags byte:</p>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Bit</TableHead>
            <TableHead>Flag</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>0</TableCell>
            <TableCell className="font-mono">COMPRESSED</TableCell>
            <TableCell>Payload is zstd-compressed</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>1</TableCell>
            <TableCell className="font-mono">ENCRYPTED</TableCell>
            <TableCell>Payload is additionally encrypted</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>2</TableCell>
            <TableCell className="font-mono">STREAM</TableCell>
            <TableCell>Message is part of a stream</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>3</TableCell>
            <TableCell className="font-mono">FINAL</TableCell>
            <TableCell>Last message in stream</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>4</TableCell>
            <TableCell className="font-mono">PRIORITY_HIGH</TableCell>
            <TableCell>High priority message</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>5-7</TableCell>
            <TableCell className="font-mono">RESERVED</TableCell>
            <TableCell>Reserved for future use</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Chunk Transfer Protocol</h2>

      <h3>Have/Want Sync</h3>
      <p>
        Dits uses Bloom filters to efficiently determine which chunks need to be transferred.
        This avoids sending lists of thousands of chunk hashes.
      </p>

      <div className="bg-muted p-4 rounded-lg my-6">
        <h4 className="font-semibold mb-3">Bloom Filter Sync Flow:</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Client creates Bloom filter from local chunk hashes (~1KB)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Server checks which chunks client probably has</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span>Server sends list of chunks to upload/download</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Only missing chunks are transferred</span>
          </div>
        </div>
      </div>

      <h3>Resumable Transfers</h3>
      <p>
        Large chunk transfers can be resumed after network interruptions.
        The protocol tracks progress and can restart from any byte offset.
      </p>

      <Alert className="not-prose my-6">
        <Clock className="h-4 w-4" />
        <AlertTitle>Transfer Resilience</AlertTitle>
        <AlertDescription>
          <strong>False positive rate:</strong> Bloom filters have ~1% false positive rate<br />
          <strong>Resume capability:</strong> Transfers continue from last confirmed byte<br />
          <strong>Integrity:</strong> Every chunk verified with BLAKE3 after transfer
        </AlertDescription>
      </Alert>

      <h2>Connection Management</h2>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Max concurrent streams:</span>
              <Badge variant="outline">100</Badge>
            </div>
            <div className="flex justify-between">
              <span>Stream data limit:</span>
              <Badge variant="outline">16 MB</Badge>
            </div>
            <div className="flex justify-between">
              <span>Connection timeout:</span>
              <Badge variant="outline">30s idle</Badge>
            </div>
            <div className="flex justify-between">
              <span>Keep-alive interval:</span>
              <Badge variant="outline">10s</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Tuning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Chunk size (avg):</span>
              <Badge variant="outline">64-256 KB</Badge>
            </div>
            <div className="flex justify-between">
              <span>Compression:</span>
              <Badge variant="outline">zstd level 3</Badge>
            </div>
            <div className="flex justify-between">
              <span>Parallel transfers:</span>
              <Badge variant="outline">Up to 32 streams</Badge>
            </div>
            <div className="flex justify-between">
              <span>Bloom filter size:</span>
              <Badge variant="outline">1-4 KB</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2>Implementation Considerations</h2>

      <Alert className="not-prose my-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Protocol Evolution</AlertTitle>
        <AlertDescription>
          The wire protocol includes version negotiation in the HELLO handshake.
          New message types can be added without breaking existing implementations.
          Unknown message types should be ignored with a warning.
        </AlertDescription>
      </Alert>

      <h3>Error Handling</h3>
      <p>All protocol errors include:</p>
      <ul>
        <li><strong>Error code:</strong> Machine-readable error identifier</li>
        <li><strong>Message:</strong> Human-readable error description</li>
        <li><strong>Context:</strong> Additional error context (chunk hash, etc.)</li>
        <li><strong>Retry advice:</strong> Whether the operation can be retried</li>
      </ul>

      <h3>Security Considerations</h3>
      <ul>
        <li><strong>Transport encryption:</strong> All traffic encrypted with TLS 1.3</li>
        <li><strong>Content verification:</strong> BLAKE3 hashes prevent tampering</li>
        <li><strong>Authentication:</strong> Bearer tokens for session management</li>
        <li><strong>Rate limiting:</strong> Built-in protection against abuse</li>
      </ul>

      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6 my-8">
        <h3 className="font-semibold mb-3">Protocol Benefits Summary</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-green-600 mb-2">Efficiency</h4>
            <ul className="text-sm space-y-1">
              <li>Minimal bandwidth overhead</li>
              <li>Resumable large file transfers</li>
              <li>Parallel chunk streaming</li>
              <li>Compression for metadata</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-600 mb-2">Reliability</h4>
            <ul className="text-sm space-y-1">
              <li>Content integrity verification</li>
              <li>Automatic error recovery</li>
              <li>Connection migration support</li>
              <li>Forward compatibility</li>
            </ul>
          </div>
        </div>
      </div>

      <h2>Reference Implementation</h2>
      <p>
        The reference implementation is available in the Dits CLI codebase.
        See the <Link href="/docs/architecture/protocol">protocol architecture docs</Link>{" "}
        for detailed implementation notes and the{" "}
        <Link href="https://github.com/byronwade/dits">source code</Link> for examples.
      </p>

      <Alert className="not-prose my-6">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Open Protocol</AlertTitle>
        <AlertDescription>
          The wire protocol is fully documented and open for third-party implementations.
          Anyone can build Dits-compatible clients and servers.
        </AlertDescription>
      </Alert>
    </div>
  );
}

