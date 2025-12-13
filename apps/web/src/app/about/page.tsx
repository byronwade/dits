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
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Scale,
  Heart,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Dits and why it was created",
};

/**
 * About page following AGENTS.md guidelines:
 * - MUST: Main content has id for skip-link target
 * - MUST: Proper heading hierarchy
 * - MUST: Accessible icons with aria-hidden
 * - MUST: Redundant status cues (not color-only)
 */

const problemsSolved = [
  {
    problem: "Git can't handle large files efficiently",
    solution: "Content-defined chunking with deduplication",
  },
  {
    problem: "Storing multiple versions wastes space",
    solution: "Only unique chunks are stored",
  },
  {
    problem: "Cloning large repos takes forever",
    solution: "On-demand file hydration with VFS",
  },
  {
    problem: "Binary files don't merge",
    solution: "File locking prevents conflicts",
  },
  {
    problem: "No video-specific optimization",
    solution: "Keyframe-aligned chunking for video",
  },
];

const techStack = [
  { name: "Rust", description: "Core engine for performance and safety" },
  { name: "BLAKE3", description: "Fast cryptographic hashing" },
  { name: "FastCDC", description: "Content-defined chunking algorithm" },
  { name: "FUSE", description: "Virtual filesystem support" },
  { name: "QUIC", description: "Modern transport protocol (planned)" },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* AGENTS.md: main with id for skip-link */}
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {/* Hero */}
        <section className="container py-16 md:py-24" aria-labelledby="about-heading">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4">
              Open Source
            </Badge>
            <h1 id="about-heading" className="text-4xl font-bold tracking-tight md:text-5xl">
              Version Control,{" "}
              <span className="text-primary">Reimagined for Media</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Dits is a distributed version control system specifically designed
              for video production and large binary files. Built from the ground
              up to solve the problems that Git wasn&apos;t designed to handle.
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section className="border-y bg-muted/50" aria-labelledby="problem-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-3xl">
              <h2 id="problem-heading" className="text-3xl font-bold tracking-tight text-center mb-12">
                The Problem with Existing Tools
              </h2>
              {/* AGENTS.md: Redundant status cues - not color only, using icons and text */}
              <div className="space-y-6" role="list" aria-label="Problems solved by Dits">
                {problemsSolved.map((item, i) => (
                  <div key={i} className="flex gap-4" role="listitem">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold" aria-hidden="true">
                      ✕
                    </div>
                    <div className="flex-1">
                      <p className="font-medium line-through text-muted-foreground">
                        <span className="sr-only">Problem: </span>
                        {item.problem}
                      </p>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold" aria-hidden="true">
                      ✓
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-green-600">
                        <span className="sr-only">Solution: </span>
                        {item.solution}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container py-16 md:py-24" aria-labelledby="how-it-works-heading">
          <div className="mx-auto max-w-4xl">
            <h2 id="how-it-works-heading" className="text-3xl font-bold tracking-tight text-center mb-4">
              How Dits Works
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Instead of storing files as single objects, Dits breaks them into
              content-defined chunks that can be shared across files and versions.
            </p>

            <div className="grid md:grid-cols-3 gap-6" role="list" aria-label="How Dits works in 3 steps">
              <Card role="listitem">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary" aria-hidden="true">1</span>
                  </div>
                  <CardTitle>Chunk</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    Files are split into variable-size chunks using content-defined
                    boundaries. Changes only affect nearby chunks.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card role="listitem">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary" aria-hidden="true">2</span>
                  </div>
                  <CardTitle>Hash</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    Each chunk is identified by its BLAKE3 hash. Identical chunks
                    share the same hash and are stored only once.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card role="listitem">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary" aria-hidden="true">3</span>
                  </div>
                  <CardTitle>Deduplicate</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    Similar footage, multiple versions, and shared content
                    automatically deduplicate, saving massive storage.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="border-y bg-muted/50" aria-labelledby="tech-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-3xl">
              <h2 id="tech-heading" className="text-3xl font-bold tracking-tight text-center mb-12">
                Built with Modern Technology
              </h2>
              <div className="grid gap-4 md:grid-cols-2" role="list">
                {techStack.map((tech) => (
                  <div
                    key={tech.name}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-background"
                    role="listitem"
                  >
                    <Badge variant="secondary" className="font-mono">
                      {tech.name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {tech.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="container py-16 md:py-24" aria-labelledby="values-heading">
          <div className="mx-auto max-w-4xl">
            <h2 id="values-heading" className="text-3xl font-bold tracking-tight text-center mb-12">
              Our Values
            </h2>
            <div className="grid md:grid-cols-3 gap-8" role="list">
              <div className="text-center" role="listitem">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  {/* AGENTS.md: Decorative icons are aria-hidden */}
                  <Scale className="w-8 h-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-semibold mb-2">Open Source</h3>
                <p className="text-sm text-muted-foreground">
                  Dual-licensed under Apache&nbsp;2.0 and MIT. Free to use, modify,
                  and distribute.
                </p>
              </div>
              <div className="text-center" role="listitem">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-semibold mb-2">Community Driven</h3>
                <p className="text-sm text-muted-foreground">
                  Built for and with the media community. Your feedback shapes
                  the project.
                </p>
              </div>
              <div className="text-center" role="listitem">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Heart className="w-8 h-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-semibold mb-2">User First</h3>
                <p className="text-sm text-muted-foreground">
                  Designed for real workflows. Git-like commands make adoption
                  easy.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-primary text-primary-foreground" aria-labelledby="cta-heading">
          <div className="container py-16">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="cta-heading" className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-primary-foreground/80 mb-8">
                Download Dits and start managing your media files with proper
                version control.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/download">Download Dits</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-primary-foreground/20 hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link href="/docs/getting-started">Read the Docs</Link>
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
