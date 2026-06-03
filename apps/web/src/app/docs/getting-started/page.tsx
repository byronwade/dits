import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ui/code-block";
import { Gamepad2, Video, Palette } from "lucide-react";

import { generateMetadata as genMeta, generateArticleSchema, generateBreadcrumbSchema } from "@/lib/seo";
import Script from "next/script";

export const metadata: Metadata = genMeta({
  title: "Getting Started with Dits - Installation & Quick Start Guide",
  description: "Get started with Dits in minutes. Learn how to install Dits on macOS, Linux, or Windows. Create your first repository and start version controlling large files and video assets.",
  canonical: "https://dits.dev/docs/getting-started",
  keywords: [
    "dits getting started",
    "dits installation guide",
    "dits quick start",
    "install dits",
    "dits tutorial",
    "dits setup",
    "version control setup",
  ],
  openGraph: {
    type: "article",
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "Getting Started with Dits",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
});

export default function GettingStartedPage() {
  const articleSchema = generateArticleSchema({
    headline: "Getting Started with Dits - Installation & Quick Start Guide",
    description: "Get started with Dits in minutes. Learn how to install Dits on macOS, Linux, or Windows. Create your first repository and start version controlling large files and video assets.",
    datePublished: "2024-01-01",
    dateModified: new Date().toISOString().split("T")[0],
    author: "Byron Wade",
    section: "Documentation",
    tags: ["getting started", "installation", "tutorial", "quick start"],
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Documentation", url: "/docs" },
    { name: "Getting Started", url: "/docs/getting-started" },
  ]);

  return (
    <>
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <div className="prose dark:prose-invert max-w-none">
        <DocPageHeader
          eyebrow="Getting Started"
          title="Getting Started with Dits"
          description="This guide will help you install Dits and create your first repository. Dits is production-ready with 120+ automated tests covering 80+ file formats for creative professionals."
        />

        <h2>Installation</h2>
        <p>
          Dits can be installed using several methods. Choose the one that works
          best for your environment:
        </p>

        <Tabs defaultValue="npm" className="not-prose my-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="npm">npm</TabsTrigger>
            <TabsTrigger value="curl">curl</TabsTrigger>
            <TabsTrigger value="brew">Homebrew</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
          </TabsList>
          <TabsContent value="npm" className="mt-4">
            <CodeBlock
              language="bash"
              code={`npm install -g @byronwade/dits`}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Works with npm, bun, pnpm, or yarn.
            </p>
          </TabsContent>
          <TabsContent value="curl" className="mt-4">
            <CodeBlock
              language="bash"
              code={`curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh`}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Downloads and installs the latest release binary.
            </p>
          </TabsContent>
          <TabsContent value="brew" className="mt-4">
            <CodeBlock
              language="bash"
              code={`brew tap byronwade/dits && brew install dits`}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Available for macOS and Linux via Homebrew.
            </p>
          </TabsContent>
          <TabsContent value="source" className="mt-4">
            <CodeBlock
              language="bash"
              code={`git clone https://github.com/byronwade/dits.git
cd dits/apps/cli
cargo build --release
cp target/release/dits /usr/local/bin/`}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Requires Rust 1.75+ to build from source.
            </p>
          </TabsContent>
        </Tabs>

        <p>Verify installation:</p>
        <CodeBlock
          language="bash"
          code={`$ dits --version
dits 0.1.2`}
        />

        <h2>Choose Your Workflow</h2>
        <p>
          Dits supports various creative workflows. Choose the one that matches your needs:
        </p>

        <div className="not-prose grid gap-4 md:grid-cols-2 lg:grid-cols-3 my-6">
          <Card>
            <CardHeader>
              <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
                <Video className="size-5 text-brand" />
              </div>
              <CardTitle className="text-base">Video Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>MP4-aware chunking &amp; keyframe alignment</li>
                <li>Video timeline management</li>
                <li>Proxy file generation</li>
                <li>Multi-format support (ProRes, DNxHD, H.264)</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
                <Gamepad2 className="size-5 text-brand" />
              </div>
              <CardTitle className="text-base">Game Developer</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>Unity/Unreal/Godot asset support</li>
                <li>Binary file conflict prevention</li>
                <li>Large build artifact management</li>
                <li>Audio middleware integration</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
                <Palette className="size-5 text-brand" />
              </div>
              <CardTitle className="text-base">3D Artist</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>OBJ/FBX/glTF/USD format support</li>
                <li>Material &amp; texture workflows</li>
                <li>Animation data management</li>
                <li>Render farm integration</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Callout type="note" title="Git-Compatible Interface" className="not-prose my-6">
          Dits uses familiar Git commands (init, add, commit, log, branch, merge) with extensions for creative workflows.
          No need to learn a new version control system - your Git knowledge transfers directly.
        </Callout>

        <h2>Using Dits Alongside Git</h2>
        <p>
          Dits is designed to work seamlessly alongside Git in the same project directory.
          While both systems can coexist, they serve different purposes and handle different types of files.
        </p>

        <div className="not-prose grid gap-4 md:grid-cols-2 my-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Git Repository</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>Handles text files (.rs, .js, .py, .md)</li>
                <li>Line-based diffs and 3-way merges</li>
                <li>Code review and blame functionality</li>
                <li>Branching and collaboration workflows</li>
                <li>Typically smaller files (&lt;100MB)</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-brand/40 bg-brand/5">
            <CardHeader>
              <CardTitle className="text-base text-brand">Dits Repository</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>Handles large binary files (.mp4, .psd, .blend)</li>
                <li>Content-defined chunking and deduplication</li>
                <li>Efficient storage of large creative assets</li>
                <li>Video-aware optimizations</li>
                <li>Unlimited file sizes with on-demand access</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Callout type="note" title="Hybrid Storage System" className="not-prose my-4">
          Dits automatically classifies files and uses the optimal storage method.
          Text files get Git's powerful operations, while binary assets benefit from Dits' deduplication.
          Everything works together in a unified repository structure.
        </Callout>

        <h3>Initializing Both Systems</h3>
        <p>
          Currently, you need to initialize both Git and Dits repositories separately.
          Both can coexist in the same project directory:
        </p>
        <CodeBlock
          language="bash"
          code={`# Create project directory
mkdir my-creative-project
cd my-creative-project

# Initialize Git (for code and text files)
git init

# Initialize Dits (for large binary assets)
dits init

# Both repositories now coexist:
# .git/ (Git repository)
# .dits/ (Dits repository)`}
        />

        <Callout type="tip" title="Future Enhancement" className="not-prose my-4">
          We're considering adding a <code>dits init --with-git</code> flag to initialize both systems together
          in a single command. This would streamline the setup process for new projects.
        </Callout>

        <h3>Working with Both Systems</h3>
        <p>
          Once both repositories are initialized, you can use both Git and Dits commands as needed:
        </p>
        <CodeBlock
          language="bash"
          code={`# Add text/code files with Git
git add src/ package.json README.md

# Add binary assets with Dits
dits add footage/ assets/ renders/

# Commit changes to both
git commit -m "Update source code"
dits commit -m "Add new footage"

# View combined history
git log --oneline  # Code commits
dits log --oneline # Asset commits`}
        />

        <Callout type="tip" title="Production-Ready with Comprehensive Testing" className="not-prose my-6">
          <strong>120+ automated tests</strong> covering 80+ file formats, Git operations on binaries, cross-platform compatibility,
          1TB+ workload simulation, and enterprise security. Every feature is thoroughly tested before release.
        </Callout>

        <h2>Your First Repository</h2>

        <h3>1. Initialize a Repository</h3>
        <p>
          Create a new directory for your project and initialize a Dits
          repository:
        </p>
        <CodeBlock
          language="bash"
          code={`mkdir my-video-project
cd my-video-project
dits init`}
        />
        <p>
          This creates a <code>.dits</code> directory containing the repository
          data.
        </p>

        <h3>2. Add Files</h3>
        <p>Add your video files or any large binary files:</p>
        <CodeBlock
          language="bash"
          code={`# Add a specific file
dits add footage.mp4

# Add all files in a directory
dits add raw-footage/

# Add everything
dits add .`}
        />

        <Callout type="note" title="How it works" className="not-prose my-4">
          When you add files, Dits splits them into content-defined chunks and
          stores them in the object store. Identical chunks are only stored once,
          saving disk space.
        </Callout>

        <h3>3. Check Status</h3>
        <p>See what&apos;s staged and ready to commit:</p>
        <CodeBlock
          language="bash"
          code={`$ dits status
On branch main

Changes to be committed:
  new file:   footage.mp4
  new file:   raw-footage/scene01.mov
  new file:   raw-footage/scene02.mov`}
        />

        <h3>4. Commit Changes</h3>
        <p>Create a commit with a descriptive message:</p>
        <CodeBlock
          language="bash"
          code={`$ dits commit -m "Add initial footage"
[main abc1234] Add initial footage
 3 files changed, 2.4 GB added (847 MB stored after dedup)`}
        />

        <h3>5. View History</h3>
        <p>See your commit history:</p>
        <CodeBlock
          language="bash"
          code={`$ dits log
commit abc1234 (HEAD -> main)
Author: Your Name <you@example.com>
Date:   Mon Jan 15 14:30:00 2025

    Add initial footage`}
        />

        <h2>Working with Branches</h2>
        <p>
          Branches let you work on different versions of your project
          simultaneously:
        </p>

        <h3>Create a Branch</h3>
        <CodeBlock
          language="bash"
          code={`# Create a new branch
dits branch color-grade

# Switch to the branch
dits switch color-grade`}
        />

        <h3>Make Changes and Commit</h3>
        <CodeBlock
          language="bash"
          code={`# Make changes...
dits add .
dits commit -m "Apply color grading"`}
        />

        <h3>Merge Back to Main</h3>
        <CodeBlock
          language="bash"
          code={`# Switch to main
dits switch main

# Merge the color-grade branch
dits merge color-grade`}
        />

        <h2>Configuration</h2>
        <p>Set your name and email for commits:</p>
        <CodeBlock
          language="bash"
          code={`dits config user.name "Your Name"
dits config user.email "you@example.com"`}
        />

        <h3>Telemetry Settings</h3>
        <p>
          Dits includes optional telemetry to help us improve the product. Unlike Git which has no telemetry, Dits collects anonymized usage statistics when enabled. Telemetry is <strong>completely optional and disabled by default</strong>.
        </p>

        <Callout type="note" title="Privacy First" className="not-prose my-4">
          We only collect essential usage data to improve Dits. No personal information, file contents, or repository data is ever collected. You can enable, disable, or check telemetry status anytime.
        </Callout>

        <div className="not-prose space-y-4 my-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Check Telemetry Status</h4>
            <code className="text-sm bg-background px-2 py-1 rounded">
              dits telemetry status
            </code>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Enable Telemetry (Optional)</h4>
            <code className="text-sm bg-background px-2 py-1 rounded">
              dits telemetry enable
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Help improve Dits by sharing anonymized usage data
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Disable Telemetry</h4>
            <code className="text-sm bg-background px-2 py-1 rounded">
              dits telemetry disable
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Turn off all telemetry collection (default)
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Learn more about{" "}
          <Link href="/docs/architecture/security#telemetry--usage-analytics" className="underline">
            telemetry and privacy
          </Link>{" "}
          in our security documentation.
        </p>

        <h2>Virtual Filesystem (VFS)</h2>
        <p>
          Mount your repository as a virtual drive for on-demand file access
          (requires FUSE):
        </p>
        <CodeBlock
          language="bash"
          code={`# Mount the repository
dits mount /mnt/dits-project

# Files appear instantly - hydrated on access
ls /mnt/dits-project/footage/

# Unmount when done
dits unmount /mnt/dits-project`}
        />

        <Callout type="warning" title="FUSE Requirements" className="not-prose my-4">
          <ul className="mt-2 space-y-1">
            <li>
              <strong>macOS:</strong> Install macFUSE: <code>brew install macfuse</code>
            </li>
            <li>
              <strong>Linux:</strong> Install FUSE3: <code>apt install fuse3</code>
            </li>
            <li>
              <strong>Windows:</strong> Install Dokany
            </li>
          </ul>
        </Callout>

        <h2>Next Steps</h2>
        <ul>
          <li>
            Learn about{" "}
            <Link href="/docs/concepts">Core Concepts</Link> to understand how
            Dits works
          </li>
          <li>
            Explore the{" "}
            <Link href="/docs/cli-reference">CLI Reference</Link> for all
            commands
          </li>
          <li>
            Configure Dits in the{" "}
            <Link href="/docs/configuration">Configuration Guide</Link>
          </li>
          <li>
            Learn about{" "}
            <Link href="/docs/advanced/video">Video Features</Link> for
            media-specific functionality
          </li>
        </ul>
      </div>
    </>
  );
}
