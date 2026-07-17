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
  title: "Local File Commands",
  description:
    "Current add, restore, commit, stash, clean, and archive syntax for local Dits repositories.",
};

const commands = [
  { command: "add", behavior: "Stage one or more local files or directories", usage: "dits add <PATH>..." },
  { command: "restore", behavior: "Restore or unstage selected local paths", usage: "dits restore <PATH>... [OPTIONS]" },
  { command: "commit", behavior: "Create a local commit from the index", usage: "dits commit -m <MESSAGE>" },
  { command: "stash", behavior: "Manage local working-tree stashes", usage: "dits stash [ACTION] [OPTIONS]" },
  { command: "clean", behavior: "Preview or remove untracked working-tree paths", usage: "dits clean (-n | -f) [OPTIONS] [PATH]..." },
  { command: "archive", behavior: "Archive paths selected by a local ref using available worktree bytes", usage: "dits archive [TREE_ISH] [OPTIONS]" },
];

export default function FileCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference"
        title="Local File Commands"
        description="Stage, restore, commit, temporarily set aside, clean, and archive local repository content."
      />

      <Callout type="warning" title="No dits rm or dits mv" className="not-prose my-6">
        The current parser does not provide <code>dits rm</code> or
        <code> dits mv</code>. Do not rely on examples written for those
        nonexistent commands. Check <code>dits status</code> after filesystem
        changes and keep an independent backup while evaluating deletion and
        rename workflows.
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

      <h2><code>dits add</code></h2>

      <p>
        Stages each supplied file or directory for the next commit. The command
        has no current flags: options such as <code>--all</code>,
        <code> --dry-run</code>, <code>--patch</code>, and <code>--force</code>
        are not accepted.
      </p>

      <CodeBlock
        language="bash"
        code={`dits add notes.txt
dits add footage/ graphics/
dits add .
dits status`}
      />

      <h2><code>dits restore</code></h2>

      <p>
        Restores required paths from the default source or a commit selected with
        <code> --source</code>. Use <code>--staged</code> to unstage and
        <code> --worktree</code> to select the working tree explicitly. The
        parser also accepts <code>--ours</code> and <code>--theirs</code>, but
        merge-conflict restoration is not complete in this alpha.
      </p>

      <CodeBlock
        language="bash"
        code={`dits restore notes.txt
dits restore --source <commit-id> footage/scene.mov
dits restore --staged notes.txt
dits restore --worktree notes.txt`}
      />

      <h2><code>dits commit</code></h2>

      <p>
        Creates a local commit from staged state. A message is required.
      </p>

      <CodeBlock language="bash" code={`dits commit --message "Add review assets"`} />

      <h2><code>dits stash</code></h2>

      <p>
        Supported actions are <code>push</code>, <code>pop</code>,
        <code> apply</code>, <code>list</code>, <code>drop</code>,
        <code> clear</code>, and <code>show</code>. Use <code>--message</code>
        with <code>push</code> and <code>--index</code> to choose a stash for an
        action that accepts one.
      </p>

      <CodeBlock
        language="bash"
        code={`dits stash push --message "Before alternate cut"
dits stash list
dits stash show --index 0
dits stash apply --index 0
dits stash drop --index 0`}
      />

      <h2><code>dits clean</code></h2>

      <p>
        Operates on untracked working-tree paths, not historical repository
        objects. Preview mode or force is required. <code>-d</code> includes
        directories, <code>-x</code> includes ignored files, <code>-X</code>
        selects only ignored files, and <code>--exclude</code> preserves matching
        paths.
      </p>

      <CodeBlock
        language="bash"
        code={`# Always preview the exact scope first
dits clean --dry-run
dits clean --dry-run -d renders/

# Destructive: removes the previewed untracked paths from the working tree
dits clean --force -d renders/`}
      />

      <Callout type="important" title="Clean is destructive" className="not-prose my-6">
        <code>clean --force</code> deletes untracked working-tree data. Confirm
        the dry-run output and backup anything you may need before using it.
        This is separate from <code>dits gc --dry-run</code>, which only reports
        unreachable repository-object candidates and never deletes them.
      </Callout>

      <h2><code>dits archive</code></h2>

      <p>
        Creates <code>tar</code>, <code>tar.gz</code>, or <code>zip</code> output.
        A resolvable local commit, branch, or tag selects the manifest paths, but
        the current implementation reads available bytes from the working tree
        and skips selected paths that are absent there. Verify the archive; do
        not treat it as a guaranteed byte-exact historical export. Use
        <code> --prefix</code> to place members below a directory,
        <code> --output</code> to select the file, and trailing paths to limit
        the selection.
      </p>

      <CodeBlock
        language="bash"
        code={`dits archive HEAD --format tar.gz --output review.tar.gz
dits archive main --format zip --output footage.zip -- footage/`}
      />

      <p>
        Use <code>dits &lt;command&gt; --help</code> for exact parser syntax and see
        <Link href="/docs/cli/maintenance"> maintenance commands</Link> for
        integrity and storage inspection.
      </p>
    </div>
  );
}
