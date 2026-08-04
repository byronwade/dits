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
  title: "Branch and History Editing Commands",
  description:
    "Current local branch, checkout, merge, rebase, cherry-pick, and tag syntax for Dits.",
};

const commands = [
  { command: "branch", behavior: "List, create, or delete a local branch", usage: "dits branch [NAME] [-d]" },
  { command: "switch", behavior: "Switch to an existing local branch", usage: "dits switch <BRANCH>" },
  { command: "checkout", behavior: "Check out a local commit or branch", usage: "dits checkout <TARGET>" },
  { command: "merge", behavior: "Merge one local branch into the current branch", usage: "dits merge <BRANCH> [-m <MESSAGE>]" },
  { command: "rebase", behavior: "Reapply local commits on another base", usage: "dits rebase [UPSTREAM] [OPTIONS]" },
  { command: "cherry-pick", behavior: "Apply one or more local commits", usage: "dits cherry-pick <COMMIT>... [--no-commit]" },
  { command: "tag", behavior: "List, create, or delete local tags", usage: "dits tag [NAME] [OPTIONS]" },
];

export default function BranchCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference"
        title="Branch and History Editing"
        description="Work with the repository's local commit graph using only the options accepted by the current alpha."
      />

      <Callout type="important" title="Local history only" className="not-prose my-6">
        These commands do not discover or update remote-tracking branches. Dits
        remote transfer fails closed, so examples on this page operate only on
        commits and refs already present in the local repository.
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

      <h2><code>dits branch</code></h2>

      <p>
        With no name, <code>branch</code> lists local branches. With a name it
        creates a branch at the current commit; <code>--delete</code> removes the
        named local branch. Rename, copy, force-delete, merged filtering, and
        remote-listing flags are not accepted by this command.
      </p>

      <CodeBlock
        language="bash"
        code={`dits branch
dits branch feature/color-pass
dits branch --delete feature/color-pass`}
      />

      <h2>Switch and checkout</h2>

      <p>
        <code>switch</code> accepts exactly one existing branch name.
        <code> checkout</code> accepts a commit or branch target and reconstructs
        the selected state. The optional checkout mode is <code>full</code> by
        default; proxy mode belongs to the experimental media path.
      </p>

      <CodeBlock
        language="bash"
        code={`dits switch feature/color-pass
dits checkout main
dits checkout <commit-id>

# Experimental proxy checkout path
dits checkout main --mode proxy`}
      />

      <h2><code>dits merge</code></h2>

      <p>
        Merges one named local branch into the current branch. The only command
        option is an optional merge-commit message.
      </p>

      <CodeBlock
        language="bash"
        code={`dits merge feature/color-pass
dits merge feature/color-pass --message "Merge color pass"`}
      />

      <Callout type="warning" title="Conflict handling is still alpha" className="not-prose my-6">
        Inspect <code>dits status</code> after a conflict and keep an independent
        backup. <code>restore --ours/--theirs</code> fails closed without changing
        files; merge-conflict resolution is not implemented.
      </Callout>

      <h2><code>dits rebase</code></h2>

      <p>
        Rebase accepts an optional upstream plus <code>--onto</code>,
        <code> --continue</code>, <code>--abort</code>, or <code>--skip</code>.
        Interactive rebase is not implemented.
      </p>

      <CodeBlock
        language="bash"
        code={`dits rebase main
dits rebase main --onto <commit-id>
dits rebase --continue
dits rebase --skip
dits rebase --abort`}
      />

      <Callout type="warning" title="Rebase changes commit identities" className="not-prose my-6">
        Avoid rebasing history after distributing a repository copy through
        another tool or process. Dits has no working remote to coordinate that
        rewrite for you.
      </Callout>

      <h2><code>dits cherry-pick</code></h2>

      <CodeBlock
        language="bash"
        code={`dits cherry-pick <commit-id>
dits cherry-pick <first-commit> <second-commit>
dits cherry-pick --no-commit <commit-id>`}
      />

      <h2><code>dits tag</code></h2>

      <p>
        With no name, <code>tag</code> lists local tags. Create a tag by name,
        optionally selecting a commit with <code>--commit</code>. Delete with
        <code>--delete</code>. Listing can be sorted by <code>name</code>,
        <code> created</code>, or <code>version</code>; because current tags do
        not store creation timestamps, <code>created</code> presently falls back
        to name order. Annotated tags and tag pushing are not current features.
      </p>

      <CodeBlock
        language="bash"
        code={`dits tag
dits tag review-ready
dits tag review-ready --commit <commit-id>
dits tag --sort created
dits tag review-ready --delete`}
      />

      <p>
        Use <code>dits &lt;command&gt; --help</code> for parser-authoritative
        syntax. See <Link href="/docs/cli/history">history inspection</Link> and
        the <Link href="/docs/cli/remotes">disabled remote status</Link> for the
        adjacent workflows.
      </p>
    </div>
  );
}
