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
import { CodeBlock } from "@/components/ui/code-block";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import {
  BookOpen,
  Terminal,
  Settings,
  Layers,
  GitBranch,
  Zap,
  Check,
  Beaker,
  ArrowRight,
} from "lucide-react";
import { generateMetadata as genMeta } from "@/lib/seo";
import Script from "next/script";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits Documentation - Complete Guide to Version Control for Large Files",
  description: "Complete documentation for Dits version control system. Learn how to use Dits for video production, large binary files, and creative workflows. Tutorials, CLI reference, API docs, and more.",
  canonical: "https://dits.dev/docs",
  keywords: [
    "dits documentation",
    "version control tutorial",
    "video version control guide",
    "large file version control",
    "dits commands",
    "dits cli reference",
    "git alternative documentation",
  ],
  openGraph: {
    type: "website",
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "Dits Documentation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
});

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

  // Collaboration & Security (local)
  "lock", "unlock", "locks",
  "login", "logout", "change-password", "audit", "audit-stats", "audit-export",

  // Lifecycle & Maintenance
  "freeze-init", "freeze-status", "freeze", "thaw", "freeze-policy",
  "encrypt-init", "encrypt-status", "dep-check", "dep-graph", "dep-list", "gc", "clean",
];

// Networked commands are on the roadmap: they currently print placeholders
// and transfer no data. See the roadmap callout below.
const roadmapCommands = [
  "remote", "push", "pull", "fetch", "clone", "sync", "p2p",
];

export default function DocsPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Documentation", url: "/docs" },
  ]);

  const webpageSchema = generateWebPageSchema({
    name: "Dits Documentation",
    description: "Complete documentation for Dits version control system. Learn how to use Dits for video production, large binary files, and creative workflows.",
    url: "https://dits.dev/docs",
    breadcrumb: [
      { name: "Home", url: "/" },
      { name: "Documentation", url: "/docs" },
    ],
  });

  return (
    <>
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <Script
        id="webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webpageSchema),
        }}
      />
      <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Documentation"
        title="Dits Documentation"
        description="Welcome to the Dits documentation. Dits is a local-first, content-addressed version control system, covered by 469 automated tests. Built for creative industries with Git-like workflows for massive binary assets - from video production to game development to 3D animation. Networked features such as remote sync and P2P are on the roadmap and not yet available."
      />

      <Callout type="important" className="not-prose my-8">
        <strong>What works today vs. what is planned.</strong> Dits today is a
        local-first Rust CLI. Local version control (init, add, commit, branch,
        diff, log, VFS, video tooling, encryption, and more) works and is covered
        by 469 automated tests. Networked features &mdash; <code>remote</code>,{" "}
        <code>push</code>, <code>pull</code>, <code>fetch</code>, <code>clone</code>,{" "}
        <code>sync</code>, and P2P &mdash; are on the roadmap: today they print
        placeholders and transfer no data. The same applies to the hosted REST API,
        official SDKs, Ditshub cloud, and managed deployment. Do not depend on those
        yet.
      </Callout>

      <div className="not-prose rounded-xl border border-brand/20 bg-gradient-to-br from-brand/10 to-brand/5 p-6 my-8">
        <h2 className="text-2xl font-bold mb-4">Why Dits Exists</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-5">
            <h3 className="font-semibold text-destructive mb-3">The Problem</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
              <li>Git LFS is a bandaid, not a solution</li>
              <li>Large files get re-uploaded entirely for tiny changes</li>
              <li>No deduplication across versions or projects</li>
              <li>Manual versioning with &quot;final_v27.mp4&quot; files</li>
              <li>No proper branching/merging for creative assets</li>
              <li>Binary conflicts require manual resolution</li>
              <li>1TB+ projects overwhelm traditional systems</li>
              <li>No testing for creative workflows</li>
            </ul>
          </div>
          <div className="rounded-lg border border-brand/30 bg-brand/5 p-5">
            <h3 className="font-semibold text-brand mb-3">The Dits Solution</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
              <li>Content-defined chunking deduplicates automatically</li>
              <li>Only changed chunks transfer across network (planned)</li>
              <li>Video-aware optimizations (keyframe alignment)</li>
              <li>Git-like interface familiar to developers</li>
              <li>Local-first; optional cloud storage on the roadmap</li>
              <li>Hybrid Git+Dits storage for optimal performance</li>
              <li>469 automated tests across many file formats</li>
              <li>Git operations work on binary creative assets</li>
              <li>Local encryption and audit logging</li>
              <li>P2P networking and remote sync (roadmap)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="not-prose grid gap-4 md:grid-cols-2 lg:grid-cols-3 my-8">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="group no-underline">
            <Card className="h-full transition-colors hover:border-brand/40">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-brand/10">
                    <section.icon className="h-5 w-5 text-brand" />
                  </div>
                  {section.badge && (
                    <Badge variant="secondary">{section.badge}</Badge>
                  )}
                </div>
                <CardTitle className="mt-4 flex items-center gap-1.5">
                  {section.title}
                  <ArrowRight className="size-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </CardTitle>
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
      <CodeBlock
        language="bash"
        code={`# Initialize a new repository
dits init

# Add files to staging
dits add video.mp4
dits add footage/

# Check status
dits status

# Commit changes
dits commit -m "Add raw footage"

# View history
dits log`}
      />

      <h3>Branching</h3>
      <CodeBlock
        language="bash"
        code={`# Create a branch
dits branch feature/color-grade

# Switch to branch
dits switch feature/color-grade

# Merge branch
dits switch main
dits merge feature/color-grade`}
      />

      <h3>Remote Operations (roadmap)</h3>
      <p>
        Networked commands are not yet implemented &mdash; today they print
        placeholders and transfer no data. The example below is illustrative of the
        intended interface.
      </p>
      <CodeBlock
        language="bash"
        code={`# (planned) Add a remote
dits remote add origin /path/to/remote

# Push changes
dits push origin main

# Pull changes
dits pull origin main

# Clone a repository
dits clone /path/to/repo my-project`}
      />

      <h2>Implementation Status</h2>
      <p>
        The local Dits CLI is covered by 469 automated tests. The commands below
        work today on your machine:
      </p>

      <div className="not-prose flex flex-wrap gap-2 my-4">
        {implementedCommands.map((cmd) => (
          <Badge key={cmd} variant="outline" className="font-mono">
            {cmd}
          </Badge>
        ))}
      </div>

      <p>
        These commands are <strong>roadmap</strong> &mdash; networked features that
        are not yet built. Today they print placeholders and transfer no data:
      </p>

      <div className="not-prose flex flex-wrap gap-2 my-4">
        {roadmapCommands.map((cmd) => (
          <Badge key={cmd} variant="secondary" className="font-mono">
            {cmd}
          </Badge>
        ))}
      </div>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-6">
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-brand flex items-center gap-2"><Check className="h-5 w-5" /> Complete VCS (60+ Commands)</h3>
          <p className="text-sm text-muted-foreground">
            Full Git-compatible workflow + advanced operations: branching, merging, rebasing, stashing, worktrees, hooks, maintenance
          </p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-brand flex items-center gap-2"><Check className="h-5 w-5" /> Comprehensive Media Support</h3>
          <p className="text-sm text-muted-foreground">
            80+ file formats tested: MP4/MOV video, 3D models (OBJ/FBX/glTF), game assets (Unity/Unreal), images, audio, custom formats
          </p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-brand flex items-center gap-2"><Check className="h-5 w-5" /> Local Security &amp; Storage</h3>
          <p className="text-sm text-muted-foreground">
            Encryption, audit logging, VFS mounting, and cross-platform support work today. Redis caching and P2P networking are on the roadmap.
          </p>
        </div>
      </div>

      <div className="not-prose bg-muted/40 border border-border rounded-lg p-6 my-8">
        <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2"><Beaker className="h-5 w-5 text-brand" /> Testing Infrastructure</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium mb-2">469 Automated Tests</h4>
            <ul className="text-sm space-y-1">
              <li>Git-inspired shell script framework</li>
              <li>Creative asset format validation</li>
              <li>Git operations on binary files</li>
              <li>Cross-platform compatibility</li>
              <li>1TB workload simulation</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Quality Assurance</h4>
            <ul className="text-sm space-y-1">
              <li>Chainlint for test script validation</li>
              <li>Performance regression testing</li>
              <li>Memory leak detection</li>
              <li>Network failure simulation</li>
              <li>Corruption recovery testing</li>
            </ul>
          </div>
        </div>
      </div>

      <h2>Key Features</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold mb-3">Core Technology</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>Content-Defined Chunking:</strong> FastCDC streaming algorithm with 90% memory reduction, unlimited file sizes, and video-aware optimizations
            </li>
            <li>
              <strong>Hybrid Git+Dits Storage:</strong> Optimal performance for text files (Git) and binary assets (Dits)
            </li>
            <li>
              <strong>BLAKE3 Cryptographic Hashing:</strong> Fast, parallelizable hashing for content addressing
            </li>
            <li>
              <strong>Redis Caching Layer (roadmap):</strong> Distributed caching for massive repository performance
            </li>
            <li>
              <strong>QUIC Transport (roadmap):</strong> High-performance UDP-based networking with resumable transfers
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-3">Creative Workflow Support</h3>
          <ul className="space-y-2 list-disc list-inside">
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
              <strong>P2P Networking (roadmap):</strong> Decentralized collaboration and asset sharing
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
          <strong>469 Automated Tests:</strong> Git-inspired shell script framework covering all features and file formats
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
        Whether you&apos;re a developer, creative professional, or just curious about version control for large files,
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
    </>
  );
}
