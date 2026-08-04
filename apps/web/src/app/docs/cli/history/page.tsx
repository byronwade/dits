import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Local History Commands",
  description: "Current local log, show, diff, blame, reflog, and bisect syntax for Dits.",
};

const commands = [
  { command: "log", usage: "dits log [-n|--limit <N>] [--oneline] [--graph] [--all]", behavior: "Walk local commit history; default limit is 10" },
  { command: "show", usage: "dits show [COMMIT] [--stat] [--name-only] [--name-status] [--no-patch]", behavior: "Show one commit; defaults to HEAD" },
  { command: "diff", usage: "dits diff [--staged] [-c|--commit <COMMIT>] [FILE]", behavior: "Inspect current working-tree or staged state" },
  { command: "blame", usage: "dits blame <FILE> [-L <START,END>]", behavior: "Attribute the current file through local history" },
  { command: "reflog", usage: "dits reflog [REF_NAME] [-n|--limit <N>]", behavior: "Read a local reflog when present or reconstruct a limited commit-history view" },
  { command: "bisect", usage: "dits bisect [ACTION] [COMMIT]", behavior: "Manage a local start/good/bad/reset/status search" },
];

export default function HistoryCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference · Current"
        title="Local history commands"
        description="Read commits and local ref history using the options implemented by the current alpha."
      />

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Command</TableHead>
            <TableHead>Current behavior</TableHead>
            <TableHead>Exact syntax</TableHead>
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

      <h2>Common local inspection</h2>
      <CodeBlock
        language="bash"
        code={`dits log
dits log --oneline --graph --all -n 25

dits show HEAD
dits show HEAD --stat
dits show a1b2c3d --name-status

dits blame src/main.rs
dits blame src/main.rs -L 20,40

dits reflog
dits reflog refs/heads/main --limit 50

dits bisect start
dits bisect bad HEAD
dits bisect good a1b2c3d
dits bisect status
dits bisect reset`}
      />

      <h2>Important boundaries</h2>
      <ul>
        <li>
          <code>log</code> supports only limit, oneline, graph, and all-branches
          switches. It has no date, author, message, path, follow, or revision-range filters.
        </li>
        <li>
          <code>show</code> resolves one commit or local ref. It does not implement
          object-path syntax such as <code>COMMIT:path</code> or custom formats.
        </li>
        <li>
          <code>blame -L</code> accepts the command&apos;s numeric line-range form;
          it is not a general Git blame option parser.
        </li>
        <li>
          Reflog and bisect are local navigation aids, not synchronized server
          state. Reflog entries are recorded for commit and checkout; other
          ref-changing commands may not append. If a reflog file is absent, the
          command labels and shows a limited view reconstructed from commit
          history. Treat neither view as a complete undo journal or durable
          recovery record.
        </li>
      </ul>

      <Callout type="warning" title="Diff is intentionally narrow" className="not-prose my-6">
        <code>dits diff</code> does not compare two commits. Its current{" "}
        <code>--commit</code> path resolves the name but still renders the working
        tree against HEAD. See the <Link href="/docs/cli/diff">diff page</Link>.
      </Callout>

      <p>
        For history-changing operations, see{" "}
        <Link href="/docs/cli/branches">branch and merge commands</Link>. Always
        inspect <code>dits &lt;command&gt; --help</code> before scripting.
      </p>
    </div>
  );
}
