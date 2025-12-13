//! Video segmenter - splits videos into GOP-aligned chunks.

use super::manifest::{Segment, VideoManifest};
use crate::core::{Hash, Hasher};
use std::fs;
use std::io;
use std::path::Path;
use std::process::Command;
use thiserror::Error;

/// Errors during segmentation.
#[derive(Error, Debug)]
pub enum SegmentError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("FFmpeg not found. Please install FFmpeg.")]
    FfmpegNotFound,

    #[error("FFmpeg error: {0}")]
    FfmpegError(String),

    #[error("FFprobe error: {0}")]
    FfprobeError(String),

    #[error("Invalid video: {0}")]
    InvalidVideo(String),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

/// Configuration for video segmentation.
#[derive(Clone, Debug)]
pub struct SegmentConfig {
    /// Target segment duration in seconds.
    pub segment_duration: f64,
    /// Output format for segments (mp4, ts).
    pub segment_format: String,
    /// Force keyframes at segment boundaries.
    pub force_keyframes: bool,
}

impl Default for SegmentConfig {
    fn default() -> Self {
        Self {
            segment_duration: 2.0,
            segment_format: "mp4".to_string(),
            force_keyframes: true,
        }
    }
}

/// Video segmenter that splits videos into GOP-aligned chunks.
pub struct Segmenter {
    config: SegmentConfig,
}

impl Segmenter {
    /// Create a new segmenter with default config.
    pub fn new() -> Self {
        Self {
            config: SegmentConfig::default(),
        }
    }

    /// Create a new segmenter with custom config.
    pub fn with_config(config: SegmentConfig) -> Self {
        Self { config }
    }

    /// Check if FFmpeg is available.
    pub fn check_ffmpeg() -> Result<(), SegmentError> {
        let output = Command::new("ffmpeg").arg("-version").output();

        match output {
            Ok(o) if o.status.success() => Ok(()),
            _ => Err(SegmentError::FfmpegNotFound),
        }
    }

    /// Get video information using ffprobe.
    fn probe_video(&self, path: &Path) -> Result<VideoInfo, SegmentError> {
        let output = Command::new("ffprobe")
            .args([
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
            ])
            .arg(path)
            .output()
            .map_err(|_| SegmentError::FfmpegNotFound)?;

        if !output.status.success() {
            return Err(SegmentError::FfprobeError(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        let json: serde_json::Value = serde_json::from_slice(&output.stdout)?;

        // Extract video stream info
        let streams = json["streams"].as_array().ok_or_else(|| {
            SegmentError::InvalidVideo("No streams found".to_string())
        })?;

        let video_stream = streams
            .iter()
            .find(|s| s["codec_type"] == "video")
            .ok_or_else(|| SegmentError::InvalidVideo("No video stream".to_string()))?;

        let audio_stream = streams.iter().find(|s| s["codec_type"] == "audio");

        let duration = json["format"]["duration"]
            .as_str()
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0);

        Ok(VideoInfo {
            duration,
            width: video_stream["width"].as_u64().unwrap_or(0) as u32,
            height: video_stream["height"].as_u64().unwrap_or(0) as u32,
            frame_rate: video_stream["r_frame_rate"]
                .as_str()
                .unwrap_or("30/1")
                .to_string(),
            video_codec: video_stream["codec_name"]
                .as_str()
                .unwrap_or("unknown")
                .to_string(),
            audio_codec: audio_stream
                .and_then(|a| a["codec_name"].as_str())
                .map(|s| s.to_string()),
        })
    }

    /// Segment a video file into GOP-aligned chunks.
    pub fn segment(&self, video_path: &Path, output_dir: &Path) -> Result<VideoManifest, SegmentError> {
        Self::check_ffmpeg()?;

        // Create output directory
        fs::create_dir_all(output_dir)?;

        // Probe video
        let info = self.probe_video(video_path)?;

        // Segment the video
        let segment_pattern = output_dir.join(format!("seg_%03d.{}", self.config.segment_format));

        let mut cmd = Command::new("ffmpeg");
        cmd.args(["-y", "-i"])
            .arg(video_path)
            .args(["-c", "copy"])
            .args(["-f", "segment"])
            .args([
                "-segment_time",
                &self.config.segment_duration.to_string(),
            ])
            .args(["-reset_timestamps", "1"]);

        if self.config.segment_format == "mp4" {
            cmd.args(["-segment_format", "mp4"]);
        } else {
            cmd.args(["-segment_format", "mpegts"]);
        }

        cmd.arg(&segment_pattern);

        let output = cmd.output()?;

        if !output.status.success() {
            return Err(SegmentError::FfmpegError(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        // Build manifest
        let mut manifest = VideoManifest::new(
            video_path.file_name().unwrap().to_string_lossy().to_string(),
            self.config.segment_duration,
        );

        manifest.width = info.width;
        manifest.height = info.height;
        manifest.frame_rate = info.frame_rate;
        manifest.video_codec = info.video_codec;
        manifest.audio_codec = info.audio_codec;

        // Read segment files and compute hashes
        let mut index = 0u32;
        let mut start_time = 0.0;

        loop {
            let seg_filename = format!("seg_{:03}.{}", index, self.config.segment_format);
            let seg_path = output_dir.join(&seg_filename);

            if !seg_path.exists() {
                break;
            }

            let data = fs::read(&seg_path)?;
            let hash = Hasher::hash(&data);
            let size = data.len() as u64;

            // Get segment duration
            let seg_info = self.probe_video(&seg_path)?;

            manifest.add_segment(Segment {
                index,
                filename: seg_filename,
                hash,
                size,
                duration: seg_info.duration,
                start_time,
            });

            start_time += seg_info.duration;
            index += 1;
        }

        // Write manifest
        let manifest_path = output_dir.join("manifest.json");
        fs::write(&manifest_path, manifest.to_json())?;

        Ok(manifest)
    }

    /// Reassemble a video from segments.
    pub fn reassemble(
        &self,
        manifest: &VideoManifest,
        segments_dir: &Path,
        output_path: &Path,
    ) -> Result<(), SegmentError> {
        Self::check_ffmpeg()?;

        // Create concat file
        let concat_path = segments_dir.join("concat.txt");
        let mut concat_content = String::new();

        for segment in &manifest.segments {
            concat_content.push_str(&format!("file '{}'\n", segment.filename));
        }

        fs::write(&concat_path, &concat_content)?;

        // Run ffmpeg concat
        let output = Command::new("ffmpeg")
            .args(["-y", "-f", "concat", "-safe", "0", "-i"])
            .arg(&concat_path)
            .args(["-c", "copy"])
            .arg(output_path)
            .output()?;

        // Clean up concat file
        let _ = fs::remove_file(&concat_path);

        if !output.status.success() {
            return Err(SegmentError::FfmpegError(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        Ok(())
    }

    /// Compare two manifests and return changed segment indices.
    pub fn diff_manifests(old: &VideoManifest, new: &VideoManifest) -> Vec<u32> {
        let mut changed = Vec::new();

        // Build hash map of old segments
        let old_hashes: std::collections::HashMap<u32, &Hash> = old
            .segments
            .iter()
            .map(|s| (s.index, &s.hash))
            .collect();

        // Compare with new segments
        for segment in &new.segments {
            match old_hashes.get(&segment.index) {
                Some(old_hash) if **old_hash == segment.hash => {
                    // Same hash, unchanged
                }
                _ => {
                    // Changed or new
                    changed.push(segment.index);
                }
            }
        }

        changed
    }
}

impl Default for Segmenter {
    fn default() -> Self {
        Self::new()
    }
}

/// Video information from ffprobe.
#[derive(Debug)]
struct VideoInfo {
    duration: f64,
    width: u32,
    height: u32,
    frame_rate: String,
    video_codec: String,
    audio_codec: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_segmenter_creation() {
        let segmenter = Segmenter::new();
        assert_eq!(segmenter.config.segment_duration, 2.0);
    }

    #[test]
    fn test_config_default() {
        let config = SegmentConfig::default();
        assert_eq!(config.segment_duration, 2.0);
        assert_eq!(config.segment_format, "mp4");
    }
}
