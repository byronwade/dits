import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "CLI for AI",
  description:
    "A compact reference of the day-to-day Dits commands for AI artifacts: init, add, commit, status, log, diff, checkout, branch, tag, restore, reset.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Reference"
        title="CLI for AI"
        description="The same engine commands you already know, pointed at checkpoints and datasets."
      />

      <p>
        There is no AI-specific command set. Every command below comes straight
        from the shared engine and operates on your model artifacts exactly as
        it would on any other file. This page is the fast lookup; the{" "}
        <Link href="/docs/cli-reference">full engine CLI reference</Link>{" "}
        documents every flag.
      </p>

      <h2>Everyday commands</h2>
      <ul>
        <li>
          <code>init</code> &mdash; create a repository in the current
          directory.
        </li>
        <li>
          <code>add</code> &mdash; stage an artifact; chunks and stores it by
          content hash.
        </li>
        <li>
          <code>commit</code> &mdash; record the staged state as a new version.
        </li>
        <li>
          <code>status</code> &mdash; show what is staged, modified, or
          untracked.
        </li>
        <li>
          <code>log</code> &mdash; list the commit history.
        </li>
        <li>
          <code>diff</code> &mdash; show what changed between versions.
        </li>
        <li>
          <code>checkout</code> &mdash; reconstruct a commit&apos;s artifacts,
          byte-exact.
        </li>
        <li>
          <code>branch</code> &mdash; create or list branches for parallel runs.
        </li>
        <li>
          <code>tag</code> &mdash; name a commit, e.g. a release checkpoint.
        </li>
        <li>
          <code>restore</code> &mdash; restore specific paths from a commit.
        </li>
        <li>
          <code>reset</code> &mdash; move the current branch or unstage changes.
        </li>
      </ul>

      <h2>A typical session</h2>
      <CodeBlock
        code={`dits init
dits add model.safetensors
dits commit -m "baseline"
dits status
dits log
dits diff
dits branch lora-experiment
dits tag v1.0
dits checkout <commit>
dits restore model.safetensors
dits reset --soft HEAD~1`}
        language="bash"
      />

      <Callout type="warning">
        Networked sync is not here yet. <code>push</code>, <code>pull</code>,
        and <code>fetch</code> are on the{" "}
        <Link href="/ai/docs/roadmap">roadmap</Link> &mdash; every command above
        runs locally only.
      </Callout>

      <h2>Related</h2>
      <ul>
        <li>
          <Link href="/docs/cli-reference">Full engine CLI reference</Link>{" "}
          &mdash; every command and flag.
        </li>
        <li>
          <Link href="/ai/docs/getting-started">Quick start</Link> and{" "}
          <Link href="/ai/docs/workflows/checkpoints">checkpoint workflow</Link>.
        </li>
        <li>
          <Link href="/ai/docs/concepts/addressing">Addressing</Link> &mdash;
          what <code>add</code> and <code>commit</code> do under the hood.
        </li>
      </ul>
    </div>
  );
}
