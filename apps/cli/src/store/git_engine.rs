//! Git text engine wrapper for libgit2 (Phase 3.6 Hybrid Storage).
//!
//! This module provides Git-quality text file handling:
//! - SHA-1 content-addressed blob storage
//! - Line-based diff (via `similar` crate)
//! - 3-way merge (via `similar` crate)
//! - Blame/annotate support (planned)

use git2::{ObjectType, Oid, Repository as GitRepo};
use similar::{ChangeTag, TextDiff};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

/// Errors from the Git text engine.
#[derive(Debug, Error)]
pub enum GitEngineError {
    #[error("Git error: {0}")]
    Git(#[from] git2::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Git object store not initialized")]
    NotInitialized,

    #[error("Blob not found: {0}")]
    BlobNotFound(String),

    #[error("Invalid OID: {0}")]
    InvalidOid(String),

    #[error("Content is not valid UTF-8")]
    InvalidUtf8,
}

/// Result type for Git engine operations.
pub type GitResult<T> = Result<T, GitEngineError>;

/// Git text engine for handling text files with libgit2.
///
/// Provides Git-quality operations for text files:
/// - Store/retrieve blobs (via libgit2)
/// - Compute line-based diffs (via similar crate)
/// - Perform 3-way merge (via similar crate)
/// - Generate blame information (planned)
pub struct GitTextEngine {
    /// Path to .dits/objects/git
    git_dir: PathBuf,
    /// libgit2 repository handle
    repo: GitRepo,
}

impl GitTextEngine {
    /// Initialize a new Git object store within the Dits repository.
    ///
    /// Creates `.dits/objects/git/` as a bare Git repository.
    pub fn init(dits_dir: &Path) -> GitResult<Self> {
        let git_dir = dits_dir.join("objects").join("git");
        fs::create_dir_all(&git_dir)?;

        // Initialize as bare repository (no working directory)
        let repo = GitRepo::init_bare(&git_dir)?;

        Ok(Self { git_dir, repo })
    }

    /// Open an existing Git object store.
    pub fn open(dits_dir: &Path) -> GitResult<Self> {
        let git_dir = dits_dir.join("objects").join("git");

        if !git_dir.exists() {
            return Err(GitEngineError::NotInitialized);
        }

        let repo = GitRepo::open_bare(&git_dir)?;

        Ok(Self { git_dir, repo })
    }

    /// Check if the Git object store exists.
    pub fn exists(dits_dir: &Path) -> bool {
        dits_dir.join("objects").join("git").exists()
    }

    /// Get the path to the Git object store.
    pub fn git_dir(&self) -> &Path {
        &self.git_dir
    }

    // ===== Blob Operations =====

    /// Store content as a Git blob and return its OID.
    pub fn store_blob(&self, content: &[u8]) -> GitResult<Oid> {
        let oid = self.repo.blob(content)?;
        Ok(oid)
    }

    /// Read a blob by its OID.
    pub fn read_blob(&self, oid: Oid) -> GitResult<Vec<u8>> {
        let blob = self.repo.find_blob(oid)?;
        Ok(blob.content().to_vec())
    }

    /// Read a blob as a string (UTF-8).
    pub fn read_blob_str(&self, oid: Oid) -> GitResult<String> {
        let content = self.read_blob(oid)?;
        String::from_utf8(content).map_err(|_| GitEngineError::InvalidUtf8)
    }

    /// Check if a blob exists.
    pub fn has_blob(&self, oid: Oid) -> bool {
        self.repo.find_blob(oid).is_ok()
    }

    /// Parse an OID from a hex string.
    pub fn parse_oid(hex: &str) -> GitResult<Oid> {
        Oid::from_str(hex).map_err(|_| GitEngineError::InvalidOid(hex.to_string()))
    }

    // ===== Diff Operations (using `similar` crate) =====

    /// Compute a line-based diff between two texts.
    ///
    /// Returns the diff in unified format.
    pub fn diff_text(old: &str, new: &str, context_lines: usize) -> DiffResult {
        let diff = TextDiff::from_lines(old, new);

        let mut hunks = Vec::new();
        let mut stats = DiffStats::default();

        for group in diff.grouped_ops(context_lines) {
            if group.is_empty() {
                continue;
            }

            let first_op = &group[0];

            let old_start = first_op.old_range().start as u32 + 1;
            let new_start = first_op.new_range().start as u32 + 1;

            let mut old_lines = 0u32;
            let mut new_lines = 0u32;
            let mut lines = Vec::new();

            for op in &group {
                for change in diff.iter_changes(op) {
                    let line_type = match change.tag() {
                        ChangeTag::Equal => {
                            old_lines += 1;
                            new_lines += 1;
                            DiffLineType::Context
                        }
                        ChangeTag::Insert => {
                            new_lines += 1;
                            stats.additions += 1;
                            DiffLineType::Addition
                        }
                        ChangeTag::Delete => {
                            old_lines += 1;
                            stats.deletions += 1;
                            DiffLineType::Deletion
                        }
                    };

                    lines.push(DiffLine {
                        line_type,
                        content: change.value().to_string(),
                        old_lineno: change.old_index().map(|i| i as u32 + 1),
                        new_lineno: change.new_index().map(|i| i as u32 + 1),
                    });
                }
            }

            hunks.push(DiffHunk {
                old_start,
                old_lines,
                new_start,
                new_lines,
                header: String::new(),
                lines,
            });
        }

        DiffResult {
            path: String::new(),
            hunks,
            stats,
        }
    }

    /// Compute diff between two blobs.
    pub fn diff_blobs(&self, old_oid: Oid, new_oid: Oid, context_lines: usize) -> GitResult<DiffResult> {
        let old_content = self.read_blob_str(old_oid)?;
        let new_content = self.read_blob_str(new_oid)?;

        Ok(Self::diff_text(&old_content, &new_content, context_lines))
    }

    // ===== Merge Operations (using `similar` crate) =====

    /// Perform a 3-way merge with conflict markers.
    ///
    /// Returns the merged content. If there are conflicts, the content
    /// will contain conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
    pub fn merge_text(
        base: &str,
        ours: &str,
        theirs: &str,
        ours_label: &str,
        theirs_label: &str,
    ) -> MergeResult {
        // Use simple line-by-line merge
        let base_lines: Vec<&str> = base.lines().collect();
        let ours_lines: Vec<&str> = ours.lines().collect();
        let theirs_lines: Vec<&str> = theirs.lines().collect();

        let mut result = String::new();
        let mut conflicts = 0;

        // Simple merge: if both sides change differently from base, it's a conflict
        let max_len = base_lines.len().max(ours_lines.len()).max(theirs_lines.len());

        for i in 0..max_len {
            let base_line = base_lines.get(i).copied().unwrap_or("");
            let ours_line = ours_lines.get(i).copied().unwrap_or("");
            let theirs_line = theirs_lines.get(i).copied().unwrap_or("");

            if ours_line == theirs_line {
                // Both agree - use either
                result.push_str(ours_line);
                result.push('\n');
            } else if ours_line == base_line {
                // Only theirs changed
                result.push_str(theirs_line);
                result.push('\n');
            } else if theirs_line == base_line {
                // Only ours changed
                result.push_str(ours_line);
                result.push('\n');
            } else {
                // Both changed differently - conflict!
                conflicts += 1;
                result.push_str(&format!("<<<<<<< {}\n", ours_label));
                result.push_str(ours_line);
                result.push_str("\n=======\n");
                result.push_str(theirs_line);
                result.push_str(&format!("\n>>>>>>> {}\n", theirs_label));
            }
        }

        if conflicts > 0 {
            MergeResult::Conflict {
                content: result.into_bytes(),
                marker_count: conflicts,
            }
        } else {
            MergeResult::Clean {
                content: result.into_bytes(),
            }
        }
    }

    /// Merge two blobs with a common ancestor.
    pub fn merge_blobs(
        &self,
        ancestor_oid: Option<Oid>,
        ours_oid: Oid,
        theirs_oid: Oid,
        ours_label: &str,
        theirs_label: &str,
    ) -> GitResult<MergeResult> {
        let base = ancestor_oid
            .map(|oid| self.read_blob_str(oid))
            .transpose()?
            .unwrap_or_default();
        let ours = self.read_blob_str(ours_oid)?;
        let theirs = self.read_blob_str(theirs_oid)?;

        Ok(Self::merge_text(&base, &ours, &theirs, ours_label, theirs_label))
    }

    // ===== Blame Operations =====

    /// Get blame information for content.
    ///
    /// Note: Full blame requires commit history. This returns a placeholder.
    pub fn blame_content(content: &str, path: &str) -> BlameResult {
        let lines: Vec<BlameLine> = content
            .lines()
            .enumerate()
            .map(|(i, _)| BlameLine {
                line_number: i + 1,
                commit_hash: "0000000".to_string(),
                author_name: "Unknown".to_string(),
                author_email: String::new(),
                timestamp: 0,
            })
            .collect();

        BlameResult {
            path: path.to_string(),
            lines,
        }
    }

    // ===== Statistics =====

    /// Get statistics about the Git object store.
    pub fn stats(&self) -> GitResult<GitStoreStats> {
        let odb = self.repo.odb()?;
        let mut blob_count = 0;
        let mut total_size = 0u64;

        odb.foreach(|oid| {
            if let Ok(obj) = odb.read(*oid) {
                if obj.kind() == ObjectType::Blob {
                    blob_count += 1;
                    total_size += obj.len() as u64;
                }
            }
            true
        })?;

        Ok(GitStoreStats {
            blob_count,
            total_size,
        })
    }
}

// ===== Data Structures =====

/// Result of a diff operation.
#[derive(Debug, Clone)]
pub struct DiffResult {
    /// File path
    pub path: String,
    /// Diff hunks
    pub hunks: Vec<DiffHunk>,
    /// Statistics
    pub stats: DiffStats,
}

impl DiffResult {
    /// Format as unified diff.
    pub fn to_unified(&self, old_path: &str, new_path: &str) -> String {
        let mut output = String::new();

        output.push_str(&format!("--- a/{}\n", old_path));
        output.push_str(&format!("+++ b/{}\n", new_path));

        for hunk in &self.hunks {
            output.push_str(&format!(
                "@@ -{},{} +{},{} @@\n",
                hunk.old_start, hunk.old_lines, hunk.new_start, hunk.new_lines
            ));

            for line in &hunk.lines {
                let prefix = match line.line_type {
                    DiffLineType::Context => ' ',
                    DiffLineType::Addition => '+',
                    DiffLineType::Deletion => '-',
                    DiffLineType::NoNewline => '\\',
                };
                output.push(prefix);
                output.push_str(&line.content);
                if !line.content.ends_with('\n') {
                    output.push('\n');
                }
            }
        }

        output
    }
}

/// A diff hunk (contiguous change region).
#[derive(Debug, Clone)]
pub struct DiffHunk {
    /// Starting line in old file
    pub old_start: u32,
    /// Number of lines in old file
    pub old_lines: u32,
    /// Starting line in new file
    pub new_start: u32,
    /// Number of lines in new file
    pub new_lines: u32,
    /// Hunk header (e.g., function name)
    pub header: String,
    /// Lines in this hunk
    pub lines: Vec<DiffLine>,
}

/// A single diff line.
#[derive(Debug, Clone)]
pub struct DiffLine {
    /// Type of line change
    pub line_type: DiffLineType,
    /// Line content (includes newline)
    pub content: String,
    /// Line number in old file (None for additions)
    pub old_lineno: Option<u32>,
    /// Line number in new file (None for deletions)
    pub new_lineno: Option<u32>,
}

/// Type of diff line.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiffLineType {
    /// Unchanged context line
    Context,
    /// Added line
    Addition,
    /// Deleted line
    Deletion,
    /// No newline at end of file marker
    NoNewline,
}

/// Diff statistics.
#[derive(Debug, Clone, Default)]
pub struct DiffStats {
    /// Lines added
    pub additions: u32,
    /// Lines deleted
    pub deletions: u32,
}

/// Result of a merge operation.
#[derive(Debug, Clone)]
pub enum MergeResult {
    /// Clean merge (no conflicts)
    Clean { content: Vec<u8> },
    /// Merge with conflicts (contains conflict markers)
    Conflict { content: Vec<u8>, marker_count: usize },
}

impl MergeResult {
    /// Check if merge was clean.
    pub fn is_clean(&self) -> bool {
        matches!(self, MergeResult::Clean { .. })
    }

    /// Check if merge has conflicts.
    pub fn is_conflict(&self) -> bool {
        matches!(self, MergeResult::Conflict { .. })
    }

    /// Get the merged content (may contain conflict markers).
    pub fn content(&self) -> &[u8] {
        match self {
            MergeResult::Clean { content } => content,
            MergeResult::Conflict { content, .. } => content,
        }
    }

    /// Get the content as a string (if valid UTF-8).
    pub fn content_str(&self) -> Option<&str> {
        std::str::from_utf8(self.content()).ok()
    }
}

/// Result of blame operation.
#[derive(Debug, Clone)]
pub struct BlameResult {
    /// File path
    pub path: String,
    /// Blame information per line
    pub lines: Vec<BlameLine>,
}

/// Blame information for a single line.
#[derive(Debug, Clone)]
pub struct BlameLine {
    /// Line number (1-indexed)
    pub line_number: usize,
    /// Commit hash (short form)
    pub commit_hash: String,
    /// Author name
    pub author_name: String,
    /// Author email
    pub author_email: String,
    /// Commit timestamp (Unix epoch)
    pub timestamp: i64,
}

/// Statistics about the Git object store.
#[derive(Debug, Clone)]
pub struct GitStoreStats {
    /// Number of blobs stored
    pub blob_count: usize,
    /// Total size of all blobs
    pub total_size: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_engine() -> (TempDir, GitTextEngine) {
        let temp = TempDir::new().unwrap();
        let dits_dir = temp.path().join(".dits");
        fs::create_dir_all(&dits_dir).unwrap();
        let engine = GitTextEngine::init(&dits_dir).unwrap();
        (temp, engine)
    }

    #[test]
    fn test_store_and_read_blob() {
        let (_temp, engine) = create_test_engine();

        let content = b"Hello, World!\n";
        let oid = engine.store_blob(content).unwrap();

        assert!(engine.has_blob(oid));

        let read_back = engine.read_blob(oid).unwrap();
        assert_eq!(read_back, content);
    }

    #[test]
    fn test_diff_text() {
        let old = "line1\nline2\nline3\n";
        let new = "line1\nmodified\nline3\n";

        let diff = GitTextEngine::diff_text(old, new, 3);

        assert_eq!(diff.stats.additions, 1);
        assert_eq!(diff.stats.deletions, 1);
        assert!(!diff.hunks.is_empty());
    }

    #[test]
    fn test_merge_clean() {
        let base = "line1\nline2\nline3\n";
        let ours = "line1\nline2 modified\nline3\n";
        let theirs = "line1\nline2\nline3 modified\n";

        let result = GitTextEngine::merge_text(base, ours, theirs, "HEAD", "feature");

        assert!(result.is_clean());
        let content = result.content_str().unwrap();
        assert!(content.contains("line2 modified"));
        assert!(content.contains("line3 modified"));
    }

    #[test]
    fn test_merge_conflict() {
        let base = "line1\nline2\nline3\n";
        let ours = "line1\nours version\nline3\n";
        let theirs = "line1\ntheirs version\nline3\n";

        let result = GitTextEngine::merge_text(base, ours, theirs, "HEAD", "feature");

        assert!(result.is_conflict());
        let content = result.content_str().unwrap();
        assert!(content.contains("<<<<<<<"));
        assert!(content.contains("======="));
        assert!(content.contains(">>>>>>>"));
    }

    #[test]
    fn test_stats() {
        let (_temp, engine) = create_test_engine();

        engine.store_blob(b"content1").unwrap();
        engine.store_blob(b"content2").unwrap();
        engine.store_blob(b"content3").unwrap();

        let stats = engine.stats().unwrap();
        assert_eq!(stats.blob_count, 3);
    }
}
