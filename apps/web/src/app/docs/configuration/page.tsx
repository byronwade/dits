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
  title: "Configuration",
  description: "Configure Dits for your workflow",
};

const configOptions = [
  {
    key: "user.name",
    description: "Your name for commits",
    default: "(none)",
    example: '"John Editor"',
  },
  {
    key: "user.email",
    description: "Your email for commits",
    default: "(none)",
    example: '"john@example.com"',
  },
  {
    key: "core.editor",
    description: "Editor for commit messages",
    default: "$EDITOR or vim",
    example: '"code --wait"',
  },
  {
    key: "core.pager",
    description: "Pager for long output",
    default: "less",
    example: '"less -R"',
  },
  {
    key: "push.default",
    description: "Default push behavior",
    default: "simple",
    example: '"current"',
  },
  {
    key: "pull.rebase",
    description: "Rebase on pull",
    default: "false",
    example: "true",
  },
  {
    key: "cache.size",
    description: "Local cache size limit",
    default: "10GB",
    example: '"50GB"',
  },
  {
    key: "gc.gracePeriod",
    description: "Time before orphaned objects are collected",
    default: "2 weeks",
    example: '"30 days"',
  },
  {
    key: "mount.defaultPath",
    description: "Default mount point for VFS",
    default: "/Volumes/dits-<repo>",
    example: '"/mnt/dits"',
  },
];

export default function ConfigurationPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Configuration</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits uses a layered configuration system similar to Git. Settings can be
        configured at the system, global, or repository level.
      </p>

      <h2>Configuration Levels</h2>
      <ul>
        <li>
          <strong>System</strong> (<code>/etc/ditsconfig</code>): Applies to all
          users on the system
        </li>
        <li>
          <strong>Global</strong> (<code>~/.ditsconfig</code>): Applies to all
          your repositories
        </li>
        <li>
          <strong>Repository</strong> (<code>.dits/config</code>): Applies only
          to the current repository
        </li>
      </ul>
      <p>
        More specific configurations override less specific ones (repository
        overrides global, global overrides system).
      </p>

      <h2>Basic Usage</h2>

      <h3>Get a Value</h3>
      <CodeBlock
        language="bash"
        code={`$ dits config user.name
John Editor`}
      />

      <h3>Set a Value</h3>
      <CodeBlock
        language="bash"
        code={`# Set in current repository
$ dits config user.name "John Editor"

# Set globally (for all repositories)
$ dits config --global user.name "John Editor"

# Set at system level (requires admin)
$ dits config --system user.name "John Editor"`}
      />

      <h3>List All Configuration</h3>
      <CodeBlock
        language="bash"
        code={`$ dits config --list
user.name=John Editor
user.email=john@example.com
cache.size=10GB
...`}
      />

      <h3>Unset a Value</h3>
      <CodeBlock
        language="bash"
        code={`$ dits config --unset user.name`}
      />

      <h3>Edit Configuration File</h3>
      <CodeBlock
        language="bash"
        code={`$ dits config --global --edit`}
      />

      <h2>Configuration Options</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Example</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configOptions.map((option) => (
            <TableRow key={option.key}>
              <TableCell className="font-mono text-sm">{option.key}</TableCell>
              <TableCell>{option.description}</TableCell>
              <TableCell className="text-muted-foreground">
                {option.default}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {option.example}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2>Essential Configuration</h2>
      <p>
        Before making commits, you should set your identity:
      </p>
      <CodeBlock
        language="bash"
        code={`$ dits config --global user.name "Your Name"
$ dits config --global user.email "you@example.com"`}
      />

      <Alert className="not-prose my-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Required for Commits</AlertTitle>
        <AlertDescription>
          Dits requires user.name and user.email to be set before you can create
          commits. Set them globally to avoid setting them for each repository.
        </AlertDescription>
      </Alert>

      <h2>Configuration File Format</h2>
      <p>
        Configuration files use a simple INI-like format:
      </p>
      <CodeBlock
        language="json"
        code={`[user]
    name = John Editor
    email = john@example.com

[core]
    editor = code --wait
    pager = less -R

[cache]
    size = 50GB

[remote "origin"]
    url = https://dits.example.com/team/project`}
      />

      <h2>Remote Configuration</h2>
      <p>
        Remotes are configured under <code>[remote &quot;name&quot;]</code> sections:
      </p>
      <CodeBlock
        language="bash"
        code={`# Add a remote
$ dits remote add origin https://dits.example.com/team/project

# This adds to config:
[remote "origin"]
    url = https://dits.example.com/team/project
    fetch = +refs/heads/*:refs/remotes/origin/*`}
      />

      <h2>Aliases</h2>
      <p>
        Create shortcuts for common commands:
      </p>
      <CodeBlock
        language="bash"
        code={`$ dits config --global alias.co checkout
$ dits config --global alias.br branch
$ dits config --global alias.ci commit
$ dits config --global alias.st status

# Now you can use:
$ dits co main
$ dits st`}
      />

      <h2>Environment Variables</h2>
      <p>
        Configuration can also be set via environment variables:
      </p>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Variable</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">DITS_DIR</TableCell>
            <TableCell>Override .dits directory location</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_WORK_TREE</TableCell>
            <TableCell>Override working tree location</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_CACHE_DIR</TableCell>
            <TableCell>Override cache directory</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_CONFIG_GLOBAL</TableCell>
            <TableCell>Override global config path</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_EDITOR</TableCell>
            <TableCell>Override editor</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_PAGER</TableCell>
            <TableCell>Override pager</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Next Steps</h2>
      <ul>
        <li>
          Learn about{" "}
          <Link href="/docs/cli-reference">CLI commands</Link>
        </li>
        <li>
          Set up{" "}
          <Link href="/docs/cli/remotes">remote repositories</Link>
        </li>
        <li>
          Configure{" "}
          <Link href="/docs/advanced/vfs">VFS settings</Link>
        </li>
      </ul>
    </div>
  );
}
