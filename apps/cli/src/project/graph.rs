//! Project graph data structures.

use crate::core::Hash;
use serde::{Deserialize, Serialize};

/// Type of track.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TrackType {
    Video,
    Audio,
    Graphics,
    Subtitle,
}

impl std::fmt::Display for TrackType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TrackType::Video => write!(f, "video"),
            TrackType::Audio => write!(f, "audio"),
            TrackType::Graphics => write!(f, "graphics"),
            TrackType::Subtitle => write!(f, "subtitle"),
        }
    }
}

/// A clip in a track.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clip {
    /// Unique clip ID.
    pub id: String,
    /// Path to source file in repository.
    pub file_path: String,
    /// Manifest hash of the specific file version.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manifest_id: Option<String>,
    /// In-point (seconds from start of source).
    #[serde(rename = "in")]
    pub in_point: f64,
    /// Out-point (seconds from start of source).
    #[serde(rename = "out")]
    pub out_point: f64,
    /// Timeline start position (seconds).
    pub start: f64,
}

impl Clip {
    /// Create a new clip.
    pub fn new(id: &str, file_path: &str, in_point: f64, out_point: f64, start: f64) -> Self {
        Self {
            id: id.to_string(),
            file_path: file_path.to_string(),
            manifest_id: None,
            in_point,
            out_point,
            start,
        }
    }

    /// Set the manifest ID for this clip.
    pub fn with_manifest(mut self, manifest_hash: &Hash) -> Self {
        self.manifest_id = Some(manifest_hash.to_hex());
        self
    }

    /// Duration of the clip.
    pub fn duration(&self) -> f64 {
        self.out_point - self.in_point
    }

    /// End position on timeline.
    pub fn end(&self) -> f64 {
        self.start + self.duration()
    }
}

/// A track in the timeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    /// Track ID.
    pub id: String,
    /// Track type.
    #[serde(rename = "type")]
    pub track_type: TrackType,
    /// Clips in this track.
    pub clips: Vec<Clip>,
}

impl Track {
    /// Create a new track.
    pub fn new(id: &str, track_type: TrackType) -> Self {
        Self {
            id: id.to_string(),
            track_type,
            clips: Vec::new(),
        }
    }

    /// Add a clip to this track.
    pub fn add_clip(&mut self, clip: Clip) {
        self.clips.push(clip);
        // Sort clips by start time
        self.clips.sort_by(|a, b| a.start.partial_cmp(&b.start).unwrap());
    }

    /// Get total duration of the track.
    pub fn duration(&self) -> f64 {
        self.clips.iter().map(|c| c.end()).fold(0.0, f64::max)
    }

    /// Generate next clip ID.
    pub fn next_clip_id(&self) -> String {
        format!("clip-{:03}", self.clips.len() + 1)
    }
}

/// A project graph representing a video timeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectGraph {
    /// Object type identifier.
    pub object_type: String,
    /// Schema version.
    pub version: u32,
    /// Kind of project (video_timeline, etc.).
    pub kind: String,
    /// Project name.
    pub name: String,
    /// Tracks in this timeline.
    pub tracks: Vec<Track>,
    /// Hash of this project (computed on store).
    #[serde(skip)]
    pub hash: Option<Hash>,
}

impl ProjectGraph {
    /// Create a new video timeline project.
    pub fn new_video_timeline(name: &str) -> Self {
        Self {
            object_type: "project_graph".to_string(),
            version: 1,
            kind: "video_timeline".to_string(),
            name: name.to_string(),
            tracks: Vec::new(),
            hash: None,
        }
    }

    /// Add a track.
    pub fn add_track(&mut self, track: Track) {
        self.tracks.push(track);
    }

    /// Get a track by ID.
    pub fn get_track(&self, id: &str) -> Option<&Track> {
        self.tracks.iter().find(|t| t.id == id)
    }

    /// Get a mutable track by ID.
    pub fn get_track_mut(&mut self, id: &str) -> Option<&mut Track> {
        self.tracks.iter_mut().find(|t| t.id == id)
    }

    /// Get or create a video track.
    pub fn get_or_create_video_track(&mut self) -> &mut Track {
        if !self.tracks.iter().any(|t| t.track_type == TrackType::Video) {
            let id = format!("v{}", self.tracks.iter().filter(|t| t.track_type == TrackType::Video).count() + 1);
            self.add_track(Track::new(&id, TrackType::Video));
        }
        self.tracks.iter_mut().find(|t| t.track_type == TrackType::Video).unwrap()
    }

    /// Generate next track ID for a given type.
    pub fn next_track_id(&self, track_type: TrackType) -> String {
        let prefix = match track_type {
            TrackType::Video => "v",
            TrackType::Audio => "a",
            TrackType::Graphics => "g",
            TrackType::Subtitle => "s",
        };
        let count = self.tracks.iter().filter(|t| t.track_type == track_type).count();
        format!("{}{}", prefix, count + 1)
    }

    /// Get total duration of the timeline.
    pub fn duration(&self) -> f64 {
        self.tracks.iter().map(|t| t.duration()).fold(0.0, f64::max)
    }

    /// Count total clips.
    pub fn clip_count(&self) -> usize {
        self.tracks.iter().map(|t| t.clips.len()).sum()
    }

    /// Serialize to JSON bytes.
    pub fn to_bytes(&self) -> Result<Vec<u8>, serde_json::Error> {
        serde_json::to_vec_pretty(self)
    }

    /// Deserialize from JSON bytes.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, serde_json::Error> {
        serde_json::from_slice(bytes)
    }

    /// Pretty print the timeline.
    pub fn summary(&self) -> String {
        let mut s = String::new();
        s.push_str(&format!("Project: {} ({})\n", self.name, self.kind));
        s.push_str(&format!("Duration: {:.2}s\n", self.duration()));
        s.push_str(&format!("Tracks: {}\n", self.tracks.len()));
        s.push_str(&format!("Clips: {}\n", self.clip_count()));

        for track in &self.tracks {
            s.push_str(&format!("\n  Track {} ({}):\n", track.id, track.track_type));
            for clip in &track.clips {
                s.push_str(&format!(
                    "    [{:6.2}s - {:6.2}s] {} ({:.2}s-{:.2}s)\n",
                    clip.start,
                    clip.end(),
                    clip.file_path,
                    clip.in_point,
                    clip.out_point,
                ));
            }
        }

        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_project() {
        let project = ProjectGraph::new_video_timeline("main-cut");
        assert_eq!(project.name, "main-cut");
        assert_eq!(project.kind, "video_timeline");
        assert_eq!(project.version, 1);
        assert!(project.tracks.is_empty());
    }

    #[test]
    fn test_add_clip() {
        let mut project = ProjectGraph::new_video_timeline("test");
        let track = project.get_or_create_video_track();

        let clip = Clip::new("clip-001", "video.mp4", 0.0, 10.0, 0.0);
        track.add_clip(clip);

        assert_eq!(track.clips.len(), 1);
        assert_eq!(track.duration(), 10.0);
    }

    #[test]
    fn test_serialization() {
        let mut project = ProjectGraph::new_video_timeline("test");
        let track = project.get_or_create_video_track();
        track.add_clip(Clip::new("clip-001", "video.mp4", 0.0, 10.0, 0.0));

        let bytes = project.to_bytes().unwrap();
        let loaded = ProjectGraph::from_bytes(&bytes).unwrap();

        assert_eq!(loaded.name, "test");
        assert_eq!(loaded.tracks.len(), 1);
        assert_eq!(loaded.tracks[0].clips.len(), 1);
    }
}
