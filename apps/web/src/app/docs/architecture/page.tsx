import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits Active Architecture",
  description:
    "The current local-first Rust workspace, module boundaries, trust core, experimental media paths, and future remote protocol boundary.",
  canonical: "https://dits.dev/docs/architecture",
});

export default function ArchitecturePage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Architecture"
        title="Active architecture"
        description="The canonical product is the local Rust CLI and library under apps/cli. Historical backend crates and hosted-service diagrams do not define current behavior."
      />

      <Callout type="warning" title="One live system boundary" className="not-prose my-6">
        The former Axum/PostgreSQL/Redis/QUIC backend workspace is quarantined
        under <code>legacy/backend-crates</code>. There is no deployable server,
        working repository remote, or hosted control plane today.
      </Callout>

      <h2>Workspace</h2>

      <ul>
        <li><code>apps/cli</code> — current <code>dits</code> binary and reusable library modules.</li>
        <li><code>packages/dits-core</code> — shared deterministic chunking and hashing engine.</li>
        <li><code>apps/web</code> — website, docs, and local playground surfaces.</li>
        <li><code>packages/npm</code> — package launcher and platform binary layout.</li>
        <li><code>legacy/backend-crates</code> — historical research, excluded from the root workspace.</li>
      </ul>

      <h2>Trust core</h2>

      <p>
        Object identity, serialization, verification, atomic storage, manifest
        reconstruction, commit graphs, and ref updates form one local trust core.
        Commands and future transports should call those semantics rather than
        define competing formats or verification rules.
      </p>

      <h2>Current modules</h2>

      <ul>
        <li><code>core</code> — repository model, index, refs, and commits.</li>
        <li><code>store</code> — local objects and chunks.</li>
        <li><code>commands</code> — CLI handlers and presentation.</li>
        <li><code>mp4</code> — selected ISOBMFF/MP4 parsing and round-trip paths.</li>
        <li><code>facr</code>, <code>proxy</code>, <code>segment</code>, <code>vfs</code> — experimental media and access paths.</li>
        <li><code>security</code> — local advisory locks and audit inspection, plus a disabled legacy encryption experiment.</li>
        <li><code>metadata</code>, <code>dependency</code>, <code>lifecycle</code> — local asset metadata and lifecycle experiments.</li>
        <li><code>p2p</code> — scaffolding only; no peer repository transfer.</li>
      </ul>

      <h2>Dependency direction</h2>

      <p>
        Persistent object rules belong in reusable library code. CLI parsing and
        terminal output remain at the command boundary. Media adapters may emit
        domain records but must preserve exact source identity. A future remote
        exchanges the same verified objects and updates refs through the same
        transaction rules.
      </p>

      <h2>Architecture gates</h2>

      <ol>
        <li>Crash-safe local writes and recovery.</li>
        <li>Versioned deterministic objects and manifests.</li>
        <li>Bounded-memory ingest, packs, indexes, and trees.</li>
        <li>Semantic media records proven on real workflows.</li>
        <li>A transport-independent remote protocol and conformance suite.</li>
      </ol>

      <p>
        The detailed authority lives in the repository’s
        <Link href="https://github.com/byronwade/dits/blob/main/docs/architecture/active-architecture.md"> active architecture</Link>,
        <Link href="https://github.com/byronwade/dits/blob/main/docs/research/technical-foundations.md"> technical foundations</Link>,
        and <Link href="/docs/roadmap">status and roadmap</Link>.
      </p>
    </div>
  );
}
