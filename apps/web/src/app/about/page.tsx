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
import { StatusPill } from "@/components/status-pill";
import { EventTimeline, type TimelineEvent } from "@/components/event-timeline";
import {
  Users,
  Scale,
  Heart,
  Zap,
  Shield,
  Globe,
  GitBranch,
  Film,
  Gamepad2,
  Building2,
  Palette,
  Rocket,
  Target,
  CheckCircle2,
  XCircle,
  MessageSquare,
  BookOpen,
  Code2,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";

import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "About Dits - Version Control Reimagined for Media",
  description: "Learn about Dits, the distributed version control system built for video production, game development, and large binary files. Discover our mission, technology, and roadmap.",
  canonical: "https://dits.dev/about",
  keywords: [
    "about dits",
    "version control history",
    "media version control",
    "git alternative",
    "video production tools",
    "open source version control",
  ],
  openGraph: {
    type: "website",
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "About Dits - Version Control Reimagined for Media",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
});

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
  {
    name: "Rust",
    description: "Core engine for performance and safety",
    details: "Memory-safe systems programming with zero-cost abstractions. Rust ensures reliability without sacrificing speed.",
    icon: Zap,
  },
  {
    name: "BLAKE3",
    description: "Fast cryptographic hashing",
    details: "10x faster than SHA-256 while maintaining cryptographic security. Enables rapid content verification at scale.",
    icon: Shield,
  },
  {
    name: "FastCDC",
    description: "Content-defined chunking algorithm",
    details: "Intelligent file splitting that finds natural boundaries. Insertions and deletions only affect nearby chunks.",
    icon: GitBranch,
  },
  {
    name: "FUSE/ProjectedFS",
    description: "Virtual filesystem support",
    details: "Files appear local but download on-demand. Work with terabytes without filling your disk.",
    icon: Globe,
  },
  {
    name: "QUIC",
    description: "Modern transport protocol",
    details: "Multiplexed connections, built-in encryption, and improved performance over unreliable networks.",
    icon: Rocket,
  },
];

const toolComparison = [
  {
    feature: "Large file handling",
    dits: { supported: true, note: "Native, no extensions needed" },
    git: { supported: false, note: "Requires Git LFS" },
    gitlfs: { supported: true, note: "Pointer files, separate storage" },
    perforce: { supported: true, note: "Centralized model" },
  },
  {
    feature: "Content deduplication",
    dits: { supported: true, note: "Automatic, cross-file" },
    git: { supported: false, note: "No deduplication" },
    gitlfs: { supported: false, note: "Full file copies" },
    perforce: { supported: false, note: "Limited" },
  },
  {
    feature: "Partial clone/sparse checkout",
    dits: { supported: true, note: "First-class VFS support" },
    git: { supported: true, note: "Limited, complex setup" },
    gitlfs: { supported: true, note: "Manual file selection" },
    perforce: { supported: true, note: "Workspace views" },
  },
  {
    feature: "File locking",
    dits: { supported: true, note: "Built-in, distributed" },
    git: { supported: false, note: "No native support" },
    gitlfs: { supported: true, note: "Basic locking" },
    perforce: { supported: true, note: "Exclusive checkouts" },
  },
  {
    feature: "Distributed architecture",
    dits: { supported: true, note: "Fully distributed" },
    git: { supported: true, note: "Fully distributed" },
    gitlfs: { supported: true, note: "Hybrid (files centralized)" },
    perforce: { supported: false, note: "Centralized" },
  },
  {
    feature: "Open source",
    dits: { supported: true, note: "Apache 2.0 + MIT" },
    git: { supported: true, note: "GPL v2" },
    gitlfs: { supported: true, note: "MIT" },
    perforce: { supported: false, note: "Proprietary" },
  },
  {
    feature: "Video-optimized chunking",
    dits: { supported: true, note: "Keyframe-aligned" },
    git: { supported: false, note: "Not applicable" },
    gitlfs: { supported: false, note: "Full file storage" },
    perforce: { supported: false, note: "Not specialized" },
  },
];

const targetAudiences = [
  {
    icon: Film,
    title: "Video Production Teams",
    description: "From solo YouTubers to major studios. Track every cut, every render, every revision with confidence.",
    useCases: ["Documentary projects", "Commercial production", "VFX pipelines", "Color grading workflows"],
  },
  {
    icon: Gamepad2,
    title: "Game Developers",
    description: "Manage textures, models, audio, and cinematics alongside your code in one unified workflow.",
    useCases: ["Asset management", "Build pipelines", "Cinematic sequences", "Localization files"],
  },
  {
    icon: Palette,
    title: "Creative Agencies",
    description: "Collaborate on design files, brand assets, and multimedia projects without the chaos.",
    useCases: ["Brand asset libraries", "Campaign materials", "Client deliverables", "Archive management"],
  },
  {
    icon: Building2,
    title: "Enterprise Media",
    description: "Scale version control across departments with fine-grained access control and audit trails.",
    useCases: ["Broadcast archives", "Compliance tracking", "Multi-site collaboration", "Legacy migration"],
  },
];

const roadmapItems: {
  phase: string;
  status: "current" | "upcoming" | "planned";
  title: string;
  description: string;
  features: string[];
}[] = [
  {
    phase: "Alpha",
    status: "current",
    title: "Core Functionality",
    description: "CLI implementation, basic operations, local chunking and deduplication",
    features: ["Init, add, commit, log", "Content-defined chunking", "BLAKE3 hashing", "Local storage backend"],
  },
  {
    phase: "Beta",
    status: "upcoming",
    title: "Collaboration Features",
    description: "Remote operations, file locking, and basic networking",
    features: ["Push/pull operations", "File locking", "Remote tracking", "Conflict resolution"],
  },
  {
    phase: "1.0",
    status: "planned",
    title: "Production Ready",
    description: "Virtual filesystem, enterprise features, and platform support",
    features: ["FUSE/ProjectedFS VFS", "Windows/macOS/Linux", "Access control", "Performance optimization"],
  },
  {
    phase: "Future",
    status: "planned",
    title: "Advanced Features",
    description: "P2P networking, cloud integrations, and specialized tools",
    features: ["QUIC-based P2P", "Cloud storage backends", "CI/CD integrations", "NLE plugins"],
  },
];

const roadmapMeta: Record<
  (typeof roadmapItems)[number]["status"],
  { tone: TimelineEvent["tone"]; pillTone: "success" | "warning" | "neutral"; label: string }
> = {
  current: { tone: "info", pillTone: "warning", label: "Active Development" },
  upcoming: { tone: "warning", pillTone: "warning", label: "Coming Soon" },
  planned: { tone: "neutral", pillTone: "neutral", label: "Planned" },
};

const contributionAreas = [
  {
    icon: Code2,
    title: "Core Development",
    description: "Contribute to the Rust codebase, fix bugs, and implement new features.",
    link: "https://github.com/dits-dev/dits",
  },
  {
    icon: BookOpen,
    title: "Documentation",
    description: "Improve guides, write tutorials, and help new users get started.",
    link: "/docs/contributing",
  },
  {
    icon: MessageSquare,
    title: "Community Support",
    description: "Answer questions, share knowledge, and help grow the community.",
    link: "https://discord.gg/dits",
  },
  {
    icon: Target,
    title: "Testing & Feedback",
    description: "Test new features, report bugs, and provide valuable user feedback.",
    link: "https://github.com/dits-dev/dits/issues",
  },
];

function ComparisonCell({
  supported,
  note,
  highlight = false,
}: {
  supported: boolean;
  note: string;
  highlight?: boolean;
}) {
  return (
    <td className={`p-4 text-center align-top ${highlight ? "bg-brand/5" : ""}`}>
      <div className="flex flex-col items-center gap-1">
        {supported ? (
          <CheckCircle2 className="h-5 w-5 text-success" aria-label="Supported" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground" aria-label="Not supported" />
        )}
        <span className="text-xs text-muted-foreground">{note}</span>
      </div>
    </td>
  );
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      {/* AGENTS.md: main with id for skip-link */}
      <main id="main-content" className="flex-1 pt-[104px]" tabIndex={-1}>
        {/* Hero */}
        <section className="relative overflow-hidden py-20 md:py-28" aria-labelledby="about-heading">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
            <div className="absolute inset-x-0 top-0 h-[480px] glow-brand" />
          </div>
          <div className="container">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="outline" className="mb-6">
                Open Source • Apache 2.0 + MIT
              </Badge>
              <h1 id="about-heading" className="text-4xl font-bold tracking-tight md:text-6xl">
                Version Control,{" "}
                <span className="text-gradient-brand">Reimagined for Media</span>
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-xl text-muted-foreground">
                Dits is a distributed version control system built from the ground up
                for video production, game development, and large binary files.
                Finally, version control that understands your workflow.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button size="lg" render={<Link href="/download" />}>Get Started</Button>
                <Button size="lg" variant="outline" render={<Link href="/docs/getting-started" />}>Read the Docs</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="border-t bg-muted/30 py-20 md:py-28" aria-labelledby="mission-heading">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <h2 id="mission-heading" className="mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Our Mission
              </h2>
              <div className="space-y-6 text-center">
                <p className="text-lg text-muted-foreground">
                  We believe every creative professional deserves version control that works
                  for them — not against them. Git revolutionized how developers collaborate,
                  but it was never designed for the massive files that define modern media production.
                </p>
                <p className="text-lg text-muted-foreground">
                  Dits exists to bridge this gap: providing the full power of distributed version
                  control to video editors, game developers, 3D artists, and anyone who works with
                  large binary files. No workarounds, no extensions, no compromises.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Origin Story */}
        <section className="border-t py-20 md:py-28" aria-labelledby="story-heading">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <h2 id="story-heading" className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Why We Built Dits
              </h2>
              <div className="grid items-center gap-12 md:grid-cols-2">
                <div className="space-y-6">
                  <p className="text-muted-foreground">
                    The story of Dits began with frustration. Working on video projects with distributed
                    teams, we constantly hit the limits of existing tools. Git LFS felt like a band-aid,
                    Perforce required expensive infrastructure, and nothing understood the unique patterns
                    of video files.
                  </p>
                  <p className="text-muted-foreground">
                    We asked ourselves: what if we could build version control specifically for media?
                    What if we could leverage content-defined chunking to find the actual changes in video
                    files? What if we could make terabyte repositories feel as fast as kilobyte ones?
                  </p>
                  <p className="text-muted-foreground">
                    Dits is the answer to those questions. Built in Rust for performance, designed with
                    media workflows in mind, and open source so everyone can benefit.
                  </p>
                </div>
                <div
                  className="overflow-hidden rounded-2xl shadow-float"
                  style={{
                    backgroundColor: "var(--code-background)",
                    border: "1px solid var(--code-border)",
                  }}
                >
                  <div
                    className="flex items-center gap-2 px-4 py-3"
                    style={{ borderBottom: "1px solid var(--code-border)" }}
                  >
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-destructive" />
                      <div className="h-3 w-3 rounded-full bg-warning" />
                      <div className="h-3 w-3 rounded-full bg-success" />
                    </div>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">terminal</span>
                  </div>
                  <pre
                    className="p-5 font-mono text-sm"
                    style={{ color: "var(--code-foreground)" }}
                  >
{`$ dits add project.prproj
$ dits add media/

Adding 847 files (1.2 TB)
Chunking: ████████████ 100%
Deduplication: 67% (412 GB saved)

$ dits commit -m "Final cut v3"
[main abc1234] Final cut v3
  847 files, 788 GB (net)`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Problem */}
        <section className="border-t bg-muted/30 py-20 md:py-28" aria-labelledby="problem-heading">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <h2 id="problem-heading" className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                The Problem with Existing Tools
              </h2>
              {/* AGENTS.md: Redundant status cues - not color only, using icons and text */}
              <div className="space-y-4" role="list" aria-label="Problems solved by Dits">
                {problemsSolved.map((item, i) => (
                  <Card key={i} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-card" role="listitem">
                    <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10" aria-hidden="true">
                      <XCircle className="size-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-muted-foreground line-through">
                        <span className="sr-only">Problem: </span>
                        {item.problem}
                      </p>
                    </div>
                    <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-success/10" aria-hidden="true">
                      <CheckCircle2 className="size-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-success">
                        <span className="sr-only">Solution: </span>
                        {item.solution}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="border-t py-20 md:py-28" aria-labelledby="how-it-works-heading">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <h2 id="how-it-works-heading" className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                How Dits Works
              </h2>
              <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
                Instead of storing files as single objects, Dits breaks them into
                content-defined chunks that can be shared across files and versions.
              </p>

              <div className="grid gap-6 md:grid-cols-3" role="list" aria-label="How Dits works in 3 steps">
                {[
                  {
                    n: "1",
                    title: "Chunk",
                    body: "Files are split into variable-size chunks using content-defined boundaries. Changes only affect nearby chunks, so small edits don't invalidate the entire file.",
                  },
                  {
                    n: "2",
                    title: "Hash",
                    body: "Each chunk is identified by its BLAKE3 hash. Identical chunks share the same hash and are stored only once, regardless of which files contain them.",
                  },
                  {
                    n: "3",
                    title: "Deduplicate",
                    body: "Similar footage, multiple versions, and shared content automatically deduplicate. A 4K timeline with 100 cuts from the same source? Minimal overhead.",
                  },
                ].map((step) => (
                  <Card key={step.n} role="listitem" className="rounded-2xl border bg-card shadow-card">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand/10">
                        <span className="text-2xl font-bold text-brand" aria-hidden="true">{step.n}</span>
                      </div>
                      <CardTitle>{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center">{step.body}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tool Comparison */}
        <section className="border-t bg-muted/30 py-20 md:py-28" aria-labelledby="comparison-heading">
          <div className="container">
            <div className="mx-auto max-w-6xl">
              <h2 id="comparison-heading" className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                How Dits Compares
              </h2>
              <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
                See how Dits stacks up against existing version control solutions
                for media and large file workflows.
              </p>
              <Card className="overflow-hidden rounded-2xl border bg-card shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" role="table">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-4 text-left font-semibold">Feature</th>
                        <th className="bg-brand/5 p-4 text-center font-semibold">Dits</th>
                        <th className="p-4 text-center font-semibold">Git</th>
                        <th className="p-4 text-center font-semibold">Git LFS</th>
                        <th className="p-4 text-center font-semibold">Perforce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toolComparison.map((row, i) => (
                        <tr key={i} className="border-b border-border transition-colors hover:bg-muted/30">
                          <td className="p-4 align-top font-medium">{row.feature}</td>
                          <ComparisonCell supported={row.dits.supported} note={row.dits.note} highlight />
                          <ComparisonCell supported={row.git.supported} note={row.git.note} />
                          <ComparisonCell supported={row.gitlfs.supported} note={row.gitlfs.note} />
                          <ComparisonCell supported={row.perforce.supported} note={row.perforce.note} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Target Audiences */}
        <section className="border-t py-20 md:py-28" aria-labelledby="audience-heading">
          <div className="container">
            <div className="mx-auto max-w-6xl">
              <h2 id="audience-heading" className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Built for Creative Professionals
              </h2>
              <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
                Whether you&apos;re a solo creator or part of a large studio, Dits adapts
                to your workflow.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                {targetAudiences.map((audience) => (
                  <Card key={audience.title} className="h-full rounded-2xl border bg-card shadow-card">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-brand/10">
                          <audience.icon className="size-6 text-brand" aria-hidden="true" />
                        </div>
                        <CardTitle>{audience.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CardDescription>{audience.description}</CardDescription>
                      <div className="flex flex-wrap gap-2">
                        {audience.useCases.map((useCase) => (
                          <Badge key={useCase} variant="secondary" className="text-xs">
                            {useCase}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="border-t bg-muted/30 py-20 md:py-28" aria-labelledby="tech-heading">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <h2 id="tech-heading" className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Built with Modern Technology
              </h2>
              <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
                We&apos;ve chosen the best tools for performance, reliability, and security.
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="list">
                {techStack.map((tech) => (
                  <Card key={tech.name} role="listitem" className="h-full rounded-2xl border bg-card shadow-card">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
                          <tech.icon className="size-5 text-brand" aria-hidden="true" />
                        </div>
                        <Badge variant="secondary" className="font-mono">
                          {tech.name}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-2 font-medium">{tech.description}</p>
                      <p className="text-sm text-muted-foreground">{tech.details}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="border-t py-20 md:py-28" aria-labelledby="roadmap-heading">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <h2 id="roadmap-heading" className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Roadmap
              </h2>
              <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
                We&apos;re actively developing Dits and committed to transparency about our progress.
              </p>
              <EventTimeline
                events={roadmapItems.map((item) => {
                  const meta = roadmapMeta[item.status];
                  return {
                    tone: meta.tone,
                    title: (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge
                            variant={item.status === "current" ? "default" : "secondary"}
                            className="font-mono"
                          >
                            {item.phase}
                          </Badge>
                          <span className="text-base font-semibold">{item.title}</span>
                          <StatusPill tone={meta.pillTone} pulse={item.status === "current"}>
                            {meta.label}
                          </StatusPill>
                        </div>
                        <p className="font-normal text-muted-foreground">{item.description}</p>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {item.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="size-4 flex-shrink-0 text-brand" aria-hidden="true" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                  } satisfies TimelineEvent;
                })}
              />
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="border-t bg-muted/30 py-20 md:py-28" aria-labelledby="values-heading">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <h2 id="values-heading" className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Our Values
              </h2>
              <div className="grid gap-6 md:grid-cols-3" role="list">
                {[
                  {
                    icon: Scale,
                    title: "Open Source",
                    body: "Dual-licensed under Apache 2.0 and MIT. Free to use, modify, and distribute. Your data belongs to you.",
                  },
                  {
                    icon: Users,
                    title: "Community Driven",
                    body: "Built for and with the media community. Your feedback shapes the roadmap. Join our Discord to participate.",
                  },
                  {
                    icon: Heart,
                    title: "User First",
                    body: "Designed for real workflows. Git-like commands make adoption easy. We listen to creators, not marketers.",
                  },
                ].map((value) => (
                  <Card key={value.title} className="rounded-2xl border bg-card p-6 text-center shadow-card" role="listitem">
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand/10">
                      {/* AGENTS.md: Decorative icons are aria-hidden */}
                      <value.icon className="size-8 text-brand" aria-hidden="true" />
                    </div>
                    <h3 className="mb-2 font-semibold">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.body}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contributing */}
        <section className="border-t py-20 md:py-28" aria-labelledby="contributing-heading">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <h2 id="contributing-heading" className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Join the Community
              </h2>
              <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
                Dits is open source and community-driven. There are many ways to get involved.
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {contributionAreas.map((area) => (
                  <Card key={area.title} className="h-full rounded-2xl border bg-card text-center shadow-card transition-colors hover:border-brand/40">
                    <CardHeader>
                      <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-brand/10">
                        <area.icon className="size-6 text-brand" aria-hidden="true" />
                      </div>
                      <CardTitle className="text-lg">{area.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-4">{area.description}</CardDescription>
                      <Button variant="outline" size="sm" render={<Link href={area.link} />}>Get Started</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-12 text-center">
                <Card className="inline-flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-card">
                  <GithubIcon className="size-6" />
                  <div className="text-left">
                    <p className="font-medium">Star us on GitHub</p>
                    <p className="text-sm text-muted-foreground">
                      Help spread the word by starring our repository
                    </p>
                  </div>
                  <Button variant="outline" size="sm" render={<Link href="https://github.com/dits-dev/dits" target="_blank" rel="noopener noreferrer" />}>
                    Star on GitHub
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden border-t bg-primary py-20 text-primary-foreground md:py-28" aria-labelledby="cta-heading">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-10" />
          <div className="container relative">
            <div className="mx-auto max-w-3xl text-center">
              <h2 id="cta-heading" className="mb-4 text-3xl font-bold md:text-4xl">
                Ready to Take Control of Your Media?
              </h2>
              <p className="mb-8 text-lg text-primary-foreground/80">
                Download Dits and experience version control built for how you actually work.
                It&apos;s free, open source, and ready to handle your biggest projects.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" variant="secondary" render={<Link href="/download" />}>Download Dits</Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                  render={<Link href="/docs/getting-started" />}
                >
                  Read the Docs
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
