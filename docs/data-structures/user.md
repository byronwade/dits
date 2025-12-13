# User (The Identity)

A user represents an authenticated identity in the Dits system, with associated permissions, preferences, and cryptographic keys.

---

## Data Structure

```rust
/// User represents an authenticated identity
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct User {
    /// Unique identifier
    pub id: Uuid,

    /// Username (unique, URL-safe)
    pub username: String,

    /// Display name
    pub name: String,

    /// Email address (unique)
    pub email: String,

    /// Email verified flag
    pub email_verified: bool,

    /// Avatar URL
    pub avatar_url: Option<String>,

    /// User status
    pub status: UserStatus,

    /// Account creation time
    pub created_at: DateTime<Utc>,

    /// Last activity time
    pub last_active_at: Option<DateTime<Utc>>,

    /// User preferences
    pub preferences: UserPreferences,

    /// Organization memberships
    pub organizations: Vec<OrgMembership>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum UserStatus {
    Active,
    Suspended { reason: String, until: Option<DateTime<Utc>> },
    PendingVerification,
    Deleted,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UserPreferences {
    /// Timezone for display
    pub timezone: String,

    /// Date format preference
    pub date_format: String,

    /// Notification preferences
    pub notifications: NotificationPreferences,

    /// Default editor/tool
    pub default_editor: Option<String>,

    /// Theme preference
    pub theme: Theme,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NotificationPreferences {
    pub email_on_mention: bool,
    pub email_on_review_request: bool,
    pub email_on_lock_expiry: bool,
    pub email_on_push: bool,
    pub email_digest: DigestFrequency,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum DigestFrequency {
    Never,
    Daily,
    Weekly,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Theme {
    Light,
    Dark,
    System,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OrgMembership {
    pub org_id: Uuid,
    pub org_name: String,
    pub role: OrgRole,
    pub joined_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum OrgRole {
    Owner,
    Admin,
    Member,
    Guest,
}
```

---

## Authentication

```rust
/// Credentials for authentication
#[derive(Serialize, Deserialize, Debug)]
pub struct Credentials {
    /// Hashed password (Argon2id)
    pub password_hash: String,

    /// Password salt
    pub salt: String,

    /// MFA configuration
    pub mfa: Option<MfaConfig>,

    /// Password changed timestamp
    pub password_changed_at: DateTime<Utc>,

    /// Force password change on next login
    pub force_password_change: bool,

    /// Failed login attempts (reset on success)
    pub failed_attempts: u32,

    /// Account locked until
    pub locked_until: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MfaConfig {
    pub enabled: bool,
    pub methods: Vec<MfaMethod>,
    pub recovery_codes_remaining: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum MfaMethod {
    Totp { secret_encrypted: String },
    WebAuthn { credentials: Vec<WebAuthnCredential> },
    Sms { phone_encrypted: String },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WebAuthnCredential {
    pub id: Vec<u8>,
    pub public_key: Vec<u8>,
    pub counter: u32,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
    pub name: String,
}

/// Session represents an authenticated session
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub last_active_at: DateTime<Utc>,
    pub ip_address: String,
    pub user_agent: String,
    pub device_id: Option<String>,
    pub mfa_verified: bool,
}

/// API Token for programmatic access
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ApiToken {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub token_hash: String,  // Only hash stored
    pub scopes: Vec<Scope>,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub last_used_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Scope {
    RepoRead,
    RepoWrite,
    RepoAdmin,
    UserRead,
    UserWrite,
    OrgRead,
    OrgWrite,
}
```

---

## Cryptographic Keys

```rust
/// User's cryptographic keys for encryption
#[derive(Serialize, Deserialize, Debug)]
pub struct UserKeys {
    pub user_id: Uuid,

    /// Encrypted key bundle (encrypted with user's password-derived key)
    pub encrypted_key_bundle: Vec<u8>,

    /// Salt for key derivation
    pub key_salt: Vec<u8>,

    /// Argon2 parameters used
    pub kdf_params: KdfParams,

    /// X25519 public key for key exchange
    pub public_key: Vec<u8>,

    /// Key version (for rotation)
    pub key_version: u32,

    /// When keys were last rotated
    pub rotated_at: DateTime<Utc>,

    /// Recovery escrow (for enterprise)
    pub recovery_escrow: Option<RecoveryEscrow>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct KdfParams {
    pub algorithm: String,  // "argon2id"
    pub memory_cost: u32,
    pub time_cost: u32,
    pub parallelism: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RecoveryEscrow {
    /// Encrypted with org admin's key
    pub encrypted_key: Vec<u8>,
    pub escrowed_at: DateTime<Utc>,
    pub escrowed_by: Uuid,
}
```

---

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_verification',
    status_reason TEXT,
    status_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    preferences JSONB NOT NULL DEFAULT '{}'
);

-- Credentials (separate table for security)
CREATE TABLE user_credentials (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    mfa_config JSONB,
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    force_password_change BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ
);

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_id TEXT,
    mfa_verified BOOLEAN NOT NULL DEFAULT FALSE
);

-- API Tokens
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    scopes JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
);

-- Cryptographic Keys
CREATE TABLE user_keys (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    encrypted_key_bundle BYTEA NOT NULL,
    key_salt BYTEA NOT NULL,
    kdf_params JSONB NOT NULL,
    public_key BYTEA NOT NULL,
    key_version INT NOT NULL DEFAULT 1,
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recovery_escrow JSONB
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_sessions_user ON sessions(user_id, expires_at);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
```

---

## Operations

### Create User

```rust
pub async fn create_user(
    request: CreateUserRequest,
    db: &Pool,
) -> Result<User> {
    // Validate username
    validate_username(&request.username)?;

    // Validate email
    validate_email(&request.email)?;

    // Validate password strength
    validate_password(&request.password)?;

    // Check for duplicates
    if user_exists_by_email(&request.email, db).await? {
        return Err(Error::EmailAlreadyExists);
    }
    if user_exists_by_username(&request.username, db).await? {
        return Err(Error::UsernameAlreadyExists);
    }

    // Hash password
    let salt = generate_salt();
    let password_hash = argon2_hash(&request.password, &salt)?;

    // Generate cryptographic keys
    let key_salt = generate_salt();
    let root_key = derive_root_key(&request.password, &key_salt)?;
    let key_bundle = generate_key_bundle(&root_key)?;
    let encrypted_bundle = encrypt_key_bundle(&key_bundle, &root_key)?;
    let public_key = key_bundle.public_key();

    let user_id = Uuid::new_v4();

    // Create user
    let mut tx = db.begin().await?;

    sqlx::query!(
        r#"
        INSERT INTO users (id, username, name, email, status)
        VALUES ($1, $2, $3, $4, 'pending_verification')
        "#,
        user_id,
        request.username,
        request.name,
        request.email,
    )
    .execute(&mut tx)
    .await?;

    sqlx::query!(
        r#"
        INSERT INTO user_credentials (user_id, password_hash, salt)
        VALUES ($1, $2, $3)
        "#,
        user_id,
        password_hash,
        salt,
    )
    .execute(&mut tx)
    .await?;

    sqlx::query!(
        r#"
        INSERT INTO user_keys (user_id, encrypted_key_bundle, key_salt, kdf_params, public_key)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        user_id,
        &encrypted_bundle,
        &key_salt,
        serde_json::to_value(&KDF_PARAMS)?,
        &public_key,
    )
    .execute(&mut tx)
    .await?;

    tx.commit().await?;

    // Send verification email
    send_verification_email(&request.email, user_id).await?;

    Ok(User {
        id: user_id,
        username: request.username,
        name: request.name,
        email: request.email,
        email_verified: false,
        status: UserStatus::PendingVerification,
        created_at: Utc::now(),
        ..Default::default()
    })
}
```

### Authenticate User

```rust
pub async fn authenticate(
    email: &str,
    password: &str,
    ip_address: &str,
    user_agent: &str,
    db: &Pool,
) -> Result<AuthResult> {
    // Get user and credentials
    let user = get_user_by_email(email, db).await?
        .ok_or(Error::InvalidCredentials)?;

    let creds = get_credentials(user.id, db).await?;

    // Check account status
    if user.status == UserStatus::Suspended { .. } {
        return Err(Error::AccountSuspended);
    }

    // Check lockout
    if let Some(locked_until) = creds.locked_until {
        if locked_until > Utc::now() {
            return Err(Error::AccountLocked { until: locked_until });
        }
    }

    // Verify password
    if !verify_password(password, &creds.password_hash, &creds.salt)? {
        // Increment failed attempts
        increment_failed_attempts(user.id, db).await?;

        // Lock account if too many failures
        if creds.failed_attempts + 1 >= MAX_FAILED_ATTEMPTS {
            lock_account(user.id, Duration::minutes(30), db).await?;
        }

        return Err(Error::InvalidCredentials);
    }

    // Reset failed attempts
    reset_failed_attempts(user.id, db).await?;

    // Check if MFA required
    if let Some(mfa) = &creds.mfa {
        if mfa.enabled {
            return Ok(AuthResult::MfaRequired {
                user_id: user.id,
                methods: mfa.methods.clone(),
            });
        }
    }

    // Create session
    let session = create_session(user.id, ip_address, user_agent, false, db).await?;

    // Update last active
    update_last_active(user.id, db).await?;

    Ok(AuthResult::Success {
        user,
        session,
    })
}
```

### Create API Token

```rust
pub async fn create_api_token(
    user_id: Uuid,
    name: &str,
    scopes: Vec<Scope>,
    expires_in: Option<Duration>,
    db: &Pool,
) -> Result<(ApiToken, String)> {
    // Generate random token
    let token_bytes = generate_random_bytes(32);
    let token = format!("dits_{}", base64url::encode(&token_bytes));

    // Hash token for storage
    let token_hash = sha256(&token);

    let expires_at = expires_in.map(|d| Utc::now() + d);

    let api_token = ApiToken {
        id: Uuid::new_v4(),
        user_id,
        name: name.to_string(),
        token_hash: hex::encode(&token_hash),
        scopes,
        created_at: Utc::now(),
        expires_at,
        last_used_at: None,
    };

    sqlx::query!(
        r#"
        INSERT INTO api_tokens (id, user_id, name, token_hash, scopes, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
        api_token.id,
        user_id,
        name,
        api_token.token_hash,
        serde_json::to_value(&api_token.scopes)?,
        expires_at,
    )
    .execute(db)
    .await?;

    // Return token (only time it's visible in plaintext)
    Ok((api_token, token))
}
```

### Update User Preferences

```rust
pub async fn update_preferences(
    user_id: Uuid,
    updates: UserPreferencesUpdate,
    db: &Pool,
) -> Result<UserPreferences> {
    let current = get_user_preferences(user_id, db).await?;

    let updated = UserPreferences {
        timezone: updates.timezone.unwrap_or(current.timezone),
        date_format: updates.date_format.unwrap_or(current.date_format),
        notifications: updates.notifications.unwrap_or(current.notifications),
        default_editor: updates.default_editor.or(current.default_editor),
        theme: updates.theme.unwrap_or(current.theme),
    };

    sqlx::query!(
        "UPDATE users SET preferences = $2 WHERE id = $1",
        user_id,
        serde_json::to_value(&updated)?,
    )
    .execute(db)
    .await?;

    Ok(updated)
}
```

---

## Username Validation

```rust
pub fn validate_username(username: &str) -> Result<()> {
    // Length: 3-39 characters
    if username.len() < 3 || username.len() > 39 {
        return Err(Error::InvalidUsername("Must be 3-39 characters"));
    }

    // Must start with alphanumeric
    if !username.chars().next().map(|c| c.is_alphanumeric()).unwrap_or(false) {
        return Err(Error::InvalidUsername("Must start with letter or number"));
    }

    // Only alphanumeric and hyphens
    if !username.chars().all(|c| c.is_alphanumeric() || c == '-') {
        return Err(Error::InvalidUsername("Only letters, numbers, and hyphens allowed"));
    }

    // No consecutive hyphens
    if username.contains("--") {
        return Err(Error::InvalidUsername("No consecutive hyphens"));
    }

    // Cannot end with hyphen
    if username.ends_with('-') {
        return Err(Error::InvalidUsername("Cannot end with hyphen"));
    }

    // Reserved usernames
    let reserved = ["admin", "administrator", "root", "system", "dits", "api", "www", "help", "support"];
    if reserved.contains(&username.to_lowercase().as_str()) {
        return Err(Error::InvalidUsername("Reserved username"));
    }

    Ok(())
}
```

---

## Notes

- Password hashing uses Argon2id with tuned parameters
- MFA supports TOTP, WebAuthn, and SMS (discouraged)
- API tokens use prefix `dits_` for easy identification
- Sessions are stateful (stored in database) for revocation support
- Cryptographic keys are encrypted with password-derived key
- Email verification required before account activation
- Account lockout after failed login attempts
- All sensitive data encrypted at rest
