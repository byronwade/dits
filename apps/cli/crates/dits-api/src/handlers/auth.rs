//! Authentication handlers.

use axum::Json;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

/// Login and get access token.
pub async fn login(Json(_body): Json<LoginRequest>) -> Json<TokenResponse> {
    // TODO: Implement authentication
    Json(TokenResponse {
        access_token: "todo".to_string(),
        refresh_token: "todo".to_string(),
        expires_in: 3600,
    })
}

/// Logout and invalidate token.
pub async fn logout() -> &'static str {
    "OK"
}

/// Refresh access token.
pub async fn refresh() -> Json<TokenResponse> {
    // TODO: Implement token refresh
    Json(TokenResponse {
        access_token: "todo".to_string(),
        refresh_token: "todo".to_string(),
        expires_in: 3600,
    })
}

/// Get current user info.
pub async fn me() -> &'static str {
    // TODO: Return current user
    "TODO"
}
