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
import { Info, Film, Layers, Clock, Check, AlertTriangle, Beaker } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Video Features",
  description: "Dits features optimized for video files and production workflows",
};

export default function VideoFeaturesPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Video Features</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits is built from the ground up to handle video files efficiently, with
        comprehensive support for 15+ video formats, format-aware chunking, keyframe alignment,
        and video-specific metadata. All video features are thoroughly tested with automated tests.
      </p>

      <h2>Why Video Needs Special Handling</h2>
      <p>
        Video files present unique challenges for version control:
      </p>
      <ul>
        <li><strong>Size:</strong> Single files can be gigabytes or terabytes</li>
        <li><strong>Binary format:</strong> Can&apos;t be diffed like text files</li>
        <li><strong>Temporal structure:</strong> Changes are often localized in time</li>
        <li><strong>Container format:</strong> Metadata and media are interleaved</li>
      </ul>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Film className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Keyframe Alignment</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Chunk boundaries align to video keyframes (I-frames), making each
              chunk independently decodable.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Container Awareness</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Dits understands MP4/MOV/MXF structure and never splits critical
              metadata atoms across chunks.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Temporal Diff</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              See differences in terms of timecode and frames, not just bytes
              and chunks.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <h2>Supported Video Formats</h2>
      <Alert className="not-prose my-4 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <Info className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-100">Comprehensive Testing</AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-200">
          All listed formats are thoroughly tested with automated test suites covering chunking,
          keyframe alignment, roundtrip integrity, and Git operations on video files.
        </AlertDescription>
      </Alert>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Format</TableHead>
            <TableHead>Container</TableHead>
            <TableHead>Keyframe Aligned</TableHead>
            <TableHead>Testing Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>H.264/AVC</TableCell>
            <TableCell>MP4, MOV, MKV, AVI</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Full</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Tested</TableCell>
            <TableCell>All profiles, levels, GOP patterns</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>H.265/HEVC</TableCell>
            <TableCell>MP4, MOV, MKV</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Full</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Tested</TableCell>
            <TableCell>HDR10, HLG, Dolby Vision support</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>ProRes</TableCell>
            <TableCell>MOV</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Full</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Tested</TableCell>
            <TableCell>All variants: 422, 4444, HQ, LT, XQ</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>DNxHR/DNxHD</TableCell>
            <TableCell>MOV, MXF</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Full</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Tested</TableCell>
            <TableCell>All resolutions and frame rates</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>CineForm</TableCell>
            <TableCell>MOV, AVI</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Full</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Tested</TableCell>
            <TableCell>GoPro CineForm RAW support</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>AVID DNx</TableCell>
            <TableCell>MXF, MOV</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Full</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Tested</TableCell>
            <TableCell>All DNx variants and MXF structures</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>MXF</TableCell>
            <TableCell>MXF</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Full</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Tested</TableCell>
            <TableCell>OP1a, OP-Atom, AS-02, IMF support</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>RED RAW</TableCell>
            <TableCell>R3D</TableCell>
            <TableCell className="text-yellow-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Partial</TableCell>
            <TableCell className="text-yellow-600 flex items-center gap-2"><Beaker className="h-4 w-4" /> Testing</TableCell>
            <TableCell>Frame-level chunking, metadata preserved</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>ARRIRAW</TableCell>
            <TableCell>ARI</TableCell>
            <TableCell className="text-yellow-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Partial</TableCell>
            <TableCell className="text-yellow-600 flex items-center gap-2"><Beaker className="h-4 w-4" /> Testing</TableCell>
            <TableCell>Uncompressed raw support</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>XAVC</TableCell>
            <TableCell>MXF, MP4</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Full</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Tested</TableCell>
            <TableCell>Sony professional codec support</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>AVC-Intra</TableCell>
            <TableCell>MXF, MOV</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Full</TableCell>
            <TableCell className="text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> Tested</TableCell>
            <TableCell>All-Intra variants supported</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Keyframe-Aligned Chunking</h2>
      <p>
        Dits analyzes video files to find keyframe positions and aligns chunk
        boundaries to these natural breakpoints:
      </p>

      <CodeBlock
        language="bash"
        code={`Video Structure:
Timeline:  |-------|-------|-------|-------|-------|
           I   P P P I   P P P I   P P P I   P P P
           ↑         ↑         ↑         ↑
        Keyframes (chunk boundaries)

Regular CDC might split here:
           I   P P P I   P|P P I   P P P I   P P P
                         ↑
                    Bad split (mid-GOP)

Keyframe-aligned splits here:
           I   P P P|I   P P P|I   P P P|I   P P P
                    ↑         ↑         ↑
              Aligned to keyframes`}
      />

      <h3>Benefits</h3>
      <ul>
        <li><strong>Faster seeking:</strong> Each chunk can be decoded independently</li>
        <li><strong>Better streaming:</strong> Start playback from any chunk</li>
        <li><strong>Efficient VFS:</strong> Only fetch visible time ranges</li>
        <li><strong>Better deduplication:</strong> Similar clips align naturally</li>
      </ul>

      <h2>Container-Aware Parsing</h2>
      <p>
        Dits understands the structure of video containers and handles them
        appropriately:
      </p>

      <h3>MP4/MOV Structure (ISOBMFF)</h3>
      <CodeBlock
        language="bash"
        code={`MP4/MOV File:
├── ftyp (file type)          ← Keep together
├── moov (metadata)           ← NEVER split
│   ├── mvhd (movie header)
│   ├── trak (track)
│   │   ├── tkhd
│   │   ├── mdia
│   │   │   └── stbl (sample table)
│   │   │       └── stss (keyframe index)
└── mdat (media data)         ← Chunk this part
    └── [video/audio samples]`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Protected Metadata</AlertTitle>
        <AlertDescription>
          Dits never chunks through the <code>moov</code> atom. Splitting
          metadata would render the file unplayable. Only the <code>mdat</code>
          (media data) section is chunked.
        </AlertDescription>
      </Alert>

      <h2>Video-Aware Diff</h2>
      <p>
        See differences between video versions in terms of time, not just bytes:
      </p>

      <CodeBlock
        language="bash"
        code={`$ dits diff --video-aware HEAD~1 HEAD -- scene1.mov

footage/scene1.mov:
  Duration: 5:00.00 (unchanged)
  Resolution: 1920x1080 (unchanged)
  Codec: ProRes 422 HQ (unchanged)

  Changed segments:
    00:45.00 - 01:12.00 (27 seconds)
      → Color grading applied
      → 810 frames affected
      → 3 chunks modified

    03:22.00 - 03:45.00 (23 seconds)
      → Cut extended
      → 690 frames affected
      → 2 chunks modified

  Summary:
    Total changed: 50 seconds of 300 seconds (16.7%)
    Chunks changed: 5 of 312 (1.6%)
    Storage delta: +45 MB`}
      />

      <h3>Frame-Level Analysis</h3>
      <CodeBlock
        language="bash"
        code={`$ dits diff --video-aware --frame-level HEAD~1 HEAD -- scene1.mov

Frame analysis:
  Frame 1350 (00:45.00): Modified (color values changed)
  Frame 1351 (00:45.04): Modified
  Frame 1352 (00:45.08): Modified
  ...
  Frame 1890 (01:12.00): Last modified frame

Statistics:
  Identical frames: 7,500
  Modified frames: 1,500
  Modification ratio: 16.7%`}
      />

      <h2>Video Metadata</h2>
      <p>
        Dits extracts and indexes video metadata for efficient operations:
      </p>

      <CodeBlock
        language="bash"
        code={`$ dits show --video-info HEAD:footage/scene1.mov

Video Information:
  Duration:     5:00.00 (300 seconds)
  Resolution:   1920x1080
  Frame Rate:   23.976 fps
  Codec:        ProRes 422 HQ
  Bit Rate:     220 Mbps
  Total Frames: 7,193

  Audio:
    Channels:   2 (stereo)
    Sample Rate: 48000 Hz
    Codec:      PCM 24-bit

  Keyframes:
    Count: 312
    Interval: ~0.96 seconds (GOP ~24 frames)

  Dits Info:
    Chunks: 312
    Chunk Size: 32 MB average
    Dedup Potential: 15% (similar to scene2.mov)`}
      />

      <h2>Optimizing for Video</h2>

      <h3>Configuration</h3>
      <CodeBlock
        language="bash"
        code={`# .dits/config
[media]
    # Enable keyframe-aligned chunking
    keyframeAligned = true

    # Video file extensions
    videoExtensions = mp4,mov,mxf,avi,mkv,prores

    # Chunk size for video (larger = more efficient)
    videoChunkSize = 32MB

    # Parse video metadata on add
    extractMetadata = true

[chunking]
    # For ProRes/DNxHR, use larger chunks
    minChunkSize = 512KB
    avgChunkSize = 2MB
    maxChunkSize = 8MB`}
      />

      <h3>Per-File Attributes</h3>
      <CodeBlock
        language="bash"
        code={`# .ditsattributes
# Large format video files
*.mxf chunk=video-large
*.mov chunk=video-large

# Highly compressed video
*.mp4 chunk=video-compressed

# RAW footage (frame-based chunking)
*.r3d chunk=raw-video
*.braw chunk=raw-video

# Define chunk profiles
[chunk "video-large"]
    min = 1MB
    avg = 4MB
    max = 16MB
    keyframeAlign = true

[chunk "video-compressed"]
    min = 256KB
    avg = 1MB
    max = 4MB
    keyframeAlign = true`}
      />

      <h2>Working with NLE Projects</h2>
      <p>
        Dits can also parse NLE project files:
      </p>

      <CodeBlock
        language="bash"
        code={`# Supported project formats
- Premiere Pro (.prproj)
- DaVinci Resolve (.drp)
- Final Cut Pro (.fcpxml)
- After Effects (.aep)

# Show project dependencies
$ dits show --project-info project.prproj

Project: project.prproj
  Created: 2024-01-15
  Modified: 2024-01-18

  Media References:
    footage/scene1.mov   ✓ Present
    footage/scene2.mov   ✓ Present
    audio/music.wav      ✓ Present
    graphics/logo.png    ✗ Missing!

  Sequences: 3
  Total Duration: 15:30`}
      />

      <h2>Performance Tips</h2>

      <ol>
        <li>
          <strong>Use proxy files:</strong> Work with proxies, keep masters in repository
        </li>
        <li>
          <strong>Organize by scene:</strong> Related footage deduplicates better when together
        </li>
        <li>
          <strong>Commit logically:</strong> Color grade all related clips together for better delta efficiency
        </li>
        <li>
          <strong>Use sparse checkout:</strong> Only hydrate the clips you&apos;re actively editing
        </li>
      </ol>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/advanced/proxies">Proxy Files</Link>
        </li>
        <li>
          <Link href="/docs/advanced/vfs">Virtual Filesystem</Link>
        </li>
        <li>
          <Link href="/docs/concepts/chunking">Chunking & Deduplication</Link>
        </li>
      </ul>
    </div>
  );
}
