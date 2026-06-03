//! Diff two clip manifests at frame granularity.
//!
//! Because frames are content-addressed, comparing two versions of a clip reduces to
//! comparing the sets of frame hashes. `added` frames are the only new bytes a commit
//! must store; everything in `shared` is deduplicated against the prior version. This
//! is what makes a re-grade of 150 frames cost 150 frames, not the whole clip.

use super::manifest::{ClipManifest, FrameRef};
use crate::core::Hash;
use std::collections::HashSet;

/// The frame-level difference between two clip manifests.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ClipDiff {
    /// Frames in `new` whose content is not present in `old` (the new bytes to store).
    pub added: Vec<FrameRef>,
    /// Frames in `old` whose content is no longer present in `new`.
    pub removed: Vec<FrameRef>,
    /// Number of `new` frames whose content already exists in `old` (deduplicated).
    pub shared: usize,
}

impl ClipDiff {
    /// Number of new frame *references* in `new` not present in `old`. Note: if the
    /// new clip repeats an identical frame (held shots, black frames, slates), each
    /// occurrence is counted here, so this can exceed the number of *distinct* objects
    /// the store actually persists (the store dedups by hash). Use
    /// [`Self::distinct_new_frame_count`] for the storage-accurate figure.
    pub fn new_frame_count(&self) -> usize {
        self.added.len()
    }

    /// Number of *distinct* new frames (deduped by content hash) — matches how many
    /// objects the store actually gains for this version.
    pub fn distinct_new_frame_count(&self) -> usize {
        self.added.iter().map(|f| f.hash).collect::<HashSet<_>>().len()
    }

    /// Fraction of the new version's frames that were deduplicated against the old
    /// version (0.0 = nothing shared, 1.0 = identical content). Empty new clip -> 1.0.
    pub fn dedup_fraction(&self) -> f64 {
        let total = self.shared + self.added.len();
        if total == 0 {
            1.0
        } else {
            self.shared as f64 / total as f64
        }
    }
}

/// Compute the frame-level diff from `old` to `new`.
pub fn diff_manifests(old: &ClipManifest, new: &ClipManifest) -> ClipDiff {
    let old_hashes: HashSet<Hash> = old.frames.iter().map(|f| f.hash).collect();
    let new_hashes: HashSet<Hash> = new.frames.iter().map(|f| f.hash).collect();

    let mut added = Vec::new();
    let mut shared = 0usize;
    for f in &new.frames {
        if old_hashes.contains(&f.hash) {
            shared += 1;
        } else {
            added.push(*f);
        }
    }

    let removed = old
        .frames
        .iter()
        .filter(|f| !new_hashes.contains(&f.hash))
        .copied()
        .collect();

    ClipDiff {
        added,
        removed,
        shared,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Hasher;

    /// Build a manifest of `n` frames; frames whose index is in `regraded` get a
    /// different hash (simulating a color grade on just those frames).
    fn manifest_with_grade(n: usize, regraded: &[usize]) -> ClipManifest {
        let mut m = ClipManifest::new(1920, 1080, "prores_hq", 24);
        for i in 0..n {
            let seed = if regraded.contains(&i) {
                format!("frame-{}-graded", i)
            } else {
                format!("frame-{}", i)
            };
            m.push_frame(FrameRef {
                hash: Hasher::hash(seed.as_bytes()),
                pts: i as i64,
                duration: 1,
            });
        }
        m
    }

    #[test]
    fn regrading_three_frames_adds_only_three() {
        let old = manifest_with_grade(1000, &[]);
        let new = manifest_with_grade(1000, &[500, 501, 502]);

        let d = diff_manifests(&old, &new);

        // Only the 3 re-graded frames are new bytes; the other 997 dedup.
        assert_eq!(d.new_frame_count(), 3);
        assert_eq!(d.shared, 997);
        // The 3 old (pre-grade) frames are now absent.
        assert_eq!(d.removed.len(), 3);
        assert!((d.dedup_fraction() - 0.997).abs() < 1e-9);
    }
}
