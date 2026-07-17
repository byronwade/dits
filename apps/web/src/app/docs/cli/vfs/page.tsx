import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { CodeBlock } from "@/components/ui/code-block";
import { Callout } from "@/components/ui/callout";

export const metadata: Metadata = {
  title: "Experimental Local FUSE Commands",
  description:
    "Current feature-gated, read-only local FUSE mount boundary; no remote hydration or access-performance guarantee.",
};

export default function VfsCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Experimental CLI"
        title="Local FUSE Mount"
        description="Expose one local commit through a read-only FUSE mount in a source build that enables the optional fuser feature."
      />

      <Callout type="warning" title="Experimental, local, and feature-gated" className="not-prose my-6">
        Published npm binaries do not promise this command surface. The mount
        reads objects already present in the local repository; it does not
        contact a remote, partially clone a repository, or hydrate missing data
        over a network. Startup and read latency depend on the repository,
        machine, FUSE implementation, and access pattern.
      </Callout>

      <h2>Build requirements</h2>

      <p>
        Build from source with the <code>fuser</code> feature and install the
        FUSE implementation required by your operating system. Exact OS setup is
        outside the Dits compatibility promise.
      </p>

      <CodeBlock
        language="bash"
        code={`cargo build --locked --release -p dits --features fuser
./target/release/dits mount --help`}
      />

      <h2><code>dits mount</code></h2>

      <p>
        Resolves HEAD or the local ref selected by <code>--commit</code>, loads
        its manifest, and blocks while serving a read-only mount. The
        <code> --cache-mb</code> value configures the in-process RAM cache; the
        disk cache lives below <code>.dits/cache</code>.
      </p>

      <CodeBlock
        language="bash"
        code={`dits mount <MOUNT_POINT>
dits mount <MOUNT_POINT> --commit main --cache-mb 256`}
      />

      <Callout type="important" title="Read-only is not an access-control boundary" className="not-prose my-6">
        The FUSE mount is configured read-only, but visibility to other local
        users depends on operating-system permissions and FUSE configuration.
        Protect the repository and mount point with normal OS controls. Verify
        important reads against the original fixture before relying on this
        experimental path.
      </Callout>

      <h2>Unmount and inspect the disk cache</h2>

      <CodeBlock
        language="bash"
        code={`dits unmount <MOUNT_POINT>
dits cache-stats`}
      />

      <p>
        <code>cache-stats</code> counts local files and bytes in
        <code> .dits/cache</code>. It does not report a remote cache, bandwidth,
        hit-rate guarantee, or live RAM statistics after the mount exits.
      </p>

      <h2>Not implemented</h2>

      <ul>
        <li>Network partial clone or remote chunk hydration.</li>
        <li>Windows native virtual-drive support in the published package.</li>
        <li>Guaranteed instant mount, open, seek, or playback behavior.</li>
        <li>A supported editor-integration or production VFS contract.</li>
      </ul>

      <p>
        See the <Link href="/docs/advanced/vfs">VFS experiment boundary</Link>,
        <Link href="/docs/installation"> installation status</Link>, and
        <Link href="/docs/roadmap"> status and roadmap</Link>.
      </p>
    </div>
  );
}
