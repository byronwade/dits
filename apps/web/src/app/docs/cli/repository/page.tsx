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
import { FolderGit2, Info, Plus, Copy, Globe, BarChart } from "lucide-react";

export const metadata: Metadata = {
  title: "Repository Commands",
  description: "Commands for creating, cloning, and managing Dits repositories",
};

const commands = [
  { command: "init", description: "Initialize a new repository", usage: "dits init [OPTIONS] [PATH]" },
  { command: "clone", description: "Clone a repository", usage: "dits clone [OPTIONS] <URL> [DIR]" },
  { command: "remote", description: "Manage remote repositories", usage: "dits remote <SUBCOMMAND>" },
  { command: "status", description: "Show working tree status", usage: "dits status [OPTIONS] [PATH]" },
];

export default function RepositoryCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <FolderGit2 className="h-8 w-8 text-blue-500" />
        <h1 className="mb-0">Repository Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Create, clone, and manage Dits repositories. These foundational commands
        set up your version control environment for large binary files.
      </p>

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
        <Plus className="h-5 w-5" />
        dits init
      </h2>
      <p>
        Initialize a new Dits repository in the current or specified directory.
        Creates the <code>.dits</code> directory structure and sets up initial
        configuration.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits init [OPTIONS] [PATH]</code>
      </pre>

      <h3>Arguments</h3>
      <ul>
        <li><code>PATH</code> - Directory to initialize (default: current directory)</li>
      </ul>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--bare                Create a bare repository (no working directory)
--template <PATH>     Use custom template directory
--initial-branch <NAME>  Set initial branch name (default: main)
--shared              Set up for shared/team use with relaxed permissions`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Initialize in current directory
$ dits init
Initialized empty Dits repository in /home/user/project/.dits/

# Initialize in specific directory
$ dits init my-project
Initialized empty Dits repository in /home/user/my-project/.dits/

# Initialize with custom initial branch
$ dits init --initial-branch production
Initialized empty Dits repository with branch 'production'

# Create a bare repository for sharing
$ dits init --bare project.dits
Initialized empty bare Dits repository in /home/user/project.dits/`}</code>
      </pre>

      <h3>Repository Structure</h3>
      <pre className="not-prose">
        <code>{`.dits/
├── HEAD                    # Current branch reference
├── config                  # Repository configuration
├── index                   # Staging area
├── objects/
│   ├── chunks/             # Content chunks
│   ├── assets/             # Asset manifests
│   ├── trees/              # Tree manifests
│   ├── commits/            # Commit objects
│   └── packs/              # Packed objects
├── refs/
│   ├── heads/              # Local branches
│   ├── remotes/            # Remote tracking
│   └── tags/               # Tags
└── hooks/                  # Repository hooks`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <Copy className="h-5 w-5" />
        dits clone
      </h2>
      <p>
        Clone a repository from a remote source. Supports partial clones for
        large repositories - download metadata first, then hydrate files on demand.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits clone [OPTIONS] &lt;URL&gt; [DIRECTORY]</code>
      </pre>

      <h3>Arguments</h3>
      <ul>
        <li><code>URL</code> - Repository URL (https://, dits://, or local path)</li>
        <li><code>DIRECTORY</code> - Local directory name (default: derived from URL)</li>
      </ul>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--shallow              Clone only latest commit (no history)
--depth <N>            Clone only last N commits
--branch <NAME>        Clone specific branch
--single-branch        Clone only one branch
--no-checkout          Clone without checking out files
--sparse               Enable sparse checkout (partial working dir)
--filter <SPEC>        Partial clone filter (e.g., blob:none)
--progress             Show progress during clone`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Basic clone
$ dits clone https://dits.example.com/team/project
Cloning into 'project'...
remote: Counting objects: 1,234
remote: Total 1,234 (delta 0)
Receiving objects: 100% (1,234/1,234), 45.2 MB | 12.3 MB/s
Resolving deltas: 100% (567/567)
Hydrating files: 100% (89/89), done.

# Clone to specific directory
$ dits clone https://dits.example.com/team/project my-copy

# Clone specific branch
$ dits clone --branch feature/vfx https://dits.example.com/team/project

# Shallow clone (metadata only - fastest)
$ dits clone --filter blob:none https://dits.example.com/team/project
Cloning into 'project'...
Metadata fetched: 15 MB
Repository ready (125 TB of files available on demand)

# Clone with limited history
$ dits clone --depth 10 https://dits.example.com/team/project`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Partial Clones for Large Repositories</AlertTitle>
        <AlertDescription>
          For repositories with hundreds of gigabytes or terabytes of data, use
          <code>--filter blob:none</code> to download only metadata. Files will be
          fetched on-demand when accessed. This provides instant access without
          waiting for full downloads.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <Globe className="h-5 w-5" />
        dits remote
      </h2>
      <p>
        Manage connections to remote repositories. Configure where to push and
        pull changes.
      </p>

      <h3>Subcommands</h3>

      <h4>dits remote (list)</h4>
      <pre className="not-prose">
        <code>{`dits remote [-v]

List configured remotes. Use -v to show URLs.`}</code>
      </pre>

      <h4>dits remote add</h4>
      <pre className="not-prose">
        <code>{`dits remote add <NAME> <URL>

Add a new remote.`}</code>
      </pre>

      <h4>dits remote remove</h4>
      <pre className="not-prose">
        <code>{`dits remote remove <NAME>

Remove a remote.`}</code>
      </pre>

      <h4>dits remote rename</h4>
      <pre className="not-prose">
        <code>{`dits remote rename <OLD> <NEW>

Rename a remote.`}</code>
      </pre>

      <h4>dits remote set-url</h4>
      <pre className="not-prose">
        <code>{`dits remote set-url <NAME> <URL>

Change a remote's URL.`}</code>
      </pre>

      <h4>dits remote show</h4>
      <pre className="not-prose">
        <code>{`dits remote show <NAME>

Show detailed information about a remote.`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# List remotes
$ dits remote
origin

# List with URLs
$ dits remote -v
origin  https://dits.example.com/team/project (fetch)
origin  https://dits.example.com/team/project (push)

# Add a remote
$ dits remote add backup https://backup.example.com/project
Remote 'backup' added.

# Show remote details
$ dits remote show origin
* remote origin
  Fetch URL: https://dits.example.com/team/project
  Push URL: https://dits.example.com/team/project
  HEAD branch: main
  Remote branches:
    main        tracked
    feature/vfx tracked
  Local branch configured for 'dits pull':
    main merges with remote main

# Change remote URL
$ dits remote set-url origin https://new.example.com/project

# Remove a remote
$ dits remote remove backup`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <BarChart className="h-5 w-5" />
        dits status
      </h2>
      <p>
        Show the current state of the repository and working directory. Displays
        staged changes, modified files, and untracked files.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits status [OPTIONS] [PATHSPEC...]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`-s, --short          Give output in short format
-b, --branch         Show branch info even in short format
--porcelain          Machine-readable output (for scripts)
--ignored            Show ignored files
--untracked <MODE>   Show untracked files (no, normal, all)`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Full status
$ dits status
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
  (use "dits restore --staged <file>..." to unstage)
        new file:   footage/scene03.mov

Changes not staged for commit:
  (use "dits add <file>..." to update what will be committed)
  (use "dits restore <file>..." to discard changes)
        modified:   project.prproj

Untracked files:
  (use "dits add <file>..." to include in what will be committed)
        footage/test-shots/

# Short format
$ dits status -s
A  footage/scene03.mov
 M project.prproj
?? footage/test-shots/

# Machine-readable format
$ dits status --porcelain
A  footage/scene03.mov
 M project.prproj
?? footage/test-shots/

# Check specific path
$ dits status footage/
On branch main
Changes not staged for commit:
        modified:   footage/scene01.mov`}</code>
      </pre>

      <h3>Status Codes</h3>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Staged</TableHead>
            <TableHead>Unstaged</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">A</TableCell>
            <TableCell>Added</TableCell>
            <TableCell>-</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">M</TableCell>
            <TableCell>Modified</TableCell>
            <TableCell>Modified</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">D</TableCell>
            <TableCell>Deleted</TableCell>
            <TableCell>Deleted</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">R</TableCell>
            <TableCell>Renamed</TableCell>
            <TableCell>-</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">??</TableCell>
            <TableCell>-</TableCell>
            <TableCell>Untracked</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">!!</TableCell>
            <TableCell>-</TableCell>
            <TableCell>Ignored</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/files">File Commands</Link> - Add, stage, and manage files
        </li>
        <li>
          <Link href="/docs/cli/remotes">Remote Commands</Link> - Push, pull, and sync
        </li>
        <li>
          <Link href="/docs/cli/branches">Branch Commands</Link> - Create and manage branches
        </li>
      </ul>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/concepts/repositories">Repository Concepts</Link> - Understanding Dits repositories
        </li>
        <li>
          <Link href="/docs/configuration">Configuration</Link> - Configure repository settings
        </li>
      </ul>
    </div>
  );
}
