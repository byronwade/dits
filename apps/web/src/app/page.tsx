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
  CodeXml,
  Rocket,
  Clipboard,
  Globe,
  Link as LinkIcon,
  Folder,
  ChevronDown,
  Play,
  Box,
  Gamepad2,
  Camera,
  Lock,
  Cpu,
  Wifi,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { BenchmarksHighlights } from "@/components/benchmarks-highlights";

// ============================================================================
// DATA
// ============================================================================

const installCommands = {
  npm: "npm install -g @byronwade/dits",
  curl: "curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh",
  brew: "brew tap byronwade/dits && brew install dits",
  cargo: "cargo install dits",
};

const faqs = [
  {
    question: "Why is this needed? Why not just use Git, Dropbox, or a NAS?",
    answer:
      "Those tools store a whole new copy every time a file changes. Change five seconds of a 4GB video and you've got another 4GB sitting on disk and going over the wire—with no real history and no way to see what changed. Git solved this for code 20 years ago by only storing the difference; it just never worked for big binary media. Dits brings that same idea to video and photos: edit a file and it stores only what changed, with a full version history.",
  },
  {
    question: "How does Dits compare to Git LFS?",
    answer:
      "Git LFS stores each file version as a complete copy. If you have 5 versions of a 10GB video, that's 50GB. Dits uses content-defined chunking and frame-level addressing—it only stores the changed pieces, so those same 5 versions need far less. (LFS also re-uploads the whole file on every change; Dits's content-addressed store is built so sync only moves the changed pieces—that networked sync engine is still in development.)",
  },
  {
    question: "What file types does Dits support?",
    answer:
      "Dits works with any file type. It's especially optimized for video (MP4, MOV, MXF), 3D assets (FBX, OBJ, Blender), game projects (Unity, Unreal), and creative tools (PSD, Premiere projects). For video files, Dits can align chunk boundaries to keyframes for even better deduplication.",
  },
  {
    question: "Is it really free and open source?",
    answer:
      "Yes. Dits is 100% open source under the MIT license. There are no usage limits, no file size caps, no account required. You can self-host everything on your own infrastructure.",
  },
  {
    question: "How do I migrate from existing tools?",
    answer:
      "Run 'dits init' in your project, then 'dits add .' to add all files. If you're coming from Git LFS, you can keep both—Dits works alongside your existing Git repository.",
  },
  {
    question: "Does it work offline?",
    answer:
      "Yes. All local operations work completely offline. Syncing only happens when you explicitly push or pull.",
  },
];

const phases = [
  { name: "Engine", status: "complete" },
  { name: "Atom Exploder", status: "complete" },
  { name: "VFS", status: "complete" },
  { name: "Git Parity", status: "complete" },
  { name: "Frame Engine (FACR)", status: "active" },
  { name: "Locking", status: "active" },
  { name: "Network Sync", status: "planned" },
  { name: "P2P Sharing", status: "planned" },
  { name: "Hologram", status: "planned" },
  { name: "Deep Freeze", status: "planned" },
];

// ============================================================================
// COMPONENTS
// ============================================================================

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
      className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      type="button"
    >
      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function Home() {
  const [activeInstall, setActiveInstall] = useState<keyof typeof installCommands>("npm");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main id="main-content" className="flex-1 pt-[104px]">
        {/* ================================================================ */}
        {/* HERO - Clean, minimal, visitors.now inspired */}
        {/* ================================================================ */}
        <section className="relative pt-20 pb-24 md:pt-32 md:pb-32">
          {/* Very subtle background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-transparent" />
          </div>

          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              {/* "An alternative to" badge */}
              <div className="mb-8">
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  An alternative to
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border text-foreground font-medium text-xs">
                    <HardDrive className="h-3 w-3" />
                    Git LFS
                  </span>
                </span>
              </div>

              {/* Main headline - clean, bold */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
                Git for{" "}
                <span className="text-primary">video and photos</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10">
                Git changed how the world ships code. Dits does the same for the files Git
                can&apos;t handle&mdash;video, RAW photos, and huge creative projects. Edit a 4&nbsp;GB
                file and store only what changed, not another copy.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
                <Button size="lg" render={<Link href="/docs/getting-started" />}>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" render={<Link href="/docs" />}>
                  Documentation
                </Button>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  Free & Open Source
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  No account required
                </span>
                <span className="flex items-center gap-1.5">
                  <CodeXml className="h-3.5 w-3.5" />
                  MIT Licensed
                </span>
              </div>

              <BenchmarksHighlights />
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* WHY DOES THIS EXIST - the one-screen answer */}
        {/* ================================================================ */}
        <section className="py-24 md:py-32 border-t bg-muted/30">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-14">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                  Why does this exist?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Because version control never got solved for the big stuff. Here&apos;s the whole
                  story in three steps.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* The problem */}
                <div className="rounded-2xl bg-card border p-6">
                  <div className="text-sm font-semibold text-red-500 mb-3">The problem</div>
                  <div className="font-mono text-sm text-muted-foreground space-y-1 mb-4">
                    <div>final.mp4</div>
                    <div>final_v2.mp4</div>
                    <div>final_FINAL.mp4</div>
                    <div className="text-foreground">final_FINAL_real.mp4</div>
                  </div>
                  <p className="text-muted-foreground">
                    Every change is a new multi-gigabyte copy. You re-upload the whole file to
                    change five seconds. No history, no diff, no idea what shipped.
                  </p>
                </div>

                {/* Why Git can't help */}
                <div className="rounded-2xl bg-card border p-6">
                  <div className="text-sm font-semibold text-amber-500 mb-3">Why Git can&apos;t help</div>
                  <p className="text-muted-foreground mb-4">
                    Git was built for text. A one-line code edit is tiny&mdash;but a one-second
                    video trim rewrites the entire file.
                  </p>
                  <p className="text-muted-foreground">
                    Git and Git&nbsp;LFS just store another full copy every time. They were never
                    designed for gigabytes of binary media.
                  </p>
                </div>

                {/* What Dits does */}
                <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-6">
                  <div className="text-sm font-semibold text-emerald-500 mb-3">What Dits does</div>
                  <p className="text-muted-foreground mb-4">
                    Real version control for big binary media. Edit a video or photo and Dits
                    stores only the difference&mdash;kilobytes, not gigabytes.
                  </p>
                  <p className="text-muted-foreground">
                    See exactly which frames changed. Keep a full, honest history. No more
                    <span className="font-mono"> _FINAL_v27</span>.
                  </p>
                </div>
              </div>

              {/* The one-liner */}
              <div className="mt-10 rounded-2xl border bg-card p-8 text-center">
                <p className="text-xl md:text-2xl font-medium">
                  &ldquo;Git lets developers version their code and only save what changed.{" "}
                  <span className="text-primary">Dits does that for video and photos.</span>&rdquo;
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  That&apos;s the whole pitch. Everything below is how.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* UNDERSTAND YOUR FILES - visitors.now section pattern */}
        {/* ================================================================ */}
        <section className="py-24 md:py-32 border-t bg-muted/30">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              {/* Section header - visitors.now style */}
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                  Understand your files.
                  <span className="block text-muted-foreground font-normal text-2xl sm:text-3xl mt-2">
                    They&apos;re more than blobs on a hard drive.
                  </span>
                </h2>
              </div>

              {/* Feature card with visual */}
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold mb-4">
                    See exactly what changed
                  </h3>
                  <p className="text-lg text-muted-foreground mb-6">
                    Dits splits files into content-defined chunks. When you edit a 10GB video,
                    only the changed chunks are stored. View diffs, track history, and understand
                    your storage at a glance.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Content-aware chunking at 2+ GB/s",
                      "BLAKE3 integrity verification",
                      "60-80% typical storage reduction",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-emerald-500" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual demo - chunk visualization */}
                <div className="rounded-2xl bg-card border p-6 lg:p-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                      <Film className="h-5 w-5" />
                      <span className="font-mono">project_v3.mp4</span>
                      <Badge variant="secondary" className="ml-auto">10.2 GB</Badge>
                    </div>

                    {/* Chunk visualization */}
                    <div className="grid grid-cols-10 gap-1">
                      {[...Array(40)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-6 rounded-sm transition-colors",
                            i < 35 ? "bg-primary/20" : "bg-emerald-500"
                          )}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm pt-2">
                      <span className="text-muted-foreground">
                        <span className="text-foreground font-medium">35</span> chunks reused
                      </span>
                      <span className="text-emerald-500 font-medium">
                        5 new chunks (512 MB)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* SYNC SMARTER - visitors.now pattern */}
        {/* ================================================================ */}
        <section className="py-24 md:py-32 border-t">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                  Sync smarter.
                  <span className="block text-muted-foreground font-normal text-2xl sm:text-3xl mt-2">
                    Stop re-uploading the same data.
                  </span>
                </h2>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 items-center">
                {/* Terminal demo */}
                <div className="order-2 lg:order-1 rounded-2xl bg-zinc-950 overflow-hidden shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-zinc-500 text-xs ml-2 font-mono">terminal</span>
                  </div>
                  <div className="p-5 font-mono text-sm space-y-2 text-zinc-300">
                    <div><span className="text-emerald-400">$</span> dits push origin main</div>
                    <div className="text-zinc-500 pl-2">
                      Analyzing changes...<br />
                      <span className="text-zinc-400">→ 3 files modified (10.2 GB logical)</span><br />
                      <span className="text-zinc-400">→ 47 new chunks identified</span><br />
                      <span className="text-emerald-400">→ Uploading 512 MB (95% deduplicated)</span><br />
                      <br />
                      <span className="text-emerald-400">✓ Pushed in 4.2s</span>
                    </div>
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <Badge variant="outline" className="mb-4">Sync engine on the roadmap</Badge>
                  <h3 className="text-2xl font-bold mb-4">
                    Delta sync, not full re-upload
                  </h3>
                  <p className="text-lg text-muted-foreground mb-6">
                    Traditional tools re-upload entire files on every change. Because Dits content-
                    addresses every chunk and frame, sync only needs to transfer what&apos;s
                    different&mdash;and a dropped transfer resumes where it left off instead of
                    restarting. (The networked sync engine is in active development; the
                    content-addressed store it builds on works today.)
                  </p>

                  {/* Before/after comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-muted/50 p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Traditional</p>
                      <p className="text-2xl font-bold text-red-500 line-through tabular-nums">10.2 GB</p>
                    </div>
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">With Dits</p>
                      <p className="text-2xl font-bold text-emerald-500 tabular-nums">512 MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* P2P SHARING - visitors.now pattern */}
        {/* ================================================================ */}
        <section className="py-24 md:py-32 border-t bg-muted/30">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                  Share directly.
                  <span className="block text-muted-foreground font-normal text-2xl sm:text-3xl mt-2">
                    No cloud upload required.
                  </span>
                </h2>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge variant="outline" className="mb-4">On the roadmap</Badge>
                  <h3 className="text-2xl font-bold mb-4">
                    Peer-to-peer collaboration
                  </h3>
                  <p className="text-lg text-muted-foreground mb-6">
                    The plan: share repositories directly between computers with a join code&mdash;
                    end-to-end encrypted, no file-size limits. Because frames are content-addressed,
                    transfers will resume where they drop and never re-send footage you both already
                    have. (Networking is in active development&mdash;local workflows work today.)
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Works through firewalls and NATs",
                      "AES-256 encryption",
                      "No bandwidth caps or limits",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Join code visual */}
                <div className="rounded-2xl bg-card border p-8 text-center">
                  <div className="inline-flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
                    <span className="text-sm text-muted-foreground font-medium">Coming soon</span>
                  </div>
                  <div className="text-4xl font-mono font-bold tracking-widest mb-4 text-muted-foreground/50">
                    7KJM-XBCD
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The planned flow: send a join code, your collaborator connects directly
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* INSTALL */}
        {/* ================================================================ */}
        <section className="py-24 md:py-32 border-t">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Get started in seconds
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Install with your preferred package manager
              </p>

              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden text-left shadow-lg">
                <div className="flex border-b border-zinc-700/50" role="tablist">
                  {(Object.keys(installCommands) as Array<keyof typeof installCommands>).map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveInstall(key)}
                      role="tab"
                      aria-selected={activeInstall === key}
                      className={cn(
                        "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                        activeInstall === key
                          ? "bg-zinc-800 text-white border-b-2 border-emerald-500"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                      )}
                      type="button"
                    >
                      {key}
                    </button>
                  ))}
                </div>
                <div className="p-5 flex items-center justify-between bg-zinc-950">
                  <pre className="m-0 p-0 bg-transparent border-0">
                    <code className="text-white font-mono text-sm bg-transparent p-0">
                      <span className="text-emerald-400">$</span> {installCommands[activeInstall]}
                    </code>
                  </pre>
                  <CopyButton text={installCommands[activeInstall]} />
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-6">
                Then run <code className="bg-muted px-2 py-1 rounded font-mono">dits init</code> to start
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* FAQ - visitors.now pattern */}
        {/* ================================================================ */}
        <section className="py-24 md:py-32 border-t bg-muted/30">
          <div className="container">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-12">
                Frequently asked questions
              </h2>

              <Accordion multiple={false} className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-b">
                    <AccordionTrigger className="text-left text-base font-medium py-5 hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* ROADMAP - simplified */}
        {/* ================================================================ */}
        <section className="py-24 md:py-32 border-t">
          <div className="container">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Actively developed
              </h2>
              <p className="text-lg text-muted-foreground mb-10">
                <span className="text-primary font-semibold">4 of 10</span> phases complete &mdash; the
                local engine works today; networked sync is on the roadmap.
              </p>

              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-10 max-w-xl mx-auto">
                <div className="h-full w-[40%] bg-gradient-to-r from-primary to-emerald-500 rounded-full" />
              </div>

              {/* Phase pills */}
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {phases.map((phase) => (
                  <Badge
                    key={phase.name}
                    variant={phase.status === "complete" ? "default" : phase.status === "active" ? "secondary" : "outline"}
                    className={cn(
                      "px-3 py-1",
                      phase.status === "complete" && "bg-primary/10 text-primary border-primary/20",
                      phase.status === "active" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                      phase.status === "planned" && "text-muted-foreground"
                    )}
                  >
                    {phase.status === "complete" && <Check className="h-3 w-3 mr-1" />}
                    {phase.status === "active" && <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />}
                    {phase.name}
                  </Badge>
                ))}
              </div>

              <Button variant="outline" render={<Link href="https://github.com/byronwade/dits" target="_blank" rel="noopener noreferrer" />}>
                <GithubIcon className="mr-2 h-4 w-4" />
                Follow on GitHub
              </Button>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* FINAL CTA - visitors.now style */}
        {/* ================================================================ */}
        <section className="py-24 md:py-32 border-t bg-primary text-primary-foreground">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
                A new era of version control
              </h2>
              <p className="text-xl text-primary-foreground/80 mb-10 max-w-xl mx-auto">
                Start versioning your large files today. Free, open source, and built for creative workflows.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" variant="secondary" className="h-14 px-10 text-lg rounded-xl" render={<Link href="/download" />}>
                  <Download className="mr-2 h-5 w-5" />
                  Download Dits
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-10 text-lg rounded-xl bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  render={<Link href="https://github.com/byronwade/dits" target="_blank" rel="noopener noreferrer" />}
                >
                  <GithubIcon className="mr-2 h-5 w-5" />
                  Star on GitHub
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
