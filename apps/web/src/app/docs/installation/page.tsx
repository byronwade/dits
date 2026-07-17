import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { CodeBlock } from "@/components/ui/code-block";
import { Callout } from "@/components/ui/callout";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Install Dits v0.1.5",
  description:
    "Install the Dits local alpha from the published npm package or build the Rust workspace from source.",
  canonical: "https://dits.dev/docs/installation",
});

export default function InstallationPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Getting started"
        title="Installation"
        description="The published npm package is the recommended path for evaluating Dits v0.1.5 on macOS, Linux, or Windows."
      />

      <Callout type="warning" title="Alpha software" className="not-prose my-6">
        Installation makes a local CLI available; it does not provide a hosted
        account, team remote, or backup. Protect important source data independently.
      </Callout>

      <h2>Install from npm</h2>

      <CodeBlock
        language="bash"
        code={`npm install -g @byronwade/dits
dits --version`}
      />

      <p>
        The package requires Node.js 16 or later and selects its packaged binary
        for the current platform. Equivalent package-manager commands are:
      </p>

      <CodeBlock
        language="bash"
        code={`bun install -g @byronwade/dits
pnpm install -g @byronwade/dits
yarn global add @byronwade/dits`}
      />

      <h2>Build the repository source</h2>

      <CodeBlock
        language="bash"
        code={`git clone https://github.com/byronwade/dits.git
cd dits
cargo build --release -p dits
./target/release/dits --version`}
      />

      <p>
        Building optional VFS functionality may require platform-specific FUSE
        dependencies. The default local CLI does not require a remote service.
      </p>

      <Callout type="important" title="Unavailable distribution methods" className="not-prose my-8">
        Dits does not currently publish an <code>install.sh</code>, Homebrew tap,
        or crates.io package. Old commands referencing those methods are invalid.
      </Callout>

      <h2>Verify the installation</h2>

      <CodeBlock
        language="bash"
        code={`dits --version
dits --help`}
      />

      <p>
        Next, follow the <Link href="/docs/getting-started">safe local evaluation</Link>.
        If the launcher fails, report the package version, Node version, operating
        system, architecture, and complete error output.
      </p>
    </div>
  );
}
