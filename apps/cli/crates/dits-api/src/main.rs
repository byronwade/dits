//! Dits API Server
//!
//! REST API server for the Dits version control system.

use std::net::SocketAddr;
use tracing::info;

mod error;
mod handlers;
mod middleware;
mod routes;
mod state;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("dits_api=info".parse()?),
        )
        .init();

    info!("Starting Dits API server");

    // Load configuration
    dotenvy::dotenv().ok();

    // Build application state
    let state = state::AppState::from_env().await?;

    // Build router
    let app = routes::create_router(state);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
