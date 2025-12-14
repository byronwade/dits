import { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeBlock } from "@/components/ui/code-block";
import { Tag, Info, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
    title: "Tag Commands",
    description: "Create and manage version tags with Dits tag commands",
};

export default function TagsPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <div className="flex items-center gap-2 mb-2">
                <Tag className="h-8 w-8 text-purple-500" />
                <h1 className="mb-0">Tag Commands</h1>
            </div>
            <p className="lead text-xl text-muted-foreground">
                Mark important points in history with tags. Use them for releases,
                milestones, or any commit you want to easily reference later.
            </p>

            <h2>Quick Reference</h2>

            <CodeBlock
                language="bash"
                code={`dits tag                        # List all tags
dits tag v1.0.0                 # Create lightweight tag
dits tag -a v1.0.0 -m "msg"     # Create annotated tag
dits tag -d v1.0.0              # Delete tag
dits push origin v1.0.0         # Push specific tag
dits push origin --tags         # Push all tags`}
            />

            <h2>Tag Types</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <div className="bg-muted p-6 rounded-lg">
                    <h3 className="font-semibold mb-3">Lightweight Tags</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                        Simple pointer to a commit. Like a branch that doesn&apos;t change.
                    </p>
                    <pre className="bg-background p-3 rounded text-sm"><code>dits tag v1.0.0</code></pre>
                </div>

                <div className="bg-primary/5 border border-primary/20 p-6 rounded-lg">
                    <h3 className="font-semibold mb-3">Annotated Tags (Recommended)</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                        Full object with author, date, message, and optional signature.
                    </p>
                    <pre className="bg-background p-3 rounded text-sm"><code>dits tag -a v1.0.0 -m &quot;Release&quot;</code></pre>
                </div>
            </div>

            <Alert className="not-prose my-6">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Use Annotated Tags for Releases</AlertTitle>
                <AlertDescription>
                    Annotated tags store extra metadata (who, when, why) and are recommended
                    for marking releases and milestones.
                </AlertDescription>
            </Alert>

            <h2>Creating Tags</h2>

            <h3>Lightweight Tag</h3>
            <CodeBlock
                language="bash"
                code={`# Tag current commit
$ dits tag v1.0.0

# Tag specific commit
$ dits tag v0.9.0 abc1234`}
            />

            <h3>Annotated Tag</h3>
            <CodeBlock
                language="bash"
                code={`# Create annotated tag
$ dits tag -a v1.0.0 -m "Release 1.0.0 - Initial stable release"

# Tag opens editor for message
$ dits tag -a v1.0.0

# Tag specific commit
$ dits tag -a v0.9.0 -m "Beta release" abc1234`}
            />

            <h3>Signed Tags (GPG)</h3>
            <CodeBlock
                language="bash"
                code={`# Create signed tag
$ dits tag -s v1.0.0 -m "Signed release"

# Verify signed tag
$ dits tag -v v1.0.0
gpg: Signature made Mon Dec 11 10:30:00 2024
gpg: Good signature from "Your Name <you@example.com>"`}
            />

            <h2>Listing Tags</h2>

            <CodeBlock
                language="bash"
                code={`# List all tags
$ dits tag
v0.9.0
v1.0.0
v1.0.1
v1.1.0

# List with pattern
$ dits tag -l "v1.*"
v1.0.0
v1.0.1
v1.1.0

# List with details
$ dits tag -n
v1.0.0    Release 1.0.0 - Initial stable release
v1.0.1    Hotfix for login bug
v1.1.0    New video export feature

# Sort by version
$ dits tag --sort=-version:refname | head -5
v1.1.0
v1.0.1
v1.0.0
v0.9.0

# Show tag info
$ dits show v1.0.0
tag v1.0.0
Tagger: Your Name <you@example.com>
Date:   Mon Dec 11 10:30:00 2024

Release 1.0.0 - Initial stable release

commit abc1234...`}
            />

            <h2>Sharing Tags</h2>

            <CodeBlock
                language="bash"
                code={`# Push specific tag
$ dits push origin v1.0.0

# Push all tags
$ dits push origin --tags

# Push with new commits
$ dits push origin main --tags

# Fetch tags from remote
$ dits fetch --tags

# Delete remote tag
$ dits push origin --delete v1.0.0
# or
$ dits push origin :refs/tags/v1.0.0`}
            />

            <h2>Deleting Tags</h2>

            <CodeBlock
                language="bash"
                code={`# Delete local tag
$ dits tag -d v1.0.0
Deleted tag 'v1.0.0'

# Delete remote tag
$ dits push origin --delete v1.0.0

# Delete multiple local tags
$ dits tag -d v0.1.0 v0.2.0 v0.3.0`}
            />

            <h2>Checking Out Tags</h2>

            <CodeBlock
                language="bash"
                code={`# Checkout a tag (detached HEAD)
$ dits checkout v1.0.0
Note: switching to 'v1.0.0'.
You are in 'detached HEAD' state.

# Create branch from tag
$ dits checkout -b hotfix/v1.0.1 v1.0.0

# Compare current with tag
$ dits diff v1.0.0`}
            />

            <Alert className="not-prose my-6">
                <Info className="h-4 w-4" />
                <AlertTitle>Detached HEAD</AlertTitle>
                <AlertDescription>
                    Checking out a tag puts you in &quot;detached HEAD&quot; state. To make changes,
                    create a new branch: <code>dits checkout -b new-branch</code>
                </AlertDescription>
            </Alert>

            <h2>Semantic Versioning</h2>
            <p>We recommend using semantic versioning for release tags:</p>

            <div className="bg-muted p-6 rounded-lg my-6">
                <p className="font-mono text-lg mb-4">MAJOR.MINOR.PATCH</p>
                <ul className="text-sm space-y-2">
                    <li><strong>MAJOR</strong> - Breaking/incompatible changes</li>
                    <li><strong>MINOR</strong> - New features, backwards-compatible</li>
                    <li><strong>PATCH</strong> - Bug fixes, backwards-compatible</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-4">
                    Examples: v1.0.0, v1.0.1, v1.1.0, v2.0.0
                </p>
            </div>

            <h2>Release Workflow</h2>

            <CodeBlock
                language="bash"
                code={`# 1. Ensure you're on main with latest changes
dits checkout main
dits pull origin main

# 2. Update version in package.json (or equivalent)
npm version 1.0.0

# 3. Create annotated tag
dits tag -a v1.0.0 -m "Release 1.0.0

Features:
- New video export
- Improved chunking
- P2P sync

Fixes:
- Fixed lock timeout
- Resolved cache corruption"

# 4. Push with tags
dits push origin main --tags

# 5. Verify on remote
dits ls-remote --tags origin`}
            />

            <h2>Related Commands</h2>
            <ul>
                <li><Link href="/docs/cli/branches">Branch Commands</Link> - Branch management</li>
                <li><Link href="/docs/cli/history">Log</Link> - View history</li>
                <li><Link href="/docs/cli/remotes">Remote Commands</Link> - Push/fetch</li>
            </ul>
        </div>
    );
}
