//! Metadata extractor registry.

use super::extractor::{MetadataExtractor, BasicFileExtractor, VideoFFprobeExtractor, PhotoExifExtractor};
use super::FileMetadata;
use std::path::Path;

/// Registry of metadata extractors.
pub struct MetadataRegistry {
    extractors: Vec<Box<dyn MetadataExtractor>>,
}

impl Default for MetadataRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl MetadataRegistry {
    /// Create a new registry with default extractors.
    pub fn new() -> Self {
        let mut registry = Self {
            extractors: Vec::new(),
        };

        // Add specialized extractors first (higher priority)
        registry.register(Box::new(VideoFFprobeExtractor));
        registry.register(Box::new(PhotoExifExtractor));

        // Basic extractor is always last (fallback)
        registry.register(Box::new(BasicFileExtractor));

        registry
    }

    /// Register an extractor.
    pub fn register(&mut self, extractor: Box<dyn MetadataExtractor>) {
        self.extractors.push(extractor);
    }

    /// Find the best extractor for a file.
    pub fn find_extractor(&self, path: &Path, mime: Option<&str>) -> Option<&dyn MetadataExtractor> {
        for extractor in &self.extractors {
            if extractor.supports(path, mime) {
                return Some(extractor.as_ref());
            }
        }
        None
    }

    /// Extract metadata using the best available extractor.
    pub fn extract(&self, path: &Path) -> Result<FileMetadata, String> {
        let mime = self.guess_mime(path);

        if let Some(extractor) = self.find_extractor(path, mime.as_deref()) {
            extractor.extract(path)
        } else {
            Err("No suitable extractor found".to_string())
        }
    }

    /// Guess MIME type from path.
    fn guess_mime(&self, path: &Path) -> Option<String> {
        let ext = path.extension()?.to_str()?;
        Some(match ext.to_lowercase().as_str() {
            "mp4" | "m4v" => "video/mp4",
            "mov" => "video/quicktime",
            "mkv" => "video/x-matroska",
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            _ => return None,
        }.to_string())
    }

    /// List available extractors.
    pub fn list_extractors(&self) -> Vec<&'static str> {
        self.extractors.iter().map(|e| e.name()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_registry_creation() {
        let registry = MetadataRegistry::new();
        assert!(!registry.extractors.is_empty());
    }

    #[test]
    fn test_find_extractor() {
        let registry = MetadataRegistry::new();

        // Should always find at least BasicFileExtractor
        let extractor = registry.find_extractor(Path::new("test.txt"), None);
        assert!(extractor.is_some());
        assert_eq!(extractor.unwrap().name(), "basic");
    }
}
