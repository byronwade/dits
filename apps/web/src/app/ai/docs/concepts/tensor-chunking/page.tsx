import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Tensor-Aware Chunking",
  description:
    "Why byte-level dedup struggles between consecutive model checkpoints, and how tensor-aware chunking would chunk and diff in the tensor domain instead.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Core Concepts"
        title="Tensor-Aware Chunking"
        description="Treating model weights as the float tensors they are, instead of as an opaque blob of bytes."
      />

      <Callout type="warning">
        This is a <strong>roadmap and design topic</strong>, not a shipped
        feature. Today only L1 ships: exact content addressing, FastCDC
        deduplication, BLAKE3 hashing, and local history. Everything below
        describes where tensor-aware addressing is headed.
      </Callout>

      <h2>The honest weak spot of byte-level dedup</h2>
      <p>
        Content-defined chunking (see{" "}
        <Link href="/ai/docs/concepts/chunking">Chunking</Link>) shines when
        edits are <em>local</em>: insert a paragraph, append a row, patch a
        function, and only the chunks around that edit change. Everything else
        stays byte-identical and dedupes for free.
      </p>
      <p>
        Model weights break that assumption. Weights are arrays of floats, and a
        single gradient step nudges <em>almost every</em> parameter by a tiny
        amount. The change is <strong>diffuse</strong>, not local &mdash; the
        bytes shift <em>everywhere</em> at once. That is precisely the case
        content-defined chunking is worst at, because no stable byte boundaries
        survive between one checkpoint and the next.
      </p>

      <Callout type="note">
        Byte-CDC still wins big <em>across</em> related models &mdash; a
        fine-tune versus its base, or sibling variants that share frozen layers
        &mdash; because large contiguous regions stay identical. The weak case is
        specifically <strong>consecutive training checkpoints</strong> of the
        same run.
      </Callout>

      <h2>What tensor-aware chunking would do</h2>
      <p>
        Instead of feeding raw bytes to FastCDC, a tensor-aware path would parse
        the tensor container &mdash; a <code>safetensors</code> file, for example
        &mdash; and use its dtype and shape metadata to make smarter decisions:
      </p>
      <ul>
        <li>
          <strong>Per-tensor chunking.</strong> Split on tensor boundaries so
          each weight matrix is addressed independently; an unchanged embedding
          table or frozen layer dedupes whole, regardless of churn elsewhere.
        </li>
        <li>
          <strong>Dtype/shape-aware boundaries.</strong> Align chunk cuts to
          element and row strides rather than arbitrary byte offsets, so a
          re-quantization or a layout change does not desynchronize every
          downstream chunk.
        </li>
        <li>
          <strong>Tensor-domain diffs.</strong> Compute deltas between
          checkpoints in the numeric domain &mdash; structured or low-rank
          residuals, or quantized deltas &mdash; and store only the compact
          difference, not a fresh copy of bytes that all moved a little.
        </li>
      </ul>

      <CodeBlock
        language="text"
        filename="conceptual: per-tensor addressing"
        code={`checkpoint_1000.safetensors
  ├─ model.embed.weight   → blake3:ab12…  (unchanged → dedupes)
  ├─ model.layers.0.mlp    → blake3:cd34…  (diffuse change)
  └─ …
checkpoint_1001.safetensors
  ├─ model.embed.weight   → blake3:ab12…  (same address, 0 bytes stored)
  └─ model.layers.0.mlp    → delta(cd34… → ef56…)  (low-rank residual only)`}
      />

      <h2>Prior art</h2>
      <p>
        This is an active investment area in the ecosystem. Hugging Face&apos;s
        Xet storage layer leans into chunk-level dedup for model and dataset
        repos, and the broader push toward tensor-structure-aware storage is
        exactly the direction this concept generalizes.
      </p>

      <Callout type="tip">
        For the bigger picture of how addressing layers stack, see{" "}
        <Link href="/ai/docs/concepts/addressing">Addressing</Link> and the{" "}
        <Link href="/ai/how-it-works">How it works</Link> overview. Sequencing
        lives on the <Link href="/ai/docs/roadmap">Roadmap</Link>.
      </Callout>
    </div>
  );
}
