//! Alternative cryptographic hashing algorithms.
//!
//! Provides different hash functions with varying performance/security trade-offs:
//! - BLAKE3: Fast, parallelizable (current default)
//! - SHA-256: Standard, widely trusted
//! - SHA-3-256: Future-proof, different construction

use std::fmt;
use async_trait::async_trait;
use dits_core::ChunkHash;

/// Hash algorithm enumeration
#[derive(Clone, Debug, PartialEq)]
pub enum HashAlgorithm {
    Blake3,
    Sha256,
    Sha3256,
}

impl fmt::Display for HashAlgorithm {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            HashAlgorithm::Blake3 => write!(f, "blake3"),
            HashAlgorithm::Sha256 => write!(f, "sha256"),
            HashAlgorithm::Sha3256 => write!(f, "sha3-256"),
        }
    }
}

/// Trait for hash functions
#[async_trait]
pub trait Hasher: Send + Sync {
    /// Compute hash of data
    async fn hash(&self, data: &[u8]) -> ChunkHash;

    /// Get algorithm name
    fn algorithm(&self) -> HashAlgorithm;

    /// Get hash output size in bytes
    fn output_size(&self) -> usize;
}

/// BLAKE3 hasher implementation
pub struct Blake3Hasher;

impl Blake3Hasher {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Hasher for Blake3Hasher {
    async fn hash(&self, data: &[u8]) -> ChunkHash {
        let hash = blake3::hash(data);
        ChunkHash::from_bytes(*hash.as_bytes())
    }

    fn algorithm(&self) -> HashAlgorithm {
        HashAlgorithm::Blake3
    }

    fn output_size(&self) -> usize {
        32
    }
}

/// SHA-256 hasher implementation
pub struct Sha256Hasher;

impl Sha256Hasher {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Hasher for Sha256Hasher {
    async fn hash(&self, data: &[u8]) -> ChunkHash {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(data);
        let result = hasher.finalize();
        ChunkHash::from_bytes(result.into())
    }

    fn algorithm(&self) -> HashAlgorithm {
        HashAlgorithm::Sha256
    }

    fn output_size(&self) -> usize {
        32
    }
}

/// SHA-3-256 hasher implementation
pub struct Sha3256Hasher;

impl Sha3256Hasher {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Hasher for Sha3256Hasher {
    async fn hash(&self, data: &[u8]) -> ChunkHash {
        use sha3::{Sha3_256, Digest};
        let mut hasher = Sha3_256::new();
        hasher.update(data);
        let result = hasher.finalize();
        ChunkHash::from_bytes(result.into())
    }

    fn algorithm(&self) -> HashAlgorithm {
        HashAlgorithm::Sha3256
    }

    fn output_size(&self) -> usize {
        32
    }
}

/// Hash factory for creating hashers
pub struct HashFactory;

impl HashFactory {
    /// Create a hasher from algorithm enum
    pub fn create(algorithm: HashAlgorithm) -> Box<dyn Hasher> {
        match algorithm {
            HashAlgorithm::Blake3 => Box::new(Blake3Hasher::new()),
            HashAlgorithm::Sha256 => Box::new(Sha256Hasher::new()),
            HashAlgorithm::Sha3256 => Box::new(Sha3256Hasher::new()),
        }
    }

    /// Create hasher from string name
    pub fn from_name(name: &str) -> Option<Box<dyn Hasher>> {
        match name.to_lowercase().as_str() {
            "blake3" => Some(Box::new(Blake3Hasher::new())),
            "sha256" | "sha-256" => Some(Box::new(Sha256Hasher::new())),
            "sha3-256" | "sha3256" => Some(Box::new(Sha3256Hasher::new())),
            _ => None,
        }
    }

    /// Get default hasher (BLAKE3)
    pub fn default() -> Box<dyn Hasher> {
        Self::create(HashAlgorithm::Blake3)
    }

    /// Get available algorithms
    pub fn available_algorithms() -> Vec<HashAlgorithm> {
        vec![
            HashAlgorithm::Blake3,
            HashAlgorithm::Sha256,
            HashAlgorithm::Sha3256,
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_blake3_hasher() {
        let hasher = Blake3Hasher::new();
        let data = b"Hello, world!";
        let hash = hasher.hash(data).await;

        assert_eq!(hasher.algorithm(), HashAlgorithm::Blake3);
        assert_eq!(hasher.output_size(), 32);
        assert!(!hash.as_bytes().is_empty());
    }

    #[tokio::test]
    async fn test_sha256_hasher() {
        let hasher = Sha256Hasher::new();
        let data = b"Hello, world!";
        let hash = hasher.hash(data).await;

        assert_eq!(hasher.algorithm(), HashAlgorithm::Sha256);
        assert_eq!(hasher.output_size(), 32);
        assert!(!hash.as_bytes().is_empty());
    }

    #[tokio::test]
    async fn test_sha3_256_hasher() {
        let hasher = Sha3256Hasher::new();
        let data = b"Hello, world!";
        let hash = hasher.hash(data).await;

        assert_eq!(hasher.algorithm(), HashAlgorithm::Sha3256);
        assert_eq!(hasher.output_size(), 32);
        assert!(!hash.as_bytes().is_empty());
    }

    #[tokio::test]
    async fn test_hash_factory() {
        // Test creating from enum
        let hasher = HashFactory::create(HashAlgorithm::Blake3);
        assert_eq!(hasher.algorithm(), HashAlgorithm::Blake3);

        // Test creating from name
        let hasher = HashFactory::from_name("sha256").unwrap();
        assert_eq!(hasher.algorithm(), HashAlgorithm::Sha256);

        // Test invalid name
        assert!(HashFactory::from_name("invalid").is_none());
    }

    #[tokio::test]
    async fn test_hash_consistency() {
        let data = b"Consistent hash test data";

        let blake3_1 = HashFactory::create(HashAlgorithm::Blake3);
        let blake3_2 = HashFactory::create(HashAlgorithm::Blake3);

        let hash1 = blake3_1.hash(data).await;
        let hash2 = blake3_2.hash(data).await;

        assert_eq!(hash1, hash2);
    }

    #[tokio::test]
    async fn test_different_algorithms_different_hashes() {
        let data = b"Different algorithms should produce different hashes";

        let blake3 = HashFactory::create(HashAlgorithm::Blake3);
        let sha256 = HashFactory::create(HashAlgorithm::Sha256);

        let hash1 = blake3.hash(data).await;
        let hash2 = sha256.hash(data).await;

        // Different algorithms should produce different hashes
        assert_ne!(hash1, hash2);
    }
}



