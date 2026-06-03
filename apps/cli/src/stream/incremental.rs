//! The brain: from two manifests, decide which segments to reuse vs re-encode,
//! then build both StreamVersions, reusing v1 segment bytes byte-for-byte.

use crate::core::Hash;
use crate::facr::manifest::ClipManifest;
use crate::facr::store::FrameStore;
use crate::stream::encode::encode_segment;
use crate::stream::layout::{parse_fps, SegmentLayout};
use crate::stream::origin::SegmentOrigin;
use crate::stream::playlist::{SegmentRef, StreamVersion};
use anyhow::{Context, Result};
use std::collections::BTreeSet;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IncrementalPlan {
    pub reused: Vec<usize>,
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

/// Encode every segment of `manifest` fresh (the v1 build, and the naive baseline).
pub fn build_full(
    manifest: &ClipManifest,
    store: &FrameStore,
    layout: &SegmentLayout,
    origin: &dyn SegmentOrigin,
) -> Result<StreamVersion> {
    let n = manifest.frames.len();
    let seg_count = layout.segment_count(n);
    let mut segments = Vec::with_capacity(seg_count);
    for s in 0..seg_count {
        let range = layout.frame_range(s, n);
        let (hash, dur) = encode_and_store(manifest, store, &range, origin)?;
        segments.push(SegmentRef { index: s, hash, duration_ms: dur });
    }
    Ok(StreamVersion { width: manifest.width, height: manifest.height, segments })
}

/// Build v2 incrementally: reuse v1's SegmentRefs for unchanged segments (bytes already
/// in `origin`); encode only the changed segments from v2's frames.
pub fn build_incremental(
    v1_version: &StreamVersion,
    v2_manifest: &ClipManifest,
    store: &FrameStore,
    layout: &SegmentLayout,
    origin: &dyn SegmentOrigin,
    plan: &IncrementalPlan,
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
            let (hash, dur) = encode_and_store(v2_manifest, store, &range, origin)?;
            segments.push(SegmentRef { index: s, hash, duration_ms: dur });
        }
    }
    Ok(StreamVersion { width: v2_manifest.width, height: v2_manifest.height, segments })
}

fn encode_and_store(
    manifest: &ClipManifest,
    store: &FrameStore,
    range: &std::ops::Range<usize>,
    origin: &dyn SegmentOrigin,
) -> Result<(Hash, u64)> {
    let mut pngs = Vec::with_capacity(range.len());
    for i in range.clone() {
        pngs.push(
            store
                .load_frame(&manifest.frames[i].hash)
                .with_context(|| format!("load frame {i}"))?,
        );
    }
    let fps = parse_fps(&manifest.frame_rate);
    // Each segment is its own PTS-0 timeline; the playlist marks seams with
    // EXT-X-DISCONTINUITY so the player re-bases. Offset 0 also makes a segment's bytes
    // depend only on its frames (not its position) -> stronger, position-independent dedup.
    let ts = encode_segment(&pngs, &manifest.frame_rate, 0.0)?;
    let hash = Hash::from_slice(blake3::hash(&ts).as_bytes());
    origin.put(&hash, &ts).context("put segment to origin")?;
    let dur_ms = ((range.len() as f64 / fps) * 1000.0).round() as u64;
    Ok((hash, dur_ms))
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
                hash: Hash::from_slice(blake3::hash(b).as_bytes()),
                pts: i as i64,
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
