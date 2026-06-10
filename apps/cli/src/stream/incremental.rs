//! The brain: from two manifests, decide which segments to reuse vs re-encode,
//! then build both StreamVersions, reusing v1 segment bytes byte-for-byte.

use std::collections::BTreeSet;

use anyhow::{Context, Result};

use crate::{
    core::Hash,
    facr::{manifest::ClipManifest, store::FrameStore},
    stream::{
        encode::{encode_cmaf_segment, EncodeProfile},
        layout::{parse_fps, SegmentLayout},
        origin::SegmentOrigin,
        playlist::{SegmentRef, StreamVersion},
    },
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IncrementalPlan {
    pub reused:    Vec<usize>,
    pub reencoded: Vec<usize>,
}

/// Determine which segment indices changed between v1 and v2 by mapping changed
/// frame indices (different hash at the same position) through the layout.
pub fn plan(v1: &ClipManifest, v2: &ClipManifest, layout: &SegmentLayout) -> IncrementalPlan {
    let frame_count = v2.frames.len();
    let seg_count = layout.segment_count(frame_count);
    let mut changed: BTreeSet<usize> = BTreeSet::new();

    let common = v1.frames.len().min(v2.frames.len());
    for i in 0..common {
        if v1.frames[i].hash != v2.frames[i].hash {
            changed.insert(layout.segment_of_frame(i));
        }
    }
    // Any frames added past the common prefix mark their segments changed.
    for i in common..frame_count {
        changed.insert(layout.segment_of_frame(i));
    }

    let mut reused = Vec::new();
    let mut reencoded = Vec::new();
    for s in 0..seg_count {
        if changed.contains(&s) {
            reencoded.push(s);
        } else {
            reused.push(s);
        }
    }
    IncrementalPlan { reused, reencoded }
}

/// Encode every segment of `manifest` fresh (the v1 build, and the naive
/// baseline).
pub fn build_full(
    manifest: &ClipManifest,
    store: &FrameStore,
    layout: &SegmentLayout,
    origin: &dyn SegmentOrigin,
    profile: &EncodeProfile,
    vmaf_target: Option<f64>,
) -> Result<StreamVersion> {
    let n = manifest.frames.len();
    let seg_count = layout.segment_count(n);
    let mut segments = Vec::with_capacity(seg_count);
    let mut init_hash = Hash::default();
    for s in 0..seg_count {
        let range = layout.frame_range(s, n);
        let (media_hash, seg_init, dur) =
            encode_and_store(manifest, store, &range, origin, profile, vmaf_target)?;
        init_hash = seg_init; // shared, constant across same-resolution encodes
        segments.push(SegmentRef { index: s, hash: media_hash, duration_ms: dur });
    }
    let (width, height) = output_dims(manifest, profile);
    Ok(StreamVersion { width, height, init_hash, segments })
}

/// Output (width, height) for a profile: source dims, or scaled to the rung
/// height. Width uses ffmpeg's `scale=-2` rule — `round(w * h / H / 2) * 2` —
/// so the advertised RESOLUTION matches the bytes ffmpeg actually produces.
fn output_dims(manifest: &ClipManifest, profile: &EncodeProfile) -> (u32, u32) {
    match profile.height {
        Some(h) if manifest.height > 0 => {
            let exact = manifest.width as f64 * h as f64 / manifest.height as f64;
            let w = ((exact / 2.0).round() as u32) * 2;
            (w, h)
        },
        _ => (manifest.width, manifest.height),
    }
}

/// Build v2 incrementally: reuse v1's SegmentRefs for unchanged segments (bytes
/// already in `origin`); encode only the changed segments from v2's frames.
#[allow(clippy::too_many_arguments)]
pub fn build_incremental(
    v1_version: &StreamVersion,
    v2_manifest: &ClipManifest,
    store: &FrameStore,
    layout: &SegmentLayout,
    origin: &dyn SegmentOrigin,
    plan: &IncrementalPlan,
    profile: &EncodeProfile,
    vmaf_target: Option<f64>,
) -> Result<StreamVersion> {
    let n = v2_manifest.frames.len();
    let seg_count = layout.segment_count(n);
    let mut segments = Vec::with_capacity(seg_count);
    for s in 0..seg_count {
        if plan.reused.contains(&s) {
            // Reuse v1's exact segment (same hash => already served, zero re-transfer).
            let reused = v1_version
                .segments
                .iter()
                .find(|r| r.index == s)
                .with_context(|| format!("reused segment {s} missing from v1"))?;
            segments.push(reused.clone());
        } else {
            let range = layout.frame_range(s, n);
            let (media_hash, _init, dur) =
                encode_and_store(v2_manifest, store, &range, origin, profile, vmaf_target)?;
            segments.push(SegmentRef { index: s, hash: media_hash, duration_ms: dur });
        }
    }
    // The init is shared and constant across same-resolution encodes within this
    // rung, so v2 reuses v1's (already in the origin from the v1 build).
    Ok(StreamVersion {
        width: v1_version.width,
        height: v1_version.height,
        init_hash: v1_version.init_hash,
        segments,
    })
}

/// Encode a frame range into a CMAF segment, store both the media fragment and
/// the shared init in `origin` (init put is idempotent), and return
/// `(media_hash, init_hash, duration_ms)`.
fn encode_and_store(
    manifest: &ClipManifest,
    store: &FrameStore,
    range: &std::ops::Range<usize>,
    origin: &dyn SegmentOrigin,
    profile: &EncodeProfile,
    vmaf_target: Option<f64>,
) -> Result<(Hash, Hash, u64)> {
    let mut pngs = Vec::with_capacity(range.len());
    for i in range.clone() {
        pngs.push(
            store
                .load_frame(&manifest.frames[i].hash)
                .with_context(|| format!("load frame {i}"))?,
        );
    }
    let fps = parse_fps(&manifest.frame_rate);
    let ext = crate::facr::video::frame_ext(&manifest.codec);
    // VMAF mode: pick this segment's CRF to hit the quality target (deterministic
    // -> hash-stable).
    let used_profile = match vmaf_target {
        Some(t) => {
            let (crf, _vmaf) =
                crate::stream::vmaf::optimize_crf(&pngs, &manifest.frame_rate, ext, t)?;
            EncodeProfile { crf: Some(crf), ..*profile }
        },
        None => *profile,
    };
    let mut seg = encode_cmaf_segment(&pngs, &manifest.frame_rate, ext, &used_profile)?;
    // Place this fragment at its true position on a continuous timeline by patching
    // tfdt.baseMediaDecodeTime = (frames before this segment) * per-frame ticks.
    // The position is the segment INDEX (range.start), which is identical for
    // an unchanged segment across versions, so the patched bytes stay
    // hash-stable and reuse is preserved.
    let per_frame = crate::stream::encode::frame_duration_ticks(&seg.media)
        .context("media fragment has no default_sample_duration")?;
    let bmdt = range.start as u64 * per_frame as u64;
    crate::stream::encode::set_base_media_decode_time(&mut seg.media, bmdt)?;
    let media_hash = Hash::from_slice(blake3::hash(&seg.media).as_bytes());
    let init_hash = Hash::from_slice(blake3::hash(&seg.init).as_bytes());
    origin
        .put(&media_hash, &seg.media)
        .context("put media fragment to origin")?;
    origin
        .put(&init_hash, &seg.init)
        .context("put init segment to origin")?;
    let dur_ms = ((range.len() as f64 / fps) * 1000.0).round() as u64;
    Ok((media_hash, init_hash, dur_ms))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::facr::manifest::FrameRef;

    fn manifest_with_hashes(hashes: &[&[u8]]) -> ClipManifest {
        let mut m = ClipManifest::new(64, 48, "png", 1);
        m.frame_rate = "10/1".to_string();
        for (i, b) in hashes.iter().enumerate() {
            m.push_frame(FrameRef {
                hash:     Hash::from_slice(blake3::hash(b).as_bytes()),
                pts:      i as i64,
                duration: 1,
            });
        }
        m
    }

    #[test]
    fn plan_marks_only_segments_with_changed_frames() {
        // 40 frames, 10fps, 2s => 20 frames/seg => 2 segments.
        let labels: Vec<Vec<u8>> = (0..40).map(|i| format!("f{i}").into_bytes()).collect();
        let refs: Vec<&[u8]> = labels.iter().map(|v| v.as_slice()).collect();
        let v1 = manifest_with_hashes(&refs);

        // Change frame 25 only (segment 1).
        let mut v2 = v1.clone();
        v2.frames[25].hash = Hash::from_slice(blake3::hash(b"changed").as_bytes());

        let layout = SegmentLayout::new("10/1", 2.0);
        let p = plan(&v1, &v2, &layout);
        assert_eq!(p.reused, vec![0]);
        assert_eq!(p.reencoded, vec![1]);
    }

    #[test]
    fn identical_manifests_reuse_everything() {
        let labels: Vec<Vec<u8>> = (0..40).map(|i| format!("f{i}").into_bytes()).collect();
        let refs: Vec<&[u8]> = labels.iter().map(|v| v.as_slice()).collect();
        let v1 = manifest_with_hashes(&refs);
        let layout = SegmentLayout::new("10/1", 2.0);
        let p = plan(&v1, &v1, &layout);
        assert_eq!(p.reencoded, Vec::<usize>::new());
        assert_eq!(p.reused, vec![0, 1]);
    }
}
