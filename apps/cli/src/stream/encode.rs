//! Encode a contiguous run of PNG frames into ONE self-contained MPEG-TS segment.
//! Encoding each segment independently makes every segment start on an IDR and be
//! spliceable, with no cross-segment prediction — exactly what HLS wants.
//!
//! `ts_offset_seconds` shifts the segment's presentation timestamps so the HLS
//! timeline stays continuous across independently-encoded segments. It is a pure
//! function of the segment's start frame, so it does not affect hash stability:
//! the same frames at the same position always produce identical bytes.

use anyhow::{bail, Context, Result};
use std::io::Write;
use std::process::Command;

/// Encode the given ordered PNG frame blobs into a single `.ts` segment, returned as bytes.
/// `frame_rate` is the ffmpeg fraction string from the manifest (e.g. "10/1").
/// `ts_offset_seconds` is the segment's start time on the global HLS timeline.
pub fn encode_segment(frame_pngs: &[Vec<u8>], frame_rate: &str, ts_offset_seconds: f64) -> Result<Vec<u8>> {
    if frame_pngs.is_empty() {
        bail!("cannot encode an empty segment");
    }
    let work = std::env::temp_dir().join(format!("dits-stream-seg-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&work).context("create segment temp dir")?;

    for (i, png) in frame_pngs.iter().enumerate() {
        let mut f = std::fs::File::create(work.join(format!("f_{:08}.png", i)))
            .context("write frame png")?;
        f.write_all(png).context("write frame bytes")?;
    }

    let pattern = work.join("f_%08d.png");
    let out_path = work.join("seg.ts");
    let offset = format!("{ts_offset_seconds}");
    let status = Command::new("ffmpeg")
        .args(["-v", "error", "-y", "-framerate", frame_rate, "-start_number", "0", "-i"])
        .arg(&pattern)
        .args([
            "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
            "-sc_threshold", "0", "-an",
            "-output_ts_offset", &offset,
            "-muxdelay", "0", "-muxpreload", "0",
            "-f", "mpegts",
        ])
        .arg(&out_path)
        .output()
        .context("running ffmpeg segment encode")?;
    if !status.status.success() {
        let _ = std::fs::remove_dir_all(&work);
        bail!("ffmpeg segment encode failed: {}", String::from_utf8_lossy(&status.stderr));
    }
    let bytes = std::fs::read(&out_path).context("read encoded segment")?;
    let _ = std::fs::remove_dir_all(&work);
    Ok(bytes)
}

/// Probe a `.ts` blob: returns true if ffprobe reads it as a playable video stream.
#[cfg(test)]
pub fn probe_ts_is_video(ts: &[u8]) -> bool {
    let tmp = std::env::temp_dir().join(format!("dits-probe-{}.ts", uuid::Uuid::new_v4()));
    if std::fs::write(&tmp, ts).is_err() {
        return false;
    }
    let ok = Command::new("ffprobe")
        .args([
            "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=codec_type", "-of", "csv=p=0",
        ])
        .arg(&tmp)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains("video"))
        .unwrap_or(false);
    let _ = std::fs::remove_file(&tmp);
    ok
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ffmpeg_available() -> bool {
        Command::new("ffmpeg").arg("-version").output().map(|o| o.status.success()).unwrap_or(false)
    }

    /// Make N tiny distinct PNG frames via ffmpeg testsrc.
    fn make_png_frames(n: usize) -> Vec<Vec<u8>> {
        let dir = std::env::temp_dir().join(format!("dits-mk-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let pat = dir.join("f_%08d.png");
        Command::new("ffmpeg")
            .args([
                "-v", "error", "-y", "-f", "lavfi", "-i",
                &format!("testsrc=duration={}:size=64x48:rate=10", (n as f64 / 10.0).max(0.1)),
                "-frames:v", &n.to_string(),
            ])
            .arg(&pat)
            .status()
            .unwrap();
        let mut frames: Vec<_> = std::fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().map(|x| x == "png").unwrap_or(false))
            .collect();
        frames.sort();
        let out = frames.iter().map(|p| std::fs::read(p).unwrap()).collect();
        let _ = std::fs::remove_dir_all(&dir);
        out
    }

    #[test]
    fn encodes_frames_into_a_playable_ts_segment() {
        if !ffmpeg_available() {
            eprintln!("skipping: no ffmpeg");
            return;
        }
        let frames = make_png_frames(20);
        assert_eq!(frames.len(), 20);
        let ts = encode_segment(&frames, "10/1", 0.0).unwrap();
        assert!(!ts.is_empty());
        assert!(probe_ts_is_video(&ts), "encoded segment should be a playable video");
    }

    #[test]
    fn offset_is_hash_stable() {
        if !ffmpeg_available() {
            eprintln!("skipping: no ffmpeg");
            return;
        }
        // Same frames + same offset => identical bytes (reuse logic depends on this).
        let frames = make_png_frames(10);
        let a = encode_segment(&frames, "10/1", 4.0).unwrap();
        let b = encode_segment(&frames, "10/1", 4.0).unwrap();
        assert_eq!(a, b, "deterministic for identical inputs");
    }

    #[test]
    fn empty_segment_errors() {
        assert!(encode_segment(&[], "10/1", 0.0).is_err());
    }
}
