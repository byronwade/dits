//! File and tree handlers.

use axum::extract::Path;

/// Get directory tree.
pub async fn tree(Path((_owner, _name, _path)): Path<(String, String, String)>) -> &'static str {
    "TODO"
}

/// Get file blob.
pub async fn blob(Path((_owner, _name, _path)): Path<(String, String, String)>) -> &'static str {
    "TODO"
}
