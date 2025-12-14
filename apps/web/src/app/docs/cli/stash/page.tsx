import { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeBlock } from "@/components/ui/code-block";
import { Package, Info, RotateCcw } from "lucide-react";

export const metadata: Metadata = {
    title: "Stash Commands",
    description: "Temporarily store uncommitted changes with Dits stash",
};

export default function StashPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <div className="flex items-center gap-2 mb-2">
                <Package className="h-8 w-8 text-orange-500" />
                <h1 className="mb-0">Stash Commands</h1>
            </div>
            <p className="lead text-xl text-muted-foreground">
                Temporarily save uncommitted changes so you can work on something else,
                then restore them later. Perfect for quick context switches.
            </p>

            <Alert className="not-prose my-6">
                <Info className="h-4 w-4" />
                <AlertTitle>When to Use Stash</AlertTitle>
                <AlertDescription>
                    Use stash when you need to quickly switch branches but aren&apos;t ready to commit.
                    Your changes are saved on a stack and can be reapplied at any time.
                </AlertDescription>
            </Alert>

            <h2>Quick Reference</h2>

            <CodeBlock
                language="bash"
                code={`dits stash              # Save changes
dits stash pop          # Restore and remove
dits stash apply        # Restore but keep
dits stash list         # Show all stashes
dits stash drop         # Delete a stash
dits stash clear        # Delete all stashes`}
            />

            <h2>dits stash</h2>
            <p>Save your current changes to the stash stack:</p>

            <h3>Synopsis</h3>
            <CodeBlock
                language="bash"
                code={`dits stash [push] [-m <message>] [--] [<pathspec>...]
dits stash list
dits stash show [<stash>]
dits stash pop [<stash>]
dits stash apply [<stash>]
dits stash drop [<stash>]
dits stash clear`}
            />

            <h3>Options</h3>
            <CodeBlock
                language="bash"
                code={`-m, --message <msg>     Add description to stash
-u, --include-untracked Include untracked files
-a, --all               Include ignored files too
-k, --keep-index        Keep staged changes staged
-p, --patch             Interactively select hunks`}
            />

            <h2>Common Use Cases</h2>

            <h3>Quick Context Switch</h3>
            <CodeBlock
                language="bash"
                code={`# You're working on a feature, but need to fix a bug
$ dits status
Changes not staged for commit:
  modified:   src/feature.ts

# Stash your work
$ dits stash -m "WIP: new feature"
Saved working directory and index state "WIP: new feature"

# Now you have a clean working directory
$ dits checkout hotfix/urgent-bug
# ... fix the bug ...
$ dits commit -m "fix: urgent bug"
$ dits checkout feature/my-feature

# Restore your work
$ dits stash pop
On branch feature/my-feature
Changes not staged for commit:
  modified:   src/feature.ts

Dropped refs/stash@{0}`}
            />

            <h3>Stash Specific Files</h3>
            <CodeBlock
                language="bash"
                code={`# Only stash certain files
$ dits stash push -m "WIP config" -- config/*.json

# Stash everything except staged changes
$ dits stash push --keep-index`}
            />

            <h3>View Stash Contents</h3>
            <CodeBlock
                language="bash"
                code={`# List all stashes
$ dits stash list
stash@{0}: WIP: new feature (2 hours ago)
stash@{1}: config changes (yesterday)
stash@{2}: experimental stuff (3 days ago)

# Show what's in a stash
$ dits stash show
 src/feature.ts | 45 ++++++++++++++++++++++++++++++++++++-------
 1 file changed, 38 insertions(+), 7 deletions(-)

# Show full diff
$ dits stash show -p

# Show specific stash
$ dits stash show stash@{1}`}
            />

            <h3>Apply vs Pop</h3>
            <CodeBlock
                language="bash"
                code={`# Apply: restore changes but keep stash
$ dits stash apply
# Stash is still in the list

# Pop: restore changes and remove stash
$ dits stash pop
# Stash is removed from list

# Apply specific stash
$ dits stash apply stash@{2}

# Pop specific stash
$ dits stash pop stash@{1}`}
            />

            <h3>Create Branch from Stash</h3>
            <CodeBlock
                language="bash"
                code={`# Create new branch and apply stash
$ dits stash branch new-feature stash@{0}

# This creates branch, checks it out, and applies stash
# Useful when stash conflicts with current branch`}
            />

            <h2>Managing Stashes</h2>

            <CodeBlock
                language="bash"
                code={`# Delete a specific stash
$ dits stash drop stash@{2}
Dropped stash@{2}

# Delete all stashes (careful!)
$ dits stash clear

# Delete stashes older than 30 days
$ dits stash expire --older-than 30d`}
            />

            <Alert className="not-prose my-6">
                <RotateCcw className="h-4 w-4" />
                <AlertTitle>Recover Dropped Stash</AlertTitle>
                <AlertDescription>
                    If you accidentally drop a stash, you can sometimes recover it:
                    <code className="block mt-2">dits fsck --unreachable | grep stash</code>
                    Find the hash and use <code>dits stash apply &lt;hash&gt;</code>
                </AlertDescription>
            </Alert>

            <h2>Stash with Large Files</h2>
            <p>
                Dits handles large files efficiently in stashes. Unlike Git, stashing
                large binary files doesn&apos;t duplicate storage due to content addressing:
            </p>

            <CodeBlock
                language="bash"
                code={`# Stash including large media files
$ dits stash -u -m "WIP with video changes"
Stashing video.mov (2.3 GB)...
  Reusing 1,234 existing chunks
  New chunks: 23 (45 MB)
Saved working directory and index state`}
            />

            <h2>Related Commands</h2>
            <ul>
                <li><Link href="/docs/cli/branches">checkout, switch</Link> - Change branches</li>
                <li><Link href="/docs/cli/files">reset</Link> - Undo changes</li>
                <li><Link href="/docs/cli/history">reflog</Link> - Recovery options</li>
            </ul>
        </div>
    );
}
