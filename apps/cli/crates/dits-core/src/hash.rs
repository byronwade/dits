//! Hash types and utilities for content addressing.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Size of a BLAKE3 hash in bytes.
pub const HASH_SIZE: usize = 32;

/// A content-addressable hash (BLAKE3).
#[derive(Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Hash([u8; HASH_SIZE]);

impl Hash {
    /// Create a new hash from bytes.
    pub fn from_bytes(bytes: [u8; HASH_SIZE]) -> Self {
        Self(bytes)
    }

    /// Create a hash from a slice.
    ///
    /// # Panics
    /// Panics if slice length != HASH_SIZE
    pub fn from_slice(slice: &[u8]) -> Self {
        let mut bytes = [0u8; HASH_SIZE];
        bytes.copy_from_slice(slice);
        Self(bytes)
    }

    /// Create a hash from a hex string.
    pub fn from_hex(hex: &str) -> Result<Self, hex::FromHexError> {
        let bytes = hex::decode(hex)?;
        if bytes.len() != HASH_SIZE {
            return Err(hex::FromHexError::InvalidStringLength);
        }
        Ok(Self::from_slice(&bytes))
    }

    /// Get the raw bytes of the hash.
    pub fn as_bytes(&self) -> &[u8; HASH_SIZE] {
        &self.0
    }

    /// Convert to hex string.
    pub fn to_hex(&self) -> String {
        hex::encode(self.0)
    }

    /// Get a short representation (first 8 chars).
    pub fn short(&self) -> String {
        self.to_hex()[..8].to_string()
    }

    /// Check if this is the zero hash.
    pub fn is_zero(&self) -> bool {
        self.0 == [0u8; HASH_SIZE]
    }

    /// The zero hash (all zeros).
    pub const ZERO: Self = Self([0u8; HASH_SIZE]);
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

impl AsRef<[u8]> for Hash {
    fn as_ref(&self) -> &[u8] {
        &self.0
    }
}

impl From<[u8; HASH_SIZE]> for Hash {
    fn from(bytes: [u8; HASH_SIZE]) -> Self {
        Self(bytes)
    }
}

impl TryFrom<&[u8]> for Hash {
    type Error = std::array::TryFromSliceError;

    fn try_from(slice: &[u8]) -> Result<Self, Self::Error> {
        let bytes: [u8; HASH_SIZE] = slice.try_into()?;
        Ok(Self(bytes))
    }
}

/// Hasher for computing content hashes.
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

    /// Compute hash of multiple data slices.
    pub fn hash_all<I, T>(data: I) -> Hash
    where
        I: IntoIterator<Item = T>,
        T: AsRef<[u8]>,
    {
        let mut hasher = Self::new();
        for chunk in data {
            hasher.update(chunk.as_ref());
        }
        hasher.finalize()
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
    fn test_hash_from_bytes() {
        let bytes = [0u8; HASH_SIZE];
        let hash = Hash::from_bytes(bytes);
        assert_eq!(hash.as_bytes(), &bytes);
    }

    #[test]
    fn test_hash_hex_roundtrip() {
        let data = b"hello world";
        let hash = Hasher::hash(data);
        let hex = hash.to_hex();
        let parsed = Hash::from_hex(&hex).unwrap();
        assert_eq!(hash, parsed);
    }

    #[test]
    fn test_hash_short() {
        let hash = Hasher::hash(b"test");
        assert_eq!(hash.short().len(), 8);
    }

    #[test]
    fn test_hasher_update() {
        let hash1 = Hasher::hash(b"hello world");

        let mut hasher = Hasher::new();
        hasher.update(b"hello ");
        hasher.update(b"world");
        let hash2 = hasher.finalize();

        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_hash_all() {
        let hash1 = Hasher::hash(b"helloworld");
        let hash2 = Hasher::hash_all([b"hello", b"world"]);
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_zero_hash() {
        assert!(Hash::ZERO.is_zero());
        assert!(!Hasher::hash(b"test").is_zero());
    }
}
