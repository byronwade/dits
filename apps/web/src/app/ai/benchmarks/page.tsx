import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits AI Research Benchmarks",
  description:
    "The AI-specific benchmark evidence Dits has and the model, checkpoint, and dataset workloads still required.",
  canonical: "https://dits.byronwade.com/ai/benchmarks",
});

export default function AiBenchmarksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 text-center sm:py-28">
            <StatusPill tone="warning">No AI-specific product benchmark yet</StatusPill>
            <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
              The honest result is an open test plan
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              Current Dits measurements cover generic hashing and chunking
              components. They do not establish checkpoint reuse, dataset savings,
              experiment reproducibility, transfer cost, or training integration.
            </p>
          </div>
        </section>
        <section className="container py-20 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <Callout type="important" title="Modeled scenarios removed">
              Previous percentage-savings scenarios were not measurements and
              should not guide a storage purchase or architecture decision.
            </Callout>
            <h2 className="mt-10 text-3xl font-bold tracking-tight">Required public workloads</h2>
            <ul className="mt-6 space-y-3 leading-7 text-muted-foreground">
              <li>Consecutive checkpoints with diffuse weight updates.</li>
              <li>Base models with adapters, fine-tunes, and quantized variants.</li>
              <li>Append-heavy and mutation-heavy dataset snapshots.</li>
              <li>Interrupted ingest, corruption, checkout, and recovery.</li>
              <li>Storage, wall time, CPU, memory, read amplification, and exact output hashes.</li>
              <li>Equivalent runs with Xet, DVC, Git LFS, and plain object storage.</li>
            </ul>
            <div className="mt-10">
              <Button render={<Link href="/benchmarks" aria-label="See measured core components"  prefetch={false} />}>See measured core components</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
