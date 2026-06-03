//! Dits client.

use dits_core::Result;

/// Dits API client.
pub struct Client {
    endpoint: String,
    token: Option<String>,
}

impl Client {
    /// Create a new client from environment variables.
    pub fn from_env() -> Result<Self> {
        let endpoint = std::env::var("DITS_ENDPOINT")
            .unwrap_or_else(|_| "https://api.dits.io".to_string());
        let token = std::env::var("DITS_TOKEN").ok();

        Ok(Self { endpoint, token })
    }

    /// Create a new client with explicit configuration.
    pub fn new(endpoint: impl Into<String>, token: Option<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
            token,
        }
    }
}
