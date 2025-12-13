import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Terminal,
  Settings,
  Layers,
  GitBranch,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Learn how to use Dits for version control of video and large files",
};

const sections = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Learn the basics and get up and running with Dits",
    href: "/docs/getting-started",
    badge: "Start Here",
  },
  {
    icon: Layers,
    title: "Core Concepts",
    description: "Understand how Dits works under the hood",
    href: "/docs/concepts",
  },
  {
    icon: Terminal,
    title: "CLI Reference",
    description: "Complete reference for all Dits commands",
    href: "/docs/cli-reference",
  },
  {
    icon: Settings,
    title: "Configuration",
    description: "Configure Dits to match your workflow",
    href: "/docs/configuration",
  },
  {
    icon: GitBranch,
    title: "Branching & Merging",
    description: "Work with branches and merge changes",
    href: "/docs/concepts/branching",
  },
  {
    icon: Zap,
    title: "Advanced Topics",
    description: "Virtual filesystem, video features, and more",
    href: "/docs/advanced/vfs",
  },
];

const implementedCommands = [
  "init", "add", "status", "commit", "log", "checkout", "branch", "switch",
  "diff", "tag", "merge", "reset", "restore", "config", "stash", "mount",
  "unmount", "inspect", "inspect-file", "repo-stats", "clone", "remote",
  "push", "pull", "fetch", "lock", "unlock", "locks", "gc", "fsck",
];

export default function DocsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Dits Documentation</h1>
      <p className="lead text-xl text-muted-foreground">
        Welcome to the Dits documentation. Dits is an open-source, Git-like version control system
        specifically designed for video production, game development, and creative workflows with large binary files.
        It brings professional version control to industries where traditional Git falls short.
      </p>

      <div className="not-prose bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 my-8">
        <h2 className="text-2xl font-bold mb-4">Why Dits Exists</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-semibold text-red-600 mb-2">The Problem</h3>
            <ul className="space-y-1 text-sm">
              <li>• Git LFS is a bandaid, not a solution</li>
              <li>• Large files get re-uploaded entirely for tiny changes</li>
              <li>• No deduplication across versions or projects</li>
              <li>• Manual versioning with "final_v27.mp4" files</li>
              <li>• No proper branching/merging for creative assets</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-green-600 mb-2">The Dits Solution</h3>
            <ul className="space-y-1 text-sm">
              <li>• Content-defined chunking deduplicates automatically</li>
              <li>• Only changed chunks transfer across network</li>
              <li>• Video-aware optimizations (keyframe alignment)</li>
              <li>• Git-like interface familiar to developers</li>
              <li>• Local-first with optional cloud storage</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="not-prose grid gap-4 md:grid-cols-2 lg:grid-cols-3 my-8">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="no-underline">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <section.icon className="h-8 w-8 text-primary" />
                  {section.badge && (
                    <Badge variant="secondary">{section.badge}</Badge>
                  )}
                </div>
                <CardTitle className="mt-4">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {section.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <h2>Quick Reference</h2>

      <h3>Basic Workflow</h3>
      <pre className="not-prose">
        <code>{`# Initialize a new repository
dits init

# Add files to staging
dits add video.mp4
dits add footage/

# Check status
dits status

# Commit changes
dits commit -m "Add raw footage"

# View history
dits log`}</code>
      </pre>

      <h3>Branching</h3>
      <pre className="not-prose">
        <code>{`# Create a branch
dits branch feature/color-grade

# Switch to branch
dits switch feature/color-grade

# Merge branch
dits switch main
dits merge feature/color-grade`}</code>
      </pre>

      <h3>Remote Operations</h3>
      <pre className="not-prose">
        <code>{`# Add a remote
dits remote add origin /path/to/remote

# Push changes
dits push origin main

# Pull changes
dits pull origin main

# Clone a repository
dits clone /path/to/repo my-project`}</code>
      </pre>

      <h2>Implementation Status</h2>
      <p>
        Dits is under active development with a focus on core version control functionality.
        The following commands are fully implemented and production-ready:
      </p>

      <div className="not-prose flex flex-wrap gap-2 my-4">
        {implementedCommands.map((cmd) => (
          <Badge key={cmd} variant="outline" className="font-mono">
            {cmd}
          </Badge>
        ))}
      </div>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-6">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-green-600">✅ Core VCS</h3>
          <p className="text-sm text-muted-foreground">
            Full Git-compatible workflow: init, add, commit, log, status, diff, checkout, branch, merge
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-green-600">✅ Media Handling</h3>
          <p className="text-sm text-muted-foreground">
            FastCDC chunking, MP4 awareness, keyframe alignment, transparent decompression
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-yellow-600">🚧 In Progress</h3>
          <p className="text-sm text-muted-foreground">
            Advanced features: VFS mounting, P2P sync, encryption, project graphs
          </p>
        </div>
      </div>

      <h2>Key Features</h2>
      <ul>
        <li>
          <strong>Content-Defined Chunking:</strong> Files are split into
          variable-size chunks based on content, enabling efficient
          deduplication
        </li>
        <li>
          <strong>BLAKE3 Hashing:</strong> Fast, parallelizable cryptographic
          hashing for content addressing
        </li>
        <li>
          <strong>Video-Aware:</strong> Understands MP4/MOV structure for
          optimal chunking at keyframe boundaries
        </li>
        <li>
          <strong>Git-Like Interface:</strong> Familiar commands for easy
          adoption
        </li>
        <li>
          <strong>Virtual Filesystem:</strong> Mount repositories as drives for
          on-demand file access
        </li>
        <li>
          <strong>File Locking:</strong> Prevent conflicts with binary file
          locks
        </li>
      </ul>

      <h2>Open Source & Community</h2>
      <p>
        Dits is proudly open source and welcomes contributions from the community.
        Whether you're a developer, creative professional, or just curious about version control for large files,
        there are many ways to get involved:
      </p>
      <ul>
        <li>
          <strong>Contribute Code:</strong>{" "}
          <Link href="https://github.com/byronwade/dits">GitHub Repository</Link>{" "}
          - Rust implementation with comprehensive documentation
        </li>
        <li>
          <strong>Report Issues:</strong>{" "}
          <Link href="https://github.com/byronwade/dits/issues">GitHub Issues</Link>{" "}
          - Bug reports, feature requests, and technical discussions
        </li>
        <li>
          <strong>Join Discussions:</strong>{" "}
          <Link href="https://github.com/byronwade/dits/discussions">GitHub Discussions</Link>{" "}
          - Community support, ideas, and general conversation
        </li>
        <li>
          <strong>Documentation:</strong>{" "}
          <Link href="/docs/contributing">Contributing Guide</Link>{" "}
          - Help improve documentation and tutorials
        </li>
      </ul>

      <h2>Getting Help</h2>
      <p>
        Need help getting started or troubleshooting? Here are your resources:
      </p>
      <ul>
        <li>
          Check the{" "}
          <Link href="/docs/cli-reference">CLI Reference</Link> for command
          details
        </li>
        <li>
          Read the{" "}
          <Link href="/docs/concepts">Core Concepts</Link> to understand how
          Dits works
        </li>
        <li>
          Browse the{" "}
          <Link href="/docs/troubleshooting">Troubleshooting Guide</Link> for
          common issues
        </li>
        <li>
          Join{" "}
          <Link href="https://github.com/byronwade/dits/discussions">
            GitHub Discussions
          </Link>{" "}
          for community support
        </li>
        <li>
          Report bugs on{" "}
          <Link href="https://github.com/byronwade/dits/issues">
            GitHub Issues
          </Link>
        </li>
      </ul>
    </div>
  );
}
