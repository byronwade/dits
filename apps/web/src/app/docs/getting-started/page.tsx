import { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Terminal, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Getting Started",
  description: "Get started with Dits - installation and first steps",
};

export default function GettingStartedPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Getting Started with Dits</h1>
      <p className="lead text-xl text-muted-foreground">
        This guide will help you install Dits and create your first repository.
      </p>

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
          <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4">
            <code>npm install -g @byronwade/dits</code>
          </pre>
          <p className="text-sm text-muted-foreground mt-2">
            Works with npm, bun, pnpm, or yarn.
          </p>
        </TabsContent>
        <TabsContent value="curl" className="mt-4">
          <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4">
            <code>curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh</code>
          </pre>
          <p className="text-sm text-muted-foreground mt-2">
            Downloads and installs the latest release binary.
          </p>
        </TabsContent>
        <TabsContent value="brew" className="mt-4">
          <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4">
            <code>brew tap byronwade/dits && brew install dits</code>
          </pre>
          <p className="text-sm text-muted-foreground mt-2">
            Available for macOS and Linux via Homebrew.
          </p>
        </TabsContent>
        <TabsContent value="source" className="mt-4">
          <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4">
            <code>{`git clone https://github.com/byronwade/dits.git
cd dits/apps/cli
cargo build --release
cp target/release/dits /usr/local/bin/`}</code>
          </pre>
          <p className="text-sm text-muted-foreground mt-2">
            Requires Rust 1.75+ to build from source.
          </p>
        </TabsContent>
      </Tabs>

      <p>Verify installation:</p>
      <pre className="not-prose">
        <code>{`$ dits --version
dits 0.1.2`}</code>
      </pre>

      <h2>Your First Repository</h2>

      <h3>1. Initialize a Repository</h3>
      <p>
        Create a new directory for your project and initialize a Dits
        repository:
      </p>
      <pre className="not-prose">
        <code>{`mkdir my-video-project
cd my-video-project
dits init`}</code>
      </pre>
      <p>
        This creates a <code>.dits</code> directory containing the repository
        data.
      </p>

      <h3>2. Add Files</h3>
      <p>Add your video files or any large binary files:</p>
      <pre className="not-prose">
        <code>{`# Add a specific file
dits add footage.mp4

# Add all files in a directory
dits add raw-footage/

# Add everything
dits add .`}</code>
      </pre>

      <Alert className="not-prose my-4">
        <Info className="h-4 w-4" />
        <AlertTitle>How it works</AlertTitle>
        <AlertDescription>
          When you add files, Dits splits them into content-defined chunks and
          stores them in the object store. Identical chunks are only stored once,
          saving disk space.
        </AlertDescription>
      </Alert>

      <h3>3. Check Status</h3>
      <p>See what&apos;s staged and ready to commit:</p>
      <pre className="not-prose">
        <code>{`$ dits status
On branch main

Changes to be committed:
  new file:   footage.mp4
  new file:   raw-footage/scene01.mov
  new file:   raw-footage/scene02.mov`}</code>
      </pre>

      <h3>4. Commit Changes</h3>
      <p>Create a commit with a descriptive message:</p>
      <pre className="not-prose">
        <code>{`$ dits commit -m "Add initial footage"
[main abc1234] Add initial footage
 3 files changed, 2.4 GB added (847 MB stored after dedup)`}</code>
      </pre>

      <h3>5. View History</h3>
      <p>See your commit history:</p>
      <pre className="not-prose">
        <code>{`$ dits log
commit abc1234 (HEAD -> main)
Author: Your Name <you@example.com>
Date:   Mon Jan 15 14:30:00 2025

    Add initial footage`}</code>
      </pre>

      <h2>Working with Branches</h2>
      <p>
        Branches let you work on different versions of your project
        simultaneously:
      </p>

      <h3>Create a Branch</h3>
      <pre className="not-prose">
        <code>{`# Create a new branch
dits branch color-grade

# Switch to the branch
dits switch color-grade`}</code>
      </pre>

      <h3>Make Changes and Commit</h3>
      <pre className="not-prose">
        <code>{`# Make changes...
dits add .
dits commit -m "Apply color grading"`}</code>
      </pre>

      <h3>Merge Back to Main</h3>
      <pre className="not-prose">
        <code>{`# Switch to main
dits switch main

# Merge the color-grade branch
dits merge color-grade`}</code>
      </pre>

      <h2>Configuration</h2>
      <p>Set your name and email for commits:</p>
      <pre className="not-prose">
        <code>{`dits config user.name "Your Name"
dits config user.email "you@example.com"`}</code>
      </pre>

      <h2>Virtual Filesystem (VFS)</h2>
      <p>
        Mount your repository as a virtual drive for on-demand file access
        (requires FUSE):
      </p>
      <pre className="not-prose">
        <code>{`# Mount the repository
dits mount /mnt/dits-project

# Files appear instantly - hydrated on access
ls /mnt/dits-project/footage/

# Unmount when done
dits unmount /mnt/dits-project`}</code>
      </pre>

      <Alert className="not-prose my-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>FUSE Requirements</AlertTitle>
        <AlertDescription>
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
        </AlertDescription>
      </Alert>

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
  );
}
