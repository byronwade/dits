import { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import { FileTree } from "@/components/docs/file-tree";
import { CommitGraph } from "@/components/docs/commit-graph";

export const metadata: Metadata = {
  title: "Data Structures",
  description: "Core data structures used in Dits repositories",
};

export default function DataStructuresPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Data Structures</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits stores all repository data as content-addressed objects. This page
        describes the core data structures and how they relate.
      </p>

      <h2>Object Hierarchy</h2>
      <div className="not-prose my-6">
        <FileTree
          items={[
            {
              name: "Commit a1b2c3d4",
              type: "folder",
              children: [
                {
                  name: "Tree def45678",
                  type: "folder",
                  comment: "Manifest",
                  children: [
                    {
                      name: "footage/scene1.mov",
                      type: "file",
                      comment: "→ Asset abc123 (Chunks: 001, 002, ...)",
                    },
                    {
                      name: "footage/scene2.mov",
                      type: "file",
                      comment: "→ Asset def456",
                    },
                    {
                      name: "project.prproj",
                      type: "file",
                      comment: "→ Asset ghi789",
                    },
                  ],
                },
              ],
            },
          ]}
        />
      </div>

      <h2>Chunk</h2>
      <p>
        The smallest unit of storage. Chunks are variable-size pieces of file
        content, typically 256KB to 4MB.
      </p>

      <CodeBlock
        language="bash"
        code={`struct Chunk {
    // 32-byte BLAKE3 hash of the raw content
    hash: [u8; 32],

    // Uncompressed size in bytes
    size: u32,

    // Compression algorithm used (if any)
    compression: Option<Compression>,

    // The actual data (when loaded)
    data: Vec<u8>,
}

enum Compression {
    None,
    Zstd { level: u8 },
    Lz4,
}

// Storage format on disk:
// .dits/objects/chunks/a1/b2c3d4e5f6...
//                      ^^
//                      First 2 hex chars of hash`}
      />

      <h3>Chunk Properties</h3>
      <ul>
        <li><strong>Immutable:</strong> Content never changes after creation</li>
        <li><strong>Deduplicated:</strong> Identical chunks share storage</li>
        <li><strong>Verifiable:</strong> Hash guarantees integrity</li>
        <li><strong>Independent:</strong> Can be stored/transferred separately</li>
      </ul>

      <h2>Asset</h2>
      <p>
        An asset represents a single file. It contains metadata and an ordered
        list of chunk references that reconstruct the file.
      </p>

      <CodeBlock
        language="bash"
        code={`struct Asset {
    // Hash of the entire file content (for verification)
    content_hash: [u8; 32],

    // Hash of this asset manifest
    hash: [u8; 32],

    // Total file size in bytes
    size: u64,

    // MIME type
    mime_type: String,

    // Ordered list of chunks
    chunks: Vec<ChunkRef>,

    // Optional media metadata
    media: Option<MediaMetadata>,
}

struct ChunkRef {
    // Hash of the chunk
    hash: [u8; 32],

    // Offset in the original file
    offset: u64,

    // Size of this chunk
    size: u32,
}

struct MediaMetadata {
    // For video files
    duration_ms: Option<u64>,
    width: Option<u32>,
    height: Option<u32>,
    frame_rate: Option<f32>,
    codec: Option<String>,
    keyframe_positions: Vec<u64>,
}`}
      />

      <h3>Asset Properties</h3>
      <ul>
        <li><strong>File reconstruction:</strong> Concatenate chunks in order</li>
        <li><strong>Random access:</strong> Seek to any offset using chunk table</li>
        <li><strong>Sparse storage:</strong> Only fetch needed chunks</li>
      </ul>

      <h2>Tree (Manifest)</h2>
      <p>
        A tree represents a directory structure at a point in time. It maps paths
        to assets.
      </p>

      <CodeBlock
        language="bash"
        code={`struct Tree {
    // Hash of the tree (computed from sorted entries)
    hash: [u8; 32],

    // Map of paths to entries
    entries: BTreeMap<PathBuf, TreeEntry>,
}

struct TreeEntry {
    // Hash of the asset
    asset_hash: [u8; 32],

    // File mode (permissions)
    mode: FileMode,

    // File size (for quick listing)
    size: u64,
}

enum FileMode {
    Regular,     // 0o100644
    Executable,  // 0o100755
    Symlink,     // 0o120000
}

// Serialization (sorted by path for consistent hashing):
footage/scene1.mov  100644  abc123...
footage/scene2.mov  100644  def456...
project.prproj      100644  ghi789...`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Tree Hashing</AlertTitle>
        <AlertDescription>
          Trees are hashed by sorting entries alphabetically and hashing the
          concatenated representation. This ensures identical directory states
          always produce the same hash.
        </AlertDescription>
      </Alert>

      <h2>Commit</h2>
      <p>
        A commit records a snapshot of the repository with metadata about who
        made the change and when.
      </p>

      <CodeBlock
        language="bash"
        code={`struct Commit {
    // Hash of this commit
    hash: [u8; 32],

    // Hash of the tree (directory snapshot)
    tree: [u8; 32],

    // Parent commit hashes (usually 1, 2 for merges)
    parents: Vec<[u8; 32]>,

    // Author information
    author: Signature,

    // Committer information (may differ from author)
    committer: Signature,

    // Commit message
    message: String,

    // Additional headers (for extensions)
    headers: HashMap<String, String>,
}

struct Signature {
    name: String,
    email: String,
    timestamp: DateTime<Utc>,
    timezone_offset: i32,  // minutes from UTC
}

// Serialization format:
tree def45678...
parent 9f8e7d6c...
author Jane Editor <jane@example.com> 1705340400 -0800
committer Jane Editor <jane@example.com> 1705340400 -0800

Add color grading to scene 1`}
      />

      <h3>Commit Graph</h3>
      <p>
        Commits form a directed acyclic graph (DAG) through parent references:
      </p>
      <div className="not-prose my-6">
        <CommitGraph
          commits={[
            { hash: "a1b2c3d", labels: ["HEAD", "main"] },
            { hash: "9f8e7d6" },
            { hash: "5c4b3a2", isMerge: true, label: "merge commit" },
            { hash: "1234567" },
            { hash: "abcdef0" },
          ]}
        />
      </div>

      <h2>Reference</h2>
      <p>
        References are named pointers to commits. They enable branch and tag
        functionality.
      </p>

      <CodeBlock
        language="bash"
        code={`// Reference types:

// Branch - mutable pointer to a commit
// .dits/refs/heads/main → a1b2c3d4...

// Tag - immutable pointer to a commit
// .dits/refs/tags/v1.0 → 9f8e7d6c...

// Remote tracking branch
// .dits/refs/remotes/origin/main → a1b2c3d4...

// HEAD - current position (symbolic or direct)
// .dits/HEAD → ref: refs/heads/main
// or
// .dits/HEAD → a1b2c3d4...  (detached)`}
      />

      <h2>Index (Staging Area)</h2>
      <p>
        The index tracks staged changes between the working directory and the
        last commit.
      </p>

      <CodeBlock
        language="bash"
        code={`struct Index {
    // Version for format compatibility
    version: u32,

    // Indexed entries
    entries: Vec<IndexEntry>,

    // Extensions (cache, resolve-undo, etc.)
    extensions: Vec<Extension>,
}

struct IndexEntry {
    // Path relative to repository root
    path: PathBuf,

    // Asset hash (staged content)
    asset_hash: [u8; 32],

    // File statistics (for change detection)
    stat: FileStat,

    // Flags
    flags: IndexFlags,
}

struct FileStat {
    ctime: SystemTime,
    mtime: SystemTime,
    dev: u64,
    ino: u64,
    mode: u32,
    uid: u32,
    gid: u32,
    size: u64,
}`}
      />

      <h2>Pack Files</h2>
      <p>
        For efficient storage and transfer, objects can be packed together:
      </p>

      <CodeBlock
        language="bash"
        code={`struct PackFile {
    // Pack header
    magic: [u8; 4],    // "PACK"
    version: u32,
    object_count: u32,

    // Packed objects (compressed, potentially deltified)
    objects: Vec<PackedObject>,

    // Pack checksum
    checksum: [u8; 32],
}

struct PackIndex {
    // Maps object hash to offset in pack file
    // Enables O(log n) lookups
    entries: BTreeMap<[u8; 32], PackOffset>,

    // Pack file hash this index corresponds to
    pack_hash: [u8; 32],
}

// Storage:
// .dits/objects/packs/pack-a1b2c3d4.pack
// .dits/objects/packs/pack-a1b2c3d4.idx`}
      />

      <h2>Object Storage Layout</h2>
      <div className="not-prose my-6">
        <FileTree
          items={[
            {
              name: ".dits",
              type: "folder",
              children: [
                { name: "HEAD", type: "file", comment: "Current branch reference" },
                { name: "config", type: "file", comment: "Repository configuration" },
                { name: "index", type: "file", comment: "Staging area" },
                {
                  name: "objects",
                  type: "folder",
                  children: [
                    { name: "chunks", type: "folder", comment: "Loose chunk objects" },
                    { name: "assets", type: "folder", comment: "Asset manifests" },
                    { name: "trees", type: "folder", comment: "Tree manifests" },
                    { name: "commits", type: "folder", comment: "Commit objects" },
                    { name: "packs", type: "folder", comment: "Packed objects" },
                  ],
                },
                {
                  name: "refs",
                  type: "folder",
                  children: [
                    { name: "heads", type: "folder", comment: "Local branches" },
                    { name: "remotes", type: "folder", comment: "Remote tracking" },
                    { name: "tags", type: "folder", comment: "Tags" },
                  ],
                },
                { name: "hooks", type: "folder", comment: "Repository hooks" },
              ],
            },
          ]}
        />
      </div>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/architecture/algorithms">Algorithms</Link> -
          How these structures are created and processed
        </li>
        <li>
          <Link href="/docs/concepts/content-addressing">Content Addressing</Link> -
          The foundation of Dits storage
        </li>
        <li>
          <Link href="/docs/concepts/chunking">Chunking</Link> -
          How files are split into chunks
        </li>
      </ul>
    </div>
  );
}
