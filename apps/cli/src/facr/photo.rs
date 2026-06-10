//! Photo path: store the source image once, version edits as a non-destructive
//! log.
//!
//! The photo equivalent of frame-addressable video. The original (RAW/JPEG/PNG)
//! is stored exactly once, content-addressed. A *version* of a photo is `base
//! hash + an ordered list of edits`. Applying 200 edits costs one stored image
//! plus a few KB of instructions — not 200 copies. Rendering applies the edit
//! log to the base via ffmpeg to produce a deliverable, which is never stored
//! as a version.

use std::{path::Path, process::Command};

use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};

use super::store::FrameStore;
use crate::core::Hash;

/// A single non-destructive edit. Order matters; edits compose left-to-right.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
pub enum PhotoEdit {
    /// Crop to a rectangle in source pixels.
    Crop { x: u32, y: u32, width: u32, height: u32 },
    /// Exposure adjustment in stops (positive = brighter).
    Exposure { stops: f32 },
    /// Contrast multiplier (1.0 = unchanged).
    Contrast { amount: f32 },
    /// Saturation multiplier (1.0 = unchanged, 0.0 = greyscale).
    Saturation { amount: f32 },
    /// White-balance color temperature in Kelvin.
    WhiteBalance { kelvin: f32 },
    /// Clockwise rotation in degrees (90, 180, or 270).
    Rotate { degrees: u16 },
}

/// One version of a photo: the shared source plus an ordered edit log.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PhotoVersion {
    /// Content hash of the stored source image (shared across all versions).
    pub base:          Hash,
    /// Source width/height in pixels.
    pub width:         u32,
    pub height:        u32,
    /// Source file extension (e.g. "jpg", "png", "dng"), used on render.
    pub source_format: String,
    /// Ordered, non-destructive edits.
    pub edits:         Vec<PhotoEdit>,
}

impl PhotoVersion {
    pub fn new(base: Hash, width: u32, height: u32, source_format: impl Into<String>) -> Self {
        Self { base, width, height, source_format: source_format.into(), edits: Vec::new() }
    }

    /// Return a new version with `edit` appended — the original is untouched.
    pub fn with_edit(&self, edit: PhotoEdit) -> Self {
        let mut next = self.clone();
        next.edits.push(edit);
        next
    }

    pub fn to_json(&self) -> serde_json::Result<String> {
        serde_json::to_string_pretty(self)
    }

    pub fn from_json(s: &str) -> serde_json::Result<Self> {
        serde_json::from_str(s)
    }
}

/// Probe an image's dimensions with ffprobe.
fn probe_image(path: &Path) -> Result<(u32, u32)> {
    let out = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "default=noprint_wrappers=1",
        ])
        .arg(path)
        .output()
        .context("running ffprobe on image")?;
    if !out.status.success() {
        bail!("ffprobe failed: {}", String::from_utf8_lossy(&out.stderr));
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let mut w = 0u32;
    let mut h = 0u32;
    for line in text.lines() {
        if let Some(v) = line.strip_prefix("width=") {
            w = v.trim().parse().unwrap_or(0);
        } else if let Some(v) = line.strip_prefix("height=") {
            h = v.trim().parse().unwrap_or(0);
        }
    }
    Ok((w, h))
}

/// Store a source image once (content-addressed) and return a base
/// `PhotoVersion`.
pub fn ingest_photo(path: &Path, store: &FrameStore) -> Result<PhotoVersion> {
    anyhow::ensure!(path.exists(), "image not found: {}", path.display());
    // Validate it's actually a readable image BEFORE storing anything.
    let (width, height) =
        probe_image(path).with_context(|| format!("not a readable image: {}", path.display()))?;
    anyhow::ensure!(
        width > 0 && height > 0,
        "{} is not a valid image (no decodable video/image stream)",
        path.display()
    );
    let bytes = std::fs::read(path).context("read source image")?;
    let hash = store.store_frame(&bytes)?;
    let fmt = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();
    Ok(PhotoVersion::new(hash, width, height, fmt))
}

/// Translate an edit log into an ffmpeg `-vf` filter chain.
fn build_filter_chain(edits: &[PhotoEdit]) -> Option<String> {
    if edits.is_empty() {
        return None;
    }
    let mut parts = Vec::new();
    for edit in edits {
        match edit {
            PhotoEdit::Crop { x, y, width, height } => {
                parts.push(format!("crop={width}:{height}:{x}:{y}"));
            },
            PhotoEdit::Exposure { stops } => {
                parts.push(format!("exposure=exposure={stops}"));
            },
            PhotoEdit::Contrast { amount } => {
                parts.push(format!("eq=contrast={amount}"));
            },
            PhotoEdit::Saturation { amount } => {
                parts.push(format!("eq=saturation={amount}"));
            },
            PhotoEdit::WhiteBalance { kelvin } => {
                // colortemperature expects Kelvin; clamp to the filter's supported range.
                let k = kelvin.clamp(1000.0, 40000.0);
                parts.push(format!("colortemperature=temperature={k}"));
            },
            PhotoEdit::Rotate { degrees } => {
                let f = match degrees % 360 {
                    90 => "transpose=1",
                    180 => "transpose=2,transpose=2",
                    270 => "transpose=2",
                    _ => continue,
                };
                parts.push(f.to_string());
            },
        }
    }
    if parts.is_empty() {
        None
    } else {
        Some(parts.join(","))
    }
}

/// Render a photo version by applying its edit log to the stored source.
pub fn render_photo(version: &PhotoVersion, store: &FrameStore, output: &Path) -> Result<()> {
    let bytes = store
        .load_frame(&version.base)
        .with_context(|| format!("source image {} not in store", version.base.short()))?;

    let work = std::env::temp_dir().join(format!("dits-photo-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&work).context("create photo temp dir")?;
    let src = work.join(format!("src.{}", version.source_format));
    std::fs::write(&src, &bytes).context("write source for render")?;

    let mut cmd = Command::new("ffmpeg");
    cmd.args(["-v", "error", "-y", "-i"]).arg(&src);
    if let Some(chain) = build_filter_chain(&version.edits) {
        cmd.args(["-vf", &chain]);
    }
    cmd.arg(output);
    let out = cmd.output().context("running ffmpeg render")?;
    let _ = std::fs::remove_dir_all(&work);
    if !out.status.success() {
        bail!("ffmpeg render failed: {}", String::from_utf8_lossy(&out.stderr));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Hasher;

    #[test]
    fn many_edits_share_one_stored_source() {
        let dir = tempfile::tempdir().unwrap();
        let store = FrameStore::new(dir.path()).unwrap();

        // Store a "source image" once.
        let source = vec![7u8; 4096];
        let base = store.store_frame(&source).unwrap();
        let v0 = PhotoVersion::new(base, 1920, 1080, "jpg");
        assert_eq!(store.count().unwrap(), 1);

        // Build five successive edited versions.
        let v1 = v0.with_edit(PhotoEdit::Exposure { stops: 0.5 });
        let v2 = v1.with_edit(PhotoEdit::Contrast { amount: 1.2 });
        let v3 = v2.with_edit(PhotoEdit::Crop { x: 0, y: 0, width: 1280, height: 720 });
        let v4 = v3.with_edit(PhotoEdit::Saturation { amount: 0.8 });
        let v5 = v4.with_edit(PhotoEdit::Rotate { degrees: 90 });

        // Editing is non-destructive and stores NOTHING new: 5 versions, 1 stored
        // image.
        assert_eq!(store.count().unwrap(), 1, "all versions share one stored source");
        assert_eq!(v0.edits.len(), 0);
        assert_eq!(v5.edits.len(), 5);
        assert_eq!(v5.base, v0.base, "every version references the same base");

        // The whole edit history serializes to a tiny manifest.
        let json = v5.to_json().unwrap();
        assert!(json.len() < 2000, "edit log is tiny: {} bytes", json.len());
        assert_eq!(PhotoVersion::from_json(&json).unwrap(), v5);
    }

    #[test]
    fn unedited_version_has_no_filter_chain() {
        assert_eq!(build_filter_chain(&[]), None);
        let chain = build_filter_chain(&[
            PhotoEdit::Exposure { stops: 1.0 },
            PhotoEdit::Crop { x: 1, y: 2, width: 3, height: 4 },
        ])
        .unwrap();
        assert_eq!(chain, "exposure=exposure=1,crop=3:4:1:2");
    }
}
