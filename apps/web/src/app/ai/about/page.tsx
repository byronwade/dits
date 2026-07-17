import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Dits for AI Research",
  description:
    "Why model and dataset workflows are a research application of the Dits asset-history thesis, not a second shipped product.",
};

export default function AiAboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 sm:py-28">
            <div className="mx-auto max-w-4xl text-center">
              <StatusPill tone="warning">Research track</StatusPill>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                One product thesis, another demanding workload
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
                Models, datasets, checkpoints, and scientific results have the
                same foundational need as media pipelines: exact source history
                and an honest record of derivation. The Dits AI pages explore that
                fit; they do not describe a separate available product.
              </p>
            </div>
          </div>
        </section>
        <section className="container py-20 sm:py-24">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">The shared foundation</h2>
              <p className="mt-5 leading-7 text-muted-foreground">
                The local engine can store arbitrary exact bytes in chunked,
                content-addressed history. Future derivation records could link
                data, code, configuration, seeds, tools, and outputs. That shared
                model is more coherent than maintaining an AI-specific storage
                engine or a second protocol.
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">The hard boundary</h2>
              <p className="mt-5 leading-7 text-muted-foreground">
                Generic CDC often reuses little across diffuse tensor updates.
                Dits has no tensor-aware format, experiment tracker, model
                registry, orchestration layer, remote transfer, or validated AI
                benchmark corpus. Those are open research questions.
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <Button render={<Link href="/ai/how-it-works" />}>
              Explore the research model
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
