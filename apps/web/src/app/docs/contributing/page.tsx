import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Contributing to Dits",
  description: "High-value contribution areas, product-truth rules, and the Dits pull-request verification checklist.",
  canonical: "https://dits.byronwade.com/docs/contributing",
});

export default function ContributingPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Community"
        title="Contributing to Dits"
        description="Help make the local engine, durable format, compatibility evidence, and public product story trustworthy."
      />

      <Callout type="note" title="Start with the current boundary" className="not-prose my-6">
        Read the <Link href="/docs/roadmap">status and roadmap</Link> before
        choosing work. The hosted backend is historical; network and P2P are not
        current implementation surfaces.
      </Callout>

      <h2>High-value contributions</h2>
      <ul>
        <li>Crash-safety, corruption, and recovery regression tests.</li>
        <li>Generated or redistributable real-media fixtures.</li>
        <li>Deterministic format vectors and compatibility tests.</li>
        <li>Bounded-memory ingest and high-object-count storage work.</li>
        <li>Fair, reproducible workload comparisons.</li>
        <li>CLI and documentation corrections tied to actual behavior.</li>
      </ul>

      <h2>Before a pull request</h2>
      <pre><code>{`cargo +nightly fmt --all -- --check
cargo test --locked --workspace
npm --workspace apps/web run lint
npm --workspace apps/web run test:ci
npm --workspace apps/web run build
bash scripts/check-cli-docs.sh
bash scripts/check-product-truth.sh
git diff --check`}</code></pre>

      <p>
        Persistent-format, protocol, or broad product changes should begin with
        an issue and, when appropriate, an architecture decision. Explain
        compatibility impact, fixtures, failure behavior, documentation changes,
        and verification limitations in the pull request.
      </p>

      <p>
        The complete guide is maintained in
        <Link href="https://github.com/byronwade/dits/blob/main/docs/development/contributing.md"> docs/development/contributing.md</Link>.
      </p>
    </div>
  );
}
