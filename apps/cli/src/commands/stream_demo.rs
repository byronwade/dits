//! `dits stream-demo` — end-to-end FACR incremental-streaming proof.
//!
//! Ingests (or generates) a short clip, builds v1 HLS, re-grades a time window to make
//! v2, rebuilds v2 reusing unchanged segments, prints the headline, and serves a browser
//! player. See docs/superpowers/specs/2026-06-02-facr-incremental-streaming-slice-design.md.

use crate::facr::store::FrameStore;
use crate::facr::video::{check_ffmpeg, ingest_video_with_format, FrameFormat};
use crate::stream::incremental::{build_full, build_incremental, plan};
use crate::stream::ladder::{default_ladder, Rendition};
use crate::stream::layout::SegmentLayout;
use crate::stream::origin::{LocalDiskOrigin, SegmentOrigin};
use crate::stream::quic_origin::{push_delta, serve_quic_origin, QuicOriginClient};
use crate::stream::serve::{serve, ServeState, Ladder};
use anyhow::{Context, Result};
use std::path::PathBuf;
use std::process::Command;
use std::sync::Arc;

/// Async because the binary runs under `#[tokio::main]`; nesting a runtime would panic.
/// The ingest/encode work is blocking (shells out to ffmpeg) but runs once at startup.
pub async fn stream_demo(
    input: Option<PathBuf>,
    grade_start: f64,
    grade_end: f64,
    segment_seconds: f64,
    lossless: bool,
    push: bool,
    vmaf: Option<f64>,
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
    let fmt = FrameFormat::JpegXl { distance: if lossless { 0.0 } else { 1.0 } };
    let v1m = ingest_video_with_format(&video, &store, fmt).context("ingest video")?;
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

    // 4. Plan once (rendition-independent), then build for v1 and v2.
    let p = plan(&v1m, &v2m, &layout);
    // VMAF mode: a single source-resolution rendition whose per-segment CRF is chosen to hit the
    // quality target (Netflix-style). Otherwise the fixed-bitrate ABR ladder.
    let ladder = if vmaf.is_some() {
        vec![Rendition { name: "source".into(), height: v1m.height, bitrate_kbps: 0 }]
    } else {
        default_ladder(v1m.height)
    };
    let rung_names: Vec<&str> = ladder.iter().map(|r| r.name.as_str()).collect();
    match vmaf {
        Some(t) => println!("VMAF-targeted (target {t}), source-res single rendition"),
        None => println!("ABR ladder: {} renditions [{}]", ladder.len(), rung_names.join(", ")),
    }

    let mut v1_ladder = Vec::new();
    let mut v2_ladder = Vec::new();
    for rend in &ladder {
        let prof = if vmaf.is_some() { crate::stream::encode::EncodeProfile::source() } else { rend.profile() };
        let sv1 = build_full(&v1m, &store, &layout, &origin, &prof, vmaf)?;
        let sv2 = build_incremental(&sv1, &v2m, &store, &layout, &origin, &p, &prof, vmaf)?;
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
    if let Some(t) = vmaf {
        println!(
            "  VMAF           : every segment's CRF chosen to hit >= {t}; total {:.1} KB at target quality",
            bytes_total as f64 / 1024.0
        );
    }

    // 5b. Optional: delta-push to a remote QUIC origin — only changed segments cross the network.
    if push {
        let remote_backing = Arc::new(LocalDiskOrigin::new(&work.join("remote"))?);
        let (addr, fp, _task) =
            serve_quic_origin("127.0.0.1:0".parse().unwrap(), remote_backing).await?;
        let client = QuicOriginClient::connect(addr, fp).await?;
        println!("\n  -- QUIC delta-push to remote origin ({addr}) --");

        let v1_hashes = ladder_hashes(&v1_ladder);
        let s1 = push_delta(&origin, &client, &v1_hashes).await?;
        println!(
            "  v1 push: {} segments, {:.1} KB  (remote was empty)",
            s1.pushed,
            s1.bytes as f64 / 1024.0
        );

        let v2_hashes = ladder_hashes(&v2_ladder);
        let s2 = push_delta(&origin, &client, &v2_hashes).await?;
        println!(
            "  v2 push: {} segments, {:.1} KB  ({} already on remote, 0 KB)",
            s2.pushed,
            s2.bytes as f64 / 1024.0,
            s2.skipped
        );
        println!("  => only the changed segments crossed the network.");
    }

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

/// All content hashes in a version's ladder: every rung's init segment plus all media segments.
fn ladder_hashes(ladder: &Ladder) -> Vec<crate::core::Hash> {
    let mut out = Vec::new();
    for (_, sv) in ladder {
        out.push(sv.init_hash);
        out.extend(sv.segments.iter().map(|s| s.hash));
    }
    out
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
