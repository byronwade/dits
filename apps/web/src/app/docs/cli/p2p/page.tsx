import type { Metadata } from "next";
import Link from "next/link";

import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "P2P Commands — Disabled Alpha Scaffolding",
  description:
    "Current behavior of the disabled Dits P2P command surface and the safety gates required before peer transfer can ship.",
  robots: { index: false, follow: true },
};

export default function P2PCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="CLI Reference · Design"
        title="P2P commands"
        description="The parser exists for discovery, but every P2P operation fails before creating or changing local or network state."
      />

      <Callout type="important" title="Disabled in the alpha" className="not-prose my-6">
        <code>dits p2p</code> does not share, connect, mount, ping, cache, or transfer
        repository data. Every parsed operation exits nonzero before opening a
        repository, creating a target directory, changing a cache, or binding a
        socket.
      </Callout>

      <h2>What is parsed</h2>
      <p>
        The provisional command family contains <code>share</code>, <code>connect</code>,{" "}
        <code>status</code>, <code>list</code>, <code>cache</code>, <code>ping</code>, and{" "}
        <code>unmount</code>. These names and flags are design scaffolding, not a
        compatibility promise.
      </p>
      <CodeBlock
        language="text"
        code={`$ dits p2p status
Error: P2P sharing is design scaffolding in this alpha and is disabled.

$ dits p2p connect ABC-123 ./peer-copy
Error: P2P sharing is design scaffolding in this alpha and is disabled.`}
      />

      <h2>What does not exist</h2>
      <ul>
        <li>No rendezvous, signaling, relay, or NAT-traversal service.</li>
        <li>No authenticated peer protocol or shipped P2P encryption scheme.</li>
        <li>No remote mount, cache, repository transfer, or ref transaction.</li>
        <li>No active share, peer-status, or connectivity result.</li>
      </ul>

      <h2>What must happen before this can ship</h2>
      <p>
        P2P needs a threat model, authenticated protocol, version negotiation,
        atomic repository and ref semantics, interruption recovery, and independent
        compatibility tests. Track those gates in the <Link href="/docs/roadmap">roadmap</Link>.
      </p>

      <Callout type="note" title="Need to copy a repository today" className="not-prose my-6">
        Use <Link href="/docs/cli/repository">local-filesystem clone</Link> or an
        independently verified backup. Remote <code>push</code>, <code>pull</code>,{" "}
        <code>fetch</code>, and <code>sync</code> also fail closed in this alpha.
      </Callout>
    </div>
  );
}
