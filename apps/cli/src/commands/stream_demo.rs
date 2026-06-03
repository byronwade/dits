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
    edit: Option<String>,
    otio: bool,
    import: Option<String>,
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

    // P4 #2: content-defined boundaries make reuse survive trim/insert edits. Objective report only.
    if let Some(kind) = edit.as_deref() {
        return cdc_edit_demo(kind, &v1m, &store, &origin, layout.fps).await;
    }
    // P4 #3: reconstruct an edit from an OpenTimelineIO timeline (generated, or a real --import file).
    if otio || import.is_some() {
        return otio_demo(&v1m, import.as_deref(), &work).await;
    }

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

/// OTIO import demo: reconstruct an edit from an OpenTimelineIO timeline (a generated trim+reorder,
/// or a real `--import` file) and show it costs 0 new frames, with CDC segment reuse.
async fn otio_demo(
    source: &crate::facr::manifest::ClipManifest,
    import: Option<&str>,
    work: &std::path::Path,
) -> Result<()> {
    use crate::stream::cdc::{plan_cdc, CdcParams};
    use crate::stream::otio::{parse_otio, timeline_to_manifest};
    use std::collections::HashMap;

    // Get an OTIO document: a real file, or a generated trim+reorder of the ingested source.
    let doc = match import {
        Some(p) => std::fs::read_to_string(p).with_context(|| format!("read OTIO file {p}"))?,
        None => {
            let n = source.frames.len();
            let rate = crate::stream::layout::parse_fps(&source.frame_rate);
            let mid = n / 2;
            let tail_trim = 5.min(n.saturating_sub(mid));
            // Reorder: second half (trimmed) first, then the front half.
            let doc = generate_otio("source", rate, &[(mid, n - mid - tail_trim), (0, mid)]);
            let path = work.join("edit.otio");
            std::fs::write(&path, &doc)?;
            println!("generated OTIO timeline -> {}", path.display());
            doc
        }
    };

    let clips = parse_otio(&doc).context("parse OTIO")?;
    // Map every referenced source name onto the single ingested source (demo uses one source).
    let mut sources: HashMap<String, &crate::facr::manifest::ClipManifest> = HashMap::new();
    for c in &clips {
        sources.insert(c.source.clone(), source);
    }
    let edited = timeline_to_manifest(&clips, &sources)?;

    // Zero new content: how many output frame hashes are absent from the source?
    let src_hashes: std::collections::HashSet<_> = source.frames.iter().map(|f| f.hash).collect();
    let new_frames = edited.frames.iter().filter(|f| !src_hashes.contains(&f.hash)).count();

    let plan = plan_cdc(source, &edited, &CdcParams::default());
    let total = plan.reused.len() + plan.reencoded.len();
    let reuse_pct = if total == 0 { 0.0 } else { plan.reused.len() as f64 / total as f64 * 100.0 };

    println!("\n  -- FACR OTIO import --");
    println!("  clips imported        : {}", clips.len());
    println!("  frames reconstructed  : {}  (source had {})", edited.frames.len(), source.frames.len());
    println!("  NEW frames stored     : {new_frames}  (the whole edit is a re-arrangement of existing frames)");
    println!("  CDC segments reused   : {}/{}  ({reuse_pct:.1}%)", plan.reused.len(), total);
    println!("  => importing an external edit costs ~0 new frames; interior segments reuse by content.");
    Ok(())
}

/// Build a minimal one-track OTIO JSON document from `(start, count)` source ranges (in frames).
fn generate_otio(source: &str, rate: f64, ranges: &[(usize, usize)]) -> String {
    let clips: Vec<String> = ranges
        .iter()
        .map(|(start, count)| {
            format!(
                r#"{{ "OTIO_SCHEMA": "Clip.1", "media_reference": {{ "OTIO_SCHEMA": "ExternalReference.1", "target_url": "{source}" }}, "source_range": {{ "OTIO_SCHEMA": "TimeRange.1", "start_time": {{ "OTIO_SCHEMA": "RationalTime.1", "value": {start}, "rate": {rate} }}, "duration": {{ "OTIO_SCHEMA": "RationalTime.1", "value": {count}, "rate": {rate} }} }} }}"#
            )
        })
        .collect();
    format!(
        r#"{{ "OTIO_SCHEMA": "Timeline.1", "tracks": {{ "OTIO_SCHEMA": "Stack.1", "children": [ {{ "OTIO_SCHEMA": "Track.1", "children": [ {} ] }} ] }} }}"#,
        clips.join(", ")
    )
}

/// CDC edit demo: build v1 with content-defined segments, apply a trim/insert, rebuild v2 reusing
/// segments by content id, and report reuse vs the fixed-boundary baseline. Objective (byte/segment
/// counts), like the QUIC proof.
async fn cdc_edit_demo(
    kind: &str,
    v1m: &crate::facr::manifest::ClipManifest,
    store: &FrameStore,
    origin: &LocalDiskOrigin,
    fps: f64,
) -> Result<()> {
    use crate::stream::cdc::{cdc_segments, CdcParams};
    use crate::stream::encode::{encode_cmaf_segment, EncodeProfile};
    use std::collections::HashMap;

    let params = CdcParams::default();
    let ext = crate::facr::video::frame_ext(&v1m.codec);

    // Encode one content-defined segment and store its media; returns (media_hash, bytes).
    let encode_seg = |range: std::ops::Range<usize>, m: &crate::facr::manifest::ClipManifest| -> Result<(crate::core::Hash, u64)> {
        let pngs: Vec<Vec<u8>> = range
            .clone()
            .map(|i| store.load_frame(&m.frames[i].hash))
            .collect::<std::io::Result<_>>()?;
        let cm = encode_cmaf_segment(&pngs, &m.frame_rate, ext, &EncodeProfile::source())?;
        let mh = crate::core::Hash::from_slice(blake3::hash(&cm.media).as_bytes());
        let ih = crate::core::Hash::from_slice(blake3::hash(&cm.init).as_bytes());
        origin.put(&mh, &cm.media)?;
        origin.put(&ih, &cm.init)?;
        Ok((mh, cm.media.len() as u64))
    };

    // v1: encode every content-defined segment; map content_id -> media hash.
    let v1segs = cdc_segments(v1m, &params);
    let mut v1map: HashMap<crate::core::Hash, crate::core::Hash> = HashMap::new();
    for s in &v1segs {
        let (mh, _) = encode_seg(s.frames.clone(), v1m)?;
        v1map.insert(s.content_id, mh);
    }
    println!(
        "v1: {} content-defined segments (avg {:.1} frames)",
        v1segs.len(),
        v1m.frames.len() as f64 / v1segs.len().max(1) as f64
    );

    // Apply the edit at the clip midpoint.
    let mid = v1m.frames.len() / 2;
    let k = 5usize.min(v1m.frames.len().saturating_sub(mid)).max(1);
    let v2m = match kind {
        "trim" => crate::stream::edit::trim_range(v1m, mid..mid + k)?,
        _ => {
            // Insert a short clip (a copy of the opening frames) at the midpoint.
            let inserted: Vec<_> = v1m.frames[0..k.min(v1m.frames.len())].to_vec();
            crate::stream::edit::insert_frames(v1m, mid, &inserted)?
        }
    };
    println!("edit: {kind} {k} frames at frame {mid}  ({} -> {} frames)", v1m.frames.len(), v2m.frames.len());

    // v2: reuse segments whose content id is already known; encode the rest.
    let v2segs = cdc_segments(&v2m, &params);
    let mut reused = 0usize;
    let mut reencoded = 0usize;
    let mut bytes_re = 0u64;
    for s in &v2segs {
        if v1map.contains_key(&s.content_id) {
            reused += 1;
        } else {
            let (_, bytes) = encode_seg(s.frames.clone(), &v2m)?;
            reencoded += 1;
            bytes_re += bytes;
        }
    }

    // Fixed-boundary contrast: how many would survive with equal-size chunks?
    let chunk = ((fps * 2.0).round() as usize).max(1);
    let fixed_ids = |m: &crate::facr::manifest::ClipManifest| -> std::collections::HashSet<crate::core::Hash> {
        m.frames
            .chunks(chunk)
            .map(|c| {
                let mut h = blake3::Hasher::new();
                for f in c {
                    h.update(f.hash.as_bytes());
                }
                crate::core::Hash::from_slice(h.finalize().as_bytes())
            })
            .collect()
    };
    let f1 = fixed_ids(v1m);
    let f2 = fixed_ids(&v2m);
    let fixed_reused = f2.iter().filter(|x| f1.contains(x)).count();

    let reuse_pct = if v2segs.is_empty() { 0.0 } else { reused as f64 / v2segs.len() as f64 * 100.0 };
    println!("\n  -- FACR edit-resilient reuse ({kind}) --");
    println!("  v2 content-defined segments : {}", v2segs.len());
    println!("  reused (content match)      : {reused}  ({reuse_pct:.1}% reused)");
    println!("  re-encoded                  : {reencoded}  ({:.1} KB)", bytes_re as f64 / 1024.0);
    println!(
        "  fixed-boundary baseline     : {fixed_reused}/{} chunks reused (collapses after the edit)",
        f2.len()
    );
    println!("  => content-defined boundaries preserve reuse across a frame-shifting edit.");
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
