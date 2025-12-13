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
import { Settings, Info, Trash2, ShieldCheck, BarChart, FileSearch, Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "Maintenance Commands",
  description: "Commands for repository maintenance, garbage collection, and integrity checks in Dits",
};

const commands = [
  { command: "gc", description: "Run garbage collection", usage: "dits gc [OPTIONS]" },
  { command: "fsck", description: "Verify repository integrity", usage: "dits fsck [OPTIONS]" },
  { command: "repo-stats", description: "Show repository statistics", usage: "dits repo-stats [OPTIONS]" },
  { command: "inspect-file", description: "Inspect file dedup stats", usage: "dits inspect-file <PATH>" },
  { command: "config", description: "Get and set configuration", usage: "dits config <KEY> [VALUE]" },
];

export default function MaintenanceCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="h-8 w-8 text-slate-500" />
        <h1 className="mb-0">Maintenance Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Keep your repository healthy with garbage collection, integrity checks,
        and configuration management. These commands help optimize storage and
        ensure data integrity.
      </p>

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
        <Trash2 className="h-5 w-5" />
        dits gc
      </h2>
      <p>
        Run garbage collection to remove unreferenced objects and reclaim disk
        space. Dits automatically runs GC periodically, but you can trigger it
        manually.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits gc [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--aggressive        Run aggressive GC (more thorough, slower)
--dry-run           Show what would be collected without deleting
--prune <DATE>      Prune objects older than date
--auto              Run only if needed (based on heuristics)
--keep-packs        Don't repack objects
--progress          Show progress bar
-v, --verbose       Show detailed output`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Run garbage collection
$ dits gc

Running garbage collection...

  Scanning objects: 45,892
  Finding unreferenced: 1,234 objects
  Checking stale stashes: 3 expired

Cleanup:
  Orphaned chunks:    1,200 (2.3 GB)
  Expired stashes:    3 (45 MB)
  Unreferenced trees: 34 (12 KB)

Reclaimed: 2.35 GB
Duration: 45s

# Dry run to preview
$ dits gc --dry-run

Would remove:
  1,200 orphaned chunks (2.3 GB)
  3 expired stashes (45 MB)
  34 unreferenced trees (12 KB)

Total: 2.35 GB would be reclaimed

# Aggressive GC (after major deletions)
$ dits gc --aggressive

Running aggressive garbage collection...

  Phase 1: Scanning all objects... done
  Phase 2: Building reachability graph... done
  Phase 3: Identifying unreferenced... done
  Phase 4: Removing objects... done
  Phase 5: Repacking remaining... done
  Phase 6: Verifying integrity... done

Reclaimed: 5.6 GB
Duration: 8m 32s

# Prune objects older than 30 days
$ dits gc --prune 30d

Pruning objects older than 30 days...
  Removed: 456 objects (890 MB)

# Auto GC (run only if needed)
$ dits gc --auto

Repository doesn't need GC yet.
(Run 'dits gc' to force)`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>When to Run GC</AlertTitle>
        <AlertDescription>
          Run garbage collection after: deleting large files, resetting branches,
          cleaning up old stashes, or whenever you want to reclaim disk space.
          Dits runs light GC automatically, but manual runs can be more thorough.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5" />
        dits fsck
      </h2>
      <p>
        Verify repository integrity. Checks that all objects are valid, properly
        linked, and not corrupted.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits fsck [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--full              Full verification (verify all chunk hashes)
--strict            Strict mode (treat warnings as errors)
--repair            Attempt to repair issues
--progress          Show progress bar
--json              Output as JSON
-v, --verbose       Show all checks, not just issues`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Quick integrity check
$ dits fsck

Checking repository integrity...

  Commits:     567 checked
  Trees:       1,234 checked
  Assets:      156 checked
  Chunks:      45,892 checked (metadata only)
  References:  12 checked

Repository is healthy.

# Full verification (slow but thorough)
$ dits fsck --full

Checking repository integrity (full mode)...

  Commits:     567 ████████████████████ 100%
  Trees:       1,234 ████████████████████ 100%
  Assets:      156 ████████████████████ 100%
  Chunks:      45,892 ████████████████████ 100%
    Verifying hashes: 45,892 of 45,892

All objects verified.
Repository is healthy.

Duration: 12m 45s

# Check with repair
$ dits fsck --repair

Checking repository integrity...

  ✓ Commits: 567 OK
  ✓ Trees: 1,234 OK
  ✗ Assets: 1 issue found
    - footage/corrupted.mov: missing chunk abc1234
  ✓ Chunks: 45,891 OK

Repair options:
  1. Re-fetch missing chunk from remote
  2. Remove reference to corrupted file
  3. Skip (manual repair later)

Select option [1]: 1

Fetching chunk abc1234 from origin... done
Repair complete.

# Strict mode (for CI/CD)
$ dits fsck --strict
Exit code: 0  # All checks passed`}</code>
      </pre>

      <h3>What fsck Checks</h3>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Check</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Mode</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Object existence</TableCell>
            <TableCell>All referenced objects exist</TableCell>
            <TableCell>Quick</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Reference validity</TableCell>
            <TableCell>Refs point to valid commits</TableCell>
            <TableCell>Quick</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Commit chain</TableCell>
            <TableCell>Parent commits exist and form valid DAG</TableCell>
            <TableCell>Quick</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Tree entries</TableCell>
            <TableCell>Trees reference valid assets</TableCell>
            <TableCell>Quick</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Asset manifests</TableCell>
            <TableCell>Assets reference valid chunks</TableCell>
            <TableCell>Quick</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Chunk hashes</TableCell>
            <TableCell>Chunk content matches hash</TableCell>
            <TableCell>Full only</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2 className="flex items-center gap-2">
        <BarChart className="h-5 w-5" />
        dits repo-stats
      </h2>
      <p>
        Show detailed repository statistics including deduplication efficiency,
        storage usage, and file breakdown.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits repo-stats [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`-v, --verbose       Show per-file breakdown
--json              Output as JSON
--format <FMT>      Output format (table, json)`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`$ dits repo-stats

Repository Statistics (commit abc1234)

  Branch:   main
  Commit:   abc1234def5
  Message:  Add footage for episode 2

Files:
  Tracked files:    156
  Total size:       128.00 GiB (logical)

Storage:
  Physical size:    87.30 GiB (actual storage used)
  Pack files:       12 (42 GiB)
  Loose objects:    4,567 (45.3 GiB)

Deduplication:
  Unique chunks:    93,542
  Total chunks:     145,678
  Chunk reuse:      35.8%
  Space saved:      40.70 GiB (31.8%)
  Dedup ratio:      0.682 (physical / logical, lower is better)

Analysis:
  ✓ Good deduplication. Significant chunk reuse detected.

# Verbose with per-file breakdown
$ dits repo-stats -v

Per-File Breakdown:

  Path                             Size        Chunks   Type    Unique
  ─────────────────────────────────────────────────────────────────────
  footage/scene01.mov              10.0 GiB    10,240   MP4     2%
  footage/scene02.mov              12.3 GiB    12,595   MP4     5%
  footage/scene01_v2.mov           10.2 GiB    10,445   MP4     98% shared with scene01.mov
  project.prproj                   2.1 MiB     3        file    100%
  ...

Most Deduplicated Files:
  footage/scene01_v2.mov - 98% shared with other files
  footage/interview_b.mov - 95% shared with other files
  ...`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <FileSearch className="h-5 w-5" />
        dits inspect-file
      </h2>
      <p>
        Inspect a specific file&apos;s chunk structure and deduplication statistics.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits inspect-file [OPTIONS] &lt;PATH&gt;</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--chunks            List all chunk hashes
--shared            Show which files share chunks
--json              Output as JSON`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`$ dits inspect-file footage/scene01.mov

Inspecting: footage/scene01.mov

File Information:
  Path:         footage/scene01.mov
  Commit:       abc1234def5
  Manifest:     9e21c38bbf5
  Content hash: 8d92f0e4a1b
  Type:         MP4 (structure-aware)

Size:
  Logical size:          10.00 GiB
  Estimated unique size: 208.00 MiB

Chunk Breakdown:
  Total chunks:  10,240
  Shared chunks: 10,032 (98.0%)
  Unique chunks: 208 (2.0%)

Deduplication Analysis:
  This file shares 10,032 chunks with other files in the repo.
  Estimated storage savings: 9.79 GiB

# See which files share chunks
$ dits inspect-file --shared footage/scene01_v2.mov

Shares chunks with:
  footage/scene01.mov     9,856 chunks (96.2%)
  footage/scene01_v3.mov  10,012 chunks (97.8%)`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <Wrench className="h-5 w-5" />
        dits config
      </h2>
      <p>
        Get and set repository configuration values. Configuration can be
        local (repo-specific) or global (user-wide).
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits config [OPTIONS] &lt;KEY&gt; [VALUE]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--global            Use global config (~/.config/dits/config)
--local             Use local config (.dits/config) - default
--system            Use system config
--list              List all config values
--unset             Remove a config key
--edit              Open config in editor
--get               Get value (explicit)`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Set user identity (global)
$ dits config --global user.name "John Editor"
$ dits config --global user.email "john@example.com"

# Get a config value
$ dits config user.email
john@example.com

# List all config
$ dits config --list

user.name=John Editor
user.email=john@example.com
core.editor=vim
remote.origin.url=https://dits.example.com/project
cache.size=10GB
...

# Set local config
$ dits config cache.size 50GB

# Unset a value
$ dits config --unset cache.size

# Edit config file
$ dits config --global --edit
# Opens ~/.config/dits/config in editor`}</code>
      </pre>

      <h3>Common Configuration Keys</h3>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Default</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">user.name</TableCell>
            <TableCell>Your name for commits</TableCell>
            <TableCell>-</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">user.email</TableCell>
            <TableCell>Your email for commits</TableCell>
            <TableCell>-</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">core.editor</TableCell>
            <TableCell>Editor for commit messages</TableCell>
            <TableCell>$EDITOR</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">cache.size</TableCell>
            <TableCell>Local cache size limit</TableCell>
            <TableCell>10GB</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">push.default</TableCell>
            <TableCell>Default push behavior</TableCell>
            <TableCell>current</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">gc.auto</TableCell>
            <TableCell>Auto GC threshold</TableCell>
            <TableCell>6700</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">chunk.minSize</TableCell>
            <TableCell>Minimum chunk size</TableCell>
            <TableCell>256KB</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">chunk.avgSize</TableCell>
            <TableCell>Target average chunk size</TableCell>
            <TableCell>1MB</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/storage">Storage Commands</Link> - Manage storage tiers
        </li>
        <li>
          <Link href="/docs/cli/video">Video Commands</Link> - File inspection
        </li>
        <li>
          <Link href="/docs/configuration">Configuration</Link> - Full config reference
        </li>
      </ul>
    </div>
  );
}
