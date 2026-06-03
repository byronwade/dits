import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Versioning Checkpoints",
  description:
    "Give training checkpoints real version history with dits instead of a sprawl of ckpt-step-1000.safetensors files in one folder.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Workflows"
        title="Versioning Checkpoints"
        description="Replace ckpt-step sprawl with a real, navigable history of every checkpoint your run produces."
      />

      <p>
        A long training run leaves behind dozens of weight files &mdash;
        <code>ckpt-step-1000.safetensors</code>, <code>ckpt-step-1500.safetensors</code>,
        and so on &mdash; piled into a single output directory. You lose track of
        which one was best, what changed between them, and why you kept any of
        them. Treating the run&apos;s output directory as a <code>dits</code>{" "}
        repository turns that pile into commit history you can navigate.
      </p>

      <p>
        New to the engine? Start with{" "}
        <Link href="/ai/docs/getting-started">Getting Started</Link>, and skim{" "}
        <Link href="/ai/docs/concepts/chunking">Chunking</Link> to understand how
        large files are stored as deduplicated content chunks.
      </p>

      <h2>Initialize the run directory</h2>
      <p>
        Run <code>dits init</code> wherever your trainer writes checkpoints. From
        then on, each checkpoint becomes a commit instead of a new filename.
      </p>

      <CodeBlock
        language="bash"
        code={`cd runs/llama-sft-2026-06
dits init

# After your trainer saves the first checkpoint:
dits add model.safetensors
dits status
dits commit -m "step 1000: lr 2e-5, loss 1.84"`}
      />

      <h2>Commit each checkpoint</h2>
      <p>
        Keep the filename stable (for example always <code>model.safetensors</code>)
        and let commits carry the version. Repeat after every save so the message
        records the step, hyperparameters, and metrics that matter.
      </p>

      <CodeBlock
        language="bash"
        code={`dits add model.safetensors
dits commit -m "step 1500: loss 1.71"

dits add model.safetensors
dits commit -m "step 2000: loss 1.63 (best so far)"`}
      />

      <h2>Inspect history</h2>
      <p>
        Use <code>dits log</code> to see the full checkpoint timeline, and{" "}
        <code>dits diff</code> to see which underlying chunks changed between two
        checkpoints &mdash; a quick signal for how much the weights moved.
      </p>

      <CodeBlock
        language="bash"
        code={`dits log
dits diff <prev-commit> <this-commit>`}
      />

      <h2>Restore a past checkpoint</h2>
      <p>
        When a later step overfits, roll back to the best one. Check out the
        commit and your <code>model.safetensors</code> is restored to that exact
        state &mdash; ready to resume or export.
      </p>

      <CodeBlock
        language="bash"
        code={`# Restore the working tree to a specific checkpoint
dits checkout <commit>

# Or branch off it to explore a different schedule
dits branch resume-from-2000`}
      />

      <Callout type="warning">
        Consecutive checkpoints often differ in nearly every byte, so today&apos;s
        byte-level chunking dedupes them only modestly &mdash; each commit can be
        close to a full copy. Tensor-aware chunking, which aligns boundaries to
        the tensor layout for far better dedup between adjacent steps, is on the
        roadmap. See{" "}
        <Link href="/ai/docs/concepts/tensor-chunking">Tensor Chunking</Link>.
      </Callout>

      <Callout type="note">
        Everything above is local. Sharing checkpoints across machines via{" "}
        <code>dits push</code> / <code>dits pull</code> is on the roadmap and not
        available yet &mdash; for now, commit history lives in the run directory
        itself.
      </Callout>

      <h2>Related</h2>
      <ul>
        <li>
          <Link href="/ai/docs/workflows/datasets">Versioning Datasets</Link>
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
