//! Metadata storage layer.

use super::FileMetadata;
use crate::core::Hash;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// Metadata storage under `.dits/meta/`.
pub struct MetadataStore {
    /// Base path for metadata storage.
    base_path: PathBuf,
}

impl MetadataStore {
    /// Create a new metadata store.
    pub fn new(dits_dir: &Path) -> Self {
        Self {
            base_path: dits_dir.join("meta").join("manifest"),
        }
    }

    /// Initialize the metadata store (create directories).
    pub fn init(&self) -> io::Result<()> {
        fs::create_dir_all(&self.base_path)?;
        Ok(())
    }

    /// Get the path for a manifest's metadata file.
    fn metadata_path(&self, manifest_hash: &Hash) -> PathBuf {
        let hex = manifest_hash.to_hex();
        self.base_path
            .join(&hex[..2])
            .join(format!("{}.json", &hex[2..]))
    }

    /// Store metadata for a manifest.
    pub fn store(&self, manifest_hash: &Hash, metadata: &FileMetadata) -> io::Result<()> {
        let path = self.metadata_path(manifest_hash);

        // Create parent directory
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Serialize and write
        let json = serde_json::to_string_pretty(metadata)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

        fs::write(&path, json)?;
        Ok(())
    }

    /// Load metadata for a manifest.
    pub fn load(&self, manifest_hash: &Hash) -> io::Result<Option<FileMetadata>> {
        let path = self.metadata_path(manifest_hash);

        if !path.exists() {
            return Ok(None);
        }

        let json = fs::read_to_string(&path)?;
        let metadata: FileMetadata = serde_json::from_str(&json)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

        Ok(Some(metadata))
    }

    /// Check if metadata exists for a manifest.
    pub fn exists(&self, manifest_hash: &Hash) -> bool {
        self.metadata_path(manifest_hash).exists()
    }

    /// Delete metadata for a manifest.
    pub fn delete(&self, manifest_hash: &Hash) -> io::Result<bool> {
        let path = self.metadata_path(manifest_hash);
        if path.exists() {
            fs::remove_file(&path)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// List all stored metadata hashes.
    pub fn list(&self) -> io::Result<Vec<Hash>> {
        let mut hashes = Vec::new();

        if !self.base_path.exists() {
            return Ok(hashes);
        }

        for subdir in fs::read_dir(&self.base_path)? {
            let subdir = subdir?;
            if !subdir.file_type()?.is_dir() {
                continue;
            }

            let prefix = subdir.file_name().to_string_lossy().to_string();
            if prefix.len() != 2 {
                continue;
            }

            for file in fs::read_dir(subdir.path())? {
                let file = file?;
                let name = file.file_name().to_string_lossy().to_string();
                if let Some(suffix) = name.strip_suffix(".json") {
                    let full_hex = format!("{}{}", prefix, suffix);
                    if let Ok(hash) = Hash::from_hex(&full_hex) {
                        hashes.push(hash);
                    }
                }
            }
        }

        Ok(hashes)
    }

    /// Count stored metadata entries.
    pub fn count(&self) -> io::Result<usize> {
        Ok(self.list()?.len())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_store_and_load() {
        let temp = tempdir().unwrap();
        let store = MetadataStore::new(temp.path());
        store.init().unwrap();

        let hash = Hash::from_hex("abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab").unwrap();
        let metadata = FileMetadata::new("video", "video/mp4");

        // Store
        store.store(&hash, &metadata).unwrap();
        assert!(store.exists(&hash));

        // Load
        let loaded = store.load(&hash).unwrap();
        assert!(loaded.is_some());
        let loaded = loaded.unwrap();
        assert_eq!(loaded.content_type, "video");
        assert_eq!(loaded.mime, "video/mp4");
    }

    #[test]
    fn test_load_nonexistent() {
        let temp = tempdir().unwrap();
        let store = MetadataStore::new(temp.path());
        store.init().unwrap();

        let hash = Hash::from_hex("abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab").unwrap();
        let loaded = store.load(&hash).unwrap();
        assert!(loaded.is_none());
    }

    #[test]
    fn test_list() {
        let temp = tempdir().unwrap();
        let store = MetadataStore::new(temp.path());
        store.init().unwrap();

        // Store a few entries
        let hash1 = Hash::from_hex("aaaa1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab").unwrap();
        let hash2 = Hash::from_hex("bbbb1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab").unwrap();

        store.store(&hash1, &FileMetadata::new("video", "video/mp4")).unwrap();
        store.store(&hash2, &FileMetadata::new("photo", "image/jpeg")).unwrap();

        let list = store.list().unwrap();
        assert_eq!(list.len(), 2);
    }
}
