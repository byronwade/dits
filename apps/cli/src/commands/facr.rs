//! `dits facr add` / `dits facr checkout` — real video in/out of the frame-addressable store.

use crate::facr::{
    ingest_photo, ingest_video, reconstruct_video, render_photo, trim, ClipManifest, FrameStore,
    PhotoEdit, PhotoVersion,
};
use anyhow::{Context, Result};
use console::style;
use std::path::{Path, PathBuf};

fn store_dir(explicit: Option<&str>) -> PathBuf {
    explicit
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(".dits-facr"))
}

fn dir_size(path: &Path) -> u64 {
    let mut total = 0;
    if let Ok(entries) = std::fs::read_dir(path) {
        for e in entries.flatten() {
            let p = e.path();
            if p.is_dir() {
                total += dir_size(&p);
            } else if let Ok(m) = e.metadata() {
                total += m.len();
            }
        }
    }
    total
}

fn human(bytes: u64) -> String {
    const U: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    let mut v = bytes as f64;
    let mut i = 0;
    while v >= 1024.0 && i < U.len() - 1 {
        v /= 1024.0;
        i += 1;
    }
    format!("{:.1} {}", v, U[i])
}

/// Ingest a real video into the frame-addressable store.
pub fn facr_add(
    input: &str,
    store: Option<&str>,
    manifest_out: Option<&str>,
    frame_codec: Option<&str>,
) -> Result<()> {
    let input_path = Path::new(input);
    anyhow::ensure!(input_path.exists(), "input not found: {}", input);

    // Default to WebP-lossless (smaller than PNG, still lossless + deterministic).
    let codec = match frame_codec {
        Some(name) => crate::facr::FrameImageCodec::from_name(name)
            .with_context(|| format!("unknown frame codec '{name}' (use: png, webp)"))?,
        None => crate::facr::FrameImageCodec::Webp,
    };

    let store_path = store_dir(store);
    std::fs::create_dir_all(&store_path).context("create FACR store dir")?;
    let frame_store = FrameStore::new(&store_path)?;

    let before = frame_store.count()?;
    let before_bytes = dir_size(&store_path);

    println!("Ingesting {} ...", style(input).cyan());
    if crate::facr::source_has_audio(input_path) {
        println!(
            "  {} audio track detected — it is stored (stream-copied) and preserved on checkout.",
            style("\u{266a}").cyan()
        );
    }
    let manifest = ingest_video(input_path, &frame_store, codec)?;

    let after = frame_store.count()?;
    let after_bytes = dir_size(&store_path);
    let new_frames = after - before;

    let manifest_path = manifest_out
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(format!("{input}.facr.json")));
    std::fs::write(&manifest_path, manifest.to_json()?).context("write manifest")?;

    println!();
    println!("  Resolution     : {}x{}", manifest.width, manifest.height);
    println!("  Frame rate     : {}", manifest.frame_rate);
    println!("  Total frames   : {}", manifest.frames.len());
    println!(
        "  NEW frames     : {}  {}",
        style(new_frames).green().bold(),
        style(format!("({} deduped against the store)", manifest.frames.len() - new_frames)).dim()
    );
    println!(
        "  Store growth   : {} ({} total)",
        style(human(after_bytes - before_bytes)).green(),
        human(after_bytes)
    );
    println!("  Manifest       : {}", style(manifest_path.display()).cyan());
    println!();
    println!(
        "  {}",
        style("Edit this manifest with `dits facr-trim` to make cuts that cost ZERO new").italic()
    );
    println!(
        "  {}",
        style("storage. (Re-ingesting a re-encoded export will NOT dedup — see the FACR docs.)").italic()
    );
    Ok(())
}

/// Trim a clip manifest to frames `[start, end)` without storing any new frames.
pub fn facr_trim(manifest: &str, start: usize, end: Option<usize>, out: Option<&str>) -> Result<()> {
    let manifest_path = Path::new(manifest);
    anyhow::ensure!(manifest_path.exists(), "manifest not found: {}", manifest);
    let json = std::fs::read_to_string(manifest_path).context("read manifest")?;
    let src = ClipManifest::from_json(&json).context("parse manifest")?;

    let end = end.unwrap_or(src.frames.len());
    let trimmed = trim(&src, start, end);

    let out_path = out
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(format!("{manifest}.trimmed.json")));
    std::fs::write(&out_path, trimmed.to_json()?).context("write trimmed manifest")?;

    println!(
        "Trimmed {} -> {} frames {}",
        src.frames.len(),
        trimmed.frames.len(),
        style("(0 new frames stored — pure manifest edit)").green()
    );
    println!("  Manifest: {}", style(out_path.display()).cyan());
    Ok(())
}

/// Import a CMX3600 EDL into a FACR manifest that references an existing source clip's
/// frames (zero new storage). All EDL reels map to the single provided source manifest.
pub fn facr_import_edl(
    edl: &str,
    source_manifest: &str,
    out: &str,
    fps: Option<u32>,
) -> Result<()> {
    use crate::facr::parse_cmx3600;
    use std::collections::HashMap;

    let edl_text = std::fs::read_to_string(edl)
        .with_context(|| format!("read EDL {edl}"))?;
    let source = ClipManifest::from_json(
        &std::fs::read_to_string(source_manifest)
            .with_context(|| format!("read source manifest {source_manifest}"))?,
    )
    .context("parse source manifest")?;

    // Frame rate: explicit flag, else round the source's recorded rate.
    let fps = fps.unwrap_or_else(|| {
        let r = &source.frame_rate;
        if let Some((n, d)) = r.split_once('/') {
            let n: f64 = n.parse().unwrap_or(30.0);
            let d: f64 = d.parse().unwrap_or(1.0);
            if d != 0.0 { (n / d).round() as u32 } else { 30 }
        } else {
            r.parse::<f64>().unwrap_or(30.0).round() as u32
        }
    });

    let events = parse_cmx3600(&edl_text, fps)?;

    // Map every reel referenced by the EDL to the single source manifest.
    let mut sources = HashMap::new();
    for ev in &events {
        sources.entry(ev.reel.clone()).or_insert_with(|| source.clone());
    }
    finish_import(&events, &sources, out)
}

/// Import an OTIO timeline JSON into a FACR manifest referencing a source clip (zero
/// new storage). All clips map to the single provided source manifest.
pub fn facr_import_otio(otio: &str, source_manifest: &str, out: &str) -> Result<()> {
    use crate::facr::parse_otio;
    use std::collections::HashMap;

    let otio_text = std::fs::read_to_string(otio).with_context(|| format!("read OTIO {otio}"))?;
    let source = ClipManifest::from_json(
        &std::fs::read_to_string(source_manifest)
            .with_context(|| format!("read source manifest {source_manifest}"))?,
    )
    .context("parse source manifest")?;

    let events = parse_otio(&otio_text)?;
    let mut sources = HashMap::new();
    for ev in &events {
        sources.entry(ev.reel.clone()).or_insert_with(|| source.clone());
    }
    finish_import(&events, &sources, out)
}

/// Shared tail for timeline imports: build the manifest, write it, report.
fn finish_import(
    events: &[crate::facr::EdlEvent],
    sources: &std::collections::HashMap<String, ClipManifest>,
    out: &str,
) -> Result<()> {
    let manifest = crate::facr::build_manifest_from_edl(events, sources)?;
    std::fs::write(out, manifest.to_json()?).with_context(|| format!("write {out}"))?;

    println!(
        "Imported {} cut(s) -> {} frames {}",
        events.len(),
        manifest.frames.len(),
        style("(0 new frames stored — references the source clip's frames)").green()
    );
    println!("  Manifest: {}", style(out).cyan());
    println!(
        "  {}",
        style(format!("Reconstruct it: dits facr-checkout {out} cut.mp4")).dim()
    );
    Ok(())
}

// ---- Photo path -----------------------------------------------------------------

/// Selected photo edits to append, parsed from CLI flags.
#[derive(Default)]
pub struct PhotoEditArgs {
    pub exposure: Option<f32>,
    pub contrast: Option<f32>,
    pub saturation: Option<f32>,
    pub white_balance: Option<f32>,
    pub rotate: Option<u16>,
    /// "x,y,w,h"
    pub crop: Option<String>,
}

impl PhotoEditArgs {
    fn into_edits(self) -> Result<Vec<PhotoEdit>> {
        let mut edits = Vec::new();
        if let Some(c) = self.crop {
            let nums: Vec<u32> = c
                .split(',')
                .map(|s| s.trim().parse::<u32>())
                .collect::<std::result::Result<_, _>>()
                .with_context(|| format!("--crop expects x,y,w,h (got '{c}')"))?;
            anyhow::ensure!(nums.len() == 4, "--crop expects 4 values x,y,w,h");
            edits.push(PhotoEdit::Crop { x: nums[0], y: nums[1], width: nums[2], height: nums[3] });
        }
        if let Some(v) = self.exposure { edits.push(PhotoEdit::Exposure { stops: v }); }
        if let Some(v) = self.contrast { edits.push(PhotoEdit::Contrast { amount: v }); }
        if let Some(v) = self.saturation { edits.push(PhotoEdit::Saturation { amount: v }); }
        if let Some(v) = self.white_balance { edits.push(PhotoEdit::WhiteBalance { kelvin: v }); }
        if let Some(v) = self.rotate { edits.push(PhotoEdit::Rotate { degrees: v }); }
        Ok(edits)
    }
}

/// Store a source image once and write its (unedited) photo manifest.
pub fn photo_add(input: &str, store: Option<&str>, manifest_out: Option<&str>) -> Result<()> {
    let store_path = store_dir(store);
    std::fs::create_dir_all(&store_path)?;
    let frame_store = FrameStore::new(&store_path)?;

    let before = frame_store.count()?;
    let version = ingest_photo(Path::new(input), &frame_store)?;
    let new = frame_store.count()? - before;

    let manifest_path = manifest_out
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(format!("{input}.photo.json")));
    std::fs::write(&manifest_path, version.to_json()?)?;

    println!("Stored {} {}", style(input).cyan(),
        if new == 0 { style("(already in store — deduped)").green() } else { style("(1 source image)").dim() });
    println!("  Resolution : {}x{}", version.width, version.height);
    println!("  Manifest   : {}", style(manifest_path.display()).cyan());
    println!("  {}", style("Edit it non-destructively with `dits photo-edit` — edits cost ~0 storage.").italic());
    Ok(())
}

/// Append edits to a photo manifest (non-destructive; stores no new image bytes).
pub fn photo_edit(manifest: &str, args: PhotoEditArgs, out: Option<&str>) -> Result<()> {
    let manifest_path = Path::new(manifest);
    anyhow::ensure!(manifest_path.exists(), "manifest not found: {}", manifest);
    let version = PhotoVersion::from_json(&std::fs::read_to_string(manifest_path)?)?;

    let edits = args.into_edits()?;
    anyhow::ensure!(!edits.is_empty(), "no edits given (try --exposure, --contrast, --crop, ...)");

    let mut next = version.clone();
    for e in edits {
        next = next.with_edit(e);
    }

    let out_path = out.map(PathBuf::from).unwrap_or_else(|| manifest_path.to_path_buf());
    std::fs::write(&out_path, next.to_json()?)?;

    println!(
        "Photo now has {} edit(s) {}",
        next.edits.len(),
        style("(0 new image bytes stored — non-destructive edit log)").green()
    );
    println!("  Manifest : {}", style(out_path.display()).cyan());
    println!("  Render it: {}", style(format!("dits photo-render {} out.jpg", out_path.display())).dim());
    Ok(())
}

/// Render a photo version by applying its edit log to the stored source.
pub fn photo_render(manifest: &str, output: &str, store: Option<&str>) -> Result<()> {
    let manifest_path = Path::new(manifest);
    anyhow::ensure!(manifest_path.exists(), "manifest not found: {}", manifest);
    let version = PhotoVersion::from_json(&std::fs::read_to_string(manifest_path)?)?;
    let frame_store = FrameStore::new(&store_dir(store))?;

    println!("Rendering {} edit(s) -> {} ...", version.edits.len(), style(output).cyan());
    render_photo(&version, &frame_store, Path::new(output))?;
    println!("{} {}", style("✓ Wrote").green(), output);
    Ok(())
}

/// Reconstruct a playable video from a FACR manifest.
pub fn facr_checkout(manifest: &str, output: &str, store: Option<&str>) -> Result<()> {
    let manifest_path = Path::new(manifest);
    anyhow::ensure!(manifest_path.exists(), "manifest not found: {}", manifest);

    let json = std::fs::read_to_string(manifest_path).context("read manifest")?;
    let manifest = ClipManifest::from_json(&json).context("parse manifest")?;

    let frame_store = FrameStore::new(&store_dir(store))?;
    let output_path = Path::new(output);

    println!(
        "Reconstructing {} frames -> {} ...",
        manifest.frames.len(),
        style(output).cyan()
    );
    reconstruct_video(&manifest, &frame_store, output_path)?;
    println!("{} {}", style("✓ Wrote").green(), output);
    Ok(())
}
