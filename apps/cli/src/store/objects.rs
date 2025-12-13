//! Content-Addressable Store (CAS) for chunks, manifests, and commits.
//!
//! This is the storage layer of the Universal Bucket architecture.
//! All objects are stored by their content hash, making duplicates impossible.
//!
//! Layout:
//! ```text
//! .dits/
//! ├── objects/
//! │   ├── chunks/
//! │   │   ├── a7/b9c3d4...  (chunk data by hash)
//! │   │   └── ...
//! │   ├── manifests/
//! │   │   └── {hash}.json
//! │   └── commits/
//! │       └── {hash}.json
//! └── refs/
//!     ├── HEAD
//!     └── branches/
//! ```

use crate::core::{Chunk, Commit, Hash, Hasher, Manifest};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use thiserror::Error;

/// Errors from the object store.
#[derive(Debug, Error)]
pub enum ObjectError {
    #[error("Object not found: {0}")]
    NotFound(String),

    #[error("Checksum mismatch: expected {expected}, got {actual}")]
    ChecksumMismatch { expected: String, actual: String },

    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

/// Type of object in the store.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ObjectType {
    /// Raw binary chunk (the "lego blocks")
    Chunk,
    /// Manifest (recipe for reconstructing a file)
    Manifest,
    /// Commit (snapshot of repository state)
    Commit,
    /// Generic blob (for file-type-specific metadata)
    Blob,
}

impl ObjectType {
    /// Get the directory name for this object type.
    pub fn dir_name(&self) -> &'static str {
        match self {
            ObjectType::Chunk => "chunks",
            ObjectType::Manifest => "manifests",
            ObjectType::Commit => "commits",
            ObjectType::Blob => "blobs",
        }
    }
}

/// Object store for the local .dits directory.
pub struct ObjectStore {
    /// Root path of the objects directory.
    root: PathBuf,
}

impl ObjectStore {
    /// Create a new object store.
    pub fn new(dits_dir: &Path) -> Self {
        Self {
            root: dits_dir.join("objects"),
        }
    }

    /// Initialize the object store directories.
    pub fn init(&self) -> io::Result<()> {
        fs::create_dir_all(self.root.join(ObjectType::Chunk.dir_name()))?;
        fs::create_dir_all(self.root.join(ObjectType::Manifest.dir_name()))?;
        fs::create_dir_all(self.root.join(ObjectType::Commit.dir_name()))?;
        fs::create_dir_all(self.root.join(ObjectType::Blob.dir_name()))?;
        Ok(())
    }

    /// Get the path for an object.
    fn object_path(&self, obj_type: ObjectType, hash: &Hash) -> PathBuf {
        let hex = hash.to_hex();
        // Use first 2 chars as subdirectory for distribution
        self.root
            .join(obj_type.dir_name())
            .join(&hex[..2])
            .join(&hex[2..])
    }

    // ========== Chunk Operations ==========

    /// Store a chunk. Returns true if it was newly stored, false if it already existed.
    pub fn store_chunk(&self, chunk: &Chunk) -> Result<bool, ObjectError> {
        let path = self.object_path(ObjectType::Chunk, &chunk.hash);

        if path.exists() {
            // Already stored (dedup!)
            return Ok(false);
        }

        // Create parent directory
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Write chunk data
        fs::write(&path, &chunk.data)?;
        Ok(true)
    }

    /// Load a chunk by hash.
    pub fn load_chunk(&self, hash: &Hash) -> Result<Chunk, ObjectError> {
        let path = self.object_path(ObjectType::Chunk, hash);

        if !path.exists() {
            return Err(ObjectError::NotFound(hash.to_hex()));
        }

        let data = fs::read(&path)?;

        // CRITICAL: Verify checksum on read
        let computed = Hasher::hash(&data);
        if computed != *hash {
            return Err(ObjectError::ChecksumMismatch {
                expected: hash.to_hex(),
                actual: computed.to_hex(),
            });
        }

        Ok(Chunk::with_hash(*hash, data))
    }

    /// Check if a chunk exists.
    pub fn has_chunk(&self, hash: &Hash) -> bool {
        self.object_path(ObjectType::Chunk, hash).exists()
    }

    /// Get the size of a stored chunk.
    pub fn chunk_size(&self, hash: &Hash) -> Result<u64, ObjectError> {
        let path = self.object_path(ObjectType::Chunk, hash);
        let metadata = fs::metadata(&path)?;
        Ok(metadata.len())
    }

    // ========== Blob Operations ==========
    // Generic blob storage for file-type-specific metadata (e.g., MP4 atoms)

    /// Store a blob. Returns the hash and whether it was newly stored.
    pub fn store_blob(&self, data: &[u8]) -> Result<(Hash, bool), ObjectError> {
        let hash = Hasher::hash(data);
        let path = self.object_path(ObjectType::Blob, &hash);

        if path.exists() {
            return Ok((hash, false));
        }

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        fs::write(&path, data)?;
        Ok((hash, true))
    }

    /// Load a blob by hash.
    pub fn load_blob(&self, hash: &Hash) -> Result<Vec<u8>, ObjectError> {
        let path = self.object_path(ObjectType::Blob, hash);

        if !path.exists() {
            return Err(ObjectError::NotFound(format!("blob:{}", hash.to_hex())));
        }

        let data = fs::read(&path)?;

        // Verify checksum
        let computed = Hasher::hash(&data);
        if computed != *hash {
            return Err(ObjectError::ChecksumMismatch {
                expected: hash.to_hex(),
                actual: computed.to_hex(),
            });
        }

        Ok(data)
    }

    /// Check if a blob exists.
    pub fn has_blob(&self, hash: &Hash) -> bool {
        self.object_path(ObjectType::Blob, hash).exists()
    }

    // Legacy MP4 methods - now aliases to blob storage
    #[deprecated(note = "Use store_blob instead")]
    pub fn store_mp4_ftyp(&self, data: &[u8]) -> Result<(Hash, bool), ObjectError> {
        self.store_blob(data)
    }

    #[deprecated(note = "Use load_blob instead")]
    pub fn load_mp4_ftyp(&self, hash: &Hash) -> Result<Vec<u8>, ObjectError> {
        self.load_blob(hash)
    }

    #[deprecated(note = "Use store_blob instead")]
    pub fn store_mp4_moov(&self, data: &[u8]) -> Result<(Hash, bool), ObjectError> {
        self.store_blob(data)
    }

    #[deprecated(note = "Use load_blob instead")]
    pub fn load_mp4_moov(&self, hash: &Hash) -> Result<Vec<u8>, ObjectError> {
        self.load_blob(hash)
    }

    // ========== Manifest Operations ==========

    /// Store a manifest. Returns the hash.
    pub fn store_manifest(&self, manifest: &Manifest) -> Result<Hash, ObjectError> {
        let json = manifest.to_json();
        let hash = Hasher::hash(json.as_bytes());
        let path = self.object_path(ObjectType::Manifest, &hash);

        if path.exists() {
            return Ok(hash);
        }

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        fs::write(&path, &json)?;
        Ok(hash)
    }

    /// Load a manifest by hash.
    pub fn load_manifest(&self, hash: &Hash) -> Result<Manifest, ObjectError> {
        let path = self.object_path(ObjectType::Manifest, hash);

        if !path.exists() {
            return Err(ObjectError::NotFound(hash.to_hex()));
        }

        let json = fs::read_to_string(&path)?;

        // Verify checksum
        let computed = Hasher::hash(json.as_bytes());
        if computed != *hash {
            return Err(ObjectError::ChecksumMismatch {
                expected: hash.to_hex(),
                actual: computed.to_hex(),
            });
        }

        Ok(Manifest::from_json(&json)?)
    }

    // ========== Commit Operations ==========

    /// Store a commit.
    pub fn store_commit(&self, commit: &Commit) -> Result<(), ObjectError> {
        let path = self.object_path(ObjectType::Commit, &commit.hash);

        if path.exists() {
            return Ok(());
        }

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let json = commit.to_json();
        fs::write(&path, &json)?;
        Ok(())
    }

    /// Load a commit by hash.
    pub fn load_commit(&self, hash: &Hash) -> Result<Commit, ObjectError> {
        let path = self.object_path(ObjectType::Commit, hash);

        if !path.exists() {
            return Err(ObjectError::NotFound(hash.to_hex()));
        }

        let json = fs::read_to_string(&path)?;
        let commit: Commit = serde_json::from_str(&json)?;

        // Verify hash matches
        if commit.hash != *hash {
            return Err(ObjectError::ChecksumMismatch {
                expected: hash.to_hex(),
                actual: commit.hash.to_hex(),
            });
        }

        Ok(commit)
    }

    // ========== Stats ==========

    /// Count objects of each type.
    pub fn count_objects(&self) -> io::Result<(usize, usize, usize)> {
        let count_dir = |obj_type: ObjectType| -> io::Result<usize> {
            let dir = self.root.join(obj_type.dir_name());
            if !dir.exists() {
                return Ok(0);
            }

            let mut count = 0;
            for entry in walkdir::WalkDir::new(&dir) {
                let entry = entry?;
                if entry.file_type().is_file() {
                    count += 1;
                }
            }
            Ok(count)
        };

        Ok((
            count_dir(ObjectType::Chunk)?,
            count_dir(ObjectType::Manifest)?,
            count_dir(ObjectType::Commit)?,
        ))
    }

    /// Calculate total storage size.
    pub fn total_size(&self) -> io::Result<u64> {
        let mut total = 0;
        for entry in walkdir::WalkDir::new(&self.root) {
            let entry = entry?;
            if entry.file_type().is_file() {
                total += entry.metadata()?.len();
            }
        }
        Ok(total)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_store_and_load_chunk() {
        let temp = tempdir().unwrap();
        let store = ObjectStore::new(temp.path());
        store.init().unwrap();

        let data = b"hello world".to_vec();
        let chunk = Chunk::new(data.clone());

        // Store
        let was_new = store.store_chunk(&chunk).unwrap();
        assert!(was_new);

        // Store again (dedup)
        let was_new = store.store_chunk(&chunk).unwrap();
        assert!(!was_new);

        // Load
        let loaded = store.load_chunk(&chunk.hash).unwrap();
        assert_eq!(loaded.data, data);
        assert!(loaded.verify());
    }

    #[test]
    fn test_store_and_load_manifest() {
        let temp = tempdir().unwrap();
        let store = ObjectStore::new(temp.path());
        store.init().unwrap();

        let mut manifest = Manifest::new();
        manifest.add(crate::core::ManifestEntry::new(
            "test.txt".to_string(),
            100,
            Hash::ZERO,
            vec![],
        ));

        let hash = store.store_manifest(&manifest).unwrap();
        let loaded = store.load_manifest(&hash).unwrap();

        assert_eq!(manifest.len(), loaded.len());
    }

    #[test]
    fn test_store_and_load_commit() {
        let temp = tempdir().unwrap();
        let store = ObjectStore::new(temp.path());
        store.init().unwrap();

        use crate::core::Author;
        let commit = Commit::new(
            None,
            Hash::ZERO,
            "Test commit",
            Author::new("Test", "test@test.com"),
        );

        store.store_commit(&commit).unwrap();
        let loaded = store.load_commit(&commit.hash).unwrap();

        assert_eq!(commit.hash, loaded.hash);
        assert_eq!(commit.message, loaded.message);
    }

    #[test]
    fn test_checksum_verification() {
        let temp = tempdir().unwrap();
        let store = ObjectStore::new(temp.path());
        store.init().unwrap();

        let chunk = Chunk::new(b"test data".to_vec());
        store.store_chunk(&chunk).unwrap();

        // Corrupt the stored chunk
        let path = store.object_path(ObjectType::Chunk, &chunk.hash);
        fs::write(&path, b"corrupted data").unwrap();

        // Loading should fail due to checksum mismatch
        let result = store.load_chunk(&chunk.hash);
        assert!(matches!(result, Err(ObjectError::ChecksumMismatch { .. })));
    }
}
