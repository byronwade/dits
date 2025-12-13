//! Audit logging for security compliance.

use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use chrono::{DateTime, Utc};

/// Types of auditable events.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditEventType {
    // Authentication events
    Login,
    Logout,
    LoginFailed,
    PasswordChanged,
    KeystoreCreated,
    KeystoreDeleted,

    // Repository events
    RepoInit,
    RepoClone,

    // Content events
    CommitCreated,
    FileAdded,
    FileModified,
    FileDeleted,
    Checkout,

    // Encryption events
    EncryptionEnabled,
    EncryptionDisabled,
    ChunkEncrypted,
    ChunkDecrypted,

    // Access events
    FileAccessed,
    ManifestAccessed,

    // Administrative events
    ConfigChanged,
    BranchCreated,
    BranchDeleted,
    TagCreated,
    TagDeleted,
    Merge,
}

impl AuditEventType {
    /// Get a human-readable name for the event type.
    pub fn name(&self) -> &'static str {
        match self {
            Self::Login => "login",
            Self::Logout => "logout",
            Self::LoginFailed => "login_failed",
            Self::PasswordChanged => "password_changed",
            Self::KeystoreCreated => "keystore_created",
            Self::KeystoreDeleted => "keystore_deleted",
            Self::RepoInit => "repo_init",
            Self::RepoClone => "repo_clone",
            Self::CommitCreated => "commit_created",
            Self::FileAdded => "file_added",
            Self::FileModified => "file_modified",
            Self::FileDeleted => "file_deleted",
            Self::Checkout => "checkout",
            Self::EncryptionEnabled => "encryption_enabled",
            Self::EncryptionDisabled => "encryption_disabled",
            Self::ChunkEncrypted => "chunk_encrypted",
            Self::ChunkDecrypted => "chunk_decrypted",
            Self::FileAccessed => "file_accessed",
            Self::ManifestAccessed => "manifest_accessed",
            Self::ConfigChanged => "config_changed",
            Self::BranchCreated => "branch_created",
            Self::BranchDeleted => "branch_deleted",
            Self::TagCreated => "tag_created",
            Self::TagDeleted => "tag_deleted",
            Self::Merge => "merge",
        }
    }
}

/// Outcome of an audited event.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditOutcome {
    Success,
    Failure { reason: String },
    Denied { reason: String },
}

impl AuditOutcome {
    /// Check if the outcome was successful.
    pub fn is_success(&self) -> bool {
        matches!(self, Self::Success)
    }
}

/// A single audit event.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    /// Event ID (UUID v4).
    pub id: String,
    /// Timestamp (Unix seconds).
    pub timestamp: u64,
    /// Human-readable timestamp.
    pub timestamp_str: String,
    /// Type of event.
    pub event_type: AuditEventType,
    /// Outcome of the event.
    pub outcome: AuditOutcome,
    /// Resource affected (file path, branch name, etc.).
    pub resource: Option<String>,
    /// Additional metadata.
    pub metadata: Option<serde_json::Value>,
    /// User identifier (if known).
    pub user: Option<String>,
    /// Client version.
    pub client_version: Option<String>,
}

impl AuditEvent {
    /// Create a new audit event.
    pub fn new(event_type: AuditEventType, outcome: AuditOutcome) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let timestamp_str = DateTime::<Utc>::from_timestamp(now as i64, 0)
            .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
            .unwrap_or_else(|| "unknown".to_string());

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: now,
            timestamp_str,
            event_type,
            outcome,
            resource: None,
            metadata: None,
            user: None,
            client_version: Some(env!("CARGO_PKG_VERSION").to_string()),
        }
    }

    /// Set the resource for this event.
    pub fn with_resource(mut self, resource: impl Into<String>) -> Self {
        self.resource = Some(resource.into());
        self
    }

    /// Set metadata for this event.
    pub fn with_metadata(mut self, metadata: serde_json::Value) -> Self {
        self.metadata = Some(metadata);
        self
    }

    /// Set the user for this event.
    pub fn with_user(mut self, user: impl Into<String>) -> Self {
        self.user = Some(user.into());
        self
    }
}

/// Audit log manager.
pub struct AuditLog {
    /// Path to the audit log file.
    log_path: PathBuf,
    /// Maximum number of events to keep (0 = unlimited).
    max_events: usize,
}

impl AuditLog {
    /// Open or create an audit log in the given directory.
    pub fn open(dits_dir: &Path) -> Self {
        Self {
            log_path: dits_dir.join("audit.log"),
            max_events: 10000, // Default: keep last 10k events
        }
    }

    /// Create an audit log at a specific path.
    pub fn at_path(path: PathBuf) -> Self {
        Self {
            log_path: path,
            max_events: 10000,
        }
    }

    /// Set the maximum number of events to retain.
    pub fn with_max_events(mut self, max: usize) -> Self {
        self.max_events = max;
        self
    }

    /// Log an audit event.
    pub fn log(&self, event: &AuditEvent) -> std::io::Result<()> {
        // Ensure parent directory exists
        if let Some(parent) = self.log_path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Serialize event to JSON line
        let json = serde_json::to_string(event)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

        // Append to log file
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_path)?;

        writeln!(file, "{}", json)?;

        // Rotate if needed
        if self.max_events > 0 {
            self.rotate_if_needed()?;
        }

        Ok(())
    }

    /// Log a successful event.
    pub fn log_success(&self, event_type: AuditEventType, resource: Option<&str>) -> std::io::Result<()> {
        let mut event = AuditEvent::new(event_type, AuditOutcome::Success);
        if let Some(r) = resource {
            event = event.with_resource(r);
        }
        self.log(&event)
    }

    /// Log a failed event.
    pub fn log_failure(&self, event_type: AuditEventType, reason: &str, resource: Option<&str>) -> std::io::Result<()> {
        let mut event = AuditEvent::new(event_type, AuditOutcome::Failure { reason: reason.to_string() });
        if let Some(r) = resource {
            event = event.with_resource(r);
        }
        self.log(&event)
    }

    /// Log a denied event.
    pub fn log_denied(&self, event_type: AuditEventType, reason: &str, resource: Option<&str>) -> std::io::Result<()> {
        let mut event = AuditEvent::new(event_type, AuditOutcome::Denied { reason: reason.to_string() });
        if let Some(r) = resource {
            event = event.with_resource(r);
        }
        self.log(&event)
    }

    /// Read all audit events.
    pub fn read_all(&self) -> std::io::Result<Vec<AuditEvent>> {
        if !self.log_path.exists() {
            return Ok(Vec::new());
        }

        let file = File::open(&self.log_path)?;
        let reader = BufReader::new(file);
        let mut events = Vec::new();

        for line in reader.lines() {
            let line = line?;
            if let Ok(event) = serde_json::from_str::<AuditEvent>(&line) {
                events.push(event);
            }
        }

        Ok(events)
    }

    /// Read the last N events.
    pub fn read_last(&self, n: usize) -> std::io::Result<Vec<AuditEvent>> {
        let all = self.read_all()?;
        let start = all.len().saturating_sub(n);
        Ok(all[start..].to_vec())
    }

    /// Query events by type.
    pub fn query_by_type(&self, event_type: AuditEventType) -> std::io::Result<Vec<AuditEvent>> {
        let all = self.read_all()?;
        Ok(all.into_iter()
            .filter(|e| e.event_type == event_type)
            .collect())
    }

    /// Query events by resource.
    pub fn query_by_resource(&self, resource: &str) -> std::io::Result<Vec<AuditEvent>> {
        let all = self.read_all()?;
        Ok(all.into_iter()
            .filter(|e| e.resource.as_deref() == Some(resource))
            .collect())
    }

    /// Query events in a time range.
    pub fn query_by_time_range(&self, start: u64, end: u64) -> std::io::Result<Vec<AuditEvent>> {
        let all = self.read_all()?;
        Ok(all.into_iter()
            .filter(|e| e.timestamp >= start && e.timestamp <= end)
            .collect())
    }

    /// Get statistics about audit events.
    pub fn stats(&self) -> std::io::Result<AuditStats> {
        let events = self.read_all()?;
        let mut stats = AuditStats::default();

        for event in &events {
            stats.total_events += 1;
            match &event.outcome {
                AuditOutcome::Success => stats.successful += 1,
                AuditOutcome::Failure { .. } => stats.failed += 1,
                AuditOutcome::Denied { .. } => stats.denied += 1,
            }
        }

        if let Some(first) = events.first() {
            stats.oldest_event = Some(first.timestamp);
        }
        if let Some(last) = events.last() {
            stats.newest_event = Some(last.timestamp);
        }

        Ok(stats)
    }

    /// Rotate the log file if it exceeds max_events.
    fn rotate_if_needed(&self) -> std::io::Result<()> {
        let events = self.read_all()?;
        if events.len() <= self.max_events {
            return Ok(());
        }

        // Keep only the last max_events
        let start = events.len() - self.max_events;
        let retained: Vec<&AuditEvent> = events[start..].iter().collect();

        // Rewrite the file
        let file = File::create(&self.log_path)?;
        let mut writer = BufWriter::new(file);
        for event in retained {
            let json = serde_json::to_string(event)
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            writeln!(writer, "{}", json)?;
        }

        Ok(())
    }

    /// Clear all audit logs (dangerous!).
    pub fn clear(&self) -> std::io::Result<()> {
        if self.log_path.exists() {
            fs::remove_file(&self.log_path)?;
        }
        Ok(())
    }

    /// Export audit log to JSON.
    pub fn export_json(&self) -> std::io::Result<String> {
        let events = self.read_all()?;
        serde_json::to_string_pretty(&events)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
    }
}

/// Audit log statistics.
#[derive(Debug, Clone, Default)]
pub struct AuditStats {
    pub total_events: u64,
    pub successful: u64,
    pub failed: u64,
    pub denied: u64,
    pub oldest_event: Option<u64>,
    pub newest_event: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_log_and_read() {
        let dir = tempdir().unwrap();
        let log = AuditLog::open(dir.path());

        // Log some events
        log.log_success(AuditEventType::RepoInit, Some("/test/repo")).unwrap();
        log.log_success(AuditEventType::FileAdded, Some("test.txt")).unwrap();
        log.log_failure(AuditEventType::Login, "Invalid password", None).unwrap();

        // Read events
        let events = log.read_all().unwrap();
        assert_eq!(events.len(), 3);

        assert_eq!(events[0].event_type, AuditEventType::RepoInit);
        assert!(events[0].outcome.is_success());

        assert_eq!(events[2].event_type, AuditEventType::Login);
        assert!(!events[2].outcome.is_success());
    }

    #[test]
    fn test_query_by_type() {
        let dir = tempdir().unwrap();
        let log = AuditLog::open(dir.path());

        log.log_success(AuditEventType::FileAdded, Some("a.txt")).unwrap();
        log.log_success(AuditEventType::FileAdded, Some("b.txt")).unwrap();
        log.log_success(AuditEventType::CommitCreated, Some("abc123")).unwrap();

        let file_events = log.query_by_type(AuditEventType::FileAdded).unwrap();
        assert_eq!(file_events.len(), 2);
    }

    #[test]
    fn test_rotation() {
        let dir = tempdir().unwrap();
        let log = AuditLog::open(dir.path()).with_max_events(5);

        // Log more than max events
        for i in 0..10 {
            log.log_success(AuditEventType::FileAccessed, Some(&format!("file{}.txt", i))).unwrap();
        }

        // Should only have last 5
        let events = log.read_all().unwrap();
        assert_eq!(events.len(), 5);
        assert_eq!(events[0].resource, Some("file5.txt".to_string()));
    }

    #[test]
    fn test_stats() {
        let dir = tempdir().unwrap();
        let log = AuditLog::open(dir.path());

        log.log_success(AuditEventType::RepoInit, None).unwrap();
        log.log_success(AuditEventType::FileAdded, None).unwrap();
        log.log_failure(AuditEventType::Login, "Bad password", None).unwrap();
        log.log_denied(AuditEventType::FileAccessed, "No permission", None).unwrap();

        let stats = log.stats().unwrap();
        assert_eq!(stats.total_events, 4);
        assert_eq!(stats.successful, 2);
        assert_eq!(stats.failed, 1);
        assert_eq!(stats.denied, 1);
    }

    #[test]
    fn test_export_json() {
        let dir = tempdir().unwrap();
        let log = AuditLog::open(dir.path());

        log.log_success(AuditEventType::RepoInit, Some("/test")).unwrap();

        let json = log.export_json().unwrap();
        assert!(json.contains("repo_init"));
        assert!(json.contains("/test"));
    }
}
