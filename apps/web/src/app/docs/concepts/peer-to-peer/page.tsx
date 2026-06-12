import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Share2, Wifi, Globe, Shield, Zap, Server, Radio } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import { FlowDiagram } from "@/components/docs/flow-diagram";

export const metadata: Metadata = {
  title: "Peer-to-Peer Sharing",
  description: "Understanding DITS P2P architecture for direct file sharing",
};

export default function PeerToPeerPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Core Concepts"
        title="Peer-to-Peer Sharing"
        description="A roadmap design for Wormhole-style P2P sharing of files directly between peers without uploading to a central server."
      />

      <Callout type="important" title="Roadmap — not yet functional">
        P2P sharing is <strong>scaffolding</strong>. The <code>dits p2p</code>{" "}
        commands print placeholder output but <strong>transfer no data</strong>:
        there is no working discovery, no NAT traversal, and no relay or signal
        infrastructure. This page describes the <em>planned</em> design so the
        shape of the feature is clear &mdash; do not depend on any of it today.
        What works now is the local VCS and local-filesystem{" "}
        <code>clone</code>/<code>push</code>. See the{" "}
        <Link href="/docs/roadmap">roadmap</Link> for status.
      </Callout>

      <h2>What is P2P Sharing?</h2>
      <p>
        Unlike traditional file sharing where you upload to a server and others
        download from it, P2P creates a direct connection between two computers.
        Your files never touch a third-party server - they go straight from your
        machine to your collaborator&apos;s.
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-success/10">
              <Zap className="size-5 text-success" />
            </div>
            <CardTitle className="text-base">Fast</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Direct transfers use your full network speed. No server bottleneck
              or bandwidth limits.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-info/10">
              <Shield className="size-5 text-info" />
            </div>
            <CardTitle className="text-base">Private</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              End-to-end encrypted with QUIC/TLS 1.3. Files never touch external
              servers.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
              <Wifi className="size-5 text-brand" />
            </div>
            <CardTitle className="text-base">Works Anywhere</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Same WiFi? Use mDNS. Different networks? Signal server handles NAT
              traversal.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <h2>How It Works</h2>

      <h3>The Basic Flow</h3>
      <ol>
        <li><strong>Share:</strong> You run <code>dits p2p share ./folder</code> and get a join code (e.g., ABC-123)</li>
        <li><strong>Discover:</strong> Your peer runs <code>dits p2p connect ABC-123</code></li>
        <li><strong>Connect:</strong> DITS finds your address via discovery methods and establishes a direct QUIC connection</li>
        <li><strong>Transfer:</strong> Files flow directly between your machines, encrypted end-to-end</li>
      </ol>

      <h3>Discovery Methods</h3>
      <p>
        DITS uses multiple discovery methods to find peers. They&apos;re tried in
        priority order - the first one that works is used.
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-2 my-8">
        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
              <Globe className="size-5 text-brand" />
            </div>
            <CardTitle className="text-base">Direct IP (Priority 0)</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              If you know the peer&apos;s IP address, connect directly with no
              discovery needed. Fastest option for known addresses.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
              <Wifi className="size-5 text-brand" />
            </div>
            <CardTitle className="text-base">mDNS (Priority 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Zero-configuration discovery on local networks. Broadcasts on your
              WiFi/LAN - no internet required. Perfect for office or home use.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
              <Radio className="size-5 text-brand" />
            </div>
            <CardTitle className="text-base">STUN (Priority 20)</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Discovers your external IP by querying public STUN servers. Used for
              NAT traversal and hole-punching to reach peers behind firewalls.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
              <Server className="size-5 text-brand" />
            </div>
            <CardTitle className="text-base">Signal Server (Priority 30)</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              WebSocket rendezvous server for NAT traversal. Exchanges addresses
              between peers - your files never touch the signal server.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-brand/40 bg-brand/5">
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
              <Share2 className="size-5 text-brand" />
            </div>
            <CardTitle className="text-base text-brand">Relay (Priority 40) - Planned Fallback</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              In the planned design, when direct connections fail, traffic would
              route through a relay server so peers behind restrictive NATs can
              still connect. Data would remain end-to-end encrypted, with the
              relay only forwarding encrypted bytes. No relay infrastructure
              exists today.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Callout type="tip" title="Zero Port Forwarding with Relay Mode" className="not-prose my-6">
        With relay mode (<code>--relay</code>), you never need to configure port forwarding
        on your router. Traffic flows through the relay server, bypassing NAT completely.
        Your files are still encrypted end-to-end - the relay only forwards encrypted bytes.
      </Callout>

      <Callout type="note" title="Signal Server vs. File Server" className="not-prose my-6">
        The signal server only exchanges peer addresses - it never sees your files.
        Think of it like a phone directory: it helps you find your friend&apos;s number,
        but your conversation happens directly between you.
      </Callout>

      <h2>Local vs. Internet Sharing</h2>

      <h3>Local Network (--local)</h3>
      <p>
        For peers on the same WiFi or LAN, use <code>--local</code> mode:
      </p>
      <CodeBlock
        language="bash"
        code={`# Computer A
$ dits p2p share ./project --local
Connect with: dits p2p connect ABC-123 --local

# Computer B
$ dits p2p connect ABC-123 --local`}
      />
      <p>Benefits:</p>
      <ul>
        <li>No internet required</li>
        <li>Maximum privacy (no external servers)</li>
        <li>Fastest discovery (local broadcast)</li>
        <li>Zero configuration</li>
      </ul>

      <h3>Internet Sharing (default)</h3>
      <p>
        For peers on different networks, the default auto mode uses the signal
        server for NAT traversal:
      </p>
      <CodeBlock
        language="bash"
        code={`# Computer A
$ dits p2p share ./project
Connect with: dits p2p connect XYZ-789

# Computer B (anywhere in the world)
$ dits p2p connect XYZ-789`}
      />

      <h2>Security Model</h2>

      <h3>Encryption</h3>
      <ul>
        <li><strong>QUIC + TLS 1.3:</strong> All connections are encrypted</li>
        <li><strong>Certificate Pinning:</strong> Server cert verified via fingerprint</li>
        <li><strong>BLAKE3 Checksums:</strong> Fast integrity verification</li>
      </ul>

      <h3>Join Codes</h3>
      <p>
        Join codes are 6-character codes (e.g., ABC-123) that:
      </p>
      <ul>
        <li>Use an unambiguous character set (no 0/O, 1/I/L confusion)</li>
        <li>Are valid only while the share is active</li>
        <li>Can be customized with <code>--code</code></li>
      </ul>

      <h3>Trust Model</h3>
      <ul>
        <li>Signal server is semi-trusted (sees addresses, not data)</li>
        <li>Peer connection is end-to-end encrypted</li>
        <li>Use <code>--local</code> for maximum privacy</li>
      </ul>

      <h2>When to Use P2P</h2>

      <div className="not-prose grid gap-4 md:grid-cols-2 my-8">
        <Card className="border-brand/40 bg-brand/5">
          <CardHeader>
            <CardTitle className="text-base text-brand">Good For</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>Quick file transfers between collaborators</li>
              <li>Sharing large files without upload wait</li>
              <li>Privacy-sensitive transfers</li>
              <li>Same-office collaboration</li>
              <li>One-time transfers</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-base text-warning">Consider Alternatives</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>Persistent team collaboration (use remotes)</li>
              <li>Sharing with many people (use server)</li>
              <li>Asynchronous workflows (use push/pull)</li>
              <li>Version history needed (use repository)</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <h2>Architecture Diagram</h2>
      <div className="not-prose my-8 space-y-4">
        <FlowDiagram
          title="Discovery Chain"
          steps={[
            { iconName: "Globe", label: "Direct IP", description: "If target is IP:port, use directly", priority: 1 },
            { iconName: "Wifi", label: "mDNS", description: "Broadcast on local network", priority: 2 },
            { iconName: "Radio", label: "STUN", description: "Query for external IP", priority: 3 },
            { iconName: "Server", label: "Signal", description: "WebSocket rendezvous", priority: 4 },
          ]}
        />
        <FlowDiagram
          title="QUIC Connection"
          steps={[
            { iconName: "Shield", label: "TLS 1.3 Encrypted", description: "End-to-end encryption" },
            { iconName: "Zap", label: "UDP-based", description: "NAT-friendly transport" },
            { iconName: "Share2", label: "Multiplexed", description: "Multiple streams" },
          ]}
          direction="horizontal"
        />
      </div>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/cli/p2p">P2P Commands Reference</Link> - Full command documentation
        </li>
        <li>
          <Link href="/docs/cli/remotes">Remote Commands</Link> - Server-based sharing
        </li>
        <li>
          <Link href="/docs/configuration">Configuration</Link> - P2P settings
        </li>
      </ul>
    </div>
  );
}
