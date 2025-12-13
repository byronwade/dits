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
import { GitBranch, Info, ListTree, ArrowRightLeft, GitMerge, GitPullRequest, Cherry, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: "Branch Commands",
  description: "Commands for creating, switching, and merging branches in Dits",
};

const commands = [
  {
    command: "branch",
    description: "List, create, or delete branches",
    usage: "dits branch [name]",
  },
  {
    command: "switch",
    description: "Switch to a branch",
    usage: "dits switch <branch>",
  },
  {
    command: "checkout",
    description: "Switch branches or restore files",
    usage: "dits checkout <branch|file>",
  },
  {
    command: "merge",
    description: "Merge branches together",
    usage: "dits merge <branch>",
  },
  {
    command: "rebase",
    description: "Reapply commits on top of another base",
    usage: "dits rebase <branch>",
  },
  {
    command: "cherry-pick",
    description: "Apply specific commits",
    usage: "dits cherry-pick <commit>",
  },
  {
    command: "tag",
    description: "Create and manage tags",
    usage: "dits tag [name]",
  },
];

export default function BranchCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="h-8 w-8 text-orange-500" />
        <h1 className="mb-0">Branch Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Commands for creating, switching, and merging branches in your Dits repository.
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
        <ListTree className="h-5 w-5" />
        dits branch
      </h2>
      <p>
        List, create, rename, or delete branches. Branches are lightweight
        references to commits, making creation and switching instant.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>{`dits branch [--list] [-a] [-r]
dits branch <name> [start-point]
dits branch -d <name>
dits branch -m <old> <new>`}</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--list, -l       List branches (default)
--all, -a        List both local and remote branches
--remotes, -r    List remote-tracking branches
--delete, -d     Delete a branch
--force, -D      Force delete unmerged branch
--move, -m       Rename a branch
--copy, -c       Copy a branch
--verbose, -v    Show commit info with branches
--merged         Only show merged branches
--no-merged      Only show unmerged branches`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# List local branches
$ dits branch
* main
  feature/audio
  client-version

# List all branches (including remote)
$ dits branch -a
* main
  feature/audio
  client-version
  remotes/origin/main
  remotes/origin/feature/audio

# Create a new branch
$ dits branch feature/color-grade
Created branch 'feature/color-grade' at a1b2c3d

# Create branch from specific commit
$ dits branch hotfix 9f8e7d6

# Rename a branch
$ dits branch -m old-name new-name
Renamed branch 'old-name' to 'new-name'

# Delete a merged branch
$ dits branch -d feature/completed
Deleted branch 'feature/completed'

# Force delete unmerged branch
$ dits branch -D experiment/abandoned
Deleted branch 'experiment/abandoned' (was a1b2c3d)

# Show branches with last commit
$ dits branch -v
* main           a1b2c3d Add color grading
  feature/audio  f5e4d3c Add sound effects
  client-version b3c4d5e Client revisions`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5" />
        dits switch
      </h2>
      <p>
        Switch to a different branch, updating the working directory. Only
        files that differ are hydrated, making branch switching efficient.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits switch [options] &lt;branch&gt;</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--create, -c     Create and switch to new branch
--force, -f      Discard local changes
--detach         Detach HEAD at the commit
--merge, -m      Merge current changes into new branch
--orphan         Create new unparented branch`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Switch to existing branch
$ dits switch feature/audio
Switched to branch 'feature/audio'
Hydrating 3 changed files... done

# Create and switch in one command
$ dits switch -c feature/new-feature
Switched to new branch 'feature/new-feature'

# Switch to remote branch (creates tracking branch)
$ dits switch feature/remote-work
Branch 'feature/remote-work' set up to track 'origin/feature/remote-work'
Switched to branch 'feature/remote-work'

# Force switch (discards changes)
$ dits switch -f main
Warning: discarding local changes
Switched to branch 'main'

# Detached HEAD (specific commit)
$ dits switch --detach a1b2c3d
HEAD is now at a1b2c3d Add color grading`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Efficient Switching</AlertTitle>
        <AlertDescription>
          Dits only hydrates files that differ between branches. For branches
          with mostly identical content, switching is nearly instant regardless
          of repository size.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <GitMerge className="h-5 w-5" />
        dits merge
      </h2>
      <p>
        Join two or more development histories together. Supports fast-forward,
        recursive, and squash merge strategies.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits merge [options] &lt;branch&gt;...</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--no-commit      Merge but don't commit
--no-ff          Create merge commit even if fast-forward
--ff-only        Abort if fast-forward not possible
--squash         Squash commits into one
--abort          Abort current merge
--continue       Continue after resolving conflicts
--message, -m    Set merge commit message`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Basic merge
$ dits merge feature/audio
Updating a1b2c3d..f5e4d3c
Fast-forward
 audio/music.wav | new file
 1 file changed

# Merge with commit (no fast-forward)
$ dits merge --no-ff feature/color
Merge made by the 'ort' strategy.
 footage/scene1.mov | modified
 1 file changed

# Squash merge (combine all commits)
$ dits merge --squash feature/many-commits
Squash commit -- not updating HEAD
Automatic merge went well

$ dits commit -m "Merge feature/many-commits"

# Abort a merge
$ dits merge --abort
Merge aborted, returning to a1b2c3d`}</code>
      </pre>

      <h3>Resolving Conflicts</h3>
      <pre className="not-prose">
        <code>{`$ dits merge client-version
CONFLICT (content): Merge conflict in footage/scene1.mov
Automatic merge failed; fix conflicts and commit.

# See conflicting files
$ dits status
Unmerged paths:
  both modified: footage/scene1.mov

# Choose one version
$ dits checkout --ours footage/scene1.mov    # Keep main version
$ dits checkout --theirs footage/scene1.mov  # Keep client version

# Or manually resolve, then:
$ dits add footage/scene1.mov
$ dits commit -m "Merge client-version"`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <GitPullRequest className="h-5 w-5" />
        dits rebase
      </h2>
      <p>
        Reapply commits on top of another base tip. Creates a linear history
        by replaying your commits on top of the target branch.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits rebase [options] [upstream [branch]]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--onto           Rebase onto specific commit
--continue       Continue after conflict
--abort          Abort rebase
--skip           Skip current commit
--interactive    Interactive rebase (not supported)`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Rebase current branch onto main
$ dits rebase main
Rebasing (1/3): Add sound effects
Rebasing (2/3): Add music
Rebasing (3/3): Mix audio
Successfully rebased onto main

# Rebase onto specific commit
$ dits rebase --onto main~3 main feature/audio

# Continue after resolving conflicts
$ dits rebase --continue

# Abort rebase
$ dits rebase --abort`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Rebase Warning</AlertTitle>
        <AlertDescription>
          Never rebase commits that have been pushed to a shared repository.
          Rebasing rewrites history, which causes problems for collaborators.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <Cherry className="h-5 w-5" />
        dits cherry-pick
      </h2>
      <p>
        Apply specific commits from other branches. Useful for selectively
        bringing in changes without merging entire branches.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits cherry-pick [options] &lt;commit&gt;...</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Apply a single commit
$ dits cherry-pick a1b2c3d
[main f6g7h8i] Add sound effects

# Apply multiple commits
$ dits cherry-pick a1b2c3d b2c3d4e c3d4e5f

# Cherry-pick without committing
$ dits cherry-pick --no-commit a1b2c3d
Changes applied, ready to commit`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <Tag className="h-5 w-5" />
        dits tag
      </h2>
      <p>
        Create, list, or delete tags. Tags mark specific points in history,
        commonly used for releases or important milestones.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>{`dits tag [--list]
dits tag <name> [commit]
dits tag -d <name>`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# List tags
$ dits tag
v1.0
v1.1
v2.0-beta

# Create lightweight tag
$ dits tag v1.2

# Create annotated tag
$ dits tag -a v1.2 -m "Release version 1.2"

# Tag specific commit
$ dits tag v1.0-final a1b2c3d

# Delete tag
$ dits tag -d old-tag

# Push tags to remote
$ dits push --tags`}</code>
      </pre>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/concepts/branching">Branching & Merging</Link> - Branch concepts
        </li>
        <li>
          <Link href="/docs/cli/remotes">Remote Commands</Link> - Push and pull branches
        </li>
        <li>
          <Link href="/docs/cli/history">History Commands</Link> - View branch history
        </li>
      </ul>
    </div>
  );
}
