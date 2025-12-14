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
import { Badge } from "@/components/ui/badge";
import { Info, Video, Clapperboard, Scissors, Combine, RotateCcw, Play } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Video & Media Commands",
  description: "Commands for video-specific operations, inspection, and timeline management in Dits",
};

const commands = [
  { command: "inspect", description: "Inspect MP4/MOV container structure", usage: "dits inspect <FILE>" },
  { command: "inspect-file", description: "Inspect file deduplication statistics", usage: "dits inspect-file <PATH>" },
  { command: "segment", description: "Segment video into chunks", usage: "dits segment <FILE>" },
  { command: "assemble", description: "Reassemble segmented video", usage: "dits assemble <MANIFEST>" },
  { command: "roundtrip", description: "Test MP4 deconstruct/reconstruct", usage: "dits roundtrip <FILE>" },
  { command: "video-init", description: "Initialize video timeline project", usage: "dits video-init <NAME>" },
  { command: "video-add-clip", description: "Add clip to video timeline", usage: "dits video-add-clip <PROJECT> <FILE>" },
  { command: "video-show", description: "Show a video timeline", usage: "dits video-show <PROJECT>" },
  { command: "video-list", description: "List all video projects", usage: "dits video-list" },
];

export default function VideoCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <Video className="h-8 w-8 text-pink-500" />
        <h1 className="mb-0">Video & Media Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Dits provides specialized commands for working with video files, including
        container inspection, format-aware chunking, timeline management, and
        deduplication analysis.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Video-Aware Processing</AlertTitle>
        <AlertDescription>
          Unlike traditional version control, Dits understands video container formats
          (MP4, MOV, MXF) and processes them at semantically meaningful boundaries
          like keyframes and atoms, enabling efficient deduplication and streaming.
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
        <Clapperboard className="h-5 w-5" />
        dits inspect
      </h2>
      <p>
        Inspect the internal structure of MP4/MOV video files. Shows the container
        atom hierarchy, codec information, keyframe positions, and metadata.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits inspect [OPTIONS] &lt;FILE&gt;`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--json              Output in JSON format for scripting
--atoms             Show detailed atom hierarchy
--keyframes         List all keyframe positions
--tracks            Show track information only
-v, --verbose       Include technical details`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Inspect an MP4 file
$ dits inspect footage/scene01.mov

Container: MP4 (QuickTime)
Duration: 00:05:32.15 (332.15s)
Size: 2.3 GB

Tracks:
  [1] Video: H.264 (avc1)
      Resolution: 3840x2160
      Frame Rate: 23.976 fps
      Bitrate: 50 Mbps
      Keyframes: 166 (every 2s)

  [2] Audio: AAC (mp4a)
      Channels: 2 (stereo)
      Sample Rate: 48000 Hz
      Bitrate: 256 kbps

Container Structure:
  ftyp: 32 bytes (File Type)
  moov: 245 KB (Metadata)
    ├── mvhd: 108 bytes
    ├── trak: 122 KB (Video)
    │   └── mdia → minf → stbl
    └── trak: 15 KB (Audio)
  mdat: 2.3 GB (Media Data)

# Get keyframe positions
$ dits inspect --keyframes footage/scene01.mov

Keyframes (166 total):
  Frame 0     @ 0:00:00.000 (offset: 245892)
  Frame 48    @ 0:00:02.002 (offset: 12845632)
  Frame 96    @ 0:00:04.004 (offset: 25678432)
  ...

# JSON output for scripting
$ dits inspect --json footage/scene01.mov > info.json`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Why Keyframes Matter</AlertTitle>
        <AlertDescription>
          Dits aligns chunk boundaries to keyframes when possible. This ensures each
          chunk can be decoded independently, enabling efficient random access and
          partial file reconstruction without decoding the entire video.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <Scissors className="h-5 w-5" />
        dits segment
      </h2>
      <p>
        Segment a video file into content-defined chunks optimized for deduplication.
        Uses the FastCDC algorithm with keyframe alignment for video-aware chunking.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits segment [OPTIONS] &lt;FILE&gt;`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--output <DIR>      Output directory for chunks (default: .dits/chunks)
--min-chunk <SIZE>  Minimum chunk size (default: 256KB)
--avg-chunk <SIZE>  Target average chunk size (default: 1MB)
--max-chunk <SIZE>  Maximum chunk size (default: 4MB)
--keyframe-align    Align to keyframes (default: true for video)
--dry-run           Show what would be done without writing
--progress          Show progress bar
-v, --verbose       Show detailed output`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Segment a video file
$ dits segment footage/scene01.mov

Segmenting: footage/scene01.mov (2.3 GB)

  Parsing container... done
  Locating keyframes... 166 found
  Computing chunk boundaries... done
  Writing chunks... done

Results:
  Total chunks: 2,345
  Chunk sizes: 256 KB - 4 MB (avg 1.02 MB)
  Keyframe-aligned: 156 (93.9%)
  Manifest: .dits/manifests/scene01.mov.manifest

# Dry run to preview chunking
$ dits segment --dry-run footage/scene01.mov

Would create 2,345 chunks:
  [0] 0-1048576 (1.0 MB) - keyframe aligned
  [1] 1048576-2097152 (1.0 MB) - keyframe aligned
  [2] 2097152-3407872 (1.25 MB) - keyframe aligned
  ...

# Custom chunk sizes for very large files
$ dits segment --min-chunk 1MB --avg-chunk 4MB --max-chunk 16MB large-file.mov`}
      />

      <h2 className="flex items-center gap-2">
        <Combine className="h-5 w-5" />
        dits assemble
      </h2>
      <p>
        Reassemble a video file from its chunks using a manifest. Verifies chunk
        integrity and reconstructs the exact original file.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits assemble [OPTIONS] &lt;MANIFEST&gt;`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--output <FILE>     Output file path (default: original name)
--verify            Verify final hash matches original
--parallel <N>      Number of parallel chunk fetches
--progress          Show progress bar
-f, --force         Overwrite existing file`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Reassemble from manifest
$ dits assemble .dits/manifests/scene01.mov.manifest

Assembling: scene01.mov

  Loading manifest... done
  Fetching chunks... 100% (2,345/2,345)
  Concatenating... done
  Verifying... match!

Output: scene01.mov (2.3 GB)

# Custom output location
$ dits assemble --output /exports/scene01.mov .dits/manifests/scene01.mov.manifest

# Parallel fetching for remote chunks
$ dits assemble --parallel 8 --progress manifest.json`}
      />

      <h2 className="flex items-center gap-2">
        <RotateCcw className="h-5 w-5" />
        dits roundtrip
      </h2>
      <p>
        Test the complete segment-and-reassemble cycle. Verifies that a video file
        can be chunked and reconstructed to produce a bit-identical copy.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits roundtrip [OPTIONS] &lt;FILE&gt;`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--keep              Keep intermediate files
--output <DIR>      Output directory for test files
-v, --verbose       Show detailed progress`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Test roundtrip integrity
$ dits roundtrip footage/scene01.mov

Roundtrip test: footage/scene01.mov

  Step 1: Segment into chunks... done (2,345 chunks)
  Step 2: Reassemble from chunks... done
  Step 3: Compare hashes...

Original:     d4f8a2b1c3e5f6789012345678901234
Reconstructed: d4f8a2b1c3e5f6789012345678901234

Result: PASS (bit-identical)

# Keep intermediate files for inspection
$ dits roundtrip --keep --output ./test footage/scene01.mov

Files preserved in ./test/:
  - manifest.json
  - chunks/ (2,345 files)
  - reconstructed.mov`}
      />

      <h2 className="flex items-center gap-2">
        <Play className="h-5 w-5" />
        dits inspect-file
      </h2>
      <p>
        Inspect a tracked file&apos;s deduplication statistics. Shows how many chunks
        are unique vs shared with other files in the repository.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits inspect-file [OPTIONS] &lt;PATH&gt;`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--chunks            List all chunk hashes
--shared            Show which files share chunks
--json              Output in JSON format`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Inspect deduplication stats
$ dits inspect-file footage/scene01.mov

Inspecting: footage/scene01.mov

File Information:
  Path:         footage/scene01.mov
  Commit:       abc1234def5
  Manifest:     9e21c38bbf5
  Content hash: 8d92f0e4a1b
  Type:         MP4 (structure-aware)

Size:
  Logical size:          10.00 GiB (10737418240 bytes)
  Estimated unique size: 208.00 MiB (218103808 bytes)

Chunk Breakdown:
  Total chunks:  10,240
  Shared chunks: 10,032 (98.0%)
  Unique chunks: 208 (2.0%)

Deduplication Analysis:
  This file shares 10,032 chunks with other files in the repo.
  Estimated storage savings: 9.79 GiB (98.0% of file)

# See which files share chunks
$ dits inspect-file --shared footage/scene01_v2.mov

Shared with:
  footage/scene01.mov     - 9,856 chunks (96.2%)
  footage/scene01_v3.mov  - 10,012 chunks (97.8%)
  archived/scene01.mov    - 8,432 chunks (82.3%)`}
      />

      <h2>Video Timeline Commands</h2>
      <p>
        Dits includes a simple video timeline feature for organizing clips and
        tracking edit decisions. This is useful for lightweight project management
        without requiring a full NLE.
      </p>

      <h3>dits video-init</h3>
      <p>Initialize a new video timeline project.</p>
      <CodeBlock
        language="bash"
        code={`# Create a new timeline project
$ dits video-init "Episode 1 Assembly"

Created video project: Episode 1 Assembly
Project ID: vid-a1b2c3d4
Timeline: empty

Use 'dits video-add-clip' to add clips to the timeline.`}
      />

      <h3>dits video-add-clip</h3>
      <p>Add a clip to a video timeline.</p>
      <CodeBlock
        language="bash"
        code={`# Add clips to timeline
$ dits video-add-clip "Episode 1 Assembly" footage/scene01.mov

Added to timeline: footage/scene01.mov
  Duration: 00:05:32
  Position: 00:00:00 - 00:05:32
  Track: 1

$ dits video-add-clip "Episode 1 Assembly" footage/scene02.mov

Added to timeline: footage/scene02.mov
  Duration: 00:03:45
  Position: 00:05:32 - 00:09:17
  Track: 1

# Add with specific in/out points
$ dits video-add-clip --in 00:00:10 --out 00:01:30 "Episode 1 Assembly" footage/b-roll.mov`}
      />

      <h3>dits video-show</h3>
      <p>Display a video timeline&apos;s structure.</p>
      <CodeBlock
        language="bash"
        code={`$ dits video-show "Episode 1 Assembly"

Project: Episode 1 Assembly
ID: vid-a1b2c3d4
Created: 2025-01-15 14:30:00
Modified: 2025-01-15 16:45:00

Timeline (3 clips, 00:10:37 total):

  Track 1:
  ├─ 00:00:00 - 00:05:32  footage/scene01.mov
  ├─ 00:05:32 - 00:09:17  footage/scene02.mov
  └─ 00:09:17 - 00:10:37  footage/b-roll.mov (00:00:10-00:01:30)

Source Files:
  footage/scene01.mov (10.2 GB) - commit abc1234
  footage/scene02.mov (8.5 GB)  - commit abc1234
  footage/b-roll.mov (2.1 GB)   - commit def5678`}
      />

      <h3>dits video-list</h3>
      <p>List all video timeline projects.</p>
      <CodeBlock
        language="bash"
        code={`$ dits video-list

Video Projects:

  ID            Name                    Clips  Duration   Modified
  ─────────────────────────────────────────────────────────────────
  vid-a1b2c3d4  Episode 1 Assembly      3      00:10:37   2025-01-15
  vid-e5f6g7h8  Episode 2 Rough Cut     12     00:42:15   2025-01-14
  vid-i9j0k1l2  B-Roll Selects          8      00:15:30   2025-01-13

3 projects total`}
      />

      <h2>Understanding Video Processing</h2>

      <h3>ISOBMFF Container Format</h3>
      <p>
        Dits parses MP4/MOV files using the ISO Base Media File Format (ISOBMFF)
        specification. Key atoms include:
      </p>
      <CodeBlock
        language="bash"
        code={`Container Structure:

ftyp    File type declaration (identifies MP4/MOV variant)
moov    Metadata container (CRITICAL - never chunked through)
├── mvhd    Movie header (duration, timescale)
├── trak    Track container
│   ├── tkhd    Track header
│   └── mdia    Media container
│       └── minf → stbl
│           ├── stss    Sync samples (keyframe index)
│           ├── stts    Time-to-sample table
│           └── stsc    Sample-to-chunk mapping
mdat    Media data (actual video/audio frames - chunked here)`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Protected Atoms</AlertTitle>
        <AlertDescription>
          The <code>moov</code> atom contains critical metadata for file playback.
          Dits never chunks through it - the entire moov is kept as a single chunk
          to ensure files remain playable after reconstruction.
        </AlertDescription>
      </Alert>

      <h3>Chunking Strategy</h3>
      <CodeBlock
        language="bash"
        code={`Dits chunking for video:

1. Parse container structure
2. Identify keyframe positions from stss atom
3. Apply FastCDC with keyframe alignment:
   - MIN_CHUNK = 256 KB (prevents tiny chunks)
   - AVG_CHUNK = 1 MB (target for most chunks)
   - MAX_CHUNK = 4 MB (upper limit)
4. Prefer chunk boundaries at keyframes when within tolerance
5. Generate manifest with chunk order and metadata

Result: Efficient deduplication + independent chunk decoding`}
      />

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/proxies">Proxy Commands</Link> - Generate lightweight proxy files
        </li>
        <li>
          <Link href="/docs/cli/metadata">Metadata Commands</Link> - Extract and query file metadata
        </li>
        <li>
          <Link href="/docs/cli/maintenance">Maintenance Commands</Link> - Repository statistics
        </li>
      </ul>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/concepts/chunking">Chunking & Deduplication</Link> - How content-defined chunking works
        </li>
        <li>
          <Link href="/docs/architecture/algorithms">Algorithms</Link> - FastCDC and BLAKE3 details
        </li>
        <li>
          <Link href="/docs/advanced/video">Video Features</Link> - Deep dive into video handling
        </li>
      </ul>
    </div>
  );
}
