//! BLAKE3 hashing for content addressing.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Size of a BLAKE3 hash in bytes (32 bytes = 256 bits).
pub const HASH_SIZE: usize = 32;

/// A content-addressable hash using BLAKE3.
#[derive(Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Hash([u8; HASH_SIZE]);

impl Hash {
    /// Create a hash from raw bytes.
    pub fn from_bytes(bytes: [u8; HASH_SIZE]) -> Self {
        Self(bytes)
    }

    /// Create a hash from a slice. Panics if wrong length.
    pub fn from_slice(slice: &[u8]) -> Self {
        let mut bytes = [0u8; HASH_SIZE];
        bytes.copy_from_slice(slice);
        Self(bytes)
    }

    /// Parse a hash from a hex string.
    pub fn from_hex(hex: &str) -> Result<Self, hex::FromHexError> {
        let bytes = hex::decode(hex)?;
        if bytes.len() != HASH_SIZE {
            return Err(hex::FromHexError::InvalidStringLength);
        }
        Ok(Self::from_slice(&bytes))
    }

    /// Get the raw bytes.
    pub fn as_bytes(&self) -> &[u8; HASH_SIZE] {
        &self.0
    }

    /// Convert to hex string.
    pub fn to_hex(&self) -> String {
        hex::encode(self.0)
    }

    /// Get short form (first 8 hex chars).
    pub fn short(&self) -> String {
        self.to_hex()[..8].to_string()
    }

    /// The zero hash.
    pub const ZERO: Self = Self([0u8; HASH_SIZE]);

    /// Check if this is the zero hash.
    pub fn is_zero(&self) -> bool {
        self.0 == [0u8; HASH_SIZE]
    }

    /// Get the object path for this hash (first 2 chars as directory).
    /// Example: "ab/cdef1234..." for hash "abcdef1234..."
    pub fn object_path(&self) -> String {
        let hex = self.to_hex();
        format!("{}/{}", &hex[..2], &hex[2..])
    }
}

impl Default for Hash {
    fn default() -> Self {
        Self::ZERO
    }
}

impl fmt::Display for Hash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.to_hex())
    }
}

impl fmt::Debug for Hash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Hash({})", self.short())
    }
}

/// Hasher for computing BLAKE3 hashes.
pub struct Hasher {
    inner: blake3::Hasher,
}

impl Hasher {
    /// Create a new hasher.
    pub fn new() -> Self {
        Self {
            inner: blake3::Hasher::new(),
        }
    }

    /// Update the hasher with data.
    pub fn update(&mut self, data: &[u8]) -> &mut Self {
        self.inner.update(data);
        self
    }

    /// Finalize and return the hash.
    pub fn finalize(&self) -> Hash {
        let hash = self.inner.finalize();
        Hash::from_bytes(*hash.as_bytes())
    }

    /// Compute hash of data in one call.
    pub fn hash(data: &[u8]) -> Hash {
        let hash = blake3::hash(data);
        Hash::from_bytes(*hash.as_bytes())
    }
}

impl Default for Hasher {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_deterministic() {
        let data = b"hello world";
        let hash1 = Hasher::hash(data);
        let hash2 = Hasher::hash(data);
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_hash_hex_roundtrip() {
        let hash = Hasher::hash(b"test data");
        let hex = hash.to_hex();
        let parsed = Hash::from_hex(&hex).unwrap();
        assert_eq!(hash, parsed);
    }

    #[test]
    fn test_incremental_hash() {
        let hash1 = Hasher::hash(b"hello world");

        let mut hasher = Hasher::new();
        hasher.update(b"hello ");
        hasher.update(b"world");
        let hash2 = hasher.finalize();

        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_object_path() {
        let hash = Hasher::hash(b"test");
        let path = hash.object_path();
        assert!(path.contains('/'));
        assert_eq!(path.len(), 65); // 2 + 1 + 62
    }
}
