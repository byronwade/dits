import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import { CodeBlock } from "@/components/ui/code-block";
import {
  FolderGit2,
  Files,
  GitBranch,
  History,
  Cloud,
  Lock,
  HardDrive,
  Video,
  Layers,
  Shield,
  FileSearch,
  Activity,
  Settings,
} from "lucide-react";

import { generateMetadata as genMeta, generateArticleSchema, generateItemListSchema, generateCollectionPageSchema, generateBreadcrumbSchema } from "@/lib/seo";
import Script from "next/script";

export const metadata: Metadata = genMeta({
  title: "Dits CLI Reference - Alpha Commands and Status",
  description: "Command reference for the Dits alpha, with supported local operations, experimental features, and disabled commands labeled explicitly.",
  canonical: "https://dits.dev/docs/cli-reference",
  keywords: [
    "dits cli",
    "dits commands",
    "dits command reference",
    "dits cli documentation",
    "dits terminal commands",
    "version control commands",
    "dits cli guide",
    "dits command line",
  ],
  openGraph: {
    type: "article",
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "Dits CLI Reference - Alpha Commands and Status",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
});

const commandCategories = [
  {
    title: "Repository Management",
    description: "Initialize, clone, and manage repositories",
    icon: FolderGit2,
    href: "/docs/cli/repository",
    commands: ["init", "clone", "remote", "status", "config"],
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    title: "Advanced Git Operations",
    description: "Rebase, cherry-pick, bisect, reflog, and more",
    icon: GitBranch,
    href: "/docs/cli/advanced",
    commands: ["rebase", "cherry-pick", "bisect", "reflog", "blame", "show", "grep", "worktree", "sparse-checkout", "hooks", "archive", "describe", "shortlog", "maintenance", "completions"],
    color: "text-brand",
    bgColor: "bg-brand/10",
  },
  {
    title: "File Operations",
    description: "Stage, restore, and diff files",
    icon: Files,
    href: "/docs/cli/files",
    commands: ["add", "restore", "diff"],
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Branching & Merging",
    description: "Manage branches, merge, and navigate history",
    icon: GitBranch,
    href: "/docs/cli/branches",
    commands: ["branch", "switch", "checkout", "merge", "stash", "reset", "tag"],
    color: "text-brand",
    bgColor: "bg-brand/10",
  },
  {
    title: "History & Inspection",
    description: "View commits, logs, and file history",
    icon: History,
    href: "/docs/cli/history",
    commands: ["log", "show", "commit", "diff"],
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "Remote Operations",
    description: "Configure remotes; repository transfer is disabled",
    icon: Cloud,
    href: "/docs/cli/remotes",
    commands: ["push", "pull", "fetch", "sync"],
    color: "text-brand",
    bgColor: "bg-brand/10",
  },
  {
    title: "File Locking",
    description: "Lock files for exclusive editing in teams",
    icon: Lock,
    href: "/docs/cli/locks",
    commands: ["lock", "unlock", "locks"],
    color: "text-brand",
    bgColor: "bg-brand/10",
  },
  {
    title: "Virtual Filesystem",
    description: "Feature-gated experimental local mounts",
    icon: HardDrive,
    href: "/docs/cli/vfs",
    commands: ["mount", "unmount", "cache-stats"],
    color: "text-brand",
    bgColor: "bg-brand/10",
  },
  {
    title: "Peer-to-peer",
    description: "Disabled design scaffolding; all operations fail closed",
    icon: Cloud,
    href: "/docs/cli/p2p",
    commands: ["p2p"],
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "Video & Media",
    description: "Video-specific operations and timelines",
    icon: Video,
    href: "/docs/cli/video",
    commands: ["inspect", "segment", "assemble", "roundtrip", "video-init", "video-add-clip", "video-show", "video-list"],
    color: "text-brand",
    bgColor: "bg-brand/10",
  },
  {
    title: "Proxy Files",
    description: "Generate and manage lightweight proxy files",
    icon: Layers,
    href: "/docs/cli/proxies",
    commands: ["proxy-generate", "proxy-status", "proxy-list", "proxy-delete"],
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "Metadata",
    description: "Extract and query file metadata",
    icon: FileSearch,
    href: "/docs/cli/metadata",
    commands: ["meta-scan", "meta-show", "meta-list"],
    color: "text-brand",
    bgColor: "bg-brand/10",
  },
  {
    title: "Dependencies",
    description: "Track project file dependencies",
    icon: Activity,
    href: "/docs/cli/dependencies",
    commands: ["dep-check", "dep-graph", "dep-list"],
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    title: "Storage Tiers",
    description: "Manage hot, warm, and cold storage",
    icon: HardDrive,
    href: "/docs/cli/storage",
    commands: ["freeze-init", "freeze-status", "freeze", "thaw", "freeze-policy"],
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    title: "Encryption",
    description: "Inspect or clear legacy encryption state",
    icon: Shield,
    href: "/docs/cli/encryption",
    commands: ["encrypt-init", "encrypt-status", "login", "logout", "change-password"],
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Audit Logging",
    description: "Track and export repository activity",
    icon: FileSearch,
    href: "/docs/cli/audit",
    commands: ["audit", "audit-stats", "audit-export"],
    color: "text-brand",
    bgColor: "bg-brand/10",
  },
  {
    title: "Maintenance",
    description: "Read-only GC reporting, integrity checks, and stats",
    icon: Settings,
    href: "/docs/cli/maintenance",
    commands: ["gc", "fsck", "repo-stats", "inspect-file", "config"],
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  {
    title: "Telemetry",
    description: "Manage opt-in CLI telemetry",
    icon: Activity,
    href: "/docs/architecture/security#cli-telemetry",
    commands: ["telemetry enable", "telemetry disable", "telemetry status"],
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
];

const allCommands = [
  // Repository
  { name: "init", description: "Initialize a new repository", category: "Repository", status: "stable" },
  { name: "clone", description: "Clone from a local filesystem path; network URLs fail nonzero", category: "Repository", status: "local only" },
  { name: "remote", description: "Store and inspect remote names and URLs; no data transfer", category: "Repository", status: "config only" },
  { name: "status", description: "Show working tree status", category: "Repository", status: "stable" },
  // Files
  { name: "add", description: "Add files to staging area", category: "Files", status: "stable" },
  { name: "restore", description: "Restore working tree files", category: "Files", status: "stable" },
  { name: "diff", description: "Show changes between commits", category: "Files", status: "stable" },
  // History
  { name: "commit", description: "Record changes to the repository", category: "History", status: "stable" },
  { name: "log", description: "Show commit history", category: "History", status: "stable" },
  { name: "show", description: "Show various types of objects", category: "History", status: "stable" },
  { name: "tag", description: "Create, list, or delete tags", category: "History", status: "stable" },
  // Branches
  { name: "branch", description: "List, create, or delete branches", category: "Branches", status: "stable" },
  { name: "switch", description: "Switch to a branch", category: "Branches", status: "stable" },
  { name: "checkout", description: "Switch branches or restore files", category: "Branches", status: "stable" },
  { name: "merge", description: "Merge branches", category: "Branches", status: "stable" },
  { name: "stash", description: "Stash changes temporarily", category: "Branches", status: "stable" },
  { name: "reset", description: "Reset HEAD to a specific state", category: "Branches", status: "stable" },
  // Advanced Git Operations
  { name: "rebase", description: "Rebase commits", category: "Advanced Git", status: "stable" },
  { name: "cherry-pick", description: "Apply specific commits", category: "Advanced Git", status: "stable" },
  { name: "bisect", description: "Binary search for bugs", category: "Advanced Git", status: "stable" },
  { name: "reflog", description: "Show reference logs", category: "Advanced Git", status: "stable" },
  { name: "blame", description: "Show authorship by line", category: "Advanced Git", status: "stable" },
  { name: "show", description: "Show various types of objects", category: "Advanced Git", status: "stable" },
  { name: "grep", description: "Search repository content", category: "Advanced Git", status: "stable" },
  { name: "worktree", description: "Manage multiple worktrees", category: "Advanced Git", status: "stable" },
  { name: "sparse-checkout", description: "Check out only specified paths", category: "Advanced Git", status: "stable" },
  { name: "hooks", description: "Manage Git hooks", category: "Advanced Git", status: "stable" },
  { name: "archive", description: "Create archives", category: "Advanced Git", status: "stable" },
  { name: "describe", description: "Describe commits with tags", category: "Advanced Git", status: "stable" },
  { name: "shortlog", description: "Summarize git log output", category: "Advanced Git", status: "stable" },
  { name: "maintenance", description: "Run maintenance tasks", category: "Advanced Git", status: "stable" },
  { name: "completions", description: "Generate shell completions", category: "Advanced Git", status: "stable" },
  // Remotes
  { name: "push", description: "Disabled; fails nonzero without transferring data or changing the repository", category: "Remotes", status: "disabled" },
  { name: "pull", description: "Disabled; fails nonzero without fetching, merging, or changing the repository", category: "Remotes", status: "disabled" },
  { name: "fetch", description: "Disabled; fails nonzero without downloading objects or updating refs", category: "Remotes", status: "disabled" },
  { name: "sync", description: "Disabled; fails nonzero without bidirectional synchronization", category: "Remotes", status: "disabled" },
  // Locks
  { name: "lock", description: "Lock files for exclusive editing", category: "Locks", status: "stable" },
  { name: "unlock", description: "Release file locks", category: "Locks", status: "stable" },
  { name: "locks", description: "List active locks", category: "Locks", status: "stable" },
  // VFS
  { name: "mount", description: "Experimental local FUSE mount; absent from default builds", category: "VFS", status: "feature gated" },
  { name: "unmount", description: "Experimental local FUSE unmount; absent from default builds", category: "VFS", status: "feature gated" },
  { name: "cache-stats", description: "Show VFS cache statistics", category: "VFS", status: "stable" },
  // P2P
  { name: "p2p", description: "Disabled; every operation fails before changing repository, directory, cache, socket, or mount state", category: "P2P", status: "disabled" },
  // Video
  { name: "inspect", description: "Inspect MP4/MOV structure", category: "Video", status: "stable" },
  { name: "inspect-file", description: "Inspect file dedup stats", category: "Video", status: "stable" },
  { name: "segment", description: "Segment video into chunks", category: "Video", status: "stable" },
  { name: "assemble", description: "Reassemble segmented video", category: "Video", status: "stable" },
  { name: "roundtrip", description: "Test MP4 deconstruct/reconstruct", category: "Video", status: "stable" },
  { name: "video-init", description: "Initialize video timeline project", category: "Video", status: "stable" },
  { name: "video-add-clip", description: "Add clip to video timeline", category: "Video", status: "stable" },
  { name: "video-show", description: "Show a video timeline", category: "Video", status: "stable" },
  { name: "video-list", description: "List all video projects", category: "Video", status: "stable" },
  // Proxies
  { name: "proxy-generate", description: "Generate proxy files for videos", category: "Proxies", status: "stable" },
  { name: "proxy-status", description: "Show proxy generation status", category: "Proxies", status: "stable" },
  { name: "proxy-list", description: "List all generated proxies", category: "Proxies", status: "stable" },
  { name: "proxy-delete", description: "Delete generated proxies", category: "Proxies", status: "stable" },
  // Metadata
  { name: "meta-scan", description: "Scan and extract file metadata", category: "Metadata", status: "stable" },
  { name: "meta-show", description: "Show metadata for a file", category: "Metadata", status: "stable" },
  { name: "meta-list", description: "List all stored metadata", category: "Metadata", status: "stable" },
  // Dependencies
  { name: "dep-check", description: "Check project file dependencies", category: "Dependencies", status: "stable" },
  { name: "dep-graph", description: "Show dependency graph", category: "Dependencies", status: "stable" },
  { name: "dep-list", description: "List all project files", category: "Dependencies", status: "stable" },
  // Storage
  { name: "freeze-init", description: "Initialize lifecycle tracking", category: "Storage", status: "stable" },
  { name: "freeze-status", description: "Show storage tier status", category: "Storage", status: "stable" },
  { name: "freeze", description: "Move chunks to colder storage", category: "Storage", status: "stable" },
  { name: "thaw", description: "Restore chunks from cold storage", category: "Storage", status: "stable" },
  { name: "freeze-policy", description: "Set or view lifecycle policy", category: "Storage", status: "stable" },
  // Encryption
  { name: "encrypt-init", description: "Disabled; fails nonzero without changing repository or keystore data", category: "Encryption", status: "disabled" },
  { name: "encrypt-status", description: "Report whether a legacy experimental keystore is present", category: "Encryption", status: "diagnostic" },
  { name: "login", description: "Disabled; fails nonzero without loading or caching a key", category: "Encryption", status: "disabled" },
  { name: "logout", description: "Clear a legacy experimental on-disk key cache", category: "Encryption", status: "legacy only" },
  { name: "change-password", description: "Disabled; fails nonzero without changing the keystore", category: "Encryption", status: "disabled" },
  // Audit
  { name: "audit", description: "Show audit log", category: "Audit", status: "stable" },
  { name: "audit-stats", description: "Show audit statistics", category: "Audit", status: "stable" },
  { name: "audit-export", description: "Export audit log to JSON", category: "Audit", status: "stable" },
  // Maintenance
  { name: "gc", description: "Read-only unreachable-object report; destructive deletion is disabled", category: "Maintenance", status: "diagnostic" },
  { name: "fsck", description: "Verify repository integrity", category: "Maintenance", status: "stable" },
  { name: "repo-stats", description: "Show repository statistics", category: "Maintenance", status: "stable" },
  { name: "config", description: "Get and set configuration", category: "Maintenance", status: "stable" },
  // Telemetry
  { name: "telemetry enable", description: "Enable telemetry data collection", category: "Telemetry", status: "stable" },
  { name: "telemetry disable", description: "Disable telemetry data collection", category: "Telemetry", status: "stable" },
  { name: "telemetry status", description: "Show current telemetry settings", category: "Telemetry", status: "stable" },
];

export default function CLIReferencePage() {
  // Generate ItemList schema for all CLI commands
  const commandListSchema = generateItemListSchema({
    name: "Dits CLI Commands",
    description: "Dits alpha commands with current support status",
    items: allCommands.map((cmd, index) => ({
      name: cmd.name,
      description: cmd.description,
      url: `/docs/cli-reference#${cmd.name}`,
      position: index + 1,
    })),
  });

  // Generate Article schema for the documentation page
  const articleSchema = generateArticleSchema({
    headline: "Dits CLI Reference - Alpha Commands and Status",
    description: "Command reference for the Dits alpha, with supported local operations, experimental features, and disabled commands labeled explicitly.",
    author: "Byron Wade",
    section: "Documentation",
    tags: ["cli", "commands", "reference", "documentation", "terminal"],
  });

  // Generate CollectionPage schema
  const collectionSchema = generateCollectionPageSchema({
    name: "Dits CLI Reference",
    description: "Complete reference for all Dits CLI commands",
    url: "/docs/cli-reference",
    breadcrumb: [
      { name: "Home", url: "/" },
      { name: "Documentation", url: "/docs" },
      { name: "CLI Reference", url: "/docs/cli-reference" },
    ],
    mainEntity: commandListSchema,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Documentation", url: "/docs" },
    { name: "CLI Reference", url: "/docs/cli-reference" },
  ]);

  return (
    <>
      <Script
        id="command-list-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(commandListSchema),
        }}
      />
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />
      <Script
        id="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionSchema),
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
        eyebrow="CLI Reference"
        title="CLI Reference"
        description="Reference for the current Dits CLI, with local, experimental, and roadmap commands distinguished explicitly."
      />

      <Callout type="important" className="not-prose my-6">
        <strong>The alpha is local-first and remote transfer fails closed.</strong>{" "}
        The local Dits CLI includes init, add, commit, branch, diff, log, and other
        Git-shaped paths; VFS and media-specific paths are experimental. Local-path
        <code> clone</code> works, and <code>remote</code> stores configuration. The
        <code> push</code>, <code>pull</code>, <code>fetch</code>, and <code>sync</code>{" "}
        commands return nonzero for local and network remotes without making changes.
        Every P2P operation and repository encryption are also disabled; see each
        row&apos;s status below.
      </Callout>

      <h2>Global Options</h2>
      <p>The top-level <code>dits</code> parser accepts only help and version:</p>
      <CodeBlock
        language="text"
        code={`-h, --help       Show help
-V, --version    Show the Dits version`}
      />
      <p>
        Subcommands define their own flags. <code>--verbose</code>,{" "}
        <code>--quiet</code>, <code>--no-color</code>, <code>--json</code>,{" "}
        <code>-C</code>, and command-scoped config overrides are not global options.
      </p>

      <h2>Command Categories</h2>
      <p>
        Commands are organized into logical categories. Click on a category to see
        detailed documentation for each command.
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-2 lg:grid-cols-3 my-8">
        {commandCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Link key={category.title} href={category.href}>
              <Card className="h-full hover:border-brand/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center mb-2`}>
                    <Icon className={`h-5 w-5 ${category.color}`} />
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {category.commands.slice(0, 5).map((cmd) => (
                      <Badge key={cmd} variant="secondary" className="font-mono text-xs">
                        {cmd}
                      </Badge>
                    ))}
                    {category.commands.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{category.commands.length - 5} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <h2>Quick Reference Table</h2>
      <p>
        All commands at a glance. Use the category pages above for detailed documentation
        with examples and options.
      </p>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Command</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[120px]">Category</TableHead>
            <TableHead className="w-[80px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allCommands.map((cmd) => (
            <TableRow key={cmd.name}>
              <TableCell className="font-mono font-medium">{cmd.name}</TableCell>
              <TableCell>{cmd.description}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {cmd.category}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={cmd.status === "stable" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {cmd.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2>Environment Variables</h2>
      <p>
        Commit identity is the only Dits-specific input currently read from the
        environment. General environment-based configuration overrides are not
        implemented.
      </p>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Value</TableHead>
            <TableHead>Lookup order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Commit author name</TableCell>
            <TableCell className="font-mono text-sm">
              DITS_AUTHOR_NAME → GIT_AUTHOR_NAME → USER → Unknown
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Commit author email</TableCell>
            <TableCell className="font-mono text-sm">
              DITS_AUTHOR_EMAIL → GIT_AUTHOR_EMAIL → &lt;name&gt;@localhost
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p>
        Hook subprocesses receive <code>DITS_DIR</code> and <code>DITS_HOOK</code> as
        context. Setting <code>DITS_DIR</code> before running the CLI does not redirect
        repository discovery. See the{" "}
        <Link href="/docs/configuration/env">environment reference</Link> for unsupported
        names that appeared in older drafts.
      </p>

      <h2>Exit Codes</h2>
      <p>
        The current CLI distinguishes success, runtime failure, and parser usage
        failure. It does not implement the detailed authentication, network,
        repository, lock, or merge-conflict code taxonomy shown in older drafts.
      </p>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Code</TableHead>
            <TableHead>Meaning</TableHead>
            <TableHead>Current meaning</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">0</TableCell>
            <TableCell>Success</TableCell>
            <TableCell>The requested local operation completed successfully</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">1</TableCell>
            <TableCell>Command/runtime error</TableCell>
            <TableCell>Includes fail-closed commands and integrity failures</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">2</TableCell>
            <TableCell>Parser usage error</TableCell>
            <TableCell>Invalid command, argument, or option</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Common Workflows</h2>

      <h3>Initial Setup</h3>
      <CodeBlock
        language="bash"
        code={`# Set the identity currently consumed by commits
export DITS_AUTHOR_NAME="Your Name"
export DITS_AUTHOR_EMAIL="you@example.com"

# Clone an existing local repository
dits clone /path/to/existing-repository project
cd project

# Or initialize a new one
dits init my-new-project
cd my-new-project`}
      />

      <h3>Daily Workflow</h3>
      <CodeBlock
        language="bash"
        code={`# Check what's changed
dits status

# Work on your files...

# Stage and commit changes
dits add footage/scene01.mov
dits commit -m "Color grade scene 1"

# Inspect local history
dits log`}
      />

      <h3>Experimental local FUSE build</h3>
      <p>
        Mount and unmount are absent from default binaries. Source builds can
        enable the experimental local <code>fuser</code> feature on a machine with
        the required OS FUSE support. This is not remote or on-demand hydration.
      </p>
      <CodeBlock
        language="bash"
        code={`cargo build --release -p dits --features fuser
./target/release/dits mount /mnt/project
./target/release/dits unmount /mnt/project`}
      />

      <h3>Working with Video</h3>
      <CodeBlock
        language="bash"
        code={`# Inspect video structure
dits inspect footage/hero.mov

# Check deduplication stats
dits inspect-file footage/hero.mov

# Generate proxy files for offline editing
dits proxy-generate --resolution 1080p footage/

# Check proxy status
dits proxy-status`}
      />

      <Callout type="note" title="Need Help?" className="not-prose my-6">
        Use <code>dits help &lt;command&gt;</code> or <code>dits &lt;command&gt; --help</code> to
        get detailed help for any command directly in your terminal.
      </Callout>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/getting-started">Getting Started</Link> - Quick start guide
        </li>
        <li>
          <Link href="/docs/configuration">Configuration</Link> - Configure Dits behavior
        </li>
        <li>
          <Link href="/docs/concepts">Core Concepts</Link> - Understanding how Dits works
        </li>
      </ul>
    </div>
    </>
  );
}
