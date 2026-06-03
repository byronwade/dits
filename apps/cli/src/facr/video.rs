//! Real video ingest/reconstruction for FACR via ffmpeg.
//!
//! `ingest_video` decodes a real video file into individual lossless frames (PNG),
//! stores each one content-addressed in a [`FrameStore`] (so identical frames dedup),
//! and returns a [`ClipManifest`]. `reconstruct_video` does the reverse: it materializes
//! the manifest's frames and re-muxes them into a playable video.
//!
//! v1 scope: video track only (audio is not yet carried — see the design spec). Frames
//! are stored as PNG, which is lossless and deterministic, so re-ingesting identical
//! content dedups perfectly.

use super::manifest::{ClipManifest, FrameRef};
use super::store::FrameStore;
use anyhow::{bail, Context, Result};
use std::path::Path;
use std::process::Command;

/// Probed properties of a source video.
#[derive(Clone, Debug)]
pub struct VideoInfo {
    pub width: u32,
    pub height: u32,
    /// Frame rate exactly as ffprobe reports it, e.g. "30000/1001".
    pub frame_rate: String,
}

/// Confirm ffmpeg + ffprobe are installed.
pub fn check_ffmpeg() -> Result<()> {
    for tool in ["ffmpeg", "ffprobe"] {
        Command::new(tool)
            .arg("-version")
            .output()
            .with_context(|| format!("{tool} not found. Install FFmpeg to use FACR video commands."))?;
    }
    Ok(())
}

/// Probe a video's resolution and frame rate with ffprobe.
pub fn probe_video(path: &Path) -> Result<VideoInfo> {
    let out = Command::new("ffprobe")
        .args([
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,r_frame_rate",
            "-of", "default=noprint_wrappers=1",
        ])
        .arg(path)
        .output()
        .context("running ffprobe")?;
    if !out.status.success() {
        bail!("ffprobe failed: {}", String::from_utf8_lossy(&out.stderr));
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let mut width = 0u32;
    let mut height = 0u32;
    let mut frame_rate = "30".to_string();
    for line in text.lines() {
        if let Some(v) = line.strip_prefix("width=") {
            width = v.trim().parse().unwrap_or(0);
        } else if let Some(v) = line.strip_prefix("height=") {
            height = v.trim().parse().unwrap_or(0);
        } else if let Some(v) = line.strip_prefix("r_frame_rate=") {
            let v = v.trim();
            if v != "0/0" && !v.is_empty() {
                frame_rate = v.to_string();
            }
        }
    }
    if width == 0 || height == 0 {
        bail!("ffprobe did not report a usable video stream for {}", path.display());
    }
    Ok(VideoInfo { width, height, frame_rate })
}

/// Whether the source has at least one audio stream. FACR v1 stores video frames only,
/// so callers should warn the user that audio is dropped.
pub fn source_has_audio(path: &Path) -> bool {
    Command::new("ffprobe")
        .args([
            "-v", "error",
            "-select_streams", "a",
            "-show_entries", "stream=index",
            "-of", "csv=p=0",
        ])
        .arg(path)
        .output()
        .map(|o| !o.stdout.is_empty())
        .unwrap_or(false)
}

/// The still-image codec used for canonical frames in the content-addressed store.
///
/// PNG is lossless and deterministic. JPEG-XL is also deterministic (with `-threads 1`) and
/// ~5.7x smaller at visually-lossless quality. Determinism is mandatory: content-addressing,
/// dedup, and incremental reuse all rely on the same frame producing the same bytes.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum FrameFormat {
    Png,
    JpegXl { distance: f32 },
}

impl FrameFormat {
    /// Name stored in `ClipManifest::codec`.
    pub fn codec_name(&self) -> &'static str {
        match self {
            FrameFormat::Png => "png",
            FrameFormat::JpegXl { .. } => "jxl",
        }
    }
    /// Frame-file extension (also how ffmpeg infers the format).
    pub fn ext(&self) -> &'static str {
        self.codec_name()
    }
    /// ffmpeg output encoder args for this format (empty for PNG, which ffmpeg infers).
    pub fn encode_args(&self) -> Vec<String> {
        match self {
            FrameFormat::Png => Vec::new(),
            // `-threads 1` makes libjxl byte-deterministic, which is what keeps frame hashes stable.
            FrameFormat::JpegXl { distance } => vec![
                "-c:v".into(), "libjxl".into(),
                "-distance".into(), format!("{distance}"),
                "-threads".into(), "1".into(),
            ],
        }
    }
    /// Reconstruct a format from a manifest's `codec` string (used by edit/reconstruct paths).
    pub fn from_codec(codec: &str) -> FrameFormat {
        match codec {
            "jxl" => FrameFormat::JpegXl { distance: 1.0 },
            _ => FrameFormat::Png,
        }
    }
}

/// Frame-file extension for a manifest `codec` string ("jxl" -> "jxl", else "png").
pub fn frame_ext(codec: &str) -> &'static str {
    FrameFormat::from_codec(codec).ext()
}

/// Decode `path` into content-addressed PNG frames stored in `store`, returning a manifest.
/// Existing FACR commands rely on this PNG behavior; streaming uses
/// [`ingest_video_with_format`].
pub fn ingest_video(path: &Path, store: &FrameStore) -> Result<ClipManifest> {
    ingest_video_with_format(path, store, FrameFormat::Png)
}

/// Decode `path` into content-addressed frames in the given [`FrameFormat`].
pub fn ingest_video_with_format(
    path: &Path,
    store: &FrameStore,
    fmt: FrameFormat,
) -> Result<ClipManifest> {
    check_ffmpeg()?;
    let info = probe_video(path)?;

    let work = std::env::temp_dir().join(format!("dits-facr-ingest-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&work).context("create ingest temp dir")?;
    let ext = fmt.ext();
    let pattern = work.join(format!("f_%08d.{ext}"));

    // Decode every frame to a deterministic still image in the chosen format.
    let mut cmd = Command::new("ffmpeg");
    cmd.args(["-v", "error", "-i"]).arg(path);
    for a in fmt.encode_args() {
        cmd.arg(a);
    }
    let out = cmd.arg(&pattern).output().context("running ffmpeg decode")?;
    if !out.status.success() {
        let _ = std::fs::remove_dir_all(&work);
        bail!("ffmpeg decode failed: {}", String::from_utf8_lossy(&out.stderr));
    }

    // Collect frames in order and store each content-addressed.
    let mut entries: Vec<_> = std::fs::read_dir(&work)
        .context("read decoded frames")?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().map(|x| x == ext).unwrap_or(false))
        .collect();
    entries.sort();

    let mut manifest = ClipManifest::new(info.width, info.height, fmt.codec_name(), 1);
    manifest.frame_rate = info.frame_rate;
    for (i, frame_path) in entries.iter().enumerate() {
        let bytes = std::fs::read(frame_path).context("read frame image")?;
        let hash = store.store_frame(&bytes)?;
        manifest.push_frame(FrameRef { hash, pts: i as i64, duration: 1 });
    }

    let _ = std::fs::remove_dir_all(&work);

    if manifest.frames.is_empty() {
        bail!("no frames were decoded from {}", path.display());
    }
    Ok(manifest)
}

/// Reconstruct a playable video at `output` from a manifest's stored frames.
pub fn reconstruct_video(manifest: &ClipManifest, store: &FrameStore, output: &Path) -> Result<()> {
    check_ffmpeg()?;

    let work = std::env::temp_dir().join(format!("dits-facr-out-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&work).context("create reconstruct temp dir")?;

    let ext = frame_ext(&manifest.codec);
    for (i, frame) in manifest.frames.iter().enumerate() {
        let bytes = store
            .load_frame(&frame.hash)
            .with_context(|| format!("missing frame {} ({})", i, frame.hash.short()))?;
        std::fs::write(work.join(format!("f_{:08}.{ext}", i + 1)), bytes)
            .context("write frame for reconstruction")?;
    }

    let pattern = work.join(format!("f_%08d.{ext}"));
    let out = Command::new("ffmpeg")
        .args(["-v", "error", "-y", "-framerate", &manifest.frame_rate, "-i"])
        .arg(&pattern)
        .args(["-c:v", "libx264", "-pix_fmt", "yuv420p"])
        .arg(output)
        .output()
        .context("running ffmpeg encode")?;
    let _ = std::fs::remove_dir_all(&work);
    if !out.status.success() {
        bail!("ffmpeg encode failed: {}", String::from_utf8_lossy(&out.stderr));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ffmpeg_available() -> bool {
        check_ffmpeg().is_ok()
    }

    /// Generate a short real test video with ffmpeg's testsrc.
    fn make_test_video(path: &Path, seconds: u32) -> bool {
        Command::new("ffmpeg")
            .args(["-v", "error", "-y", "-f", "lavfi", "-i"])
            .arg(format!("testsrc=duration={}:size=160x120:rate=10", seconds))
            .args(["-pix_fmt", "yuv420p"])
            .arg(path)
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    #[test]
    fn ingests_real_video_and_dedups_on_reingest() {
        if !ffmpeg_available() {
            eprintln!("skipping: ffmpeg not installed");
            return;
        }
        let dir = tempfile::tempdir().unwrap();
        let video = dir.path().join("clip.mp4");
        assert!(make_test_video(&video, 2), "failed to generate test video");

        let store = FrameStore::new(&dir.path().join("store")).unwrap();

        // First ingest: decodes real frames into the store.
        let m1 = ingest_video(&video, &store).unwrap();
        assert!(m1.frames.len() >= 10, "expected ~20 frames, got {}", m1.frames.len());
        assert_eq!(m1.width, 160);
        assert_eq!(m1.height, 120);
        let after_first = store.count().unwrap();
        assert_eq!(after_first, m1.frames.len(), "each distinct frame stored once");

        // Re-ingesting identical content adds nothing (content-addressed dedup).
        let m2 = ingest_video(&video, &store).unwrap();
        assert_eq!(store.count().unwrap(), after_first, "re-ingest deduped completely");
        assert_eq!(m1.frames, m2.frames, "same video -> identical manifest");
    }

    #[test]
    fn reconstructs_a_playable_video() {
        if !ffmpeg_available() {
            eprintln!("skipping: ffmpeg not installed");
            return;
        }
        let dir = tempfile::tempdir().unwrap();
        let video = dir.path().join("clip.mp4");
        assert!(make_test_video(&video, 1));

        let store = FrameStore::new(&dir.path().join("store")).unwrap();
        let manifest = ingest_video(&video, &store).unwrap();

        let out = dir.path().join("rebuilt.mp4");
        reconstruct_video(&manifest, &store, &out).unwrap();

        // The reconstructed file exists and probes as a video with the same resolution.
        let info = probe_video(&out).unwrap();
        assert_eq!(info.width, 160);
        assert_eq!(info.height, 120);
    }

    fn store_bytes(root: &Path) -> u64 {
        let mut total = 0u64;
        let mut stack = vec![root.to_path_buf()];
        while let Some(p) = stack.pop() {
            if let Ok(rd) = std::fs::read_dir(&p) {
                for e in rd.flatten() {
                    if e.path().is_dir() {
                        stack.push(e.path());
                    } else {
                        total += e.metadata().map(|m| m.len()).unwrap_or(0);
                    }
                }
            }
        }
        total
    }

    #[test]
    fn jpegxl_ingest_is_deterministic_and_smaller_than_png() {
        if !ffmpeg_available() {
            eprintln!("skipping: no ffmpeg");
            return;
        }
        let dir = tempfile::tempdir().unwrap();
        let video = dir.path().join("clip.mp4");
        assert!(make_test_video(&video, 2));

        // JXL ingest, twice, into the same store: must dedup perfectly (deterministic hashes).
        let jxl_root = dir.path().join("jxl");
        let jxl_store = FrameStore::new(&jxl_root).unwrap();
        let m1 = ingest_video_with_format(&video, &jxl_store, FrameFormat::JpegXl { distance: 1.0 }).unwrap();
        let after_first = jxl_store.count().unwrap();
        let m2 = ingest_video_with_format(&video, &jxl_store, FrameFormat::JpegXl { distance: 1.0 }).unwrap();
        assert_eq!(jxl_store.count().unwrap(), after_first, "JXL re-ingest must dedup (determinism)");
        assert_eq!(m1.frames, m2.frames, "same clip -> identical JXL manifest");
        assert_eq!(m1.codec, "jxl");

        // PNG ingest of the same clip, into its own store.
        let png_root = dir.path().join("png");
        let png_store = FrameStore::new(&png_root).unwrap();
        let mp = ingest_video(&video, &png_store).unwrap();
        assert_eq!(mp.codec, "png");
        assert_eq!(m1.frames.len(), mp.frames.len());

        // The JXL frame store is materially smaller than the PNG store.
        let jxl_sz = store_bytes(&jxl_root);
        let png_sz = store_bytes(&png_root);
        assert!(jxl_sz < png_sz, "JXL store ({jxl_sz}B) should be smaller than PNG ({png_sz}B)");
    }
}
