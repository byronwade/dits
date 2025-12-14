"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  GitBranch,
  HardDrive,
  Zap,
  Film,
  Shield,
  ArrowRight,
  Check,
  Layers,
  Clock,
  Database,
  Copy,
  CheckCircle2,
  Terminal,
  Sparkles,
  Gauge,
  FileVideo,
  Users,
  Github,
  Rocket,
  Clipboard,
  Globe,
  Link as LinkIcon,
  Folder,
  X,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Zap,
    title: "Blazing Fast",
    description:
      "BLAKE3 hashing at 3+ GB/s per core. FastCDC chunking at 2+ GB/s. Even 100GB files are manageable.",
    highlight: "3+ GB/s hashing",
  },
  {
    icon: HardDrive,
    title: "Smart Deduplication",
    description:
      "1-byte edit in 10GB file? Only ~1MB new storage. Video trims typically reuse 50-80% of chunks.",
    highlight: "High dedup",
  },
  {
    icon: GitBranch,
    title: "Git-Like Workflow",
    description:
      "Same commands you know: init, add, commit, push, pull, branch, merge. Zero learning curve.",
    highlight: "Familiar commands",
  },
  {
    icon: Film,
    title: "Video-Native",
    description:
      "Understands MP4, MOV, MXF containers. Chunks can align to keyframes for better deduplication.",
    highlight: "Format-aware",
  },
  {
    icon: Shield,
    title: "Data Integrity",
    description:
      "Every chunk cryptographically verified with BLAKE3. Corruption detected on read.",
    highlight: "Zero bit rot",
  },
  {
    icon: Layers,
    title: "Virtual Filesystem",
    description:
      "Mount repos as drives. Access files on-demand—only touched chunks download.",
    highlight: "On-demand access",
  },
  {
    icon: Users,
    title: "Peer-to-Peer Sharing",
    description:
      "Share repositories directly between computers. No cloud uploads, just join codes.",
    highlight: "Direct sharing",
  },
  {
    icon: Database,
    title: "Distributed Storage",
    description:
      "QUIC-based transport with end-to-end encryption. NAT traversal for most networks.",
    highlight: "P2P powered",
  },
];


const stats = [
  { value: "99%+", label: "Chunk reuse", sublabel: "on file edits*", icon: Database, color: "emerald" },
  { value: "~4s", label: "To chunk", sublabel: "1GB video*", icon: Clock, color: "blue" },
  { value: "3GB/s", label: "BLAKE3 hash", sublabel: "per core", icon: Gauge, color: "purple" },
  { value: "80+", label: "CLI commands", sublabel: "full-featured", icon: Terminal, color: "orange" },
  { value: "P2P", label: "Direct sharing", sublabel: "no cloud required", icon: Users, color: "pink" },
  { value: "QUIC", label: "Transport", sublabel: "fast & encrypted", icon: Zap, color: "yellow" },
  { value: "100%", label: "Open source", sublabel: "MIT licensed", icon: Github, color: "slate" },
  { value: "MP4", label: "Video aware", sublabel: "keyframe splitting", icon: FileVideo, color: "red" },
];

const useCases = [
  {
    icon: FileVideo,
    title: "Video Production",
    description:
      "Version control for raw footage, edits, and exports. Track every cut without drowning in storage.",
    users: "Editors, Colorists, VFX Artists",
  },
  {
    icon: Sparkles,
    title: "Game Development",
    description:
      "Manage textures, models, and builds. Deduplication means faster syncs across your team.",
    users: "Game Studios, Indie Devs",
  },
  {
    icon: Users,
    title: "Creative Teams",
    description:
      "Collaborate on large assets without conflicts. File locking ensures nobody overwrites your work.",
    users: "Agencies, Studios, Freelancers",
  },
];

const phases = [
  { name: "Engine", status: "complete", description: "Chunking & dedup" },
  { name: "Atom Exploder", status: "complete", description: "MP4 parsing" },
  { name: "VFS", status: "complete", description: "FUSE mount" },
  { name: "Git Parity", status: "complete", description: "Branch & merge" },
  { name: "Introspection", status: "complete", description: "Stats & inspect" },
  { name: "P2P Sharing", status: "complete", description: "Direct file sharing" },
  { name: "Network", status: "active", description: "QUIC sync" },
  { name: "Locking", status: "planned", description: "File locks" },
  { name: "Hologram", status: "planned", description: "Proxy edit" },
  { name: "Freeze", status: "planned", description: "Cold storage" },
];

const installCommands = {
  npm: "npm install -g @byronwade/dits",
  curl: "curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh",
  brew: "brew tap byronwade/dits && brew install dits",
  cargo: "cargo install dits",
};

/**
 * CopyButton following AGENTS.md guidelines:
 * - MUST: Icon-only buttons have descriptive aria-label
 * - MUST: Use polite aria-live for feedback
 * - MUST: Visible focus rings
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-zinc-400 hover:text-zinc-100 focus-visible:ring-primary"
      onClick={copy}
      aria-label={copied ? "Copied to clipboard" : "Copy command to clipboard"}
      type="button"
    >
      {/* AGENTS.md: Decorative icons are aria-hidden */}
      {copied ? (
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      {/* AGENTS.md: polite aria-live for feedback */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Copied!" : ""}
      </span>
    </Button>
  );
}

/**
 * AnimatedCounter following AGENTS.md:
 * - MUST: Tabular numbers for comparisons (font-variant-numeric: tabular-nums)
 */
function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  return (
    <span className="tabular-nums font-mono">
      {value}
      {suffix}
    </span>
  );
}

/**
 * Homepage following AGENTS.md guidelines:
 * - MUST: Main content has id for skip-link target
 * - MUST: Sections have proper headings hierarchy
 * - MUST: Animations respect prefers-reduced-motion
 * - MUST: Tabular numbers for stats
 * - MUST: Accessible charts and comparisons
 */
export default function Home() {
  const [activeInstall, setActiveInstall] = useState<keyof typeof installCommands>("npm");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* AGENTS.md: main element with id for skip-link */}
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {/* Hero Section */}
        <section className="relative overflow-hidden" aria-labelledby="hero-heading">
          {/* Background gradient */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-50" />
          </div>

          <div className="container py-20 md:py-32">
            <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-6 text-center">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="px-3 py-1 text-sm">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  v0.1.2 Released
                </Badge>
                <Badge variant="secondary" className="px-3 py-1 text-sm">
                  Open Source
                </Badge>
              </div>

              <h1 id="hero-heading" className="text-4xl font-bold leading-tight tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                Version Control for{" "}
                <span className="relative">
                  <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                    Large Files
                  </span>
                  <svg
                    className="absolute -bottom-2 left-0 w-full h-3 text-primary/30"
                    viewBox="0 0 200 12"
                    fill="none"
                  >
                    <path
                      d="M2 10C50 4 150 4 198 10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="max-w-[700px] text-lg text-muted-foreground md:text-xl">
                Git wasn&apos;t built for video. <span className="font-semibold text-foreground">Dits was.</span>{" "}
                Content-defined chunking, smart deduplication, and video-native
                features for modern media workflows.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" className="h-12 px-8 text-base" asChild>
                  <Link href="/download">
                    <Download className="mr-2 h-5 w-5" />
                    Download for Free
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                  <Link href="/docs/getting-started">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Free forever
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  No account required
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Works offline
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section - Modern Bento Grid */}
        <section className="relative overflow-hidden" aria-label="Dits performance statistics">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" aria-hidden="true" />

          <div className="container relative py-16">
            {/* Section header */}
            <div className="text-center mb-10">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">By the Numbers</Badge>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-2">
                Built for Performance
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every component optimized for speed and efficiency with large files
              </p>
            </div>

            {/* Bento grid stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto" role="list">
              {stats.map((stat, i) => {
                const colorClasses = {
                  emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 group-hover:border-emerald-500/40",
                  blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20 group-hover:border-blue-500/40",
                  purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 group-hover:border-purple-500/40",
                  orange: "from-orange-500/20 to-orange-500/5 border-orange-500/20 group-hover:border-orange-500/40",
                  pink: "from-pink-500/20 to-pink-500/5 border-pink-500/20 group-hover:border-pink-500/40",
                  yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/20 group-hover:border-yellow-500/40",
                  slate: "from-slate-500/20 to-slate-500/5 border-slate-500/20 group-hover:border-slate-500/40",
                  red: "from-red-500/20 to-red-500/5 border-red-500/20 group-hover:border-red-500/40",
                };
                const iconColorClasses = {
                  emerald: "bg-emerald-500/10 text-emerald-500",
                  blue: "bg-blue-500/10 text-blue-500",
                  purple: "bg-purple-500/10 text-purple-500",
                  orange: "bg-orange-500/10 text-orange-500",
                  pink: "bg-pink-500/10 text-pink-500",
                  yellow: "bg-yellow-500/10 text-yellow-500",
                  slate: "bg-slate-500/10 text-slate-400",
                  red: "bg-red-500/10 text-red-500",
                };
                return (
                  <div
                    key={stat.label}
                    className={cn(
                      "group relative rounded-2xl border bg-gradient-to-br p-4 md:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
                      colorClasses[stat.color as keyof typeof colorClasses]
                    )}
                    role="listitem"
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center mb-3",
                      iconColorClasses[stat.color as keyof typeof iconColorClasses]
                    )}>
                      <stat.icon className="h-4 w-4" aria-hidden="true" />
                    </div>

                    {/* Value */}
                    <div className="text-2xl md:text-3xl font-bold tabular-nums mb-1">
                      <AnimatedCounter value={stat.value} />
                    </div>

                    {/* Labels */}
                    <p className="text-sm font-medium">{stat.label}</p>
                    <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
                  </div>
                );
              })}
            </div>

            {/* Footnote */}
            <p className="text-xs text-muted-foreground text-center mt-6 max-w-2xl mx-auto">
              *Based on typical use cases with content-defined chunking. Actual results vary by content type and edit patterns.
            </p>
          </div>
        </section>

        {/* Quick Install */}
        <section className="container py-16" aria-labelledby="install-heading">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-8">
              <h2 id="install-heading" className="text-2xl font-bold mb-2">Install in Seconds</h2>
              <p className="text-muted-foreground">Choose your preferred package manager</p>
            </div>

            <div className="rounded-xl border bg-zinc-950 overflow-hidden">
              {/* AGENTS.md: Tab-like interface with proper keyboard navigation */}
              <div className="flex border-b border-zinc-800" role="tablist" aria-label="Installation methods">
                {(Object.keys(installCommands) as Array<keyof typeof installCommands>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveInstall(key)}
                    role="tab"
                    aria-selected={activeInstall === key}
                    aria-controls={`install-panel-${key}`}
                    id={`install-tab-${key}`}
                    className={cn(
                      // AGENTS.md: Visible focus rings, adequate touch target
                      "flex-1 px-4 py-3 text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                      activeInstall === key
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                    )}
                    type="button"
                  >
                    {key}
                  </button>
                ))}
              </div>
              <div
                className="p-4 flex items-center justify-between"
                role="tabpanel"
                id={`install-panel-${activeInstall}`}
                aria-labelledby={`install-tab-${activeInstall}`}
              >
                <code className="text-zinc-100 font-mono text-sm">
                  <span className="text-green-400" aria-hidden="true">$</span> {installCommands[activeInstall]}
                </code>
                <CopyButton text={installCommands[activeInstall]} />
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Then run <code className="bg-muted px-1.5 py-0.5 rounded font-mono">dits init</code> in any directory to get started
            </p>
          </div>
        </section>

        {/* Code Demo */}
        <section className="border-y bg-muted/30">
          <div className="container py-20">
            <div className="mx-auto max-w-5xl">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <Badge className="mb-4">Familiar Workflow</Badge>
                  <h2 className="text-3xl font-bold tracking-tight mb-4">
                    If You Know Git,{" "}
                    <span className="text-primary">You Know Dits</span>
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Same commands, same workflow. Just optimized for files that
                    Git can&apos;t handle. No new mental models to learn.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "init, add, commit, push, pull - all the commands you expect",
                      "Branch and merge workflows work exactly like Git",
                      "Status shows file changes and deduplication stats",
                      "Log shows full history with storage savings",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-zinc-950 p-1 shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-zinc-500 text-xs ml-2">Terminal</span>
                  </div>
                  <div className="p-4 font-mono text-sm space-y-3 text-zinc-100">
                    <div>
                      <span className="text-green-400">$</span> dits init
                    </div>
                    <div className="text-zinc-500">
                      Initialized empty Dits repository in /project/.dits
                    </div>
                    <div className="pt-2">
                      <span className="text-zinc-400 text-xs"># Adding raw footage + two edits from same source</span>
                    </div>
                    <div>
                      <span className="text-green-400">$</span> dits add footage/
                    </div>
                    <div className="text-zinc-500">
                      Adding 3 files (2.4 GB)...
                      <br />
                      <span className="text-zinc-600">  raw_interview.mov (800 MB)</span>
                      <br />
                      <span className="text-zinc-600">  edit_v1.mov (800 MB) — shares 70% with raw</span>
                      <br />
                      <span className="text-zinc-600">  edit_v2.mov (800 MB) — shares 85% with v1</span>
                      <br />
                      Chunking: 2,400 chunks created (~10s)
                      <br />
                      Dedup: 600 duplicates found → 1,800 unique chunks
                    </div>
                    <div className="pt-2">
                      <span className="text-green-400">$</span> dits commit -m &quot;Add raw footage&quot;
                    </div>
                    <div className="text-zinc-500">
                      [main abc1234] Add raw footage
                      <br />
                      <span className="text-green-400">3 files, 2.4 GB logical → 840 MB stored (65% saved)</span>
                      <br />
                      <span className="text-zinc-600 text-xs">↳ Savings from shared content between edits</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-green-400">$</span> dits push origin main
                    </div>
                    <div className="text-zinc-500">
                      Uploading 840 MB to origin...
                      <br />
                      <span className="text-green-400">Done in 4s (200+ MB/s)</span>
                    </div>
                    <div className="pt-4">
                      <span className="text-green-400">$</span> dits p2p share --name "Project V1"
                    </div>
                    <div className="text-zinc-500">
                      <span className="flex items-center gap-2"><Rocket className="h-4 w-4" /> P2P repository share active!</span>
                      <br />
                      <span className="flex items-center gap-2"><Clipboard className="h-4 w-4" /> Join code: <span className="text-green-400">ABC-123</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Diagram */}
        <section className="py-20" aria-labelledby="how-it-works-heading">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              {/* Header */}
              <div className="text-center mb-12">
                <Badge className="mb-4">How It Works</Badge>
                <h2 id="how-it-works-heading" className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                  Store Less, Keep Everything
                </h2>
                <p className="text-lg text-muted-foreground">
                  Dits splits files into pieces, stores each piece once, and rebuilds them when needed
                </p>
              </div>

              {/* Simple 3-step visual */}
              <div className="rounded-2xl border bg-card overflow-hidden">
                {/* The main diagram */}
                <div className="p-8 md:p-12">
                  {/* Step 1: The file becomes pieces */}
                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 mb-12">
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center">
                        <Film className="h-8 w-8 text-primary" aria-hidden="true" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">Your Video</p>
                        <p className="text-sm text-muted-foreground">2.4 GB file</p>
                      </div>
                    </div>

                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 rotate-90 md:rotate-0" aria-hidden="true" />

                    <div className="flex items-center gap-2">
                      {["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"].map((color, i) => (
                        <div key={i} className={cn("w-10 h-10 md:w-12 md:h-12 rounded-lg", color)} />
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">...</span>
                    </div>

                    <div className="text-center md:text-left">
                      <p className="font-semibold">2,400 Chunks</p>
                      <p className="text-sm text-muted-foreground">~1MB each</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t my-8" />

                  {/* Step 2: Deduplication visual */}
                  <div className="mb-8">
                    <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
                      Each chunk gets a unique fingerprint. Identical chunks are stored only once.
                    </p>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Before: showing duplicates */}
                      <div className="rounded-xl bg-muted/50 p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-3">All chunks (with duplicates)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-blue-500",
                            "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-blue-500",
                            "bg-violet-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500",
                          ].map((color, i) => (
                            <div key={i} className={cn("w-6 h-6 rounded", color, i === 3 || i === 5 || i === 7 || i === 10 ? "opacity-40" : "")} />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">12 chunks total</p>
                      </div>

                      {/* After: unique only */}
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3">Unique chunks stored</p>
                        <div className="flex flex-wrap gap-1.5">
                          {["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"].map((color, i) => (
                            <div key={i} className={cn("w-6 h-6 rounded", color)} />
                          ))}
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3">5 chunks stored (58% saved)</p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t my-8" />

                  {/* Step 3: Reconstruction */}
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground mb-4">
                      When you need the file, chunks reassemble instantly
                    </p>
                    <div className="inline-flex items-center gap-3 bg-muted/50 rounded-xl px-6 py-4">
                      <div className="flex items-center gap-1">
                        {["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"].map((color, i) => (
                          <div key={i} className={cn("w-4 h-8 first:rounded-l-md last:rounded-r-md", color)} />
                        ))}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <div className="flex items-center gap-2">
                        <Film className="h-5 w-5 text-primary" aria-hidden="true" />
                        <span className="font-medium">video.mp4</span>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Byte-perfect reconstruction, verified by BLAKE3 hash
                    </p>
                  </div>
                </div>

                {/* Bottom summary bar */}
                <div className="bg-muted/50 border-t px-8 py-6">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-12">
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">2.4 GB</p>
                      <p className="text-xs text-muted-foreground">Original file</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90 sm:rotate-0" aria-hidden="true" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-500 tabular-nums">840 MB</p>
                      <p className="text-xs text-muted-foreground">Actually stored</p>
                    </div>
                    <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                      65% space saved*
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3">*Savings vary by content. Based on typical video with shared segments.</p>
                </div>
              </div>

              {/* Why this matters */}
              <div className="mt-8 grid md:grid-cols-3 gap-4">
                {[
                  {
                    title: "Edit once, save once",
                    description: "Change 10 seconds of a video? Only those chunks are new. The rest stays deduplicated.",
                  },
                  {
                    title: "Same footage = same chunks",
                    description: "Using the same B-roll across projects? It's stored once, referenced everywhere.",
                  },
                  {
                    title: "Fetch only what you need",
                    description: "Mount a repo and scrub through footage. Chunks stream on-demand, no full download.",
                  },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl border bg-card p-5">
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>

              {/* Bandwidth & Sync Benefits */}
              <div className="mt-16">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold tracking-tight mb-2">
                    Stop Re-uploading the Same Files
                  </h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Traditional file sharing means uploading entire files every time.
                    Dits only transfers what&apos;s actually changed.
                  </p>
                </div>

                {/* The Problem vs Solution */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Traditional Way */}
                  <div className="rounded-2xl border bg-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <X className="h-5 w-5 text-red-500" />
                      </div>
                      <h4 className="font-semibold">Traditional Cloud Storage</h4>
                    </div>

                    <div className="space-y-4 text-sm">
                      {/* Upload cycle visualization */}
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-xs text-muted-foreground mb-3">Editing a 10GB project over a week:</p>
                        <div className="space-y-2">
                          {[
                            { day: "Mon", action: "Upload v1", size: "10 GB", first: true },
                            { day: "Tue", action: "Small edit, re-upload", size: "10 GB" },
                            { day: "Wed", action: "Color grade, re-upload", size: "10 GB" },
                            { day: "Thu", action: "Add music, re-upload", size: "10 GB" },
                            { day: "Fri", action: "Final export, re-upload", size: "10 GB" },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground w-8">{item.day}</span>
                              <span className="flex-1 truncate">{item.action}</span>
                              <span className={cn("tabular-nums", item.first ? "text-muted-foreground" : "text-red-500")}>{item.size}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Total bandwidth used:</span>
                          <span className="font-bold text-red-500">50 GB</span>
                        </div>
                      </div>

                      <p className="text-muted-foreground">
                        Every save = full re-upload. Same file uploaded to 5 team members = 5× the bandwidth.
                      </p>
                    </div>
                  </div>

                  {/* Dits Way */}
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                      </div>
                      <h4 className="font-semibold">With Dits</h4>
                    </div>

                    <div className="space-y-4 text-sm">
                      {/* Upload cycle visualization */}
                      <div className="rounded-lg bg-background/50 p-4">
                        <p className="text-xs text-muted-foreground mb-3">Same project, same week:</p>
                        <div className="space-y-2">
                          {[
                            { day: "Mon", action: "Upload v1", size: "10 GB", first: true },
                            { day: "Tue", action: "Small edit", size: "45 MB" },
                            { day: "Wed", action: "Color grade", size: "120 MB" },
                            { day: "Thu", action: "Add music", size: "80 MB" },
                            { day: "Fri", action: "Final export", size: "200 MB" },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground w-8">{item.day}</span>
                              <span className="flex-1 truncate">{item.action}</span>
                              <span className={cn("tabular-nums", item.first ? "text-muted-foreground" : "text-emerald-500")}>{item.size}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Total bandwidth used:</span>
                          <span className="font-bold text-emerald-500">10.4 GB</span>
                        </div>
                      </div>

                      <p className="text-muted-foreground">
                        Only changed chunks transfer. Team members fetch only what they don&apos;t already have.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Team sync visualization */}
                <div className="mt-6 rounded-2xl border bg-card p-6">
                  <h4 className="font-semibold mb-4 text-center">Team Collaboration: Everyone Has the Same Chunks</h4>

                  <div className="grid md:grid-cols-3 gap-6 items-center">
                    {/* Team members */}
                    <div className="space-y-3">
                      {[
                        { name: "Alice", role: "Editor", has: "100%" },
                        { name: "Bob", role: "Colorist", has: "100%" },
                        { name: "Carol", role: "Sound", has: "85%" },
                      ].map((person, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {person.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{person.name}</p>
                            <p className="text-xs text-muted-foreground">{person.role}</p>
                          </div>
                          <span className="text-xs text-emerald-500 tabular-nums">{person.has}</span>
                        </div>
                      ))}
                    </div>

                    {/* Central storage */}
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-2">
                        <Database className="h-8 w-8 text-primary" aria-hidden="true" />
                      </div>
                      <p className="text-sm font-medium">Shared Storage</p>
                      <p className="text-xs text-muted-foreground">1,892 unique chunks</p>
                    </div>

                    {/* The benefit */}
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-sm font-medium mb-2">When Bob pulls Alice&apos;s changes:</p>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Chunks Bob already has:</span>
                          <span className="text-foreground tabular-nums">1,847</span>
                        </div>
                        <div className="flex justify-between">
                          <span>New chunks to download:</span>
                          <span className="text-emerald-500 tabular-nums">45</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t mt-2">
                          <span>Transfer size:</span>
                          <span className="font-semibold text-emerald-500">~45 MB</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Not 10 GB. Just 45 MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom stats */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { value: "99%+", label: "Delta sync ratio", sub: "typical for small edits" },
                    { value: "1×", label: "Storage per chunk", sub: "shared across all users" },
                    { value: "<10ms", label: "First-byte latency", sub: "local/cached data" },
                    { value: "∞", label: "Version history", sub: "no duplicate storage" },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-xl border bg-card p-4 text-center">
                      <p className="text-2xl font-bold tabular-nums text-primary">{stat.value}</p>
                      <p className="text-xs font-medium">{stat.label}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* P2P Sharing Section */}
        <section className="border-y bg-muted/30">
          <div className="container py-20">
            <div className="mx-auto max-w-5xl">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <Badge className="mb-4">P2P Sharing</Badge>
                  <h2 className="text-3xl font-bold tracking-tight mb-4">
                    Share Directly, No Cloud Required
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Stop uploading your 50GB projects to the cloud just to share with a colleague.
                    Dits shares repositories directly between computers using peer-to-peer connections.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Share any repository with a simple join code",
                      "End-to-end encrypted P2P transfers",
                      "Works through firewalls and NATs",
                      "No file size limits or bandwidth caps",
                      "Direct computer-to-computer sharing",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-zinc-950 p-1 shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-zinc-500 text-xs ml-2">Terminal</span>
                  </div>
                  <div className="p-4 font-mono text-sm space-y-3 text-zinc-100">
                    <div>
                      <span className="text-green-400">$</span> dits p2p share ./my-project
                    </div>
                    <div className="text-zinc-500">
                      <span className="flex items-center gap-2"><Rocket className="h-4 w-4" /> P2P repository share active!</span>
                      <br />
                      <span className="flex items-center gap-2"><Clipboard className="h-4 w-4" /> Join code: <span className="text-green-400">7KJM-XBCD</span></span>
                      <br />
                      <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> Listening on 0.0.0.0:4433</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-zinc-500"># On another computer:</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-green-400">$</span> dits p2p connect 7KJM-XBCD ./shared-project
                    </div>
                    <div className="text-zinc-500">
                      <span className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Connecting to P2P repository...</span>
                      <br />
                      <span className="flex items-center gap-2"><Folder className="h-4 w-4" /> Repository mounted at: ./shared-project</span>
                      <br />
                      <span className="text-green-400 flex items-center gap-2"><Check className="h-4 w-4" /> Connected successfully!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container py-20" aria-labelledby="features-heading">
          <div className="mx-auto max-w-[1000px]">
            <div className="text-center mb-12">
              <Badge className="mb-4">Features</Badge>
              <h2 id="features-heading" className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Built for Large Files
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Every feature designed with video production and large binary
                files in mind
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="list">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="group relative overflow-hidden border-2 transition-colors hover:border-primary/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                  role="listitem"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        {/* AGENTS.md: Decorative icons are aria-hidden */}
                        <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {feature.highlight}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section - Data Backed */}
        <section className="border-y bg-muted/30" aria-labelledby="comparison-heading">
          <div className="container py-20">
            <div className="mx-auto max-w-6xl">
              <div className="text-center mb-12">
                <Badge className="mb-4">Comparison</Badge>
                <h2 id="comparison-heading" className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                  How Dits Stacks Up
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Real numbers from real benchmarks. See how Dits compares to the tools you might be using today.
                </p>
              </div>

              {/* Performance Benchmarks */}
              <div className="mb-12">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" aria-hidden="true" />
                  Performance Benchmarks
                </h3>
                <div className="rounded-xl border overflow-hidden bg-background">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Performance comparison">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th scope="col" className="text-left p-4 font-semibold">Metric</th>
                          <th scope="col" className="p-4 font-semibold text-center bg-primary/5">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold" aria-hidden="true">D</div>
                              Dits
                            </div>
                          </th>
                          <th scope="col" className="p-4 font-semibold text-center">Git LFS</th>
                          <th scope="col" className="p-4 font-semibold text-center">Perforce</th>
                          <th scope="col" className="p-4 font-semibold text-center">Dropbox</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            metric: "Hash speed (1GB file)",
                            dits: { value: "~330ms", note: "BLAKE3 (3GB/s)", best: true },
                            lfs: { value: "~600ms", note: "SHA-256" },
                            perforce: { value: "~500ms", note: "MD5" },
                            dropbox: { value: "N/A", note: "—" },
                          },
                          {
                            metric: "Chunking throughput",
                            dits: { value: "2 GB/s", note: "FastCDC", best: true },
                            lfs: { value: "N/A", note: "Full file" },
                            perforce: { value: "~200 MB/s", note: "Delta" },
                            dropbox: { value: "~300 MB/s", note: "Block sync" },
                          },
                          {
                            metric: "Incremental sync (small edit)",
                            dits: { value: "~45 MB", note: "Changed chunks", best: true },
                            lfs: { value: "10 GB", note: "Full file" },
                            perforce: { value: "~100 MB", note: "Delta" },
                            dropbox: { value: "~50 MB", note: "Block sync" },
                          },
                          {
                            metric: "Upload speed (reported)",
                            dits: { value: "Wire speed", note: "QUIC" },
                            lfs: { value: "1-25 MB/s", note: "HTTP", issues: true },
                            perforce: { value: "50-100 MB/s", note: "TCP" },
                            dropbox: { value: "Variable", note: "Throttled" },
                          },
                          {
                            metric: "Clone 10GB repo",
                            dits: { value: "<2 min", note: "Sparse + VFS", best: true },
                            lfs: { value: "30+ min", note: "Full download" },
                            perforce: { value: "~5 min", note: "Proxy cache" },
                            dropbox: { value: "~10 min", note: "Smart Sync" },
                          },
                        ].map((row, i) => (
                          <tr key={row.metric} className={cn("border-b last:border-0", i % 2 === 0 ? "bg-background" : "bg-muted/30")}>
                            <th scope="row" className="p-4 font-medium text-left">{row.metric}</th>
                            <td className={cn("p-4 text-center", row.dits.best && "bg-primary/5")}>
                              <span className={cn("font-semibold tabular-nums", row.dits.best && "text-emerald-600 dark:text-emerald-400")}>{row.dits.value}</span>
                              <span className="block text-xs text-muted-foreground">{row.dits.note}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={cn("tabular-nums", row.lfs.issues && "text-red-500")}>{row.lfs.value}</span>
                              <span className="block text-xs text-muted-foreground">{row.lfs.note}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="tabular-nums">{row.perforce.value}</span>
                              <span className="block text-xs text-muted-foreground">{row.perforce.note}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="tabular-nums">{row.dropbox.value}</span>
                              <span className="block text-xs text-muted-foreground">{row.dropbox.note}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  * Dits benchmarks from internal testing (see <a href="/docs/architecture" className="underline hover:text-foreground">docs</a>). BLAKE3 benchmarks from official testing. Git LFS speeds from GitHub issues #2328, #4144.
                </p>
              </div>

              {/* Feature Comparison - More comprehensive */}
              <div className="mb-12">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
                  Competitor Landscape
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Version Control Tools */}
                  <div className="rounded-xl border bg-background p-6">
                    <h4 className="font-semibold mb-4">Version Control</h4>
                    <div className="space-y-3">
                      {[
                        { name: "Git + LFS", status: "limited", notes: "Full file re-uploads. 1-25 MB/s speeds. No dedup." },
                        { name: "Perforce Helix", status: "good", notes: "Delta compression. Game industry standard. $740/user/yr" },
                        { name: "Plastic SCM", status: "good", notes: "1TB+ repos. Now Unity Version Control. $45/user/mo" },
                        { name: "SVN", status: "limited", notes: "Better than Git for binaries. Centralized. Declining support." },
                        { name: "Mercurial", status: "limited", notes: "Scales well (Facebook). Less tooling. Niche usage." },
                        { name: "DVC", status: "limited", notes: "ML-focused. File-level only. Struggles >200K files." },
                        { name: "LakeFS", status: "good", notes: "Git for data lakes. S3-native. File-level dedup." },
                        { name: "XetHub", status: "good", notes: "Block-level dedup. 5-8x faster than DVC. Hugging Face." },
                      ].map((tool) => (
                        <div key={tool.name} className="flex items-start gap-3">
                          <div className={cn(
                            "mt-1 w-2 h-2 rounded-full shrink-0",
                            tool.status === "best" ? "bg-emerald-500" : tool.status === "good" ? "bg-yellow-500" : "bg-red-500"
                          )} aria-hidden="true" />
                          <div>
                            <p className={cn("font-medium text-sm", tool.status === "best" && "text-emerald-600 dark:text-emerald-400")}>{tool.name}</p>
                            <p className="text-xs text-muted-foreground">{tool.notes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cloud Storage & Sync */}
                  <div className="rounded-xl border bg-background p-6">
                    <h4 className="font-semibold mb-4">Cloud Storage & Sync</h4>
                    <div className="space-y-3">
                      {[
                        { name: "Dropbox", status: "good", notes: "Block-level sync. 8-16x faster than cloud. 2TB/day limit." },
                        { name: "Google Drive", status: "limited", notes: "No block sync. Full re-upload on changes. 5TB limit." },
                        { name: "OneDrive", status: "limited", notes: "Block sync MS files only. 250GB limit. Unreliable." },
                        { name: "Resilio Sync", status: "good", notes: "P2P, 16x faster than cloud. 10Gbps capable. No versioning." },
                        { name: "Synology Drive", status: "limited", notes: "NAS-native. 500K file limit. Slow with many files." },
                        { name: "rclone", status: "good", notes: "Mount any cloud. VFS caching. No dedup or versioning." },
                        { name: "Wasabi", status: "good", notes: "S3-compatible. 80% cheaper. No egress fees. Storage only." },
                      ].map((tool) => (
                        <div key={tool.name} className="flex items-start gap-3">
                          <div className={cn(
                            "mt-1 w-2 h-2 rounded-full shrink-0",
                            tool.status === "best" ? "bg-emerald-500" : tool.status === "good" ? "bg-yellow-500" : "bg-red-500"
                          )} aria-hidden="true" />
                          <div>
                            <p className={cn("font-medium text-sm", tool.status === "best" && "text-emerald-600 dark:text-emerald-400")}>{tool.name}</p>
                            <p className="text-xs text-muted-foreground">{tool.notes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Media Asset Management */}
                  <div className="rounded-xl border bg-background p-6">
                    <h4 className="font-semibold mb-4">Media & Video Tools</h4>
                    <div className="space-y-3">
                      {[
                        { name: "Frame.io", status: "good", notes: "5x faster uploads. Review-focused. No local VCS. Adobe-owned." },
                        { name: "LucidLink", status: "good", notes: "Streaming file access. Great latency. No version control. $$$" },
                        { name: "Iconik", status: "good", notes: "MAM with AI tagging. Multi-cloud. Review tools. No dedup." },
                        { name: "MediaSilo", status: "good", notes: "Video collaboration. Frame-accurate review. Enterprise. $$$" },
                        { name: "Bynder", status: "good", notes: "DAM leader. Version control. No chunk-level dedup. $$$" },
                        { name: "Canto", status: "good", notes: "User-friendly DAM. AI tagging. Limited versioning." },
                        { name: "Anchorpoint", status: "good", notes: "Git LFS GUI for games. Sparse checkout. Still LFS limits." },
                      ].map((tool) => (
                        <div key={tool.name} className="flex items-start gap-3">
                          <div className={cn(
                            "mt-1 w-2 h-2 rounded-full shrink-0",
                            tool.status === "best" ? "bg-emerald-500" : tool.status === "good" ? "bg-yellow-500" : "bg-red-500"
                          )} aria-hidden="true" />
                          <div>
                            <p className={cn("font-medium text-sm", tool.status === "best" && "text-emerald-600 dark:text-emerald-400")}>{tool.name}</p>
                            <p className="text-xs text-muted-foreground">{tool.notes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dits summary card */}
                <div className="mt-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">Dits</p>
                      <p className="text-sm text-muted-foreground">
                        Content-defined chunking (FastCDC at 2GB/s). BLAKE3 hashing at 3+ GB/s per core. Video-aware splitting at keyframes.
                        Cross-file deduplication. VFS streaming. Git-compatible workflow. QUIC transport. Self-hostable.
                        <span className="font-medium text-foreground"> Free &amp; open source.</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Feature Matrix */}
              <div>
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" aria-hidden="true" />
                  Detailed Feature Matrix
                </h3>
                <div className="rounded-xl border overflow-hidden bg-background">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Detailed feature comparison">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th scope="col" className="text-left p-3 font-semibold min-w-[180px]">Feature</th>
                          <th scope="col" className="p-3 font-semibold text-center bg-primary/5 min-w-[70px]">Dits</th>
                          <th scope="col" className="p-3 font-semibold text-center min-w-[70px]">Git LFS</th>
                          <th scope="col" className="p-3 font-semibold text-center min-w-[70px]">Perforce</th>
                          <th scope="col" className="p-3 font-semibold text-center min-w-[70px]">XetHub</th>
                          <th scope="col" className="p-3 font-semibold text-center min-w-[70px]">Resilio</th>
                          <th scope="col" className="p-3 font-semibold text-center min-w-[70px]">Dropbox</th>
                          <th scope="col" className="p-3 font-semibold text-center min-w-[70px]">LucidLink</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { feature: "Content-defined chunking", dits: true, lfs: false, perforce: false, xethub: true, resilio: false, dropbox: "partial", lucidlink: true },
                          { feature: "Cross-file deduplication", dits: true, lfs: false, perforce: false, xethub: true, resilio: false, dropbox: false, lucidlink: false },
                          { feature: "Video-aware chunking", dits: true, lfs: false, perforce: false, xethub: false, resilio: false, dropbox: false, lucidlink: false },
                          { feature: "Delta/incremental sync", dits: true, lfs: false, perforce: true, xethub: true, resilio: true, dropbox: true, lucidlink: true },
                          { feature: "Virtual filesystem (VFS)", dits: true, lfs: false, perforce: false, xethub: false, resilio: false, dropbox: "partial", lucidlink: true },
                          { feature: "Streaming playback", dits: true, lfs: false, perforce: false, xethub: false, resilio: false, dropbox: false, lucidlink: true },
                          { feature: "Git-compatible workflow", dits: true, lfs: true, perforce: false, xethub: true, resilio: false, dropbox: false, lucidlink: false },
                          { feature: "Branching & merging", dits: true, lfs: true, perforce: true, xethub: true, resilio: false, dropbox: false, lucidlink: false },
                          { feature: "File locking", dits: "planned", lfs: true, perforce: true, xethub: false, resilio: false, dropbox: false, lucidlink: false },
                          { feature: "P2P transfer", dits: true, lfs: false, perforce: false, xethub: false, resilio: true, dropbox: false, lucidlink: false },
                          { feature: "Works offline", dits: true, lfs: "partial", perforce: false, xethub: "partial", resilio: true, dropbox: "partial", lucidlink: "partial" },
                          { feature: "Self-hostable", dits: true, lfs: true, perforce: true, xethub: false, resilio: true, dropbox: false, lucidlink: false },
                          { feature: "Free & open source", dits: true, lfs: true, perforce: false, xethub: false, resilio: false, dropbox: false, lucidlink: false },
                        ].map((row, i) => (
                          <tr key={row.feature} className={cn("border-b last:border-0", i % 2 === 0 ? "bg-background" : "bg-muted/30")}>
                            <th scope="row" className="p-3 font-medium text-left">{row.feature}</th>
                            {["dits", "lfs", "perforce", "xethub", "resilio", "dropbox", "lucidlink"].map((key) => {
                              const val = row[key as keyof typeof row];
                              return (
                                <td key={key} className={cn("p-3 text-center", key === "dits" && "bg-primary/5")}>
                                  {val === true ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" aria-hidden="true" />
                                  ) : val === false ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    <span className="text-xs text-yellow-600 dark:text-yellow-400">{val}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom note */}
              <div className="mt-8 rounded-xl bg-muted/50 border p-6">
                <h4 className="font-semibold mb-2">Why these numbers matter</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Git LFS users consistently report upload speeds of 1-25 MB/s even on fast connections due to HTTP overhead.
                  Perforce excels at scale but costs $740/user/year. XetHub (now Hugging Face) pioneered block-level dedup for ML.
                  Cloud storage lacks version control semantics. LucidLink streams well but has no versioning.
                  Dits combines the best: Git workflow + content-defined chunking + cross-file dedup + VFS streaming + video-aware splitting.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="font-medium">Sources:</span>
                  <a href="https://github.com/git-lfs/git-lfs/issues/2328" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Git LFS Issues</a>
                  <a href="https://www.usenix.org/conference/atc16/technical-sessions/presentation/xia" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">FastCDC Paper (USENIX)</a>
                  <a href="https://github.com/BLAKE3-team/BLAKE3" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">BLAKE3</a>
                  <a href="https://xethub.com/blog/benchmarking-xethub-vs-dvc-lfs-lakefs" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">XetHub Benchmarks</a>
                  <a href="https://www.resilio.com/blog/sync-speed-test-over-16-times-faster-than-the-cloud" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Resilio Speed Test</a>
                  <a href="https://www.cloudwards.net/dropbox-vs-google-drive-vs-onedrive/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Cloud Comparison</a>
                  <a href="https://www.perforce.com/products/helix-core" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Perforce</a>
                  <a href="https://www.lucidlink.com/blog/real-time-video-editing" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">LucidLink</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="container py-20" aria-labelledby="usecases-heading">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <Badge className="mb-4">Use Cases</Badge>
              <h2 id="usecases-heading" className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Built for Creators
              </h2>
              <p className="text-lg text-muted-foreground">
                From solo editors to large studios
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3" role="list">
              {useCases.map((useCase) => (
                <Card key={useCase.title} className="text-center" role="listitem">
                  <CardHeader>
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      {/* AGENTS.md: Decorative icons are aria-hidden */}
                      <useCase.icon className="h-8 w-8 text-primary" aria-hidden="true" />
                    </div>
                    <CardTitle>{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base mb-4">
                      {useCase.description}
                    </CardDescription>
                    <Badge variant="outline">{useCase.users}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Development Progress - Modern Roadmap */}
        <section className="border-y bg-gradient-to-b from-background via-muted/30 to-background" aria-labelledby="roadmap-heading">
          <div className="container py-24">
            <div className="mx-auto max-w-6xl">
              {/* Header */}
              <div className="text-center mb-16">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Roadmap</Badge>
                <h2 id="roadmap-heading" className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
                  Building the Future of
                  <span className="block bg-gradient-to-r from-primary via-emerald-500 to-primary bg-clip-text text-transparent">
                    Large File Version Control
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Track our progress as we build the most advanced content-addressable storage system for creative professionals.
                </p>
              </div>

              {/* Progress Overview */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Development Progress</span>
                  <span className="text-sm text-muted-foreground">
                    <span className="text-primary font-bold">6</span> of <span className="font-medium">10</span> phases complete
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-emerald-500 to-primary rounded-full transition-all duration-1000 relative"
                    style={{ width: "60%" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent motion-safe:animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Bento Grid Roadmap */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" role="list" aria-label="Development phases">
                {phases.map((phase, i) => (
                  <div
                    key={phase.name}
                    role="listitem"
                    className={cn(
                      "group relative rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.02] cursor-default",
                      phase.status === "complete"
                        ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                        : phase.status === "active"
                          ? "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
                          : "bg-gradient-to-br from-muted/50 to-transparent border-border/50 hover:border-border"
                    )}
                    tabIndex={0}
                    aria-label={`Phase ${i + 1}: ${phase.name} - ${phase.description} (${phase.status})`}
                  >
                    {/* Status indicator */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        phase.status === "complete"
                          ? "bg-primary/20 text-primary"
                          : phase.status === "active"
                            ? "bg-emerald-500/20 text-emerald-500"
                            : "bg-muted text-muted-foreground"
                      )}>
                        {phase.status === "complete" ? "Complete" : phase.status === "active" ? "In Progress" : "Planned"}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Icon/Status */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors",
                      phase.status === "complete"
                        ? "bg-primary text-primary-foreground"
                        : phase.status === "active"
                          ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {phase.status === "complete" ? (
                        <Check className="h-5 w-5" aria-hidden="true" />
                      ) : phase.status === "active" ? (
                        <div className="relative">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full motion-safe:animate-ping absolute" />
                          <div className="w-3 h-3 bg-emerald-500 rounded-full relative" />
                        </div>
                      ) : (
                        <span className="text-sm font-bold" aria-hidden="true">{i + 1}</span>
                      )}
                    </div>

                    {/* Content */}
                    <h3 className={cn(
                      "font-semibold mb-1",
                      phase.status === "complete" || phase.status === "active" ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {phase.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {phase.description}
                    </p>

                    {/* Active phase glow effect */}
                    {phase.status === "active" && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 motion-safe:animate-pulse pointer-events-none" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom CTA */}
              <div className="mt-16 text-center">
                <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl border bg-card/50 backdrop-blur-sm">
                  <div className="text-left">
                    <p className="font-semibold">Want to contribute or follow along?</p>
                    <p className="text-sm text-muted-foreground">Join our open-source community on GitHub</p>
                  </div>
                  <Button asChild className="gap-2">
                    <Link
                      href="https://github.com/byronwade/dits"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Follow Dits development on GitHub (opens in new tab)"
                    >
                      <Github className="h-4 w-4" aria-hidden="true" />
                      View on GitHub
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden" aria-labelledby="cta-heading">
          {/* Decorative background */}
          <div className="absolute inset-0 bg-primary" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" aria-hidden="true" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" aria-hidden="true" />

          <div className="container relative py-24">
            <div className="mx-auto max-w-3xl text-center text-primary-foreground">
              <h2 id="cta-heading" className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">
                Ready to Take Control?
              </h2>
              <p className="text-xl text-primary-foreground/80 mb-8">
                Start versioning your large files today.
                Free, open source, and built for your workflow.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" variant="secondary" className="h-12 px-8" asChild>
                  <Link href="/download">
                    <Download className="mr-2 h-5 w-5" aria-hidden="true" />
                    Download Dits
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link
                    href="https://github.com/byronwade/dits"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Star Dits on GitHub (opens in new tab)"
                  >
                    <Github className="mr-2 h-5 w-5" aria-hidden="true" />
                    Star on GitHub
                  </Link>
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
