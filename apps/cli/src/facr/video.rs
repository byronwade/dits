//! Real video ingest/reconstruction for FACR via ffmpeg.
//!
//! `ingest_video` decodes a real video file into individual lossless frames (PNG),
//! stores each one content-addressed in a [`FrameStore`] (so identical frames dedup),
//! and returns a [`ClipManifest`]. `reconstruct_video` does the reverse: it materializes
//! the manifest's frames and re-muxes them into a playable video.
//!
//! Audio is preserved: the track is extracted stream-copied (lossless), stored
//! content-addressed (deduped like frames), and muxed back on reconstruction. Frames
//! are stored as PNG, which is lossless and deterministic, so re-ingesting identical
//! content dedups perfectly.

use super::manifest::{AudioTrack, ClipManifest, FrameRef};
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

/// Whether the source has at least one audio stream. Used to decide whether to extract
/// and store an audio track (which `ingest_video` then preserves) and to inform the user.
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

/// Decode `path` into content-addressed frames stored in `store`, returning a manifest.
pub fn ingest_video(path: &Path, store: &FrameStore) -> Result<ClipManifest> {
    check_ffmpeg()?;
    let info = probe_video(path)?;

    let work = std::env::temp_dir().join(format!("dits-facr-ingest-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&work).context("create ingest temp dir")?;
    let pattern = work.join("f_%08d.png");

    // Decode every frame to a lossless PNG.
    let out = Command::new("ffmpeg")
        .args(["-v", "error", "-i"])
        .arg(path)
        .arg(&pattern)
        .output()
        .context("running ffmpeg decode")?;
    if !out.status.success() {
        let _ = std::fs::remove_dir_all(&work);
        bail!("ffmpeg decode failed: {}", String::from_utf8_lossy(&out.stderr));
    }

    // Collect frames in order and store each content-addressed.
    let mut entries: Vec<_> = std::fs::read_dir(&work)
        .context("read decoded frames")?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().map(|x| x == "png").unwrap_or(false))
        .collect();
    entries.sort();

    let mut manifest = ClipManifest::new(info.width, info.height, "png", 1);
    manifest.frame_rate = info.frame_rate;
    for (i, frame_path) in entries.iter().enumerate() {
        let bytes = std::fs::read(frame_path).context("read frame png")?;
        let hash = store.store_frame(&bytes)?;
        manifest.push_frame(FrameRef { hash, pts: i as i64, duration: 1 });
    }

    // Extract the audio track (stream-copied, lossless) and store it content-addressed
    // so it dedups across versions and can be muxed back on reconstruction.
    if source_has_audio(path) {
        let audio_path = work.join("audio.mka");
        // `-fflags +bitexact` / `-map_metadata -1` make the muxed output deterministic
        // (no encoder strings, timestamps, or random muxing IDs) so identical audio
        // content-addresses to the same hash and dedups across versions.
        let a = Command::new("ffmpeg")
            .args(["-v", "error", "-y", "-i"])
            .arg(path)
            .args([
                "-vn", "-c:a", "copy", "-map_metadata", "-1",
                "-fflags", "+bitexact", "-flags:a", "+bitexact",
            ])
            .arg(&audio_path)
            .output()
            .context("running ffmpeg audio extract")?;
        if a.status.success() {
            if let Ok(bytes) = std::fs::read(&audio_path) {
                if !bytes.is_empty() {
                    let hash = store.store_frame(&bytes)?;
                    manifest.audio = Some(AudioTrack { hash, format: "mka".to_string() });
                }
            }
        }
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

    for (i, frame) in manifest.frames.iter().enumerate() {
        let bytes = store
            .load_frame(&frame.hash)
            .with_context(|| format!("missing frame {} ({})", i, frame.hash.short()))?;
        std::fs::write(work.join(format!("f_{:08}.png", i + 1)), bytes)
            .context("write frame for reconstruction")?;
    }

    // Materialize the stored audio track, if any, to mux back alongside the frames.
    let audio_file = if let Some(audio) = &manifest.audio {
        let bytes = store
            .load_frame(&audio.hash)
            .with_context(|| format!("missing audio track ({})", audio.hash.short()))?;
        let p = work.join(format!("audio.{}", audio.format));
        std::fs::write(&p, bytes).context("write audio for reconstruction")?;
        Some(p)
    } else {
        None
    };

    let pattern = work.join("f_%08d.png");
    let mut cmd = Command::new("ffmpeg");
    cmd.args(["-v", "error", "-y", "-framerate", &manifest.frame_rate, "-i"])
        .arg(&pattern);
    if let Some(ap) = &audio_file {
        cmd.arg("-i").arg(ap);
    }
    cmd.args(["-c:v", "libx264", "-pix_fmt", "yuv420p"]);
    if audio_file.is_some() {
        // Stream-copy the audio (lossless) and map both streams; -shortest guards against
        // tiny duration mismatches between the re-encoded video and the copied audio.
        cmd.args(["-c:a", "copy", "-map", "0:v:0", "-map", "1:a:0", "-shortest"]);
    }
    let out = cmd
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

    /// Generate a test video that also has an audio track.
    fn make_test_video_with_audio(path: &Path, seconds: u32) -> bool {
        Command::new("ffmpeg")
            .args(["-v", "error", "-y", "-f", "lavfi", "-i"])
            .arg(format!("testsrc=duration={}:size=160x120:rate=10", seconds))
            .args(["-f", "lavfi", "-i"])
            .arg(format!("sine=frequency=440:duration={}", seconds))
            .args(["-pix_fmt", "yuv420p", "-shortest"])
            .arg(path)
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    fn has_audio_stream(path: &Path) -> bool {
        Command::new("ffprobe")
            .args(["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0"])
            .arg(path)
            .output()
            .map(|o| !o.stdout.is_empty())
            .unwrap_or(false)
    }

    #[test]
    fn reconstruction_preserves_audio() {
        if !ffmpeg_available() {
            eprintln!("skipping: ffmpeg not installed");
            return;
        }
        let dir = tempfile::tempdir().unwrap();
        let video = dir.path().join("clip.mp4");
        assert!(make_test_video_with_audio(&video, 1));
        assert!(has_audio_stream(&video), "test video should have audio");

        let store = FrameStore::new(&dir.path().join("store")).unwrap();
        let manifest = ingest_video(&video, &store).unwrap();

        let out = dir.path().join("rebuilt.mp4");
        reconstruct_video(&manifest, &store, &out).unwrap();

        assert!(
            has_audio_stream(&out),
            "FACR reconstruction must preserve the audio track"
        );
    }
}
