# DITS P2P - Peer-to-Peer File Sharing

DITS includes Wormhole-style P2P file sharing capabilities, allowing direct peer-to-peer transfers without uploading to a central server.

## Features

- **Join Codes**: Simple 6-character codes (e.g., `ABC-123`) for easy sharing
- **Multiple Discovery Methods**: mDNS (LAN), Signal Server (NAT traversal), Direct IP, STUN, Relay
- **Zero-Config LAN Sharing**: Works on local networks without internet
- **NAT Traversal**: Signal server for peer discovery behind firewalls
- **Relay Mode**: Guaranteed NAT traversal - no port forwarding ever needed!
- **QUIC Transport**: Fast, secure, multiplexed connections
- **Certificate Pinning**: Secure connections with PAKE key exchange
- **Chunked Transfers**: Efficient transfer of large files

## Quick Start

### Same Network (Easiest - Zero Config)

For peers on the same WiFi or LAN, use `--local` mode:

```bash
# Computer A - Share
dits p2p share ./my-project --local

# Output:
# Mode:      local network (mDNS)
# Or use code:     ABC-123
# Connect with:    dits p2p connect ABC-123 --local

# Computer B - Connect
dits p2p connect ABC-123 --local
```

No internet required - mDNS automatically discovers peers on the local network.

### Different Networks (Internet)

For peers on different networks, use the default auto mode:

```bash
# Computer A - Share
dits p2p share ./my-project

# Output:
# Mode:      auto (mDNS + signal + relay)
# Or use code: ABC-123
# Connect with: dits p2p connect ABC-123

# Computer B - Connect
dits p2p connect ABC-123
```

### No Port Forwarding (Relay Mode)

For guaranteed NAT traversal without any router configuration:

```bash
# Computer A - Share via relay
dits p2p share ./my-project --relay

# Output:
# Mode:      relay (no port forwarding needed)
# Or use code: ABC-123
# Connect with: dits p2p connect ABC-123 --relay

# Computer B - Connect via relay
dits p2p connect ABC-123 --relay
```

Relay mode routes traffic through the signal server, so:
- **100% success rate** - works through any NAT type
- **No router config** - no port forwarding needed
- **Slightly higher latency** - data goes through relay server
- **Data is still encrypted** - relay only sees encrypted bytes

### Direct IP (Advanced)

If you know the peer's IP address:

```bash
# Computer A - Share with direct mode
dits p2p share ./my-project --direct

# Output:
# Mode:      direct IP only
# Connect with: dits p2p connect 192.168.1.100:4433

# Computer B - Connect directly
dits p2p connect 192.168.1.100:4433
```

## Discovery Methods

DITS supports multiple peer discovery methods, tried in priority order:

| Method | Flag | Description | Use Case |
|--------|------|-------------|----------|
| **Direct IP** | `--direct` | Connect via known IP:port | Known addresses, no discovery needed |
| **mDNS** | `--local` | Zero-config LAN discovery | Same WiFi/LAN, no internet |
| **STUN** | `--stun` | External IP discovery | Hole-punching, NAT traversal |
| **Signal Server** | `--signal <URL>` | WebSocket rendezvous | NAT traversal, internet sharing |
| **Relay** | `--relay` | Forward through relay server | 100% NAT traversal, no port forwarding |

### Default Behavior (Auto Mode)

When no flag is specified, DITS tries discovery methods in this order:
1. **Direct IP** - If target looks like `IP:port`, connect directly
2. **mDNS** - Search local network for 5 seconds
3. **Signal Server** - WebSocket rendezvous to find peer address
4. **Relay** - If direct connection fails, route through relay server

### Local Mode (`--local`)

Use mDNS only - perfect for:
- Same WiFi network
- Corporate LAN
- No internet available
- Maximum privacy (no external servers)

```bash
# Share on local network only
dits p2p share ./project --local

# Connect on local network only
dits p2p connect ABC-123 --local
```

### Direct Mode (`--direct`)

Skip all discovery - connect to known IP:port:

```bash
# Share and display your IP
dits p2p share ./project --direct

# Connect to known address
dits p2p connect 192.168.1.100:4433
```

### Custom Signal Server

Use your own signal server:

```bash
# Share with custom signal server
dits p2p share ./project --signal ws://localhost:8080

# Connect with custom signal server
dits p2p connect ABC-123 --signal ws://localhost:8080
```

## Commands Reference

### `dits p2p share`

Share a directory via P2P.

```bash
dits p2p share <path> [options]

Arguments:
  <path>                 Directory to share

Options:
  -p, --port <PORT>      Port to listen on (default: 4433)
  -n, --name <NAME>      Name for this share
  --signal <URL>         Signal server URL
  --code <CODE>          Use specific join code
  --local                Use only mDNS (local network, no internet)
  --direct               Use only direct IP mode (no discovery)
  --stun                 Use STUN for external IP discovery
  --relay                Force relay mode (guaranteed NAT traversal)
```

### `dits p2p connect`

Connect to a P2P share.

```bash
dits p2p connect <target> [options]

Arguments:
  <target>               Join code, URL, or direct IP:port

Options:
  -o, --output <PATH>    Output directory
  --signal <URL>         Signal server URL
  --local                Use only mDNS (local network)
  --direct               Use only direct IP mode
  --relay                Force relay mode (guaranteed NAT traversal)
```

### `dits p2p send`

Send a file to a peer.

```bash
dits p2p send <file> <target> [options]

Arguments:
  <file>                 File to send
  <target>               Join code or direct address

Options:
  --signal <URL>         Signal server URL
```

### `dits p2p receive`

Receive a file from a peer.

```bash
dits p2p receive [options]

Options:
  -o, --output <PATH>    Output path
  -p, --port <PORT>      Port to listen on
  --code <CODE>          Use specific join code
  --signal <URL>         Signal server URL
```

### `dits p2p status`

Show P2P status and available discovery methods.

```bash
dits p2p status

# Output:
# DITS P2P Status
# ============================================================
# Protocol Version: 1
# Default Port:     4433
# Signal Server:    wss://dits-signal.fly.dev
#
# Discovery Methods:
#   - direct
#   - mDNS
#   - STUN
#   - signal server
#   - relay
```

### `dits p2p ping`

Test connectivity to a peer.

```bash
dits p2p ping <target> [-c <count>]
```

## Architecture

### Discovery System

The discovery system uses a chain of methods, tried in priority order:

```
┌─────────────────────────────────────────────────────────┐
│                    Discovery Chain                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Priority 0: Direct IP                                   │
│  └─ If target is IP:port, use immediately               │
│                                                          │
│  Priority 10: mDNS                                       │
│  └─ Broadcast on local network                          │
│  └─ Service: _dits-p2p._udp.local.                      │
│  └─ TXT records: code, version, fingerprint             │
│                                                          │
│  Priority 20: STUN                                       │
│  └─ Query public STUN servers                           │
│  └─ Discover external IP for hole-punching              │
│                                                          │
│  Priority 30: Signal Server                              │
│  └─ WebSocket connection to signal server               │
│  └─ Register or lookup by join code                     │
│                                                          │
│  Priority 40: Relay (TURN-style)                         │
│  └─ When direct connection fails, forward via server    │
│  └─ Guaranteed NAT traversal (100% success rate)        │
│  └─ Traffic is still encrypted end-to-end               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Components

1. **Discovery Module** (`p2p/discovery/`)
   - `mod.rs` - Discovery trait and types
   - `chain.rs` - DiscoveryChain for trying methods in order
   - `direct.rs` - Direct IP:port connection
   - `mdns.rs` - mDNS/DNS-SD local discovery
   - `signal.rs` - Signal server client wrapper
   - `stun.rs` - STUN external IP discovery
   - `relay.rs` - TURN-style relay for guaranteed NAT traversal

2. **Crypto Module** (`p2p/crypto.rs`)
   - Join code generation and validation
   - BLAKE3 checksums
   - URL/link parsing

3. **Network Module** (`p2p/net.rs`)
   - QUIC connection management
   - Certificate generation and pinning
   - NAT-friendly transport configuration

4. **Protocol Module** (`p2p/protocol.rs`)
   - Wire protocol definitions
   - Message serialization (bincode)

5. **Rendezvous Module** (`p2p/rendezvous.rs`)
   - Signal server client
   - WebSocket communication

6. **Transfer Module** (`p2p/transfer.rs`)
   - Chunked file transfers
   - Progress tracking
   - Checksum verification

### Signal Server

The signal server facilitates peer discovery for NAT traversal:

1. Host registers with join code
2. Client looks up join code
3. Server exchanges peer addresses
4. Direct QUIC connection established

Default signal server: `wss://dits-signal.fly.dev`

Run your own signal server:

```bash
# Build and run
cargo run -p dits-signal

# Output:
# DITS Signal Server
# ==================
# Listening on: ws://0.0.0.0:8080
# Use with: dits p2p share --signal ws://localhost:8080
```

### Security

- **QUIC + TLS 1.3**: All connections encrypted
- **Certificate Pinning**: Server cert verified via fingerprint
- **BLAKE3**: Fast checksums for data integrity
- **Zero Trust**: Signal server only exchanges addresses, no data

## Configuration

### Environment Variables

```bash
DITS_SIGNAL_SERVER=wss://your-signal-server.com
DITS_P2P_PORT=4433
```

### Config File

```toml
# ~/.config/dits/config.toml

[p2p]
signal_server = "wss://dits-signal.fly.dev"
default_port = 4433
mdns_enabled = true
```

## Choosing the Right Method

| Scenario | Recommended Method | Command |
|----------|-------------------|---------|
| Same WiFi/LAN | `--local` (mDNS) | `dits p2p share --local` |
| Same office network | `--local` (mDNS) | `dits p2p share --local` |
| Remote collaborator | Default (auto) | `dits p2p share` |
| Known IP address | Direct connection | `dits p2p connect IP:port` |
| Self-hosted setup | `--signal <url>` | `dits p2p share --signal ws://...` |
| Maximum privacy | `--local` | No external servers used |
| Behind strict NAT | `--stun` | External IP discovery |

## Comparison with Similar Tools

| Feature | DITS P2P | Wormhole | Magic Wormhole |
|---------|----------|----------|----------------|
| Join Codes | Yes | Yes | Yes |
| QUIC Transport | Yes | Yes | No |
| mDNS Discovery | Yes | No | No |
| Signal Server | Yes | Yes | Relay Server |
| Direct IP | Yes | Yes | No |
| STUN Support | Yes | Planned | No |
| VCS Integration | Yes | No | No |
| Video-Aware | Yes | No | No |

## Troubleshooting

### "Peer not found" with --local

- Ensure both peers are on the same network
- Check if mDNS is blocked (some corporate networks)
- Try the signal server method instead
- Verify firewall allows UDP multicast (port 5353)

### Connection timeout

- Check firewall allows UDP port 4433
- Try direct IP if you know it
- Verify signal server is reachable
- Increase timeout with `--timeout` flag

### Performance Tips

- Use `--local` mode on LAN for lowest latency
- Direct IP connection bypasses all discovery overhead
- Signal server adds ~100ms latency for discovery
- QUIC provides automatic congestion control

### Firewall Configuration

For P2P to work, ensure these ports are accessible:

| Port | Protocol | Purpose |
|------|----------|---------|
| 4433 | UDP | QUIC data transfer |
| 5353 | UDP | mDNS discovery (local) |

### Debug Mode

Use verbose output to see discovery details:

```bash
# Show discovery process
dits -v p2p connect ABC-123

# Show detailed debug info
dits -vv p2p connect ABC-123
```
