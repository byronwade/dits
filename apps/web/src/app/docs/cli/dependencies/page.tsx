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
  title: "Experimental Dependency Commands",
  description:
    "Exact alpha syntax and parser limits for local Dits project-dependency inspection.",
};

const commands = [
  {
    command: "dep-check",
    behavior: "Validate selected, staged, or all tracked recognized project files",
    usage: "dits dep-check [FILES]... [--all] [--strict]",
  },
  {
    command: "dep-graph",
    behavior: "Render one recognized project file as a tree, JSON, statistics, or list",
    usage: "dits dep-graph <FILE> [-f|--format <FORMAT>]",
  },
  {
    command: "dep-list",
    behavior: "List recognized project files tracked by the current repository",
    usage: "dits dep-list",
  },
];

export default function DependencyCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference · Experimental"
        title="Project dependency commands"
        description="Inspect local references found by the current fixture-bounded NLE parsers."
      />

      <Callout type="warning" title="Parser results are not a completeness proof" className="not-prose my-6">
        The current experiment recognizes <code>.prproj</code>, <code>.drp</code>,{" "}
        <code>.fcpxml</code>, and <code>.aep</code>. Vendor formats evolve, and
        valid references may be missed or misread. Preserve the original project and
        verify results in the authoring application.
      </Callout>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Command</TableHead>
            <TableHead>Experimental behavior</TableHead>
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

      <h2>Current parser surface</h2>
      <CodeBlock
        language="bash"
        code={`# Check explicit project files
dits dep-check edit.prproj grade.drp

# Check every recognized tracked project; fail nonzero for missing/external refs
dits dep-check --all --strict

# With no files and no --all, check recognized staged project files
dits dep-check

# One graph; formats are tree, json, stats, or list
dits dep-graph edit.prproj --format tree

# List recognized tracked project files
dits dep-list`}
      />

      <p>
        Without <code>--strict</code>, <code>dep-check</code> reports missing or
        external references but does not fail solely because it found them. These
        commands are manual: <code>dits commit</code> does not automatically run a
        dependency check.
      </p>

      <h2>Options that do not exist</h2>
      <p>
        There is no current <code>--fix</code>, <code>--verbose</code>, reverse
        graph, depth, shared-assets, type filter, or list JSON option. JSON is only
        a supported <code>dep-graph --format json</code> value.
      </p>

      <Callout type="note" title="Local analysis only" className="not-prose my-6">
        Dependency results are not synchronized, enforced by a server, or guaranteed
        to make a project portable. Move external media deliberately and relink it in
        the source application.
      </Callout>

      <p>
        See <Link href="/docs/cli/video">video experiments</Link> and use{" "}
        <code>dits &lt;command&gt; --help</code> for parser-authoritative syntax.
      </p>
    </div>
  );
}
