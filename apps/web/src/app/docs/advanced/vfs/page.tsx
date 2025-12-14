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
import { Info, HardDrive, Zap, Cloud } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Virtual Filesystem",
  description: "Mount Dits repositories as drives without downloading all files",
};

export default function VFSPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Virtual Filesystem (VFS)</h1>
      <p className="lead text-xl text-muted-foreground">
        Mount Dits repositories as virtual drives, accessing files on-demand
        without downloading the entire repository.
      </p>

      <h2>Overview</h2>
      <p>
        The Virtual Filesystem feature lets you browse and work with repositories
        as if they were local drives, while only downloading the data you actually
        access. This is transformative for large video projects:
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Cloud className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>On-Demand Access</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Only download chunks when files are actually read. Browse a 500GB
              repository using just megabytes of storage.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Instant Mount</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Mount any branch or commit instantly. No waiting for downloads -
              files appear immediately and load as needed.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <HardDrive className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Smart Caching</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Frequently accessed data is cached locally. Subsequent accesses
              are as fast as local disk.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <h2>Requirements</h2>
      <p>
        VFS requires a FUSE implementation on your system:
      </p>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>FUSE Implementation</TableHead>
            <TableHead>Install Command</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>macOS</TableCell>
            <TableCell>macFUSE</TableCell>
            <TableCell className="font-mono text-sm">brew install macfuse</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Linux</TableCell>
            <TableCell>FUSE3</TableCell>
            <TableCell className="font-mono text-sm">apt install fuse3</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Windows</TableCell>
            <TableCell>Dokany</TableCell>
            <TableCell className="font-mono text-sm">Download from GitHub</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>macOS System Extension</AlertTitle>
        <AlertDescription>
          macFUSE requires enabling a system extension. After installing, go to
          System Preferences → Security & Privacy → General and allow the
          extension, then restart.
        </AlertDescription>
      </Alert>

      <h2>Basic Usage</h2>

      <h3>Mount a Repository</h3>
      <CodeBlock
        language="bash"
        code={`# Mount to default location (/Volumes/dits-<repo> on macOS)
$ dits mount

Mounting repository at /Volumes/dits-my-project
Repository mounted. Press Ctrl+C to unmount.

# Mount to specific path
$ dits mount /path/to/mountpoint

# Mount in background
$ dits mount --background

# Mount specific branch
$ dits mount --ref feature/audio

# Mount specific commit
$ dits mount --ref a1b2c3d`}
      />

      <h3>Use the Mounted Repository</h3>
      <CodeBlock
        language="bash"
        code={`# Browse files
$ ls /Volumes/dits-my-project/footage/
scene1.mov  scene2.mov  scene3.mov

# Open in Finder/Explorer
$ open /Volumes/dits-my-project/

# Open in NLE
# Just navigate to the mounted path in your video editor

# Copy files (triggers download)
$ cp /Volumes/dits-my-project/footage/scene1.mov ./local/`}
      />

      <h3>Unmount</h3>
      <CodeBlock
        language="bash"
        code={`# If running in foreground, press Ctrl+C

# If running in background
$ dits unmount
Unmounted /Volumes/dits-my-project

# Force unmount
$ dits unmount --force

# On macOS, also works with:
$ umount /Volumes/dits-my-project`}
      />

      <h2>Configuration</h2>

      <h3>Mount Options</h3>
      <CodeBlock
        language="json"
        code={`[mount]
    # Default mount point pattern
    defaultPath = /Volumes/dits-<repo>

    # Cache size for mounted files
    cacheSize = 10GB

    # Read-ahead buffer size
    readAhead = 16MB

    # Connection pool size
    connectionPool = 8

    # Timeout for remote requests (seconds)
    timeout = 30`}
      />

      <h3>Command-Line Options</h3>
      <CodeBlock
        language="bash"
        code={`$ dits mount --help

Usage: dits mount [OPTIONS] [PATH]

Arguments:
  [PATH]  Mount point path

Options:
      --ref <REF>           Branch or commit to mount
      --read-only           Mount as read-only
      --background          Run in background
      --cache-size <SIZE>   Cache size (e.g., "10GB")
      --read-ahead <SIZE>   Read-ahead buffer
      --no-cache            Disable local caching
  -v, --verbose             Verbose output`}
      />

      <h2>Access Patterns</h2>

      <h3>On-Demand Hydration</h3>
      <p>
        When you access a file through VFS, Dits fetches only the chunks needed:
      </p>
      <CodeBlock
        language="bash"
        code={`# Opening a 10GB file in video editor
# 1. Editor reads file header → Dits fetches first few chunks
# 2. Editor seeks to timecode → Dits fetches chunks at that position
# 3. Playback → Dits streams chunks in sequence

# Result: Only fetched what was needed (maybe 500MB)
# instead of downloading entire 10GB file`}
      />

      <h3>Prefetching</h3>
      <p>
        Dits intelligently prefetches data based on access patterns:
      </p>
      <CodeBlock
        language="bash"
        code={`# Sequential read detected
# → Prefetch next chunks in background

# Video scrubbing detected
# → Prefetch keyframes around current position

# Directory listing
# → Prefetch metadata for visible files`}
      />

      <h2>Working with Video Editors</h2>

      <h3>Premiere Pro</h3>
      <CodeBlock
        language="bash"
        code={`# Mount the repository
$ dits mount --background

# In Premiere:
# 1. File → Import
# 2. Navigate to /Volumes/dits-my-project/
# 3. Import footage as normal

# Premiere will read files through VFS
# Only accessed frames are downloaded`}
      />

      <h3>DaVinci Resolve</h3>
      <CodeBlock
        language="bash"
        code={`# Mount with read-ahead optimized for Resolve
$ dits mount --read-ahead 32MB --background

# Resolve prefers larger read buffers
# This improves playback performance`}
      />

      <h3>Performance Tips</h3>
      <ul>
        <li>
          <strong>Use proxy files:</strong> Mount and work with proxy resolution,
          then switch to full-res for final render
        </li>
        <li>
          <strong>Cache commonly used footage:</strong> Pin frequently accessed
          files to local cache
        </li>
        <li>
          <strong>Render locally:</strong> Copy files needed for render to local
          disk first
        </li>
      </ul>

      <h2>Cache Management</h2>

      <h3>View Cache Status</h3>
      <CodeBlock
        language="bash"
        code={`$ dits mount-cache status

VFS Cache Status:
  Location: ~/.cache/dits/vfs
  Size: 8.2 GB / 10 GB
  Entries: 1,234 chunks

Most accessed files:
  footage/scene1.mov      2.3 GB (85% cached)
  footage/scene2.mov      1.8 GB (62% cached)
  project.prproj          45 MB  (100% cached)`}
      />

      <h3>Manage Cache</h3>
      <CodeBlock
        language="bash"
        code={`# Pre-cache specific files
$ dits mount-cache fetch footage/scene1.mov
Caching footage/scene1.mov... 100% (10.2 GB)

# Clear cache
$ dits mount-cache clear
Cleared 8.2 GB from VFS cache

# Set cache size
$ dits config mount.cacheSize 50GB`}
      />

      <h2>Read-Only vs Read-Write</h2>

      <h3>Read-Only Mount (Default)</h3>
      <p>
        Safe for browsing and importing into applications:
      </p>
      <CodeBlock
        language="bash"
        code={`$ dits mount --read-only

# Files can be read but not modified
# Best for collaborative workflows`}
      />

      <h3>Read-Write Mount</h3>
      <p>
        Allows modifications that sync back to the repository:
      </p>
      <CodeBlock
        language="bash"
        code={`$ dits mount --read-write

# Changes are staged automatically
# Use 'dits commit' to save changes

# Note: Large file writes may be slow
# Consider working locally for heavy edits`}
      />

      <h2>Troubleshooting</h2>

      <h3>Mount Fails with Permission Error</h3>
      <CodeBlock
        language="bash"
        code={`# macOS: Enable FUSE extension
System Preferences → Security & Privacy → General
Allow "osxfuse" or "macfuse"
Restart your Mac

# Linux: Add user to fuse group
$ sudo usermod -a -G fuse $USER
# Log out and back in`}
      />

      <h3>Slow Performance</h3>
      <CodeBlock
        language="bash"
        code={`# Check network connection
$ dits mount-cache ping
Remote: 45ms latency

# Increase cache size
$ dits config mount.cacheSize 50GB

# Pre-cache needed files
$ dits mount-cache fetch footage/`}
      />

      <h3>Files Not Appearing</h3>
      <CodeBlock
        language="bash"
        code={`# Ensure FUSE is properly installed
$ which fusermount  # Linux
$ kextstat | grep fuse  # macOS

# Check mount status
$ mount | grep dits

# Try with verbose output
$ dits mount -v`}
      />

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/advanced/video">Video Features</Link>
        </li>
        <li>
          <Link href="/docs/advanced/proxies">Proxy Files</Link>
        </li>
        <li>
          <Link href="/docs/concepts/chunking">Chunking & Deduplication</Link>
        </li>
      </ul>
    </div>
  );
}
