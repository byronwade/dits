import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { StatusPill } from "@/components/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MEASURED_BENCHMARKS } from "@/lib/product-story";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits Benchmarks - Reproducible Performance Evidence",
  description:
    "The measured Dits component benchmarks, their environment and limitations, and the end-to-end evidence still needed.",
  canonical: "https://dits.byronwade.com/benchmarks",
});

const requiredSuite = [
  "A public corpus with generated fixtures and documented real-file characteristics",
  "Controlled append, insertion, metadata, trim, reorder, and opaque re-encode edits",
  "Add, commit, checkout, branch switch, integrity, and recovery operations",
  "Wall time, CPU, memory, bytes read and written, and object-store growth",
  "Cold and warm cache conditions plus byte-fidelity checks",
  "Equivalent workloads for Git LFS, Xet, and relevant studio systems",
] as const;

export default function BenchmarksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 sm:py-28">
            <div className="mx-auto max-w-4xl text-center">
              <StatusPill tone="info">Committed artifact · 2026-06-03</StatusPill>
              <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                Performance evidence, with the boundaries attached
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground">
                The current results are useful component measurements. They are
                not a claim that a Dits repository, media workflow, or future
                network runs at the same rate.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-4 md:grid-cols-3">
              {MEASURED_BENCHMARKS.map((benchmark) => (
                <Card key={benchmark.name}>
                  <CardHeader>
                    <CardDescription>{benchmark.name}</CardDescription>
                    <CardTitle className="text-2xl">{benchmark.value}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {benchmark.detail}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Callout type="note" title="Measurement environment" className="mt-6">
              Apple M2 Pro, arm64 macOS, rustc 1.91.0-nightly, commit
              <code> 9b79be227be8dd2cf1e9ead2a42e812ebf70565b</code>. BLAKE3
              and SHA-256 used 1 MiB inputs; FastCDC used 32 MiB inputs.
            </Callout>
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="container py-20 sm:py-24">
            <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <Badge variant="outline">Not yet measured</Badge>
                <h2 className="mt-4 text-3xl font-bold tracking-tight">
                  The numbers buyers actually need
                </h2>
                <p className="mt-5 leading-7 text-muted-foreground">
                  Dits still needs repeatable evidence for repository operations,
                  storage growth, real-media fidelity, memory use, VFS latency,
                  and competitive workflows. Network measurements are impossible
                  today because network transfer is not implemented.
                </p>
              </div>
              <Card>
                <CardHeader>
                  <FlaskConical className="mb-2 size-6 text-brand" aria-hidden="true" />
                  <CardTitle>Required end-to-end suite</CardTitle>
                  <CardDescription>
                    A result is publishable only when its inputs, method, machine,
                    code version, raw artifact, and failures are visible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {requiredSuite.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6">
                        <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Reproduce before you repeat</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Run <code className="rounded bg-muted px-1.5 py-0.5">npm run bench</code> from
            the repository root, then inspect the machine-readable artifact.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              render={
                <Link
                  href="https://github.com/byronwade/dits/blob/main/benchmarks/latest.json"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              View raw results
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="outline" render={<Link href="/docs/roadmap" />}>
              See the evidence roadmap
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
