//! Database connection pool.

use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;

/// Database connection pool.
pub type Pool = PgPool;

/// Create a new connection pool.
pub async fn create_pool(database_url: &str) -> Result<Pool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(100)
        .min_connections(10)
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(600))
        .connect(database_url)
        .await
}
