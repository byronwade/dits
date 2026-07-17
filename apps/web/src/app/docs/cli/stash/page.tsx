import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Local Stash Command",
  description: "Current alpha stash actions, numeric selection, and recovery limits.",
};

export default function StashPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference · Current"
        title="Local stash"
        description="Temporarily record supported staged and tracked working-tree changes in the current repository."
      />

      <Callout type="warning" title="A stash is not a backup" className="not-prose my-6">
        Stash is an alpha convenience workflow with no remote copy or general conflict
        resolver. Keep an independent backup before pushing, popping, dropping, or
        clearing important work.
      </Callout>

      <h2>Syntax</h2>
      <CodeBlock
        language="text"
        code={`dits stash [ACTION] [OPTIONS]

Actions:
  push | save   Save supported local changes (default action)
  pop           Apply a stash and remove its list entry
  apply         Apply a stash without removing its list entry
  list          List stash entries
  show          Show paths recorded by a stash
  drop          Remove one stash entry
  clear         Remove every stash entry

Options:
-m, --message <MESSAGE>   Message for push/save
-i, --index <N>           Numeric entry index for pop/apply/show/drop`}
      />

      <h2>Examples</h2>
      <CodeBlock
        language="bash"
        code={`# Save; push is optional because it is the default
dits stash push --message "WIP grade"
dits stash

dits stash list
dits stash show --index 0

dits stash apply --index 0
dits stash pop --index 0

dits stash drop --index 1
dits stash clear`}
      />

      <p>
        Index <code>0</code> is the newest entry. The parser accepts a numeric
        <code> --index</code>; it does not accept Git-style{" "}
        <code>stash@&#123;N&#125;</code> operands.
      </p>

      <h2>Current limits</h2>
      <ul>
        <li>
          There is no pathspec selection, <code>--keep-index</code>, untracked or
          ignored-file switch, branch creation, expiration policy, or patch mode.
        </li>
        <li>
          <code>show</code> lists recorded paths and stash metadata; it does not
          produce a full diff.
        </li>
        <li>
          Apply and pop restore recorded paths directly. They do not perform a
          three-way content merge or offer a conflict-resolution UI.
        </li>
        <li>
          Drop and clear remove entries from the stash list. Dits does not promise a
          supported recovery command for removed entries.
        </li>
      </ul>

      <Callout type="important" title="Do not use fsck as stash recovery" className="not-prose my-6">
        <code>dits fsck</code> verifies the bounded repository integrity contract. It
        has no <code>--unreachable</code> recovery mode and cannot recreate a dropped
        stash entry for you.
      </Callout>

      <p>
        See <Link href="/docs/cli/files">file commands</Link> and{" "}
        <Link href="/docs/cli/history">local history</Link> for related workflows.
      </p>
    </div>
  );
}
