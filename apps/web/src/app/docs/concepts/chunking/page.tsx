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
import { Badge } from "@/components/ui/badge";
import { Info, Zap, HardDrive } from "lucide-react";

export const metadata: Metadata = {
  title: "Chunking & Deduplication",
  description: "How Dits breaks files into chunks for efficient storage",
};

export default function ChunkingPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Chunking & Deduplication</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits uses content-defined chunking (CDC) to break files into variable-size
        pieces, enabling efficient storage and transfer of large binary files.
      </p>

      <h2>Why Chunking Matters</h2>
      <p>
        Traditional version control systems like Git treat each file as a single
        unit. When you modify a 10GB video file, Git stores an entirely new copy,
        even if you only changed a few seconds of footage.
      </p>
      <p>
        Dits takes a different approach: it breaks files into smaller chunks
        (typically 256KB to 4MB) and only stores unique chunks. This means:
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <HardDrive className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>65% Less Storage</CardTitle>
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
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Faster Transfers</CardTitle>
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
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Info className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Efficient Diffs</CardTitle>
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
        Dits uses <strong>FastCDC</strong> (Fast Content-Defined Chunking) to
        determine where to split files. Unlike fixed-size chunking, CDC finds
        natural breakpoints based on the file&apos;s content.
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

      <pre className="not-prose">
        <code>{`// Dits chunking parameters
Minimum chunk size:  256 KB
Average chunk size:    1 MB
Maximum chunk size:    4 MB

// Example: 10GB video file
Original file:     10 GB (1 file)
After chunking:    ~10,000 chunks
Average chunk:     ~1 MB each`}</code>
      </pre>

      <h3>Why Content-Defined?</h3>
      <p>
        The key advantage of CDC over fixed-size chunking is <strong>shift
        resistance</strong>. Consider what happens when you insert data at the
        beginning of a file:
      </p>

      <div className="not-prose my-8">
        <Card>
          <CardHeader>
            <CardTitle>Fixed-Size vs Content-Defined Chunking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium mb-2">Fixed-Size Chunking:</p>
              <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 text-sm">
{`Before: [AAAA][BBBB][CCCC][DDDD]
Insert X at start...
After:  [XAAA][ABBB][BCCC][CDDD]
Result: ALL chunks changed! 0% reuse`}
              </pre>
            </div>
            <div>
              <p className="font-medium mb-2">Content-Defined Chunking:</p>
              <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 text-sm">
{`Before: [AAA][BBBBB][CC][DDDDD]
Insert X at start...
After:  [X][AAA][BBBBB][CC][DDDDD]
Result: Only 1 new chunk! 80%+ reuse`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2>Video-Aware Chunking</h2>
      <p>
        For video files, Dits goes beyond basic CDC by aligning chunk boundaries
        to video keyframes (I-frames) when possible.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Keyframe Alignment</AlertTitle>
        <AlertDescription>
          Keyframes are complete images in a video stream. By aligning chunks to
          keyframes, each chunk becomes independently decodable, which improves
          streaming and random access performance.
        </AlertDescription>
      </Alert>

      <pre className="not-prose">
        <code>{`Video Structure:
  I    P    P    P    I    P    P    P    I
  |    |    |    |    |    |    |    |    |
  └────────────┘      └────────────┘      └──
     Chunk 1              Chunk 2        ...

I = Keyframe (complete image)
P = Predicted frame (depends on previous frames)`}</code>
      </pre>

      <h2>Deduplication</h2>
      <p>
        After chunking, each chunk is hashed using BLAKE3 (a fast cryptographic
        hash function). Chunks with identical hashes are stored only once.
      </p>

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
      <pre className="not-prose">
        <code>{`Project: 3 takes of a 2-minute scene (1080p ProRes)

Without deduplication:
  Take 1:  12 GB
  Take 2:  12 GB
  Take 3:  12 GB
  Total:   36 GB

With Dits chunking:
  Take 1:  12 GB (all new chunks)
  Take 2:   2 GB (83% shared with Take 1)
  Take 3:   1 GB (92% shared with previous)
  Total:   15 GB (58% savings)`}</code>
      </pre>

      <h2>Chunk Parameters</h2>
      <p>
        Dits uses carefully tuned parameters for different file types:
      </p>

      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">File Type</th>
              <th className="text-left p-3">Min Size</th>
              <th className="text-left p-3">Avg Size</th>
              <th className="text-left p-3">Max Size</th>
              <th className="text-left p-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-3">Video (H.264/H.265)</td>
              <td className="p-3 font-mono">256 KB</td>
              <td className="p-3 font-mono">1 MB</td>
              <td className="p-3 font-mono">4 MB</td>
              <td className="p-3 text-muted-foreground">Keyframe-aligned</td>
            </tr>
            <tr className="border-b">
              <td className="p-3">Video (ProRes/DNxHR)</td>
              <td className="p-3 font-mono">512 KB</td>
              <td className="p-3 font-mono">2 MB</td>
              <td className="p-3 font-mono">8 MB</td>
              <td className="p-3 text-muted-foreground">Larger for efficiency</td>
            </tr>
            <tr className="border-b">
              <td className="p-3">Audio</td>
              <td className="p-3 font-mono">64 KB</td>
              <td className="p-3 font-mono">256 KB</td>
              <td className="p-3 font-mono">1 MB</td>
              <td className="p-3 text-muted-foreground">Smaller for precision</td>
            </tr>
            <tr className="border-b">
              <td className="p-3">Images</td>
              <td className="p-3 font-mono">64 KB</td>
              <td className="p-3 font-mono">512 KB</td>
              <td className="p-3 font-mono">2 MB</td>
              <td className="p-3 text-muted-foreground">Standard CDC</td>
            </tr>
            <tr>
              <td className="p-3">Other</td>
              <td className="p-3 font-mono">256 KB</td>
              <td className="p-3 font-mono">1 MB</td>
              <td className="p-3 font-mono">4 MB</td>
              <td className="p-3 text-muted-foreground">Default parameters</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Technical Details</h2>

      <h3>The FastCDC Algorithm</h3>
      <p>
        FastCDC improves on the original CDC algorithm by using a gear-based
        rolling hash that is significantly faster while maintaining good
        deduplication properties.
      </p>

      <pre className="not-prose">
        <code>{`// Simplified FastCDC implementation
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
}`}</code>
      </pre>

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
  );
}
