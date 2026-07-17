import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Local Diff Command",
  description: "Current alpha syntax and limits for working-tree and staged Dits diffs.",
};

export default function DiffPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference · Current"
        title="Local diff"
        description="Inspect working-tree or staged changes through the narrow diff surface implemented by the alpha."
      />

      <h2><code>dits diff</code></h2>
      <CodeBlock
        language="text"
        code={`dits diff [OPTIONS] [FILE]

Options:
    --staged             Show staged changes
-c, --commit <COMMIT>    Resolve a commit before diffing
-h, --help               Show command help`}
      />

      <h3>Implemented modes</h3>
      <ul>
        <li>
          With no flag, Dits shows tracked modified or deleted working-tree paths
          against the current HEAD state.
        </li>
        <li>
          <code>--staged</code> reports staged additions, modifications, deletions,
          renames, type changes, and mode changes.
        </li>
        <li>
          The optional <code>FILE</code> is one exact repository-relative path, not a
          pathspec, directory expansion, or glob.
        </li>
        <li>
          Working-tree text files receive a line diff. Binary files receive a
          changed marker and size information, not a semantic or chunk-region diff.
        </li>
      </ul>

      <CodeBlock
        language="bash"
        code={`dits diff
dits diff README.md
dits diff --staged
dits diff --staged footage/scene.mov`}
      />

      <Callout type="important" title="--commit is not a historical comparison yet" className="not-prose my-6">
        The current implementation validates that the supplied commit resolves, then
        still renders the working tree against HEAD. It does not compare two commits
        or branches. Do not use it as evidence of a historical diff.
      </Callout>

      <h2>Unsupported Git-like syntax</h2>
      <p>
        Dits does not currently accept two commit operands, revision ranges,{" "}
        <code>--cached</code>, <code>--stat</code>, <code>--name-only</code>,{" "}
        <code>--word-diff</code>, <code>--chunk-diff</code>, or a <code>--</code>
        pathspec separator on this command. There is no <code>difftool</code> command
        or alias configuration surface.
      </p>

      <p>
        Use <Link href="/docs/cli/history">history commands</Link> for commit
        inspection and <Link href="/docs/cli/files">file commands</Link> for status
        and staging. Exact syntax comes from <code>dits diff --help</code>.
      </p>
    </div>
  );
}
