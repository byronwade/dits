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
import { Info, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Advanced Commands",
  description: "Advanced Dits commands for power users",
};

const commands = [
  {
    command: "fsck",
    description: "Verify repository integrity",
    usage: "dits fsck",
  },
  {
    command: "gc",
    description: "Garbage collection",
    usage: "dits gc",
  },
  {
    command: "prune",
    description: "Remove unreachable objects",
    usage: "dits prune",
  },
  {
    command: "pack",
    description: "Pack objects for efficient storage",
    usage: "dits pack",
  },
  {
    command: "unpack",
    description: "Unpack packed objects",
    usage: "dits unpack <pack>",
  },
  {
    command: "cat-file",
    description: "Show object contents",
    usage: "dits cat-file <object>",
  },
  {
    command: "hash-object",
    description: "Compute hash for data",
    usage: "dits hash-object <file>",
  },
];

export default function AdvancedCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Advanced Commands</h1>
      <p className="lead text-xl text-muted-foreground">
        Low-level commands for repository maintenance, debugging, and advanced
        operations.
      </p>

      <Alert className="not-prose my-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Advanced Use Only</AlertTitle>
        <AlertDescription>
          These commands operate on the internal structure of Dits repositories.
          Use them carefully and make backups before running destructive operations.
        </AlertDescription>
      </Alert>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Command</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Usage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commands.map((cmd) => (
            <TableRow key={cmd.command}>
              <TableCell className="font-mono font-medium">{cmd.command}</TableCell>
              <TableCell>{cmd.description}</TableCell>
              <TableCell className="font-mono text-sm">{cmd.usage}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2>Repository Maintenance</h2>

      <h3>dits fsck</h3>
      <p>
        Verify the integrity of all objects in the repository. Checks that all
        hashes match their content.
      </p>

      <pre className="not-prose">
        <code>{`$ dits fsck

Checking 45,892 chunks...
Checking 1,234 assets...
Checking 89 trees...
Checking 42 commits...

All objects verified. No corruption detected.

# Verbose output
$ dits fsck --verbose
Checking chunk a1b2c3d4... ok
Checking chunk b2c3d4e5... ok
...

# Check specific object
$ dits fsck a1b2c3d4
Object a1b2c3d4: valid

# Show unreachable objects
$ dits fsck --unreachable
Unreachable chunks: 234 (567 MB)
Unreachable assets: 12 (24 KB)
Unreachable commits: 3 (6 KB)`}</code>
      </pre>

      <h3>dits gc</h3>
      <p>
        Run garbage collection to clean up unnecessary files and optimize the
        repository.
      </p>

      <pre className="not-prose">
        <code>{`$ dits gc

Finding unreachable objects...
Found 234 unreachable chunks (567 MB)
Found 12 unreachable assets (24 KB)

Removing unreachable objects... done
Packing loose objects... done
Pruning old packs... done

Freed 567 MB

# Aggressive GC (more thorough)
$ dits gc --aggressive

# Dry run (show what would be collected)
$ dits gc --dry-run
Would remove:
  234 chunks (567 MB)
  12 assets (24 KB)
  3 commits (6 KB)

# Keep objects newer than date
$ dits gc --prune=now  # Remove all unreachable
$ dits gc --prune=2weeks  # Keep if < 2 weeks old`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Automatic GC</AlertTitle>
        <AlertDescription>
          Dits automatically runs <code>gc --auto</code> after operations that
          create many loose objects. Manual GC is rarely needed.
        </AlertDescription>
      </Alert>

      <h3>dits prune</h3>
      <p>Remove unreachable objects that are older than the grace period.</p>

      <pre className="not-prose">
        <code>{`$ dits prune
Pruning unreachable objects older than 2 weeks...
Removed 234 objects (567 MB)

# Prune everything unreachable
$ dits prune --expire now

# Dry run
$ dits prune --dry-run`}</code>
      </pre>

      <h2>Object Inspection</h2>

      <h3>dits cat-file</h3>
      <p>Show the contents or type of a repository object.</p>

      <pre className="not-prose">
        <code>{`# Show object type
$ dits cat-file -t a1b2c3d4
commit

# Show object size
$ dits cat-file -s a1b2c3d4
256

# Show object content
$ dits cat-file -p a1b2c3d4
tree def45678
parent 9f8e7d6c
author Jane Editor <jane@example.com> 1705340400 -0800
committer Jane Editor <jane@example.com> 1705340400 -0800

Add color grading to scene 1

# Show chunk data
$ dits cat-file -p chunk:abc123def
(binary data...)

# Show asset manifest
$ dits cat-file -p asset:xyz789abc
{
  "size": 10737418240,
  "mime_type": "video/mp4",
  "chunks": [
    {"hash": "a1b2c3d4", "offset": 0, "size": 1048576},
    {"hash": "b2c3d4e5", "offset": 1048576, "size": 1048576},
    ...
  ]
}`}</code>
      </pre>

      <h3>dits hash-object</h3>
      <p>Compute the hash of a file or data.</p>

      <pre className="not-prose">
        <code>{`# Hash a file (doesn't store it)
$ dits hash-object footage/scene1.mov
a1b2c3d4e5f6...

# Hash and store
$ dits hash-object -w footage/scene1.mov
a1b2c3d4e5f6...

# Hash stdin
$ echo "test data" | dits hash-object --stdin
f9e8d7c6b5a4...

# Show chunk boundaries
$ dits hash-object --show-chunks footage/scene1.mov
Chunk 1: 0-1048576 (1.0 MB) → a1b2c3d4
Chunk 2: 1048576-2097152 (1.0 MB) → b2c3d4e5
Chunk 3: 2097152-3145728 (1.0 MB) → c3d4e5f6
...
Total: 10,234 chunks`}</code>
      </pre>

      <h2>Packing</h2>

      <h3>dits pack</h3>
      <p>Pack objects for more efficient storage and transfer.</p>

      <pre className="not-prose">
        <code>{`# Pack all loose objects
$ dits pack
Counting objects: 45,892
Compressing objects: 100% (45,892/45,892)
Writing pack: 100%
Created pack abc123 (12.5 GB → 11.2 GB)

# Pack specific objects
$ dits pack --revs
a1b2c3d4
b2c3d4e5
^9f8e7d6c

# Show pack statistics
$ dits pack --stat
Packs: 3
  pack-abc123.pack: 45,000 objects (11.2 GB)
  pack-def456.pack: 892 objects (300 MB)
  pack-ghi789.pack: 100 objects (50 MB)
Loose objects: 234 (567 MB)`}</code>
      </pre>

      <h3>dits unpack</h3>
      <p>Extract objects from a pack file.</p>

      <pre className="not-prose">
        <code>{`# Unpack a pack file
$ dits unpack pack-abc123.pack
Unpacking 45,000 objects...

# Verify during unpack
$ dits unpack --verify pack-abc123.pack`}</code>
      </pre>

      <h2>Debugging</h2>

      <h3>dits rev-parse</h3>
      <p>Parse revision specifications and show their hashes.</p>

      <pre className="not-prose">
        <code>{`# Show commit hash
$ dits rev-parse HEAD
a1b2c3d4e5f6789...

$ dits rev-parse main
a1b2c3d4e5f6789...

# Show tree hash
$ dits rev-parse HEAD^{tree}
def456789abc...

# Show relative commits
$ dits rev-parse HEAD~3
9f8e7d6c5b4a...`}</code>
      </pre>

      <h3>dits ls-tree</h3>
      <p>List the contents of a tree object.</p>

      <pre className="not-prose">
        <code>{`$ dits ls-tree HEAD
100644 asset abc123def footage/scene1.mov
100644 asset def456abc footage/scene2.mov
100644 asset 789xyzabc project.prproj
040000 tree  456abcdef audio/

# Recursive
$ dits ls-tree -r HEAD
100644 asset abc123def footage/scene1.mov
100644 asset def456abc footage/scene2.mov
100644 asset 789xyzabc project.prproj
100644 asset 123abcdef audio/music.wav
100644 asset 456defabc audio/sfx.wav`}</code>
      </pre>

      <h3>dits ls-files</h3>
      <p>Show information about files in the index and working tree.</p>

      <pre className="not-prose">
        <code>{`# Show tracked files
$ dits ls-files
footage/scene1.mov
footage/scene2.mov
project.prproj

# Show staged files
$ dits ls-files --staged
100644 abc123def 0 footage/scene1.mov
100644 def456abc 0 footage/scene2.mov

# Show modified files
$ dits ls-files --modified
footage/scene1.mov

# Show untracked files
$ dits ls-files --others
footage/new-take.mov`}</code>
      </pre>

      <h2>Recovery</h2>

      <h3>dits reflog</h3>
      <p>Show reference log for recovering lost commits.</p>

      <pre className="not-prose">
        <code>{`$ dits reflog
a1b2c3d HEAD@{0}: commit: Current work
f5e4d3c HEAD@{1}: reset: moving to HEAD~3
b2c3d4e HEAD@{2}: commit: Lost commit 3
c3d4e5f HEAD@{3}: commit: Lost commit 2
d4e5f6g HEAD@{4}: commit: Lost commit 1

# Recover lost commit
$ dits reset --hard HEAD@{2}
HEAD is now at b2c3d4e Lost commit 3`}</code>
      </pre>

      <h3>dits lost-found</h3>
      <p>Find unreachable objects that might be recoverable.</p>

      <pre className="not-prose">
        <code>{`$ dits lost-found
Searching for unreachable objects...

Found 5 unreachable commits:
  b2c3d4e commit: Lost work from yesterday
  c3d4e5f commit: Experiment branch
  ...

Found 234 unreachable chunks (567 MB)

# Recover a commit
$ dits branch recovered b2c3d4e`}</code>
      </pre>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/architecture">Architecture Overview</Link> - How Dits stores data
        </li>
        <li>
          <Link href="/docs/architecture/data-structures">Data Structures</Link> - Object types
        </li>
        <li>
          <Link href="/docs/concepts/content-addressing">Content Addressing</Link> - Hash-based storage
        </li>
      </ul>
    </div>
  );
}
