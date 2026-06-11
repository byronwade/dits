//! Minimal OpenTimelineIO (OTIO) import: reconstruct a FACR manifest from an
//! external timeline. An imported edit costs ~0 new frames — the timeline only
//! says which already-stored source frames appear, and in what order. Combined
//! with content-defined boundaries, importing a cut/reorder/trim reuses almost
//! everything.
//!
//! We parse only the subset we need (tracks → clips → source_range over a named
//! media reference) and ignore the rest of the schema (tags, effects, markers,
//! transitions).

use std::collections::HashMap;

use anyhow::{bail, Context, Result};
use serde::Deserialize;

use crate::facr::manifest::{ClipManifest, FrameRef};

#[derive(Deserialize)]
struct Timeline {
    tracks: Stack,
}

#[derive(Deserialize)]
struct Stack {
    #[serde(default)]
    children: Vec<Track>,
}

#[derive(Deserialize)]
struct Track {
    #[serde(default)]
    children: Vec<Item>,
}

/// A track item. Clips carry a media reference + source range; gaps/others are
/// tolerated and skipped.
#[derive(Deserialize)]
struct Item {
    #[serde(default)]
    media_reference: Option<MediaRef>,
    #[serde(default)]
    source_range:    Option<TimeRange>,
}

#[derive(Deserialize)]
struct MediaRef {
    #[serde(default)]
    target_url: Option<String>,
}

#[derive(Deserialize)]
struct TimeRange {
    start_time: RationalTime,
    duration:   RationalTime,
}

#[derive(Deserialize)]
struct RationalTime {
    value: f64,
}

/// One resolved clip: a contiguous frame range taken from a named source.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportClip {
    pub source: String,
    pub start:  usize,
    pub count:  usize,
}

/// Parse an OTIO JSON document into the ordered clips of its first clip-bearing
/// video track.
pub fn parse_otio(json: &str) -> Result<Vec<ImportClip>> {
    let tl: Timeline = serde_json::from_str(json).context("parse OTIO json")?;
    // Use the first track that actually contains clips (the primary video track).
    for track in &tl.tracks.children {
        let mut clips = Vec::new();
        for item in &track.children {
            // Skip gaps / non-clip items (no media reference or no source range).
            let (Some(mref), Some(range)) = (&item.media_reference, &item.source_range) else {
                continue;
            };
            let source = mref
                .target_url
                .clone()
                .context("clip media_reference has no target_url")?;
            let start = range.start_time.value.round() as i64;
            let count = range.duration.value.round() as i64;
            if start < 0 || count < 0 {
                bail!("clip has negative source_range (start {start}, count {count})");
            }
            clips.push(ImportClip { source, start: start as usize, count: count as usize });
        }
        if !clips.is_empty() {
            return Ok(clips);
        }
    }
    Ok(Vec::new())
}

/// Reconstruct a manifest by concatenating each clip's source frame range, in
/// order. Frames are reused FrameRefs (already content-addressed in the store)
/// — the reconstruction stores no new frame content.
pub fn timeline_to_manifest(
    clips: &[ImportClip],
    sources: &HashMap<String, &ClipManifest>,
) -> Result<ClipManifest> {
    // Seed output metadata from the first referenced source.
    let first = clips.first();
    let seed = match first {
        Some(c) => *sources
            .get(&c.source)
            .with_context(|| format!("unknown source '{}'", c.source))?,
        None => return Ok(ClipManifest::new(0, 0, "png", 1)),
    };
    let mut out = ClipManifest::new(seed.width, seed.height, seed.codec.clone(), seed.timescale);
    out.frame_rate = seed.frame_rate.clone();

    let mut pts = 0i64;
    for c in clips {
        let src = *sources
            .get(&c.source)
            .with_context(|| format!("unknown source '{}'", c.source))?;
        let end = c.start + c.count;
        if end > src.frames.len() {
            bail!(
                "clip range {}..{} exceeds source '{}' length {}",
                c.start,
                end,
                c.source,
                src.frames.len()
            );
        }
        for f in &src.frames[c.start..end] {
            out.push_frame(FrameRef { hash: f.hash, pts, duration: 1 });
            pts += 1;
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Hash;

    fn source(n: usize) -> ClipManifest {
        let mut m = ClipManifest::new(64, 48, "png", 1);
        for i in 0..n {
            m.push_frame(FrameRef {
                hash:     Hash::from_slice(blake3::hash(format!("src-{i}").as_bytes()).as_bytes()),
                pts:      i as i64,
                duration: 1,
            });
        }
        m
    }

    const DOC: &str = r#"
    { "OTIO_SCHEMA": "Timeline.1",
      "tracks": { "OTIO_SCHEMA": "Stack.1", "children": [
        { "OTIO_SCHEMA": "Track.1", "children": [
          { "OTIO_SCHEMA": "Gap.1", "source_range": { "start_time": {"value":0,"rate":10}, "duration": {"value":2,"rate":10} } },
          { "OTIO_SCHEMA": "Clip.1", "name": "B",
            "media_reference": { "OTIO_SCHEMA": "ExternalReference.1", "target_url": "src.mp4" },
            "source_range": { "start_time": {"value":30,"rate":10}, "duration": {"value":10,"rate":10} } },
          { "OTIO_SCHEMA": "Clip.1", "name": "A",
            "media_reference": { "target_url": "src.mp4" },
            "source_range": { "start_time": {"value":0,"rate":10}, "duration": {"value":5,"rate":10} } }
        ] } ] } }
    "#;

    #[test]
    fn parses_clips_in_order_skipping_gaps() {
        let clips = parse_otio(DOC).unwrap();
        assert_eq!(
            clips,
            vec![
                ImportClip { source: "src.mp4".into(), start: 30, count: 10 },
                ImportClip { source: "src.mp4".into(), start: 0, count: 5 },
            ]
        );
    }

    #[test]
    fn reconstructs_reordered_trimmed_frames_with_zero_new_content() {
        let src = source(60);
        let mut sources = HashMap::new();
        sources.insert("src.mp4".to_string(), &src);

        let clips = parse_otio(DOC).unwrap();
        let m = timeline_to_manifest(&clips, &sources).unwrap();

        // 10 frames (30..40) then 5 frames (0..5), reordered.
        assert_eq!(m.frames.len(), 15);
        assert_eq!(m.frames[0].hash, src.frames[30].hash);
        assert_eq!(m.frames[9].hash, src.frames[39].hash);
        assert_eq!(m.frames[10].hash, src.frames[0].hash);
        assert_eq!(m.frames[14].hash, src.frames[4].hash);
        // PTS renumbered contiguously.
        assert_eq!(m.frames[10].pts, 10);

        // Zero new content: every output frame hash exists in the source.
        let src_hashes: std::collections::HashSet<_> = src.frames.iter().map(|f| f.hash).collect();
        assert!(m.frames.iter().all(|f| src_hashes.contains(&f.hash)));
    }

    #[test]
    fn out_of_range_and_unknown_source_error() {
        let src = source(10);
        let mut sources = HashMap::new();
        sources.insert("src.mp4".to_string(), &src);
        // range past end
        let bad = vec![ImportClip { source: "src.mp4".into(), start: 5, count: 20 }];
        assert!(timeline_to_manifest(&bad, &sources).is_err());
        // unknown source
        let unknown = vec![ImportClip { source: "other.mp4".into(), start: 0, count: 1 }];
        assert!(timeline_to_manifest(&unknown, &sources).is_err());
    }
}
