import { Metadata } from "next";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Share2, Wifi, Globe, Zap, Info, Server, Radio } from "lucide-react";

export const metadata: Metadata = {
  title: "P2P Commands",
  description: "Peer-to-peer file sharing commands for direct transfers without uploading to a server",
};

const commands = [
  { command: "share", description: "Share a directory via P2P (host)", usage: "dits p2p share [OPTIONS] <PATH>" },
  { command: "connect", description: "Connect to a P2P share (client)", usage: "dits p2p connect [OPTIONS] <TARGET>" },
  { command: "send", description: "Send a file to a peer", usage: "dits p2p send <FILE> <TARGET>" },
  { command: "receive", description: "Receive a file from a peer", usage: "dits p2p receive [OPTIONS]" },
  { command: "status", description: "Show P2P status and discovery methods", usage: "dits p2p status" },
  { command: "ping", description: "Test connectivity to a peer", usage: "dits p2p ping <TARGET>" },
];

const discoveryMethods = [
  { method: "Direct IP", flag: "--direct", priority: "0", description: "Connect via known IP:port", useCase: "Known addresses, no discovery" },
  { method: "mDNS", flag: "--local", priority: "10", description: "Zero-config LAN discovery", useCase: "Same WiFi/LAN, no internet" },
  { method: "STUN", flag: "--stun", priority: "20", description: "External IP discovery", useCase: "NAT traversal, hole-punching" },
  { method: "Signal Server", flag: "--signal <URL>", priority: "30", description: "WebSocket rendezvous", useCase: "Internet sharing, NAT traversal" },
  { method: "Relay", flag: "--relay", priority: "40", description: "Forward through relay server", useCase: "100% NAT traversal, no port forwarding" },
];

export default function P2PCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <Share2 className="h-8 w-8 text-green-500" />
        <h1 className="mb-0">P2P Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Share files directly between peers without uploading to a central server.
        Uses QUIC transport for fast, secure, multiplexed connections.
      </p>

      <Alert className="not-prose my-6">
        <Wifi className="h-4 w-4" />
        <AlertTitle>Zero-Config Local Sharing</AlertTitle>
        <AlertDescription>
          Use <code>--local</code> flag for same-network sharing. No internet required -
          mDNS automatically discovers peers on your WiFi or LAN.
        </AlertDescription>
      </Alert>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Command</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Usage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commands.map((cmd) => (
            <TableRow key={cmd.command}>
              <TableCell className="font-mono font-medium">{cmd.command}</TableCell>
              <TableCell>{cmd.description}</TableCell>
              <TableCell className="font-mono text-sm">{cmd.usage}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2 className="flex items-center gap-2">
        <Radio className="h-5 w-5" />
        Discovery Methods
      </h2>
      <p>
        DITS supports multiple peer discovery methods, tried in priority order.
        By default, all available methods are used with automatic fallback.
      </p>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Method</TableHead>
            <TableHead>Flag</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Use Case</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discoveryMethods.map((dm) => (
            <TableRow key={dm.method}>
              <TableCell className="font-medium">{dm.method}</TableCell>
              <TableCell className="font-mono text-sm">{dm.flag}</TableCell>
              <TableCell>{dm.priority}</TableCell>
              <TableCell>{dm.useCase}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2 className="flex items-center gap-2">
        <Share2 className="h-5 w-5" />
        dits p2p share
      </h2>
      <p>
        Share a directory via P2P. Creates a QUIC server and registers with
        discovery services so other peers can find and connect to you.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits p2p share [OPTIONS] &lt;PATH&gt;</code>
      </pre>

      <h3>Arguments</h3>
      <ul>
        <li><code>PATH</code> - Directory to share</li>
      </ul>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`-p, --port <PORT>      Port to listen on (default: 4433)
-n, --name <NAME>      Name for this share
    --signal <URL>     Signal server URL
    --code <CODE>      Use specific join code
    --local            Use only mDNS (local network, no internet)
    --direct           Use only direct IP mode (no discovery)
    --stun             Use STUN for external IP discovery
    --relay            Force relay mode (guaranteed NAT traversal)`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Share on local network (easiest, no internet)
$ dits p2p share ./my-project --local
DITS P2P - Sharing Active
============================================================
  Mode:      local network (mDNS)
  Or use code:     ABC-123
  Connect with:    dits p2p connect ABC-123 --local
============================================================

# Share over internet (default)
$ dits p2p share ./my-project
DITS P2P - Sharing Active
============================================================
  Mode:      auto (mDNS + signal + relay)
  Or use code:     XYZ-789
  Connect with:    dits p2p connect XYZ-789
============================================================

# Share via relay (no port forwarding needed!)
$ dits p2p share ./my-project --relay
DITS P2P - Sharing Active
============================================================
  Mode:      relay (no port forwarding needed)
  Or use code:     XYZ-789
  Connect with:    dits p2p connect XYZ-789 --relay
============================================================

# Share with direct IP only
$ dits p2p share ./my-project --direct
DITS P2P - Sharing Active
============================================================
  Mode:      direct IP only
  Connect with:    dits p2p connect 0.0.0.0:4433
============================================================

# Share with custom signal server
$ dits p2p share ./my-project --signal ws://localhost:8080`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <Globe className="h-5 w-5" />
        dits p2p connect
      </h2>
      <p>
        Connect to a P2P share. Uses the discovery chain to find the peer
        by join code, URL, or direct IP address.
      </p>

      <h3>Synopsis</h3>
      <pre className="not-prose">
        <code>dits p2p connect [OPTIONS] &lt;TARGET&gt;</code>
      </pre>

      <h3>Arguments</h3>
      <ul>
        <li><code>TARGET</code> - Join code (ABC-123), URL (https://dits.byronwade.com/j/ABC-123), or direct IP:port</li>
      </ul>

      <h3>Options</h3>
      <pre className="not-prose">
        <code>{`-o, --output <PATH>    Output directory
    --signal <URL>     Signal server URL
    --local            Use only mDNS (local network)
    --direct           Use only direct IP mode
    --relay            Force relay mode (guaranteed NAT traversal)`}</code>
      </pre>

      <h3>Examples</h3>
      <pre className="not-prose">
        <code>{`# Connect on local network
$ dits p2p connect ABC-123 --local
DITS P2P - Connecting
============================================================
  Target:    ABC-123
  Mode:      local network (mDNS)
  Discovering peer...
  Found:     192.168.1.50:4433 [mDNS] (local)
  Connected: 192.168.1.50:4433
============================================================

# Connect via relay (no port forwarding needed!)
$ dits p2p connect XYZ-789 --relay
DITS P2P - Connecting
============================================================
  Target:    XYZ-789
  Mode:      relay (no port forwarding needed)
  Using relay server for NAT traversal
  Found:     relay.dits.byronwade.com [relay] (remote)
  Connected: via relay
============================================================

# Connect using auto-discovery
$ dits p2p connect XYZ-789
  Found:     203.0.113.50:4433 [signal] (remote)

# Connect via direct IP
$ dits p2p connect 192.168.1.100:4433
  Found:     192.168.1.100:4433 [direct] (local)

# Connect using share link
$ dits p2p connect https://dits.byronwade.com/j/ABC-123`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <Zap className="h-5 w-5" />
        dits p2p send / receive
      </h2>
      <p>
        Send and receive individual files between peers.
      </p>

      <h3>Send a File</h3>
      <pre className="not-prose">
        <code>{`dits p2p send <FILE> <TARGET>

# Example
$ dits p2p send video.mp4 ABC-123
DITS P2P - Sending File
============================================================
  File:   video.mp4
  Size:   1,234,567 bytes
  Chunks: 10
============================================================`}</code>
      </pre>

      <h3>Receive a File</h3>
      <pre className="not-prose">
        <code>{`dits p2p receive [OPTIONS]

Options:
  -o, --output <PATH>    Output path
  -p, --port <PORT>      Port to listen on
      --code <CODE>      Use specific join code

# Example
$ dits p2p receive --output ./downloads
DITS P2P - Ready to Receive
============================================================
  Share code: DEF-456
  Sender should run:  dits p2p send <file> DEF-456
============================================================`}</code>
      </pre>

      <h2 className="flex items-center gap-2">
        <Server className="h-5 w-5" />
        dits p2p status
      </h2>
      <p>
        Show P2P status including available discovery methods.
      </p>

      <pre className="not-prose">
        <code>{`$ dits p2p status
DITS P2P Status
============================================================
  Protocol Version: 1
  Default Port:     4433
  Signal Server:    wss://dits-signal.fly.dev

  Discovery Methods:
    - direct
    - mDNS
    - STUN
    - signal server

  Active Shares:    0
  Active Connects:  0
============================================================`}</code>
      </pre>

      <h2>Choosing the Right Method</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Scenario</TableHead>
            <TableHead>Recommended</TableHead>
            <TableHead>Command</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Same WiFi/LAN</TableCell>
            <TableCell><code>--local</code></TableCell>
            <TableCell className="font-mono text-sm">dits p2p share --local</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Remote collaborator</TableCell>
            <TableCell>Default (auto)</TableCell>
            <TableCell className="font-mono text-sm">dits p2p share</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Known IP address</TableCell>
            <TableCell>Direct connection</TableCell>
            <TableCell className="font-mono text-sm">dits p2p connect IP:port</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Self-hosted setup</TableCell>
            <TableCell><code>--signal</code></TableCell>
            <TableCell className="font-mono text-sm">dits p2p share --signal ws://...</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Maximum privacy</TableCell>
            <TableCell><code>--local</code></TableCell>
            <TableCell className="font-mono text-sm">No external servers used</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Run Your Own Signal Server</AlertTitle>
        <AlertDescription>
          DITS includes a simple signal server. Run <code>cargo run -p dits-signal</code>
          to start it locally, then use <code>--signal ws://localhost:8080</code>.
        </AlertDescription>
      </Alert>

      <h2>Troubleshooting</h2>

      <h3>Peer not found with --local</h3>
      <ul>
        <li>Ensure both peers are on the same network</li>
        <li>Check if mDNS is blocked (corporate networks)</li>
        <li>Verify firewall allows UDP multicast (port 5353)</li>
        <li>Try the signal server method instead</li>
      </ul>

      <h3>Connection timeout</h3>
      <ul>
        <li>Check firewall allows UDP port 4433</li>
        <li>Try direct IP if you know it</li>
        <li>Verify signal server is reachable</li>
      </ul>

      <h3>Debug Mode</h3>
      <pre className="not-prose">
        <code>{`# Show discovery process
$ dits -v p2p connect ABC-123

# Show detailed debug info
$ dits -vv p2p connect ABC-123`}</code>
      </pre>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/remotes">Remote Commands</Link> - Push, pull, and sync with servers
        </li>
        <li>
          <Link href="/docs/cli/repository">Repository Commands</Link> - Initialize and clone repositories
        </li>
      </ul>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/concepts/peer-to-peer">Peer-to-Peer Concepts</Link> - Understanding P2P architecture
        </li>
        <li>
          <Link href="/docs/configuration">Configuration</Link> - Configure P2P settings
        </li>
      </ul>
    </div>
  );
}
