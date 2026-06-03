//! `dits facr-demo` — live demonstration of FACR frame-level deduplication.
//!
//! Builds a synthetic clip, commits it into a content-addressed frame store, re-grades
//! a few frames, commits again, and reports how little storage the second version cost.
//! This makes the FACR thesis tangible without needing ffmpeg or real footage.

use crate::facr::{commit_clip, diff_manifests, DeflateRawCodec, FrameCodec, RawFrame};
use anyhow::{Context, Result};
use console::style;

fn synthetic_frames(n: usize, regraded: &[usize]) -> Vec<RawFrame> {
    (0..n)
        .map(|i| {
            // Each frame gets unique content (its index in the first 4 bytes). A
            // re-graded frame keeps its index but flips a marker byte, so it differs
            // from the original frame i AND from every other frame.
            let mut data = vec![0u8; 8 * 8 * 4];
            data[0..4].copy_from_slice(&(i as u32).to_le_bytes());
            if regraded.contains(&i) {
                data[4] = 0xFF;
            }
            RawFrame {
                width: 8,
                height: 8,
                data,
            }
        })
        .collect()
}

/// Run the FACR dedup demonstration.
pub fn facr_demo(frames: usize, regrade: usize) -> Result<()> {
    let regrade = regrade.min(frames);
    let regraded: Vec<usize> = (0..regrade).map(|k| (k * frames / regrade.max(1)).min(frames.saturating_sub(1))).collect();

    let dir = std::env::temp_dir().join(format!("dits-facr-demo-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&dir).context("create temp store dir")?;
    let store = crate::facr::FrameStore::new(&dir).context("open frame store")?;
    let codec = DeflateRawCodec;

    // Version 1: the original clip.
    let v1 = commit_clip(&synthetic_frames(frames, &[]), &codec, &store, 24)?;
    let after_v1 = store.count()?;

    // Version 2: re-grade a handful of frames (everything else is byte-identical).
    let v2 = commit_clip(&synthetic_frames(frames, &regraded), &codec, &store, 24)?;
    let after_v2 = store.count()?;

    let d = diff_manifests(&v1, &v2);
    let added = after_v2 - after_v1;

    println!("{}", style("FACR frame-level dedup demo").bold().cyan());
    println!();
    println!("  Clip frames        : {}", frames);
    println!("  Re-graded frames   : {}", regrade);
    println!("  Codec              : {}", codec.name());
    println!();
    println!("  v1 stored frames   : {}", after_v1);
    println!(
        "  v2 NEW frames       : {}  {}",
        style(added).green().bold(),
        style(format!("(not {})", frames)).dim()
    );
    println!("  shared (deduped)   : {}", d.shared);
    println!(
        "  dedup fraction     : {}",
        style(format!("{:.1}%", d.dedup_fraction() * 100.0)).green()
    );
    println!();
    println!(
        "  {}",
        style(format!(
            "Re-grading {} of {} frames cost {} frame{} of storage, not {}.",
            regrade,
            frames,
            added,
            if added == 1 { "" } else { "s" },
            frames
        ))
        .italic()
    );

    // Best-effort cleanup of the throwaway store.
    let _ = std::fs::remove_dir_all(&dir);

    Ok(())
}
