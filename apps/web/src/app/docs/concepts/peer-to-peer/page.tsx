import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Share2, Wifi, Globe, Shield, Zap, Server, Radio } from "lucide-react";

export const metadata: Metadata = {
  title: "Peer-to-Peer Sharing",
  description: "Understanding DITS P2P architecture for direct file sharing",
};

export default function PeerToPeerPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Peer-to-Peer Sharing</h1>
      <p className="lead text-xl text-muted-foreground">
        DITS includes Wormhole-style P2P capabilities for sharing files directly
        between peers without uploading to a central server.
      </p>

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
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
              <Zap className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>Fast</CardTitle>
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
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <CardTitle>Private</CardTitle>
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
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
              <Wifi className="h-6 w-6 text-purple-500" />
            </div>
            <CardTitle>Works Anywhere</CardTitle>
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
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Direct IP (Priority 0)</CardTitle>
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
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Wifi className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>mDNS (Priority 10)</CardTitle>
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
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Radio className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>STUN (Priority 20)</CardTitle>
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
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Signal Server (Priority 30)</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              WebSocket rendezvous server for NAT traversal. Exchanges addresses
              between peers - your files never touch the signal server.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
              <Share2 className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>Relay (Priority 40) - No Port Forwarding!</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              When direct connections fail, traffic routes through the relay server.
              <strong> 100% success rate</strong> - works through any NAT type. Data is
              still end-to-end encrypted, the relay only sees encrypted bytes.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Alert className="not-prose my-6 border-green-500/50">
        <Share2 className="h-4 w-4 text-green-500" />
        <AlertTitle>Zero Port Forwarding with Relay Mode</AlertTitle>
        <AlertDescription>
          With relay mode (<code>--relay</code>), you never need to configure port forwarding
          on your router. Traffic flows through the relay server, bypassing NAT completely.
          Your files are still encrypted end-to-end - the relay only forwards encrypted bytes.
        </AlertDescription>
      </Alert>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Signal Server vs. File Server</AlertTitle>
        <AlertDescription>
          The signal server only exchanges peer addresses - it never sees your files.
          Think of it like a phone directory: it helps you find your friend&apos;s number,
          but your conversation happens directly between you.
        </AlertDescription>
      </Alert>

      <h2>Local vs. Internet Sharing</h2>

      <h3>Local Network (--local)</h3>
      <p>
        For peers on the same WiFi or LAN, use <code>--local</code> mode:
      </p>
      <pre className="not-prose">
        <code>{`# Computer A
$ dits p2p share ./project --local
Connect with: dits p2p connect ABC-123 --local

# Computer B
$ dits p2p connect ABC-123 --local`}</code>
      </pre>
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
      <pre className="not-prose">
        <code>{`# Computer A
$ dits p2p share ./project
Connect with: dits p2p connect XYZ-789

# Computer B (anywhere in the world)
$ dits p2p connect XYZ-789`}</code>
      </pre>

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
        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="text-green-600">Good For</CardTitle>
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

        <Card className="border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-orange-600">Consider Alternatives</CardTitle>
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
      <pre className="not-prose text-sm">
        <code>{`┌─────────────────────────────────────────────────────────────┐
│                    Discovery Chain                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Direct IP    - If target is IP:port, use directly       │
│  2. mDNS         - Broadcast on local network               │
│  3. STUN         - Query for external IP                    │
│  4. Signal       - WebSocket rendezvous                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    QUIC Connection                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  • TLS 1.3 encrypted                                        │
│  • UDP-based (NAT-friendly)                                 │
│  • Multiplexed streams                                      │
│  • Automatic congestion control                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘`}</code>
      </pre>

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
