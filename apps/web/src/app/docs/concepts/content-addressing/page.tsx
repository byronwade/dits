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
import { Info, Lock, Database, Share2 } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Content Addressing",
  description: "How Dits uses content hashes to identify and store data",
};

export default function ContentAddressingPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Content Addressing</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits identifies all data by its cryptographic hash, ensuring integrity
        and enabling efficient deduplication across repositories.
      </p>

      <h2>What is Content Addressing?</h2>
      <p>
        In a content-addressed storage system, data is identified by <em>what it
          contains</em> rather than <em>where it&apos;s located</em>. The &quot;address&quot; of any
        piece of data is the cryptographic hash of its contents.
      </p>

      <CodeBlock
        language="bash"
        code={`Traditional addressing (location-based):
  /projects/video/scene1_take2.mov

Content addressing (hash-based):
  blake3:a1b2c3d4e5f6...  (represents the exact bytes)`}
      />

      <h2>Benefits of Content Addressing</h2>

      <div className="not-prose grid gap-4 md:grid-cols-2 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Data Integrity</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              If the hash matches, the data is guaranteed to be exactly what was
              stored. Any corruption or tampering is immediately detectable.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Automatic Deduplication</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Identical content always has the same hash, so duplicates are
              automatically eliminated without any special handling.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Share2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Efficient Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Content can be retrieved from any source that has it - the hash
              guarantees authenticity regardless of where it came from.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Info className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Immutability</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Content-addressed data is inherently immutable. You can&apos;t change
              the data without changing the address, creating a clear audit trail.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <h2>BLAKE3: The Hash Function</h2>
      <p>
        Dits uses <strong>BLAKE3</strong> for all content addressing. BLAKE3 is a
        modern cryptographic hash function designed for speed and security.
      </p>

      <h3>Why BLAKE3?</h3>
      <ul>
        <li>
          <strong>Extremely fast:</strong> 3-10x faster than SHA-256, essential
          for hashing large video files
        </li>
        <li>
          <strong>Parallelizable:</strong> Can utilize all CPU cores for maximum
          throughput
        </li>
        <li>
          <strong>Secure:</strong> Based on the proven BLAKE2 design, with no
          known vulnerabilities
        </li>
        <li>
          <strong>Fixed output:</strong> Always produces a 256-bit (32-byte) hash
        </li>
      </ul>

      <CodeBlock
        language="bash"
        code={`Performance comparison (10GB file):

SHA-256:   ~45 seconds
SHA-1:     ~30 seconds
BLAKE2b:   ~15 seconds
BLAKE3:    ~3 seconds  ← Dits uses this

BLAKE3 throughput: 3 GB/s per core (multi-threaded: 10+ GB/s)`}
      />

      <h2>Content-Addressed Objects</h2>
      <p>
        Dits uses content addressing for all objects in the repository:
      </p>

      <h3>Chunks</h3>
      <p>
        The smallest unit of storage. Each chunk&apos;s address is the BLAKE3 hash of
        its raw bytes.
      </p>
      <CodeBlock
        language="bash"
        code={`Chunk {
  hash: blake3("raw bytes of chunk data"),
  size: 1048576,  // 1 MB
  data: [...raw bytes...]
}`}
      />

      <h3>Assets</h3>
      <p>
        An asset represents a file and contains an ordered list of chunk references.
        The asset&apos;s address is the hash of its metadata and chunk list.
      </p>
      <CodeBlock
        language="bash"
        code={`Asset {
  hash: blake3(metadata + chunk_list),
  size: 10737418240,  // 10 GB
  chunks: [
    { hash: "a1b2c3...", offset: 0 },
    { hash: "d4e5f6...", offset: 1048576 },
    // ... more chunks
  ],
  metadata: {
    mime_type: "video/mp4",
    duration: 300.5,
    // ... codec info
  }
}`}
      />

      <h3>Manifests (Trees)</h3>
      <p>
        A manifest maps file paths to assets, representing a directory structure
        at a point in time.
      </p>
      <CodeBlock
        language="bash"
        code={`Manifest {
  hash: blake3(sorted_entries),
  entries: {
    "footage/scene1.mov": { asset: "abc123...", mode: 0o644 },
    "footage/scene2.mov": { asset: "def456...", mode: 0o644 },
    "project.prproj":     { asset: "789xyz...", mode: 0o644 },
  }
}`}
      />

      <h3>Commits</h3>
      <p>
        A commit references a manifest (tree) and parent commits, creating the
        version history.
      </p>
      <CodeBlock
        language="bash"
        code={`Commit {
  hash: blake3(all_fields),
  tree: "manifest_hash...",
  parents: ["parent_commit_hash..."],
  author: "Jane Editor <jane@example.com>",
  timestamp: "2024-01-15T10:30:00Z",
  message: "Add color grading to scene 1"
}`}
      />

      <h2>Hash Verification</h2>
      <p>
        Dits verifies hashes at multiple points to ensure data integrity:
      </p>

      <ol>
        <li>
          <strong>On write:</strong> When storing a chunk, the hash is computed
          and becomes the storage key
        </li>
        <li>
          <strong>On read:</strong> After reading a chunk, the hash is verified
          to match the expected value
        </li>
        <li>
          <strong>On transfer:</strong> During push/pull, hashes are verified to
          ensure data wasn&apos;t corrupted in transit
        </li>
        <li>
          <strong>On demand:</strong> The <code>dits fsck</code> command verifies
          all stored data
        </li>
      </ol>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Automatic Corruption Detection</AlertTitle>
        <AlertDescription>
          If any byte is changed - whether by hardware failure, cosmic rays, or
          malicious tampering - the hash verification will fail and Dits will
          alert you to the problem.
        </AlertDescription>
      </Alert>

      <h2>Content Addressing in Practice</h2>

      <h3>Finding Duplicates</h3>
      <CodeBlock
        language="bash"
        code={`$ dits add footage/take1.mov footage/take2.mov

Chunking footage/take1.mov... 10,234 chunks
Chunking footage/take2.mov... 10,198 chunks
  → 8,547 chunks already exist (83% deduplicated)
  → 1,651 new chunks to store

Storage: 1.6 GB instead of 20 GB`}
      />

      <h3>Verifying Integrity</h3>
      <CodeBlock
        language="bash"
        code={`$ dits fsck

Checking 45,892 chunks...
Checking 1,234 assets...
Checking 89 commits...

All objects verified. No corruption detected.`}
      />

      <h3>Referencing Specific Content</h3>
      <CodeBlock
        language="bash"
        code={`# Check out a specific version of a file
$ dits show abc123def:footage/scene1.mov > old_scene1.mov

# The hash guarantees you get exactly what was stored
$ blake3sum old_scene1.mov
abc123def456...  old_scene1.mov  ✓`}
      />

      <h2>Security Considerations</h2>

      <h3>Collision Resistance</h3>
      <p>
        BLAKE3 produces 256-bit hashes, meaning there are 2^256 possible hash
        values. The probability of two different pieces of data having the same
        hash (a collision) is astronomically small - effectively zero.
      </p>

      <h3>Pre-image Resistance</h3>
      <p>
        Given a hash, it&apos;s computationally infeasible to find any data that
        produces that hash. This protects against attacks where someone tries to
        create malicious content that appears legitimate.
      </p>

      <h3>Not Encryption</h3>
      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Content addressing is <em>not</em> encryption. The hash doesn&apos;t hide the
          content - anyone with the data can compute its hash. For confidential
          data, use Dits&apos;s <Link href="/docs/advanced/encryption" className="underline">encryption features</Link>.
        </AlertDescription>
      </Alert>

      <h2>Next Steps</h2>
      <ul>
        <li>
          Learn about{" "}
          <Link href="/docs/concepts/repositories">Repositories</Link>
        </li>
        <li>
          Understand{" "}
          <Link href="/docs/concepts/commits">Commits & History</Link>
        </li>
        <li>
          Explore{" "}
          <Link href="/docs/concepts/chunking">Chunking & Deduplication</Link>
        </li>
      </ul>
    </div>
  );
}
