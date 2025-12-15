import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lightbulb, Info } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import { SyncDiagram } from "@/components/docs/sync-diagram";
import { ComparisonBlocks } from "@/components/docs/comparison-blocks";

import { generateMetadata as genMeta, generateArticleSchema, generateCollectionPageSchema, generateBreadcrumbSchema } from "@/lib/seo";
import Script from "next/script";

export const metadata: Metadata = genMeta({
  title: "Core Concepts - How Dits Version Control Works",
  description: "Understand how Dits works under the hood. Learn about content-defined chunking, deduplication, content addressing, repositories, commits, and branching for large file version control.",
  canonical: "https://dits.dev/docs/concepts",
  keywords: [
    "dits concepts",
    "content-defined chunking",
    "deduplication",
    "content addressing",
    "version control concepts",
    "how dits works",
  ],
  openGraph: {
    type: "article",
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "Dits Core Concepts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
});

export default function ConceptsPage() {
  const articleSchema = generateArticleSchema({
    headline: "Core Concepts - How Dits Version Control Works",
    description: "Understand how Dits works under the hood. Learn about content-defined chunking, deduplication, content addressing, repositories, commits, and branching.",
    datePublished: "2024-01-01",
    dateModified: new Date().toISOString().split("T")[0],
    author: "Byron Wade",
    section: "Documentation",
    tags: ["concepts", "chunking", "deduplication", "content addressing"],
  });

  const collectionSchema = generateCollectionPageSchema({
    name: "Dits Core Concepts",
    description: "Collection of core concepts explaining how Dits version control system works",
    url: "/docs/concepts",
    breadcrumb: [
      { name: "Home", url: "/" },
      { name: "Documentation", url: "/docs" },
      { name: "Core Concepts", url: "/docs/concepts" },
    ],
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Documentation", url: "/docs" },
    { name: "Core Concepts", url: "/docs/concepts" },
  ]);

  return (
    <>
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />
      <Script
        id="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionSchema),
        }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <div className="prose dark:prose-invert max-w-none">
        <h1>Core Concepts</h1>
        <p className="lead text-xl text-muted-foreground">
          Understanding how Dits works will help you use it effectively. This page
          explains the key concepts behind Dits.
        </p>

        <h2>Content-Defined Chunking</h2>
        <p>
          Unlike Git which stores files as single objects, Dits splits files into
          variable-size <strong>chunks</strong> based on their content. This is
          called <strong>content-defined chunking</strong> (CDC).
        </p>

        <div className="not-prose my-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Traditional Approach</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-sm">
                {`File: video.mp4 (2GB)
├── Stored as single blob
└── Any change = re-store 2GB`}
              </pre>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-primary">Dits Approach</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-sm">
                {`File: video.mp4 (2GB)
├── Chunk 1: 1.2 MB (hash: abc...)
├── Chunk 2: 0.9 MB (hash: def...)
├── ...
└── Only changed chunks stored`}
              </pre>
            </CardContent>
          </Card>
        </div>

        <p>
          The chunking algorithm (FastCDC) uses a rolling hash to find chunk
          boundaries based on content, not fixed positions. This means:
        </p>
        <ul>
          <li>
            <strong>Insertions/deletions don&apos;t cascade:</strong> If you insert
            data in the middle of a file, only the chunks near the insertion point
            change
          </li>
          <li>
            <strong>Deduplication works across files:</strong> If two files share
            content (like different cuts of the same footage), they share chunks
          </li>
          <li>
            <strong>Efficient syncing:</strong> Only new/changed chunks need to be
            transferred
          </li>
        </ul>

        <h3>Chunking Algorithms</h3>
        <p>
          Dits implements multiple content-defined chunking algorithms, each optimized for different use cases:
        </p>

        <h4>FastCDC (Default)</h4>
        <p>FastCDC (Fast Content-Defined Chunking) is Dits' primary algorithm, providing excellent performance and deduplication ratios.</p>

        <h4>Additional Chunking Algorithms</h4>
        <p>Beyond FastCDC, Dits implements several specialized chunking algorithms for different performance and security requirements:</p>

        <div className="not-prose my-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Rabin Fingerprinting</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Classic polynomial rolling hash algorithm</strong></li>
                <li><strong>Strong locality guarantees</strong> (identical content = identical boundaries)</li>
                <li><strong>May produce more variable chunk sizes than FastCDC</strong></li>
                <li><strong>Best for:</strong> Applications requiring strict content-aware boundaries</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Asymmetric Extremum (AE)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Places boundaries at local minima/maxima in sliding windows</strong></li>
                <li><strong>Better control over chunk size distribution</strong></li>
                <li><strong>Reduces extreme chunk size variance</strong></li>
                <li><strong>Best for:</strong> Consistent chunk sizes, lower metadata overhead</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Chonkers Algorithm</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Advanced layered algorithm with mathematical guarantees</strong></li>
                <li><strong>Provable strict bounds on both chunk size AND edit locality</strong></li>
                <li><strong>Uses hierarchical merging</strong> (balancing → caterpillar → diffbit phases)</li>
                <li><strong>Best for:</strong> Mission-critical applications requiring guarantees</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Parallel FastCDC</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Multi-core implementation of FastCDC</strong></li>
                <li><strong>Splits large files into segments processed in parallel</strong></li>
                <li><strong>2-4x throughput improvement on multi-core systems</strong></li>
                <li><strong>Best for:</strong> Large files, high-throughput environments</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Keyed FastCDC (KCDC)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Security-enhanced FastCDC with secret key</strong></li>
                <li><strong>Prevents fingerprinting attacks via chunk length patterns</strong></li>
                <li><strong>Same performance as FastCDC with added privacy protection</strong></li>
                <li><strong>Best for:</strong> Encrypted backups, privacy-sensitive applications</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <h4>How Chunk Boundaries Are Determined</h4>
        <div className="not-prose my-6">
          <ComparisonBlocks
            before={{
              label: "Fixed-size chunking problem",
              blocks: ["AAAA", "BBBB", "CCCC", "DDDD"],
              description: "Insert X → All chunks shift!",
            }}
            after={{
              label: "CDC solution",
              blocks: ["X", "AAA|A", "BBB|B", "CCC|C", "DDD|D"],
              description: "Insert X → Only first chunk changes",
            }}
            beforeResult="ALL chunks changed! 0% reuse"
            afterResult="1 new chunk! 80%+ reuse"
          />
        </div>

        <h4>Algorithm Parameters</h4>
        <p>FastCDC uses carefully tuned parameters for optimal performance:</p>
        <CodeBlock
          language="bash"
          code={`// FastCDC configuration for video files
min_size: 32KB     // Minimum chunk size
avg_size: 64KB     // Target average size
max_size: 256KB    // Maximum chunk size
normalization: 2   // Size distribution control`}
        />

        <h4>Rolling Hash Implementation</h4>
        <p>FastCDC uses a "gear hash" - a precomputed table of random 64-bit values:</p>
        <CodeBlock
          language="bash"
          code={`// Rolling hash state
hash = 0

// For each byte in the file:
hash = (hash << 1) + gear_table[byte_value]

// Check if hash matches boundary pattern:
// (hash & mask) == 0 → create chunk boundary`}
        />

        <h4>Performance Characteristics</h4>
        <Table className="not-prose my-4">
          <TableHeader>
            <TableRow>
              <TableHead>Implementation</TableHead>
              <TableHead>Throughput</TableHead>
              <TableHead>Platform</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Scalar (baseline)</TableCell>
              <TableCell>800 MB/s</TableCell>
              <TableCell>All CPUs</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>SSE4.1</TableCell>
              <TableCell>1.2 GB/s</TableCell>
              <TableCell>Intel/AMD</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>AVX2</TableCell>
              <TableCell>2.0 GB/s</TableCell>
              <TableCell>Modern Intel/AMD</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>AVX-512</TableCell>
              <TableCell>3.5 GB/s</TableCell>
              <TableCell>High-end Intel</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>ARM NEON</TableCell>
              <TableCell>1.5-2.5 GB/s</TableCell>
              <TableCell>Apple Silicon, ARM64</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <h2>Content Addressing</h2>
        <p>
          Every piece of data in Dits is identified by its <strong>content hash</strong>,
          specifically a BLAKE3 hash. This is called <strong>content addressing</strong>.
        </p>

        <CodeBlock
          language="bash"
          code={`# Every chunk has a unique hash based on its content
Chunk abc123... = specific 1.2MB of video data
Chunk def456... = specific 0.9MB of video data

# Files are just lists of chunk hashes
video.mp4 = [abc123, def456, ghi789, ...]

# Commits reference file manifests by hash
Commit xyz... -> Manifest hash -> File hashes -> Chunk hashes`}
        />

        <p>Benefits of content addressing:</p>
        <ul>
          <li>
            <strong>Automatic deduplication:</strong> Identical content always has
            the same hash, so it&apos;s only stored once
          </li>
          <li>
            <strong>Data integrity:</strong> If a chunk&apos;s hash doesn&apos;t match,
            you know it&apos;s corrupted
          </li>
          <li>
            <strong>Immutability:</strong> You can&apos;t modify stored data without
            changing its address
          </li>
        </ul>

        <h3>Cryptographic Hashing</h3>
        <p>Dits supports multiple cryptographic hash algorithms for different performance and security trade-offs:</p>

        <h4>BLAKE3 (Default)</h4>
        <p>Dits uses BLAKE3 as the default hash algorithm for its exceptional performance and security:</p>
        <Table className="not-prose my-4">
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>SHA-256</TableHead>
              <TableHead>BLAKE3</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Speed</TableCell>
              <TableCell>~500 MB/s</TableCell>
              <TableCell>3-6 GB/s (multi-threaded)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Parallelism</TableCell>
              <TableCell>Single-threaded</TableCell>
              <TableCell>Multi-threaded</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Security</TableCell>
              <TableCell>Proven</TableCell>
              <TableCell>Proven (BLAKE family)</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <h4>Alternative Hash Algorithms</h4>
        <div className="not-prose my-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">SHA-256</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Industry standard cryptographic hash</strong></li>
                <li><strong>Widely trusted and analyzed</strong></li>
                <li><strong>~2x slower than BLAKE3</strong></li>
                <li><strong>Best for:</strong> Regulatory compliance, maximum compatibility</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">SHA-3-256</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Future-proof cryptographic construction</strong></li>
                <li><strong>Different algorithm family than SHA-2</strong></li>
                <li><strong>~3x slower than BLAKE3</strong></li>
                <li><strong>Best for:</strong> Post-quantum security considerations</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <h4>Hash Algorithm Selection</h4>
        <CodeBlock
          language="bash"
          code={`# Configure repository to use different hash algorithm
dits config core.hashAlgorithm sha256

# Available options: blake3, sha256, sha3-256
# Default: blake3 (recommended for performance)`}
        />
        <p className="text-sm text-muted-foreground">All hash algorithms produce 256-bit (32-byte) outputs and provide cryptographic security guarantees.</p>

        <h3>Cryptographic Properties</h3>
        <ul>
          <li><strong>Collision resistance:</strong> Impossible to find two different inputs with same hash</li>
          <li><strong>Preimage resistance:</strong> Given a hash, impossible to find input that produces it</li>
          <li><strong>Second preimage resistance:</strong> Given input A, impossible to find input B with same hash</li>
        </ul>

        <h2>Hybrid Storage Architecture</h2>
        <p>
          Dits uses a <strong>hybrid storage system</strong> that intelligently chooses the optimal storage method
          for different types of files. This combines the best of Git's text handling with Dits' binary optimizations.
        </p>

        <div className="not-prose my-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Text Files (Git Storage)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                <li><strong>Source code:</strong> .rs, .js, .py, .cpp, etc.</li>
                <li><strong>Config files:</strong> .json, .yaml, .toml, .xml</li>
                <li><strong>Documentation:</strong> .md, .txt, .rst</li>
                <li><strong>Benefits:</strong> Line-based diffs, 3-way merge, blame</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-primary">Binary Assets (Dits Storage)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                <li><strong>Video:</strong> .mp4, .mov, .avi, .mkv</li>
                <li><strong>3D Models:</strong> .obj, .fbx, .gltf, .usd</li>
                <li><strong>Game Assets:</strong> Unity, Unreal, Godot files</li>
                <li><strong>Images:</strong> .psd, .raw, large .png/.jpg</li>
                <li><strong>Benefits:</strong> FastCDC chunking, deduplication</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <p>
          The system automatically classifies files based on extension, content analysis, and filename patterns.
          This ensures optimal performance and features for each file type while maintaining Git compatibility.
        </p>

        <Alert className="not-prose my-4">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Best of Both Worlds</AlertTitle>
          <AlertDescription>
            Use Git's powerful text operations for code while benefiting from Dits' binary optimizations for creative assets.
            All files coexist in the same repository with unified version control.
          </AlertDescription>
        </Alert>

        <Alert className="not-prose my-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Working Alongside Git</AlertTitle>
          <AlertDescription>
            Dits is designed to work alongside Git in the same project directory. Initialize both repositories separately
            (<code>git init</code> then <code>dits init</code>) to get hybrid storage that automatically uses the best system for each file type.
          </AlertDescription>
        </Alert>

        <h2>Manifest System</h2>
        <p>
          The manifest is Dits&apos; authoritative record of a commit&apos;s file tree. It describes how to reconstruct files from chunks and stores rich metadata.
        </p>

        <h3>What a Manifest Contains</h3>
        <p>Each manifest includes:</p>
        <ul>
          <li>All files in the repository at that commit</li>
          <li>File metadata (size, permissions, timestamps)</li>
          <li>Chunk references for reconstructing content</li>
          <li>Asset metadata (video dimensions, codec, duration)</li>
          <li>Directory structure for efficient browsing</li>
          <li>Dependency graphs for project files</li>
        </ul>

        <h3>Manifest Data Structure</h3>
        <CodeBlock
          language="rust"
          code={`pub struct ManifestPayload {
    pub version: u8,                    // Format version
    pub repo_id: Uuid,                  // Repository identifier
    pub commit_hash: [u8; 32],          // This commit's hash
    pub parent_hash: Option<[u8; 32]>, // Parent commit (for diffs)

    pub entries: Vec<ManifestEntry>,    // All files
    pub directories: Vec<DirectoryEntry>, // Directory structure
    pub dependencies: Option<DependencyGraph>, // File relationships
    pub stats: ManifestStats,           // Aggregate statistics
}`}
        />

        <h3>File Representation</h3>
        <p>Each file is represented as a manifest entry:</p>
        <CodeBlock
          language="rust"
          code={`pub struct ManifestEntry {
    pub path: String,                  // Relative path
    pub size: u64,                     // File size in bytes
    pub content_hash: [u8; 32],        // Full file BLAKE3 hash
    pub chunks: Vec<ChunkRef>,         // How to reconstruct file

    // Rich metadata
    pub metadata: FileMetadata,        // MIME type, encoding, etc.
    pub asset_metadata: Option<AssetMetadata>, // Video/audio specifics
}`}
        />

        <h3>Asset Metadata Extraction</h3>
        <p>For media files, Dits extracts comprehensive metadata:</p>
        <CodeBlock
          language="rust"
          code={`pub struct AssetMetadata {
    pub asset_type: AssetType,        // Video, Audio, Image
    pub duration_ms: Option<u64>,     // Playback duration
    pub width: Option<u32>,           // Video width
    pub height: Option<u32>,          // Video height
    pub video_codec: Option<String>,  // "h264", "prores", etc.
    pub audio_codec: Option<String>,  // "aac", "pcm", etc.

    // Camera metadata
    pub camera_metadata: Option<CameraMetadata>,
    pub thumbnail: Option<[u8; 32]>,  // Thumbnail chunk hash
}`}
        />

        <h2>Repository Structure</h2>
        <p>
          A Dits repository is stored in a <code>.dits</code> directory with this
          structure:
        </p>

        <CodeBlock
          language="bash"
          code={`.dits/
├── HEAD              # Current branch reference
├── config            # Repository configuration
├── index             # Staging area
├── objects/          # Content-addressed storage
│   ├── chunks/       # File chunks
│   ├── manifests/    # File manifests
│   └── commits/      # Commit objects
└── refs/
    ├── heads/        # Branch refs
    └── tags/         # Tag refs`}
        />

        <h2>Object Types</h2>

        <h3>Chunk</h3>
        <p>
          The fundamental unit of storage. A variable-size piece of file content,
          typically 256KB to 4MB.
        </p>

        <h3>Manifest</h3>
        <p>
          Describes how to reconstruct a file from chunks. Contains the ordered
          list of chunk hashes, file metadata (size, permissions), and optional
          video metadata.
        </p>

        <h3>Commit</h3>
        <p>
          A snapshot of the repository at a point in time. Contains:
        </p>
        <ul>
          <li>Tree (manifest) hash pointing to file state</li>
          <li>Parent commit hash(es)</li>
          <li>Author and committer information</li>
          <li>Commit message</li>
          <li>Timestamp</li>
        </ul>

        <h3>Branch</h3>
        <p>
          A mutable reference to a commit. The default branch is <code>main</code>.
          Branches make it easy to work on different versions simultaneously.
        </p>

        <h3>Tag</h3>
        <p>
          An immutable reference to a commit, typically used to mark releases or
          important versions.
        </p>

        <h2>Sync Protocol and Delta Efficiency</h2>
        <p>Dits uses a sophisticated sync protocol to minimize bandwidth usage.</p>

        <h3>Have/Want Protocol</h3>
        <p>Instead of sending entire files, Dits negotiates what data is needed:</p>
        <div className="not-prose my-6">
          <SyncDiagram
            localChunks={["A", "B", "C", "D", "E", "F"]}
            remoteChunks={["A", "B"]}
          />
        </div>

        <h3>Delta Sync Efficiency</h3>
        <div className="not-prose my-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Traditional sync</CardTitle>
            </CardHeader>
            <CardContent>
              <p>File changed → upload entire file</p>
              <p>10 GB video, small edit → transfer 10 GB</p>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-primary">Dits delta sync</CardTitle>
            </CardHeader>
            <CardContent>
              <p>File changed → identify changed chunks</p>
              <p>10 GB video, small edit → transfer ~50 MB</p>
            </CardContent>
          </Card>
        </div>

        <h2>Performance Characteristics</h2>

        <h3>Download Performance Optimizations</h3>
        <p>Dits implements multiple optimizations to maximize download speeds and utilize full network capacity:</p>

        <div className="not-prose my-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Streaming FastCDC</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                <li><strong>Problem:</strong> Memory-bound chunking</li>
                <li><strong>Solution:</strong> 64KB sliding window</li>
                <li><strong>Result:</strong> Process any file size</li>
                <li><strong>Memory:</strong> 99.9% reduction vs buffered</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-primary">Parallel Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                <li><strong>Multi-core chunking:</strong> 3-4x speedup</li>
                <li><strong>Parallel downloads:</strong> Aggregate bandwidth</li>
                <li><strong>Concurrent transfers:</strong> 1000+ streams</li>
                <li><strong>Zero-copy I/O:</strong> 50-70% less CPU</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <h3>High-Throughput QUIC Transport</h3>
        <ul>
          <li><strong>Concurrent streams:</strong> 1000+ parallel transfers</li>
          <li><strong>Large flow windows:</strong> 16MB buffers for high bandwidth</li>
          <li><strong>Connection pooling:</strong> Reuse connections, eliminate handshakes</li>
          <li><strong>BBR congestion control:</strong> Optimized for modern networks</li>
        </ul>

        <h3>Adaptive Chunk Sizing</h3>
        <div className="not-prose my-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Network Type</TableHead>
                <TableHead>Optimal Chunk Size</TableHead>
                <TableHead>Strategy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>LAN (&gt;1Gbps)</TableCell>
                <TableCell>8MB</TableCell>
                <TableCell>Maximum throughput</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Fast broadband (100Mbps)</TableCell>
                <TableCell>2MB</TableCell>
                <TableCell>Balanced performance</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>High latency (satellite)</TableCell>
                <TableCell>256KB</TableCell>
                <TableCell>Responsiveness priority</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Alert className="not-prose my-4">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Maximum Speed Downloads</AlertTitle>
          <AlertDescription>
            Downloads now utilize 100% of available bandwidth with no software limitations, scaling linearly with the number of available peers.
          </AlertDescription>
        </Alert>

        <h3>Throughput Benchmarks</h3>
        <div className="not-prose my-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operation</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell><strong>Streaming Chunking</strong></TableCell>
                <TableCell>Unlimited</TableCell>
                <TableCell>No memory limits</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Parallel Chunking</strong></TableCell>
                <TableCell>8+ GB/s</TableCell>
                <TableCell>Multi-core processing</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>QUIC Transfer</strong></TableCell>
                <TableCell>1+ GB/s</TableCell>
                <TableCell>1000+ concurrent streams</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Multi-peer Download</strong></TableCell>
                <TableCell>N × peer bandwidth</TableCell>
                <TableCell>Linear scaling with peers</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Hashing (BLAKE3)</TableCell>
                <TableCell>6 GB/s</TableCell>
                <TableCell>Multi-threaded</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>File reconstruction</TableCell>
                <TableCell>500 MB/s</TableCell>
                <TableCell>Sequential reads</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <h2>Video-Aware Features</h2>

        <Alert className="not-prose my-4">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Why Video-Aware Matters</AlertTitle>
          <AlertDescription>
            Video files have internal structure (containers, tracks, keyframes).
            Dits understands this structure to optimize chunking and
            reconstruction.
          </AlertDescription>
        </Alert>

        <p>For MP4/MOV files, Dits:</p>
        <ul>
          <li>
            <strong>Preserves container structure:</strong> The moov atom (metadata)
            is kept intact
          </li>
          <li>
            <strong>Aligns to keyframes:</strong> Chunk boundaries prefer I-frames
            for better deduplication of related footage
          </li>
          <li>
            <strong>Extracts metadata:</strong> Duration, resolution, codec info
            is stored for quick access
          </li>
        </ul>

        <h2>Deduplication in Action</h2>
        <p>Consider this scenario:</p>

        <CodeBlock
          language="bash"
          code={`# You have two versions of the same footage
scene01_take1.mp4  (10 GB, 10,000 chunks)
scene01_take2.mp4  (10 GB, 10,000 chunks)

# But 95% of the content is identical
# Dits stores:
- 10,000 unique chunks from take1
- 500 unique chunks from take2
- Total: 10,500 chunks (~10.5 GB) instead of 20 GB

# Deduplication savings: 47.5%`}
        />

        <p>
          The more similar content you have, the greater the savings. This is
          especially powerful for:
        </p>
        <ul>
          <li>Multiple takes of the same scene</li>
          <li>Different cuts/edits of the same footage</li>
          <li>Footage from the same camera/location</li>
          <li>Projects that share B-roll or stock footage</li>
        </ul>

        <h3>Real-World Deduplication Scenarios</h3>
        <div className="not-prose my-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="!text-left">Scenario</TableHead>
                <TableHead className="!text-right">Raw Size</TableHead>
                <TableHead className="!text-right">Deduplicated</TableHead>
                <TableHead className="!text-right">Savings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="!text-left">5 versions of video (minor edits)</TableCell>
                <TableCell className="!text-right">50 GB</TableCell>
                <TableCell className="!text-right">12 GB</TableCell>
                <TableCell className="!text-right">76%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="!text-left">100 similar photos (same shoot)</TableCell>
                <TableCell className="!text-right">50 GB</TableCell>
                <TableCell className="!text-right">8 GB</TableCell>
                <TableCell className="!text-right">84%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="!text-left">10 game builds (iterative)</TableCell>
                <TableCell className="!text-right">100 GB</TableCell>
                <TableCell className="!text-right">18 GB</TableCell>
                <TableCell className="!text-right">82%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <h2>Security & Integrity</h2>
        <h3>Content Addressing Security</h3>
        <p>Every piece of data is identified by its cryptographic hash:</p>
        <CodeBlock
          language="bash"
          code={`Content → BLAKE3 hash → Storage

If content changes by even 1 bit:
  → Completely different hash
  → Stored as new content
  → Tampering is detectable`}
        />

        <h3>Verification Commands</h3>
        <CodeBlock
          language="bash"
          code={`$ dits fsck
Verifying repository integrity...
Checking objects... ✓
Checking references... ✓
Checking manifests... ✓
Verifying 45,678 chunks...
  [████████████████████████████████] 100%
All chunks verified ✓
Repository is healthy.`}
        />

        <h3>Encryption Options</h3>
        <ul>
          <li><strong>In transit:</strong> All network transfers use TLS 1.3 or QUIC</li>
          <li><strong>At rest (optional):</strong> Files encrypted before storage</li>
        </ul>

        <h2>Comparison with Alternatives</h2>
        <h3>Git LFS</h3>
        <div className="not-prose my-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Git LFS</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-sm">
                {`Git Repository:          LFS Server:
┌─────────────┐          ┌─────────────┐
│ version 1   │ ──────▶  │ 10 GB file  │
│ (pointer)   │          ├─────────────┤
│ version 2   │ ──────▶  │ 10 GB file  │
│ (pointer)   │          │ (full copy) │
└─────────────┘          └─────────────┘
Total: 20 GB stored`}
              </pre>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-primary">Dits</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-sm">
                {`Dits Repository:
┌─────────────────────────────────────┐
│ Manifest: video.mp4 = [A,B,C,D,E]   │
│ Chunks: A,B,C,D,E (10 GB total)     │
│                                     │
│ Version 2: video.mp4 = [A,B,C,F,G]  │
│ Chunks: A,B,C,F,G (only F,G new)   │
└─────────────────────────────────────┘
Total: ~10.2 GB stored`}
              </pre>
            </CardContent>
          </Card>
        </div>

        <div className="not-prose my-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Git LFS</TableHead>
                <TableHead>Dits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Storage per version</TableCell>
                <TableCell>Full copy</TableCell>
                <TableCell>Changed chunks only</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Diff capability</TableCell>
                <TableCell>None</TableCell>
                <TableCell>Chunk-level diff</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Merge conflicts</TableCell>
                <TableCell>Manual resolution</TableCell>
                <TableCell>Explicit locking</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <h2>Virtual Filesystem (VFS)</h2>
        <p>
          Dits can mount a repository as a virtual drive using FUSE. Files appear
          instantly but are only &quot;hydrated&quot; (chunks downloaded) when accessed.
        </p>

        <CodeBlock
          language="bash"
          code={`# Mount the repository
$ dits mount /mnt/project

# Files appear immediately
$ ls /mnt/project/footage/
scene01.mp4  scene02.mp4  scene03.mp4

# Opening a file triggers on-demand hydration
$ ffplay /mnt/project/footage/scene01.mp4
# Only accessed chunks are fetched`}
        />

        <p>This is ideal for:</p>
        <ul>
          <li>Previewing large projects without full download</li>
          <li>NLE (editing software) integration</li>
          <li>Accessing specific files from a large repository</li>
        </ul>

        <h2>Next Steps</h2>
        <ul>
          <li>
            Learn about{" "}
            <Link href="/docs/concepts/chunking">Chunking in Detail</Link>
          </li>
          <li>
            Understand{" "}
            <Link href="/docs/concepts/branching">Branching & Merging</Link>
          </li>
          <li>
            Explore{" "}
            <Link href="/docs/advanced/video">Video Features</Link>
          </li>
        </ul>
      </div>
    </>
  );
}
