//! Tiny axum origin: serves content-addressed `.ts` segments, the two playlists,
//! a stats JSON, and the hls.js player page. Blocks until the server stops.

use crate::stream::origin::SegmentOrigin;
use crate::stream::playlist::StreamVersion;
use anyhow::Result;
use axum::{
    extract::{Path as AxPath, State},
    http::{header, StatusCode},
    response::{Html, IntoResponse},
    routing::get,
    Json, Router,
};
use serde_json::json;
use std::sync::Arc;

pub struct ServeState {
    pub v1: StreamVersion,
    pub v2: StreamVersion,
    pub origin: Box<dyn SegmentOrigin + Send + Sync>,
    pub bytes_total: u64,     // naive: all v2 segments
    pub bytes_reencoded: u64, // incremental: only changed v2 segments
}

pub async fn serve(state: ServeState, port: u16) -> Result<()> {
    let shared = Arc::new(state);
    let app = Router::new()
        .route("/", get(|| async { Html(include_str!("web/player.html")) }))
        .route("/v/:name", get(playlist))
        .route("/seg/:name", get(segment))
        .route("/stats", get(stats))
        .with_state(shared);
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", port)).await?;
    println!("\n  ▶  open http://127.0.0.1:{port}/  (Ctrl-C to stop)\n");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn playlist(State(s): State<Arc<ServeState>>, AxPath(name): AxPath<String>) -> impl IntoResponse {
    let v = match name.trim_end_matches(".m3u8") {
        "v1" => &s.v1,
        "v2" => &s.v2,
        _ => return (StatusCode::NOT_FOUND, "no such version").into_response(),
    };
    let body = v.to_hls("/seg/");
    ([(header::CONTENT_TYPE, "application/vnd.apple.mpegurl")], body).into_response()
}

async fn segment(State(s): State<Arc<ServeState>>, AxPath(name): AxPath<String>) -> impl IntoResponse {
    let hex = name.trim_end_matches(".ts");
    let hash = match crate::core::Hash::from_hex(hex) {
        Ok(h) => h,
        Err(_) => return (StatusCode::BAD_REQUEST, "bad hash").into_response(),
    };
    match s.origin.get(&hash) {
        Ok(bytes) => ([(header::CONTENT_TYPE, "video/mp2t")], bytes).into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "no such segment").into_response(),
    }
}

async fn stats(State(s): State<Arc<ServeState>>) -> impl IntoResponse {
    let total = s.v2.segments.len();
    // Reused = segments in v2 whose hash also appears in v1.
    let v1_hashes: std::collections::HashSet<_> = s.v1.segments.iter().map(|r| r.hash).collect();
    let reused = s.v2.segments.iter().filter(|r| v1_hashes.contains(&r.hash)).count();
    let reencoded = total - reused;
    let reuse_pct = if total == 0 { 0.0 } else { reused as f64 / total as f64 * 100.0 };
    Json(json!({
        "total": total, "reused": reused, "reencoded": reencoded,
        "reuse_pct": reuse_pct,
        "bytes_total": s.bytes_total, "bytes_reencoded": s.bytes_reencoded,
    }))
}
