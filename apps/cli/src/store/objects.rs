//! Content-addressable store (CAS) for chunks, manifests, commits, and blobs.
//!
//! Objects are immutable and named by a content hash. Writers stage bytes in a
//! temporary file in the destination directory and link the completed inode
//! into place without replacement, so readers never observe a partial object.
//!
//! Layout:
//! ```text
//! .dits/
//! ├── objects/
//! │   ├── chunks/
//! │   │   ├── a7/b9c3d4...
//! │   │   └── ...
//! │   ├── manifests/
//! │   ├── commits/
//! │   └── blobs/
//! └── refs/
//!     ├── HEAD
//!     └── branches/
//! ```

use std::{
    fs::{self, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
};

use thiserror::Error;
use uuid::Uuid;

use crate::{
    core::{Chunk, Commit, Hash, Hasher, Manifest},
    security::{decrypt_chunk, encrypt_chunk, EncryptedChunk, UserSecret},
};

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

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Invalid manifest: {0}")]
    InvalidManifest(String),

    #[error("{kind} object is too large: {size} bytes (maximum {max})")]
    ObjectTooLarge { kind: &'static str, size: u64, max: u64 },
}

/// Stored chunks are normally at most 256 KiB (4 MiB for the documented video
/// profile). A 64 MiB ceiling leaves ample compatibility headroom while
/// bounding local-object reads and legacy encrypted-chunk allocations.
const MAX_CHUNK_DATA_SIZE: u64 = 64 * 1024 * 1024;
const MAX_STORED_CHUNK_SIZE: u64 = MAX_CHUNK_DATA_SIZE + 1024;

/// Type of object in the store.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ObjectType {
    /// Raw binary chunk.
    Chunk,
    /// Manifest (recipe for reconstructing a file tree).
    Manifest,
    /// Commit (snapshot metadata and parent pointer).
    Commit,
    /// Generic blob (for file-type-specific metadata).
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

/// Write an immutable object without exposing a partial destination file.
///
/// The temporary file lives beside the destination, which keeps the final
/// publication on the same filesystem. A hard link is used instead of rename:
/// unlike a normal Unix rename, it never replaces a destination created by a
/// competing writer. The temporary name is removed after publication.
fn write_atomic_if_missing(path: &Path, data: &[u8]) -> io::Result<bool> {
    if path.exists() {
        return Ok(false);
    }

    let parent = path.parent().ok_or_else(|| {
        io::Error::new(io::ErrorKind::InvalidInput, "object path has no parent directory")
    })?;
    fs::create_dir_all(parent)?;

    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("object");
    let temp_path = parent.join(format!(".{file_name}.{}.tmp", Uuid::new_v4().simple()));

    let write_result = (|| -> io::Result<()> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp_path)?;
        file.write_all(data)?;
        file.flush()?;
        file.sync_all()?;
        Ok(())
    })();

    if let Err(error) = write_result {
        let _ = fs::remove_file(&temp_path);
        return Err(error);
    }

    match fs::hard_link(&temp_path, path) {
        Ok(()) => {
            let _ = fs::remove_file(&temp_path);
            Ok(true)
        },
        Err(error) if error.kind() == io::ErrorKind::AlreadyExists || path.exists() => {
            let _ = fs::remove_file(&temp_path);
            Ok(false)
        },
        Err(error) => {
            let _ = fs::remove_file(&temp_path);
            Err(error)
        },
    }
}

fn validate_manifest_paths(manifest: &Manifest) -> Result<(), ObjectError> {
    for (path, entry) in manifest.iter() {
        crate::util::validate_repo_relative_path(path).map_err(|reason| {
            ObjectError::InvalidManifest(format!("invalid path '{path}': {reason}"))
        })?;
        if path != &entry.path {
            return Err(ObjectError::InvalidManifest(format!(
                "entry key '{path}' does not match embedded path '{}'",
                entry.path
            )));
        }
    }
    Ok(())
}

/// Object store for the local `.dits` directory.
pub struct ObjectStore {
    /// Root path of the objects directory.
    root:       PathBuf,
    /// Encryption configuration (if enabled).
    encryption: Option<EncryptionConfig>,
}

/// Encryption configuration for the object store.
#[derive(Clone)]
pub struct EncryptionConfig {
    /// User secret for convergent encryption.
    pub user_secret: UserSecret,
}

impl ObjectStore {
    /// Create a new object store.
    pub fn new(dits_dir: &Path) -> Self {
        Self { root: dits_dir.join("objects"), encryption: None }
    }

    /// Create a new object store with encryption enabled.
    pub fn new_with_encryption(dits_dir: &Path, user_secret: UserSecret) -> Self {
        Self {
            root:       dits_dir.join("objects"),
            encryption: Some(EncryptionConfig { user_secret }),
        }
    }

    /// Enable encryption for this object store.
    pub fn enable_encryption(&mut self, user_secret: UserSecret) {
        self.encryption = Some(EncryptionConfig { user_secret });
    }

    /// Check if encryption is enabled.
    pub fn encryption_enabled(&self) -> bool {
        self.encryption.is_some()
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
        self.root
            .join(obj_type.dir_name())
            .join(&hex[..2])
            .join(&hex[2..])
    }

    // ========== Chunk Operations ==========

    /// Store a chunk. Returns true if it was newly stored, false if it already
    /// existed. If encryption is enabled, the chunk data is encrypted before
    /// storage.
    pub fn store_chunk(&self, chunk: &Chunk) -> Result<bool, ObjectError> {
        if chunk.data.len() as u64 > MAX_CHUNK_DATA_SIZE {
            return Err(ObjectError::ObjectTooLarge {
                kind: "chunk",
                size: chunk.data.len() as u64,
                max:  MAX_CHUNK_DATA_SIZE,
            });
        }
        let path = self.object_path(ObjectType::Chunk, &chunk.hash);

        if let Some(config) = &self.encryption {
            let encrypted = encrypt_chunk(&chunk.data, &config.user_secret).map_err(|error| {
                ObjectError::SerializationError(format!("Encryption failed: {error}"))
            })?;
            let serialized = bincode::serialize(&encrypted).map_err(|error| {
                ObjectError::SerializationError(format!("Serialization failed: {error}"))
            })?;
            write_atomic_if_missing(&path, &serialized).map_err(ObjectError::Io)
        } else {
            // Borrow plaintext directly instead of cloning every chunk before
            // writing it.
            write_atomic_if_missing(&path, &chunk.data).map_err(ObjectError::Io)
        }
    }

    /// Load a chunk by hash.
    ///
    /// If encryption is enabled, the stored payload is decrypted before its
    /// plaintext checksum is verified.
    pub fn load_chunk(&self, hash: &Hash) -> Result<Chunk, ObjectError> {
        let path = self.object_path(ObjectType::Chunk, hash);

        if !path.exists() {
            return Err(ObjectError::NotFound(hash.to_hex()));
        }

        let stored_size = path.metadata()?.len();
        if stored_size > MAX_STORED_CHUNK_SIZE {
            return Err(ObjectError::ObjectTooLarge {
                kind: "stored chunk",
                size: stored_size,
                max:  MAX_STORED_CHUNK_SIZE,
            });
        }
        let stored_data = fs::read(&path)?;
        if stored_data.len() as u64 > MAX_STORED_CHUNK_SIZE {
            return Err(ObjectError::ObjectTooLarge {
                kind: "stored chunk",
                size: stored_data.len() as u64,
                max:  MAX_STORED_CHUNK_SIZE,
            });
        }

        let plaintext_data = if let Some(config) = &self.encryption {
            // Fail closed: when encryption is enabled, refuse opaque plaintext
            // fallback so a corrupt or swapped object cannot be treated as data.
            let encrypted_chunk = crate::util::deserialize_bincode_with_limit::<EncryptedChunk>(
                &stored_data,
                MAX_STORED_CHUNK_SIZE,
            )
            .map_err(|error| {
                ObjectError::SerializationError(format!(
                    "Encrypted chunk decode failed (plaintext fallback disabled): {error}"
                ))
            })?;
            decrypt_chunk(&encrypted_chunk, &config.user_secret).map_err(|error| {
                ObjectError::SerializationError(format!("Decryption failed: {error}"))
            })?
        } else {
            stored_data
        };

        if plaintext_data.len() as u64 > MAX_CHUNK_DATA_SIZE {
            return Err(ObjectError::ObjectTooLarge {
                kind: "chunk",
                size: plaintext_data.len() as u64,
                max:  MAX_CHUNK_DATA_SIZE,
            });
        }

        let computed = Hasher::hash(&plaintext_data);
        if computed != *hash {
            return Err(ObjectError::ChecksumMismatch {
                expected: hash.to_hex(),
                actual:   computed.to_hex(),
            });
        }

        Ok(Chunk::with_hash(*hash, plaintext_data))
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

    /// Store a generic blob. Returns the hash and whether it was newly stored.
    pub fn store_blob(&self, data: &[u8]) -> Result<(Hash, bool), ObjectError> {
        let hash = Hasher::hash(data);
        let path = self.object_path(ObjectType::Blob, &hash);
        let was_new = write_atomic_if_missing(&path, data)?;
        Ok((hash, was_new))
    }

    /// Load a blob by hash.
    pub fn load_blob(&self, hash: &Hash) -> Result<Vec<u8>, ObjectError> {
        let path = self.object_path(ObjectType::Blob, hash);

        if !path.exists() {
            return Err(ObjectError::NotFound(format!("blob:{}", hash.to_hex())));
        }

        let data = fs::read(&path)?;
        let computed = Hasher::hash(&data);
        if computed != *hash {
            return Err(ObjectError::ChecksumMismatch {
                expected: hash.to_hex(),
                actual:   computed.to_hex(),
            });
        }

        Ok(data)
    }

    /// Check if a blob exists.
    pub fn has_blob(&self, hash: &Hash) -> bool {
        self.object_path(ObjectType::Blob, hash).exists()
    }

    // Legacy MP4 methods - now aliases to blob storage.
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

    /// Store a manifest as JSON and return its content hash.
    pub fn store_manifest(&self, manifest: &Manifest) -> Result<Hash, ObjectError> {
        validate_manifest_paths(manifest)?;
        let data = manifest.to_json();
        let hash = Hasher::hash(data.as_bytes());
        let path = self.object_path(ObjectType::Manifest, &hash);
        let _ = write_atomic_if_missing(&path, data.as_bytes())?;
        Ok(hash)
    }

    /// Load a manifest by hash.
    ///
    /// Manifests use one deterministic, human-inspectable JSON representation.
    /// The on-disk bytes are hashed and verified before parsing.
    pub fn load_manifest(&self, hash: &Hash) -> Result<Manifest, ObjectError> {
        let path = self.object_path(ObjectType::Manifest, hash);

        if !path.exists() {
            return Err(ObjectError::NotFound(hash.to_hex()));
        }

        let data = fs::read(&path)?;
        let computed = Hasher::hash(&data);
        if computed != *hash {
            return Err(ObjectError::ChecksumMismatch {
                expected: hash.to_hex(),
                actual:   computed.to_hex(),
            });
        }

        let json = std::str::from_utf8(&data).map_err(|error| {
            ObjectError::SerializationError(format!("Manifest is not valid UTF-8 JSON: {error}"))
        })?;
        let manifest = Manifest::from_json(json).map_err(ObjectError::Json)?;
        validate_manifest_paths(&manifest)?;
        Ok(manifest)
    }

    // ========== Commit Operations ==========

    /// Store a commit.
    pub fn store_commit(&self, commit: &Commit) -> Result<(), ObjectError> {
        if !commit.verify_hash() {
            return Err(ObjectError::ChecksumMismatch {
                expected: commit.hash.to_hex(),
                actual:   commit.computed_hash().to_hex(),
            });
        }
        let path = self.object_path(ObjectType::Commit, &commit.hash);
        let json = commit.to_json();
        let _ = write_atomic_if_missing(&path, json.as_bytes())?;
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

        if commit.hash != *hash {
            return Err(ObjectError::ChecksumMismatch {
                expected: hash.to_hex(),
                actual:   commit.hash.to_hex(),
            });
        }
        if !commit.verify_hash() {
            return Err(ObjectError::ChecksumMismatch {
                expected: commit.hash.to_hex(),
                actual:   commit.computed_hash().to_hex(),
            });
        }

        Ok(commit)
    }

    // ========== Stats ==========

    /// Count chunks, manifests, and commits.
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
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn test_atomic_writer_does_not_replace_an_existing_object() {
        let temp = tempdir().unwrap();
        let path = temp.path().join("object");

        assert!(write_atomic_if_missing(&path, b"first").unwrap());
        assert!(!write_atomic_if_missing(&path, b"second").unwrap());
        assert_eq!(fs::read(path).unwrap(), b"first");
    }

    #[test]
    fn test_store_and_load_chunk() {
        let temp = tempdir().unwrap();
        let store = ObjectStore::new(temp.path());
        store.init().unwrap();

        let data = b"hello world".to_vec();
        let chunk = Chunk::new(data.clone());

        let was_new = store.store_chunk(&chunk).unwrap();
        assert!(was_new);

        let was_new = store.store_chunk(&chunk).unwrap();
        assert!(!was_new);

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
    fn test_rejects_non_json_manifest() {
        let temp = tempdir().unwrap();
        let store = ObjectStore::new(temp.path());
        store.init().unwrap();

        let data = b"\x80\x81\x82not-json";
        let hash = Hasher::hash(data);
        let path = store.object_path(ObjectType::Manifest, &hash);
        assert!(write_atomic_if_missing(&path, data).unwrap());

        assert!(matches!(store.load_manifest(&hash), Err(ObjectError::SerializationError(_))));
    }

    #[test]
    fn test_rejects_noncanonical_manifest_paths() {
        let temp = tempdir().unwrap();
        let store = ObjectStore::new(temp.path());
        store.init().unwrap();

        let mut traversal = Manifest::new();
        traversal.add(crate::core::ManifestEntry::new(
            "../outside.bin".to_string(),
            0,
            Hash::ZERO,
            vec![],
        ));
        assert!(matches!(store.store_manifest(&traversal), Err(ObjectError::InvalidManifest(_))));

        // Loading an externally supplied object applies the same validation.
        let data = traversal.to_json();
        let hash = Hasher::hash(data.as_bytes());
        let path = store.object_path(ObjectType::Manifest, &hash);
        assert!(write_atomic_if_missing(&path, data.as_bytes()).unwrap());
        assert!(matches!(store.load_manifest(&hash), Err(ObjectError::InvalidManifest(_))));

        let mut mismatch = Manifest::new();
        let entry =
            crate::core::ManifestEntry::new("actual.bin".to_string(), 0, Hash::ZERO, vec![]);
        mismatch.entries.insert("different.bin".to_string(), entry);
        assert!(matches!(store.store_manifest(&mismatch), Err(ObjectError::InvalidManifest(_))));
    }

    #[test]
    fn test_store_and_load_commit() {
        let temp = tempdir().unwrap();
        let store = ObjectStore::new(temp.path());
        store.init().unwrap();

        use crate::core::Author;
        let commit =
            Commit::new(None, Hash::ZERO, "Test commit", Author::new("Test", "test@test.com"));

        store.store_commit(&commit).unwrap();
        let loaded = store.load_commit(&commit.hash).unwrap();

        assert_eq!(commit.hash, loaded.hash);
        assert_eq!(commit.message, loaded.message);
    }

    #[test]
    fn test_load_commit_recomputes_content_hash() {
        let temp = tempdir().unwrap();
        let store = ObjectStore::new(temp.path());
        store.init().unwrap();

        let commit = Commit::new(
            None,
            Hash::ZERO,
            "original",
            crate::core::Author::new("Test", "test@example.com"),
        );
        store.store_commit(&commit).unwrap();

        let path = store.object_path(ObjectType::Commit, &commit.hash);
        let mut tampered: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        tampered["message"] = serde_json::Value::String("tampered".to_string());
        fs::write(&path, serde_json::to_string_pretty(&tampered).unwrap()).unwrap();

        assert!(matches!(
            store.load_commit(&commit.hash),
            Err(ObjectError::ChecksumMismatch { .. })
        ));
    }

    #[test]
    fn test_checksum_verification() {
        let temp = tempdir().unwrap();
        let store = ObjectStore::new(temp.path());
        store.init().unwrap();

        let chunk = Chunk::new(b"test data".to_vec());
        store.store_chunk(&chunk).unwrap();

        let path = store.object_path(ObjectType::Chunk, &chunk.hash);
        fs::write(&path, b"corrupted data").unwrap();

        let result = store.load_chunk(&chunk.hash);
        assert!(matches!(result, Err(ObjectError::ChecksumMismatch { .. })));
    }
}
