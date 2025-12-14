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
import { CodeBlock } from "@/components/ui/code-block";
import { Cog, Database, Hash, FileCode, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
    title: "Internals - Low-Level Commands",
    description: "Low-level plumbing commands for advanced Dits operations",
};

export default function InternalsPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Internals &amp; Plumbing</h1>
            <p className="lead text-xl text-muted-foreground">
                Low-level commands for advanced operations, scripting, and understanding
                how Dits works under the hood. These are the building blocks that power
                higher-level commands.
            </p>

            <Alert className="not-prose my-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Advanced Usage</AlertTitle>
                <AlertDescription>
                    These commands are intended for advanced users, scripts, and tooling.
                    For everyday work, use the high-level commands in the CLI reference.
                </AlertDescription>
            </Alert>

            <h2>Object Types</h2>

            <p>Dits stores four types of objects:</p>

            <div className="grid gap-4 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Hash className="h-5 w-5 text-primary" />
                            Chunk
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Raw content data. Files are split into chunks using content-defined
                            chunking. Each chunk is identified by its SHA-256 hash.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileCode className="h-5 w-5 text-primary" />
                            Blob
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            File metadata + ordered list of chunk references. A blob represents
                            a complete file as an ordered sequence of chunks.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-primary" />
                            Tree
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Directory structure. Contains references to blobs (files) and
                            other trees (subdirectories) with names and permissions.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Cog className="h-5 w-5 text-primary" />
                            Commit
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Snapshot metadata. Points to a tree and contains author, message,
                            timestamp, and parent commit reference(s).
                        </p>
                    </CardContent>
                </Card>
            </div>

            <h2>Inspecting Objects</h2>

            <h3>dits cat-file</h3>
            <p>Display object content or type:</p>

            <CodeBlock
                language="bash"
                code={`# Show object type
$ dits cat-file -t abc1234
commit

# Show object size
$ dits cat-file -s abc1234
287

# Show raw content
$ dits cat-file -p abc1234
tree def5678
parent 0001234
author Your Name <you@example.com> 1702300000 -0500
committer Your Name <you@example.com> 1702300000 -0500

Add new feature

# Show blob content
$ dits cat-file blob 789abcd
[file content appears here]

# Show tree
$ dits cat-file -p def5678
100644 blob 111aaa    README.md
100644 blob 222bbb    package.json
040000 tree 333ccc    src`}
            />

            <h3>dits hash-object</h3>
            <p>Compute hash of content:</p>

            <CodeBlock
                language="bash"
                code={`# Hash file content (don't store)
$ dits hash-object myfile.txt
abc123def456...

# Hash and write to object store
$ dits hash-object -w myfile.txt
abc123def456...

# Hash from stdin
$ echo "hello" | dits hash-object --stdin
2cf24dba5fb0a30e...`}
            />

            <h2>Reference Commands</h2>

            <h3>dits show-ref</h3>
            <CodeBlock
                language="bash"
                code={`# List all refs
$ dits show-ref
abc1234 refs/heads/main
def5678 refs/heads/feature/new-ui
111aaa refs/remotes/origin/main
222bbb refs/tags/v1.0.0

# Show specific ref
$ dits show-ref refs/heads/main
abc1234 refs/heads/main

# Check if ref exists
$ dits show-ref --verify refs/heads/main && echo "exists"`}
            />

            <h3>dits rev-parse</h3>
            <CodeBlock
                language="bash"
                code={`# Resolve ref to commit hash
$ dits rev-parse HEAD
abc1234def5678...

$ dits rev-parse main
abc1234def5678...

# Resolve relative refs
$ dits rev-parse HEAD~3
older-commit-hash...

# Show git directory
$ dits rev-parse --dits-dir
/path/to/project/.dits

# Check if in repo
$ dits rev-parse --is-inside-work-tree
true`}
            />

            <h3>dits update-ref</h3>
            <CodeBlock
                language="bash"
                code={`# Update a ref (careful!)
$ dits update-ref refs/heads/feature/branch abc1234

# Create new ref
$ dits update-ref refs/heads/new-branch HEAD

# Delete ref
$ dits update-ref -d refs/heads/old-branch`}
            />

            <h2>Chunk Operations</h2>

            <h3>dits chunk-info</h3>
            <p>Dits-specific command to inspect chunks:</p>

            <CodeBlock
                language="bash"
                code={`# Show blob's chunks
$ dits chunk-info README.md
Blob: abc1234
Total chunks: 3
Total size: 4,567 bytes

Chunk 1: def567 (1,234 bytes)
Chunk 2: 123abc (2,048 bytes)
Chunk 3: 456def (1,285 bytes)

# Show chunk details
$ dits chunk-info --chunk def567
Hash: def567890abcdef...
Size: 1,234 bytes
Reference count: 5
Used by:
  - README.md (blob abc1234)
  - docs/intro.md (blob xyz789)
  - ...

# Show file chunking preview
$ dits chunk-info --preview large-file.bin
Estimated chunks: 1,234
Average size: 64 KB
Algorithm: fastcdc`}
            />

            <h3>dits verify-chunks</h3>
            <CodeBlock
                language="bash"
                code={`# Verify chunk integrity
$ dits verify-chunks
Checking 12,345 chunks...
  Verified: 12,345
  Corrupted: 0
  Missing: 0
All chunks OK.

# Verify specific file
$ dits verify-chunks -- video.mov
Checking 456 chunks for video.mov...
All chunks OK.

# Fix corrupted chunks (re-fetch from remote)
$ dits verify-chunks --fix
Checking 12,345 chunks...
  Corrupted: 2
  Re-fetching from origin...
  Fixed: 2
All chunks OK.`}
            />

            <h2>Index Operations</h2>

            <h3>dits ls-files</h3>
            <CodeBlock
                language="bash"
                code={`# List tracked files
$ dits ls-files
README.md
package.json
src/index.ts
src/utils.ts

# Show staged files
$ dits ls-files --stage
100644 abc123 0  README.md
100644 def456 0  package.json

# Show modified
$ dits ls-files --modified

# Show untracked
$ dits ls-files --others

# Show ignored
$ dits ls-files --ignored`}
            />

            <h3>dits update-index</h3>
            <CodeBlock
                language="bash"
                code={`# Add file to index
$ dits update-index --add myfile.txt

# Remove from index
$ dits update-index --remove myfile.txt

# Refresh index (check for changes)
$ dits update-index --refresh

# Assume unchanged (skip in status)
$ dits update-index --assume-unchanged bigfile.bin

# Undo assume unchanged
$ dits update-index --no-assume-unchanged bigfile.bin`}
            />

            <h2>Low-Level Commit</h2>

            <CodeBlock
                language="bash"
                code={`# Create tree from index
$ dits write-tree
tree-hash-abc123...

# Create commit manually
$ dits commit-tree tree-hash-abc123 -p HEAD -m "Manual commit"
commit-hash-def456...

# Update HEAD to new commit
$ dits update-ref HEAD commit-hash-def456`}
            />

            <h2>Debugging</h2>

            <CodeBlock
                language="bash"
                code={`# Enable debug logging
$ DITS_DEBUG=1 dits status

# Trace all operations
$ DITS_TRACE=1 dits push origin main

# Show internal stats
$ dits count-objects
count: 12,345
size: 2.3 GB
chunks: 45,678
in-pack: 40,000
packs: 3

# Check repository health
$ dits fsck
Checking objects...
Checking connectivity...
All objects OK.`}
            />

            <Alert className="not-prose my-6">
                <Cog className="h-4 w-4" />
                <AlertTitle>Scripting Friendly</AlertTitle>
                <AlertDescription>
                    These commands are designed for scripting. Use <code>--porcelain</code> for
                    machine-readable output and check exit codes for success/failure.
                </AlertDescription>
            </Alert>

            <h2>Related Topics</h2>
            <ul>
                <li><Link href="/docs/architecture/data-structures">Data Structures</Link> - Object formats</li>
                <li><Link href="/docs/concepts/chunking">Chunking</Link> - How files are split</li>
                <li><Link href="/docs/concepts/content-addressing">Content Addressing</Link> - Hash-based storage</li>
            </ul>
        </div>
    );
}
