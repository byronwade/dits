//! Content-addressed segment store/delivery seam. `LocalDiskOrigin` is impl #1;
//! a future QUIC delta-push origin is impl #2 with no upstream rework.

use crate::core::Hash;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// A place segments live, addressed by content hash.
pub trait SegmentOrigin {
    fn has(&self, hash: &Hash) -> bool;
    fn put(&self, hash: &Hash, bytes: &[u8]) -> io::Result<()>;
    fn get(&self, hash: &Hash) -> io::Result<Vec<u8>>;
}

/// Stores segments as files named by hex hash under `root`.
pub struct LocalDiskOrigin {
    root: PathBuf,
}

impl LocalDiskOrigin {
    pub fn new(root: &Path) -> io::Result<Self> {
        fs::create_dir_all(root)?;
        Ok(Self { root: root.to_path_buf() })
    }
    fn path(&self, hash: &Hash) -> PathBuf {
        self.root.join(hash.to_hex())
    }
}

impl SegmentOrigin for LocalDiskOrigin {
    fn has(&self, hash: &Hash) -> bool {
        self.path(hash).exists()
    }
    fn put(&self, hash: &Hash, bytes: &[u8]) -> io::Result<()> {
        let p = self.path(hash);
        if p.exists() {
            return Ok(()); // idempotent: content-addressed
        }
        fs::write(p, bytes)
    }
    fn get(&self, hash: &Hash) -> io::Result<Vec<u8>> {
        let bytes = fs::read(self.path(hash))?;
        // Integrity: verify the bytes still hash to the requested address.
        let actual = Hash::from_slice(blake3::hash(&bytes).as_bytes());
        if &actual != hash {
            return Err(io::Error::new(io::ErrorKind::InvalidData, "segment hash mismatch"));
        }
        Ok(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn put_get_has_roundtrip_and_dedup() {
        let dir = tempfile::tempdir().unwrap();
        let origin = LocalDiskOrigin::new(dir.path()).unwrap();
        let bytes = b"segment-bytes".to_vec();
        let hash = Hash::from_slice(blake3::hash(&bytes).as_bytes());

        assert!(!origin.has(&hash));
        origin.put(&hash, &bytes).unwrap();
        assert!(origin.has(&hash));
        assert_eq!(origin.get(&hash).unwrap(), bytes);

        // Idempotent put does not error.
        origin.put(&hash, &bytes).unwrap();
    }

    #[test]
    fn get_detects_corruption() {
        let dir = tempfile::tempdir().unwrap();
        let origin = LocalDiskOrigin::new(dir.path()).unwrap();
        let hash = Hash::from_slice(blake3::hash(b"real").as_bytes());
        // Write wrong bytes under the hash name.
        std::fs::write(dir.path().join(hash.to_hex()), b"tampered").unwrap();
        assert!(origin.get(&hash).is_err());
    }
}
