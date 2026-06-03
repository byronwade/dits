import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Three-Layer Addressing",
  description:
    "How Dits addresses AI data three ways: exact (works today), similar, and derived (roadmap) to push dedup past the byte-identical ceiling.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Core Concepts"
        title="Three-Layer Addressing"
        description={"Every other tool stores your data by the hash of its bytes. Dits adds two more ways to ask “have I seen this before?”"}
      />

      <p>
        Almost every storage and version-control system addresses data the same
        way: hash the bytes, and use that hash as the address. It is simple, it
        is fast, and it is exactly the problem. Byte-identical is the ceiling.
        Two artifacts that are 99% the same but not byte-for-byte identical
        share <em>nothing</em> &mdash; they are stored twice, transferred twice,
        and reasoned about as if they were unrelated.
      </p>
      <p>
        For AI data this ceiling is brutal. A fine-tune, a quantized variant, a
        LoRA adapter, the next training checkpoint &mdash; each is a small
        perturbation of something you already have, yet exact-match addressing
        treats every one as brand new. Dits attacks this with three layers of
        addressing, each one catching what the layer below it misses.
      </p>

      <h2>L1 &mdash; Exact (BLAKE3 of the bytes)</h2>
      <p>
        The foundation: every chunk is named by the BLAKE3 hash of its content.
        Same bytes produce the same address, so identical content is stored
        exactly once, and every read is verified against its hash &mdash;
        corruption is detected, never returned silently.
      </p>
      <p>
        <strong>Status: working today.</strong> Content-addressed object store,
        FastCDC chunking, exact deduplication, and byte-exact reconstruction all
        ship in L1. This is the bedrock the other layers build on. See{" "}
        <Link href="/ai/docs/concepts/content-addressing">Content Addressing</Link>{" "}
        and{" "}
        <Link href="/ai/docs/concepts/chunking">Chunking &amp; Deduplication</Link>.
      </p>
      <p>
        Where it wins: shared dataset shards, a base model versus a fine-tune
        that left most tensors untouched, and any data that is appended to over
        time. Where it stops: anything that is <em>nearly</em> the same but not
        identical.
      </p>

      <h2>L2 &mdash; Similar (fingerprint, then store the delta)</h2>
      <p>
        L2 computes a perceptual or semantic fingerprint for a chunk, finds the
        nearest chunk already stored, and keeps only the delta against it. This
        catches near-duplicates that L1 cannot see: two quantizations of the
        same weights, an adapter that nudges a handful of layers, a dataset with
        a few thousand rows changed.
      </p>
      <Callout type="warning">
        <strong>Roadmap, not shipped.</strong> Similarity-addressing is a
        planned layer. Today Dits dedups exact chunks only; near-duplicates are
        stored in full. Read the design in{" "}
        <Link href="/ai/docs/concepts/similarity">Similarity Addressing</Link>.
      </Callout>

      <h2>L3 &mdash; Derived (store the recipe, recompute the artifact)</h2>
      <p>
        Some artifacts do not need to be stored at all. If a file is the
        deterministic output of a known process &mdash; a quantization pass, a
        tokenization, a format conversion &mdash; L3 stores the <em>recipe</em>{" "}
        instead of the bytes and recomputes the artifact on demand. A derivable
        gigabyte costs zero bytes plus a recipe.
      </p>
      <Callout type="warning">
        <strong>Roadmap, not shipped.</strong> Derivation and recompute are a
        planned layer and not part of the current engine. Details in{" "}
        <Link href="/ai/docs/concepts/derivation">Derivation</Link>.
      </Callout>

      <h2>How the layers stack</h2>
      <ul>
        <li>
          <strong>L1 (today)</strong> &mdash; identical bytes free. The honest
          floor you can rely on right now.
        </li>
        <li>
          <strong>L2 (roadmap)</strong> &mdash; near-identical bytes nearly
          free, via fingerprint plus delta.
        </li>
        <li>
          <strong>L3 (roadmap)</strong> &mdash; derivable bytes free entirely,
          via stored recipe.
        </li>
      </ul>
      <p>
        Each layer is a strictly larger net. L1 is the only one shipping today,
        and it already changes the economics of storing model and dataset
        lineage. L2 and L3 are where the addressing model is headed.
      </p>

      <Callout type="note">
        Go deeper on each layer:{" "}
        <Link href="/ai/docs/concepts/tensor-chunking">Tensor-Aware Chunking</Link>,{" "}
        <Link href="/ai/docs/concepts/similarity">Similarity Addressing</Link>, and{" "}
        <Link href="/ai/docs/concepts/derivation">Derivation</Link>.
      </Callout>
    </div>
  );
}
