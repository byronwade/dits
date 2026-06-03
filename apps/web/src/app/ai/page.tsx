"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  CheckCircle2,
  Boxes,
  Fingerprint,
  Sparkles,
  Recycle,
  Database,
  CircuitBoard,
  XCircle,
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

// ============================================================================
// DATA
// ============================================================================

const faqs = [
  {
    question: "Why not just keep checkpoints in S3 or Git LFS?",
    answer:
      "Object storage and Git LFS keep a complete copy of every checkpoint. Save a 30 GB checkpoint every 500 steps and you are paying for 30 GB each time, even though consecutive checkpoints are almost identical. Dits content-addresses every chunk, so shared structure across checkpoints, fine-tunes, and quantized variants is stored once. You keep the full history without paying full price for it.",
  },
  {
    question: "How is this different from Hugging Face Xet or DVC?",
    answer:
      "They pioneered content-defined chunking for model and dataset storage, and Dits builds on the same foundation (FastCDC + BLAKE3 over a content-addressed store). The direction we are pushing past exact-match dedup is two more addressing layers: similarity-addressing (dedupe near-duplicate samples and re-encodes, not just byte-identical ones) and derivation-addressing (store the recipe for a derivable artifact and recompute it instead of storing the bytes).",
  },
  {
    question: "Does chunk dedup actually work on float tensors?",
    answer:
      "Honestly: byte-level chunking dedupes poorly between two consecutive training checkpoints, because a gradient step nudges almost every weight a little and the bytes change everywhere. Where it wins today is base-model vs. fine-tune, model vs. quantized/LoRA variant, shared dataset shards, and append-style changes. Tensor-aware chunking that survives diffuse updates is on the roadmap — see How it works for the honest version.",
  },
  {
    question: "Is it open source and self-hostable?",
    answer:
      "Yes. Dits for AI runs on the same open-core engine as Dits for media — local-first, self-hostable, no account required, with optional cloud compute for recompute-heavy workflows. Your weights and datasets never have to leave your infrastructure.",
  },
  {
    question: "What can I use today vs. what is on the roadmap?",
    answer:
      "Working today: content-addressed storage with BLAKE3 verification, FastCDC chunking and exact dedup, byte-exact reconstruction, and local commit/checkout/diff/log. On the roadmap: networked delta sync, tensor-aware chunking, similarity-addressing, and derivation/recompute. We label roadmap items clearly throughout.",
  },
];

const engineLayers = [
  {
    icon: Fingerprint,
    tag: "L1 · Exact",
    status: "Working today",
    tone: "success" as StatusTone,
    title: "Content-addressed bytes",
    body: "Every chunk is addressed by its BLAKE3 hash. Identical chunks across checkpoints, shards, and variants are stored exactly once, and every read is integrity-verified.",
  },
  {
    icon: Sparkles,
    tag: "L2 · Similar",
    status: "Roadmap",
    tone: "warning" as StatusTone,
    title: "Similarity-addressed",
    body: "Near-duplicates — augmented images, re-encodes, lightly-edited samples — addressed by a perceptual/semantic fingerprint and stored as a small delta against the closest existing chunk. The thing exact-match hashing misses entirely.",
  },
  {
    icon: Recycle,
    tag: "L3 · Derived",
    status: "Roadmap",
    tone: "warning" as StatusTone,
    title: "Derivation-addressed",
    body: "A quantized model, a LoRA, or a checkpoint that is reproducible from (data refs + config + seed) is stored as its recipe — a few hundred bytes — and recomputed on demand instead of stored as terabytes.",
  },
];

const compareRows: {
  capability: string;
  lfs: boolean | string;
  others: boolean | string;
  dits: boolean | string;
}[] = [
  { capability: "Stores only changed chunks", lfs: false, others: true, dits: true },
  { capability: "Dedupe across checkpoints & variants", lfs: false, others: true, dits: true },
  { capability: "Integrity-verified reads (BLAKE3)", lfs: "partial", others: "partial", dits: true },
  { capability: "Similarity dedup (near-duplicates)", lfs: false, others: false, dits: "roadmap" },
  { capability: "Recipe / recompute instead of store", lfs: false, others: false, dits: "roadmap" },
  { capability: "Open core, self-hostable", lfs: true, others: "partial", dits: true },
];

const phases: { name: string; status: "complete" | "active" | "planned" }[] = [
  { name: "Content store", status: "complete" },
  { name: "Exact dedup", status: "complete" },
  { name: "Local history", status: "complete" },
  { name: "Tensor-aware chunking", status: "active" },
  { name: "Network sync", status: "planned" },
  { name: "Similarity dedup", status: "planned" },
  { name: "Derivation / recompute", status: "planned" },
];

const phaseTone: Record<(typeof phases)[number]["status"], StatusTone> = {
  complete: "success",
  active: "warning",
  planned: "neutral",
};

const phaseComplete = phases.filter((p) => p.status === "complete").length;
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

function Cell({ value }: { value: boolean | string }) {
  if (value === true)
    return <Check className="mx-auto h-4 w-4 text-brand" aria-label="Yes" />;
  if (value === false)
    return (
      <XCircle className="mx-auto h-4 w-4 text-muted-foreground/40" aria-label="No" />
    );
  return (
    <span className="text-xs font-medium capitalize text-muted-foreground">
      {value}
    </span>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function AiHome() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main id="main-content" className="flex-1 pt-[104px]">
        {/* ================================================================ */}
        {/* HERO */}
        {/* ================================================================ */}
        <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-32">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
            <div className="absolute inset-x-0 top-0 h-[480px] glow-brand" />
          </div>

          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-8">
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  An alternative to
                  <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                    <Database className="h-3 w-3" />
                    Git&nbsp;LFS · Xet · DVC
                  </span>
                </span>
              </div>

              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Version control for{" "}
                <span className="text-gradient-brand">models, datasets &amp; research data</span>
              </h1>

              <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground md:text-xl">
                Model checkpoints, training sets, genomic reads, simulation
                output&mdash;the heaviest, least version-controlled data in AI and
                science. Dits content-addresses every chunk, so you store only
                what changed, move deltas instead of whole files, and keep an
                honest history.
              </p>

              <div className="mb-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  render={
                    <Link
                      href="https://github.com/byronwade/dits"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  Request early access
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" render={<Link href="/ai/how-it-works" />}>
                  How it works
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-brand" />
                  Open core
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-brand" />
                  Self-hostable
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-brand" />
                  Weights never leave your infra
                </span>
              </div>
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
                  Because the biggest files in AI and science are still versioned
                  by renaming them. Here&apos;s the whole story in three steps.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card className="rounded-2xl border bg-card p-6">
                  <div className="mb-3 text-sm font-semibold text-destructive">The problem</div>
                  <div className="mb-4 space-y-1 font-mono text-sm text-muted-foreground">
                    <div>ckpt-step-1000.safetensors</div>
                    <div>ckpt-step-1500.safetensors</div>
                    <div>ckpt-best.safetensors</div>
                    <div className="text-foreground">model-final-v3.safetensors</div>
                  </div>
                  <p className="text-muted-foreground">
                    Every checkpoint is another full multi-gigabyte copy in a
                    bucket. No diff, no lineage, no answer to &ldquo;which weights
                    actually shipped?&rdquo;
                  </p>
                </Card>

                <Card className="rounded-2xl border bg-card p-6">
                  <div className="mb-3 text-sm font-semibold text-warning">Why buckets can&apos;t help</div>
                  <p className="mb-4 text-muted-foreground">
                    S3 and Git&nbsp;LFS store a whole new copy on every write. They
                    have no idea that two checkpoints, a base model and its
                    fine-tune, or two dataset snapshots are 99% the same.
                  </p>
                  <p className="text-muted-foreground">
                    So you pay full storage and full bandwidth for changes that are
                    a fraction of the bytes.
                  </p>
                </Card>

                <Card className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
                  <div className="mb-3 text-sm font-semibold text-brand">What Dits does</div>
                  <p className="mb-4 text-muted-foreground">
                    Content-addresses every chunk. Shared structure across
                    checkpoints, variants, and shards is stored once&mdash;and you
                    get real commits, diffs, and lineage over it.
                  </p>
                  <p className="text-muted-foreground">
                    Then it goes further than exact dedup: similarity and recipes.
                  </p>
                </Card>
              </div>

              <Card className="mt-10 rounded-2xl border bg-card p-8 text-center">
                <p className="text-xl font-medium md:text-2xl">
                  &ldquo;Git lets developers version code and only save what changed.{" "}
                  <span className="text-gradient-brand">Dits does that for weights, datasets, and scientific data.</span>&rdquo;
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Same engine as Dits for media. Different heaviest files.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* THE THREE-LAYER ENGINE */}
        {/* ================================================================ */}
        <section className="border-t py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <SectionHeading
                title="Address data three ways."
                subtitle="Not just by the hash of its bytes."
                className="mb-16"
              />
              <div className="grid gap-6 md:grid-cols-3">
                {engineLayers.map((layer) => (
                  <Card key={layer.tag} className="flex flex-col rounded-2xl border bg-card p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                        <layer.icon className="h-5 w-5 text-brand" />
                      </div>
                      <StatusPill tone={layer.tone}>{layer.status}</StatusPill>
                    </div>
                    <div className="mb-1 font-mono text-xs uppercase tracking-wide text-brand">
                      {layer.tag}
                    </div>
                    <h3 className="mb-2 text-lg font-bold">{layer.title}</h3>
                    <p className="text-sm text-muted-foreground">{layer.body}</p>
                  </Card>
                ))}
              </div>
              <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
                L1 ships today on the open engine. L2 and L3 are the roadmap that
                takes Dits past exact-match dedup&mdash;the ceiling every other tool
                is built on.{" "}
                <Link href="/ai/how-it-works" className="text-brand underline-offset-4 hover:underline">
                  See the honest breakdown &rarr;
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* CHECKPOINT DIFF */}
        {/* ================================================================ */}
        <section className="border-t bg-muted/30 py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <SectionHeading
                title="Diff your checkpoints."
                subtitle="Not just store more of them."
                className="mb-16"
              />
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-2xl font-bold">See what each step actually changed</h3>
                  <p className="mb-6 text-lg text-muted-foreground">
                    Dits splits artifacts into content-defined chunks. Between a
                    base model and a fine-tune&mdash;or across shared dataset
                    shards&mdash;only the changed chunks are stored. Track lineage,
                    compare runs, and understand your storage at a glance.
                  </p>
                  <CheckList
                    items={[
                      "BLAKE3-verified, byte-exact reconstruction",
                      "Dedup across variants, shards, and runs",
                      "Full commit history over multi-GB artifacts",
                    ]}
                  />
                </div>

                <Card className="rounded-2xl border bg-card p-6 lg:p-8">
                  <div className="space-y-4">
                    <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
                      <CircuitBoard className="h-5 w-5" />
                      <span className="font-mono">llama-ft-step-2000.safetensors</span>
                      <Badge variant="secondary" className="ml-auto">26 GB</Badge>
                    </div>
                    <div className="grid grid-cols-10 gap-1">
                      {[...Array(40)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-6 rounded-sm transition-colors",
                            i < 33 ? "bg-brand/20" : "bg-brand",
                          )}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 text-sm">
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">33</span> chunks reused
                      </span>
                      <span className="font-medium text-brand">7 new chunks (4.5 GB)</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* MOVE LESS DATA */}
        {/* ================================================================ */}
        <section className="border-t py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <SectionHeading
                title="Move less data."
                subtitle="Across nodes, regions, and registries."
                className="mb-16"
              />
              <div className="grid items-center gap-8 lg:grid-cols-2">
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
                    <div><span className="text-brand">$</span> dits push registry main</div>
                    <div className="pl-2 text-muted-foreground">
                      Analyzing checkpoint...<br />
                      <span>&rarr; 26 GB logical (1 artifact)</span><br />
                      <span>&rarr; 7 new chunks identified</span><br />
                      <span className="text-brand">&rarr; Uploading 4.5 GB (83% deduplicated)</span><br />
                      <br />
                      <span className="text-brand">&check; Pushed delta in 11s</span>
                    </div>
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <Badge variant="outline" className="mb-4">Sync engine on the roadmap</Badge>
                  <h3 className="mb-4 text-2xl font-bold">Delta sync, not full re-upload</h3>
                  <p className="mb-6 text-lg text-muted-foreground">
                    Shuttling checkpoints between training nodes, registries, and
                    regions is pure bandwidth tax when 90% of the bytes already
                    exist on the other side. Because every chunk is
                    content-addressed, sync transfers only the difference&mdash;and
                    resumes where it dropped. (The networked sync engine is in
                    active development; the content-addressed store it builds on
                    works today.)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-muted/50 p-4 text-center">
                      <p className="mb-1 text-sm text-muted-foreground">Full re-upload</p>
                      <p className="text-2xl font-bold tabular-nums text-destructive line-through">26 GB</p>
                    </div>
                    <div className="rounded-xl border border-brand/20 bg-brand/10 p-4 text-center">
                      <p className="mb-1 text-sm text-brand">With Dits</p>
                      <p className="text-2xl font-bold tabular-nums text-brand">4.5 GB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* COMPARISON */}
        {/* ================================================================ */}
        <section className="border-t bg-muted/30 py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <SectionHeading title="How it compares" className="mb-12" />
              <Card className="overflow-hidden rounded-2xl border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-4 text-left font-semibold">Capability</th>
                      <th className="px-3 py-4 text-center font-medium text-muted-foreground">Git&nbsp;LFS</th>
                      <th className="px-3 py-4 text-center font-medium text-muted-foreground">Xet / DVC</th>
                      <th className="px-3 py-4 text-center font-semibold text-brand">Dits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((row) => (
                      <tr key={row.capability} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3 text-muted-foreground">{row.capability}</td>
                        <td className="px-3 py-3 text-center"><Cell value={row.lfs} /></td>
                        <td className="px-3 py-3 text-center"><Cell value={row.others} /></td>
                        <td className="px-3 py-3 text-center"><Cell value={row.dits} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                &ldquo;Roadmap&rdquo; marks capabilities in active design, not shipped today.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* FAQ */}
        {/* ================================================================ */}
        <section className="border-t py-24 md:py-32">
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
                <Button variant="outline" render={<Link href="/ai/faq" />}>
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
        <section className="border-t bg-muted/30 py-24 md:py-32">
          <div className="container">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Early, and honest about it
              </h2>
              <p className="mb-10 text-lg text-muted-foreground">
                <span className="font-semibold text-brand">{phaseComplete} of {phases.length}</span> phases
                complete &mdash; the content engine works today; tensor-aware
                dedup, sync, and recompute are next.
              </p>
              <div className="mx-auto mb-10 h-2 max-w-xl overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand" style={{ width: `${phasePct}%` }} />
              </div>
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
              <Button
                variant="outline"
                render={
                  <Link
                    href="https://github.com/byronwade/dits"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
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
                Bring version control to your heaviest data
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-xl text-primary-foreground/80">
                One open engine for the heaviest data in AI and science.
                Self-hostable, content-addressed, and built to go past
                exact-match dedup.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-14 rounded-xl px-10 text-lg"
                  render={
                    <Link
                      href="https://github.com/byronwade/dits"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <Boxes className="mr-2 h-5 w-5" />
                  Request early access
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-xl border-primary-foreground/30 bg-transparent px-10 text-lg text-primary-foreground hover:bg-primary-foreground/10"
                  render={<Link href="/ai/how-it-works" />}
                >
                  How it works
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
