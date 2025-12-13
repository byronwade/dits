# Authentication & Authorization Architecture

Complete specification for Dits authentication flows, token management, and authorization.

---

## Overview

Dits supports multiple authentication methods:

| Method | Use Case | Token Type |
|--------|----------|------------|
| Password | Web UI login | JWT + Refresh Token |
| OAuth 2.0 | SSO (GitHub, Google, GitLab) | JWT + Refresh Token |
| API Key | CI/CD, automation | Static key |
| Personal Access Token | CLI, scripts | Scoped token |

---

## Token Architecture

### JWT Access Token

```
Header:
{
  "alg": "ES256",
  "typ": "JWT",
  "kid": "key-2024-01"
}

Payload:
{
  "iss": "https://api.dits.io",
  "sub": "user:550e8400-e29b-41d4-a716-446655440000",
  "aud": ["https://api.dits.io"],
  "exp": 1704067200,
  "iat": 1704063600,
  "nbf": 1704063600,
  "jti": "unique-token-id",

  // Custom claims
  "uid": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "email": "john@example.com",
  "scopes": ["repo:read", "repo:write", "user:read"],
  "org_roles": {
    "acme-corp": "admin",
    "other-org": "member"
  }
}

Signature: ECDSA-SHA256
```

### Token Lifetimes

| Token Type | Lifetime | Refresh |
|------------|----------|---------|
| Access Token | 1 hour | Via refresh token |
| Refresh Token | 7 days | Rolling (extends on use) |
| API Key | Until revoked | N/A |
| Personal Access Token | Configurable (max 1 year) | N/A |

---

## Authentication Flows

### 1. Password Authentication

```
┌─────────┐                              ┌─────────┐                    ┌─────────┐
│  Client │                              │   API   │                    │   DB    │
└────┬────┘                              └────┬────┘                    └────┬────┘
     │                                        │                              │
     │  POST /v1/auth/login                   │                              │
     │  {username, password}                  │                              │
     │───────────────────────────────────────>│                              │
     │                                        │                              │
     │                                        │  Lookup user by username     │
     │                                        │─────────────────────────────>│
     │                                        │                              │
     │                                        │  User record                 │
     │                                        │<─────────────────────────────│
     │                                        │                              │
     │                                        │  Verify password (Argon2id)  │
     │                                        │──────────┐                   │
     │                                        │          │                   │
     │                                        │<─────────┘                   │
     │                                        │                              │
     │                                        │  Generate tokens             │
     │                                        │──────────┐                   │
     │                                        │          │                   │
     │                                        │<─────────┘                   │
     │                                        │                              │
     │                                        │  Store session               │
     │                                        │─────────────────────────────>│
     │                                        │                              │
     │  {access_token, refresh_token,         │                              │
     │   expires_in, token_type}              │                              │
     │<───────────────────────────────────────│                              │
     │                                        │                              │
```

**Request:**
```http
POST /v1/auth/login HTTP/1.1
Content-Type: application/json

{
  "username": "johndoe",
  "password": "secretpassword",
  "device_name": "MacBook Pro",
  "mfa_code": "123456"  // Optional, if MFA enabled
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "repo:read repo:write user:read",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

### 2. OAuth 2.0 Flow (GitHub Example)

```
┌─────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│  Client │          │   API   │          │  GitHub │          │   DB    │
└────┬────┘          └────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │                    │
     │ GET /v1/auth/      │                    │                    │
     │ oauth/github       │                    │                    │
     │───────────────────>│                    │                    │
     │                    │                    │                    │
     │ Redirect to GitHub │                    │                    │
     │ with state param   │                    │                    │
     │<───────────────────│                    │                    │
     │                    │                    │                    │
     │ User authorizes    │                    │                    │
     │────────────────────────────────────────>│                    │
     │                    │                    │                    │
     │ Redirect with code │                    │                    │
     │<────────────────────────────────────────│                    │
     │                    │                    │                    │
     │ GET /v1/auth/      │                    │                    │
     │ callback?code=...  │                    │                    │
     │───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │ Exchange code      │                    │
     │                    │ for token          │                    │
     │                    │───────────────────>│                    │
     │                    │                    │                    │
     │                    │ Access token       │                    │
     │                    │<───────────────────│                    │
     │                    │                    │                    │
     │                    │ Get user info      │                    │
     │                    │───────────────────>│                    │
     │                    │                    │                    │
     │                    │ User profile       │                    │
     │                    │<───────────────────│                    │
     │                    │                    │                    │
     │                    │ Find/create user   │                    │
     │                    │───────────────────────────────────────>│
     │                    │                    │                    │
     │                    │ Link OAuth account │                    │
     │                    │───────────────────────────────────────>│
     │                    │                    │                    │
     │ Redirect with      │                    │                    │
     │ Dits tokens        │                    │                    │
     │<───────────────────│                    │                    │
     │                    │                    │                    │
```

**1. Initiate OAuth:**
```http
GET /v1/auth/oauth/github HTTP/1.1
```

**2. Redirect to provider:**
```
https://github.com/login/oauth/authorize?
  client_id=Iv1.abc123&
  redirect_uri=https://api.dits.io/v1/auth/callback&
  scope=user:email%20read:org&
  state=random-state-string
```

**3. Handle callback:**
```http
GET /v1/auth/callback?code=abc123&state=random-state-string HTTP/1.1
```

**4. Response (redirect to frontend with tokens):**
```
https://app.dits.io/auth/success?
  access_token=eyJ...&
  refresh_token=abc...&
  expires_in=3600
```

### 3. Token Refresh

```http
POST /v1/auth/refresh HTTP/1.1
Content-Type: application/json

{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "bmV3IHJlZnJlc2ggdG9rZW4...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 4. API Key Authentication

API keys are used for machine-to-machine authentication.

**Create API Key:**
```http
POST /v1/user/api-keys HTTP/1.1
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "CI/CD Pipeline",
  "scopes": ["repo:read", "repo:write"],
  "expires_at": "2025-01-01T00:00:00Z"
}
```

**Response:**
```json
{
  "id": "key_abc123",
  "name": "CI/CD Pipeline",
  "key": "dits_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "key_prefix": "dits_key",
  "scopes": ["repo:read", "repo:write"],
  "expires_at": "2025-01-01T00:00:00Z",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Using API Key:**
```http
GET /v1/repos/myorg/myrepo HTTP/1.1
Authorization: Bearer dits_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Or via header:
```http
GET /v1/repos/myorg/myrepo HTTP/1.1
X-API-Key: dits_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Token Storage

### Server-Side Storage

```sql
-- Sessions table stores refresh token hashes
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,      -- SHA-256(access_token)
    refresh_token_hash VARCHAR(64),        -- SHA-256(refresh_token)
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Client-Side Storage (Recommendations)

| Platform | Access Token | Refresh Token |
|----------|--------------|---------------|
| Web Browser | Memory only | HttpOnly cookie |
| Mobile App | Secure Keychain | Secure Keychain |
| CLI | Config file (600 perms) | Config file |
| CI/CD | Environment variable | N/A (use API key) |

---

## Password Security

### Hashing Algorithm: Argon2id

```rust
use argon2::{Argon2, PasswordHasher, PasswordVerifier};

// Configuration
const ARGON2_MEMORY: u32 = 65536;    // 64 MB
const ARGON2_ITERATIONS: u32 = 3;
const ARGON2_PARALLELISM: u32 = 4;
const ARGON2_OUTPUT_LEN: usize = 32;

fn hash_password(password: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::new(
        Algorithm::Argon2id,
        Version::V0x13,
        Params::new(
            ARGON2_MEMORY,
            ARGON2_ITERATIONS,
            ARGON2_PARALLELISM,
            Some(ARGON2_OUTPUT_LEN)
        ).unwrap()
    );

    argon2.hash_password(password.as_bytes(), &salt)
        .unwrap()
        .to_string()
}

fn verify_password(password: &str, hash: &str) -> bool {
    let parsed = PasswordHash::new(hash).unwrap();
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok()
}
```

### Password Requirements

- Minimum 12 characters
- No maximum length (up to reasonable limit ~1000)
- Must not be in common password list (top 100k)
- Checked against HaveIBeenPwned API (optional)

---

## Scopes & Permissions

### Available Scopes

| Scope | Description |
|-------|-------------|
| `repo:read` | Read access to repositories |
| `repo:write` | Write access to repositories |
| `repo:delete` | Delete repositories |
| `repo:admin` | Admin access (settings, collaborators) |
| `user:read` | Read user profile |
| `user:write` | Modify user profile |
| `org:read` | Read organization info |
| `org:write` | Modify organization |
| `org:admin` | Organization admin |
| `webhook:read` | Read webhooks |
| `webhook:write` | Manage webhooks |
| `key:read` | List API keys |
| `key:write` | Create/revoke API keys |

### Scope Hierarchy

```
repo:admin
  └── repo:write
        └── repo:read

org:admin
  └── org:write
        └── org:read

user:write
  └── user:read
```

---

## Authorization Checks

### Repository Access

```rust
pub async fn check_repo_access(
    user_id: Uuid,
    repo: &Repository,
    required_permission: Permission,
) -> Result<(), AuthError> {
    // 1. Check if public repository (read-only)
    if repo.visibility == Visibility::Public
       && required_permission == Permission::Read {
        return Ok(());
    }

    // 2. Check if owner
    if repo.owner_id == user_id {
        return Ok(());
    }

    // 3. Check direct collaborator access
    if let Some(collab) = get_collaborator(repo.id, user_id).await? {
        if collab.permission >= required_permission {
            return Ok(());
        }
    }

    // 4. Check team access (for org repos)
    if repo.owner_type == OwnerType::Organization {
        let teams = get_user_teams(repo.owner_id, user_id).await?;
        for team in teams {
            if let Some(team_repo) = get_team_repo(team.id, repo.id).await? {
                if team_repo.permission >= required_permission {
                    return Ok(());
                }
            }
        }

        // 5. Check org membership for internal repos
        if repo.visibility == Visibility::Internal {
            if is_org_member(repo.owner_id, user_id).await? {
                return Ok(());
            }
        }
    }

    Err(AuthError::Forbidden)
}
```

### Permission Middleware

```rust
pub async fn require_permission(
    State(state): State<AppState>,
    Path((owner, name)): Path<(String, String)>,
    auth: AuthenticatedUser,
    req: Request,
    next: Next,
) -> Response {
    let repo = state.db.get_repository(&owner, &name).await?;

    let required = match req.method() {
        Method::GET | Method::HEAD => Permission::Read,
        Method::POST | Method::PUT | Method::PATCH => Permission::Write,
        Method::DELETE => Permission::Admin,
        _ => Permission::Read,
    };

    check_repo_access(auth.user_id, &repo, required).await?;

    next.run(req).await
}
```

---

## Security Measures

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 5 attempts | 15 minutes |
| `/auth/register` | 3 attempts | 1 hour |
| `/auth/password-reset` | 3 attempts | 1 hour |
| `/auth/refresh` | 30 requests | 1 hour |
| API (authenticated) | 5000 requests | 1 hour |

### Brute Force Protection

```rust
pub async fn check_login_attempts(
    ip: IpAddr,
    username: &str,
) -> Result<(), AuthError> {
    let key = format!("login_attempts:{}:{}", ip, username);
    let attempts: u32 = redis.get(&key).await?.unwrap_or(0);

    if attempts >= 5 {
        let ttl = redis.ttl(&key).await?;
        return Err(AuthError::TooManyAttempts { retry_after: ttl });
    }

    Ok(())
}

pub async fn record_failed_login(ip: IpAddr, username: &str) {
    let key = format!("login_attempts:{}:{}", ip, username);
    redis.incr(&key).await?;
    redis.expire(&key, 900).await?;  // 15 minutes
}

pub async fn clear_login_attempts(ip: IpAddr, username: &str) {
    let key = format!("login_attempts:{}:{}", ip, username);
    redis.del(&key).await?;
}
```

### Token Revocation

```rust
// Revoke all sessions for a user
pub async fn revoke_all_sessions(user_id: Uuid) -> Result<()> {
    sqlx::query!(
        "DELETE FROM sessions WHERE user_id = $1",
        user_id
    )
    .execute(&pool)
    .await?;

    // Also add to blocklist for immediate effect
    let blocklist_key = format!("token_blocklist:{}", user_id);
    redis.set(&blocklist_key, "1").await?;
    redis.expire(&blocklist_key, 3600).await?;  // 1 hour (max token lifetime)

    Ok(())
}

// Check if token is revoked
pub async fn is_token_revoked(user_id: Uuid, jti: &str) -> bool {
    let user_key = format!("token_blocklist:{}", user_id);
    let token_key = format!("token_blocklist:jti:{}", jti);

    redis.exists(&user_key).await.unwrap_or(false)
        || redis.exists(&token_key).await.unwrap_or(false)
}
```

---

## Multi-Factor Authentication (MFA)

### TOTP Setup

```http
POST /v1/user/mfa/totp/setup HTTP/1.1
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code_url": "data:image/png;base64,...",
  "backup_codes": [
    "abc123def456",
    "ghi789jkl012",
    ...
  ]
}
```

### TOTP Verification

```http
POST /v1/user/mfa/totp/verify HTTP/1.1
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "123456"
}
```

### Login with MFA

```http
POST /v1/auth/login HTTP/1.1
Content-Type: application/json

{
  "username": "johndoe",
  "password": "secretpassword"
}
```

**Response (MFA required):**
```json
{
  "mfa_required": true,
  "mfa_token": "temp_token_for_mfa",
  "mfa_methods": ["totp", "backup_code"]
}
```

**Complete MFA:**
```http
POST /v1/auth/mfa HTTP/1.1
Content-Type: application/json

{
  "mfa_token": "temp_token_for_mfa",
  "code": "123456",
  "method": "totp"
}
```

---

## CLI Authentication

### Device Authorization Flow

```
┌─────────┐                              ┌─────────┐
│   CLI   │                              │   API   │
└────┬────┘                              └────┬────┘
     │                                        │
     │  POST /v1/auth/device                  │
     │───────────────────────────────────────>│
     │                                        │
     │  {device_code, user_code,              │
     │   verification_uri, expires_in}        │
     │<───────────────────────────────────────│
     │                                        │
     │  Display to user:                      │
     │  "Visit https://dits.io/device         │
     │   and enter code: ABCD-1234"           │
     │                                        │
     │  Poll: POST /v1/auth/device/token      │
     │  {device_code}                         │
     │───────────────────────────────────────>│
     │                                        │
     │  {"error": "authorization_pending"}    │
     │<───────────────────────────────────────│
     │                                        │
     │  ... user authorizes in browser ...    │
     │                                        │
     │  Poll: POST /v1/auth/device/token      │
     │───────────────────────────────────────>│
     │                                        │
     │  {access_token, refresh_token}         │
     │<───────────────────────────────────────│
     │                                        │
```

### CLI Token Storage

```bash
# ~/.config/dits/credentials.toml
[default]
token = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
refresh_token = "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
expires_at = "2024-01-15T12:00:00Z"

[work]
token = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
endpoint = "https://api.company.dits.io"
```

---

## Key Rotation

### JWT Signing Keys

Keys are rotated every 90 days:

1. Generate new key pair
2. Add new key to active keys (identified by `kid`)
3. Start signing new tokens with new key
4. Old key remains valid for verification (1 week overlap)
5. Remove old key from active keys

```rust
pub struct KeyManager {
    current_key_id: String,
    keys: HashMap<String, SigningKey>,
}

impl KeyManager {
    pub fn sign(&self, claims: &Claims) -> String {
        let key = &self.keys[&self.current_key_id];
        jwt::sign(claims, key, &self.current_key_id)
    }

    pub fn verify(&self, token: &str) -> Result<Claims, JwtError> {
        let header = jwt::decode_header(token)?;
        let key = self.keys.get(&header.kid)
            .ok_or(JwtError::UnknownKey)?;
        jwt::verify(token, key)
    }
}
```

---

## Audit Logging

All authentication events are logged:

```sql
INSERT INTO audit_logs (
    actor_id,
    actor_type,
    action,
    resource_type,
    metadata,
    ip_address,
    user_agent
) VALUES (
    $1,
    'user',
    'auth.login.success',
    'session',
    '{"session_id": "...", "method": "password"}',
    $2,
    $3
);
```

### Logged Events

- `auth.login.success`
- `auth.login.failed`
- `auth.logout`
- `auth.token.refresh`
- `auth.mfa.enabled`
- `auth.mfa.disabled`
- `auth.api_key.created`
- `auth.api_key.revoked`
- `auth.password.changed`
- `auth.password.reset.requested`
- `auth.password.reset.completed`

---

## Implementation Checklist

- [ ] JWT token generation and validation
- [ ] Password hashing with Argon2id
- [ ] OAuth 2.0 providers (GitHub, Google, GitLab)
- [ ] Refresh token rotation
- [ ] API key management
- [ ] Session management
- [ ] Rate limiting
- [ ] Brute force protection
- [ ] Token revocation
- [ ] MFA (TOTP)
- [ ] Device authorization flow (CLI)
- [ ] Audit logging
- [ ] Key rotation

