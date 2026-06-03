import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Similarity Dedup",
  description:
    "L2 similarity-addressing: fingerprint a chunk, find the closest existing one via approximate nearest neighbor, and store a small delta against that anchor.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Core Concepts"
        title="Similarity Dedup"
        description="Storing near-duplicate data once, by addressing chunks with a perceptual or semantic fingerprint instead of an exact hash."
      />

      <Callout type="warning">
        This is a <strong>roadmap and design topic</strong>, not a shipped
        feature. Today only L1 ships: exact content addressing, FastCDC
        deduplication, BLAKE3 hashing, and local history. Similarity-addressing
        (L2) is described here as planned design.
      </Callout>

      <h2>Where exact hashing leaves value on the table</h2>
      <p>
        Exact content addressing (see{" "}
        <Link href="/ai/docs/concepts/addressing">Addressing</Link>) dedupes only
        byte-identical chunks. Flip a single bit and the BLAKE3 hash is
        completely different, so the chunk is stored again in full. For most
        code and text that is fine &mdash;{" "}
        <Link href="/ai/docs/concepts/chunking">content-defined chunking</Link>{" "}
        already isolates the edits.
      </p>
      <p>
        AI datasets are different. They are saturated with{" "}
        <strong>near-duplicates</strong>: augmentations of the same image, web
        scrapes that re-host the same article, lightly edited prompts, resized or
        re-encoded media. These are <em>almost</em> the same, never identical, so
        exact-match hashing stores every variant at full size.
      </p>

      <h2>Address by fingerprint, not by exact hash</h2>
      <p>
        L2 addresses a chunk by a <strong>similarity fingerprint</strong> &mdash;
        a compact descriptor where near-duplicate inputs produce nearby
        descriptors:
      </p>
      <ul>
        <li>
          <strong>MinHash / SimHash</strong> for byte-ish and textual data,
          capturing token-set or shingle overlap.
        </li>
        <li>
          <strong>Perceptual hashes</strong> for media, robust to resize,
          re-encode, and minor edits.
        </li>
        <li>
          <strong>Embeddings</strong> for samples, placing semantically similar
          items close in vector space.
        </li>
      </ul>

      <h2>Anchor plus delta</h2>
      <p>
        On write, the fingerprint is looked up in an{" "}
        <strong>approximate nearest neighbor (ANN)</strong> index to find the
        closest chunk already stored &mdash; the <em>anchor</em>. If a close
        enough match exists, Dits stores only a small <strong>delta</strong>{" "}
        against that anchor instead of the whole chunk. The original is
        reconstructed by applying the delta to the anchor at read time.
      </p>

      <CodeBlock
        language="text"
        filename="conceptual: similarity write path"
        code={`incoming chunk
  → fingerprint  (minhash / phash / embedding)
  → ANN index lookup
      ├─ no neighbor within threshold → store chunk in full (becomes a new anchor)
      └─ neighbor found (anchor A)    → store delta(A → chunk)  ← small
read: chunk = apply(delta, anchor A)`}
      />

      <Callout type="note">
        The ANN index is <em>approximate</em> on purpose: an exact nearest-neighbor
        search over billions of chunks is intractable, and we only need a
        <em> good enough</em> anchor for the delta to be small. A missed match
        just means storing one extra full chunk &mdash; never a correctness bug,
        since reconstruction is always verified against an exact hash.
      </Callout>

      <Callout type="tip">
        Related directions: tensor-domain diffs in{" "}
        <Link href="/ai/docs/concepts/tensor-chunking">Tensor-Aware Chunking</Link>{" "}
        and recompute-instead-of-store in{" "}
        <Link href="/ai/docs/concepts/derivation">Derivation &amp; Recompute</Link>.
        See the <Link href="/ai/docs/roadmap">Roadmap</Link> for sequencing and
        the <Link href="/ai/how-it-works">How it works</Link> overview.
      </Callout>
    </div>
  );
}
