//! Dits Storage Server
//!
//! Chunk storage and retrieval server.

use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("dits_storage=info")
        .init();

    info!("Starting Dits Storage server");

    // TODO: Implement storage server

    Ok(())
}
