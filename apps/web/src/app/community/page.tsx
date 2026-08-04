import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { GithubIcon } from "@/components/icons/github-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Bug, FlaskConical, GitPullRequest, Star } from "lucide-react";

import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Help Shape Dits - Early Open-Source Project",
  description:
    "Evaluate the Dits alpha, report reproducible issues, improve documentation, and contribute tests or code on GitHub.",
  canonical: "https://dits.byronwade.com/community",
  keywords: ["Dits open source", "Dits contributors", "Dits GitHub", "media version control alpha"],
  openGraph: {
    type: "website",
    images: [{ url: "/dits-social-preview.png", width: 1280, height: 640, alt: "Help shape Dits" }],
  },
  twitter: { card: "summary_large_image" },
});

const projectLinks = [
  {
    title: "Star the project",
    description: "Follow Dits as the local alpha becomes safer and help other media-pipeline builders discover it.",
    icon: Star,
    href: "https://github.com/byronwade/dits",
    action: "Star Dits",
  },
  {
    title: "GitHub Issues",
    description: "Report a reproducible bug or propose a focused improvement. The project has no response-time SLA.",
    icon: Bug,
    href: "https://github.com/byronwade/dits/issues/new/choose",
    action: "Choose an issue form",
  },
  {
    title: "Source repository",
    description: "Read the implementation, tests, roadmap, and contribution history before relying on a claim.",
    icon: GithubIcon,
    href: "https://github.com/byronwade/dits",
    action: "View source",
  },
  {
    title: "Current documentation",
    description: "Start with the implementation status and maturity labels for the local alpha.",
    icon: BookOpen,
    href: "/docs",
    action: "Read docs",
  },
];

const contributionWays = [
  {
    icon: FlaskConical,
    title: "Evaluate the alpha",
    description: "Use disposable or backed-up media and report exact commands, versions, and results.",
  },
  {
    icon: Bug,
    title: "Report a reproducible bug",
    description: "Include minimal steps and sanitized fixtures when licensing and privacy permit.",
  },
  {
    icon: BookOpen,
    title: "Improve product truth",
    description: "Correct stale docs, add examples backed by tests, and keep maturity boundaries explicit.",
  },
  {
    icon: GitPullRequest,
    title: "Contribute tests or code",
    description: "Focus on integrity, recovery, bounded resources, representative fixtures, and clear contracts.",
  },
];

export default function CommunityPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main id="main-content" className="flex-1 pt-[104px]">
        <section className="relative overflow-hidden py-20 md:py-28" aria-labelledby="community-heading">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
            <div className="absolute inset-x-0 top-0 h-[420px] glow-brand" />
          </div>
          <div className="container">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="outline" className="mb-6">Early open-source alpha</Badge>
              <h1 id="community-heading" className="text-4xl font-bold tracking-tight md:text-6xl">
                Help shape <span className="text-gradient-brand">Dits</span>
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-xl text-muted-foreground">
                Dits is an early local-first project looking for careful evaluators and
                contributors. It is not yet an established media community, hosted
                service, or staffed support organization.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">Project channels</h2>
              <p className="mx-auto mb-10 max-w-2xl text-center text-muted-foreground">
                These public GitHub routes are the current places to ask, report, and contribute.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                {projectLinks.map((item) => {
                  const external = item.href.startsWith("http");
                  return (
                    <Card key={item.title} className="rounded-2xl border bg-card shadow-card">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
                            <item.icon className="size-5 text-brand" aria-hidden="true" />
                          </div>
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4">{item.description}</CardDescription>
                        <Button
                          variant="outline"
                          render={
                            <Link
                              href={item.href}
                              target={external ? "_blank" : undefined}
                              rel={external ? "noopener noreferrer" : undefined}
                              prefetch={false}
                              aria-label={item.action}
                            />
                          }
                        >
                          {item.action}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t py-20 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">Useful contributions now</h2>
              <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
                The highest-value work makes the alpha easier to verify, recover, and describe honestly.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                {contributionWays.map((item) => (
                  <Card key={item.title} className="flex gap-4 rounded-2xl border bg-card p-5 shadow-card">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                      <item.icon className="size-5 text-brand" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20 md:py-24">
          <div className="container">
            <Card className="mx-auto max-w-3xl rounded-2xl border bg-card shadow-card">
              <CardHeader>
                <CardTitle>Before opening a pull request</CardTitle>
                <CardDescription>Read the contribution guide, keep scope focused, and run the checks available for your change.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button render={<Link href="/docs/contributing" prefetch={false} aria-label="Contribution guide" />}>
                  <BookOpen data-icon="inline-start" />
                  Contribution guide
                </Button>
                <Button
                  variant="outline"
                  render={
                    <Link
                      href="https://github.com/byronwade/dits"
                      target="_blank"
                      rel="noopener noreferrer"
                      prefetch={false} aria-label="Source on GitHub" />
                  }
                >
                  <GithubIcon data-icon="inline-start" />
                  Source on GitHub
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-t py-16">
          <div className="container mx-auto max-w-3xl text-center text-muted-foreground">
            Dits is dual-licensed under Apache-2.0 or MIT. Review the repository
            license files before redistributing or contributing.
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
