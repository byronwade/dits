//! Per-shot VMAF-targeted encoding: choose each segment's CRF to hit a
//! perceptual-quality target (Netflix Dynamic Optimizer in miniature). Every
//! step is deterministic — same frames produce the same chosen CRF and
//! byte-identical output — so content-addressing and incremental reuse hold.

use std::{io::Write, path::Path, process::Command};

use anyhow::{bail, Context, Result};

/// CRF search bounds. Lower CRF = higher quality/bigger; higher CRF = lower
/// quality/smaller.
pub const MIN_CRF: u32 = 18;
pub const MAX_CRF: u32 = 34;

/// Write frame blobs to a temp dir as `f_%08d.<ext>`; returns the dir (caller
/// removes it).
fn stage_frames(frames: &[Vec<u8>], frame_ext: &str) -> Result<std::path::PathBuf> {
    let dir = std::env::temp_dir().join(format!("dits-vmaf-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&dir).context("vmaf temp dir")?;
    for (i, blob) in frames.iter().enumerate() {
        let mut f = std::fs::File::create(dir.join(format!("f_{:08}.{frame_ext}", i)))
            .context("write frame")?;
        f.write_all(blob).context("write frame bytes")?;
    }
    Ok(dir)
}

/// Encode staged frames to a plain mp4 at `crf` (same libx264 settings as the
/// segment encoder, so measured quality matches the delivered bitstream).
fn encode_probe(dir: &Path, frame_rate: &str, frame_ext: &str, crf: u32, out: &Path) -> Result<()> {
    let pattern = dir.join(format!("f_%08d.{frame_ext}"));
    let status = Command::new("ffmpeg")
        .args(["-v", "error", "-y", "-framerate", frame_rate, "-start_number", "0", "-i"])
        .arg(&pattern)
        .args([
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-pix_fmt",
            "yuv420p",
            "-sc_threshold",
            "0",
            "-an",
            "-crf",
            &crf.to_string(),
        ])
        .arg(out)
        .output()
        .context("ffmpeg probe encode")?;
    if !status.status.success() {
        bail!("probe encode failed: {}", String::from_utf8_lossy(&status.stderr));
    }
    Ok(())
}

/// Build a near-lossless reference video from staged frames (the VMAF
/// reference).
fn encode_reference(dir: &Path, frame_rate: &str, frame_ext: &str, out: &Path) -> Result<()> {
    let pattern = dir.join(format!("f_%08d.{frame_ext}"));
    let status = Command::new("ffmpeg")
        .args(["-v", "error", "-y", "-framerate", frame_rate, "-start_number", "0", "-i"])
        .arg(&pattern)
        .args(["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-qp", "0", "-an"])
        .arg(out)
        .output()
        .context("ffmpeg reference encode")?;
    if !status.status.success() {
        bail!("reference encode failed: {}", String::from_utf8_lossy(&status.stderr));
    }
    Ok(())
}

/// VMAF of `distorted` against `reference` via ffmpeg's libvmaf filter.
pub fn measure_vmaf(distorted: &Path, reference: &Path) -> Result<f64> {
    let out = Command::new("ffmpeg")
        .args(["-hide_banner", "-i"])
        .arg(distorted)
        .arg("-i")
        .arg(reference)
        .args(["-lavfi", "libvmaf", "-f", "null", "-"])
        .output()
        .context("ffmpeg libvmaf")?;
    let text = String::from_utf8_lossy(&out.stderr);
    for line in text.lines() {
        if let Some(idx) = line.find("VMAF score:") {
            let rest = line[idx + "VMAF score:".len()..].trim();
            return rest.parse::<f64>().context("parse VMAF score");
        }
    }
    bail!("no VMAF score in ffmpeg output: {}", text.lines().last().unwrap_or(""));
}

/// Highest CRF (smallest size) whose encode scores VMAF >= `target`. Returns
/// `(crf, achieved_vmaf)`. Deterministic bounded binary search over [MIN_CRF,
/// MAX_CRF]. If even MIN_CRF misses the target, returns MIN_CRF with its
/// (best-effort) score.
pub fn optimize_crf(
    frames: &[Vec<u8>],
    frame_rate: &str,
    frame_ext: &str,
    target: f64,
) -> Result<(u32, f64)> {
    if frames.is_empty() {
        bail!("cannot optimize an empty segment");
    }
    let dir = stage_frames(frames, frame_ext)?;
    let result = (|| -> Result<(u32, f64)> {
        let reference = dir.join("ref.mp4");
        encode_reference(&dir, frame_rate, frame_ext, &reference)?;

        let probe = dir.join("probe.mp4");
        let measure = |crf: u32| -> Result<f64> {
            encode_probe(&dir, frame_rate, frame_ext, crf, &probe)?;
            measure_vmaf(&probe, &reference)
        };

        // Binary search for the largest CRF whose VMAF still meets the target.
        let (mut lo, mut hi) = (MIN_CRF, MAX_CRF);
        let mut best = MIN_CRF;
        let mut best_vmaf = measure(MIN_CRF)?;
        if best_vmaf < target {
            // Even the highest-quality CRF can't reach the target; best effort.
            return Ok((MIN_CRF, best_vmaf));
        }
        while lo <= hi {
            let mid = lo + (hi - lo) / 2;
            let v = measure(mid)?;
            if v >= target {
                best = mid;
                best_vmaf = v;
                lo = mid + 1; // try to save more bits (higher CRF)
            } else {
                if mid == 0 {
                    break;
                }
                hi = mid - 1;
            }
        }
        Ok((best, best_vmaf))
    })();
    let _ = std::fs::remove_dir_all(&dir);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ffmpeg_available() -> bool {
        Command::new("ffmpeg")
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    /// `source` is a complete lavfi spec, e.g.
    /// "mandelbrot=size=320x240:rate=10".
    fn make_png_frames(source: &str, n: usize) -> Vec<Vec<u8>> {
        let dir = std::env::temp_dir().join(format!("dits-mkv-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let pat = dir.join("f_%08d.png");
        Command::new("ffmpeg")
            .args(["-v", "error", "-y", "-f", "lavfi", "-i", source, "-frames:v", &n.to_string()])
            .arg(&pat)
            .status()
            .unwrap();
        let mut v: Vec<_> = std::fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().map(|x| x == "png").unwrap_or(false))
            .collect();
        v.sort();
        let out = v.iter().map(|p| std::fs::read(p).unwrap()).collect();
        let _ = std::fs::remove_dir_all(&dir);
        out
    }

    #[test]
    fn optimize_hits_target_and_is_deterministic() {
        if !ffmpeg_available() {
            eprintln!("skipping: no ffmpeg");
            return;
        }
        let frames = make_png_frames("mandelbrot=size=320x240:rate=10", 10);
        let (crf1, v1) = optimize_crf(&frames, "10/1", "png", 90.0).unwrap();
        assert!(v1 >= 90.0 || crf1 == MIN_CRF, "achieved {v1} at crf {crf1}");
        // Determinism: same input -> same chosen CRF (the reuse guarantee).
        let (crf2, _) = optimize_crf(&frames, "10/1", "png", 90.0).unwrap();
        assert_eq!(crf1, crf2);
    }

    #[test]
    fn simple_content_uses_higher_crf_than_complex() {
        if !ffmpeg_available() {
            eprintln!("skipping: no ffmpeg");
            return;
        }
        // A flat color clip is trivially compressible -> the optimizer can use a higher
        // CRF (smaller) than detailed content at the same VMAF target.
        let simple = make_png_frames("color=c=gray:size=320x240:rate=10", 10);
        let complex = make_png_frames("mandelbrot=size=320x240:rate=10", 10);
        let (crf_simple, _) = optimize_crf(&simple, "10/1", "png", 92.0).unwrap();
        let (crf_complex, _) = optimize_crf(&complex, "10/1", "png", 92.0).unwrap();
        assert!(
            crf_simple >= crf_complex,
            "simple crf {crf_simple} should be >= complex crf {crf_complex}"
        );
    }
}
