//! Repository types and operations.

use crate::commit::CommitHash;
use crate::hash::Hash;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A Dits repository.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Repository {
    /// Unique repository ID.
    pub id: Uuid,
    /// Repository name (owner/name format).
    pub name: String,
    /// Repository description.
    pub description: Option<String>,
    /// Default branch name.
    pub default_branch: String,
    /// When the repository was created.
    pub created_at: DateTime<Utc>,
    /// When the repository was last updated.
    pub updated_at: DateTime<Utc>,
    /// Repository visibility.
    pub visibility: Visibility,
    /// Repository settings.
    pub settings: RepositorySettings,
}

impl Repository {
    /// Create a new repository.
    pub fn new(name: impl Into<String>) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            description: None,
            default_branch: "main".to_string(),
            created_at: now,
            updated_at: now,
            visibility: Visibility::Private,
            settings: RepositorySettings::default(),
        }
    }

    /// Get the owner from the repository name.
    pub fn owner(&self) -> &str {
        self.name.split('/').next().unwrap_or(&self.name)
    }

    /// Get the repo name without owner.
    pub fn repo_name(&self) -> &str {
        self.name.split('/').nth(1).unwrap_or(&self.name)
    }

    /// Check if the repository is public.
    pub fn is_public(&self) -> bool {
        self.visibility == Visibility::Public
    }
}

/// Repository visibility.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Visibility {
    /// Visible to everyone.
    Public,
    /// Visible only to owner and collaborators.
    Private,
    /// Visible to organization members.
    Internal,
}

impl Default for Visibility {
    fn default() -> Self {
        Self::Private
    }
}

/// Repository settings.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RepositorySettings {
    /// Allow force pushes.
    pub allow_force_push: bool,
    /// Require file locks for certain patterns.
    pub require_locks: Vec<String>,
    /// Maximum file size in bytes.
    pub max_file_size: u64,
    /// Enable LFS for large files.
    pub lfs_enabled: bool,
    /// LFS patterns.
    pub lfs_patterns: Vec<String>,
    /// Chunking strategy.
    pub chunker: ChunkerType,
    /// Default branch protection.
    pub branch_protection: Option<BranchProtection>,
}

impl Default for RepositorySettings {
    fn default() -> Self {
        Self {
            allow_force_push: false,
            require_locks: vec![
                "*.prproj".to_string(),
                "*.drp".to_string(),
                "*.aep".to_string(),
            ],
            max_file_size: 10 * 1024 * 1024 * 1024, // 10 GB
            lfs_enabled: true,
            lfs_patterns: vec![
                "*.mov".to_string(),
                "*.mp4".to_string(),
                "*.mxf".to_string(),
            ],
            chunker: ChunkerType::VideoAware,
            branch_protection: None,
        }
    }
}

/// Chunking strategy for files.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ChunkerType {
    /// Fixed-size chunks.
    Fixed,
    /// Content-defined chunking (FastCDC).
    FastCDC,
    /// Video-aware chunking (keyframe alignment).
    VideoAware,
}

impl Default for ChunkerType {
    fn default() -> Self {
        Self::VideoAware
    }
}

/// Branch protection rules.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BranchProtection {
    /// Pattern for protected branches.
    pub pattern: String,
    /// Require pull request reviews.
    pub require_reviews: bool,
    /// Number of required approvals.
    pub required_approvals: u8,
    /// Dismiss stale reviews on push.
    pub dismiss_stale_reviews: bool,
    /// Require status checks.
    pub require_status_checks: bool,
    /// Required status check names.
    pub required_checks: Vec<String>,
    /// Allow force pushes.
    pub allow_force_push: bool,
    /// Allow deletions.
    pub allow_deletions: bool,
}

/// Information about a repository.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RepositoryInfo {
    /// Repository name.
    pub name: String,
    /// Description.
    pub description: Option<String>,
    /// Total size in bytes.
    pub size: u64,
    /// Number of commits.
    pub commit_count: u64,
    /// Number of branches.
    pub branch_count: u64,
    /// Number of tags.
    pub tag_count: u64,
    /// Default branch.
    pub default_branch: String,
    /// Last commit hash.
    pub last_commit: Option<CommitHash>,
    /// Last updated.
    pub updated_at: DateTime<Utc>,
}

/// Repository status (working directory state).
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Status {
    /// Current branch.
    pub branch: Option<String>,
    /// Current commit.
    pub commit: Option<CommitHash>,
    /// Modified files.
    pub modified: Vec<String>,
    /// Added (staged) files.
    pub added: Vec<String>,
    /// Deleted files.
    pub deleted: Vec<String>,
    /// Untracked files.
    pub untracked: Vec<String>,
    /// Conflicted files.
    pub conflicted: Vec<String>,
}

impl Status {
    /// Check if the working directory is clean.
    pub fn is_clean(&self) -> bool {
        self.modified.is_empty()
            && self.added.is_empty()
            && self.deleted.is_empty()
            && self.conflicted.is_empty()
    }

    /// Check if there are conflicts.
    pub fn has_conflicts(&self) -> bool {
        !self.conflicted.is_empty()
    }

    /// Get total number of changes.
    pub fn change_count(&self) -> usize {
        self.modified.len() + self.added.len() + self.deleted.len()
    }
}

/// A branch in a repository.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Branch {
    /// Branch name.
    pub name: String,
    /// Commit hash at branch head.
    pub head: CommitHash,
    /// Is this the current branch?
    pub is_current: bool,
    /// Is this the default branch?
    pub is_default: bool,
    /// Upstream branch (if tracking).
    pub upstream: Option<String>,
    /// Commits ahead of upstream.
    pub ahead: u32,
    /// Commits behind upstream.
    pub behind: u32,
}

/// A tag in a repository.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Tag {
    /// Tag name.
    pub name: String,
    /// Tagged commit hash.
    pub commit: CommitHash,
    /// Tag message (for annotated tags).
    pub message: Option<String>,
    /// Tagger (for annotated tags).
    pub tagger: Option<crate::user::Author>,
    /// When the tag was created.
    pub created_at: DateTime<Utc>,
}

/// A remote repository.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Remote {
    /// Remote name (e.g., "origin").
    pub name: String,
    /// Fetch URL.
    pub url: String,
    /// Push URL (if different from fetch).
    pub push_url: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_repository_new() {
        let repo = Repository::new("myorg/myrepo");

        assert_eq!(repo.name, "myorg/myrepo");
        assert_eq!(repo.owner(), "myorg");
        assert_eq!(repo.repo_name(), "myrepo");
        assert_eq!(repo.default_branch, "main");
        assert!(!repo.is_public());
    }

    #[test]
    fn test_status_clean() {
        let status = Status::default();
        assert!(status.is_clean());
        assert!(!status.has_conflicts());
        assert_eq!(status.change_count(), 0);
    }

    #[test]
    fn test_status_dirty() {
        let status = Status {
            modified: vec!["file.txt".to_string()],
            ..Default::default()
        };
        assert!(!status.is_clean());
        assert_eq!(status.change_count(), 1);
    }

    #[test]
    fn test_repository_settings() {
        let settings = RepositorySettings::default();
        assert!(!settings.allow_force_push);
        assert!(settings.lfs_enabled);
        assert_eq!(settings.chunker, ChunkerType::VideoAware);
    }
}
