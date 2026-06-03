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
  Clock,
  MessageSquare,
  BookOpen,
  Code2,
  ArrowRight,
  AlertTriangle,
  Boxes,
  Cloud,
  Server,
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

// Honest implementation status — sourced from README "Implementation status".
const workingToday = [
  "Content-addressed object store with BLAKE3 verification",
  "FastCDC chunking, dedup, and byte-exact reconstruction",
  "Structure-aware MP4/ISOBMFF parse → deconstruct → reconstruct",
  "Convergent AES-256-GCM encryption",
  "Hybrid Git (libgit2) text + Dits binary storage",
  "Local commit / add / status / diff / log / branch / merge / checkout",
  "Local-filesystem clone & push",
  "FACR frame-addressable video (experimental — try dits facr-demo)",
];

const onRoadmap = [
  "QUIC delta sync (network push / pull / fetch is scaffolding today)",
  "P2P rendezvous & NAT traversal",
  "Bi-directional sync over a network remote",
  "FUSE/WinFSP virtual filesystem mounts",
  "Distributed file locking for teams",
];

// Honest results — real numbers from the benchmark spike (one machine, one run).
const honestResults = [
  { tone: "win" as const, stat: "98.3%", label: "deduplicated on a frame-addressable re-grade (store 5 changed frames, reuse 295)" },
  { tone: "win" as const, stat: "7.4×", label: "less data shipped on an incremental streaming re-publish (re-encode 1 of 6 segments)" },
  { tone: "win" as const, stat: "0.19 MiB", label: "stored for a metadata-only MP4 change — beats restic (0.77) and borg (5.93)" },
  { tone: "loss" as const, stat: "Loses", label: "on a full video re-export: generic chunking can't help when every byte shifts. We say so." },
];

const openCore = [
  {
    icon: Boxes,
    name: "Dits (open source core)",
    points: ["CLI, libraries & protocol — run locally or self-host", "Open data formats and wire protocol", "Local-first, works offline", "Apache-2.0 / MIT"],
  },
  {
    icon: Cloud,
    name: "Ditshub (hosted platform)",
    points: ["Managed cloud built on the open protocol", "Real-time collaboration & permissions", "Cloud render / transcode compute", "Everything it does is possible self-hosted"],
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

const roadmapItems = [
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

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* AGENTS.md: main with id for skip-link */}
      <main id="main-content" className="flex-1 pt-[104px]" tabIndex={-1}>
        {/* Hero */}
        <section className="container py-16 md:py-24" aria-labelledby="about-heading">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="outline" className="mb-4">
              Open Source • Apache 2.0 + MIT
            </Badge>
            <h1 id="about-heading" className="text-4xl font-bold tracking-tight md:text-6xl">
              Version Control,{" "}
              <span className="text-primary">Reimagined for Media</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-3xl mx-auto">
              Dits is a distributed version control system built from the ground up
              for video production, game development, and large binary files.
              Finally, version control that understands your workflow.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" render={<Link href="/download" />}>Get Started</Button>
              <Button size="lg" variant="outline" render={<Link href="/docs/getting-started" />}>Read the Docs</Button>
            </div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="border-y bg-muted/50" aria-labelledby="mission-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-4xl">
              <h2 id="mission-heading" className="text-3xl font-bold tracking-tight text-center mb-8">
                Our Mission
              </h2>
              <div className="text-center space-y-6">
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
        <section className="container py-16 md:py-24" aria-labelledby="story-heading">
          <div className="mx-auto max-w-4xl">
            <h2 id="story-heading" className="text-3xl font-bold tracking-tight text-center mb-12">
              Why We Built Dits
            </h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
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
              <div className="relative">
                <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 border">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <pre className="text-sm font-mono text-muted-foreground">
                      {`$ dits add project.prproj
$ dits add media/

Adding 847 files (1.2 TB)
Chunking: ████████████ 100%
Deduplication: 67% (412 GB saved)

$ dits commit -m "Final cut v3"
[main abc1234] Final cut v3
  847 files, 788 GB (net)`}
                    </pre>
                    <p className="text-xs text-muted-foreground/70 italic">
                      Illustrative example. See real benchmark numbers below.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
                  <div key={i} className="flex gap-4 items-center" role="listitem">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center" aria-hidden="true">
                      <XCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium line-through text-muted-foreground">
                        <span className="sr-only">Problem: </span>
                        {item.problem}
                      </p>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center" aria-hidden="true">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
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

        {/* How It Works teaser */}
        <section className="container py-16 md:py-24" aria-labelledby="how-teaser-heading">
          <div className="mx-auto max-w-4xl text-center">
            <h2 id="how-teaser-heading" className="text-3xl font-bold tracking-tight mb-4">
              Chunk, hash, deduplicate
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto text-lg">
              Instead of storing files as single objects, Dits breaks them into content-defined
              chunks, names each by its BLAKE3 hash, and stores every unique chunk exactly once —
              across versions, files, and projects. The full walkthrough, with diagrams and the
              honest Git-vs-Dits comparison, lives on its own page.
            </p>
            <Button size="lg" variant="outline" render={<Link href="/how-it-works" />}>
              See how Dits works
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>

        {/* What we're actually building */}
        <section className="border-y bg-muted/50" aria-labelledby="status-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-5xl">
              <h2 id="status-heading" className="text-3xl font-bold tracking-tight text-center mb-4">
                What we&apos;re actually building
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                Dits is in active alpha. To set expectations honestly, here&apos;s exactly what
                works today versus what&apos;s still on the roadmap.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="h-full border-brand/30">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-5 text-brand" aria-hidden="true" />
                      <CardTitle>Working today</CardTitle>
                    </div>
                    <CardDescription>The local-first engine you can run right now.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5" role="list">
                      {workingToday.map((item) => (
                        <li key={item} className="flex gap-2.5 text-sm">
                          <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-brand" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-5 text-amber-500" aria-hidden="true" />
                      <CardTitle>On the roadmap</CardTitle>
                    </div>
                    <CardDescription>Designed and scaffolded — don&apos;t rely on these yet.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5" role="list">
                      {onRoadmap.map((item) => (
                        <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                          <Clock className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Honest results */}
        <section className="border-y bg-muted/50" aria-labelledby="results-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-5xl">
              <h2 id="results-heading" className="text-3xl font-bold tracking-tight text-center mb-4">
                Where Dits wins — and where it loses
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                Real numbers from a benchmark spike against git-lfs, restic, borg, and xdelta3.
                The differentiator is the format-aware layer — and we show the case where generic
                chunking loses, because that&apos;s what makes the wins credible.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {honestResults.map((r) => (
                  <div
                    key={r.label}
                    className={`flex items-start gap-4 rounded-xl border p-5 ${
                      r.tone === "win" ? "border-brand/30 bg-brand/5" : "border-destructive/40 bg-destructive/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      {r.tone === "win" ? (
                        <CheckCircle2 className="size-5 text-brand" aria-hidden="true" />
                      ) : (
                        <XCircle className="size-5 text-destructive" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${r.tone === "win" ? "text-brand" : "text-destructive"}`}>
                        {r.stat}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{r.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Button variant="outline" size="sm" render={<Link href="/how-it-works" />}>
                  See the full comparison
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Open core vs Ditshub */}
        <section className="container py-16 md:py-24" aria-labelledby="opencore-heading">
          <div className="mx-auto max-w-5xl">
            <h2 id="opencore-heading" className="text-3xl font-bold tracking-tight text-center mb-4">
              Open core, hosted convenience
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Dits follows an open-core model inspired by Git and GitHub. The core is fully open
              and self-hostable; the hosted platform adds scale and managed services.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {openCore.map((col) => (
                <Card key={col.name} className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <col.icon className="size-5 text-primary" aria-hidden="true" />
                      </div>
                      <CardTitle>{col.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5" role="list">
                      {col.points.map((p) => (
                        <li key={p} className="flex gap-2.5 text-sm text-muted-foreground">
                          <Server className="size-4 shrink-0 mt-0.5 text-brand" aria-hidden="true" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Target Audiences */}
        <section className="container py-16 md:py-24" aria-labelledby="audience-heading">
          <div className="mx-auto max-w-6xl">
            <h2 id="audience-heading" className="text-3xl font-bold tracking-tight text-center mb-4">
              Built for Creative Professionals
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Whether you&apos;re a solo creator or part of a large studio, Dits adapts
              to your workflow.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {targetAudiences.map((audience) => (
                <Card key={audience.title} className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <audience.icon className="w-6 h-6 text-primary" aria-hidden="true" />
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
        </section>

        {/* Tech Stack */}
        <section className="border-y bg-muted/50" aria-labelledby="tech-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-5xl">
              <h2 id="tech-heading" className="text-3xl font-bold tracking-tight text-center mb-4">
                Built with Modern Technology
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                We&apos;ve chosen the best tools for performance, reliability, and security.
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="list">
                {techStack.map((tech) => (
                  <Card key={tech.name} role="listitem" className="h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <tech.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                        </div>
                        <Badge variant="secondary" className="font-mono">
                          {tech.name}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium mb-2">{tech.description}</p>
                      <p className="text-sm text-muted-foreground">{tech.details}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="container py-16 md:py-24" aria-labelledby="roadmap-heading">
          <div className="mx-auto max-w-5xl">
            <h2 id="roadmap-heading" className="text-3xl font-bold tracking-tight text-center mb-4">
              Roadmap
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              We&apos;re actively developing Dits and committed to transparency about our progress.
            </p>
            <div className="relative">
              {/* Timeline connector */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:-translate-x-0.5" aria-hidden="true" />

              <div className="space-y-8">
                {roadmapItems.map((item, index) => (
                  <div key={item.phase} className={`relative flex ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8`}>
                    {/* Timeline dot */}
                    <div className="absolute left-4 md:left-1/2 w-8 h-8 rounded-full border-4 border-background bg-background md:-translate-x-1/2 flex items-center justify-center z-10">
                      {item.status === 'current' ? (
                        <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
                      ) : item.status === 'upcoming' ? (
                        <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-muted" />
                      )}
                    </div>

                    <div className={`flex-1 ml-16 md:ml-0 ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                      <Card className={item.status === 'current' ? 'border-primary' : ''}>
                        <CardHeader>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge
                              variant={item.status === 'current' ? 'default' : 'secondary'}
                              className="font-mono"
                            >
                              {item.phase}
                            </Badge>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">
                              {item.status === 'current' ? '● Active Development' :
                                item.status === 'upcoming' ? '○ Coming Soon' : '○ Planned'}
                            </span>
                          </div>
                          <CardTitle className="text-xl">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <CardDescription>{item.description}</CardDescription>
                          <ul className="grid grid-cols-2 gap-2">
                            {item.features.map((feature) => (
                              <li key={feature} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Spacer for alternating layout */}
                    <div className="hidden md:block flex-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="border-y bg-muted/50" aria-labelledby="values-heading">
          <div className="container py-16 md:py-24">
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
                    and distribute. Your data belongs to you.
                  </p>
                </div>
                <div className="text-center" role="listitem">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold mb-2">Community Driven</h3>
                  <p className="text-sm text-muted-foreground">
                    Built for and with the media community. Your feedback shapes
                    the roadmap. Join our Discord to participate.
                  </p>
                </div>
                <div className="text-center" role="listitem">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Heart className="w-8 h-8 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold mb-2">User First</h3>
                  <p className="text-sm text-muted-foreground">
                    Designed for real workflows. Git-like commands make adoption
                    easy. We listen to creators, not marketers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contributing */}
        <section className="container py-16 md:py-24" aria-labelledby="contributing-heading">
          <div className="mx-auto max-w-5xl">
            <h2 id="contributing-heading" className="text-3xl font-bold tracking-tight text-center mb-4">
              Join the Community
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Dits is open source and community-driven. There are many ways to get involved.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contributionAreas.map((area) => (
                <Card key={area.title} className="text-center h-full hover:border-primary transition-colors">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <area.icon className="w-6 h-6 text-primary" aria-hidden="true" />
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
              <div className="inline-flex items-center gap-4 p-4 rounded-lg border bg-muted/50">
                <GithubIcon className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-medium">Star us on GitHub</p>
                  <p className="text-sm text-muted-foreground">
                    Help spread the word by starring our repository
                  </p>
                </div>
                <Button variant="outline" size="sm" render={<Link href="https://github.com/dits-dev/dits" target="_blank" rel="noopener noreferrer" />}>
                  Star on GitHub
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-primary text-primary-foreground" aria-labelledby="cta-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Take Control of Your Media?
              </h2>
              <p className="text-primary-foreground/80 mb-8 text-lg">
                Download Dits and experience version control built for how you actually work.
                It&apos;s free, open source, and ready to handle your biggest projects.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" variant="secondary" render={<Link href="/download" />}>Download Dits</Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-primary-foreground/20 hover:bg-primary-foreground/10"
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
