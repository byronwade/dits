//! Content-addressed frame store.
//!
//! Each encoded frame is addressed by `blake3(encoded_bytes)` and stored once.
//! Storing the same frame twice is a no-op, so identical frames across versions
//! of a clip dedup automatically.

use std::{
    io,
    path::{Path, PathBuf},
};

use crate::core::{Hash, Hasher};

/// A content-addressed store of encoded frames on disk.
pub struct FrameStore {
    root: PathBuf,
}

impl FrameStore {
    /// Open (creating if needed) a frame store rooted at `root/frames`.
    pub fn new(root: &Path) -> io::Result<Self> {
        let root = root.join("frames");
        std::fs::create_dir_all(&root)?;
        Ok(Self { root })
    }

    /// Sharded path for a frame: `frames/<aa>/<full_hex>`.
    fn path_for(&self, hash: &Hash) -> PathBuf {
        let hex = hash.to_hex();
        self.root.join(&hex[..2]).join(&hex)
    }

    /// Store an encoded frame, returning its content hash. Idempotent: storing
    /// the same bytes again is a no-op (automatic dedup).
    pub fn store_frame(&self, data: &[u8]) -> io::Result<Hash> {
        let hash = Hasher::hash(data);
        let path = self.path_for(&hash);
        if path.exists() {
            return Ok(hash);
        }
        let parent = path.parent().expect("sharded path always has a parent");
        std::fs::create_dir_all(parent)?;
        // Write to a temp file then rename, so a reader never sees a partial object.
        let tmp = parent.join(format!(".{}.tmp", hash.to_hex()));
        std::fs::write(&tmp, data)?;
        std::fs::rename(&tmp, &path)?;
        Ok(hash)
    }

    /// Load an encoded frame by hash.
    pub fn load_frame(&self, hash: &Hash) -> io::Result<Vec<u8>> {
        std::fs::read(self.path_for(hash))
    }

    /// Whether a frame with this hash is already stored.
    pub fn contains(&self, hash: &Hash) -> bool {
        self.path_for(hash).exists()
    }

    /// Number of distinct frame objects currently stored.
    pub fn count(&self) -> io::Result<usize> {
        let mut n = 0;
        for shard in std::fs::read_dir(&self.root)? {
            let shard = shard?;
            if shard.file_type()?.is_dir() {
                for entry in std::fs::read_dir(shard.path())? {
                    let entry = entry?;
                    // Ignore in-flight temp files.
                    if entry.file_type()?.is_file()
                        && !entry.file_name().to_string_lossy().starts_with('.')
                    {
                        n += 1;
                    }
                }
            }
        }
        Ok(n)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identical_frames_dedup_and_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let store = FrameStore::new(dir.path()).unwrap();

        let frame_a = b"frame-pixels-A".to_vec();
        let frame_b = b"frame-pixels-B".to_vec();

        let h1 = store.store_frame(&frame_a).unwrap();
        let h2 = store.store_frame(&frame_a).unwrap(); // identical -> dedup
        let h3 = store.store_frame(&frame_b).unwrap();

        // Same content -> same hash; different content -> different hash.
        assert_eq!(h1, h2);
        assert_ne!(h1, h3);

        // Only two distinct objects were persisted despite three stores.
        assert_eq!(store.count().unwrap(), 2);

        // Round-trip.
        assert_eq!(store.load_frame(&h1).unwrap(), frame_a);
        assert_eq!(store.load_frame(&h3).unwrap(), frame_b);
    }
}
