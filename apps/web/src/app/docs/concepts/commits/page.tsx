import type { Metadata } from "next";

import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Commits and History in Dits",
  description: "How local Dits commits connect project snapshots, parents, authorship metadata, and refs.",
};

export default function CommitsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Core concepts"
        title="Commits and history"
        description="A commit records a local project state and its parent relationship, giving large assets the same navigable history shape users expect from source control."
      />

      <h2>Snapshot, not folder naming</h2>
      <p>
        A commit connects paths to exact recorded content and metadata. A parent
        relationship creates history without relying on names such as
        <code> final-final-v3</code>.
      </p>

      <h2>Staging</h2>
      <p>
        <code>dits add</code> chooses which working-tree changes belong in the next
        snapshot. <code>dits status</code> and <code>dits diff</code> help inspect
        that boundary before committing.
      </p>

      <h2>History operations</h2>
      <p>
        Local log, show, diff, checkout, reset, restore, reflog, blame, bisect,
        rebase, cherry-pick, stash, tag, branch, and merge paths exist in the alpha.
        Individual edge cases are governed by the generated CLI reference and
        current tests rather than a blanket Git-parity guarantee.
      </p>

      <h2>Authorship and trust</h2>
      <p>
        Commit metadata can record an author, but a name string is not verified
        identity. Signed authorship, remote authorization, policy enforcement, and
        multi-user audit remain separate future concerns.
      </p>

      <h2>Semantic history</h2>
      <p>
        The research direction adds explicit edit, dependency, and rendition
        records to a commit graph. Those records must remain traceable to exact
        source and are experimental today.
      </p>
    </div>
  );
}
