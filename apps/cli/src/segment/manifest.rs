//! Video manifest for segmented storage.

use crate::core::Hash;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// A single video segment.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Segment {
    /// Segment index (0-based).
    pub index: u32,
    /// Filename of the segment.
    pub filename: String,
    /// Content hash of the segment file.
    pub hash: Hash,
    /// Size in bytes.
    pub size: u64,
    /// Duration in seconds.
    pub duration: f64,
    /// Start time in the original video.
    pub start_time: f64,
}

/// Manifest describing a segmented video.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VideoManifest {
    /// Manifest format version.
    pub version: u32,
    /// Original source filename.
    pub source: String,
    /// Target segment duration in seconds.
    pub segment_duration: f64,
    /// Total video duration.
    pub total_duration: f64,
    /// Video width.
    pub width: u32,
    /// Video height.
    pub height: u32,
    /// Frame rate (as fraction string like "30/1").
    pub frame_rate: String,
    /// Video codec.
    pub video_codec: String,
    /// Audio codec (if present).
    pub audio_codec: Option<String>,
    /// List of segments in order.
    pub segments: Vec<Segment>,
}

impl VideoManifest {
    /// Create a new empty manifest.
    pub fn new(source: impl Into<String>, segment_duration: f64) -> Self {
        Self {
            version: 1,
            source: source.into(),
            segment_duration,
            total_duration: 0.0,
            width: 0,
            height: 0,
            frame_rate: "30/1".to_string(),
            video_codec: "h264".to_string(),
            audio_codec: None,
            segments: Vec::new(),
        }
    }

    /// Add a segment to the manifest.
    pub fn add_segment(&mut self, segment: Segment) {
        self.total_duration += segment.duration;
        self.segments.push(segment);
    }

    /// Get segment count.
    pub fn segment_count(&self) -> usize {
        self.segments.len()
    }

    /// Get segment by index.
    pub fn get_segment(&self, index: u32) -> Option<&Segment> {
        self.segments.iter().find(|s| s.index == index)
    }

    /// Find segment containing a given timestamp.
    pub fn segment_at_time(&self, time: f64) -> Option<&Segment> {
        let mut current_time = 0.0;
        for segment in &self.segments {
            if time >= current_time && time < current_time + segment.duration {
                return Some(segment);
            }
            current_time += segment.duration;
        }
        None
    }

    /// Serialize to JSON.
    pub fn to_json(&self) -> String {
        serde_json::to_string_pretty(self).expect("manifest serialization failed")
    }

    /// Deserialize from JSON.
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }

    /// Get the manifest filename for a video.
    pub fn manifest_filename(video_path: &Path) -> String {
        let stem = video_path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "video".to_string());
        format!("{}.dits-manifest.json", stem)
    }

    /// Get the segments directory name for a video.
    pub fn segments_dirname(video_path: &Path) -> String {
        let stem = video_path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "video".to_string());
        format!("{}.dits-segments", stem)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manifest_creation() {
        let mut manifest = VideoManifest::new("test.mp4", 2.0);
        assert_eq!(manifest.segment_count(), 0);

        manifest.add_segment(Segment {
            index: 0,
            filename: "seg_000.mp4".to_string(),
            hash: Hash::ZERO,
            size: 1000,
            duration: 2.0,
            start_time: 0.0,
        });

        assert_eq!(manifest.segment_count(), 1);
        assert_eq!(manifest.total_duration, 2.0);
    }

    #[test]
    fn test_segment_at_time() {
        let mut manifest = VideoManifest::new("test.mp4", 2.0);

        manifest.add_segment(Segment {
            index: 0,
            filename: "seg_000.mp4".to_string(),
            hash: Hash::ZERO,
            size: 1000,
            duration: 2.0,
            start_time: 0.0,
        });

        manifest.add_segment(Segment {
            index: 1,
            filename: "seg_001.mp4".to_string(),
            hash: Hash::ZERO,
            size: 1000,
            duration: 2.0,
            start_time: 2.0,
        });

        assert_eq!(manifest.segment_at_time(0.5).unwrap().index, 0);
        assert_eq!(manifest.segment_at_time(2.5).unwrap().index, 1);
        assert!(manifest.segment_at_time(5.0).is_none());
    }
}
