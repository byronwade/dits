import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { CodeBlock } from "@/components/ui/code-block";
import { Callout } from "@/components/ui/callout";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Getting Started with the Dits Local Alpha",
  description:
    "Install Dits from npm, create a safe local evaluation repository, commit files, inspect history, and verify a restored snapshot.",
  canonical: "https://dits.dev/docs/getting-started",
});

export default function GettingStartedPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Getting started"
        title="Evaluate Dits locally"
        description="Install the v0.1.5 alpha, create a disposable repository, record an exact snapshot, and verify that you can restore it."
      />

      <Callout type="warning" title="Do not use your only copy" className="not-prose my-6">
        Dits is alpha software. Use generated, disposable, or independently
        backed-up files. Network commands do not transfer repository data, so a
        remote-looking command is not a backup.
      </Callout>

      <h2>1. Install the published package</h2>

      <CodeBlock
        language="bash"
        code={`npm install -g @byronwade/dits
dits --version`}
      />

      <p>
        Node.js 16 or later is required by the package launcher. Bun, pnpm, and
        Yarn can install the same package. There is no published shell installer,
        Homebrew tap, or crates.io package.
      </p>

      <h2>2. Create a disposable workspace</h2>

      <CodeBlock
        language="bash"
        code={`mkdir dits-evaluation
cd dits-evaluation

printf 'first version\n' > notes.txt
mkdir assets
printf 'generated fixture\n' > assets/example.bin

dits init
dits status`}
      />

      <h2>3. Record the first snapshot</h2>

      <CodeBlock
        language="bash"
        code={`dits add .
dits commit -m "First exact snapshot"
dits log
dits status`}
      />

      <h2>4. Make and inspect a controlled change</h2>

      <CodeBlock
        language="bash"
        code={`printf 'second version\n' >> notes.txt
dits status
dits diff
dits add notes.txt
dits commit -m "Update notes"
dits log`}
      />

      <h2>5. Verify a restore</h2>

      <p>
        Record a standard operating-system hash before changing or removing a
        test file, check out the desired committed state, and compare the result.
        The exact checkout syntax can vary by the revision you are evaluating;
        confirm it in <Link href="/docs/cli-reference">the generated CLI reference</Link>.
      </p>

      <CodeBlock
        language="bash"
        code={`# Record expected hashes for the disposable fixture.
shasum -a 256 notes.txt assets/example.bin

# Inspect repository integrity and command help.
dits fsck
dits checkout --help`}
      />

      <Callout type="note" title="What to report" className="not-prose my-8">
        Include the Dits version, OS, architecture, filesystem, exact commands,
        expected and actual hashes, and the smallest redistributable fixture that
        reproduces a failure.
      </Callout>

      <h2>What not to try as a working workflow</h2>

      <p>
        Network <code>push</code>, <code>pull</code>, <code>fetch</code>,
        <code> sync</code>, network clone, and P2P are placeholders or design
        surfaces. They do not provide collaboration or backup today. FACR,
        photo-edit, proxy, and VFS paths are experimental and should be evaluated
        separately from the exact local-history core.
      </p>

      <p>
        Continue with <Link href="/docs/concepts">core concepts</Link>, the
        <Link href="/docs/roadmap"> status and roadmap</Link>, and
        <Link href="/docs/why-dits"> the evaluation trade-offs</Link>.
      </p>
    </div>
  );
}
