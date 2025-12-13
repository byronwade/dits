//! Configuration system for Dits.
//!
//! This module provides configuration management for Dits repositories,
//! supporting both global and repository-local configuration files.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Dits configuration.
#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct Config {
    /// User settings.
    #[serde(default)]
    pub user: UserConfig,
    /// Core settings.
    #[serde(default)]
    pub core: CoreConfig,
    /// Chunking settings.
    #[serde(default)]
    pub chunking: ChunkingConfig,
    /// Additional settings (for extensibility).
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, toml::Value>,
}

/// User configuration.
#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct UserConfig {
    /// User name for commits.
    pub name: Option<String>,
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
    pub verbose: bool,
}

impl Default for CoreConfig {
    fn default() -> Self {
        Self {
            default_branch: default_branch(),
            verbose: false,
        }
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
    pub min_size: u64,
    /// Maximum chunk size in bytes.
    #[serde(default = "default_max_chunk")]
    pub max_size: u64,
}

impl Default for ChunkingConfig {
    fn default() -> Self {
        Self {
            target_size: default_chunk_size(),
            min_size: default_min_chunk(),
            max_size: default_max_chunk(),
        }
    }
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
                self.core.verbose = value.parse().map_err(|_| ConfigError::InvalidValue {
                    key: key.to_string(),
                    value: value.to_string(),
                    reason: "expected boolean".to_string(),
                })?
            }
            ["chunking", "target_size"] => {
                self.chunking.target_size = parse_size(value)?
            }
            ["chunking", "min_size"] => {
                self.chunking.min_size = parse_size(value)?
            }
            ["chunking", "max_size"] => {
                self.chunking.max_size = parse_size(value)?
            }
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
            }
            ["user", "email"] => {
                let had_value = self.user.email.is_some();
                self.user.email = None;
                Ok(had_value)
            }
            _ => Err(ConfigError::CannotUnset(key.to_string())),
        }
    }

    /// List all config values.
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

        items
    }
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
    InvalidValue {
        key: String,
        value: String,
        reason: String,
    },

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

    let n: f64 = num_str.trim().parse().map_err(|_| ConfigError::InvalidSize(s.clone()))?;
    Ok((n * multiplier as f64) as u64)
}

/// Format a size as human-readable.
pub fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB && bytes % GB == 0 {
        format!("{}GB", bytes / GB)
    } else if bytes >= MB && bytes % MB == 0 {
        format!("{}MB", bytes / MB)
    } else if bytes >= KB && bytes % KB == 0 {
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
