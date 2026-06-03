import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Quick Start",
  description:
    "The fastest path from install to your first versioned checkpoint with Dits: init, add, commit, status, log, diff, and checkout.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Getting Started"
        title="Quick Start"
        description="Init a repo, commit a checkpoint, and inspect its history &mdash; all locally, in a few commands."
      />

      <h2>1. Install</h2>
      <p>
        Dits ships as a single binary. If you have not installed it yet, follow
        the <Link href="/ai/docs/installation">installation guide</Link> (it is
        identical to the <Link href="/docs/installation">engine install</Link>),
        then confirm it is on your path.
      </p>
      <CodeBlock code={`dits --version`} language="bash" />

      <h2>2. Initialize and commit a checkpoint</h2>
      <p>
        Create a repository in the directory that holds your artifact, stage the
        file, and commit it. The first commit is your baseline.
      </p>
      <CodeBlock
        code={`dits init
dits add model.safetensors
dits commit -m "baseline"`}
        language="bash"
      />
      <p>
        On <code>add</code>, Dits chunks the file with FastCDC and stores each
        unique chunk by its BLAKE3 hash. Re-committing a lightly-changed
        checkpoint only stores the chunks that actually differ.
      </p>

      <h2>3. Inspect status and history</h2>
      <p>
        After making changes &mdash; say, a new training run overwrites{" "}
        <code>model.safetensors</code> &mdash; check what moved, commit again,
        and review the log.
      </p>
      <CodeBlock
        code={`dits status
dits add model.safetensors
dits commit -m "epoch 10"
dits log`}
        language="bash"
      />

      <h2>4. Diff and check out earlier versions</h2>
      <p>
        Compare any two points in history, then restore an earlier checkpoint by
        its commit id. Reconstruction is byte-exact.
      </p>
      <CodeBlock
        code={`dits diff
dits checkout <commit>`}
        language="bash"
      />

      <Callout type="note">
        Everything on this page works today and runs entirely on your machine.
        Networked sync &mdash; <code>push</code>, <code>pull</code>, and{" "}
        <code>fetch</code> &mdash; is on the{" "}
        <Link href="/ai/docs/roadmap">roadmap</Link>, so for now share artifacts
        by copying the repository.
      </Callout>

      <h2>Next steps</h2>
      <ul>
        <li>
          <Link href="/ai/docs/workflows/checkpoints">Checkpoint workflow</Link>{" "}
          &mdash; a fuller loop for iterating on a model.
        </li>
        <li>
          <Link href="/ai/docs/concepts/addressing">Addressing</Link> &mdash;
          why content hashes give you dedup and lineage for free.
        </li>
        <li>
          <Link href="/ai/docs/cli">CLI for AI</Link> and the{" "}
          <Link href="/docs/cli-reference">full engine CLI reference</Link>.
        </li>
      </ul>
    </div>
  );
}
