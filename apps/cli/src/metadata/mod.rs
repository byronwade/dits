//! Metadata extraction and storage (Phase 5).
//!
//! Provides optional, manifest-scoped metadata for media files.
//! Metadata is stored separately from the content-addressed objects
//! to avoid changing object identity.

mod extractor;
mod registry;
mod store;

pub use extractor::{MetadataExtractor, BasicFileExtractor, VideoFFprobeExtractor, PhotoExifExtractor};
pub use registry::MetadataRegistry;
pub use store::MetadataStore;

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Metadata for a file manifest.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    /// Type of content (video, photo, audio, document, etc.)
    #[serde(rename = "type")]
    pub content_type: String,
    /// MIME type
    pub mime: String,
    /// Additional type-specific metadata
    #[serde(flatten)]
    pub extra: Value,
}

impl FileMetadata {
    /// Create new metadata with basic info.
    pub fn new(content_type: &str, mime: &str) -> Self {
        Self {
            content_type: content_type.to_string(),
            mime: mime.to_string(),
            extra: Value::Object(serde_json::Map::new()),
        }
    }

    /// Create video metadata.
    pub fn video(mime: &str, duration: f64, width: u32, height: u32, codec: &str) -> Self {
        let mut extra = serde_json::Map::new();
        extra.insert("duration".to_string(), Value::Number(serde_json::Number::from_f64(duration).unwrap_or(serde_json::Number::from(0))));
        extra.insert("width".to_string(), Value::Number(width.into()));
        extra.insert("height".to_string(), Value::Number(height.into()));
        extra.insert("codec".to_string(), Value::String(codec.to_string()));

        Self {
            content_type: "video".to_string(),
            mime: mime.to_string(),
            extra: Value::Object(extra),
        }
    }

    /// Create photo metadata.
    pub fn photo(mime: &str, width: u32, height: u32) -> Self {
        let mut extra = serde_json::Map::new();
        extra.insert("width".to_string(), Value::Number(width.into()));
        extra.insert("height".to_string(), Value::Number(height.into()));

        Self {
            content_type: "photo".to_string(),
            mime: mime.to_string(),
            extra: Value::Object(extra),
        }
    }

    /// Add extra field.
    pub fn with_extra(mut self, key: &str, value: Value) -> Self {
        if let Value::Object(ref mut map) = self.extra {
            map.insert(key.to_string(), value);
        }
        self
    }
}
