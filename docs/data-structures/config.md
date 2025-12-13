# Config Data Structure

Configuration settings for Dits client and repositories.

---

## Overview

Dits configuration is organized into three levels:
1. **System** - Machine-wide defaults (`/etc/dits/config`)
2. **Global** - User preferences (`~/.config/dits/config`)
3. **Local** - Repository-specific (`.dits/config`)

Settings cascade with local overriding global overriding system.

---

## Configuration Structure

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Complete configuration
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Config {
    /// Core settings
    pub core: CoreConfig,

    /// User identity
    pub user: UserConfig,

    /// Remote configurations
    pub remotes: HashMap<String, RemoteConfig>,

    /// Branch configurations
    pub branches: HashMap<String, BranchConfig>,

    /// Chunking settings
    pub chunking: ChunkingConfig,

    /// Transfer settings
    pub transfer: TransferConfig,

    /// Cache settings
    pub cache: CacheConfig,

    /// UI settings
    pub ui: UiConfig,

    /// Alias definitions
    pub aliases: HashMap<String, String>,

    /// Plugin configurations
    pub plugins: HashMap<String, toml::Value>,

    /// Custom sections
    #[serde(flatten)]
    pub extra: HashMap<String, toml::Value>,
}

/// Core repository settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoreConfig {
    /// Repository format version
    pub repository_format_version: u32,

    /// File mode (permissions) tracking
    pub filemode: bool,

    /// Bare repository
    pub bare: bool,

    /// Worktree location (if not default)
    pub worktree: Option<PathBuf>,

    /// Log all ref updates
    pub log_all_ref_updates: bool,

    /// Ignore case in filenames
    pub ignore_case: bool,

    /// Precompose unicode filenames
    pub precompose_unicode: bool,

    /// Symlink handling
    pub symlinks: bool,

    /// Default branch name
    pub default_branch: String,

    /// Editor for commit messages
    pub editor: Option<String>,

    /// Pager for output
    pub pager: Option<String>,

    /// Automatic garbage collection
    pub auto_gc: bool,

    /// Fsync after writes
    pub fsync_object_files: bool,
}

impl Default for CoreConfig {
    fn default() -> Self {
        Self {
            repository_format_version: 1,
            filemode: true,
            bare: false,
            worktree: None,
            log_all_ref_updates: true,
            ignore_case: cfg!(target_os = "windows") || cfg!(target_os = "macos"),
            precompose_unicode: cfg!(target_os = "macos"),
            symlinks: !cfg!(target_os = "windows"),
            default_branch: "main".to_string(),
            editor: None,
            pager: None,
            auto_gc: true,
            fsync_object_files: true,
        }
    }
}

/// User identity
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UserConfig {
    /// User's name
    pub name: Option<String>,

    /// User's email
    pub email: Option<String>,

    /// Signing key
    pub signing_key: Option<String>,

    /// Sign commits by default
    pub sign_commits: bool,
}

/// Remote configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteConfig {
    /// Remote URL
    pub url: String,

    /// Push URL (if different)
    pub push_url: Option<String>,

    /// Fetch refspecs
    pub fetch: Vec<String>,

    /// Push refspecs
    pub push: Vec<String>,

    /// Mirror mode
    pub mirror: bool,

    /// Prune on fetch
    pub prune: bool,

    /// Tags handling
    pub tags_opt: Option<TagsOpt>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TagsOpt {
    Auto,
    All,
    None,
}

/// Branch configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchConfig {
    /// Upstream remote
    pub remote: Option<String>,

    /// Upstream branch
    pub merge: Option<String>,

    /// Rebase on pull
    pub rebase: Option<bool>,

    /// Push to specific remote
    pub push_remote: Option<String>,

    /// Branch description
    pub description: Option<String>,
}

/// Chunking settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkingConfig {
    /// Minimum chunk size
    pub min_size: u64,

    /// Average chunk size
    pub avg_size: u64,

    /// Maximum chunk size
    pub max_size: u64,

    /// Hash algorithm (blake3, sha256)
    pub hash_algorithm: String,

    /// Enable video-aware chunking
    pub video_aware: bool,

    /// Enable keyframe alignment
    pub keyframe_alignment: bool,

    /// Compression algorithm
    pub compression: Option<String>,

    /// Compression level
    pub compression_level: Option<i32>,
}

impl Default for ChunkingConfig {
    fn default() -> Self {
        Self {
            min_size: 16 * 1024,      // 16 KB
            avg_size: 64 * 1024,      // 64 KB
            max_size: 256 * 1024,     // 256 KB
            hash_algorithm: "blake3".to_string(),
            video_aware: true,
            keyframe_alignment: true,
            compression: Some("zstd".to_string()),
            compression_level: Some(3),
        }
    }
}

/// Transfer settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferConfig {
    /// Maximum concurrent connections
    pub connections: u32,

    /// Connection timeout
    #[serde(with = "humantime_serde")]
    pub timeout: Duration,

    /// Upload bandwidth limit (bytes/sec, 0 = unlimited)
    pub upload_limit: u64,

    /// Download bandwidth limit (bytes/sec, 0 = unlimited)
    pub download_limit: u64,

    /// Retry attempts
    pub retries: u32,

    /// Retry delay
    #[serde(with = "humantime_serde")]
    pub retry_delay: Duration,

    /// Chunk verification
    pub verify_chunks: bool,

    /// Use delta compression for transfer
    pub delta_compression: bool,

    /// Proxy URL
    pub proxy: Option<String>,

    /// No proxy patterns
    pub no_proxy: Vec<String>,
}

impl Default for TransferConfig {
    fn default() -> Self {
        Self {
            connections: 4,
            timeout: Duration::from_secs(30),
            upload_limit: 0,
            download_limit: 0,
            retries: 3,
            retry_delay: Duration::from_secs(1),
            verify_chunks: true,
            delta_compression: true,
            proxy: None,
            no_proxy: vec![],
        }
    }
}

/// Cache settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    /// L1 (memory) cache enabled
    pub l1_enabled: bool,

    /// L1 cache size
    pub l1_size: ByteSize,

    /// L2 (disk) cache enabled
    pub l2_enabled: bool,

    /// L2 cache size
    pub l2_size: ByteSize,

    /// L2 cache path
    pub l2_path: Option<PathBuf>,

    /// Cache TTL
    #[serde(with = "humantime_serde")]
    pub ttl: Duration,

    /// Prefetch enabled
    pub prefetch: bool,

    /// Prefetch lookahead
    pub prefetch_lookahead: usize,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            l1_enabled: true,
            l1_size: ByteSize::gb(1),
            l2_enabled: true,
            l2_size: ByteSize::gb(10),
            l2_path: None,
            ttl: Duration::from_secs(86400), // 24 hours
            prefetch: true,
            prefetch_lookahead: 4,
        }
    }
}

/// UI settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    /// Color output
    pub color: ColorOption,

    /// Progress bar style
    pub progress: ProgressStyle,

    /// Verbose output
    pub verbose: bool,

    /// Quiet mode
    pub quiet: bool,

    /// Date format
    pub date_format: String,

    /// Diff algorithm
    pub diff_algorithm: String,

    /// Pager for diffs
    pub diff_pager: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ColorOption {
    Auto,
    Always,
    Never,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProgressStyle {
    Bar,
    Dots,
    Spinner,
    None,
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            color: ColorOption::Auto,
            progress: ProgressStyle::Bar,
            verbose: false,
            quiet: false,
            date_format: "%Y-%m-%d %H:%M:%S".to_string(),
            diff_algorithm: "histogram".to_string(),
            diff_pager: None,
        }
    }
}
```

---

## Configuration File Format

### TOML Format

```toml
# ~/.config/dits/config

[core]
default_branch = "main"
editor = "vim"
pager = "less"
auto_gc = true

[user]
name = "John Doe"
email = "john@example.com"
signing_key = "ABC123"
sign_commits = true

[chunking]
min_size = "16KB"
avg_size = "64KB"
max_size = "256KB"
hash_algorithm = "blake3"
video_aware = true
keyframe_alignment = true
compression = "zstd"
compression_level = 3

[transfer]
connections = 4
timeout = "30s"
upload_limit = 0
download_limit = 0
retries = 3
verify_chunks = true
delta_compression = true

[cache]
l1_enabled = true
l1_size = "1GB"
l2_enabled = true
l2_size = "10GB"
l2_path = "~/.cache/dits"
ttl = "24h"
prefetch = true

[ui]
color = "auto"
progress = "bar"
verbose = false
date_format = "%Y-%m-%d %H:%M:%S"

# Remote configurations
[remote.origin]
url = "https://dits.io/myorg/myrepo"
fetch = ["+refs/heads/*:refs/remotes/origin/*"]
push = ["refs/heads/*:refs/heads/*"]
prune = true

[remote.backup]
url = "https://backup.dits.io/myorg/myrepo"
fetch = ["+refs/heads/main:refs/remotes/backup/main"]

# Branch configurations
[branch.main]
remote = "origin"
merge = "refs/heads/main"
rebase = true

[branch.feature]
remote = "origin"
merge = "refs/heads/feature"
description = "Feature branch for new UI"

# Aliases
[alias]
st = "status"
ci = "commit"
co = "checkout"
br = "branch"
lg = "log --oneline --graph"
undo = "reset HEAD~1"
wip = "commit -m 'WIP'"

# Plugin configurations
[plugins.premiere]
auto_sync = true
scan_interval = "5m"

[plugins.resolve]
db_path = "/Library/Application Support/Blackmagic Design"
```

---

## Configuration Operations

### Reading Configuration

```rust
impl Config {
    /// Load configuration from all sources
    pub fn load() -> Result<Self> {
        let mut config = Config::default();

        // Load system config
        if let Some(system_path) = Self::system_config_path() {
            if system_path.exists() {
                let system_config = Self::load_file(&system_path)?;
                config.merge(system_config);
            }
        }

        // Load global config
        if let Some(global_path) = Self::global_config_path() {
            if global_path.exists() {
                let global_config = Self::load_file(&global_path)?;
                config.merge(global_config);
            }
        }

        // Load local config (if in repo)
        if let Some(local_path) = Self::local_config_path() {
            if local_path.exists() {
                let local_config = Self::load_file(&local_path)?;
                config.merge(local_config);
            }
        }

        // Apply environment variable overrides
        config.apply_env_overrides()?;

        Ok(config)
    }

    /// Load from a specific file
    fn load_file(path: &Path) -> Result<Self> {
        let content = fs::read_to_string(path)?;
        let config: Config = toml::from_str(&content)?;
        Ok(config)
    }

    /// Merge another config into this one
    fn merge(&mut self, other: Config) {
        // Core settings
        if other.core != CoreConfig::default() {
            self.core = other.core;
        }

        // User settings (only override if set)
        if other.user.name.is_some() {
            self.user.name = other.user.name;
        }
        if other.user.email.is_some() {
            self.user.email = other.user.email;
        }

        // Merge remotes
        for (name, remote) in other.remotes {
            self.remotes.insert(name, remote);
        }

        // Merge branches
        for (name, branch) in other.branches {
            self.branches.insert(name, branch);
        }

        // Merge aliases
        for (name, cmd) in other.aliases {
            self.aliases.insert(name, cmd);
        }

        // Override other settings
        self.chunking = other.chunking;
        self.transfer = other.transfer;
        self.cache = other.cache;
        self.ui = other.ui;
    }

    /// Apply environment variable overrides
    fn apply_env_overrides(&mut self) -> Result<()> {
        // DITS_USER_NAME overrides user.name
        if let Ok(name) = env::var("DITS_USER_NAME") {
            self.user.name = Some(name);
        }

        // DITS_USER_EMAIL overrides user.email
        if let Ok(email) = env::var("DITS_USER_EMAIL") {
            self.user.email = Some(email);
        }

        // DITS_TOKEN sets auth token
        // (handled separately in auth module)

        // DITS_CACHE_DIR overrides cache path
        if let Ok(cache_dir) = env::var("DITS_CACHE_DIR") {
            self.cache.l2_path = Some(PathBuf::from(cache_dir));
        }

        // DITS_NO_COLOR disables colors
        if env::var("DITS_NO_COLOR").is_ok() || env::var("NO_COLOR").is_ok() {
            self.ui.color = ColorOption::Never;
        }

        Ok(())
    }

    /// Get configuration paths
    fn system_config_path() -> Option<PathBuf> {
        #[cfg(unix)]
        {
            Some(PathBuf::from("/etc/dits/config"))
        }
        #[cfg(windows)]
        {
            env::var("PROGRAMDATA").ok().map(|p| PathBuf::from(p).join("dits").join("config"))
        }
    }

    fn global_config_path() -> Option<PathBuf> {
        dirs::config_dir().map(|p| p.join("dits").join("config"))
    }

    fn local_config_path() -> Option<PathBuf> {
        // Search up for .dits directory
        let mut current = env::current_dir().ok()?;
        loop {
            let config_path = current.join(".dits").join("config");
            if config_path.exists() {
                return Some(config_path);
            }
            if !current.pop() {
                return None;
            }
        }
    }
}
```

### Writing Configuration

```rust
impl Config {
    /// Set a configuration value
    pub fn set(&mut self, key: &str, value: &str, scope: ConfigScope) -> Result<()> {
        // Parse key (e.g., "user.name", "remote.origin.url")
        let parts: Vec<&str> = key.split('.').collect();

        match parts.as_slice() {
            ["user", "name"] => self.user.name = Some(value.to_string()),
            ["user", "email"] => self.user.email = Some(value.to_string()),
            ["core", "default_branch"] => self.core.default_branch = value.to_string(),
            ["chunking", "avg_size"] => self.chunking.avg_size = parse_byte_size(value)?,
            ["transfer", "connections"] => self.transfer.connections = value.parse()?,
            ["cache", "l1_size"] => self.cache.l1_size = parse_byte_size(value)?.into(),
            ["remote", name, "url"] => {
                self.remotes.entry(name.to_string())
                    .or_insert_with(RemoteConfig::default)
                    .url = value.to_string();
            }
            ["branch", name, "remote"] => {
                self.branches.entry(name.to_string())
                    .or_insert_with(BranchConfig::default)
                    .remote = Some(value.to_string());
            }
            ["alias", name] => {
                self.aliases.insert(name.to_string(), value.to_string());
            }
            _ => return Err(Error::UnknownConfigKey(key.to_string())),
        }

        // Save to appropriate file
        self.save(scope)?;

        Ok(())
    }

    /// Get a configuration value
    pub fn get(&self, key: &str) -> Option<String> {
        let parts: Vec<&str> = key.split('.').collect();

        match parts.as_slice() {
            ["user", "name"] => self.user.name.clone(),
            ["user", "email"] => self.user.email.clone(),
            ["core", "default_branch"] => Some(self.core.default_branch.clone()),
            ["chunking", "avg_size"] => Some(format_byte_size(self.chunking.avg_size)),
            ["transfer", "connections"] => Some(self.transfer.connections.to_string()),
            ["remote", name, "url"] => self.remotes.get(*name).map(|r| r.url.clone()),
            ["alias", name] => self.aliases.get(*name).cloned(),
            _ => None,
        }
    }

    /// Unset a configuration value
    pub fn unset(&mut self, key: &str, scope: ConfigScope) -> Result<()> {
        let parts: Vec<&str> = key.split('.').collect();

        match parts.as_slice() {
            ["user", "name"] => self.user.name = None,
            ["user", "email"] => self.user.email = None,
            ["remote", name, _] => { self.remotes.remove(*name); }
            ["branch", name, _] => { self.branches.remove(*name); }
            ["alias", name] => { self.aliases.remove(*name); }
            _ => return Err(Error::UnknownConfigKey(key.to_string())),
        }

        self.save(scope)?;
        Ok(())
    }

    /// Save configuration to file
    pub fn save(&self, scope: ConfigScope) -> Result<()> {
        let path = match scope {
            ConfigScope::System => Self::system_config_path()
                .ok_or(Error::NoSystemConfig)?,
            ConfigScope::Global => Self::global_config_path()
                .ok_or(Error::NoGlobalConfig)?,
            ConfigScope::Local => Self::local_config_path()
                .ok_or(Error::NotInRepository)?,
        };

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Serialize to TOML
        let content = toml::to_string_pretty(self)?;

        // Write atomically
        let temp_path = path.with_extension("tmp");
        fs::write(&temp_path, &content)?;
        fs::rename(&temp_path, &path)?;

        Ok(())
    }
}

#[derive(Debug, Clone, Copy)]
pub enum ConfigScope {
    System,
    Global,
    Local,
}
```

---

## Configuration Validation

```rust
impl Config {
    /// Validate configuration
    pub fn validate(&self) -> Result<Vec<ConfigWarning>> {
        let mut warnings = Vec::new();

        // Validate user identity
        if self.user.name.is_none() {
            warnings.push(ConfigWarning::MissingUserName);
        }
        if self.user.email.is_none() {
            warnings.push(ConfigWarning::MissingUserEmail);
        }

        // Validate chunking settings
        if self.chunking.min_size >= self.chunking.max_size {
            return Err(Error::InvalidConfig(
                "chunking.min_size must be less than chunking.max_size".to_string()
            ));
        }
        if self.chunking.avg_size < self.chunking.min_size
            || self.chunking.avg_size > self.chunking.max_size {
            return Err(Error::InvalidConfig(
                "chunking.avg_size must be between min_size and max_size".to_string()
            ));
        }

        // Validate remote URLs
        for (name, remote) in &self.remotes {
            if Url::parse(&remote.url).is_err() {
                return Err(Error::InvalidConfig(
                    format!("Invalid URL for remote '{}': {}", name, remote.url)
                ));
            }
        }

        // Validate cache settings
        if self.cache.l1_enabled && self.cache.l1_size.as_u64() < 1024 * 1024 {
            warnings.push(ConfigWarning::SmallCacheSize("l1_size".to_string()));
        }

        Ok(warnings)
    }
}

#[derive(Debug)]
pub enum ConfigWarning {
    MissingUserName,
    MissingUserEmail,
    SmallCacheSize(String),
    DeprecatedOption(String),
}
```

---

## CLI Commands

```bash
# Get a value
dits config get user.name

# Set a value (global)
dits config set user.name "John Doe" --global

# Set a value (local)
dits config set core.default_branch "main"

# Unset a value
dits config unset alias.st

# List all settings
dits config list

# List with sources
dits config list --show-origin

# Edit config file
dits config edit --global

# Reset to defaults
dits config reset chunking
```

---

## Notes

- Configuration follows INI/TOML-style format
- All settings have sensible defaults
- Environment variables override file settings
- Boolean values accept: true, false, yes, no, 1, 0
- Size values accept: 64KB, 1MB, 2GB, etc.
- Duration values accept: 30s, 5m, 2h, 1d, etc.
