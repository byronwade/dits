//! Storage strategy for hybrid Git/Dits architecture (Phase 3.6).
//!
//! This module determines whether a file should be stored using:
//! - **GitText**: libgit2 for text files (line-based diff, 3-way merge, blame)
//! - **DitsChunk**: FastCDC chunking for binary/media files (deduplication, keyframe alignment)
//! - **Hybrid**: Both engines for NLE projects (Git for metadata, Dits for payload)

use serde::{Deserialize, Serialize};
use std::path::Path;

/// Storage strategy for a file.
///
/// Determines which storage engine handles the file's content.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
pub enum StorageStrategy {
    /// Use libgit2 for text files.
    ///
    /// Benefits:
    /// - Line-based diff (human-readable)
    /// - 3-way merge with conflict markers
    /// - Blame/annotate support
    /// - Delta compression across similar content
    GitText,

    /// Use Dits FastCDC chunking for binary/media files.
    ///
    /// Benefits:
    /// - Content-defined chunking
    /// - Deduplication across files
    /// - Keyframe alignment for video
    /// - Efficient for large files
    #[default]
    DitsChunk,

    /// Hybrid approach for NLE project files.
    ///
    /// Uses Git for XML/JSON metadata and Dits for embedded binary payload.
    Hybrid,
}

impl StorageStrategy {
    /// Human-readable description of the strategy.
    pub fn description(&self) -> &'static str {
        match self {
            StorageStrategy::GitText => "Git (text)",
            StorageStrategy::DitsChunk => "Dits (binary)",
            StorageStrategy::Hybrid => "Hybrid (Git+Dits)",
        }
    }

    /// Short label for status output.
    pub fn label(&self) -> &'static str {
        match self {
            StorageStrategy::GitText => "text",
            StorageStrategy::DitsChunk => "binary",
            StorageStrategy::Hybrid => "hybrid",
        }
    }

    /// Whether this strategy supports line-based diff.
    pub fn supports_line_diff(&self) -> bool {
        matches!(self, StorageStrategy::GitText | StorageStrategy::Hybrid)
    }

    /// Whether this strategy supports 3-way merge with conflict markers.
    pub fn supports_text_merge(&self) -> bool {
        matches!(self, StorageStrategy::GitText)
    }

    /// Whether this strategy supports blame/annotate.
    pub fn supports_blame(&self) -> bool {
        matches!(self, StorageStrategy::GitText)
    }
}

/// File classifier for determining storage strategy.
///
/// Uses a priority system:
/// 1. Explicit .ditsattributes override
/// 2. Extension-based classification
/// 3. Content analysis (if content available)
pub struct FileClassifier {
    // Future: attribute cache from .ditsattributes
}

impl Default for FileClassifier {
    fn default() -> Self {
        Self::new()
    }
}

impl FileClassifier {
    /// Create a new file classifier.
    pub fn new() -> Self {
        Self {}
    }

    /// Classify a file and determine its storage strategy.
    ///
    /// # Arguments
    /// * `path` - File path (for extension-based detection)
    /// * `content` - Optional file content (for content-based detection)
    pub fn classify(&self, path: &Path, content: Option<&[u8]>) -> StorageStrategy {
        // 1. Check extension first (most common case)
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if let Some(strategy) = Self::classify_by_extension(ext) {
                return strategy;
            }
        }

        // 2. Check by filename (for dotfiles like .gitignore)
        if let Some(filename) = path.file_name().and_then(|f| f.to_str()) {
            if let Some(strategy) = Self::classify_by_filename(filename) {
                return strategy;
            }
        }

        // 3. Analyze content if available
        if let Some(data) = content {
            return Self::classify_by_content(data);
        }

        // 4. Default to binary (safer)
        StorageStrategy::DitsChunk
    }

    /// Classify by file extension.
    fn classify_by_extension(ext: &str) -> Option<StorageStrategy> {
        let ext_lower = ext.to_lowercase();
        match ext_lower.as_str() {
            // ===================
            // TEXT FILES (Git)
            // ===================

            // Documentation
            "txt" | "md" | "markdown" | "rst" | "adoc" | "asciidoc" | "org" | "tex" | "rtf" => {
                Some(StorageStrategy::GitText)
            }

            // Data formats
            "json" | "yaml" | "yml" | "toml" | "xml" | "csv" | "tsv" | "ini" | "cfg" | "conf"
            | "properties" | "env" => Some(StorageStrategy::GitText),

            // Web
            "html" | "htm" | "xhtml" | "css" | "scss" | "sass" | "less" | "styl" | "svg" => {
                Some(StorageStrategy::GitText)
            }

            // JavaScript ecosystem
            "js" | "mjs" | "cjs" | "jsx" | "ts" | "tsx" | "mts" | "cts" | "vue" | "svelte"
            | "astro" => Some(StorageStrategy::GitText),

            // Systems programming
            "rs" | "go" | "c" | "cpp" | "cc" | "cxx" | "h" | "hpp" | "hxx" | "hh" | "zig"
            | "nim" | "v" | "d" => Some(StorageStrategy::GitText),

            // Scripting
            "py" | "pyi" | "pyw" | "rb" | "rbw" | "pl" | "pm" | "t" | "php" | "php3" | "php4"
            | "php5" | "phtml" | "lua" | "tcl" | "r" | "rmd" | "jl" => {
                Some(StorageStrategy::GitText)
            }

            // Shell
            "sh" | "bash" | "zsh" | "fish" | "ksh" | "csh" | "tcsh" | "ps1" | "psm1" | "psd1"
            | "bat" | "cmd" => Some(StorageStrategy::GitText),

            // JVM
            "java" | "kt" | "kts" | "scala" | "sc" | "groovy" | "gradle" | "clj" | "cljs"
            | "cljc" | "edn" => Some(StorageStrategy::GitText),

            // .NET
            "cs" | "csx" | "fs" | "fsx" | "fsi" | "vb" | "vbs" | "cshtml" | "razor" => {
                Some(StorageStrategy::GitText)
            }

            // Functional
            "hs" | "lhs" | "ml" | "mli" | "elm" | "ex" | "exs" | "erl" | "hrl" => {
                Some(StorageStrategy::GitText)
            }

            // Query languages
            "sql" | "psql" | "mysql" | "pgsql" | "graphql" | "gql" => {
                Some(StorageStrategy::GitText)
            }

            // Schema/Protocol
            "proto" | "protobuf" | "thrift" | "avsc" | "avro" | "fbs" => {
                Some(StorageStrategy::GitText)
            }

            // Build/Config
            "makefile" | "cmake" | "mak" | "mk" | "ninja" | "dockerfile" | "containerfile"
            | "vagrantfile" | "rakefile" | "gemfile" | "podfile" | "cartfile" | "fastfile"
            | "procfile" => Some(StorageStrategy::GitText),

            // Lock files (text-based)
            "lock" => Some(StorageStrategy::GitText),

            // Git-specific
            "gitignore" | "gitattributes" | "gitmodules" | "mailmap" => {
                Some(StorageStrategy::GitText)
            }

            // Editor configs
            "editorconfig" | "prettierrc" | "eslintrc" | "stylelintrc" | "babelrc" | "swcrc"
            | "browserslistrc" => Some(StorageStrategy::GitText),

            // DevOps
            "tf" | "tfvars" | "hcl" | "nomad" | "sentinel" | "workflow" | "action" => {
                Some(StorageStrategy::GitText)
            }

            // Licenses and legal
            "license" | "licence" | "copying" | "authors" | "contributors" | "changelog"
            | "history" | "news" | "readme" | "todo" | "fixme" | "hack" => {
                Some(StorageStrategy::GitText)
            }

            // ===================
            // BINARY FILES (Dits)
            // ===================

            // Video (Note: "ts" TypeScript is handled above, "mts" video is .m2ts)
            "mp4" | "m4v" | "mov" | "mkv" | "avi" | "webm" | "wmv" | "flv" | "mxf" | "r3d"
            | "braw" | "ari" | "dpx" | "exr" | "prores" | "3gp" | "3g2" | "m2ts"
            | "vob" | "ogv" | "m2v" | "mpg" | "mpeg" => Some(StorageStrategy::DitsChunk),

            // Audio
            "mp3" | "wav" | "aiff" | "aif" | "flac" | "aac" | "m4a" | "ogg" | "oga" | "wma"
            | "opus" | "alac" | "ape" | "wv" | "mka" | "ac3" | "dts" | "mid" | "midi" => {
                Some(StorageStrategy::DitsChunk)
            }

            // Image
            "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "tiff" | "tif" | "ico" | "icns"
            | "heic" | "heif" | "avif" | "jxl" | "raw" | "cr2" | "cr3" | "nef" | "arw" | "dng"
            | "orf" | "rw2" | "pef" | "srw" | "raf" => Some(StorageStrategy::DitsChunk),

            // Design
            "psd" | "psb" | "ai" | "eps" | "indd" | "sketch" | "fig" | "xd" | "xcf" | "kra"
            | "cdr" | "afdesign" | "afphoto" | "afpub" => Some(StorageStrategy::DitsChunk),

            // 3D
            "blend" | "blend1" | "fbx" | "obj" | "gltf" | "glb" | "usd" | "usda" | "usdc"
            | "usdz" | "abc" | "c4d" | "max" | "ma" | "mb" | "3ds" | "dae" | "stl" | "ply"
            | "hip" | "hiplc" | "hipnc" | "nk" | "nknc" => Some(StorageStrategy::DitsChunk),

            // Archives
            "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" | "lz" | "lz4" | "zst" | "lzma"
            | "cab" | "arj" | "lzh" | "ace" | "iso" | "dmg" | "pkg" | "deb" | "rpm" | "apk"
            | "ipa" | "msi" | "appx" | "snap" | "flatpak" => Some(StorageStrategy::DitsChunk),

            // Executables
            "exe" | "dll" | "so" | "dylib" | "a" | "lib" | "o" | "ko" | "sys" | "drv" | "efi"
            | "elf" | "bin" | "com" | "app" | "bundle" => Some(StorageStrategy::DitsChunk),

            // Documents (binary)
            "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "odt" | "ods" | "odp"
            | "odg" | "pages" | "numbers" | "key" | "epub" | "mobi" | "azw" | "azw3" | "djvu" => {
                Some(StorageStrategy::DitsChunk)
            }

            // Fonts
            "ttf" | "otf" | "woff" | "woff2" | "eot" | "pfb" | "pfm" | "fon" | "fnt" => {
                Some(StorageStrategy::DitsChunk)
            }

            // Database files
            "db" | "sqlite" | "sqlite3" | "mdb" | "accdb" | "frm" | "myd" | "myi" | "ibd"
            | "dbf" => Some(StorageStrategy::DitsChunk),

            // Game assets
            "uasset" | "umap" | "upk" | "prefab" | "unity" | "asset" | "mat" | "controller"
            | "anim" | "pak" | "wad" | "bsp" | "vpk" | "gcf" => Some(StorageStrategy::DitsChunk),

            // Certificates and keys (binary, not text PEM)
            "der" | "p12" | "pfx" | "jks" | "keystore" => Some(StorageStrategy::DitsChunk),

            // ===================
            // HYBRID FILES (Git + Dits)
            // ===================

            // NLE project files (XML/JSON metadata + binary references)
            "prproj" => Some(StorageStrategy::Hybrid), // Adobe Premiere Pro
            "aep" => Some(StorageStrategy::Hybrid),    // Adobe After Effects
            "drp" => Some(StorageStrategy::Hybrid),    // DaVinci Resolve (SQLite-based)
            "fcpxml" => Some(StorageStrategy::Hybrid), // Final Cut Pro XML
            "otio" => Some(StorageStrategy::Hybrid),   // OpenTimelineIO

            // Unknown extension - let content analysis decide
            _ => None,
        }
    }

    /// Classify by filename (for dotfiles and special names).
    fn classify_by_filename(filename: &str) -> Option<StorageStrategy> {
        let filename_lower = filename.to_lowercase();

        // Common dotfiles and config files
        match filename_lower.as_str() {
            // Shell configs
            ".bashrc" | ".bash_profile" | ".bash_logout" | ".zshrc" | ".zprofile" | ".zshenv"
            | ".profile" | ".login" | ".logout" => Some(StorageStrategy::GitText),

            // Editor configs
            ".vimrc" | ".gvimrc" | ".exrc" | ".nanorc" | ".emacs" | ".spacemacs" => {
                Some(StorageStrategy::GitText)
            }

            // Tool configs
            ".gitconfig" | ".gitignore" | ".gitattributes" | ".npmrc" | ".yarnrc" | ".nvmrc"
            | ".python-version" | ".ruby-version" | ".node-version" | ".tool-versions" => {
                Some(StorageStrategy::GitText)
            }

            // Security (text-based)
            ".htpasswd" | ".htaccess" | ".htgroups" => Some(StorageStrategy::GitText),

            // Docker
            ".dockerignore" => Some(StorageStrategy::GitText),

            // Package managers
            "package.json" | "package-lock.json" | "yarn.lock" | "pnpm-lock.yaml"
            | "composer.json" | "composer.lock" | "cargo.toml" | "cargo.lock" | "go.mod"
            | "go.sum" | "gemfile" | "gemfile.lock" | "pipfile" | "pipfile.lock"
            | "poetry.lock" | "pyproject.toml" | "requirements.txt" | "setup.py" | "setup.cfg" => {
                Some(StorageStrategy::GitText)
            }

            // CI/CD
            ".travis.yml" | ".circleci" | "appveyor.yml" | "azure-pipelines.yml"
            | "bitbucket-pipelines.yml" | "jenkinsfile" | ".gitlab-ci.yml" => {
                Some(StorageStrategy::GitText)
            }

            // Dits-specific
            ".ditsignore" | ".ditsattributes" => Some(StorageStrategy::GitText),

            _ => None,
        }
    }

    /// Classify by content analysis.
    fn classify_by_content(content: &[u8]) -> StorageStrategy {
        // Empty files are text
        if content.is_empty() {
            return StorageStrategy::GitText;
        }

        // Check first 8KB for null bytes (binary indicator)
        let sample_size = content.len().min(8192);
        let sample = &content[..sample_size];

        // Null bytes strongly indicate binary
        if sample.contains(&0) {
            return StorageStrategy::DitsChunk;
        }

        // Try to parse as UTF-8
        if let Ok(text) = std::str::from_utf8(content) {
            // Check for reasonable line lengths (text heuristic)
            let lines: Vec<&str> = text.lines().collect();
            if !lines.is_empty() {
                let avg_line_len: usize =
                    lines.iter().map(|l| l.len()).sum::<usize>() / lines.len();

                // Text files typically have lines < 500 chars
                // Very long lines suggest minified code or binary-as-text
                if avg_line_len < 500 {
                    return StorageStrategy::GitText;
                }
            } else {
                // Single line, but valid UTF-8 - probably text
                return StorageStrategy::GitText;
            }
        }

        // Default to binary
        StorageStrategy::DitsChunk
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_text_file_classification() {
        let classifier = FileClassifier::new();

        // Common text files
        assert_eq!(
            classifier.classify(Path::new("README.md"), None),
            StorageStrategy::GitText
        );
        assert_eq!(
            classifier.classify(Path::new("config.json"), None),
            StorageStrategy::GitText
        );
        assert_eq!(
            classifier.classify(Path::new("src/main.rs"), None),
            StorageStrategy::GitText
        );
        assert_eq!(
            classifier.classify(Path::new("script.py"), None),
            StorageStrategy::GitText
        );
        // Makefile has no extension, so needs content analysis
        assert_eq!(
            classifier.classify(Path::new("Makefile"), Some(b"CC=gcc\nall:\n\t$(CC) main.c")),
            StorageStrategy::GitText
        );
    }

    #[test]
    fn test_binary_file_classification() {
        let classifier = FileClassifier::new();

        // Binary files
        assert_eq!(
            classifier.classify(Path::new("video.mp4"), None),
            StorageStrategy::DitsChunk
        );
        assert_eq!(
            classifier.classify(Path::new("image.png"), None),
            StorageStrategy::DitsChunk
        );
        assert_eq!(
            classifier.classify(Path::new("model.blend"), None),
            StorageStrategy::DitsChunk
        );
        assert_eq!(
            classifier.classify(Path::new("archive.zip"), None),
            StorageStrategy::DitsChunk
        );
    }

    #[test]
    fn test_hybrid_file_classification() {
        let classifier = FileClassifier::new();

        // NLE project files
        assert_eq!(
            classifier.classify(Path::new("project.prproj"), None),
            StorageStrategy::Hybrid
        );
        assert_eq!(
            classifier.classify(Path::new("comp.aep"), None),
            StorageStrategy::Hybrid
        );
        assert_eq!(
            classifier.classify(Path::new("timeline.drp"), None),
            StorageStrategy::Hybrid
        );
    }

    #[test]
    fn test_content_based_classification() {
        let classifier = FileClassifier::new();

        // Text content
        let text_content = b"Hello, World!\nThis is a text file.\n";
        assert_eq!(
            classifier.classify(Path::new("unknown"), Some(text_content)),
            StorageStrategy::GitText
        );

        // Binary content (contains null bytes)
        let binary_content = &[0x00, 0x01, 0x02, 0xFF, 0xFE, 0x00];
        assert_eq!(
            classifier.classify(Path::new("unknown"), Some(binary_content)),
            StorageStrategy::DitsChunk
        );
    }

    #[test]
    fn test_dotfile_classification() {
        let classifier = FileClassifier::new();

        assert_eq!(
            classifier.classify(Path::new(".gitignore"), None),
            StorageStrategy::GitText
        );
        assert_eq!(
            classifier.classify(Path::new(".bashrc"), None),
            StorageStrategy::GitText
        );
        assert_eq!(
            classifier.classify(Path::new("package.json"), None),
            StorageStrategy::GitText
        );
    }

    #[test]
    fn test_strategy_properties() {
        assert!(StorageStrategy::GitText.supports_line_diff());
        assert!(StorageStrategy::GitText.supports_text_merge());
        assert!(StorageStrategy::GitText.supports_blame());

        assert!(!StorageStrategy::DitsChunk.supports_line_diff());
        assert!(!StorageStrategy::DitsChunk.supports_text_merge());
        assert!(!StorageStrategy::DitsChunk.supports_blame());

        assert!(StorageStrategy::Hybrid.supports_line_diff());
        assert!(!StorageStrategy::Hybrid.supports_text_merge());
        assert!(!StorageStrategy::Hybrid.supports_blame());
    }
}
