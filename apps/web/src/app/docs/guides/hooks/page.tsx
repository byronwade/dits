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
  title: "Manual Local Hooks",
  description: "Current manual hook installation and execution boundary in the Dits alpha.",
};

const actions = [
  { action: "list", behavior: "List recognized hook names and whether a file is installed" },
  { action: "install <HOOK>", behavior: "Write a sample into .dits/hooks, marking it executable on Unix; --force may overwrite" },
  { action: "uninstall <HOOK>", behavior: "Remove the named local hook file" },
  { action: "show <HOOK>", behavior: "Print the installed file, or the built-in sample if absent" },
  { action: "run <HOOK> [-- <ARGS>...]", behavior: "Execute one installed hook manually and propagate failure" },
];

const hookNames = [
  "pre-commit",
  "prepare-commit-msg",
  "commit-msg",
  "post-commit",
  "pre-push",
  "post-merge",
  "pre-checkout",
  "post-checkout",
  "pre-rebase",
  "post-rebase",
  "pre-auto-gc",
  "post-rewrite",
];

export default function HooksPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Guide · Current manual utility"
        title="Manual local hooks"
        description="Install, inspect, and explicitly run local scripts; normal Dits operations do not invoke them automatically."
      />

      <Callout type="important" title="Hooks are not wired into commands" className="not-prose my-6">
        <code>dits commit</code>, checkout, merge, rebase, GC, and other operations do
        not automatically run these files. Network push is disabled, so a hook named
        <code> pre-push</code> is only a recognized template name. Run a hook
        explicitly with <code>dits hooks run</code>.
      </Callout>

      <h2>Command surface</h2>
      <CodeBlock
        language="text"
        code={`dits hooks <ACTION> [HOOK] [--force] [-- <ARGS>...]`}
      />
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Current behavior</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((item) => (
            <TableRow key={item.action}>
              <TableCell className="font-mono font-medium">{item.action}</TableCell>
              <TableCell>{item.behavior}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CodeBlock
        language="bash"
        code={`dits hooks list
dits hooks install pre-commit
dits hooks show pre-commit

# Arguments after -- are passed to the executable
dits hooks run pre-commit -- --check

dits hooks uninstall pre-commit`}
      />

      <h2>Recognized names</h2>
      <p>{hookNames.map((name) => <code className="mr-2" key={name}>{name}</code>)}</p>
      <p>
        Names describe intended events, but they do not imply automatic lifecycle
        integration or a stable argument/stdin contract. The manual CLI runner does
        not supply stdin.
      </p>

      <h2>Execution boundary</h2>
      <p>
        Installed scripts live at <code>.dits/hooks/&lt;name&gt;</code>. Manual run
        executes the file from the repository root, sets <code>DITS_DIR</code> and
        <code> DITS_HOOK</code>, captures stdout/stderr, and returns nonzero when the
        script fails.
      </p>
      <Callout type="warning" title="Hooks execute arbitrary local code" className="not-prose my-6">
        Inspect every script before installing or running it. Built-in samples are
        starting points and some invoke Git commands; adapt them to your repository
        and platform. Dits provides no sandbox, signature verification, server-side
        hooks, or policy enforcement.
      </Callout>

      <p>
        See <Link href="/docs/cli/files">local file commands</Link> and{" "}
        <Link href="/docs/cli/remotes">the disabled remote boundary</Link>.
      </p>
    </div>
  );
}
