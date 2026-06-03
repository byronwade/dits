//! Chunk handlers.

use axum::extract::Path;

/// Upload chunk.
pub async fn upload(Path((_owner, _name)): Path<(String, String)>) -> &'static str {
    "TODO"
}

/// Download chunk.
pub async fn download(
    Path((_owner, _name, _hash)): Path<(String, String, String)>,
) -> &'static str {
    "TODO"
}

/// Batch check chunks existence.
pub async fn batch_check(Path((_owner, _name)): Path<(String, String)>) -> &'static str {
    "TODO"
}
