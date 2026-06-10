//! Minimal CMX3600 EDL import — the "Case A" unlock.
//!
//! An EDL (Edit Decision List) is a cut list referencing source clips by reel
//! and source-timecode in/out. Importing one builds a [`ClipManifest`] that
//! references the *already-stored* frames of the source clips — so an external
//! edit becomes a Dits-owned manifest at **zero new storage cost**.
//!
//! Scope (v1): cuts only (transition `C`), the video channel, non-drop-frame
//! timecodes, one event per line. Transitions/effects/multiple tracks are
//! ignored.

use std::collections::HashMap;

use anyhow::{bail, Result};

use super::manifest::{ClipManifest, FrameRef};

/// One cut event: take frames `[src_in, src_out)` of `reel`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EdlEvent {
    pub reel:    String,
    pub src_in:  u64,
    pub src_out: u64,
}

/// Parse a `HH:MM:SS:FF` non-drop-frame timecode to a frame index at `fps`.
fn timecode_to_frames(tc: &str, fps: u32) -> Option<u64> {
    let parts: Vec<&str> = tc.split(':').collect();
    if parts.len() != 4 {
        return None;
    }
    let h: u64 = parts[0].parse().ok()?;
    let m: u64 = parts[1].parse().ok()?;
    let s: u64 = parts[2].parse().ok()?;
    let f: u64 = parts[3].parse().ok()?;
    Some(((h * 3600 + m * 60 + s) * fps as u64) + f)
}

fn is_timecode(tok: &str) -> bool {
    let p: Vec<&str> = tok.split(':').collect();
    p.len() == 4
        && p.iter()
            .all(|x| x.len() == 2 && x.chars().all(|c| c.is_ascii_digit()))
}

/// Parse a CMX3600 EDL. `fps` is the rounded frame rate used to convert
/// timecodes.
pub fn parse_cmx3600(text: &str, fps: u32) -> Result<Vec<EdlEvent>> {
    if fps == 0 {
        bail!("fps must be non-zero");
    }
    let mut events = Vec::new();
    for line in text.lines() {
        let toks: Vec<&str> = line.split_whitespace().collect();
        // Event lines start with a numeric event id and carry timecodes.
        if toks.len() < 2 || !toks[0].chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        let reel = toks[1].to_string();
        let tcs: Vec<&str> = toks.iter().copied().filter(|t| is_timecode(t)).collect();
        if tcs.len() < 2 {
            continue;
        }
        let src_in = timecode_to_frames(tcs[0], fps)
            .ok_or_else(|| anyhow::anyhow!("bad src-in timecode: {}", tcs[0]))?;
        let src_out = timecode_to_frames(tcs[1], fps)
            .ok_or_else(|| anyhow::anyhow!("bad src-out timecode: {}", tcs[1]))?;
        events.push(EdlEvent { reel, src_in, src_out });
    }
    if events.is_empty() {
        bail!("no usable cut events found in EDL");
    }
    Ok(events)
}

/// Build an output manifest by slicing the referenced frame ranges from source
/// manifests. Frames are referenced by hash (no copy), so the result costs zero
/// new storage.
pub fn build_manifest_from_edl(
    events: &[EdlEvent],
    sources: &HashMap<String, ClipManifest>,
) -> Result<ClipManifest> {
    let mut out: Option<ClipManifest> = None;
    let mut pts: i64 = 0;

    for ev in events {
        let src = sources
            .get(&ev.reel)
            .ok_or_else(|| anyhow::anyhow!("EDL reel '{}' has no source clip", ev.reel))?;
        let manifest = out.get_or_insert_with(|| {
            let mut m = ClipManifest::new(src.width, src.height, src.codec.clone(), src.timescale);
            m.frame_rate = src.frame_rate.clone();
            m
        });
        let end = (ev.src_out as usize).min(src.frames.len());
        let start = (ev.src_in as usize).min(end);
        for f in &src.frames[start..end] {
            manifest.push_frame(FrameRef { hash: f.hash, pts, duration: f.duration });
            pts += 1;
        }
    }

    out.ok_or_else(|| anyhow::anyhow!("EDL produced no frames"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Hasher;

    fn source(n: usize) -> ClipManifest {
        let mut m = ClipManifest::new(1920, 1080, "webp", 1);
        for i in 0..n {
            m.push_frame(FrameRef {
                hash:     Hasher::hash(format!("frame-{i}").as_bytes()),
                pts:      i as i64,
                duration: 1,
            });
        }
        m
    }

    #[test]
    fn parses_cmx3600_events() {
        let edl = "\
TITLE: demo
FCM: NON-DROP FRAME
001  AX       V     C        00:00:00:10 00:00:00:20 00:00:00:00 00:00:00:10
002  AX       V     C        00:00:01:00 00:00:01:05 00:00:00:10 00:00:00:15
";
        let events = parse_cmx3600(edl, 10).unwrap();
        assert_eq!(events.len(), 2);
        // 00:00:00:10 at 10fps = frame 10; 00:00:00:20 = frame 20.
        assert_eq!(events[0], EdlEvent { reel: "AX".into(), src_in: 10, src_out: 20 });
        // 00:00:01:00 at 10fps = frame 10; 00:00:01:05 = frame 15.
        assert_eq!(events[1], EdlEvent { reel: "AX".into(), src_in: 10, src_out: 15 });
    }

    #[test]
    fn builds_manifest_referencing_source_frames_with_zero_copies() {
        let src = source(100);
        let mut sources = HashMap::new();
        sources.insert("AX".to_string(), src.clone());

        let events = vec![
            EdlEvent { reel: "AX".into(), src_in: 10, src_out: 20 }, // 10 frames
            EdlEvent { reel: "AX".into(), src_in: 50, src_out: 55 }, // 5 frames
        ];
        let out = build_manifest_from_edl(&events, &sources).unwrap();

        assert_eq!(out.frames.len(), 15, "10 + 5 frames");
        // The frames are exactly the source's frames at those indices (same hashes).
        assert_eq!(out.frames[0].hash, src.frames[10].hash);
        assert_eq!(out.frames[10].hash, src.frames[50].hash);
        // Output pts is renumbered from 0.
        assert_eq!(out.frames[0].pts, 0);
        assert_eq!(out.frames[14].pts, 14);
    }
}
