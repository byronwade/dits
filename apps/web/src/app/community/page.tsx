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
import {
  Github,
  MessageCircle,
  Bug,
  BookOpen,
  Heart,
  GitPullRequest,
  Star,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Community",
  description: "Join the Dits community",
};

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
    icon: Github,
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="container py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Join the Community
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Dits is built by and for the media community. Whether you&apos;re a
              video editor, game developer, or content creator, you&apos;re welcome
              here.
            </p>
          </div>
        </section>

        {/* Community Links */}
        <section className="border-y bg-muted/50">
          <div className="container py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-center mb-8">
                Get Connected
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                {communityLinks.map((link) => (
                  <Card key={link.title}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <link.icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{link.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-4">
                        {link.description}
                      </CardDescription>
                      <Button variant="outline" asChild>
                        <Link
                          href={link.href}
                          target={link.href.startsWith("http") ? "_blank" : undefined}
                        >
                          {link.action}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Ways to Contribute */}
        <section className="container py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-4">
              Ways to Contribute
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Dits is open source and we welcome contributions of all kinds.
              Here are some ways you can help:
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {contributionWays.map((way) => (
                <div key={way.title} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <way.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{way.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {way.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contributing Guide */}
        <section className="border-t bg-muted/50">
          <div className="container py-16">
            <div className="mx-auto max-w-3xl">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">
                    Ready to Contribute Code?
                  </CardTitle>
                  <CardDescription>
                    We welcome contributions from developers of all skill levels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Fork the repository on GitHub</li>
                    <li>Clone your fork and create a new branch</li>
                    <li>Make your changes and write tests if applicable</li>
                    <li>Run <code className="bg-muted px-1.5 py-0.5 rounded text-sm">cargo test</code> to ensure tests pass</li>
                    <li>Submit a pull request with a clear description</li>
                  </ol>
                  <div className="flex gap-4 pt-4">
                    <Button asChild>
                      <Link
                        href="https://github.com/byronwade/dits"
                        target="_blank"
                      >
                        <Github className="mr-2 h-4 w-4" />
                        Fork on GitHub
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/docs">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Read the Docs
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* License */}
        <section className="container py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold mb-4">Open Source License</h2>
            <p className="text-muted-foreground mb-6">
              Dits is dual-licensed under the Apache 2.0 and MIT licenses. You
              can choose whichever license works best for your use case.
            </p>
            <Button variant="outline" asChild>
              <Link href="/license">View License Details</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
