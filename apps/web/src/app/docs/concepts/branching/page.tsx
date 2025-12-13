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
import { Info, GitBranch, GitMerge, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Branching & Merging",
  description: "Work on multiple versions with branches in Dits",
};

export default function BranchingPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Branching & Merging</h1>
      <p className="lead text-xl text-muted-foreground">
        Branches let you work on different versions of your project simultaneously.
        Create branches for experiments, features, or different edit versions.
      </p>

      <h2>Why Use Branches?</h2>
      <p>
        In video production, branches are invaluable for:
      </p>
      <ul>
        <li><strong>Client versions:</strong> Maintain different cuts for different stakeholders</li>
        <li><strong>Experiments:</strong> Try color grades or edits without affecting the main project</li>
        <li><strong>Collaboration:</strong> Work on different scenes simultaneously</li>
        <li><strong>Releases:</strong> Maintain stable releases while continuing development</li>
      </ul>

      <h2>Branch Basics</h2>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <GitBranch className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Create</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              <code>dits branch name</code> creates a new branch pointing to the
              current commit.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <GitBranch className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Switch</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              <code>dits switch name</code> moves to a different branch, updating
              your working directory.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <GitMerge className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Merge</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              <code>dits merge name</code> combines changes from another branch
              into your current branch.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <h2>Creating Branches</h2>
      <pre className="not-prose">
        <code>{`# Create a new branch
$ dits branch client-version

# Create and switch in one command
$ dits switch -c client-version

# Create from a specific commit
$ dits branch hotfix a1b2c3d

# List all branches
$ dits branch --list
* main
  client-version
  color-grade-experiment`}</code>
      </pre>

      <h2>Switching Branches</h2>
      <pre className="not-prose">
        <code>{`$ dits switch client-version

Switched to branch 'client-version'
Hydrating 3 changed files... done

$ dits status
On branch client-version`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Efficient Branch Switching</AlertTitle>
        <AlertDescription>
          Unlike Git with large files, switching branches in Dits only hydrates
          files that differ between branches. Switching between branches with
          mostly the same content is nearly instant.
        </AlertDescription>
      </Alert>

      <h2>Branch Visualization</h2>
      <pre className="not-prose">
        <code>{`$ dits log --graph --oneline --all

* f5e4d3c (HEAD -> main) Final delivery
| * c4d5e6f (client-version) Client revisions
| * b3c4d5e Add client logo
|/
* a1b2c3d Color grading complete
| * 9a8b7c6 (experiment/new-grade) Try film look
|/
* 8f7e6d5 Initial edit`}</code>
      </pre>

      <h2>Merging Branches</h2>

      <h3>Fast-Forward Merge</h3>
      <p>
        When there are no divergent changes, Dits simply moves the branch pointer:
      </p>
      <pre className="not-prose">
        <code>{`$ dits switch main
$ dits merge feature/audio

Updating a1b2c3d..f5e4d3c
Fast-forward
 audio/sound-effects.wav | new file
 audio/music.wav         | new file
 2 files changed, 500 MB added`}</code>
      </pre>

      <h3>Three-Way Merge</h3>
      <p>
        When both branches have changes, Dits creates a merge commit:
      </p>
      <pre className="not-prose">
        <code>{`$ dits merge client-version

Auto-merging project files...
Merge made by the 'ort' strategy.
 project.prproj | modified
 1 file changed`}</code>
      </pre>

      <h2>Handling Conflicts</h2>
      <p>
        For binary files like videos, Dits uses file-level conflict resolution
        rather than trying to merge content:
      </p>

      <pre className="not-prose">
        <code>{`$ dits merge client-version

CONFLICT (content): Merge conflict in footage/scene1.mov
Automatic merge failed; fix conflicts and then commit.

$ dits status
On branch main
You have unmerged paths.
  (fix conflicts and run "dits commit")

Unmerged paths:
  both modified: footage/scene1.mov`}</code>
      </pre>

      <h3>Resolving Conflicts</h3>
      <pre className="not-prose">
        <code>{`# Keep the version from main (ours)
$ dits checkout --ours footage/scene1.mov

# Keep the version from client-version (theirs)
$ dits checkout --theirs footage/scene1.mov

# Or manually place the file you want, then:
$ dits add footage/scene1.mov
$ dits commit -m "Merge client-version, keep our scene1"`}</code>
      </pre>

      <h2>File Locking</h2>
      <p>
        For large binary files, prevention is better than resolution. Dits supports
        file locking to prevent conflicts:
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-2 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Advisory Locks</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Signal to teammates that you&apos;re working on a file. Others can still
              edit but will see a warning.
            </CardDescription>
            <pre className="mt-4 bg-zinc-950 text-zinc-100 rounded-lg p-3 text-sm">
              <code>dits lock footage/scene1.mov</code>
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Strict Locks</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Prevent others from editing the file entirely until you release the
              lock.
            </CardDescription>
            <pre className="mt-4 bg-zinc-950 text-zinc-100 rounded-lg p-3 text-sm">
              <code>dits lock --strict footage/scene1.mov</code>
            </pre>
          </CardContent>
        </Card>
      </div>

      <pre className="not-prose">
        <code>{`# Lock a file
$ dits lock footage/scene1.mov
Locked 'footage/scene1.mov'

# See who has locks
$ dits lock --list
footage/scene1.mov    locked by jane@example.com    2 hours ago

# Unlock when done
$ dits unlock footage/scene1.mov
Unlocked 'footage/scene1.mov'`}</code>
      </pre>

      <h2>Branch Strategies</h2>

      <h3>Feature Branches</h3>
      <p>
        Create a branch for each distinct piece of work:
      </p>
      <pre className="not-prose">
        <code>{`main
├── feature/scene1-color
├── feature/scene2-audio
├── feature/titles
└── feature/credits`}</code>
      </pre>

      <h3>Client/Version Branches</h3>
      <p>
        Maintain different versions for different audiences:
      </p>
      <pre className="not-prose">
        <code>{`main (master edit)
├── version/theatrical
├── version/streaming
├── version/tv-broadcast
└── version/airline`}</code>
      </pre>

      <h3>Release Branches</h3>
      <p>
        Stabilize releases while continuing development:
      </p>
      <pre className="not-prose">
        <code>{`main (development)
├── release/v1.0
├── release/v1.1
└── release/v2.0`}</code>
      </pre>

      <h2>Deleting Branches</h2>
      <pre className="not-prose">
        <code>{`# Delete a merged branch
$ dits branch -d feature/completed
Deleted branch feature/completed.

# Force delete an unmerged branch
$ dits branch -D experiment/abandoned
Deleted branch experiment/abandoned.

# Delete a remote branch
$ dits push origin --delete feature/completed`}</code>
      </pre>

      <h2>Rebasing</h2>
      <p>
        Rebase replays your changes on top of another branch, creating a linear
        history:
      </p>

      <pre className="not-prose">
        <code>{`$ dits switch feature/audio
$ dits rebase main

Rebasing (1/3): Add sound effects
Rebasing (2/3): Add music track
Rebasing (3/3): Adjust audio levels

Successfully rebased and updated refs/heads/feature/audio.`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>When to Rebase vs Merge</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 list-disc list-inside">
            <li><strong>Rebase:</strong> For local branches to keep history clean</li>
            <li><strong>Merge:</strong> For shared branches or preserving history</li>
            <li>Never rebase branches that others are using</li>
          </ul>
        </AlertDescription>
      </Alert>

      <h2>Cherry-Picking</h2>
      <p>
        Apply specific commits from other branches:
      </p>
      <pre className="not-prose">
        <code>{`# Apply a single commit to current branch
$ dits cherry-pick a1b2c3d

[main f6g7h8i] Add sound effects
 1 file changed, 150 MB added

# Cherry-pick multiple commits
$ dits cherry-pick a1b2c3d b2c3d4e c3d4e5f`}</code>
      </pre>

      <h2>Next Steps</h2>
      <ul>
        <li>
          Learn about{" "}
          <Link href="/docs/cli/branches">Branch Commands</Link>
        </li>
        <li>
          Set up{" "}
          <Link href="/docs/cli/remotes">Remote Repositories</Link>
        </li>
        <li>
          Explore{" "}
          <Link href="/docs/advanced/video">Video Features</Link>
        </li>
      </ul>
    </div>
  );
}
