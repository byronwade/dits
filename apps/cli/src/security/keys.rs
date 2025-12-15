//! Key derivation and management.

use argon2::{Argon2, password_hash::SaltString};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use zeroize::{Zeroize, ZeroizeOnDrop};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};

type HmacSha256 = Hmac<Sha256>;

/// Argon2 parameters for key derivation.
#[derive(Debug, Clone)]
pub struct Argon2Params {
    /// Memory cost in KiB (default: 256 MB = 262144 KiB).
    pub memory_cost: u32,
    /// Time cost (iterations, default: 3).
    pub time_cost: u32,
    /// Parallelism (default: 4).
    pub parallelism: u32,
}

impl Default for Argon2Params {
    fn default() -> Self {
        Self {
            memory_cost: 262144, // 256 MB
            time_cost: 3,
            parallelism: 4,
        }
    }
}

impl Argon2Params {
    /// Fast params for testing only.
    pub fn fast() -> Self {
        Self {
            memory_cost: 4096, // 4 MB
            time_cost: 1,
            parallelism: 1,
        }
    }
}

/// Root key derived from user password. Zeroized on drop.
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct RootKey([u8; 32]);

impl RootKey {
    /// Create from raw bytes.
    pub fn from_bytes(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }

    /// Get reference to key bytes.
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

/// User secret for convergent encryption. Zeroized on drop.
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct UserSecret([u8; 32]);

impl UserSecret {
    /// Create from raw bytes.
    pub fn from_bytes(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }

    /// Get reference to secret bytes.
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

/// Bundle of derived keys for encryption operations.
pub struct KeyBundle {
    /// User secret for convergent chunk encryption.
    pub user_secret: UserSecret,
    /// Metadata key for encrypting manifests/paths.
    pub metadata_key: [u8; 32],
    /// Recovery key for key escrow.
    pub recovery_key: [u8; 32],
}

/// Serializable version of KeyBundle for caching.
#[derive(Serialize, Deserialize)]
pub struct SerializableKeyBundle {
    pub user_secret: [u8; 32],
    pub metadata_key: [u8; 32],
    pub recovery_key: [u8; 32],
}

impl From<&KeyBundle> for SerializableKeyBundle {
    fn from(bundle: &KeyBundle) -> Self {
        Self {
            user_secret: *bundle.user_secret.as_bytes(),
            metadata_key: bundle.metadata_key,
            recovery_key: bundle.recovery_key,
        }
    }
}

impl From<SerializableKeyBundle> for KeyBundle {
    fn from(bundle: SerializableKeyBundle) -> Self {
        Self {
            user_secret: UserSecret::from_bytes(bundle.user_secret),
            metadata_key: bundle.metadata_key,
            recovery_key: bundle.recovery_key,
        }
    }
}

impl Drop for KeyBundle {
    fn drop(&mut self) {
        self.metadata_key.zeroize();
        self.recovery_key.zeroize();
    }
}

/// Derive keys from a password using Argon2id.
///
/// # Arguments
/// * `password` - User's password
/// * `salt` - 32-byte salt (should be stored with the keystore)
/// * `params` - Argon2 parameters (None for defaults)
///
/// # Returns
/// KeyBundle containing user_secret, metadata_key, and recovery_key
pub fn derive_keys(
    password: &str,
    salt: &[u8; 32],
    params: Option<&Argon2Params>,
) -> Result<KeyBundle, KeyDerivationError> {
    let params = params.cloned().unwrap_or_default();

    // Configure Argon2id
    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        argon2::Params::new(
            params.memory_cost,
            params.time_cost,
            params.parallelism,
            Some(32), // Output length
        ).map_err(|e| KeyDerivationError::InvalidParams(e.to_string()))?,
    );

    // Derive root key
    let mut root_key_bytes = [0u8; 32];
    argon2.hash_password_into(
        password.as_bytes(),
        salt,
        &mut root_key_bytes,
    ).map_err(|e| KeyDerivationError::Argon2Error(e.to_string()))?;

    let root_key = RootKey::from_bytes(root_key_bytes);

    // Derive sub-keys using HMAC-SHA256 (simple HKDF-like expansion)
    let user_secret = hkdf_expand(root_key.as_bytes(), b"dits-user-secret-v1")?;
    let metadata_key = hkdf_expand(root_key.as_bytes(), b"dits-metadata-key-v1")?;
    let recovery_key = hkdf_expand(root_key.as_bytes(), b"dits-recovery-key-v1")?;

    Ok(KeyBundle {
        user_secret: UserSecret::from_bytes(user_secret),
        metadata_key,
        recovery_key,
    })
}

/// Simple HKDF-like key expansion using HMAC-SHA256.
fn hkdf_expand(key: &[u8], info: &[u8]) -> Result<[u8; 32], KeyDerivationError> {
    let mut mac = HmacSha256::new_from_slice(key)
        .map_err(|e| KeyDerivationError::HmacError(e.to_string()))?;
    mac.update(info);
    mac.update(&[0x01]); // Counter byte
    let result = mac.finalize().into_bytes();

    let mut output = [0u8; 32];
    output.copy_from_slice(&result);
    Ok(output)
}

/// Derive a Data Encryption Key (DEK) for convergent encryption.
///
/// DEK = HMAC-SHA256(user_secret, content_hash)
pub fn derive_dek(user_secret: &UserSecret, content_hash: &[u8; 32]) -> [u8; 32] {
    let mut mac = HmacSha256::new_from_slice(user_secret.as_bytes())
        .expect("HMAC key length is always valid");
    mac.update(content_hash);
    let result = mac.finalize().into_bytes();

    let mut dek = [0u8; 32];
    dek.copy_from_slice(&result);
    dek
}

/// Generate a random salt for key derivation.
pub fn generate_salt() -> [u8; 32] {
    let salt_string = SaltString::generate(&mut OsRng);
    let salt_bytes = salt_string.as_str().as_bytes();
    let mut salt = [0u8; 32];
    let len = salt_bytes.len().min(32);
    salt[..len].copy_from_slice(&salt_bytes[..len]);
    salt
}

/// Generate random bytes.
pub fn generate_random_bytes<const N: usize>() -> [u8; N] {
    use rand::RngCore;
    let mut bytes = [0u8; N];
    OsRng.fill_bytes(&mut bytes);
    bytes
}

/// Key derivation errors.
#[derive(Debug, thiserror::Error)]
pub enum KeyDerivationError {
    #[error("Invalid Argon2 parameters: {0}")]
    InvalidParams(String),

    #[error("Argon2 error: {0}")]
    Argon2Error(String),

    #[error("HMAC error: {0}")]
    HmacError(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_keys() {
        let salt = generate_salt();
        let bundle = derive_keys("test-password", &salt, Some(&Argon2Params::fast())).unwrap();

        // Keys should be 32 bytes
        assert_eq!(bundle.user_secret.as_bytes().len(), 32);
        assert_eq!(bundle.metadata_key.len(), 32);
        assert_eq!(bundle.recovery_key.len(), 32);

        // Keys should be different from each other
        assert_ne!(bundle.user_secret.as_bytes(), &bundle.metadata_key);
        assert_ne!(bundle.metadata_key, bundle.recovery_key);
    }

    #[test]
    fn test_deterministic_derivation() {
        let salt = [42u8; 32];
        let bundle1 = derive_keys("password", &salt, Some(&Argon2Params::fast())).unwrap();
        let bundle2 = derive_keys("password", &salt, Some(&Argon2Params::fast())).unwrap();

        // Same password + salt = same keys
        assert_eq!(bundle1.user_secret.as_bytes(), bundle2.user_secret.as_bytes());
        assert_eq!(bundle1.metadata_key, bundle2.metadata_key);
    }

    #[test]
    fn test_derive_dek() {
        let user_secret = UserSecret::from_bytes([1u8; 32]);
        let content_hash = [2u8; 32];

        let dek1 = derive_dek(&user_secret, &content_hash);
        let dek2 = derive_dek(&user_secret, &content_hash);

        // Same inputs = same DEK (convergent)
        assert_eq!(dek1, dek2);
    }

    #[test]
    fn test_different_content_different_dek() {
        let user_secret = UserSecret::from_bytes([1u8; 32]);
        let hash1 = [2u8; 32];
        let hash2 = [3u8; 32];

        let dek1 = derive_dek(&user_secret, &hash1);
        let dek2 = derive_dek(&user_secret, &hash2);

        // Different content = different DEK
        assert_ne!(dek1, dek2);
    }
}
