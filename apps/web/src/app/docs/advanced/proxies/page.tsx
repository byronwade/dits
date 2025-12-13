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
import { Info, Image, Film, ArrowLeftRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Proxy Files",
  description: "Work with lightweight proxy files in Dits",
};

export default function ProxiesPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Proxy Files</h1>
      <p className="lead text-xl text-muted-foreground">
        Proxy files are lower-resolution versions of your media that enable
        faster editing workflows while keeping full-quality masters in the
        repository.
      </p>

      <h2>What Are Proxies?</h2>
      <p>
        Proxies are lightweight versions of video files used during editing:
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Image className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Smaller Files</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              720p H.264 proxies are 10-50x smaller than 4K ProRes masters,
              making editing responsive on any hardware.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Film className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Same Timecode</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Proxies match the exact frame rate and timecode of masters, so
              edits transfer perfectly.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <ArrowLeftRight className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Easy Switching</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Switch between proxy and master with a single command. Perfect for
              remote editing then local finishing.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <h2>Proxy Workflow Overview</h2>
      <pre className="not-prose">
        <code>{`1. Add full-quality masters to repository
   $ dits add footage/*.mov

2. Generate proxies
   $ dits proxy-gen footage/

3. Work with proxies (edit, review, collaborate)
   $ dits proxy-use
   → Now footage/ shows proxy files

4. Switch to masters for final render
   $ dits proxy-unuse
   → Now footage/ shows full-quality masters`}</code>
      </pre>

      <h2>Generating Proxies</h2>

      <h3>Basic Generation</h3>
      <pre className="not-prose">
        <code>{`# Generate proxies for all video files
$ dits proxy-gen footage/

Generating proxies...
  footage/scene1.mov → proxies/scene1.mov (720p H.264)
  footage/scene2.mov → proxies/scene2.mov (720p H.264)
  footage/scene3.mov → proxies/scene3.mov (720p H.264)

Generated 3 proxies (45 GB → 1.2 GB)`}</code>
      </pre>

      <h3>Custom Settings</h3>
      <pre className="not-prose">
        <code>{`# Custom resolution
$ dits proxy-gen --resolution 1280x720 footage/

# Custom codec
$ dits proxy-gen --codec prores-proxy footage/

# Custom bitrate
$ dits proxy-gen --bitrate 5M footage/

# All options
$ dits proxy-gen \
    --resolution 1920x1080 \
    --codec h264 \
    --bitrate 8M \
    --fps preserve \
    footage/`}</code>
      </pre>

      <h3>Proxy Presets</h3>
      <pre className="not-prose">
        <code>{`# Use a preset
$ dits proxy-gen --preset editing footage/    # 720p H.264
$ dits proxy-gen --preset review footage/     # 1080p H.264
$ dits proxy-gen --preset mobile footage/     # 480p H.264

# Define custom preset in config
[proxy.preset "dailies"]
    resolution = 1920x1080
    codec = h264
    bitrate = 10M
    audio = aac-256k

$ dits proxy-gen --preset dailies footage/`}</code>
      </pre>

      <h2>Using Proxies</h2>

      <h3>Switch to Proxies</h3>
      <pre className="not-prose">
        <code>{`# Enable proxy mode
$ dits proxy-use

Switching to proxy mode...
  Linking footage/scene1.mov → proxies/scene1.mov
  Linking footage/scene2.mov → proxies/scene2.mov
  Linking footage/scene3.mov → proxies/scene3.mov

Proxy mode enabled. Original files preserved in .dits/masters/

# Check status
$ dits proxy-status
Mode: PROXY
Files linked: 3
Original size: 45 GB
Proxy size: 1.2 GB`}</code>
      </pre>

      <h3>Switch to Masters</h3>
      <pre className="not-prose">
        <code>{`# Disable proxy mode
$ dits proxy-unuse

Switching to master mode...
  Restoring footage/scene1.mov (15 GB)
  Restoring footage/scene2.mov (15 GB)
  Restoring footage/scene3.mov (15 GB)

Master mode enabled.`}</code>
      </pre>

      <h3>Partial Proxy Mode</h3>
      <pre className="not-prose">
        <code>{`# Only use proxies for specific files
$ dits proxy-use footage/scene1.mov footage/scene2.mov

# Use proxies for a directory
$ dits proxy-use footage/b-roll/

# Keep specific files as masters
$ dits proxy-use --except footage/hero-shot.mov`}</code>
      </pre>

      <h2>Configuration</h2>

      <pre className="not-prose">
        <code>{`# .dits/config
[proxy]
    # Default proxy resolution
    resolution = 1280x720

    # Default codec
    codec = h264

    # Default bitrate
    bitrate = 5M

    # Proxy storage location
    path = .dits/proxies

    # Auto-generate on add
    autoGenerate = false

    # Audio handling
    audioCodec = aac
    audioBitrate = 192k`}</code>
      </pre>

      <h2>Proxy Attributes</h2>
      <p>
        Control proxy generation per file pattern:
      </p>

      <pre className="not-prose">
        <code>{`# .ditsattributes

# Generate proxies for raw footage
footage/*.mov proxy=auto
footage/*.mxf proxy=auto

# Higher quality proxies for hero shots
footage/hero-*.mov proxy=auto proxy-preset=review

# Don&apos;t generate proxies for already-compressed files
renders/*.mp4 proxy=none

# Custom proxy settings
*.r3d proxy=auto proxy-resolution=1920x1080 proxy-codec=prores-proxy`}</code>
      </pre>

      <h2>Remote Workflows</h2>
      <p>
        Proxies are especially valuable for distributed teams:
      </p>

      <h3>Scenario: Remote Editor</h3>
      <pre className="not-prose">
        <code>{`# On-set (full masters available)
$ dits add footage/*.mov
$ dits proxy-gen footage/
$ dits commit -m "Day 1 footage with proxies"
$ dits push

# Remote editor (limited bandwidth)
$ dits clone --proxy-only https://example.com/project
Cloning into 'project'...
  Fetching proxies... 1.2 GB
  (Masters: 45 GB available on-demand)

# Editor works with proxies
$ cd project
$ ls footage/
scene1.mov (proxy)  scene2.mov (proxy)  scene3.mov (proxy)

# Edit in NLE using proxy files...

# For final render, fetch masters for specific clips
$ dits proxy-unuse footage/scene1.mov
Hydrating footage/scene1.mov... 15 GB`}</code>
      </pre>

      <h3>Scenario: Review and Approval</h3>
      <pre className="not-prose">
        <code>{`# Generate review proxies
$ dits proxy-gen --preset review footage/

# Share proxy-only branch
$ dits switch -c review-v1
$ dits proxy-use
$ dits push origin review-v1

# Client clones proxy-only
$ dits clone --proxy-only --branch review-v1 https://example.com/project`}</code>
      </pre>

      <h2>Commands Reference</h2>

      <h3>dits proxy-gen</h3>
      <pre className="not-prose">
        <code>{`$ dits proxy-gen [OPTIONS] <PATH>...

Options:
  --resolution <WxH>    Output resolution (default: 1280x720)
  --codec <CODEC>       Video codec (h264, prores-proxy, dnxhr-lb)
  --bitrate <RATE>      Target bitrate (e.g., "5M")
  --preset <NAME>       Use named preset
  --force               Regenerate existing proxies
  --output <DIR>        Custom output directory`}</code>
      </pre>

      <h3>dits proxy-use</h3>
      <pre className="not-prose">
        <code>{`$ dits proxy-use [OPTIONS] [PATH]...

Options:
  --except <PATH>       Exclude files from proxy mode
  --force               Overwrite local changes`}</code>
      </pre>

      <h3>dits proxy-unuse</h3>
      <pre className="not-prose">
        <code>{`$ dits proxy-unuse [OPTIONS] [PATH]...

Options:
  --keep-proxies        Don't delete local proxy files
  --no-hydrate          Don't download masters (just unlink)`}</code>
      </pre>

      <h3>dits proxy-status</h3>
      <pre className="not-prose">
        <code>{`$ dits proxy-status

Mode: PROXY
Files:
  footage/scene1.mov  PROXY (720p, 45MB) → MASTER (4K, 15GB)
  footage/scene2.mov  PROXY (720p, 42MB) → MASTER (4K, 14GB)
  footage/scene3.mov  MASTER (4K, 16GB)

Totals:
  Proxy files: 2 (87 MB)
  Master files: 1 (16 GB)
  Unmaterialized masters: 2 (29 GB)`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>NLE Compatibility</AlertTitle>
        <AlertDescription>
          Proxies are stored with the same relative paths and filenames as
          masters. Most NLEs (Premiere, Resolve, FCPX) can switch between them
          using their built-in proxy toggle features.
        </AlertDescription>
      </Alert>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/advanced/video">Video Features</Link>
        </li>
        <li>
          <Link href="/docs/advanced/vfs">Virtual Filesystem</Link>
        </li>
        <li>
          <Link href="/docs/cli/remotes">Remote Commands</Link>
        </li>
      </ul>
    </div>
  );
}
