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
  title: "Local Lock Commands",
  description:
    "Create, inspect, and release advisory lock records in one local Dits repository.",
};

const commands = [
  {
    command: "lock",
    description: "Create a local advisory lock record",
    usage: "dits lock [OPTIONS] <PATH>",
  },
  {
    command: "unlock",
    description: "Release a local lock record",
    usage: "dits unlock [OPTIONS] <PATH>",
  },
  {
    command: "locks",
    description: "List active local lock records",
    usage: "dits locks [OPTIONS]",
  },
];

export default function LockCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference"
        title="Local Lock Commands"
        description="Record editing intent inside one repository. These locks are local advisory metadata, not remote team coordination."
      />

      <Callout type="warning" title="Not distributed enforcement" className="not-prose my-6">
        Lock records live in the local repository. Dits does not synchronize
        them, lease them from a server, or use them as multi-user authorization.
        Other programs—and Dits operations that do not consult this store—can
        still modify, rename, or delete the file.
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

      <h2><code>dits lock</code></h2>

      <p>
        Adds a path, owner, expiry time, and optional reason to
        <code> .dits/locks.json</code>. The owner is derived from Git&apos;s
        <code> user.email</code> when available, then from the local system user.
        The default time to live is eight hours.
      </p>

      <CodeBlock
        language="bash"
        code={`# Create a local record with the default TTL
dits lock footage/scene01.mov --reason "Color pass"

# Choose a TTL in hours
dits lock footage/scene01.mov --ttl 2

# Replace an existing local record deliberately
dits lock footage/scene01.mov --force`}
      />

      <h2><code>dits locks</code></h2>

      <CodeBlock
        language="bash"
        code={`# List active records
dits locks

# Include full local record details
dits locks --verbose

# Filter by the stored owner identifier
dits locks --owner editor@example.com`}
      />

      <p>
        Expired records are omitted from listings. A list is a snapshot of one
        local lock file; it does not query another workstation or a service.
      </p>

      <h2><code>dits unlock</code></h2>

      <CodeBlock
        language="bash"
        code={`# Release a record owned by the current local identity
dits unlock footage/scene01.mov

# Override the owner check for this local record
dits unlock footage/scene01.mov --force`}
      />

      <Callout type="note" title="A lightweight local convention" className="not-prose my-6">
        These commands can help coordinate processes or people who deliberately
        share and honor the same repository metadata. For real multi-machine
        exclusivity, use an external coordination system until remote lock
        semantics are implemented.
      </Callout>

      <p>
        See the <Link href="/docs/roadmap">status and roadmap</Link> for the
        remote-lock boundary and <Link href="/docs/cli/files">file commands</Link>
        for local staging and commits.
      </p>
    </div>
  );
}
