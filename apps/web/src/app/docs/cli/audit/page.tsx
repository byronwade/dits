import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { CodeBlock } from "@/components/ui/code-block";
import { Callout } from "@/components/ui/callout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Local Audit Commands",
  description:
    "Inspect, summarize, and export the local alpha audit log without compliance claims.",
};

const commands = [
  {
    command: "audit",
    description: "Show recent local events or filter by event type",
    usage: "dits audit [--last <N>] [--event-type <TYPE>]",
  },
  {
    command: "audit-stats",
    description: "Summarize outcomes in the local log",
    usage: "dits audit-stats",
  },
  {
    command: "audit-export",
    description: "Export the local log as JSON",
    usage: "dits audit-export [--output <PATH>]",
  },
];

export default function AuditCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference"
        title="Local Audit Commands"
        description="Read the repository-local alpha audit log. It is a diagnostic facility, not a complete or tamper-proof record."
      />

      <Callout type="warning" title="Not a compliance control" className="not-prose my-6">
        The log is a local JSON-lines file under <code>.dits</code>. A user with
        filesystem access can edit or remove it, and current commands do not
        record every repository operation. It provides no remote identity,
        append-only evidence, retention guarantee, certification, or hosted
        audit policy.
      </Callout>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Command</TableHead>
            <TableHead>Current behavior</TableHead>
            <TableHead>Usage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commands.map((item) => (
            <TableRow key={item.command}>
              <TableCell className="font-mono font-medium">{item.command}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell className="font-mono text-sm">{item.usage}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2><code>dits audit</code></h2>

      <p>
        Shows the newest 20 events by default. Each printed row includes the
        timestamp, event type, outcome, and optional resource stored in the local
        record.
      </p>

      <CodeBlock
        language="bash"
        code={`# Show the newest local records
dits audit

# Choose a count
dits audit --last 50

# Filter by a recognized event type
dits audit --event-type logout`}
      />

      <p>
        Recognized filter names include <code>login</code>, <code>logout</code>,
        <code> login_failed</code>, <code>password_changed</code>,
        <code> keystore_created</code>, <code>repo_init</code>,
        <code> commit_created</code>, <code>file_added</code>,
        <code> file_accessed</code>, and <code>encryption_enabled</code>. A
        recognized name means the reader understands that event schema; it does
        not mean every corresponding command currently emits that event.
      </p>

      <h2><code>dits audit-stats</code></h2>

      <p>
        Counts total, successful, failed, and denied records and reports the
        oldest and newest timestamps present. The figures describe only the
        current local file.
      </p>

      <CodeBlock language="bash" code={`dits audit-stats`} />

      <h2><code>dits audit-export</code></h2>

      <CodeBlock
        language="bash"
        code={`# Print one JSON document to standard output
dits audit-export

# Write the same export to a local file
dits audit-export --output audit-export.json`}
      />

      <Callout type="note" title="Protect exported metadata" className="not-prose my-6">
        Events can contain repository paths, timestamps, outcomes, and client
        version information. Apply your own access, retention, and redaction
        policy before sharing an export.
      </Callout>

      <p>
        See <Link href="/docs/architecture/security">security architecture</Link>
        for the current trust boundary and the
        <Link href="/docs/roadmap"> status and roadmap</Link> for planned
        multi-user controls.
      </p>
    </div>
  );
}
