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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HardDrive, Zap, Info } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import { ComparisonBlocks } from "@/components/docs/comparison-blocks";
import { VideoTimeline } from "@/components/docs/video-timeline";

import { generateMetadata as genMeta, generateArticleSchema, generateBreadcrumbSchema } from "@/lib/seo";
import Script from "next/script";

export const metadata: Metadata = genMeta({
  title: "Chunking & Deduplication - How Dits Breaks Files into Chunks",
  description: "How Dits breaks files into chunks for efficient storage. Learn about content-defined chunking, deduplication, chunk size optimization, and how changes affect storage.",
  canonical: "https://dits.dev/docs/concepts/chunking",
  keywords: [
    "chunking",
    "deduplication",
    "content-defined chunking",
    "file chunking",
    "storage optimization",
    "fastcdc",
  ],
  openGraph: {
    type: "article",
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "Chunking & Deduplication",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
});

export default function ChunkingPage() {
  const articleSchema = generateArticleSchema({
    headline: "Chunking & Deduplication - How Dits Breaks Files into Chunks",
    description: "How Dits breaks files into chunks for efficient storage. Learn about content-defined chunking, deduplication, and storage optimization.",
    datePublished: "2024-01-01",
    dateModified: new Date().toISOString().split("T")[0],
    author: "Byron Wade",
    section: "Documentation",
    tags: ["chunking", "deduplication", "content-defined chunking"],
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Documentation", url: "/docs" },
    { name: "Concepts", url: "/docs/concepts" },
    { name: "Chunking", url: "/docs/concepts/chunking" },
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
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <div className="prose dark:prose-invert max-w-none">
        <DocPageHeader
          eyebrow="Core Concepts"
          title="Chunking & Deduplication"
          description="Dits uses content-defined chunking (CDC) to break files into variable-size pieces, enabling efficient storage and transfer of large binary files."
        />

        <h2>Why Chunking Matters</h2>
        <p>
          Traditional version control systems like Git treat each file as a single
          unit. When you modify a 10GB video file, Git stores an entirely new copy,
          even if you only changed a few seconds of footage.
        </p>
        <p>
          Dits takes a different approach: it breaks files into smaller chunks
          (the default profile averages 64 KB; the media and large profiles use
          bigger chunks) and only stores unique chunks. This means:
        </p>

        <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
          <Card>
            <CardHeader>
              <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
                <HardDrive className="size-5 text-brand" />
              </div>
              <CardTitle className="text-base">65% Less Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Similar files share chunks, dramatically reducing total storage needs
                for projects with multiple takes or versions.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
                <Zap className="size-5 text-brand" />
              </div>
              <CardTitle className="text-base">Faster Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Only missing chunks need to be transferred. Pushing a small edit
                to a large file takes seconds, not minutes.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
                <Info className="size-5 text-brand" />
              </div>
              <CardTitle className="text-base">Efficient Diffs</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Changes are localized to affected chunks, making it easy to see
                exactly what changed between versions.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <h2>Content-Defined Chunking (CDC)</h2>
        <p>
          Dits implements multiple content-defined chunking algorithms optimized
          for different use cases. The default is <strong>FastCDC</strong>, but
          alternatives are available for specific performance or security requirements.
        </p>

        <h3>Available Chunking Algorithms</h3>
        <div className="not-prose grid gap-4 md:grid-cols-2 lg:grid-cols-3 my-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">FastCDC (Default)</CardTitle>
              <Badge>Recommended</Badge>
            </CardHeader>
            <CardContent>
              <CardDescription>
                High-performance content-defined chunking. Excellent deduplication
                with good locality properties. Best for general use.
              </CardDescription>
              <div className="mt-2 text-sm text-muted-foreground">
                <div>Throughput: 2 GB/s</div>
                <div>Deduplication: Excellent</div>
                <div>Memory: Low</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rabin Fingerprinting</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Classic polynomial rolling hash. Strong locality guarantees but
                may have higher chunk size variance.
              </CardDescription>
              <div className="mt-2 text-sm text-muted-foreground">
                <div>Throughput: 1.5 GB/s</div>
                <div>Deduplication: Good</div>
                <div>Locality: Excellent</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Asymmetric Extremum</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Places boundaries at local minima/maxima. Better chunk size
                control with reduced variance.
              </CardDescription>
              <div className="mt-2 text-sm text-muted-foreground">
                <div>Throughput: 1.8 GB/s</div>
                <div>Size Variance: Low</div>
                <div>Metadata: Minimal</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chonkers Algorithm</CardTitle>
              <Badge variant="outline">Advanced</Badge>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Layered algorithm with provable strict guarantees on chunk size
                and edit locality. Mission-critical reliability.
              </CardDescription>
              <div className="mt-2 text-sm text-muted-foreground">
                <div>Guarantees: Strict</div>
                <div>Throughput: 1.2 GB/s</div>
                <div>Complexity: High</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parallel FastCDC</CardTitle>
              <Badge variant="outline">Performance</Badge>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Multi-core FastCDC implementation. 2-4x throughput improvement
                on modern multi-core systems.
              </CardDescription>
              <div className="mt-2 text-sm text-muted-foreground">
                <div>Throughput: 4-8 GB/s</div>
                <div>Scalability: Linear</div>
                <div>Large Files: Optimal</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Keyed FastCDC</CardTitle>
              <Badge variant="outline">Security</Badge>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Privacy-enhanced FastCDC that prevents fingerprinting attacks
                by incorporating a secret key.
              </CardDescription>
              <div className="mt-2 text-sm text-muted-foreground">
                <div>Privacy: Protected</div>
                <div>Performance: Same as FastCDC</div>
                <div>Security: Anti-fingerprinting</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <h3>FastCDC Algorithm Details</h3>
        <p>
          FastCDC is Dits&apos; primary chunking algorithm, providing an optimal
          balance of performance and deduplication effectiveness.
        </p>

        <h3>How It Works</h3>
        <ol>
          <li>
            <strong>Rolling Hash:</strong> A sliding window moves through the file,
            computing a rolling hash at each position.
          </li>
          <li>
            <strong>Boundary Detection:</strong> When the hash matches a specific
            pattern (determined by a bitmask), a chunk boundary is created.
          </li>
          <li>
            <strong>Size Constraints:</strong> Chunks are constrained to be between
            minimum and maximum sizes to ensure consistent behavior.
          </li>
        </ol>

        <CodeBlock
          language="bash"
          code={`// Dits chunking parameters (named profiles: min / avg / max)
default profile:   16 KB / 64 KB / 256 KB   <- used unless overridden
media profile:     64 KB / 256 KB / 1 MB
large profile:    256 KB / 1 MB / 4 MB

// Example: 10GB video file with the "large" profile
Original file:     10 GB (1 file)
After chunking:    ~10,000 chunks
Average chunk:     ~1 MB each`}
        />

        <h3>Why Content-Defined?</h3>
        <p>
          The key advantage of CDC over fixed-size chunking is <strong>shift
            resistance</strong>. Consider what happens when you insert data at the
          beginning of a file:
        </p>

        <div className="not-prose my-8">
          <ComparisonBlocks
            before={{
              label: "Fixed-Size Chunking",
              blocks: ["AAAA", "BBBB", "CCCC", "DDDD"],
              description: "Insert X at start → All chunks shift",
            }}
            after={{
              label: "Content-Defined Chunking",
              blocks: ["X", "AAA", "BBBBB", "CC", "DDDDD"],
              description: "Insert X at start → Only 1 new chunk",
            }}
            beforeResult="ALL chunks changed! 0% reuse"
            afterResult="Only 1 new chunk! 80%+ reuse"
          />
        </div>

        <h2>Video-Aware Chunking</h2>
        <p>
          For video files, Dits goes beyond basic CDC by aligning chunk boundaries
          to video keyframes (I-frames) when possible.
        </p>

        <Callout type="note" title="Keyframe Alignment" className="not-prose my-6">
          Keyframes are complete images in a video stream. By aligning chunks to
          keyframes, each chunk becomes independently decodable, which improves
          streaming and random access performance.
        </Callout>

        <div className="not-prose my-8">
          <VideoTimeline />
        </div>

        <h2>Deduplication</h2>
        <p>
          After chunking, each chunk is hashed using a cryptographic hash function
          (BLAKE3 by default). Chunks with identical hashes are stored only once,
          regardless of which files they came from.
        </p>

        <h3>Hash Algorithm Options</h3>
        <p>
          Dits supports multiple hash algorithms for different performance and
          security requirements:
        </p>

        <div className="not-prose grid gap-4 md:grid-cols-3 my-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">BLAKE3</CardTitle>
              <p className="text-sm text-muted-foreground">Default - Optimized for speed</p>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                <li>3+ GB/s per core (multi-threaded: 10+ GB/s)</li>
                <li>Multi-threaded</li>
                <li>Cryptographically secure</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SHA-256</CardTitle>
              <p className="text-sm text-muted-foreground">Industry standard</p>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                <li>~500 MB/s throughput</li>
                <li>Maximum compatibility</li>
                <li>Widely analyzed</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SHA-3-256</CardTitle>
              <p className="text-sm text-muted-foreground">Future-proof</p>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                <li>~300 MB/s throughput</li>
                <li>Different algorithm family</li>
                <li>Post-quantum resistant</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <h3>Where Deduplication Helps</h3>
        <ul>
          <li>
            <strong>Multiple takes:</strong> Similar shots from the same scene share
            most of their chunks
          </li>
          <li>
            <strong>Version history:</strong> Editing a video only creates new chunks
            for the changed portions
          </li>
          <li>
            <strong>Cross-project:</strong> Stock footage used in multiple projects
            is stored once
          </li>
          <li>
            <strong>Duplicated files:</strong> Copies of the same file share 100%
            of their chunks
          </li>
        </ul>

        <h3>Real-World Example</h3>
        <CodeBlock
          language="bash"
          code={`Project: 3 takes of a 2-minute scene (1080p ProRes)

Without deduplication:
  Take 1:  12 GB
  Take 2:  12 GB
  Take 3:  12 GB
  Total:   36 GB

With Dits chunking:
  Take 1:  12 GB (all new chunks)
  Take 2:   2 GB (83% shared with Take 1)
  Take 3:   1 GB (92% shared with previous)
  Total:   15 GB (58% savings)`}
        />

        <h3>Choosing a Chunking Algorithm</h3>
        <p>
          Different algorithms work better for different scenarios:
        </p>

        <div className="not-prose my-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Use Case</TableHead>
                <TableHead>Recommended Algorithm</TableHead>
                <TableHead>Why</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>General purpose</TableCell>
                <TableCell className="font-mono">FastCDC</TableCell>
                <TableCell>Best balance of performance and deduplication</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Large files (&gt;1GB)</TableCell>
                <TableCell className="font-mono">Parallel FastCDC</TableCell>
                <TableCell>Linear scaling with CPU cores</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Mission-critical data</TableCell>
                <TableCell className="font-mono">Chonkers</TableCell>
                <TableCell>Provable guarantees on size and locality</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Privacy-sensitive data</TableCell>
                <TableCell className="font-mono">Keyed FastCDC</TableCell>
                <TableCell>Prevents fingerprinting attacks</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Consistent chunk sizes</TableCell>
                <TableCell className="font-mono">Asymmetric Extremum</TableCell>
                <TableCell>Minimal size variance</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Legacy compatibility</TableCell>
                <TableCell className="font-mono">Rabin</TableCell>
                <TableCell>Classic algorithm with strong locality</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <h2>Chunk Parameters</h2>
        <p>
          Dits ships named chunker profiles. The <strong>default</strong>{" "}
          profile is used unless another is selected:
        </p>

        <div className="not-prose my-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile</TableHead>
                <TableHead>Min Size</TableHead>
                <TableHead>Avg Size</TableHead>
                <TableHead>Max Size</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>default</TableCell>
                <TableCell className="font-mono">16 KB</TableCell>
                <TableCell className="font-mono">64 KB</TableCell>
                <TableCell className="font-mono">256 KB</TableCell>
                <TableCell className="text-muted-foreground">Balanced default</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>media</TableCell>
                <TableCell className="font-mono">64 KB</TableCell>
                <TableCell className="font-mono">256 KB</TableCell>
                <TableCell className="font-mono">1 MB</TableCell>
                <TableCell className="text-muted-foreground">Large media files</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>large</TableCell>
                <TableCell className="font-mono">256 KB</TableCell>
                <TableCell className="font-mono">1 MB</TableCell>
                <TableCell className="font-mono">4 MB</TableCell>
                <TableCell className="text-muted-foreground">Maximum throughput</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <h2>Technical Details</h2>

        <h3>The FastCDC Algorithm</h3>
        <p>
          FastCDC improves on the original CDC algorithm by using a gear-based
          rolling hash that is significantly faster while maintaining good
          deduplication properties.
        </p>

        <CodeBlock
          language="rust"
          code={`// Simplified FastCDC implementation
fn find_chunk_boundary(data: &[u8]) -> usize {
    let mut hash: u64 = 0;
    let mask = (1 << 20) - 1;  // For ~1MB average

    for (i, &byte) in data.iter().enumerate() {
        hash = (hash << 1) + GEAR_TABLE[byte as usize];

        if i >= MIN_SIZE && (hash & mask) == 0 {
            return i;  // Found boundary
        }
        if i >= MAX_SIZE {
            return i;  // Force boundary at max size
        }
    }
    data.len()  // End of data
}`}
        />

        <h3>BLAKE3 Hashing</h3>
        <p>
          Each chunk is identified by its BLAKE3 hash, a 256-bit cryptographic hash
          that provides:
        </p>
        <ul>
          <li><strong>Speed:</strong> 3-10x faster than SHA-256</li>
          <li><strong>Security:</strong> Cryptographically secure collision resistance</li>
          <li><strong>Parallelism:</strong> Designed for multi-core processing</li>
          <li><strong>Streaming:</strong> Can hash data incrementally</li>
        </ul>

        <h2>Next Steps</h2>
        <ul>
          <li>
            Learn about{" "}
            <Link href="/docs/concepts/content-addressing">Content Addressing</Link>
          </li>
          <li>
            Understand <Link href="/docs/concepts/repositories">Repositories</Link>
          </li>
          <li>
            Explore <Link href="/docs/advanced/video">Video Features</Link>
          </li>
        </ul>
      </div>
    </>
  );
}
