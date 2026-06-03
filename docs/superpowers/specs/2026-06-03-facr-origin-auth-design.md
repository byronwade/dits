# FACR Streaming — Origin Auth (Design Spec)

*Status: approved 2026-06-03. P5 sub-project #2 of the FACR incremental-streaming roadmap.*

## Goal

Token-gate push/fetch on the QUIC origin so only authorized clients can store or retrieve segments —
the access-control half of P5 (and, in a real deployment, what protects the segment-encryption key
endpoint from P5 #1).

## Approach

A per-connection token handshake on the existing segment-transfer protocol:

- **`SegMessage`** gains `Auth(String)` / `AuthOk` / `AuthFail`.
- **`serve_quic_origin(bind, backing, token)`** passes the expected token to each connection handler.
- **`handle_connection`** requires the first stream to carry `Auth(token)`; on match it sets a
  per-connection `authed` flag and replies `AuthOk`; on mismatch it replies `AuthFail` and closes the
  connection. Any segment request (`Have`/`Put`/`Get`) on an unauthenticated connection closes it.
- **`QuicOriginClient::connect(addr, fp, token)`** performs the handshake immediately after the QUIC
  connection opens (awaiting `AuthOk`) and errors if rejected — so no segment request is sent before
  authentication. (The client awaits `AuthOk` before any other request, which guarantees the server
  processes the `Auth` stream first.)

## Architecture

Edits to `apps/cli/src/stream/quic_origin.rs` only:
```
enum SegMessage { Auth(String), AuthOk, AuthFail, Have(..), HaveResp(..), Put{..}, PutOk, Get(..), GetResp(..) }
serve_quic_origin(bind, backing, token: String) -> (addr, fingerprint, JoinHandle)
QuicOriginClient::connect(addr, fingerprint, token: &str) -> Result<Self>   // authenticates on connect
```
`commands/stream_demo.rs` passes a demo token (`"dits-demo-token"`) to both server and client.

## Error handling
- Wrong token → server replies `AuthFail` and closes; client `connect` returns an error.
- A segment request before `Auth` → connection closed (defensive).

## Testing
- `wrong_token_is_rejected`: a client with a bad token fails to connect; the correct token connects.
- Existing round-trip / delta-push tests now authenticate first and still pass.
- End-to-end `stream-demo --push` (token-gated): v1 pushes all, v2 pushes only the changed segment.

## Non-goals
- Per-client identities / capabilities, token issuance/rotation, expiry, and TLS client-cert auth
  (this is a single shared bearer token); rate limiting; auth on the future `/key` HTTP endpoint
  (same token would apply when that endpoint is built).

## Implementation status & verification (2026-06-03)

**Built and committed.** 38 stream tests green (incl. `wrong_token_is_rejected`). End-to-end
`stream-demo --push` authenticates with the token, then delta-pushes: v1 = 5 segments, v2 = 1 (only
the changed one). The handshake adds one round-trip at connect and no per-request overhead.
