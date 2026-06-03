//! Common types used across Dits.

use serde::{Deserialize, Serialize};

/// Progress information for operations.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Progress {
    /// Current progress (bytes, items, etc.).
    pub current: u64,
    /// Total expected (bytes, items, etc.).
    pub total: u64,
    /// Transfer speed in bytes per second.
    pub speed: u64,
    /// Operation message.
    pub message: Option<String>,
}

impl Progress {
    /// Create new progress tracker.
    pub fn new(total: u64) -> Self {
        Self {
            current: 0,
            total,
            speed: 0,
            message: None,
        }
    }

    /// Get percentage complete (0.0 - 100.0).
    pub fn percentage(&self) -> f64 {
        if self.total == 0 {
            100.0
        } else {
            (self.current as f64 / self.total as f64) * 100.0
        }
    }

    /// Check if complete.
    pub fn is_complete(&self) -> bool {
        self.current >= self.total
    }

    /// Format speed as human-readable string.
    pub fn speed_human(&self) -> String {
        format_bytes(self.speed) + "/s"
    }

    /// Estimated time remaining.
    pub fn eta(&self) -> Option<std::time::Duration> {
        if self.speed == 0 || self.current >= self.total {
            None
        } else {
            let remaining = self.total - self.current;
            let seconds = remaining / self.speed;
            Some(std::time::Duration::from_secs(seconds))
        }
    }
}

/// Format bytes as human-readable string.
pub fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    const TB: u64 = GB * 1024;

    if bytes >= TB {
        format!("{:.2} TB", bytes as f64 / TB as f64)
    } else if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

/// Parse bytes from human-readable string.
pub fn parse_bytes(s: &str) -> Option<u64> {
    let s = s.trim().to_uppercase();
    let (num_str, unit) = if s.ends_with("TB") {
        (&s[..s.len() - 2], 1024u64 * 1024 * 1024 * 1024)
    } else if s.ends_with("GB") {
        (&s[..s.len() - 2], 1024u64 * 1024 * 1024)
    } else if s.ends_with("MB") {
        (&s[..s.len() - 2], 1024u64 * 1024)
    } else if s.ends_with("KB") {
        (&s[..s.len() - 2], 1024u64)
    } else if s.ends_with('B') {
        (&s[..s.len() - 1], 1u64)
    } else {
        (s.as_str(), 1u64)
    };

    num_str.trim().parse::<f64>().ok().map(|n| (n * unit as f64) as u64)
}

/// Result of a push operation.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct PushResult {
    /// Number of commits pushed.
    pub commits_pushed: u32,
    /// Number of chunks uploaded.
    pub chunks_uploaded: u64,
    /// Bytes uploaded.
    pub bytes_uploaded: u64,
    /// Chunks that were already on server.
    pub chunks_skipped: u64,
    /// New commit hash on remote.
    pub commit: Option<String>,
}

/// Result of a pull operation.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct PullResult {
    /// Number of commits pulled.
    pub commits_pulled: u32,
    /// Number of chunks downloaded.
    pub chunks_downloaded: u64,
    /// Bytes downloaded.
    pub bytes_downloaded: u64,
    /// Chunks retrieved from cache.
    pub chunks_cached: u64,
    /// Files updated.
    pub files_updated: u64,
    /// New HEAD commit.
    pub commit: Option<String>,
}

/// Result of a clone operation.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct CloneResult {
    /// Repository path.
    pub path: String,
    /// Default branch checked out.
    pub branch: String,
    /// Number of commits.
    pub commits: u64,
    /// Total size.
    pub size: u64,
}

/// Result of a merge operation.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum MergeResult {
    /// Fast-forward merge.
    FastForward,
    /// Normal merge with commit.
    Merged { commit: String },
    /// Merge conflict.
    Conflict { files: Vec<String> },
    /// Already up to date.
    UpToDate,
}

impl MergeResult {
    /// Check if merge resulted in conflict.
    pub fn is_conflict(&self) -> bool {
        matches!(self, MergeResult::Conflict { .. })
    }

    /// Get conflicting files if any.
    pub fn conflicting_files(&self) -> Option<&[String]> {
        match self {
            MergeResult::Conflict { files } => Some(files),
            _ => None,
        }
    }
}

/// Sorting options for listings.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortOrder {
    /// Ascending order.
    #[default]
    Asc,
    /// Descending order.
    Desc,
}

/// Pagination cursor.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Cursor {
    /// Opaque cursor string.
    pub value: String,
}

impl Cursor {
    /// Create a new cursor.
    pub fn new(value: impl Into<String>) -> Self {
        Self {
            value: value.into(),
        }
    }
}

/// Paginated response.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Page<T> {
    /// Items in this page.
    pub items: Vec<T>,
    /// Total count (if available).
    pub total: Option<u64>,
    /// Next page cursor.
    pub next_cursor: Option<Cursor>,
    /// Previous page cursor.
    pub prev_cursor: Option<Cursor>,
    /// Whether there are more pages.
    pub has_more: bool,
}

impl<T> Page<T> {
    /// Create an empty page.
    pub fn empty() -> Self {
        Self {
            items: Vec::new(),
            total: Some(0),
            next_cursor: None,
            prev_cursor: None,
            has_more: false,
        }
    }

    /// Create a page with items.
    pub fn new(items: Vec<T>, has_more: bool) -> Self {
        Self {
            items,
            total: None,
            next_cursor: None,
            prev_cursor: None,
            has_more,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_progress_percentage() {
        let mut progress = Progress::new(100);
        assert_eq!(progress.percentage(), 0.0);

        progress.current = 50;
        assert_eq!(progress.percentage(), 50.0);

        progress.current = 100;
        assert_eq!(progress.percentage(), 100.0);
        assert!(progress.is_complete());
    }

    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(500), "500 B");
        assert_eq!(format_bytes(1024), "1.00 KB");
        assert_eq!(format_bytes(1536), "1.50 KB");
        assert_eq!(format_bytes(1024 * 1024), "1.00 MB");
        assert_eq!(format_bytes(1024 * 1024 * 1024), "1.00 GB");
    }

    #[test]
    fn test_parse_bytes() {
        assert_eq!(parse_bytes("500"), Some(500));
        assert_eq!(parse_bytes("1KB"), Some(1024));
        assert_eq!(parse_bytes("1.5 MB"), Some(1572864));
        assert_eq!(parse_bytes("1GB"), Some(1073741824));
    }

    #[test]
    fn test_merge_result() {
        let conflict = MergeResult::Conflict {
            files: vec!["a.txt".to_string()],
        };
        assert!(conflict.is_conflict());
        assert_eq!(conflict.conflicting_files(), Some(&["a.txt".to_string()][..]));

        let merged = MergeResult::Merged {
            commit: "abc123".to_string(),
        };
        assert!(!merged.is_conflict());
        assert!(merged.conflicting_files().is_none());
    }

    #[test]
    fn test_page_empty() {
        let page: Page<String> = Page::empty();
        assert!(page.items.is_empty());
        assert_eq!(page.total, Some(0));
        assert!(!page.has_more);
    }
}
