# FACR Streaming — ABR Ladder (Design Spec)

*Status: approved 2026-06-02. P2 sub-project #3 of the FACR incremental-streaming roadmap.*

## Goal

Serve multiple renditions (e.g. 720p / 480p / 240p) behind an HLS **master playlist** so the
player adapts to bandwidth, with **per-rendition incremental reuse**: the frame-diff is identical
across renditions, so a changed segment re-encodes in every rung while unchanged segments still
reuse byte-for-byte within their rung.

## Approach (chosen of three)

- **A — independent per-rendition encode from the canonical frames (CHOSEN).** Each rung
  downscales and encodes the *same* JPEG-XL canonical frames (`decode → scale=-2:H → libx264
  -b:v Nk`). One canonical frame store feeds every rung — no per-rung frame storage. Per-rendition
  incremental reuse falls straight out of the existing `build_full`/`build_incremental`.
- B — encode the top rung then transcode down: generational quality loss, breaks the frame-native
  model. Rejected.
- C — a separate frame store per rendition: wasteful, defeats the single canonical store. Rejected.

## Key invariants

- `plan()` (which segments changed) is **rendition-independent** — computed once, reused for every
  rung.
- A segment's media+init hashes legitimately differ per rung (different resolution/bitrate → different
  encode). Reuse is **within a rung across versions** (v1→v2), exactly as before.
- The ladder **auto-caps to the source height** — never upscale.

## Architecture (extend the existing `stream/` module)

### 1. `stream/encode.rs`
```
pub struct EncodeProfile { pub height: Option<u32>, pub bitrate_kbps: Option<u32> }
impl EncodeProfile { pub fn source() -> Self }   // {None, None} = encode at source res, today's behavior
encode_cmaf_segment(frame_blobs, frame_rate, frame_ext, profile: &EncodeProfile) -> Result<CmafSegment>
```
- When `height` is set, add `-vf scale=-2:<h>` (even-width preserving aspect). When `bitrate_kbps`
  is set, add `-b:v <n>k -maxrate <n>k -bufsize <2n>k`; otherwise keep the current CRF-less default.
- `source()` reproduces today's output exactly (no scale, no bitrate) so existing tests are unaffected
  aside from the added argument.

### 2. `stream/ladder.rs` (new, small)
```
pub struct Rendition { pub name: String, pub height: u32, pub bitrate_kbps: u32 }
impl Rendition { pub fn profile(&self) -> EncodeProfile }
/// Default ladder, filtered to rungs at/below the source height (never upscales).
pub fn default_ladder(source_height: u32) -> Vec<Rendition>
```
Default rungs: `720p@2500k`, `480p@1200k`, `240p@500k` (each kept only if `height <= source_height`;
if all exceed the source, fall back to a single source-height rung).

### 3. `stream/incremental.rs`
- `build_full` and `build_incremental` take `profile: &EncodeProfile`, threaded into
  `encode_and_store` → `encode_cmaf_segment`. `plan()` is unchanged and called once by the caller,
  then reused for every rung.

### 4. `stream/playlist.rs`
```
pub fn master_playlist(rungs: &[(Rendition, String /* media playlist uri */)]) -> String
```
Emits `#EXTM3U` + one `#EXT-X-STREAM-INF:BANDWIDTH=<bitrate*1000>,RESOLUTION=<w>x<h>` line per rung
pointing at that rung's media playlist. `StreamVersion::to_hls` is unchanged (the per-rung media
playlist). Rung pixel width for `RESOLUTION` = even-rounded `source_w * height / source_h`.

### 5. `stream/serve.rs`
- `GET /v/{version}.m3u8` → master playlist (rung URIs `/r/{version}/{rendition}.m3u8`).
- `GET /r/{version}/{rendition}.m3u8` → that rung's media playlist (`StreamVersion::to_hls`).
- `GET /seg/{hash}` → unchanged (content-addressed init/media).
- `ServeState` holds, per version, a `Vec<(Rendition, StreamVersion)>` (the ladder).

### 6. `commands/stream_demo.rs`
- Bump the generated demo source to **1280×720** so the ladder is real.
- Build the ladder for v1 and v2: `plan()` once, then per rung `build_full` (v1) and
  `build_incremental` (v2) with the rung's profile.
- Report **per-rung reuse** and totals: "across R renditions, K of (R×segments) re-encoded".
- `player.html` is unchanged — hls.js loads the master playlist and auto-switches rungs.

## Data flow
```
canonical JXL frames (one store)
  plan(v1,v2)  ── once, rendition-independent
  for each rung r:
    v1: build_full(manifest_v1, …, r.profile())      -> StreamVersion_r
    v2: build_incremental(v1_r, manifest_v2, plan, r) -> StreamVersion_r   (reuse within rung)
master playlist (per version) -> rung media playlists -> content-addressed segments
```

## Error handling
- A rung whose `height > source` is filtered out before encoding (no upscaling).
- ffmpeg scale/bitrate failures surface the existing typed error.
- Empty ladder is impossible (fallback rung at source height).

## Testing
- `EncodeProfile{height:240}` → segment probes at the scaled resolution (even width, height 240).
- `EncodeProfile::source()` → byte-identical to the pre-ABR encode for the same frames (no regression).
- `default_ladder(720)` → 3 rungs; `default_ladder(360)` → only ≤360 rungs; `default_ladder(120)` →
  single source rung.
- Per-rung incremental: `plan()` reused; changed-segment set identical across rungs; unchanged
  segments byte-exact within a rung.
- `master_playlist` → one `STREAM-INF` per rung with correct `RESOLUTION`/`BANDWIDTH`, each pointing
  at the rung media URI.
- End-to-end: master playlist loads; each rung's media playlist decodes to the full frame count;
  reuse holds per rung; headline reports per-rung reuse.

## Non-goals
- Audio renditions / alternate audio groups; subtitle tracks; per-title or per-shot bitrate
  optimization (VMAF) — that is P4. CMAF and JPEG-XL are unchanged.

## Module layout
New: `apps/cli/src/stream/ladder.rs`. Edits: `apps/cli/src/stream/{encode,incremental,playlist,serve}.rs`
+ `apps/cli/src/commands/stream_demo.rs`. No new dependencies.
