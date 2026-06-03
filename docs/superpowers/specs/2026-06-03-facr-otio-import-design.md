# FACR Streaming — OTIO Timeline Import (Design Spec)

*Status: approved 2026-06-03. P4 sub-project #3 (final) of the FACR incremental-streaming roadmap.*

## Goal

Reconstruct an edit as a FACR manifest **from an external OpenTimelineIO (OTIO) timeline**, so an
externally-authored cut/reorder/trim costs **~0 new frames** — every frame already lives in the
content-addressed store; the timeline only says which source frames appear, and in what order.
Combined with content-defined boundaries (P4 #2), importing an edit reuses almost everything.

## Format: OTIO JSON

OpenTimelineIO is the interchange format NLEs export to; it is JSON-native (serde_json is already a
dependency) and is the "common model" the FACR design names. We parse the minimal subset we need and
ignore the rest (schema tags, effects, markers).

Relevant shape:
```json
{ "OTIO_SCHEMA": "Timeline.1",
  "tracks": { "OTIO_SCHEMA": "Stack.1", "children": [
    { "OTIO_SCHEMA": "Track.1", "children": [
      { "OTIO_SCHEMA": "Clip.1", "name": "...",
        "media_reference": { "target_url": "source.mp4" },
        "source_range": {
          "start_time": { "value": 30, "rate": 10 },
          "duration":   { "value": 20, "rate": 10 } } } ] } ] } }
```

## Architecture

### `stream/otio.rs` (new)
```
// Minimal deserialization structs (serde_json; unknown fields ignored).
struct Timeline { tracks: Stack }
struct Stack { children: Vec<Track> }
struct Track { children: Vec<Item> }
// Items are clips or gaps; we model the clip fields we need and tolerate others.
struct Clip { name: Option<String>, media_reference: MediaRef, source_range: TimeRange }
struct MediaRef { target_url: Option<String> }
struct TimeRange { start_time: RationalTime, duration: RationalTime }
struct RationalTime { value: f64, rate: f64 }

pub struct ImportClip { pub source: String, pub start: usize, pub count: usize }

/// Parse an OTIO JSON document into the ordered clips of its first video track.
pub fn parse_otio(json: &str) -> Result<Vec<ImportClip>>

/// Reconstruct a manifest by concatenating, in order, `frames[start .. start+count]` from each
/// clip's named source. Frames are reused FrameRefs (already content-addressed in the store).
pub fn timeline_to_manifest(
    clips: &[ImportClip],
    sources: &HashMap<String, &ClipManifest>,
) -> Result<ClipManifest>
```
- `start`/`count` come from `source_range.start_time.value` / `duration.value` (rounded to whole
  frames). The first source's `width/height/codec/frame_rate` seed the output manifest.
- A clip referencing an unknown source, or a range past the source length, is a typed error.
- OTIO's `tracks.children` may hold multiple tracks; we use the first track whose items contain
  clips (the primary video track). Gaps (`Gap` items) are skipped (they contribute no source frames).

### `commands/stream_demo.rs`
- `--import <file.otio>`: ingest the source(s) referenced by `target_url` (resolved relative to the
  OTIO file or `--input`), parse, reconstruct, and report: frames reconstructed, **new frames stored
  = 0** (all reused), CDC segment reuse vs the source.
- Self-contained path (no file needed): ingest a source, **generate** a small OTIO document (a trim +
  reorder — e.g. second half before first half, with a trimmed middle), write it to the work dir,
  parse it back, reconstruct, and report the same metrics. This round-trips a real OTIO document.

## Data flow
```
source.mp4 --ingest--> source manifest (frames in store)
OTIO json --parse_otio--> [ImportClip{source,start,count}, ...]
timeline_to_manifest: concat source frames per clip -> edited manifest (0 new frames)
cdc_segments(edited) vs cdc_segments(source) -> reuse
```

## Error handling
- Invalid JSON / missing `tracks`/`source_range` → typed parse error with context.
- Unknown `target_url` source, or `start+count > source.len` → typed error.
- Empty timeline → empty manifest (no panic).

## Testing
- `parse_otio` on a minimal hand-written OTIO doc → expected `ImportClip`s (source, start, count, order).
- `timeline_to_manifest`:
  - reorder (clip B before clip A) → reordered frame sequence;
  - trim (a sub-range clip) → exactly that sub-range;
  - **every output frame hash exists in the source** (0 new content).
- Out-of-range / unknown-source → error.
- End-to-end: a generated trim+reorder OTIO → **0 new frames stored**; CDC reuse high vs the source.

## Non-goals
- Multi-track compositing, transitions, effects, retiming/time-warps; FCPXML/Premiere XML import (OTIO
  is the interchange target); exporting *to* OTIO; multiple distinct source files in the self-demo
  (the demo uses one source; `--import` may reference several).

## Module layout
New: `apps/cli/src/stream/otio.rs`. Edits: `apps/cli/src/commands/stream_demo.rs`,
`apps/cli/src/main.rs` (`--import` flag). No new dependencies.
