# FACR Streaming — JPEG-XL Canonical Frames (Design Spec)

*Status: approved 2026-06-02. P2 sub-project #2 of the FACR incremental-streaming roadmap.*

## Goal

Replace PNG canonical frames with **JPEG-XL** in the streaming pipeline, cutting frame-store
size ~5.7× at visually-lossless quality while preserving the determinism that content-addressing
(and therefore dedup + incremental reuse) depends on. This is the unlock for HD/long clips — PNG
frames are the current scaling blocker.

## Decision and why (measured)

On a detailed 1280×720 frame:

| Codec | Size | Deterministic? |
|---|---|---|
| PNG (current) | 475 KB | yes |
| JPEG-XL lossless (distance 0) | 280 KB | **yes** |
| JPEG-XL distance 1 (visually lossless) | **83 KB (5.7×)** | **yes** |
| AV1-intra (libaom / libsvtav1) | 48–96 KB | **NO** |
| ProRes 422 HQ | 402 KB | yes (barely smaller) |

Content-addressing requires byte-identical output on re-encode. **AV1 is non-deterministic**
(multithreaded encoders, non-deterministic even at `-threads 1` in testing) — it would make frame
hashes unstable and destroy dedup/reuse, so it is rejected. ProRes is deterministic but barely
smaller than PNG. **JPEG-XL is the only option that is both deterministic and a large win**, and
it matches the FACR design's "JPEG-XL for the stills path" — our per-frame store *is* stills.

Default fidelity: **distance 1 (visually lossless)**; opt-in **`--lossless`** (distance 0) for
true masters. Determinism is achieved with `-threads 1` (verified byte-identical across runs,
including after the regrade filter).

## Verified feasibility (FFmpeg 8.0.1)

- `libjxl` encoder present; JXL encode is deterministic at `-threads 1` (distance 0/1/2 all
  byte-identical across two runs).
- `ffmpeg -i frame.jxl -c:v libx264 …` decodes JXL into the delivery encode (segment path).
- `ffmpeg -i frame.jxl -vf eq=brightness=.3 -c:v libjxl -distance 1 -threads 1 out.jxl` works and
  is deterministic (regrade path).

## Source of truth: `manifest.codec`

`ClipManifest` already carries `codec: String` (`"png"` today). It becomes `"jxl"`, and every
consumer derives the frame-file extension from it. The format flows through the pipeline with no
new plumbing or threading of extra parameters beyond reading `manifest.codec`.

```
fn frame_ext(codec: &str) -> &str  // "jxl" -> "jxl", anything else -> "png"
```

## Architecture (scoped to streaming; existing FACR commands untouched)

### 1. `facr/video.rs`
```
pub enum FrameFormat { Png, JpegXl { distance: f32 } }
impl FrameFormat {
    fn codec_name(&self) -> &'static str   // "png" | "jxl"
    fn ext(&self) -> &'static str          // "png" | "jxl"
    fn encode_args(&self) -> Vec<String>   // [] | ["-c:v","libjxl","-distance","1","-threads","1"]
}
pub fn ingest_video_with_format(path, store, fmt: FrameFormat) -> Result<ClipManifest>
pub fn ingest_video(path, store) -> Result<ClipManifest>  // = ingest_video_with_format(.., Png)
```
- JXL ingest: `ffmpeg -v error -i <in> -c:v libjxl -distance <d> -threads 1 f_%08d.jxl`, then
  store each `.jxl` content-addressed; `manifest.codec = "jxl"`. The PNG wrapper keeps
  `facr-add` / `facr-checkout` byte-for-byte unchanged.
- `reconstruct_video` already auto-detects input format (ffmpeg reads `.jxl`); only the temp
  frame filename extension is derived from `manifest.codec`.

### 2. `stream/encode.rs`
- `encode_cmaf_segment(frame_blobs, frame_rate, frame_ext)` writes temp frames as
  `f_%08d.<frame_ext>`; ffmpeg reads `.jxl` natively into libx264. (One param added; callers
  pass `frame_ext(&manifest.codec)`.)

### 3. `stream/edit.rs`
- `regrade_range` decodes the stored frame, applies the `eq` brightness filter, and re-encodes
  in the manifest's format (`.jxl` with `-threads 1`), deterministically. The graded frame's new
  hash is what changes — same as today, just a different still codec.

### 4. `stream/incremental.rs`
- Threads `frame_ext(&manifest.codec)` into `encode_cmaf_segment`. No logic change.

### 5. `commands/stream_demo.rs`
- Ingest via `ingest_video_with_format(.., JpegXl{ distance })`; add `--lossless` flag
  (distance 0 vs default 1). Report **frame-store size** (sum of stored frame bytes) so the
  storage win is visible in the headline.

## What stays identical
CMAF delivery, frame-diff → reuse-by-hash → incremental builder, segment hashing,
`tfdt` continuous-timeline patch. This swaps only the canonical frame codec. Determinism is
preserved, so reuse stays byte-exact.

## Honest scope note
The `FrameCodec` trait (`RawFrame` ↔ bytes, with `DeflateRawCodec`) serves the synthetic/photo
path. The video/streaming path uses ffmpeg-managed compressed frame *files* (as PNG does today);
JPEG-XL plugs in there the same way. We are **not** routing JXL through the `RawFrame` trait
(YAGNI) — a `JpegXlCodec` impl of that trait can come later if the photo path needs it.

## Error handling
- `libjxl` missing → actionable error (extend the ffmpeg capability check or surface ffmpeg's
  stderr).
- Determinism guard in tests: re-ingest must produce identical hashes; if a future ffmpeg/libjxl
  build is non-deterministic, the test fails loudly rather than silently breaking dedup.

## Testing
- **Determinism / dedup:** ingest the same clip twice as JXL → identical manifests, frame store
  count unchanged (mirrors the existing PNG dedup test).
- **Round-trip:** ingest JXL → `reconstruct_video` → ffprobe reports the original resolution.
- **JXL→delivery:** `encode_cmaf_segment` on JXL frames probes as h264.
- **Regrade:** changes only targeted frames; diff bounded; graded frames deterministic.
- **Size win:** JXL frame store is materially smaller than the PNG store for the same clip
  (assert JXL total bytes < PNG total bytes).
- **End-to-end:** `stream-demo` still reports 80% reuse; headline shows the frame-store size.

## Non-goals
- AV1-intra / ProRes canonical codecs (rejected/again later); ABR ladder (P2 #3); the
  perceptual-hash residual coding from the FACR design; routing JXL through the `RawFrame` trait.

## Module layout
Edits only: `apps/cli/src/facr/video.rs` and `apps/cli/src/stream/{encode,edit,incremental}.rs`
+ `apps/cli/src/commands/stream_demo.rs`. No new files, no new dependencies.
