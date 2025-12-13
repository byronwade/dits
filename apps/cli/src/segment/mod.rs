//! Video segmentation for GOP-aligned storage.
//!
//! This module implements Netflix/YouTube-style video segmentation where
//! videos are split into small GOP-aligned chunks. This enables:
//! - Partial re-encode deduplication (edit 2 seconds, only that segment changes)
//! - Efficient streaming and seeking
//! - Better deduplication for localized edits

pub mod manifest;
pub mod segmenter;

pub use manifest::{Segment, VideoManifest};
pub use segmenter::{SegmentConfig, Segmenter};
