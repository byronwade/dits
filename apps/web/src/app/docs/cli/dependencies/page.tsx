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
import { Activity, Info, CheckCircle, GitBranch, List } from "lucide-react";

export const metadata: Metadata = {
  title: "Dependency Commands",
  description: "Commands for tracking project file dependencies in Dits",
};

const commands = [
  { command: "dep-check", description: "Check dependencies for project files", usage: "dits dep-check [OPTIONS] [PATH]" },
  { command: "dep-graph", description: "Show dependency graph", usage: "dits dep-graph [OPTIONS] [FILE]" },
  { command: "dep-list", description: "List all project files", usage: "dits dep-list [OPTIONS]" },
];

export default function DependencyCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-8 w-8 text-lime-500" />
        <h1 className="mb-0">Dependency Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Track and analyze dependencies in NLE project files. Dits parses Premiere
        Pro, DaVinci Resolve, After Effects, and Final Cut Pro projects to
        identify linked media files and catch missing assets.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Why Track Dependencies?</AlertTitle>
        <AlertDescription>
          NLE project files reference external media. When you commit a project,
          Dits ensures all referenced files are also tracked. This prevents
          &quot;missing media&quot; errors when someone else opens your project.
        </AlertDescription>
      </Alert>

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
        <CheckCircle className="h-5 w-5" />
        dits dep-check
      </h2>
      <p>
        Check that all dependencies for project files are present and tracked.
        Identifies missing media, untracked files, and broken links.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits dep-check [OPTIONS] [PATH]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--strict            Fail on any untracked dependency
--fix               Suggest fixes for issues
--json              Output as JSON
-v, --verbose       Show all dependencies, not just issues`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Check all project files
$ dits dep-check

Checking dependencies...

  Project: project.prproj (Premiere Pro)
  ─────────────────────────────────────

  Linked Assets: 45
    ✓ footage/scene01.mov
    ✓ footage/scene02.mov
    ✓ footage/scene03.mov
    ✗ footage/missing-file.mov (NOT FOUND)
    ⚠ audio/music.wav (untracked)
    ⚠ graphics/logo.png (untracked)
    ...

  Status:
    Tracked: 42
    Missing: 1
    Untracked: 2

  Issues:
    1. footage/missing-file.mov - File not found on disk
    2. audio/music.wav - File exists but not tracked
    3. graphics/logo.png - File exists but not tracked

  Run 'dits add audio/music.wav graphics/logo.png' to track untracked files.

# Check specific project
$ dits dep-check project.prproj

# Verbose output (show all dependencies)
$ dits dep-check -v

Dependencies for project.prproj:
  footage/scene01.mov           tracked  2.3 GB
  footage/scene02.mov           tracked  1.8 GB
  footage/scene03.mov           tracked  2.1 GB
  audio/music.wav               untracked  45 MB
  ...

# Strict mode (CI/CD)
$ dits dep-check --strict
Error: 2 untracked dependencies found
Exit code: 1`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <GitBranch className="h-5 w-5" />
        dits dep-graph
      </h2>
      <p>
        Visualize the dependency graph for project files. Shows which media files
        are used by which projects and identifies shared assets.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits dep-graph [OPTIONS] [FILE]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--format <FMT>      Output format (tree, dot, json)
--depth <N>         Maximum depth to display
--reverse           Show reverse dependencies (what uses this file)
--shared            Highlight shared dependencies`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Show dependency tree for project
$ dits dep-graph project.prproj

project.prproj
├── footage/
│   ├── scene01.mov (2.3 GB)
│   ├── scene02.mov (1.8 GB)
│   └── scene03.mov (2.1 GB)
├── audio/
│   ├── music.wav (45 MB)
│   └── sfx/
│       ├── whoosh.wav (2 MB)
│       └── impact.wav (1 MB)
└── graphics/
    └── logo.png (500 KB)

Total: 8 files (6.25 GB)

# Reverse dependencies (what uses this file?)
$ dits dep-graph --reverse footage/scene01.mov

footage/scene01.mov is used by:
├── project.prproj (Premiere Pro)
│   └── Sequence: "Main Edit" at 00:00:00
├── color-grade.drp (DaVinci Resolve)
│   └── Timeline at 00:00:00
└── vfx-comp.aep (After Effects)
    └── Composition: "Scene 1 VFX" as layer 1

# Export as DOT for visualization
$ dits dep-graph --format dot project.prproj > deps.dot
$ dot -Tpng deps.dot > deps.png

# Show shared dependencies
$ dits dep-graph --shared

Shared Assets (used by multiple projects):
  footage/scene01.mov
    ├── project.prproj
    ├── color-grade.drp
    └── vfx-comp.aep

  audio/music.wav
    ├── project.prproj
    └── trailer.prproj`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <List className="h-5 w-5" />
        dits dep-list
      </h2>
      <p>
        List all recognized project files in the repository. Shows which NLE
        applications created them and their last modified date.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits dep-list [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--type <TYPE>       Filter by application (premiere, resolve, ae, fcpx)
--format <FMT>      Output format (table, json)
--with-deps         Include dependency count`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# List all project files
$ dits dep-list

Project Files (5):

  File                      Application         Version   Modified
  ────────────────────────────────────────────────────────────────────
  project.prproj            Premiere Pro        24.0      2025-01-15
  color-grade.drp           DaVinci Resolve     18.5      2025-01-14
  vfx-comp.aep              After Effects       24.0      2025-01-13
  trailer.prproj            Premiere Pro        24.0      2025-01-12
  archive/old-edit.prproj   Premiere Pro        23.0      2024-12-01

# List with dependency counts
$ dits dep-list --with-deps

  File                      Application       Dependencies  Size
  ─────────────────────────────────────────────────────────────────
  project.prproj            Premiere Pro      45            125 GB
  color-grade.drp           DaVinci Resolve   12            45 GB
  vfx-comp.aep              After Effects     8             23 GB
  ...

# Filter by application
$ dits dep-list --type premiere

Premiere Pro Projects (2):
  project.prproj            24.0    2025-01-15
  trailer.prproj            24.0    2025-01-12`}</code>
      </pre>

      <h2>Supported Project Formats</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Application</TableHead>
            <TableHead>Extension</TableHead>
            <TableHead>Parsing Support</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Adobe Premiere Pro</TableCell>
            <TableCell className="font-mono">.prproj</TableCell>
            <TableCell>Full (linked media, sequences, effects)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>DaVinci Resolve</TableCell>
            <TableCell className="font-mono">.drp</TableCell>
            <TableCell>Full (media pool, timelines, grades)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>After Effects</TableCell>
            <TableCell className="font-mono">.aep</TableCell>
            <TableCell>Full (footage, compositions, layers)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Final Cut Pro</TableCell>
            <TableCell className="font-mono">.fcpbundle</TableCell>
            <TableCell>Full (events, projects, media)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Avid Media Composer</TableCell>
            <TableCell className="font-mono">.avp</TableCell>
            <TableCell>Basic (linked media references)</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Workflow Integration</h2>
      <pre className="not-prose">
        <code>{`# Pre-commit hook: Ensure all dependencies are tracked
# .dits/hooks/pre-commit

#!/bin/bash
dits dep-check --strict
if [ $? -ne 0 ]; then
    echo "Error: Untracked dependencies found."
    echo "Run 'dits add <files>' to track them before committing."
    exit 1
fi

# CI check: Verify project completeness
$ dits dep-check --strict --json | jq '.issues | length'
0  # No issues = ready to merge`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Automatic Tracking</AlertTitle>
        <AlertDescription>
          When you run <code>dits add project.prproj</code>, Dits automatically
          prompts you to add any untracked dependencies. Use <code>dits add -A</code>
          to include all dependencies automatically.
        </AlertDescription>
      </Alert>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/files">File Commands</Link> - Add and track files
        </li>
        <li>
          <Link href="/docs/cli/metadata">Metadata Commands</Link> - File technical info
        </li>
        <li>
          <Link href="/docs/cli/video">Video Commands</Link> - Video inspection
        </li>
      </ul>
    </div>
  );
}
