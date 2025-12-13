//! Health check handlers.

use axum::Json;
use serde::Serialize;

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    version: String,
}

/// General health check.
pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

/// Kubernetes liveness probe.
pub async fn liveness() -> &'static str {
    "OK"
}

/// Kubernetes readiness probe.
pub async fn readiness() -> &'static str {
    // TODO: Check database and cache connectivity
    "OK"
}
