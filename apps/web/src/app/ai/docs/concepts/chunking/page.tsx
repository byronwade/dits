import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Chunking & Deduplication",
  description:
    "FastCDC content-defined chunking picks boundaries by content, so edits only disturb nearby chunks and unchanged data dedups exactly.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Core Concepts"
        title="Chunking & Deduplication"
        description="Dits splits files where the content says to, not on a fixed grid &mdash; so an edit changes a few chunks instead of all of them."
      />

      <p>
        Before anything gets a content address, a file has to be split into
        pieces. <em>How</em> you split matters enormously. Fixed-size blocks
        seem obvious, but they have a fatal flaw for versioned data: insert a
        single byte near the front and every block boundary after it shifts, so
        every downstream block changes and nothing dedups.
      </p>

      <h2>Content-defined chunking with FastCDC</h2>
      <p>
        Dits uses FastCDC, a content-defined chunker. Instead of cutting every N
        bytes, it slides a rolling hash across the data and places a boundary
        wherever the content hits a chosen pattern. Boundaries are anchored to
        the bytes around them, not to absolute offsets.
      </p>
      <p>
        The payoff is <strong>boundary-shift resilience</strong>. Insert or
        append data and only the chunks near the change are affected &mdash; the
        boundaries before and after re-sync to the same content-defined cut
        points, so the surrounding chunks keep their old addresses and dedup
        against what you already stored.
      </p>
      <CodeBlock
        language="bash"
        code={`# Fixed-size blocks: insert near the start shifts every later boundary
original:  [AAAA][BBBB][CCCC][DDDD]
+1 byte:   [xAAA][ABBB][BCCC][CDDD]   # all 4 blocks now differ

# FastCDC: boundaries follow content, so they re-sync after the edit
original:  [AAAA]|[BBBB]|[CCCC]|[DDDD]
+1 byte:   [xAAAA]|[BBBB]|[CCCC]|[DDDD]   # only the first chunk differs`}
      />

      <h2>Where exact dedup wins for AI today</h2>
      <p>
        Combined with{" "}
        <Link href="/ai/docs/concepts/content-addressing">content addressing</Link>,
        FastCDC chunks that did not change are stored exactly once. This is real,
        shipping behavior (layer L1 of{" "}
        <Link href="/ai/docs/concepts/addressing">Three-Layer Addressing</Link>),
        and it pays off whenever artifacts share large unchanged regions:
      </p>
      <ul>
        <li>
          <strong>Base model vs. fine-tune</strong> &mdash; a fine-tune that
          touches some tensors and leaves the rest byte-identical shares every
          untouched chunk with the base.
        </li>
        <li>
          <strong>Model vs. quantized or LoRA variant</strong> &mdash; where
          regions are preserved verbatim, those chunks dedup instead of
          duplicating.
        </li>
        <li>
          <strong>Shared dataset shards</strong> &mdash; datasets that reuse the
          same shards across versions store each shared shard once.
        </li>
        <li>
          <strong>Appended data</strong> &mdash; logs, growing corpora, and
          checkpointed datasets where new data is added at the end keep all the
          earlier chunks.
        </li>
      </ul>

      <Callout type="warning">
        <strong>The weak spot: consecutive training checkpoints.</strong> Between
        two adjacent checkpoints, the optimizer nudges floats <em>throughout</em>{" "}
        the weight tensors. Those tiny, diffuse updates change bytes nearly
        everywhere, so byte-level FastCDC finds almost no shared chunks and dedup
        collapses to near zero. The roadmap fix is{" "}
        <Link href="/ai/docs/concepts/tensor-chunking">Tensor-Aware Chunking</Link>,
        which aligns boundaries to tensor structure instead of byte patterns.
      </Callout>

      <Callout type="note">
        The chunking algorithm here is the same one in the engine. For the full
        reference &mdash; parameters, boundary masks, and the rolling-hash
        details &mdash; see{" "}
        <Link href="/docs/concepts/chunking">the engine reference</Link>.
      </Callout>
    </div>
  );
}
