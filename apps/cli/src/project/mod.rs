//! Project Graph - Video timeline versioning (Phase 5).
//!
//! Models edits, not just files. Supports versioning of video timelines
//! independently of the file tree.

mod graph;
mod store;

pub use graph::{ProjectGraph, Track, Clip, TrackType};
pub use store::ProjectStore;
