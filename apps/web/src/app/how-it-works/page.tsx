import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  FileCheck2,
  Fingerprint,
  GitCommitHorizontal,
  Network,
  Waypoints,
} from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { StatusPill } from "@/components/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "How Dits Works - Objects, History, and Media Graphs",
  description:
    "How the Dits local alpha chunks and addresses large assets, records exact history, and plans to add reproducible media derivation and verified collaboration.",
  canonical: "https://dits.dev/how-it-works",
});

const localFlow = [
  {
    icon: Boxes,
    title: "Chunk large content",
    description:
      "FastCDC chooses variable-size boundaries from the content, so a local insertion usually disturbs nearby chunks rather than every later offset.",
  },
  {
    icon: Fingerprint,
    title: "Address exact bytes",
    description:
      "BLAKE3 identifiers name stored content. Reads can verify that an object still matches the identity recorded by its manifest.",
  },
  {
    icon: GitCommitHorizontal,
    title: "Commit a project state",
    description:
      "Manifests and history connect paths to exact content while Git-shaped commands expose commits, branches, tags, diffs, merges, and checkout.",
  },
  {
    icon: FileCheck2,
    title: "Reconstruct and verify",
    description:
      "Checkout reassembles ordered chunks into exact local files. Verification and recovery behavior are being hardened before the format is frozen.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 sm:py-28">
            <div className="mx-auto max-w-4xl text-center">
              <StatusPill tone="warning">Local alpha</StatusPill>
              <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                Exact history first. Explainable media next.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground">
                Dits separates the storage foundation that works locally from the
                semantic and collaboration layers that still need proof.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-20 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary">Current local path</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              From a working file to a verifiable snapshot
            </h2>
          </div>
          <ol className="mx-auto mt-12 grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
            {localFlow.map((step, index) => (
              <li key={step.title} className="list-none">
                <Card className="h-full">
                  <CardHeader>
                    <div className="mb-3 flex items-center justify-between">
                      <step.icon className="size-6 text-brand" aria-hidden="true" />
                      <Badge variant="outline">Step {index + 1}</Badge>
                    </div>
                    <CardTitle>{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="container py-20 sm:py-24">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <Waypoints className="mb-3 size-7 text-brand" aria-hidden="true" />
                  <StatusPill tone="warning" className="w-fit">Experimental</StatusPill>
                  <CardTitle className="mt-2 text-2xl">Represent the pipeline, not only its exports</CardTitle>
                  <CardDescription className="text-base leading-7">
                    FACR, photo edit logs, dependency records, project structure,
                    and renditions explore a graph that links immutable sources to
                    explicit decisions and derived outputs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    This model must preserve the difference between an exact source,
                    a deterministic rendition, and an approximate or perceptual
                    representation. It is not yet a stable cross-tool format.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Network className="mb-3 size-7 text-brand" aria-hidden="true" />
                  <StatusPill tone="neutral" className="w-fit">Roadmap</StatusPill>
                  <CardTitle className="mt-2 text-2xl">Exchange verified objects safely</CardTitle>
                  <CardDescription className="text-base leading-7">
                    A future remote protocol will negotiate missing objects,
                    verify every import, resume interruption, update refs
                    atomically, and enforce identity and authorization.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    HTTP comes first. Bundles, QUIC, or peer transports are optional
                    later only if they preserve the same semantics and pass one
                    conformance suite. No network transfer ships today.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container py-20 sm:py-24">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <Badge variant="outline">Important boundary</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Chunk reuse is not the same as understanding an edit
              </h2>
              <p className="mt-5 leading-7 text-muted-foreground">
                A full media re-encode can alter nearly every byte even when the
                visible change is small. Generic chunking cannot reconstruct
                artistic intent. Dits must capture explicit edit decisions or
                imported timeline data where possible and retain final bytes when
                exact archival recovery requires them.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <p className="text-sm font-medium">The durable rule</p>
              <p className="mt-3 text-xl font-semibold leading-8">
                Never confuse a proxy, decoded frame, or perceptual match with the
                exact archival source.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="container py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Inspect the design and its open questions</h2>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button render={<Link href="/docs/architecture" />}>
                Architecture guide
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button variant="outline" render={<Link href="/docs/roadmap" />}>
                Roadmap and gates
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
