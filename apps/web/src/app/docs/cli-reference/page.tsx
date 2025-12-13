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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Terminal,
  Info,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "CLI Reference",
  description: "Complete command line reference for Dits - 60+ commands for comprehensive version control of creative assets",
};

const commandCategories = [
  {
    title: "Repository Management",
    description: "Initialize, clone, and manage repositories",
    icon: FolderGit2,
    href: "/docs/cli/repository",
    commands: ["init", "clone", "remote", "status", "config"],
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Advanced Git Operations",
    description: "Rebase, cherry-pick, bisect, reflog, and more",
    icon: GitBranch,
    href: "/docs/cli/advanced",
    commands: ["rebase", "cherry-pick", "bisect", "reflog", "blame", "show", "grep", "worktree", "sparse-checkout", "hooks", "archive", "describe", "shortlog", "maintenance", "completions"],
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  {
    title: "File Operations",
    description: "Stage, restore, and diff files",
    icon: Files,
    href: "/docs/cli/files",
    commands: ["add", "restore", "diff", "rm", "mv"],
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Branching & Merging",
    description: "Manage branches, merge, and navigate history",
    icon: GitBranch,
    href: "/docs/cli/branches",
    commands: ["branch", "switch", "checkout", "merge", "stash", "reset", "tag"],
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    title: "History & Inspection",
    description: "View commits, logs, and file history",
    icon: History,
    href: "/docs/cli/history",
    commands: ["log", "show", "commit", "diff"],
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Remote Operations",
    description: "Push, pull, and sync with remote repositories",
    icon: Cloud,
    href: "/docs/cli/remotes",
    commands: ["push", "pull", "fetch", "sync"],
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    title: "File Locking",
    description: "Lock files for exclusive editing in teams",
    icon: Lock,
    href: "/docs/cli/locks",
    commands: ["lock", "unlock", "locks"],
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    title: "Virtual Filesystem",
    description: "Mount repositories as virtual drives",
    icon: HardDrive,
    href: "/docs/cli/vfs",
    commands: ["mount", "unmount", "cache-stats"],
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  {
    title: "Video & Media",
    description: "Video-specific operations and timelines",
    icon: Video,
    href: "/docs/cli/video",
    commands: ["inspect", "segment", "assemble", "roundtrip", "video-init", "video-add-clip", "video-show", "video-list"],
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    title: "Proxy Files",
    description: "Generate and manage lightweight proxy files",
    icon: Layers,
    href: "/docs/cli/proxies",
    commands: ["proxy-generate", "proxy-status", "proxy-list", "proxy-delete"],
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    title: "Metadata",
    description: "Extract and query file metadata",
    icon: FileSearch,
    href: "/docs/cli/metadata",
    commands: ["meta-scan", "meta-show", "meta-list"],
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
  },
  {
    title: "Dependencies",
    description: "Track project file dependencies",
    icon: Activity,
    href: "/docs/cli/dependencies",
    commands: ["dep-check", "dep-graph", "dep-list"],
    color: "text-lime-500",
    bgColor: "bg-lime-500/10",
  },
  {
    title: "Storage Tiers",
    description: "Manage hot, warm, and cold storage",
    icon: HardDrive,
    href: "/docs/cli/storage",
    commands: ["freeze-init", "freeze-status", "freeze", "thaw", "freeze-policy"],
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
  },
  {
    title: "Encryption",
    description: "Encrypt repositories and manage keys",
    icon: Shield,
    href: "/docs/cli/encryption",
    commands: ["encrypt-init", "encrypt-status", "login", "logout", "change-password"],
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Audit Logging",
    description: "Track and export repository activity",
    icon: FileSearch,
    href: "/docs/cli/audit",
    commands: ["audit", "audit-stats", "audit-export"],
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    title: "Maintenance",
    description: "Garbage collection, integrity checks, and stats",
    icon: Settings,
    href: "/docs/cli/maintenance",
    commands: ["gc", "fsck", "repo-stats", "inspect-file", "config"],
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
  },
];

const allCommands = [
  // Repository
  { name: "init", description: "Initialize a new repository", category: "Repository", status: "stable" },
  { name: "clone", description: "Clone a repository", category: "Repository", status: "stable" },
  { name: "remote", description: "Manage remote repositories", category: "Repository", status: "stable" },
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
  { name: "push", description: "Push changes to remote", category: "Remotes", status: "stable" },
  { name: "pull", description: "Fetch and integrate changes", category: "Remotes", status: "stable" },
  { name: "fetch", description: "Download objects and refs", category: "Remotes", status: "stable" },
  { name: "sync", description: "Bi-directional sync", category: "Remotes", status: "beta" },
  // Locks
  { name: "lock", description: "Lock files for exclusive editing", category: "Locks", status: "stable" },
  { name: "unlock", description: "Release file locks", category: "Locks", status: "stable" },
  { name: "locks", description: "List active locks", category: "Locks", status: "stable" },
  // VFS
  { name: "mount", description: "Mount repository as VFS", category: "VFS", status: "stable" },
  { name: "unmount", description: "Unmount virtual filesystem", category: "VFS", status: "stable" },
  { name: "cache-stats", description: "Show VFS cache statistics", category: "VFS", status: "stable" },
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
  { name: "encrypt-init", description: "Initialize repository encryption", category: "Encryption", status: "stable" },
  { name: "encrypt-status", description: "Show encryption status", category: "Encryption", status: "stable" },
  { name: "login", description: "Login to unlock encryption keys", category: "Encryption", status: "stable" },
  { name: "logout", description: "Logout and clear cached keys", category: "Encryption", status: "stable" },
  { name: "change-password", description: "Change encryption password", category: "Encryption", status: "stable" },
  // Audit
  { name: "audit", description: "Show audit log", category: "Audit", status: "stable" },
  { name: "audit-stats", description: "Show audit statistics", category: "Audit", status: "stable" },
  { name: "audit-export", description: "Export audit log to JSON", category: "Audit", status: "stable" },
  // Maintenance
  { name: "gc", description: "Run garbage collection", category: "Maintenance", status: "stable" },
  { name: "fsck", description: "Verify repository integrity", category: "Maintenance", status: "stable" },
  { name: "repo-stats", description: "Show repository statistics", category: "Maintenance", status: "stable" },
  { name: "config", description: "Get and set configuration", category: "Maintenance", status: "stable" },
];

export default function CLIReferencePage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <Terminal className="h-8 w-8 text-primary" />
        <h1 className="mb-0">CLI Reference</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Complete reference for all 60+ Dits commands covering core Git operations, creative workflows,
        enterprise features, and advanced version control for large binary assets.
      </p>

      <Alert className="not-prose my-6">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Production-Ready Implementation</AlertTitle>
        <AlertDescription>
          All 60+ commands are fully implemented with 120+ automated tests covering 80+ file formats.
          Includes Git-compatible operations, creative workflows, enterprise security, and comprehensive testing.
        </AlertDescription>
      </Alert>

      <h2>Global Options</h2>
      <p>These options can be used with any command:</p>
      <pre className="not-prose">
        <code>{`-v, --verbose       Increase output verbosity (use -vv for debug)
-q, --quiet         Suppress non-essential output
--no-color          Disable colored output
--json              Output in JSON format (for scripting)
-C <path>           Run as if dits was started in <path>
--config <key=val>  Override config value for this command
-h, --help          Show help for command
--version           Show dits version`}</code>
      </pre>

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
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
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
        Dits behavior can be customized through environment variables. These are useful
        for scripting, CI/CD pipelines, and advanced configuration.
      </p>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Variable</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Example</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">DITS_DIR</TableCell>
            <TableCell>Override .dits directory location</TableCell>
            <TableCell className="font-mono text-sm">/custom/path/.dits</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_WORK_TREE</TableCell>
            <TableCell>Override working tree location</TableCell>
            <TableCell className="font-mono text-sm">/path/to/worktree</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_CACHE_DIR</TableCell>
            <TableCell>Override cache directory</TableCell>
            <TableCell className="font-mono text-sm">~/.cache/dits</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_CONFIG_GLOBAL</TableCell>
            <TableCell>Override global config path</TableCell>
            <TableCell className="font-mono text-sm">~/.config/dits/config</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_EDITOR</TableCell>
            <TableCell>Editor for commit messages</TableCell>
            <TableCell className="font-mono text-sm">vim</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_PAGER</TableCell>
            <TableCell>Pager for output</TableCell>
            <TableCell className="font-mono text-sm">less -R</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_TOKEN</TableCell>
            <TableCell>Authentication token for remotes</TableCell>
            <TableCell className="font-mono text-sm">dits_xxxxx</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_SERVER</TableCell>
            <TableCell>Default server URL</TableCell>
            <TableCell className="font-mono text-sm">https://dits.example.com</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_DEBUG</TableCell>
            <TableCell>Enable debug output</TableCell>
            <TableCell className="font-mono text-sm">1</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_TRACE</TableCell>
            <TableCell>Enable trace logging</TableCell>
            <TableCell className="font-mono text-sm">1</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Exit Codes</h2>
      <p>
        Dits uses standardized exit codes for scripting and automation. These codes
        help identify what type of error occurred.
      </p>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Code</TableHead>
            <TableHead>Meaning</TableHead>
            <TableHead>Example Scenario</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">0</TableCell>
            <TableCell>Success</TableCell>
            <TableCell>Command completed successfully</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">1</TableCell>
            <TableCell>General error</TableCell>
            <TableCell>Unspecified failure</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">2</TableCell>
            <TableCell>Command line usage error</TableCell>
            <TableCell>Invalid arguments or options</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">3</TableCell>
            <TableCell>Authentication error</TableCell>
            <TableCell>Invalid credentials or expired token</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">4</TableCell>
            <TableCell>Network error</TableCell>
            <TableCell>Connection failed or timed out</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">5</TableCell>
            <TableCell>Repository error</TableCell>
            <TableCell>Not a dits repository or corrupt data</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">6</TableCell>
            <TableCell>Lock conflict</TableCell>
            <TableCell>File is locked by another user</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">7</TableCell>
            <TableCell>Merge conflict</TableCell>
            <TableCell>Conflicting changes need resolution</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">128+</TableCell>
            <TableCell>Fatal error</TableCell>
            <TableCell>Signal number + 128 (e.g., SIGKILL = 137)</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Common Workflows</h2>

      <h3>Initial Setup</h3>
      <pre className="not-prose">
        <code>{`# Configure your identity
dits config --global user.name "Your Name"
dits config --global user.email "you@example.com"

# Clone a repository
dits clone https://dits.example.com/team/project
cd project

# Or initialize a new one
dits init my-new-project
cd my-new-project`}</code>
      </pre>

      <h3>Daily Workflow</h3>
      <pre className="not-prose">
        <code>{`# Start day: get latest changes
dits pull

# Check what's changed
dits status

# Lock file before editing (for binary files)
dits lock footage/scene01.mov

# Work on your files...

# Stage and commit changes
dits add footage/scene01.mov
dits commit -m "Color grade scene 1"

# Push changes to remote
dits push

# Unlock when done
dits unlock footage/scene01.mov`}</code>
      </pre>

      <h3>Using Virtual Filesystem</h3>
      <pre className="not-prose">
        <code>{`# Mount repository as virtual drive
dits mount /mnt/project

# Files appear instantly, hydrate on-demand
ls /mnt/project/footage/

# Open files directly in NLE (streams on demand)
# Edit as normal - no full download required

# When done
dits unmount /mnt/project`}</code>
      </pre>

      <h3>Working with Video</h3>
      <pre className="not-prose">
        <code>{`# Inspect video structure
dits inspect footage/hero.mov

# Check deduplication stats
dits inspect-file footage/hero.mov

# Generate proxy files for offline editing
dits proxy-generate --resolution 1080p footage/

# Check proxy status
dits proxy-status`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Need Help?</AlertTitle>
        <AlertDescription>
          Use <code>dits help &lt;command&gt;</code> or <code>dits &lt;command&gt; --help</code> to
          get detailed help for any command directly in your terminal.
        </AlertDescription>
      </Alert>

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
  );
}
