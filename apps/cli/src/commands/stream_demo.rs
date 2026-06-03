//! `dits stream-demo` — end-to-end FACR incremental-streaming proof.
//!
//! Ingests (or generates) a short clip, builds v1 HLS, re-grades a time window to make
//! v2, rebuilds v2 reusing unchanged segments, prints the headline, and serves a browser
//! player. See docs/superpowers/specs/2026-06-02-facr-incremental-streaming-slice-design.md.

use crate::facr::store::FrameStore;
use crate::facr::video::{check_ffmpeg, ingest_video};
use crate::stream::incremental::{build_full, build_incremental, plan};
use crate::stream::layout::SegmentLayout;
use crate::stream::origin::{LocalDiskOrigin, SegmentOrigin};
use crate::stream::serve::{serve, ServeState};
use anyhow::{Context, Result};
use std::path::PathBuf;
use std::process::Command;

/// Async because the binary runs under `#[tokio::main]`; nesting a runtime would panic.
/// The ingest/encode work is blocking (shells out to ffmpeg) but runs once at startup.
pub async fn stream_demo(
    input: Option<PathBuf>,
    grade_start: f64,
    grade_end: f64,
    segment_seconds: f64,
    port: u16,
) -> Result<()> {
    check_ffmpeg().context("FFmpeg is required for stream-demo")?;
    let work = std::env::temp_dir().join(format!("dits-stream-demo-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&work)?;
    let store = FrameStore::new(&work.join("frames"))?;
    let origin = LocalDiskOrigin::new(&work.join("origin"))?;

    // 1. Source clip (generate a 10s testsrc if none given).
    let video = match input {
        Some(p) => p,
        None => {
            let p = work.join("source.mp4");
            let ok = Command::new("ffmpeg")
                .args([
                    "-v", "error", "-y", "-f", "lavfi", "-i",
                    "testsrc=duration=10:size=320x240:rate=10", "-pix_fmt", "yuv420p",
                ])
                .arg(&p)
                .status()
                .map(|s| s.success())
                .unwrap_or(false);
            anyhow::ensure!(ok, "failed to generate test clip");
            p
        }
    };

    // 2. Ingest -> v1 manifest -> v1 HLS.
    let v1m = ingest_video(&video, &store).context("ingest video")?;
    let layout = SegmentLayout::new(&v1m.frame_rate, segment_seconds);
    println!(
        "ingested {} frames @ {:.3} fps -> {} segments",
        v1m.frames.len(),
        layout.fps,
        layout.segment_count(v1m.frames.len())
    );
    let v1 = build_full(&v1m, &store, &layout, &origin)?;

    // 3. Re-grade [grade_start, grade_end) seconds -> v2 manifest.
    let fps = layout.fps;
    let start = (grade_start * fps).round() as usize;
    let end = ((grade_end * fps).round() as usize).min(v1m.frames.len());
    let r = start..end;
    println!("re-grading frames {:?} ({}s-{}s)", r, grade_start, grade_end);
    let v2m = crate::stream::edit::regrade_range(&v1m, &store, r, 0.3)?;

    // 4. Plan + build v2 incrementally.
    let p = plan(&v1m, &v2m, &layout);
    let v2 = build_incremental(&v1, &v2m, &store, &layout, &origin, &p)?;

    // 5. Byte accounting: naive (all v2 segs) vs incremental (only re-encoded).
    let bytes_total: u64 = v2
        .segments
        .iter()
        .map(|s| origin.get(&s.hash).map(|b| b.len() as u64).unwrap_or(0))
        .sum();
    let bytes_reencoded: u64 = v2
        .segments
        .iter()
        .filter(|s| p.reencoded.contains(&s.index))
        .map(|s| origin.get(&s.hash).map(|b| b.len() as u64).unwrap_or(0))
        .sum();
    let total = v2.segments.len();
    let reuse_pct = if total == 0 { 0.0 } else { p.reused.len() as f64 / total as f64 * 100.0 };

    println!("\n  -- FACR incremental result --");
    println!("  segments total : {total}");
    println!("  re-encoded     : {} ({:?})", p.reencoded.len(), p.reencoded);
    println!("  reused (0 xfer): {} ({:.1}% reused)", p.reused.len(), reuse_pct);
    println!(
        "  re-delivered   : {:.1} KB   (naive full re-encode: {:.1} KB)",
        bytes_reencoded as f64 / 1024.0,
        bytes_total as f64 / 1024.0
    );

    // 6. Serve the browser proof.
    let state = ServeState {
        v1,
        v2,
        origin: Box::new(origin),
        bytes_total,
        bytes_reencoded,
    };
    serve(state, port).await?;
    Ok(())
}
