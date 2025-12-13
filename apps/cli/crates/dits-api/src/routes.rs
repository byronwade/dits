//! API route definitions.

use axum::{
    routing::{get, post, put, delete},
    Router,
};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::handlers;
use crate::state::AppState;

/// Create the API router with all routes.
pub fn create_router(state: AppState) -> Router {
    Router::new()
        // Health endpoints
        .route("/health", get(handlers::health::health))
        .route("/health/live", get(handlers::health::liveness))
        .route("/health/ready", get(handlers::health::readiness))
        // Metrics endpoint
        .route("/metrics", get(handlers::metrics::metrics))
        // API v1 routes
        .nest("/v1", api_v1_routes())
        // Middleware
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        // State
        .with_state(state)
}

/// API v1 routes.
fn api_v1_routes() -> Router<AppState> {
    Router::new()
        // Authentication
        .route("/auth/login", post(handlers::auth::login))
        .route("/auth/logout", post(handlers::auth::logout))
        .route("/auth/refresh", post(handlers::auth::refresh))
        .route("/auth/me", get(handlers::auth::me))
        // Users
        .route("/users", get(handlers::users::list))
        .route("/users/:id", get(handlers::users::get))
        .route("/users/:id", put(handlers::users::update))
        // Organizations
        .route("/orgs", get(handlers::orgs::list))
        .route("/orgs", post(handlers::orgs::create))
        .route("/orgs/:name", get(handlers::orgs::get))
        .route("/orgs/:name", put(handlers::orgs::update))
        .route("/orgs/:name", delete(handlers::orgs::delete))
        .route("/orgs/:name/members", get(handlers::orgs::list_members))
        // Repositories
        .route("/repos", get(handlers::repos::list))
        .route("/repos", post(handlers::repos::create))
        .route("/repos/:owner/:name", get(handlers::repos::get))
        .route("/repos/:owner/:name", put(handlers::repos::update))
        .route("/repos/:owner/:name", delete(handlers::repos::delete))
        // Repository operations
        .route("/repos/:owner/:name/commits", get(handlers::commits::list))
        .route("/repos/:owner/:name/commits/:sha", get(handlers::commits::get))
        .route("/repos/:owner/:name/branches", get(handlers::branches::list))
        .route("/repos/:owner/:name/branches", post(handlers::branches::create))
        .route("/repos/:owner/:name/branches/:branch", get(handlers::branches::get))
        .route("/repos/:owner/:name/branches/:branch", delete(handlers::branches::delete))
        .route("/repos/:owner/:name/tags", get(handlers::tags::list))
        .route("/repos/:owner/:name/tags", post(handlers::tags::create))
        // Files and trees
        .route("/repos/:owner/:name/tree/*path", get(handlers::files::tree))
        .route("/repos/:owner/:name/blob/*path", get(handlers::files::blob))
        // Chunks
        .route("/repos/:owner/:name/chunks", post(handlers::chunks::upload))
        .route("/repos/:owner/:name/chunks/:hash", get(handlers::chunks::download))
        .route("/repos/:owner/:name/chunks/batch", post(handlers::chunks::batch_check))
        // Locks
        .route("/repos/:owner/:name/locks", get(handlers::locks::list))
        .route("/repos/:owner/:name/locks", post(handlers::locks::acquire))
        .route("/repos/:owner/:name/locks/:id", delete(handlers::locks::release))
        // Push/Pull operations
        .route("/repos/:owner/:name/push", post(handlers::transfer::push))
        .route("/repos/:owner/:name/pull", post(handlers::transfer::pull))
        .route("/repos/:owner/:name/fetch", post(handlers::transfer::fetch))
}
