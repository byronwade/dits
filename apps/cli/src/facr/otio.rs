//! Minimal OpenTimelineIO (OTIO) JSON import.
//!
//! OTIO is the modern timeline interchange format. Like the EDL importer, this turns a
//! timeline into a list of [`EdlEvent`] cuts (reel = clip name, frame in/out from the
//! clip's `source_range`), which [`super::edl::build_manifest_from_edl`] then slices from
//! the source clip's already-stored frames — a Case-A edit at zero new storage.
//!
//! Scope (v1): the first Video track's `Clip` children with a `source_range`. Gaps,
//! transitions, effects, nested stacks, and non-video tracks are ignored.

use super::edl::EdlEvent;
use anyhow::{bail, Context, Result};
use serde_json::Value;

fn schema_is(node: &Value, prefix: &str) -> bool {
    node.get("OTIO_SCHEMA")
        .and_then(|s| s.as_str())
        .map(|s| s.starts_with(prefix))
        .unwrap_or(false)
}

/// RationalTime.value as an integer frame count (value is already in frame units).
fn rational_frames(node: &Value) -> Option<i64> {
    node.get("value").and_then(|v| v.as_f64()).map(|f| f.round() as i64)
}

/// Parse an OTIO timeline JSON into cut events.
pub fn parse_otio(json: &str) -> Result<Vec<EdlEvent>> {
    let root: Value = serde_json::from_str(json).context("invalid OTIO JSON")?;

    // tracks is a Stack whose children are Tracks.
    let tracks = root
        .get("tracks")
        .and_then(|t| t.get("children"))
        .and_then(|c| c.as_array())
        .context("OTIO timeline has no tracks")?;

    // First Video track (or the first track if none declare a kind).
    let video_track = tracks
        .iter()
        .find(|t| t.get("kind").and_then(|k| k.as_str()) == Some("Video"))
        .or_else(|| tracks.first())
        .context("OTIO has no usable track")?;

    let children = video_track
        .get("children")
        .and_then(|c| c.as_array())
        .context("OTIO track has no children")?;

    let mut events = Vec::new();
    for child in children {
        if !schema_is(child, "Clip") {
            continue; // skip Gaps, transitions, etc.
        }
        let reel = child
            .get("name")
            .and_then(|n| n.as_str())
            .unwrap_or("CLIP")
            .to_string();
        let range = match child.get("source_range") {
            Some(r) => r,
            None => continue,
        };
        let start = range.get("start_time").and_then(rational_frames).unwrap_or(0);
        let dur = match range.get("duration").and_then(rational_frames) {
            Some(d) if d > 0 => d,
            _ => continue,
        };
        let src_in = start.max(0) as u64;
        let src_out = (start.max(0) + dur) as u64;
        events.push(EdlEvent { reel, src_in, src_out });
    }

    if events.is_empty() {
        bail!("no usable clips found in OTIO timeline");
    }
    Ok(events)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_minimal_otio_timeline() {
        let otio = r#"{
          "OTIO_SCHEMA": "Timeline.1",
          "tracks": {
            "OTIO_SCHEMA": "Stack.1",
            "children": [
              {
                "OTIO_SCHEMA": "Track.1",
                "kind": "Video",
                "children": [
                  {
                    "OTIO_SCHEMA": "Clip.1",
                    "name": "shotA",
                    "source_range": {
                      "OTIO_SCHEMA": "TimeRange.1",
                      "start_time": { "OTIO_SCHEMA": "RationalTime.1", "value": 10, "rate": 24 },
                      "duration":   { "OTIO_SCHEMA": "RationalTime.1", "value": 30, "rate": 24 }
                    }
                  },
                  { "OTIO_SCHEMA": "Gap.1", "name": "gap", "source_range": null },
                  {
                    "OTIO_SCHEMA": "Clip.1",
                    "name": "shotB",
                    "source_range": {
                      "OTIO_SCHEMA": "TimeRange.1",
                      "start_time": { "OTIO_SCHEMA": "RationalTime.1", "value": 100, "rate": 24 },
                      "duration":   { "OTIO_SCHEMA": "RationalTime.1", "value": 5, "rate": 24 }
                    }
                  }
                ]
              }
            ]
          }
        }"#;

        let events = parse_otio(otio).unwrap();
        assert_eq!(events.len(), 2, "two clips (gap skipped)");
        assert_eq!(events[0], EdlEvent { reel: "shotA".into(), src_in: 10, src_out: 40 });
        assert_eq!(events[1], EdlEvent { reel: "shotB".into(), src_in: 100, src_out: 105 });
    }
}
