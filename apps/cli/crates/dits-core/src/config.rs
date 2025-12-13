//! Configuration types for Dits.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;

/// Main configuration for Dits.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Config {
    /// Server configuration.
    pub server: ServerConfig,
    /// Database configuration.
    pub database: DatabaseConfig,
    /// Cache configuration.
    pub cache: CacheConfig,
    /// Storage configuration.
    pub storage: StorageConfig,
    /// Authentication configuration.
    pub auth: AuthConfig,
    /// Logging configuration.
    pub logging: LoggingConfig,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server: ServerConfig::default(),
            database: DatabaseConfig::default(),
            cache: CacheConfig::default(),
            storage: StorageConfig::default(),
            auth: AuthConfig::default(),
            logging: LoggingConfig::default(),
        }
    }
}

/// Server configuration.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct ServerConfig {
    /// Host to bind to.
    pub host: String,
    /// Port to listen on.
    pub port: u16,
    /// Enable TLS.
    pub tls_enabled: bool,
    /// TLS certificate path.
    pub tls_cert: Option<PathBuf>,
    /// TLS key path.
    pub tls_key: Option<PathBuf>,
    /// Maximum request body size in bytes.
    pub max_body_size: u64,
    /// Request timeout in seconds.
    #[serde(with = "humantime_serde")]
    pub request_timeout: Duration,
    /// Enable compression.
    pub compression: bool,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 8080,
            tls_enabled: false,
            tls_cert: None,
            tls_key: None,
            max_body_size: 10 * 1024 * 1024 * 1024, // 10 GB
            request_timeout: Duration::from_secs(300),
            compression: true,
        }
    }
}

/// Database configuration.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct DatabaseConfig {
    /// Database URL.
    pub url: String,
    /// Maximum connections in pool.
    pub max_connections: u32,
    /// Minimum connections in pool.
    pub min_connections: u32,
    /// Connection timeout.
    #[serde(with = "humantime_serde")]
    pub connect_timeout: Duration,
    /// Idle timeout.
    #[serde(with = "humantime_serde")]
    pub idle_timeout: Duration,
    /// Enable SSL.
    pub ssl_mode: SslMode,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            url: "postgres://localhost/dits".to_string(),
            max_connections: 100,
            min_connections: 10,
            connect_timeout: Duration::from_secs(30),
            idle_timeout: Duration::from_secs(600),
            ssl_mode: SslMode::Prefer,
        }
    }
}

/// SSL mode for database connections.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SslMode {
    Disable,
    Allow,
    Prefer,
    Require,
    VerifyCa,
    VerifyFull,
}

impl Default for SslMode {
    fn default() -> Self {
        Self::Prefer
    }
}

/// Cache configuration.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct CacheConfig {
    /// Redis URL.
    pub redis_url: String,
    /// Enable clustering.
    pub cluster_enabled: bool,
    /// Default TTL for cached items.
    #[serde(with = "humantime_serde")]
    pub default_ttl: Duration,
    /// Maximum memory for local cache.
    pub local_cache_size: u64,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            redis_url: "redis://localhost:6379".to_string(),
            cluster_enabled: false,
            default_ttl: Duration::from_secs(3600),
            local_cache_size: 1024 * 1024 * 1024, // 1 GB
        }
    }
}

/// Storage configuration.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct StorageConfig {
    /// Storage backend type.
    pub backend: StorageBackend,
    /// S3 configuration.
    pub s3: Option<S3Config>,
    /// Local storage path.
    pub local_path: Option<PathBuf>,
    /// Chunk cache directory.
    pub cache_dir: PathBuf,
    /// Maximum cache size.
    pub cache_max_size: u64,
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            backend: StorageBackend::S3,
            s3: Some(S3Config::default()),
            local_path: None,
            cache_dir: PathBuf::from("/var/cache/dits"),
            cache_max_size: 100 * 1024 * 1024 * 1024, // 100 GB
        }
    }
}

/// Storage backend type.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StorageBackend {
    /// Local filesystem.
    Local,
    /// S3-compatible storage.
    S3,
    /// Google Cloud Storage.
    GCS,
    /// Azure Blob Storage.
    Azure,
}

impl Default for StorageBackend {
    fn default() -> Self {
        Self::S3
    }
}

/// S3 configuration.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct S3Config {
    /// S3 bucket name.
    pub bucket: String,
    /// AWS region.
    pub region: String,
    /// Custom endpoint (for MinIO, etc.).
    pub endpoint: Option<String>,
    /// Access key ID.
    pub access_key_id: Option<String>,
    /// Secret access key.
    pub secret_access_key: Option<String>,
    /// Use path-style URLs.
    pub path_style: bool,
}

impl Default for S3Config {
    fn default() -> Self {
        Self {
            bucket: "dits-chunks".to_string(),
            region: "us-east-1".to_string(),
            endpoint: None,
            access_key_id: None,
            secret_access_key: None,
            path_style: false,
        }
    }
}

/// Authentication configuration.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct AuthConfig {
    /// JWT secret key.
    pub jwt_secret: String,
    /// Token expiration time.
    #[serde(with = "humantime_serde")]
    pub token_expiry: Duration,
    /// Refresh token expiration time.
    #[serde(with = "humantime_serde")]
    pub refresh_expiry: Duration,
    /// Enable OAuth providers.
    pub oauth_enabled: bool,
    /// OAuth providers.
    pub oauth_providers: Vec<OAuthProvider>,
}

impl Default for AuthConfig {
    fn default() -> Self {
        Self {
            jwt_secret: "change-me-in-production".to_string(),
            token_expiry: Duration::from_secs(3600),
            refresh_expiry: Duration::from_secs(604800), // 7 days
            oauth_enabled: false,
            oauth_providers: Vec::new(),
        }
    }
}

/// OAuth provider configuration.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OAuthProvider {
    /// Provider name.
    pub name: String,
    /// Client ID.
    pub client_id: String,
    /// Client secret.
    pub client_secret: String,
    /// Authorization URL.
    pub auth_url: String,
    /// Token URL.
    pub token_url: String,
    /// Scopes to request.
    pub scopes: Vec<String>,
}

/// Logging configuration.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct LoggingConfig {
    /// Log level.
    pub level: String,
    /// Log format.
    pub format: LogFormat,
    /// Output to file.
    pub file: Option<PathBuf>,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            level: "info".to_string(),
            format: LogFormat::Json,
            file: None,
        }
    }
}

/// Log format.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogFormat {
    /// Plain text logs.
    Text,
    /// JSON formatted logs.
    Json,
    /// Pretty-printed logs (for development).
    Pretty,
}

impl Default for LogFormat {
    fn default() -> Self {
        Self::Json
    }
}

/// Helper module for humantime_serde.
mod humantime_serde {
    use serde::{Deserialize, Deserializer, Serializer};
    use std::time::Duration;

    pub fn serialize<S>(duration: &Duration, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&humantime::format_duration(*duration).to_string())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Duration, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        humantime::parse_duration(&s).map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.server.port, 8080);
        assert_eq!(config.database.max_connections, 100);
    }

    #[test]
    fn test_ssl_mode_default() {
        assert_eq!(SslMode::default(), SslMode::Prefer);
    }

    #[test]
    fn test_storage_backend_default() {
        assert_eq!(StorageBackend::default(), StorageBackend::S3);
    }
}
