//! Segment command - split video into GOP-aligned chunks.

use crate::segment::{SegmentConfig, Segmenter, VideoManifest};
use anyhow::{bail, Result};
use std::path::Path;

pub fn segment(file: &str, output: Option<&str>, duration: f64) -> Result<()> {
    let file_path = Path::new(file);

    if !file_path.exists() {
        bail!("File not found: {}", file);
    }

    // Determine output directory
    let output_dir = match output {
        Some(dir) => dir.to_string(),
        None => VideoManifest::segments_dirname(file_path),
    };
    let output_path = Path::new(&output_dir);

    // Create segmenter with config
    let config = SegmentConfig {
        segment_duration: duration,
        segment_format: "mp4".to_string(),
        force_keyframes: true,
    };
    let segmenter = Segmenter::with_config(config);

    println!("Segmenting {} into {:.1}s GOP-aligned chunks...", file, duration);
    println!("Output directory: {}", output_dir);
    println!();

    // Check FFmpeg
    Segmenter::check_ffmpeg()?;

    // Segment the video
    let manifest = segmenter.segment(file_path, output_path)?;

    println!("Created {} segments:", manifest.segment_count());
    println!();

    // Print segment info
    println!("{:<12} {:<12} {:<12} {}", "Segment", "Duration", "Size", "Hash");
    println!("{}", "─".repeat(60));

    for segment in &manifest.segments {
        let size_str = if segment.size > 1_000_000 {
            format!("{:.2} MB", segment.size as f64 / 1_048_576.0)
        } else {
            format!("{:.0} KB", segment.size as f64 / 1024.0)
        };

        println!(
            "{:<12} {:<12.2}s {:<12} {}",
            segment.filename,
            segment.duration,
            size_str,
            &segment.hash.to_hex()[..16]
        );
    }

    println!();
    println!("Total duration: {:.2}s", manifest.total_duration);
    println!("Manifest written to: {}/manifest.json", output_dir);
    println!();
    println!("Tip: Use 'dits add {}/' to version the segments", output_dir);
    println!("     Each segment is tracked independently for deduplication.");

    Ok(())
}
