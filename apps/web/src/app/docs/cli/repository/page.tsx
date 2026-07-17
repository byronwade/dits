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
  title: "Repository Commands",
  description:
    "Initialize, inspect, and locally clone Dits repositories, with the remote configuration boundary made explicit.",
};

const commands = [
  {
    command: "init",
    description: "Initialize a repository on the local filesystem",
    usage: "dits init [PATH]",
  },
  {
    command: "clone",
    description: "Copy a repository from another local path",
    usage: "dits clone <SOURCE_PATH> [DEST] [-b <BRANCH>]",
  },
  {
    command: "remote",
    description: "Store and inspect remote URL configuration only",
    usage: "dits remote [ACTION] [NAME] [URL]",
  },
  {
    command: "status",
    description: "Show the current local working-tree and index state",
    usage: "dits status",
  },
];

export default function RepositoryCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference"
        title="Repository Commands"
        description="Create and inspect local repositories. Local-filesystem clone is current; network repository exchange is not."
      />

      <Callout type="warning" title="Remotes fail closed" className="not-prose my-6">
        <code>push</code>, <code>pull</code>, <code>fetch</code>, and
        <code> sync</code> return a nonzero error for both local-path and Internet
        remotes without changing objects, refs, or the working tree. Network
        clone also fails. A saved remote URL is configuration, not a working
        backup or collaboration channel.
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

      <h2><code>dits init</code></h2>

      <p>
        Initializes <code>.dits</code> in the current directory or the local path
        you provide.
      </p>

      <CodeBlock
        language="bash"
        code={`# Current directory
dits init

# A new or existing local directory
dits init ./evaluation-project`}
      />

      <h2><code>dits clone</code></h2>

      <p>
        Opens and validates another Dits repository on the same filesystem,
        copies its Dits objects, refs, local configuration, and embedded Git
        object database, records the canonical source path as <code>origin</code>,
        then checks out the source HEAD or the branch selected with
        <code> --branch</code>. The destination must not already exist or resolve
        inside the source worktree.
      </p>

      <CodeBlock
        language="bash"
        code={`# Local-filesystem clone
dits clone /srv/repos/project ./project-copy

# Select a local source branch
dits clone /srv/repos/project ./review-copy --branch review`}
      />

      <Callout type="note" title="A local copy is not an independent backup by default" className="not-prose my-6">
        If source and destination share a disk, account, or failure domain, they
        can be lost together. Use a separately managed backup process for
        important data and verify restored files independently. Clone copies
        committed objects, refs, and local configuration—not working-tree
        changes, the index, locks, audit records, generated proxy/metadata
        caches, lifecycle records, or experimental project side stores.
      </Callout>

      <Callout type="warning" title="Clone failures remain visible" className="not-prose my-6">
        Source metadata symlinks and special files are rejected before the
        destination is created. If checkout fails after initialization, clone
        returns nonzero and leaves the incomplete destination in place for
        inspection; it must not be treated as a successful copy.
      </Callout>

      <h2><code>dits remote</code></h2>

      <p>
        The remote command reads and writes named URLs in local repository
        configuration. It does not contact the URL or discover branches.
      </p>

      <CodeBlock
        language="bash"
        code={`# Store a URL (no connection is attempted)
dits remote add origin https://example.invalid/team/project

# List configured names and URLs
dits remote list --verbose

# Read or update a configured URL
dits remote get-url origin
dits remote set-url origin https://example.invalid/team/new-project

# Rename or remove configuration
dits remote rename origin upstream
dits remote remove upstream`}
      />

      <p>
        The accepted actions are <code>add</code>, <code>remove</code> (or
        <code> rm</code>), <code>rename</code>, <code>get-url</code>,
        <code> set-url</code>, and <code>list</code>. The optional
        <code> --push</code> flag selects the separately stored push URL for
        <code> get-url</code> or <code>set-url</code>; it still performs no
        transfer.
      </p>

      <h2><code>dits status</code></h2>

      <p>
        Shows the current branch, staged paths, and local working-tree changes.
        Run it before and after an alpha evaluation step to make state changes
        visible.
      </p>

      <CodeBlock language="bash" code={`dits status`} />

      <p>
        Continue with the <Link href="/docs/cli/remotes">remote command status</Link>,
        the <Link href="/docs/cli/files">local file workflow</Link>, or the
        <Link href="/docs/roadmap">status and roadmap</Link>.
      </p>
    </div>
  );
}
