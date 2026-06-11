//! Maps frame indices to fixed-duration segment indices.

/// Parse an ffmpeg frame-rate string ("30000/1001", "10/1", "25") into fps.
pub fn parse_fps(s: &str) -> f64 {
    match s.split_once('/') {
        Some((n, d)) => {
            let n: f64 = n.trim().parse().unwrap_or(30.0);
            let d: f64 = d.trim().parse().unwrap_or(1.0);
            if d == 0.0 {
                30.0
            } else {
                n / d
            }
        },
        None => s.trim().parse().unwrap_or(30.0),
    }
}

/// Fixed-duration segmentation layout: each segment is `segment_seconds` long.
#[derive(Clone, Debug)]
pub struct SegmentLayout {
    pub fps:             f64,
    pub segment_seconds: f64,
}

impl SegmentLayout {
    pub fn new(frame_rate: &str, segment_seconds: f64) -> Self {
        Self { fps: parse_fps(frame_rate), segment_seconds }
    }

    /// Number of frames per segment (at least 1).
    pub fn frames_per_segment(&self) -> usize {
        ((self.fps * self.segment_seconds).round() as usize).max(1)
    }

    /// Total segment count for `frame_count` frames (last segment may be
    /// short).
    pub fn segment_count(&self, frame_count: usize) -> usize {
        if frame_count == 0 {
            return 0;
        }
        frame_count.div_ceil(self.frames_per_segment())
    }

    /// Which segment a frame belongs to.
    pub fn segment_of_frame(&self, frame_idx: usize) -> usize {
        frame_idx / self.frames_per_segment()
    }

    /// The half-open frame range `[start, end)` covered by a segment, clamped
    /// to `frame_count`.
    pub fn frame_range(&self, segment_idx: usize, frame_count: usize) -> std::ops::Range<usize> {
        let fps_seg = self.frames_per_segment();
        let start = (segment_idx * fps_seg).min(frame_count);
        let end = ((segment_idx + 1) * fps_seg).min(frame_count);
        start..end
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_frame_rates() {
        assert_eq!(parse_fps("10/1"), 10.0);
        assert_eq!(parse_fps("25"), 25.0);
        assert!((parse_fps("30000/1001") - 29.97).abs() < 0.01);
        assert_eq!(parse_fps("0/0"), 30.0);
    }

    #[test]
    fn maps_frames_to_segments() {
        // 10 fps, 2s segments => 20 frames/segment.
        let l = SegmentLayout::new("10/1", 2.0);
        assert_eq!(l.frames_per_segment(), 20);
        assert_eq!(l.segment_count(100), 5);
        assert_eq!(l.segment_count(0), 0);
        assert_eq!(l.segment_count(21), 2); // ceil
        assert_eq!(l.segment_of_frame(0), 0);
        assert_eq!(l.segment_of_frame(19), 0);
        assert_eq!(l.segment_of_frame(20), 1);
        assert_eq!(l.segment_of_frame(45), 2);
        assert_eq!(l.frame_range(2, 100), 40..60);
        assert_eq!(l.frame_range(4, 100), 80..100);
        assert_eq!(l.frame_range(4, 95), 80..95); // clamped short tail
    }
}
