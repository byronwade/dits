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
import { Cloud, Info, Download, Upload, RefreshCw, Globe } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Remote Commands",
  description: "Commands for synchronizing with remote repositories in Dits",
};

const commands = [
  {
    command: "fetch",
    description: "Download objects and refs from remote",
    usage: "dits fetch [remote]",
  },
  {
    command: "pull",
    description: "Fetch and integrate with local branch",
    usage: "dits pull [remote] [branch]",
  },
  {
    command: "push",
    description: "Update remote refs and objects",
    usage: "dits push [remote] [branch]",
  },
  {
    command: "remote",
    description: "Manage remote repositories",
    usage: "dits remote <command>",
  },
];

export default function RemoteCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <Cloud className="h-8 w-8 text-sky-500" />
        <h1 className="mb-0">Remote Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Commands for synchronizing your local repository with remote servers.
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
        <Download className="h-5 w-5" />
        dits fetch
      </h2>
      <p>
        Download objects and refs from a remote repository without merging.
        Updates remote-tracking branches so you can see what changed before
        integrating.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits fetch [options] [remote] [refspec...]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--all            Fetch all remotes
--prune, -p      Remove stale remote-tracking branches
--tags           Fetch all tags
--depth          Limit fetch to specified depth
--dry-run        Show what would be fetched
--verbose, -v    Be verbose`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Fetch from default remote (origin)
$ dits fetch
Fetching origin...
remote: Counting objects: 45, done
remote: Finding chunks: 12,456 (8.5 GB)
Receiving objects: 100% (45/45), done
From https://example.com/project
   a1b2c3d..f5e4d3c  main       -> origin/main
 * [new branch]      feature    -> origin/feature

# Fetch from all remotes
$ dits fetch --all

# Fetch specific branch
$ dits fetch origin feature/audio

# Prune deleted remote branches
$ dits fetch --prune
From https://example.com/project
 - [deleted]         origin/old-feature

# See what would be fetched
$ dits fetch --dry-run
Would fetch:
  main: a1b2c3d → f5e4d3c (12 new chunks)
  feature: new branch (8,456 chunks)`}
      />

      <h2 className="flex items-center gap-2">
        <RefreshCw className="h-5 w-5" />
        dits pull
      </h2>
      <p>
        Fetch from remote and integrate changes into the current branch.
        Combines fetch and merge (or rebase) in one command.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits pull [options] [remote] [branch]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--rebase         Rebase instead of merge
--no-rebase      Merge even if pull.rebase is set
--ff-only        Only fast-forward
--no-ff          Create merge commit
--autostash      Stash changes before pull
--verbose, -v    Be verbose`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Pull from tracked branch
$ dits pull
Fetching origin...
Updating a1b2c3d..f5e4d3c
Fast-forward
 footage/scene1.mov | modified
 1 file changed

# Pull with rebase
$ dits pull --rebase
Fetching origin...
Rebasing (1/2): Local commit 1
Rebasing (2/2): Local commit 2
Successfully rebased onto origin/main

# Pull specific remote/branch
$ dits pull origin feature/audio

# Auto-stash local changes
$ dits pull --autostash
Stashing local changes...
Fetching origin...
Updating a1b2c3d..f5e4d3c
Applying stashed changes...`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Delta Transfer</AlertTitle>
        <AlertDescription>
          Dits only transfers missing chunks. If you already have similar files
          locally, pull operations are significantly faster than downloading
          everything.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <Upload className="h-5 w-5" />
        dits push
      </h2>
      <p>
        Upload local commits and objects to a remote repository. Only transfers
        chunks that don&apos;t already exist on the remote.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits push [options] [remote] [refspec...]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--all            Push all branches
--tags           Push all tags
--force, -f      Force push (overwrite remote)
--force-with-lease  Safer force push
--delete         Delete remote branch
--set-upstream, -u  Set upstream for branch
--dry-run, -n    Show what would be pushed
--verbose, -v    Be verbose`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Push to tracked branch
$ dits push
Pushing to origin...
Uploading chunks: 100% (156/156) [1.5 GB]
To https://example.com/project
   a1b2c3d..f5e4d3c  main -> main

# Push and set upstream
$ dits push -u origin feature/audio
Branch 'feature/audio' set up to track 'origin/feature/audio'
Pushing to origin...
To https://example.com/project
 * [new branch]      feature/audio -> feature/audio

# Push specific branch
$ dits push origin main

# Push all branches
$ dits push --all

# Push tags
$ dits push --tags

# Delete remote branch
$ dits push origin --delete old-feature
To https://example.com/project
 - [deleted]         old-feature

# See what would be pushed
$ dits push --dry-run
Would push:
  main: a1b2c3d → f5e4d3c
  Chunks to upload: 156 (1.5 GB)
  Already on remote: 10,078`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Force Push Warning</AlertTitle>
        <AlertDescription>
          Avoid <code>--force</code> on shared branches. It overwrites remote
          history and can cause data loss. Use <code>--force-with-lease</code>
          for safer force pushes that fail if someone else pushed first.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <Globe className="h-5 w-5" />
        dits remote
      </h2>
      <p>
        Manage the set of tracked remote repositories. Add, remove, rename,
        and inspect remote connections.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits remote [-v]
dits remote add <name> <url>
dits remote remove <name>
dits remote rename <old> <new>
dits remote set-url <name> <url>
dits remote show <name>`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# List remotes
$ dits remote -v
origin  https://example.com/team/project (fetch)
origin  https://example.com/team/project (push)
backup  https://backup.example.com/project (fetch)
backup  https://backup.example.com/project (push)

# Add a remote
$ dits remote add upstream https://github.com/original/project

# Show remote info
$ dits remote show origin
* remote origin
  Fetch URL: https://example.com/team/project
  Push URL: https://example.com/team/project
  HEAD branch: main
  Remote branches:
    main           tracked
    feature/audio  tracked
    feature/color  tracked
  Local branches configured for 'dits pull':
    main merges with remote main
  Local refs configured for 'dits push':
    main pushes to main (up to date)

# Change remote URL
$ dits remote set-url origin https://new.example.com/project

# Remove a remote
$ dits remote remove backup`}
      />

      <h2>Transfer Progress</h2>
      <p>
        Dits shows detailed progress during transfers:
      </p>
      <CodeBlock
        language="bash"
        code={`$ dits push
Pushing to origin...

Analyzing commits... 3 commits
Computing delta... 156 new chunks (1.5 GB)
Compressing chunks... done

Uploading: [====================] 100% (156/156)
  Transferred: 1.5 GB
  Speed: 125 MB/s
  Time: 12 seconds

To https://example.com/project
   a1b2c3d..f5e4d3c  main -> main`}
      />

      <h2>Authentication</h2>
      <p>
        Dits supports multiple authentication methods:
      </p>

      <h3>SSH Keys</h3>
      <CodeBlock
        language="bash"
        code={`# Use SSH URL
$ dits remote add origin git@example.com:team/project.git

# SSH key is used automatically from ~/.ssh/`}
      />

      <h3>Access Tokens</h3>
      <CodeBlock
        language="bash"
        code={`# Set credential helper
$ dits config --global credential.helper store

# Or use token in URL (not recommended for shared configs)
$ dits remote set-url origin https://token@example.com/project`}
      />

      <h3>Interactive Login</h3>
      <CodeBlock
        language="bash"
        code={`$ dits push
Username for 'https://example.com': jane
Password for 'https://jane@example.com': ****
Pushing to origin...`}
      />

      <h2>Bandwidth Management</h2>
      <p>
        Control upload and download speeds:
      </p>
      <CodeBlock
        language="bash"
        code={`# Limit upload speed
$ dits config --global transfer.uploadLimit 50M

# Limit download speed
$ dits config --global transfer.downloadLimit 100M

# Set concurrent transfer streams
$ dits config --global transfer.parallel 4`}
      />

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/repository">Repository Commands</Link> - Clone and init
        </li>
        <li>
          <Link href="/docs/cli/branches">Branch Commands</Link> - Work with branches
        </li>
        <li>
          <Link href="/docs/configuration">Configuration</Link> - Configure remote settings
        </li>
      </ul>
    </div>
  );
}
