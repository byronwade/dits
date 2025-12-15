//! HTTP server for serving Dits repositories over the network.
//!
//! This implements basic HTTP endpoints for remote repository access.
//! Full QUIC protocol implementation will come in Phase 4b.

use axum::{
    extract::Path,
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde_json::json;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

/// Repository server state
pub struct RepoServer {
    /// Base directory containing repositories
    base_dir: PathBuf,
}

impl RepoServer {
    /// Create a new repository server
    pub fn new(base_dir: PathBuf) -> Self {
        Self { base_dir }
    }

    /// Create the Axum router with all routes
    pub fn router(self: Arc<Self>) -> Router {
        Router::new()
            .route("/repos/:repo/refs", get(Self::get_refs))
            .route("/repos/:repo/objects/:hash", get(Self::get_object))
            .layer(CorsLayer::permissive())
            .with_state(self)
    }

    /// Get repository refs
    async fn get_refs(
        Path(repo): Path<String>,
        state: axum::extract::State<Arc<RepoServer>>,
    ) -> Result<Json<serde_json::Value>, StatusCode> {
        let repo_path = state.base_dir.join(&repo);

        if !repo_path.join(".dits").exists() {
            return Err(StatusCode::NOT_FOUND);
        }

        // Read refs from the repository
        let mut refs = HashMap::new();

        // Read heads
        let heads_dir = repo_path.join(".dits/refs/heads");
        if heads_dir.exists() {
            for entry in std::fs::read_dir(&heads_dir).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)? {
                let entry = entry.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
                if let Some(name) = entry.file_name().to_str() {
                    if let Ok(content) = std::fs::read_to_string(entry.path()) {
                        refs.insert(format!("refs/heads/{}", name), content.trim().to_string());
                    }
                }
            }
        }

        // Read tags
        let tags_dir = repo_path.join(".dits/refs/tags");
        if tags_dir.exists() {
            for entry in std::fs::read_dir(&tags_dir).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)? {
                let entry = entry.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
                if let Some(name) = entry.file_name().to_str() {
                    if let Ok(content) = std::fs::read_to_string(entry.path()) {
                        refs.insert(format!("refs/tags/{}", name), content.trim().to_string());
                    }
                }
            }
        }

        Ok(Json(json!(refs)))
    }

    /// Get an object by hash
    async fn get_object(
        Path((repo, hash)): Path<(String, String)>,
        state: axum::extract::State<Arc<RepoServer>>,
    ) -> Result<Vec<u8>, StatusCode> {
        let repo_path = state.base_dir.join(repo);

        if !repo_path.join(".dits").exists() {
            return Err(StatusCode::NOT_FOUND);
        }

        // Parse hash to determine object path
        if hash.len() < 4 {
            return Err(StatusCode::BAD_REQUEST);
        }

        let prefix1 = &hash[0..2];
        let prefix2 = &hash[2..4];
        let objects_dir = repo_path.join(".dits/objects");

        // Try different object types
        let object_types = ["chunks", "manifests", "commits"];

        for obj_type in &object_types {
            let object_path = objects_dir.join(obj_type).join(prefix1).join(prefix2).join(&hash);
            if object_path.exists() {
                return std::fs::read(&object_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR);
            }
        }

        Err(StatusCode::NOT_FOUND)
    }
}

/// Start the repository server
pub async fn start_server(base_dir: PathBuf, port: u16) -> anyhow::Result<()> {
    let server = Arc::new(RepoServer::new(base_dir));
    let app = server.router();

    let addr = format!("0.0.0.0:{}", port);
    println!("Starting Dits remote server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

