# Encryption & Key Management

This document specifies the encryption architecture for Dits, including convergent encryption for deduplication, key derivation, storage, rotation, and recovery procedures.

## Encryption Goals

1. **Confidentiality**: Data encrypted at rest and in transit
2. **Deduplication**: Identical content produces identical ciphertext (convergent encryption)
3. **Key Management**: Secure key generation, storage, and rotation
4. **Zero-Knowledge Option**: Server cannot read content (end-to-end encryption mode)
5. **Recovery**: Key backup and recovery mechanisms

## Encryption Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
│                    (Dits Client)                                │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: User Encryption (Optional E2EE)                       │
│  - Per-repository master key                                    │
│  - User controls key                                            │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Convergent Encryption                                 │
│  - Content-derived keys                                         │
│  - Enables deduplication                                        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Transport Encryption                                  │
│  - TLS 1.3 / QUIC                                               │
│  - Server authentication                                        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 0: Storage Encryption                                    │
│  - Server-side encryption (S3 SSE)                              │
│  - Disk encryption                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Convergent Encryption

Convergent encryption allows identical plaintext to produce identical ciphertext, enabling deduplication while maintaining confidentiality.

### How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                    Convergent Encryption                         │
│                                                                  │
│  Plaintext ──┬──> Hash(Plaintext) ──> Content Key               │
│              │                              │                    │
│              │                              v                    │
│              └────────────────────────> Encrypt ──> Ciphertext   │
│                                                                  │
│  Same plaintext = Same key = Same ciphertext = Deduplication    │
└──────────────────────────────────────────────────────────────────┘
```

### Key Derivation

```rust
use blake3::Hasher;
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};

/// Derive encryption key from content
pub fn derive_content_key(content: &[u8]) -> [u8; 32] {
    // Use BLAKE3 in keyed mode for key derivation
    let mut hasher = Hasher::new_derive_key("dits convergent encryption v1");
    hasher.update(content);
    *hasher.finalize().as_bytes()
}

/// Derive nonce from content hash (deterministic)
pub fn derive_nonce(content_hash: &[u8; 32]) -> [u8; 12] {
    let mut hasher = Hasher::new_derive_key("dits convergent nonce v1");
    hasher.update(content_hash);
    let hash = hasher.finalize();
    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&hash.as_bytes()[0..12]);
    nonce
}

/// Encrypt chunk with convergent encryption
pub fn encrypt_chunk(plaintext: &[u8]) -> Result<EncryptedChunk, CryptoError> {
    // Derive key from content
    let content_key = derive_content_key(plaintext);

    // Hash for addressing (before encryption)
    let content_hash = blake3::hash(plaintext);

    // Derive deterministic nonce
    let nonce = derive_nonce(content_hash.as_bytes());

    // Encrypt with ChaCha20-Poly1305
    let cipher = ChaCha20Poly1305::new(Key::from_slice(&content_key));
    let ciphertext = cipher.encrypt(Nonce::from_slice(&nonce), plaintext)?;

    Ok(EncryptedChunk {
        hash: *content_hash.as_bytes(),
        ciphertext,
        // Note: Key is NOT stored - derived from content
    })
}

/// Decrypt chunk
pub fn decrypt_chunk(encrypted: &EncryptedChunk, content_key: &[u8; 32]) -> Result<Vec<u8>, CryptoError> {
    let nonce = derive_nonce(&encrypted.hash);
    let cipher = ChaCha20Poly1305::new(Key::from_slice(content_key));
    let plaintext = cipher.decrypt(Nonce::from_slice(&nonce), encrypted.ciphertext.as_ref())?;
    Ok(plaintext)
}
```

### Security Considerations

**Vulnerability 1 - Confirmation Attacks**: Convergent encryption is vulnerable to confirmation attacks - an attacker with a suspected plaintext can verify if it exists in the system.

**Vulnerability 2 - Deterministic Nonces**: The convergent encryption scheme above uses deterministic nonces derived from the content hash. While this is necessary for deduplication, it has security implications:
- **Nonce reuse is intentional** for convergent encryption (same content = same ciphertext)
- Using deterministic nonces with ChaCha20-Poly1305 is safe **only when** the key is also derived from content (as above)
- If the same nonce were ever reused with different keys, it would be catastrophic
- This scheme provides **confidentiality** but not **nonce-misuse resistance**

**Important**: Do NOT use this convergent encryption scheme with keys that are not derived from the content itself. For user-provided keys or random keys, always use random nonces.

For applications requiring nonce-misuse resistance, consider using AES-GCM-SIV or XChaCha20-Poly1305 with random nonces instead.

**Mitigation for confirmation attacks**: Add a user-specific secret to the key derivation:

```rust
/// Enhanced convergent encryption with user secret
pub fn derive_content_key_secure(
    content: &[u8],
    user_secret: &[u8; 32],
) -> [u8; 32] {
    let mut hasher = Hasher::new_keyed(user_secret);
    hasher.update(b"dits convergent encryption v1");
    hasher.update(content);
    *hasher.finalize().as_bytes()
}
```

This prevents cross-user deduplication but maintains intra-user deduplication.

## Key Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        Root Key                                 │
│                    (User Password)                              │
│                          │                                      │
│                          v                                      │
│                ┌─────────────────┐                              │
│                │   Master Key    │                              │
│                │  (Argon2id KDF) │                              │
│                └────────┬────────┘                              │
│                         │                                       │
│         ┌───────────────┼───────────────┐                       │
│         v               v               v                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Repository  │ │ Repository  │ │  Recovery   │               │
│  │   Key 1     │ │   Key 2     │ │    Keys     │               │
│  └──────┬──────┘ └──────┬──────┘ └─────────────┘               │
│         │               │                                       │
│         v               v                                       │
│  ┌─────────────┐ ┌─────────────┐                               │
│  │   Chunk     │ │   Chunk     │                               │
│  │   Keys      │ │   Keys      │                               │
│  │ (Convergent)│ │ (Convergent)│                               │
│  └─────────────┘ └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

## Master Key Derivation

### Password-Based Key Derivation

```rust
use argon2::{Argon2, Algorithm, Version, Params};

/// Argon2id parameters (OWASP recommendations for 2024)
pub const ARGON2_MEMORY_KB: u32 = 65536;     // 64 MB
pub const ARGON2_ITERATIONS: u32 = 3;
pub const ARGON2_PARALLELISM: u32 = 4;
pub const ARGON2_OUTPUT_LEN: usize = 32;

pub struct MasterKeyDerivation {
    pub salt: [u8; 32],
    pub params: Argon2Params,
}

/// Derive master key from password
pub fn derive_master_key(
    password: &[u8],
    salt: &[u8; 32],
) -> Result<[u8; 32], CryptoError> {
    let params = Params::new(
        ARGON2_MEMORY_KB,
        ARGON2_ITERATIONS,
        ARGON2_PARALLELISM,
        Some(ARGON2_OUTPUT_LEN),
    )?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut master_key = [0u8; 32];
    argon2.hash_password_into(password, salt, &mut master_key)?;

    Ok(master_key)
}

/// Generate a new salt
pub fn generate_salt() -> [u8; 32] {
    let mut salt = [0u8; 32];
    getrandom::getrandom(&mut salt).expect("Failed to generate random salt");
    salt
}
```

### Key Stretching for Weak Passwords

```rust
/// Additional key stretching for detected weak passwords
pub fn stretch_weak_password(
    password: &[u8],
    salt: &[u8; 32],
) -> Result<[u8; 32], CryptoError> {
    // Higher parameters for weak passwords
    let params = Params::new(
        131072,  // 128 MB
        5,       // More iterations
        4,
        Some(32),
    )?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; 32];
    argon2.hash_password_into(password, salt, &mut key)?;

    Ok(key)
}
```

## Repository Key Management

### Repository Key Structure

```rust
pub struct RepositoryKeys {
    /// Repository encryption key (encrypts chunk keys)
    pub encryption_key: [u8; 32],

    /// Repository signing key (signs commits)
    pub signing_key: Ed25519PrivateKey,

    /// Key version for rotation
    pub version: u32,

    /// Creation timestamp
    pub created_at: DateTime<Utc>,

    /// Optional: Key expiry
    pub expires_at: Option<DateTime<Utc>>,
}

/// Encrypted repository key bundle (stored on server)
pub struct EncryptedRepositoryKeys {
    /// Key version
    pub version: u32,

    /// Encrypted key material
    pub ciphertext: Vec<u8>,

    /// Nonce used for encryption
    pub nonce: [u8; 24],  // XChaCha20-Poly1305

    /// Salt for KDF (if password-derived)
    pub kdf_salt: Option<[u8; 32]>,

    /// KDF parameters
    pub kdf_params: Option<Argon2Params>,

    /// Key ID of wrapping key
    pub wrapped_by: KeyId,
}
```

### Key Generation

```rust
use ed25519_dalek::SigningKey;
use rand::rngs::OsRng;

/// Generate new repository keys
pub fn generate_repository_keys() -> RepositoryKeys {
    let mut encryption_key = [0u8; 32];
    OsRng.fill_bytes(&mut encryption_key);

    let signing_key = SigningKey::generate(&mut OsRng);

    RepositoryKeys {
        encryption_key,
        signing_key,
        version: 1,
        created_at: Utc::now(),
        expires_at: None,
    }
}

/// Wrap repository keys with master key
pub fn wrap_repository_keys(
    repo_keys: &RepositoryKeys,
    master_key: &[u8; 32],
) -> Result<EncryptedRepositoryKeys, CryptoError> {
    // Serialize keys
    let plaintext = serialize_keys(repo_keys)?;

    // Generate nonce
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);

    // Encrypt with XChaCha20-Poly1305
    let cipher = XChaCha20Poly1305::new(Key::from_slice(master_key));
    let ciphertext = cipher.encrypt(XNonce::from_slice(&nonce), plaintext.as_ref())?;

    Ok(EncryptedRepositoryKeys {
        version: repo_keys.version,
        ciphertext,
        nonce,
        kdf_salt: None,  // Master key already derived
        kdf_params: None,
        wrapped_by: KeyId::MasterKey,
    })
}
```

## Chunk Key Management

### Key Wrapping

Content keys (derived from plaintext) are wrapped with repository key:

```rust
/// Wrapped chunk key (stored in manifest)
pub struct WrappedChunkKey {
    /// Chunk hash (content address)
    pub chunk_hash: [u8; 32],

    /// Encrypted content key
    pub wrapped_key: [u8; 48],  // 32 bytes key + 16 bytes auth tag

    /// Nonce for key encryption
    pub nonce: [u8; 12],
}

/// Wrap a content key with repository key
pub fn wrap_chunk_key(
    content_key: &[u8; 32],
    chunk_hash: &[u8; 32],
    repo_key: &[u8; 32],
) -> WrappedChunkKey {
    let mut nonce = [0u8; 12];
    OsRng.fill_bytes(&mut nonce);

    let cipher = ChaCha20Poly1305::new(Key::from_slice(repo_key));
    let wrapped = cipher.encrypt(
        Nonce::from_slice(&nonce),
        content_key.as_ref(),
    ).expect("encryption failed");

    WrappedChunkKey {
        chunk_hash: *chunk_hash,
        wrapped_key: wrapped.try_into().expect("wrong size"),
        nonce,
    }
}

/// Unwrap a content key
pub fn unwrap_chunk_key(
    wrapped: &WrappedChunkKey,
    repo_key: &[u8; 32],
) -> Result<[u8; 32], CryptoError> {
    let cipher = ChaCha20Poly1305::new(Key::from_slice(repo_key));
    let content_key = cipher.decrypt(
        Nonce::from_slice(&wrapped.nonce),
        wrapped.wrapped_key.as_ref(),
    )?;

    Ok(content_key.try_into().expect("wrong size"))
}
```

### Manifest Key Storage

```rust
/// Encrypted manifest with key table
pub struct EncryptedManifest {
    /// Manifest version
    pub version: u32,

    /// Wrapped chunk keys (sparse - only for encrypted chunks)
    pub key_table: Vec<WrappedChunkKey>,

    /// Encrypted manifest content
    pub ciphertext: Vec<u8>,

    /// Manifest encryption nonce
    pub nonce: [u8; 24],
}
```

## Key Storage

### Local Key Storage

Keys are stored in the user's home directory:

```
~/.dits/
├── keys/
│   ├── master.key.enc     # Encrypted master key (password-protected)
│   ├── master.salt        # Salt for password derivation
│   ├── repos/
│   │   ├── {repo-id}.key.enc   # Per-repository keys
│   │   └── ...
│   └── recovery/
│       ├── recovery.pub   # Recovery public key
│       └── shares/        # Shamir shares (if enabled)
├── config.toml            # Key management configuration
└── agent.sock             # Key agent socket
```

### Master Key File Format

```rust
/// Master key file structure
pub struct MasterKeyFile {
    /// File format version
    pub version: u8,

    /// Salt for password derivation
    pub salt: [u8; 32],

    /// Argon2 parameters
    pub argon2_memory: u32,
    pub argon2_iterations: u32,
    pub argon2_parallelism: u32,

    /// Encrypted master key
    pub encrypted_key: [u8; 48],  // 32 + 16 auth tag

    /// Nonce for encryption
    pub nonce: [u8; 24],

    /// Key fingerprint (for verification)
    pub fingerprint: [u8; 8],
}

impl MasterKeyFile {
    pub fn create(password: &[u8]) -> Result<(Self, [u8; 32]), CryptoError> {
        let salt = generate_salt();
        let password_key = derive_master_key(password, &salt)?;

        // Generate actual master key
        let mut master_key = [0u8; 32];
        OsRng.fill_bytes(&mut master_key);

        // Encrypt master key with password-derived key
        let mut nonce = [0u8; 24];
        OsRng.fill_bytes(&mut nonce);

        let cipher = XChaCha20Poly1305::new(Key::from_slice(&password_key));
        let encrypted = cipher.encrypt(
            XNonce::from_slice(&nonce),
            master_key.as_ref(),
        )?;

        // Compute fingerprint
        let fingerprint = compute_fingerprint(&master_key);

        Ok((
            Self {
                version: 1,
                salt,
                argon2_memory: ARGON2_MEMORY_KB,
                argon2_iterations: ARGON2_ITERATIONS,
                argon2_parallelism: ARGON2_PARALLELISM,
                encrypted_key: encrypted.try_into().unwrap(),
                nonce,
                fingerprint,
            },
            master_key,
        ))
    }

    pub fn unlock(&self, password: &[u8]) -> Result<[u8; 32], CryptoError> {
        // Derive password key
        let password_key = derive_master_key_with_params(
            password,
            &self.salt,
            self.argon2_memory,
            self.argon2_iterations,
            self.argon2_parallelism,
        )?;

        // Decrypt master key
        let cipher = XChaCha20Poly1305::new(Key::from_slice(&password_key));
        let master_key = cipher.decrypt(
            XNonce::from_slice(&self.nonce),
            self.encrypted_key.as_ref(),
        )?;

        let master_key: [u8; 32] = master_key.try_into().unwrap();

        // Verify fingerprint
        let fingerprint = compute_fingerprint(&master_key);
        if fingerprint != self.fingerprint {
            return Err(CryptoError::FingerprintMismatch);
        }

        Ok(master_key)
    }
}

fn compute_fingerprint(key: &[u8; 32]) -> [u8; 8] {
    let hash = blake3::hash(key);
    let mut fp = [0u8; 8];
    fp.copy_from_slice(&hash.as_bytes()[0..8]);
    fp
}
```

### Key Agent

Long-running process that caches decrypted keys:

```rust
pub struct KeyAgent {
    /// Cached master key
    master_key: Option<SecretKey>,

    /// Cached repository keys
    repo_keys: HashMap<Uuid, RepositoryKeys>,

    /// Key cache TTL
    ttl: Duration,

    /// Last activity timestamp
    last_activity: Instant,
}

impl KeyAgent {
    /// Start the key agent
    pub fn start(socket_path: &Path) -> Result<Self, AgentError> {
        let listener = UnixListener::bind(socket_path)?;

        // Set restrictive permissions
        std::fs::set_permissions(socket_path, Permissions::from_mode(0o600))?;

        // Handle requests
        for stream in listener.incoming() {
            let stream = stream?;
            self.handle_request(stream)?;
        }

        Ok(Self {
            master_key: None,
            repo_keys: HashMap::new(),
            ttl: Duration::from_secs(3600),  // 1 hour
            last_activity: Instant::now(),
        })
    }

    /// Add master key to cache
    pub fn add_master_key(&mut self, key: [u8; 32]) {
        self.master_key = Some(SecretKey::new(key));
        self.last_activity = Instant::now();
    }

    /// Get cached master key
    pub fn get_master_key(&self) -> Option<&[u8; 32]> {
        if self.last_activity.elapsed() > self.ttl {
            return None;  // Expired
        }
        self.master_key.as_ref().map(|k| k.expose())
    }

    /// Lock agent (clear all keys)
    pub fn lock(&mut self) {
        if let Some(ref mut key) = self.master_key {
            key.zeroize();
        }
        self.master_key = None;

        for (_, ref mut keys) in self.repo_keys.iter_mut() {
            keys.zeroize();
        }
        self.repo_keys.clear();
    }
}

/// Secure key wrapper that zeroizes on drop
pub struct SecretKey([u8; 32]);

impl SecretKey {
    pub fn new(key: [u8; 32]) -> Self {
        Self(key)
    }

    pub fn expose(&self) -> &[u8; 32] {
        &self.0
    }
}

impl Drop for SecretKey {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}

impl Zeroize for SecretKey {
    fn zeroize(&mut self) {
        self.0.zeroize();
    }
}
```

## Key Rotation

### Repository Key Rotation

```rust
/// Rotate repository encryption key
pub async fn rotate_repository_key(
    repo: &Repository,
    old_key: &RepositoryKeys,
) -> Result<RepositoryKeys, KeyError> {
    // Generate new keys
    let new_keys = generate_repository_keys();
    new_keys.version = old_key.version + 1;

    // Re-wrap all chunk keys with new key
    let manifests = repo.list_manifests().await?;

    for manifest in manifests {
        let decrypted = manifest.decrypt(&old_key.encryption_key)?;

        // Re-encrypt key table
        let new_key_table: Vec<_> = decrypted.key_table
            .iter()
            .map(|wrapped| {
                let content_key = unwrap_chunk_key(wrapped, &old_key.encryption_key)?;
                wrap_chunk_key(&content_key, &wrapped.chunk_hash, &new_keys.encryption_key)
            })
            .collect::<Result<_, _>>()?;

        // Store updated manifest
        let new_manifest = EncryptedManifest {
            version: decrypted.version,
            key_table: new_key_table,
            ciphertext: encrypt_manifest_content(&decrypted.content, &new_keys.encryption_key)?,
            nonce: generate_nonce(),
        };

        repo.store_manifest(&new_manifest).await?;
    }

    // Store new repository keys
    let wrapped = wrap_repository_keys(&new_keys, &repo.master_key()?)?;
    repo.store_repository_keys(&wrapped).await?;

    // Mark old keys as superseded (keep for historical access)
    repo.archive_old_key(old_key.version).await?;

    Ok(new_keys)
}
```

### Automatic Rotation Policy

```toml
# .dits/config
[keys]
# Automatic key rotation
auto_rotate = true
rotation_interval_days = 365

# Key expiry warning
expiry_warning_days = 30

# Force rotation on team member removal
rotate_on_member_removal = true
```

## Key Recovery

### Recovery Key Setup

```rust
/// Generate recovery key pair
pub fn setup_recovery() -> Result<(RecoveryPublicKey, RecoveryPrivateKey), CryptoError> {
    let private = x25519_dalek::StaticSecret::random_from_rng(OsRng);
    let public = x25519_dalek::PublicKey::from(&private);

    Ok((
        RecoveryPublicKey(public),
        RecoveryPrivateKey(private),
    ))
}

/// Encrypt master key with recovery key
pub fn create_recovery_blob(
    master_key: &[u8; 32],
    recovery_public: &RecoveryPublicKey,
) -> Result<RecoveryBlob, CryptoError> {
    // Generate ephemeral keypair
    let ephemeral_secret = x25519_dalek::StaticSecret::random_from_rng(OsRng);
    let ephemeral_public = x25519_dalek::PublicKey::from(&ephemeral_secret);

    // ECDH
    let shared_secret = ephemeral_secret.diffie_hellman(&recovery_public.0);

    // Derive encryption key
    let mut hasher = Hasher::new_derive_key("dits recovery encryption v1");
    hasher.update(shared_secret.as_bytes());
    let encryption_key = hasher.finalize();

    // Encrypt master key
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);

    let cipher = XChaCha20Poly1305::new(Key::from_slice(encryption_key.as_bytes()));
    let ciphertext = cipher.encrypt(XNonce::from_slice(&nonce), master_key.as_ref())?;

    Ok(RecoveryBlob {
        ephemeral_public: *ephemeral_public.as_bytes(),
        nonce,
        ciphertext,
    })
}

/// Recover master key using recovery private key
pub fn recover_master_key(
    blob: &RecoveryBlob,
    recovery_private: &RecoveryPrivateKey,
) -> Result<[u8; 32], CryptoError> {
    let ephemeral_public = x25519_dalek::PublicKey::from(blob.ephemeral_public);

    // ECDH
    let shared_secret = recovery_private.0.diffie_hellman(&ephemeral_public);

    // Derive encryption key
    let mut hasher = Hasher::new_derive_key("dits recovery encryption v1");
    hasher.update(shared_secret.as_bytes());
    let encryption_key = hasher.finalize();

    // Decrypt master key
    let cipher = XChaCha20Poly1305::new(Key::from_slice(encryption_key.as_bytes()));
    let master_key = cipher.decrypt(
        XNonce::from_slice(&blob.nonce),
        blob.ciphertext.as_ref(),
    )?;

    Ok(master_key.try_into().unwrap())
}
```

### Shamir Secret Sharing

Split master key for distributed recovery:

```rust
use sharks::{Share, Sharks};

/// Split master key into shares
pub fn split_master_key(
    master_key: &[u8; 32],
    threshold: u8,
    total_shares: u8,
) -> Result<Vec<KeyShare>, CryptoError> {
    if threshold > total_shares {
        return Err(CryptoError::InvalidThreshold);
    }

    let sharks = Sharks(threshold);
    let dealer = sharks.dealer(master_key);

    let shares: Vec<Share> = dealer.take(total_shares as usize).collect();

    Ok(shares.into_iter().map(|s| KeyShare {
        index: s.x,
        data: s.y.clone(),
    }).collect())
}

/// Reconstruct master key from shares
pub fn reconstruct_master_key(shares: &[KeyShare]) -> Result<[u8; 32], CryptoError> {
    let shark_shares: Vec<Share> = shares.iter()
        .map(|s| Share::try_from(s.as_bytes()))
        .collect::<Result<_, _>>()?;

    let sharks = Sharks(shares.len() as u8);
    let secret = sharks.recover(&shark_shares)?;

    Ok(secret.try_into().unwrap())
}

pub struct KeyShare {
    pub index: u8,
    pub data: Vec<u8>,
}
```

### Recovery Workflow

```bash
# Setup recovery (one-time)
$ dits keys recovery setup
Generated recovery key pair.
Recovery public key stored in ~/.dits/keys/recovery.pub
Recovery private key (SAVE THIS SECURELY):
  dits-recovery-v1:xprv1qqqsyqcyq5r...

# Create Shamir shares for team
$ dits keys recovery share --threshold 3 --shares 5
Created 5 shares (3 required to recover):
  Share 1: dits-share-1-of-5:s1qqqsyqcyq5r...
  Share 2: dits-share-2-of-5:s2qqqsyqcyq5r...
  Share 3: dits-share-3-of-5:s3qqqsyqcyq5r...
  Share 4: dits-share-4-of-5:s4qqqsyqcyq5r...
  Share 5: dits-share-5-of-5:s5qqqsyqcyq5r...

Distribute these shares to trusted team members.

# Recovery (when password forgotten)
$ dits keys recover
Enter recovery private key: dits-recovery-v1:xprv1qqqsyqcyq5r...
Master key recovered successfully.
Enter new password: ********
Master key re-encrypted with new password.

# Or with Shamir shares
$ dits keys recover --shares
Enter share 1: dits-share-1-of-5:s1qqqsyqcyq5r...
Enter share 2: dits-share-3-of-5:s3qqqsyqcyq5r...
Enter share 3: dits-share-5-of-5:s5qqqsyqcyq5r...
Master key reconstructed successfully.
Enter new password: ********
```

## End-to-End Encryption Mode

### Zero-Knowledge Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client (Trusted)                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Plaintext → Encrypt(repo_key) → Ciphertext             │   │
│  │  Ciphertext → Decrypt(repo_key) → Plaintext             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           │ Only ciphertext crosses boundary    │
│                           ↓                                     │
├─────────────────────────────────────────────────────────────────┤
│                     Server (Untrusted)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Stores: Ciphertext, encrypted metadata                  │   │
│  │  Cannot: Decrypt content, read filenames (optional)      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### E2EE Configuration

```toml
# .dits/config
[encryption]
# Enable end-to-end encryption
e2ee = true

# Encrypt filenames (hides directory structure)
encrypt_filenames = true

# Encrypt commit messages
encrypt_messages = true

# Key derivation
kdf = "argon2id"
kdf_memory_mb = 64
kdf_iterations = 3
```

### Encrypted Metadata

```rust
/// Encrypted filename
pub struct EncryptedPath {
    /// Encrypted path bytes
    pub ciphertext: Vec<u8>,

    /// Nonce
    pub nonce: [u8; 12],

    /// Deterministic hash for lookups
    pub path_hash: [u8; 16],
}

impl EncryptedPath {
    pub fn encrypt(path: &str, repo_key: &[u8; 32]) -> Self {
        // Derive path encryption key
        let path_key = derive_path_key(repo_key);

        // Generate nonce
        let mut nonce = [0u8; 12];
        OsRng.fill_bytes(&mut nonce);

        // Encrypt
        let cipher = ChaCha20Poly1305::new(Key::from_slice(&path_key));
        let ciphertext = cipher.encrypt(
            Nonce::from_slice(&nonce),
            path.as_bytes(),
        ).unwrap();

        // Compute deterministic hash for lookups
        let path_hash = compute_path_hash(path, repo_key);

        Self {
            ciphertext,
            nonce,
            path_hash,
        }
    }

    pub fn decrypt(&self, repo_key: &[u8; 32]) -> Result<String, CryptoError> {
        let path_key = derive_path_key(repo_key);

        let cipher = ChaCha20Poly1305::new(Key::from_slice(&path_key));
        let plaintext = cipher.decrypt(
            Nonce::from_slice(&self.nonce),
            self.ciphertext.as_ref(),
        )?;

        Ok(String::from_utf8(plaintext)?)
    }
}
```

## Hardware Security Module (HSM) Support

### PKCS#11 Integration

```rust
use cryptoki::{context::Pkcs11, mechanism::Mechanism, object::Attribute};

pub struct HsmKeyManager {
    pkcs11: Pkcs11,
    session: Session,
    master_key_handle: ObjectHandle,
}

impl HsmKeyManager {
    /// Initialize with HSM
    pub fn new(library_path: &Path, pin: &str) -> Result<Self, HsmError> {
        let pkcs11 = Pkcs11::new(library_path)?;
        pkcs11.initialize(CInitializeArgs::OsThreads)?;

        let slot = pkcs11.get_slots_with_token()?.remove(0);
        let session = pkcs11.open_rw_session(slot)?;
        session.login(UserType::User, Some(pin))?;

        // Find or generate master key
        let master_key_handle = Self::find_or_generate_master_key(&session)?;

        Ok(Self {
            pkcs11,
            session,
            master_key_handle,
        })
    }

    /// Wrap a key using HSM
    pub fn wrap_key(&self, key: &[u8; 32]) -> Result<Vec<u8>, HsmError> {
        // Generate wrapping key in HSM
        let mechanism = Mechanism::AesKeyWrap;

        let wrapped = self.session.wrap_key(
            &mechanism,
            self.master_key_handle,
            key,
        )?;

        Ok(wrapped)
    }

    /// Unwrap a key using HSM
    pub fn unwrap_key(&self, wrapped: &[u8]) -> Result<[u8; 32], HsmError> {
        let mechanism = Mechanism::AesKeyWrap;

        let unwrapped = self.session.unwrap_key(
            &mechanism,
            self.master_key_handle,
            wrapped,
            &[
                Attribute::Class(ObjectClass::SECRET_KEY),
                Attribute::KeyType(KeyType::AES),
                Attribute::ValueLen(32.into()),
            ],
        )?;

        // Export key (if allowed by HSM policy)
        let value = self.session.get_attribute_value(
            unwrapped,
            &[AttributeType::Value],
        )?;

        Ok(value[0].try_into()?)
    }
}
```

## Security Best Practices

### Key Handling

1. **Memory Protection**
   ```rust
   // Use mlock to prevent key from being swapped
   use libc::{mlock, munlock};

   pub fn lock_memory(ptr: *const u8, len: usize) {
       unsafe { mlock(ptr as *const _, len); }
   }
   ```

2. **Secure Deletion**
   ```rust
   use zeroize::Zeroize;

   fn secure_delete_key(key: &mut [u8; 32]) {
       key.zeroize();
   }
   ```

3. **Timing-Safe Comparison**
   ```rust
   use subtle::ConstantTimeEq;

   fn verify_key(a: &[u8; 32], b: &[u8; 32]) -> bool {
       a.ct_eq(b).into()
   }
   ```

### Audit Logging

```rust
pub struct KeyAuditLog {
    pub timestamp: DateTime<Utc>,
    pub event: KeyEvent,
    pub key_id: KeyId,
    pub user: UserId,
    pub ip_address: IpAddr,
    pub success: bool,
}

pub enum KeyEvent {
    MasterKeyUnlock,
    MasterKeyLock,
    RepositoryKeyGenerate,
    RepositoryKeyRotate,
    RecoveryKeyUse,
    ShareCreate,
    ShareUse,
}
```

## CLI Commands

```bash
# Key management
dits keys init                    # Initialize key infrastructure
dits keys unlock                  # Unlock master key (enter password)
dits keys lock                    # Lock master key (clear from memory)
dits keys status                  # Show key status

# Password management
dits keys password change         # Change master password
dits keys password strength       # Check password strength

# Recovery
dits keys recovery setup          # Setup recovery key
dits keys recovery share          # Create Shamir shares
dits keys recover                 # Recover from backup

# Key rotation
dits keys rotate                  # Rotate repository key
dits keys rotate --all            # Rotate all keys

# Export/import (for migration)
dits keys export --encrypted      # Export keys (encrypted)
dits keys import                  # Import keys
```
