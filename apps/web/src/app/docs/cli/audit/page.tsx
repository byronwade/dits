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
import { FileSearch, Info, List, BarChart, Download } from "lucide-react";

export const metadata: Metadata = {
  title: "Audit Commands",
  description: "Commands for tracking and exporting repository activity in Dits",
};

const commands = [
  { command: "audit", description: "Show audit log", usage: "dits audit [OPTIONS]" },
  { command: "audit-stats", description: "Show audit statistics", usage: "dits audit-stats [OPTIONS]" },
  { command: "audit-export", description: "Export audit log to JSON", usage: "dits audit-export [OPTIONS]" },
];

export default function AuditCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <FileSearch className="h-8 w-8 text-violet-500" />
        <h1 className="mb-0">Audit Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Track and export repository activity. Audit logs provide a complete
        record of who did what and when, essential for compliance and security.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Compliance Ready</AlertTitle>
        <AlertDescription>
          Audit logs track all significant operations: commits, pushes, pulls,
          lock operations, access attempts, and configuration changes. Logs can
          be exported for compliance reporting and security analysis.
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
        <List className="h-5 w-5" />
        dits audit
      </h2>
      <p>
        View the audit log. Shows a chronological list of repository operations
        with user, timestamp, and details.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits audit [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--since <DATE>      Show events since date
--until <DATE>      Show events until date
--user <USER>       Filter by user
--action <ACTION>   Filter by action type
--file <PATH>       Filter by file path
--limit <N>         Limit number of results (default: 50)
--json              Output as JSON
-v, --verbose       Show detailed event data`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# View recent audit events
$ dits audit

Audit Log (last 50 events):

  Time                 User              Action          Details
  ─────────────────────────────────────────────────────────────────────
  2025-01-15 16:45:32  john@example.com  push            main → abc1234
  2025-01-15 16:45:30  john@example.com  commit          "Add VFX shots"
  2025-01-15 16:30:00  john@example.com  unlock          footage/scene01.mov
  2025-01-15 14:30:00  john@example.com  lock            footage/scene01.mov
  2025-01-15 14:00:00  jane@example.com  pull            origin/main
  2025-01-15 10:00:00  jane@example.com  clone           my-project
  ...

# Filter by date range
$ dits audit --since 2025-01-14 --until 2025-01-15

Events from 2025-01-14 to 2025-01-15:
  45 events found
  ...

# Filter by user
$ dits audit --user john@example.com

Events by john@example.com:
  2025-01-15 16:45:32  push     main → abc1234
  2025-01-15 16:45:30  commit   "Add VFX shots"
  ...

# Filter by action
$ dits audit --action lock

Lock events:
  2025-01-15 14:30:00  john@example.com  lock    footage/scene01.mov
  2025-01-15 10:00:00  jane@example.com  lock    project.prproj
  ...

# Filter by file
$ dits audit --file footage/scene01.mov

Events for footage/scene01.mov:
  2025-01-15 16:30:00  john@example.com  unlock
  2025-01-15 14:30:00  john@example.com  lock
  2025-01-14 12:00:00  john@example.com  commit   Added to repo
  ...

# Verbose output
$ dits audit -v --limit 5

Event: push (2025-01-15 16:45:32)
  User: john@example.com
  IP: 192.168.1.100
  Client: dits-cli/1.0.0
  Branch: main
  Commits: 1 (abc1234)
  Chunks uploaded: 456
  Bytes transferred: 1.2 GB
  Duration: 45s
  Status: SUCCESS
  ...`}</code>
      </pre>

      <h3>Tracked Events</h3>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Logged Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">commit</TableCell>
            <TableCell>New commit created</TableCell>
            <TableCell>Hash, message, files changed</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">push</TableCell>
            <TableCell>Push to remote</TableCell>
            <TableCell>Commits, bytes, duration</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">pull</TableCell>
            <TableCell>Pull from remote</TableCell>
            <TableCell>Commits, bytes, duration</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">clone</TableCell>
            <TableCell>Repository cloned</TableCell>
            <TableCell>Source URL, method</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">lock</TableCell>
            <TableCell>File locked</TableCell>
            <TableCell>Path, reason, TTL</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">unlock</TableCell>
            <TableCell>File unlocked</TableCell>
            <TableCell>Path, forced flag</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">login</TableCell>
            <TableCell>Encryption login</TableCell>
            <TableCell>Method (password/key/hardware)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">config</TableCell>
            <TableCell>Config change</TableCell>
            <TableCell>Key, old/new values</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">access-denied</TableCell>
            <TableCell>Permission denied</TableCell>
            <TableCell>Resource, requested permission</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2 className="flex items-center gap-2">
        <BarChart className="h-5 w-5" />
        dits audit-stats
      </h2>
      <p>
        Show aggregate statistics from audit logs. Useful for understanding
        activity patterns and identifying anomalies.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits audit-stats [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--period <PERIOD>   Time period (day, week, month, year)
--group-by <FIELD>  Group by field (user, action, file)
--json              Output as JSON
-v, --verbose       Show detailed statistics`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`$ dits audit-stats

Audit Statistics (last 30 days):

  Total Events: 1,234
  Unique Users: 8
  Active Days: 28

  Events by Type:
    commit      456 (37%)
    push        234 (19%)
    pull        345 (28%)
    lock        89 (7%)
    unlock      85 (7%)
    other       25 (2%)

  Most Active Users:
    john@example.com    345 events
    jane@example.com    289 events
    alex@example.com    200 events
    ...

  Most Accessed Files:
    project.prproj          156 events
    footage/scene01.mov     89 events
    footage/scene02.mov     78 events
    ...

  Daily Activity:
    Mon ████████████████████ 234
    Tue ██████████████████   215
    Wed ████████████████     189
    Thu ███████████████      175
    Fri █████████████        156
    Sat ████                 45
    Sun ███                  35

# Weekly stats
$ dits audit-stats --period week

Statistics for week of 2025-01-13:

  Total Events: 312
  Commits: 45
  Data Transferred: 12.5 GB
  ...

# Group by user
$ dits audit-stats --group-by user

Activity by User:
  john@example.com
    Events: 345
    Commits: 89
    Pushes: 45
    Locks: 23

  jane@example.com
    Events: 289
    Commits: 67
    Pushes: 34
    Locks: 15
  ...`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <Download className="h-5 w-5" />
        dits audit-export
      </h2>
      <p>
        Export audit logs to JSON or other formats. Essential for compliance
        reporting, security analysis, and integration with external tools.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits audit-export [OPTIONS]</code>
      </pre>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`--since <DATE>      Export events since date
--until <DATE>      Export events until date
--format <FMT>      Output format (json, csv, jsonl)
--output <FILE>     Output file (default: stdout)
--compress          Compress output (gzip)
--filter <EXPR>     Filter expression`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Export last month's logs
$ dits audit-export --since 2025-01-01 --output audit-jan-2025.json

Exporting audit logs...
  Events: 1,234
  Period: 2025-01-01 to 2025-01-31
  Output: audit-jan-2025.json

Done. Exported 1,234 events.

# Export as CSV for spreadsheet
$ dits audit-export --format csv --output audit.csv

# Export with compression
$ dits audit-export --compress --output audit.json.gz

# Export filtered events
$ dits audit-export --filter "action=push AND user=john@example.com"

# Stream to external tool
$ dits audit-export --format jsonl | jq 'select(.action == "push")'

# Full audit trail for compliance
$ dits audit-export \\
    --since 2024-01-01 \\
    --until 2024-12-31 \\
    --compress \\
    --output audit-2024-full.json.gz

Exporting full year audit...
  Events: 45,678
  Size: 12.3 MB (compressed: 1.2 MB)
  Output: audit-2024-full.json.gz`}</code>
      </pre>

      <h3>Export Format</h3>
      <pre className="not-prose">
        <code>{`// JSON format (audit-export --format json)
{
  "events": [
    {
      "id": "evt-a1b2c3d4",
      "timestamp": "2025-01-15T16:45:32Z",
      "user": {
        "email": "john@example.com",
        "name": "John Editor"
      },
      "action": "push",
      "details": {
        "branch": "main",
        "commits": ["abc1234"],
        "bytes": 1234567890,
        "duration_ms": 45000
      },
      "client": {
        "version": "1.0.0",
        "platform": "darwin-arm64"
      },
      "source": {
        "ip": "192.168.1.100",
        "user_agent": "dits-cli/1.0.0"
      },
      "status": "success"
    }
  ],
  "meta": {
    "exported_at": "2025-01-31T12:00:00Z",
    "total_events": 1234,
    "period": {
      "since": "2025-01-01T00:00:00Z",
      "until": "2025-01-31T23:59:59Z"
    }
  }
}`}</code>
      </pre>

      <h2>Use Cases</h2>

      <h3>Security Investigation</h3>
      <pre className="not-prose">
        <code>{`# Find all access attempts for a file
$ dits audit --file sensitive-project.prproj --since 2025-01-01

# Check for failed access attempts
$ dits audit --action access-denied

# Export for SIEM integration
$ dits audit-export --format jsonl | curl -X POST \\
    -H "Content-Type: application/x-ndjson" \\
    https://siem.example.com/ingest`}</code>
      </pre>

      <h3>Compliance Reporting</h3>
      <pre className="not-prose">
        <code>{`# Generate quarterly audit report
$ dits audit-export \\
    --since 2025-01-01 \\
    --until 2025-03-31 \\
    --output Q1-2025-audit.json

# Count unique users with access
$ dits audit --since 2025-01-01 | grep -o '[^ ]*@[^ ]*' | sort -u | wc -l`}</code>
      </pre>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/encryption">Encryption Commands</Link> - Encrypted audit logs
        </li>
        <li>
          <Link href="/docs/cli/locks">Lock Commands</Link> - Lock audit trail
        </li>
        <li>
          <Link href="/docs/cli/history">History Commands</Link> - Commit history
        </li>
      </ul>
    </div>
  );
}
