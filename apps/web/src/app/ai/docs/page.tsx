import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";

export const metadata: Metadata = {
  title: "Dits for AI Research Notes",
  description:
    "Open questions and design constraints for applying the Dits exact-history and derivation model to AI and scientific artifacts.",
};

export default function AiDocsOverview() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Dits for AI research"
        title="Research notes"
        description="A design space for models, datasets, checkpoints, and scientific artifacts—not a second available Dits product."
      />

      <Callout type="note" title="Shared engine" className="not-prose my-6">
        The only reusable implementation today is the generic local Dits engine
        documented in the <Link href="/docs">core product docs</Link>. It stores
        arbitrary exact bytes but has no AI-specific semantics.
      </Callout>

      <h2>Questions worth investigating</h2>

      <ul>
        <li>Which real model and dataset histories produce useful exact chunk reuse?</li>
        <li>How should tensor layout and metadata be represented without losing source fidelity?</li>
        <li>What inputs and environment make a derived artifact genuinely reproducible?</li>
        <li>How can similarity aid search while remaining separate from exact identity?</li>
        <li>Where should Dits interoperate with Xet, DVC, registries, and experiment trackers?</li>
      </ul>

      <h2>Required evidence</h2>

      <p>
        A useful proposal needs a redistributable corpus, exact workload generator,
        declared fidelity criteria, storage and decode measurements, recovery
        tests, and equivalent baselines. Modeled savings are not benchmark results.
      </p>

      <h2>Current boundaries</h2>

      <ul>
        <li>No tensor-aware chunk format or supported AI schema.</li>
        <li>No model registry, experiment tracker, or pipeline orchestrator.</li>
        <li>No similarity-addressed object identity.</li>
        <li>No recompute service or reproducibility guarantee.</li>
        <li>No network artifact transfer or hosted service.</li>
      </ul>

      <p>
        Start with <Link href="/ai/how-it-works">the research model</Link>,
        <Link href="/ai/benchmarks"> the benchmark gaps</Link>, and the
        <Link href="/docs/roadmap"> core roadmap gates</Link>.
      </p>
    </div>
  );
}
