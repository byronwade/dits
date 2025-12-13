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

export const metadata: Metadata = {
  title: "Environment Variables",
  description: "Configure Dits behavior using environment variables",
};

const envVars = [
  {
    var: "DITS_DIR",
    description: "Override .dits directory location",
    example: "/path/to/.dits",
  },
  {
    var: "DITS_WORK_TREE",
    description: "Override working tree location",
    example: "/path/to/worktree",
  },
  {
    var: "DITS_CACHE_DIR",
    description: "Override cache directory",
    example: "/path/to/cache",
  },
  {
    var: "DITS_CONFIG_GLOBAL",
    description: "Override global config file path",
    example: "~/.config/dits/config",
  },
  {
    var: "DITS_CONFIG_SYSTEM",
    description: "Override system config file path",
    example: "/etc/ditsconfig",
  },
  {
    var: "DITS_EDITOR",
    description: "Override editor for messages",
    example: "vim",
  },
  {
    var: "DITS_PAGER",
    description: "Override pager for output",
    example: "less -R",
  },
  {
    var: "DITS_SSH_COMMAND",
    description: "Custom SSH command",
    example: "ssh -i ~/.ssh/custom_key",
  },
  {
    var: "DITS_AUTHOR_NAME",
    description: "Override author name",
    example: "Script Bot",
  },
  {
    var: "DITS_AUTHOR_EMAIL",
    description: "Override author email",
    example: "bot@example.com",
  },
  {
    var: "DITS_AUTHOR_DATE",
    description: "Override author date",
    example: "2024-01-15T10:30:00",
  },
  {
    var: "DITS_COMMITTER_NAME",
    description: "Override committer name",
    example: "CI Server",
  },
  {
    var: "DITS_COMMITTER_EMAIL",
    description: "Override committer email",
    example: "ci@example.com",
  },
  {
    var: "DITS_COMMITTER_DATE",
    description: "Override committer date",
    example: "2024-01-15T10:30:00",
  },
];

const debugVars = [
  {
    var: "DITS_TRACE",
    description: "Enable trace logging",
    values: "0, 1, 2 (verbosity level)",
  },
  {
    var: "DITS_TRACE_PACKET",
    description: "Trace network packets",
    values: "0 or 1",
  },
  {
    var: "DITS_TRACE_PERFORMANCE",
    description: "Trace performance metrics",
    values: "0 or 1",
  },
  {
    var: "DITS_CURL_VERBOSE",
    description: "Verbose HTTP output",
    values: "0 or 1",
  },
];

export default function EnvVarsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Environment Variables</h1>
      <p className="lead text-xl text-muted-foreground">
        Environment variables provide a way to configure Dits without modifying
        configuration files, useful for scripts and CI/CD pipelines.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Priority Order</AlertTitle>
        <AlertDescription>
          Environment variables override configuration file settings. The full
          priority order is: Environment → Repository → Global → System → Defaults
        </AlertDescription>
      </Alert>

      <h2>Core Environment Variables</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Variable</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Example</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {envVars.map((env) => (
            <TableRow key={env.var}>
              <TableCell className="font-mono text-sm">{env.var}</TableCell>
              <TableCell>{env.description}</TableCell>
              <TableCell className="font-mono text-sm">{env.example}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2>Repository Location Variables</h2>

      <h3>DITS_DIR</h3>
      <p>
        Override the location of the <code>.dits</code> directory:
      </p>
      <pre className="not-prose">
        <code>{`# Use a different .dits location
$ DITS_DIR=/custom/path/.dits dits status

# Useful for working with multiple repositories
$ DITS_DIR=/repo1/.dits dits log
$ DITS_DIR=/repo2/.dits dits log`}</code>
      </pre>

      <h3>DITS_WORK_TREE</h3>
      <p>
        Set the working tree location independently from the repository:
      </p>
      <pre className="not-prose">
        <code>{`# Work tree in different location
$ DITS_DIR=/repo/.dits DITS_WORK_TREE=/worktree dits status

# Useful for bare repositories with worktrees
$ export DITS_DIR=/srv/repo.dits
$ export DITS_WORK_TREE=/var/www/site
$ dits pull`}</code>
      </pre>

      <h3>DITS_CACHE_DIR</h3>
      <p>
        Override where Dits stores cached chunks:
      </p>
      <pre className="not-prose">
        <code>{`# Use faster storage for cache
$ export DITS_CACHE_DIR=/ssd/dits-cache

# Shared cache for CI runners
$ export DITS_CACHE_DIR=/shared/cache/dits`}</code>
      </pre>

      <h2>Author/Committer Override</h2>
      <p>
        Override the author and committer information for commits:
      </p>

      <pre className="not-prose">
        <code>{`# In a CI pipeline, commit as the CI system
$ export DITS_AUTHOR_NAME="CI Bot"
$ export DITS_AUTHOR_EMAIL="ci@example.com"
$ export DITS_COMMITTER_NAME="CI Bot"
$ export DITS_COMMITTER_EMAIL="ci@example.com"
$ dits commit -m "Automated commit"

# Backdate a commit (for importing history)
$ DITS_AUTHOR_DATE="2023-06-15T14:30:00" dits commit -m "Import"`}</code>
      </pre>

      <h2>Editor and Pager</h2>
      <pre className="not-prose">
        <code>{`# Use a specific editor for this session
$ DITS_EDITOR="nano" dits commit

# Disable pager
$ DITS_PAGER="" dits log

# Use a custom pager
$ DITS_PAGER="less -FRSX" dits diff`}</code>
      </pre>

      <h2>SSH Configuration</h2>
      <pre className="not-prose">
        <code>{`# Use a specific SSH key
$ DITS_SSH_COMMAND="ssh -i ~/.ssh/deploy_key" dits clone git@example.com:repo

# Use SSH with custom options
$ export DITS_SSH_COMMAND="ssh -o StrictHostKeyChecking=no"
$ dits push`}</code>
      </pre>

      <h2>Debug and Trace Variables</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Variable</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Values</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {debugVars.map((env) => (
            <TableRow key={env.var}>
              <TableCell className="font-mono text-sm">{env.var}</TableCell>
              <TableCell>{env.description}</TableCell>
              <TableCell className="font-mono text-sm">{env.values}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h3>Debugging Commands</h3>
      <pre className="not-prose">
        <code>{`# Enable trace logging
$ DITS_TRACE=1 dits fetch
trace: fetch origin
trace: connecting to example.com
trace: negotiating pack...

# More verbose tracing
$ DITS_TRACE=2 dits push

# Trace network packets
$ DITS_TRACE_PACKET=1 dits clone https://example.com/repo

# Performance tracing
$ DITS_TRACE_PERFORMANCE=1 dits add large-file.mov
performance: chunking: 2.345s
performance: hashing: 0.567s
performance: staging: 0.123s`}</code>
      </pre>

      <h2>CI/CD Examples</h2>

      <h3>GitHub Actions</h3>
      <pre className="not-prose">
        <code>{`# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      DITS_AUTHOR_NAME: "GitHub Actions"
      DITS_AUTHOR_EMAIL: "actions@github.com"
      DITS_CACHE_DIR: /tmp/dits-cache
    steps:
      - uses: actions/checkout@v4
      - name: Configure Dits
        run: |
          dits config user.name "$DITS_AUTHOR_NAME"
          dits config user.email "$DITS_AUTHOR_EMAIL"
      - name: Deploy
        run: |
          dits add .
          dits commit -m "Deploy from CI"
          dits push`}</code>
      </pre>

      <h3>GitLab CI</h3>
      <pre className="not-prose">
        <code>{`# .gitlab-ci.yml
variables:
  DITS_AUTHOR_NAME: "GitLab CI"
  DITS_AUTHOR_EMAIL: "ci@gitlab.com"
  DITS_SSH_COMMAND: "ssh -o StrictHostKeyChecking=no"

deploy:
  script:
    - dits push`}</code>
      </pre>

      <h3>Jenkins</h3>
      <pre className="not-prose">
        <code>{`// Jenkinsfile
pipeline {
    environment {
        DITS_AUTHOR_NAME = 'Jenkins'
        DITS_AUTHOR_EMAIL = 'jenkins@example.com'
    }
    stages {
        stage('Build') {
            steps {
                sh 'dits pull'
                sh 'make build'
            }
        }
    }
}`}</code>
      </pre>

      <h2>Shell Configuration</h2>
      <p>
        Add environment variables to your shell profile:
      </p>

      <pre className="not-prose">
        <code>{`# ~/.bashrc or ~/.zshrc

# Dits configuration
export DITS_EDITOR="code --wait"
export DITS_PAGER="less -R"

# Shared cache
export DITS_CACHE_DIR="$HOME/.cache/dits"

# Debug mode (uncomment when needed)
# export DITS_TRACE=1`}</code>
      </pre>

      <h2>Checking Active Configuration</h2>
      <pre className="not-prose">
        <code>{`# See effective configuration including env vars
$ dits config --show-origin --list

# Check specific value source
$ dits config --show-origin user.email
file:~/.ditsconfig    user.email=jane@example.com

# With environment override
$ DITS_AUTHOR_EMAIL="override@example.com" dits config --show-origin user.email
command line: user.email=override@example.com`}</code>
      </pre>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/configuration/global">Global Configuration</Link>
        </li>
        <li>
          <Link href="/docs/configuration/repository">Repository Configuration</Link>
        </li>
        <li>
          <Link href="/docs/configuration">Configuration Overview</Link>
        </li>
      </ul>
    </div>
  );
}
