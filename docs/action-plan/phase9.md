# Engineering Execution Manual — Phase 9 (The Black Box)

**Project:** Dits (Data-Intensive Version Control System)
**Phase:** 9 — The Black Box (Security & Encryption)
**Objective:** Enterprise-grade client-side encryption with convergent deduplication, RBAC-managed keys, audit logging, and compliance-ready architecture for media workflows handling sensitive content.

---

## Alignment with README (core ground rules)
- Preserve CAS semantics: encryption must retain stable content hashes (BLAKE3) for dedup, while keys remain client-controlled.
- Avoid weakening safety: authenticated encryption (AES-GCM) with clear threat model; no silent downgrade or weak ciphers.
- Keep manifests/paths privacy-aware (metadata key) without breaking commit/tree integrity.
- Prefer open, auditable crypto; document defaults and migration paths; comply with performance targets (minimal overhead).
- Leave hooks for remote auth/ACL integration (tokens/headers) introduced in Phase 3, aligned with RBAC and audit logging.

---

## Core Problem: Security vs. Deduplication Tradeoff

Traditional encryption breaks deduplication because identical plaintext produces different ciphertext (due to random IVs). Convergent encryption solves this by deriving encryption keys from content, enabling deduplication while preserving confidentiality.

**Threat Model:**
- Protect content from unauthorized server access (compromised infrastructure)
- Protect content from unauthorized client access (stolen credentials)
- Maintain audit trail for compliance (MPAA, SOC2, HIPAA for medical imaging)
- Enable secure collaboration without exposing raw keys to collaborators

---

## Cryptographic Architecture

### Convergent Encryption Scheme

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Plaintext Chunk ──┬──► BLAKE3(chunk) ──► Content Hash (CH)     │
│                    │                                             │
│                    └──► HMAC-SHA256(User_Secret, CH) ──► DEK    │
│                                                                  │
│  DEK + Plaintext ──► AES-256-GCM ──► Ciphertext + Auth Tag      │
│                                                                  │
│  Storage: { CH: encrypted_blob, nonce, tag }                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Derivation:**
1. **Content Hash (CH):** `BLAKE3(plaintext_chunk)` — used for deduplication lookup
2. **Data Encryption Key (DEK):** `HMAC-SHA256(user_secret, CH)` — derived per-chunk
3. **Encryption:** `AES-256-GCM(DEK, plaintext, nonce)` — authenticated encryption

**Why This Works:**
- Same content → same CH → same DEK → same ciphertext (dedup preserved)
- Without `user_secret`, server cannot derive DEK from CH
- GCM provides authentication (tamper detection)

### Key Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                      KEY HIERARCHY                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Root Key (RK)                                                   │
│  └── Derived from user password via Argon2id                    │
│      │                                                           │
│      ├── User Secret (US)                                        │
│      │   └── HKDF(RK, "dits-user-secret")                       │
│      │   └── Used for convergent DEK derivation                 │
│      │                                                           │
│      ├── Metadata Key (MK)                                       │
│      │   └── HKDF(RK, "dits-metadata-key")                      │
│      │   └── Encrypts manifests, commit messages, paths         │
│      │                                                           │
│      └── Recovery Key (RecK)                                     │
│          └── HKDF(RK, "dits-recovery-key")                      │
│          └── Encrypts key escrow blob for admin recovery        │
│                                                                  │
│  Project Key (PK) — per-repository                              │
│  └── Random 256-bit, encrypted with each member's US            │
│  └── Enables team deduplication within project                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack (Cryptography Layer)

| Component | Library | Role |
| :--- | :--- | :--- |
| Password KDF | `argon2` | Memory-hard key derivation from password |
| Key derivation | `hkdf` (via `ring` or `rust-crypto`) | Derive sub-keys from root |
| Symmetric encryption | `aes-gcm` | Authenticated chunk encryption |
| HMAC | `hmac` + `sha2` | Convergent key derivation |
| Secure random | `rand` + `getrandom` | Nonce generation, key generation |
| Key wrapping | `aes-kw` | Wrap project keys for distribution |
| Secure memory | `zeroize` | Clear sensitive data from RAM |

---

## Implementation Sprints

### Sprint 1: Key Management Foundation

**Objective:** Implement key derivation, storage, and lifecycle.

**Data Structures:**
```rust
use zeroize::Zeroize;

#[derive(Zeroize)]
#[zeroize(drop)]
pub struct RootKey([u8; 32]);

#[derive(Zeroize)]
#[zeroize(drop)]
pub struct UserSecret([u8; 32]);

pub struct KeyBundle {
    pub user_secret: UserSecret,
    pub metadata_key: [u8; 32],
    pub recovery_key: [u8; 32],
}

pub struct EncryptedKeyStore {
    pub salt: [u8; 32],           // Argon2 salt
    pub argon2_params: Argon2Params,
    pub encrypted_bundle: Vec<u8>, // KeyBundle encrypted with RK
    pub bundle_nonce: [u8; 12],
}

pub struct Argon2Params {
    pub memory_cost: u32,    // 256MB recommended
    pub time_cost: u32,      // 3 iterations
    pub parallelism: u32,    // Match CPU cores
}
```

**Key Derivation Flow:**
```rust
pub fn derive_keys(password: &str, salt: &[u8; 32]) -> Result<KeyBundle> {
    // 1. Derive root key with Argon2id
    let root_key = argon2id_derive(password, salt, &ARGON2_PARAMS)?;

    // 2. Derive sub-keys with HKDF
    let user_secret = hkdf_expand(&root_key, b"dits-user-secret-v1")?;
    let metadata_key = hkdf_expand(&root_key, b"dits-metadata-key-v1")?;
    let recovery_key = hkdf_expand(&root_key, b"dits-recovery-key-v1")?;

    // 3. Zeroize root key immediately
    root_key.zeroize();

    Ok(KeyBundle { user_secret, metadata_key, recovery_key })
}
```

**Local Key Storage:**
- Keys stored in OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Fallback: encrypted file at `~/.dits/keystore.enc` with password prompt
- Session caching: keys held in locked memory pages (`mlock`) during session

**Sprint 1 Deliverables:**
- [ ] `dits login` — derive keys from password, store in keychain
- [ ] `dits logout` — clear cached keys from memory and keychain
- [ ] `dits change-password` — re-encrypt key bundle with new password
- [ ] Key derivation benchmarks (target: 500ms-2s on consumer hardware)

---

### Sprint 2: Chunk Encryption Pipeline

**Objective:** Integrate encryption into the ingest pipeline.

**Encryption Flow:**
```rust
pub struct EncryptedChunk {
    pub content_hash: [u8; 32],    // BLAKE3 of plaintext (for dedup)
    pub nonce: [u8; 12],           // GCM nonce
    pub ciphertext: Vec<u8>,       // Encrypted payload
    pub auth_tag: [u8; 16],        // GCM authentication tag
}

pub fn encrypt_chunk(
    plaintext: &[u8],
    user_secret: &UserSecret,
) -> Result<EncryptedChunk> {
    // 1. Compute content hash for deduplication
    let content_hash = blake3::hash(plaintext);

    // 2. Derive chunk-specific DEK (convergent)
    let dek = hmac_sha256(user_secret.as_ref(), content_hash.as_bytes());

    // 3. Generate random nonce (safe because DEK is content-derived)
    let nonce = generate_random_nonce();

    // 4. Encrypt with AES-256-GCM
    let cipher = Aes256Gcm::new(&dek.into());
    let ciphertext = cipher.encrypt(&nonce.into(), plaintext)?;

    // 5. Extract auth tag (last 16 bytes of GCM output)
    let (ciphertext, auth_tag) = split_ciphertext_tag(ciphertext);

    Ok(EncryptedChunk {
        content_hash: content_hash.into(),
        nonce,
        ciphertext,
        auth_tag: auth_tag.try_into()?,
    })
}
```

**Deduplication with Encryption:**
```rust
pub async fn ingest_chunk_encrypted(
    plaintext: &[u8],
    user_secret: &UserSecret,
    store: &ChunkStore,
) -> Result<[u8; 32]> {
    // 1. Hash for dedup check (before encryption)
    let content_hash = blake3::hash(plaintext);

    // 2. Check if chunk exists (by content hash)
    if store.exists(&content_hash).await? {
        return Ok(content_hash.into()); // Deduped!
    }

    // 3. Encrypt and store
    let encrypted = encrypt_chunk(plaintext, user_secret)?;
    store.put(&content_hash, &encrypted).await?;

    Ok(content_hash.into())
}
```

**Sprint 2 Deliverables:**
- [ ] Encrypted chunk format specification
- [ ] `encrypt_chunk` / `decrypt_chunk` functions
- [ ] Integration with Phase 1 ingest pipeline
- [ ] Deduplication verification (same content = same storage)
- [ ] Performance benchmark: <5% overhead vs. unencrypted

---

### Sprint 3: Metadata Encryption

**Objective:** Protect sensitive metadata (filenames, paths, commit messages).

**What Gets Encrypted:**
| Data | Encryption | Rationale |
| :--- | :--- | :--- |
| Chunk content | Convergent (DEK) | Dedup required |
| File paths | Metadata Key | Hide directory structure |
| Commit messages | Metadata Key | May contain sensitive info |
| Asset manifests | Metadata Key | Hide file relationships |
| Chunk hashes | Plaintext | Required for dedup lookup |

**Manifest Encryption:**
```rust
pub struct EncryptedManifest {
    pub id: [u8; 32],              // Hash of encrypted blob
    pub nonce: [u8; 12],
    pub ciphertext: Vec<u8>,       // Encrypted Manifest struct
    pub auth_tag: [u8; 16],
}

pub fn encrypt_manifest(
    manifest: &Manifest,
    metadata_key: &[u8; 32],
) -> Result<EncryptedManifest> {
    let plaintext = bincode::serialize(manifest)?;
    let nonce = generate_random_nonce();

    let cipher = Aes256Gcm::new(metadata_key.into());
    let ciphertext = cipher.encrypt(&nonce.into(), plaintext.as_ref())?;

    let id = blake3::hash(&ciphertext);

    Ok(EncryptedManifest {
        id: id.into(),
        nonce,
        ciphertext,
        auth_tag: extract_tag(&ciphertext),
    })
}
```

**Path Encryption (Deterministic):**
For directory listings, we need deterministic path encryption:
```rust
pub fn encrypt_path_deterministic(
    path: &str,
    metadata_key: &[u8; 32],
) -> String {
    // Use SIV mode for deterministic encryption
    let siv = Aes256Siv::new(metadata_key.into());
    let ciphertext = siv.encrypt(&[], path.as_bytes())?;
    base64url::encode(&ciphertext)
}
```

**Sprint 3 Deliverables:**
- [ ] Manifest encryption/decryption
- [ ] Path encryption for directory structure
- [ ] Commit message encryption
- [ ] Server-side search disabled (or encrypted search index)

---

### Sprint 4: Team Key Sharing

**Objective:** Enable secure collaboration with shared project keys.

**Project Key Distribution:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    PROJECT KEY SHARING                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Project Key (PK) ──► Random 256-bit                            │
│                                                                  │
│  For each team member:                                           │
│    Wrapped_PK = AES-KW(member.user_secret, PK)                  │
│                                                                  │
│  Storage (server-side):                                          │
│    project_keys: {                                               │
│      project_id: UUID,                                           │
│      wrapped_keys: {                                             │
│        user_id_1: encrypted_pk_1,                                │
│        user_id_2: encrypted_pk_2,                                │
│      }                                                           │
│    }                                                             │
│                                                                  │
│  New member joins:                                               │
│    1. Admin decrypts PK with their user_secret                  │
│    2. Admin wraps PK with new member's public key exchange      │
│    3. Server stores wrapped key for new member                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Exchange Protocol (X25519):**
```rust
pub struct UserKeyPair {
    pub public_key: [u8; 32],      // X25519 public
    secret_key: [u8; 32],          // X25519 secret (never leaves client)
}

pub struct WrappedProjectKey {
    pub ephemeral_public: [u8; 32], // Sender's ephemeral X25519 public
    pub encrypted_key: Vec<u8>,     // Project key encrypted with shared secret
    pub nonce: [u8; 12],
}

pub fn share_project_key(
    project_key: &[u8; 32],
    recipient_public: &[u8; 32],
) -> Result<WrappedProjectKey> {
    // 1. Generate ephemeral keypair
    let ephemeral = x25519_keygen();

    // 2. Compute shared secret
    let shared = x25519_diffie_hellman(&ephemeral.secret, recipient_public);

    // 3. Derive wrapping key
    let wrap_key = hkdf_expand(&shared, b"dits-key-wrap-v1")?;

    // 4. Encrypt project key
    let nonce = generate_random_nonce();
    let cipher = Aes256Gcm::new(&wrap_key.into());
    let encrypted = cipher.encrypt(&nonce.into(), project_key.as_ref())?;

    Ok(WrappedProjectKey {
        ephemeral_public: ephemeral.public,
        encrypted_key: encrypted,
        nonce,
    })
}
```

**Sprint 4 Deliverables:**
- [ ] X25519 keypair generation on account creation
- [ ] Project key creation on repo init
- [ ] Key wrapping for team member addition
- [ ] Key unwrapping on clone/pull
- [ ] `dits share <repo> <user>` command

---

### Sprint 5: Role-Based Access Control (RBAC)

**Objective:** Granular permissions for enterprise teams.

**Permission Model:**
```rust
pub enum Permission {
    // Repository level
    RepoRead,           // Clone, pull, view history
    RepoWrite,          // Push commits
    RepoAdmin,          // Manage members, settings, delete

    // Branch level
    BranchRead(String),      // Read specific branch
    BranchWrite(String),     // Write to specific branch
    BranchProtect(String),   // Manage branch protection

    // Asset level
    AssetRead(AssetPattern),  // Read matching assets
    AssetWrite(AssetPattern), // Write matching assets
    AssetLock(AssetPattern),  // Lock matching assets
}

pub struct AssetPattern {
    pub glob: String,  // e.g., "footage/raw/**", "exports/*.mov"
}

pub struct Role {
    pub name: String,
    pub permissions: Vec<Permission>,
}

// Predefined roles
pub const ROLE_VIEWER: Role = Role {
    name: "Viewer",
    permissions: vec![Permission::RepoRead],
};

pub const ROLE_EDITOR: Role = Role {
    name: "Editor",
    permissions: vec![
        Permission::RepoRead,
        Permission::RepoWrite,
        Permission::AssetLock(AssetPattern { glob: "**/*".into() }),
    ],
};

pub const ROLE_ADMIN: Role = Role {
    name: "Admin",
    permissions: vec![
        Permission::RepoRead,
        Permission::RepoWrite,
        Permission::RepoAdmin,
    ],
};
```

**Database Schema:**
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    permissions JSONB NOT NULL,
    is_system BOOLEAN DEFAULT FALSE
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id),
    repo_id UUID REFERENCES repositories(id),
    role_id UUID REFERENCES roles(id),
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, repo_id)
);

CREATE TABLE asset_permissions (
    id UUID PRIMARY KEY,
    repo_id UUID REFERENCES repositories(id),
    user_id UUID REFERENCES users(id),
    pattern TEXT NOT NULL,  -- glob pattern
    permission TEXT NOT NULL,  -- read, write, lock
    expires_at TIMESTAMP
);
```

**Permission Checking:**
```rust
pub async fn check_permission(
    user_id: &Uuid,
    repo_id: &Uuid,
    asset_path: Option<&str>,
    required: Permission,
    db: &Pool,
) -> Result<bool> {
    // 1. Get user's role for this repo
    let role = db.get_user_role(user_id, repo_id).await?;

    // 2. Check role permissions
    if role.permissions.contains(&required) {
        return Ok(true);
    }

    // 3. Check asset-specific permissions if path provided
    if let Some(path) = asset_path {
        let asset_perms = db.get_asset_permissions(user_id, repo_id).await?;
        for perm in asset_perms {
            if glob_match(&perm.pattern, path) && perm.allows(&required) {
                return Ok(true);
            }
        }
    }

    Ok(false)
}
```

**Sprint 5 Deliverables:**
- [ ] Role definition and storage
- [ ] Permission checking middleware
- [ ] `dits access grant <user> <role>` command
- [ ] `dits access revoke <user>` command
- [ ] `dits access list` command
- [ ] Server-side enforcement on all operations

---

### Sprint 6: Audit Logging

**Objective:** Comprehensive audit trail for compliance and forensics.

**Audit Event Schema:**
```rust
pub struct AuditEvent {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub event_type: AuditEventType,
    pub actor: AuditActor,
    pub resource: AuditResource,
    pub action: String,
    pub outcome: AuditOutcome,
    pub metadata: serde_json::Value,
    pub client_info: ClientInfo,
}

pub enum AuditEventType {
    // Authentication
    Login,
    Logout,
    LoginFailed,
    PasswordChanged,
    MfaEnabled,
    MfaDisabled,

    // Repository operations
    RepoCreated,
    RepoDeleted,
    RepoCloned,

    // Content operations
    CommitPushed,
    CommitPulled,
    AssetAccessed,
    AssetModified,
    AssetDeleted,

    // Collaboration
    MemberAdded,
    MemberRemoved,
    RoleChanged,
    LockAcquired,
    LockReleased,
    LockForced,

    // Administrative
    SettingsChanged,
    KeyRotated,
    BulkExport,
}

pub struct AuditActor {
    pub user_id: Option<Uuid>,
    pub service_account: Option<String>,
    pub ip_address: IpAddr,
    pub user_agent: String,
}

pub struct AuditResource {
    pub resource_type: String,  // repo, asset, user, etc.
    pub resource_id: String,
    pub resource_path: Option<String>,
}

pub enum AuditOutcome {
    Success,
    Failure { reason: String },
    Denied { reason: String },
}

pub struct ClientInfo {
    pub ip_address: IpAddr,
    pub user_agent: String,
    pub client_version: String,
    pub geo_location: Option<GeoLocation>,
}
```

**Database Schema:**
```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    actor_user_id UUID,
    actor_service TEXT,
    actor_ip INET NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_path TEXT,
    action TEXT NOT NULL,
    outcome TEXT NOT NULL,
    outcome_reason TEXT,
    metadata JSONB,
    client_version TEXT,
    user_agent TEXT,
    geo_country TEXT,
    geo_city TEXT
);

-- Partition by month for performance
CREATE TABLE audit_log_2025_01 PARTITION OF audit_log
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Indexes for common queries
CREATE INDEX idx_audit_timestamp ON audit_log (timestamp DESC);
CREATE INDEX idx_audit_user ON audit_log (actor_user_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_log (resource_type, resource_id, timestamp DESC);
CREATE INDEX idx_audit_event_type ON audit_log (event_type, timestamp DESC);
```

**Audit API:**
```rust
// Middleware logs all API calls
pub async fn audit_middleware(
    req: Request,
    next: Next,
    audit: AuditLogger,
) -> Response {
    let start = Instant::now();
    let actor = extract_actor(&req);
    let resource = extract_resource(&req);

    let response = next.run(req).await;

    let outcome = if response.status().is_success() {
        AuditOutcome::Success
    } else {
        AuditOutcome::Failure {
            reason: response.status().to_string()
        }
    };

    audit.log(AuditEvent {
        event_type: infer_event_type(&req),
        actor,
        resource,
        outcome,
        metadata: json!({
            "duration_ms": start.elapsed().as_millis(),
            "response_status": response.status().as_u16(),
        }),
        ..Default::default()
    }).await;

    response
}
```

**Audit Queries (for compliance):**
```sql
-- Who accessed this file in the last 30 days?
SELECT DISTINCT actor_user_id, timestamp, action
FROM audit_log
WHERE resource_path = '/projects/secret-campaign/master.mov'
  AND timestamp > NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;

-- All failed login attempts from this IP
SELECT * FROM audit_log
WHERE event_type = 'LoginFailed'
  AND actor_ip = '203.0.113.42'
ORDER BY timestamp DESC;

-- Generate access report for compliance
SELECT
    u.email,
    COUNT(*) FILTER (WHERE al.event_type = 'AssetAccessed') as assets_viewed,
    COUNT(*) FILTER (WHERE al.event_type = 'CommitPushed') as commits_pushed,
    MAX(al.timestamp) as last_activity
FROM audit_log al
JOIN users u ON al.actor_user_id = u.id
WHERE al.resource_id = 'repo-uuid-here'
  AND al.timestamp > NOW() - INTERVAL '90 days'
GROUP BY u.email;
```

**Sprint 6 Deliverables:**
- [ ] Audit event schema and storage
- [ ] Audit middleware for all API endpoints
- [ ] Client-side audit events (VFS access, local operations)
- [ ] `dits audit <repo>` command for admins
- [ ] Audit export for compliance (CSV, JSON)
- [ ] Retention policy (configurable, default 2 years)

---

### Sprint 7: Key Recovery & Rotation

**Objective:** Handle lost passwords and periodic key rotation.

**Recovery Options:**

**Option A: Recovery Key (Personal)**
```rust
pub struct RecoveryKit {
    pub recovery_code: String,      // 24-word mnemonic (BIP39)
    pub encrypted_root_key: Vec<u8>, // RK encrypted with recovery code
    pub created_at: DateTime<Utc>,
}

pub fn generate_recovery_kit(root_key: &RootKey) -> Result<RecoveryKit> {
    // 1. Generate 256-bit entropy
    let entropy = generate_random_bytes(32);

    // 2. Convert to mnemonic (24 words)
    let mnemonic = bip39::Mnemonic::from_entropy(&entropy)?;

    // 3. Derive recovery encryption key from mnemonic
    let recovery_enc_key = argon2id_derive(
        mnemonic.to_string().as_str(),
        b"dits-recovery-salt",
        &RECOVERY_ARGON2_PARAMS,
    )?;

    // 4. Encrypt root key
    let nonce = generate_random_nonce();
    let cipher = Aes256Gcm::new(&recovery_enc_key.into());
    let encrypted = cipher.encrypt(&nonce.into(), root_key.as_ref())?;

    Ok(RecoveryKit {
        recovery_code: mnemonic.to_string(),
        encrypted_root_key: [nonce.to_vec(), encrypted].concat(),
        created_at: Utc::now(),
    })
}
```

**Option B: Admin Recovery (Enterprise)**
```rust
pub struct AdminRecoveryEscrow {
    pub user_id: Uuid,
    pub org_id: Uuid,
    pub encrypted_root_key: Vec<u8>,  // RK encrypted with org master key
    pub escrow_timestamp: DateTime<Utc>,
    pub requires_approval: Vec<Uuid>,  // Admin IDs required for recovery
}

// Multi-party recovery (M-of-N)
pub async fn initiate_admin_recovery(
    user_id: Uuid,
    requester_id: Uuid,
    db: &Pool,
) -> Result<RecoveryRequest> {
    let escrow = db.get_escrow(user_id).await?;

    // Create recovery request requiring M approvals
    let request = RecoveryRequest {
        id: Uuid::new_v4(),
        user_id,
        requester_id,
        required_approvals: escrow.requires_approval.len() / 2 + 1,
        current_approvals: vec![],
        status: RecoveryStatus::Pending,
        expires_at: Utc::now() + Duration::hours(24),
    };

    db.create_recovery_request(&request).await?;
    notify_admins(&escrow.requires_approval, &request).await?;

    Ok(request)
}
```

**Key Rotation:**
```rust
pub async fn rotate_keys(
    old_password: &str,
    new_password: &str,
    db: &Pool,
    chunk_store: &ChunkStore,
) -> Result<()> {
    // 1. Derive old keys
    let old_keys = derive_keys(old_password, &old_salt)?;

    // 2. Generate new salt and derive new keys
    let new_salt = generate_random_bytes(32);
    let new_keys = derive_keys(new_password, &new_salt)?;

    // 3. Re-encrypt all manifests (metadata key changed)
    let manifests = db.get_all_user_manifests(user_id).await?;
    for manifest in manifests {
        let decrypted = decrypt_manifest(&manifest, &old_keys.metadata_key)?;
        let re_encrypted = encrypt_manifest(&decrypted, &new_keys.metadata_key)?;
        db.update_manifest(&re_encrypted).await?;
    }

    // 4. Re-wrap project keys
    let project_keys = db.get_user_project_keys(user_id).await?;
    for pk in project_keys {
        let decrypted = unwrap_project_key(&pk, &old_keys.user_secret)?;
        let re_wrapped = wrap_project_key(&decrypted, &new_keys.user_secret)?;
        db.update_project_key(&re_wrapped).await?;
    }

    // 5. Update key store
    let new_store = encrypt_key_bundle(&new_keys, &new_salt)?;
    db.update_key_store(user_id, &new_store).await?;

    // 6. Audit log
    audit_log(AuditEvent {
        event_type: AuditEventType::KeyRotated,
        ..
    }).await?;

    // Note: Chunk re-encryption not required (convergent encryption)
    // Same content = same DEK, regardless of user secret change
    // This is a feature: chunks remain deduplicated

    Ok(())
}
```

**Sprint 7 Deliverables:**
- [ ] Recovery kit generation and storage
- [ ] `dits recovery generate` command
- [ ] `dits recovery restore` command
- [ ] Admin escrow for enterprise
- [ ] Key rotation flow
- [ ] Rotation audit trail

---

### Sprint 8: Compliance Features

**Objective:** Meet enterprise security standards (SOC2, HIPAA, MPAA).

**SOC2 Requirements:**
| Control | Implementation |
| :--- | :--- |
| CC6.1 - Logical access | RBAC + authentication |
| CC6.2 - Auth mechanisms | Password + MFA |
| CC6.3 - Access removal | Immediate revocation, key invalidation |
| CC7.1 - Config management | Infrastructure as Code, audit trail |
| CC7.2 - Change management | Git-based deploys, approval workflow |
| CC8.1 - Incident response | Alert thresholds, runbooks |

**MPAA Content Security (Media Industry):**
```rust
pub struct ContentSecurityPolicy {
    // Watermarking
    pub watermark_enabled: bool,
    pub watermark_type: WatermarkType,  // Visible, Forensic, Both

    // Access restrictions
    pub geo_restrictions: Vec<CountryCode>,
    pub ip_allowlist: Vec<IpNetwork>,
    pub time_restrictions: Option<TimeWindow>,

    // Download controls
    pub allow_download: bool,
    pub allow_export: bool,
    pub max_resolution_download: Option<Resolution>,

    // Viewing controls
    pub require_secure_player: bool,
    pub screen_capture_prevention: bool,
}

pub enum WatermarkType {
    Visible {
        text: String,
        position: WatermarkPosition,
        opacity: f32,
    },
    Forensic {
        // Invisible watermark encoding user ID
        encoding: ForensicEncoding,
    },
    Both {
        visible: VisibleWatermark,
        forensic: ForensicWatermark,
    },
}
```

**HIPAA (Medical Imaging):**
```rust
pub struct HipaaCompliance {
    // PHI detection
    pub phi_scan_enabled: bool,
    pub phi_patterns: Vec<PhiPattern>,  // SSN, MRN, DOB patterns

    // Encryption requirements
    pub require_encryption_at_rest: bool,
    pub require_encryption_in_transit: bool,
    pub minimum_key_length: u32,  // 256 for AES

    // Access controls
    pub require_mfa: bool,
    pub session_timeout_minutes: u32,
    pub break_glass_procedure: bool,

    // Audit requirements
    pub audit_retention_years: u32,  // Minimum 6 for HIPAA
    pub audit_access_logging: bool,
}
```

**Data Loss Prevention (DLP):**
```rust
pub struct DlpPolicy {
    pub id: Uuid,
    pub name: String,
    pub rules: Vec<DlpRule>,
    pub actions: Vec<DlpAction>,
}

pub struct DlpRule {
    pub rule_type: DlpRuleType,
    pub pattern: String,
    pub severity: DlpSeverity,
}

pub enum DlpRuleType {
    FileExtension,      // Block .exe, .bat
    FileSize,           // Alert on >100GB export
    ContentPattern,     // Regex in filename/metadata
    Destination,        // Block external shares
    UserBehavior,       // Unusual download volume
}

pub enum DlpAction {
    Allow,
    Warn { message: String },
    Block { message: String },
    Quarantine,
    Alert { recipients: Vec<String> },
}
```

**Sprint 8 Deliverables:**
- [ ] Compliance policy configuration
- [ ] Watermarking integration (Phase 6 proxy generation)
- [ ] PHI/PII detection scanning
- [ ] DLP policy engine
- [ ] Compliance report generation
- [ ] Certification documentation templates

---

## Security Hardening Checklist

### Client Security
- [ ] Keys stored in OS secure enclave when available
- [ ] Memory zeroization for all sensitive data
- [ ] No keys written to disk in plaintext
- [ ] TLS certificate pinning for server connections
- [ ] Binary code signing (macOS notarization, Windows Authenticode)

### Server Security
- [ ] TLS 1.3 only, strong cipher suites
- [ ] Rate limiting on authentication endpoints
- [ ] Account lockout after failed attempts
- [ ] CSRF protection on web endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] Input validation on all endpoints

### Infrastructure Security
- [ ] Secrets management (HashiCorp Vault, AWS Secrets Manager)
- [ ] Network segmentation (DB not publicly accessible)
- [ ] WAF in front of API endpoints
- [ ] DDoS protection (Cloudflare, AWS Shield)
- [ ] Regular security scanning (Dependabot, Snyk)

---

## Phase 9 Verification Tests

### Encryption Tests
- [ ] **Convergent Dedup:** Same file, two users with different secrets → same storage location
- [ ] **Tamper Detection:** Flip bit in ciphertext → decryption fails with auth error
- [ ] **Key Isolation:** User A cannot decrypt User B's private files

### Access Control Tests
- [ ] **RBAC Enforcement:** Viewer cannot push; Editor cannot delete repo
- [ ] **Asset Permissions:** Folder-level restrictions enforced
- [ ] **Revocation:** Removed user cannot access after revocation (within 5 minutes)

### Audit Tests
- [ ] **Completeness:** Every API call logged
- [ ] **Immutability:** Audit logs cannot be modified (append-only)
- [ ] **Query Performance:** 1M audit records, query <1s

### Recovery Tests
- [ ] **Password Recovery:** Recovery code restores access
- [ ] **Admin Recovery:** M-of-N approval flow works
- [ ] **Key Rotation:** All data accessible after rotation

---

## Immediate Code Action

```bash
# In dits-client (crypto crate)
cargo add aes-gcm
cargo add argon2
cargo add hkdf
cargo add hmac
cargo add sha2
cargo add x25519-dalek
cargo add zeroize --features derive
cargo add rand
cargo add bip39

# In dits-server (auth/audit)
cargo add jsonwebtoken
cargo add bcrypt  # Fallback for legacy
cargo add uuid --features v4
```

**Next Steps:**
1. Implement `KeyBundle` derivation and secure storage
2. Integrate chunk encryption into ingest pipeline
3. Add X25519 keypair generation to user registration
4. Build audit logging middleware

---

## Appendix: Cryptographic Decisions Rationale

### Why Convergent Encryption?
- **Deduplication preserved:** Same content = same ciphertext
- **Server-side storage efficiency:** Critical for petabyte-scale media
- **Tradeoff:** Vulnerable to confirmation attacks (attacker with known plaintext can verify presence)
- **Mitigation:** Additional random IV for highly sensitive repos (opt-in, breaks dedup)

### Why AES-256-GCM?
- **Performance:** Hardware acceleration (AES-NI) on all modern CPUs
- **Authentication:** Built-in integrity verification
- **Standard:** NIST approved, widely audited

### Why Argon2id?
- **Memory-hard:** Resistant to GPU/ASIC attacks
- **Balanced:** Combines Argon2i (side-channel resistance) and Argon2d (GPU resistance)
- **Winner:** Password Hashing Competition winner

### Why X25519 for Key Exchange?
- **Speed:** Fast DH operations
- **Security:** 128-bit security level, safe curves
- **Simplicity:** No parameter negotiation needed
