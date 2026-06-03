import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "An honest status of Dits for AI: what works today, what is in progress, and what is planned across the L2/L3 addressing layers.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Reference"
        title="Roadmap"
        description="Where Dits is today and where it is going &mdash; stated plainly, with no shipped-vs-planned ambiguity."
      />

      <Callout type="important">
        This page draws a hard line between what runs on your machine today and
        what is still being built. If a capability is not under &ldquo;Working
        today,&rdquo; do not depend on it yet.
      </Callout>

      <h2>Working today</h2>
      <ul>
        <li>Content-addressed store with BLAKE3 verification of every chunk.</li>
        <li>
          FastCDC chunking with exact deduplication &mdash; identical chunks are
          stored once.
        </li>
        <li>Byte-exact reconstruction of any committed artifact.</li>
        <li>
          Local history: <code>commit</code>, <code>checkout</code>,{" "}
          <code>diff</code>, <code>log</code>, and <code>branch</code>.
        </li>
      </ul>
      <p>
        See <Link href="/ai/docs/concepts/content-addressing">content addressing</Link>{" "}
        and <Link href="/ai/docs/concepts/addressing">addressing</Link> for how
        these pieces fit together.
      </p>

      <h2>In progress</h2>
      <ul>
        <li>
          <Link href="/ai/docs/concepts/tensor-chunking">
            Tensor-aware chunking
          </Link>{" "}
          &mdash; aligning chunk boundaries to tensor structure so weight edits
          dedup more cleanly than raw byte CDC allows.
        </li>
      </ul>

      <h2>Planned</h2>
      <ul>
        <li>
          Networked delta sync &mdash; <code>push</code>, <code>pull</code>, and{" "}
          <code>fetch</code> that transfer only the chunks a remote is missing.
        </li>
        <li>
          Similarity dedup (L2) &mdash; storing near-identical artifacts as
          deltas against a similar base, not just exact-match chunks.
        </li>
        <li>
          Derivation and recompute (L3) &mdash; describing an artifact as a
          recipe over its inputs so it can be regenerated instead of stored.
        </li>
      </ul>

      <h2>Related</h2>
      <ul>
        <li>
          <Link href="/ai/benchmarks">Benchmarks</Link> &mdash; measured dedup
          and storage numbers for what ships today.
        </li>
        <li>
          <Link href="/ai/how-it-works">How it works</Link> and the{" "}
          <Link href="/ai/docs">AI docs index</Link>.
        </li>
        <li>
          <Link href="/ai/docs/why-dits">Why Dits for AI</Link> &mdash; the
          motivation behind the L2/L3 direction.
        </li>
      </ul>
    </div>
  );
}
