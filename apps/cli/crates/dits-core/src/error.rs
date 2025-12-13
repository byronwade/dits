//! Error types for the Dits system.

use thiserror::Error;

/// Result type alias using the Dits error type.
pub type Result<T> = std::result::Result<T, Error>;

/// Main error type for Dits operations.
#[derive(Error, Debug)]
pub enum Error {
    // ==================== Authentication Errors ====================
    #[error("Authentication required")]
    AuthenticationRequired,

    #[error("Invalid token: {0}")]
    InvalidToken(String),

    #[error("Token expired")]
    TokenExpired,

    #[error("Insufficient permissions: {0}")]
    InsufficientPermissions(String),

    // ==================== Repository Errors ====================
    #[error("Repository not found: {0}")]
    RepositoryNotFound(String),

    #[error("Repository already exists: {0}")]
    RepositoryAlreadyExists(String),

    #[error("Not a dits repository")]
    NotARepository,

    #[error("Repository is empty")]
    EmptyRepository,

    #[error("Invalid repository name: {0}")]
    InvalidRepositoryName(String),

    // ==================== Commit Errors ====================
    #[error("Commit not found: {0}")]
    CommitNotFound(String),

    #[error("Invalid commit: {0}")]
    InvalidCommit(String),

    #[error("Nothing to commit")]
    NothingToCommit,

    #[error("Merge conflict in files: {0:?}")]
    MergeConflict(Vec<String>),

    // ==================== Branch Errors ====================
    #[error("Branch not found: {0}")]
    BranchNotFound(String),

    #[error("Branch already exists: {0}")]
    BranchAlreadyExists(String),

    #[error("Cannot delete current branch")]
    CannotDeleteCurrentBranch,

    #[error("Branch has unmerged changes")]
    UnmergedChanges,

    // ==================== File/Chunk Errors ====================
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Chunk not found: {0}")]
    ChunkNotFound(String),

    #[error("Chunk corrupted: expected {expected}, got {actual}")]
    ChunkCorrupted { expected: String, actual: String },

    #[error("File too large: {size} bytes (max: {max})")]
    FileTooLarge { size: u64, max: u64 },

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    // ==================== Lock Errors ====================
    #[error("File is locked by {owner}: {path}")]
    FileLocked { path: String, owner: String },

    #[error("Lock not found: {0}")]
    LockNotFound(String),

    #[error("Lock expired")]
    LockExpired,

    #[error("Cannot release lock owned by another user")]
    LockOwnerMismatch,

    // ==================== Network Errors ====================
    #[error("Network error: {0}")]
    Network(String),

    #[error("Connection refused: {0}")]
    ConnectionRefused(String),

    #[error("Request timeout")]
    Timeout,

    #[error("Rate limited, retry after {retry_after} seconds")]
    RateLimited { retry_after: u64 },

    // ==================== Storage Errors ====================
    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Storage full")]
    StorageFull,

    #[error("Object not found: {0}")]
    ObjectNotFound(String),

    // ==================== Configuration Errors ====================
    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Missing configuration: {0}")]
    MissingConfig(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    // ==================== Internal Errors ====================
    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    // ==================== Wrapped Errors ====================
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

impl Error {
    /// Returns the error code for API responses.
    pub fn code(&self) -> &'static str {
        match self {
            // E1xxx: Authentication
            Error::AuthenticationRequired => "E1001",
            Error::InvalidToken(_) => "E1002",
            Error::TokenExpired => "E1003",
            Error::InsufficientPermissions(_) => "E1004",

            // E2xxx: Repository
            Error::RepositoryNotFound(_) => "E2001",
            Error::RepositoryAlreadyExists(_) => "E2002",
            Error::NotARepository => "E2003",
            Error::EmptyRepository => "E2004",
            Error::InvalidRepositoryName(_) => "E2005",

            // E3xxx: Commit/File/Chunk
            Error::CommitNotFound(_) => "E3001",
            Error::InvalidCommit(_) => "E3002",
            Error::NothingToCommit => "E3003",
            Error::MergeConflict(_) => "E3004",
            Error::FileNotFound(_) => "E3101",
            Error::ChunkNotFound(_) => "E3201",
            Error::ChunkCorrupted { .. } => "E3202",
            Error::FileTooLarge { .. } => "E3102",
            Error::InvalidPath(_) => "E3103",

            // E4xxx: Branch/Tag
            Error::BranchNotFound(_) => "E4001",
            Error::BranchAlreadyExists(_) => "E4002",
            Error::CannotDeleteCurrentBranch => "E4003",
            Error::UnmergedChanges => "E4004",

            // E5xxx: Lock
            Error::FileLocked { .. } => "E5001",
            Error::LockNotFound(_) => "E5002",
            Error::LockExpired => "E5003",
            Error::LockOwnerMismatch => "E5004",

            // E6xxx: Transfer/Network
            Error::Network(_) => "E6001",
            Error::ConnectionRefused(_) => "E6002",
            Error::Timeout => "E6003",
            Error::RateLimited { .. } => "E6004",

            // E7xxx: Storage
            Error::Storage(_) => "E7001",
            Error::StorageFull => "E7002",
            Error::ObjectNotFound(_) => "E7003",

            // E8xxx: Configuration
            Error::Config(_) => "E8001",
            Error::MissingConfig(_) => "E8002",
            Error::InvalidConfig(_) => "E8003",

            // E9xxx: Internal
            Error::Internal(_) => "E9001",
            Error::Database(_) => "E9002",
            Error::Serialization(_) => "E9003",
            Error::Io(_) => "E9004",
            Error::Other(_) => "E9999",
        }
    }

    /// Returns the HTTP status code for this error.
    pub fn status_code(&self) -> u16 {
        match self {
            // 400 Bad Request
            Error::InvalidRepositoryName(_)
            | Error::InvalidCommit(_)
            | Error::InvalidPath(_)
            | Error::InvalidConfig(_)
            | Error::NothingToCommit => 400,

            // 401 Unauthorized
            Error::AuthenticationRequired | Error::InvalidToken(_) | Error::TokenExpired => 401,

            // 403 Forbidden
            Error::InsufficientPermissions(_) | Error::LockOwnerMismatch => 403,

            // 404 Not Found
            Error::RepositoryNotFound(_)
            | Error::CommitNotFound(_)
            | Error::BranchNotFound(_)
            | Error::FileNotFound(_)
            | Error::ChunkNotFound(_)
            | Error::LockNotFound(_)
            | Error::ObjectNotFound(_)
            | Error::NotARepository => 404,

            // 409 Conflict
            Error::RepositoryAlreadyExists(_)
            | Error::BranchAlreadyExists(_)
            | Error::MergeConflict(_)
            | Error::FileLocked { .. }
            | Error::UnmergedChanges => 409,

            // 413 Payload Too Large
            Error::FileTooLarge { .. } => 413,

            // 422 Unprocessable Entity
            Error::ChunkCorrupted { .. } => 422,

            // 429 Too Many Requests
            Error::RateLimited { .. } => 429,

            // 500 Internal Server Error
            Error::Internal(_)
            | Error::Database(_)
            | Error::Serialization(_)
            | Error::Other(_) => 500,

            // 502 Bad Gateway
            Error::Network(_) | Error::ConnectionRefused(_) => 502,

            // 503 Service Unavailable
            Error::StorageFull | Error::EmptyRepository => 503,

            // 504 Gateway Timeout
            Error::Timeout => 504,

            // Default
            _ => 500,
        }
    }

    /// Returns whether this error is retryable.
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            Error::Network(_)
                | Error::Timeout
                | Error::RateLimited { .. }
                | Error::ConnectionRefused(_)
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_codes() {
        assert_eq!(Error::AuthenticationRequired.code(), "E1001");
        assert_eq!(Error::RepositoryNotFound("test".into()).code(), "E2001");
        assert_eq!(Error::ChunkNotFound("abc123".into()).code(), "E3201");
    }

    #[test]
    fn test_status_codes() {
        assert_eq!(Error::AuthenticationRequired.status_code(), 401);
        assert_eq!(Error::RepositoryNotFound("test".into()).status_code(), 404);
        assert_eq!(Error::RateLimited { retry_after: 60 }.status_code(), 429);
    }

    #[test]
    fn test_retryable() {
        assert!(Error::Timeout.is_retryable());
        assert!(Error::RateLimited { retry_after: 60 }.is_retryable());
        assert!(!Error::AuthenticationRequired.is_retryable());
    }
}
