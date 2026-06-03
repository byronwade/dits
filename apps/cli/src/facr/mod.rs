//! FACR — Frame-Addressable Canonical Representation.
//!
//! Dits's canonical, content-addressed, frame-level representation for video and
//! photo. Instead of versioning the bytes an NLE emitted, FACR stores each frame as
//! an independently-decodable, content-addressed object and represents a clip as an
//! ordered manifest of frame references. This makes trims/reorders/grades dedup at
//! frame granularity and enables a true visual diff.
//!
//! See `docs/superpowers/specs/2026-06-02-facr-frame-addressable-video-design.md`.

pub mod codec;
pub mod diff;
pub mod edit;
pub mod manifest;
pub mod photo;
pub mod pipeline;
pub mod store;
pub mod video;

pub use codec::{DeflateRawCodec, FrameCodec, RawFrame};
pub use diff::{diff_manifests, ClipDiff};
pub use edit::trim;
pub use manifest::{ClipManifest, FrameRef};
pub use photo::{ingest_photo, render_photo, PhotoEdit, PhotoVersion};
pub use pipeline::commit_clip;
pub use store::FrameStore;
pub use video::{ingest_video, reconstruct_video, source_has_audio, VideoInfo};
