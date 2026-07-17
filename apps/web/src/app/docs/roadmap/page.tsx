import type { Metadata } from "next";

import { DocPageHeader } from "@/components/doc-page-header";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CURRENT_CAPABILITIES,
  CURRENT_LIMITATIONS,
  PRODUCT_MILESTONES,
} from "@/lib/product-story";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits Status and Roadmap",
  description:
    "What the Dits local alpha can do, its current limitations, and the dependency-ordered gates to formats, semantic media, and collaboration.",
  canonical: "https://dits.dev/docs/roadmap",
});

export default function RoadmapPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Project"
        title="Status and roadmap"
        description="The current product boundary and the evidence gates Dits must pass before formats, media semantics, or collaboration can be called stable."
      />

      <Callout type="warning" title="v0.1.5 alpha" className="not-prose my-6">
        Evaluate on disposable or independently backed-up projects. The local
        engine is the current product; working network transfer, P2P, a hosted
        service, SDKs, and plug-ins are not shipped.
      </Callout>

      <div className="not-prose my-10 grid gap-4 lg:grid-cols-2">
        <Card className="border-success/30">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Current local paths</Badge>
            <CardTitle>Available to evaluate</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6">
              {CURRENT_CAPABILITIES.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardHeader>
            <Badge variant="outline" className="w-fit">Limitations</Badge>
            <CardTitle>Do not infer beyond this boundary</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6">
              {CURRENT_LIMITATIONS.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      <h2>Dependency-ordered milestones</h2>

      <p>
        Dates are intentionally absent. Each milestone advances when its exit
        evidence exists, not when a calendar says it should.
      </p>

      <div className="not-prose my-8 space-y-4">
        {PRODUCT_MILESTONES.map((milestone, index) => (
          <Card key={milestone.name} size="sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{index + 1}. {milestone.name}</CardTitle>
                <Badge variant="secondary">{milestone.state}</Badge>
              </div>
              <CardDescription>{milestone.summary}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <h3>Gate 1: credibility and data safety</h3>
      <p>
        Crash-safe writes, deterministic reads, corruption recovery, a real-media
        fixture corpus, and documentation checks. This is the active priority.
      </p>

      <h3>Gate 2: stable format and scale</h3>
      <p>
        Versioned canonical objects and manifests, bounded-memory ingest, packs,
        indexes, tree objects, garbage collection, and representative end-to-end
        benchmarks.
      </p>

      <h3>Gate 3: semantic media</h3>
      <p>
        Explicit source, edit, dependency, timeline, and rendition records that
        survive at least one real game/virtual-production workflow and one
        post-production workflow.
      </p>

      <h3>Gate 4: verified collaboration</h3>
      <p>
        A transport-independent protocol with have/want negotiation, resumable
        verified import, compare-and-swap refs, identity, scoped authorization,
        expiring lock leases, version negotiation, and failure injection.
      </p>

      <h2>Not near-term priorities</h2>

      <ul>
        <li>A generic AI creative assistant.</li>
        <li>Real-time multi-user editing before safe asynchronous collaboration.</li>
        <li>P2P or QUIC before one protocol works over HTTP.</li>
        <li>Broad SDKs over an unstable object model.</li>
        <li>Kubernetes or enterprise scale claims before a deployable service exists.</li>
        <li>Petabyte, savings, or cost claims without public workload evidence.</li>
      </ul>

      <Callout type="note" title="Repository authority" className="not-prose mt-8">
        The root <code>ROADMAP.md</code>, <code>docs/STATUS.md</code>, and active
        architecture are authoritative when another design page has drifted.
      </Callout>
    </div>
  );
}
