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
  title: "Global Configuration",
  description: "Configure Dits settings that apply to all your repositories",
};

const userOptions = [
  {
    key: "user.name",
    description: "Your name for commits",
    example: '"Jane Editor"',
  },
  {
    key: "user.email",
    description: "Your email for commits",
    example: '"jane@example.com"',
  },
  {
    key: "user.signingkey",
    description: "GPG key for signing commits",
    example: '"ABC123DEF"',
  },
];

const coreOptions = [
  {
    key: "core.editor",
    description: "Default text editor",
    example: '"code --wait"',
  },
  {
    key: "core.pager",
    description: "Pager for long output",
    example: '"less -R"',
  },
  {
    key: "core.excludesFile",
    description: "Global ignore patterns file",
    example: '"~/.ditsignore"',
  },
];

export default function GlobalConfigPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Global Configuration</h1>
      <p className="lead text-xl text-muted-foreground">
        Global configuration applies to all repositories for the current user
        and is stored in <code>~/.ditsconfig</code>.
      </p>

      <h2>Configuration File Location</h2>
      <CodeBlock
        language="bash"
        code={`# Global config (applies to all your repos)
~/.ditsconfig

# On Windows
C:\\Users\\<username>\\.ditsconfig`}
      />

      <h2>Essential Setup</h2>
      <p>
        Before using Dits, configure your identity for commits:
      </p>

      <CodeBlock
        language="bash"
        code={`$ dits config --global user.name "Your Name"
$ dits config --global user.email "you@example.com"`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Required for Commits</AlertTitle>
        <AlertDescription>
          Dits requires <code>user.name</code> and <code>user.email</code> to be
          set before you can create commits. Set them globally to avoid
          configuring them for each repository.
        </AlertDescription>
      </Alert>

      <h2>User Settings</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Option</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Example</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userOptions.map((opt) => (
            <TableRow key={opt.key}>
              <TableCell className="font-mono text-sm">{opt.key}</TableCell>
              <TableCell>{opt.description}</TableCell>
              <TableCell className="font-mono text-sm">{opt.example}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2>Core Settings</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Option</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Example</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coreOptions.map((opt) => (
            <TableRow key={opt.key}>
              <TableCell className="font-mono text-sm">{opt.key}</TableCell>
              <TableCell>{opt.description}</TableCell>
              <TableCell className="font-mono text-sm">{opt.example}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h3>Setting Your Editor</h3>
      <CodeBlock
        language="bash"
        code={`# VS Code
$ dits config --global core.editor "code --wait"

# Sublime Text
$ dits config --global core.editor "subl -n -w"

# Vim
$ dits config --global core.editor "vim"

# Nano
$ dits config --global core.editor "nano"`}
      />

      <h3>Global Ignore Patterns</h3>
      <p>
        Create a global ignore file for patterns that apply to all repositories:
      </p>

      <CodeBlock
        language="bash"
        code={`# Set the global excludes file
$ dits config --global core.excludesFile ~/.ditsignore

# Create the file
$ cat > ~/.ditsignore << 'EOF'
# OS files
.DS_Store
Thumbs.db
desktop.ini

# Editor files
*.swp
*~
.idea/
.vscode/

# Build artifacts
*.log
*.tmp
EOF`}
      />

      <h2>Aliases</h2>
      <p>
        Create shortcuts for frequently used commands:
      </p>

      <CodeBlock
        language="bash"
        code={`# Common aliases
$ dits config --global alias.co checkout
$ dits config --global alias.br branch
$ dits config --global alias.ci commit
$ dits config --global alias.st status

# Now use them
$ dits co main
$ dits st
$ dits ci -m "Quick commit"

# More complex aliases
$ dits config --global alias.lg "log --graph --oneline --all"
$ dits config --global alias.last "log -1 HEAD"
$ dits config --global alias.unstage "restore --staged"

$ dits lg  # Shows nice graph
$ dits last  # Shows last commit`}
      />

      <h2>Credential Storage</h2>
      <p>
        Configure how Dits stores your credentials:
      </p>

      <CodeBlock
        language="bash"
        code={`# Store credentials in memory for 15 minutes
$ dits config --global credential.helper cache

# Store credentials longer
$ dits config --global credential.helper "cache --timeout=3600"

# Store credentials on disk (less secure)
$ dits config --global credential.helper store

# Use macOS Keychain
$ dits config --global credential.helper osxkeychain

# Use Windows Credential Manager
$ dits config --global credential.helper manager`}
      />

      <h2>Transfer Settings</h2>
      <p>
        Configure network transfer behavior:
      </p>

      <CodeBlock
        language="bash"
        code={`# Limit upload bandwidth
$ dits config --global transfer.uploadLimit 50M

# Limit download bandwidth
$ dits config --global transfer.downloadLimit 100M

# Number of parallel transfers
$ dits config --global transfer.parallel 4

# Connection timeout (seconds)
$ dits config --global transfer.timeout 30`}
      />

      <h2>Default Behaviors</h2>
      <p>
        Set default behaviors for common operations:
      </p>

      <CodeBlock
        language="bash"
        code={`# Rebase on pull instead of merge
$ dits config --global pull.rebase true

# Push current branch by default
$ dits config --global push.default current

# Auto-setup remote tracking
$ dits config --global push.autoSetupRemote true

# Enable colors
$ dits config --global color.ui auto

# Set default branch name
$ dits config --global init.defaultBranch main`}
      />

      <h2>View Global Configuration</h2>
      <CodeBlock
        language="bash"
        code={`# List all global settings
$ dits config --global --list
user.name=Jane Editor
user.email=jane@example.com
core.editor=code --wait
alias.co=checkout
alias.st=status
...

# Show specific value
$ dits config --global user.name
Jane Editor

# Show where a value is set
$ dits config --show-origin user.name
file:~/.ditsconfig    user.name=Jane Editor`}
      />

      <h2>Edit Global Configuration</h2>
      <CodeBlock
        language="bash"
        code={`# Open in editor
$ dits config --global --edit

# Unset a value
$ dits config --global --unset alias.old`}
      />

      <h2>Example Global Configuration</h2>
      <CodeBlock
        language="bash"
        code={`# ~/.ditsconfig
[user]
    name = Jane Editor
    email = jane@example.com

[core]
    editor = code --wait
    pager = less -R
    excludesFile = ~/.ditsignore

[alias]
    co = checkout
    br = branch
    ci = commit
    st = status
    lg = log --graph --oneline --all
    last = log -1 HEAD

[credential]
    helper = osxkeychain

[pull]
    rebase = true

[push]
    default = current
    autoSetupRemote = true

[init]
    defaultBranch = main

[color]
    ui = auto

[transfer]
    parallel = 4`}
      />

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/configuration/repository">Repository Configuration</Link>
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
