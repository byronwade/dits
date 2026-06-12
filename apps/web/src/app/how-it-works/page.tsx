import { Metadata } from "next";
import Link from "next/link";
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
import { CodeBlock } from "@/components/ui/code-block";
import { ChunkingPipelineDiagram } from "@/components/diagrams";
import {
  Scissors,
  Fingerprint,
  Copy,
  HardDrive,
  Network,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "How Dits Works - Chunking, Hashing & Deduplication Explained",
  description:
    "A plain-English guide to how Dits works: content-defined chunking with FastCDC, BLAKE3 content addressing, deduplication, format-aware video handling (FACR), hybrid Git storage, and where it wins and loses versus Git.",
  canonical: "https://dits.dev/how-it-works",
  keywords: [
    "how dits works",
    "content-defined chunking",
    "FastCDC",
    "BLAKE3",
    "deduplication",
    "frame-addressable video",
    "git vs dits",
  ],
  openGraph: {
    type: "website",
    images: [
      { url: "/dits.png", width: 1200, height: 630, alt: "How Dits Works" },
    ],
  },
  twitter: { card: "summary_large_image" },
});

/**
 * How It Works — the full mental model, plain-English first then the detail.
 *
 * Messaging is grounded in repo sources (README implementation status and the
 * tmp/spike benchmark scenarios). Anything not shipped is labeled Roadmap; the
 * format-aware/FACR layer is the honest differentiator, with the loss case
 * shown to keep the wins credible.
 *
 * AGENTS.md: single h1, skip-link target, aria-hidden decorative icons,
 * redundant status cues (icon + text, never color alone), focus rings via the
 * shared components, no motion that ignores prefers-reduced-motion.
 */

const mentalModel = [
  {
    icon: Scissors,
    step: "Chunk",
    body: "Files are split into variable-size pieces at boundaries chosen by the content itself — not at fixed offsets. A small edit only disturbs the chunks around it.",
  },
  {
    icon: Fingerprint,
    step: "Hash",
    body: "Every chunk is named by the BLAKE3 hash of its bytes. The name is the content, so two identical chunks always get the same name.",
  },
  {
    icon: Copy,
    step: "Deduplicate",
    body: "A chunk that's already stored under that name is never stored again. Across versions, across files, across projects — you keep one copy.",
  },
];

// FastCDC chunk-size profiles — real values from apps/cli/src/core/chunk.rs.
const chunkProfiles = [
  { name: "project", min: "4 KB", avg: "16 KB", max: "64 KB", use: "Project files, XML, JSON, configs" },
  { name: "default", min: "16 KB", avg: "64 KB", max: "256 KB", use: "General-purpose balance" },
  { name: "media", min: "64 KB", avg: "256 KB", max: "1 MB", use: "Video, 3D, large binaries" },
];

// Honest scenarios from tmp/spike/RESULTS.md (one machine, one run).
const winLoss = [
  {
    tone: "loss" as const,
    title: "Full re-export of a video",
    detail:
      "When an NLE re-exports the whole clip, almost every byte shifts. Generic content-defined chunking can't help — in our spike, dits' generic layer stored the most of any tool (88.6 MiB delta). We show this on purpose.",
  },
  {
    tone: "win" as const,
    title: "Metadata-only change (MP4 moov rewrite)",
    detail:
      "Same media data, rewritten container header. dits stored 0.19 MiB — beating restic (0.77 MiB) and borg (5.93 MiB), because it understands the file structure.",
  },
  {
    tone: "win" as const,
    title: "Frame-addressable re-grade (FACR)",
    detail:
      "Re-grade 5 of 300 frames and dits stores 5 new frames, reusing 295 — 98.3% deduplicated. You store the frames you changed, not the file.",
  },
  {
    tone: "win" as const,
    title: "Incremental streaming re-publish",
    detail:
      "Re-grade a 2-second window of a 12s clip and dits re-encodes 1 of 6 HLS segments, reusing 5. It re-delivers 471 KB instead of 3.5 MB — 7.4× less shipped, 86.5% saved.",
  },
];

const comparison = [
  {
    feature: "Large file handling",
    dits: { state: "yes", note: "Native, no extensions" },
    git: { state: "no", note: "Practically unusable" },
    gitlfs: { state: "partial", note: "Pointer files, separate store" },
  },
  {
    feature: "Cross-file deduplication",
    dits: { state: "yes", note: "Automatic, content-addressed" },
    git: { state: "no", note: "None" },
    gitlfs: { state: "no", note: "Full file copies" },
  },
  {
    feature: "Format-aware (MP4 atom) handling",
    dits: { state: "yes", note: "moov / mdat parse + reconstruct" },
    git: { state: "no", note: "Byte-blind" },
    gitlfs: { state: "no", note: "Byte-blind" },
  },
  {
    feature: "Frame-addressable video (FACR)",
    dits: { state: "experimental", note: "Frame-level diff/dedup" },
    git: { state: "no", note: "Not applicable" },
    gitlfs: { state: "no", note: "Not applicable" },
  },
  {
    feature: "Convergent encryption",
    dits: { state: "yes", note: "AES-256-GCM, dedup-friendly" },
    git: { state: "no", note: "None" },
    gitlfs: { state: "no", note: "None" },
  },
  {
    feature: "Hybrid text + binary storage",
    dits: { state: "yes", note: "libgit2 for text, chunks for binary" },
    git: { state: "partial", note: "Great for text only" },
    gitlfs: { state: "partial", note: "Git for text, LFS for binary" },
  },
  {
    feature: "On-demand file hydration (VFS)",
    dits: { state: "partial", note: "FUSE/WinFSP mount works locally; remote hydration is roadmap" },
    git: { state: "no", note: "Full checkout" },
    gitlfs: { state: "partial", note: "Manual selection" },
  },
  {
    feature: "Networked push / pull / sync",
    dits: { state: "roadmap", note: "QUIC delta sync — scaffolding today" },
    git: { state: "yes", note: "Mature" },
    gitlfs: { state: "yes", note: "Mature" },
  },
  {
    feature: "Open source",
    dits: { state: "yes", note: "Apache-2.0 / MIT" },
    git: { state: "yes", note: "GPL v2" },
    gitlfs: { state: "yes", note: "MIT" },
  },
];

type CellState = "yes" | "no" | "partial" | "experimental" | "roadmap";

function StateCell({ state, note }: { state: CellState; note: string }) {
  const map: Record<CellState, { icon: typeof CheckCircle2; cls: string; label: string }> = {
    yes: { icon: CheckCircle2, cls: "text-brand", label: "Yes" },
    no: { icon: XCircle, cls: "text-muted-foreground", label: "No" },
    partial: { icon: AlertTriangle, cls: "text-warning", label: "Partial" },
    experimental: { icon: Wand2, cls: "text-warning", label: "Experimental" },
    roadmap: { icon: AlertTriangle, cls: "text-warning", label: "Roadmap" },
  };
  const { icon: Icon, cls, label } = map[state];
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="flex items-center gap-1.5">
        <Icon className={`size-4 ${cls}`} aria-hidden="true" />
        <span className={`text-xs font-medium ${cls}`}>{label}</span>
      </span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1 pt-[104px]" tabIndex={-1}>
        {/* Hero */}
        <section
          className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-32"
          aria-labelledby="hiw-heading"
        >
          {/* Atmospheric background: grid texture + brand glow */}
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
            <div className="absolute inset-x-0 top-0 h-[480px] glow-brand" />
          </div>
          <div className="container">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="outline" className="mb-6">How it works</Badge>
              <h1
                id="hiw-heading"
                className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
              >
                From bytes to commits,{" "}
                <span className="text-gradient-brand">explained simply</span>
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-xl text-muted-foreground">
                Dits versions huge media files by storing the unique pieces of your data exactly
                once. Here&apos;s the whole idea — in plain English first, with the technical detail
                right behind it.
              </p>
            </div>
          </div>
        </section>

        {/* Mental model */}
        <section className="border-y bg-muted/50" aria-labelledby="model-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-5xl">
              <h2 id="model-heading" className="text-3xl font-bold tracking-tight text-center sm:text-4xl mb-4">
                The whole idea in three words
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                Chunk, hash, deduplicate. Everything else is an optimization on top of these three.
              </p>
              <div className="grid gap-6 md:grid-cols-3 mb-12" role="list">
                {mentalModel.map((m, i) => (
                  <Card key={m.step} role="listitem" className="h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-full bg-brand/10">
                          <m.icon className="size-6 text-brand" aria-hidden="true" />
                        </div>
                        <div>
                          <span className="font-mono text-xs text-muted-foreground" aria-hidden="true">
                            Step {i + 1}
                          </span>
                          <CardTitle>{m.step}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{m.body}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ChunkingPipelineDiagram />
            </div>
          </div>
        </section>

        {/* Content-defined chunking */}
        <section className="container py-16 md:py-24" aria-labelledby="chunk-heading">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-center gap-4">
              <span
                className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 font-mono text-lg font-bold text-brand"
                aria-hidden="true"
              >
                1
              </span>
              <h2 id="chunk-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Content-defined chunking
              </h2>
            </div>
            <p className="text-lg text-muted-foreground mb-8">
              Most tools cut files into fixed-size blocks. That breaks the moment you insert a
              single byte near the start — every block after it shifts, so nothing lines up and
              deduplication collapses. Dits uses <strong className="text-foreground">FastCDC</strong>,
              which picks cut points based on the bytes themselves. Insert something near the start
              and only the chunk around the insertion changes; the rest are byte-for-byte identical.
            </p>

            <div className="grid gap-6 md:grid-cols-2 mb-10">
              <Card className="border-destructive/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <XCircle className="size-5 text-destructive" aria-hidden="true" />
                    <CardTitle className="text-lg">Fixed-size blocks</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Insert one byte at the start → every following block shifts → 0% reuse. The
                    file looks &ldquo;entirely new&rdquo; even though you changed almost nothing.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card className="border-brand/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-brand" aria-hidden="true" />
                    <CardTitle className="text-lg">Content-defined (FastCDC)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Insert one byte → only the nearby chunk changes → 95%+ of chunks are reused.
                    Boundaries follow the content, so they survive edits.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            <p className="text-muted-foreground mb-4">
              Chunk sizes are tuned per file type. Smaller chunks deduplicate more finely but add
              bookkeeping; larger chunks keep manifests small for huge media. The real defaults:
            </p>
            <div className="overflow-x-auto mb-4 rounded-xl border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-semibold">Profile</th>
                    <th className="p-3 text-left font-semibold">Min</th>
                    <th className="p-3 text-left font-semibold">Avg</th>
                    <th className="p-3 text-left font-semibold">Max</th>
                    <th className="p-3 text-left font-semibold">Best for</th>
                  </tr>
                </thead>
                <tbody>
                  {chunkProfiles.map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="p-3 font-mono text-brand">{p.name}</td>
                      <td className="p-3 font-mono text-muted-foreground">{p.min}</td>
                      <td className="p-3 font-mono text-muted-foreground">{p.avg}</td>
                      <td className="p-3 font-mono text-muted-foreground">{p.max}</td>
                      <td className="p-3 text-muted-foreground">{p.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Dits picks a profile automatically from file size, and a media-aware path aligns
              chunk boundaries to video keyframes.
            </p>
          </div>
        </section>

        {/* Content addressing */}
        <section className="border-y bg-muted/50" aria-labelledby="hash-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-4xl">
              <div className="mb-4 flex items-center gap-4">
                <span
                  className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 font-mono text-lg font-bold text-brand"
                  aria-hidden="true"
                >
                  2
                </span>
                <h2 id="hash-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Content addressing with BLAKE3
                </h2>
              </div>
              <p className="text-lg text-muted-foreground mb-8">
                Each chunk is identified by the <strong className="text-foreground">BLAKE3</strong>{" "}
                hash of its bytes — a 32-byte fingerprint. Because the name is derived from the
                content, identical chunks collide on the same name by design. That&apos;s the whole
                trick behind deduplication: to store a chunk, you first ask &ldquo;do I already have
                something with this name?&rdquo; If yes, you store nothing.
              </p>
              <CodeBlock
                language="text"
                code={`chunk A  ──blake3──▶  7f3a91c2…  (store it)
chunk B  ──blake3──▶  a91c02bd…  (store it)
chunk C  ──blake3──▶  7f3a91c2…  (same as A → store nothing, just point at it)`}
              />
              <p className="mt-6 text-muted-foreground">
                BLAKE3 is fast and parallelizable, so hashing keeps up with chunking even on large
                files. The same hash also verifies integrity: re-hash a chunk and compare to detect
                any corruption.
              </p>
            </div>
          </div>
        </section>

        {/* Format-aware / FACR — the differentiator */}
        <section className="container py-16 md:py-24" aria-labelledby="facr-heading">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span
                className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 font-mono text-lg font-bold text-brand"
                aria-hidden="true"
              >
                3
              </span>
              <h2 id="facr-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Format-aware handling &amp; FACR
              </h2>
              <Badge variant="secondary" className="font-mono">the differentiator</Badge>
            </div>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl">
              Generic chunking is byte-blind, and on a full video re-export that&apos;s a real
              weakness (see below). Dits&apos; advantage is that it can understand the file. For
              MP4/ISOBMFF it parses the container, separates the metadata atoms
              (<code className="font-mono text-sm text-foreground">moov</code>) from the media data
              (<code className="font-mono text-sm text-foreground">mdat</code>), and reconstructs
              byte-exactly. On top of that,{" "}
              <strong className="text-foreground">FACR</strong> (frame-addressable, content-addressed
              video) makes individual frames the unit of dedup.
            </p>

            <h3 className="text-xl font-semibold tracking-tight mb-6">Where Dits wins — and where it loses</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {winLoss.map((s) => (
                <Card key={s.title} className={s.tone === "win" ? "border-brand/30" : "border-destructive/40"}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {s.tone === "win" ? (
                        <CheckCircle2 className="size-5 text-brand" aria-hidden="true" />
                      ) : (
                        <XCircle className="size-5 text-destructive" aria-hidden="true" />
                      )}
                      <CardTitle className="text-base">{s.title}</CardTitle>
                      <Badge
                        variant="outline"
                        className={`ml-auto text-[10px] uppercase ${s.tone === "win" ? "text-brand" : "text-destructive"}`}
                      >
                        {s.tone === "win" ? "Win" : "Honest loss"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{s.detail}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Numbers from a single-machine benchmark spike comparing git-lfs, restic, borg,
              xdelta3, and dits. See the full methodology on the{" "}
              <Link href="/benchmarks" className="text-brand underline-offset-4 hover:underline">
                benchmarks page
              </Link>
              . Showing the loss case is deliberate — it&apos;s what makes the wins credible.
            </p>
          </div>
        </section>

        {/* Storage */}
        <section className="border-y bg-muted/50" aria-labelledby="storage-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-4xl">
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 font-mono text-lg font-bold text-brand"
                  aria-hidden="true"
                >
                  4
                </span>
                <h2 id="storage-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Hybrid Git + Dits storage
                </h2>
              </div>
              <p className="text-lg text-muted-foreground">
                Text and code are already well served by Git, so Dits keeps using libgit2 for them —
                you get real diff, merge, blame, and history. Binary and media files go through the
                chunk-and-dedup path instead. One repository, the right strategy per file, and full
                Git-style operations across the whole project.
              </p>
            </div>
          </div>
        </section>

        {/* VFS / Locking / Sync — clearly roadmap */}
        <section className="container py-16 md:py-24" aria-labelledby="future-heading">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 flex items-center gap-4">
              <span
                className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 font-mono text-lg font-bold text-brand"
                aria-hidden="true"
              >
                5
              </span>
              <h2 id="future-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Working with terabytes: VFS, locking &amp; sync
              </h2>
            </div>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl">
              These pieces complete the picture for teams. We&apos;re being explicit about what ships
              today versus what&apos;s still on the roadmap, so you can plan honestly.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <HardDrive className="size-5 text-muted-foreground" aria-hidden="true" />
                    <Badge variant="outline" className="text-[10px] uppercase text-warning">
                      <AlertTriangle className="mr-1 size-3" aria-hidden="true" /> Partial
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">Virtual filesystem</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    A FUSE mount (<code className="font-mono text-sm">dits mount</code> /{" "}
                    <code className="font-mono text-sm">unmount</code>) so files appear local but
                    hydrate on demand. Works locally today in a fuser-enabled build
                    (<code className="font-mono text-sm">--features fuser</code>); remote/on-demand
                    hydration is on the roadmap.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Lock className="size-5 text-muted-foreground" aria-hidden="true" />
                    <Badge variant="outline" className="text-[10px] uppercase text-warning">
                      <AlertTriangle className="mr-1 size-3" aria-hidden="true" /> Roadmap
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">File locking</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Distributed locks so two people don&apos;t edit the same un-mergeable binary at
                    once. Part of the collaboration phase.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Network className="size-5 text-muted-foreground" aria-hidden="true" />
                    <Badge variant="outline" className="text-[10px] uppercase text-warning">
                      <AlertTriangle className="mr-1 size-3" aria-hidden="true" /> Roadmap
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">QUIC delta sync</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Push and pull only the chunks the other side is missing, over QUIC. The network
                    layer is scaffolding today — local commit, add, branch, and merge already work.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="border-y bg-muted/50" aria-labelledby="compare-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-6xl">
              <h2 id="compare-heading" className="text-3xl font-bold tracking-tight text-center sm:text-4xl mb-4">
                Git vs Dits, honestly
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                Git is excellent at what it was built for: text. Dits is built for the heavy stuff.
                Where a capability isn&apos;t shipped yet, we mark it Roadmap rather than claim it.
              </p>
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full border-collapse" role="table">
                  <thead>
                    <tr className="border-b">
                      <th className="p-4 text-left font-semibold">Capability</th>
                      <th className="p-4 text-center font-semibold bg-brand/5">Dits</th>
                      <th className="p-4 text-center font-semibold">Git</th>
                      <th className="p-4 text-center font-semibold">Git&nbsp;LFS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((row) => (
                      <tr key={row.feature} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{row.feature}</td>
                        <td className="p-4 bg-brand/5"><StateCell state={row.dits.state as CellState} note={row.dits.note} /></td>
                        <td className="p-4"><StateCell state={row.git.state as CellState} note={row.git.note} /></td>
                        <td className="p-4"><StateCell state={row.gitlfs.state as CellState} note={row.gitlfs.note} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container py-16 md:py-24" aria-labelledby="hiw-cta-heading">
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="hiw-cta-heading" className="text-3xl md:text-4xl font-bold mb-4">
              See it on your own files
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Read the deep-dive docs, or watch the real engine chunk and deduplicate your data in
              the browser — the Playground runs it live in WebAssembly today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" render={<Link href="/docs/architecture" />}>Read the architecture docs</Button>
              <Button size="lg" variant="outline" render={<Link href="/playground" />}>Open the Playground</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
