import type { Metadata } from "next";
import { Boxes, Fingerprint, Waypoints } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { StatusPill } from "@/components/status-pill";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "How the Dits AI Research Model Works",
  description:
    "Exact content identity, optional similarity indexes, and reproducible derivation for AI artifacts—with current and roadmap boundaries.",
};

const layers = [
  {
    icon: Fingerprint,
    status: "Generic engine today",
    title: "Exact identity",
    description:
      "Chunk and hash exact artifact bytes. Identical content can share an object; every claimed exact result must verify cryptographically.",
  },
  {
    icon: Boxes,
    status: "Research",
    title: "Similarity index",
    description:
      "Use approximate fingerprints to find candidates or near-duplicates. Similarity may aid discovery or delta choices, but never replaces exact identity.",
  },
  {
    icon: Waypoints,
    status: "Research",
    title: "Derivation graph",
    description:
      "Link outputs to data, code, configuration, seeds, tools, and source artifacts so reproducible results can be rebuilt and invalidated.",
  },
] as const;

export default function AiHowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 text-center sm:py-28">
            <StatusPill tone="warning">Design, not product status</StatusPill>
            <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
              Exact, similar, and derived are different claims
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              A trustworthy system keeps cryptographic identity separate from
              approximate similarity and records enough inputs to justify a
              reproducibility claim.
            </p>
          </div>
        </section>
        <section className="container py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            {layers.map((layer) => (
              <Card key={layer.title}>
                <CardHeader>
                  <layer.icon className="mb-3 size-6 text-brand" aria-hidden="true" />
                  <StatusPill tone={layer.status.includes("today") ? "success" : "neutral"} className="w-fit">
                    {layer.status}
                  </StatusPill>
                  <CardTitle className="mt-2">{layer.title}</CardTitle>
                  <CardDescription>{layer.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-warning/30 bg-warning/5 p-6">
            <h2 className="text-xl font-semibold">The difficult workload</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Small numeric updates can change bytes across an entire checkpoint,
              defeating generic exact-chunk reuse. Tensor-aware or delta designs
              must prove fidelity, bounded decode cost, and real savings on public
              histories before Dits should claim an answer.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
