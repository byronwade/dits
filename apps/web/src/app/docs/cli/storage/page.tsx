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
  title: "Experimental Local Lifecycle Commands",
  description:
    "Actual freeze, thaw, status, and policy syntax for the local lifecycle experiment; no cloud storage movement or speed guarantee.",
};

const commands = [
  { command: "freeze-init", behavior: "Initialize local tracking for existing chunks", usage: "dits freeze-init" },
  { command: "freeze-status", behavior: "Summarize locally tracked lifecycle labels", usage: "dits freeze-status" },
  { command: "freeze", behavior: "Move selected local chunks to another local tier directory", usage: "dits freeze [FILES]... [OPTIONS]" },
  { command: "thaw", behavior: "Move selected local chunks back to the hot object directory", usage: "dits thaw [FILES]... [--all]" },
  { command: "freeze-policy", behavior: "List, select, or inspect a local policy preset", usage: "dits freeze-policy [NAME] [--list]" },
];

export default function StorageCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Experimental CLI"
        title="Local Lifecycle Commands"
        description="Manage an alpha freeze/thaw experiment inside one local repository. Cloud storage and transparent hydration are not implemented."
      />

      <Callout type="warning" title="Back up before freezing" className="not-prose my-6">
        These commands can move chunks out of <code>.dits/objects</code> and can
        compress the archive copy. A frozen file may not be usable through normal
        repository reads until its chunks are thawed. Evaluate only on disposable
        or independently backed-up data and verify the result.
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
              <TableCell>{item.behavior}</TableCell>
              <TableCell className="font-mono text-sm">{item.usage}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2>Initialize and inspect</h2>

      <p>
        <code>freeze-init</code> records existing local chunks in the lifecycle
        tracker. <code>freeze-status</code> reports local counts, bytes, and
        policy-eligible transitions. Neither command accepts configuration,
        provider, cost, JSON, or verbosity flags.
      </p>

      <CodeBlock
        language="bash"
        code={`dits freeze-init
dits freeze-status`}
      />

      <h2><code>dits freeze</code></h2>

      <p>
        With file paths, moves their chunks to the local tier selected by
        <code> --tier</code> (cold by default). <code>--all</code> selects all
        eligible chunks and defaults to archive. <code>--apply-policy</code>
        applies the selected local policy. These modes do not upload data.
      </p>

      <CodeBlock
        language="bash"
        code={`dits freeze footage/old-take.mov
dits freeze footage/old-take.mov --tier warm
dits freeze --all --tier archive
dits freeze --apply-policy`}
      />

      <h2><code>dits thaw</code></h2>

      <p>
        With file paths, restores locally warm or cold chunks and queues locally
        archived chunks for the experiment&apos;s simulated delay. <code>--all</code>
        selects every cold or archived chunk. With no paths, the command processes
        the local thaw queue. There are no expedited, bulk, wait, notify, or
        provider retrieval options.
      </p>

      <CodeBlock
        language="bash"
        code={`dits thaw footage/old-take.mov
dits thaw --all

# Process the local archive thaw queue
dits thaw`}
      />

      <h2><code>dits freeze-policy</code></h2>

      <p>
        Lists or selects one built-in preset. Arbitrary key/value rules,
        immediate-apply flags, and cloud lifecycle configuration are not part of
        this command.
      </p>

      <CodeBlock
        language="bash"
        code={`dits freeze-policy --list
dits freeze-policy default
dits freeze-policy aggressive
dits freeze-policy conservative`}
      />

      <Callout type="note" title="Local directories, not service levels" className="not-prose my-6">
        Warm, cold, and archive map to directories inside <code>.dits</code>.
        The labels carry no access-time, durability, availability, replication,
        retention, recovery, or cost guarantee.
      </Callout>

      <p>
        See the <Link href="/docs/advanced/storage-tiers">lifecycle boundary</Link>,
        <Link href="/docs/cli/maintenance"> maintenance commands</Link>, and
        <Link href="/docs/roadmap"> status and roadmap</Link>.
      </p>
    </div>
  );
}
