//! Clip manifest — an ordered list of frame references.
//!
//! A video version in FACR is not a file; it is a `ClipManifest`: stream metadata
//! plus an ordered sequence of `FrameRef`s into the content-addressed frame store.
//! Trims, reorders, and inserts are manifest edits; the frames they reference are
//! shared with prior versions automatically.

use crate::core::Hash;
use serde::{Deserialize, Serialize};

/// A reference to one frame in the content-addressed store, with timing.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct FrameRef {
    /// Content hash of the encoded frame.
    pub hash: Hash,
    /// Presentation timestamp (in `timescale` units).
    pub pts: i64,
    /// Frame duration (in `timescale` units).
    pub duration: i64,
}

/// A content-addressed audio track stored alongside the frames. The audio is extracted
/// stream-copied (lossless) into a container and stored once; it dedups across versions
/// just like frames, and is muxed back on reconstruction.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct AudioTrack {
    /// Content hash of the stored audio container bytes.
    pub hash: Hash,
    /// Container/format extension used when storing the audio (e.g. "mka").
    pub format: String,
}

/// An ordered manifest describing one version of a clip.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClipManifest {
    /// Frame width in pixels.
    pub width: u32,
    /// Frame height in pixels.
    pub height: u32,
    /// Name of the `FrameCodec` used to encode the frames.
    pub codec: String,
    /// Timescale: `timescale` pts/duration units per second.
    pub timescale: u32,
    /// Source frame rate as ffmpeg reports it (e.g. "30000/1001"), preserved so
    /// reconstruction keeps exact timing. Defaults for manifests built without video.
    #[serde(default = "default_frame_rate")]
    pub frame_rate: String,
    /// Optional audio track (None for silent clips or manifests built without video).
    #[serde(default)]
    pub audio: Option<AudioTrack>,
    /// Ordered frame references.
    pub frames: Vec<FrameRef>,
}

fn default_frame_rate() -> String {
    "30".to_string()
}

impl ClipManifest {
    /// Create an empty manifest for the given stream parameters.
    pub fn new(width: u32, height: u32, codec: impl Into<String>, timescale: u32) -> Self {
        Self {
            width,
            height,
            codec: codec.into(),
            timescale,
            frame_rate: default_frame_rate(),
            audio: None,
            frames: Vec::new(),
        }
    }

    /// Append a frame reference.
    pub fn push_frame(&mut self, frame: FrameRef) {
        self.frames.push(frame);
    }

    /// Number of frames in the manifest.
    pub fn len(&self) -> usize {
        self.frames.len()
    }

    /// Whether the manifest has no frames.
    pub fn is_empty(&self) -> bool {
        self.frames.is_empty()
    }

    /// Serialize to pretty JSON.
    pub fn to_json(&self) -> serde_json::Result<String> {
        serde_json::to_string_pretty(self)
    }

    /// Deserialize from JSON.
    pub fn from_json(s: &str) -> serde_json::Result<Self> {
        serde_json::from_str(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Hasher;

    fn frame(seed: &[u8], pts: i64) -> FrameRef {
        FrameRef {
            hash: Hasher::hash(seed),
            pts,
            duration: 1,
        }
    }

    #[test]
    fn manifest_survives_json_round_trip() {
        let mut m = ClipManifest::new(1920, 1080, "prores_hq", 24);
        m.push_frame(frame(b"f0", 0));
        m.push_frame(frame(b"f1", 1));
        m.push_frame(frame(b"f2", 2));

        let json = m.to_json().unwrap();
        let back = ClipManifest::from_json(&json).unwrap();

        assert_eq!(m, back);
        assert_eq!(back.len(), 3);
        assert_eq!(back.frames[1].hash, Hasher::hash(b"f1"));
    }
}
