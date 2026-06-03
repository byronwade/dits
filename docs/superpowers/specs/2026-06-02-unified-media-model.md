# The Unified Media Model — one primitive for video, photo, audio, 3D

*The single idea under Dits's media versioning, and how each media type instantiates it.*

## The one primitive

> **Content-addressed decomposition + a non-destructive edit log.**

Every media type is stored as a set of **content-addressed pieces** (each piece hashed, stored once, shared across versions) plus an **edit log** of non-destructive operations that reference those pieces. A "version" is `pieces + edit log`, not a new copy of the file.

This yields three properties for *every* media type at once:
1. **Storage dedup** — unchanged pieces are stored once across all versions.
2. **Cheap edits** — an edit is a tiny instruction list, not a re-saved asset.
3. **Resumable, deduplicated transfer** — sync = "send the pieces the other side lacks"; an interrupted transfer resumes with only the missing pieces.

## How each medium instantiates it

| Medium | Pieces (content-addressed) | Edit log |
|---|---|---|
| **Video** | **Frames** (decomposed across *time*) | trim / reorder / insert / grade over frame ranges |
| **Photo** | **Source image** (stored once) + optional **tiles** (across *space*) | exposure / contrast / crop / white-balance / rotate / masks |
| **Audio** | **Sample windows / stems** | gain / fades / cuts / EQ |
| **3D / game** | **Mesh chunks / sub-assets** | transforms / material swaps / LOD edits |

Photos are **not** the exception to the video idea — they are the same idea rotated from *time* (frames) to *space* (tiles), with the source image as the shared base.

## What is built today (in `apps/cli/src/facr/`)

- **Video:** `ingest_video` (ffmpeg decode → content-addressed frames), `reconstruct_video`, `trim` (manifest edit = 0 new storage), frame-level `diff`. Commands: `facr-add`, `facr-checkout`, `facr-trim`, `facr-demo`.
- **Photo:** `ingest_photo` (source stored once), `PhotoVersion` with a non-destructive `edits` log, `render_photo` (apply edits via ffmpeg). Commands: `photo-add`, `photo-edit`, `photo-render`.
- Demonstrated: 5 edited photo versions cost **0 new image bytes** (sub-1KB manifests); trimming a real video cost **0 new frames**.

## The honest caveat (Case A vs Case B) — applies to every medium

The "edits cost only their diff" guarantee holds when **Dits owns the edit** (records it as an operation over pieces — "Case A"). When an external tool re-encodes the whole asset and you re-import the flattened result ("Case B"), the pieces are re-quantized to new bytes and dedup drops to ~0; you fall back to perceptual matching + residual coding. This is *why* Dits must own (or import via EDL/OTIO/sidecar) the editing model rather than chunk whatever an app emitted.

## Roadmap to production

1. **Video:** audio is now preserved (stream-copied, content-addressed, deduped). Remaining: swap PNG frames → ProRes/intra-AV1 via the `FrameCodec` seam; OTIO/EDL import.
2. **Photo:** RAW decode (libraw) so the *base* is the sensor data and renders are true derivations; tile-level dedup for bursts/brackets/panoramas (the Case-B frontier).
3. **Transfer:** turn the content-addressed have/want sync from theory into the real network layer.
