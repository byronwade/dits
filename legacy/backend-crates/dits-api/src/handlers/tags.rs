//! Tag handlers.

use axum::{extract::Path, Json};

/// List tags.
pub async fn list(Path((_owner, _name)): Path<(String, String)>) -> Json<Vec<()>> {
    Json(vec![])
}

/// Create tag.
pub async fn create(Path((_owner, _name)): Path<(String, String)>) -> &'static str {
    "TODO"
}
