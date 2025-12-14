import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, GitCommit, History, Search } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Commits & History",
  description: "Understanding commits and version history in Dits",
};

export default function CommitsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Commits & History</h1>
      <p className="lead text-xl text-muted-foreground">
        Commits are snapshots of your project at a point in time. They form a
        chain of history that lets you track changes, compare versions, and
        restore previous states.
      </p>

      <h2>What is a Commit?</h2>
      <p>
        A commit in Dits records:
      </p>
      <ul>
        <li><strong>Tree:</strong> A snapshot of all files at that moment</li>
        <li><strong>Parents:</strong> Reference(s) to previous commit(s)</li>
        <li><strong>Author:</strong> Who created the changes</li>
        <li><strong>Committer:</strong> Who recorded the commit</li>
        <li><strong>Timestamp:</strong> When the commit was created</li>
        <li><strong>Message:</strong> Description of what changed</li>
      </ul>

      <CodeBlock
        language="bash"
        code={`Commit a1b2c3d4
├── Tree: def456...
│   ├── footage/scene1.mov → asset:789abc...
│   ├── footage/scene2.mov → asset:012def...
│   └── project.prproj     → asset:345ghi...
├── Parent: 9f8e7d6c
├── Author: Jane Editor <jane@example.com>
├── Date: 2024-01-15 10:30:00 -0800
└── Message: Add color grading to scene 1`}
      />

      <h2>Creating Commits</h2>
      <p>
        Stage your changes with <code>dits add</code>, then create a commit:
      </p>

      <CodeBlock
        language="bash"
        code={`# Stage specific files
$ dits add footage/scene1.mov

# Stage all changes
$ dits add .

# Create the commit
$ dits commit -m "Add scene 1 footage"

[main a1b2c3d] Add scene 1 footage
 1 file changed, 10 GB added`}
      />

      <h3>Interactive Staging</h3>
      <p>
        For fine-grained control, use interactive mode:
      </p>
      <CodeBlock
        language="bash"
        code={`$ dits add -i

*** Commands ***
  1: status     2: add       3: revert
  4: diff       5: quit

What now> 2
  1: footage/scene1.mov (modified)
  2: footage/scene2.mov (new file)

Add>> 1
Staged footage/scene1.mov`}
      />

      <h2>Commit Messages</h2>
      <p>
        Good commit messages help you and your team understand what changed and why.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Commit Message Best Practices</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 list-disc list-inside">
            <li>Use present tense: &quot;Add feature&quot; not &quot;Added feature&quot;</li>
            <li>Be specific: &quot;Fix audio sync in scene 3&quot; not &quot;Fix bug&quot;</li>
            <li>Keep the first line under 50 characters</li>
            <li>Add details in the body if needed</li>
          </ul>
        </AlertDescription>
      </Alert>

      <CodeBlock
        language="bash"
        code={`# Short message
$ dits commit -m "Add scene 1 color grading"

# Multi-line message (opens editor)
$ dits commit

# Message with body
$ dits commit -m "Add scene 1 color grading

- Applied LUT: Kodak 2383
- Adjusted shadows +10
- Fixed skin tone in shots 5-8"`}
      />

      <h2>Viewing History</h2>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <GitCommit className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>dits log</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              View commit history with messages, authors, and dates.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <History className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>dits show</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              View details of a specific commit including what files changed.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>dits diff</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Compare commits to see exactly what changed between versions.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <h3>Basic Log</h3>
      <CodeBlock
        language="bash"
        code={`$ dits log

commit a1b2c3d4 (HEAD -> main)
Author: Jane Editor <jane@example.com>
Date:   Mon Jan 15 10:30:00 2024 -0800

    Add color grading to scene 1

commit 9f8e7d6c
Author: John Editor <john@example.com>
Date:   Sun Jan 14 16:45:00 2024 -0800

    Initial footage import`}
      />

      <h3>Formatted Log</h3>
      <CodeBlock
        language="bash"
        code={`# One-line format
$ dits log --oneline
a1b2c3d Add color grading to scene 1
9f8e7d6 Initial footage import
5c4b3a2 Initialize project

# Graph view (shows branches)
$ dits log --graph --oneline
* a1b2c3d (HEAD -> main) Add color grading
| * f5e4d3c (feature/audio) Add sound effects
|/
* 9f8e7d6 Initial footage import

# Show file stats
$ dits log --stat
commit a1b2c3d
    Add color grading to scene 1
 footage/scene1.mov | 10.2 GB → 10.2 GB (modified)
 1 file changed`}
      />

      <h2>Inspecting Commits</h2>

      <h3>Show Commit Details</h3>
      <CodeBlock
        language="bash"
        code={`$ dits show a1b2c3d

commit a1b2c3d4
Author: Jane Editor <jane@example.com>
Date:   Mon Jan 15 10:30:00 2024 -0800

    Add color grading to scene 1

Changed files:
 M footage/scene1.mov
   Chunks: 10,234 total, 156 changed (1.5%)
   Size:   10.2 GB (unchanged)`}
      />

      <h3>Show File at Commit</h3>
      <CodeBlock
        language="bash"
        code={`# View file list at a commit
$ dits show a1b2c3d --name-only

footage/scene1.mov
footage/scene2.mov
project.prproj

# Export a file from a specific commit
$ dits show a1b2c3d:footage/scene1.mov > old_scene1.mov`}
      />

      <h2>Comparing Commits</h2>

      <h3>Diff Between Commits</h3>
      <CodeBlock
        language="bash"
        code={`# Compare two commits
$ dits diff 9f8e7d6 a1b2c3d

Changed: footage/scene1.mov
  Chunks modified: 156 of 10,234 (1.5%)
  Size: 10.2 GB → 10.2 GB

# Compare with working directory
$ dits diff HEAD

# Compare specific file
$ dits diff 9f8e7d6 a1b2c3d -- footage/scene1.mov`}
      />

      <h3>Video-Aware Diff</h3>
      <p>
        For video files, Dits can show time-based differences:
      </p>
      <CodeBlock
        language="bash"
        code={`$ dits diff --video-aware a1b2c3d HEAD -- scene1.mov

footage/scene1.mov:
  Duration: 5:00.00 (unchanged)
  Changed segments:
    00:45.00 - 01:12.00 (color grading applied)
    03:22.00 - 03:45.00 (color grading applied)`}
      />

      <h2>Commit References</h2>
      <p>
        You can reference commits in various ways:
      </p>

      <CodeBlock
        language="bash"
        code={`# Full hash
a1b2c3d4e5f6789...

# Short hash (first 7+ characters)
a1b2c3d

# Branch name (latest commit on branch)
main

# HEAD (current commit)
HEAD

# Relative references
HEAD~1    # Parent of HEAD
HEAD~2    # Grandparent of HEAD
HEAD^     # First parent (same as HEAD~1)
HEAD^2    # Second parent (for merge commits)

# By date
main@{yesterday}
main@{2024-01-15}`}
      />

      <h2>Amending Commits</h2>
      <p>
        Fix the most recent commit without creating a new one:
      </p>

      <CodeBlock
        language="bash"
        code={`# Add forgotten files and amend
$ dits add forgotten_file.mov
$ dits commit --amend

# Just fix the message
$ dits commit --amend -m "Better commit message"`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Warning About Amending</AlertTitle>
        <AlertDescription>
          Only amend commits that haven&apos;t been pushed to shared repositories.
          Amending rewrites history, which can cause problems for collaborators.
        </AlertDescription>
      </Alert>

      <h2>Undoing Commits</h2>

      <h3>Revert (Safe)</h3>
      <p>Create a new commit that undoes changes from a previous commit:</p>
      <CodeBlock
        language="bash"
        code={`$ dits revert a1b2c3d

Reverting "Add color grading to scene 1"
[main b2c3d4e] Revert "Add color grading to scene 1"`}
      />

      <h3>Reset (Careful)</h3>
      <p>Move the branch pointer to a different commit:</p>
      <CodeBlock
        language="bash"
        code={`# Keep changes in working directory
$ dits reset --soft HEAD~1

# Keep changes unstaged
$ dits reset --mixed HEAD~1

# Discard all changes (dangerous!)
$ dits reset --hard HEAD~1`}
      />

      <h2>Next Steps</h2>
      <ul>
        <li>
          Learn about{" "}
          <Link href="/docs/concepts/branching">Branching & Merging</Link>
        </li>
        <li>
          Explore{" "}
          <Link href="/docs/cli/history">History Commands</Link>
        </li>
        <li>
          Set up{" "}
          <Link href="/docs/cli/remotes">Remote Repositories</Link>
        </li>
      </ul>
    </div>
  );
}
