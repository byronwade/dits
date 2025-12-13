//! Convergent chunk encryption using AES-256-GCM.

use aes_gcm::{
    Aes256Gcm, Nonce, KeyInit,
    aead::{Aead, generic_array::GenericArray},
};
use serde::{Deserialize, Serialize};
use super::keys::{UserSecret, derive_dek, generate_random_bytes};
use crate::core::Hash;

/// Encrypted chunk with all necessary data for decryption.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedChunk {
    /// BLAKE3 hash of plaintext (used for deduplication lookup).
    pub content_hash: Hash,
    /// Random 12-byte nonce for GCM.
    pub nonce: [u8; 12],
    /// Encrypted data (ciphertext + GCM auth tag).
    pub ciphertext: Vec<u8>,
}

impl EncryptedChunk {
    /// Get the size of the encrypted data.
    pub fn encrypted_size(&self) -> usize {
        self.ciphertext.len()
    }
}

/// Encrypt a chunk using convergent encryption.
///
/// The encryption scheme:
/// 1. Compute BLAKE3 hash of plaintext (for deduplication)
/// 2. Derive DEK = HMAC-SHA256(user_secret, content_hash)
/// 3. Generate random nonce (safe because DEK is content-derived)
/// 4. Encrypt with AES-256-GCM
///
/// # Arguments
/// * `plaintext` - Raw chunk data to encrypt
/// * `user_secret` - User's secret for DEK derivation
///
/// # Returns
/// EncryptedChunk with content_hash, nonce, and ciphertext
pub fn encrypt_chunk(
    plaintext: &[u8],
    user_secret: &UserSecret,
) -> Result<EncryptedChunk, EncryptionError> {
    // 1. Compute content hash for deduplication
    let content_hash = blake3::hash(plaintext);
    let content_hash_bytes: [u8; 32] = *content_hash.as_bytes();

    // 2. Derive chunk-specific DEK (convergent)
    let dek = derive_dek(user_secret, &content_hash_bytes);

    // 3. Generate random nonce
    let nonce_bytes: [u8; 12] = generate_random_bytes();
    let nonce = Nonce::from_slice(&nonce_bytes);

    // 4. Encrypt with AES-256-GCM
    let cipher = Aes256Gcm::new(GenericArray::from_slice(&dek));
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| EncryptionError::EncryptFailed(e.to_string()))?;

    Ok(EncryptedChunk {
        content_hash: Hash::from_bytes(content_hash_bytes),
        nonce: nonce_bytes,
        ciphertext,
    })
}

/// Decrypt an encrypted chunk.
///
/// # Arguments
/// * `encrypted` - The encrypted chunk
/// * `user_secret` - User's secret for DEK derivation
///
/// # Returns
/// Decrypted plaintext bytes
pub fn decrypt_chunk(
    encrypted: &EncryptedChunk,
    user_secret: &UserSecret,
) -> Result<Vec<u8>, EncryptionError> {
    // 1. Derive DEK from content hash
    let dek = derive_dek(user_secret, encrypted.content_hash.as_bytes());

    // 2. Decrypt with AES-256-GCM
    let cipher = Aes256Gcm::new(GenericArray::from_slice(&dek));
    let nonce = Nonce::from_slice(&encrypted.nonce);

    let plaintext = cipher
        .decrypt(nonce, encrypted.ciphertext.as_ref())
        .map_err(|_| EncryptionError::DecryptFailed("Authentication failed".to_string()))?;

    // 3. Verify content hash matches
    let computed_hash = blake3::hash(&plaintext);
    if computed_hash.as_bytes() != encrypted.content_hash.as_bytes() {
        return Err(EncryptionError::HashMismatch {
            expected: encrypted.content_hash.to_hex(),
            actual: hex::encode(computed_hash.as_bytes()),
        });
    }

    Ok(plaintext)
}

/// Encrypt data with a specific key (for metadata encryption).
///
/// Unlike convergent encryption, this uses the provided key directly.
pub fn encrypt_with_key(
    plaintext: &[u8],
    key: &[u8; 32],
) -> Result<(Vec<u8>, [u8; 12]), EncryptionError> {
    let nonce_bytes: [u8; 12] = generate_random_bytes();
    let nonce = Nonce::from_slice(&nonce_bytes);

    let cipher = Aes256Gcm::new(GenericArray::from_slice(key));
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| EncryptionError::EncryptFailed(e.to_string()))?;

    Ok((ciphertext, nonce_bytes))
}

/// Decrypt data with a specific key (for metadata decryption).
pub fn decrypt_with_key(
    ciphertext: &[u8],
    key: &[u8; 32],
    nonce: &[u8; 12],
) -> Result<Vec<u8>, EncryptionError> {
    let cipher = Aes256Gcm::new(GenericArray::from_slice(key));
    let nonce = Nonce::from_slice(nonce);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| EncryptionError::DecryptFailed("Authentication failed".to_string()))
}

/// Encryption errors.
#[derive(Debug, thiserror::Error)]
pub enum EncryptionError {
    #[error("Encryption failed: {0}")]
    EncryptFailed(String),

    #[error("Decryption failed: {0}")]
    DecryptFailed(String),

    #[error("Content hash mismatch: expected {expected}, got {actual}")]
    HashMismatch { expected: String, actual: String },
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::security::keys::Argon2Params;

    fn test_user_secret() -> UserSecret {
        UserSecret::from_bytes([42u8; 32])
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let plaintext = b"Hello, encrypted world!";
        let user_secret = test_user_secret();

        let encrypted = encrypt_chunk(plaintext, &user_secret).unwrap();
        let decrypted = decrypt_chunk(&encrypted, &user_secret).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_convergent_encryption() {
        let plaintext = b"Same content produces same DEK";
        let user_secret = test_user_secret();

        let encrypted1 = encrypt_chunk(plaintext, &user_secret).unwrap();
        let encrypted2 = encrypt_chunk(plaintext, &user_secret).unwrap();

        // Same content = same content hash (for dedup)
        assert_eq!(encrypted1.content_hash, encrypted2.content_hash);

        // Note: ciphertext may differ due to random nonces, but DEK is the same
        // so both can be decrypted with the same user_secret
        let decrypted1 = decrypt_chunk(&encrypted1, &user_secret).unwrap();
        let decrypted2 = decrypt_chunk(&encrypted2, &user_secret).unwrap();
        assert_eq!(decrypted1, decrypted2);
    }

    #[test]
    fn test_different_content_different_hash() {
        let user_secret = test_user_secret();

        let encrypted1 = encrypt_chunk(b"Content A", &user_secret).unwrap();
        let encrypted2 = encrypt_chunk(b"Content B", &user_secret).unwrap();

        // Different content = different hash
        assert_ne!(encrypted1.content_hash, encrypted2.content_hash);
    }

    #[test]
    fn test_tamper_detection() {
        let plaintext = b"Original content";
        let user_secret = test_user_secret();

        let mut encrypted = encrypt_chunk(plaintext, &user_secret).unwrap();

        // Tamper with ciphertext
        if let Some(byte) = encrypted.ciphertext.get_mut(0) {
            *byte ^= 0xFF;
        }

        // Decryption should fail
        let result = decrypt_chunk(&encrypted, &user_secret);
        assert!(result.is_err());
    }

    #[test]
    fn test_wrong_secret_fails() {
        let plaintext = b"Secret content";
        let user_secret1 = UserSecret::from_bytes([1u8; 32]);
        let user_secret2 = UserSecret::from_bytes([2u8; 32]);

        let encrypted = encrypt_chunk(plaintext, &user_secret1).unwrap();

        // Wrong secret should fail decryption
        let result = decrypt_chunk(&encrypted, &user_secret2);
        assert!(result.is_err());
    }

    #[test]
    fn test_encrypt_with_key() {
        let plaintext = b"Metadata content";
        let key = [99u8; 32];

        let (ciphertext, nonce) = encrypt_with_key(plaintext, &key).unwrap();
        let decrypted = decrypt_with_key(&ciphertext, &key, &nonce).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_large_chunk() {
        let plaintext = vec![0xAB; 1024 * 1024]; // 1 MB
        let user_secret = test_user_secret();

        let encrypted = encrypt_chunk(&plaintext, &user_secret).unwrap();
        let decrypted = decrypt_chunk(&encrypted, &user_secret).unwrap();

        assert_eq!(plaintext, decrypted);
    }
}
