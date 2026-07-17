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
  title: "Advanced CLI Commands",
  description:
    "Current integrity and read-only maintenance commands, plus clearly labeled low-level roadmap work.",
};

const currentCommands = [
  {
    command: "fsck",
    purpose: "Verify local objects, manifests, commits, refs, and commit-graph links",
    usage: "dits fsck [-v]",
  },
  {
    command: "gc",
    purpose: "Report unreachable-object candidates without deleting anything",
    usage: "dits gc --dry-run",
  },
];

const roadmapCommands = [
  "prune",
  "pack",
  "unpack",
  "cat-file",
  "hash-object",
  "rev-parse",
  "ls-tree",
  "ls-files",
];

export default function AdvancedCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference"
        title="Advanced Commands"
        description="Use the current local diagnostics without mistaking planned object plumbing for shipped commands."
      />

      <Callout type="warning" title="Alpha safety boundary" className="not-prose my-6">
        Keep independent backups before investigating repository internals. Do
        not delete or rewrite files inside <code>.dits/objects</code> by hand.
      </Callout>

      <h2>Current commands</h2>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Command</TableHead>
            <TableHead>Current behavior</TableHead>
            <TableHead>Usage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentCommands.map((item) => (
            <TableRow key={item.command}>
              <TableCell className="font-mono font-medium">{item.command}</TableCell>
              <TableCell>{item.purpose}</TableCell>
              <TableCell className="font-mono text-sm">{item.usage}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2><code>dits fsck</code></h2>

      <p>
        <code>fsck</code> reads local repository structures, verifies BLAKE3
        object paths against their bytes, checks manifests and commits, and
        validates refs and commit-graph links. It reports a nonzero result when
        integrity errors are found; it does not fetch or repair missing data.
      </p>

      <CodeBlock
        language="bash"
        code={`# Check the repository
dits fsck

# Show each check as it runs
dits fsck --verbose`}
      />

      <h2><code>dits gc</code></h2>

      <p>
        Destructive garbage collection is disabled. The only supported mode is
        a read-only candidate report:
      </p>

      <CodeBlock
        language="bash"
        code={`dits gc --dry-run

# These flags are accepted but ignored in read-only mode:
dits gc --dry-run --prune --aggressive`}
      />

      <Callout type="important" title="No space is reclaimed" className="not-prose my-6">
        Bare <code>dits gc</code> returns a nonzero error without changes.
        <code> --prune</code> and <code>--aggressive</code> never delete or
        repack data in the current alpha. See the detailed
        <Link href="/docs/cli/maintenance"> maintenance reference</Link>.
      </Callout>

      <h2>Low-level object commands are roadmap</h2>

      <p>
        The following familiar Git-shaped names are not Dits commands today.
        They are design candidates, so examples that show them succeeding are
        intentionally omitted:
      </p>

      <ul>
        {roadmapCommands.map((command) => (
          <li key={command}><code>dits {command}</code></li>
        ))}
      </ul>

      <p>
        Use <code>dits --help</code> as the command-level authority and the
        <Link href="/docs/roadmap"> status and roadmap</Link> for capability
        maturity.
      </p>
    </div>
  );
}
