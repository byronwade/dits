//! Secure key storage with encrypted keystore.

use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{BufReader, BufWriter};
use std::path::{Path, PathBuf};

use super::keys::{KeyBundle, Argon2Params, derive_keys, generate_salt};
use super::encryption::{encrypt_with_key, decrypt_with_key};

/// Encrypted keystore stored on disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedKeyStore {
    /// Version for future compatibility.
    pub version: u32,
    /// Argon2 salt for key derivation.
    pub salt: [u8; 32],
    /// Argon2 parameters used.
    pub argon2_params: SerializableArgon2Params,
    /// Encrypted key bundle (contains user_secret, metadata_key, recovery_key).
    pub encrypted_bundle: Vec<u8>,
    /// Nonce used for bundle encryption.
    pub bundle_nonce: [u8; 12],
    /// When the keystore was created (Unix timestamp).
    pub created_at: u64,
    /// When the password was last changed (Unix timestamp).
    pub password_changed_at: u64,
}

/// Serializable version of Argon2Params.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerializableArgon2Params {
    pub memory_cost: u32,
    pub time_cost: u32,
    pub parallelism: u32,
}

impl From<&Argon2Params> for SerializableArgon2Params {
    fn from(params: &Argon2Params) -> Self {
        Self {
            memory_cost: params.memory_cost,
            time_cost: params.time_cost,
            parallelism: params.parallelism,
        }
    }
}

impl From<&SerializableArgon2Params> for Argon2Params {
    fn from(params: &SerializableArgon2Params) -> Self {
        Self {
            memory_cost: params.memory_cost,
            time_cost: params.time_cost,
            parallelism: params.parallelism,
        }
    }
}

/// Key bundle data for serialization.
#[derive(Debug, Serialize, Deserialize)]
struct KeyBundleData {
    user_secret: [u8; 32],
    metadata_key: [u8; 32],
    recovery_key: [u8; 32],
}

/// Manages secure key storage.
pub struct KeyStore {
    /// Path to the keystore file.
    path: PathBuf,
}

impl KeyStore {
    /// Create a new keystore manager.
    pub fn new(dits_dir: &Path) -> Self {
        Self {
            path: dits_dir.join("keystore.enc"),
        }
    }

    /// Create a new keystore at a specific path.
    pub fn at_path(path: PathBuf) -> Self {
        Self { path }
    }

    /// Check if a keystore exists.
    pub fn exists(&self) -> bool {
        self.path.exists()
    }

    /// Get the keystore path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Create a new keystore with a password.
    ///
    /// This generates a new salt and derives keys from the password,
    /// then encrypts and stores the key bundle.
    pub fn create(&self, password: &str, params: Option<&Argon2Params>) -> Result<KeyBundle, KeyStoreError> {
        if self.exists() {
            return Err(KeyStoreError::AlreadyExists);
        }

        let params = params.cloned().unwrap_or_default();
        let salt = generate_salt();

        // Derive keys from password
        let bundle = derive_keys(password, &salt, Some(&params))
            .map_err(|e| KeyStoreError::KeyDerivation(e.to_string()))?;

        // Serialize the bundle
        let bundle_data = KeyBundleData {
            user_secret: *bundle.user_secret.as_bytes(),
            metadata_key: bundle.metadata_key,
            recovery_key: bundle.recovery_key,
        };
        let plaintext = serde_json::to_vec(&bundle_data)
            .map_err(|e| KeyStoreError::Serialization(e.to_string()))?;

        // Derive encryption key from root key (using the salt again with different info)
        let mut enc_key = [0u8; 32];
        let argon2 = argon2::Argon2::new(
            argon2::Algorithm::Argon2id,
            argon2::Version::V0x13,
            argon2::Params::new(
                params.memory_cost,
                params.time_cost,
                params.parallelism,
                Some(32),
            ).map_err(|e| KeyStoreError::KeyDerivation(e.to_string()))?,
        );
        argon2.hash_password_into(
            format!("{}:keystore", password).as_bytes(),
            &salt,
            &mut enc_key,
        ).map_err(|e| KeyStoreError::KeyDerivation(e.to_string()))?;

        // Encrypt the bundle
        let (encrypted_bundle, nonce) = encrypt_with_key(&plaintext, &enc_key)
            .map_err(|e| KeyStoreError::Encryption(e.to_string()))?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let store = EncryptedKeyStore {
            version: 1,
            salt,
            argon2_params: SerializableArgon2Params::from(&params),
            encrypted_bundle,
            bundle_nonce: nonce,
            created_at: now,
            password_changed_at: now,
        };

        // Write to disk
        self.save(&store)?;

        Ok(bundle)
    }

    /// Load and decrypt a keystore with the password.
    pub fn load(&self, password: &str) -> Result<KeyBundle, KeyStoreError> {
        let store = self.read()?;

        // Reconstruct Argon2 params
        let params = Argon2Params::from(&store.argon2_params);

        // Derive encryption key
        let mut enc_key = [0u8; 32];
        let argon2 = argon2::Argon2::new(
            argon2::Algorithm::Argon2id,
            argon2::Version::V0x13,
            argon2::Params::new(
                params.memory_cost,
                params.time_cost,
                params.parallelism,
                Some(32),
            ).map_err(|e| KeyStoreError::KeyDerivation(e.to_string()))?,
        );
        argon2.hash_password_into(
            format!("{}:keystore", password).as_bytes(),
            &store.salt,
            &mut enc_key,
        ).map_err(|e| KeyStoreError::KeyDerivation(e.to_string()))?;

        // Decrypt the bundle
        let plaintext = decrypt_with_key(&store.encrypted_bundle, &enc_key, &store.bundle_nonce)
            .map_err(|_| KeyStoreError::WrongPassword)?;

        // Deserialize
        let bundle_data: KeyBundleData = serde_json::from_slice(&plaintext)
            .map_err(|e| KeyStoreError::Serialization(e.to_string()))?;

        Ok(KeyBundle {
            user_secret: super::keys::UserSecret::from_bytes(bundle_data.user_secret),
            metadata_key: bundle_data.metadata_key,
            recovery_key: bundle_data.recovery_key,
        })
    }

    /// Change the password for an existing keystore.
    pub fn change_password(
        &self,
        old_password: &str,
        new_password: &str,
        new_params: Option<&Argon2Params>,
    ) -> Result<(), KeyStoreError> {
        // Load existing bundle with old password
        let bundle = self.load(old_password)?;

        // Delete old keystore
        fs::remove_file(&self.path)
            .map_err(|e| KeyStoreError::Io(e.to_string()))?;

        // Create new keystore with new password
        let params = new_params.cloned().unwrap_or_default();
        let salt = generate_salt();

        let bundle_data = KeyBundleData {
            user_secret: *bundle.user_secret.as_bytes(),
            metadata_key: bundle.metadata_key,
            recovery_key: bundle.recovery_key,
        };
        let plaintext = serde_json::to_vec(&bundle_data)
            .map_err(|e| KeyStoreError::Serialization(e.to_string()))?;

        // Derive new encryption key
        let mut enc_key = [0u8; 32];
        let argon2 = argon2::Argon2::new(
            argon2::Algorithm::Argon2id,
            argon2::Version::V0x13,
            argon2::Params::new(
                params.memory_cost,
                params.time_cost,
                params.parallelism,
                Some(32),
            ).map_err(|e| KeyStoreError::KeyDerivation(e.to_string()))?,
        );
        argon2.hash_password_into(
            format!("{}:keystore", new_password).as_bytes(),
            &salt,
            &mut enc_key,
        ).map_err(|e| KeyStoreError::KeyDerivation(e.to_string()))?;

        // Encrypt with new key
        let (encrypted_bundle, nonce) = encrypt_with_key(&plaintext, &enc_key)
            .map_err(|e| KeyStoreError::Encryption(e.to_string()))?;

        let old_store = self.read().ok();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let store = EncryptedKeyStore {
            version: 1,
            salt,
            argon2_params: SerializableArgon2Params::from(&params),
            encrypted_bundle,
            bundle_nonce: nonce,
            created_at: old_store.map(|s| s.created_at).unwrap_or(now),
            password_changed_at: now,
        };

        self.save(&store)?;

        Ok(())
    }

    /// Read the encrypted keystore from disk.
    fn read(&self) -> Result<EncryptedKeyStore, KeyStoreError> {
        if !self.exists() {
            return Err(KeyStoreError::NotFound);
        }

        let file = File::open(&self.path)
            .map_err(|e| KeyStoreError::Io(e.to_string()))?;
        let reader = BufReader::new(file);
        serde_json::from_reader(reader)
            .map_err(|e| KeyStoreError::Serialization(e.to_string()))
    }

    /// Save the encrypted keystore to disk.
    fn save(&self, store: &EncryptedKeyStore) -> Result<(), KeyStoreError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| KeyStoreError::Io(e.to_string()))?;
        }

        let file = File::create(&self.path)
            .map_err(|e| KeyStoreError::Io(e.to_string()))?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, store)
            .map_err(|e| KeyStoreError::Serialization(e.to_string()))
    }

    /// Delete the keystore.
    pub fn delete(&self) -> Result<(), KeyStoreError> {
        if !self.exists() {
            return Err(KeyStoreError::NotFound);
        }

        fs::remove_file(&self.path)
            .map_err(|e| KeyStoreError::Io(e.to_string()))
    }
}

/// Keystore errors.
#[derive(Debug, thiserror::Error)]
pub enum KeyStoreError {
    #[error("Keystore already exists")]
    AlreadyExists,

    #[error("Keystore not found")]
    NotFound,

    #[error("Wrong password")]
    WrongPassword,

    #[error("Key derivation error: {0}")]
    KeyDerivation(String),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("IO error: {0}")]
    Io(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_create_and_load() {
        let dir = tempdir().unwrap();
        let keystore = KeyStore::new(dir.path());

        // Create keystore
        let bundle1 = keystore.create("test-password", Some(&Argon2Params::fast())).unwrap();

        // Load keystore
        let bundle2 = keystore.load("test-password").unwrap();

        // Keys should match
        assert_eq!(bundle1.user_secret.as_bytes(), bundle2.user_secret.as_bytes());
        assert_eq!(bundle1.metadata_key, bundle2.metadata_key);
        assert_eq!(bundle1.recovery_key, bundle2.recovery_key);
    }

    #[test]
    fn test_wrong_password() {
        let dir = tempdir().unwrap();
        let keystore = KeyStore::new(dir.path());

        keystore.create("correct-password", Some(&Argon2Params::fast())).unwrap();

        let result = keystore.load("wrong-password");
        assert!(matches!(result, Err(KeyStoreError::WrongPassword)));
    }

    #[test]
    fn test_already_exists() {
        let dir = tempdir().unwrap();
        let keystore = KeyStore::new(dir.path());

        keystore.create("password", Some(&Argon2Params::fast())).unwrap();

        let result = keystore.create("password", Some(&Argon2Params::fast()));
        assert!(matches!(result, Err(KeyStoreError::AlreadyExists)));
    }

    #[test]
    fn test_change_password() {
        let dir = tempdir().unwrap();
        let keystore = KeyStore::new(dir.path());

        let bundle1 = keystore.create("old-password", Some(&Argon2Params::fast())).unwrap();

        keystore.change_password("old-password", "new-password", Some(&Argon2Params::fast())).unwrap();

        // Old password should fail
        let result = keystore.load("old-password");
        assert!(matches!(result, Err(KeyStoreError::WrongPassword)));

        // New password should work and keys should be the same
        let bundle2 = keystore.load("new-password").unwrap();
        assert_eq!(bundle1.user_secret.as_bytes(), bundle2.user_secret.as_bytes());
    }

    #[test]
    fn test_delete() {
        let dir = tempdir().unwrap();
        let keystore = KeyStore::new(dir.path());

        keystore.create("password", Some(&Argon2Params::fast())).unwrap();
        assert!(keystore.exists());

        keystore.delete().unwrap();
        assert!(!keystore.exists());
    }
}
