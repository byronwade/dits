//! Push/Pull transfer handlers.

use axum::extract::Path;

/// Push changes to remote.
pub async fn push(Path((_owner, _name)): Path<(String, String)>) -> &'static str {
    "TODO"
}

/// Pull changes from remote.
pub async fn pull(Path((_owner, _name)): Path<(String, String)>) -> &'static str {
    "TODO"
}

/// Fetch metadata from remote.
pub async fn fetch(Path((_owner, _name)): Path<(String, String)>) -> &'static str {
    "TODO"
}
