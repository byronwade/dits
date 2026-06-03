//! A streamable version = ordered content-addressed segments + HLS emit.

use crate::core::Hash;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct SegmentRef {
    pub index: usize,
    pub hash: Hash,
    /// Segment duration in milliseconds (for the EXTINF tag).
    pub duration_ms: u64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct StreamVersion {
    pub width: u32,
    pub height: u32,
    /// Hash of the shared CMAF init segment (ftyp+moov), referenced via EXT-X-MAP.
    pub init_hash: Hash,
    pub segments: Vec<SegmentRef>,
}

impl StreamVersion {
    /// Render a fMP4/CMAF HLS media playlist. Media segments are `{base}{hex}.m4s` and share
    /// one init via `#EXT-X-MAP` (`{base}{init}.mp4`), so unchanged segments across versions
    /// share identical URIs (cache hit). The fragments carry continuous `baseMediaDecodeTime`s
    /// (patched per segment index), so the timeline is continuous — no discontinuity markers.
    pub fn to_hls(&self, seg_url_base: &str) -> String {
        let target = self
            .segments
            .iter()
            .map(|s| (s.duration_ms as f64 / 1000.0).ceil() as u64)
            .max()
            .unwrap_or(0);
        let mut out = String::new();
        out.push_str("#EXTM3U\n#EXT-X-VERSION:7\n");
        out.push_str(&format!("#EXT-X-TARGETDURATION:{}\n", target));
        out.push_str("#EXT-X-MEDIA-SEQUENCE:0\n");
        out.push_str("#EXT-X-PLAYLIST-TYPE:VOD\n");
        if !self.segments.is_empty() {
            out.push_str(&format!("#EXT-X-MAP:URI=\"{}{}.mp4\"\n", seg_url_base, self.init_hash.to_hex()));
        }
        for s in &self.segments {
            out.push_str(&format!("#EXTINF:{:.3},\n", s.duration_ms as f64 / 1000.0));
            out.push_str(&format!("{}{}.m4s\n", seg_url_base, s.hash.to_hex()));
        }
        out.push_str("#EXT-X-ENDLIST\n");
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn h(b: &[u8]) -> Hash {
        Hash::from_slice(blake3::hash(b).as_bytes())
    }

    #[test]
    fn emits_valid_fmp4_hls_with_content_addressed_uris() {
        let v = StreamVersion {
            width: 160,
            height: 120,
            init_hash: h(b"init"),
            segments: vec![
                SegmentRef { index: 0, hash: h(b"a"), duration_ms: 2000 },
                SegmentRef { index: 1, hash: h(b"b"), duration_ms: 1500 },
            ],
        };
        let m3u8 = v.to_hls("/seg/");
        assert!(m3u8.starts_with("#EXTM3U"));
        assert!(m3u8.contains("#EXT-X-VERSION:7"));
        assert!(m3u8.contains("#EXT-X-TARGETDURATION:2"));
        // One shared init via EXT-X-MAP.
        assert!(m3u8.contains(&format!("#EXT-X-MAP:URI=\"/seg/{}.mp4\"", h(b"init").to_hex())));
        // Media segments are .m4s.
        assert!(m3u8.contains(&format!("/seg/{}.m4s", h(b"a").to_hex())));
        assert!(m3u8.contains("#EXTINF:1.500,"));
        // Continuous timeline (bMDT patched per index) -> no discontinuity markers.
        assert_eq!(m3u8.matches("#EXT-X-DISCONTINUITY").count(), 0);
        assert!(m3u8.trim_end().ends_with("#EXT-X-ENDLIST"));
    }

    #[test]
    fn shared_segments_produce_identical_uris() {
        let s0 = SegmentRef { index: 0, hash: h(b"same"), duration_ms: 2000 };
        let v1 = StreamVersion { width: 1, height: 1, init_hash: h(b"init"), segments: vec![s0.clone()] };
        let v2 = StreamVersion { width: 1, height: 1, init_hash: h(b"init"), segments: vec![s0] };
        // Unchanged segment => identical URI line in both playlists.
        let line = format!("/seg/{}.m4s", h(b"same").to_hex());
        assert!(v1.to_hls("/seg/").contains(&line));
        assert!(v2.to_hls("/seg/").contains(&line));
    }
}
