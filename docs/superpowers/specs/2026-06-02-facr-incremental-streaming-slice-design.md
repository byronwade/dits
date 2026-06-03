# FACR Incremental Streaming — Proving Slice (Design Spec)

*Status: approved 2026-06-02. First production phase of the "FACR → incremental encode → streaming delivery" thesis.*

## Goal

Prove, with real running code and browser-visible playback, that a **frame-level diff**
is the signal that lets an encoder skip work: change a few source frames → re-encode only
the HLS segments covering them → re-deliver only those → the result plays correctly in a
browser. The headline metric: **naive re-encode touches 100% of segments; FACR touches ~1%.**

This is Phase 1 of a longer road to production (see Roadmap). It is deliberately the
smallest slice that demonstrates the whole thesis end to end.

## Thesis and why the naive approach fails

A video editor re-export re-quantizes the entire bitstream, so byte-level dedup of encoded
output ≈ 0. You therefore **cannot** rely on "encode v2, hash the segments, reuse the ones
that match" — independently re-encoding unchanged regions produces different bytes, so every
segment hash differs. The frame-level diff (over content-addressed canonical frames) is the
authoritative "what changed" signal; unchanged segments are then **reused byte-for-byte from
v1**, never re-derived. Correctness does not depend on encoder determinism.

## Foundations reused (verified present in code)

- `facr::video::ingest_video(path, store) -> ClipManifest` — FFmpeg decode of real video into
  content-addressed PNG frames. (`apps/cli/src/facr/video.rs`)
- `facr::video::reconstruct_video(manifest, store, output)` — frames → mp4.
- `facr::store::FrameStore` — content-addressed frame objects, BLAKE3, automatic dedup.
- `facr::manifest::{ClipManifest, FrameRef}` — ordered `{hash, pts, duration}` + `width/height/
  codec/timescale/frame_rate`.
- `facr::diff::diff_manifests(old, new) -> ClipDiff` — frame-level diff (`added/removed/shared`).
- `facr::codec::{RawFrame, FrameCodec, DeflateRawCodec}` — `RawFrame { width, height, data: Vec<u8> }`.
- `axum 0.7` + `tower-http 0.5` — already dependencies; the origin HTTP server adds **no new deps**.
- FFmpeg/ffprobe invoked as shell commands (existing pattern; no native binding crate).

## Architecture — new module `apps/cli/src/stream/`

Each unit is small and single-purpose.

### 1. `stream/edit.rs` — frame-native edit
```
regrade_range(manifest_v1: &ClipManifest, store: &FrameStore,
              frames: Range<usize>, adjustment: i16) -> Result<ClipManifest>
```
Loads only the targeted frames, decodes PNG → pixels, applies a brightness delta, re-encodes
PNG, re-stores (new hashes), returns `manifest_v2` = v1 with that range swapped. Mirrors FACR's
Edit Log `Grade{range,lut}`. Produces a surgically clean diff: only edited frames get new hashes.

### 2. `stream/encode.rs` — GOP-aligned segment encoder
```
struct SegmentLayout { fps_num: u32, fps_den: u32, segment_seconds: f64 }
impl SegmentLayout {
    fn segment_count(frame_count: usize) -> usize
    fn frames_per_segment() -> usize
    fn segment_of_frame(frame_idx: usize) -> usize
    fn frame_range(segment_idx: usize, frame_count: usize) -> Range<usize>
}
encode_segment(frames: &[RawFrame], layout: &SegmentLayout) -> Result<Vec<u8>>
```
Encodes one **closed-GOP, IDR-led, independently-spliceable** segment via FFmpeg
(`-g <frames_per_segment> -keyint_min <fps> -sc_threshold 0 -x264-params scenecut=0`,
fMP4 or TS). Keyframe interval == segment duration, so every segment boundary is an IDR.
Output bytes are content-addressed by BLAKE3.

### 3. `stream/incremental.rs` — the planner (brain)
```
struct IncrementalPlan { reused: Vec<usize>, reencoded: Vec<usize> }
plan(manifest_v1, manifest_v2, layout) -> IncrementalPlan
apply(plan, manifest_v2, store, v1: &StreamVersion, origin) -> Result<StreamVersion>
```
`plan` maps changed frames (from `diff_manifests`) → affected segment indices. `apply`
**copies v1's original segment bytes verbatim** for unchanged segments (identical hash → zero
transfer) and **encodes only changed segments** from the edited frames.

### 4. `stream/origin.rs` — swappable delivery seam
```
trait SegmentOrigin {
    fn has(&self, hash: &Hash) -> bool;
    fn put(&self, hash: &Hash, bytes: &[u8]) -> Result<()>;
    fn get(&self, hash: &Hash) -> Result<Vec<u8>>;
}
struct LocalDiskOrigin { root: PathBuf }   // impl #1
```
The QUIC delta-push origin is a future impl #2 with no rework upstream.

### 5. `stream/playlist.rs` — HLS emit
```
struct SegmentRef { index: usize, hash: Hash, duration: f64 }
struct StreamVersion { width: u32, height: u32, segments: Vec<SegmentRef> }
impl StreamVersion { fn to_hls(&self, seg_url_base: &str) -> String }
```
`.m3u8` referencing content-addressed segment URIs. v2's playlist shares unchanged segment
hashes with v1 → browser/CDN cache hit.

### 6. `stream/serve.rs` (axum) + `stream/web/player.html` (hls.js)
Routes: `GET /` (player page), `GET /v/{name}.m3u8`, `GET /seg/{hash}`, `GET /stats` (JSON).
Player loads v1 then v2 and shows a live "reused vs re-encoded / bytes touched" panel.

### 7. `commands/stream_demo.rs`
Orchestrates the run and prints the headline (baseline vs incremental). Registered in
`apps/cli/src/commands/mod.rs` following the `facr_demo` pattern; wired into the clap enum.

## Data flow
```
input.mp4 ─ingest_video→ manifest_v1 ─encode→ segments_v1 (hashed) → playlist_v1 → origin
regrade_range(v1, 4–6s) → manifest_v2
diff_manifests(v1,v2) → changed frames → changed segment idxs
   reused : copy v1 segment bytes (same hash, 0 work)
   changed: encode only those → segments_v2 → playlist_v2 → origin
axum origin → browser hls.js plays v1 then v2; panel shows reuse %
```

## Demo scenario (concrete)
~10s SD clip @ 30fps, 2s segments → 5 segments. Re-grade seconds 4–6 → frames 120–179 change
→ **1 segment re-encoded, 4 reused (80% reuse)**. CLI headline scales the framing: "on a
312-segment clip a 2-frame fix = 1 segment, 0.3% re-delivered."

## Testing
- **Frame-dedup assertion** (mirrors FACR spec): regrading M of N frames stores ~M new frame objects.
- **Incremental assertion**: `plan().reencoded` == segments overlapping the edited time range;
  every reused segment is byte-identical to v1 (same hash).
- **Strawman control**: full independent re-encode of v2 → segment hashes ≈ all differ, proving
  why frame-diff is required.
- **Layout unit tests**: `segment_of_frame` / `frame_range` boundary correctness.
- **Playlist validity** + hls.js smoke load.

## Error handling
- FFmpeg/ffprobe absence → actionable error (reuse `Segmenter::check_ffmpeg` pattern).
- Empty/zero-frame clip, edit range out of bounds → typed errors, no panics.
- Origin get/put failures propagate as `Result`; BLAKE3 verify on `get`.

## Non-goals (this slice) → mapped to roadmap phases
- Single rendition, no ABR ladder. → P2
- Deflate/PNG canonical frames keep the demo SD/short. Real intra codec (AV1-intra / JPEG-XL via
  the `FrameCodec` trait) for HD/long clips → P2
- Re-grade edit only; trim/insert (frame-index shift → segment realignment) → P4
- Video-only (audio handling) → follow-up
- QUIC delta-push origin → P3

## Roadmap to production (slice = P1)
- **P1 (this spec):** local, single rendition, deflate/PNG canonical, re-grade edit, browser proof.
- **P2:** real intra codec via `FrameCodec` (HD/long) + ABR ladder (incremental per rendition).
- **P3:** QUIC `SegmentOrigin` impl — delta-push only changed segments to a remote origin; CDN
  cache by content hash.
- **P4:** Edit Log trim/insert/reorder + OTIO/FCPXML import + per-shot encode optimization (VMAF).
- **P5:** productionization — auth, DRM, CMAF/DASH packaging, device QA.

## Module layout
```
apps/cli/src/stream/{mod,edit,encode,incremental,origin,playlist,serve}.rs
apps/cli/src/stream/web/player.html
apps/cli/src/commands/stream_demo.rs   (registered in commands/mod.rs + clap enum)
```
New dependencies: none.

## Implementation status & verification (2026-06-02)

**Built and committed** on `feat/facr-incremental-streaming`: the `stream/` module
(`layout`, `origin`, `playlist`, `encode`, `edit`, `incremental`, `serve` + `web/player.html`)
and the `dits stream-demo` command. 13 unit tests green (incl. FFmpeg-backed encode/edit).

**Execution refinements vs the design sketch:**
- Frames are PNG (from `ingest_video`), so the encoder takes PNG blobs and emits **independent
  MPEG-TS** segments (each auto-IDR, spliceable) rather than splitting one encode. Simpler, equally correct.
- `encode_segment` takes `ts_offset_seconds` (`-output_ts_offset`) so the HLS timeline stays
  continuous; the offset is a pure function of the segment's start frame, so hash stability (the
  reuse guarantee) is preserved.
- `stream_demo` is `async` (the binary is `#[tokio::main]`); it `.await`s `serve` rather than
  nesting a runtime.

### What is proven vs. not (honest status)

**PROVEN — incremental-encode + reuse economics (the hard part):**
- 5 segments; re-grade of 4–6s → **1 re-encoded (segment 2), 4 reused, 80% reuse**.
- Reuse is byte-exact: v1∩v2 share 4 identical segment hashes; exactly 1 differs.
- Re-delivered 19.1 KB vs 99.1 KB naive full re-encode.
- Served segments probe as h264 320×240. Reuse-by-copying-`SegmentRef` (never re-deriving)
  makes this independent of encoder non-determinism. This half ships.

**NOT YET PROVEN — clean browser playback:**
- The playlist uses `#EXT-X-DISCONTINUITY` between segments (each is an independent PTS-0
  timeline; the correct HLS representation of independently-encoded chunks). FFmpeg's HLS
  demuxer **re-bases the timeline correctly** at every seam (offsets 2/4/6/8s) and reconstructs
  a continuous 10s / 100-frame stream with no frame loss.
- However, FFmpeg is a maximally error-tolerant decoder; a clean FFmpeg decode is **not** proof
  of clean playback in **hls.js** (the actual target). Below the HLS layer, each independent TS
  resets MPEG-TS continuity counters, which FFmpeg's strict CLI demuxer flags as `Packet
  corrupt` at seams. hls.js remuxes TS→fMP4 and is designed to tolerate exactly this, so it is
  *expected* to play cleanly — but **this was not observed**: the automation browser tab is
  `visibility:hidden`, so Chrome keeps MediaSource `closed` and hls.js never reaches
  `MEDIA_ATTACHED`. Pixel-level playback in a real (visible) browser remains the one open
  verification.

**Next hardening (coupled to a visible-browser pass):** move to **CMAF/fMP4 segments with a
shared init segment** — eliminates TS continuity counters entirely (no seam corruption at any
layer) and is the standard modern packaging. Do this together with a foregrounded hls.js
playthrough so the format change is verified, not swapped blind. Aligns with the P2
codec/packaging phase.
