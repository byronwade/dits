# FACR Streaming — Segment Encryption (Design Spec)

*Status: approved 2026-06-03. P5 sub-project #1 of the FACR incremental-streaming roadmap.*

## Goal

Encrypt delivery segments (HLS AES-128 / `EXT-X-KEY`) **without breaking content-addressing**, so
reuse and the QUIC delta-push still move only changed segments — now in encrypted form.

## The core problem: encryption vs content-addressing

Encrypting changes bytes, which would break hash-stable reuse. Resolution: **hash the plaintext**
(reuse identity stays stable) *and* **encrypt deterministically** — a fixed content key plus a
per-segment IV **derived from the plaintext's content hash**. Same plaintext → same IV → same
ciphertext → the *encrypted* segment is itself content-addressable. An unchanged segment encrypts to
identical bytes across versions, so reuse holds and the QUIC delta-push still transfers only changed
encrypted segments.

## Approach (chosen of two)

- **A — full-segment AES-128-CBC + `EXT-X-KEY`, deterministic IV (CHOSEN).** Standard HLS AES-128:
  encrypt the whole segment with AES-128-CBC + PKCS7; the playlist carries
  `#EXT-X-KEY:METHOD=AES-128,URI=...,IV=0x...`. hls.js decrypts segment bytes before demuxing.
  Pure-Rust (`aes` + `cbc`), deterministic, unit-testable (encrypt→decrypt round-trip), objectively
  verifiable (decrypt a served segment → valid fMP4).
- B — SAMPLE-AES / CENC (cbcs) for fMP4: the modern DRM packaging (per-sample encryption, PSSH boxes,
  CENC signaling) — far more complex and only meaningful with a license server. Deferred; it is the
  bridge to Widevine/FairPlay/PlayReady, out of scope here.

## Architecture

### `stream/crypto.rs` (new)
```
pub struct SegmentKey { pub key: [u8; 16] }
impl SegmentKey { pub fn from_passphrase(p: &str) -> Self }   // sha256(p)[..16]

/// Per-segment IV from the plaintext segment's content hash (deterministic).
pub fn derive_iv(plaintext_hash: &Hash) -> [u8; 16]            // hash bytes[..16]

pub fn encrypt_segment(plaintext: &[u8], key: &SegmentKey, iv: &[u8; 16]) -> Vec<u8>   // AES-128-CBC + PKCS7
pub fn decrypt_segment(ciphertext: &[u8], key: &SegmentKey, iv: &[u8; 16]) -> Result<Vec<u8>>
```

### Build path (encryption on)
For each segment: encode plaintext → `plaintext_hash = blake3(plaintext)` (reuse id) →
`iv = derive_iv(plaintext_hash)` → `ciphertext = encrypt_segment(...)` → store the **encrypted**
bytes content-addressed by `blake3(ciphertext)`; record the IV. Because every step is deterministic,
an unchanged plaintext segment yields identical ciphertext → identical encrypted hash → reuse holds.

### `stream/playlist.rs`
Emit a `#EXT-X-KEY:METHOD=AES-128,URI="<base>key",IV=0x<hex>` line before each segment (per-segment
IV). `SegmentRef` gains an optional `iv: Option<[u8;16]>`.

### `stream/serve.rs`
A `GET /key` endpoint returns the 16-byte key. **In real DRM this is the license-server-gated step;
here it is served openly — that boundary is exactly what the P5 auth piece and real DRM protect.**

### `commands/stream_demo.rs`
`--encrypt` flag: build encrypted segments, report, serve. Objective verification: fetch a served
segment, decrypt with key+IV, and confirm it probes as valid h264.

## Data flow
```
frames -> encode plaintext segment -> plaintext_hash (reuse id)
       -> iv = derive_iv(plaintext_hash)
       -> ciphertext = AES-128-CBC(plaintext, key, iv)  [deterministic]
       -> store ciphertext (content-addressed by blake3(ciphertext))
playlist: EXT-X-KEY(method=AES-128, uri=/key, iv) + encrypted segment URIs
```

## Error handling
- `decrypt_segment`: bad padding / wrong key → typed error (not a panic).
- Key endpoint always returns the demo key (no rotation); documented as the gated point.

## Testing
- `encrypt_segment` → `decrypt_segment` round-trip returns the plaintext; ciphertext ≠ plaintext and
  is a 16-byte multiple.
- **Determinism:** same plaintext+key → identical ciphertext (the reuse guarantee); `derive_iv` is
  stable for a given hash.
- `SegmentKey::from_passphrase` is stable.
- End-to-end `--encrypt`: a served segment decrypted with key+IV probes as valid fMP4/h264; reuse
  still holds across a re-grade (identical plaintext segments → identical ciphertext → reused).

## Non-goals
- SAMPLE-AES / CENC (cbcs); license servers (Widevine/FairPlay/PlayReady); key rotation; the init
  segment is left in the clear (HLS AES-128 commonly encrypts media segments; the init carries only
  codec config). Auth on the key endpoint is P5 #2.

## Module layout
New: `apps/cli/src/stream/crypto.rs`. Edits: `apps/cli/src/stream/{playlist}.rs`,
`apps/cli/src/commands/stream_demo.rs`, `apps/cli/src/main.rs` (`--encrypt`), `apps/cli/Cargo.toml`
(`cbc`, `aes` as direct deps).

## Implementation status & verification (2026-06-03)

**Built and committed.** 37 stream tests green (incl. 3 crypto: encrypt→decrypt round-trip,
determinism, wrong-key; + an `EXT-X-KEY` playlist emit test). New deps: `aes 0.8`, `cbc 0.1`.

**End to end** (`dits stream-demo --encrypt`): 4 segments encrypted (60.3 KB ciphertext);
**deterministic = yes** (same plaintext → identical ciphertext hash → reuse + delta-push survive);
**decrypt → valid h264 = yes** (a sample segment round-trips to playable media); a 4-line AES-128
`EXT-X-KEY` playlist is emitted.

**Scope realised vs sketch:** the `--encrypt` demo reports objectively (encrypt/determinism/
decrypt-to-valid-media) rather than wiring the full `/key` HTTP serve + browser playback (the
encrypted `EXT-X-KEY` playlist is emitted and unit-tested; browser playback is blocked by the
hidden automation tab, as in prior phases). The `/key` endpoint + auth gating is P5 #2.
