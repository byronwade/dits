//! Configuration system for Dits.
//!
//! This module provides configuration management for Dits repositories,
//! supporting both global and repository-local configuration files.

use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

/// Dits configuration.
#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct Config {
    /// User settings.
    #[serde(default)]
    pub user:      UserConfig,
    /// Core settings.
    #[serde(default)]
    pub core:      CoreConfig,
    /// Chunking settings.
    #[serde(default)]
    pub chunking:  ChunkingConfig,
    /// Optional, privacy-preserving CLI telemetry settings.
    #[serde(default)]
    pub telemetry: TelemetrySettings,
    /// Additional settings (for extensibility).
    #[serde(default, flatten)]
    pub extra:     BTreeMap<String, toml::Value>,
}

/// User configuration.
#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct UserConfig {
    /// User name for commits.
    pub name:  Option<String>,
    /// User email for commits.
    pub email: Option<String>,
}

/// Core configuration.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CoreConfig {
    /// Default branch name for new repositories.
    #[serde(default = "default_branch")]
    pub default_branch: String,
    /// Enable verbose output.
    #[serde(default)]
    pub verbose:        bool,
}

impl Default for CoreConfig {
    fn default() -> Self {
        Self { default_branch: default_branch(), verbose: false }
    }
}

fn default_branch() -> String {
    "main".to_string()
}

/// Chunking configuration.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChunkingConfig {
    /// Target (average) chunk size in bytes.
    #[serde(default = "default_chunk_size")]
    pub target_size: u64,
    /// Minimum chunk size in bytes.
    #[serde(default = "default_min_chunk")]
    pub min_size:    u64,
    /// Maximum chunk size in bytes.
    #[serde(default = "default_max_chunk")]
    pub max_size:    u64,
}

impl Default for ChunkingConfig {
    fn default() -> Self {
        Self {
            target_size: default_chunk_size(),
            min_size:    default_min_chunk(),
            max_size:    default_max_chunk(),
        }
    }
}

/// Settings for the opt-in CLI telemetry client.
///
/// The identifier is random and generated only after telemetry has been
/// explicitly enabled and the first event is recorded. It is never derived
/// from machine identifiers, usernames, paths, or repository contents.
#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct TelemetrySettings {
    /// Whether telemetry is enabled. Disabled by default.
    #[serde(default)]
    pub enabled:   bool,
    /// Random installation identifier, generated lazily.
    #[serde(default)]
    pub user_id:   Option<String>,
    /// Unix timestamp of the most recent scheduled telemetry batch.
    #[serde(default)]
    pub last_sent: u64,
}

fn default_chunk_size() -> u64 {
    64 * 1024 // 64KB - matches ChunkerConfig::default()
}

fn default_min_chunk() -> u64 {
    16 * 1024 // 16KB - matches ChunkerConfig::default()
}

fn default_max_chunk() -> u64 {
    256 * 1024 // 256KB - matches ChunkerConfig::default()
}

impl ChunkingConfig {
    /// Convert to a ChunkerConfig for use in chunking operations.
    pub fn to_chunker_config(&self) -> crate::core::ChunkerConfig {
        crate::core::ChunkerConfig {
            min_size: self.min_size as u32,
            avg_size: self.target_size as u32,
            max_size: self.max_size as u32,
        }
    }
}

impl Config {
    /// Load configuration from file.
    pub fn load(path: &Path) -> Result<Self, ConfigError> {
        if !path.exists() {
            return Ok(Self::default());
        }
        let content = fs::read_to_string(path)?;
        let config: Config = toml::from_str(&content)?;
        Ok(config)
    }

    /// Save configuration to file.
    pub fn save(&self, path: &Path) -> Result<(), ConfigError> {
        if let Some(parent) = path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
        {
            fs::create_dir_all(parent)?;
        }
        let content = toml::to_string_pretty(self)?;
        fs::write(path, content)?;
        Ok(())
    }

    /// Get a config value by dot-notation key.
    pub fn get(&self, key: &str) -> Option<String> {
        let parts: Vec<&str> = key.split('.').collect();
        match parts.as_slice() {
            ["user", "name"] => self.user.name.clone(),
            ["user", "email"] => self.user.email.clone(),
            ["core", "default_branch"] => Some(self.core.default_branch.clone()),
            ["core", "verbose"] => Some(self.core.verbose.to_string()),
            ["chunking", "target_size"] => Some(self.chunking.target_size.to_string()),
            ["chunking", "min_size"] => Some(self.chunking.min_size.to_string()),
            ["chunking", "max_size"] => Some(self.chunking.max_size.to_string()),
            ["telemetry", "enabled"] => Some(self.telemetry.enabled.to_string()),
            ["telemetry", "user_id"] => self.telemetry.user_id.clone(),
            ["telemetry", "last_sent"] => Some(self.telemetry.last_sent.to_string()),
            _ => None,
        }
    }

    /// Set a config value by dot-notation key.
    pub fn set(&mut self, key: &str, value: &str) -> Result<(), ConfigError> {
        let parts: Vec<&str> = key.split('.').collect();
        match parts.as_slice() {
            ["user", "name"] => self.user.name = Some(value.to_string()),
            ["user", "email"] => self.user.email = Some(value.to_string()),
            ["core", "default_branch"] => self.core.default_branch = value.to_string(),
            ["core", "verbose"] => {
                self.core.verbose = parse_bool(key, value)?;
            },
            ["chunking", "target_size"] => self.chunking.target_size = parse_size(value)?,
            ["chunking", "min_size"] => self.chunking.min_size = parse_size(value)?,
            ["chunking", "max_size"] => self.chunking.max_size = parse_size(value)?,
            ["telemetry", "enabled"] => {
                self.telemetry.enabled = parse_bool(key, value)?;
            },
            ["telemetry", "user_id"] => {
                if value.trim().is_empty() {
                    return Err(ConfigError::InvalidValue {
                        key:    key.to_string(),
                        value:  value.to_string(),
                        reason: "expected a non-empty identifier".to_string(),
                    });
                }
                self.telemetry.user_id = Some(value.to_string());
            },
            ["telemetry", "last_sent"] => {
                self.telemetry.last_sent =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key:    key.to_string(),
                        value:  value.to_string(),
                        reason: "expected an unsigned Unix timestamp".to_string(),
                    })?;
            },
            _ => return Err(ConfigError::UnknownKey(key.to_string())),
        }
        Ok(())
    }

    /// Unset (remove) a config value.
    pub fn unset(&mut self, key: &str) -> Result<bool, ConfigError> {
        let parts: Vec<&str> = key.split('.').collect();
        match parts.as_slice() {
            ["user", "name"] => {
                let had_value = self.user.name.is_some();
                self.user.name = None;
                Ok(had_value)
            },
            ["user", "email"] => {
                let had_value = self.user.email.is_some();
                self.user.email = None;
                Ok(had_value)
            },
            ["telemetry", "user_id"] => Ok(self.telemetry.user_id.take().is_some()),
            ["telemetry", "last_sent"] => {
                let had_value = self.telemetry.last_sent != 0;
                self.telemetry.last_sent = 0;
                Ok(had_value)
            },
            _ => Err(ConfigError::CannotUnset(key.to_string())),
        }
    }

    /// List user-facing config values.
    ///
    /// The random telemetry identifier is intentionally omitted.
    pub fn list(&self) -> Vec<(String, String)> {
        let mut items = Vec::new();

        if let Some(ref name) = self.user.name {
            items.push(("user.name".to_string(), name.clone()));
        }
        if let Some(ref email) = self.user.email {
            items.push(("user.email".to_string(), email.clone()));
        }
        items.push(("core.default_branch".to_string(), self.core.default_branch.clone()));
        items.push(("core.verbose".to_string(), self.core.verbose.to_string()));
        items.push(("chunking.target_size".to_string(), format_size(self.chunking.target_size)));
        items.push(("chunking.min_size".to_string(), format_size(self.chunking.min_size)));
        items.push(("chunking.max_size".to_string(), format_size(self.chunking.max_size)));
        items.push(("telemetry.enabled".to_string(), self.telemetry.enabled.to_string()));

        items
    }
}

fn parse_bool(key: &str, value: &str) -> Result<bool, ConfigError> {
    value.parse().map_err(|_| ConfigError::InvalidValue {
        key:    key.to_string(),
        value:  value.to_string(),
        reason: "expected boolean".to_string(),
    })
}

/// Configuration errors.
#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("TOML parse error: {0}")]
    TomlParse(#[from] toml::de::Error),

    #[error("TOML serialize error: {0}")]
    TomlSerialize(#[from] toml::ser::Error),

    #[error("Unknown config key: {0}")]
    UnknownKey(String),

    #[error("Cannot unset '{0}' (required or unknown key)")]
    CannotUnset(String),

    #[error("Invalid value for '{key}': {value} ({reason})")]
    InvalidValue { key: String, value: String, reason: String },

    #[error("Invalid size format: {0}")]
    InvalidSize(String),
}

/// Parse a size string (e.g., "1MB", "512KB", "4096").
pub fn parse_size(s: &str) -> Result<u64, ConfigError> {
    let s = s.trim().to_uppercase();

    if let Ok(n) = s.parse::<u64>() {
        return Ok(n);
    }

    let (num_str, multiplier) = if s.ends_with("GB") {
        (&s[..s.len() - 2], 1024 * 1024 * 1024)
    } else if s.ends_with("MB") {
        (&s[..s.len() - 2], 1024 * 1024)
    } else if s.ends_with("KB") {
        (&s[..s.len() - 2], 1024)
    } else if s.ends_with("B") {
        (&s[..s.len() - 1], 1)
    } else {
        return Err(ConfigError::InvalidSize(s));
    };

    let n: f64 = num_str
        .trim()
        .parse()
        .map_err(|_| ConfigError::InvalidSize(s.clone()))?;
    Ok((n * multiplier as f64) as u64)
}

/// Format a size as human-readable.
pub fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB && bytes.is_multiple_of(GB) {
        format!("{}GB", bytes / GB)
    } else if bytes >= MB && bytes.is_multiple_of(MB) {
        format!("{}MB", bytes / MB)
    } else if bytes >= KB && bytes.is_multiple_of(KB) {
        format!("{}KB", bytes / KB)
    } else {
        format!("{}", bytes)
    }
}

/// Get the global config path.
pub fn global_config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("dits")
        .join("config.toml")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn telemetry_keys_round_trip() {
        let mut config = Config::default();

        config.set("telemetry.enabled", "true").unwrap();
        config.set("telemetry.user_id", "random-test-id").unwrap();
        config.set("telemetry.last_sent", "123").unwrap();

        assert_eq!(config.get("telemetry.enabled").as_deref(), Some("true"));
        assert_eq!(config.get("telemetry.user_id").as_deref(), Some("random-test-id"));
        assert_eq!(config.get("telemetry.last_sent").as_deref(), Some("123"));
        assert!(!config
            .list()
            .iter()
            .any(|(key, _)| key == "telemetry.user_id"));
    }

    #[test]
    fn save_creates_missing_parent_directories() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("nested").join("dits").join("config.toml");

        Config::default().save(&path).unwrap();

        assert!(path.is_file());
        assert!(Config::load(&path).is_ok());
    }
}
