//! Remote repository management.
//!
//! Handles remote URLs and configuration for push/pull/clone operations.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{BufReader, BufWriter};
use std::path::{Path, PathBuf};

/// A remote repository configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Remote {
    /// Remote name (e.g., "origin").
    pub name: String,
    /// Fetch URL.
    pub url: String,
    /// Push URL (defaults to fetch URL if not set).
    pub push_url: Option<String>,
}

impl Remote {
    /// Create a new remote with the given name and URL.
    pub fn new(name: impl Into<String>, url: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            url: url.into(),
            push_url: None,
        }
    }

    /// Get the URL to use for pushing.
    pub fn push_url(&self) -> &str {
        self.push_url.as_deref().unwrap_or(&self.url)
    }

    /// Set the push URL.
    pub fn with_push_url(mut self, url: impl Into<String>) -> Self {
        self.push_url = Some(url.into());
        self
    }
}

/// Remote store - manages remote configurations.
#[derive(Debug)]
pub struct RemoteStore {
    /// Path to the remotes config file.
    config_path: PathBuf,
    /// Cached remotes.
    remotes: HashMap<String, Remote>,
}

impl RemoteStore {
    /// Open or create a remote store in the given .dits directory.
    pub fn new(dits_dir: &Path) -> Self {
        let config_path = dits_dir.join("remotes");
        let remotes = Self::load(&config_path).unwrap_or_default();
        Self {
            config_path,
            remotes,
        }
    }

    /// Load remotes from disk.
    fn load(path: &Path) -> Option<HashMap<String, Remote>> {
        if !path.exists() {
            return None;
        }
        let file = File::open(path).ok()?;
        let reader = BufReader::new(file);
        serde_json::from_reader(reader).ok()
    }

    /// Save remotes to disk.
    pub fn save(&self) -> std::io::Result<()> {
        let file = File::create(&self.config_path)?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, &self.remotes)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
    }

    /// Add a new remote.
    pub fn add(&mut self, remote: Remote) -> Result<(), RemoteError> {
        if self.remotes.contains_key(&remote.name) {
            return Err(RemoteError::AlreadyExists(remote.name));
        }
        self.remotes.insert(remote.name.clone(), remote);
        self.save()?;
        Ok(())
    }

    /// Remove a remote by name.
    pub fn remove(&mut self, name: &str) -> Result<Remote, RemoteError> {
        let remote = self.remotes.remove(name)
            .ok_or_else(|| RemoteError::NotFound(name.to_string()))?;
        self.save()?;
        Ok(remote)
    }

    /// Get a remote by name.
    pub fn get(&self, name: &str) -> Option<&Remote> {
        self.remotes.get(name)
    }

    /// Get a mutable reference to a remote.
    pub fn get_mut(&mut self, name: &str) -> Option<&mut Remote> {
        self.remotes.get_mut(name)
    }

    /// List all remotes.
    pub fn list(&self) -> impl Iterator<Item = &Remote> {
        self.remotes.values()
    }

    /// Check if a remote exists.
    pub fn exists(&self, name: &str) -> bool {
        self.remotes.contains_key(name)
    }

    /// Rename a remote.
    pub fn rename(&mut self, old_name: &str, new_name: &str) -> Result<(), RemoteError> {
        if !self.remotes.contains_key(old_name) {
            return Err(RemoteError::NotFound(old_name.to_string()));
        }
        if self.remotes.contains_key(new_name) {
            return Err(RemoteError::AlreadyExists(new_name.to_string()));
        }

        let mut remote = self.remotes.remove(old_name).unwrap();
        remote.name = new_name.to_string();
        self.remotes.insert(new_name.to_string(), remote);
        self.save()?;
        Ok(())
    }

    /// Set the URL for a remote.
    pub fn set_url(&mut self, name: &str, url: &str) -> Result<(), RemoteError> {
        let remote = self.remotes.get_mut(name)
            .ok_or_else(|| RemoteError::NotFound(name.to_string()))?;
        remote.url = url.to_string();
        self.save()?;
        Ok(())
    }

    /// Get the number of remotes.
    pub fn len(&self) -> usize {
        self.remotes.len()
    }

    /// Check if there are no remotes.
    pub fn is_empty(&self) -> bool {
        self.remotes.is_empty()
    }
}

/// Remote errors.
#[derive(Debug, thiserror::Error)]
pub enum RemoteError {
    #[error("Remote already exists: {0}")]
    AlreadyExists(String),

    #[error("Remote not found: {0}")]
    NotFound(String),

    #[error("Invalid URL: {0}")]
    InvalidUrl(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Parse a remote URL to determine its type.
#[derive(Debug, Clone, PartialEq)]
pub enum RemoteType {
    /// Local filesystem path.
    Local(PathBuf),
    /// HTTP/HTTPS URL.
    Http(String),
    /// Custom dits:// protocol.
    Dits(String),
    /// SSH-style URL (user@host:path).
    Ssh(String),
}

impl RemoteType {
    /// Parse a URL string into a RemoteType.
    pub fn parse(url: &str) -> Self {
        if url.starts_with("http://") || url.starts_with("https://") {
            RemoteType::Http(url.to_string())
        } else if url.starts_with("dits://") {
            RemoteType::Dits(url.to_string())
        } else if url.contains('@') && url.contains(':') && !url.contains("://") {
            // SSH-style: git@github.com:user/repo
            RemoteType::Ssh(url.to_string())
        } else {
            // Assume local path
            RemoteType::Local(PathBuf::from(url))
        }
    }

    /// Check if this is a local path.
    pub fn is_local(&self) -> bool {
        matches!(self, RemoteType::Local(_))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_remote_store_add_remove() {
        let dir = tempdir().unwrap();
        let mut store = RemoteStore::new(dir.path());

        // Add a remote
        let remote = Remote::new("origin", "https://example.com/repo");
        store.add(remote).unwrap();

        assert!(store.exists("origin"));
        assert_eq!(store.get("origin").unwrap().url, "https://example.com/repo");

        // Remove it
        store.remove("origin").unwrap();
        assert!(!store.exists("origin"));
    }

    #[test]
    fn test_remote_store_rename() {
        let dir = tempdir().unwrap();
        let mut store = RemoteStore::new(dir.path());

        store.add(Remote::new("old-name", "https://example.com/repo")).unwrap();
        store.rename("old-name", "new-name").unwrap();

        assert!(!store.exists("old-name"));
        assert!(store.exists("new-name"));
    }

    #[test]
    fn test_remote_type_parse() {
        assert!(matches!(
            RemoteType::parse("https://example.com/repo"),
            RemoteType::Http(_)
        ));
        assert!(matches!(
            RemoteType::parse("dits://example.com/repo"),
            RemoteType::Dits(_)
        ));
        assert!(matches!(
            RemoteType::parse("git@github.com:user/repo"),
            RemoteType::Ssh(_)
        ));
        assert!(matches!(
            RemoteType::parse("/path/to/repo"),
            RemoteType::Local(_)
        ));
        assert!(matches!(
            RemoteType::parse("../relative/path"),
            RemoteType::Local(_)
        ));
    }

    #[test]
    fn test_persistence() {
        let dir = tempdir().unwrap();

        // Create and save
        {
            let mut store = RemoteStore::new(dir.path());
            store.add(Remote::new("origin", "https://example.com/repo")).unwrap();
        }

        // Load and verify
        {
            let store = RemoteStore::new(dir.path());
            assert!(store.exists("origin"));
            assert_eq!(store.get("origin").unwrap().url, "https://example.com/repo");
        }
    }
}
