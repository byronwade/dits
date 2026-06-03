//! Non-destructive manifest edits.
//!
//! Edits in FACR are operations over a clip manifest's frame references — not
//! re-encodes. A trim produces a new manifest that points at the *same* stored frames,
//! so it costs ZERO new storage. This is the "Case A" path: when Dits owns the edit,
//! changes cost only their diff.

use super::manifest::{ClipManifest, FrameRef};

/// Return a new manifest containing frames `[start, end)` of `src` (end-exclusive,
/// clamped to bounds). Presentation timestamps are renumbered from 0. No frames are
/// copied or re-encoded — the result references the same content-addressed frames.
pub fn trim(src: &ClipManifest, start: usize, end: usize) -> ClipManifest {
    let n = src.frames.len();
    let start = start.min(n);
    let end = end.min(n).max(start);

    let mut out = ClipManifest::new(src.width, src.height, src.codec.clone(), src.timescale);
    out.frame_rate = src.frame_rate.clone();
    for (i, f) in src.frames[start..end].iter().enumerate() {
        out.push_frame(FrameRef {
            hash: f.hash,
            pts: i as i64,
            duration: f.duration,
        });
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::diff::diff_manifests;
    use crate::core::Hasher;

    fn manifest(n: usize) -> ClipManifest {
        let mut m = ClipManifest::new(320, 240, "png", 1);
        for i in 0..n {
            m.push_frame(FrameRef {
                hash: Hasher::hash(format!("frame-{i}").as_bytes()),
                pts: i as i64,
                duration: 1,
            });
        }
        m
    }

    #[test]
    fn trim_reuses_frames_and_adds_nothing() {
        let original = manifest(30);
        let trimmed = trim(&original, 10, 30);

        // The trim keeps 20 frames...
        assert_eq!(trimmed.frames.len(), 20);
        // ...which are exactly the original's frames 10..30 (same content hashes)...
        for (i, f) in trimmed.frames.iter().enumerate() {
            assert_eq!(f.hash, original.frames[10 + i].hash);
        }
        // ...so committing this edit stores ZERO new frames.
        let d = diff_manifests(&original, &trimmed);
        assert_eq!(d.new_frame_count(), 0, "a trim costs no new storage");
    }
}
