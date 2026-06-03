# FACR Streaming — Per-Shot VMAF-Targeted Encoding (Design Spec)

*Status: approved 2026-06-03. P4 sub-project #1 of the FACR incremental-streaming roadmap.*

## Goal

Replace fixed per-rung bitrates with **per-segment VMAF-targeted encoding**: each segment is
encoded at the CRF that achieves a target perceptual quality (VMAF), so complex segments get more
bits and simple ones fewer — same visual quality, fewer total bits. This is the core of Netflix's
Dynamic Optimizer ("per-shot" encoding), with our fixed-duration segments as the shot unit.

## Critical invariant: determinism preserves reuse

The optimizer searches CRF, encodes, measures VMAF, and picks the result. **Every step is
deterministic** — same frames → same VMAF measurements → same chosen CRF → same bytes → same hash.
So VMAF optimization keeps content-addressing and the incremental reuse intact. (Verified: libx264
`-threads 1` and libvmaf are both deterministic.)

## Verified feasibility (FFmpeg 8.0.1)

`libvmaf` filter present (`ffmpeg -i distorted -i reference -lavfi libvmaf -f null -` →
`VMAF score: NN.nn`); sample CRF-28 encode scored 97.8. `scdet` scene-detection filter also present
(for the shot-boundary follow-up).

## Approach (chosen of three)

- **A — per-segment VMAF-targeted CRF (CHOSEN).** For each segment, a **bounded binary search** over
  CRF ∈ [18, 34] (≈4 probes) finds the highest CRF whose encode scores VMAF ≥ target; encode the
  final CMAF segment at that CRF. Fixed segments as shots. Deterministic, fits the existing pipeline,
  fully measurable.
- B — true shot-boundary segmentation (`scdet` → variable-length segments aligned to scene cuts):
  more faithful to Netflix, but variable-duration segments complicate the fixed layout + reuse model.
  Deferred follow-up.
- C — per-*title* single CRF: coarse, misses the per-shot win. Rejected.

## Scope of this slice

Source-resolution, single rendition (the VMAF path does not downscale). Combining VMAF with the ABR
ladder (VMAF-target per rung at each resolution) is a deliberate follow-up — measuring VMAF across
scaled renditions adds resolution-normalization choices best handled separately. So `--vmaf` encodes
the source-resolution ladder rung only.

## Architecture

### `stream/vmaf.rs` (new)
```
/// VMAF of `distorted` (an encoded mp4) against `reference` (a video built from the source frames).
fn measure_vmaf(distorted_path: &Path, reference_path: &Path) -> Result<f64>
   // ffmpeg -i distorted -i reference -lavfi libvmaf -f null - ; parse "VMAF score: N".

/// Encode `frames` to a plain mp4 at `crf` (for the search) — same libx264 settings as the segment
/// encoder, so the measured quality matches the delivered bitstream.
fn encode_probe(frames: &[Vec<u8>], frame_rate, frame_ext, crf: u32) -> Result<Vec<u8>>

/// Find the highest CRF (smallest size) whose encode scores VMAF >= target. Returns the chosen CRF
/// and the achieved VMAF. Deterministic bounded binary search over [MIN_CRF, MAX_CRF].
fn optimize_crf(frames: &[Vec<u8>], frame_rate, frame_ext, target: f64) -> Result<(u32, f64)>
```
- Reference video: the source frames encoded losslessly once (`-qp 0`) into a temp mp4 (reused
  across probes).
- Binary search: maintain `best = MIN_CRF`; probe mid; if VMAF ≥ target, accept and search higher
  CRF (smaller); else search lower. ~4 probes for a 16-wide range.

### `stream/encode.rs`
- `EncodeProfile` gains `crf: Option<u32>`. When `Some(n)`, emit `-crf n` (and drop `-b:v`/`-maxrate`).
  `bitrate_kbps` and `crf` are mutually exclusive; `crf` wins when set.

### `stream/incremental.rs`
- `encode_and_store` gains an optional VMAF target. When set, it calls `optimize_crf` to choose the
  CRF, then `encode_cmaf_segment` with `profile.crf = Some(chosen)`; otherwise unchanged. The chosen
  CRF and achieved VMAF are surfaced for reporting.

### `commands/stream_demo.rs`
- `--vmaf <target>` flag (e.g. `--vmaf 93`). When set, encode the source-res rung VMAF-targeted and
  print, per segment: chosen CRF, achieved VMAF, size; plus total bytes vs a fixed-CRF baseline
  (the "same quality, fewer bits" headline). `--vmaf` and the multi-rung ABR path are exclusive for
  now (VMAF runs the single source-res rendition).

## Data flow
```
frames -> build lossless reference.mp4 (once per segment)
       -> binary search CRF: encode_probe(crf) -> measure_vmaf vs reference -> pick highest CRF >= target
       -> encode_cmaf_segment(frames, profile{crf: chosen}) -> the delivered segment (deterministic)
```

## Error handling
- `libvmaf` missing / parse failure → actionable error.
- If even MIN_CRF can't reach the target (very low target headroom), use MIN_CRF and report the
  achieved VMAF (best effort) rather than failing.
- Empty/edge segments handled as in the existing encoder.

## Testing
- `measure_vmaf`: a near-lossless encode scores high (>95); a heavily-compressed one scores lower —
  monotonic with CRF.
- `optimize_crf`: the returned CRF's encode achieves VMAF ≥ target; running twice yields the **same
  CRF and byte-identical segment** (the reuse guarantee).
- Complexity-adaptivity: a flat/simple synthetic clip selects a higher CRF (smaller) than a detailed
  one (e.g. mandelbrot) at the same target.
- End-to-end: `--vmaf 93` achieves ~93 on every segment and reports total bytes below a fixed-CRF
  baseline.

## Non-goals
- Shot-boundary (variable-length) segmentation via `scdet`; VMAF across the full ABR ladder;
  per-title complexity modeling; VMAF models other than the default. All later.

## Module layout
New: `apps/cli/src/stream/vmaf.rs`. Edits: `apps/cli/src/stream/{encode,incremental}.rs`,
`apps/cli/src/commands/stream_demo.rs`, `apps/cli/src/main.rs` (`--vmaf` flag). No new dependencies.
