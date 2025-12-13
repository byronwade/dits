# Remote Data Structure

Remote server configuration and synchronization state.

---

## Overview

A Remote represents a connection to a Dits server that hosts repositories. Remotes store connection details, authentication credentials, and synchronization state.

---

## Data Structure

```rust
use serde::{Deserialize, Serialize};
use url::Url;

/// Remote server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Remote {
    /// Remote name (e.g., "origin", "upstream")
    pub name: String,

    /// Remote URL
    pub url: Url,

    /// Push URL (if different from fetch URL)
    pub push_url: Option<Url>,

    /// Authentication configuration
    pub auth: RemoteAuth,

    /// Fetch refspecs
    pub fetch_refspecs: Vec<Refspec>,

    /// Push refspecs
    pub push_refspecs: Vec<Refspec>,

    /// Last fetch timestamp
    pub last_fetch: Option<DateTime<Utc>>,

    /// Cached remote HEAD
    pub head: Option<String>,

    /// Remote capabilities
    pub capabilities: RemoteCapabilities,

    /// Connection settings
    pub connection: ConnectionSettings,
}

/// Authentication configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RemoteAuth {
    /// No authentication
    None,

    /// Token-based authentication
    Token {
        /// Access token
        token: String,
        /// Token expiration
        expires_at: Option<DateTime<Utc>>,
    },

    /// SSH key authentication
    Ssh {
        /// Path to private key
        key_path: PathBuf,
        /// Key passphrase (stored securely)
        passphrase: Option<String>,
    },

    /// OAuth authentication
    OAuth {
        /// Provider (github, google, etc.)
        provider: String,
        /// Access token
        access_token: String,
        /// Refresh token
        refresh_token: Option<String>,
        /// Token expiration
        expires_at: Option<DateTime<Utc>>,
    },

    /// Credential helper
    CredentialHelper {
        /// Helper command
        helper: String,
    },
}

/// Refspec for fetch/push mappings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Refspec {
    /// Source pattern
    pub src: String,

    /// Destination pattern
    pub dst: String,

    /// Force update
    pub force: bool,
}

/// Remote server capabilities
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RemoteCapabilities {
    /// Supports chunked transfer
    pub chunked_transfer: bool,

    /// Supports delta sync
    pub delta_sync: bool,

    /// Supports locking
    pub locking: bool,

    /// Supports webhooks
    pub webhooks: bool,

    /// Maximum chunk size
    pub max_chunk_size: Option<u64>,

    /// Supported wire protocol version
    pub protocol_version: u32,

    /// Supports compression
    pub compression: Vec<String>,

    /// Supports encryption
    pub encryption: Vec<String>,
}

/// Connection settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionSettings {
    /// Connection timeout
    #[serde(with = "humantime_serde")]
    pub timeout: Duration,

    /// Number of concurrent connections
    pub connections: u32,

    /// Retry attempts
    pub retries: u32,

    /// Retry delay
    #[serde(with = "humantime_serde")]
    pub retry_delay: Duration,

    /// Proxy URL
    pub proxy: Option<Url>,

    /// Disable SSL verification (not recommended)
    pub insecure: bool,

    /// Custom CA certificate path
    pub ca_cert: Option<PathBuf>,
}

impl Default for ConnectionSettings {
    fn default() -> Self {
        Self {
            timeout: Duration::from_secs(30),
            connections: 4,
            retries: 3,
            retry_delay: Duration::from_secs(1),
            proxy: None,
            insecure: false,
            ca_cert: None,
        }
    }
}
```

---

## Remote State

```rust
/// State of synchronization with remote
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteState {
    /// Remote name
    pub remote: String,

    /// Branch states
    pub branches: HashMap<String, RemoteBranchState>,

    /// Last successful sync
    pub last_sync: Option<DateTime<Utc>>,

    /// Pending operations
    pub pending: Vec<PendingOperation>,
}

/// State of a remote branch
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteBranchState {
    /// Branch name
    pub name: String,

    /// Remote commit hash
    pub commit: String,

    /// Local tracking branch commit
    pub local_commit: Option<String>,

    /// Ahead/behind counts
    pub ahead: u32,
    pub behind: u32,

    /// Last update time
    pub updated_at: DateTime<Utc>,
}

/// Pending operation to sync
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingOperation {
    /// Operation type
    pub op_type: OperationType,

    /// Target reference
    pub target: String,

    /// Created at
    pub created_at: DateTime<Utc>,

    /// Retry count
    pub retries: u32,

    /// Last error
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationType {
    Push { branch: String, commits: Vec<String> },
    Fetch { branch: String },
    Delete { branch: String },
    Lock { path: String },
    Unlock { path: String },
}
```

---

## Remote Configuration File

```toml
# .dits/config - Remote configuration section

[remote "origin"]
url = "https://dits.io/myorg/myrepo"
push_url = "https://dits.io/myorg/myrepo"
fetch = "+refs/heads/*:refs/remotes/origin/*"
push = "refs/heads/*:refs/heads/*"

[remote "origin".auth]
type = "token"
# Token stored in credential store

[remote "origin".connection]
timeout = "30s"
connections = 4
retries = 3

[remote "backup"]
url = "https://backup.dits.io/myorg/myrepo"
fetch = "+refs/heads/main:refs/remotes/backup/main"
push = "refs/heads/main:refs/heads/main"
```

---

## Operations

### Add Remote

```rust
impl Repository {
    /// Add a new remote
    pub fn add_remote(&mut self, name: &str, url: &str) -> Result<Remote> {
        // Validate URL
        let parsed_url = Url::parse(url)?;

        // Check for duplicate
        if self.remotes.contains_key(name) {
            return Err(Error::RemoteExists(name.to_string()));
        }

        // Create remote with defaults
        let remote = Remote {
            name: name.to_string(),
            url: parsed_url,
            push_url: None,
            auth: RemoteAuth::None,
            fetch_refspecs: vec![Refspec {
                src: "refs/heads/*".to_string(),
                dst: format!("refs/remotes/{}/*", name),
                force: true,
            }],
            push_refspecs: vec![Refspec {
                src: "refs/heads/*".to_string(),
                dst: "refs/heads/*".to_string(),
                force: false,
            }],
            last_fetch: None,
            head: None,
            capabilities: RemoteCapabilities::default(),
            connection: ConnectionSettings::default(),
        };

        // Probe for capabilities
        let capabilities = self.probe_remote_capabilities(&remote).await?;
        remote.capabilities = capabilities;

        // Save to config
        self.remotes.insert(name.to_string(), remote.clone());
        self.save_config()?;

        Ok(remote)
    }

    /// Remove a remote
    pub fn remove_remote(&mut self, name: &str) -> Result<()> {
        self.remotes.remove(name)
            .ok_or_else(|| Error::RemoteNotFound(name.to_string()))?;

        // Remove tracking branches
        self.remove_remote_tracking_branches(name)?;

        self.save_config()?;
        Ok(())
    }

    /// Rename a remote
    pub fn rename_remote(&mut self, old: &str, new: &str) -> Result<()> {
        let mut remote = self.remotes.remove(old)
            .ok_or_else(|| Error::RemoteNotFound(old.to_string()))?;

        remote.name = new.to_string();

        // Update refspecs
        for refspec in &mut remote.fetch_refspecs {
            refspec.dst = refspec.dst.replace(
                &format!("refs/remotes/{}/", old),
                &format!("refs/remotes/{}/", new),
            );
        }

        // Rename tracking branches
        self.rename_remote_tracking_branches(old, new)?;

        self.remotes.insert(new.to_string(), remote);
        self.save_config()?;
        Ok(())
    }
}
```

### Connect and Authenticate

```rust
impl Remote {
    /// Connect to remote and authenticate
    pub async fn connect(&self) -> Result<RemoteConnection> {
        let client = HttpClient::builder()
            .timeout(self.connection.timeout)
            .pool_max_idle_per_host(self.connection.connections as usize)
            .build()?;

        // Apply proxy if configured
        let client = if let Some(proxy) = &self.connection.proxy {
            client.proxy(Proxy::all(proxy.as_str())?)
        } else {
            client
        };

        // Add authentication
        let client = match &self.auth {
            RemoteAuth::Token { token, .. } => {
                client.default_headers({
                    let mut headers = HeaderMap::new();
                    headers.insert(
                        AUTHORIZATION,
                        format!("Bearer {}", token).parse()?,
                    );
                    headers
                })
            }
            RemoteAuth::OAuth { access_token, .. } => {
                client.default_headers({
                    let mut headers = HeaderMap::new();
                    headers.insert(
                        AUTHORIZATION,
                        format!("Bearer {}", access_token).parse()?,
                    );
                    headers
                })
            }
            _ => client,
        };

        // Test connection
        let response = client
            .get(self.url.join("/api/v1/health")?)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(Error::ConnectionFailed(response.status()));
        }

        Ok(RemoteConnection {
            remote: self.clone(),
            client: client.build()?,
        })
    }

    /// Refresh OAuth token if expired
    pub async fn refresh_auth(&mut self) -> Result<()> {
        if let RemoteAuth::OAuth {
            provider,
            refresh_token,
            expires_at,
            ..
        } = &self.auth {
            if let Some(expires) = expires_at {
                if Utc::now() >= *expires - Duration::minutes(5) {
                    // Token expired or expiring soon
                    if let Some(refresh) = refresh_token {
                        let new_token = self.refresh_oauth_token(provider, refresh).await?;
                        self.auth = RemoteAuth::OAuth {
                            provider: provider.clone(),
                            access_token: new_token.access_token,
                            refresh_token: new_token.refresh_token,
                            expires_at: Some(Utc::now() + Duration::seconds(new_token.expires_in)),
                        };
                    } else {
                        return Err(Error::TokenExpired);
                    }
                }
            }
        }
        Ok(())
    }
}
```

### Fetch and Push

```rust
impl RemoteConnection {
    /// Fetch updates from remote
    pub async fn fetch(&self, refspecs: &[Refspec]) -> Result<FetchResult> {
        let mut result = FetchResult::default();

        for refspec in refspecs {
            // Get remote refs matching pattern
            let refs = self.list_refs(&refspec.src).await?;

            for remote_ref in refs {
                // Map to local ref
                let local_ref = refspec.map_to_local(&remote_ref.name);

                // Check if update needed
                let local_commit = self.repo.resolve_ref(&local_ref)?;

                if local_commit.as_ref() != Some(&remote_ref.commit) {
                    // Download objects
                    self.download_objects(&remote_ref.commit).await?;

                    // Update local ref
                    self.repo.update_ref(&local_ref, &remote_ref.commit, refspec.force)?;

                    result.updated.push(RefUpdate {
                        name: local_ref,
                        old: local_commit,
                        new: remote_ref.commit,
                    });
                }
            }
        }

        // Update last fetch time
        self.repo.update_remote_last_fetch(&self.remote.name)?;

        Ok(result)
    }

    /// Push changes to remote
    pub async fn push(&self, refspecs: &[Refspec]) -> Result<PushResult> {
        let mut result = PushResult::default();

        for refspec in refspecs {
            // Get local refs matching pattern
            let refs = self.repo.list_refs(&refspec.src)?;

            for local_ref in refs {
                // Map to remote ref
                let remote_ref = refspec.map_to_remote(&local_ref.name);

                // Get remote state
                let remote_commit = self.get_remote_ref(&remote_ref).await?;

                // Check if push needed
                if remote_commit.as_ref() == Some(&local_ref.commit) {
                    continue; // Already up to date
                }

                // Check for non-fast-forward
                if let Some(rc) = &remote_commit {
                    if !self.repo.is_ancestor(rc, &local_ref.commit)? {
                        if !refspec.force {
                            result.rejected.push(RefRejection {
                                name: remote_ref,
                                reason: "non-fast-forward".to_string(),
                            });
                            continue;
                        }
                    }
                }

                // Upload objects
                self.upload_objects(&local_ref.commit, remote_commit.as_deref()).await?;

                // Update remote ref
                self.update_remote_ref(&remote_ref, &local_ref.commit).await?;

                result.updated.push(RefUpdate {
                    name: remote_ref,
                    old: remote_commit,
                    new: local_ref.commit.clone(),
                });
            }
        }

        Ok(result)
    }
}
```

---

## Storage Format

### Binary Format

```rust
/// Remote configuration binary format
#[derive(Debug, Serialize, Deserialize)]
pub struct RemoteFile {
    /// Magic bytes: "DRMT"
    pub magic: [u8; 4],

    /// Format version
    pub version: u32,

    /// Remote entries
    pub remotes: Vec<RemoteEntry>,

    /// Checksum
    pub checksum: [u8; 32],
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RemoteEntry {
    /// Remote name
    pub name: String,

    /// Remote URL
    pub url: String,

    /// Push URL
    pub push_url: Option<String>,

    /// Auth type
    pub auth_type: u8,

    /// Refspecs
    pub fetch_refspecs: Vec<String>,
    pub push_refspecs: Vec<String>,

    /// Flags
    pub flags: u32,
}

impl RemoteFile {
    const MAGIC: [u8; 4] = *b"DRMT";
    const VERSION: u32 = 1;

    pub fn serialize(&self) -> Vec<u8> {
        let mut buf = Vec::new();

        buf.extend_from_slice(&Self::MAGIC);
        buf.extend_from_slice(&Self::VERSION.to_le_bytes());

        // Serialize remotes
        let remotes_data = bincode::serialize(&self.remotes).unwrap();
        buf.extend_from_slice(&(remotes_data.len() as u32).to_le_bytes());
        buf.extend_from_slice(&remotes_data);

        // Calculate and append checksum
        let checksum = blake3::hash(&buf);
        buf.extend_from_slice(checksum.as_bytes());

        buf
    }

    pub fn deserialize(data: &[u8]) -> Result<Self> {
        // Verify magic
        if &data[0..4] != &Self::MAGIC {
            return Err(Error::InvalidFormat);
        }

        // Verify version
        let version = u32::from_le_bytes(data[4..8].try_into()?);
        if version > Self::VERSION {
            return Err(Error::UnsupportedVersion(version));
        }

        // Verify checksum
        let checksum_start = data.len() - 32;
        let expected = blake3::hash(&data[..checksum_start]);
        if expected.as_bytes() != &data[checksum_start..] {
            return Err(Error::ChecksumMismatch);
        }

        // Deserialize remotes
        let remotes_len = u32::from_le_bytes(data[8..12].try_into()?) as usize;
        let remotes: Vec<RemoteEntry> = bincode::deserialize(&data[12..12 + remotes_len])?;

        Ok(Self {
            magic: Self::MAGIC,
            version,
            remotes,
            checksum: data[checksum_start..].try_into()?,
        })
    }
}
```

---

## Credential Storage

```rust
/// Secure credential storage
pub trait CredentialStore {
    /// Get credential for remote
    fn get(&self, remote: &str) -> Result<Option<Credential>>;

    /// Store credential for remote
    fn store(&mut self, remote: &str, credential: &Credential) -> Result<()>;

    /// Remove credential for remote
    fn remove(&mut self, remote: &str) -> Result<()>;
}

/// Keychain-based credential store (macOS/Windows)
pub struct KeychainStore {
    service: String,
}

impl CredentialStore for KeychainStore {
    fn get(&self, remote: &str) -> Result<Option<Credential>> {
        #[cfg(target_os = "macos")]
        {
            use security_framework::passwords::get_generic_password;
            match get_generic_password(&self.service, remote) {
                Ok(password) => {
                    let cred: Credential = serde_json::from_slice(&password)?;
                    Ok(Some(cred))
                }
                Err(_) => Ok(None),
            }
        }

        #[cfg(target_os = "windows")]
        {
            use winapi_credential::Credential as WinCred;
            match WinCred::read(&format!("{}:{}", self.service, remote)) {
                Ok(cred) => {
                    let data: Credential = serde_json::from_slice(cred.secret())?;
                    Ok(Some(data))
                }
                Err(_) => Ok(None),
            }
        }
    }

    fn store(&mut self, remote: &str, credential: &Credential) -> Result<()> {
        let data = serde_json::to_vec(credential)?;

        #[cfg(target_os = "macos")]
        {
            use security_framework::passwords::set_generic_password;
            set_generic_password(&self.service, remote, &data)?;
        }

        #[cfg(target_os = "windows")]
        {
            use winapi_credential::Credential as WinCred;
            WinCred::new(&format!("{}:{}", self.service, remote), &data)?.persist()?;
        }

        Ok(())
    }

    fn remove(&mut self, remote: &str) -> Result<()> {
        #[cfg(target_os = "macos")]
        {
            use security_framework::passwords::delete_generic_password;
            delete_generic_password(&self.service, remote)?;
        }

        #[cfg(target_os = "windows")]
        {
            use winapi_credential::Credential as WinCred;
            WinCred::delete(&format!("{}:{}", self.service, remote))?;
        }

        Ok(())
    }
}
```

---

## Notes

- Remote URLs support both HTTPS and custom dits:// protocol
- Credentials are stored in OS keychain when available
- OAuth tokens are automatically refreshed when expired
- Connection settings can be overridden per-remote
- Refspecs follow Git-compatible syntax
- Capabilities are probed on first connect and cached
