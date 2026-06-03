import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  MessageCircle,
  Bug,
  BookOpen,
  Heart,
  GitPullRequest,
  Star,
  Users,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";

import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Join the Dits Community - Open Source Version Control",
  description: "Join the Dits community on GitHub. Contribute code, report bugs, improve documentation, and help build the future of version control for large files and video production.",
  canonical: "https://dits.dev/community",
  keywords: [
    "dits community",
    "open source community",
    "contribute to dits",
    "github dits",
    "dits contributors",
    "version control community",
  ],
  openGraph: {
    type: "website",
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "Join the Dits Community",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
});

const communityLinks = [
  {
    title: "GitHub Discussions",
    description: "Ask questions, share ideas, and connect with other users",
    icon: MessageCircle,
    href: "https://github.com/byronwade/dits/discussions",
    action: "Join Discussion",
  },
  {
    title: "Report Issues",
    description: "Found a bug? Let us know so we can fix it",
    icon: Bug,
    href: "https://github.com/byronwade/dits/issues",
    action: "Report Issue",
  },
  {
    title: "Source Code",
    description: "Browse the source, fork, and contribute",
    icon: GithubIcon,
    href: "https://github.com/byronwade/dits",
    action: "View Code",
  },
  {
    title: "Documentation",
    description: "Learn how to use Dits effectively",
    icon: BookOpen,
    href: "/docs",
    action: "Read Docs",
  },
];

const contributionWays = [
  {
    icon: GitPullRequest,
    title: "Submit Pull Requests",
    description:
      "Help improve Dits by contributing code. Check out our contributing guide to get started.",
  },
  {
    icon: Bug,
    title: "Report Bugs",
    description:
      "Found something broken? Open an issue with steps to reproduce and we'll investigate.",
  },
  {
    icon: BookOpen,
    title: "Improve Documentation",
    description:
      "Help others by improving docs, writing tutorials, or creating examples.",
  },
  {
    icon: Star,
    title: "Star the Project",
    description:
      "Show your support by starring the repository on GitHub. It helps others discover Dits.",
  },
  {
    icon: MessageCircle,
    title: "Share Feedback",
    description:
      "Tell us how you use Dits, what works well, and what could be better.",
  },
  {
    icon: Heart,
    title: "Spread the Word",
    description:
      "Tweet about Dits, write blog posts, or tell your colleagues about it.",
  },
];

export default function CommunityPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main id="main-content" className="flex-1 pt-[104px]">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
            <div className="absolute inset-x-0 top-0 h-[420px] glow-brand" />
          </div>
          <div className="container">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-brand/10">
              <Users className="size-8 text-brand" aria-hidden="true" />
            </div>
            <PageHeader
              align="center"
              title="Join the Community"
              description="Dits is built by and for the media community. Whether you're a video editor, game developer, or content creator, you're welcome here."
            />
          </div>
        </section>

        {/* Community Links */}
        <section className="border-t bg-muted/30 py-20 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Get Connected
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                {communityLinks.map((link) => {
                  const external = link.href.startsWith("http");
                  return (
                    <Card key={link.title} className="rounded-2xl border bg-card shadow-card">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
                            <link.icon className="h-5 w-5 text-brand" aria-hidden="true" />
                          </div>
                          <CardTitle className="text-lg">{link.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4">
                          {link.description}
                        </CardDescription>
                        <Button
                          variant="outline"
                          render={
                            <Link
                              href={link.href}
                              target={external ? "_blank" : undefined}
                              rel={external ? "noopener noreferrer" : undefined}
                            />
                          }
                        >
                          {link.action}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Ways to Contribute */}
        <section className="border-t py-20 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Ways to Contribute
              </h2>
              <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
                Dits is open source and we welcome contributions of all kinds.
                Here are some ways you can help:
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {contributionWays.map((way) => (
                  <Card key={way.title} className="flex gap-4 rounded-2xl border bg-card p-5 shadow-card">
                    <div className="flex-shrink-0">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
                        <way.icon className="h-5 w-5 text-brand" aria-hidden="true" />
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold">{way.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {way.description}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contributing Guide */}
        <section className="border-t bg-muted/30 py-20 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <Card className="rounded-2xl border bg-card shadow-card">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Ready to Contribute Code?
                  </CardTitle>
                  <CardDescription>
                    We welcome contributions from developers of all skill levels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
                    <li>Fork the repository on GitHub</li>
                    <li>Clone your fork and create a new branch</li>
                    <li>Make your changes and write tests if applicable</li>
                    <li>Run <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">cargo test</code> to ensure tests pass</li>
                    <li>Submit a pull request with a clear description</li>
                  </ol>
                  <div className="flex flex-wrap gap-4 pt-4">
                    <Button render={<Link href="https://github.com/byronwade/dits" target="_blank" rel="noopener noreferrer" />}>
                      <GithubIcon className="mr-2 h-4 w-4" />
                      Fork on GitHub
                    </Button>
                    <Button variant="outline" render={<Link href="/docs" />}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Read the Docs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* License */}
        <section className="border-t py-20 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Open Source License</h2>
              <p className="mb-6 text-muted-foreground">
                Dits is dual-licensed under the Apache 2.0 and MIT licenses. You
                can choose whichever license works best for your use case.
              </p>
              <Button variant="outline" render={<Link href="/license" />}>View License Details</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
