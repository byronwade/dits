//! Commit objects that represent snapshots.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::core::hash::{Hash, Hasher};

/// Author/committer information.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct Author {
    /// Name of the author.
    pub name:  String,
    /// Email of the author.
    pub email: String,
}

impl Author {
    /// Create a new author.
    pub fn new(name: impl Into<String>, email: impl Into<String>) -> Self {
        Self { name: name.into(), email: email.into() }
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
    pub hash:      Hash,
    /// Hash of the parent commit (None for initial commit).
    /// For merge commits, this is the first parent (our branch).
    pub parent:    Option<Hash>,
    /// Additional parent hashes (for merge commits).
    /// Empty for regular commits.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub parents:   Vec<Hash>,
    /// Hash of the manifest (tree) for this commit.
    pub manifest:  Hash,
    /// Commit message.
    pub message:   String,
    /// Author of the commit.
    pub author:    Author,
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

        // Version and frame the encoding so field boundaries cannot be moved
        // while producing the same byte stream (for example, `ab` + `c`
        // versus `a` + `bc`). Fixed-size hashes remain unframed after an
        // explicit option/count marker; all variable fields carry a u64 length.
        hasher.update(b"dits-commit-v2\0");
        match &self.parent {
            Some(parent) => {
                hasher.update(&[1]);
                hasher.update(parent.as_bytes());
            },
            None => {
                hasher.update(&[0]);
            },
        }
        hasher.update(&(self.parents.len() as u64).to_be_bytes());
        for parent in &self.parents {
            hasher.update(parent.as_bytes());
        }
        hasher.update(self.manifest.as_bytes());
        update_framed(&mut hasher, self.message.as_bytes());
        update_framed(&mut hasher, self.author.name.as_bytes());
        update_framed(&mut hasher, self.author.email.as_bytes());
        update_framed(&mut hasher, self.committer.name.as_bytes());
        update_framed(&mut hasher, self.committer.email.as_bytes());
        update_framed(&mut hasher, self.timestamp.to_rfc3339().as_bytes());

        hasher.finalize()
    }

    /// Compute the identity emitted by canonical writers before v0.1.5.
    ///
    /// Those writers always copied author to committer but accidentally omitted
    /// the duplicate committer fields from the digest. Keeping this verifier
    /// avoids stranding those repositories while new commits bind every stored
    /// semantic field into their identity.
    fn compute_legacy_hash(&self) -> Hash {
        let mut hasher = Hasher::new();

        if let Some(parent) = &self.parent {
            hasher.update(parent.as_bytes());
        }
        for parent in &self.parents {
            hasher.update(parent.as_bytes());
        }
        hasher.update(self.manifest.as_bytes());
        hasher.update(self.message.as_bytes());
        hasher.update(self.author.name.as_bytes());
        hasher.update(self.author.email.as_bytes());
        hasher.update(self.timestamp.to_rfc3339().as_bytes());

        hasher.finalize()
    }

    /// Recompute and verify the content-derived commit identity.
    pub fn verify_hash(&self) -> bool {
        self.compute_hash() == self.hash
            || (self.committer == self.author && self.compute_legacy_hash() == self.hash)
    }

    /// Recompute the content-derived commit identity for integrity reporting.
    pub fn computed_hash(&self) -> Hash {
        self.compute_hash()
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

/// Add one unambiguous variable-length field to a content identity.
fn update_framed(hasher: &mut Hasher, value: &[u8]) {
    hasher.update(&(value.len() as u64).to_be_bytes());
    hasher.update(value);
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

    #[test]
    fn test_commit_hash_binds_committer() {
        let author = Author::new("Author", "author@example.com");
        let mut commit = Commit::new(None, Hash::ZERO, "Test commit", author);

        commit.committer = Author::new("Mallory", "mallory@example.com");

        assert!(!commit.verify_hash());
    }

    #[test]
    fn test_legacy_commit_hash_is_accepted_only_for_matching_author_and_committer() {
        let author = Author::new("Legacy", "legacy@example.com");
        let mut commit = Commit::new(None, Hash::ZERO, "Legacy commit", author);
        commit.hash = commit.compute_legacy_hash();

        assert!(commit.verify_hash());

        commit.committer = Author::new("Different", "different@example.com");
        assert!(!commit.verify_hash());
    }

    #[test]
    fn test_v2_hash_frames_variable_fields() {
        let mut first = Commit::new(None, Hash::ZERO, "Boundary test", Author::new("ab", "c"));
        let mut second = first.clone();
        second.author = Author::new("a", "bc");
        second.committer = second.author.clone();

        // The legacy concatenation was ambiguous at the name/email boundary.
        assert_eq!(first.compute_legacy_hash(), second.compute_legacy_hash());
        assert_ne!(first.compute_hash(), second.compute_hash());

        first.hash = first.compute_hash();
        second.hash = second.compute_hash();
        assert!(first.verify_hash());
        assert!(second.verify_hash());
    }
}
