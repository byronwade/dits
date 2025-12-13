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
import { Layers, Info, Zap, Eye, List, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Proxy Commands",
  description: "Commands for generating and managing lightweight proxy files in Dits",
};

const commands = [
  { command: "proxy-generate", description: "Generate proxy files for videos", usage: "dits proxy-generate [OPTIONS] <PATH>" },
  { command: "proxy-status", description: "Show proxy generation status", usage: "dits proxy-status [PATH]" },
  { command: "proxy-list", description: "List all generated proxies", usage: "dits proxy-list [OPTIONS]" },
  { command: "proxy-delete", description: "Delete generated proxies", usage: "dits proxy-delete [OPTIONS] <PATH>" },
];

export default function ProxyCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="h-8 w-8 text-orange-500" />
        <h1 className="mb-0">Proxy Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Generate lightweight proxy files for video editing workflows. Proxies enable
        smooth editing on lower-powered machines while the original high-resolution
        files remain in the repository.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Offline Editing Workflow</AlertTitle>
        <AlertDescription>
          Proxies are low-resolution versions of your video files. Edit using proxies
          for smooth playback, then automatically relink to full-resolution files for
          final delivery. This is standard practice in professional video production.
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
        <Zap className="h-5 w-5" />
        dits proxy-generate
      </h2>
      <p>
        Generate proxy files for video files. Proxies are transcoded to a lower
        resolution and bitrate for efficient editing and playback.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits proxy-generate [OPTIONS] &lt;PATH&gt;...</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--resolution <RES>    Target resolution (default: 1080p)
                      Options: 720p, 1080p, 1440p, 2160p, half, quarter
--codec <CODEC>       Output codec (default: h264)
                      Options: h264, h265, prores-proxy, prores-lt
--quality <Q>         Quality preset (default: medium)
                      Options: low, medium, high
--output <DIR>        Output directory (default: .dits/proxies)
--parallel <N>        Number of parallel encode jobs
--overwrite           Overwrite existing proxies
--progress            Show encoding progress
-n, --dry-run         Show what would be generated`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Generate 1080p proxies for all videos in footage/
$ dits proxy-generate footage/

Generating proxies for 12 files...

  [1/12] footage/scene01.mov
         3840x2160 → 1920x1080 (h264)
         Encoding: 100% ████████████████████ done (2m 15s)
         Size: 2.3 GB → 245 MB (89% smaller)

  [2/12] footage/scene02.mov
         ...

Completed: 12 files
Total time: 18m 32s
Space used: 1.8 GB

# Generate 720p proxies for faster editing
$ dits proxy-generate --resolution 720p --quality low footage/

# Generate ProRes Proxy for color-accurate editing
$ dits proxy-generate --codec prores-proxy footage/

# Parallel encoding for faster processing
$ dits proxy-generate --parallel 4 footage/

# Generate for specific file
$ dits proxy-generate footage/hero-shot.mov

# Dry run to see what would be created
$ dits proxy-generate -n footage/

Would generate proxies:
  footage/scene01.mov → .dits/proxies/scene01.mov (est. 245 MB)
  footage/scene02.mov → .dits/proxies/scene02.mov (est. 189 MB)
  ...`}</code>
      </pre>

      <h3>Resolution Options</h3>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Option</TableHead>
            <TableHead>Resolution</TableHead>
            <TableHead>Best For</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">720p</TableCell>
            <TableCell>1280x720</TableCell>
            <TableCell>Laptops, rough cuts, remote editing</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">1080p</TableCell>
            <TableCell>1920x1080</TableCell>
            <TableCell>Standard editing workstations (default)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">1440p</TableCell>
            <TableCell>2560x1440</TableCell>
            <TableCell>High-end editing, color grading preview</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">half</TableCell>
            <TableCell>50% of original</TableCell>
            <TableCell>Proportional reduction</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">quarter</TableCell>
            <TableCell>25% of original</TableCell>
            <TableCell>Very low-power devices, mobile</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2 className="flex items-center gap-2">
        <Eye className="h-5 w-5" />
        dits proxy-status
      </h2>
      <p>
        Check the status of proxy generation. Shows which files have proxies,
        which are pending, and any errors.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits proxy-status [OPTIONS] [PATH]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--pending           Show only files without proxies
--outdated          Show proxies that need regeneration
--json              Output in JSON format`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Check overall proxy status
$ dits proxy-status

Proxy Status:

  With proxies:    45 files (12.3 GB → 1.8 GB)
  Without proxies: 3 files (5.2 GB)
  Outdated:        2 files (source modified)

  Storage savings: 85.4%

Files without proxies:
  footage/new-scene.mov (2.1 GB)
  footage/interview-b.mov (1.8 GB)
  footage/drone-shot.mov (1.3 GB)

# Check specific directory
$ dits proxy-status footage/ep01/

# Show only pending files
$ dits proxy-status --pending

Files needing proxy generation:
  footage/new-scene.mov
  footage/interview-b.mov
  footage/drone-shot.mov

Run: dits proxy-generate footage/ to create missing proxies`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <List className="h-5 w-5" />
        dits proxy-list
      </h2>
      <p>
        List all generated proxy files with their details and corresponding
        source files.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits proxy-list [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--format <FMT>      Output format (table, json, paths)
--size              Sort by proxy size
--source            Sort by source file
-v, --verbose       Show detailed information`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`$ dits proxy-list

Proxies (45 files, 1.8 GB total):

  Source File                    Resolution  Size     Created
  ──────────────────────────────────────────────────────────────
  footage/scene01.mov            1080p       245 MB   2025-01-15
  footage/scene02.mov            1080p       189 MB   2025-01-15
  footage/scene03.mov            1080p       312 MB   2025-01-15
  footage/interview-a.mov        1080p       156 MB   2025-01-14
  ...

# Verbose output with full details
$ dits proxy-list -v

Proxy: footage/scene01.mov
  Source:     footage/scene01.mov
  Source hash: abc123def456...
  Proxy path: .dits/proxies/scene01.mov
  Resolution: 1920x1080 (from 3840x2160)
  Codec:      h264
  Bitrate:    8 Mbps (from 100 Mbps)
  Size:       245 MB (from 2.3 GB)
  Created:    2025-01-15 14:30:00
  ...`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <Trash2 className="h-5 w-5" />
        dits proxy-delete
      </h2>
      <p>
        Delete proxy files to free up space. Proxies can be regenerated at any time.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits proxy-delete [OPTIONS] &lt;PATH&gt;...</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--all               Delete all proxies
--outdated          Delete only outdated proxies
--older-than <AGE>  Delete proxies older than specified age
-n, --dry-run       Show what would be deleted
-f, --force         Don't prompt for confirmation`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Delete proxy for specific file
$ dits proxy-delete footage/scene01.mov

Delete proxy for footage/scene01.mov (245 MB)? [y/N] y
Deleted.

# Delete all proxies
$ dits proxy-delete --all

This will delete 45 proxies (1.8 GB).
Continue? [y/N] y

Deleting proxies... done
Freed 1.8 GB

# Delete outdated proxies only
$ dits proxy-delete --outdated

Deleting 2 outdated proxies (312 MB)... done

# Delete proxies older than 30 days
$ dits proxy-delete --older-than 30d

# Dry run
$ dits proxy-delete -n --all

Would delete:
  .dits/proxies/scene01.mov (245 MB)
  .dits/proxies/scene02.mov (189 MB)
  ...

Total: 1.8 GB would be freed`}</code>
      </pre>

      <h2>Proxy Workflow</h2>
      <pre className="not-prose">
        <code>{`# Typical proxy editing workflow:

1. Clone repository (metadata only for speed)
   $ dits clone --filter blob:none project-url

2. Generate proxies for files you'll edit
   $ dits proxy-generate --resolution 1080p footage/

3. Edit using proxy files in your NLE
   # Open .dits/proxies/scene01.mov instead of footage/scene01.mov

4. When ready for final export, relink to originals
   $ dits checkout --no-proxy  # Ensure originals are available
   # Relink in NLE to footage/scene01.mov

5. Export at full quality from original files`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>NLE Integration</AlertTitle>
        <AlertDescription>
          Many NLEs (Premiere Pro, DaVinci Resolve, Final Cut Pro) have built-in
          proxy workflows. Dits proxies are compatible with these systems - just
          point your NLE to the <code>.dits/proxies/</code> directory as the proxy
          location.
        </AlertDescription>
      </Alert>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/video">Video Commands</Link> - Inspect and process video files
        </li>
        <li>
          <Link href="/docs/cli/vfs">VFS Commands</Link> - Mount repositories as virtual drives
        </li>
        <li>
          <Link href="/docs/cli/maintenance">Maintenance Commands</Link> - Manage storage
        </li>
      </ul>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/advanced/proxies">Proxy Files Guide</Link> - Deep dive into proxy workflows
        </li>
        <li>
          <Link href="/docs/advanced/video">Video Features</Link> - Video handling in Dits
        </li>
      </ul>
    </div>
  );
}
