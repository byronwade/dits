//! Assemble command - reassemble video from segments.

use crate::segment::{Segmenter, VideoManifest};
use anyhow::{bail, Result};
use std::fs;
use std::path::Path;

pub fn assemble(segments_dir: &str, output: &str) -> Result<()> {
    let segments_path = Path::new(segments_dir);
    let output_path = Path::new(output);

    // Check segments directory exists
    if !segments_path.exists() {
        bail!("Segments directory not found: {}", segments_dir);
    }

    // Load manifest
    let manifest_path = segments_path.join("manifest.json");
    if !manifest_path.exists() {
        bail!("Manifest not found: {}", manifest_path.display());
    }

    let manifest_json = fs::read_to_string(&manifest_path)?;
    let manifest = VideoManifest::from_json(&manifest_json)?;

    println!("Reassembling video from {} segments...", manifest.segment_count());
    println!("Source: {}", manifest.source);
    println!("Total duration: {:.2}s", manifest.total_duration);
    println!();

    // Check FFmpeg
    Segmenter::check_ffmpeg()?;

    // Verify all segments exist
    let mut missing = Vec::new();
    for segment in &manifest.segments {
        let seg_path = segments_path.join(&segment.filename);
        if !seg_path.exists() {
            missing.push(segment.filename.clone());
        }
    }

    if !missing.is_empty() {
        bail!("Missing segments: {}", missing.join(", "));
    }

    // Reassemble
    let segmenter = Segmenter::new();
    segmenter.reassemble(&manifest, segments_path, output_path)?;

    // Get output file info
    let output_size = fs::metadata(output_path)?.len();
    let size_str = if output_size > 1_000_000 {
        format!("{:.2} MB", output_size as f64 / 1_048_576.0)
    } else {
        format!("{:.0} KB", output_size as f64 / 1024.0)
    };

    println!("✓ Assembled video: {} ({})", output, size_str);

    Ok(())
}
