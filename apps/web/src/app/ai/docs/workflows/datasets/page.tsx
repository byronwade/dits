import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Versioning Datasets",
  description:
    "Snapshot large, evolving training sets with dits and dedupe shared shards across versions instead of copying terabytes per revision.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Workflows"
        title="Versioning Datasets"
        description="Snapshot an evolving training set as commits, and let dedup keep unchanged shards from being stored twice."
      />

      <p>
        Training data is rarely static. You add a batch of samples, fix some
        labels, drop a bad shard, and suddenly you have <code>data-v1/</code>,{" "}
        <code>data-v2-final/</code>, and <code>data-v2-final-REAL/</code> sitting
        side by side, each a near-complete copy of the last. Versioning the
        directory with <code>dits</code> gives you one history and stores only
        what actually changed.
      </p>

      <p>
        If you have not set up the engine yet, see{" "}
        <Link href="/ai/docs/getting-started">Getting Started</Link>. The dedup
        behavior below follows directly from how{" "}
        <Link href="/ai/docs/concepts/chunking">Chunking</Link> works.
      </p>

      <h2>Snapshot a version</h2>
      <p>
        Initialize once, then commit each revision of the dataset. The message is
        your changelog &mdash; record what was added, removed, or relabeled.
      </p>

      <CodeBlock
        language="bash"
        code={`cd datasets/instruct-mix
dits init

dits add data/
dits commit -m "v1: 1.2M samples, 8 shards"

# Later, after appending a new batch:
dits add data/
dits commit -m "v2: + 40k samples, fixed 300 labels"`}
      />

      <h2>Compare versions</h2>
      <p>
        Use <code>dits log</code> for the version timeline and <code>dits diff</code>{" "}
        to see which shards changed between two revisions &mdash; useful when you
        need to know exactly what entered a given training run.
      </p>

      <CodeBlock
        language="bash"
        code={`dits log
dits diff <v1-commit> <v2-commit>`}
      />

      <h2>What dedupes well today</h2>
      <p>
        Additive changes are the sweet spot. When v2 appends new shards and leaves
        the existing ones byte-for-byte identical, those shared shards are stored
        once and referenced by both commits &mdash; v2 only costs you the genuinely
        new data. The same holds across shards that repeat identical content.
      </p>

      <Callout type="tip">
        Keep shard files stable. If your pipeline rewrites or re-shuffles every
        shard on each export, the bytes change even when the samples don&apos;t,
        and dedup can&apos;t see the overlap. Append new shards rather than
        rewriting old ones.
      </Callout>

      <h2>What does not dedupe yet</h2>
      <p>
        Exact-match chunking treats a near-duplicate as a brand-new file. Two
        augmentations of the same image, or a sample with one token changed, share
        almost everything semantically but differ in bytes &mdash; so today they
        are stored in full, twice.
      </p>

      <Callout type="warning">
        Near-duplicate samples (augmentations, lightly edited records) do{" "}
        <strong>not</strong> dedupe with exact-match chunking. Similarity-based
        dedup that collapses near-duplicates is on the roadmap &mdash; see{" "}
        <Link href="/ai/docs/concepts/similarity">Similarity Dedup</Link>.
      </Callout>

      <Callout type="note">
        Pushing a dataset repository to shared storage via <code>dits push</code>{" "}
        is on the roadmap and not available yet. For now, dataset history lives in
        the dataset directory.
      </Callout>

      <h2>Related</h2>
      <ul>
        <li>
          <Link href="/ai/docs/workflows/checkpoints">Versioning Checkpoints</Link>
        </li>
        <li>
          <Link href="/ai/docs/workflows/variants">Fine-Tunes &amp; Variants</Link>
        </li>
        <li>
          <Link href="/docs/cli-reference">CLI Reference</Link> (shared engine)
        </li>
      </ul>
    </div>
  );
}
