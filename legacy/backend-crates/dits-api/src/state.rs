//! Application state.

use std::sync::Arc;

/// Shared application state.
#[derive(Clone)]
pub struct AppState {
    inner: Arc<AppStateInner>,
}

struct AppStateInner {
    // Database connection pool
    // db: dits_db::Pool,
    // Cache client
    // cache: dits_cache::Client,
    // Storage client
    // storage: dits_storage::Client,
    // Configuration
    // config: dits_core::Config,
}

impl AppState {
    /// Create application state from environment variables.
    pub async fn from_env() -> anyhow::Result<Self> {
        // TODO: Initialize database, cache, and storage connections
        Ok(Self {
            inner: Arc::new(AppStateInner {}),
        })
    }
}
