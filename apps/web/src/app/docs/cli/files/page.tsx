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
import { FileText, Info, Plus, Trash2, Move, RotateCcw, GitCommit, Archive } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "File Commands",
  description: "Commands for adding, removing, staging, and managing files in Dits repositories",
};

const commands = [
  {
    command: "add",
    description: "Add files to staging area",
    usage: "dits add <pathspec>...",
  },
  {
    command: "rm",
    description: "Remove files from tracking",
    usage: "dits rm <file>...",
  },
  {
    command: "mv",
    description: "Move or rename files",
    usage: "dits mv <source> <dest>",
  },
  {
    command: "restore",
    description: "Restore working tree files",
    usage: "dits restore <pathspec>...",
  },
  {
    command: "commit",
    description: "Record changes to repository",
    usage: "dits commit -m <message>",
  },
  {
    command: "stash",
    description: "Temporarily save changes",
    usage: "dits stash [push | pop | list]",
  },
];

export default function FileCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-8 w-8 text-green-500" />
        <h1 className="mb-0">File Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Commands for adding, removing, and managing files in your Dits repository.
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
        dits add
      </h2>
      <p>
        Add file contents to the staging area. This chunks the files using
        content-defined chunking and prepares them for the next commit. For video
        files, Dits uses format-aware chunking that aligns to keyframes for
        optimal deduplication.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits add [options] &lt;pathspec&gt;...`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--all, -A        Add all changes (new, modified, deleted)
--update, -u     Update tracked files only (no new files)
--force, -f      Allow adding ignored files
--dry-run, -n    Show what would be added
--interactive    Interactive staging mode
--patch, -p      Interactively select portions to add
--verbose, -v    Be verbose about added files`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Add specific file
$ dits add footage/scene1.mov
Chunking footage/scene1.mov... 10,234 chunks (10.2 GB)

# Add all files in directory
$ dits add footage/
Chunking 5 files... done
  footage/scene1.mov    10,234 chunks
  footage/scene2.mov     8,456 chunks
  footage/scene3.mov    12,789 chunks
  footage/b-roll-1.mov   3,456 chunks
  footage/b-roll-2.mov   2,345 chunks
Total: 37,280 chunks (36.5 GB)

# Add all changes
$ dits add -A

# See what would be added
$ dits add --dry-run footage/
Would add 'footage/scene1.mov'
Would add 'footage/scene2.mov'

# Add with verbose output
$ dits add -v project.prproj
add 'project.prproj' (1,234 chunks, 1.2 MB)`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Chunking Progress</AlertTitle>
        <AlertDescription>
          Large files show chunking progress with deduplication stats. If chunks
          already exist from similar files, they&apos;re reused automatically.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <Trash2 className="h-5 w-5" />
        dits rm
      </h2>
      <p>
        Remove files from the working tree and staging area. The chunks remain
        in the object store until garbage collection, preserving history.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits rm [options] &lt;file&gt;...`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--cached         Only remove from staging, keep in working dir
--force, -f      Override up-to-date check
--recursive, -r  Remove directories recursively
--dry-run, -n    Show what would be removed`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Remove a file
$ dits rm footage/unused-take.mov
rm 'footage/unused-take.mov'

# Remove from tracking but keep file
$ dits rm --cached renders/output.mp4
Stopped tracking 'renders/output.mp4'
(file still exists in working directory)

# Remove directory
$ dits rm -r old-footage/
rm 'old-footage/scene1.mov'
rm 'old-footage/scene2.mov'

# Preview removal
$ dits rm --dry-run footage/test-*.mov
Would remove 'footage/test-1.mov'
Would remove 'footage/test-2.mov'`}
      />

      <h2 className="flex items-center gap-2">
        <Move className="h-5 w-5" />
        dits mv
      </h2>
      <p>
        Move or rename a file, directory, or symlink. Since Dits uses content-
        addressing, renames are instant regardless of file size.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits mv [options] &lt;source&gt; &lt;destination&gt;`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--force, -f      Force rename even if target exists
--dry-run, -n    Show what would happen
--verbose, -v    Report renamed files`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Rename a file
$ dits mv footage/scene1.mov footage/scene1-final.mov
Renamed 'footage/scene1.mov' -> 'footage/scene1-final.mov'

# Move to different directory
$ dits mv footage/scene1.mov archive/
Moved 'footage/scene1.mov' -> 'archive/scene1.mov'

# Rename directory
$ dits mv raw-footage/ source-footage/
Renamed 'raw-footage/' -> 'source-footage/'`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Efficient Renames</AlertTitle>
        <AlertDescription>
          Since Dits uses content-addressing, renames are instant regardless of
          file size - no data is copied, only metadata is updated.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <RotateCcw className="h-5 w-5" />
        dits restore
      </h2>
      <p>
        Restore working tree files from the index or a specific commit. This
        reconstructs files from stored chunks, allowing you to discard changes
        or retrieve previous versions.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits restore [options] &lt;pathspec&gt;...`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--source, -s     Restore from specified commit
--staged, -S     Restore staged changes (unstage)
--worktree, -W   Restore working tree (discard changes)
--ours           Use our version (during merge)
--theirs         Use their version (during merge)`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Discard changes to a file
$ dits restore footage/scene1.mov
Restored 'footage/scene1.mov'

# Unstage a file (keep changes)
$ dits restore --staged footage/scene1.mov
Unstaged 'footage/scene1.mov'

# Restore from a specific commit
$ dits restore -s HEAD~2 footage/scene1.mov
Restored 'footage/scene1.mov' from a1b2c3d

# Restore entire directory
$ dits restore footage/
Restored 5 files

# Discard all changes
$ dits restore .`}
      />

      <h2 className="flex items-center gap-2">
        <GitCommit className="h-5 w-5" />
        dits commit
      </h2>
      <p>
        Record changes to the repository by creating a new commit object. Commits
        contain a tree hash pointing to the complete state, parent commit(s),
        author/committer information, and a message.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits commit [options]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--message, -m    Commit message
--all, -a        Automatically stage modified files
--amend          Amend the previous commit
--no-edit        Use previous commit's message (with --amend)
--author         Override author
--date           Override date
--allow-empty    Allow empty commit
--dry-run        Show what would be committed`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Basic commit
$ dits commit -m "Add scene 1 color grading"
[main a1b2c3d] Add scene 1 color grading
 1 file changed, 10.2 GB modified

# Commit with detailed message
$ dits commit -m "Add scene 1 color grading

- Applied Kodak 2383 LUT
- Adjusted shadows +10
- Fixed skin tones in shots 5-8"

# Stage and commit all changes
$ dits commit -a -m "Update all footage"

# Amend last commit
$ dits commit --amend -m "Better commit message"

# See what would be committed
$ dits commit --dry-run
Changes to be committed:
  modified: footage/scene1.mov
  new file: footage/scene4.mov`}
      />

      <h2 className="flex items-center gap-2">
        <Archive className="h-5 w-5" />
        dits stash
      </h2>
      <p>
        Temporarily save changes without committing. Useful when you need to
        switch branches but have uncommitted work. Stashed changes are stored
        efficiently using the same chunk deduplication as commits.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits stash [push [-m <message>]]
dits stash list
dits stash show [stash]
dits stash pop [stash]
dits stash drop [stash]`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Stash current changes
$ dits stash
Saved working directory state WIP on main: a1b2c3d Add scene 1

# Stash with message
$ dits stash push -m "WIP: color grading experiment"
Saved working directory state: WIP: color grading experiment

# List stashes
$ dits stash list
stash@{0}: WIP: color grading experiment
stash@{1}: WIP on main: a1b2c3d Add scene 1

# Apply and remove stash
$ dits stash pop
Restored 'footage/scene1.mov'
Dropped stash@{0}

# Apply without removing
$ dits stash apply stash@{1}

# Remove a stash
$ dits stash drop stash@{0}`}
      />

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/history">History Commands</Link> - View and navigate history
        </li>
        <li>
          <Link href="/docs/concepts/commits">Commits & History</Link> - Understanding commits
        </li>
        <li>
          <Link href="/docs/cli-reference">CLI Reference</Link> - All commands
        </li>
      </ul>
    </div>
  );
}
