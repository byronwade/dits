import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Fine-Tunes & Variants",
  description:
    "Manage base models, fine-tunes, LoRAs, and quantized variants with dits — the strongest dedup fit, since variants mostly reference the base's chunks.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Workflows"
        title="Fine-Tunes & Variants"
        description="Base models, fine-tunes, LoRAs, and quantized variants share structure — making them the strongest fit for dedup today."
      />

      <p>
        A single base model spawns a whole family: a customer-support fine-tune, a
        coding fine-tune, a couple of LoRA adapters, and an int8 quantization for
        serving. Stored naively that is many full copies. Because each variant
        shares most of its structure with the base, this is where{" "}
        <code>dits</code> dedup pays off hardest &mdash; a fine-tune mostly
        references the base&apos;s existing chunks.
      </p>

      <p>
        See <Link href="/ai/docs/getting-started">Getting Started</Link> for setup,
        and <Link href="/ai/docs/concepts/chunking">Chunking</Link> for why shared
        structure means shared storage.
      </p>

      <h2>Organize the family</h2>
      <p>
        Two common layouts. Use a branch per variant in one repo when they descend
        from a shared base, or keep one repo per variant if their lifecycles
        diverge. Branches keep the relationship explicit and dedup naturally
        across the whole repository.
      </p>

      <CodeBlock
        language="bash"
        code={`cd models/llama-8b
dits init

# Commit the base weights first
dits add model.safetensors
dits commit -m "base: llama-8b release weights"

# Branch off the base for each variant
dits branch ft-customer
dits checkout ft-customer`}
      />

      <h2>Commit a fine-tune</h2>
      <p>
        On the variant branch, drop in the fine-tuned weights and commit. Most
        chunks are identical to the base, so the new commit stores only the parts
        the fine-tune actually moved.
      </p>

      <CodeBlock
        language="bash"
        code={`# Replace weights with the fine-tuned output, then:
dits add model.safetensors
dits commit -m "ft-customer: 3 epochs on support transcripts"

dits log
dits diff main ft-customer`}
      />

      <p>
        LoRA adapters fit the same pattern: commit the small adapter files on their
        own branch. Tag a variant when it ships so you can find it later.
      </p>

      <CodeBlock
        language="bash"
        code={`dits add adapter_model.safetensors
dits commit -m "lora-rank16: customer tone adapter"
dits tag v1-customer-lora`}
      />

      <Callout type="tip">
        Fine-tunes and LoRAs that branch from a committed base are the best-case
        dedup scenario today &mdash; the variant&apos;s commit is dominated by
        references to chunks the base already contributed.
      </Callout>

      <h2>Derivable variants</h2>
      <p>
        Some variants are deterministic functions of another artifact: an int8
        quantization is computable from the fp16 weights, and a merged LoRA is
        computable from base plus adapter. Storing these in full is redundant when
        the recipe could regenerate them.
      </p>

      <Callout type="warning">
        Quantized and merged-LoRA variants are candidates for{" "}
        <strong>recompute</strong> &mdash; storing the recipe instead of the bytes
        and regenerating on demand. That capability is on the roadmap, not
        available today. See{" "}
        <Link href="/ai/docs/concepts/derivation">Derivation &amp; Recompute</Link>.
      </Callout>

      <Callout type="note">
        Sharing a variant repository across machines via <code>dits push</code> is
        on the roadmap. For now, the branch and tag history stays local to the
        model directory.
      </Callout>

      <h2>Related</h2>
      <ul>
        <li>
          <Link href="/ai/docs/workflows/checkpoints">Versioning Checkpoints</Link>
        </li>
        <li>
          <Link href="/ai/docs/workflows/datasets">Versioning Datasets</Link>
        </li>
        <li>
          <Link href="/ai/docs/concepts/similarity">Similarity Dedup</Link>
        </li>
        <li>
          <Link href="/docs/cli-reference">CLI Reference</Link> (shared engine)
        </li>
      </ul>
    </div>
  );
}
