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
import { History, Info, List, Eye, GitCompare, UserCheck, Clock, Search } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "History Commands",
  description: "Commands for viewing and navigating commit history in Dits",
};

const commands = [
  {
    command: "log",
    description: "Show commit history",
    usage: "dits log [options]",
  },
  {
    command: "show",
    description: "Show commit details",
    usage: "dits show <commit>",
  },
  {
    command: "diff",
    description: "Show differences between commits",
    usage: "dits diff [commit] [commit]",
  },
  {
    command: "blame",
    description: "Show who changed what",
    usage: "dits blame <file>",
  },
  {
    command: "reflog",
    description: "Show reference history",
    usage: "dits reflog",
  },
  {
    command: "bisect",
    description: "Binary search for bugs",
    usage: "dits bisect <command>",
  },
];

export default function HistoryCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <History className="h-8 w-8 text-purple-500" />
        <h1 className="mb-0">History Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Commands for viewing commit history, comparing versions, and understanding
        how your project evolved.
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
        <List className="h-5 w-5" />
        dits log
      </h2>
      <p>
        Display the commit history of the repository. Supports various
        filtering and formatting options to help you understand how your
        project evolved over time.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits log [options] [revision range] [-- path...]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--oneline        One line per commit
--graph          Show branch graph
--all            Show all branches
--stat           Show file change statistics
--name-only      Show only file names
--name-status    Show file names with status
--since, --after Filter by date
--until, --before
--author         Filter by author
--grep           Filter by commit message
-n, --max-count  Limit number of commits
--follow         Follow file renames`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Basic log
$ dits log
commit a1b2c3d4 (HEAD -> main, origin/main)
Author: Jane Editor <jane@example.com>
Date:   Mon Jan 15 10:30:00 2024 -0800

    Add color grading to scene 1

commit 9f8e7d6c
Author: John Editor <john@example.com>
Date:   Sun Jan 14 16:45:00 2024 -0800

    Initial footage import

# One-line format
$ dits log --oneline
a1b2c3d (HEAD -> main) Add color grading to scene 1
9f8e7d6 Initial footage import
5c4b3a2 Initialize project

# With graph
$ dits log --graph --oneline --all
* a1b2c3d (HEAD -> main) Add color grading to scene 1
| * f5e4d3c (feature/audio) Add sound effects
|/
* 9f8e7d6 Initial footage import

# Filter by date
$ dits log --since="2024-01-01" --until="2024-01-31"

# Filter by author
$ dits log --author="Jane"

# Show history of specific file
$ dits log --follow footage/scene1.mov

# Show with file stats
$ dits log --stat
commit a1b2c3d
    Add color grading to scene 1

 footage/scene1.mov | 10.2 GB → 10.2 GB (1.5% changed)
 1 file changed`}
      />

      <h2 className="flex items-center gap-2">
        <Eye className="h-5 w-5" />
        dits show
      </h2>
      <p>
        Show details of a specific commit or object. Displays the commit
        message, author, and changed files with chunk-level statistics.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits show [options] &lt;object&gt;...`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--stat           Show file statistics
--name-only      Show only changed file names
--name-status    Show file names with change type
--format         Custom output format
--no-patch       Don't show diff`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Show commit details
$ dits show a1b2c3d
commit a1b2c3d4
Author: Jane Editor <jane@example.com>
Date:   Mon Jan 15 10:30:00 2024 -0800

    Add color grading to scene 1

Changed files:
 M footage/scene1.mov
   Chunks: 10,234 total, 156 changed (1.5%)
   Size: 10.2 GB (unchanged)

# Show specific file at commit
$ dits show a1b2c3d:footage/scene1.mov > old_scene1.mov

# Show only names
$ dits show --name-only a1b2c3d
footage/scene1.mov

# Show with status
$ dits show --name-status a1b2c3d
M    footage/scene1.mov

# Show a tag
$ dits show v1.0`}
      />

      <h2 className="flex items-center gap-2">
        <GitCompare className="h-5 w-5" />
        dits diff
      </h2>
      <p>
        Show differences between commits, staging area, and working directory.
        For video files, Dits provides chunk-level diff showing which segments
        changed.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits diff [options] [<commit>] [<commit>] [-- <path>...]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--staged         Compare staging area to HEAD
--cached         Same as --staged
--stat           Show statistics only
--name-only      Show only file names
--name-status    Show file names with status
--video-aware    Show video-specific diff info
--summary        Show summary of changes`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Working directory vs staging
$ dits diff
Changes not staged for commit:
 M footage/scene1.mov
   Chunks: 156 modified of 10,234 (1.5%)

# Staging area vs HEAD
$ dits diff --staged
Changes to be committed:
 A footage/scene4.mov
   Size: 8.5 GB, 8,456 chunks

# Between two commits
$ dits diff a1b2c3d 9f8e7d6
Changed: footage/scene1.mov
  Before: 10,078 chunks (10.0 GB)
  After:  10,234 chunks (10.2 GB)
  Chunks modified: 156

# Specific file
$ dits diff HEAD~2 HEAD -- footage/scene1.mov

# Video-aware diff
$ dits diff --video-aware a1b2c3d HEAD -- scene1.mov
footage/scene1.mov:
  Duration: 5:00.00 (unchanged)
  Changed segments:
    00:45.00 - 01:12.00 (27 seconds)
    03:22.00 - 03:45.00 (23 seconds)
  Frames affected: ~1,500 of ~9,000 (16.7%)`}
      />

      <h2 className="flex items-center gap-2">
        <UserCheck className="h-5 w-5" />
        dits blame
      </h2>
      <p>
        Show who last modified each part of a file. For binary files like
        video, blame shows chunk-level attribution with offset and size.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits blame [options] &lt;file&gt;`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`-L <range>       Only show specified lines/chunks
--since          Ignore changes before date
--root           Show root revision
-e               Show author email instead of name`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Blame for text file
$ dits blame project.prproj
a1b2c3d4 (Jane Editor 2024-01-15) line 1: <?xml version="1.0"?>
a1b2c3d4 (Jane Editor 2024-01-15) line 2: <Project>
9f8e7d6c (John Editor 2024-01-14) line 3:   <Sequence id="1">
...

# Blame for binary file (shows chunk info)
$ dits blame footage/scene1.mov
Chunk-level blame for footage/scene1.mov:

Offset      Size      Commit   Author          Date
0           1.0 MB    9f8e7d6  John Editor     2024-01-14
1.0 MB      1.2 MB    9f8e7d6  John Editor     2024-01-14
2.2 MB      980 KB    a1b2c3d  Jane Editor     2024-01-15  ← modified
3.2 MB      1.1 MB    9f8e7d6  John Editor     2024-01-14
...`}
      />

      <h2 className="flex items-center gap-2">
        <Clock className="h-5 w-5" />
        dits reflog
      </h2>
      <p>
        Show a log of all reference updates. Essential for recovery - shows
        every movement of HEAD including resets, checkouts, and rebases.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits reflog [options] [ref]`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Show reflog for HEAD
$ dits reflog
a1b2c3d HEAD@{0}: commit: Add color grading to scene 1
9f8e7d6 HEAD@{1}: commit: Initial footage import
5c4b3a2 HEAD@{2}: clone: from https://example.com/project
...

# Show reflog for specific branch
$ dits reflog main

# Recover from accidental reset
$ dits reflog
a1b2c3d HEAD@{0}: reset: moving to HEAD~3
f5e4d3c HEAD@{1}: commit: Important work
...
$ dits reset --hard HEAD@{1}
HEAD is now at f5e4d3c Important work`}
      />

      <h2 className="flex items-center gap-2">
        <Search className="h-5 w-5" />
        dits bisect
      </h2>
      <p>
        Use binary search to find the commit that introduced a bug or change.
        Efficiently narrows down the problematic commit by testing midpoints.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits bisect start
dits bisect good <commit>
dits bisect bad <commit>
dits bisect reset`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Start bisecting
$ dits bisect start
$ dits bisect bad HEAD
$ dits bisect good v1.0

Bisecting: 10 revisions left to test
[a1b2c3d] Add color grading

# Test this version, then mark it
$ dits bisect good
Bisecting: 5 revisions left to test
[b2c3d4e] Update audio

$ dits bisect bad
Bisecting: 2 revisions left to test
[c3d4e5f] Fix sync issue

$ dits bisect good
d4e5f6g is the first bad commit

# Return to original state
$ dits bisect reset`}
      />

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/concepts/commits">Commits & History</Link> - Understanding commits
        </li>
        <li>
          <Link href="/docs/cli/files">File Commands</Link> - Managing files
        </li>
        <li>
          <Link href="/docs/cli/branches">Branch Commands</Link> - Working with branches
        </li>
      </ul>
    </div>
  );
}
