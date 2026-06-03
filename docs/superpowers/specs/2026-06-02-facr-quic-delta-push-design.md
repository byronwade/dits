# FACR Streaming — QUIC Delta-Push Origin (Design Spec)

*Status: approved 2026-06-02. P3 of the FACR incremental-streaming roadmap.*

## Goal

Make "only changed segments cross the network" literal: build the ABR ladders locally (unchanged),
then **delta-push** content-addressed segments to a remote **QUIC origin** — for each segment, ask
the remote `HAVE(hash)?` and `PUT` only what it lacks. Because segments are content-addressed, v2's
unchanged segments already live on the remote, so **only the changed segments transfer**. Unlike the
browser phases, this is **fully verifiable in-session** by counting bytes/segments over the wire.

## Foundation (verified real)

`apps/cli/src/p2p/net.rs` provides a complete QUIC transport: `create_server_endpoint(bind) ->
(Endpoint, CertFingerprint)` (self-signed cert), `create_client_endpoint_with_pinned_cert(fp)`,
`connect(endpoint, addr, server_name) -> QuicConnection`, and `QuicConnection::open_stream()/
accept_stream() -> (SendStream, RecvStream)`. `bincode 1.3` is available (the existing
`p2p::protocol` already frames messages as 4-byte LE length + bincode). We build a small
self-contained segment protocol on top — no changes to `p2p`.

## Key design decision: keep build sync+local, make push a separate async step

`SegmentOrigin` is sync (`has`/`put`/`get`); QUIC is async. Bridging them (block-on-inside-runtime)
is fragile. So the build stays sync and writes to the local origin exactly as today, and
**delta-push is a separate async operation** invoked directly from the async `stream_demo`. The
`SegmentOrigin` trait is untouched, and this is literally what "delta-push" means: build, then push
the delta.

## Approach (chosen of three)

- **A — delta-push proof (CHOSEN).** Build into the local origin; stand up an in-process QUIC origin
  server backed by its own empty store (the "remote edge"); push v1 (all) then v2 (only missing =
  changed). Measure. Real QUIC, fully objective.
- B — serve the player *from* the remote QUIC origin: forces the sync/async bridge into the hot path
  for little added proof. Deferred.
- C — full P2P rendezvous / NAT traversal (needs an external signal server): out of scope, later phase.

## Architecture

### `stream/quic_origin.rs` (new)

```
#[derive(Serialize, Deserialize)]
enum SegMessage {
    Have(Hash), HaveResp(bool),
    Put { hash: Hash, bytes: Vec<u8> }, PutOk,
    Get(Hash), GetResp(Option<Vec<u8>>),
}

// Framing: 4-byte LE length prefix + bincode (mirrors p2p::protocol), generous size cap for segments.
async fn write_msg(send: &mut SendStream, msg: &SegMessage) -> Result<()>
async fn read_msg(recv: &mut RecvStream) -> Result<SegMessage>

/// Start a QUIC origin server backed by `backing`. One request/response per accepted stream.
/// Returns the bound addr, its cert fingerprint (for pinning), and the accept-loop task handle.
async fn serve_quic_origin(
    bind: SocketAddr,
    backing: Arc<dyn SegmentOrigin + Send + Sync>,
) -> Result<(SocketAddr, CertFingerprint, JoinHandle<()>)>

/// Client to a QUIC origin (cert-pinned).
struct QuicOriginClient { conn: QuicConnection }
impl QuicOriginClient {
    async fn connect(addr: SocketAddr, fp: CertFingerprint) -> Result<Self>
    async fn has(&self, h: &Hash) -> Result<bool>
    async fn put(&self, h: &Hash, bytes: &[u8]) -> Result<()>
    async fn get(&self, h: &Hash) -> Result<Option<Vec<u8>>>
}

#[derive(Default)]
struct PushStats { pushed: usize, skipped: usize, bytes: u64 }

/// Push only the segments the remote lacks. `hashes` is deduped internally.
async fn push_delta(
    local: &dyn SegmentOrigin,
    client: &QuicOriginClient,
    hashes: &[Hash],
) -> Result<PushStats>
```

- **Server accept loop:** `create_server_endpoint(bind)`; spawn a task that loops `endpoint.accept()`
  → per-connection task → loops `accept_stream()` → `read_msg` → serve from `backing`
  (`has`/`put`/`get`) → `write_msg` → finish stream.
- **Client request:** each call opens a fresh bidirectional stream, writes the request, finishes the
  send side, reads the single response, returns it.
- `SegmentOrigin` must add `Send + Sync` supertrait bounds on the trait object usage (the trait itself
  is unchanged; `LocalDiskOrigin` is already `Send + Sync`).

### `commands/stream_demo.rs`
- Add a `--push` flag. After building the v1/v2 ABR ladders: start a remote QUIC origin (backed by a
  fresh empty `LocalDiskOrigin` in a temp dir), connect a pinned client, then:
  - `push_delta(local, client, all_v1_hashes)` → prints "v1 push: pushed N (X KB), skipped 0".
  - `push_delta(local, client, all_v2_hashes)` → prints "v2 push: pushed K (Y KB), skipped M" where
    K = changed segments across rungs (the delta), M = the reused ones already on the remote.
  - `all_*_hashes` = every rung's media hashes plus each rung's init hash, deduped.

## Data flow
```
build ladders -> local origin (all segments + inits)
remote QUIC origin (empty) started in-process
push_delta(v1 hashes): remote has nothing -> PUT everything
push_delta(v2 hashes): remote already has the unchanged segments -> PUT only the changed ones
=> bytes over the wire for v2 == size of the changed segments only
```

## Error handling
- Connect/stream failures surface as typed errors; a failed `push_delta` reports which hash failed.
- `read_msg` enforces a max frame size; oversize → error (no unbounded allocation).
- Unexpected message type in a response → error.

## Testing (objective, no browser)
- **Round-trip:** start server over a `LocalDiskOrigin`; client `put` then `get` returns identical
  bytes; `has` is false before and true after.
- **Delta push:** push `[a, b]` then `[a, b, c]`; assert the second push reports `pushed == 1`,
  `skipped == 2`, and `bytes == len(c)`.
- **Server-side persistence:** after a delta push, the backing remote origin `has` every pushed hash.
- **End-to-end (demo):** v2 delta-push transfers exactly the changed-segments-across-rungs (3 in the
  demo); v1 push transfers all; the remote can then `get` every segment.

## Non-goals
- Multi-host NAT traversal, the rendezvous signal server, and serving playback from the edge (later).
- Auth/authorization on the origin (P5). Resumable/partial transfers (segments are small; one
  message each).

## Module layout
New: `apps/cli/src/stream/quic_origin.rs`. Edits: `apps/cli/src/stream/origin.rs` (note `Send+Sync`),
`apps/cli/src/stream/mod.rs`, `apps/cli/src/commands/stream_demo.rs`, `apps/cli/src/main.rs`
(`--push` flag). No new dependencies (quinn, rustls, bincode already present).

## Implementation status & verification (2026-06-02)

**Built and committed.** This is the **first actual byte transfer over the project's QUIC stack** —
the existing `p2p::net` code had no runtime users, so it never installed a rustls crypto provider; we
install `ring` once (idempotent) on both the server and client paths. Also mirrored the lib's
`crate::Repository` root re-export into the binary so `p2p` (used by `host.rs`) compiles in the bin.

**Tests (objective, no browser):** 23 stream tests green, including two `#[tokio::test]`s that stand
up a real QUIC server+client: `put`/`get`/`has` round-trip returns identical bytes; delta-push of
`[a,b]` then `[a,b,c]` reports `pushed=1, skipped=2, bytes=len(c)` and the remote then has all three.

**End to end** (`dits stream-demo --push`, 720p source, 3-rung ladder):
- **v1 push: 18 segments / 3338 KB** (15 media + 3 inits; remote was empty).
- **v2 push: 3 segments / 786 KB** — the changed segment in each of the 3 rungs; **15 already on the
  remote → 0 KB**. Only the changed segments crossed the wire — the thesis made literal over real QUIC.

**Open / deferred:** multi-host NAT traversal + the rendezvous signal server; serving playback *from*
the edge origin; auth on the origin (P5). All segments are content-verified on the receiving origin
(`LocalDiskOrigin::get` re-hashes).
