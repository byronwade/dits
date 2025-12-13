//! Commit objects that represent snapshots.

use crate::core::hash::{Hash, Hasher};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Author/committer information.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Author {
    /// Name of the author.
    pub name: String,
    /// Email of the author.
    pub email: String,
}

impl Author {
    /// Create a new author.
    pub fn new(name: impl Into<String>, email: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            email: email.into(),
        }
    }

    /// Create author from environment or defaults.
    pub fn from_env() -> Self {
        let name = std::env::var("DITS_AUTHOR_NAME")
            .or_else(|_| std::env::var("GIT_AUTHOR_NAME"))
            .or_else(|_| std::env::var("USER"))
            .unwrap_or_else(|_| "Unknown".to_string());

        let email = std::env::var("DITS_AUTHOR_EMAIL")
            .or_else(|_| std::env::var("GIT_AUTHOR_EMAIL"))
            .unwrap_or_else(|_| format!("{}@localhost", name.to_lowercase()));

        Self { name, email }
    }
}

impl Default for Author {
    fn default() -> Self {
        Self::from_env()
    }
}

/// A commit object representing a snapshot.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Commit {
    /// Hash of this commit (computed from contents).
    pub hash: Hash,
    /// Hash of the parent commit (None for initial commit).
    /// For merge commits, this is the first parent (our branch).
    pub parent: Option<Hash>,
    /// Additional parent hashes (for merge commits).
    /// Empty for regular commits.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub parents: Vec<Hash>,
    /// Hash of the manifest (tree) for this commit.
    pub manifest: Hash,
    /// Commit message.
    pub message: String,
    /// Author of the commit.
    pub author: Author,
    /// Committer (may differ from author).
    pub committer: Author,
    /// Timestamp when the commit was created.
    pub timestamp: DateTime<Utc>,
}

impl Commit {
    /// Create a new commit.
    pub fn new(
        parent: Option<Hash>,
        manifest: Hash,
        message: impl Into<String>,
        author: Author,
    ) -> Self {
        let message = message.into();
        let timestamp = Utc::now();
        let committer = author.clone();

        // Create temporary commit to compute hash
        let mut commit = Self {
            hash: Hash::ZERO,
            parent,
            parents: Vec::new(),
            manifest,
            message,
            author,
            committer,
            timestamp,
        };

        // Compute hash from commit data (excluding hash field)
        commit.hash = commit.compute_hash();
        commit
    }

    /// Create a new merge commit with multiple parents.
    pub fn new_merge(
        parent: Hash,
        other_parents: Vec<Hash>,
        manifest: Hash,
        message: impl Into<String>,
        author: Author,
    ) -> Self {
        let message = message.into();
        let timestamp = Utc::now();
        let committer = author.clone();

        // Create temporary commit to compute hash
        let mut commit = Self {
            hash: Hash::ZERO,
            parent: Some(parent),
            parents: other_parents,
            manifest,
            message,
            author,
            committer,
            timestamp,
        };

        // Compute hash from commit data (excluding hash field)
        commit.hash = commit.compute_hash();
        commit
    }

    /// Check if this is a merge commit (has multiple parents).
    pub fn is_merge(&self) -> bool {
        !self.parents.is_empty()
    }

    /// Get all parent hashes (including the primary parent).
    pub fn all_parents(&self) -> Vec<Hash> {
        let mut all = Vec::new();
        if let Some(p) = self.parent {
            all.push(p);
        }
        all.extend(self.parents.iter().cloned());
        all
    }

    /// Compute the hash of this commit.
    fn compute_hash(&self) -> Hash {
        let mut hasher = Hasher::new();

        if let Some(parent) = &self.parent {
            hasher.update(parent.as_bytes());
        }
        // Include all parents in hash computation
        for p in &self.parents {
            hasher.update(p.as_bytes());
        }
        hasher.update(self.manifest.as_bytes());
        hasher.update(self.message.as_bytes());
        hasher.update(self.author.name.as_bytes());
        hasher.update(self.author.email.as_bytes());
        hasher.update(self.timestamp.to_rfc3339().as_bytes());

        hasher.finalize()
    }

    /// Get short hash (first 8 chars).
    pub fn short_hash(&self) -> String {
        self.hash.short()
    }

    /// Check if this is the initial commit (no parent).
    pub fn is_initial(&self) -> bool {
        self.parent.is_none()
    }

    /// Serialize to JSON.
    pub fn to_json(&self) -> String {
        serde_json::to_string_pretty(self).expect("commit serialization should not fail")
    }

    /// Deserialize from JSON.
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_commit_hash_deterministic() {
        let author = Author::new("Test", "test@example.com");
        let manifest = Hash::ZERO;

        // Note: timestamps will differ, so hashes won't be equal
        // But the same commit should have the same hash
        let commit = Commit::new(None, manifest, "Test commit", author);
        let hash1 = commit.hash;
        let hash2 = commit.compute_hash();

        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_commit_json_roundtrip() {
        let author = Author::new("Test", "test@example.com");
        let commit = Commit::new(None, Hash::ZERO, "Test commit", author);

        let json = commit.to_json();
        let parsed = Commit::from_json(&json).unwrap();

        assert_eq!(commit.hash, parsed.hash);
        assert_eq!(commit.message, parsed.message);
    }

    #[test]
    fn test_initial_commit() {
        let author = Author::new("Test", "test@example.com");
        let commit = Commit::new(None, Hash::ZERO, "Initial commit", author);

        assert!(commit.is_initial());
        assert!(commit.parent.is_none());
    }

    #[test]
    fn test_commit_with_parent() {
        let author = Author::new("Test", "test@example.com");
        let parent = Commit::new(None, Hash::ZERO, "First", author.clone());
        let child = Commit::new(Some(parent.hash), Hash::ZERO, "Second", author);

        assert!(!child.is_initial());
        assert_eq!(child.parent, Some(parent.hash));
    }
}
