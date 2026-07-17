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
  title: "Local Maintenance Commands",
  description:
    "Current read-only garbage-collection reporting, integrity checks, repository statistics, file inspection, and configuration syntax.",
};

const commands = [
  { command: "gc", behavior: "Report unreachable-object candidates without deleting them", usage: "dits gc --dry-run" },
  { command: "fsck", behavior: "Verify local objects, references, commits, and refs", usage: "dits fsck [-v]" },
  { command: "repo-stats", behavior: "Show statistics for the current local repository", usage: "dits repo-stats [-v]" },
  { command: "inspect-file", behavior: "Inspect a tracked file and optionally list chunk IDs", usage: "dits inspect-file <PATH> [--chunks]" },
  { command: "config", behavior: "Read or update one selected TOML configuration file", usage: "dits config [OPTIONS] [KEY] [VALUE]" },
];

export default function MaintenanceCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference"
        title="Local Maintenance Commands"
        description="Inspect repository health and storage using the narrow command surface implemented by the current alpha."
      />

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
              <TableCell>{item.behavior}</TableCell>
              <TableCell className="font-mono text-sm">{item.usage}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2><code>dits gc</code></h2>

      <p>
        Audits which Dits objects appear unreachable. The current implementation
        is report-only and does not reclaim disk space.
      </p>

      <CodeBlock
        language="bash"
        code={`dits gc --dry-run

# Accepted but ignored in read-only mode
dits gc --dry-run --prune --aggressive`}
      />

      <Callout type="warning" title="Destructive GC is disabled" className="not-prose my-6">
        Bare <code>dits gc</code> returns a nonzero error without changing
        objects or locks. <code>--prune</code> and <code>--aggressive</code> are
        reserved and ignored. Do not delete files manually from
        <code> .dits/objects</code>.
      </Callout>

      <h2><code>dits fsck</code></h2>

      <p>
        Reads the local object store, verifies BLAKE3 paths against stored bytes,
        follows manifest references to chunks, Git blobs, and MP4 structure
        blobs, validates regular-entry size/content identity, checks commits and
        refs, and checks commit-graph links. <code>--verbose</code> prints each
        check as it runs.
      </p>

      <CodeBlock
        language="bash"
        code={`dits fsck
dits fsck --verbose`}
      />

      <Callout type="important" title="Detection, not repair" className="not-prose my-6">
        <code>fsck</code> has no <code>--full</code>, <code>--strict</code>,
        <code> --repair</code>, or JSON mode. It returns nonzero for integrity
        errors but does not fetch or reconstruct missing data. Recover from an
        independently verified backup.
      </Callout>

      <h2><code>dits repo-stats</code></h2>

      <p>
        Summarizes the current local commit, tracked logical bytes, locally stored
        bytes, and observed byte-identical chunk reuse. <code>--verbose</code>
        adds the implementation&apos;s per-file breakdown. Results describe this
        repository snapshot; they are not a general deduplication guarantee.
      </p>

      <CodeBlock
        language="bash"
        code={`dits repo-stats
dits repo-stats --verbose`}
      />

      <h2><code>dits inspect-file</code></h2>

      <p>
        Looks up one tracked repository-relative path and reports its stored
        manifest and chunk information. <code>--chunks</code> lists the chunk
        identifiers. There is no current <code>--shared</code> or JSON option.
      </p>

      <CodeBlock
        language="bash"
        code={`dits inspect-file footage/scene.mov
dits inspect-file footage/scene.mov --chunks`}
      />

      <h2><code>dits config</code></h2>

      <p>
        Reads or updates either <code>.dits/config.toml</code> or the
        platform-specific global file selected with <code>--global</code>. The
        current alpha selects one file; it does not merge a layered effective
        configuration.
      </p>

      <CodeBlock
        language="bash"
        code={`# Read or set one repository-local value
dits config chunking.target_size
dits config chunking.target_size 128KB

# List the selected file
dits config --list

# Select the global file or remove an optional key
dits config --global telemetry.enabled false
dits config --global --unset user.email`}
      />

      <p>
        Only documented keys are accepted. See the
        <Link href="/docs/configuration"> configuration reference</Link> and use
        <code> dits &lt;command&gt; --help</code> for parser-authoritative syntax.
      </p>
    </div>
  );
}
