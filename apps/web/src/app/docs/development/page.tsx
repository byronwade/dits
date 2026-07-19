import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits Development Setup",
  description: "Build and test the current Dits Rust CLI and Next.js website workspace.",
  canonical: "https://dits.byronwade.com/docs/development",
});

export default function DevelopmentPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Community"
        title="Development setup"
        description="The root workspace contains the current Rust CLI, shared chunking core, website, and npm package. No database or server is required."
      />

      <Callout type="warning" title="Ignore the quarantined backend" className="not-prose my-6">
        <code>legacy/backend-crates</code> is historical research and is excluded
        from the root Cargo workspace. PostgreSQL, Redis, Docker Compose, and a
        Dits server are not prerequisites for current development.
      </Callout>

      <h2>Prerequisites</h2>
      <ul>
        <li>Rust stable, plus nightly rustfmt for the repository format check.</li>
        <li>Node.js 20 and npm.</li>
        <li>Git.</li>
        <li>FUSE development libraries only for optional all-feature VFS builds.</li>
      </ul>

      <h2>Build</h2>
      <pre><code>{`git clone https://github.com/byronwade/dits.git
cd dits
npm ci
cargo build --locked -p dits
npm --workspace apps/web run build`}</code></pre>

      <h2>Run locally</h2>
      <pre><code>{`cargo run --locked -p dits -- --help
npm --workspace apps/web run dev`}</code></pre>

      <h2>Verify</h2>
      <pre><code>{`cargo +nightly fmt --all -- --check
cargo +stable clippy --locked --all-targets --all-features -- -D warnings
cargo test --locked --workspace
npm --workspace apps/web run lint
npm --workspace apps/web run test:ci
bash scripts/check-cli-docs.sh
bash scripts/check-product-truth.sh`}</code></pre>

      <p>
        See <Link href="/docs/contributing">the contributing guide</Link> for
        correctness, format, evidence, and pull-request expectations.
      </p>
    </div>
  );
}
