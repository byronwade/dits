import type { Metadata } from "next";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";

export const metadata: Metadata = {
  title: "Branches and Merges in Dits",
  description: "Local branch, switch, merge, rebase, and binary-conflict concepts in the Dits alpha.",
};

export default function BranchingPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Core concepts"
        title="Branches and merges"
        description="Branches are local refs to commits. They let an evaluation explore alternative project states without duplicating every referenced object."
      />

      <h2>Branches are references</h2>
      <p>
        Creating a branch records another name for a commit. Shared immutable
        chunks remain shared. Switching updates the working tree to the selected
        state; actual cost depends on changed files, object availability, and the
        filesystem—not an “instant” guarantee.
      </p>

      <h2>Text and binary changes</h2>
      <p>
        Text-oriented paths can use familiar line merge behavior. Opaque binary
        assets do not have a universally safe automatic merge. Local locks are
        advisory only; <code>restore --ours/--theirs</code> fails closed and does
        not resolve conflicts. Future semantic records may enable narrower
        domain-aware conflicts.
      </p>

      <h2>Merge safety</h2>
      <p>
        Inspect status and diffs, commit or stash intentional local work, and keep
        independent backups during alpha evaluation.{" "}
        <code>restore --ours/--theirs</code> fails closed with no worktree or
        index changes; merge-conflict resolution is not implemented.
      </p>

      <Callout type="warning" title="No shared remote branch workflow yet" className="not-prose my-8">
        Local branches and merges work independently of a service. Network push,
        pull, fetch, remote refs, and remote branch protection are roadmap.
      </Callout>
    </div>
  );
}
