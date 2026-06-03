# FACR Streaming — Trim/Insert Edits + Content-Defined Boundaries (Design Spec)

*Status: approved 2026-06-03. P4 sub-project #2 of the FACR incremental-streaming roadmap.*

## Goal

Support **trim and insert** edits that shift frame positions, while preserving incremental reuse —
the FACR thesis applied to the timeline. The enabling mechanism is **content-defined segment
boundaries** (FastCDC over the frame-hash sequence) plus **position-independent segments**, so an
insert/trim only re-encodes the segment(s) at the edit boundary; everything before *and after*
reuses by content.

## The problem

Fixed-duration boundaries (`frame_idx / frames_per_segment`) make reuse depend on frame *index*.
Re-grade works (frames change in place, indices stable), but trim/insert shift every downstream
index, so every segment after the edit contains different frames → reuse collapses to ~0.

## The fix and the tension

1. **Content-defined boundaries:** a rolling/gear hash over the sequence of 32-byte frame hashes
   chooses boundaries by content (boundary when `hash & mask == 0`, bounded by min/avg/max in
   frames). An insert disturbs only the boundary near the edit; the frame runs before and after keep
   the same boundaries → same content → reuse.
2. **Position independence (the crux):** the CMAF continuous-timeline patches
   `baseMediaDecodeTime = start_frame × ticks`, which is position-dependent — after an insert a
   reused segment's bytes would change. So edit-resilient reuse **requires** position-independent
   segments (`bMDT = 0`), with the player re-basing via `#EXT-X-DISCONTINUITY`.

## Approach (chosen of three)

- **A — `bMDT=0` + `#EXT-X-DISCONTINUITY` + content-defined boundaries (CHOSEN).** Each segment is its
  own PTS-0 timeline; reuse survives trim/insert (content-defined *and* position-independent). Keeps
  content-addressing pure (stored bytes == served bytes == hash). Playback relies on the player
  handling discontinuities — validated in hls.js in P1. The CDC reuse logic is fully unit-testable
  without ffmpeg, so the centerpiece claim is objectively verifiable.
- B — continuous-timeline + content-defined boundaries: reuse still breaks after the edit (bMDT
  shift). Rejected — defeats the purpose.
- C — store `bMDT=0` (full dedup) but patch bMDT to a continuous timeline **at serve time**,
  addressing delivered segments by (version, index) rather than content hash. Cleaner playback, but
  splits storage identity from delivery bytes and complicates serve + the QUIC delta-push. The right
  *production* refinement; **deferred**.

The existing fixed-boundary continuous-timeline modes (re-grade / ABR / VMAF) are unchanged; the new
CDC behavior is a separate `--edit` path.

## Architecture (`stream/`)

### `stream/edit.rs`
```
/// Delete frames [range) -> v2 manifest (shifts the tail left).
fn trim_range(base: &ClipManifest, range: Range<usize>) -> Result<ClipManifest>
/// Insert `frames` (FrameRefs, already in the store) at index `at` -> v2 manifest (shifts the tail right).
fn insert_frames(base: &ClipManifest, at: usize, frames: &[FrameRef]) -> Result<ClipManifest>
```
Pure manifest manipulations (the frame store already holds/dedups the frames).

### `stream/cdc.rs` (new)
```
pub struct CdcSegment { pub frames: Range<usize>, pub content_id: Hash }
pub struct CdcParams { pub min: usize, pub avg: usize, pub max: usize }
/// Content-defined segmentation of a manifest's frame-hash sequence.
pub fn cdc_segments(manifest: &ClipManifest, p: &CdcParams) -> Vec<CdcSegment>
```
- Gear hash: maintain a 64-bit rolling hash fed by each frame's 32-byte hash; cut when
  `hash & mask == 0` (`mask` from `avg`), respecting `min`/`max` frame counts. Deterministic.
- `content_id = blake3(concat of the segment's frame hashes)` — the segment's reuse identity.

### `stream/incremental.rs`
```
pub struct CdcPlan { pub reused: Vec<CdcSegment>, pub reencoded: Vec<CdcSegment> }
/// Reuse = v2 CDC segments whose content_id appears in v1; re-encode the rest.
pub fn plan_cdc(v1: &ClipManifest, v2: &ClipManifest, p: &CdcParams) -> CdcPlan
/// Build a version from CDC segments (position-independent, bMDT=0), reusing media by content_id.
pub fn build_cdc(manifest, store, params, origin, prev: Option<&CdcBuilt>) -> Result<CdcBuilt>
```
- `CdcBuilt` carries the ordered `SegmentRef`s (media hash per segment) + the shared `init_hash` +
  a map `content_id -> SegmentRef` so the next version can reuse media bytes by content id.
- Encoded media uses `bMDT=0` (no `set_base_media_decode_time` call) so identical frame-runs produce
  identical bytes regardless of position.

### `stream/playlist.rs`
- `StreamVersion::to_hls_discontinuous(seg_url_base)` (or a `discontinuous: bool` arg): emits
  `#EXT-X-MAP` + per-segment `#EXT-X-DISCONTINUITY` (each segment is an independent PTS-0 fragment).
  The existing continuous `to_hls` stays for the fixed-boundary modes.

### `commands/stream_demo.rs`
- `--edit insert|trim` mode: build v1 with `build_cdc`; apply the edit (insert a short clip / trim a
  range) → v2; `build_cdc(v2, prev=v1)`; report **segments reused vs re-encoded** and contrast with
  what fixed boundaries would have given (~0 reuse after the edit). Serve discontinuous playlists.

## Data flow
```
v1 frames -> cdc_segments -> encode each (bMDT=0) -> content_id -> SegmentRef map
edit (trim/insert) -> v2 frames -> cdc_segments
   reused   = content_id in v1 map -> reuse SegmentRef (0 re-encode)
   reencoded = new content_id -> encode (bMDT=0) -> store
playlist: EXT-X-MAP(init) + per-segment EXT-X-DISCONTINUITY
```

## Error handling
- Trim/insert out-of-bounds → typed error.
- CDC `min/avg/max` sanity (`0 < min <= avg <= max`) checked.
- Empty manifest → empty segment list (no panic).

## Testing
- **CDC shift-resilience (centerpiece, no ffmpeg):** insert N frames mid-clip → only the boundary
  segment's `content_id` changes; segments wholly before and after keep their ids. Trim likewise.
- **CDC determinism:** same manifest → same boundaries/content_ids.
- **Reuse vs fixed contrast:** `plan_cdc` reuses ≥ most segments after an insert; a fixed-boundary
  plan over the same edit reuses ~0 after the edit point (asserted side by side).
- **Edit ops:** `trim_range`/`insert_frames` produce the expected frame sequences and lengths.
- **End-to-end:** `--edit insert` reuses most segments; the discontinuous playlist decodes to the
  full (post-edit) frame count; browser playback confirmed separately.

## Non-goals
- Reorder edits; the serve-time continuous-timeline refinement (Approach C); CDC across the ABR
  ladder / VMAF (those keep fixed boundaries); merge of timelines.

## Module layout
New: `apps/cli/src/stream/cdc.rs`. Edits: `apps/cli/src/stream/{edit,incremental,playlist}.rs`,
`apps/cli/src/commands/stream_demo.rs`, `apps/cli/src/main.rs` (`--edit` flag). No new dependencies.
