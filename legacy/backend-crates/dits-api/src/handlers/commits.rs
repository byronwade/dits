//! Commit handlers.

use axum::{extract::Path, Json};

/// List commits.
pub async fn list(Path((_owner, _name)): Path<(String, String)>) -> Json<Vec<()>> {
    Json(vec![])
}

/// Get commit by SHA.
pub async fn get(Path((_owner, _name, _sha)): Path<(String, String, String)>) -> &'static str {
    "TODO"
}
