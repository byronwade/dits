//! Branch handlers.

use axum::{extract::Path, Json};

/// List branches.
pub async fn list(Path((_owner, _name)): Path<(String, String)>) -> Json<Vec<()>> {
    Json(vec![])
}

/// Create branch.
pub async fn create(Path((_owner, _name)): Path<(String, String)>) -> &'static str {
    "TODO"
}

/// Get branch.
pub async fn get(Path((_owner, _name, _branch)): Path<(String, String, String)>) -> &'static str {
    "TODO"
}

/// Delete branch.
pub async fn delete(Path((_owner, _name, _branch)): Path<(String, String, String)>) -> &'static str {
    "TODO"
}
