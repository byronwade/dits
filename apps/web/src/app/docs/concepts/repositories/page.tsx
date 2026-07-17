import type { Metadata } from "next";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";

export const metadata: Metadata = {
  title: "Dits Repositories",
  description: "The local working tree, metadata, object store, index, history, and refs that make up a Dits repository.",
};

export default function RepositoriesPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Core concepts"
        title="Repositories"
        description="A Dits repository combines a normal working directory with local metadata for staged state, immutable objects, manifests, commits, and refs."
      />

      <h2>Working tree</h2>
      <p>
        The files users and creative tools open. <code>dits status</code> compares
        this state with staged and committed state; <code>dits add</code> prepares
        selected content for a commit.
      </p>

      <h2>Repository metadata</h2>
      <p>
        Local <code>.dits</code> data records objects, manifests, indexes, commits,
        refs, configuration, locks, and related engine state. Treat it as durable
        repository data, but keep an independent backup while the alpha format and
        recovery behavior are evolving.
      </p>

      <h2>Local paths only</h2>
      <p>
        Local filesystem clone and object-transfer paths exist. Internet remotes,
        partial network clone, remote hydration, and hosted repositories are not
        functional product capabilities.
      </p>

      <Callout type="warning" title="A remote-looking command is not a backup" className="not-prose my-8">
        Verify where data was written and restore it independently. Network push,
        pull, fetch, sync, network clone, and P2P do not transfer repository data.
      </Callout>

      <h2>Format maturity</h2>
      <p>
        Repository encodings need deterministic serialization, version markers,
        conformance fixtures, migration rules, and independent readers before
        they become a stable ecosystem contract.
      </p>
    </div>
  );
}
