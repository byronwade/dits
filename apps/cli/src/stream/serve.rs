//! Tiny axum origin: serves a master playlist + per-rendition media playlists, content-addressed
//! CMAF segments, a stats JSON, and the hls.js player page. Blocks until the server stops.

use crate::stream::ladder::Rendition;
use crate::stream::origin::SegmentOrigin;
use crate::stream::playlist::{master_playlist, StreamVersion};
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

/// A version's ABR ladder: one StreamVersion per rendition rung.
pub type Ladder = Vec<(Rendition, StreamVersion)>;

pub struct ServeState {
    pub v1: Ladder,
    pub v2: Ladder,
    pub origin: Box<dyn SegmentOrigin + Send + Sync>,
    pub bytes_total: u64,     // naive: all v2 rung segments
    pub bytes_reencoded: u64, // incremental: only changed v2 rung segments
}

impl ServeState {
    fn version(&self, name: &str) -> Option<&Ladder> {
        match name.trim_end_matches(".m3u8") {
            "v1" => Some(&self.v1),
            "v2" => Some(&self.v2),
            _ => None,
        }
    }
}

pub async fn serve(state: ServeState, port: u16) -> Result<()> {
    let shared = Arc::new(state);
    let app = Router::new()
        .route("/", get(|| async { Html(include_str!("web/player.html")) }))
        .route("/v/:name", get(master))
        .route("/r/:version/:rendition", get(rung))
        .route("/seg/:name", get(segment))
        .route("/stats", get(stats))
        .with_state(shared);
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", port)).await?;
    println!("\n  ▶  open http://127.0.0.1:{port}/  (Ctrl-C to stop)\n");
    axum::serve(listener, app).await?;
    Ok(())
}

/// Master playlist for a version: one STREAM-INF per rung -> /r/{version}/{rung}.m3u8.
async fn master(State(s): State<Arc<ServeState>>, AxPath(name): AxPath<String>) -> impl IntoResponse {
    let version = name.trim_end_matches(".m3u8").to_string();
    let Some(ladder) = s.version(&name) else {
        return (StatusCode::NOT_FOUND, "no such version").into_response();
    };
    let rungs: Vec<(u64, u32, u32, String)> = ladder
        .iter()
        .map(|(r, sv)| {
            (
                r.bitrate_kbps as u64 * 1000,
                sv.width,
                sv.height,
                format!("/r/{version}/{}.m3u8", r.name),
            )
        })
        .collect();
    let body = master_playlist(&rungs);
    ([(header::CONTENT_TYPE, "application/vnd.apple.mpegurl")], body).into_response()
}

/// Media playlist for one rung of one version.
async fn rung(
    State(s): State<Arc<ServeState>>,
    AxPath((version, rendition)): AxPath<(String, String)>,
) -> impl IntoResponse {
    let Some(ladder) = s.version(&version) else {
        return (StatusCode::NOT_FOUND, "no such version").into_response();
    };
    let rname = rendition.trim_end_matches(".m3u8");
    let Some((_, sv)) = ladder.iter().find(|(r, _)| r.name == rname) else {
        return (StatusCode::NOT_FOUND, "no such rendition").into_response();
    };
    let body = sv.to_hls("/seg/");
    ([(header::CONTENT_TYPE, "application/vnd.apple.mpegurl")], body).into_response()
}

async fn segment(State(s): State<Arc<ServeState>>, AxPath(name): AxPath<String>) -> impl IntoResponse {
    // Content-addressed: hash is the part before the extension (.mp4 init or .m4s media).
    let hex = name.split('.').next().unwrap_or("");
    let hash = match crate::core::Hash::from_hex(hex) {
        Ok(h) => h,
        Err(_) => return (StatusCode::BAD_REQUEST, "bad hash").into_response(),
    };
    match s.origin.get(&hash) {
        Ok(bytes) => ([(header::CONTENT_TYPE, "video/mp4")], bytes).into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "no such segment").into_response(),
    }
}

async fn stats(State(s): State<Arc<ServeState>>) -> impl IntoResponse {
    // Aggregate reuse across every rung: a v2 rung segment is reused if its hash appears in the
    // matching v1 rung.
    let mut total = 0usize;
    let mut reused = 0usize;
    for (r2, sv2) in &s.v2 {
        let v1_hashes: std::collections::HashSet<_> = s
            .v1
            .iter()
            .find(|(r1, _)| r1.name == r2.name)
            .map(|(_, sv1)| sv1.segments.iter().map(|x| x.hash).collect())
            .unwrap_or_default();
        total += sv2.segments.len();
        reused += sv2.segments.iter().filter(|x| v1_hashes.contains(&x.hash)).count();
    }
    let reencoded = total - reused;
    let reuse_pct = if total == 0 { 0.0 } else { reused as f64 / total as f64 * 100.0 };
    Json(json!({
        "renditions": s.v2.len(),
        "total": total, "reused": reused, "reencoded": reencoded,
        "reuse_pct": reuse_pct,
        "bytes_total": s.bytes_total, "bytes_reencoded": s.bytes_reencoded,
    }))
}
