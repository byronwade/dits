import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Installation",
  description:
    "Install Dits via npm, bun, Homebrew, the curl script, or cargo. The AI install is identical to the engine binary.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Getting Started"
        title="Installation"
        description="One binary, five ways to get it &mdash; the same install you would use for the engine."
      />

      <p>
        There is no separate &ldquo;AI build.&rdquo; Dits for AI is the same{" "}
        <code>dits</code> binary as the engine, so the install steps below are
        identical to the <Link href="/docs/installation">engine guide</Link>.
        Pick whichever package manager you already use.
      </p>

      <h2>npm</h2>
      <CodeBlock code={`npm install -g @byronwade/dits`} language="bash" />

      <h2>bun</h2>
      <CodeBlock code={`bun install -g @byronwade/dits`} language="bash" />

      <h2>Homebrew</h2>
      <CodeBlock
        code={`brew tap byronwade/dits && brew install dits`}
        language="bash"
      />

      <h2>curl</h2>
      <p>The install script detects your platform and drops the binary on your path.</p>
      <CodeBlock
        code={`curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh`}
        language="bash"
      />

      <h2>cargo</h2>
      <p>If you have a Rust toolchain, build and install from source.</p>
      <CodeBlock code={`cargo install dits`} language="bash" />

      <h2>Verify</h2>
      <p>Confirm the install succeeded and print the version.</p>
      <CodeBlock code={`dits --version`} language="bash" />

      <Callout type="note">
        For platform-specific notes &mdash; supported architectures, shell
        completions, and troubleshooting &mdash; see{" "}
        <Link href="/docs/installation">the engine installation guide</Link>.
      </Callout>

      <h2>Next steps</h2>
      <ul>
        <li>
          <Link href="/ai/docs/getting-started">Quick start</Link> &mdash; your
          first versioned checkpoint.
        </li>
        <li>
          <Link href="/ai/docs/cli">CLI for AI</Link> &mdash; the day-to-day
          commands.
        </li>
        <li>
          <Link href="/docs/getting-started">Engine getting started</Link> for
          the general workflow.
        </li>
      </ul>
    </div>
  );
}
