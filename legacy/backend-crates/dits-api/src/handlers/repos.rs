//! Repository handlers.

use axum::{extract::Path, Json};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct RepoResponse {
    pub name: String,
    pub description: Option<String>,
    pub default_branch: String,
}

#[derive(Deserialize)]
pub struct CreateRepoRequest {
    pub name: String,
    pub description: Option<String>,
    pub private: bool,
}

/// List repositories.
pub async fn list() -> Json<Vec<RepoResponse>> {
    // TODO: Implement
    Json(vec![])
}

/// Create a new repository.
pub async fn create(Json(_body): Json<CreateRepoRequest>) -> Json<RepoResponse> {
    // TODO: Implement
    Json(RepoResponse {
        name: "todo".to_string(),
        description: None,
        default_branch: "main".to_string(),
    })
}

/// Get repository by owner and name.
pub async fn get(Path((_owner, _name)): Path<(String, String)>) -> Json<RepoResponse> {
    // TODO: Implement
    Json(RepoResponse {
        name: "todo".to_string(),
        description: None,
        default_branch: "main".to_string(),
    })
}

/// Update repository.
pub async fn update(Path((_owner, _name)): Path<(String, String)>) -> Json<RepoResponse> {
    // TODO: Implement
    Json(RepoResponse {
        name: "todo".to_string(),
        description: None,
        default_branch: "main".to_string(),
    })
}

/// Delete repository.
pub async fn delete(Path((_owner, _name)): Path<(String, String)>) -> &'static str {
    // TODO: Implement
    "OK"
}
