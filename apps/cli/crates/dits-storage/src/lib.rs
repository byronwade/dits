//! Object storage layer for Dits.
//!
//! Provides abstraction over different storage backends:
//! - S3 (AWS, MinIO, etc.)
//! - Local filesystem
//! - GCS
//! - Azure Blob

pub mod backends;
pub mod client;

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::Result;

/// Storage backend trait.
#[async_trait]
pub trait StorageBackend: Send + Sync {
    /// Upload an object.
    async fn put(&self, key: &str, data: Bytes) -> Result<()>;

    /// Download an object.
    async fn get(&self, key: &str) -> Result<Bytes>;

    /// Check if object exists.
    async fn exists(&self, key: &str) -> Result<bool>;

    /// Delete an object.
    async fn delete(&self, key: &str) -> Result<()>;

    /// List objects with prefix.
    async fn list(&self, prefix: &str) -> Result<Vec<String>>;

    /// Get object metadata.
    async fn head(&self, key: &str) -> Result<ObjectMeta>;
}

/// Object metadata.
pub struct ObjectMeta {
    /// Object size in bytes.
    pub size: u64,
    /// Content type.
    pub content_type: Option<String>,
    /// Last modified timestamp.
    pub last_modified: Option<chrono::DateTime<chrono::Utc>>,
    /// ETag.
    pub etag: Option<String>,
}
