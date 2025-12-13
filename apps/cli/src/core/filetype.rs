//! File type detection for the Smart Layer of the Hybrid Architecture.
//!
//! This module determines the best chunking strategy and special handling
//! based on file type and industry-specific workflows.

use std::path::Path;

/// File category for smart chunking decisions.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FileCategory {
    /// Video files - large, typically trimmed/concatenated
    Video,
    /// Audio files - similar to video
    Audio,
    /// Image files - PSDs, TIFFs, RAW photos
    Image,
    /// 3D model/scene files - Blender, Maya, C4D
    Model3D,
    /// Project files - Premiere, Resolve, After Effects
    Project,
    /// Game assets - Unreal, Unity
    GameAsset,
    /// Archive/container formats
    Archive,
    /// Text/code files
    Text,
    /// Generic binary
    Binary,
}

impl FileCategory {
    /// Detect file category from path extension.
    pub fn from_path(path: &Path) -> Self {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .unwrap_or_default();

        Self::from_extension(&ext)
    }

    /// Detect file category from extension string.
    pub fn from_extension(ext: &str) -> Self {
        match ext {
            // Video formats
            "mp4" | "m4v" | "mov" | "mkv" | "avi" | "webm" | "wmv" | "flv" |
            "mxf" | "r3d" | "braw" | "ari" | "dpx" | "exr" | "prores" |
            "3gp" | "3g2" | "m2ts" | "mts" | "vob" | "ogv" => FileCategory::Video,

            // Audio formats
            "mp3" | "wav" | "aiff" | "aif" | "flac" | "aac" | "m4a" | "ogg" |
            "wma" | "opus" | "alac" => FileCategory::Audio,

            // Image formats
            "psd" | "psb" | "tiff" | "tif" | "raw" | "cr2" | "cr3" | "nef" |
            "arw" | "dng" | "orf" | "rw2" | "png" | "jpg" | "jpeg" | "gif" |
            "bmp" | "webp" | "heic" | "heif" | "avif" => FileCategory::Image,

            // 3D formats
            "blend" | "blend1" | "ma" | "mb" | "max" | "c4d" | "hip" | "hiplc" |
            "fbx" | "obj" | "dae" | "gltf" | "glb" | "usd" | "usda" | "usdc" |
            "usdz" | "abc" | "3ds" | "stl" | "ply" => FileCategory::Model3D,

            // NLE/VFX Project files
            "prproj" | "drp" | "aep" | "nk" | "hrox" | "veg" | "fcpxml" |
            "xml" | "otio" | "edl" | "aaf" | "omf" => FileCategory::Project,

            // Game engine assets
            "uasset" | "umap" | "prefab" | "unity" | "asset" | "mat" |
            "controller" | "anim" | "meta" => FileCategory::GameAsset,

            // Archives
            "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" | "lz4" |
            "zst" | "pak" | "pkg" => FileCategory::Archive,

            // Text/code
            "txt" | "md" | "json" | "yaml" | "yml" | "toml" | "ini" | "cfg" |
            "rs" | "py" | "js" | "ts" | "jsx" | "tsx" | "html" | "css" |
            "c" | "cpp" | "h" | "hpp" | "java" | "kt" | "swift" | "go" |
            "sh" | "bash" | "zsh" | "ps1" | "bat" | "cmd" => FileCategory::Text,

            // Default to binary
            _ => FileCategory::Binary,
        }
    }

    /// Get recommended ChunkerConfig for this file category.
    pub fn chunker_config(&self) -> super::ChunkerConfig {
        match self {
            FileCategory::Video | FileCategory::Audio => super::ChunkerConfig::media(),
            FileCategory::Image | FileCategory::Model3D => super::ChunkerConfig::media(),
            FileCategory::Project | FileCategory::Text => super::ChunkerConfig::project(),
            FileCategory::GameAsset => super::ChunkerConfig::default(),
            FileCategory::Archive => super::ChunkerConfig::fast(),
            FileCategory::Binary => super::ChunkerConfig::default(),
        }
    }

    /// Does this file type benefit from locking in multi-user scenarios?
    pub fn needs_locking(&self) -> bool {
        matches!(
            self,
            FileCategory::Project | FileCategory::Model3D | FileCategory::GameAsset
        )
    }

    /// Is this a text-mergeable file type?
    pub fn is_mergeable(&self) -> bool {
        matches!(self, FileCategory::Text | FileCategory::Project)
    }

    /// Description for user-facing messages.
    pub fn description(&self) -> &'static str {
        match self {
            FileCategory::Video => "Video",
            FileCategory::Audio => "Audio",
            FileCategory::Image => "Image",
            FileCategory::Model3D => "3D Model/Scene",
            FileCategory::Project => "Project File",
            FileCategory::GameAsset => "Game Asset",
            FileCategory::Archive => "Archive",
            FileCategory::Text => "Text/Code",
            FileCategory::Binary => "Binary",
        }
    }
}

/// Special handling recommendations for a file.
#[derive(Clone, Debug)]
pub struct FileHandling {
    /// Detected file category
    pub category: FileCategory,
    /// Recommended chunker config
    pub chunker_config: super::ChunkerConfig,
    /// Should the file be locked for editing?
    pub recommend_lock: bool,
    /// Is the file likely a project file (version instructions, not data)?
    pub is_instructions: bool,
    /// Tips for the user
    pub tips: Vec<&'static str>,
}

impl FileHandling {
    /// Analyze a file path and provide handling recommendations.
    pub fn for_path(path: &Path) -> Self {
        let category = FileCategory::from_path(path);
        let chunker_config = category.chunker_config();
        let recommend_lock = category.needs_locking();
        let is_instructions = matches!(category, FileCategory::Project);

        let tips = match category {
            FileCategory::Video => vec![
                "Tip: Edit operations (trim, concat) that don't re-encode have high dedup",
                "Tip: Version project files instead of rendered exports for best efficiency",
            ],
            FileCategory::Model3D => vec![
                "Tip: Use external texture references instead of embedding for better dedup",
                "Tip: Lock files before editing to prevent conflicts",
            ],
            FileCategory::Project => vec![
                "Tip: Project files version instructions - link to source media separately",
            ],
            FileCategory::GameAsset => vec![
                "Tip: Binary assets should be locked before editing",
                "Tip: Texture changes often only affect headers - CDC handles this well",
            ],
            FileCategory::Image if path.extension().map(|e| e == "psd").unwrap_or(false) => vec![
                "Tip: PSD layer changes affect composite - consider flattening for sharing",
            ],
            _ => vec![],
        };

        Self {
            category,
            chunker_config,
            recommend_lock,
            is_instructions,
            tips,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_video_detection() {
        assert_eq!(
            FileCategory::from_path(Path::new("video.mp4")),
            FileCategory::Video
        );
        assert_eq!(
            FileCategory::from_path(Path::new("footage/scene.mov")),
            FileCategory::Video
        );
        assert_eq!(
            FileCategory::from_path(Path::new("CLIP.MKV")),
            FileCategory::Video
        );
    }

    #[test]
    fn test_project_detection() {
        assert_eq!(
            FileCategory::from_path(Path::new("edit.prproj")),
            FileCategory::Project
        );
        assert_eq!(
            FileCategory::from_path(Path::new("timeline.drp")),
            FileCategory::Project
        );
        assert_eq!(
            FileCategory::from_path(Path::new("comp.aep")),
            FileCategory::Project
        );
    }

    #[test]
    fn test_3d_detection() {
        assert_eq!(
            FileCategory::from_path(Path::new("scene.blend")),
            FileCategory::Model3D
        );
        assert_eq!(
            FileCategory::from_path(Path::new("model.fbx")),
            FileCategory::Model3D
        );
    }

    #[test]
    fn test_game_asset_detection() {
        assert_eq!(
            FileCategory::from_path(Path::new("Level_01.umap")),
            FileCategory::GameAsset
        );
        assert_eq!(
            FileCategory::from_path(Path::new("Character.uasset")),
            FileCategory::GameAsset
        );
    }

    #[test]
    fn test_locking_recommendations() {
        assert!(FileCategory::Project.needs_locking());
        assert!(FileCategory::Model3D.needs_locking());
        assert!(FileCategory::GameAsset.needs_locking());
        assert!(!FileCategory::Video.needs_locking());
        assert!(!FileCategory::Text.needs_locking());
    }
}
