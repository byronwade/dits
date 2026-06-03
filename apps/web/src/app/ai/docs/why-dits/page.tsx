import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Why Dits for AI",
  description:
    "Why renaming files in S3 fails for model checkpoints and datasets, and how Dits brings content-addressed chunks, dedup, and real lineage.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Getting Started"
        title="Why Dits for AI"
        description="Checkpoints and datasets deserve real version control &mdash; not a folder full of renamed copies."
      />

      <h2>The problem</h2>
      <p>
        Most teams &ldquo;version&rdquo; their model artifacts by renaming files
        in an object store: <code>model-v1.safetensors</code>,{" "}
        <code>model-final.safetensors</code>,{" "}
        <code>model-final-actually.safetensors</code>. Every one of those is a
        full copy of the previous, even when 99% of the bytes are identical. A
        7B checkpoint saved ten times is seventy gigabytes of mostly-redundant
        storage, and there is no way to ask what actually changed between two of
        them, or where a given artifact came from.
      </p>
      <p>
        Buckets store opaque blobs. Git LFS does the same thing with extra
        ceremony &mdash; it tracks pointers to whole files and ships the entire
        object whenever any byte changes. Neither one understands the shared
        internal structure of two checkpoints, so neither can dedup across runs,
        variants, or shards.
      </p>

      <h2>What Dits does</h2>
      <p>
        Dits treats an artifact as a stream of content-addressed chunks. Two
        checkpoints that share most of their weights share most of their chunks
        on disk, so storing the second one costs only the bytes that genuinely
        differ. Because every chunk and every commit is addressed by its{" "}
        <Link href="/ai/docs/concepts/addressing">content hash</Link>, you get
        real commits, real diffs between any two versions, and real lineage
        &mdash; the same primitives Git gives source code, applied to artifacts
        that are gigabytes instead of kilobytes.
      </p>
      <p>
        Working today: a content-addressed store, BLAKE3 verification, FastCDC
        chunking with exact deduplication, byte-exact reconstruction, and local
        history &mdash; <code>commit</code>, <code>add</code>,{" "}
        <code>status</code>, <code>diff</code>, <code>log</code>,{" "}
        <code>checkout</code>, and <code>branch</code>. See{" "}
        <Link href="/ai/how-it-works">how it works</Link> for the full pipeline.
      </p>

      <h2>How it relates to Xet and DVC</h2>
      <p>
        Hugging Face Xet and DVC share the same foundation Dits builds on:
        content-defined chunking (CDC) over a content-addressed store (CAS).
        That foundation is what makes chunk-level dedup possible at all, and
        Dits implements it today. Where Dits is headed is the addressing layers
        above it &mdash; tensor-aware chunking, similarity-based dedup, and
        derivation/recompute &mdash; so that two artifacts can share structure
        even when their raw bytes are merely similar rather than identical.
      </p>

      <Callout type="note">
        Be precise about status. Local content-addressing, exact dedup, and
        history all work today. Networked sync (push/pull/fetch) and the L2/L3
        similarity and derivation layers are on the{" "}
        <Link href="/ai/docs/roadmap">roadmap</Link>, not shipped.
      </Callout>

      <h2>Next steps</h2>
      <ul>
        <li>
          <Link href="/ai/docs/getting-started">Quick start</Link> &mdash;
          install and make your first commit.
        </li>
        <li>
          <Link href="/ai/docs/concepts/addressing">Addressing</Link> &mdash;
          how content hashes make dedup and lineage work.
        </li>
        <li>
          <Link href="/ai">The AI overview</Link> and{" "}
          <Link href="/ai/benchmarks">benchmarks</Link>.
        </li>
      </ul>
    </div>
  );
}
