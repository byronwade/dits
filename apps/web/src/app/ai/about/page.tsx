import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Film, CircuitBoard, Layers } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "About Dits for AI — One Engine, Two Products",
  description:
    "The vision behind Dits for AI: a single content-addressed engine that versions both creative media and the heaviest data in AI and science — model weights, checkpoints, datasets, and research data — and pushes past exact-match dedup with similarity and derivation addressing.",
  canonical: "https://dits.dev/ai/about",
  keywords: ["dits for ai vision", "content-addressed engine", "ai infrastructure storage"],
  openGraph: {
    type: "website",
    images: [{ url: "/dits.png", width: 1200, height: 630, alt: "About Dits for AI" }],
  },
  twitter: { card: "summary_large_image" },
});

export default function AiAbout() {
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
              <Badge variant="outline" className="mb-5">The vision</Badge>
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                One engine, <span className="text-gradient-brand">two products</span>
              </h1>
              <p className="mx-auto max-w-xl text-lg text-muted-foreground">
                The hard, valuable part of Dits isn&apos;t video version control or
                weight version control &mdash; it&apos;s the content-addressed
                engine underneath. The same primitives win in two very different
                markets.
              </p>
            </div>
          </div>
        </section>

        {/* TWO PRODUCTS */}
        <section className="border-b py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-5 md:grid-cols-2">
                <Card className="rounded-2xl border bg-card p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                    <Film className="h-5 w-5 text-foreground" />
                  </div>
                  <h2 className="mb-2 text-lg font-bold">Dits for media</h2>
                  <p className="mb-5 text-sm text-muted-foreground">
                    Git for video, photos, and huge creative projects. Store only
                    what changed, keep an honest history, stop re-uploading
                    gigabytes.
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
                  >
                    Visit Dits for media
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Card>

                <Card className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10">
                    <CircuitBoard className="h-5 w-5 text-brand" />
                  </div>
                  <h2 className="mb-2 text-lg font-bold">Dits for AI</h2>
                  <p className="mb-5 text-sm text-muted-foreground">
                    Version control for models, datasets, and research data.
                    Dedup across runs and variants; move deltas, not whole files.
                  </p>
                  <Link
                    href="/ai"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
                  >
                    You are here
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* SHARED ENGINE */}
        <section className="border-b bg-muted/30 py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10">
                  <Layers className="h-5 w-5 text-brand" />
                </div>
                <h2 className="text-2xl font-bold sm:text-3xl">The shared engine</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Both products sit on the same foundation: content-defined
                  chunking (FastCDC), BLAKE3 content addressing, a deduplicating
                  content-addressed store, and delta sync. Each product is mostly a
                  <strong className="text-foreground"> format transform plus a workflow skin</strong> &mdash; media
                  plugs in keyframe-aware video handling; AI plugs in tensor-aware
                  layouts and embedding fingerprints.
                </p>
                <p>
                  The roadmap that makes both genuinely better than what exists is
                  the same for both: move past exact-match hashing to{" "}
                  <strong className="text-foreground">similarity-addressing</strong> (dedupe near-duplicates)
                  and <strong className="text-foreground">derivation-addressing</strong> (store the recipe,
                  recompute the artifact). Anyone can build &ldquo;Git for video.&rdquo;
                  Almost nobody can build one engine whose primitives win in two
                  markets at once.
                </p>
                <p>
                  Dits is open core and local-first. The engine, formats, and
                  protocol are inspectable and self-hostable; the optional cloud
                  layer adds managed compute for recompute-heavy work. Your weights
                  and footage never have to leave your infrastructure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Follow the build
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Dits is built in the open. Watch the engine, the AI profile, and
                the sync layer come together.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" render={<Link href="/ai/how-it-works" />}>
                  How it works
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={
                    <Link href="https://github.com/byronwade/dits" target="_blank" rel="noopener noreferrer" />
                  }
                >
                  GitHub
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
