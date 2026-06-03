# Dits FACR — Frame-Addressable Canonical Representation (Design Spec)

*Status: approved 2026-06-02. Centerpiece feature: true git-like diffing and dedup for video/photo.*

## Problem

Content-defined chunking (FastCDC) cannot diff or dedup re-encoded video: any NLE re-export
re-quantizes the whole bitstream, so byte-level dedup → ~0. The current engine only dedups
appends, remux, metadata-only edits, and stream-copy trims. To deliver "real git diffing for
video," Dits must own a canonical, frame-level, content-addressed representation plus a
non-destructive edit log — and treat MP4/MOV/ProRes as import/export formats.

## Decisions (locked)

- **Fidelity:** configurable per-repo; default **visually-lossless** (ProRes 422 HQ), opt-in
  **true-lossless** for masters/archival.
- **Edit ownership:** Dits owns a **non-destructive edit log** (transforms over frame hashes)
  and **imports** EDL/FCPXML/Premiere XML/OTIO to reconstruct that log. This is what makes the
  "only changed frames stored" economics reachable.
- **v1 codec:** abstract the frame encoder behind a `FrameCodec` trait; ship **ProRes 422 HQ /
  DNxHR** first (industry-native, ffmpeg-trivial, intra-only). **Intra-AV1** is the
  compression-optimized second codec; **JPEG-XL** serves the stills/photo path. All implement the
  same trait.

## Architecture — five units

1. **`FrameCodec` (trait)** — `encode_frame(RawFrame) -> EncodedFrame` / `decode_frame(EncodedFrame) -> RawFrame`.
   Every frame is independently decodable (no inter-frame prediction). Impls: `ProResCodec` (v1,
   ffmpeg), `Av1IntraCodec` (v2), `JpegXlCodec` (photos). A conformance test suite all impls pass.
2. **Frame Store** — content-addressed `blake3(canonical_pixels) -> frame object`. Automatic dedup.
   **Residual coding:** on store, query a perceptual-hash index for the nearest prior frame; store a
   tile/motion delta when smaller than a full frame. Keeps near-identical frames (grades, denoise) cheap.
3. **Clip Manifest** — a video version = ordered `[{frame_hash, pts, duration}]` + stream metadata.
   The "git tree for pixels." Trim/reorder/insert = manifest edits with ~0 new bytes.
4. **Edit Log** — non-destructive transforms over frame ranges (`Trim`, `Insert`, `Reorder`,
   `Grade{range,lut}`, ...). **Importers** (`fcpxml`/`premiere`/`resolve`/`otio`) reconstruct the log
   from external timelines, reusing the existing `quick-xml` NLE parsing.
5. **Diff / Render** — `dits diff --visual` compares two clip manifests → changed frame ranges +
   regions, renders before/after thumbnails. Semantic diff and dedup from one structure.

## The two-path reality (explicit in the design)

- **Case A (edit authored/imported in Dits):** transforms over frame hashes → only changed frames
  stored; byte-exact, ~0 new bytes for untouched ranges. The revolution.
- **Case B (opaque external re-export re-ingested):** lossy re-quantization → exact frame hashes
  miss → fall back to perceptual-match + residual. Works, fuzzier/heavier. Design prefers Case A by
  pushing OTIO/EDL import to recover the edit log rather than diffing a flattened export.

## Data flow

- **Import:** `source → demux/decode → canonical frames (FrameCodec) → content-address + residual →
  Frame Store + Clip Manifest (+ Edit Log if timeline imported)`.
- **Checkout:** `manifest → decode frames → export deliverable in requested format` (reuses existing
  proxy/export machinery).

## Testing

- Golden-file **round-trip** on real footage (visually-lossless tolerance; bit-exact in lossless mode).
- **Dedup assertions:** a 3-frame grade on a 10k-frame clip stores ~3 frames (Case A), not 10k.
- **Importer** tests: FCPXML/OTIO → edit log → manifest matches expected frame ranges.
- `FrameCodec` conformance suite.

## Migration

Today's MP4 atom-split path remains v0. FACR ships behind a per-repo / `--facr` flag for ProRes
first; prove round-trip + dedup on real footage; ship `dits diff --visual`; then add AV1/JPEG-XL
codecs and the OTIO importer. Nothing existing is removed.

## Non-goals (v1)

- Real-time playback of the canonical store (export a deliverable instead).
- GPU transcode orchestration (later; ingest is CPU ffmpeg first).
- Network/P2P sync of frame objects (separate workstream; networking is currently stubbed).
