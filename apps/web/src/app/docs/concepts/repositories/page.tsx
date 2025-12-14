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
import { Info, FolderGit2, Database, Cloud } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import { FileTree } from "@/components/docs/file-tree";

export const metadata: Metadata = {
  title: "Repositories",
  description: "Understanding Dits repositories and their structure",
};

const repositoryStructure = [
  {
    name: ".dits",
    type: "folder" as const,
    comment: "Dits repository data",
    children: [
      { name: "config", type: "file" as const, comment: "Repository configuration" },
      { name: "HEAD", type: "file" as const, comment: "Current branch reference" },
      { name: "index", type: "file" as const, comment: "Staging area" },
      {
        name: "objects",
        type: "folder" as const,
        comment: "Content-addressed storage",
        children: [
          { name: "chunks", type: "folder" as const, comment: "File chunks" },
          { name: "assets", type: "folder" as const, comment: "File manifests" },
          { name: "trees", type: "folder" as const, comment: "Directory manifests" },
          { name: "commits", type: "folder" as const, comment: "Commit objects" },
        ],
      },
      {
        name: "refs",
        type: "folder" as const,
        comment: "Branch and tag references",
        children: [
          { name: "heads", type: "folder" as const, comment: "Local branches" },
          { name: "remotes", type: "folder" as const, comment: "Remote tracking branches" },
          { name: "tags", type: "folder" as const, comment: "Tags" },
        ],
      },
      { name: "hooks", type: "folder" as const, comment: "Repository hooks" },
    ],
  },
  {
    name: "footage",
    type: "folder" as const,
    comment: "Your working files",
    children: [
      { name: "scene1.mov", type: "file" as const },
      { name: "scene2.mov", type: "file" as const },
    ],
  },
  { name: "project.prproj", type: "file" as const },
];

export default function RepositoriesPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Repositories</h1>
      <p className="lead text-xl text-muted-foreground">
        A Dits repository is a directory that tracks the history of your files,
        storing all versions efficiently using content-addressed chunks.
      </p>

      <h2>Creating a Repository</h2>
      <p>
        Initialize a new repository with <code>dits init</code>:
      </p>
      <CodeBlock
        language="bash"
        code={`$ mkdir my-project
$ cd my-project
$ dits init

Initialized empty Dits repository in /home/user/my-project/.dits
Created default branch: main`}
      />

      <p>Or clone an existing repository:</p>
      <CodeBlock
        language="bash"
        code={`$ dits clone https://example.com/team/project

Cloning into 'project'...
Fetching metadata... done
Repository cloned (12 commits, 45 GB)`}
      />

      <h2>Repository Structure</h2>
      <p>
        A Dits repository consists of two main parts: the working directory
        (your files) and the <code>.dits</code> directory (version control data).
      </p>

      <div className="not-prose my-6">
        <FileTree items={repositoryStructure} />
      </div>


      <h2>Key Components</h2>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <FolderGit2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Working Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              The actual files you work with. These are regular files on your
              filesystem that you can edit with any application.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Object Store</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              The <code>.dits/objects</code> directory contains all versioned
              data as content-addressed objects (chunks, assets, commits).
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Cloud className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>References</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Named pointers to commits. Branches and tags are stored in
              <code>.dits/refs</code> and point to commit hashes.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <h2>The Staging Area (Index)</h2>
      <p>
        Like Git, Dits has a staging area that sits between your working directory
        and the repository. When you run <code>dits add</code>, files are staged
        (chunked and hashed) but not yet committed.
      </p>

      <CodeBlock
        language="bash"
        code={`Working Directory → Staging Area → Repository
                    (dits add)     (dits commit)

$ dits add footage/scene1.mov
Chunking footage/scene1.mov... 10,234 chunks

$ dits status
Changes to be committed:
  new file: footage/scene1.mov

$ dits commit -m "Add scene 1 footage"
[main a1b2c3d] Add scene 1 footage
 1 file changed, 10 GB added`}
      />

      <h2>Repository Configuration</h2>
      <p>
        Each repository has its own configuration in <code>.dits/config</code>:
      </p>

      <CodeBlock
        language="bash"
        code={`# .dits/config
[core]
    repositoryformatversion = 0

[remote "origin"]
    url = https://example.com/team/project
    fetch = +refs/heads/*:refs/remotes/origin/*

[branch "main"]
    remote = origin
    merge = refs/heads/main

[user]
    name = Jane Editor
    email = jane@example.com`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Configuration Priority</AlertTitle>
        <AlertDescription>
          Repository config overrides global config (<code>~/.ditsconfig</code>),
          which overrides system config (<code>/etc/ditsconfig</code>).
        </AlertDescription>
      </Alert>

      <h2>Bare Repositories</h2>
      <p>
        A bare repository has no working directory - only the <code>.dits</code>
        contents. These are typically used for central/server repositories.
      </p>

      <CodeBlock
        language="bash"
        code={`$ dits init --bare project.dits

Initialized empty bare Dits repository in /home/user/project.dits

$ ls project.dits/
config  HEAD  hooks/  objects/  refs/`}
      />

      <h2>Repository States</h2>
      <p>
        Your working directory can be in various states relative to the repository:
      </p>

      <h3>Clean</h3>
      <p>Working directory matches the latest commit.</p>
      <CodeBlock
        language="bash"
        code={`$ dits status
On branch main
nothing to commit, working tree clean`}
      />

      <h3>Modified</h3>
      <p>Files have been changed but not staged.</p>
      <CodeBlock
        language="bash"
        code={`$ dits status
On branch main
Changes not staged for commit:
  modified: footage/scene1.mov`}
      />

      <h3>Staged</h3>
      <p>Files have been added to the staging area.</p>
      <CodeBlock
        language="bash"
        code={`$ dits status
On branch main
Changes to be committed:
  modified: footage/scene1.mov`}
      />

      <h3>Untracked</h3>
      <p>New files that aren&apos;t yet tracked by Dits.</p>
      <CodeBlock
        language="bash"
        code={`$ dits status
On branch main
Untracked files:
  footage/new_scene.mov`}
      />

      <h2>Ignoring Files</h2>
      <p>
        Create a <code>.ditsignore</code> file to exclude files from version control:
      </p>

      <CodeBlock
        language="bash"
        code={`# .ditsignore

# Temporary files
*.tmp
*.bak

# OS files
.DS_Store
Thumbs.db

# Render outputs (regeneratable)
/renders/

# Cache directories
.cache/
*.cache

# NLE autosave files
*.autosave
*.prproj.tmp`}
      />

      <h2>Repository Size</h2>
      <p>
        Check the size of your repository with <code>dits du</code>:
      </p>

      <CodeBlock
        language="bash"
        code={`$ dits du

Object Store:
  Chunks:    45,892 objects    (12.5 GB)
  Assets:     1,234 objects    (2.1 MB)
  Trees:         89 objects    (156 KB)
  Commits:       42 objects    (84 KB)

Total repository size: 12.5 GB
Working directory size: 45.2 GB
Deduplication ratio: 3.6x`}
      />

      <h2>Maintenance</h2>
      <p>
        Dits repositories occasionally need maintenance to optimize performance:
      </p>

      <h3>Garbage Collection</h3>
      <p>Remove unreferenced objects to free space:</p>
      <CodeBlock
        language="bash"
        code={`$ dits gc

Finding unreachable objects...
Found 234 unreachable chunks (567 MB)
Removing unreachable objects... done
Freed 567 MB`}
      />

      <h3>Integrity Check</h3>
      <p>Verify all objects are intact:</p>
      <CodeBlock
        language="bash"
        code={`$ dits fsck

Checking 45,892 chunks...
Checking 1,234 assets...
Checking 89 trees...
Checking 42 commits...

All objects verified. No corruption detected.`}
      />

      <h2>Next Steps</h2>
      <ul>
        <li>
          Learn about{" "}
          <Link href="/docs/concepts/commits">Commits & History</Link>
        </li>
        <li>
          Understand{" "}
          <Link href="/docs/concepts/branching">Branching & Merging</Link>
        </li>
        <li>
          Set up{" "}
          <Link href="/docs/cli/remotes">Remote Repositories</Link>
        </li>
      </ul>
    </div>
  );
}
