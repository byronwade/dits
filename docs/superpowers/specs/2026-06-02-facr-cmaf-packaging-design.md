# FACR Streaming — CMAF/fMP4 Packaging (Design Spec)

*Status: approved 2026-06-02. P2 sub-project #1 of the FACR incremental-streaming roadmap.*

## Goal

Replace the independent MPEG-TS delivery segments (from the proving slice) with
**fragmented-MP4 / CMAF**: one shared init segment plus per-segment `.m4s` media fragments.
This removes the MPEG-TS continuity-counter corruption entirely (there is no TS layer), gives
production-standard packaging that the ABR ladder (P2 #3) will build on, and keeps the
FACR frame-diff → reuse-by-hash → incremental machinery completely unchanged.

## Context

The proving slice (`docs/superpowers/specs/2026-06-02-facr-incremental-streaming-slice-design.md`)
delivers each segment as an independently-encoded `.ts` file. That plays cleanly in hls.js
(user-verified), but each independent TS resets MPEG-TS continuity counters, which strict
demuxers flag as `Packet corrupt` at seams. CMAF eliminates the TS layer.

## The load-bearing tension (and resolution)

CMAF media fragments carry a `baseMediaDecodeTime` (timeline position). Patching it per segment
for a continuous timeline would make a segment's **bytes depend on its position**, so reused
segments would no longer hash-match — breaking the reuse model that is the whole point.

**Resolution:** every media fragment keeps `baseMediaDecodeTime = 0` (the natural output of an
independent per-segment encode) → bytes depend only on the frames → hash-stable → reuse
preserved. Seams are marked with `#EXT-X-DISCONTINUITY` so the player re-bases each fragment,
exactly as in the TS version. CMAF still wins: no TS continuity counters means no seam
corruption at any layer, and it is the modern container CDNs/players expect.

## Approach (chosen of three)

- **A — per-segment independent fMP4 + one shared init (CHOSEN).** Encode each segment's frames
  to a fragmented MP4 (`-movflags +empty_moov+frag_keyframe+default_base_moof`), then split the
  byte stream at the first `moof` box: `[ftyp+moov]` = **init** (shared), `[moof+mdat…]` =
  **media** (per-segment, content-addressed, position-independent). The init carries only codec
  config (SPS/PPS, track/timescale), which is constant across same-resolution encodes, so one
  init — extracted once — serves every media fragment. Preserves the reuse model exactly.
- **B — continuous-timeline fMP4 (patch `baseMediaDecodeTime`).** Cleaner playlist, but breaks
  hash-stable reuse. Rejected.
- **C — ffmpeg `hls`/`dash` fMP4 muxer over a full encode.** Does not fit independent
  per-segment re-encode / reuse. Rejected for the incremental path.

## FFmpeg feasibility (verified, 8.0.1)

`mp4` muxer present; fragmented output via `-movflags`. Encoders available: libx264 (delivery),
plus libaom-av1/libsvtav1, libjxl, prores, dnxhd for later phases. The pipeline stays
shell-FFmpeg (no native binding), matching the existing pattern.

## Architecture — edits to the existing `stream/` module

### 1. `stream/encode.rs`
```
struct CmafSegment { init: Vec<u8>, media: Vec<u8> }
encode_cmaf_segment(frame_pngs: &[Vec<u8>], frame_rate: &str) -> Result<CmafSegment>
```
- Writes PNG frames to a temp dir; runs ffmpeg:
  `ffmpeg -v error -y -framerate <fr> -start_number 0 -i f_%08d.png
   -c:v libx264 -preset veryfast -pix_fmt yuv420p -sc_threshold 0 -an
   -movflags +empty_moov+frag_keyframe+default_base_moof -f mp4 out.mp4`
- `split_fmp4(bytes) -> (init, media)`: scan top-level boxes (`u32 size` big-endian + 4-byte
  type); init = bytes before the first `moof`, media = bytes from the first `moof` to EOF.
- The independent encode naturally yields `baseMediaDecodeTime = 0` (position-independent media).

The TS encoder (`encode_segment`) is **removed** — the streaming slice is its only consumer and
YAGNI says don't keep two delivery formats.

### 2. `stream/playlist.rs`
- `StreamVersion` gains `init_hash: Hash`.
- `to_hls(seg_url_base)` emits:
  ```
  #EXTM3U
  #EXT-X-VERSION:7
  #EXT-X-TARGETDURATION:<n>
  #EXT-X-MEDIA-SEQUENCE:0
  #EXT-X-PLAYLIST-TYPE:VOD
  #EXT-X-MAP:URI="<base><init_hash>.mp4"
  (per segment: optional #EXT-X-DISCONTINUITY, #EXTINF, <base><hash>.m4s)
  #EXT-X-ENDLIST
  ```

### 3. `stream/incremental.rs`
- `encode_and_store` now returns the media hash/duration **and** stashes the init bytes once
  (first segment) so the version can carry `init_hash`. `build_full` / `build_incremental`
  return `StreamVersion` with `init_hash`; reuse of unchanged segments is unchanged (media
  fragments are still hash-addressed and position-independent).

### 4. `stream/serve.rs`
- Serve init (`.mp4` → `video/mp4`) and media (`.m4s` → `video/mp4`) by hash. The `/seg/:name`
  handler strips `.mp4`/`.m4s` and looks up the hash in the origin (init and media both live in
  the same content-addressed origin).

## Data flow (unchanged except container)
```
frames ─encode_cmaf_segment→ {init, media}
   init  -> stored once, content-addressed -> StreamVersion.init_hash
   media -> content-addressed per segment (position-independent)
playlist: EXT-X-MAP(init) + .m4s media (+ discontinuity seams)
reuse: unchanged media hashes copied across versions (0 re-transfer)
```

## Error handling
- ffmpeg failure → typed error (existing pattern).
- `split_fmp4`: if no `moof` box is found, error ("ffmpeg did not produce a fragmented mp4").
- Box scan guards against truncated/oversized box sizes (size < 8 or running past EOF → error).

## Testing
- `encode_cmaf_segment` returns non-empty init and media; the **init+media concatenation probes
  as h264** at the expected resolution (ffprobe).
- **Init determinism:** two independent encodes of the same frames at the same resolution
  produce **byte-identical init** segments (the assumption that one shared init works + that
  reuse is hash-stable). If ffmpeg embeds nondeterministic moov fields (e.g. creation time),
  add the minimal flag to neutralize them and re-assert.
- `split_fmp4` unit test on a known fMP4 blob: split point is exactly the first `moof`; init
  starts with `ftyp`; media starts with `moof`.
- Playlist emits `#EXT-X-VERSION:7`, one `#EXT-X-MAP`, `.m4s` media URIs, discontinuity seams.
- Reuse still byte-exact: v1∩v2 share unchanged media hashes; init hash identical across versions.
- End-to-end `stream-demo` headline unchanged (80% reuse); **user-verified browser playback**
  with no seam corruption (the win over TS).

## Non-goals
- ABR ladder (P2 #3) and real intra codec (P2 #2) are separate sub-projects.
- Audio (still video-only).
- DRM/encryption (P5).

## Module layout
Edits only: `apps/cli/src/stream/{encode,playlist,incremental,serve}.rs`. No new files, no new
dependencies.
