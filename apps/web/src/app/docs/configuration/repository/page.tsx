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
import { Info } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Repository Configuration",
  description: "Configure settings for individual Dits repositories",
};

const options = [
  {
    key: "core.filemode",
    description: "Track file permission changes",
    default: "true",
  },
  {
    key: "core.ignorecase",
    description: "Ignore case in file names",
    default: "false (true on macOS/Windows)",
  },
  {
    key: "core.autocrlf",
    description: "Line ending conversion",
    default: "false",
  },
  {
    key: "core.compression",
    description: "Compression level (0-9)",
    default: "6",
  },
  {
    key: "core.bigFileThreshold",
    description: "Size above which files use streaming",
    default: "512MB",
  },
];

export default function RepositoryConfigPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Repository Configuration</h1>
      <p className="lead text-xl text-muted-foreground">
        Repository-level configuration applies only to the current repository
        and is stored in <code>.dits/config</code>.
      </p>

      <h2>Configuration File Location</h2>
      <p>
        Repository configuration is stored at <code>.dits/config</code> in your
        repository root. It overrides global and system configuration.
      </p>

      <CodeBlock
        language="bash"
        code={`my-project/
├── .dits/
│   ├── config          ← Repository configuration
│   ├── HEAD
│   └── ...
└── ...`}
      />

      <h2>Setting Repository Options</h2>
      <CodeBlock
        language="bash"
        code={`# Set a repository-specific value
$ dits config user.email "project-specific@example.com"

# View repository config
$ dits config --list --local
user.email=project-specific@example.com
core.compression=9
remote.origin.url=https://example.com/project`}
      />

      <h2>Core Options</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Option</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Default</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {options.map((opt) => (
            <TableRow key={opt.key}>
              <TableCell className="font-mono text-sm">{opt.key}</TableCell>
              <TableCell>{opt.description}</TableCell>
              <TableCell className="text-muted-foreground">{opt.default}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h3>core.filemode</h3>
      <p>
        When true, Dits tracks file permission changes (executable bit). Disable
        on systems where permissions aren&apos;t meaningful.
      </p>
      <CodeBlock
        language="bash"
        code={`$ dits config core.filemode false`}
      />

      <h3>core.ignorecase</h3>
      <p>
        Enable case-insensitive file matching. Automatically enabled on
        case-insensitive file systems.
      </p>

      <h3>core.autocrlf</h3>
      <p>
        Control automatic line ending conversion:
      </p>
      <ul>
        <li><code>false</code> - No conversion (recommended for binary-heavy repos)</li>
        <li><code>true</code> - Convert to CRLF on checkout, LF on commit</li>
        <li><code>input</code> - Convert to LF on commit only</li>
      </ul>

      <h3>core.compression</h3>
      <p>
        Set compression level for stored chunks (0-9):
      </p>
      <ul>
        <li><code>0</code> - No compression (fastest)</li>
        <li><code>6</code> - Balanced (default)</li>
        <li><code>9</code> - Maximum compression (slowest)</li>
      </ul>
      <CodeBlock
        language="bash"
        code={`# For already-compressed video files, lower compression
$ dits config core.compression 3`}
      />

      <h2>Remote Configuration</h2>
      <p>
        Remote repositories are configured under <code>[remote &quot;name&quot;]</code> sections:
      </p>

      <CodeBlock
        language="bash"
        code={`# .dits/config
[remote "origin"]
    url = https://example.com/team/project
    fetch = +refs/heads/*:refs/remotes/origin/*
    pushurl = ssh://git@example.com/team/project

[remote "backup"]
    url = https://backup.example.com/project
    fetch = +refs/heads/*:refs/remotes/backup/*`}
      />

      <h3>Remote Options</h3>
      <CodeBlock
        language="bash"
        code={`# Set fetch URL
$ dits config remote.origin.url https://example.com/project

# Set separate push URL
$ dits config remote.origin.pushurl ssh://git@example.com/project

# Add multiple fetch refspecs
$ dits config --add remote.origin.fetch +refs/tags/*:refs/tags/*`}
      />

      <h2>Branch Configuration</h2>
      <p>
        Configure tracking relationships and merge behavior per branch:
      </p>

      <CodeBlock
        language="bash"
        code={`# .dits/config
[branch "main"]
    remote = origin
    merge = refs/heads/main
    rebase = true

[branch "develop"]
    remote = origin
    merge = refs/heads/develop`}
      />

      <h3>Branch Options</h3>
      <CodeBlock
        language="bash"
        code={`# Set upstream branch
$ dits config branch.main.remote origin
$ dits config branch.main.merge refs/heads/main

# Enable rebase on pull for this branch
$ dits config branch.main.rebase true

# Or set via push
$ dits push -u origin main`}
      />

      <h2>Hooks Configuration</h2>
      <p>
        Configure which hooks are enabled:
      </p>

      <CodeBlock
        language="json"
        code={`[hooks]
    pre-commit = true
    pre-push = true
    post-checkout = true`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Hook Scripts</AlertTitle>
        <AlertDescription>
          Hook scripts are stored in <code>.dits/hooks/</code>. Create executable
          scripts named <code>pre-commit</code>, <code>pre-push</code>, etc.
        </AlertDescription>
      </Alert>

      <h2>Media-Specific Configuration</h2>
      <p>
        Configure video and large file handling:
      </p>

      <CodeBlock
        language="json"
        code={`[media]
    # Video file extensions for special handling
    videoExtensions = mp4,mov,mxf,avi,mkv,prores

    # Enable keyframe-aligned chunking
    keyframeAligned = true

    # Generate proxy files on add
    generateProxies = false

    # Proxy resolution
    proxyResolution = 1280x720`}
      />

      <h2>Cache Configuration</h2>
      <p>
        Control local caching behavior:
      </p>

      <CodeBlock
        language="json"
        code={`[cache]
    # Maximum cache size
    size = 50GB

    # Cache directory (relative to .dits)
    path = cache

    # Enable chunk deduplication
    deduplicate = true`}
      />

      <h2>Example Full Configuration</h2>
      <CodeBlock
        language="bash"
        code={`# .dits/config
[core]
    repositoryformatversion = 0
    filemode = true
    compression = 6
    bigFileThreshold = 512MB

[user]
    name = Project Bot
    email = bot@example.com

[remote "origin"]
    url = https://example.com/team/project
    fetch = +refs/heads/*:refs/remotes/origin/*

[branch "main"]
    remote = origin
    merge = refs/heads/main

[media]
    keyframeAligned = true
    videoExtensions = mp4,mov,mxf

[cache]
    size = 100GB`}
      />

      <h2>Editing Configuration</h2>
      <CodeBlock
        language="bash"
        code={`# Edit in default editor
$ dits config --edit

# Edit specific file
$ dits config --local --edit`}
      />

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/configuration/global">Global Configuration</Link>
        </li>
        <li>
          <Link href="/docs/configuration/env">Environment Variables</Link>
        </li>
        <li>
          <Link href="/docs/configuration">Configuration Overview</Link>
        </li>
      </ul>
    </div>
  );
}
