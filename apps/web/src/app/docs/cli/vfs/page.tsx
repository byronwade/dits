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
import { HardDrive, Info, Database, Unplug, BarChart3 } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "VFS Commands",
  description: "Commands for mounting Dits repositories as virtual filesystems",
};

const commands = [
  { command: "mount", description: "Mount repository as virtual filesystem", usage: "dits mount [OPTIONS] [MOUNTPOINT]" },
  { command: "unmount", description: "Unmount virtual filesystem", usage: "dits unmount [OPTIONS] [MOUNTPOINT]" },
  { command: "cache-stats", description: "Show VFS cache statistics", usage: "dits cache-stats [OPTIONS]" },
];

export default function VFSCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="h-8 w-8 text-indigo-500" />
        <h1 className="mb-0">Virtual Filesystem Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Mount Dits repositories as virtual drives. Files appear instantly and
        stream on-demand - no need to download entire files before opening them.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Just-In-Time Hydration</AlertTitle>
        <AlertDescription>
          When you mount a repository, files appear immediately as placeholders.
          Actual data is fetched only when a file is opened or accessed. This
          enables instant access to multi-terabyte repositories without waiting
          for downloads.
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

      <h2 className="flex items-center gap-2">
        <Database className="h-5 w-5" />
        dits mount
      </h2>
      <p>
        Mount a repository as a virtual filesystem using FUSE. Files and directories
        appear at the mount point, with data streamed on-demand.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits mount [OPTIONS] [MOUNTPOINT]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--read-only           Mount as read-only (no modifications)
--allow-other         Allow other users to access mount
--commit <REF>        Mount a specific commit or tag
--branch <NAME>       Mount a specific branch
--background, -b      Run mount in background
--cache-size <SIZE>   Set local cache size (default: 10GB)
--cache-dir <PATH>    Override cache directory
--prefetch            Enable aggressive prefetching
--prefetch-size <N>   Prefetch next N chunks
--no-sparse           Disable sparse file support
-v, --verbose         Show detailed mount information`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Mount to default location
$ dits mount

Mounting repository at /Volumes/dits-project...
Virtual filesystem ready.

  Repository: my-project
  Branch: main (abc1234)
  Files: 1,234 available
  Mode: read-write
  Cache: 10 GB (0 bytes used)

Press Ctrl+C to unmount (or use 'dits unmount')

# Mount to specific location
$ dits mount /mnt/project

# Mount in background
$ dits mount -b /mnt/project
Mounted at /mnt/project (pid: 12345)

# Mount as read-only
$ dits mount --read-only /mnt/project

# Mount specific commit (great for reviewing old versions)
$ dits mount --commit v1.0 /mnt/v1-release

# Mount specific branch
$ dits mount --branch feature/color-grade /mnt/color-grade

# Mount with large cache for heavy editing
$ dits mount --cache-size 100GB /mnt/project

# Mount with prefetching for smoother playback
$ dits mount --prefetch --prefetch-size 10 /mnt/project`}
      />

      <h3>How It Works</h3>
      <CodeBlock
        language="bash"
        code={`Mount Architecture:

┌─────────────────────────────────────────────────────┐
│                   Your Application                   │
│              (NLE, Media Player, etc.)               │
└────────────────────────┬────────────────────────────┘
                         │ Standard file I/O
                         ▼
┌─────────────────────────────────────────────────────┐
│                 FUSE Mount Point                     │
│                 /Volumes/dits-project                │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                   Dits VFS Layer                     │
│  • File → Chunk mapping                              │
│  • Prefetching logic                                 │
│  • Cache management                                  │
└────────────────────────┬────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
   ┌──────────────┐           ┌──────────────┐
   │ Local Cache  │           │    Remote    │
   │ .dits/cache/ │           │   Storage    │
   └──────────────┘           └──────────────┘`}
      />

      <h2 className="flex items-center gap-2">
        <Unplug className="h-5 w-5" />
        dits unmount
      </h2>
      <p>
        Unmount a virtual filesystem. Ensures all pending operations complete
        before unmounting.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits unmount [OPTIONS] [MOUNTPOINT]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`-f, --force         Force unmount (may lose unsaved data)
--all               Unmount all Dits mounts
--wait              Wait for operations to complete`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Unmount default location
$ dits unmount
Unmounting /Volumes/dits-project...
Syncing pending changes... done
Unmounted successfully.

# Unmount specific path
$ dits unmount /mnt/project

# Force unmount (when mount is stuck)
$ dits unmount -f /mnt/project
Warning: Force unmounting. Unsaved changes may be lost.
Unmounted.

# Unmount all mounts
$ dits unmount --all
Unmounting 3 mounts...
  /Volumes/dits-project... done
  /mnt/v1-release... done
  /mnt/color-grade... done`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Close Applications First</AlertTitle>
        <AlertDescription>
          Before unmounting, close any applications that have files open from the
          mount. Use <code>--force</code> only as a last resort, as it may interrupt
          file operations.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        dits cache-stats
      </h2>
      <p>
        Show statistics about the VFS cache. Useful for understanding cache
        performance and managing disk usage.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits cache-stats [OPTIONS]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--json              Output in JSON format
--clear             Clear the cache
--top <N>           Show top N cached files
-v, --verbose       Show detailed statistics`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`$ dits cache-stats

VFS Cache Statistics:

  Cache Location: ~/.cache/dits/vfs
  Cache Limit: 10 GB
  Current Size: 4.2 GB (42%)

  Cached Chunks: 4,567
  Hit Rate: 94.2% (last hour)
  Miss Rate: 5.8%

  Bytes Read: 12.5 GB
  Bytes from Cache: 11.8 GB (94.4%)
  Bytes from Remote: 700 MB (5.6%)

Recent Activity:
  Chunks fetched: 234 (last hour)
  Chunks evicted: 45 (LRU)
  Prefetch hits: 189 (80.8%)

# Show top cached files
$ dits cache-stats --top 10

Top Cached Files:
  File                              Chunks    Size
  ─────────────────────────────────────────────────
  footage/scene01.mov               456       456 MB
  footage/scene02.mov               389       389 MB
  project.prproj                    12        48 MB
  ...

# Clear the cache
$ dits cache-stats --clear
Clear VFS cache (4.2 GB)? [y/N] y
Cache cleared.

# Verbose stats
$ dits cache-stats -v

Cache Configuration:
  Path: ~/.cache/dits/vfs
  Max Size: 10 GB
  Eviction Policy: LRU
  Prefetch: enabled (5 chunks ahead)
  ...`}
      />

      <h2>VFS Use Cases</h2>

      <h3>Instant Access to Large Repositories</h3>
      <CodeBlock
        language="bash"
        code={`# Clone metadata only (fast!)
$ dits clone --filter blob:none https://dits.example.com/huge-project
Cloning into 'huge-project'...
Metadata fetched: 15 MB
Repository ready (125 TB of files available on demand)

# Mount and start working immediately
$ cd huge-project && dits mount /mnt/huge
Files available at /mnt/huge

# Open files - they stream on demand
$ vlc /mnt/huge/footage/scene01.mov
# Video plays immediately, chunks stream as needed`}
      />

      <h3>Multi-Version Access</h3>
      <CodeBlock
        language="bash"
        code={`# Mount multiple versions simultaneously
$ dits mount --commit v1.0 /mnt/v1 &
$ dits mount --commit v2.0 /mnt/v2 &
$ dits mount --branch main /mnt/current &

# Compare files across versions
$ diff /mnt/v1/config.json /mnt/v2/config.json

# Reference old footage while working on new cut
$ ls /mnt/v1/footage/
$ ls /mnt/current/footage/`}
      />

      <h3>Remote Editing Workflow</h3>
      <CodeBlock
        language="bash"
        code={`# On a remote machine with limited storage
$ dits mount --cache-size 5GB /mnt/project

# Edit uses local cache intelligently
# - Recently accessed chunks stay in cache
# - Rarely used chunks evicted automatically
# - Prefetching loads chunks before you need them

# Check cache efficiency
$ dits cache-stats
Hit Rate: 96.5%  # Most reads from local cache`}
      />

      <h2>Platform Support</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>Support</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>macOS</TableCell>
            <TableCell>Full (macFUSE)</TableCell>
            <TableCell>Requires macFUSE installation</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Linux</TableCell>
            <TableCell>Full (FUSE)</TableCell>
            <TableCell>Built-in kernel support</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Windows</TableCell>
            <TableCell>Full (WinFsp)</TableCell>
            <TableCell>Requires WinFsp installation</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/repository">Repository Commands</Link> - Clone and manage repos
        </li>
        <li>
          <Link href="/docs/cli/proxies">Proxy Commands</Link> - Generate lightweight proxies
        </li>
        <li>
          <Link href="/docs/cli/maintenance">Maintenance Commands</Link> - Cache management
        </li>
      </ul>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/advanced/vfs">Virtual Filesystem Guide</Link> - Deep dive into VFS
        </li>
        <li>
          <Link href="/docs/concepts/chunking">Chunking & Deduplication</Link> - How streaming works
        </li>
      </ul>
    </div>
  );
}
