import type { Metadata } from "next";
import Link from "next/link";
import {
  Fingerprint,
  Sparkles,
  Recycle,
  ArrowRight,
  Check,
  TriangleAlert,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "How Dits for AI Works — Content-Addressed Models & Data",
  description:
    "A plain-English guide to how Dits for AI works: content-defined chunking and BLAKE3 dedup over models, datasets, and research data, why byte-level chunking struggles with float tensors, and the similarity- and derivation-addressing layers on the roadmap.",
  canonical: "https://dits.dev/ai/how-it-works",
  keywords: [
    "content-defined chunking",
    "tensor dedup",
    "checkpoint deduplication",
    "BLAKE3",
    "model weight diff",
    "similarity dedup",
  ],
  openGraph: {
    type: "website",
    images: [{ url: "/dits.png", width: 1200, height: 630, alt: "How Dits for AI Works" }],
  },
  twitter: { card: "summary_large_image" },
});

const layers = [
  {
    icon: Fingerprint,
    tag: "L1 · Exact",
    title: "Content-addressed bytes",
    status: "Working today",
    tone: "border-brand/30 bg-brand/5",
    body: "An artifact is split into content-defined chunks with FastCDC, each addressed by its BLAKE3 hash. Two chunks with identical bytes get the same address and are stored once. Reads are always integrity-verified against the hash. This is the foundation every content-addressed store shares — and it ships today on the Dits engine.",
    wins: "Wins on: base model vs. fine-tune, model vs. quantized/LoRA variant, shared dataset shards, appended data.",
  },
  {
    icon: Sparkles,
    tag: "L2 · Similar",
    title: "Similarity-addressed",
    status: "Roadmap",
    tone: "border-border bg-card",
    body: "Exact hashing only catches byte-identical chunks. But datasets are full of near-duplicates — augmented images, re-encodes, lightly-edited samples — and so are media libraries. L2 addresses a chunk by a perceptual or semantic fingerprint, finds the closest existing chunk, and stores a small delta against it. Near-duplicate becomes near-zero storage.",
    wins: "Wins on: deduping training data, augmentation pipelines, and re-encoded media that exact-match misses entirely.",
  },
  {
    icon: Recycle,
    tag: "L3 · Derived",
    title: "Derivation-addressed",
    status: "Roadmap",
    tone: "border-border bg-card",
    body: "Many heavy artifacts are reproducible. A quantized model is derivable from its source. A LoRA is a recipe applied to a base. A checkpoint is reproducible from (data refs + config + seed). L3 stores the recipe — a few hundred bytes — and recomputes the artifact on demand instead of storing the bytes, trading cheap compute for expensive storage.",
    wins: "Wins on: quantized variants, derived exports, and reproducible checkpoints where storing terabytes is wasteful.",
  },
];

export default function AiHowItWorks() {
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
              <Badge variant="outline" className="mb-5">The honest version</Badge>
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                How <span className="text-gradient-brand">Dits for AI</span> works
              </h1>
              <p className="mx-auto max-w-xl text-lg text-muted-foreground">
                The same engine as Dits for media, pointed at weights and
                datasets. Here&apos;s the mental model in three addressing layers
                &mdash; including where today&apos;s approach genuinely struggles.
              </p>
            </div>
          </div>
        </section>

        {/* THE PITCH IN ONE STEP */}
        <section className="border-b py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <Card className="rounded-2xl border bg-card p-8">
                <p className="text-lg text-muted-foreground">
                  Every other tool addresses data by <strong className="text-foreground">the hash of its bytes</strong>.
                  That is the ceiling: two things that are 99% the same but not
                  byte-identical share <em>nothing</em>. Dits is built to address
                  data three ways &mdash; <span className="text-brand">exact</span>,{" "}
                  <span className="text-brand">similar</span>, and{" "}
                  <span className="text-brand">derived</span> &mdash; so dedup keeps
                  working exactly where the biggest AI data lives.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* THREE LAYERS */}
        <section className="border-b py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-4xl space-y-6">
              {layers.map((layer) => (
                <Card key={layer.tag} className={`rounded-2xl border p-6 md:p-8 ${layer.tone}`}>
                  <div className="flex flex-col gap-5 md:flex-row md:items-start">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10">
                      <layer.icon className="h-6 w-6 text-brand" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs uppercase tracking-wide text-brand">{layer.tag}</span>
                        <Badge variant={layer.status === "Roadmap" ? "outline" : "secondary"}>
                          {layer.status}
                        </Badge>
                      </div>
                      <h2 className="mb-3 text-2xl font-bold">{layer.title}</h2>
                      <p className="mb-4 text-muted-foreground">{layer.body}</p>
                      <p className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
                        {layer.wins}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* THE HONEST CAVEAT */}
        <section className="border-b bg-muted/30 py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <Card className="rounded-2xl border border-warning/30 bg-warning/5 p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15">
                    <TriangleAlert className="h-5 w-5 text-warning" />
                  </div>
                  <h2 className="text-xl font-bold">Where byte-level chunking struggles</h2>
                </div>
                <p className="mb-4 text-muted-foreground">
                  We won&apos;t oversell it. Model weights are float tensors, and a
                  single gradient step nudges <em>almost every weight a little</em>.
                  The bytes change <strong className="text-foreground">everywhere</strong>, not in
                  localized regions &mdash; which is the opposite of what
                  content-defined chunking is best at. So naive byte-level dedup
                  between two <em>consecutive</em> checkpoints performs poorly.
                </p>
                <p className="text-muted-foreground">
                  Where L1 wins today: base model ↔ fine-tune, model ↔
                  quantized/LoRA variant, shared dataset shards, and append-style
                  changes. Closing the consecutive-checkpoint gap needs
                  <strong className="text-foreground"> tensor-aware chunking</strong> (diffing tensors in their
                  own domain, not as raw bytes) &mdash; which is the next milestone
                  on the engine roadmap, not a shipped claim.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                See the numbers
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Storage and bandwidth projections for real checkpoint and dataset
                workloads &mdash; clearly labeled measured vs. modeled.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" render={<Link href="/ai/benchmarks" />}>
                  View benchmarks
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" render={<Link href="/ai/docs" />}>
                  Read the docs
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
