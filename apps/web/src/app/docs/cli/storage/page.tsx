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
import { HardDrive, Info, Snowflake, Sun, Settings, BarChart } from "lucide-react";

export const metadata: Metadata = {
  title: "Storage Tier Commands",
  description: "Commands for managing hot, warm, and cold storage tiers in Dits",
};

const commands = [
  { command: "freeze-init", description: "Initialize lifecycle tracking", usage: "dits freeze-init [OPTIONS]" },
  { command: "freeze-status", description: "Show storage tier status", usage: "dits freeze-status [OPTIONS]" },
  { command: "freeze", description: "Move chunks to colder storage", usage: "dits freeze [OPTIONS] <PATH>" },
  { command: "thaw", description: "Restore chunks from cold storage", usage: "dits thaw [OPTIONS] <PATH>" },
  { command: "freeze-policy", description: "Set or view lifecycle policy", usage: "dits freeze-policy [OPTIONS]" },
];

export default function StorageCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="h-8 w-8 text-sky-500" />
        <h1 className="mb-0">Storage Tier Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Manage data across hot, warm, and cold storage tiers. Automatically move
        infrequently accessed files to cheaper storage while keeping active files
        instantly available.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Tiered Storage Architecture</AlertTitle>
        <AlertDescription>
          <strong>Hot:</strong> Local SSD for active files (instant access).
          <strong> Warm:</strong> Cloud object storage like S3 Standard (seconds).
          <strong> Cold:</strong> Archive storage like Glacier (hours). Dits moves
          data between tiers based on access patterns.
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
        <Settings className="h-5 w-5" />
        dits freeze-init
      </h2>
      <p>
        Initialize lifecycle tracking for the repository. Sets up storage tier
        configuration and metadata tracking.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits freeze-init [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--warm-backend <URL>    Configure warm storage backend
--cold-backend <URL>    Configure cold storage backend
--hot-limit <SIZE>      Maximum hot storage size (default: 100GB)
-v, --verbose           Show detailed setup`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Initialize with defaults
$ dits freeze-init

Initializing lifecycle tracking...

Storage Tiers:
  HOT:  .dits/objects/ (local)
  WARM: Not configured
  COLD: Not configured

Lifecycle tracking enabled.
Run 'dits freeze-policy' to configure automatic tiering.

# Initialize with S3 backends
$ dits freeze-init \\
    --warm-backend s3://my-bucket/warm \\
    --cold-backend s3-glacier://my-bucket/cold \\
    --hot-limit 50GB

Initializing lifecycle tracking...

Storage Tiers:
  HOT:  .dits/objects/ (local, limit: 50 GB)
  WARM: s3://my-bucket/warm
  COLD: s3-glacier://my-bucket/cold

Testing connectivity... done
Lifecycle tracking enabled.`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <BarChart className="h-5 w-5" />
        dits freeze-status
      </h2>
      <p>
        Show the current status of all storage tiers. Displays size, object counts,
        and cost estimates.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits freeze-status [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--cost              Show cost estimates
--files             List files by tier
--json              Output as JSON
-v, --verbose       Show detailed information`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`$ dits freeze-status

Storage Tier Status:

  Tier    Location                       Size      Objects   Access
  ────────────────────────────────────────────────────────────────────
  HOT     .dits/objects/                 45.2 GB   12,456    instant
  WARM    s3://my-bucket/warm            234.5 GB  45,892    ~seconds
  COLD    s3-glacier://my-bucket/cold    1.2 TB    156,234   ~hours

  Total Storage: 1.48 TB

Recent Activity (last 7 days):
  Promoted to HOT:   234 chunks (2.1 GB)
  Demoted to WARM:   567 chunks (5.4 GB)
  Archived to COLD:  1,234 chunks (15 GB)

# Show cost estimates
$ dits freeze-status --cost

Monthly Cost Estimate:

  HOT (local):       $0.00 (local storage)

  WARM (S3 Standard):
    Storage:         234.5 GB × $0.023/GB = $5.39
    Requests:        45,000 × $0.0004    = $0.18
    Transfer:        50 GB × $0.09/GB    = $4.50
    Subtotal:        $10.07

  COLD (Glacier):
    Storage:         1.2 TB × $0.004/GB  = $4.80
    Retrieval:       2 restores avg      = $3.00
    Subtotal:        $7.80

  Total Estimated: $17.87/month

# List files by tier
$ dits freeze-status --files

HOT (45.2 GB, 12,456 chunks):
  footage/scene01.mov     2.3 GB   last accessed: 2h ago
  footage/scene02.mov     1.8 GB   last accessed: 1d ago
  project.prproj          125 MB   last accessed: 10m ago
  ...

WARM (234.5 GB, 45,892 chunks):
  footage/old-takes/*     45 GB    last accessed: 14d ago
  archive/2024/*          189 GB   last accessed: 30d ago
  ...`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <Snowflake className="h-5 w-5" />
        dits freeze
      </h2>
      <p>
        Manually move files or chunks to colder storage. Useful for archiving
        completed projects or rarely accessed media.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits freeze [OPTIONS] &lt;PATH&gt;...</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--tier <TIER>       Target tier (warm, cold) - default: warm
--reason <TEXT>     Reason for freezing
-n, --dry-run       Show what would be frozen
--progress          Show progress
-v, --verbose       Show detailed output`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Freeze old footage to warm storage
$ dits freeze footage/2023-archive/

Freezing: footage/2023-archive/
  Files: 156
  Size: 234.5 GB
  Target tier: WARM

Uploading to warm storage... 100% ████████████████████
Removing from hot storage... done

Frozen: 234.5 GB moved to WARM tier

# Freeze to cold storage (for long-term archive)
$ dits freeze --tier cold footage/completed-projects/

Freezing: footage/completed-projects/
  Files: 89
  Size: 1.2 TB
  Target tier: COLD

Warning: Cold storage retrieval takes 3-12 hours.
Continue? [y/N] y

Uploading to cold storage... 100% ████████████████████
Frozen: 1.2 TB moved to COLD tier

# Dry run
$ dits freeze -n footage/2023-archive/

Would freeze:
  footage/2023-archive/project1/  (45.2 GB)
  footage/2023-archive/project2/  (89.1 GB)
  footage/2023-archive/project3/  (100.2 GB)

Total: 234.5 GB would move to WARM`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <Sun className="h-5 w-5" />
        dits thaw
      </h2>
      <p>
        Restore files from cold or warm storage to hot storage. Required before
        accessing archived files.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits thaw [OPTIONS] &lt;PATH&gt;...</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--expedited         Use expedited retrieval (faster, higher cost)
--bulk              Use bulk retrieval (slower, lower cost)
--wait              Wait for thaw to complete
--notify            Send notification when complete
-n, --dry-run       Show what would be thawed`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Thaw archived footage
$ dits thaw footage/2023-archive/

Thawing: footage/2023-archive/

Current tier: COLD
Retrieval method: Standard
Estimated time: 3-5 hours

Initiating restore request... done

Thaw request submitted.
You will be notified when files are ready.

Check status with: dits freeze-status

# Expedited thaw (faster, costs more)
$ dits thaw --expedited footage/2023-archive/project1/hero.mov

Thawing: footage/2023-archive/project1/hero.mov (2.3 GB)

Retrieval method: Expedited
Estimated time: 1-5 minutes
Additional cost: ~$0.03/GB = $0.07

Restoring... done!
File is now available in HOT storage.

# Wait for thaw to complete
$ dits thaw --wait footage/old-project/

Thawing: footage/old-project/ (45 GB)
Estimated time: 3-5 hours

Waiting for restore... ████████░░░░░░░░░░░░ 42%
ETA: 2h 15m remaining

# Check thaw status
$ dits freeze-status

Pending Thaw Operations:
  footage/2023-archive/  (234.5 GB)
    Status: RESTORING
    Progress: 65%
    ETA: 1h 30m`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        dits freeze-policy
      </h2>
      <p>
        Configure automatic lifecycle policies. Files are automatically moved
        between tiers based on access patterns.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits freeze-policy [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--set <KEY=VALUE>   Set a policy value
--remove <KEY>      Remove a policy rule
--list              List current policies
--apply             Apply policies immediately
--json              Output as JSON`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# View current policies
$ dits freeze-policy --list

Lifecycle Policies:

  Default Rules:
    warm-after:     7d   (move to warm after 7 days idle)
    cold-after:     90d  (move to cold after 90 days idle)
    evict-hot:      30d  (remove from hot after synced to warm)

  Pattern Rules:
    raw/**          warm-after: 3d, cold-after: 30d
    *.prproj        warm-after: never (keep hot)
    archive/**      cold-after: 1d

# Set default warm policy
$ dits freeze-policy --set warm-after=14d

Updated: Files move to WARM after 14 days without access.

# Keep project files always hot
$ dits freeze-policy --set "pattern.*.prproj.warm-after=never"

Updated: *.prproj files will never be moved to warm storage.

# Aggressive archival for raw footage
$ dits freeze-policy --set "pattern.raw/**.warm-after=3d"
$ dits freeze-policy --set "pattern.raw/**.cold-after=30d"

Updated: raw/** files move to warm after 3d, cold after 30d.

# Apply policies immediately (run lifecycle check)
$ dits freeze-policy --apply

Applying lifecycle policies...

Would move to WARM:
  footage/old-takes/   45.2 GB   (idle 14+ days)

Would move to COLD:
  archive/2024-q1/     189 GB    (idle 90+ days)

Apply these changes? [y/N] y

Processing...
  Moving to WARM: 45.2 GB
  Moving to COLD: 189 GB

Done.`}</code>
      </pre>

      <h2>Storage Backend Configuration</h2>
      <pre className="not-prose">
        <code>{`# .dits/config

[storage.warm]
    type = s3
    bucket = my-project-warm
    region = us-west-2
    storageClass = STANDARD_IA

[storage.cold]
    type = s3-glacier
    bucket = my-project-archive
    region = us-west-2
    retrievalTier = Standard

[lifecycle]
    warmAfter = 7d
    coldAfter = 90d
    evictHotAfter = 30d`}</code>
      </pre>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/vfs">VFS Commands</Link> - Mount and cache management
        </li>
        <li>
          <Link href="/docs/cli/maintenance">Maintenance Commands</Link> - Garbage collection
        </li>
        <li>
          <Link href="/docs/cli/remotes">Remote Commands</Link> - Push/pull with remotes
        </li>
      </ul>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/advanced/storage-tiers">Storage Tiers Guide</Link> - Deep dive into tiered storage
        </li>
        <li>
          <Link href="/docs/configuration">Configuration</Link> - Backend configuration
        </li>
      </ul>
    </div>
  );
}
