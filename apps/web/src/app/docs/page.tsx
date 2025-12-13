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
  // Core Git Operations (30+ commands)
  "init", "add", "status", "commit", "log", "checkout", "branch", "switch",
  "diff", "tag", "merge", "reset", "restore", "config", "stash", "rebase",
  "cherry-pick", "bisect", "reflog", "blame", "show", "grep", "worktree",
  "sparse-checkout", "hooks", "archive", "describe", "shortlog", "maintenance", "completions",

  // Creative Workflows
  "video-init", "video-add-clip", "video-show", "video-list",
  "proxy-generate", "proxy-status", "proxy-list", "proxy-delete",

  // Asset Management
  "segment", "assemble", "roundtrip", "mount", "unmount", "inspect", "inspect-file",
  "repo-stats", "cache-stats", "fsck", "meta-scan", "meta-show", "meta-list",

  // Collaboration & Security
  "remote", "push", "pull", "fetch", "clone", "lock", "unlock", "locks",
  "login", "logout", "change-password", "audit", "audit-stats", "audit-export", "p2p",

  // Lifecycle & Maintenance
  "freeze-init", "freeze-status", "freeze", "thaw", "freeze-policy",
  "encrypt-init", "encrypt-status", "dep-check", "dep-graph", "dep-list", "gc", "clean",
];

export default function DocsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Dits Documentation</h1>
      <p className="lead text-xl text-muted-foreground">
        Welcome to the Dits documentation. Dits is a comprehensive, production-ready version control system
        with 120+ automated tests covering 80+ file formats. Built for creative industries with Git-like workflows
        for massive binary assets - from video production to game development to 3D animation.
        Features hybrid Git+Dits storage, Redis caching, P2P networking, and enterprise-grade security.
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
              <li>• Binary conflicts require manual resolution</li>
              <li>• 1TB+ projects overwhelm traditional systems</li>
              <li>• No testing for creative workflows</li>
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
              <li>• Hybrid Git+Dits storage for optimal performance</li>
              <li>• 120+ automated tests for 80+ file formats</li>
              <li>• Git operations work on binary creative assets</li>
              <li>• 1TB+ repository support with Redis caching</li>
              <li>• P2P networking and enterprise security</li>
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
        Dits is production-ready with comprehensive testing and enterprise features.
        All 60+ commands are fully implemented with 120+ automated tests covering 80+ file formats:
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
          <h3 className="font-semibold mb-2 text-green-600">✅ Complete VCS (60+ Commands)</h3>
          <p className="text-sm text-muted-foreground">
            Full Git-compatible workflow + advanced operations: branching, merging, rebasing, stashing, worktrees, hooks, maintenance
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-green-600">✅ Comprehensive Media Support</h3>
          <p className="text-sm text-muted-foreground">
            80+ file formats tested: MP4/MOV video, 3D models (OBJ/FBX/glTF), game assets (Unity/Unreal), images, audio, custom formats
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-green-600">✅ Enterprise Features</h3>
          <p className="text-sm text-muted-foreground">
            Hybrid storage, Redis caching, P2P networking, encryption, audit logging, VFS mounting, cross-platform support
          </p>
        </div>
      </div>

      <div className="not-prose bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 my-8">
        <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">🧪 Testing Infrastructure</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium mb-2">120+ Automated Tests</h4>
            <ul className="text-sm space-y-1">
              <li>• Git-inspired shell script framework</li>
              <li>• Creative asset format validation</li>
              <li>• Git operations on binary files</li>
              <li>• Cross-platform compatibility</li>
              <li>• 1TB workload simulation</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Quality Assurance</h4>
            <ul className="text-sm space-y-1">
              <li>• Chainlint for test script validation</li>
              <li>• Performance regression testing</li>
              <li>• Memory leak detection</li>
              <li>• Network failure simulation</li>
              <li>• Corruption recovery testing</li>
            </ul>
          </div>
        </div>
      </div>

      <h2>Key Features</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold mb-3">Core Technology</h3>
          <ul className="space-y-2">
            <li>
              <strong>Content-Defined Chunking:</strong> FastCDC algorithm with video-aware optimizations and keyframe alignment
            </li>
            <li>
              <strong>Hybrid Git+Dits Storage:</strong> Optimal performance for text files (Git) and binary assets (Dits)
            </li>
            <li>
              <strong>BLAKE3 Cryptographic Hashing:</strong> Fast, parallelizable hashing for content addressing
            </li>
            <li>
              <strong>Redis Caching Layer:</strong> Distributed caching for massive repository performance
            </li>
            <li>
              <strong>QUIC Transport:</strong> High-performance UDP-based networking with resumable transfers
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-3">Creative Workflow Support</h3>
          <ul className="space-y-2">
            <li>
              <strong>80+ File Formats:</strong> Comprehensive support for 3D models, game assets, video, audio, images
            </li>
            <li>
              <strong>Git Operations on Binaries:</strong> Diff, merge, blame, reset work on creative assets
            </li>
            <li>
              <strong>Virtual Filesystem:</strong> FUSE/Dokany mounting for on-demand access
            </li>
            <li>
              <strong>Distributed Locking:</strong> Redlock algorithm prevents binary file conflicts
            </li>
            <li>
              <strong>P2P Networking:</strong> Decentralized collaboration and asset sharing
            </li>
            <li>
              <strong>Enterprise Security:</strong> AES-256-GCM encryption, audit logging, RBAC
            </li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-8 mb-4">Testing & Quality Assurance</h3>
      <ul>
        <li>
          <strong>120+ Automated Tests:</strong> Git-inspired shell script framework covering all features and file formats
        </li>
        <li>
          <strong>Cross-Platform Testing:</strong> Windows, macOS, Linux filesystem and path compatibility
        </li>
        <li>
          <strong>Performance Regression:</strong> Benchmarks and scaling validation for enterprise workloads
        </li>
        <li>
          <strong>Recovery Testing:</strong> Corruption detection, automatic repair, and data integrity validation
        </li>
        <li>
          <strong>Stress Testing:</strong> 1TB+ workload simulation and extreme concurrency scenarios
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
