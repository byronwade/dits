import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits Core Concepts",
  description:
    "The repository, object, chunk, manifest, history, exact-identity, and derivation concepts behind the Dits local alpha.",
  canonical: "https://dits.dev/docs/concepts",
});

export default function ConceptsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Core concepts"
        title="The Dits mental model"
        description="Dits records exact project states over chunked content-addressed storage. Media semantics and remote collaboration build on that foundation rather than replacing it."
      />

      <Callout type="warning" title="Current scope" className="not-prose my-6">
        These concepts describe the local alpha. Persistent formats are not yet a
        stable third-party contract, semantic-media records are experimental, and
        network repository exchange is not implemented.
      </Callout>

      <h2>Repository</h2>

      <p>
        A repository combines a working tree, staged state, immutable content,
        manifests, commits, and refs beneath local <code>.dits</code> metadata.
        The repository on disk is the current source of truth; there is no hosted
        control plane required for local commands.
      </p>

      <h2>Exact objects and chunks</h2>

      <p>
        Large binary content is divided with FastCDC. Stored chunks are named by
        BLAKE3 content identifiers, so byte-identical chunks can share one local
        object. A digest identifies exact bytes—it does not mean two visually
        similar frames or numerically close tensors are the same object.
      </p>

      <p>
        Content-defined boundaries can preserve reuse around local insertions,
        but they do not guarantee savings. Compression, encryption, opaque
        containers, and full media re-encodes may change nearly every byte.
      </p>

      <h2>Manifest</h2>

      <p>
        A manifest records how a file or asset is reconstructed from ordered
        content. It must carry enough length, order, type, and version information
        to reject missing, corrupt, or incompatible data. Deterministic encoding
        matters when identifiers depend on serialized bytes.
      </p>

      <h2>Commit and ref</h2>

      <p>
        A commit records a project state and its relationship to previous states.
        Branches and tags are refs to commits. Git-shaped commands expose local
        history, but Dits does not imply wire compatibility with Git or a stable
        Dits remote protocol.
      </p>

      <h2>Hybrid text and binary handling</h2>

      <p>
        Current code can route text-oriented paths through libgit2 behavior while
        large binary content uses Dits manifests and chunks. The goal is to retain
        useful text diffs and merges without storing every large binary revision as
        one unrelated object.
      </p>

      <h2>Source, edit, dependency, and rendition</h2>

      <p>
        The research model distinguishes immutable source bytes from explicit edit
        decisions, dependency relationships, and derived renditions such as
        proxies or exports. A rendition may be regenerable; the source remains the
        archival authority. FACR, photo edit logs, dependencies, and proxy paths
        are experiments toward this graph, not a stable universal format.
      </p>

      <h2>Availability and hydration</h2>

      <p>
        A future repository may know an object without holding it locally and
        hydrate verified ranges or chunks on demand. Today, remote hydration and
        partial network clone are not implemented. Local VFS behavior is
        experimental and must not be described as instant remote access.
      </p>

      <h2>Integrity and recovery</h2>

      <p>
        Reads should verify identifiers and lengths, writes should become visible
        atomically, and refs should never point at incomplete object graphs. The
        current engine has integrity-oriented paths, but crash safety and recovery
        matrices remain active roadmap gates.
      </p>

      <h2>Where to continue</h2>

      <ul>
        <li><Link href="/docs/concepts/chunking">Chunking and deduplication</Link></li>
        <li><Link href="/docs/concepts/content-addressing">Content addressing</Link></li>
        <li><Link href="/docs/architecture">Active architecture</Link></li>
        <li><Link href="/docs/roadmap">Status and roadmap</Link></li>
        <li><Link href="/benchmarks">Measured performance evidence</Link></li>
      </ul>
    </div>
  );
}
