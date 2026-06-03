//! FACR incremental streaming slice: frame-diff-driven HLS that re-encodes and
//! re-delivers only the segments covering changed frames. See
//! `docs/superpowers/specs/2026-06-02-facr-incremental-streaming-slice-design.md`.

pub mod edit;
pub mod encode;
pub mod incremental;
pub mod ladder;
pub mod layout;
pub mod origin;
pub mod playlist;
pub mod quic_origin;
pub mod serve;
pub mod vmaf;
