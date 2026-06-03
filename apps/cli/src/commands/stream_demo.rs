//! `dits stream-demo` — end-to-end FACR incremental-streaming proof.
//!
//! Ingests (or generates) a short clip, builds v1 HLS, re-grades a time window to make
//! v2, rebuilds v2 reusing unchanged segments, prints the headline, and serves a browser
//! player. See docs/superpowers/specs/2026-06-02-facr-incremental-streaming-slice-design.md.

use crate::facr::store::FrameStore;
use crate::facr::video::{check_ffmpeg, ingest_video, FrameImageCodec};
use crate::stream::incremental::{build_full, build_incremental, plan};
use crate::stream::ladder::default_ladder;
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
    lossless: bool,
    port: u16,
) -> Result<()> {
    check_ffmpeg().context("FFmpeg is required for stream-demo")?;
    let work = std::env::temp_dir().join(format!("dits-stream-demo-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&work)?;
    let frames_dir = work.join("frames");
    let store = FrameStore::new(&frames_dir)?;
    let origin = LocalDiskOrigin::new(&work.join("origin"))?;

    // 1. Source clip (generate a 10s testsrc if none given).
    let video = match input {
        Some(p) => p,
        None => {
            let p = work.join("source.mp4");
            let ok = Command::new("ffmpeg")
                .args([
                    "-v", "error", "-y", "-f", "lavfi", "-i",
                    "testsrc=duration=10:size=1280x720:rate=10", "-pix_fmt", "yuv420p",
                ])
                .arg(&p)
                .status()
                .map(|s| s.success())
                .unwrap_or(false);
            anyhow::ensure!(ok, "failed to generate test clip");
            p
        }
    };

    // 2. Ingest -> v1 manifest -> v1 HLS. Canonical frames are JPEG-XL (deterministic, so
    //    content-addressing/reuse hold) at visually-lossless distance 1 (or lossless distance 0).
    let codec = if lossless { FrameImageCodec::JxlLossless } else { FrameImageCodec::Jxl };
    let v1m = ingest_video(&video, &store, codec).context("ingest video")?;
    let layout = SegmentLayout::new(&v1m.frame_rate, segment_seconds);
    let frame_bytes = dir_size(&frames_dir);
    println!(
        "ingested {} frames @ {:.3} fps -> {} segments  [{} frame store: {:.1} KB]",
        v1m.frames.len(),
        layout.fps,
        layout.segment_count(v1m.frames.len()),
        v1m.codec,
        frame_bytes as f64 / 1024.0
    );
    // 3. Re-grade [grade_start, grade_end) seconds -> v2 manifest.
    let fps = layout.fps;
    let start = (grade_start * fps).round() as usize;
    let end = ((grade_end * fps).round() as usize).min(v1m.frames.len());
    let r = start..end;
    println!("re-grading frames {:?} ({}s-{}s)", r, grade_start, grade_end);
    let v2m = crate::stream::edit::regrade_range(&v1m, &store, r, 0.3)?;

    // 4. Plan once (rendition-independent), then build every ABR rung for v1 and v2.
    let p = plan(&v1m, &v2m, &layout);
    let ladder = default_ladder(v1m.height);
    let rung_names: Vec<&str> = ladder.iter().map(|r| r.name.as_str()).collect();
    println!("ABR ladder: {} renditions [{}]", ladder.len(), rung_names.join(", "));

    let mut v1_ladder = Vec::new();
    let mut v2_ladder = Vec::new();
    for rend in &ladder {
        let prof = rend.profile();
        let sv1 = build_full(&v1m, &store, &layout, &origin, &prof)?;
        let sv2 = build_incremental(&sv1, &v2m, &store, &layout, &origin, &p, &prof)?;
        v1_ladder.push((rend.clone(), sv1));
        v2_ladder.push((rend.clone(), sv2));
    }

    // 5. Byte accounting across every rung of v2: naive (all segments) vs incremental (only changed).
    let mut bytes_total = 0u64;
    let mut bytes_reencoded = 0u64;
    let mut total_segs = 0usize;
    let mut reencoded_segs = 0usize;
    for (_, sv2) in &v2_ladder {
        for seg in &sv2.segments {
            let sz = origin.get(&seg.hash).map(|b| b.len() as u64).unwrap_or(0);
            bytes_total += sz;
            total_segs += 1;
            if p.reencoded.contains(&seg.index) {
                bytes_reencoded += sz;
                reencoded_segs += 1;
            }
        }
    }
    let reuse_pct = if total_segs == 0 {
        0.0
    } else {
        (total_segs - reencoded_segs) as f64 / total_segs as f64 * 100.0
    };

    println!("\n  -- FACR incremental result (across {} renditions) --", ladder.len());
    println!("  segments total : {total_segs}  ({} per rung x {} rungs)", p.reused.len() + p.reencoded.len(), ladder.len());
    println!("  re-encoded     : {reencoded_segs}  (changed segment(s) {:?} x each rung)", p.reencoded);
    println!("  reused (0 xfer): {}  ({:.1}% reused)", total_segs - reencoded_segs, reuse_pct);
    println!(
        "  re-delivered   : {:.1} KB   (naive full re-encode: {:.1} KB)",
        bytes_reencoded as f64 / 1024.0,
        bytes_total as f64 / 1024.0
    );

    // 6. Serve the browser proof (hls.js loads the master playlist and adapts between rungs).
    let state = ServeState {
        v1: v1_ladder,
        v2: v2_ladder,
        origin: Box::new(origin),
        bytes_total,
        bytes_reencoded,
    };
    serve(state, port).await?;
    Ok(())
}

/// Total bytes of all files under `dir` (the content-addressed frame store size).
fn dir_size(dir: &std::path::Path) -> u64 {
    let mut total = 0u64;
    let mut stack = vec![dir.to_path_buf()];
    while let Some(p) = stack.pop() {
        if let Ok(rd) = std::fs::read_dir(&p) {
            for e in rd.flatten() {
                let path = e.path();
                match e.file_type() {
                    Ok(ft) if ft.is_dir() => stack.push(path),
                    Ok(ft) if ft.is_file() => {
                        total += e.metadata().map(|m| m.len()).unwrap_or(0);
                    }
                    _ => {}
                }
            }
        }
    }
    total
}
