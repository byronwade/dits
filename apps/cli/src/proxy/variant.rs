//! Proxy variant types.

use crate::core::Hash;
use serde::{Deserialize, Serialize};

/// Type of proxy variant.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VariantType {
    /// 1080p proxy for editing
    #[serde(rename = "proxy_1080p")]
    Proxy1080p,
    /// 720p proxy for editing
    #[serde(rename = "proxy_720p")]
    Proxy720p,
    /// 540p proxy for offline editing
    #[serde(rename = "proxy_540p")]
    Proxy540p,
    /// Half resolution proxy
    #[serde(rename = "proxy_half")]
    ProxyHalf,
    /// Quarter resolution proxy
    #[serde(rename = "proxy_quarter")]
    ProxyQuarter,
    /// Thumbnail image (JPEG)
    #[serde(rename = "thumbnail")]
    Thumbnail,
    /// Poster frame (high quality JPEG)
    #[serde(rename = "poster")]
    Poster,
    /// Preview sprite (contact sheet)
    #[serde(rename = "sprite")]
    Sprite,
    /// Short preview clip (WebM)
    #[serde(rename = "preview")]
    Preview,
}

impl VariantType {
    /// Get human-readable display name.
    pub fn display_name(&self) -> &'static str {
        match self {
            VariantType::Proxy1080p => "1080p Proxy",
            VariantType::Proxy720p => "720p Proxy",
            VariantType::Proxy540p => "540p Proxy",
            VariantType::ProxyHalf => "Half-Res Proxy",
            VariantType::ProxyQuarter => "Quarter-Res Proxy",
            VariantType::Thumbnail => "Thumbnail",
            VariantType::Poster => "Poster Frame",
            VariantType::Sprite => "Preview Sprite",
            VariantType::Preview => "Preview Clip",
        }
    }

    /// Check if this is a video proxy variant.
    pub fn is_video_proxy(&self) -> bool {
        matches!(
            self,
            VariantType::Proxy1080p
                | VariantType::Proxy720p
                | VariantType::Proxy540p
                | VariantType::ProxyHalf
                | VariantType::ProxyQuarter
        )
    }

    /// Check if this is an image variant.
    pub fn is_image(&self) -> bool {
        matches!(
            self,
            VariantType::Thumbnail | VariantType::Poster | VariantType::Sprite
        )
    }

    /// Get file extension for this variant type.
    pub fn default_extension(&self) -> &'static str {
        match self {
            VariantType::Proxy1080p
            | VariantType::Proxy720p
            | VariantType::Proxy540p
            | VariantType::ProxyHalf
            | VariantType::ProxyQuarter => "mp4",
            VariantType::Thumbnail | VariantType::Poster => "jpg",
            VariantType::Sprite => "jpg",
            VariantType::Preview => "webm",
        }
    }
}

impl std::fmt::Display for VariantType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.display_name())
    }
}

/// A proxy variant of a source asset.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyVariant {
    /// Unique ID for this variant.
    pub id: String,

    /// Hash of the parent/source asset.
    pub parent_hash: Hash,

    /// Type of variant.
    pub variant_type: VariantType,

    /// Content hash of the proxy file.
    pub content_hash: Hash,

    /// Size of the proxy file in bytes.
    pub size: u64,

    /// Chunk hashes for the proxy content.
    pub chunk_hashes: Vec<Hash>,

    /// Duration in seconds (for video variants).
    pub duration: Option<f64>,

    /// Width in pixels.
    pub width: Option<u32>,

    /// Height in pixels.
    pub height: Option<u32>,

    /// Codec used for encoding.
    pub codec: Option<String>,

    /// Timecode start (if preserved).
    pub timecode: Option<String>,

    /// Creation timestamp.
    pub created_at: chrono::DateTime<chrono::Utc>,

    /// FFmpeg command used to generate (for reproducibility).
    pub ffmpeg_command: Option<String>,
}

impl ProxyVariant {
    /// Create a new proxy variant.
    pub fn new(
        parent_hash: Hash,
        variant_type: VariantType,
        content_hash: Hash,
        size: u64,
        chunk_hashes: Vec<Hash>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            parent_hash,
            variant_type,
            content_hash,
            size,
            chunk_hashes,
            duration: None,
            width: None,
            height: None,
            codec: None,
            timecode: None,
            created_at: chrono::Utc::now(),
            ffmpeg_command: None,
        }
    }

    /// Set video metadata.
    pub fn with_video_metadata(
        mut self,
        duration: f64,
        width: u32,
        height: u32,
        codec: &str,
    ) -> Self {
        self.duration = Some(duration);
        self.width = Some(width);
        self.height = Some(height);
        self.codec = Some(codec.to_string());
        self
    }

    /// Set timecode.
    pub fn with_timecode(mut self, timecode: &str) -> Self {
        self.timecode = Some(timecode.to_string());
        self
    }

    /// Set FFmpeg command.
    pub fn with_ffmpeg_command(mut self, command: &str) -> Self {
        self.ffmpeg_command = Some(command.to_string());
        self
    }

    /// Serialize to JSON.
    pub fn to_json(&self) -> String {
        serde_json::to_string_pretty(self).unwrap_or_default()
    }

    /// Deserialize from JSON.
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }

    /// Get a short summary string.
    pub fn summary(&self) -> String {
        let size_str = if self.size >= 1024 * 1024 {
            format!("{:.1} MB", self.size as f64 / (1024.0 * 1024.0))
        } else {
            format!("{:.1} KB", self.size as f64 / 1024.0)
        };

        if let (Some(w), Some(h)) = (self.width, self.height) {
            format!("{} ({}x{}, {})", self.variant_type, w, h, size_str)
        } else {
            format!("{} ({})", self.variant_type, size_str)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_variant_type_properties() {
        assert!(VariantType::Proxy1080p.is_video_proxy());
        assert!(!VariantType::Thumbnail.is_video_proxy());
        assert!(VariantType::Thumbnail.is_image());
        assert!(!VariantType::Proxy720p.is_image());
    }

    #[test]
    fn test_variant_extensions() {
        assert_eq!(VariantType::Proxy1080p.default_extension(), "mp4");
        assert_eq!(VariantType::Thumbnail.default_extension(), "jpg");
        assert_eq!(VariantType::Preview.default_extension(), "webm");
    }
}
