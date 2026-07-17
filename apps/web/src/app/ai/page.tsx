import Link from "next/link";
import { ArrowRight, Boxes, BrainCircuit, FlaskConical, Waypoints } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { StatusPill } from "@/components/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const questions = [
  {
    icon: Boxes,
    title: "Where does exact reuse help?",
    description:
      "Measure chunk reuse across dataset snapshots, shared shards, adapters, variants, and real checkpoint histories instead of assuming savings.",
  },
  {
    icon: Waypoints,
    title: "What is reproducible?",
    description:
      "Record data, code, configuration, seeds, tools, and source artifacts so a derived object can be rebuilt or invalidated honestly.",
  },
  {
    icon: BrainCircuit,
    title: "Where can similarity assist?",
    description:
      "Use perceptual or semantic indexes for candidate search and discovery, never as a substitute for exact object identity.",
  },
] as const;

export default function AiResearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 sm:py-28">
            <div className="mx-auto max-w-4xl text-center">
              <StatusPill tone="warning">Research track · not a separate product</StatusPill>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                Reproducible history for models and datasets
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground">
                Dits is exploring whether its local content-addressed engine and
                future derivation graph can help version heavy AI and scientific
                artifacts. There are no AI-specific commands, tensor formats,
                remote sync, or hosted workflows today.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Button render={<Link href="/ai/docs" />}>
                  Read the research notes
                  <ArrowRight data-icon="inline-end" />
                </Button>
                <Button variant="outline" render={<Link href="/docs/roadmap" />}>
                  Core product roadmap
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-20 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline">Research questions</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Start with evidence, not a second brand promise
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
            {questions.map((question) => (
              <Card key={question.title}>
                <CardHeader>
                  <question.icon className="mb-3 size-6 text-brand" aria-hidden="true" />
                  <CardTitle>{question.title}</CardTitle>
                  <CardDescription>{question.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="container py-20 sm:py-24">
            <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <Badge variant="secondary" className="w-fit">Reusable today</Badge>
                  <CardTitle className="mt-2 text-2xl">The generic local engine</CardTitle>
                  <CardDescription className="text-base leading-7">
                    Arbitrary files can enter the same local chunk store and
                    Git-shaped history used by Dits. This is generic byte storage,
                    not tensor-aware intelligence or an ML workflow product.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Badge variant="outline" className="w-fit">Unbuilt</Badge>
                  <CardTitle className="mt-2 text-2xl">AI-specific semantics</CardTitle>
                  <CardDescription className="text-base leading-7">
                    Tensor-aware formats, dataset schemas, experiment lineage,
                    model registries, similarity layers, recompute orchestration,
                    and distributed artifact transfer need designs, fixtures, and
                    measured validation.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="container py-20 text-center sm:py-24">
          <FlaskConical className="mx-auto size-8 text-brand" aria-hidden="true" />
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Contribute a workload, not a slogan</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Useful contributions include redistributable checkpoint or dataset
            fixtures, controlled edit histories, reproducibility requirements,
            and comparisons with Xet, DVC, object storage, and registries.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
