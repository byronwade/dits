import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits for AI — Storage & Sync Benchmarks",
  description:
    "How much storage and bandwidth content-addressed dedup saves on AI workloads: checkpoint series, fine-tunes, quantized variants, and dataset snapshots. Clearly labeled measured vs. modeled.",
  canonical: "https://dits.dev/ai/benchmarks",
  keywords: [
    "checkpoint storage savings",
    "model weight dedup benchmark",
    "dataset versioning storage",
    "delta sync bandwidth",
  ],
  openGraph: {
    type: "website",
    images: [{ url: "/dits.png", width: 1200, height: 630, alt: "Dits for AI Benchmarks" }],
  },
  twitter: { card: "summary_large_image" },
});

const scenarios = [
  {
    name: "Fine-tune over a base model",
    detail: "7B base + 6 fine-tune checkpoints",
    logical: "182 GB",
    stored: "44 GB",
    saved: "76%",
    kind: "Strong fit",
    measured: false,
  },
  {
    name: "Quantized variant set",
    detail: "fp16 + int8 + int4 of one model",
    logical: "39 GB",
    stored: "17 GB",
    saved: "56%",
    kind: "Strong fit",
    measured: false,
  },
  {
    name: "Dataset snapshots",
    detail: "5 versions, additive + light edits",
    logical: "1.2 TB",
    stored: "310 GB",
    saved: "74%",
    kind: "Strong fit",
    measured: false,
  },
  {
    name: "Consecutive training checkpoints",
    detail: "10 steps, diffuse weight updates",
    logical: "260 GB",
    stored: "232 GB",
    saved: "11%",
    kind: "Hard case (needs L2)",
    measured: false,
  },
];

export default function AiBenchmarks() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main id="main-content" className="flex-1 pt-[104px]">
        {/* HERO */}
        <section className="relative overflow-hidden border-b py-20 md:py-28">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
            <div className="absolute inset-x-0 top-0 h-[360px] glow-brand" />
          </div>
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="mb-5">Storage &amp; sync</Badge>
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                What dedup actually <span className="text-gradient-brand">saves</span>
              </h1>
              <p className="mx-auto max-w-xl text-lg text-muted-foreground">
                Content-addressed dedup pays off hugely on some AI workloads and
                barely on others. We show both &mdash; including the case
                today&apos;s engine handles poorly.
              </p>
            </div>
          </div>
        </section>

        {/* HEADLINE STATS */}
        <section className="border-b py-16 md:py-20">
          <div className="container">
            <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
              <StatCard label="Typical savings" value="56–76%" hint="strong-fit workloads" />
              <StatCard label="Sync transfer" value="Delta only" hint="changed chunks, resumable" />
              <StatCard label="Integrity" value="BLAKE3" hint="verified on every read" />
            </div>
          </div>
        </section>

        {/* SCENARIO TABLE */}
        <section className="border-b py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-2 text-2xl font-bold sm:text-3xl">By workload</h2>
              <p className="mb-8 text-muted-foreground">
                Logical size is what you think you have; stored is unique bytes
                after dedup.
              </p>
              <Card className="overflow-hidden rounded-2xl border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-4 font-semibold">Workload</th>
                      <th className="px-3 py-4 text-right font-medium text-muted-foreground">Logical</th>
                      <th className="px-3 py-4 text-right font-medium text-muted-foreground">Stored</th>
                      <th className="px-3 py-4 text-right font-semibold text-brand">Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((s) => (
                      <tr key={s.name} className="border-b border-border/60 last:border-0 align-top">
                        <td className="px-4 py-4">
                          <div className="font-medium text-foreground">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.detail}</div>
                          <Badge
                            variant={s.kind.startsWith("Hard") ? "outline" : "secondary"}
                            className="mt-2"
                          >
                            {s.kind}
                          </Badge>
                        </td>
                        <td className="px-3 py-4 text-right font-mono tabular-nums text-muted-foreground">{s.logical}</td>
                        <td className="px-3 py-4 text-right font-mono tabular-nums text-foreground">{s.stored}</td>
                        <td className="px-3 py-4 text-right font-mono font-semibold tabular-nums text-brand">{s.saved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        </section>

        {/* METHODOLOGY NOTE */}
        <section className="border-b bg-muted/30 py-16 md:py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <Card className="rounded-2xl border bg-card p-6">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Modeled, not measured.</strong> The
                    figures above are projections from the dedup behavior of the
                    content-addressed engine applied to representative artifact
                    shapes &mdash; not published benchmark runs. The
                    consecutive-checkpoint row is deliberately included to show the
                    honest weak spot that{" "}
                    <Link href="/ai/how-it-works" className="text-brand underline-offset-4 hover:underline">
                      tensor-aware chunking (L2)
                    </Link>{" "}
                    is designed to close. We will replace these with measured
                    numbers as the AI engine profile lands.
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Want this on your workloads?
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Tell us your checkpoint cadence and artifact sizes &mdash; we&apos;ll
                model the savings with you.
              </p>
              <Button
                size="lg"
                render={
                  <Link href="https://github.com/byronwade/dits" target="_blank" rel="noopener noreferrer" />
                }
              >
                Request early access
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
