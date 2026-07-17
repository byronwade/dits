import type { Metadata } from "next";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";

export const metadata: Metadata = {
  title: "Chunking and Deduplication in Dits",
  description:
    "How Dits uses FastCDC and exact BLAKE3 identities, where chunk reuse helps, and where it does not.",
};

export default function ChunkingPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Core concepts"
        title="Chunking and deduplication"
        description="FastCDC finds content-dependent boundaries; BLAKE3 identities let byte-identical chunks share one local stored object."
      />

      <h2>Why content-defined boundaries</h2>
      <p>
        Fixed-size blocks shift after an insertion, making every later block look
        different. Content-defined chunking chooses boundaries from a rolling
        view of the bytes, so boundaries often resynchronize after a local edit.
        This can preserve reuse without computing a pairwise delta against every
        prior version.
      </p>

      <h2>Exact reuse</h2>
      <p>
        Each chunk is hashed. If the exact bytes already exist under the same
        identifier, the manifest can reference the existing object. Collision
        resistance and verification protect identity; similarity is a separate
        indexing problem.
      </p>

      <h2>Where it tends to help</h2>
      <ul>
        <li>Local insertions, deletions, or append-heavy changes.</li>
        <li>Repeated assets embedded or copied across paths.</li>
        <li>Container changes that leave large payload regions byte-identical.</li>
        <li>Histories with stable encoded regions.</li>
      </ul>

      <h2>Where it may not help</h2>
      <ul>
        <li>Opaque compression or encryption that randomizes later bytes.</li>
        <li>Full video, image, or audio re-encodes.</li>
        <li>Diffuse numeric updates across model checkpoints.</li>
        <li>Small files where metadata and hashing overhead exceed reuse.</li>
      </ul>

      <Callout type="note" title="No universal savings percentage" className="not-prose my-8">
        Storage growth depends on the corpus, edit pattern, chunk profile,
        compression, encryption, and object overhead. Dits does not publish a
        representative end-to-end savings claim yet.
      </Callout>

      <h2>Current limitations</h2>
      <p>
        The local alpha still needs stronger bounded-memory ingest, packfiles,
        high-object-count indexes, and public workload comparisons. The committed
        FastCDC rate is a component microbenchmark, not repository throughput.
      </p>
    </div>
  );
}
