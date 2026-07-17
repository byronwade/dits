import { Metadata } from "next";
import Link from "next/link";
import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits Remote Commands - Alpha Status",
  description:
    "Current alpha behavior for Dits remote configuration, local clone, and disabled transfer commands.",
  canonical: "https://dits.dev/docs/cli/remotes",
});

export default function RemoteCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="CLI Reference"
        title="Remote commands: alpha status"
        description="Remote configuration is available, local-path clone works, and repository transfer is disabled."
      />

      <Callout type="warning" title="Transfer commands fail closed" className="not-prose my-6">
        <code>push</code>, <code>pull</code>, <code>fetch</code>, and <code>sync</code>{" "}
        return a nonzero exit status for both local-path and network remotes. They do
        not transfer data or change the repository.
      </Callout>

      <h2>Remote configuration</h2>
      <p>
        You can store and inspect remote names and URLs. This configuration does not
        make transfer commands operational.
      </p>
      <CodeBlock
        language="bash"
        code={`dits remote add origin /path/to/another-repository
dits remote list
dits remote get-url origin
dits remote set-url origin /new/local/path
dits remote rename origin archive
dits remote remove archive`}
      />
      <p>
        Configuration is stored as JSON in <code>.dits/remotes</code>. If that file
        is malformed, remote reads, edits, and disabled transfer commands return an
        error without replacing it; repair or restore the file explicitly.
      </p>

      <h2>Local clone</h2>
      <p>
        <code>clone</code> currently accepts a repository on the local filesystem.
        Network URLs are rejected with a nonzero exit status.
      </p>
      <CodeBlock
        language="bash"
        code={`dits clone /path/to/source-repository destination
dits clone --help`}
      />

      <h2>Disabled commands</h2>
      <ul>
        <li><code>dits push</code> does not upload commits or objects.</li>
        <li><code>dits pull</code> does not fetch or merge remote state.</li>
        <li><code>dits fetch</code> does not download objects or update refs.</li>
        <li><code>dits sync</code> does not perform bidirectional synchronization.</li>
      </ul>
      <p>
        Follow the <Link href="/docs/roadmap">roadmap</Link> for planned remote
        transport work. Scripts should treat a nonzero result from these commands as
        a hard failure.
      </p>
    </div>
  );
}
