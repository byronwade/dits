//! Dits Worker
//!
//! Background job processor for:
//! - Chunking and deduplication
//! - Webhook delivery
//! - Cleanup tasks
//! - Analytics aggregation

use tracing::info;

mod jobs;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("dits_worker=info")
        .init();

    info!("Starting Dits Worker");

    // TODO: Implement job processing

    Ok(())
}
