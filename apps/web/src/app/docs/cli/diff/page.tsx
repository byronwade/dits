import { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeBlock } from "@/components/ui/code-block";
import { GitCompare, Info, Eye } from "lucide-react";

export const metadata: Metadata = {
    title: "Diff Commands",
    description: "Compare changes between commits, branches, and files with Dits diff",
};

export default function DiffPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <div className="flex items-center gap-2 mb-2">
                <GitCompare className="h-8 w-8 text-blue-500" />
                <h1 className="mb-0">Diff &amp; Compare Commands</h1>
            </div>
            <p className="lead text-xl text-muted-foreground">
                View differences between commits, branches, working directory, and staged changes.
                Understand exactly what changed and when.
            </p>

            <h2>dits diff</h2>
            <p>
                Show changes between the working directory and the index (staging area),
                or between commits.
            </p>

            <h3>Synopsis</h3>
            <CodeBlock
                language="bash"
                code={`dits diff [OPTIONS] [<commit>] [--] [<path>...]
dits diff [OPTIONS] <commit> <commit> [--] [<path>...]`}
            />

            <h3>Options</h3>
            <CodeBlock
                language="bash"
                code={`--staged, --cached    Compare staged changes to last commit
--stat               Show diffstat summary
--name-only          Only show changed file names
--name-status        Show name and status (A/M/D)
-p, --patch          Show full patch (default)
--no-color           Disable colored output
-w, --ignore-space   Ignore whitespace changes
--word-diff          Show word-level differences
--binary             Show binary file differences
--chunk-diff         Show chunk-level differences (Dits-specific)`}
            />

            <h3>Common Use Cases</h3>

            <h4>View Unstaged Changes</h4>
            <CodeBlock
                language="bash"
                code={`# See what you've changed but not staged
$ dits diff
diff --dits a/src/main.ts b/src/main.ts
--- a/src/main.ts
+++ b/src/main.ts
@@ -10,7 +10,8 @@
 function main() {
-  console.log("Hello");
+  console.log("Hello, World!");
+  console.log("Welcome to Dits");
 }`}
            />

            <h4>View Staged Changes</h4>
            <CodeBlock
                language="bash"
                code={`# See what will be committed
$ dits diff --staged

# Same as
$ dits diff --cached`}
            />

            <h4>Compare Commits</h4>
            <CodeBlock
                language="bash"
                code={`# Compare two commits
$ dits diff abc1234 def5678

# Compare with parent commit
$ dits diff HEAD~1 HEAD

# Compare branch with main
$ dits diff main feature/new-ui`}
            />

            <h4>Diff Specific Files</h4>
            <CodeBlock
                language="bash"
                code={`# Diff a specific file
$ dits diff -- src/config.ts

# Diff multiple files
$ dits diff -- src/*.ts

# Diff directory
$ dits diff -- src/components/`}
            />

            <h2>dits diff --stat</h2>
            <p>Get a summary of changes without the full diff:</p>

            <CodeBlock
                language="bash"
                code={`$ dits diff --stat HEAD~5
 src/index.ts         |  23 +++++++++++----
 src/utils/helpers.ts |   8 ++---
 package.json         |   3 +-
 README.md            | 156 +++++++++++++++++++++++++++++++++++++
 4 files changed, 175 insertions(+), 15 deletions(-)`}
            />

            <h2>dits diff --chunk-diff</h2>
            <p>
                Dits-specific feature to see differences at the chunk level.
                Useful for understanding how binary files changed:
            </p>

            <CodeBlock
                language="bash"
                code={`$ dits diff --chunk-diff video.mov
Chunk changes for video.mov:
  Total chunks: 1,234 -> 1,256
  New chunks: 45
  Removed chunks: 23
  Unchanged: 1,189 (96.4%)
  
  Affected regions:
    0:00:00 - 0:02:30  (unchanged)
    0:02:30 - 0:05:45  (modified, 22 new chunks)
    0:05:45 - 0:15:00  (unchanged)
    0:15:00 - 0:18:30  (modified, 23 new chunks)`}
            />

            <Alert className="not-prose my-6">
                <Eye className="h-4 w-4" />
                <AlertTitle>Binary File Diffing</AlertTitle>
                <AlertDescription>
                    Unlike Git, Dits can show meaningful diffs for binary files by comparing
                    at the chunk level. Use <code>--chunk-diff</code> for video, images, and other binaries.
                </AlertDescription>
            </Alert>

            <h2>dits show</h2>
            <p>Show details of a specific commit, including the diff:</p>

            <CodeBlock
                language="bash"
                code={`# Show most recent commit
$ dits show

# Show specific commit
$ dits show abc1234

# Show only the files changed
$ dits show --name-only abc1234

# Show a file at a specific commit
$ dits show abc1234:src/main.ts`}
            />

            <h2>dits difftool</h2>
            <p>Open differences in an external diff viewer:</p>

            <CodeBlock
                language="bash"
                code={`# Configure diff tool
$ dits config --global diff.tool vscode
$ dits config --global difftool.vscode.cmd 'code --wait --diff $LOCAL $REMOTE'

# Use difftool
$ dits difftool HEAD~1 HEAD

# Diff specific file with tool
$ dits difftool -- src/main.ts`}
            />

            <h2>Useful Aliases</h2>

            <CodeBlock
                language="bash"
                code={`# Add these to your config
dits config --global alias.d 'diff'
dits config --global alias.ds 'diff --staged'
dits config --global alias.dstat 'diff --stat'
dits config --global alias.last 'diff HEAD~1 HEAD'

# Usage
$ dits ds        # Staged changes
$ dits dstat     # Change summary  
$ dits last      # What changed in last commit`}
            />

            <h2>Related Commands</h2>
            <ul>
                <li><Link href="/docs/cli/history">log, history</Link> - View commit history</li>
                <li><Link href="/docs/cli/files">status</Link> - See changed files</li>
                <li><Link href="/docs/cli/branches">branch</Link> - Compare branches</li>
            </ul>
        </div>
    );
}
