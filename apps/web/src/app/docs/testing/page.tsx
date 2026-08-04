import type { Metadata } from "next";

import { DocPageHeader } from "@/components/doc-page-header";
import { CodeBlock } from "@/components/ui/code-block";
import { Callout } from "@/components/ui/callout";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits Testing and Evidence",
  description:
    "How to run the current Dits tests and the correctness, compatibility, recovery, and conformance evidence still required.",
  canonical: "https://dits.byronwade.com/docs/testing",
});

export default function TestingPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Architecture"
        title="Testing and evidence"
        description="Tests support a specific contract at a specific commit. Counts and broad adjectives are not substitutes for compatibility, recovery, or workflow evidence."
      />

      <Callout type="warning" title="Alpha coverage" className="not-prose my-6">
        The current suite exercises many local paths, but Dits does not claim
        exhaustive media-format, platform, failure, or production-workflow
        coverage. Network conformance tests cannot exist until the protocol is
        implemented.
      </Callout>

      <h2>Run the relevant suite</h2>

      <CodeBlock
        language="bash"
        code={`# Rust unit and integration tests
cargo test --locked --workspace

# CLI documentation parity
bash scripts/check-cli-docs.sh

# Public capability-claim guard
bash scripts/check-product-truth.sh

# Website types and production build
npm --workspace apps/web run test:ci
npm --workspace apps/web run build`}
      />

      <h2>Correctness hierarchy</h2>

      <ol>
        <li><strong>Unit tests</strong> for pure object, chunk, parser, and command behavior.</li>
        <li><strong>Golden fixtures</strong> for deterministic encodings and exact media round trips.</li>
        <li><strong>Integration tests</strong> for repository histories and working-tree transitions.</li>
        <li><strong>Failure injection</strong> for interruption, short writes, corruption, races, and recovery.</li>
        <li><strong>Compatibility matrices</strong> across versions, platforms, filesystems, and disclosed media layouts.</li>
        <li><strong>Protocol conformance</strong> for negotiation, verification, refs, authorization, and version skew.</li>
      </ol>

      <h2>Fixture rules</h2>

      <ul>
        <li>Prefer generated or redistributable inputs with documented provenance.</li>
        <li>Keep the smallest fixture that reproduces the contract or failure.</li>
        <li>Record exact expected hashes for outputs that claim byte fidelity.</li>
        <li>For derived media, state the fidelity criterion and tool versions.</li>
        <li>Include malformed, truncated, reordered, and boundary-value inputs.</li>
        <li>Never generalize one MP4 fixture into “all video formats supported.”</li>
      </ul>

      <h2>Persistent-format changes</h2>

      <p>
        A change to object bytes, manifests, refs, packs, encryption envelopes, or
        semantic records needs a version marker, deterministic test vectors,
        legacy-read behavior, migration or rejection rules, and an architecture
        decision record. Identifier-changing changes require explicit review.
      </p>

      <h2>Performance tests</h2>

      <p>
        Benchmark correctness before speed. Publish the corpus, command, commit,
        hardware, operating system, cache state, repetitions, raw output, and
        exclusions. A hashing or chunking microbenchmark is not a repository
        throughput claim.
      </p>

      <h2>What blocks a stable release</h2>

      <ul>
        <li>Crash-safe writes and demonstrated recovery from interrupted operations.</li>
        <li>A public real-media compatibility corpus and support matrix.</li>
        <li>Deterministic, versioned persistent formats with conformance fixtures.</li>
        <li>Peak-memory evidence for streaming large-binary ingest plus remaining text/MP4 paths; object-count scaling evidence (packs still Design).</li>
        <li>Cross-version checkout and migration behavior.</li>
        <li>Truthful documentation enforced alongside command and product checks.</li>
      </ul>
    </div>
  );
}
