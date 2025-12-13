//! Lock handlers.

use axum::{extract::Path, Json};

/// List locks.
pub async fn list(Path((_owner, _name)): Path<(String, String)>) -> Json<Vec<()>> {
    Json(vec![])
}

/// Acquire lock.
pub async fn acquire(Path((_owner, _name)): Path<(String, String)>) -> &'static str {
    "TODO"
}

/// Release lock.
pub async fn release(Path((_owner, _name, _id)): Path<(String, String, String)>) -> &'static str {
    "TODO"
}
