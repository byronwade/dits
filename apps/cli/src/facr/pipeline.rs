//! End-to-end FACR pipeline: encode frames, store them content-addressed, and
//! build a clip manifest. This is where the "only changed frames are stored"
//! guarantee is realized: encoding is deterministic and the store dedups, so
//! committing a new version of a clip only grows the store by the frames that
//! actually changed.

use anyhow::Result;

use super::{
    codec::{FrameCodec, RawFrame},
    manifest::{ClipManifest, FrameRef},
    store::FrameStore,
};

/// Encode each raw frame with `codec`, store it, and return a clip manifest.
/// Frames already present in the store are not rewritten (automatic dedup).
pub fn commit_clip<C: FrameCodec>(
    frames: &[RawFrame],
    codec: &C,
    store: &FrameStore,
    timescale: u32,
) -> Result<ClipManifest> {
    let (width, height) = frames
        .first()
        .map(|f| (f.width, f.height))
        .unwrap_or((0, 0));
    let mut manifest = ClipManifest::new(width, height, codec.name(), timescale);

    for (i, frame) in frames.iter().enumerate() {
        let encoded = codec.encode_frame(frame)?;
        let hash = store.store_frame(&encoded)?;
        manifest.push_frame(FrameRef { hash, pts: i as i64, duration: 1 });
    }

    Ok(manifest)
}

#[cfg(test)]
mod tests {
    use super::{
        super::{codec::DeflateRawCodec, diff::diff_manifests},
        *,
    };

    /// Build `n` frames; frames whose index is in `regraded` get distinct
    /// pixels.
    fn frames(n: usize, regraded: &[usize]) -> Vec<RawFrame> {
        (0..n)
            .map(|i| {
                // Originals use values 0..n; re-graded frames use a disjoint band
                // (150+i) so each changed frame is distinct from every other frame.
                let v = if regraded.contains(&i) {
                    (150 + i) as u8
                } else {
                    (i % 150) as u8
                };
                RawFrame { width: 4, height: 4, data: vec![v; 4 * 4 * 4] }
            })
            .collect()
    }

    #[test]
    fn committing_a_regrade_only_grows_the_store_by_changed_frames() {
        let dir = tempfile::tempdir().unwrap();
        let store = FrameStore::new(dir.path()).unwrap();
        let codec = DeflateRawCodec;

        // Commit the original 100-frame clip.
        let v1 = commit_clip(&frames(100, &[]), &codec, &store, 24).unwrap();
        let after_v1 = store.count().unwrap();
        assert_eq!(after_v1, 100, "100 distinct frames stored");

        // Re-grade 5 frames and commit again.
        let v2 = commit_clip(&frames(100, &[10, 20, 30, 40, 50]), &codec, &store, 24).unwrap();
        let after_v2 = store.count().unwrap();

        // The store only grew by the 5 changed frames, not another 100.
        assert_eq!(after_v2 - after_v1, 5, "only changed frames are new objects");

        // And the manifest diff agrees.
        let d = diff_manifests(&v1, &v2);
        assert_eq!(d.new_frame_count(), 5);
        assert_eq!(d.shared, 95);
    }
}
