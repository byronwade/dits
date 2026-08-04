import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Check,
  GitBranch,
  Network,
  Waypoints,
} from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { GithubIcon } from "@/components/icons/github-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusPill } from "@/components/status-pill";
import {
  CURRENT_CAPABILITIES,
  CURRENT_LIMITATIONS,
  MEASURED_BENCHMARKS,
  PRODUCT_LAYERS,
  PRODUCT_MILESTONES,
  PRODUCT_POSITIONING,
} from "@/lib/product-story";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits - Local-First Version Control for Media & Assets",
  description:
    "Dits is open, local-first version control for large media and asset pipelines. Evaluate the local alpha and help shape its open format.",
  canonical: "https://dits.byronwade.com",
});

const layerIcons = [GitBranch, Boxes, Waypoints, Network];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 sm:py-28 lg:py-32">
            <div className="mx-auto max-w-4xl text-center">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <StatusPill tone="warning">{PRODUCT_POSITIONING.version}</StatusPill>
                <Badge variant="secondary">Open source</Badge>
                <Badge variant="secondary">Local engine available</Badge>
                <Badge variant="outline">Remote collaboration: roadmap</Badge>
              </div>
              <h1 className="mt-7 text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                {PRODUCT_POSITIONING.tagline}
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
                {PRODUCT_POSITIONING.category} {PRODUCT_POSITIONING.description}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  render={<Link href="/docs/getting-started" aria-label="Try the local alpha"  prefetch={false} />}
                >
                  Try the local alpha
                  <ArrowRight data-icon="inline-end" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={
                    <Link
                      href="https://github.com/byronwade/dits"
                      target="_blank"
                      rel="noopener noreferrer" aria-label="Star Dits on GitHub"  prefetch={false} />
                  }
                >
                  <GithubIcon data-icon="inline-start" />
                  Star Dits on GitHub
                </Button>
              </div>
              <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-card p-4 text-left shadow-card">
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-destructive" />
                  <span className="size-2 rounded-full bg-warning" />
                  <span className="size-2 rounded-full bg-success" />
                  <span className="ml-2">packaged: macOS arm64 · Windows x64</span>
                </div>
                <pre className="overflow-x-auto text-sm leading-7 text-foreground"><code>{`npm install -g @byronwade/dits
mkdir dits-evaluation && cd dits-evaluation
dits init
dits add .
dits commit -m "First exact snapshot"
dits log`}</code></pre>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Alpha software. The v0.1.5 npm artifact packages Apple Silicon
                macOS and Windows x64; other targets require a source build. Use
                a disposable or independently backed-up project.
              </p>
              <Link
                href="/docs/architecture"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
               prefetch={false}>
                Read the architecture
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="container py-20 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline">The model</Badge>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              From exact bytes to explainable outputs
            </h2>
            <p className="mt-5 text-pretty text-lg text-muted-foreground">
              Dits starts with trustworthy local history. Media structure, edit
              intent, derivation, and collaboration are added in that order.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PRODUCT_LAYERS.map((layer, index) => {
              const Icon = layerIcons[index];
              return (
                <Card key={layer.title}>
                  <CardHeader>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <Badge variant="secondary">{layer.status}</Badge>
                    </div>
                    <CardTitle>{layer.title}</CardTitle>
                    <CardDescription>{layer.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="container py-20 sm:py-24">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-success/30">
                <CardHeader>
                  <StatusPill tone="success" className="w-fit">Available locally</StatusPill>
                  <CardTitle className="mt-2 text-2xl">What you can evaluate now</CardTitle>
                  <CardDescription>
                    The current claim is a local alpha, not a complete team platform.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {CURRENT_CAPABILITIES.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6">
                        <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-warning/30">
                <CardHeader>
                  <StatusPill tone="warning" className="w-fit">Know before trying</StatusPill>
                  <CardTitle className="mt-2 text-2xl">The boundaries are part of the product</CardTitle>
                  <CardDescription>
                    A placeholder command or design page does not make a capability shipped.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {CURRENT_LIMITATIONS.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warning" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container py-20 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <Badge variant="outline">Measured, not imagined</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                A small evidence base we can reproduce
              </h2>
              <p className="mt-5 leading-7 text-muted-foreground">
                These are component microbenchmarks from the committed artifact,
                recorded on an Apple M2 Pro. They do not establish end-to-end
                repository, media, or network performance.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                render={<Link href="/benchmarks" aria-label="See method and limitations"  prefetch={false} />}
              >
                See method and limitations
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {MEASURED_BENCHMARKS.map((benchmark) => (
                <Card key={benchmark.name}>
                  <CardHeader>
                    <CardDescription>{benchmark.name}</CardDescription>
                    <CardTitle className="text-xl">{benchmark.value}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {benchmark.detail}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="container py-20 sm:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline">Dependency-ordered roadmap</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
                Safety before scale. Semantics before sync.
              </h2>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
              {PRODUCT_MILESTONES.map((milestone, index) => (
                <Card key={milestone.name} size="sm">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle>{index + 1}. {milestone.name}</CardTitle>
                      <Badge variant="secondary">{milestone.state}</Badge>
                    </div>
                    <CardDescription>{milestone.summary}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button variant="outline" render={<Link href="/docs/roadmap" aria-label="Explore the roadmap"  prefetch={false} />}>
                Explore the roadmap
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </section>

        <section className="container py-20 sm:py-28">
          <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-8 text-center shadow-card sm:p-12">
            <StatusPill tone="info">Open source · Apache-2.0 OR MIT</StatusPill>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              Help make large-asset history trustworthy
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-muted-foreground">
              The most valuable alpha contributions are real fixtures, failure
              cases, format reviews, and reproducible workflow evidence.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" render={<Link href="/docs/getting-started" aria-label="Start locally"  prefetch={false} />}>
                Start locally
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={
                  <Link
                    href="https://github.com/byronwade/dits"
                    target="_blank"
                    rel="noopener noreferrer" aria-label="Star Dits on GitHub"  prefetch={false} />
                }
              >
                <GithubIcon data-icon="inline-start" />
                Star Dits on GitHub
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
