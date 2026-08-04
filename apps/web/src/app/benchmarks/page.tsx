import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
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
import { loadLatestBenchmarks } from "@/lib/benchmarks.server";
import type { BenchmarkEntry } from "@/lib/benchmarks-types";
import { MEASURED_BENCHMARKS } from "@/lib/product-story";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits Benchmarks - Reproducible Performance Evidence",
  description:
    "Measured Dits component and local repository benchmarks, their environment and limitations, and the evidence still needed.",
  canonical: "https://dits.byronwade.com/benchmarks",
});

const requiredSuite = [
  "A public corpus with generated fixtures and documented real-file characteristics",
  "Controlled append, insertion, metadata, trim, reorder, and opaque re-encode edits",
  "Add, commit, checkout, branch switch, integrity, and recovery operations at media scale",
  "Wall time, CPU, memory, bytes read and written, and object-store growth",
  "Cold and warm cache conditions plus byte-fidelity checks",
  "Equivalent workloads for Git LFS, Xet, and relevant studio systems",
] as const;

const highlightNames = [
  "BLAKE3 hash (1 MiB)",
  "FastCDC stream (32 MiB)",
  "FastCDC chunk (32 MiB)",
  "add+commit+checkout 32 MiB",
  "add 32 MiB binary throughput",
] as const;

function formatValue(entry: BenchmarkEntry): string {
  if (entry.unit === "mb_per_s") {
    return `${entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} MB/s`;
  }
  if (entry.unit === "ops_per_s") {
    return `${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ops/s`;
  }
  if (entry.unit === "ms") {
    return `${entry.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ms`;
  }
  if (entry.unit === "chunks") {
    return `${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} chunks`;
  }
  return String(entry.value);
}

function formatDetail(entry: BenchmarkEntry): string {
  const parts: string[] = [entry.suite];
  if (entry.bytes_per_iter) {
    const mib = entry.bytes_per_iter / (1024 * 1024);
    parts.push(
      Number.isInteger(mib) ? `${mib} MiB / iteration` : `${mib.toFixed(1)} MiB / iteration`,
    );
  }
  if (entry.iterations) {
    parts.push(`${entry.iterations} iteration${entry.iterations === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

function FallbackBenchmarkCards() {
  return (
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
  );
}

async function CachedBenchmarkCards() {
  const run = await loadLatestBenchmarks();
  const byName = new Map((run?.results ?? []).map((r) => [r.name, r]));
  const highlights: BenchmarkEntry[] = [];
  for (const name of highlightNames) {
    const entry = byName.get(name);
    if (!entry) continue;
    if (name === "FastCDC chunk (32 MiB)" && byName.has("FastCDC stream (32 MiB)")) {
      continue;
    }
    highlights.push(entry);
    if (highlights.length >= 4) break;
  }

  if (highlights.length === 0) {
    return <FallbackBenchmarkCards />;
  }

  const when = run?.meta.timestamp
    ? new Date(run.meta.timestamp).toISOString().slice(0, 10)
    : "uncommitted";
  const sha = run?.meta.git_sha ? run.meta.git_sha.slice(0, 12) : "unknown";
  const machine = [run?.meta.cpu, run?.meta.arch, run?.meta.platform]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map((benchmark) => (
          <Card key={benchmark.name}>
            <CardHeader>
              <CardDescription>{benchmark.name}</CardDescription>
              <CardTitle className="text-2xl">{formatValue(benchmark)}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {formatDetail(benchmark)}
            </CardContent>
          </Card>
        ))}
      </div>
      <Callout type="note" title="Measurement environment" className="mt-6">
        {machine || "See artifact meta"}, {run?.meta.rustc ?? "rustc unknown"}, commit
        <code> {sha}</code> · recorded {when}. Source:{" "}
        <code>benchmarks/latest.json</code> via Cache Components (
        <code>cacheLife(&apos;days&apos;)</code>).
      </Callout>
    </>
  );
}

export default function BenchmarksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 sm:py-28">
            <div className="mx-auto max-w-4xl text-center">
              <StatusPill tone="info">Committed artifact · Cache Components</StatusPill>
              <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                Performance evidence, with the boundaries attached
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground">
                Results include component throughput and a bounded local
                add/commit/checkout path. They are not a claim about remotes,
                packfiles, VFS latency, or competitive media workflows.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <Suspense fallback={<FallbackBenchmarkCards />}>
              <CachedBenchmarkCards />
            </Suspense>
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="container py-20 sm:py-24">
            <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <Badge variant="outline">Still needed</Badge>
                <h2 className="mt-4 text-3xl font-bold tracking-tight">
                  The numbers buyers actually need
                </h2>
                <p className="mt-5 leading-7 text-muted-foreground">
                  Local repository timings are a start. Dits still needs
                  peak-memory evidence, real-media fidelity, cold/warm cache
                  series, and competitive store-growth baselines on disclosed
                  machines. Network measurements are impossible today because
                  network transfer is not implemented.
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
                  aria-label="View raw results"
                />
              }
            >
              View raw results
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              variant="outline"
              render={<Link href="/docs/roadmap" aria-label="See the evidence roadmap" />}
            >
              See the evidence roadmap
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
