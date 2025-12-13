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
import { Lightbulb } from "lucide-react";

export const metadata: Metadata = {
  title: "Core Concepts",
  description: "Understand how Dits works under the hood",
};

export default function ConceptsPage() {
  return (
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

      <h2>Content Addressing</h2>
      <p>
        Every piece of data in Dits is identified by its <strong>content hash</strong>,
        specifically a BLAKE3 hash. This is called <strong>content addressing</strong>.
      </p>

      <pre className="not-prose">
        <code>{`# Every chunk has a unique hash based on its content
Chunk abc123... = specific 1.2MB of video data
Chunk def456... = specific 0.9MB of video data

# Files are just lists of chunk hashes
video.mp4 = [abc123, def456, ghi789, ...]

# Commits reference file manifests by hash
Commit xyz... -> Manifest hash -> File hashes -> Chunk hashes`}</code>
      </pre>

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

      <h2>Repository Structure</h2>
      <p>
        A Dits repository is stored in a <code>.dits</code> directory with this
        structure:
      </p>

      <pre className="not-prose">
        <code>{`.dits/
├── HEAD              # Current branch reference
├── config            # Repository configuration
├── index             # Staging area
├── objects/          # Content-addressed storage
│   ├── chunks/       # File chunks
│   ├── manifests/    # File manifests
│   └── commits/      # Commit objects
└── refs/
    ├── heads/        # Branch refs
    └── tags/         # Tag refs`}</code>
      </pre>

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

      <pre className="not-prose">
        <code>{`# You have two versions of the same footage
scene01_take1.mp4  (10 GB, 10,000 chunks)
scene01_take2.mp4  (10 GB, 10,000 chunks)

# But 95% of the content is identical
# Dits stores:
- 10,000 unique chunks from take1
- 500 unique chunks from take2
- Total: 10,500 chunks (~10.5 GB) instead of 20 GB

# Deduplication savings: 47.5%`}</code>
      </pre>

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

      <h2>Virtual Filesystem (VFS)</h2>
      <p>
        Dits can mount a repository as a virtual drive using FUSE. Files appear
        instantly but are only &quot;hydrated&quot; (chunks downloaded) when accessed.
      </p>

      <pre className="not-prose">
        <code>{`# Mount the repository
$ dits mount /mnt/project

# Files appear immediately
$ ls /mnt/project/footage/
scene01.mp4  scene02.mp4  scene03.mp4

# Opening a file triggers on-demand hydration
$ ffplay /mnt/project/footage/scene01.mp4
# Only accessed chunks are fetched`}</code>
      </pre>

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
  );
}
