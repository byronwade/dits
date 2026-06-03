//! Frame-native edit: re-grade (brightness) a contiguous frame range, producing a
//! new manifest where ONLY those frames have new content hashes. This is the move
//! that dodges the "re-export re-quantizes everything" problem.

use crate::core::Hash;
use crate::facr::manifest::{ClipManifest, FrameRef};
use crate::facr::store::FrameStore;
use crate::facr::video::FrameImageCodec;
use anyhow::{bail, Context, Result};
use std::ops::Range;
use std::process::Command;

/// Apply a brightness delta (`-1.0..=1.0`, e.g. 0.3) to frames in `range`, store the
/// new PNGs, and return a manifest identical to `base` except those frames point at
/// new hashes. Frames outside `range` keep their original `FrameRef` (same hash).
pub fn regrade_range(
    base: &ClipManifest,
    store: &FrameStore,
    range: Range<usize>,
    brightness: f32,
) -> Result<ClipManifest> {
    if range.end > base.frames.len() {
        bail!("edit range {:?} out of bounds (clip has {} frames)", range, base.frames.len());
    }
    let fmt = FrameImageCodec::from_name(&base.codec).unwrap_or(FrameImageCodec::Png);
    let mut out = base.clone();
    for idx in range {
        let src = store
            .load_frame(&base.frames[idx].hash)
            .with_context(|| format!("load frame {idx}"))?;
        let graded = brighten_frame(&src, brightness, fmt)?;
        let new_hash: Hash = store.store_frame(&graded).context("store regraded frame")?;
        out.frames[idx] = FrameRef { hash: new_hash, ..base.frames[idx] };
    }
    Ok(out)
}

/// Brighten a single frame via ffmpeg's `eq` filter, re-encoding in the same still format
/// (`fmt`). Deterministic, so the graded frame has a stable content hash.
fn brighten_frame(frame: &[u8], brightness: f32, fmt: FrameImageCodec) -> Result<Vec<u8>> {
    let dir = std::env::temp_dir().join(format!("dits-grade-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&dir).context("grade temp dir")?;
    let ext = fmt.ext();
    let in_p = dir.join(format!("in.{ext}"));
    let out_p = dir.join(format!("out.{ext}"));
    std::fs::write(&in_p, frame).context("write input frame")?;
    let mut cmd = Command::new("ffmpeg");
    cmd.args(["-v", "error", "-y", "-i"])
        .arg(&in_p)
        .args(["-vf", &format!("eq=brightness={brightness}")]);
    for a in fmt.encode_args() {
        cmd.arg(a);
    }
    let status = cmd.arg(&out_p).output().context("running ffmpeg eq")?;
    if !status.status.success() {
        let _ = std::fs::remove_dir_all(&dir);
        bail!("ffmpeg eq failed: {}", String::from_utf8_lossy(&status.stderr));
    }
    let bytes = std::fs::read(&out_p).context("read graded frame")?;
    let _ = std::fs::remove_dir_all(&dir);
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::facr::diff::diff_manifests;
    use crate::facr::video::{check_ffmpeg, ingest_video};
    use std::path::Path;

    fn make_test_video(path: &Path) -> bool {
        Command::new("ffmpeg")
            .args([
                "-v", "error", "-y", "-f", "lavfi", "-i",
                "testsrc=duration=10:size=64x48:rate=10", "-pix_fmt", "yuv420p",
            ])
            .arg(path)
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    #[test]
    fn regrade_changes_only_the_targeted_frames() {
        if check_ffmpeg().is_err() {
            eprintln!("skipping: no ffmpeg");
            return;
        }
        let dir = tempfile::tempdir().unwrap();
        let video = dir.path().join("clip.mp4");
        assert!(make_test_video(&video));
        let store = FrameStore::new(&dir.path().join("store")).unwrap();
        let v1 = ingest_video(&video, &store, crate::facr::video::FrameImageCodec::Webp).unwrap();
        assert!(v1.frames.len() >= 90, "got {}", v1.frames.len());

        let v2 = regrade_range(&v1, &store, 40..60, 0.3).unwrap();
        // Same length, same frames outside the range.
        assert_eq!(v2.frames.len(), v1.frames.len());
        assert_eq!(v2.frames[0], v1.frames[0]);
        assert_eq!(v2.frames[39], v1.frames[39]);
        assert_eq!(v2.frames[60], v1.frames[60]);
        // Frames inside the range changed hash.
        assert_ne!(v2.frames[40], v1.frames[40]);
        assert_ne!(v2.frames[59], v1.frames[59]);

        // Diff sees a bounded number of changed frames (<= range size).
        let d = diff_manifests(&v1, &v2);
        assert!(d.added.len() <= 20, "added {} frames", d.added.len());
        assert!(!d.added.is_empty());
    }

    #[test]
    fn out_of_bounds_range_errors() {
        let store_dir = tempfile::tempdir().unwrap();
        let store = FrameStore::new(store_dir.path()).unwrap();
        let m = ClipManifest::new(8, 8, "png", 1);
        assert!(regrade_range(&m, &store, 0..5, 0.2).is_err());
    }
}
