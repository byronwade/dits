import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Dits for AI — Documentation",
  description:
    "Documentation for Dits for AI: content-addressed version control for model weights, checkpoints, and datasets. Concepts, workflows, and CLI.",
};

const groups = [
  {
    title: "Core Concepts",
    links: [
      { title: "Three-Layer Addressing", href: "/ai/docs/concepts/addressing", desc: "Exact, similar, and derived — the model that takes Dits past byte-match dedup." },
      { title: "Content Addressing", href: "/ai/docs/concepts/content-addressing", desc: "How BLAKE3 hashes give every chunk a stable identity." },
      { title: "Chunking & Deduplication", href: "/ai/docs/concepts/chunking", desc: "FastCDC content-defined chunking and where dedup pays off." },
      { title: "Tensor-Aware Chunking", href: "/ai/docs/concepts/tensor-chunking", desc: "Why float weights defeat byte-level dedup, and the roadmap fix." },
      { title: "Similarity Dedup", href: "/ai/docs/concepts/similarity", desc: "Dedupe near-duplicate samples and re-encodes, not just identical bytes." },
      { title: "Derivation & Recompute", href: "/ai/docs/concepts/derivation", desc: "Store the recipe, recompute the artifact — zero-byte derivables." },
    ],
  },
  {
    title: "Workflows",
    links: [
      { title: "Versioning Checkpoints", href: "/ai/docs/workflows/checkpoints", desc: "Commit training checkpoints with real history and lineage." },
      { title: "Versioning Datasets", href: "/ai/docs/workflows/datasets", desc: "Snapshot and dedupe large, evolving training sets." },
      { title: "Fine-Tunes & Variants", href: "/ai/docs/workflows/variants", desc: "Base models, fine-tunes, LoRAs, and quantized variants." },
    ],
  },
  {
    title: "Reference",
    links: [
      { title: "CLI for AI", href: "/ai/docs/cli", desc: "The commands you use day to day on AI artifacts." },
      { title: "Roadmap", href: "/ai/docs/roadmap", desc: "What works today vs. what's coming." },
      { title: "Engine Docs (shared)", href: "/docs", desc: "Full reference for the shared engine — applies to AI too." },
    ],
  },
];

export default function AiDocsOverview() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Dits for AI"
        title="Documentation"
        description="Content-addressed version control for the heaviest data in AI — model weights, checkpoints, and datasets. Same open engine as Dits for media, pointed at a different set of enormous files."
      />

      <Callout type="note">
        Dits for AI runs on the <strong>same engine</strong> as Dits for media.
        Engine-level topics (installation, the CLI, repositories, configuration)
        are documented once in the{" "}
        <Link href="/docs">core engine docs</Link> and apply identically to AI
        artifacts. The pages here cover what&apos;s <em>specific</em> to AI:
        addressing layers, tensor-aware chunking, and model/dataset workflows.
      </Callout>

      <h2>Start here</h2>
      <p>
        New to Dits? Read{" "}
        <Link href="/ai/docs/why-dits">Why Dits for AI</Link>, then follow the{" "}
        <Link href="/ai/docs/getting-started">Quick Start</Link>. If you want the
        mental model first, jump to{" "}
        <Link href="/ai/docs/concepts/addressing">Three-Layer Addressing</Link>.
      </p>

      {groups.map((group) => (
        <div key={group.title} className="not-prose my-8">
          <h2 className="mb-4 text-xl font-bold tracking-tight">{group.title}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {group.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-medium text-foreground">{link.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{link.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
