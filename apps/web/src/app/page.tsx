"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  HardDrive,
  Film,
  ArrowRight,
  Check,
  Copy,
  CheckCircle2,
  CodeXml,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-pill";
import type { StatusTone } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";
import { BenchmarksHighlights } from "@/components/benchmarks-highlights";

// ============================================================================
// DATA
// ============================================================================

const installCommands = {
  npm: "npm install -g @byronwade/dits",
  bun: "bun install -g @byronwade/dits",
  pnpm: "pnpm install -g @byronwade/dits",
  curl: "curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh",
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
      "Yes. Dits is free and open source, dual-licensed under Apache-2.0 OR MIT (pick whichever suits you). There are no usage limits, no file size caps, no account required. You can self-host everything on your own infrastructure.",
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

const phases: { name: string; status: "complete" | "active" | "planned" }[] = [
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

const phaseTone: Record<(typeof phases)[number]["status"], StatusTone> = {
  complete: "success",
  active: "warning",
  planned: "neutral",
};

const phaseComplete = phases.filter((p) => p.status === "complete").length;
const phaseActive = phases.filter((p) => p.status === "active").length;
const phasePlanned = phases.filter((p) => p.status === "planned").length;
const phasePct = Math.round((phaseComplete / phases.length) * 100);

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
      className="text-muted-foreground hover:text-foreground"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      type="button"
    >
      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

/** Marketing section header: centered eyebrow-less title with optional gradient subtitle. */
function SectionHeading({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("text-center", className)}>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-2xl font-normal text-muted-foreground sm:text-3xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 text-muted-foreground">
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand/10">
            <Check className="h-3 w-3 text-brand" />
          </div>
          {item}
        </li>
      ))}
    </ul>
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
        {/* HERO */}
        {/* ================================================================ */}
        <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-32">
          {/* Atmospheric background: grid texture + brand glow */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
            <div className="absolute inset-x-0 top-0 h-[480px] glow-brand" />
          </div>

          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              {/* "An alternative to" badge */}
              <div className="mb-8">
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  An alternative to
                  <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                    <HardDrive className="h-3 w-3" />
                    Git LFS
                  </span>
                </span>
              </div>

              {/* Main headline */}
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Git for{" "}
                <span className="text-gradient-brand">video and photos</span>
              </h1>

              {/* Subheadline */}
              <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground md:text-xl">
                Git changed how the world ships code. Dits does the same for the files Git
                can&apos;t handle&mdash;video, RAW photos, and huge creative projects. Edit a 4&nbsp;GB
                file and store only what changed, not another copy.
              </p>

              {/* CTAs */}
              <div className="mb-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
                  <Check className="h-3.5 w-3.5 text-brand" />
                  Free &amp; Open Source
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-brand" />
                  No account required
                </span>
                <span className="flex items-center gap-1.5">
                  <CodeXml className="h-3.5 w-3.5" />
                  Apache-2.0 OR MIT
                </span>
              </div>

              <BenchmarksHighlights />
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* WHY DOES THIS EXIST */}
        {/* ================================================================ */}
        <section className="border-t bg-muted/30 py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <div className="mb-14">
                <SectionHeading title="Why does this exist?" />
                <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
                  Because version control never got solved for the big stuff. Here&apos;s the whole
                  story in three steps.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* The problem */}
                <Card className="rounded-2xl border bg-card p-6">
                  <div className="mb-3 text-sm font-semibold text-destructive">The problem</div>
                  <div className="mb-4 space-y-1 font-mono text-sm text-muted-foreground">
                    <div>final.mp4</div>
                    <div>final_v2.mp4</div>
                    <div>final_FINAL.mp4</div>
                    <div className="text-foreground">final_FINAL_real.mp4</div>
                  </div>
                  <p className="text-muted-foreground">
                    Every change is a new multi-gigabyte copy. You re-upload the whole file to
                    change five seconds. No history, no diff, no idea what shipped.
                  </p>
                </Card>

                {/* Why Git can't help */}
                <Card className="rounded-2xl border bg-card p-6">
                  <div className="mb-3 text-sm font-semibold text-warning">Why Git can&apos;t help</div>
                  <p className="mb-4 text-muted-foreground">
                    Git was built for text. A one-line code edit is tiny&mdash;but a one-second
                    video trim rewrites the entire file.
                  </p>
                  <p className="text-muted-foreground">
                    Git and Git&nbsp;LFS just store another full copy every time. They were never
                    designed for gigabytes of binary media.
                  </p>
                </Card>

                {/* What Dits does */}
                <Card className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
                  <div className="mb-3 text-sm font-semibold text-brand">What Dits does</div>
                  <p className="mb-4 text-muted-foreground">
                    Real version control for big binary media. Edit a video or photo and Dits
                    stores only the difference&mdash;kilobytes, not gigabytes.
                  </p>
                  <p className="text-muted-foreground">
                    See exactly which frames changed. Keep a full, honest history. No more
                    <span className="font-mono"> _FINAL_v27</span>.
                  </p>
                </Card>
              </div>

              {/* The one-liner */}
              <Card className="mt-10 rounded-2xl border bg-card p-8 text-center">
                <p className="text-xl font-medium md:text-2xl">
                  &ldquo;Git lets developers version their code and only save what changed.{" "}
                  <span className="text-gradient-brand">Dits does that for video and photos.</span>&rdquo;
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  That&apos;s the whole pitch. Everything below is how.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* UNDERSTAND YOUR FILES */}
        {/* ================================================================ */}
        <section className="border-t bg-muted/30 py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <SectionHeading
                title="Understand your files."
                subtitle="They're more than blobs on a hard drive."
                className="mb-16"
              />

              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-2xl font-bold">See exactly what changed</h3>
                  <p className="mb-6 text-lg text-muted-foreground">
                    Dits splits files into content-defined chunks. When you edit a 10GB video,
                    only the changed chunks are stored. View diffs, track history, and understand
                    your storage at a glance.
                  </p>
                  <CheckList
                    items={[
                      "Content-aware chunking at 2+ GB/s",
                      "BLAKE3 integrity verification",
                      "60-80% typical storage reduction",
                    ]}
                  />
                </div>

                {/* Visual demo - chunk visualization */}
                <Card className="rounded-2xl border bg-card p-6 lg:p-8">
                  <div className="space-y-4">
                    <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
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
                            i < 35 ? "bg-brand/20" : "bg-brand"
                          )}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 text-sm">
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">35</span> chunks reused
                      </span>
                      <span className="font-medium text-brand">5 new chunks (512 MB)</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* SYNC SMARTER */}
        {/* ================================================================ */}
        <section className="border-t py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <SectionHeading
                title="Sync smarter."
                subtitle="Stop re-uploading the same data."
                className="mb-16"
              />

              <div className="grid items-center gap-8 lg:grid-cols-2">
                {/* Terminal demo */}
                <div
                  className="order-2 overflow-hidden rounded-2xl shadow-float lg:order-1"
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
                  <div
                    className="space-y-2 p-5 font-mono text-sm"
                    style={{ color: "var(--code-foreground)" }}
                  >
                    <div><span className="text-brand">$</span> dits push origin main</div>
                    <div className="pl-2 text-muted-foreground">
                      Analyzing changes...<br />
                      <span>&rarr; 3 files modified (10.2 GB logical)</span><br />
                      <span>&rarr; 47 new chunks identified</span><br />
                      <span className="text-brand">&rarr; Uploading 512 MB (95% deduplicated)</span><br />
                      <br />
                      <span className="text-brand">&check; Pushed in 4.2s</span>
                    </div>
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <Badge variant="outline" className="mb-4">Sync engine on the roadmap</Badge>
                  <h3 className="mb-4 text-2xl font-bold">Delta sync, not full re-upload</h3>
                  <p className="mb-6 text-lg text-muted-foreground">
                    Traditional tools re-upload entire files on every change. Because Dits content-
                    addresses every chunk and frame, sync only needs to transfer what&apos;s
                    different&mdash;and a dropped transfer resumes where it left off instead of
                    restarting. (The networked sync engine is in active development; the
                    content-addressed store it builds on works today.)
                  </p>

                  {/* Before/after comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-muted/50 p-4 text-center">
                      <p className="mb-1 text-sm text-muted-foreground">Traditional</p>
                      <p className="text-2xl font-bold tabular-nums text-destructive line-through">10.2 GB</p>
                    </div>
                    <div className="rounded-xl border border-brand/20 bg-brand/10 p-4 text-center">
                      <p className="mb-1 text-sm text-brand">With Dits</p>
                      <p className="text-2xl font-bold tabular-nums text-brand">512 MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* P2P SHARING */}
        {/* ================================================================ */}
        <section className="border-t bg-muted/30 py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <SectionHeading
                title="Share directly."
                subtitle="No cloud upload required."
                className="mb-16"
              />

              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <Badge variant="outline" className="mb-4">On the roadmap</Badge>
                  <h3 className="mb-4 text-2xl font-bold">Peer-to-peer collaboration</h3>
                  <p className="mb-6 text-lg text-muted-foreground">
                    The plan: share repositories directly between computers with a join code&mdash;
                    end-to-end encrypted, no file-size limits. Because frames are content-addressed,
                    transfers will resume where they drop and never re-send footage you both already
                    have. (Networking is in active development&mdash;local workflows work today.)
                  </p>
                  <CheckList
                    items={[
                      "Works through firewalls and NATs",
                      "AES-256 encryption",
                      "No bandwidth caps or limits",
                    ]}
                  />
                </div>

                {/* Join code visual */}
                <Card className="rounded-2xl border bg-card p-8 text-center">
                  <div className="mb-4 inline-flex">
                    <StatusPill tone="neutral">Coming soon</StatusPill>
                  </div>
                  <div className="mb-4 font-mono text-4xl font-bold tracking-widest text-muted-foreground/50">
                    7KJM-XBCD
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The planned flow: send a join code, your collaborator connects directly
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* INSTALL */}
        {/* ================================================================ */}
        <section className="border-t py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Get started in seconds
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Install with your preferred package manager
              </p>

              <div
                className="overflow-hidden rounded-2xl text-left shadow-card"
                style={{
                  backgroundColor: "var(--code-background)",
                  border: "1px solid var(--code-border)",
                }}
              >
                <div
                  className="flex"
                  role="tablist"
                  style={{ borderBottom: "1px solid var(--code-border)" }}
                >
                  {(Object.keys(installCommands) as Array<keyof typeof installCommands>).map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveInstall(key)}
                      role="tab"
                      aria-selected={activeInstall === key}
                      className={cn(
                        "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                        activeInstall === key
                          ? "border-b-2 border-brand bg-muted/20 text-foreground"
                          : "text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                      )}
                      type="button"
                    >
                      {key}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between p-5">
                  <pre className="m-0 border-0 bg-transparent p-0">
                    <code
                      className="bg-transparent p-0 font-mono text-sm"
                      style={{ color: "var(--code-foreground)" }}
                    >
                      <span className="text-brand">$</span> {installCommands[activeInstall]}
                    </code>
                  </pre>
                  <CopyButton text={installCommands[activeInstall]} />
                </div>
              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                Then run <code className="rounded bg-muted px-2 py-1 font-mono">dits init</code> to start
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* FAQ */}
        {/* ================================================================ */}
        <section className="border-t bg-muted/30 py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Frequently asked questions
              </h2>

              <Accordion multiple={false} className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-b">
                    <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <div className="mt-10 text-center">
                <Button variant="outline" render={<Link href="/faq" />}>
                  See all FAQs
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* ROADMAP */}
        {/* ================================================================ */}
        <section className="border-t py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Actively developed
              </h2>
              <p className="mb-10 text-lg text-muted-foreground">
                <span className="font-semibold text-brand">{phaseComplete} of {phases.length}</span> phases complete &mdash; the
                local engine works today; networked sync is on the roadmap.
              </p>

              {/* Progress as metric tiles */}
              <div className="mx-auto mb-10 grid max-w-xl grid-cols-3 gap-4">
                <StatCard label="Complete" value={String(phaseComplete)} hint={`of ${phases.length} phases`} />
                <StatCard label="In progress" value={String(phaseActive)} hint="active now" />
                <StatCard label="Planned" value={String(phasePlanned)} hint="on the roadmap" />
              </div>

              {/* Progress bar */}
              <div className="mx-auto mb-10 h-2 max-w-xl overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand" style={{ width: `${phasePct}%` }} />
              </div>

              {/* Phase pills */}
              <div className="mb-10 flex flex-wrap justify-center gap-2">
                {phases.map((phase) => (
                  <StatusPill
                    key={phase.name}
                    tone={phaseTone[phase.status]}
                    pulse={phase.status === "active"}
                    className="px-3 py-1"
                  >
                    {phase.name}
                  </StatusPill>
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
        {/* FINAL CTA */}
        {/* ================================================================ */}
        <section className="relative overflow-hidden border-t bg-primary py-24 text-primary-foreground md:py-32">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-10" />
          <div className="container relative">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                A new era of version control
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-xl text-primary-foreground/80">
                Start versioning your large files today. Free, open source, and built for creative workflows.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" variant="secondary" className="h-14 rounded-xl px-10 text-lg" render={<Link href="/download" />}>
                  <Download className="mr-2 h-5 w-5" />
                  Download Dits
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-xl border-primary-foreground/30 bg-transparent px-10 text-lg text-primary-foreground hover:bg-primary-foreground/10"
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
