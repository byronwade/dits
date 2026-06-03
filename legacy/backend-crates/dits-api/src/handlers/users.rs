//! User handlers.

use axum::{extract::Path, Json};

/// List users.
pub async fn list() -> Json<Vec<()>> {
    Json(vec![])
}

/// Get user by ID.
pub async fn get(Path(_id): Path<String>) -> &'static str {
    "TODO"
}

/// Update user.
pub async fn update(Path(_id): Path<String>) -> &'static str {
    "TODO"
}
