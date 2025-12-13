# Security Architecture Deep Dive

**Project:** Dits (Data-Intensive Version Control System)
**Document:** Comprehensive Security Architecture
**Objective:** Define defense-in-depth security controls across all system layers for protecting sensitive media assets.

---

## Threat Model

### Assets to Protect

| Asset | Sensitivity | Impact of Breach |
| :--- | :--- | :--- |
| Media content (chunks) | High | IP theft, competitive loss, legal liability |
| Metadata (paths, commits) | Medium | Project details exposure |
| User credentials | Critical | Account takeover |
| Encryption keys | Critical | Full data compromise |
| Audit logs | Medium | Cover tracks for attacks |
| API keys / tokens | High | Unauthorized access |

### Threat Actors

| Actor | Capability | Motivation | Likelihood |
| :--- | :--- | :--- | :--- |
| External attacker | Medium-High | Financial, espionage | High |
| Malicious insider | High | Revenge, financial | Medium |
| Compromised account | Medium | Credential stuffing | High |
| Nation-state | Very High | Espionage | Low (unless high-profile) |
| Competitor | Medium | IP theft | Medium |

### Attack Vectors

```
┌─────────────────────────────────────────────────────────────────┐
│                       ATTACK SURFACE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client-Side:                                                    │
│  ├── Malware on workstation                                     │
│  ├── Stolen device                                               │
│  ├── Man-in-the-middle                                          │
│  └── Social engineering                                          │
│                                                                  │
│  Network:                                                        │
│  ├── Eavesdropping                                               │
│  ├── DNS hijacking                                               │
│  ├── SSL stripping                                               │
│  └── DDoS                                                        │
│                                                                  │
│  Server-Side:                                                    │
│  ├── API vulnerabilities (injection, auth bypass)               │
│  ├── Misconfigured storage (public S3)                          │
│  ├── Dependency vulnerabilities                                  │
│  └── Privilege escalation                                        │
│                                                                  │
│  Data Layer:                                                     │
│  ├── Database breach                                             │
│  ├── Backup theft                                                │
│  ├── Physical access to storage                                  │
│  └── Cloud provider compromise                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Defense Layers

### Layer 1: Authentication

#### Password Policy

```rust
pub struct PasswordPolicy {
    pub min_length: usize,          // 12 characters
    pub require_uppercase: bool,     // true
    pub require_lowercase: bool,     // true
    pub require_digit: bool,         // true
    pub require_special: bool,       // true
    pub max_age_days: Option<u32>,   // 90 for enterprise
    pub history_count: u32,          // 5 (can't reuse last 5)
    pub lockout_threshold: u32,      // 5 failed attempts
    pub lockout_duration_minutes: u32, // 30
}

pub fn validate_password(password: &str, policy: &PasswordPolicy) -> Result<(), PasswordError> {
    if password.len() < policy.min_length {
        return Err(PasswordError::TooShort);
    }

    if policy.require_uppercase && !password.chars().any(|c| c.is_uppercase()) {
        return Err(PasswordError::MissingUppercase);
    }

    if policy.require_lowercase && !password.chars().any(|c| c.is_lowercase()) {
        return Err(PasswordError::MissingLowercase);
    }

    if policy.require_digit && !password.chars().any(|c| c.is_numeric()) {
        return Err(PasswordError::MissingDigit);
    }

    if policy.require_special && !password.chars().any(|c| !c.is_alphanumeric()) {
        return Err(PasswordError::MissingSpecial);
    }

    // Check against breach databases
    if is_compromised_password(password).await? {
        return Err(PasswordError::Compromised);
    }

    Ok(())
}
```

#### Multi-Factor Authentication (MFA)

```rust
pub enum MfaMethod {
    // Time-based OTP (Google Authenticator, Authy)
    Totp {
        secret: String,
        algorithm: TotpAlgorithm,
        digits: u8,
        period: u32,
    },

    // WebAuthn / FIDO2 (Hardware keys, biometrics)
    WebAuthn {
        credential_id: Vec<u8>,
        public_key: Vec<u8>,
        counter: u32,
    },

    // SMS (discouraged, but supported for legacy)
    Sms {
        phone_number: String,
    },

    // Backup codes (one-time use)
    BackupCodes {
        codes: Vec<String>,  // Hashed
    },
}

pub struct MfaConfig {
    pub required: bool,                    // Force MFA for all users
    pub allowed_methods: Vec<MfaMethod>,   // Permitted methods
    pub remember_device_days: u32,         // Trust device for N days
    pub grace_period_days: u32,            // New users have N days to enable
}

// Enterprise: require MFA for admin operations
pub fn require_mfa_for_operation(operation: &Operation, user: &User) -> bool {
    match operation {
        Operation::DeleteRepository => true,
        Operation::ModifyPermissions => true,
        Operation::ExportData => true,
        Operation::ChangeSecuritySettings => true,
        Operation::ViewAuditLogs => user.role != Role::Admin,
        _ => false,
    }
}
```

#### Session Management

```rust
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub ip_address: IpAddr,
    pub user_agent: String,
    pub device_fingerprint: String,
    pub mfa_verified: bool,
    pub elevation_expires: Option<DateTime<Utc>>,  // Sudo mode
}

pub struct SessionConfig {
    pub max_lifetime: Duration,          // 24 hours
    pub idle_timeout: Duration,          // 30 minutes
    pub max_concurrent_sessions: u32,    // 5
    pub require_reauth_for_sensitive: bool,
    pub bind_to_ip: bool,                // Invalidate if IP changes
}

pub async fn validate_session(
    session: &Session,
    request: &Request,
    config: &SessionConfig,
) -> Result<(), SessionError> {
    // Check expiration
    if session.expires_at < Utc::now() {
        return Err(SessionError::Expired);
    }

    // Check idle timeout
    if Utc::now() - session.last_activity > config.idle_timeout {
        return Err(SessionError::IdleTimeout);
    }

    // Check IP binding
    if config.bind_to_ip && session.ip_address != request.client_ip() {
        return Err(SessionError::IpMismatch);
    }

    // Check device fingerprint
    if session.device_fingerprint != request.device_fingerprint() {
        return Err(SessionError::DeviceMismatch);
    }

    Ok(())
}
```

#### Single Sign-On (SSO)

```rust
pub enum SsoProvider {
    Saml {
        idp_metadata_url: String,
        sp_entity_id: String,
        acs_url: String,
        certificate: String,
    },
    Oidc {
        issuer: String,
        client_id: String,
        client_secret: String,
        redirect_uri: String,
        scopes: Vec<String>,
    },
    // Common providers with simplified config
    Google { client_id: String, client_secret: String },
    Microsoft { tenant_id: String, client_id: String, client_secret: String },
    Okta { domain: String, client_id: String, client_secret: String },
}

pub struct SsoConfig {
    pub provider: SsoProvider,
    pub auto_provision_users: bool,       // Create users on first login
    pub default_role: Role,               // Role for auto-provisioned users
    pub attribute_mapping: AttributeMap,  // Map SSO attrs to Dits fields
    pub required_groups: Option<Vec<String>>,  // Must be in these groups
    pub jit_provisioning: bool,           // Just-in-time group sync
}
```

---

### Layer 2: Authorization (RBAC)

#### Permission Model

```rust
pub enum Permission {
    // Organization level
    OrgAdmin,
    OrgBilling,
    OrgAudit,

    // Repository level
    RepoCreate,
    RepoDelete,
    RepoAdmin,
    RepoRead,
    RepoWrite,
    RepoPush,
    RepoPull,

    // Branch level
    BranchCreate,
    BranchDelete,
    BranchProtect,
    BranchMerge,

    // Asset level
    AssetRead,
    AssetWrite,
    AssetDelete,
    AssetLock,
    AssetUnlock,

    // Administrative
    UserManage,
    RoleManage,
    AuditView,
    SettingsManage,
}

pub struct Role {
    pub name: String,
    pub permissions: Vec<Permission>,
    pub inherits_from: Option<String>,
    pub scope: RoleScope,
}

pub enum RoleScope {
    Global,                    // Applies everywhere
    Organization { id: Uuid }, // Applies to one org
    Repository { id: Uuid },   // Applies to one repo
}

// Built-in roles
pub const ROLES: &[Role] = &[
    Role {
        name: "Owner",
        permissions: vec![Permission::OrgAdmin, Permission::RepoAdmin, ...],
        inherits_from: None,
        scope: RoleScope::Global,
    },
    Role {
        name: "Admin",
        permissions: vec![Permission::RepoAdmin, Permission::UserManage, ...],
        inherits_from: Some("Editor"),
        scope: RoleScope::Organization,
    },
    Role {
        name: "Editor",
        permissions: vec![Permission::RepoRead, Permission::RepoWrite, Permission::RepoPush, ...],
        inherits_from: Some("Viewer"),
        scope: RoleScope::Repository,
    },
    Role {
        name: "Viewer",
        permissions: vec![Permission::RepoRead, Permission::RepoPull],
        inherits_from: None,
        scope: RoleScope::Repository,
    },
];
```

#### Attribute-Based Access Control (ABAC) Extension

```rust
pub struct AccessPolicy {
    pub id: Uuid,
    pub name: String,
    pub conditions: Vec<PolicyCondition>,
    pub effect: PolicyEffect,
    pub permissions: Vec<Permission>,
}

pub enum PolicyCondition {
    // User attributes
    UserInGroup { group: String },
    UserHasRole { role: String },
    UserEmailDomain { domain: String },

    // Resource attributes
    AssetPath { pattern: String },  // Glob pattern
    AssetType { mime_type: String },
    AssetSize { max_bytes: u64 },

    // Context attributes
    TimeWindow { start: Time, end: Time },
    IpRange { cidr: String },
    GeoLocation { countries: Vec<String> },
    DeviceType { types: Vec<String> },

    // Combination
    And(Vec<PolicyCondition>),
    Or(Vec<PolicyCondition>),
    Not(Box<PolicyCondition>),
}

pub enum PolicyEffect {
    Allow,
    Deny,
}

// Example: Only allow downloads from corporate network during business hours
pub fn corporate_download_policy() -> AccessPolicy {
    AccessPolicy {
        name: "Corporate Download Restriction".into(),
        conditions: vec![
            PolicyCondition::And(vec![
                PolicyCondition::IpRange { cidr: "10.0.0.0/8".into() },
                PolicyCondition::TimeWindow {
                    start: Time::from_hms(9, 0, 0),
                    end: Time::from_hms(18, 0, 0),
                },
            ]),
        ],
        effect: PolicyEffect::Allow,
        permissions: vec![Permission::AssetRead],
    }
}
```

---

### Layer 3: Transport Security

#### TLS Configuration

```rust
pub struct TlsConfig {
    pub min_version: TlsVersion,        // TLS 1.3
    pub cipher_suites: Vec<CipherSuite>,
    pub certificate_path: PathBuf,
    pub private_key_path: PathBuf,
    pub client_auth: ClientAuth,
    pub ocsp_stapling: bool,
    pub certificate_transparency: bool,
}

impl Default for TlsConfig {
    fn default() -> Self {
        Self {
            min_version: TlsVersion::TLS_1_3,
            cipher_suites: vec![
                // TLS 1.3 suites (all secure)
                CipherSuite::TLS13_AES_256_GCM_SHA384,
                CipherSuite::TLS13_AES_128_GCM_SHA256,
                CipherSuite::TLS13_CHACHA20_POLY1305_SHA256,
            ],
            certificate_path: PathBuf::from("/etc/dits/tls/cert.pem"),
            private_key_path: PathBuf::from("/etc/dits/tls/key.pem"),
            client_auth: ClientAuth::Optional,
            ocsp_stapling: true,
            certificate_transparency: true,
        }
    }
}

pub enum ClientAuth {
    None,
    Optional,   // Accept if provided
    Required,   // Mutual TLS
}
```

#### Certificate Pinning (Client)

```rust
pub struct CertificatePinning {
    pub pins: Vec<Pin>,
    pub include_subdomains: bool,
    pub max_age: Duration,
    pub report_uri: Option<String>,
}

pub struct Pin {
    pub algorithm: PinAlgorithm,
    pub digest: String,  // Base64-encoded
}

pub enum PinAlgorithm {
    Sha256,
}

// Pin verification
pub fn verify_certificate_pin(
    cert: &Certificate,
    config: &CertificatePinning,
) -> Result<(), PinError> {
    let cert_spki = cert.subject_public_key_info();
    let cert_pin = sha256(cert_spki);

    for pin in &config.pins {
        if pin.digest == base64::encode(&cert_pin) {
            return Ok(());
        }
    }

    // Log pin failure for monitoring
    if let Some(uri) = &config.report_uri {
        report_pin_failure(uri, cert).await;
    }

    Err(PinError::PinMismatch)
}
```

#### QUIC Security

```rust
pub struct QuicSecurityConfig {
    // Certificate verification
    pub verify_server_cert: bool,
    pub custom_ca_certs: Vec<PathBuf>,

    // Connection security
    pub enable_0rtt: bool,                  // Fast reconnect (replay risk)
    pub max_idle_timeout: Duration,         // Close idle connections
    pub keep_alive_interval: Duration,

    // Anti-amplification
    pub max_udp_payload_size: u16,
    pub initial_max_data: u64,

    // DoS protection
    pub max_concurrent_streams: u32,
    pub rate_limit_new_connections: u32,    // Per second per IP
}
```

---

### Layer 4: Data Security

#### Encryption at Rest

```rust
pub struct EncryptionAtRestConfig {
    // Chunk encryption (Phase 9)
    pub chunk_encryption: ChunkEncryptionConfig,

    // Database encryption
    pub database_encryption: DatabaseEncryptionConfig,

    // Backup encryption
    pub backup_encryption: BackupEncryptionConfig,

    // Local cache encryption
    pub cache_encryption: CacheEncryptionConfig,
}

pub struct ChunkEncryptionConfig {
    pub algorithm: EncryptionAlgorithm,     // AES-256-GCM
    pub key_derivation: KeyDerivation,      // Convergent or random
    pub key_rotation_days: u32,             // Rotate keys periodically
}

pub struct DatabaseEncryptionConfig {
    pub enabled: bool,
    pub provider: DbEncryptionProvider,     // AWS RDS, native PG
    pub key_arn: Option<String>,            // KMS key for cloud
}

pub struct BackupEncryptionConfig {
    pub enabled: bool,
    pub algorithm: EncryptionAlgorithm,
    pub key_management: KeyManagement,      // KMS, Vault, etc.
}

pub struct CacheEncryptionConfig {
    pub enabled: bool,
    pub key_source: CacheKeySource,         // Derived from user key
}

pub enum CacheKeySource {
    UserDerived,        // Different per user
    DeviceBound,        // Tied to device TPM/enclave
    Session,            // Per-session key
}
```

#### Key Management

```rust
pub enum KeyManagementSystem {
    // Cloud KMS
    AwsKms {
        key_id: String,
        region: String,
    },
    GcpKms {
        key_name: String,
        project: String,
    },
    AzureKeyVault {
        vault_url: String,
        key_name: String,
    },

    // Self-hosted
    HashicorpVault {
        address: String,
        mount_path: String,
        key_name: String,
    },

    // Local (development only)
    LocalFile {
        path: PathBuf,
    },
}

pub struct KeyRotationPolicy {
    pub automatic: bool,
    pub interval_days: u32,              // 90 days recommended
    pub retain_old_versions: u32,        // Keep N old versions
    pub re_encrypt_on_rotation: bool,    // Re-encrypt data with new key
}

// Key envelope encryption
pub struct EncryptedDataKey {
    pub encrypted_key: Vec<u8>,          // DEK encrypted with KEK
    pub key_id: String,                  // Which KEK was used
    pub algorithm: String,
    pub created_at: DateTime<Utc>,
}

pub async fn decrypt_data_key(
    encrypted: &EncryptedDataKey,
    kms: &KeyManagementSystem,
) -> Result<DataKey> {
    match kms {
        KeyManagementSystem::AwsKms { key_id, region } => {
            let client = aws_sdk_kms::Client::new(&aws_config).await;
            let response = client
                .decrypt()
                .key_id(key_id)
                .ciphertext_blob(Blob::new(&encrypted.encrypted_key))
                .send()
                .await?;

            Ok(DataKey(response.plaintext.unwrap().into_inner()))
        }
        // ... other providers
    }
}
```

#### Data Classification

```rust
pub enum DataClassification {
    Public,         // No restrictions
    Internal,       // Organization only
    Confidential,   // Need-to-know basis
    Restricted,     // Highest sensitivity
}

pub struct ClassificationPolicy {
    pub default_classification: DataClassification,
    pub auto_classify_rules: Vec<ClassificationRule>,
    pub handling_requirements: HashMap<DataClassification, HandlingRequirements>,
}

pub struct ClassificationRule {
    pub pattern: String,              // Path or content pattern
    pub classification: DataClassification,
    pub reason: String,
}

pub struct HandlingRequirements {
    pub encryption_required: bool,
    pub mfa_required: bool,
    pub download_allowed: bool,
    pub sharing_allowed: bool,
    pub retention_days: Option<u32>,
    pub audit_level: AuditLevel,
}

// Auto-classification examples
pub fn default_classification_rules() -> Vec<ClassificationRule> {
    vec![
        ClassificationRule {
            pattern: "**/contracts/**".into(),
            classification: DataClassification::Confidential,
            reason: "Legal documents".into(),
        },
        ClassificationRule {
            pattern: "**/unreleased/**".into(),
            classification: DataClassification::Restricted,
            reason: "Unreleased content".into(),
        },
        ClassificationRule {
            pattern: "**/press-kit/**".into(),
            classification: DataClassification::Public,
            reason: "Press materials".into(),
        },
    ]
}
```

---

### Layer 5: Application Security

#### Input Validation

```rust
pub trait Validated {
    fn validate(&self) -> Result<(), ValidationError>;
}

// Repository name validation
impl Validated for RepoName {
    fn validate(&self) -> Result<(), ValidationError> {
        // Length check
        if self.0.len() < 1 || self.0.len() > 100 {
            return Err(ValidationError::InvalidLength);
        }

        // Character whitelist
        if !self.0.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
            return Err(ValidationError::InvalidCharacters);
        }

        // No path traversal
        if self.0.contains("..") || self.0.contains('/') || self.0.contains('\\') {
            return Err(ValidationError::PathTraversal);
        }

        // Reserved names
        if RESERVED_NAMES.contains(&self.0.to_lowercase().as_str()) {
            return Err(ValidationError::Reserved);
        }

        Ok(())
    }
}

// Asset path validation
impl Validated for AssetPath {
    fn validate(&self) -> Result<(), ValidationError> {
        // Normalize path
        let normalized = Path::new(&self.0).normalize();

        // Check for path traversal
        if normalized.components().any(|c| c == Component::ParentDir) {
            return Err(ValidationError::PathTraversal);
        }

        // Check for null bytes
        if self.0.contains('\0') {
            return Err(ValidationError::NullByte);
        }

        // Length limit
        if self.0.len() > 4096 {
            return Err(ValidationError::TooLong);
        }

        Ok(())
    }
}
```

#### SQL Injection Prevention

```rust
// ALWAYS use parameterized queries
pub async fn get_asset_by_path(
    repo_id: &Uuid,
    path: &AssetPath,
    db: &Pool,
) -> Result<Option<Asset>> {
    // CORRECT: Parameterized
    sqlx::query_as!(
        Asset,
        r#"
        SELECT * FROM assets
        WHERE repo_id = $1 AND path = $2
        "#,
        repo_id,
        path.as_str()
    )
    .fetch_optional(db)
    .await
}

// NEVER do this:
// let query = format!("SELECT * FROM assets WHERE path = '{}'", path);
```

#### Rate Limiting

```rust
pub struct RateLimitConfig {
    // Per-endpoint limits
    pub login_attempts: RateLimit,
    pub api_requests: RateLimit,
    pub chunk_uploads: RateLimit,
    pub search_queries: RateLimit,

    // Global limits
    pub max_requests_per_ip: RateLimit,
    pub max_bandwidth_per_user: BandwidthLimit,
}

pub struct RateLimit {
    pub requests: u32,
    pub window: Duration,
    pub burst: u32,
}

pub struct BandwidthLimit {
    pub bytes_per_second: u64,
    pub bytes_per_day: u64,
}

// Rate limit middleware
pub async fn rate_limit_middleware(
    req: Request,
    state: &AppState,
    next: Next,
) -> Response {
    let key = format!("ratelimit:{}:{}", req.client_ip(), req.path());

    let result = state.redis.incr_with_expiry(&key, 1, 60).await?;

    if result > state.config.rate_limit.requests {
        return Response::builder()
            .status(StatusCode::TOO_MANY_REQUESTS)
            .header("Retry-After", "60")
            .body("Rate limit exceeded".into());
    }

    next.run(req).await
}
```

#### Content Security

```rust
// Prevent serving malicious content
pub struct ContentSecurityConfig {
    // MIME type validation
    pub allowed_mime_types: Vec<String>,

    // Content scanning
    pub scan_for_malware: bool,
    pub scan_for_pii: bool,

    // Download restrictions
    pub max_download_size: u64,
    pub require_signed_urls: bool,
    pub url_expiry: Duration,
}

// Signed URL generation for secure downloads
pub fn generate_signed_url(
    asset_hash: &AssetHash,
    user_id: &UserId,
    expiry: Duration,
    secret: &[u8],
) -> String {
    let expires_at = Utc::now() + expiry;
    let payload = format!("{}:{}:{}", asset_hash, user_id, expires_at.timestamp());
    let signature = hmac_sha256(secret, payload.as_bytes());

    format!(
        "/download/{}?expires={}&user={}&sig={}",
        asset_hash,
        expires_at.timestamp(),
        user_id,
        base64url::encode(&signature)
    )
}

pub fn verify_signed_url(
    asset_hash: &str,
    expires: i64,
    user_id: &str,
    signature: &str,
    secret: &[u8],
) -> Result<(), SignatureError> {
    // Check expiry
    if Utc::now().timestamp() > expires {
        return Err(SignatureError::Expired);
    }

    // Verify signature
    let payload = format!("{}:{}:{}", asset_hash, user_id, expires);
    let expected = hmac_sha256(secret, payload.as_bytes());

    if !constant_time_eq(&base64url::decode(signature)?, &expected) {
        return Err(SignatureError::Invalid);
    }

    Ok(())
}
```

---

### Layer 6: Infrastructure Security

#### Network Segmentation

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Public Zone (Internet-Facing)                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Load Balancer / CDN / WAF                               │   │
│  │  - DDoS protection                                        │   │
│  │  - SSL termination                                        │   │
│  │  - Rate limiting                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ────────────────────────────┼────────────────────────────────  │
│                              │                                   │
│  Application Zone (Private Subnet)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  API Servers                                              │   │
│  │  - No direct internet access                              │   │
│  │  - Egress via NAT gateway only                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ────────────────────────────┼────────────────────────────────  │
│                              │                                   │
│  Data Zone (Isolated Subnet)                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Database (PostgreSQL)           Object Storage (S3)     │   │
│  │  Redis Cache                     Secret Manager          │   │
│  │  - No internet access                                     │   │
│  │  - VPC endpoints only                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Security Groups

```hcl
# Terraform example
resource "aws_security_group" "api_servers" {
  name        = "dits-api-servers"
  description = "Security group for API servers"
  vpc_id      = aws_vpc.main.id

  # Inbound: Only from load balancer
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.load_balancer.id]
  }

  # Outbound: Database, Redis, S3
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
  }

  egress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.redis.id]
  }

  # S3 via VPC endpoint (no internet)
  egress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [aws_vpc_endpoint.s3.prefix_list_id]
  }
}

resource "aws_security_group" "database" {
  name        = "dits-database"
  description = "Security group for database"
  vpc_id      = aws_vpc.main.id

  # Inbound: Only from API servers
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api_servers.id]
  }

  # No outbound (database doesn't initiate connections)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []  # Empty
  }
}
```

#### Secrets Management

```rust
pub struct SecretsConfig {
    pub provider: SecretsProvider,
    pub cache_ttl: Duration,
    pub rotation_notification: bool,
}

pub enum SecretsProvider {
    AwsSecretsManager {
        region: String,
    },
    HashicorpVault {
        address: String,
        auth_method: VaultAuthMethod,
    },
    GcpSecretManager {
        project: String,
    },
    EnvironmentVariables,  // Development only
}

pub enum VaultAuthMethod {
    Token { token: String },
    AppRole { role_id: String, secret_id: String },
    Kubernetes { role: String },
    AwsIam { role: String },
}

// Secret retrieval with caching
pub struct SecretCache {
    cache: moka::future::Cache<String, CachedSecret>,
    provider: SecretsProvider,
}

impl SecretCache {
    pub async fn get_secret(&self, name: &str) -> Result<String> {
        // Check cache first
        if let Some(cached) = self.cache.get(name) {
            if cached.expires_at > Utc::now() {
                return Ok(cached.value.clone());
            }
        }

        // Fetch from provider
        let value = self.provider.get_secret(name).await?;

        // Cache with TTL
        self.cache.insert(name.to_string(), CachedSecret {
            value: value.clone(),
            expires_at: Utc::now() + Duration::minutes(5),
        }).await;

        Ok(value)
    }
}
```

---

### Layer 7: Monitoring & Detection

#### Security Event Logging

```rust
pub enum SecurityEvent {
    // Authentication events
    LoginSuccess { user_id: Uuid, ip: IpAddr, method: AuthMethod },
    LoginFailure { username: String, ip: IpAddr, reason: String },
    MfaChallenge { user_id: Uuid, method: MfaMethod, success: bool },
    SessionCreated { session_id: Uuid, user_id: Uuid },
    SessionTerminated { session_id: Uuid, reason: String },

    // Authorization events
    PermissionDenied { user_id: Uuid, resource: String, action: String },
    RoleChanged { user_id: Uuid, old_role: String, new_role: String, by: Uuid },

    // Data access events
    SensitiveDataAccess { user_id: Uuid, resource: String, classification: DataClassification },
    BulkExport { user_id: Uuid, asset_count: u32, total_size: u64 },
    ExternalShare { user_id: Uuid, resource: String, recipient: String },

    // Security violations
    RateLimitExceeded { ip: IpAddr, endpoint: String },
    InvalidSignature { resource: String, ip: IpAddr },
    SuspiciousActivity { user_id: Option<Uuid>, ip: IpAddr, description: String },

    // Administrative events
    SecuritySettingChanged { setting: String, old_value: String, new_value: String, by: Uuid },
    UserProvisioned { user_id: Uuid, by: Uuid },
    UserDeprovisioned { user_id: Uuid, by: Uuid },
}

pub async fn log_security_event(event: SecurityEvent, db: &Pool) {
    let severity = event.severity();
    let json = serde_json::to_value(&event).unwrap();

    sqlx::query!(
        r#"
        INSERT INTO security_events (timestamp, severity, event_type, details, ip_address, user_id)
        VALUES (NOW(), $1, $2, $3, $4, $5)
        "#,
        severity.to_string(),
        event.type_name(),
        json,
        event.ip_address().map(|ip| ip.to_string()),
        event.user_id()
    )
    .execute(db)
    .await
    .ok();  // Don't fail on logging error

    // Real-time alerting for high-severity events
    if severity >= Severity::High {
        alert_security_team(&event).await;
    }
}
```

#### Anomaly Detection

```rust
pub struct AnomalyDetector {
    // Baseline metrics
    pub login_patterns: UserLoginPatterns,
    pub access_patterns: ResourceAccessPatterns,
    pub bandwidth_patterns: BandwidthPatterns,
}

pub struct UserLoginPatterns {
    pub typical_hours: Range<u8>,           // e.g., 9-18
    pub typical_locations: Vec<GeoLocation>,
    pub typical_devices: Vec<DeviceFingerprint>,
}

pub async fn detect_anomalies(
    event: &SecurityEvent,
    detector: &AnomalyDetector,
) -> Vec<Anomaly> {
    let mut anomalies = Vec::new();

    match event {
        SecurityEvent::LoginSuccess { user_id, ip, .. } => {
            let patterns = detector.login_patterns.get(user_id).await;

            // Unusual time
            let hour = Utc::now().hour();
            if !patterns.typical_hours.contains(&(hour as u8)) {
                anomalies.push(Anomaly::UnusualLoginTime {
                    user_id: *user_id,
                    hour,
                    typical: patterns.typical_hours.clone(),
                });
            }

            // New location
            let location = geolocate(ip).await;
            if !patterns.typical_locations.iter().any(|l| l.near(&location)) {
                anomalies.push(Anomaly::NewLoginLocation {
                    user_id: *user_id,
                    location: location.clone(),
                    typical: patterns.typical_locations.clone(),
                });
            }

            // Impossible travel (login from distant location too quickly)
            if let Some(last_login) = get_last_login(*user_id).await {
                let distance = last_login.location.distance(&location);
                let time_diff = Utc::now() - last_login.time;
                let required_speed = distance / time_diff.num_hours() as f64;

                if required_speed > 1000.0 {  // > 1000 km/h is suspicious
                    anomalies.push(Anomaly::ImpossibleTravel {
                        user_id: *user_id,
                        from: last_login.location,
                        to: location,
                        time_diff,
                    });
                }
            }
        }
        // ... other event types
    }

    anomalies
}
```

#### Alerting Rules

```yaml
# Security alerting rules
alerts:
  # Brute force detection
  - name: BruteForceAttempt
    condition: |
      count(login_failures WHERE ip = $ip AND timestamp > now() - 5m) > 10
    severity: high
    action:
      - block_ip: { duration: 1h }
      - notify: security-team

  # Credential stuffing
  - name: CredentialStuffing
    condition: |
      count(distinct username WHERE ip = $ip AND event = 'login_failure' AND timestamp > now() - 1h) > 50
    severity: critical
    action:
      - block_ip: { duration: 24h }
      - notify: security-team
      - create_incident

  # Data exfiltration
  - name: BulkDataExfiltration
    condition: |
      sum(download_size WHERE user_id = $user AND timestamp > now() - 1h) > 100GB
    severity: high
    action:
      - suspend_user: { pending_review: true }
      - notify: security-team

  # Privilege escalation
  - name: UnauthorizedPrivilegeEscalation
    condition: |
      role_changed AND new_role = 'admin' AND changer_id = changed_user_id
    severity: critical
    action:
      - revert_change
      - suspend_user
      - notify: security-team
      - create_incident

  # Anomalous access pattern
  - name: AnomalousAccessPattern
    condition: |
      anomaly_score(user_id, access_pattern) > 0.9
    severity: medium
    action:
      - require_mfa_reauth
      - notify: user
      - log_for_review
```

---

### Layer 8: Compliance

#### Compliance Frameworks

```rust
pub enum ComplianceFramework {
    // General
    Soc2Type2,
    Iso27001,

    // Industry-specific
    Hipaa,           // Healthcare
    Mpaa,            // Motion picture
    Gdpr,            // EU data protection
    Ccpa,            // California privacy
    PciDss,          // Payment card

    // Government
    FedRamp,
    Itar,            // Defense
}

pub struct ComplianceConfig {
    pub frameworks: Vec<ComplianceFramework>,
    pub controls: Vec<ComplianceControl>,
    pub audit_schedule: AuditSchedule,
}

pub struct ComplianceControl {
    pub id: String,                      // e.g., "SOC2-CC6.1"
    pub framework: ComplianceFramework,
    pub description: String,
    pub implementation: ControlImplementation,
    pub evidence: Vec<EvidenceSource>,
    pub last_tested: Option<DateTime<Utc>>,
    pub status: ControlStatus,
}

pub enum ControlImplementation {
    Automated { check: String },         // Automated verification
    Manual { procedure: String },        // Manual process
    ThirdParty { vendor: String },       // Vendor control
}

pub enum EvidenceSource {
    AuditLog { query: String },
    Configuration { path: String },
    Screenshot { description: String },
    Document { path: String },
}
```

#### GDPR/CCPA Data Subject Rights

```rust
pub struct DataSubjectRequest {
    pub id: Uuid,
    pub request_type: DsrType,
    pub subject_email: String,
    pub verified: bool,
    pub created_at: DateTime<Utc>,
    pub due_date: DateTime<Utc>,          // 30 days for GDPR
    pub status: DsrStatus,
}

pub enum DsrType {
    Access,           // Right to access (GDPR Art. 15)
    Rectification,    // Right to correct (GDPR Art. 16)
    Erasure,          // Right to be forgotten (GDPR Art. 17)
    Portability,      // Right to data portability (GDPR Art. 20)
    Restriction,      // Right to restrict processing (GDPR Art. 18)
    Objection,        // Right to object (GDPR Art. 21)
}

pub async fn handle_data_subject_request(
    request: &DataSubjectRequest,
    db: &Pool,
    storage: &ObjectStore,
) -> Result<DsrResponse> {
    match request.request_type {
        DsrType::Access => {
            // Collect all user data
            let user_data = collect_user_data(&request.subject_email, db).await?;
            let assets = collect_user_assets(&request.subject_email, db, storage).await?;

            Ok(DsrResponse::DataExport {
                user_data,
                assets,
                generated_at: Utc::now(),
            })
        }

        DsrType::Erasure => {
            // Verify no legal hold
            if has_legal_hold(&request.subject_email, db).await? {
                return Ok(DsrResponse::Denied {
                    reason: "Data subject to legal hold".into(),
                });
            }

            // Delete user data
            delete_user_data(&request.subject_email, db).await?;

            // Anonymize audit logs (can't delete for compliance)
            anonymize_audit_logs(&request.subject_email, db).await?;

            Ok(DsrResponse::Completed {
                completed_at: Utc::now(),
            })
        }

        DsrType::Portability => {
            // Export in machine-readable format
            let export = export_user_data_portable(&request.subject_email, db, storage).await?;

            Ok(DsrResponse::DataExport {
                format: "json".into(),
                data: export,
            })
        }

        // ... other request types
    }
}
```

#### Data Retention

```rust
pub struct RetentionPolicy {
    pub name: String,
    pub applies_to: DataCategory,
    pub retention_period: Duration,
    pub action_after_expiry: RetentionAction,
    pub legal_hold_override: bool,
}

pub enum DataCategory {
    UserContent,
    Metadata,
    AuditLogs,
    SecurityLogs,
    AccessLogs,
    Backups,
    DeletedContent,
}

pub enum RetentionAction {
    Delete,
    Anonymize,
    Archive,
}

// Default retention policies
pub fn default_retention_policies() -> Vec<RetentionPolicy> {
    vec![
        RetentionPolicy {
            name: "User Content".into(),
            applies_to: DataCategory::UserContent,
            retention_period: Duration::days(365 * 7),  // 7 years
            action_after_expiry: RetentionAction::Delete,
            legal_hold_override: true,
        },
        RetentionPolicy {
            name: "Audit Logs".into(),
            applies_to: DataCategory::AuditLogs,
            retention_period: Duration::days(365 * 7),  // 7 years (SOC2)
            action_after_expiry: RetentionAction::Archive,
            legal_hold_override: true,
        },
        RetentionPolicy {
            name: "Security Logs".into(),
            applies_to: DataCategory::SecurityLogs,
            retention_period: Duration::days(365 * 2),  // 2 years
            action_after_expiry: RetentionAction::Delete,
            legal_hold_override: false,
        },
        RetentionPolicy {
            name: "Deleted Content".into(),
            applies_to: DataCategory::DeletedContent,
            retention_period: Duration::days(30),       // 30 day recovery
            action_after_expiry: RetentionAction::Delete,
            legal_hold_override: true,
        },
    ]
}
```

---

## Security Checklist

### Pre-Launch Security Checklist

- [ ] **Authentication**
  - [ ] Password policy enforced
  - [ ] MFA available and encouraged
  - [ ] Session management secure
  - [ ] Account lockout implemented

- [ ] **Authorization**
  - [ ] RBAC fully implemented
  - [ ] Default deny policy
  - [ ] Privilege escalation prevented
  - [ ] Resource isolation verified

- [ ] **Data Protection**
  - [ ] Encryption at rest enabled
  - [ ] Encryption in transit (TLS 1.3)
  - [ ] Key management secure
  - [ ] Backup encryption

- [ ] **Application Security**
  - [ ] Input validation complete
  - [ ] SQL injection prevented
  - [ ] XSS prevented (if web UI)
  - [ ] CSRF protection (if web UI)
  - [ ] Rate limiting implemented

- [ ] **Infrastructure**
  - [ ] Network segmentation
  - [ ] Security groups configured
  - [ ] Secrets not in code
  - [ ] Dependencies scanned

- [ ] **Monitoring**
  - [ ] Security logging enabled
  - [ ] Alerting configured
  - [ ] Incident response plan
  - [ ] Regular log review

- [ ] **Compliance**
  - [ ] Privacy policy published
  - [ ] Data processing agreements
  - [ ] Retention policies defined
  - [ ] DSR process documented

---

## Incident Response

### Incident Classification

| Severity | Definition | Response Time | Examples |
| :--- | :--- | :--- | :--- |
| Critical | Active breach, data exfiltration | 15 minutes | Confirmed breach, ransomware |
| High | Potential breach, vulnerability exploited | 1 hour | Suspicious admin access |
| Medium | Security violation, policy breach | 4 hours | Failed brute force, unusual access |
| Low | Security event, informational | 24 hours | Failed login, rate limit hit |

### Incident Response Playbook

```rust
pub struct Incident {
    pub id: Uuid,
    pub severity: Severity,
    pub status: IncidentStatus,
    pub summary: String,
    pub detected_at: DateTime<Utc>,
    pub timeline: Vec<TimelineEntry>,
    pub affected_resources: Vec<String>,
    pub affected_users: Vec<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub root_cause: Option<String>,
    pub remediation: Option<String>,
}

pub enum IncidentStatus {
    Detected,
    Investigating,
    Contained,
    Eradicated,
    Recovered,
    PostMortem,
    Closed,
}

// Automated containment actions
pub async fn auto_contain(incident: &Incident) -> Vec<ContainmentAction> {
    let mut actions = Vec::new();

    match &incident.trigger {
        IncidentTrigger::CompromisedCredentials { user_id } => {
            // Terminate all sessions
            terminate_user_sessions(*user_id).await;
            actions.push(ContainmentAction::SessionsTerminated);

            // Force password reset
            force_password_reset(*user_id).await;
            actions.push(ContainmentAction::PasswordResetRequired);

            // Revoke API keys
            revoke_user_api_keys(*user_id).await;
            actions.push(ContainmentAction::ApiKeysRevoked);
        }

        IncidentTrigger::MaliciousIp { ip } => {
            // Block IP
            block_ip(*ip, Duration::hours(24)).await;
            actions.push(ContainmentAction::IpBlocked);
        }

        IncidentTrigger::DataExfiltration { user_id } => {
            // Suspend user
            suspend_user(*user_id).await;
            actions.push(ContainmentAction::UserSuspended);

            // Revoke shares
            revoke_user_shares(*user_id).await;
            actions.push(ContainmentAction::SharesRevoked);
        }
    }

    actions
}
```

---

## Summary

| Layer | Key Controls |
| :--- | :--- |
| Authentication | MFA, SSO, session management, account lockout |
| Authorization | RBAC, ABAC, least privilege, resource isolation |
| Transport | TLS 1.3, certificate pinning, QUIC security |
| Data | Encryption at rest, key management, classification |
| Application | Input validation, injection prevention, rate limiting |
| Infrastructure | Network segmentation, secrets management, WAF |
| Monitoring | Security logging, anomaly detection, alerting |
| Compliance | GDPR/CCPA, SOC2, data retention, incident response |
