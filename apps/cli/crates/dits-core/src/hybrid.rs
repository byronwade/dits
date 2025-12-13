//! Hybrid Storage Engine for Dits
//!
//! This module implements Phase 3.6: Hybrid Storage, which routes files to the
//! appropriate storage engine based on their type:
//!
//! - **Text files** (.txt, .md, .rs, .py, etc.) → Git storage (libgit2)
//! - **Binary files** (.mp4, .mov, .psd, .blend, etc.) → Dits chunking
//! - **Hybrid files** (.prproj, .aep, .drp) → Both stores

use std::path::{Path, PathBuf};
use crate::{Error, Result};

/// Storage strategy for files in hybrid repositories
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum StorageStrategy {
    /// Use Git's object store (line-based diff, 3-way merge, blame)
    GitText,
    /// Use Dits chunking (content-defined chunking, deduplication)
    DitsChunk,
    /// Use both Git and Dits (e.g., project files with embedded assets)
    Hybrid,
}

/// File classifier that determines storage strategy based on file type
pub struct FileClassifier;

impl FileClassifier {
    // Extension lists as constants to avoid duplication
    const TEXT_EXTENSIONS: &[&str] = &[
        "txt", "md", "rs", "py", "js", "ts", "jsx", "tsx", "html", "css", "scss", "sass",
        "json", "yaml", "yml", "toml", "xml", "svg", "sh", "bash", "zsh", "fish",
        "cpp", "c", "h", "hpp", "java", "kt", "scala", "go", "rb", "php", "pl", "pm",
        "lua", "vim", "el", "clj", "hs", "ml", "fs", "cs", "vb", "fsx", "r", "rmd",
        "ipynb", "dockerfile", "makefile", "cmake", "gradle", "maven", "cargo",
    ];

    const BINARY_EXTENSIONS: &[&str] = &[
        "mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v", "mpg", "mpeg",
        "psd", "ai", "xd", "fig", "sketch", "blend", "obj", "fbx", "dae", "3ds",
        "max", "c4d", "lwo", "lws", "abc", "usd", "usda", "usdc",
        "stl", "ply", "gltf", "glb", "x3d", "dae", "kmz", "dwg", "dxf",
        "jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif", "webp", "ico",
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
        "zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tgz", "tbz2",
        "exe", "dll", "so", "dylib", "app", "deb", "rpm", "pkg", "dmg",
        "iso", "img", "vmdk", "vdi", "qcow2", "vhdx",
    ];

    const HYBRID_EXTENSIONS: &[&str] = &[
        "prproj", "aep", "drp", "fcp", "fcpx", "npr", "nk", "hrox", "hip",
        "mb", "ma", "max", "c4d", "lwo", "lws", "abc", "usd", "usda", "usdc",
        "fla", "swf", "unity", "uasset", "umap", "uproject",
    ];

    const SPECIAL_FILES: &[&str] = &[
        "readme", "changelog", "license", "authors", "contributors", "makefile",
        "dockerfile", "cargo.toml", "package.json", "requirements.txt",
    ];

    /// Classify a file based on its path and content
    pub fn classify_file(path: &Path, content: Option<&[u8]>) -> Result<StorageStrategy> {
        let extension = path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        let filename = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_lowercase();

        // Check for special filenames (often text)
        if Self::SPECIAL_FILES.iter().any(|&special| filename.contains(special)) {
            return Ok(StorageStrategy::GitText);
        }

        // Check extensions
        if Self::TEXT_EXTENSIONS.contains(&extension.as_str()) {
            return Ok(StorageStrategy::GitText);
        }

        if Self::BINARY_EXTENSIONS.contains(&extension.as_str()) {
            return Ok(StorageStrategy::DitsChunk);
        }

        if Self::HYBRID_EXTENSIONS.contains(&extension.as_str()) {
            return Ok(StorageStrategy::Hybrid);
        }

        // Default: try to detect based on content if provided
        if let Some(content) = content {
            // Check if content looks like text (UTF-8 and no null bytes)
            if std::str::from_utf8(content).is_ok() && !content.contains(&0) {
                // Additional heuristic: if file is small and looks like text, use Git
                if content.len() < 1024 * 1024 { // Less than 1MB
                    return Ok(StorageStrategy::GitText);
                }
            }

            // Otherwise, use chunking for binary content
            Ok(StorageStrategy::DitsChunk)
        } else {
            // No content available, default to chunking (safer for unknown types)
            Ok(StorageStrategy::DitsChunk)
        }
    }

    /// Check if a file extension indicates it should use Git storage
    pub fn is_text_file(extension: &str) -> bool {
        Self::TEXT_EXTENSIONS.contains(&extension.to_lowercase().as_str())
    }

    /// Check if a file extension indicates it should use Dits chunking
    pub fn is_binary_file(extension: &str) -> bool {
        Self::BINARY_EXTENSIONS.contains(&extension.to_lowercase().as_str())
    }
}

/// Manifest entry for hybrid repositories
#[derive(Debug, Clone)]
pub struct HybridManifestEntry {
    /// The file's storage strategy
    pub strategy: StorageStrategy,
    /// Git object ID (for GitText and Hybrid files)
    pub git_oid: Option<String>,
    /// Dits asset hash (for DitsChunk and Hybrid files)
    pub dits_hash: Option<String>,
    /// File mode (permissions)
    pub mode: u32,
    /// File size in bytes
    pub size: u64,
    /// Whether the file is executable
    pub executable: bool,
}

/// Git storage backend for text files using libgit2
pub struct GitStorage {
    /// Path to the Git repository
    repo_path: PathBuf,
}

impl GitStorage {
    /// Create a new Git storage backend
    pub fn new(repo_path: PathBuf) -> Self {
        Self { repo_path }
    }

    /// Initialize a Git repository if it doesn't exist
    pub fn init(&self) -> Result<()> {
        if !self.is_initialized() {
            git2::Repository::init(&self.repo_path)?;
        }
        Ok(())
    }

    /// Get the libgit2 repository instance
    fn repository(&self) -> Result<git2::Repository> {
        git2::Repository::open(&self.repo_path)
            .map_err(|e| Error::Internal(format!("Failed to open Git repository: {}", e)))
    }

    /// Store a text file as a Git blob
    pub fn store_file(&self, _path: &Path, content: &[u8]) -> Result<String> {
        let repo = self.repository()?;
        let oid = repo.blob(content)
            .map_err(|e| Error::Internal(format!("Failed to create Git blob: {}", e)))?;
        Ok(oid.to_string())
    }

    /// Retrieve a file from Git storage
    pub fn retrieve_file(&self, oid: &str) -> Result<Vec<u8>> {
        let repo = self.repository()?;
        let oid = git2::Oid::from_str(oid)
            .map_err(|e| Error::InvalidPath(format!("Invalid Git OID {}: {}", oid, e)))?;

        let blob = repo.find_blob(oid)
            .map_err(|e| Error::ObjectNotFound(format!("Git blob {} not found: {}", oid, e)))?;

        Ok(blob.content().to_vec())
    }

    /// Check if Git storage is initialized
    pub fn is_initialized(&self) -> bool {
        self.repo_path.join(".git").exists()
    }

}

/// Hybrid repository manifest
#[derive(Debug, Clone)]
pub struct HybridManifest {
    /// Entries keyed by path
    pub entries: std::collections::BTreeMap<String, HybridManifestEntry>,
}

impl HybridManifest {
    /// Create a new empty manifest
    pub fn new() -> Self {
        Self {
            entries: std::collections::BTreeMap::new(),
        }
    }

    /// Add or update an entry
    pub fn insert(&mut self, path: String, entry: HybridManifestEntry) {
        self.entries.insert(path, entry);
    }

    /// Get an entry by path
    pub fn get(&self, path: &str) -> Option<&HybridManifestEntry> {
        self.entries.get(path)
    }

    /// Remove an entry
    pub fn remove(&mut self, path: &str) -> Option<HybridManifestEntry> {
        self.entries.remove(path)
    }

    /// Iterate over all entries
    pub fn iter(&self) -> impl Iterator<Item = (&String, &HybridManifestEntry)> {
        self.entries.iter()
    }
}

/// Hybrid storage engine that manages both Git and Dits backends
pub struct HybridStorage {
    /// Git storage for text files
    git_storage: GitStorage,
    /// Dits chunking for binary files (placeholder for now)
    repo_path: PathBuf,
}

impl HybridStorage {
    /// Create a new hybrid storage engine
    pub fn new(repo_path: PathBuf) -> Self {
        let git_storage = GitStorage::new(repo_path.clone());
        Self {
            git_storage,
            repo_path,
        }
    }

    /// Initialize both storage backends
    pub fn init(&self) -> Result<()> {
        // Initialize Git storage
        self.git_storage.init()?;
        // Dits storage would be initialized separately
        Ok(())
    }

    /// Store a file using the appropriate backend
    pub fn store_file(&self, path: &Path, content: &[u8]) -> Result<HybridManifestEntry> {
        let strategy = FileClassifier::classify_file(path, Some(content))?;

        match strategy {
            StorageStrategy::GitText => {
                let oid = self.git_storage.store_file(path, content)?;
                Ok(HybridManifestEntry {
                    strategy,
                    git_oid: Some(oid),
                    dits_hash: None,
                    mode: 0o100644, // Regular file
                    size: content.len() as u64,
                    executable: false,
                })
            }
            StorageStrategy::DitsChunk => {
                // For now, use a mock hash - full implementation would use chunking
                let hash = crate::Hasher::hash(content);
                Ok(HybridManifestEntry {
                    strategy,
                    git_oid: None,
                    dits_hash: Some(hex::encode(hash.as_bytes())),
                    mode: 0o100644,
                    size: content.len() as u64,
                    executable: false,
                })
            }
            StorageStrategy::Hybrid => {
                // Store in both systems
                let oid = self.git_storage.store_file(path, content)?;
                let hash = crate::Hasher::hash(content);
                Ok(HybridManifestEntry {
                    strategy,
                    git_oid: Some(oid),
                    dits_hash: Some(hex::encode(hash.as_bytes())),
                    mode: 0o100644,
                    size: content.len() as u64,
                    executable: false,
                })
            }
        }
    }

    /// Retrieve a file from the appropriate backend
    pub fn retrieve_file(&self, entry: &HybridManifestEntry) -> Result<Vec<u8>> {
        match entry.strategy {
            StorageStrategy::GitText => {
                if let Some(ref oid) = entry.git_oid {
                    self.git_storage.retrieve_file(oid)
                } else {
                    Err(Error::InvalidPath("GitText file missing OID".into()))
                }
            }
            StorageStrategy::DitsChunk => {
                // Placeholder - would retrieve from chunk store
                Err(Error::Internal("Dits chunk retrieval not implemented yet".into()))
            }
            StorageStrategy::Hybrid => {
                // For hybrid files, prefer Git storage for now
                if let Some(ref oid) = entry.git_oid {
                    self.git_storage.retrieve_file(oid)
                } else {
                    Err(Error::InvalidPath("Hybrid file missing OID".into()))
                }
            }
        }
    }

    /// Get the Git storage backend
    pub fn git_storage(&self) -> &GitStorage {
        &self.git_storage
    }

    /// Get the Git storage backend mutably
    pub fn git_storage_mut(&mut self) -> &mut GitStorage {
        &mut self.git_storage
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_classify_text_files() {
        let text_files = vec![
            "readme.md", "config.rs", "script.py", "index.html", "styles.css",
            "package.json", "cargo.toml", "makefile",
        ];

        for filename in text_files {
            let path = PathBuf::from(filename);
            let strategy = FileClassifier::classify_file(&path, None).unwrap();
            assert_eq!(strategy, StorageStrategy::GitText, "File {} should be GitText", filename);
        }
    }

    #[test]
    fn test_classify_binary_files() {
        let binary_files = vec![
            "video.mp4", "model.blend", "texture.psd", "archive.zip",
            "image.jpg", "document.pdf", "executable.exe",
        ];

        for filename in binary_files {
            let path = PathBuf::from(filename);
            let strategy = FileClassifier::classify_file(&path, None).unwrap();
            assert_eq!(strategy, StorageStrategy::DitsChunk, "File {} should be DitsChunk", filename);
        }
    }

    #[test]
    fn test_classify_hybrid_files() {
        let hybrid_files = vec![
            "project.prproj", "comp.aep", "timeline.drp", "scene.mb",
        ];

        for filename in hybrid_files {
            let path = PathBuf::from(filename);
            let strategy = FileClassifier::classify_file(&path, None).unwrap();
            assert_eq!(strategy, StorageStrategy::Hybrid, "File {} should be Hybrid", filename);
        }
    }

    #[test]
    fn test_content_based_classification() {
        let path = PathBuf::from("unknown.xyz");

        // Should default to DitsChunk for unknown extensions
        let strategy = FileClassifier::classify_file(&path, None).unwrap();
        assert_eq!(strategy, StorageStrategy::DitsChunk);

        // Should classify as GitText if content looks like text and is small
        let text_content = b"This is some text content";
        let strategy = FileClassifier::classify_file(&path, Some(text_content)).unwrap();
        assert_eq!(strategy, StorageStrategy::GitText);

        // Should classify as DitsChunk if content has null bytes
        let binary_content = b"This has null\0 bytes";
        let strategy = FileClassifier::classify_file(&path, Some(binary_content)).unwrap();
        assert_eq!(strategy, StorageStrategy::DitsChunk);
    }

    #[test]
    fn test_special_filenames() {
        let special_files = vec![
            "README", "readme.txt", "CHANGELOG.md", "LICENSE", "AUTHORS",
            "Dockerfile", "Makefile", "Cargo.toml",
        ];

        for filename in special_files {
            let path = PathBuf::from(filename);
            let strategy = FileClassifier::classify_file(&path, None).unwrap();
            assert_eq!(strategy, StorageStrategy::GitText, "Special file {} should be GitText", filename);
        }
    }
}
