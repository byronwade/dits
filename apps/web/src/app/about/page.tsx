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
  Github,
  MessageSquare,
  BookOpen,
  Code2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Dits - Version Control Reimagined for Media",
  description: "Learn about Dits, the distributed version control system built for video production, game development, and large binary files. Discover our mission, technology, and roadmap.",
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
      <main id="main-content" className="flex-1" tabIndex={-1}>
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
              <Button size="lg" asChild>
                <Link href="/download">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs/getting-started">Read the Docs</Link>
              </Button>
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
                    boundaries. Changes only affect nearby chunks, so small edits
                    don&apos;t invalidate the entire file.
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
                    share the same hash and are stored only once, regardless of
                    which files contain them.
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
                    automatically deduplicate. A 4K timeline with 100 cuts from
                    the same source? Minimal overhead.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Tool Comparison */}
        <section className="border-y bg-muted/50" aria-labelledby="comparison-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-6xl">
              <h2 id="comparison-heading" className="text-3xl font-bold tracking-tight text-center mb-4">
                How Dits Compares
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                See how Dits stacks up against existing version control solutions
                for media and large file workflows.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" role="table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold bg-primary/5">Dits</th>
                      <th className="text-center p-4 font-semibold">Git</th>
                      <th className="text-center p-4 font-semibold">Git LFS</th>
                      <th className="text-center p-4 font-semibold">Perforce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolComparison.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{row.feature}</td>
                        <td className="p-4 text-center bg-primary/5">
                          {row.dits.supported ? (
                            <div className="flex flex-col items-center gap-1">
                              <CheckCircle2 className="w-5 h-5 text-green-600" aria-label="Supported" />
                              <span className="text-xs text-muted-foreground">{row.dits.note}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <XCircle className="w-5 h-5 text-destructive" aria-label="Not supported" />
                              <span className="text-xs text-muted-foreground">{row.dits.note}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {row.git.supported ? (
                            <div className="flex flex-col items-center gap-1">
                              <CheckCircle2 className="w-5 h-5 text-green-600" aria-label="Supported" />
                              <span className="text-xs text-muted-foreground">{row.git.note}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <XCircle className="w-5 h-5 text-muted-foreground" aria-label="Not supported" />
                              <span className="text-xs text-muted-foreground">{row.git.note}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {row.gitlfs.supported ? (
                            <div className="flex flex-col items-center gap-1">
                              <CheckCircle2 className="w-5 h-5 text-green-600" aria-label="Supported" />
                              <span className="text-xs text-muted-foreground">{row.gitlfs.note}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <XCircle className="w-5 h-5 text-muted-foreground" aria-label="Not supported" />
                              <span className="text-xs text-muted-foreground">{row.gitlfs.note}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {row.perforce.supported ? (
                            <div className="flex flex-col items-center gap-1">
                              <CheckCircle2 className="w-5 h-5 text-green-600" aria-label="Supported" />
                              <span className="text-xs text-muted-foreground">{row.perforce.note}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <XCircle className="w-5 h-5 text-muted-foreground" aria-label="Not supported" />
                              <span className="text-xs text-muted-foreground">{row.perforce.note}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    <Button variant="outline" size="sm" asChild>
                      <Link href={area.link}>Get Started</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-4 p-4 rounded-lg border bg-muted/50">
                <Github className="w-6 h-6" aria-hidden="true" />
                <div className="text-left">
                  <p className="font-medium">Star us on GitHub</p>
                  <p className="text-sm text-muted-foreground">
                    Help spread the word by starring our repository
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="https://github.com/dits-dev/dits" target="_blank" rel="noopener noreferrer">
                    Star on GitHub
                  </Link>
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
