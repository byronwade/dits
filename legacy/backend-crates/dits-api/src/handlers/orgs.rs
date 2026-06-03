//! Organization handlers.

use axum::{extract::Path, Json};

/// List organizations.
pub async fn list() -> Json<Vec<()>> {
    Json(vec![])
}

/// Create organization.
pub async fn create() -> &'static str {
    "TODO"
}

/// Get organization.
pub async fn get(Path(_name): Path<String>) -> &'static str {
    "TODO"
}

/// Update organization.
pub async fn update(Path(_name): Path<String>) -> &'static str {
    "TODO"
}

/// Delete organization.
pub async fn delete(Path(_name): Path<String>) -> &'static str {
    "TODO"
}

/// List organization members.
pub async fn list_members(Path(_name): Path<String>) -> Json<Vec<()>> {
    Json(vec![])
}
