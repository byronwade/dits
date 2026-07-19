import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GitBranch, Scale, ShieldCheck, Target } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateMetadata as genMeta } from "@/lib/seo";
import { PRODUCT_POSITIONING } from "@/lib/product-story";

export const metadata: Metadata = genMeta({
  title: "About Dits - Open, Local-First Asset History",
  description:
    "Why Dits is building open, local-first version control and reproducible history for large media and asset pipelines.",
  canonical: "https://dits.byronwade.com/about",
});

const principles = [
  {
    icon: ShieldCheck,
    title: "Truth before reach",
    description:
      "A local engine must write, verify, recover, and reconstruct reliably before collaboration can amplify it.",
  },
  {
    icon: GitBranch,
    title: "History users can own",
    description:
      "The durable format and local engine should remain useful without an account or proprietary hosted service.",
  },
  {
    icon: Target,
    title: "Intent, not only blobs",
    description:
      "The long-term value is an explicit graph of source, edits, dependencies, and renditions—not a smarter folder of exports.",
  },
  {
    icon: Scale,
    title: "Evidence over adjectives",
    description:
      "Compatibility, performance, and competitive claims need public fixtures, methods, raw results, and failure cases.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 sm:py-28">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="secondary">About Dits</Badge>
              <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                Creative work deserves inspectable history
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
                {PRODUCT_POSITIONING.category} The goal is to preserve exact
                source, then make the path from source to result reproducible and
                understandable.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="outline">The problem</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Asset history is fragmented across systems
              </h2>
              <div className="mt-6 space-y-5 leading-7 text-muted-foreground">
                <p>
                  Source control is excellent at explaining code history, but
                  large binary assets strain its storage model. Drives and
                  review platforms move media well, but often preserve outputs
                  without the structured decisions and dependencies behind them.
                </p>
                <p>
                  Dits starts at that seam. The current alpha provides a local,
                  chunked, content-addressed history. The research direction adds
                  explicit media structure and derivation before a remote service
                  is allowed to become the source of truth.
                </p>
              </div>
            </div>
            <Card className="bg-muted/30">
              <CardHeader>
                <Badge variant="secondary" className="w-fit">Who comes first</Badge>
                <CardTitle className="mt-3 text-2xl">Game and virtual-production teams</CardTitle>
                <CardDescription className="text-base leading-7">
                  Small and mid-sized teams already combine Git-shaped engineering
                  workflows with large, frequently changing assets. They can
                  evaluate a useful local CLI and help define the format before a
                  hosted collaboration layer exists.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="container py-20 sm:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline">Operating principles</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
                Build trust into the order of work
              </h2>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {principles.map((principle) => (
                <Card key={principle.title}>
                  <CardHeader>
                    <principle.icon className="mb-3 size-6 text-brand" aria-hidden="true" />
                    <CardTitle>{principle.title}</CardTitle>
                    <CardDescription>{principle.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-20 sm:py-24">
          <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-muted/30 p-8 sm:p-12">
            <Badge variant="secondary">Current reality</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              Dits is an alpha, not a production platform
            </h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              Local history and storage paths can be evaluated now. Network
              transfer, P2P, hosted services, public SDKs, NLE plug-ins, and
              enterprise operations are not shipped. Experimental media paths
              still need broader real-world validation.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button render={<Link href="/docs/roadmap" />}>
                Read the roadmap
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button variant="outline" render={<Link href="/docs/getting-started" />}>
                Evaluate locally
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
