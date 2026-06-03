import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Derivation & Recompute",
  description:
    "L3 derivation-addressing: store the recipe for reproducible artifacts instead of the artifact itself, and recompute on demand to trade storage for compute.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Core Concepts"
        title="Derivation & Recompute"
        description="When an artifact is reproducible, store the few-hundred-byte recipe instead of the terabytes of output."
      />

      <Callout type="warning">
        This is a <strong>roadmap and design topic</strong>, not a shipped
        feature. Today only L1 ships: exact content addressing, FastCDC
        deduplication, BLAKE3 hashing, and local history. Derivation-addressing
        (L3) is described here as planned design.
      </Callout>

      <h2>The cheapest byte is the one you never store</h2>
      <p>
        Dedup layers shrink what you store (see{" "}
        <Link href="/ai/docs/concepts/addressing">Addressing</Link>), but many
        of the heaviest AI artifacts do not need to be stored at all &mdash; they
        are <strong>deterministically reproducible</strong> from inputs you
        already track. For those, Dits can store the <strong>recipe</strong>{" "}
        rather than the result: source references, the transform, and its
        parameters, seed, and config. That is a few hundred bytes standing in for
        gigabytes or terabytes.
      </p>

      <h2>What a derivable looks like</h2>
      <ul>
        <li>
          <strong>A quantized model</strong> is derivable from its source
          checkpoint plus the quantization method and settings.
        </li>
        <li>
          <strong>A LoRA-merged model</strong> is just <code>base + recipe</code>{" "}
          &mdash; the base weights plus the adapter and merge parameters.
        </li>
        <li>
          <strong>A training checkpoint</strong> is reproducible from its data
          references, training config, and random seed.
        </li>
      </ul>

      <CodeBlock
        language="json"
        filename="conceptual: a derivation recipe (~hundreds of bytes)"
        code={`{
  "derive": "quantize",
  "source": "dits://model/llama-3-8b@blake3:ab12…",
  "params": { "method": "gptq", "bits": 4, "group_size": 128 },
  "seed": 0,
  "expected": "blake3:ef56…"
}`}
      />

      <h2>The storage-versus-compute tradeoff</h2>
      <p>
        Derivation trades <em>storage</em> for <em>compute</em>: you drop the
        bytes and pay to regenerate them when needed. That only makes sense if
        recomputation is actually available and reasonably cheap. Dits&apos;{" "}
        planned cloud compute layer is what executes recomputation &mdash;
        materializing a derivable on demand from its recipe, verifying the
        result, and caching it where useful.
      </p>

      <Callout type="important">
        A derivable is only safe to drop if its output is{" "}
        <strong>guaranteed reproducible</strong>. Nondeterminism &mdash; library
        or driver version drift, nondeterministic GPU kernels, unpinned
        randomness, floating-point reduction order &mdash; can make recompute
        return <em>different</em> bytes. Every recipe carries an{" "}
        <code>expected</code> content hash so a mismatch is detected, and the
        original is only discarded once determinism is pinned and verified.
      </Callout>

      <Callout type="tip">
        Sibling concepts: <Link href="/ai/docs/concepts/similarity">Similarity Dedup</Link>{" "}
        (store a small delta) and{" "}
        <Link href="/ai/docs/concepts/tensor-chunking">Tensor-Aware Chunking</Link>{" "}
        (diff in the tensor domain). See the{" "}
        <Link href="/ai/how-it-works">How it works</Link> overview and the{" "}
        <Link href="/ai/docs/roadmap">Roadmap</Link> for where this lands.
      </Callout>
    </div>
  );
}
