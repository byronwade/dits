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
import { FileSearch, Info, ScanSearch, Eye, List } from "lucide-react";

export const metadata: Metadata = {
  title: "Metadata Commands",
  description: "Commands for extracting and querying file metadata in Dits",
};

const commands = [
  { command: "meta-scan", description: "Scan files and extract metadata", usage: "dits meta-scan [OPTIONS] [PATH]" },
  { command: "meta-show", description: "Show metadata for a file", usage: "dits meta-show <PATH>" },
  { command: "meta-list", description: "List all stored metadata", usage: "dits meta-list [OPTIONS]" },
];

export default function MetadataCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <FileSearch className="h-8 w-8 text-teal-500" />
        <h1 className="mb-0">Metadata Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Extract, store, and query metadata from video and media files. Dits
        automatically indexes technical metadata like resolution, codec, duration,
        and timecode for efficient searching and organization.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Automatic Metadata Extraction</AlertTitle>
        <AlertDescription>
          When you add files, Dits automatically extracts key metadata. These
          commands let you scan existing files, view extracted metadata, and
          search across your media library.
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
        <ScanSearch className="h-5 w-5" />
        dits meta-scan
      </h2>
      <p>
        Scan files and extract metadata. Useful for indexing existing files or
        rescanning after metadata extraction improvements.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits meta-scan [OPTIONS] [PATH]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--force             Rescan files with existing metadata
--deep              Extract extended metadata (slower)
--parallel <N>      Number of parallel scan jobs
--progress          Show progress bar
--json              Output results as JSON
-v, --verbose       Show detailed output`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Scan entire repository
$ dits meta-scan

Scanning for media files...

  Found: 156 media files
  Already indexed: 142
  Needs scanning: 14

Scanning: 100% ████████████████████ 14/14

Results:
  Videos: 12 (8 new)
  Audio: 2 (2 new)
  Images: 0
  Project files: 0

# Scan specific directory
$ dits meta-scan footage/

Scanning footage/...
  Scanned: 45 files
  New metadata: 45 entries

# Deep scan for extended metadata
$ dits meta-scan --deep footage/

Extracting extended metadata...
  - Color space profiles
  - Audio channel layout
  - HDR metadata (if present)
  - Camera metadata (EXIF)
  ...

# Force rescan all files
$ dits meta-scan --force

Rescanning all 156 files...
  Updated: 156 metadata entries`}</code>
      </pre>

      <h3>Extracted Metadata</h3>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>File Type</TableHead>
            <TableHead>Standard Metadata</TableHead>
            <TableHead>Deep Scan Adds</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Video</TableCell>
            <TableCell>Resolution, codec, duration, framerate, bitrate</TableCell>
            <TableCell>Color space, HDR, audio layout, timecode</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Audio</TableCell>
            <TableCell>Channels, sample rate, duration, codec</TableCell>
            <TableCell>Bit depth, loudness (LUFS), peak levels</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Image</TableCell>
            <TableCell>Dimensions, format, color mode</TableCell>
            <TableCell>EXIF, ICC profile, GPS (if present)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Project</TableCell>
            <TableCell>Application, version, duration</TableCell>
            <TableCell>Linked assets, sequence settings</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2 className="flex items-center gap-2">
        <Eye className="h-5 w-5" />
        dits meta-show
      </h2>
      <p>
        Show detailed metadata for a specific file. Displays all extracted
        technical information.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits meta-show [OPTIONS] &lt;PATH&gt;</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--json              Output as JSON
--raw               Show raw metadata (all fields)
--section <NAME>    Show only specific section`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Show metadata for video file
$ dits meta-show footage/scene01.mov

Metadata: footage/scene01.mov

File Information:
  Path:         footage/scene01.mov
  Size:         2.3 GB
  Content hash: abc123def456...
  Scanned:      2025-01-15 14:30:00

Container:
  Format:       QuickTime / MOV
  Duration:     00:05:32.15 (332.15s)
  Bitrate:      55.4 Mbps

Video Track:
  Codec:        H.264 (avc1)
  Resolution:   3840 x 2160 (16:9)
  Frame Rate:   23.976 fps
  Bit Depth:    8-bit
  Color Space:  Rec. 709
  Scan Type:    Progressive
  Bitrate:      50 Mbps
  Keyframes:    166 (every 2s)

Audio Track:
  Codec:        AAC (mp4a)
  Channels:     2 (stereo)
  Sample Rate:  48000 Hz
  Bitrate:      256 kbps

Timecode:
  Start:        01:00:00:00
  Drop Frame:   No

# Show only video section
$ dits meta-show --section video footage/scene01.mov

Video Track:
  Codec:        H.264 (avc1)
  Resolution:   3840 x 2160 (16:9)
  ...

# JSON output for scripting
$ dits meta-show --json footage/scene01.mov | jq '.video.resolution'
"3840x2160"

# Show all raw metadata
$ dits meta-show --raw footage/scene01.mov

Raw Metadata (45 fields):
  com.apple.quicktime.creationdate: 2025-01-15T10:30:00-08:00
  com.apple.quicktime.camera.identifier: C0001
  ...`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <List className="h-5 w-5" />
        dits meta-list
      </h2>
      <p>
        List all stored metadata. Filter and search across your entire media library
        based on technical properties.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits meta-list [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--filter <EXPR>     Filter by metadata expression
--type <TYPE>       Filter by file type (video, audio, image)
--codec <CODEC>     Filter by codec
--resolution <RES>  Filter by resolution
--duration <RANGE>  Filter by duration range
--sort <FIELD>      Sort by field
--format <FMT>      Output format (table, json, csv)
--limit <N>         Limit results`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# List all indexed files
$ dits meta-list

Indexed Files (156):

  Path                              Type    Resolution  Duration   Codec
  ────────────────────────────────────────────────────────────────────────
  footage/scene01.mov               video   3840x2160   00:05:32   H.264
  footage/scene02.mov               video   3840x2160   00:03:45   H.264
  footage/interview-a.mov           video   1920x1080   00:12:30   ProRes
  audio/music.wav                   audio   -           00:03:00   PCM
  ...

# Filter by resolution
$ dits meta-list --resolution 4K

4K Files (45):
  footage/scene01.mov               3840x2160   00:05:32
  footage/scene02.mov               3840x2160   00:03:45
  ...

# Filter by codec
$ dits meta-list --codec prores

ProRes Files (12):
  footage/interview-a.mov           1920x1080   00:12:30
  footage/interview-b.mov           1920x1080   00:15:45
  ...

# Filter by duration range
$ dits meta-list --duration ">5m"

Files longer than 5 minutes (23):
  footage/interview-a.mov           00:12:30
  footage/interview-b.mov           00:15:45
  ...

# Complex filter expression
$ dits meta-list --filter "resolution=4K AND codec=H.264 AND duration>1m"

Matching Files (32):
  ...

# Sort by duration
$ dits meta-list --sort duration --limit 10

Longest Files:
  footage/full-interview.mov        01:23:45
  footage/b-roll-collection.mov     00:45:30
  ...

# Export to CSV
$ dits meta-list --format csv > media-inventory.csv`}</code>
      </pre>

      <h2>Filter Expressions</h2>
      <pre className="not-prose">
        <code>{`# Filter syntax:
field=value           Exact match
field!=value          Not equal
field>value           Greater than
field<value           Less than
field>=value          Greater or equal
field<=value          Less or equal
field~pattern         Regex match

# Combine with:
AND                   Both conditions
OR                    Either condition
NOT                   Negate condition
()                    Grouping

# Examples:
resolution=4K
resolution=3840x2160
codec=H.264
codec~prores.*
duration>5m
duration>=00:30:00
framerate=23.976
bitrate>50Mbps
(codec=H.264 OR codec=H.265) AND resolution=4K`}</code>
      </pre>

      <h2>Use Cases</h2>

      <h3>Media Inventory</h3>
      <pre className="not-prose">
        <code>{`# Generate a complete media inventory
$ dits meta-list --format csv > inventory.csv

# Summarize by codec
$ dits meta-list --format json | jq 'group_by(.codec) | map({codec: .[0].codec, count: length})'

# Find all HDR content
$ dits meta-list --filter "hdr=true"`}</code>
      </pre>

      <h3>Quality Control</h3>
      <pre className="not-prose">
        <code>{`# Find files that don't meet delivery specs
$ dits meta-list --filter "resolution<1920x1080"

Warning: 3 files below 1080p:
  footage/webcam.mov    1280x720
  ...

# Check for consistent frame rates
$ dits meta-list --format json | jq 'group_by(.framerate)'`}</code>
      </pre>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/video">Video Commands</Link> - Inspect video structure
        </li>
        <li>
          <Link href="/docs/cli/dependencies">Dependency Commands</Link> - Track project dependencies
        </li>
        <li>
          <Link href="/docs/cli/maintenance">Maintenance Commands</Link> - Repository statistics
        </li>
      </ul>
    </div>
  );
}
