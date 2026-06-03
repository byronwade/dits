//! ABR rendition ladder: a set of (resolution, bitrate) rungs the player can adapt between.
//! Every rung encodes the same canonical frames at a different scale/bitrate; the frame-diff
//! (and thus the incremental reuse plan) is identical across rungs.

use crate::stream::encode::EncodeProfile;

/// One rung of the adaptive ladder.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Rendition {
    pub name: String,
    pub height: u32,
    pub bitrate_kbps: u32,
}

impl Rendition {
    pub fn profile(&self) -> EncodeProfile {
        EncodeProfile { height: Some(self.height), bitrate_kbps: Some(self.bitrate_kbps) }
    }
}

/// The default ladder, filtered to rungs at or below `source_height` (never upscales). If every
/// default rung is taller than the source, fall back to a single source-height rung.
pub fn default_ladder(source_height: u32) -> Vec<Rendition> {
    let full = [
        ("720p", 720u32, 2500u32),
        ("480p", 480, 1200),
        ("240p", 240, 500),
    ];
    let mut rungs: Vec<Rendition> = full
        .iter()
        .filter(|(_, h, _)| *h <= source_height)
        .map(|(name, h, b)| Rendition { name: (*name).to_string(), height: *h, bitrate_kbps: *b })
        .collect();
    if rungs.is_empty() {
        rungs.push(Rendition {
            name: format!("{source_height}p"),
            height: source_height,
            bitrate_kbps: 1500,
        });
    }
    rungs
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ladder_caps_to_source_height() {
        let names = |h| default_ladder(h).into_iter().map(|r| r.name).collect::<Vec<_>>();
        assert_eq!(names(720), vec!["720p", "480p", "240p"]);
        assert_eq!(names(500), vec!["480p", "240p"]);
        assert_eq!(names(360), vec!["240p"]);
        // Below the smallest rung -> single source-height fallback (never upscale).
        assert_eq!(names(120), vec!["120p"]);
    }

    #[test]
    fn rung_profile_carries_height_and_bitrate() {
        let r = Rendition { name: "480p".into(), height: 480, bitrate_kbps: 1200 };
        let p = r.profile();
        assert_eq!(p.height, Some(480));
        assert_eq!(p.bitrate_kbps, Some(1200));
    }
}
