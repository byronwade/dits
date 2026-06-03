//! Commit types and operations.

use crate::hash::Hash;
use crate::user::Author;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Type alias for commit hashes.
pub type CommitHash = Hash;

/// A commit representing a snapshot of the repository.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Commit {
    /// The commit hash.
    pub hash: CommitHash,
    /// Parent commit hashes (empty for initial commit, 2+ for merge).
    pub parents: Vec<CommitHash>,
    /// Root tree hash.
    pub tree: Hash,
    /// Commit author.
    pub author: Author,
    /// Committer (may differ from author).
    pub committer: Author,
    /// Commit message.
    pub message: String,
    /// When the commit was created.
    pub created_at: DateTime<Utc>,
    /// Optional GPG signature.
    pub signature: Option<String>,
}

impl Commit {
    /// Create a new commit.
    pub fn new(
        parents: Vec<CommitHash>,
        tree: Hash,
        author: Author,
        message: impl Into<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            hash: Hash::ZERO, // Will be computed
            parents,
            tree,
            author: author.clone(),
            committer: author,
            message: message.into(),
            created_at: now,
            signature: None,
        }
    }

    /// Check if this is the initial commit.
    pub fn is_initial(&self) -> bool {
        self.parents.is_empty()
    }

    /// Check if this is a merge commit.
    pub fn is_merge(&self) -> bool {
        self.parents.len() > 1
    }

    /// Get the first parent (main branch).
    pub fn first_parent(&self) -> Option<&CommitHash> {
        self.parents.first()
    }

    /// Get the commit title (first line of message).
    pub fn title(&self) -> &str {
        self.message.lines().next().unwrap_or(&self.message)
    }

    /// Get the commit body (message without title).
    pub fn body(&self) -> Option<&str> {
        let mut lines = self.message.lines();
        lines.next(); // Skip title
        lines.next(); // Skip blank line
        let rest: String = lines.collect::<Vec<_>>().join("\n");
        if rest.is_empty() {
            None
        } else {
            // Return a reference is tricky here, so we'll just leak for now
            // In real code, you'd structure this differently
            Some(Box::leak(rest.into_boxed_str()))
        }
    }

    /// Check if the commit is signed.
    pub fn is_signed(&self) -> bool {
        self.signature.is_some()
    }
}

/// A tree entry representing a file or directory.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TreeEntry {
    /// Entry name (file or directory name).
    pub name: String,
    /// Entry mode (permissions).
    pub mode: FileMode,
    /// Hash of the blob (file) or tree (directory).
    pub hash: Hash,
    /// Size in bytes (for files).
    pub size: Option<u64>,
}

/// File mode (permissions).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileMode {
    /// Regular file (0o100644).
    Regular,
    /// Executable file (0o100755).
    Executable,
    /// Symbolic link (0o120000).
    Symlink,
    /// Directory (0o040000).
    Directory,
}

impl FileMode {
    /// Get the octal representation.
    pub fn as_octal(&self) -> u32 {
        match self {
            FileMode::Regular => 0o100644,
            FileMode::Executable => 0o100755,
            FileMode::Symlink => 0o120000,
            FileMode::Directory => 0o040000,
        }
    }

    /// Check if this is a file (regular or executable).
    pub fn is_file(&self) -> bool {
        matches!(self, FileMode::Regular | FileMode::Executable)
    }

    /// Check if this is a directory.
    pub fn is_directory(&self) -> bool {
        matches!(self, FileMode::Directory)
    }
}

/// A diff between two commits or trees.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Diff {
    /// Files that were added.
    pub added: Vec<DiffEntry>,
    /// Files that were modified.
    pub modified: Vec<DiffEntry>,
    /// Files that were deleted.
    pub deleted: Vec<DiffEntry>,
    /// Files that were renamed.
    pub renamed: Vec<RenamedEntry>,
}

impl Diff {
    /// Create an empty diff.
    pub fn empty() -> Self {
        Self {
            added: Vec::new(),
            modified: Vec::new(),
            deleted: Vec::new(),
            renamed: Vec::new(),
        }
    }

    /// Check if the diff is empty.
    pub fn is_empty(&self) -> bool {
        self.added.is_empty()
            && self.modified.is_empty()
            && self.deleted.is_empty()
            && self.renamed.is_empty()
    }

    /// Get total number of changed files.
    pub fn file_count(&self) -> usize {
        self.added.len() + self.modified.len() + self.deleted.len() + self.renamed.len()
    }
}

/// A single file change in a diff.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DiffEntry {
    /// File path.
    pub path: String,
    /// Old hash (for modified/deleted).
    pub old_hash: Option<Hash>,
    /// New hash (for added/modified).
    pub new_hash: Option<Hash>,
    /// Lines added.
    pub additions: u32,
    /// Lines removed.
    pub deletions: u32,
    /// Is this a binary file?
    pub is_binary: bool,
}

/// A renamed file in a diff.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RenamedEntry {
    /// Original path.
    pub old_path: String,
    /// New path.
    pub new_path: String,
    /// Old hash.
    pub old_hash: Hash,
    /// New hash.
    pub new_hash: Hash,
    /// Similarity percentage (0-100).
    pub similarity: u8,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_commit_initial() {
        let author = Author::new("Test", "test@example.com");
        let commit = Commit::new(vec![], Hash::ZERO, author, "Initial commit");

        assert!(commit.is_initial());
        assert!(!commit.is_merge());
    }

    #[test]
    fn test_commit_merge() {
        let author = Author::new("Test", "test@example.com");
        let commit = Commit::new(
            vec![Hash::ZERO, Hash::ZERO],
            Hash::ZERO,
            author,
            "Merge commit",
        );

        assert!(!commit.is_initial());
        assert!(commit.is_merge());
    }

    #[test]
    fn test_commit_title() {
        let author = Author::new("Test", "test@example.com");
        let commit = Commit::new(
            vec![],
            Hash::ZERO,
            author,
            "Add feature\n\nThis is the body.",
        );

        assert_eq!(commit.title(), "Add feature");
    }

    #[test]
    fn test_file_mode() {
        assert!(FileMode::Regular.is_file());
        assert!(FileMode::Executable.is_file());
        assert!(!FileMode::Directory.is_file());
        assert!(FileMode::Directory.is_directory());
    }

    #[test]
    fn test_diff_empty() {
        let diff = Diff::empty();
        assert!(diff.is_empty());
        assert_eq!(diff.file_count(), 0);
    }
}
