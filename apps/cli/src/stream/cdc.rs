//! Content-defined segment boundaries over the frame-hash sequence
//! (FastCDC-style). A boundary is chosen by content, not by a fixed frame
//! count, so a trim/insert that shifts frame positions only disturbs the
//! boundary near the edit — segments before and after re-synchronise to the
//! same boundaries and keep the same content id, preserving incremental reuse
//! across edits.

use std::ops::Range;

use crate::{
    core::Hash,
    facr::manifest::{ClipManifest, FrameRef},
};

/// Min / average / max segment length, in frames. `0 < min <= avg <= max`.
#[derive(Clone, Copy, Debug)]
pub struct CdcParams {
    pub min: usize,
    pub avg: usize,
    pub max: usize,
}

impl Default for CdcParams {
    fn default() -> Self {
        CdcParams { min: 3, avg: 8, max: 16 }
    }
}

/// A content-defined segment: a contiguous frame range and its reuse identity.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CdcSegment {
    pub frames:     Range<usize>,
    /// `blake3(concat of the segment's frame hashes)` — equal iff the frame run
    /// is identical.
    pub content_id: Hash,
}

/// Is this frame a content boundary? Frame hashes are already uniformly random
/// (BLAKE3), so the predicate is a pure function of the frame's own hash — no
/// rolling hash needed, and every unchanged frame keeps its boundary status
/// regardless of position, which is what gives perfect resync after a
/// trim/insert. Boundary probability is `1/avg` (via `mask`).
fn is_boundary_frame(h: &Hash, mask: u64) -> bool {
    let bytes = h.as_bytes();
    let v = u64::from_le_bytes(bytes[0..8].try_into().unwrap());
    v & mask == 0
}

fn content_id(frames: &[FrameRef]) -> Hash {
    let mut hasher = blake3::Hasher::new();
    for f in frames {
        hasher.update(f.hash.as_bytes());
    }
    Hash::from_slice(hasher.finalize().as_bytes())
}

/// Segment a manifest's frame-hash sequence into content-defined segments.
pub fn cdc_segments(manifest: &ClipManifest, p: &CdcParams) -> Vec<CdcSegment> {
    let n = manifest.frames.len();
    let mut segs = Vec::new();
    if n == 0 {
        return segs;
    }
    let bits = (p.avg.max(1) as f64).log2().round() as u32;
    let mask: u64 = if bits >= 64 {
        u64::MAX
    } else {
        (1u64 << bits) - 1
    };

    let mut start = 0usize;
    let mut count = 0usize;
    for i in 0..n {
        count += 1;
        let cut =
            (count >= p.min && is_boundary_frame(&manifest.frames[i].hash, mask)) || count >= p.max;
        if cut || i == n - 1 {
            let end = i + 1;
            segs.push(CdcSegment {
                frames:     start..end,
                content_id: content_id(&manifest.frames[start..end]),
            });
            start = end;
            count = 0;
        }
    }
    segs
}

/// Classify v2's content-defined segments into those reusable from v1 (matching
/// `content_id`) and those that must be re-encoded.
pub struct CdcPlan {
    pub reused:    Vec<CdcSegment>,
    pub reencoded: Vec<CdcSegment>,
}

pub fn plan_cdc(v1: &ClipManifest, v2: &ClipManifest, p: &CdcParams) -> CdcPlan {
    let s1: std::collections::HashSet<Hash> = cdc_segments(v1, p)
        .into_iter()
        .map(|s| s.content_id)
        .collect();
    let mut reused = Vec::new();
    let mut reencoded = Vec::new();
    for s in cdc_segments(v2, p) {
        if s1.contains(&s.content_id) {
            reused.push(s);
        } else {
            reencoded.push(s);
        }
    }
    CdcPlan { reused, reencoded }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn manifest(labels: &[&str]) -> ClipManifest {
        let mut m = ClipManifest::new(64, 48, "png", 1);
        for (i, l) in labels.iter().enumerate() {
            m.push_frame(FrameRef {
                hash:     Hash::from_slice(blake3::hash(l.as_bytes()).as_bytes()),
                pts:      i as i64,
                duration: 1,
            });
        }
        m
    }

    fn labels(n: usize) -> Vec<String> {
        (0..n).map(|i| format!("frame-{i}")).collect()
    }

    #[test]
    fn segmentation_is_deterministic_and_covers_all_frames() {
        let l = labels(60);
        let refs: Vec<&str> = l.iter().map(|s| s.as_str()).collect();
        let m = manifest(&refs);
        let p = CdcParams::default();
        let a = cdc_segments(&m, &p);
        let b = cdc_segments(&m, &p);
        assert_eq!(a, b, "deterministic");
        // Contiguous cover of [0, 60).
        assert_eq!(a.first().unwrap().frames.start, 0);
        assert_eq!(a.last().unwrap().frames.end, 60);
        for w in a.windows(2) {
            assert_eq!(w[0].frames.end, w[1].frames.start);
        }
        // Respect min/max.
        for s in &a {
            let len = s.frames.len();
            assert!(len <= p.max);
            assert!(len >= p.min || s.frames.end == 60); // last may be short
        }
    }

    #[test]
    fn insert_only_disturbs_the_boundary_region() {
        // v1: 60 frames. v2: insert 5 NEW frames at index 30.
        let l = labels(60);
        let refs: Vec<&str> = l.iter().map(|s| s.as_str()).collect();
        let v1 = manifest(&refs);

        let mut v2_labels: Vec<String> = l.clone();
        for k in 0..5 {
            v2_labels.insert(30 + k, format!("INSERTED-{k}"));
        }
        let v2_refs: Vec<&str> = v2_labels.iter().map(|s| s.as_str()).collect();
        let v2 = manifest(&v2_refs);

        let p = CdcParams::default();
        let s1 = cdc_segments(&v1, &p);
        let s2 = cdc_segments(&v2, &p);

        let ids1: std::collections::HashSet<_> = s1.iter().map(|s| s.content_id).collect();
        let shared = s2.iter().filter(|s| ids1.contains(&s.content_id)).count();

        // CDC re-synchronises: most segments survive the insert (vs ~0 for fixed
        // boundaries, which would shift every segment after index 30).
        assert!(
            shared as f64 >= s2.len() as f64 * 0.5,
            "expected majority reuse after insert, got {shared}/{} segments",
            s2.len()
        );
        // Segments entirely before the edit are byte-identical.
        let first_changed = s2
            .iter()
            .position(|s| !ids1.contains(&s.content_id))
            .unwrap();
        assert!(s2[first_changed].frames.start <= 30, "first change should be at/before the edit");
        assert!(first_changed >= 1, "segments before the edit should be reused");
    }

    #[test]
    fn fixed_boundaries_would_lose_reuse_after_an_insert() {
        // Contrast: with FIXED boundaries (chunk of 8), an insert at 30 shifts every
        // later chunk.
        let l = labels(60);
        let mut v2: Vec<String> = l.clone();
        for k in 0..5 {
            v2.insert(30 + k, format!("INSERTED-{k}"));
        }
        let chunk = 8;
        let h = |s: &str| Hash::from_slice(blake3::hash(s.as_bytes()).as_bytes());
        let fixed_ids = |frames: &[String]| -> Vec<Hash> {
            frames
                .chunks(chunk)
                .map(|c| {
                    let mut hasher = blake3::Hasher::new();
                    for f in c {
                        hasher.update(h(f).as_bytes());
                    }
                    Hash::from_slice(hasher.finalize().as_bytes())
                })
                .collect()
        };
        let f1 = fixed_ids(&l);
        let f2 = fixed_ids(&v2);
        let set1: std::collections::HashSet<_> = f1.iter().collect();
        let shared = f2.iter().filter(|x| set1.contains(x)).count();
        // Only the chunks fully before index 30 survive (~3 of 8); the rest shift.
        assert!(
            shared <= 4,
            "fixed boundaries should lose most reuse after an insert, kept {shared}"
        );
    }
}
